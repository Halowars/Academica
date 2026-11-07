import {useEffect,useRef,useState} from 'react';
import type {Editor} from '@tiptap/react';
import {ImagePlus,Trash2,X} from 'lucide-react';
import FigureControls from './figure-controls';
import {figureLayout,type FigureWrapping} from './lib/figure-layout';
import {figurePosition,removeFigure} from './lib/figure-editor';
import {uid,type Paper} from './lib/model';
import {documentFormat,pageDimensions} from './lib/formats';
import type {EditorRange} from './editor-extensions';

type Draft={id:string;src:string;caption:string;alt:string;figureWidth:number;figureAlign:string;figureWrap:string};
type Props={editor:Editor;range:EditorRange;attrs?:Record<string,any>;pos?:number;paper:Paper;cloud:boolean;onClose:()=>void};
export default function FigureInspector({editor,range,attrs,pos,paper,cloud,onClose}:Props){
  const [draft,setDraft]=useState<Draft>(()=>({id:attrs?.id||uid(),src:'',caption:'',alt:'',figureWidth:100,figureAlign:'center',figureWrap:'none',...attrs})),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const latest=useRef(draft),target=useRef({...range}),hint=useRef(pos),inserted=useRef(!!attrs?.id),active=useRef(true),request=useRef(0),close=useRef(onClose),panel=useRef<HTMLElement>(null);close.current=onClose;
  const layout=figureLayout(draft),format=documentFormat(paper),textWidth=(pageDimensions(format).width-2*format.margin*96)/96;
  function reveal(){requestAnimationFrame(()=>{if(!active.current||editor.isDestroyed)return;const position=figurePosition(editor.state.doc,latest.current.id,hint.current);if(position===undefined)return;const element=editor.view.nodeDOM(position);if(element instanceof HTMLElement)element.scrollIntoView({block:'center',inline:'nearest',behavior:'smooth'});});}
  useEffect(()=>{
    active.current=true;
    const transaction=({transaction:tr}:{transaction:any})=>{
      if(!tr.docChanged)return;
      if(!inserted.current){target.current={from:tr.mapping.map(target.current.from),to:tr.mapping.map(target.current.to)};return;}
      const position=figurePosition(editor.state.doc,latest.current.id,hint.current===undefined?undefined:tr.mapping.map(hint.current));
      if(position===undefined){close.current();return;}
      hint.current=position;
      const updated=editor.state.doc.nodeAt(position)?.attrs;
      if(updated&&JSON.stringify(updated)!==JSON.stringify(latest.current)){latest.current={...latest.current,...updated};setDraft(latest.current);}
    };
    editor.on('transaction',transaction);
    editor.on('destroy',onClose);
    const focus=requestAnimationFrame(()=>{panel.current?.querySelector<HTMLElement>(attrs?.src?'input[type="range"]':'.figure-paste-target')?.focus({preventScroll:true});if(attrs?.src)reveal();});
    return()=>{active.current=false;request.current++;cancelAnimationFrame(focus);editor.off('transaction',transaction);editor.off('destroy',onClose);};
  },[editor]);
  function update(partial:Partial<Draft>){
    const next={...latest.current,...partial};latest.current=next;setDraft(next);setError('');
    if(!next.src||editor.isDestroyed)return;
    if(inserted.current){
      const position=figurePosition(editor.state.doc,next.id,hint.current);
      if(position===undefined){close.current();return;}
      hint.current=position;editor.view.dispatch(editor.state.tr.setNodeMarkup(position,undefined,next));
    }else{
      const selection={from:Math.max(0,Math.min(editor.state.doc.content.size,target.current.from)),to:Math.max(0,Math.min(editor.state.doc.content.size,target.current.to))};
      // Mark inserted first: insertContentAt synchronously emits its transaction.
      inserted.current=true;
      const success=editor.commands.insertContentAt(selection,{type:'figure',attrs:next},{updateSelection:false});
      if(!success){inserted.current=false;setError('Click a place in your writing and try again.');return;}
      hint.current=figurePosition(editor.state.doc,next.id);reveal();
    }
  }
  async function image(file:File){
    const ticket=++request.current;setBusy(true);setError('');
    try{const {uploadFile}=await import('./lib/exports');const src=await uploadFile(file,cloud);if(active.current&&ticket===request.current)update({src});}
    catch(error){if(active.current&&ticket===request.current)setError(error instanceof Error?error.message:'The image could not be opened.');}
    finally{if(active.current&&ticket===request.current)setBusy(false);}
  }
  function wrapping(wrap:FigureWrapping){const next=figureLayout(latest.current);update({figureWrap:wrap,...(wrap==='wrap'?{figureAlign:next.align==='center'?'right':next.align,figureWidth:next.width>70?50:next.width}:{})});}
  return <aside ref={panel} className="figure-inspector" aria-label="Figure tools" onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();onClose();}}}>
    <header><div><ImagePlus size={17}/><span><strong>Figure</strong><small>Live on your paper</small></span></div><button type="button" className="icon-button" aria-label="Close figure tools" onClick={onClose}><X size={16}/></button></header>
    <div className="figure-inspector-body"><FigureControls src={draft.src} alt={draft.alt} width={layout.width} align={layout.align} wrap={layout.wrap} textWidth={textWidth} busy={busy} onImage={image} onWidth={figureWidth=>update({figureWidth})} onAlign={figureAlign=>update({figureAlign})} onWrap={wrapping} onError={setError}/><label>Caption<input aria-label="Figure caption" value={draft.caption} onChange={event=>update({caption:event.target.value})} placeholder="What should the reader understand?"/></label><details className="figure-alt"><summary>Alternative text</summary><label className="sr-only" htmlFor="figure-alt">Figure alternative text</label><textarea id="figure-alt" aria-label="Figure alternative text" rows={2} value={draft.alt} onChange={event=>update({alt:event.target.value})} placeholder="Describe the image for a reader who cannot see it"/></details>{error&&<p className="form-error" role="alert">{error}</p>}</div>
    <footer>{inserted.current?<button type="button" className="figure-delete text-button" onClick={()=>{removeFigure(editor,latest.current.id,hint.current);onClose();}}><Trash2 size={14}/>Delete figure</button>:<small>{busy?'Reading image…':'Changes save as you adjust.'}</small>}<button type="button" className="button primary" onClick={onClose}>Done</button></footer>
  </aside>;
}
