/** Self-contained so the same gestures can run inside the print-preview iframe. */
export function installZoomGestures(viewport:HTMLElement,surface:HTMLElement,scrollHost:HTMLElement,onCommit:(scale:number)=>void,scaler:{getScale:()=>number;setScale:(value:number)=>void}){
  let gesture:{distance:number;scale:number;x:number;y:number}|null=null;
  let frame=0,wheelTimer:ReturnType<typeof setTimeout>|undefined,pending:{scale:number;x:number;y:number}|null=null;
  const scale=()=>scaler.getScale();
  const clamp=(value:number)=>Math.min(5,Math.max(.25,value));
  function apply(next:number,x:number,y:number,anchor?:{x:number;y:number}){
    const before=surface.getBoundingClientRect(),old=scale();
    const point=anchor||{x:(x-before.left)/old,y:(y-before.top)/old};
    scaler.setScale(clamp(next));
    const after=surface.getBoundingClientRect();
    viewport.scrollLeft+=after.left+point.x*clamp(next)-x;
    scrollHost.scrollTop+=after.top+point.y*clamp(next)-y;
  }
  function flush(){frame=0;if(pending){apply(pending.scale,pending.x,pending.y,gesture||undefined);pending=null;}}
  function queue(next:number,x:number,y:number){pending={scale:next,x,y};if(!frame)frame=requestAnimationFrame(flush);}
  function start(event:TouchEvent){
    if(event.touches.length!==2)return;
    event.preventDefault();
    const [a,b]=Array.from(event.touches),x=(a.clientX+b.clientX)/2,y=(a.clientY+b.clientY)/2,rect=surface.getBoundingClientRect(),current=scale();
    gesture={distance:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)||1,scale:current,x:(x-rect.left)/current,y:(y-rect.top)/current};
  }
  function move(event:TouchEvent){
    if(!gesture||event.touches.length!==2)return;
    event.preventDefault();const [a,b]=Array.from(event.touches);
    queue(gesture.scale*Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)/gesture.distance,(a.clientX+b.clientX)/2,(a.clientY+b.clientY)/2);
  }
  function end(event:TouchEvent){if(!gesture||event.touches.length===2)return;if(frame)cancelAnimationFrame(frame);flush();gesture=null;onCommit(scale());}
  function wheel(event:WheelEvent){
    if(!event.ctrlKey&&!event.metaKey)return;
    event.preventDefault();queue(scale()*Math.exp(-event.deltaY*.006),event.clientX,event.clientY);
    clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>{if(frame)cancelAnimationFrame(frame);flush();onCommit(scale());},120);
  }
  viewport.addEventListener('touchstart',start,{passive:false});viewport.addEventListener('touchmove',move,{passive:false});
  viewport.addEventListener('touchend',end);viewport.addEventListener('touchcancel',end);viewport.addEventListener('wheel',wheel,{passive:false});
  return()=>{cancelAnimationFrame(frame);clearTimeout(wheelTimer);viewport.removeEventListener('touchstart',start);viewport.removeEventListener('touchmove',move);viewport.removeEventListener('touchend',end);viewport.removeEventListener('touchcancel',end);viewport.removeEventListener('wheel',wheel);};
}
