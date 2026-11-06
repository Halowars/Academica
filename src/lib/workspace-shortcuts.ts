export function installProjectSearchShortcut(target:Window,onSearch:()=>void){
  const key=(event:KeyboardEvent)=>{
    if(event.isComposing||!(event.ctrlKey||event.metaKey)||event.shiftKey||event.altKey||!(event.key.toLowerCase()==='s'||event.code==='KeyS'))return;
    event.preventDefault();
    event.stopPropagation();
    if(!event.repeat)onSearch();
  };
  target.addEventListener('keydown',key,true);
  return()=>target.removeEventListener('keydown',key,true);
}
