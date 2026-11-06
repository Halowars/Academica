import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join,resolve} from 'node:path';

const defaultDirectory=fileURLToPath(new URL('../dist/',import.meta.url));
export async function verifyHostedBuild(base,{directory=defaultDirectory,fetcher=fetch}={}){
  const expected=JSON.parse(await readFile(join(directory,'release.json'),'utf8'));
  const origin=new URL(base.endsWith('/')?base:base+'/');
  async function get(path){
    // Hosts canonicalize index.html to the directory URL; verify the page users open.
    const url=new URL(path==='index.html'?'./':path,origin);url.searchParams.set('release',expected.revision||expected.builtAt);
    let response;try{response=await fetcher(url,{cache:'no-store',signal:AbortSignal.timeout(20000)});}catch(error){throw new Error(`Cannot read live ${path}: ${error.cause?.message||error.message}`,{cause:error});}
    if(!response.ok)throw new Error(`Live deployment is missing ${path} (HTTP ${response.status}).`);
    return response;
  }
  let actual;try{actual=await(await get('release.json')).json();}catch(error){throw new Error('The live site has no readable release metadata. Publish the current build before claiming it is updated.',{cause:error});}
  if(actual.version!==expected.version||actual.revision!==expected.revision)throw new Error(`The live site is stale: expected ${expected.version} at ${expected.revision}, received ${actual.version} at ${actual.revision}.`);
  await Promise.all(Object.entries(expected.assets).map(async([path,hash])=>{
    const bytes=await(await get(path)).arrayBuffer();
    if(createHash('sha256').update(new Uint8Array(bytes)).digest('hex')!==hash)throw new Error(`The live ${path} differs from the build. The release is not verified.`);
  }));
  return{url:origin.href,version:actual.version,revision:actual.revision,verifiedAssets:Object.keys(expected.assets).length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{console.log('Verified live deployment:',await verifyHostedBuild(process.argv[2]||'https://academica-writer.web.app/'));}
  catch(error){console.error(error.message);process.exitCode=1;}
}
