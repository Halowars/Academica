import { openDB, type IDBPDatabase } from 'idb';
import type { Paper,Revision } from './model';
import { WRITING_ACTIVITY_LIMIT, type SavedWritingActivity, type WritingActivityEntry } from './writing-activity';
export type LocalPaper={paper:Paper;revision:number;dirty:boolean;trashedAt?:string};

const activityRange = (paperId: string) => IDBKeyRange.bound([paperId, 0], [paperId, Number.MAX_SAFE_INTEGER]);

export function storageFor(scope='device'){
  let connection: Promise<IDBPDatabase> | undefined;
  function database() {
    connection ??= openDB(scope === 'device' ? 'academica-v1' : 'academica-account-' + scope, 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('papers', { keyPath: 'paper.id' });
          db.createObjectStore('revisions', { keyPath: 'id' });
          db.createObjectStore('preferences');
        }
        if (oldVersion < 2) {
          const activity = db.createObjectStore('writingActivity', { keyPath: 'id', autoIncrement: true });
          activity.createIndex('byPaper', ['paperId', 'startedAt']);
          activity.createIndex('byCapture', 'captureId', { unique: true });
        }
      },
      blocking(_current, _next, event) {
        (event.target as IDBDatabase).close();
        connection = undefined;
      },
      terminated() { connection = undefined; }
    }).catch(error => {
      connection = undefined;
      throw error;
    });
    return connection;
  }

  return{
    async localPapers():Promise<LocalPaper[]>{const db=await database();return db.getAll('papers');},
    async saveLocal(value:LocalPaper){const db=await database();await db.put('papers',value);},
    async setLocalTrash(id:string,trashedAt?:string,revision?:number,dirty=true){const db=await database(),value=await db.get('papers',id) as LocalPaper|undefined;if(!value)return false;if(trashedAt)value.trashedAt=trashedAt;else delete value.trashedAt;if(revision!==undefined)value.revision=revision;value.dirty=dirty;await db.put('papers',value);return true;},
    async deleteLocalPaper(id: string) {
      const db = await database();
      const tx = db.transaction(['papers', 'revisions', 'writingActivity'], 'readwrite');
      const revisions = tx.objectStore('revisions');
      const activity = tx.objectStore('writingActivity');
      const removal = Promise.all([
        tx.objectStore('papers').delete(id),
        revisions.getAll() as Promise<Revision[]>,
        activity.index('byPaper').getAllKeys(activityRange(id))
      ]).then(([, savedRevisions, entryKeys]) => Promise.all([
        ...savedRevisions.filter(revision => revision.paperId === id).map(revision => revisions.delete(revision.id)),
        ...entryKeys.map(key => activity.delete(key))
      ]));
      await Promise.all([removal, tx.done]);
    },
    async saveLocalRevision(revision:Revision){const db=await database();await db.put('revisions',revision);},
    async localRevisions(paperId:string):Promise<Revision[]>{const db=await database();const all=await db.getAll('revisions');return all.filter((r:Revision)=>r.paperId===paperId).sort((a:Revision,b:Revision)=>b.createdAt.localeCompare(a.createdAt));},
    async saveWritingActivity(entry: WritingActivityEntry) {
      const db = await database();
      const tx = db.transaction(['papers', 'writingActivity'], 'readwrite');
      const activity = tx.objectStore('writingActivity');
      // Check for deleted papers and for a capture already committed before recovery.
      const save = Promise.all([
        tx.objectStore('papers').getKey(entry.paperId), activity.index('byCapture').getKey(entry.captureId)
      ]).then(async ([paperKey, captureKey]) => {
        if (paperKey === undefined || captureKey !== undefined) return;
        await activity.add(entry);
        const keys = await activity.index('byPaper').getAllKeys(activityRange(entry.paperId));
        await Promise.all(keys.slice(0, Math.max(0, keys.length - WRITING_ACTIVITY_LIMIT)).map(key => activity.delete(key)));
      });
      await Promise.all([save, tx.done]);
    },
    async localWritingActivity(paperId: string): Promise<SavedWritingActivity[]> {
      const db = await database();
      return db.getAllFromIndex('writingActivity', 'byPaper', activityRange(paperId));
    },
    async pref(key:string,value?:unknown){const db=await database();if(value!==undefined){await db.put('preferences',value,key);return value;}return db.get('preferences',key);}
  };
}
