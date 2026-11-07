import type {Node as PMNode} from '@tiptap/pm/model';
import type {Editor} from '@tiptap/core';
export function figurePosition(doc:PMNode,id:string,hint?:number){
  if(hint!==undefined&&hint>=0&&hint<doc.content.size){const node=doc.nodeAt(hint);if(node?.type.name==='figure'&&node.attrs.id===id)return hint;}
  let result:number|undefined;
  doc.descendants((node,pos)=>{if(result!==undefined)return false;if(node.type.name==='figure'&&node.attrs.id===id){result=pos;return false;}});
  return result;
}
export function removeFigure(editor:Editor,id:string,hint?:number){
  if(editor.isDestroyed)return false;const position=figurePosition(editor.state.doc,id,hint);if(position===undefined)return false;const node=editor.state.doc.nodeAt(position)!;
  return editor.chain().focus().deleteRange({from:position,to:position+node.nodeSize}).run();
}
