import {useLayoutEffect,useRef} from 'react';
import {LockKeyhole} from 'lucide-react';

export default function NotesPage({title,value,onChange}:{title:string;value:string;onChange:(value:string)=>void}){
  const input=useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(()=>{const element=input.current;if(!element)return;const resize=()=>{element.style.height='auto';element.style.height=Math.max(640,element.scrollHeight)+'px';};resize();const observer=new ResizeObserver(resize);observer.observe(element.parentElement!);return()=>observer.disconnect();},[value]);
  function tab(event:React.KeyboardEvent<HTMLTextAreaElement>){
    if(event.key!=='Tab'||event.shiftKey)return;event.preventDefault();const field=event.currentTarget,from=field.selectionStart,to=field.selectionEnd;onChange(value.slice(0,from)+'\t'+value.slice(to));requestAnimationFrame(()=>field.setSelectionRange(from+1,from+1));
  }
  return <section className="notes-page" aria-label="Project notes">
    <header className="notes-page-heading"><div><h1>Notes</h1><p>Kept with this project, outside your manuscript and paper exports.</p></div><span><LockKeyhole size={13}/>Private</span></header>
    <article className="notes-sheet writing-page"><header><span className="notes-sheet-label">Working notes</span><h2>{title||'Untitled paper'}</h2><span className="notes-sheet-rule"/></header><textarea ref={input} aria-label="Private project notes" value={value} onChange={event=>onChange(event.target.value)} onKeyDown={tab} placeholder="Ideas, reading notes, questions to come back to…" spellCheck={false}/><footer>Saved with this project · Not part of the manuscript</footer></article>
  </section>;
}
