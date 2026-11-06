import {getMarkRange,type Editor} from '@tiptap/core';
import type {EditorRange} from '../editor-extensions';
import {safeLink} from './model';

export function normalizeEditorLink(value:string){
  const input=value.trim();
  return safeLink(/^[a-z][a-z\d+.-]*:/i.test(input)?input:/^(?:www\.)?[\w-]+(?:\.[\w-]+)+(?:[/:?#]|$)/i.test(input)?'https://'+input:input);
}
export function editorLinkTarget(editor:Editor,range:EditorRange){
  const head=editor.state.doc.resolve(range.from);
  const selected=range.from===range.to?getMarkRange(head,editor.state.schema.marks.link)||range:range;
  return{range:selected,text:editor.state.doc.textBetween(selected.from,selected.to,' '),href:editor.state.doc.nodeAt(selected.from)?.marks.find(mark=>mark.type.name==='link')?.attrs.href||''};
}
export function applyEditorLink(editor:Editor,range:EditorRange,text:string,url:string){
  const href=normalizeEditorLink(url),label=text.trim()||href;if(!href||!label)return false;
  const original=editor.state.doc.textBetween(range.from,range.to,' '),chain=editor.chain().focus().setTextSelection(range);
  if(original===label&&range.to>range.from)return chain.setLink({href}).setTextSelection(range.to).unsetMark('link').run();
  const marks=editor.state.doc.resolve(range.from).marks().filter(mark=>mark.type.name!=='link').map(mark=>({type:mark.type.name,attrs:mark.attrs}));
  return chain.insertContentAt(range,{type:'text',text:label,marks:[...marks,{type:'link',attrs:{href}}]}).unsetMark('link').run();
}
