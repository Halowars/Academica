import type {Node as PMNode} from '@tiptap/pm/model';
import {PluginKey} from '@tiptap/pm/state';
import {Decoration,DecorationSet} from '@tiptap/pm/view';
import type {Editor} from '@tiptap/core';
import type {AcademicActions} from './editor-extensions';
import type {Source} from './lib/model';
import {editorQuotations} from './lib/editor-analysis';
import {matchQuotation} from './lib/quote-match';

export const academicDecorationKey=new PluginKey<DecorationSet>('academic-shortcuts');
type Link={sourceId:string;citationId?:string;passageId?:string;text?:string;quoteText?:string;quote:boolean};
type Block={unlinked:{from:number;to:number;text:string}[];link?:Link};
const blocks=new WeakMap<PMNode,Block>();
function analyze(node:PMNode):Block{
  const cached=blocks.get(node);if(cached)return cached;
  const unlinked:Block['unlinked']=[],text=node.textBetween(0,node.content.size,'\n','\ufffc');
  for(const match of text.matchAll(/“([^“”\ufffc]+)”|"([^"\ufffc]+)"/g)){const from=match.index!,to=from+match[0].length;let linked=false;node.nodesBetween(from,to,n=>{if(n.marks.some(m=>m.type.name==='quoted'))linked=true;});if(!linked)unlinked.push({from:from+1,to:to+1,text:match[1]||match[2]});}
  let link:Link|undefined;
  node.descendants(child=>{if(child.type.name==='quotation'||child.type.name==='citation')link={...child.attrs,citationId:child.attrs.id,quote:child.type.name==='quotation'||!!child.attrs.quoteText} as Link;for(const mark of child.marks){if(mark.type.name==='quoted')link={...mark.attrs,quote:true} as Link;if(mark.type.name==='evidence')link={...mark.attrs,quote:false} as Link;}});
  const result={unlinked,link};blocks.set(node,result);return result;
}
export function academicDecorations(doc:PMNode,sources:Source[],editor:Editor,actions:AcademicActions){
  const items:Decoration[]=[],byId=new Map(sources.map(s=>[s.id,s])),quotes=new Map(editorQuotations(doc).map(q=>[q.citationId,q.text]));
  doc.descendants((node,pos)=>{if(!node.isTextblock)return;const block=analyze(node);
    for(const q of block.unlinked){const from=pos+q.from,to=pos+q.to;items.push(Decoration.inline(from,to,{class:'unlinked-quotation',title:'Connect this quotation to a source','data-quote-from':String(from),'data-quote-to':String(to),'data-quote-text':q.text}));}
    const link=block.link;if(!link)return false;
    const text=quotes.get(link.citationId||'')??link.text??link.quoteText??'',source=byId.get(link.sourceId),verified=source&&link.quote&&matchQuotation(source,text).status==='verified',status=!source?'missing':verified?'verified':link.quote?'review':'linked';
    const message=({missing:'Source missing',verified:'Exact quotation verified in imported article text',review:'Quotation needs wording or location review',linked:'Source attached to this paragraph · paraphrase is your interpretation'})[status];
    items.push(Decoration.widget(pos+1,()=>{const button=document.createElement('button');button.type='button';button.tabIndex=-1;button.contentEditable='false';button.className='provenance-marker '+status;button.title=message;button.setAttribute('aria-label',message);button.textContent=({verified:'✓',linked:'↗',review:'△',missing:'!'})[status];button.addEventListener('mousedown',e=>e.preventDefault());button.addEventListener('click',e=>{e.preventDefault();if(source)actions.source(source.id,text,link.passageId);else actions.command('evidence',editor,{from:pos+1,to:pos+node.nodeSize-1});});return button;},{side:-1,key:`provenance-${pos}-${link.sourceId}-${status}-${text}`,ignoreSelection:true}));return false;
  });return DecorationSet.create(doc,items);
}
