import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
await build({entryPoints:['tests/core.test.ts'],outfile:'work/core-tests.mjs',bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',define:{'import.meta.env.BASE_URL':JSON.stringify('./')},plugins:[{name:'raw-csl',setup(b){b.onResolve({filter:/\.(csl|xml)\?raw$/},a=>({path:resolve(a.resolveDir,a.path.replace(/\?raw$/,'')),namespace:'raw'}));b.onLoad({filter:/.*/,namespace:'raw'},async a=>({contents:await readFile(a.path,'utf8'),loader:'text'}));}}]});
await import('../work/core-tests.mjs');
await import('./hosting.test.mjs');
