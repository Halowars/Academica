export type FigureAlignment='left'|'center'|'right';
export function figureLayout(attrs:Record<string,any>={}){
  const value=Number(attrs.figureWidth),width=Number.isFinite(value)&&value>0?Math.max(10,Math.min(100,value)):100;
  const align:FigureAlignment=attrs.figureAlign==='left'||attrs.figureAlign==='right'?attrs.figureAlign:'center';
  return{width,align};
}
export function figureFrameStyle(attrs:Record<string,any>={}){
  const {width,align}=figureLayout(attrs);
  return{width:attrs.figureWidth==null?'auto':width+'%',maxWidth:'100%',marginLeft:align==='left'?'0':'auto',marginRight:align==='right'?'0':'auto'};
}
export function figureImageStyle(attrs:Record<string,any>={}){
  const {align}=figureLayout(attrs);
  return{display:'block',width:attrs.figureWidth==null?'auto':'100%',maxWidth:'100%',height:'auto',maxHeight:'6.5in',objectFit:'contain' as const,objectPosition:align+' top',marginLeft:align==='left'?'0':'auto',marginRight:align==='right'?'0':'auto'};
}
export function figureStyleCSS(style:Record<string,string>){return Object.entries(style).map(([key,value])=>key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase())+':'+value).join(';');}
export function figureDimensions(naturalWidth:number,naturalHeight:number,attrs:Record<string,any>,availableWidth:number){
  const maxWidth=availableWidth*figureLayout(attrs).width/100;
  const width=attrs.figureWidth==null?Math.min(maxWidth,naturalWidth):maxWidth;
  const height=width*naturalHeight/naturalWidth,scale=Math.min(1,624/height);
  return{width:width*scale,height:height*scale};
}
