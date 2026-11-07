import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {Extension,type Editor} from '@tiptap/core';
import {Plugin,PluginKey} from '@tiptap/pm/state';
import {Decoration,DecorationSet} from '@tiptap/pm/view';
import {allNodes,objectLabels,type Paper,type Section} from './lib/model';
import {documentFormat,pageDimensions,sectionLabel} from './lib/formats';
import {formatPaper} from './lib/citations';
import DOMPurify from 'dompurify';
import PaperEditor from './paper-editor';
import type {AcademicActions} from './editor-extensions';
import type {SpellingSelection} from './spelling';
import {useDocumentZoom,type ZoomProps} from './document-zoom';
import SectionHeading from './section-heading';
import {MoreHorizontal} from 'lucide-react';
import type { WritingActivity } from './lib/writing-activity';

const key=new PluginKey<DecorationSet>('academic-page-flow');
export const editorRegistry=new Map<string,Editor>();
export const pageFlow=Extension.create({name:'academicPageFlow',addProseMirrorPlugins(){return[new Plugin({key,state:{init:(_,s)=>DecorationSet.empty,apply(tr,value){const next=tr.getMeta(key);return next===undefined?value.map(tr.mapping,tr.doc):DecorationSet.create(tr.doc,next);}},props:{decorations:state=>key.getState(state)}})];}});
type Candidate={top:number;bottom:number;floating?:boolean;editor?:Editor;pos?:number;external?:HTMLElement;forced?:boolean;lineElement?:HTMLElement;lineTop?:number};
function FrontLists({paper}:{paper:Paper}){const f=documentFormat(paper),labels=objectLabels(paper);return <>{f.contents&&<div className="writer-contents"><div data-flow-external data-flow-break="true"><h2>Contents</h2></div>{paper.sections.map((s,i)=><p key={s.id} data-flow-external><span>{sectionLabel(paper,i)}</span><span className="toc-dots"/><span>…</span></p>)}</div>}{([[f.listFigures,'figure','List of Figures'],[f.listTables,'table','List of Tables']] as const).map(([enabled,type,title])=>enabled&&<div className="writer-contents" key={type}><div data-flow-external data-flow-break="true"><h2>{title}</h2></div>{allNodes(paper,type).map(n=><p key={n.attrs?.id} data-flow-external><span>{labels[n.attrs?.id]}{n.attrs?.caption?'. '+n.attrs.caption:''}</span><span className="toc-dots"/><span>…</span></p>)}</div>)}</>;}
function firstPositionAtLine(editor:Editor,element:HTMLElement,top:number,fallback:number,scale:number){
  const tolerance=3*scale;
  const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);let text:Node|null;
  while((text=walker.nextNode())){
    if((text.parentElement?.closest('[contenteditable="false"]')))continue;
    const range=document.createRange();range.selectNodeContents(text);const rects=[...range.getClientRects()];if(!rects.some(r=>Math.abs(r.top-top)<tolerance))continue;
    let low=0,high=text.textContent?.length||0;while(low<high){const mid=(low+high)>>1;range.setStart(text,mid);range.setEnd(text,Math.min(mid+1,text.textContent?.length||0));const r=range.getBoundingClientRect();if(r.top<top-2*scale)low=mid+1;else high=mid;}
    try{return editor.view.posAtDOM(text,low);}catch{}
  }
  const found=editor.view.posAtCoords({left:element.getBoundingClientRect().left+scale,top:top+3*scale});return found?.pos??fallback;
}
export default function PaginatedWriter({paper,sections,focusedSectionId,actions,activity,typingSound,onSpelling,onEditSection,onEditSource,onCount,...zoomProps}:{paper:Paper;sections:Section[];focusedSectionId?:string;actions:AcademicActions;activity:WritingActivity;typingSound:boolean;onSpelling:(s:SpellingSelection)=>void;onEditSection:(s:Section)=>void;onEditSource:(id:string)=>void;onCount:(count:number)=>void}&ZoomProps){
  const root=useRef<HTMLDivElement>(null),wrap=useRef<HTMLDivElement>(null),[pages,setPages]=useState(1),[active,setActive]=useState(1),f=documentFormat(paper),dimensions=pageDimensions(f),gap=28,stride=dimensions.height+gap;
  const scale=useDocumentZoom(wrap,root,dimensions.width,zoomProps);
  const signature=JSON.stringify(f),lastScroll=useRef(0);
  useEffect(()=>{
    let cancelled=false,frame=0;const timer=setTimeout(()=>{frame=requestAnimationFrame(()=>{const el=root.current;if(cancelled||!el)return;
      const editors=sections.map(s=>editorRegistry.get(s.id)).filter((e):e is Editor=>!!e&&!e.isDestroyed);
      if(editors.some(e=>e.view.composing))return;
      const scroll=el.closest<HTMLElement>('.page-scroll'),scrollBefore=scroll?.scrollTop||0,focused=editors.find(e=>e.isFocused),head=focused?.state.selection.head;
      const caretBefore=focused&&head!==undefined?focused.view.coordsAtPos(head).top:undefined;
      // Remove, measure and replace gaps in ONE animation frame. Painting the
      // temporarily collapsed manuscript made every pause in typing jump.
      for(const editor of editors)if(key.getState(editor.state)?.find().length)editor.view.dispatch(editor.state.tr.setMeta(key,[]).setMeta('addToHistory',false));
      el.querySelectorAll<HTMLElement>('[data-flow-external]').forEach(n=>n.style.paddingTop='0px');
      const rect=el.getBoundingClientRect(),base=rect.top,candidates:Candidate[]=[],z=rect.width/dimensions.width||1;
        for(const element of el.querySelectorAll<HTMLElement>('[data-flow-external]')){const r=element.getBoundingClientRect();candidates.push({top:(r.top-base)/z,bottom:(r.bottom-base)/z,external:element,forced:element.dataset.flowBreak==='true'});}
        for(const editor of editors)editor.state.doc.descendants((node,pos)=>{
          if(node.type.name==='table'||node.type.name==='figure'||node.type.name==='equation'||node.type.name==='pageBreak'){const element=editor.view.nodeDOM(pos) as HTMLElement|null;if(!element?.getBoundingClientRect)return false;const r=element.getBoundingClientRect(),floating=node.type.name==='figure'&&element.dataset.figureWrap==='wrap';candidates.push({top:(r.top-base)/z,bottom:(r.bottom-base)/z+(floating?parseFloat(getComputedStyle(element).marginBottom)||0:0),editor,pos,floating,forced:node.type.name==='pageBreak'});return false;}
          if(!node.isTextblock)return;const element=editor.view.nodeDOM(pos) as HTMLElement|null;if(!element)return;const range=document.createRange();range.selectNodeContents(element);const rects=[...range.getClientRects()].filter(r=>r.height>z&&r.width>0).sort((a,b)=>a.top-b.top);const lines:{top:number;bottom:number}[]=[];for(const r of rects){const last=lines.at(-1);if(last&&Math.abs(last.top-r.top)<3*z)last.bottom=Math.max(last.bottom,r.bottom);else lines.push({top:r.top,bottom:r.bottom});}if(!lines.length){const r=element.getBoundingClientRect();lines.push({top:r.top,bottom:r.bottom});}
          // Resolve a text offset only if this line actually needs a page gap.
          for(let i=0;i<lines.length;i++){const line=lines[i];candidates.push({top:(line.top-base)/z,bottom:(line.bottom-base)/z,editor,pos,...(i>0?{lineElement:element,lineTop:line.top}:{})});}return false;
        });
        // Keep a floating figure and the text beside it together at page boundaries.
        for(const floating of candidates.filter(c=>c.floating)){
          const edge=floating.bottom;
          for(const line of candidates)if(!line.floating&&line.editor===floating.editor&&(line.pos??-1)>(floating.pos??0)&&line.top>=floating.top-.5&&line.top<edge)floating.bottom=Math.max(floating.bottom,line.bottom);
        }
        candidates.sort((a,b)=>a.top-b.top);let inserted=0,page=0;const decos=new Map<Editor,Decoration[]>(),externalGaps=new Map<HTMLElement,number>();
        for(const c of candidates){let top=c.top+inserted,bottom=c.bottom+inserted;while(top>=(page+1)*stride+f.margin*96)page++;
          const limit=page*stride+dimensions.height-f.margin*96,usable=dimensions.height-2*f.margin*96;
          if(c.forced||bottom>limit+.5&&c.bottom-c.top<usable){const next=(page+1)*stride+f.margin*96,space=Math.max(0,next-top);if(space>0){if(c.external)externalGaps.set(c.external,space);else if(c.editor&&c.pos!==undefined){const pos=c.lineElement?firstPositionAtLine(c.editor,c.lineElement,c.lineTop!,c.pos,z):c.pos;const deco=Decoration.widget(pos,()=>{const span=document.createElement('span');span.className='editor-page-gap';span.contentEditable='false';span.setAttribute('aria-hidden','true');span.style.height=space+'px';return span;},{side:-1,key:'gap-'+pos,ignoreSelection:true});decos.set(c.editor,[...(decos.get(c.editor)||[]),deco]);}inserted+=space;page++;}}
        }
        // Finish position reads before writing heading padding, which moves all
        // later lines. This keeps lazy page-break offsets in the measured frame.
        for(const [element,padding] of externalGaps)element.style.paddingTop=padding+'px';
        for(const editor of editors)if(decos.has(editor))editor.view.dispatch(editor.state.tr.setMeta(key,decos.get(editor)!).setMeta('addToHistory',false));
        // The browser must not anchor to a disappearing gap widget. Preserve
        // the active caret's viewport position across the completed layout.
        if(scroll){if(focused&&head!==undefined&&caretBefore!==undefined&&!focused.isDestroyed)scroll.scrollTop+=focused.view.coordsAtPos(head).top-caretBefore;else scroll.scrollTop=scrollBefore;}
        const total=Math.max(1,page+1);setPages(total);onCount(total);
      });
    },160);return()=>{cancelled=true;clearTimeout(timer);cancelAnimationFrame(frame);};
  },[paper.updatedAt,sections.map(s=>s.id).join(','),signature,focusedSectionId]);
  useEffect(()=>{const scroll=wrap.current?.closest('.page-scroll');if(!scroll)return;function update(){if(!root.current)return;const relative=(scroll!.getBoundingClientRect().top-root.current.getBoundingClientRect().top)/(scale||1);setActive(Math.min(pages,Math.max(1,Math.floor((relative+dimensions.height*.35)/stride)+1)));lastScroll.current=scroll!.scrollTop;}scroll.addEventListener('scroll',update,{passive:true});return()=>scroll.removeEventListener('scroll',update);},[scale,pages,stride]);
  const refs=formatPaper(paper).bibliography,full=!focusedSectionId,firstBody=sections.findIndex(s=>!['abstract','acknowledgments'].includes(s.kind||''));
  const focusedIndex=paper.sections.findIndex(s=>s.id===focusedSectionId),context=focusedIndex>=0?paper.sections[focusedIndex].title:paper.kind==='dissertation'?'Dissertation':'Manuscript';
  const style={'--sheet-width':dimensions.width+'px','--sheet-height':dimensions.height+'px','--sheet-stride':stride+'px','--page-margin':f.margin*96+'px','--doc-font':`"${f.font}",serif`,'--doc-size':f.size*96/72+'px','--doc-line':f.lineHeight,'--doc-indent':f.indent*96+'px','--doc-after':f.paragraphAfter*96/72+'px',minHeight:pages*stride-gap} as CSSProperties;
  return <div className="paged-writer-wrap" ref={wrap}><div className="live-page-status"><span className="writing-context" title={context}>{context}</span><span>Page {active} of {pages}</span></div><div className="document-zoom-stage"><div className="paged-writer" ref={root} style={style}><div className="sheet-backgrounds" aria-hidden="true">{Array.from({length:pages},(_,i)=><div className="writer-sheet" key={i} style={{top:i*stride,height:dimensions.height}}><span className={'writer-page-number '+f.pagePosition}>{paper.style==='mla'?(paper.author.trim().split(/\s+/).at(-1)||'')+' ':''}{i+1}</span></div>)}</div><div className="flowing-manuscript">
    {full&&f.titlePage&&<div className="writer-title-page"><h1>{paper.title}</h1>{[paper.author,paper.institution,paper.course,paper.instructor,paper.date?new Date(paper.date+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}):''].filter(Boolean).map((t,i)=><p key={i}>{t}</p>)}</div>}
    {sections.map((section,index)=><section className="flow-section" key={section.id} data-section-role={section.kind||'body'} id={'object-'+section.id}>{full&&index===firstBody&&<><FrontLists paper={paper}/><div data-flow-external data-flow-break={index>0||f.titlePage||f.contents||f.listFigures||f.listTables?'true':undefined}><h1 className="writer-body-title">{paper.title}</h1></div></>}<SectionHeading paper={paper} section={section} editorLabel={full&&paper.style==='apa'&&index===firstBody&&/^introduction$/i.test(section.title.trim())} breakBefore={full&&index!==firstBody&&(['abstract','acknowledgments'].includes(section.kind||'')||index===0&&f.titlePage||['thesis','dissertation'].includes(paper.kind))} onEdit={onEditSection}/><PaperEditor paperId={paper.id} section={section} actions={actions} activity={activity} typingSound={typingSound} onSpelling={onSpelling}/></section>)}
    {full&&refs.length>0&&<section className="flow-bibliography"><div data-flow-external data-flow-break="true"><h2>{paper.style==='mla'?'Works Cited':'References'}</h2></div>{refs.map(r=><div key={r.sourceId} data-flow-external className="flow-reference"><div dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(r.html)}}/><button className="icon-button" aria-label="Edit reference" onClick={()=>onEditSource(r.sourceId)}><MoreHorizontal size={14}/></button></div>)}</section>}
  </div></div></div></div>;
}
