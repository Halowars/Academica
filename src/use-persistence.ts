'use client';
import { useEffect,useRef,useState } from 'react';
import { useWorkspace } from './lib/store';
import { createPaper,validatePaper,uid,type Paper,type PaperSummary,type Revision } from './lib/model';
import {storageFor,type LocalPaper} from './lib/storage';
import {cloudRequest} from './lib/firebase';
export const api=cloudRequest;
export function usePersistence(user:{name:string;id:string}|null){
  const api=<T=any>(path:string,options?:RequestInit)=>cloudRequest<T>(path,{...options,headers:{...options?.headers,'X-Academica-Owner':user?.id||''}});
  const {localPapers,saveLocal,localRevisions,saveLocalRevision,pref}=storageFor(user?.id||'device');
  const paper=useWorkspace(s=>s.paper),generation=useWorkspace(s=>s.generation);
  const [ready,setReady]=useState(false),[status,setStatus]=useState('Opening your workspace…'),[catalog,setCatalog]=useState<PaperSummary[]>([]),[conflict,setConflict]=useState(false);
  const revisions=useRef<Record<string,number>>({}),synced=useRef<Record<string,string>>({}),pending=useRef(new Map<string,Paper>()),busy=useRef(false),blocked=useRef(new Set<string>()),latest=useRef<Paper|null>(null);
  latest.current=paper;
  const mergeSummary=(value:Paper,revision:number)=>setCatalog(items=>[{id:value.id,title:value.title,updatedAt:value.updatedAt,revision},...items.filter(i=>i.id!==value.id)].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));
  async function localSave(value:Paper,dirty=true){await saveLocal({paper:value,revision:revisions.current[value.id]||0,dirty});mergeSummary(value,revisions.current[value.id]||0);}
  async function drain(){
    if(busy.current)return;busy.current=true;
    try{while(pending.current.size){const [id,value]=pending.current.entries().next().value!;pending.current.delete(id);if(blocked.current.has(id))continue;
      try{if(latest.current?.id===id)setStatus(user?'Saving…':'Saved on this device');await localSave(value,true);if(!user)continue;
        const result=await api<{revision:number}>('/api/papers',{method:'POST',body:JSON.stringify({paper:value,revision:revisions.current[id]||0})});revisions.current[id]=result.revision;synced.current[id]=value.updatedAt;
        const rows=await localPapers();const cached=rows.find(row=>row.paper.id===id);await saveLocal({paper:cached&&cached.paper.updatedAt!==value.updatedAt?cached.paper:value,revision:result.revision,dirty:!!cached&&cached.paper.updatedAt!==value.updatedAt});
        mergeSummary(value,result.revision);if(latest.current?.id===id){useWorkspace.getState().setRevision(result.revision);setStatus(latest.current.updatedAt===value.updatedAt?'Saved to cloud':'Saving…');}
      }catch(error:any){if(error.status===409){blocked.current.add(id);if(latest.current?.id===id){setConflict(true);setStatus('Newer cloud version');}}else if(latest.current?.id===id)setStatus(error.status===413?'Saved locally · cloud limit reached':'Saved locally · cloud unavailable');}
    }}finally{busy.current=false;}
  }
  async function schedule(value:Paper){try{await localSave(value,true);}catch{setStatus('Storage unavailable · download a backup');}pending.current.set(value.id,value);void drain();}
  useEffect(()=>{let cancelled=false;(async()=>{
    try{
      let locals=await localPapers();if(user&&!locals.length){const device=storageFor(),active=await device.pref('active-paper');const rows=await device.localPapers();const current=rows.find(row=>row.paper.id===active);if(current){await saveLocal({paper:current.paper,revision:0,dirty:true});await pref('active-paper',current.paper.id);locals=await localPapers();}}
      const recoveryKey='academica-recovery-'+(user?.id||'device');let recovery:LocalPaper|null=null;try{recovery=JSON.parse(localStorage.getItem(recoveryKey)||'null');}catch{}
      if(recovery){try{recovery.paper=validatePaper(recovery.paper);const existing=locals.find(row=>row.paper.id===recovery!.paper.id);if(!existing||recovery.paper.updatedAt>existing.paper.updatedAt){await saveLocal({...recovery,dirty:true});locals=await localPapers();}}catch{}}
      let remote:PaperSummary[]=[];if(user){try{remote=(await api('/api/papers')).papers;}catch{}}
      const remembered=await pref('active-paper') as string|undefined;const id=remembered&&(locals.some(r=>r.paper.id===remembered)||remote.some(r=>r.id===remembered))?remembered:locals[0]?.paper.id||remote[0]?.id;
      const cached=locals.find(row=>row.paper.id===id);let value:Paper|undefined=cached?.paper,revision=cached?.revision||0,dirty=cached?.dirty||false;
      if(user&&id&&remote.some(row=>row.id===id)){try{const cloud=await api('/api/papers/'+encodeURIComponent(id));if(!cached?.dirty){value=validatePaper(cloud.paper);revision=cloud.revision;dirty=false;}else if(cached.revision!==cloud.revision){blocked.current.add(id);setConflict(true);}else revision=cloud.revision;}catch{}}
      if(cancelled)return;
      const all=new Map(remote.map(row=>[row.id,row]));locals.forEach(row=>{if(!all.has(row.paper.id)||row.dirty)all.set(row.paper.id,{id:row.paper.id,title:row.paper.title,updatedAt:row.paper.updatedAt,revision:row.revision});});setCatalog([...all.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));
      if(!value){value=createPaper(user?.name||'',false);dirty=true;}
      revisions.current[value.id]=revision;if(!dirty)synced.current[value.id]=value.updatedAt;useWorkspace.getState().setPaper(value,revision);await saveLocal({paper:value,revision,dirty});await pref('active-paper',value.id);mergeSummary(value,revision);setStatus(blocked.current.has(value.id)?'Newer cloud version':user&&revision&&!dirty?'Saved to cloud':'Saved on this device');setReady(true);if(dirty&&!blocked.current.has(value.id))void schedule(value);
    }catch{if(cancelled)return;const value=createPaper(user?.name||'',false);useWorkspace.getState().setPaper(value);setReady(true);setStatus('Local recovery unavailable · use backups');}
  })();return()=>{cancelled=true;};},[]);
  useEffect(()=>{if(!ready||!paper||generation===0)return;setStatus('Saving…');const localTimer=setTimeout(()=>void localSave(paper,true).catch(()=>setStatus('Download a backup to keep your changes')),120);const cloudTimer=setTimeout(()=>void schedule(paper),1800);return()=>{clearTimeout(localTimer);clearTimeout(cloudTimer);};},[paper,generation,ready]);
  useEffect(()=>{function recover(){const value=latest.current;if(value){try{localStorage.setItem('academica-recovery-'+(user?.id||'device'),JSON.stringify({paper:value,revision:revisions.current[value.id]||0,dirty:synced.current[value.id]!==value.updatedAt}));}catch{}}}function reconnect(){const value=latest.current;if(value&&!blocked.current.has(value.id)&&synced.current[value.id]!==value.updatedAt)void schedule(value);}window.addEventListener('beforeunload',recover);window.addEventListener('online',reconnect);return()=>{window.removeEventListener('beforeunload',recover);window.removeEventListener('online',reconnect);};},[]);
  async function flushCurrent(){const current=latest.current;if(current&&synced.current[current.id]!==current.updatedAt){await localSave(current,true);if(!blocked.current.has(current.id))void schedule(current);}}
  async function load(id:string){if(id===latest.current?.id)return;await flushCurrent();const locals=await localPapers();const cached=locals.find(row=>row.paper.id===id);let value=cached?.paper,revision=cached?.revision||0;let newer=false,clean=!cached?.dirty;if(user){try{const cloud=await api('/api/papers/'+encodeURIComponent(id));if(!cached?.dirty){value=validatePaper(cloud.paper);revision=cloud.revision;clean=true;}else if(cached.revision!==cloud.revision){newer=true;blocked.current.add(id);}}catch{}}if(!value)throw new Error('This paper could not be opened.');revisions.current[id]=revision;if(clean)synced.current[id]=value.updatedAt;useWorkspace.getState().setPaper(value,revision);await saveLocal({paper:value,revision,dirty:!clean});await pref('active-paper',id);setConflict(newer);setStatus(newer?'Newer cloud version':user&&revision&&clean?'Saved to cloud':'Saved on this device');if(!clean&&!newer)void schedule(value);}
  async function add(value:Paper){await flushCurrent();revisions.current[value.id]=0;useWorkspace.getState().setPaper(value);await pref('active-paper',value.id);setConflict(false);await localSave(value,true);void schedule(value);}
  async function saveRevision(name:string){const value=latest.current;if(!value)return;const revision:Revision={id:uid(),paperId:value.id,name,createdAt:new Date().toISOString(),paper:structuredClone(value)};await saveLocalRevision(revision);if(user){try{await api('/api/revisions',{method:'POST',body:JSON.stringify({paper:value,name,createdAt:revision.createdAt})});}catch{}}return revision;}
  async function getRevisions(){if(!latest.current)return[];let result=await localRevisions(latest.current.id);if(user){try{const remote=(await api('/api/revisions?paperId='+encodeURIComponent(latest.current.id))).revisions as Revision[];const byTime=new Map(result.map(r=>[r.createdAt,r]));remote.forEach(r=>{if(!byTime.has(r.createdAt))byTime.set(r.createdAt,r);});result=[...byTime.values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));}catch{}}return result;}
  async function restore(revision:Revision){const value=revision.paper||validatePaper((await api('/api/revisions?id='+encodeURIComponent(revision.id))).paper);await saveRevision('Before restoring '+revision.name);useWorkspace.getState().edit(current=>{Object.assign(current,structuredClone(value),{id:current.id,updatedAt:new Date().toISOString()});});useWorkspace.setState(s=>({epoch:s.epoch+1}));}
  async function keepBoth(){const value=latest.current;if(!value)return;const clone=structuredClone(value);clone.id=uid();clone.title+=' — device copy';clone.createdAt=new Date().toISOString();clone.updatedAt=clone.createdAt;await add(clone);}
  async function reloadCloud(){const value=latest.current;if(!value)return;await saveRevision('Before loading cloud version');const cloud=await api('/api/papers/'+encodeURIComponent(value.id));blocked.current.delete(value.id);revisions.current[value.id]=cloud.revision;synced.current[value.id]=cloud.paper.updatedAt;useWorkspace.getState().setPaper(validatePaper(cloud.paper),cloud.revision);await saveLocal({paper:cloud.paper,revision:cloud.revision,dirty:false});setConflict(false);setStatus('Saved to cloud');}
  return{ready,status,catalog,conflict,load,add,saveRevision,getRevisions,restore,keepBoth,reloadCloud};
}
