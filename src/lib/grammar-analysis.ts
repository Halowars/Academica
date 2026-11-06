import type {Node as PMNode} from '@tiptap/pm/model';
import type {Source} from './model';
import {verifiedQuotationRanges} from './editor-analysis';

export type GrammarBlock={pos:number;text:string};
export type GrammarIssue={id:string;from:number;to:number;text:string;message:string;kind:string;suggestions:string[]};
export function grammarBlocks(doc:PMNode,sources:Source[]):GrammarBlock[]{
  const protectedRanges=verifiedQuotationRanges(doc,sources),blocks:GrammarBlock[]=[];
  doc.descendants((node,pos)=>{
    if(['table','figure','equation'].includes(node.type.name))return false;
    if(node.type.name!=='paragraph')return;
    const start=pos+1,text=node.textBetween(0,node.content.size,'\n','\ufffc'),characters=text.split('');
    const mask=(from:number,to:number)=>{for(let i=Math.max(0,from-start);i<Math.min(characters.length,to-start);i++)characters[i]=' ';};
    node.descendants((child,offset)=>{if(child.isText&&child.marks.some(mark=>mark.type.name==='code'||mark.type.name==='link'))mask(start+offset,start+offset+child.nodeSize);});
    for(const range of protectedRanges)if(range.from<start+characters.length&&range.to>start)mask(range.from,range.to);
    const value=characters.join('').replace(/\ufffc/g,' ');if(value.trim())blocks.push({pos:start,text:value});return false;
  });return blocks;
}
export function grammarIgnoreKey(issue:Pick<GrammarIssue,'text'|'message'>){return issue.message+'\n'+issue.text;}
