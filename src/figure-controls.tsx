import {useEffect,useRef} from 'react';
import {AlignLeft,AlignCenter,AlignRight,ClipboardPaste,ImagePlus} from 'lucide-react';
import {pastedImage,readClipboardImage} from './lib/clipboard-image';
import {figureFrameStyle,figureImageStyle,type FigureAlignment} from './lib/figure-layout';

type Props={src:string;alt:string;width:number;align:FigureAlignment;busy:boolean;onImage:(file:File)=>Promise<void>;onWidth:(width:number)=>void;onAlign:(align:FigureAlignment)=>void;onError:(message:string)=>void};
export default function FigureControls({src,alt,width,align,busy,onImage,onWidth,onAlign,onError}:Props){
  const input=useRef<HTMLInputElement>(null),active=useRef(true);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  useEffect(()=>{
    const paste=(event:ClipboardEvent)=>{const file=pastedImage(event.clipboardData);if(!file)return;event.preventDefault();if(!busy)void onImage(file);};
    document.addEventListener('paste',paste);
    return()=>document.removeEventListener('paste',paste);
  },[busy,onImage]);
  async function clipboard(){try{const file=await readClipboardImage(navigator.clipboard);if(active.current)await onImage(file);}catch(error){if(active.current)onError(error instanceof Error?error.message:'The clipboard image could not be read.');}}
  const attrs={figureWidth:width,figureAlign:align};
  return <div className="figure-controls">
    <div className="figure-import-actions"><button type="button" className="button subtle" disabled={busy} onClick={()=>input.current?.click()}><ImagePlus size={15}/>{src?'Replace image':'Choose image'}</button><button type="button" className="button subtle" disabled={busy} onClick={()=>void clipboard()}><ClipboardPaste size={15}/>Paste image</button><input ref={input} aria-label="Figure image" type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void onImage(file);}}/></div>
    <p className="figure-paste-hint">Or press Ctrl/Cmd+V anywhere in this window. PNG, JPEG, WebP, or GIF · up to 10 MB.</p>
    <div className={'figure-layout-preview '+(!src?'empty':'')} aria-label="Figure placement preview" onDragOver={event=>{if(event.dataTransfer.types.includes('Files'))event.preventDefault();}} onDrop={event=>{const file=pastedImage(event.dataTransfer);if(file){event.preventDefault();if(!busy)void onImage(file);}}}>
      {src?<figure style={figureFrameStyle(attrs)}><img src={src} alt={alt||'Figure preview'} style={{...figureImageStyle(attrs),maxHeight:180}}/></figure>:<><ImagePlus size={25}/><textarea className="figure-paste-target" aria-label="Paste or drop a figure image" inputMode="none" value="" onChange={()=>{}} placeholder="Paste or drop your image here" spellCheck={false}/></>}
    </div>
    {src&&<div className="figure-layout-controls"><label className="figure-width-control"><span>Image width <output>{width}%</output></span><input aria-label="Figure width" type="range" min="10" max="100" step="1" value={width} onChange={event=>onWidth(Number(event.target.value))}/><small>Relative to the text area · proportions stay fixed</small></label><fieldset className="figure-alignment"><legend>Placement</legend><div>{([['left',AlignLeft],['center',AlignCenter],['right',AlignRight]] as const).map(([value,Icon])=><button type="button" key={value} aria-label={'Align figure '+value} title={value[0].toUpperCase()+value.slice(1)} aria-pressed={align===value} onClick={()=>onAlign(value)}><Icon size={17}/></button>)}</div></fieldset></div>}
  </div>;
}
