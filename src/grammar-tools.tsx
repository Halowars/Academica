import {useEffect,useRef,useState} from 'react';
import {Check,CheckCheck,X} from 'lucide-react';
import {grammarEnabled,grammarKey,grammarState,ignoreGrammarIssue,setGrammarEnabled,type GrammarSelection} from './grammar';

export function GrammarPopover({value,onClose}:{value:GrammarSelection;onClose:()=>void}){
  const ref=useRef<HTMLDivElement>(null),{editor,issue,rect}=value;
  useEffect(()=>{const outside=(event:PointerEvent)=>{if(!ref.current?.contains(event.target as Node)&&!(event.target as HTMLElement).closest('[data-grammar-id]'))onClose();};const key=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose();};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};},[onClose]);
  return <div ref={ref} className="citation-popover grammar-popover" role="dialog" aria-label="Grammar suggestion" style={{left:Math.max(12,Math.min(rect.left,innerWidth-342)),top:Math.max(64,Math.min(rect.bottom+8,innerHeight-320))}}>
    <div className="popover-heading"><span><CheckCheck size={15}/>{issue.kind}</span><button className="icon-button" aria-label="Close grammar suggestion" onClick={onClose}><X size={15}/></button></div>
    <p className="grammar-message">{issue.message.replaceAll('`','')}</p><p className="grammar-problem">{issue.text}</p>
    <div className="grammar-suggestions">{issue.suggestions.map((replacement,index)=><button type="button" key={index} onClick={()=>{if(editor.isDestroyed){onClose();return;}const current=grammarKey.getState(editor.state)?.issues.find(item=>item.id===issue.id);if(current&&editor.state.doc.textBetween(current.from,current.to)===current.text)editor.chain().focus().command(({tr})=>{tr.insertText(replacement,current.from,current.to);return true;}).run();onClose();}}><Check size={14}/><span>{replacement||'Remove this text'}</span></button>)}</div>
    <button className="grammar-ignore" onClick={()=>{ignoreGrammarIssue(issue);onClose();}}>Ignore in this paper</button>
    <p className="grammar-credit">English grammar · checked on this device</p>
  </div>;
}

export function GrammarSettings(){
  const [enabled,setEnabled]=useState(grammarEnabled),[status,setStatus]=useState(grammarState);
  useEffect(()=>{const update=()=>{setEnabled(grammarEnabled());setStatus(grammarState());};window.addEventListener('academica-grammar-state',update);return()=>window.removeEventListener('academica-grammar-state',update);},[]);
  return <div className="review-group grammar-settings"><h2>Grammar & spelling</h2><label className="inspector-check"><input type="checkbox" checked={enabled} onChange={event=>{setGrammarEnabled(event.target.checked);setEnabled(event.target.checked);}}/>English grammar suggestions</label><p>Blue underlines mark grammar suggestions. Click to review, accept, or ignore them. Verified quotations stay untouched.</p><small>{!enabled?'Grammar checking is off.':status==='error'?'The grammar checker could not load. Reload while connected to try again.':status==='checking'?'Loading the grammar checker…':'Powered by Harper · text stays on this device.'} <a href="https://github.com/Automattic/harper" target="_blank" rel="noopener noreferrer">About Harper</a></small></div>;
}
