import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {verifyHostedBuild} from '../scripts/verify-hosting.mjs';

const directory=await mkdtemp(join(tmpdir(),'academica-hosting-'));
const bytes=new TextEncoder().encode('current build'),hash=createHash('sha256').update(bytes).digest('hex');
const release={version:'test',revision:'test-commit',builtAt:'test-time',assets:{'index.html':hash,'duck/test.mp3':hash}};
const fetcher=async url=>new URL(url).pathname.endsWith('/release.json')?Response.json(release):new Response(bytes);
try{
  await writeFile(join(directory,'release.json'),JSON.stringify(release));
  const verified=await verifyHostedBuild('https://example.org/Academica/',{directory,fetcher});
  assert.equal(verified.verifiedAssets,2);console.log('✓ Hosting verification accepts matching deployed files under a project path');
  await assert.rejects(verifyHostedBuild('https://example.org/',{directory,fetcher:async url=>new URL(url).pathname.endsWith('/release.json')?Response.json({...release,revision:'old-commit'}):new Response(bytes)}),/live site is stale/);console.log('✓ Hosting verification rejects a stale published revision');
  await assert.rejects(verifyHostedBuild('https://example.org/',{directory,fetcher:async url=>new URL(url).pathname.endsWith('/release.json')?Response.json(release):new Response('wrong or fallback HTML')}),/differs from the build/);console.log('✓ Hosting verification rejects stale assets even when the server returns HTTP 200');
}finally{await rm(directory,{recursive:true,force:true});}
