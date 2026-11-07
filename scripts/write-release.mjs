import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url)),directory=join(root,'dist');
const {version}=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
const html=await readFile(join(directory,'index.html'),'utf8');
const paths=new Set(['index.html']);
for(const folder of ['puppy','duck','cat','jigsaw']){
  let files;try{files=await readdir(join(directory,folder));}catch(error){if(error.code==='ENOENT')continue;throw error;}
  for(const file of files)if(/\.(?:mp3|jpg|png|webp)$/.test(file))paths.add(folder+'/'+file);
}
for(const match of html.matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+)"/g)){
  if(!match[1].startsWith('./'))continue;
  const path=match[1].slice(2);if(path.includes('..')||path.includes('?')||path.includes('#'))continue;
  paths.add(path);
}
const assets={};
for(const path of [...paths].sort())assets[path]=createHash('sha256').update(await readFile(join(directory,path))).digest('hex');
let revision=null,dirty=false;
try{revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();dirty=!!execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8'}).trim();}catch{}
await writeFile(join(directory,'release.json'),JSON.stringify({version,revision,dirty,builtAt:new Date().toISOString(),assets},null,2)+'\n');
console.log(`Release ${version}: recorded ${paths.size} artifact hashes.`);
