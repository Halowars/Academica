import { openDB } from 'idb';
import type { Paper,Revision } from './model';
export type LocalPaper={paper:Paper;revision:number;dirty:boolean;trashedAt?:string};
export function storageFor(scope='device'){
  const database=()=>openDB(scope==='device'?'academica-v1':'academica-account-'+scope,1,{upgrade(db){db.createObjectStore('papers',{keyPath:'paper.id'});db.createObjectStore('revisions',{keyPath:'id'});db.createObjectStore('preferences');}});
  return{
    async localPapers():Promise<LocalPaper[]>{const db=await database();return db.getAll('papers');},
    async saveLocal(value:LocalPaper){const db=await database();await db.put('papers',value);},
    async setLocalTrash(id:string,trashedAt?:string,revision?:number,dirty=true){const db=await database(),value=await db.get('papers',id) as LocalPaper|undefined;if(!value)return false;if(trashedAt)value.trashedAt=trashedAt;else delete value.trashedAt;if(revision!==undefined)value.revision=revision;value.dirty=dirty;await db.put('papers',value);return true;},
    async deleteLocalPaper(id:string){const db=await database(),tx=db.transaction(['papers','revisions'],'readwrite');await tx.objectStore('papers').delete(id);const revisions=await tx.objectStore('revisions').getAll();await Promise.all(revisions.filter((revision:Revision)=>revision.paperId===id).map((revision:Revision)=>tx.objectStore('revisions').delete(revision.id)));await tx.done;},
    async saveLocalRevision(revision:Revision){const db=await database();await db.put('revisions',revision);},
    async localRevisions(paperId:string):Promise<Revision[]>{const db=await database();const all=await db.getAll('revisions');return all.filter((r:Revision)=>r.paperId===paperId).sort((a:Revision,b:Revision)=>b.createdAt.localeCompare(a.createdAt));},
    async pref(key:string,value?:unknown){const db=await database();if(value!==undefined){await db.put('preferences',value,key);return value;}return db.get('preferences',key);}
  };
}
