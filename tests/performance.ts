// Synthetic workloads, no network or personal manuscript data. Run with tests/benchmark.mjs.
import {performance} from 'node:perf_hooks';
import {createPaper,emptySource} from '../src/lib/model';
import {useWorkspace} from '../src/lib/store';
import {formatPaper} from '../src/lib/citations';
import {matchQuotation} from '../src/lib/quote-match';

const paper=createPaper('Performance test');
paper.sources=Array.from({length:30},(_,i)=>({...emptySource(),id:'source-'+i,title:'Synthetic article '+i,authors:'Example, A.',year:'2025',passages:Array.from({length:80},(_,j)=>({id:`${i}-${j}`,paragraph:j+1,text:`Article ${i}, paragraph ${j}. `+'The measurements were recorded independently before the results were reviewed. '.repeat(12)}))}));
paper.sections=Array.from({length:8},(_,i)=>({id:'section-'+i,title:'Section '+i,content:{type:'doc',content:Array.from({length:24},(_,j)=>({type:'paragraph',content:[{type:'text',text:'The writing remains editable while source verification runs. '.repeat(10)},...(j%8===0?[{type:'citation',attrs:{id:`cite-${i}-${j}`,sourceId:'source-'+i,locator:'2',locatorType:'page'}}]:[])]}))}}));
function bench(name:string,iterations:number,fn:()=>void){fn();const start=performance.now();for(let i=0;i<iterations;i++)fn();console.log(JSON.stringify({name,iterations,totalMs:+(performance.now()-start).toFixed(2)}));}
console.log(JSON.stringify({sourceTextCharacters:paper.sources.reduce((n,s)=>n+s.passages.reduce((v,p)=>v+p.text.length,0),0),paragraphs:192,citations:24}));
useWorkspace.getState().setPaper(paper);
let edit=0;
bench('save 100 typing edits',100,()=>{const store=useWorkspace.getState(),content={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Typing change '+edit++}]}]};store.updateSection(paper.sections[0].id,content);});
formatPaper(paper);
bench('format citations for 100 cursor-only renders',100,()=>{formatPaper(paper);});
let contentEdits=0;
bench('format 30 text-only manuscript edits',30,()=>{const next={...paper,updatedAt:String(contentEdits++),sections:[{...paper.sections[0],content:{...paper.sections[0].content,content:[...paper.sections[0].content.content!,{type:'paragraph',content:[{type:'text',text:'One extra sentence.'}]}]}},...paper.sections.slice(1)]};formatPaper(next);});
bench('verify 100 absent quotations in an article',100,()=>{matchQuotation(paper.sources[0],'These particular words do not occur in the imported article.');});
let queries=0;
bench('verify 100 different absent quotations',100,()=>{matchQuotation(paper.sources[0],'A different absent quotation, sequence '+queries++);});
