import {cp,mkdir,copyFile,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
const require=createRequire(import.meta.url);
await mkdir('public/vendor/katex',{recursive:true});await mkdir('public/spelling',{recursive:true});
for(const [source,dest] of [['node_modules/pagedjs/dist/paged.polyfill.js','public/vendor/paged.polyfill.js'],['node_modules/pdfjs-dist/build/pdf.worker.min.mjs','public/vendor/pdf.worker.min.mjs'],['node_modules/katex/dist/katex.min.css','public/vendor/katex/katex.min.css'],['node_modules/pagedjs/LICENSE.md','public/vendor/PAGEDJS-LICENSE.md'],['node_modules/pdfjs-dist/LICENSE','public/vendor/PDFJS-LICENSE'],['node_modules/katex/LICENSE','public/vendor/katex/LICENSE'],['node_modules/dictionary-en/index.aff','public/spelling/en.aff'],['node_modules/dictionary-en/index.dic','public/spelling/en.dic'],['node_modules/dictionary-en/license','public/spelling/LICENSE']])await copyFile(source,dest);
await cp('node_modules/katex/dist/fonts','public/vendor/katex/fonts',{recursive:true});
