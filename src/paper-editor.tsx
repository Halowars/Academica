'use client';
import { useEffect,useMemo,useRef } from 'react';
import { useEditor,EditorContent,type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { academicExtensions,type AcademicActions } from './editor-extensions';
import { useWorkspace } from './lib/store';
import type { Section } from './lib/model';
import {spellingExtension,type SpellingSelection} from './spelling';
import {Extension} from '@tiptap/core';
export default function PaperEditor({section,actions,readOnly=false,onSpelling}:{section:Section;actions:AcademicActions;readOnly?:boolean;onSpelling:(selection:SpellingSelection)=>void}){
  const epoch=useWorkspace(s=>s.epoch);
  const latest=useRef(actions);latest.current=actions;
  const callbacks=useMemo<AcademicActions>(()=>({command:(...args)=>latest.current.command(...args),annotation:(...args)=>latest.current.annotation(...args),source:(...args)=>latest.current.source(...args),editObject:(...args)=>latest.current.editObject(...args),activate:(...args)=>latest.current.activate(...args)}),[]);
  const editor=useEditor({immediatelyRender:false,extensions:[StarterKit.configure({heading:{levels:[1,2,3]},link:{openOnClick:false}}),Placeholder.configure({placeholder:'Start writing…'}),...academicExtensions(callbacks),spellingExtension(onSpelling),Extension.create({name:'lineaKeys',addKeyboardShortcuts(){return{'Alt-t':()=>this.editor.commands.setHeading({level:1}),'Alt-p':()=>this.editor.commands.setParagraph(),'Alt-h':()=>this.editor.commands.setHeading({level:2}),'Alt-q':()=>this.editor.commands.toggleBlockquote(),'Mod-Shift-t':()=>this.editor.commands.setHeading({level:1}),'Mod-Shift-p':()=>this.editor.commands.setParagraph(),'Mod-Shift-h':()=>this.editor.commands.setHeading({level:2})};}})],content:section.content,editable:!readOnly,editorProps:{attributes:{class:'academic-editor','aria-label':'Write '+section.title,spellcheck:'false'}},onUpdate:({editor})=>{const content=editor.getJSON();useWorkspace.getState().edit(paper=>{const current=paper.sections.find(s=>s.id===section.id);if(current)current.content=content as any;});},onFocus:({editor})=>callbacks.activate(editor),onSelectionUpdate:({editor})=>{if(editor.isFocused)callbacks.activate(editor);}},[section.id,epoch]);

  useEffect(()=>{editor?.setEditable(!readOnly);},[editor,readOnly]);
  return <EditorContent editor={editor}/>;
}
