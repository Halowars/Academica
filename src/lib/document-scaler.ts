/** Keep the paper's layout in physical pixels; zoom only its painted surface.
 * Self-contained because Paper view also runs this inside its preview iframe.
 */
export function createDocumentScaler(surface:HTMLElement){
  const stage=surface.parentElement!;
  let scale=1;
  function refresh(){
    const style=getComputedStyle(surface);
    const width=parseFloat(style.width)||surface.offsetWidth,height=parseFloat(style.height)||surface.offsetHeight;
    stage.style.width=width*scale+'px';
    stage.style.height=height*scale+'px';
  }
  function setScale(value:number){
    if(!Number.isFinite(value)||value<=0)return;
    scale=value;
    surface.style.transformOrigin='0 0';
    surface.style.transform=`scale(${scale})`;
    refresh();
  }
  const observer=new ResizeObserver(refresh);
  observer.observe(surface);
  return{getScale:()=>scale,setScale,refresh,destroy:()=>observer.disconnect()};
}
