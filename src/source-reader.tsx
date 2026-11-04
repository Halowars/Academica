import {useEffect,useRef,useState} from 'react';
import {ArrowUpRight,BookOpen,LoaderCircle,MoreHorizontal,RefreshCw,X} from 'lucide-react';
import {useWorkspace} from './lib/store';
import {retrieveSourceText} from './lib/source-import';
import {mergeReaderText,readerError} from './lib/article-text';
import {matchQuotation,passageLocation} from './lib/quote-match';
import {safeLink,sourceLabel,uid,type LocatorType,type Paper,type Passage,type Source} from './lib/model';
type Props={paper:Paper;sourceId:string;onSelect:(id:string)=>void;onSources:()=>void;onImportText:(source:Source)=>void;onQuote:(source:Source,text:string,passageId:string,locator:string,locatorType:LocatorType)=>void;notify:(text:string)=>void};
export default function SourceReader({paper,sourceId,onSelect,onSources,onImportText,onQuote,notify}:Props){
  const source=paper.sources.find(s=>s.id===sourceId),reader=useRef<HTMLDivElement>(null),pdfInput=useRef<HTMLInputElement>(null),menu=useRef<HTMLDetailsElement>(null),handled=useRef(0),mounted=useRef(true);
  const [loading,setLoading]=useState(false),[refresh,setRefresh]=useState({id:'',token:0}),[error,setError]=useState(''),[selection,setSelection]=useState<{text:string;passageId:string;locator:string;locatorType:LocatorType}|null>(null);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  useEffect(()=>{function outside(event:PointerEvent){if(!menu.current?.contains(event.target as Node))menu.current?.removeAttribute('open');}document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[]);
  useEffect(()=>{setSelection(null);setError('');if(reader.current)reader.current.scrollTop=0;},[sourceId]);
  useEffect(()=>{
    let active=true;setLoading(false);if(!source||(!source.url&&!source.doi))return;
    const forced=refresh.id===sourceId&&refresh.token>handled.current;if(forced)handled.current=refresh.token;
    if(!forced&&(source.passages.length||(source.textAttemptVersion||0)>=2))return;
    const id=source.id,paperId=paper.id;setLoading(true);setError('');
    retrieveSourceText(source).then(loaded=>{if(!active||useWorkspace.getState().paper?.id!==paperId)return;useWorkspace.getState().edit(p=>{const i=p.sources.findIndex(s=>s.id===id);if(i>=0)p.sources[i]=mergeReaderText(p.sources[i],loaded);});}).catch(cause=>{
      if(!active||useWorkspace.getState().paper?.id!==paperId)return;const message=readerError(cause);setError(message);useWorkspace.getState().edit(p=>{const current=p.sources.find(s=>s.id===id);if(current&&!current.passages.length){current.textStatus='unavailable';current.textAttemptVersion=2;current.textMessage=message;}});
    }).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
  },[paper.id,sourceId,refresh]);
  function retry(){setRefresh(current=>({id:sourceId,token:current.token+1}));}
  function closeMenu(){menu.current?.removeAttribute('open');}
  async function attachPDF(file:File){
    if(!source)return;setLoading(true);setError('');const id=source.id,paperId=paper.id;
    try{const{sourceFromPDF}=await import('./lib/exports'),loaded=await sourceFromPDF(file,false);if(source.doi&&loaded.doi&&source.doi.toLowerCase()!==loaded.doi.toLowerCase())throw new Error('This PDF belongs to a different DOI. Add it as a separate source.');
      if(!mounted.current||useWorkspace.getState().paper?.id!==paperId)return;useWorkspace.getState().edit(p=>{const i=p.sources.findIndex(s=>s.id===id);if(i>=0)p.sources[i]=mergeReaderText(p.sources[i],loaded);});notify('PDF text attached to this source.');
    }catch(e:any){if(mounted.current)setError(e.message||readerError(e));}finally{if(mounted.current)setLoading(false);}
  }
  if(!source)return <div className="reader-empty"><BookOpen size={22}/><span>Open a source to read it here.</span><button className="button subtle" onClick={onSources}>Choose a source</button></div>;
  const passages:Passage[]=source.passages.length?source.passages:source.savedPassages.map(p=>({id:p.id,text:p.text,heading:p.locatorType==='section'?p.locator:'',pdfPage:p.locatorType==='page'?1:undefined,pageLabel:p.locatorType==='page'?p.locator:undefined,locationVerified:!!p.locator}));
  function capture(){
    const sel=window.getSelection();if(!sel?.rangeCount||!reader.current?.contains(sel.anchorNode)||!reader.current.contains(sel.focusNode))return;const text=sel.toString().trim();if(!text)return;
    const start=sel.getRangeAt(0).startContainer,element=(start.nodeType===3?start.parentElement:start as Element)?.closest('[data-reader-passage]') as HTMLElement|null,passage=passages.find(p=>p.id===element?.dataset.readerPassage),match=matchQuotation(source!,text),location=passage?passageLocation(passage):match;
    setSelection({text:text.slice(0,10000),passageId:passage?.id||match.passageId||'',locator:location.locator,locatorType:location.locatorType});
  }
  return <div className="source-reader"><input ref={pdfInput} type="file" accept="application/pdf" hidden onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void attachPDF(file);}}/><div className="reader-toolbar"><select aria-label="Source to read" value={source.id} onChange={event=>onSelect(event.target.value)}>{paper.sources.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select><span>{sourceLabel(source)} · {source.year||'No date'}</span>{safeLink(source.url)&&<a href={safeLink(source.url)} target="_blank" rel="noopener noreferrer" aria-label="Open original source"><ArrowUpRight size={15}/></a>}<details className="reader-more" ref={menu}><summary className="icon-button" aria-label="Reader options"><MoreHorizontal size={17}/></summary><div className="menu-panel"><button disabled={loading||!source.url&&!source.doi} onClick={()=>{closeMenu();retry();}}>Refresh article text</button><button disabled={loading} onClick={()=>{closeMenu();pdfInput.current?.click();}}>Import PDF</button><button onClick={()=>{closeMenu();onImportText(source);}}>Add text or saved HTML</button></div></details></div>
    {selection&&<div className="reader-selection"><span>{selection.text.length>70?selection.text.slice(0,70)+'…':selection.text}</span><button className="button subtle" onClick={()=>{onQuote(source,selection.text,selection.passageId,selection.locator,selection.locatorType);setSelection(null);}}>Quote + cite</button><button className="text-button" onClick={()=>{useWorkspace.getState().edit(p=>{const s=p.sources.find(s=>s.id===source.id);if(s)s.savedPassages.push({id:uid(),...selection});});notify('Passage saved with its source location.');setSelection(null);}}>Save passage</button><button className="icon-button" aria-label="Clear passage selection" onClick={()=>setSelection(null)}><X size={14}/></button></div>}
    {error&&passages.length>0&&<p className="reader-fetch-error" role="alert">{error} Your saved text is still available.</p>}
    <div className="reader-text" ref={reader} onMouseUp={capture} onTouchEnd={()=>setTimeout(capture,60)}>{loading&&!passages.length?<div className="reader-empty" role="status"><LoaderCircle size={18} className="spin"/><span>Fetching readable article text…</span></div>:passages.length?<><p className="reader-coverage">{loading?<><RefreshCw size={11} className="spin"/> Refreshing article text…</>:source.textMessage||(source.passages.length?'Imported article text':'Saved passages only; the full article has not been retrieved.')}</p>{passages.map((passage,index)=><div key={passage.id}>{passage.heading&&passage.heading!==passages[index-1]?.heading&&<h3>{passage.heading}</h3>}{passage.pdfPage&&passage.pdfPage!==passages[index-1]?.pdfPage&&<span className="pdf-page-label">{passage.pageLabel?'Page '+passage.pageLabel+(source.passages.length?' · PDF sheet '+passage.pdfPage:''):'PDF sheet '+passage.pdfPage+' · printed citation page not detected'}</span>}<p data-reader-passage={passage.id}>{passage.text}</p></div>)}</>:<div className="reader-empty"><p>Article text needs another route.</p><span>{error||source.textMessage||'Add its URL, paste readable article text, or import a file.'}</span><div className="reader-recovery"><button className="button subtle" onClick={()=>onImportText(source)}>Add article text</button><button className="text-button" onClick={()=>pdfInput.current?.click()}>Import PDF</button>{(source.url||source.doi)&&<button className="icon-button" aria-label="Retry article link" title="Try the link again" onClick={retry}><RefreshCw size={14}/></button>}</div></div>}</div></div>;
}
