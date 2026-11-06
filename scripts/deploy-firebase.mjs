import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {verifyHostedBuild} from './verify-hosting.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
function run(command,args){return new Promise((resolve,reject)=>{const child=spawn(command,args,{cwd:root,stdio:'inherit',env:process.env});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error(`${command} exited with status ${code}.`)));});}
try{
  const config=JSON.parse(await readFile(join(root,'firebase.json'),'utf8')),targets=JSON.parse(await readFile(join(root,'.firebaserc'),'utf8'));
  if(config.hosting?.target!=='academica'||config.hosting.public!=='dist'||JSON.stringify(targets.targets?.['linea-e80b7']?.hosting?.academica)!==JSON.stringify(['academica-writer']))throw new Error('Firebase Hosting must target only academica-writer in project linea-e80b7. Review the configuration before publishing.');
  await run('pnpm',['run','build']);
  const args=['deploy','--only','hosting:academica','--project','linea-e80b7','--non-interactive'];
  if(process.env.ACADEMICA_FIREBASE_CLI)await run(process.execPath,[process.env.ACADEMICA_FIREBASE_CLI,...args]);
  else await run('pnpm',['dlx','firebase-tools@15.22.1',...args]);
  console.log('Firebase release verified:',await verifyHostedBuild('https://academica-writer.web.app/'));
}catch(error){console.error('Firebase publication failed:',error.message);process.exitCode=1;}
