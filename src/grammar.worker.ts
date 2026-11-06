import {LocalLinter} from 'harper.js';
import {binary} from 'harper.js/binary';
import {checkGrammar} from './lib/grammar-engine';
import type {GrammarBlock,GrammarIssue} from './lib/grammar-analysis';

const cache=new Map<string,Omit<GrammarIssue,'id'>[]>();
let linter:LocalLinter;
const ready=(async()=>{linter=new LocalLinter({binary});await linter.setup();const config=await linter.getDefaultLintConfig();await linter.setLintConfig({...config,SpellCheck:false,LongSentences:false});})();
let queue=Promise.resolve();
self.onmessage=event=>{const data=event.data as {id:number;blocks:GrammarBlock[]};queue=queue.then(async()=>{try{await ready;self.postMessage({id:data.id,issues:await checkGrammar(linter,data.blocks,cache)});}catch{self.postMessage({id:data.id,error:true});}});};
