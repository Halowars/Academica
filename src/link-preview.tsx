import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {ExternalLink,Link2,Pencil,Unlink} from 'lucide-react';
import type {LinkSelection} from './editor-extensions';
import {editorLinkTarget,normalizeEditorLink,removeEditorLink} from './lib/editor-links';

export default function LinkPreview({value,onClose,onEdit}:{value:LinkSelection;onClose:()=>void;onEdit:()=>void}){
  const {editor,range,element}=value,ref=useRef<HTMLDivElement>(null),[position,setPosition]=useState({left:value.rect.left,top:value.rect.bottom+8});
  const target=useMemo(()=>editor.isDestroyed||range.from>editor.state.doc.content.size?null:editorLinkTarget(editor,range),[editor,range]);
  const href=normalizeEditorLink(target?.href||'');
  useLayoutEffect(()=>{
    const update=()=>{if(!ref.current||editor.isDestroyed)return;let anchor=value.rect;if(element.isConnected)anchor=element.getBoundingClientRect();else{const caret=editor.view.coordsAtPos(range.from);anchor={...value.rect,...caret};}
      const viewport=window.visualViewport,lowX=(viewport?.offsetLeft||0)+12,lowY=(viewport?.offsetTop||0)+12,highX=lowX+(viewport?.width||innerWidth)-24,highY=lowY+(viewport?.height||innerHeight)-24;
      const box=ref.current.getBoundingClientRect(),left=Math.max(lowX,Math.min(anchor.left,highX-box.width)),below=anchor.bottom+8,top=Math.max(lowY,Math.min(below+box.height<=highY?below:anchor.top-box.height-8,highY-box.height));
      setPosition(previous=>previous.left===left&&previous.top===top?previous:{left,top});
    };
    update();window.addEventListener('resize',update);window.addEventListener('scroll',update,true);window.visualViewport?.addEventListener('resize',update);window.visualViewport?.addEventListener('scroll',update);
    return()=>{window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);window.visualViewport?.removeEventListener('resize',update);window.visualViewport?.removeEventListener('scroll',update);};
  },[value,editor,range,element]);
  useEffect(()=>{
    const outside=(event:PointerEvent)=>{if(!ref.current?.contains(event.target as Node)&&!element.contains(event.target as Node))onClose();};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();}};
    const changed=({transaction}:{transaction:any})=>{if(transaction.docChanged)onClose();};
    document.addEventListener('pointerdown',outside,true);document.addEventListener('keydown',escape,true);editor.on('transaction',changed);editor.on('destroy',onClose);
    return()=>{document.removeEventListener('pointerdown',outside,true);document.removeEventListener('keydown',escape,true);editor.off('transaction',changed);editor.off('destroy',onClose);};
  },[editor,element,onClose]);
  if(!href)return null;
  return <div ref={ref} className="link-preview" role="dialog" aria-label="Link options" style={position}>
    <a className="link-preview-url" href={href} target="_blank" rel="noopener noreferrer" title={href} aria-label={'Open '+href+' in a new tab'}><Link2 size={15}/><span>{href.replace(/^https?:\/\//,'')}</span><ExternalLink size={13}/></a>
    <div className="link-preview-actions"><button type="button" className="icon-button" aria-label="Edit link" title="Edit link" onMouseDown={event=>event.preventDefault()} onClick={onEdit}><Pencil size={15}/></button><button type="button" className="icon-button" aria-label="Remove link" title="Remove link" onMouseDown={event=>event.preventDefault()} onClick={()=>{removeEditorLink(editor,target!.range);onClose();}}><Unlink size={15}/></button></div>
  </div>;
}
