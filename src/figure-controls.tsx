import {useEffect,useRef} from 'react';
import {AlignLeft,AlignCenter,AlignRight,ClipboardPaste,ImagePlus} from 'lucide-react';
import {pastedImage,readClipboardImage} from './lib/clipboard-image';
import type {FigureAlignment,FigureWrapping} from './lib/figure-layout';

type Props={src:string;alt:string;width:number;align:FigureAlignment;wrap:FigureWrapping;textWidth:number;busy:boolean;onImage:(file:File)=>Promise<void>;onWidth:(width:number)=>void;onAlign:(align:FigureAlignment)=>void;onWrap:(wrap:FigureWrapping)=>void;onError:(message:string)=>void};
export default function FigureControls({src,width,align,wrap,textWidth,busy,onImage,onWidth,onAlign,onWrap,onError}:Props){
  const input=useRef<HTMLInputElement>(null),active=useRef(true);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  useEffect(()=>{
    const paste=(event:ClipboardEvent)=>{const file=pastedImage(event.clipboardData);if(!file)return;event.preventDefault();if(!busy)void onImage(file);};
    document.addEventListener('paste',paste);
    return()=>document.removeEventListener('paste',paste);
  },[busy,onImage]);
  async function clipboard(){try{const file=await readClipboardImage(navigator.clipboard);if(active.current)await onImage(file);}catch(error){if(active.current)onError(error instanceof Error?error.message:'The clipboard image could not be read.');}}
  return <div className="figure-controls">
    <div className="figure-import-actions"><button type="button" className="button subtle" disabled={busy} onClick={()=>input.current?.click()}><ImagePlus size={15}/>{src?'Replace image':'Choose image'}</button><button type="button" className="button subtle" disabled={busy} onClick={()=>void clipboard()}><ClipboardPaste size={15}/>Paste image</button><input ref={input} aria-label="Figure image" type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={event=>{const file=event.target.files?.[0];event.target.value='';if(file)void onImage(file);}}/></div>
    {!src?<div className="figure-layout-preview empty" onDragOver={event=>{if(event.dataTransfer.types.includes('Files'))event.preventDefault();}} onDrop={event=>{const file=pastedImage(event.dataTransfer);if(file){event.preventDefault();if(!busy)void onImage(file);}}}><ImagePlus size={25}/><textarea className="figure-paste-target" aria-label="Paste or drop a figure image" inputMode="none" value="" onChange={()=>{}} placeholder="Paste or drop your image here" spellCheck={false}/></div>:<p className="figure-live-hint">Your paper is the preview. Resize here and keep writing beside it.</p>}
    <p className="figure-paste-hint">Ctrl/Cmd+V to paste an image · up to 10 MB.</p>
    {src&&<div className="figure-layout-controls"><label className="figure-width-control"><span>Image width <output>{width}% · {(textWidth*width/100).toFixed(2)} in</output></span><input aria-label="Figure width" type="range" min="10" max={wrap==='wrap'?70:100} step="1" value={width} onChange={event=>onWidth(Number(event.target.value))}/><small>Proportions stay fixed{wrap==='wrap'?' · room is kept for your text':''}</small></label><fieldset className="figure-text-flow"><legend>Text flow</legend><div>{([['none','Above & below'],['wrap','Text beside']] as const).map(([value,label])=><button type="button" key={value} aria-pressed={wrap===value} onClick={()=>onWrap(value)}>{label}</button>)}</div></fieldset><fieldset className="figure-alignment"><legend>Placement</legend><div>{([['left',AlignLeft],['center',AlignCenter],['right',AlignRight]] as const).map(([value,Icon])=><button type="button" key={value} disabled={wrap==='wrap'&&value==='center'} aria-label={'Align figure '+value} title={value==='center'&&wrap==='wrap'?'Use Above & below to center the image':value[0].toUpperCase()+value.slice(1)} aria-pressed={align===value} onClick={()=>onAlign(value)}><Icon size={17}/></button>)}</div></fieldset></div>}
  </div>;
}
