export const FIGURE_IMAGE_TYPES=['image/png','image/jpeg','image/webp','image/gif'];
export function pastedImage(data:DataTransfer|null){
  if(!data)return null;
  const item=Array.from(data.items||[]).find(item=>item.kind==='file'&&item.type.startsWith('image/'));
  return item?.getAsFile()||Array.from(data.files||[]).find(file=>file.type.startsWith('image/'))||null;
}
export async function readClipboardImage(clipboard:Pick<Clipboard,'read'>|undefined){
  if(!clipboard?.read)throw new Error('Use Ctrl/Cmd+V in this window, or tap the image area and choose Paste. You can also choose an image file.');
  let items:ClipboardItem[];
  try{items=await clipboard.read();}catch{throw new Error('Clipboard access was blocked. Press Ctrl/Cmd+V in this window, or tap the image area and choose Paste.');}
  for(const item of items){const type=FIGURE_IMAGE_TYPES.find(type=>item.types.includes(type));if(type){const blob=await item.getType(type);return new File([blob],'clipboard-figure.'+type.split('/')[1],{type});}}
  throw new Error('No supported image found on the clipboard. Copy an image, then paste it here. PNG, JPEG, WebP, and GIF are supported.');
}
