import { openDB } from 'idb';
import type { Paper,Revision } from './model';
export type LocalPaper={paper:Paper;revision:number;dirty:boolean};
export function storageFor(scope='device'){
  const database=()=>openDB(scope==='device'?'academica-v1':'academica-account-'+scope,1,{upgrade(db){db.createObjectStore('papers',{keyPath:'paper.id'});db.createObjectStore('revisions',{keyPath:'id'});db.createObjectStore('preferences');}});
  return{
    async localPapers():Promise<LocalPaper[]>{const db=await database();return db.getAll('papers');},
    async saveLocal(value:LocalPaper){const db=await database();await db.put('papers',value);},
    async saveLocalRevision(revision:Revision){const db=await database();await db.put('revisions',revision);},
    async localRevisions(paperId:string):Promise<Revision[]>{const db=await database();const all=await db.getAll('revisions');return all.filter((r:Revision)=>r.paperId===paperId).sort((a:Revision,b:Revision)=>b.createdAt.localeCompare(a.createdAt));},
    async pref(key:string,value?:unknown){const db=await database();if(value!==undefined){await db.put('preferences',value,key);return value;}return db.get('preferences',key);}
  };
}
