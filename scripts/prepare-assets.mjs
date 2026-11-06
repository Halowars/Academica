import {cp,mkdir,copyFile,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {dirname,join} from 'node:path';
const require=createRequire(import.meta.url);
await mkdir('public/vendor/katex',{recursive:true});await mkdir('public/spelling',{recursive:true});
for(const [source,dest] of [['node_modules/pagedjs/dist/paged.polyfill.js','public/vendor/paged.polyfill.js'],['node_modules/pdfjs-dist/build/pdf.worker.min.mjs','public/vendor/pdf.worker.min.mjs'],['node_modules/katex/dist/katex.min.css','public/vendor/katex/katex.min.css'],['node_modules/pagedjs/LICENSE.md','public/vendor/PAGEDJS-LICENSE.md'],['node_modules/pdfjs-dist/LICENSE','public/vendor/PDFJS-LICENSE'],['node_modules/katex/LICENSE','public/vendor/katex/LICENSE'],['node_modules/dictionary-en/index.aff','public/spelling/en.aff'],['node_modules/dictionary-en/index.dic','public/spelling/en.dic'],['node_modules/dictionary-en/license','public/spelling/LICENSE'],['node_modules/harper.js/LICENSE','public/vendor/HARPER-LICENSE']])await copyFile(source,dest);
await cp('node_modules/katex/dist/fonts','public/vendor/katex/fonts',{recursive:true});
// Build the desktop extension download from tracked source on every release.
const {zipSync}=await import('fflate');
const {readFile,readdir,writeFile}=await import('node:fs/promises');
// Paged.js 0.4.3 searches repeated text to recover continuation offsets. That can
// repeat a long paragraph and drop later sections. Carry the original UTF-16
// offset on its cloned text node instead. Keep this patch exact and versioned.
let paged=await readFile('public/vendor/paged.polyfill.js','utf8');
const trimText='clone.textContent = clone.textContent.substring(breakToken.offset);';
const recoverOffset='offset += node.textContent.indexOf(container.textContent);';
if(paged.split(trimText).length!==2||paged.split(recoverOffset).length!==2)throw new Error('Paged.js changed: review the continuation-offset patch before publishing.');
paged=paged.replace(trimText,trimText+' clone.__academicaSourceOffset = breakToken.offset;').replace(recoverOffset,'offset += typeof container.__academicaSourceOffset === "number" ? container.__academicaSourceOffset : Math.max(0, node.textContent.indexOf(container.textContent));');
await writeFile('public/vendor/paged.polyfill.js',paged);
const extensionFiles={};for(const name of await readdir('extension'))extensionFiles[name]=new Uint8Array(await readFile('extension/'+name));
extensionFiles['Readability.js']=new Uint8Array(await readFile('node_modules/@mozilla/readability/Readability.js'));
extensionFiles['READABILITY-LICENSE']=new Uint8Array(await readFile('node_modules/@mozilla/readability/LICENSE.md'));
await mkdir('public/downloads',{recursive:true});await writeFile('public/downloads/academica-clipper.zip',zipSync(extensionFiles));
