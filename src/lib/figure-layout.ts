export type FigureAlignment='left'|'center'|'right';
export type FigureWrapping='none'|'wrap';
export function figureLayout(attrs:Record<string,any>={}){
  const align:FigureAlignment=attrs.figureAlign==='left'||attrs.figureAlign==='right'?attrs.figureAlign:'center';
  const wrap:FigureWrapping=attrs.figureWrap==='wrap'&&align!=='center'?'wrap':'none';
  const value=Number(attrs.figureWidth),limit=wrap==='wrap'?70:100,width=Number.isFinite(value)&&value>0?Math.max(10,Math.min(limit,value)):limit;
  return{width,align,wrap};
}
export function figureFrameStyle(attrs:Record<string,any>={}){
  const {width,align,wrap}=figureLayout(attrs),floating=wrap==='wrap';
  return{width:attrs.figureWidth==null&&!floating?'auto':width+'%',maxWidth:'100%',marginLeft:align==='left'?'0':floating?'.2in':'auto',marginRight:align==='right'?'0':floating?'.2in':'auto',...(floating?{float:align as 'left'|'right',clear:'both' as const,marginTop:'0',marginBottom:'.12in'}:{})};
}
export function figureNodeStyle(attrs:Record<string,any>={}){return figureLayout(attrs).wrap==='wrap'?figureFrameStyle(attrs):{clear:'both' as const,width:'auto'};}
export function figureInnerStyle(attrs:Record<string,any>={}){return figureLayout(attrs).wrap==='wrap'?{width:'100%',margin:'0'}:figureFrameStyle(attrs);}
export function figureCaptionStyle(){return{fontSize:'1em',lineHeight:'1.5',marginTop:'8px',textIndent:'0'};}
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
