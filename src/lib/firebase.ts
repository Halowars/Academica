import { useEffect,useState } from 'react';
import {initializeApp,getApps,type FirebaseOptions} from 'firebase/app';
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,signOut,type User} from 'firebase/auth';
import {getFirestore,doc,getDoc,getDocs,collection,runTransaction,setDoc,query,orderBy,limit,where,writeBatch,deleteDoc,deleteField} from 'firebase/firestore';
import {validatePaper,uid,type Paper} from './model';
declare global {interface Window {ACADEMICA_FIREBASE_CONFIG:FirebaseOptions|null}}
export type Account={user:{id:string;name:string;email:string}|null;configured:boolean;loading:boolean;signIn:(email:string,password:string,create?:boolean)=>Promise<void>;signOut:()=>Promise<void>};
let services:ReturnType<typeof init>|null=null;
function init(){const config=window.ACADEMICA_FIREBASE_CONFIG;if(!config?.apiKey||!config.projectId||!config.authDomain)return null;const app=getApps().find(a=>a.name==='academica')||initializeApp(config,'academica');return{auth:getAuth(app),db:getFirestore(app)};}
function getServices(){if(!services)services=init();return services;}
export function useAccount():Account {
  const [user,setUser]=useState<Account['user']>(null),[loading,setLoading]=useState(true);const configured=!!window.ACADEMICA_FIREBASE_CONFIG?.projectId;
  useEffect(()=>{const s=getServices();if(!s){setLoading(false);return;}return onAuthStateChanged(s.auth,(value:User|null)=>{setUser(value?{id:value.uid,name:value.displayName||'',email:value.email||''}:null);setLoading(false);},()=>setLoading(false));},[]);
  return{user,configured,loading,async signIn(email,password,create=false){const s=getServices();if(!s)throw new Error('Firebase is not configured yet. Your paper is saved on this device.');if(create)await createUserWithEmailAndPassword(s.auth,email,password);else await signInWithEmailAndPassword(s.auth,email,password);},async signOut(){const s=getServices();if(s)await signOut(s.auth);}};
}
function error(message:string,status:number):never{const e:any=new Error(message);e.status=status;throw e;}
export async function cloudRequest<T=any>(path:string,options?:RequestInit):Promise<T>{
  const s=getServices(),user=s?.auth.currentUser;if(!s||!user)error('Sign in to Firebase to sync papers.',401);
  const expected=new Headers(options?.headers).get('X-Academica-Owner');if(expected&&expected!==user.uid)error('The signed-in account changed. This device copy is preserved.',401);
  const input=typeof options?.body==='string'?JSON.parse(options.body):{},url=new URL(path,'https://academica.local');
  const papers=collection(s.db,'academicaUsers',user.uid,'papers'),versions=collection(s.db,'academicaUsers',user.uid,'revisions');let result:any;
  if(path==='/api/papers'&&options?.method==='POST'){
    const paper=validatePaper(input.paper),body=JSON.stringify(paper);if(new TextEncoder().encode(body).length>840000)error('This paper is too large for cloud sync. Your device copy is saved; download a backup.',413);
    const ref=doc(papers,paper.id);const revision=await runTransaction(s.db,async tx=>{const snap=await tx.get(ref),base=Number(input.revision)||0;if(snap.exists()?Number(snap.data().revision)!==base:base!==0)error('A newer cloud version exists.',409);const next=base+1;tx.set(ref,{title:paper.title,body,revision:next,updatedAt:paper.updatedAt,createdAt:paper.createdAt});return next;});result={revision};
  }else if(path==='/api/papers'){
    const snapshot=await getDocs(query(papers,orderBy('updatedAt','desc'),limit(100)));result={papers:snapshot.docs.map(d=>({id:d.id,title:d.data().title,updatedAt:d.data().updatedAt,revision:d.data().revision,...(d.data().trashedAt?{trashedAt:d.data().trashedAt}:{})}))};
  }else if(url.pathname.match(/^\/api\/papers\/[^/]+\/(?:trash|restore)$/)&&options?.method==='POST'){
    const parts=url.pathname.split('/'),id=decodeURIComponent(parts[3]),action=parts[4],ref=doc(papers,id);result=await runTransaction(s.db,async tx=>{const snap=await tx.get(ref);if(!snap.exists())error('Paper not found.',404);const revision=Number(snap.data().revision)+1,trashedAt=new Date().toISOString();tx.update(ref,action==='trash'?{revision,trashedAt}:{revision,trashedAt:deleteField()});return action==='trash'?{revision,trashedAt}:{revision};});
  }else if(url.pathname.startsWith('/api/papers/')&&options?.method==='DELETE'){
    const id=decodeURIComponent(url.pathname.slice('/api/papers/'.length)),ref=doc(papers,id),snap=await getDoc(ref);if(!snap.exists())error('Paper not found.',404);const saved=await getDocs(query(versions,where('paperId','==',id))),refs=saved.docs.map(row=>row.ref);for(let at=0;at<refs.length;at+=400){const batch=writeBatch(s.db);refs.slice(at,at+400).forEach(item=>batch.delete(item));await batch.commit();}await deleteDoc(ref);result={deleted:true};
  }else if(url.pathname.startsWith('/api/papers/')){
    const snapshot=await getDoc(doc(papers,decodeURIComponent(url.pathname.slice('/api/papers/'.length))));if(!snapshot.exists())error('Paper not found.',404);result={paper:validatePaper(JSON.parse(snapshot.data().body)),revision:snapshot.data().revision};
  }else if(url.pathname==='/api/revisions'&&options?.method==='POST'){
    const paper=validatePaper(input.paper),body=JSON.stringify(paper);if(new TextEncoder().encode(body).length>840000)error('This revision is too large for cloud sync. It is still saved on this device.',413);const id=uid(),createdAt=input.createdAt||new Date().toISOString();await setDoc(doc(versions,id),{paperId:paper.id,name:String(input.name).slice(0,150),createdAt,body});result={id,createdAt};
  }else if(url.pathname==='/api/revisions'){
    if(url.searchParams.has('id')){const snap=await getDoc(doc(versions,url.searchParams.get('id')!));if(!snap.exists())error('Revision not found.',404);result={...snap.data(),paper:validatePaper(JSON.parse(snap.data().body))};}
    else{const snapshot=await getDocs(query(versions,orderBy('createdAt','desc'),limit(100)));result={revisions:snapshot.docs.filter(d=>d.data().paperId===url.searchParams.get('paperId')).map(d=>({id:d.id,paperId:d.data().paperId,name:d.data().name,createdAt:d.data().createdAt}))};}
  }else error('Unknown cloud operation.',404);
  return result as T;
}
