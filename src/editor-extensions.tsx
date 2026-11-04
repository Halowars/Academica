'use client';
import { Node,Extension,mergeAttributes,type Editor } from '@tiptap/core';
import { NodeViewWrapper,ReactNodeViewRenderer,type NodeViewProps } from '@tiptap/react';
import { Plugin,PluginKey } from '@tiptap/pm/state';
import { Table,TableRow,TableCell,TableHeader } from '@tiptap/extension-table';
import { MessageSquare,Check,ListChecks,MoreHorizontal } from 'lucide-react';
import DOMPurify from 'dompurify';
import katex from 'katex';
import { useWorkspace } from './lib/store';
import { formatPaper } from './lib/citations';
import { objectLabels,sourceLabel } from './lib/model';
import {pastedQuotation,matchQuotation} from './lib/quote-match';

export type EditorRange={from:number;to:number};
export type AcademicActions={command:(name:string,editor:Editor,range:EditorRange,quote?:string)=>void;annotation:(id:string,rect:DOMRect)=>void;source:(id:string)=>void;editObject:(kind:string,editor:Editor,pos:number,attrs:any)=>void;activate:(editor:Editor)=>void};
const clean=(html:string)=>DOMPurify.sanitize(html,{ALLOWED_TAGS:['i','em','b','strong','span','a','sup','sub'],ALLOWED_ATTR:['href','class']});
function CiteView(props:NodeViewProps){const paper=useWorkspace(s=>s.paper);if(!paper)return null;const attrs=props.node.attrs;const source=paper.sources.find(s=>s.id===attrs.sourceId);const html=formatPaper(paper).inline[attrs.id]||'(source needed)';return <NodeViewWrapper as="span" className="citation-object" contentEditable={false}><button type="button" className="inline-citation" data-source-id={attrs.sourceId} title={(source?sourceLabel(source):'Source needed')+(attrs.locator?' · '+attrs.locator:'')} onClick={()=>props.extension.options.actions.source(attrs.sourceId)} dangerouslySetInnerHTML={{__html:clean(html)}}/></NodeViewWrapper>;}
function QuotationView(props:NodeViewProps){const paper=useWorkspace(s=>s.paper);if(!paper)return null;const attrs=props.node.attrs;const source=paper.sources.find(s=>s.id===attrs.sourceId);const html=formatPaper(paper).inline[attrs.id]||'(source needed)';return <NodeViewWrapper as="span" className="quotation-object" contentEditable={false}><button className="quoted-passage" type="button" title={(source?sourceLabel(source):'Source needed')+' · '+(attrs.locator||'Location needed')+' · '+(source&&matchQuotation(source,attrs.text).status==='verified'?'Wording found in imported article text':'Wording not verified against article text')} onClick={()=>props.extension.options.actions.source(attrs.sourceId)}>“{attrs.text}”</button>{' '}<span className="inline-citation" dangerouslySetInnerHTML={{__html:clean(html)}}/></NodeViewWrapper>;}
function AnnotationView(props:NodeViewProps){const note=useWorkspace(s=>s.paper?.annotations[props.node.attrs.id]);if(!note)return <NodeViewWrapper as="span"/>;const remaining=note.tasks.filter(t=>!t.done).length;return <NodeViewWrapper as="span" className="annotation-object" contentEditable={false}><button type="button" className={'note-marker '+(note.kind==='todo'?'todo-marker ':'')+(note.kind==='todo'&&!remaining?'finished':'')} data-annotation-id={note.id} aria-label={note.kind==='note'?'Open passage note':`Open checklist, ${remaining} items remaining`} title={note.kind==='note'?'Passage note':`${remaining} checklist items remaining`} onClick={event=>props.extension.options.actions.annotation(note.id,event.currentTarget.getBoundingClientRect())}>{note.kind==='note'?<MessageSquare size={12}/>:remaining?<ListChecks size={13}/>:<Check size={12}/>}</button></NodeViewWrapper>;}
function FigureView(props:NodeViewProps){const paper=useWorkspace(s=>s.paper);const attrs=props.node.attrs;const label=paper?objectLabels(paper)[attrs.id]:'Figure';return <NodeViewWrapper className="figure-object" contentEditable={false}><figure><img src={attrs.src} alt={attrs.alt||attrs.caption||label}/><figcaption><strong>{label}</strong>{attrs.caption?'. '+attrs.caption:''}</figcaption></figure><button type="button" className="object-edit icon-button" aria-label="Edit figure" onClick={()=>props.extension.options.actions.editObject('figure',props.editor,typeof props.getPos==='function'?(props.getPos()??0):0,attrs)}><MoreHorizontal size={16}/></button></NodeViewWrapper>;}
function EquationView(props:NodeViewProps){const paper=useWorkspace(s=>s.paper);const attrs=props.node.attrs;const number=paper?(objectLabels(paper)[attrs.id]||'').replace('Equation ',''):'';return <NodeViewWrapper className="equation-object" contentEditable={false}><div dangerouslySetInnerHTML={{__html:katex.renderToString(attrs.latex||'',{throwOnError:false,displayMode:true,trust:false})}}/><span>({number})</span><button type="button" className="object-edit icon-button" aria-label="Edit equation" onClick={()=>props.extension.options.actions.editObject('equation',props.editor,typeof props.getPos==='function'?(props.getPos()??0):0,attrs)}><MoreHorizontal size={16}/></button></NodeViewWrapper>;}
function RefView(props:NodeViewProps){const paper=useWorkspace(s=>s.paper);return <NodeViewWrapper as="span" contentEditable={false} className="crossref-object">{paper?objectLabels(paper)[props.node.attrs.targetId]||'reference needed':'reference'}</NodeViewWrapper>;}
function atom(name:string,attrs:string[],view:any,actions:AcademicActions,block=false){return Node.create({name,group:block?'block':'inline',inline:!block,atom:true,draggable:block,addOptions(){return{actions};},addAttributes(){return Object.fromEntries(attrs.map(attr=>[attr,{default:null}]));},parseHTML(){return[{tag:`span[data-academic="${name}"]`}];},renderHTML({HTMLAttributes}){return['span',mergeAttributes(HTMLAttributes,{'data-academic':name})];},addNodeView(){return ReactNodeViewRenderer(view);}});}
export function academicExtensions(actions:AcademicActions){return[
  atom('citation',['id','sourceId','locatorType','locator'],CiteView,actions),
  atom('quotation',['id','sourceId','text','locatorType','locator','passageId','verification'],QuotationView,actions),
  atom('annotation',['id'],AnnotationView,actions),
  atom('figure',['id','src','caption','alt'],FigureView,actions,true),
  atom('equation',['id','latex'],EquationView,actions,true),
  atom('crossref',['targetId'],RefView,actions),
  Table.extend({addAttributes(){return{...this.parent?.(),id:{default:null,renderHTML:attrs=>({'data-object-id':attrs.id})},caption:{default:'',renderHTML:attrs=>({'data-caption':attrs.caption})}};}}).configure({resizable:false}),TableRow,TableHeader,TableCell,
  Extension.create({name:'academicShortcuts',addProseMirrorPlugins(){const editor=this.editor;return[new Plugin({key:new PluginKey('academic-shortcuts'),appendTransaction(transactions,oldState,state){
    if(!transactions.some(t=>t.docChanged)||transactions.some(t=>t.getMeta('academic-command'))||!state.selection.empty)return null;
    const head=state.selection.$from;if(!head.parent.isTextblock)return null;
    const before=head.parent.textBetween(0,head.parentOffset,'\n','\ufffc');const match=before.match(/(?:^|\s)(\/(cite|note|todo|heading|figure|table|equation|ref))$/);if(!match)return null;
    const start=state.selection.from-match[1].length;const tr=state.tr.delete(start,state.selection.from).setMeta('academic-command',true);
    queueMicrotask(()=>{if(!editor.isDestroyed)actions.command(match[2],editor,{from:start,to:start});});return tr;
  },props:{handlePaste(view,event,slice){
    const text=event.clipboardData?.getData('text/plain')||'',quote=pastedQuotation(text);
    // Internal structured copies already carry their citations. Let normal paste finish first.
    let structured=false;slice.content.descendants(node=>{if(['citation','quotation','annotation'].includes(node.type.name))structured=true;});
    if(!quote||structured||/data-academic=/.test(event.clipboardData?.getData('text/html')||''))return false;
    const start=view.state.selection.from;
    queueMicrotask(()=>{if(editor.isDestroyed)return;const end=editor.state.selection.from;if(end>start)actions.command('cite',editor,{from:start,to:end},quote);});
    return false;
  }}})];}})
];}
