import type {Node as PMNode} from '@tiptap/pm/model';
import type {Source} from './model';
import {matchQuotation} from './quote-match';

type QuoteGroup={citationId:string;sourceId:string;passageId:string;text:string;ranges:{from:number;to:number}[]};
const groups=new WeakMap<PMNode,QuoteGroup[]>();
export function editorQuotations(doc:PMNode){
  const cached=groups.get(doc);if(cached)return cached;
  const found=new Map<string,QuoteGroup>();
  doc.descendants((node,pos)=>{if(!node.isText)return;const mark=node.marks.find(m=>m.type.name==='quoted');if(!mark)return;const {citationId,sourceId,passageId}=mark.attrs,key=sourceId+'\n'+citationId;let quote=found.get(key);if(!quote){quote={citationId,sourceId,passageId,text:'',ranges:[]};found.set(key,quote);}quote.text+=node.text||'';quote.ranges.push({from:pos,to:pos+node.nodeSize});});
  const result=[...found.values()].map(q=>({...q,text:q.text.replace(/^[“"]|[”"]$/g,'')}));groups.set(doc,result);return result;
}
export function verifiedQuotationRanges(doc:PMNode,sources:Source[]){
  const byId=new Map(sources.map(s=>[s.id,s]));return editorQuotations(doc).flatMap(quote=>{const source=byId.get(quote.sourceId);return source&&matchQuotation(source,quote.text).status==='verified'?quote.ranges:[];}).sort((a,b)=>a.from-b.from);
}
// Pure worker input preparation is also used by regression tests: only wording
// actually present in the linked article is exempt from the writing dictionary.
export function spellingBlocks(doc:PMNode,sources:Source[]){
  const protectedRanges=verifiedQuotationRanges(doc,sources),blocks:{pos:number;text:string}[]=[];let at=0;
  doc.descendants((node,pos)=>{if(!node.isText||node.marks.some(m=>m.type.name==='code'||m.type.name==='link'))return;while(at<protectedRanges.length&&protectedRanges[at].to<=pos)at++;if(protectedRanges[at]?.from<=pos&&protectedRanges[at].to>=pos+node.nodeSize)return;blocks.push({pos,text:node.text||''});});return blocks;
}
