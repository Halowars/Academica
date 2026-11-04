import {useEffect,useRef,useState} from 'react';
import {FileText,FolderOpen,LoaderCircle,X} from 'lucide-react';
import {sourceFromHTML,sourceFromPlainText,readerError} from './lib/article-text';
import {enrichPDFSource} from './lib/source-import';
import {safeLink,type Source} from './lib/model';

export default function SourceTextDialog({initial,onClose,onSave}:{initial:Source;onClose:()=>void;onSave:(source:Source)=>void}){
  const [draft,setDraft]=useState(()=>structuredClone(initial)),[text,setText]=useState(''),[fileSource,setFileSource]=useState<Source|null>(null),[fileName,setFileName]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null),input=useRef<HTMLInputElement>(null),active=useRef(true);
  useEffect(()=>{active.current=true;dialog.current?.showModal();return()=>{active.current=false;dialog.current?.close();};},[]);
  async function openFile(file:File){
    if(file.size>5000000){setError('Choose an HTML or text file smaller than 5 MB.');return;}
    setBusy(true);setError('');
    try{const content=await file.text();if(!active.current)return;const html=/\.(?:html?|xhtml)$/i.test(file.name)||file.type==='text/html';const parsed=html?sourceFromHTML(content,draft.url,draft):sourceFromPlainText(content,draft);if(!parsed.title)parsed.title=file.name.replace(/\.[^.]+$/,'');
      setDraft(parsed);setFileSource(parsed);setFileName(file.name);setText(parsed.passages.map((p,i)=>(p.heading&&p.heading!==parsed.passages[i-1]?.heading?p.heading+'\n\n':'')+p.text).join('\n\n'));
    }catch(e:any){if(active.current)setError(e.message||'That file could not be read. Try readable text or HTML.');}finally{if(active.current)setBusy(false);}
  }
  async function save(event:React.FormEvent){event.preventDefault();if(!text.trim()||!draft.title.trim())return;setBusy(true);setError('');
    try{let source=fileSource?{...fileSource,...draft,passages:fileSource.passages}:sourceFromPlainText(text,draft);source.title=source.title.trim();source.url=safeLink(source.url);source.textAttemptVersion=2;
      // Only a DOI is sent for reference enrichment; article text stays in the project.
      if(!initial.title&&source.doi)source=await enrichPDFSource(source);
      if(active.current)onSave(source);
    }catch(e){if(active.current)setError(readerError(e));}finally{if(active.current)setBusy(false);}
  }
  return <dialog ref={dialog} className="modal modal-wide article-text-dialog" aria-labelledby="article-text-title" onCancel={event=>{event.preventDefault();if(!busy)onClose();}}><div className="modal-heading"><h2 id="article-text-title">Add article text</h2><button className="icon-button" aria-label="Close article text import" onClick={onClose}><X size={17}/></button></div><form className="modal-body" onSubmit={save}><p className="form-hint">Paste text from an article you can read, or open its saved HTML/text file. This fills the Research desk and makes the wording available for citation checks.</p><div className="form-grid"><label>Source title<input value={draft.title} required onChange={event=>setDraft(s=>({...s,title:event.target.value}))} placeholder="Article title"/></label><label>Original article URL<input type="url" value={draft.url} onChange={event=>setDraft(s=>({...s,url:event.target.value}))} placeholder="https://…"/></label></div><div className="article-file-row"><button type="button" className="button subtle" onClick={()=>input.current?.click()} disabled={busy}><FolderOpen size={15}/>Open HTML or text file</button><span>{fileName||'HTML, TXT, or Markdown · up to 5 MB'}</span></div><input ref={input} type="file" hidden accept=".html,.htm,.xhtml,.txt,.md,text/html,text/plain,text/markdown" onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void openFile(file);}}/><label>Article text<textarea autoFocus rows={10} aria-label="Full article text" value={text} onChange={event=>{setText(event.target.value);setFileSource(null);setFileName('');}} placeholder="Copy the article’s readable text here…"/></label><p className="form-hint">Saved HTML keeps available headings and reference details. Pasted text has no verified printed page numbers; add those when citing. Files are read as text, and their scripts never run.</p>{fileSource&&<p className="article-import-count"><FileText size={14}/>{fileSource.passages.length} readable paragraphs · {fileSource.authors||'Check author details'}</p>}{error&&<p className="form-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="button subtle" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy||!text.trim()||!draft.title.trim()}>{busy?<><LoaderCircle size={14} className="spin"/>Reading…</>:'Save article text'}</button></div></form></dialog>;
}
