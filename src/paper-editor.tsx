'use client';
import { memo,useEffect,useMemo,useRef } from 'react';
import { useEditor,EditorContent,type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { academicExtensions,type AcademicActions } from './editor-extensions';
import { useWorkspace } from './lib/store';
import type { Section } from './lib/model';
import {spellingExtension,type SpellingSelection} from './spelling';
import {Extension} from '@tiptap/core';
import {pageFlow,editorRegistry} from './pagination';
import {editableQuotes,syncQuotationText} from './lib/editable-quotes';
function PaperEditor({section,actions,readOnly=false,onSpelling}:{section:Section;actions:AcademicActions;readOnly?:boolean;onSpelling:(selection:SpellingSelection)=>void}){
  const epoch=useWorkspace(s=>s.epoch);
  const latest=useRef(actions);latest.current=actions;
  const callbacks=useMemo<AcademicActions>(()=>({command:(...args)=>latest.current.command(...args),annotation:(...args)=>latest.current.annotation(...args),source:(...args)=>latest.current.source(...args),editObject:(...args)=>latest.current.editObject(...args),activate:(...args)=>latest.current.activate(...args)}),[]);
  const initialContent=useMemo(()=>editableQuotes(section.content),[section.id,epoch]);
  const editor=useEditor({immediatelyRender:false,shouldRerenderOnTransaction:false,extensions:[StarterKit.configure({heading:{levels:[1,2,3]},link:{openOnClick:false}}),Placeholder.configure({placeholder:'Start writing…'}),...academicExtensions(callbacks),pageFlow,spellingExtension(onSpelling),Extension.create({name:'lineaKeys',addKeyboardShortcuts(){return{'Alt-t':()=>this.editor.commands.setHeading({level:1}),'Alt-p':()=>this.editor.commands.setParagraph(),'Alt-h':()=>this.editor.commands.setHeading({level:2}),'Mod-Shift-t':()=>this.editor.commands.setHeading({level:1}),'Mod-Shift-p':()=>this.editor.commands.setParagraph(),'Mod-Shift-h':()=>this.editor.commands.setHeading({level:2})};}})],content:initialContent,editable:!readOnly,editorProps:{attributes:{class:'academic-editor','data-section-id':section.id,'aria-label':'Write '+section.title,spellcheck:'false'}},onUpdate:({editor})=>useWorkspace.getState().updateSection(section.id,syncQuotationText(editor.getJSON() as any)),onFocus:({editor})=>callbacks.activate(editor)},[section.id,epoch]);

  useEffect(()=>{editor?.setEditable(!readOnly);},[editor,readOnly]);
  useEffect(()=>{if(!editor)return;const migrated=syncQuotationText(editor.getJSON() as any);if(JSON.stringify(migrated)!==JSON.stringify(section.content))useWorkspace.getState().updateSection(section.id,migrated);editorRegistry.set(section.id,editor);return()=>{if(editorRegistry.get(section.id)===editor)editorRegistry.delete(section.id);};},[editor,section.id]);
  return <EditorContent editor={editor}/>;
}
export default memo(PaperEditor);
