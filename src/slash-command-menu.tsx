'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {Editor} from '@tiptap/react';
import type {AcademicActions} from './editor-extensions';
import {filterSlashCommands,slashCommandMatch,type SlashCommand,type SlashCommandMatch} from './lib/slash-commands';

type MenuState={match:SlashCommandMatch;commands:readonly SlashCommand[];left:number;top:number;above:boolean;signature:string};

export default function SlashCommandMenu({editor,actions}:{editor:Editor|null;actions:AcademicActions}){
  const [menu,setMenu]=useState<MenuState|null>(null),[active,setActive]=useState(0);
  const activeRef=useRef(0),dismissed=useRef(''),lastSignature=useRef(''),root=useRef<HTMLDivElement>(null),interacting=useRef(false);
  activeRef.current=active;

  useEffect(()=>{
    if(!editor||editor.isDestroyed)return;
    const dom=editor.view.dom;
    function update(){
      if(editor!.isDestroyed||!editor!.isEditable){setMenu(null);return;}
      const match=slashCommandMatch(editor!.state),commands=match?filterSlashCommands(match.query):[];
      if(!match||!commands.length){setMenu(null);return;}
      const signature=`${match.from}:${match.to}:${match.query}`;
      if(dismissed.current===signature){setMenu(null);return;}
      if(lastSignature.current!==signature){lastSignature.current=signature;activeRef.current=0;setActive(0);}
      const coords=editor!.view.coordsAtPos(match.to),width=Math.min(320,window.innerWidth-24);
      const left=Math.max(12,Math.min(coords.left,window.innerWidth-width-12));
      const roomBelow=window.innerHeight-coords.bottom,above=roomBelow<260&&coords.top>roomBelow;
      setMenu({match,commands,left,top:above?coords.top-8:coords.bottom+8,above,signature});
    }
    function closeAfterBlur(){requestAnimationFrame(()=>{if(!interacting.current&&!root.current?.contains(document.activeElement))setMenu(null);});}
    function outside(event:PointerEvent){const target=event.target as Node;if(!root.current?.contains(target)&&!dom.contains(target))setMenu(null);}
    editor.on('transaction',update);editor.on('selectionUpdate',update);editor.on('focus',update);editor.on('blur',closeAfterBlur);
    window.addEventListener('resize',update);window.addEventListener('scroll',update,true);document.addEventListener('pointerdown',outside,true);
    update();
    return()=>{editor.off('transaction',update);editor.off('selectionUpdate',update);editor.off('focus',update);editor.off('blur',closeAfterBlur);window.removeEventListener('resize',update);window.removeEventListener('scroll',update,true);document.removeEventListener('pointerdown',outside,true);};
  },[editor]);

  function choose(command:SlashCommand,match=menu?.match){
    if(!editor||!match||editor.isDestroyed)return;
    setMenu(null);
    editor.chain().focus().command(({tr})=>{tr.delete(match.from,match.to).setMeta('academic-command',true);return true;}).run();
    actions.command(command.name,editor,{from:match.from,to:match.from});
  }

  useEffect(()=>{
    if(!editor||editor.isDestroyed)return;
    const dom=editor.view.dom;
    function keydown(event:KeyboardEvent){
      if(event.isComposing)return;
      const match=slashCommandMatch(editor!.state),commands=match?filterSlashCommands(match.query):[];
      if(!match||!commands.length||dismissed.current===`${match.from}:${match.to}:${match.query}`)return;
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        event.preventDefault();event.stopPropagation();
        const delta=event.key==='ArrowDown'?1:-1,next=(activeRef.current+delta+commands.length)%commands.length;
        activeRef.current=next;setActive(next);return;
      }
      if(event.key==='Enter'||event.key==='Tab'){
        event.preventDefault();event.stopPropagation();choose(commands[Math.min(activeRef.current,commands.length-1)],match);return;
      }
      if(event.key==='Escape'){
        event.preventDefault();event.stopPropagation();dismissed.current=`${match.from}:${match.to}:${match.query}`;setMenu(null);
      }
    }
    dom.addEventListener('keydown',keydown,true);
    return()=>dom.removeEventListener('keydown',keydown,true);
  },[editor,menu]);

  useEffect(()=>{root.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({block:'nearest'});},[active]);
  if(!menu||typeof document==='undefined')return null;
  return createPortal(<div ref={root} className={'slash-command-menu'+(menu.above?' above':'')} role="listbox" aria-label="Writing commands" style={{left:menu.left,top:menu.top}} onPointerDownCapture={()=>{interacting.current=true;}} onPointerUpCapture={()=>{interacting.current=false;}} onPointerCancel={()=>{interacting.current=false;}}>
    <div className="slash-command-heading"><span>Insert</span><kbd>/</kbd><small>{menu.match.query||'all commands'}</small></div>
    <div className="slash-command-options">{menu.commands.map((command,index)=><button type="button" role="option" aria-selected={index===active} key={command.name} onMouseEnter={()=>{activeRef.current=index;setActive(index);}} onClick={()=>choose(command)}><code>/{command.name}</code><span><strong>{command.label}</strong><small>{command.description}</small></span></button>)}</div>
    <div className="slash-command-help"><span>↑↓ choose</span><span>Enter insert</span><span>Esc close</span></div>
  </div>,document.body);
}
