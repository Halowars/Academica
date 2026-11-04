import {build} from 'esbuild';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
await build({entryPoints:['tests/performance.ts'],outfile:'work/performance.mjs',bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{name:'raw-csl',setup(b){b.onResolve({filter:/\.(csl|xml)\?raw$/},a=>({path:resolve(a.resolveDir,a.path.replace(/\?raw$/,'')),namespace:'raw'}));b.onLoad({filter:/.*/,namespace:'raw'},async a=>({contents:await readFile(a.path,'utf8'),loader:'text'}));}}]});
await import('../work/performance.mjs');
