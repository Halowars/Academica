import {useEffect,useMemo,useRef,useState} from 'react';
import type {Editor} from '@tiptap/core';
import {Link2,X} from 'lucide-react';
import type {EditorRange} from './editor-extensions';
import {applyEditorLink,editorLinkTarget,normalizeEditorLink} from './lib/editor-links';

export default function LinkPopover({editor,range,onClose}:{editor:Editor;range:EditorRange;onClose:()=>void}){
  const target=useMemo(()=>editorLinkTarget(editor,range),[editor,range]),[label,setLabel]=useState(target.text),[url,setURL]=useState(target.href),[error,setError]=useState(''),ref=useRef<HTMLDivElement>(null),doc=useRef(editor.state.doc);
  const coords=editor.view.coordsAtPos(target.range.from),left=Math.max(12,Math.min(coords.left,innerWidth-342)),top=Math.max(64,Math.min(coords.bottom+8,innerHeight-300));
  useEffect(()=>{const outside=(event:PointerEvent)=>{if(!ref.current?.contains(event.target as Node))onClose();};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[onClose]);
  function close(){if(!editor.isDestroyed&&editor.state.doc===doc.current)editor.chain().focus().setTextSelection(target.range).run();onClose();}
  return <div ref={ref} className="link-popover citation-popover" role="dialog" aria-label={target.href?'Edit link':'Add link'} style={{left,top}} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}}}>
    <div className="popover-heading"><span><Link2 size={15}/>{target.href?'Edit link':'Add link'}</span><button type="button" className="icon-button" aria-label="Close link" onClick={close}><X size={15}/></button></div>
    <form onSubmit={event=>{event.preventDefault();if(editor.isDestroyed||editor.state.doc!==doc.current){setError('The writing changed. Close this and select the link again.');return;}if(!normalizeEditorLink(url)){setError('Enter a valid http or https web address.');return;}if(applyEditorLink(editor,target.range,label,url))onClose();}}>
      <label>Text to display<input value={label} placeholder="A readable title" onChange={event=>setLabel(event.target.value)}/></label>
      <label>Web address<input autoFocus inputMode="url" value={url} placeholder="https://example.com" onChange={event=>{setURL(event.target.value);setError('');}}/></label>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions">{target.href&&<button type="button" className="text-button" onClick={()=>{if(!editor.isDestroyed&&editor.state.doc===doc.current)editor.chain().focus().setTextSelection(target.range).unsetLink().run();onClose();}}>Remove link</button>}<button type="button" className="button subtle" onClick={close}>Cancel</button><button className="button primary" disabled={!url.trim()}>{target.href?'Save link':'Add link'}</button></div>
    </form>
  </div>;
}
