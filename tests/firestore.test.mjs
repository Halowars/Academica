import assert from 'node:assert/strict';
import {initializeApp,deleteApp} from 'firebase/app';
import {getFirestore,connectFirestoreEmulator,doc,setDoc,getDoc,getDocs,collection,updateDoc,deleteDoc,deleteField,query,orderBy,limit,terminate} from 'firebase/firestore';
const projectId='demo-academica',apps=[],databases=[];
function client(name,uid){const app=initializeApp({projectId,apiKey:'emulator-only'},name);apps.push(app);const db=getFirestore(app);connectFirestoreEmulator(db,'127.0.0.1',8080,uid?{mockUserToken:{sub:uid,user_id:uid,email:uid+'@example.test'}}:undefined);databases.push(db);return db;}
let count=0;
async function pass(label,promise){await promise;count++;console.log('✓ '+label);}
async function deny(label,promise){await assert.rejects(promise,e=>e.code==='permission-denied');count++;console.log('✓ '+label);}
try{
 const alice=client('rules-alice','alice'),bob=client('rules-bob','bob'),anon=client('rules-public');
 const path='academicaUsers/alice/papers/rules-test',paper={title:'Rules test',body:'{"private":"writing"}',revision:1,createdAt:'2026-11-04T10:00:00.000Z',updatedAt:'2026-11-04T10:00:00.000Z'};
 await pass('Owner can create a valid paper',setDoc(doc(alice,path),paper));
 await pass('Owner can read the paper',getDoc(doc(alice,path)).then(s=>assert.equal(s.data().title,paper.title)));
 await pass('Owner catalog query is allowed',getDocs(query(collection(alice,'academicaUsers/alice/papers'),orderBy('updatedAt','desc'),limit(100))));
 await deny('Public reads are denied',getDoc(doc(anon,path)));
 await deny('Public lists are denied',getDocs(collection(anon,'academicaUsers/alice/papers')));
 await deny('Another account cannot read',getDoc(doc(bob,path)));
 await deny('Another account cannot list',getDocs(collection(bob,'academicaUsers/alice/papers')));
 await deny('Another account cannot create in owner path',setDoc(doc(bob,'academicaUsers/alice/papers/forged'),paper));
 await deny('Another account cannot update',updateDoc(doc(bob,path),{revision:2}));
 await deny('Another account cannot delete',deleteDoc(doc(bob,path)));
 await deny('Updates must advance the revision',updateDoc(doc(alice,path),{title:'stale'}));
 await deny('Updates cannot skip revision numbers',updateDoc(doc(alice,path),{revision:3}));
 await deny('Creation dates are immutable',updateDoc(doc(alice,path),{revision:2,createdAt:'2026-11-05T10:00:00.000Z'}));
 await deny('Required fields cannot be removed on update',updateDoc(doc(alice,path),{revision:2,title:deleteField()}));
 await deny('Invalid types are rejected on update',updateDoc(doc(alice,path),{revision:2,title:123}));
 await deny('Oversized body rejected on update',updateDoc(doc(alice,path),{revision:2,body:'x'.repeat(840001)}));
 await deny('Undefined privilege fields rejected on update',updateDoc(doc(alice,path),{revision:2,isAdmin:true}));
 await deny('Undefined owner fields rejected on create',setDoc(doc(alice,'academicaUsers/alice/papers/polluted'),{...paper,ownerId:'bob'}));
 await deny('Required fields checked on create',setDoc(doc(alice,'academicaUsers/alice/papers/missing'),{title:'Missing'}));
 await deny('Oversized title rejected on create',setDoc(doc(alice,'academicaUsers/alice/papers/large'),{...paper,title:'x'.repeat(2001)}));
 await pass('Owner can update with validated schema',updateDoc(doc(alice,path),{title:'Updated',revision:2,updatedAt:'2026-11-04T11:00:00.000Z'}));
 await pass('Owner can move a paper to trash',updateDoc(doc(alice,path),{revision:3,trashedAt:'2026-11-04T12:00:00.000Z'}));
 await pass('Owner can restore a trashed paper',updateDoc(doc(alice,path),{revision:4,trashedAt:deleteField()}));
 const version='academicaUsers/alice/revisions/snapshot',revision={paperId:'rules-test',name:'Milestone',body:paper.body,createdAt:paper.createdAt};
 await pass('Owner can save an immutable revision',setDoc(doc(alice,version),revision));
 await pass('Owner revision query is allowed',getDocs(query(collection(alice,'academicaUsers/alice/revisions'),orderBy('createdAt','desc'),limit(100))));
 await deny('Other accounts cannot read revisions',getDoc(doc(bob,version)));
 await deny('Saved revisions cannot be overwritten',updateDoc(doc(alice,version),{name:'changed'}));
 await deny('Revision schema rejects unknown fields',setDoc(doc(alice,'academicaUsers/alice/revisions/bad'),{...revision,role:'admin'}));
 await pass('Owner can permanently delete a revision',deleteDoc(doc(alice,version)));
 await pass('Owner can permanently delete a paper',deleteDoc(doc(alice,path)));
 await deny('Unspecified parent and subcollection paths stay private',setDoc(doc(alice,'academicaUsers/alice'),{role:'admin'}));
 await pass('Existing Linea owner draft rule still works',setDoc(doc(alice,'users/alice/drafts/current'),{drafts:[],activeDraftId:'draft',updatedAt:paper.updatedAt}));
 await deny('Existing Linea cross-account isolation remains',getDoc(doc(bob,'users/alice/drafts/current')));
 console.log('\n'+count+' Firestore checks passed.');
}finally{await Promise.all(databases.map(db=>terminate(db)));await Promise.all(apps.map(deleteApp));}
