import type {Node as PMNode} from '@tiptap/pm/model';
export function figurePosition(doc:PMNode,id:string,hint?:number){
  if(hint!==undefined&&hint>=0&&hint<doc.content.size){const node=doc.nodeAt(hint);if(node?.type.name==='figure'&&node.attrs.id===id)return hint;}
  let result:number|undefined;
  doc.descendants((node,pos)=>{if(result!==undefined)return false;if(node.type.name==='figure'&&node.attrs.id===id){result=pos;return false;}});
  return result;
}
