import {useEffect,useLayoutEffect,useRef,useState,type RefObject,type ReactNode} from 'react';
import {Minus,Plus,ScanLine,X} from 'lucide-react';
import {fitScale,zoomValue} from './lib/workspace-preferences';
import {installZoomGestures} from './lib/zoom-gestures';

export type ZoomProps={zoom:string;onZoom:(value:string)=>void;onScale:(scale:number)=>void};

export function useDocumentZoom(viewport:RefObject<HTMLDivElement|null>,surface:RefObject<HTMLDivElement|null>,pageWidth:number,{zoom,onZoom,onScale}:ZoomProps){
  const [available,setAvailable]=useState(0),callbacks=useRef({onZoom,onScale});callbacks.current={onZoom,onScale};
  const scale=zoom==='fit'?(available?fitScale(available,pageWidth):1):Number(zoomValue(zoom));
  useLayoutEffect(()=>{if(!viewport.current)return;const element=viewport.current;setAvailable(element.clientWidth);const observer=new ResizeObserver(()=>setAvailable(element.clientWidth));observer.observe(element);return()=>observer.disconnect();},[viewport]);
  useLayoutEffect(()=>{if(surface.current)surface.current.style.zoom=String(scale);callbacks.current.onScale(scale);},[scale,surface]);
  useEffect(()=>{if(!viewport.current||!surface.current)return;const scroll=viewport.current.closest<HTMLElement>('.page-scroll')||viewport.current;return installZoomGestures(viewport.current,surface.current,scroll,value=>callbacks.current.onZoom(zoomValue(value)));},[viewport,surface]);
  return scale;
}

export function ReadingCanvas({children,...props}:ZoomProps&{children:ReactNode}){
  const viewport=useRef<HTMLDivElement>(null),surface=useRef<HTMLDivElement>(null);
  useDocumentZoom(viewport,surface,816,props);
  return <div className="reading-zoom-viewport" ref={viewport}><div className="reading-zoom-surface" ref={surface}>{children}</div></div>;
}

export function ReadingViewport({enabled,children,...props}:ZoomProps&{enabled:boolean;children:ReactNode}){return enabled?<ReadingCanvas {...props}>{children}</ReadingCanvas>:children;}

export function ZoomControl({zoom,scale,onZoom}:Pick<ZoomProps,'zoom'|'onZoom'>&{scale:number}){
  const [open,setOpen]=useState(false),ref=useRef<HTMLDivElement>(null),percent=Math.round(scale*100);
  useEffect(()=>{if(!open)return;const outside=(event:PointerEvent)=>{if(!ref.current?.contains(event.target as Node))setOpen(false);};const key=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};},[open]);
  const step=(direction:number)=>onZoom(zoomValue((Math.round(scale*10)+direction)/10));
  return <div className="document-zoom-control" ref={ref}>
    <button className="zoom-step" aria-label="Zoom out" onClick={()=>step(-1)} disabled={scale<=.25}><Minus size={13}/></button>
    <button className="zoom-percentage" aria-label={`Document zoom, ${percent} percent`} aria-expanded={open} onClick={()=>setOpen(!open)}>{percent}%</button>
    <button className="zoom-step" aria-label="Zoom in" onClick={()=>step(1)} disabled={scale>=5}><Plus size={13}/></button>
    {open&&<div className="zoom-popover" role="dialog" aria-label="Document zoom"><div className="popover-heading"><span>Document zoom</span><button className="icon-button" aria-label="Close zoom" onClick={()=>setOpen(false)}><X size={14}/></button></div><div className="zoom-slider"><input aria-label="Zoom percentage" type="range" min="25" max="500" step="5" value={Math.max(25,percent)} onChange={event=>onZoom(zoomValue(Number(event.target.value)/100))}/><output>{percent}%</output></div><div className="zoom-presets">{[50,75,100,150,200].map(value=><button key={value} aria-pressed={zoom!=='fit'&&percent===value} onClick={()=>onZoom(String(value/100))}>{value}%</button>)}</div><button className="zoom-fit" aria-pressed={zoom==='fit'} onClick={()=>onZoom('fit')}><ScanLine size={15}/>Fit page width</button><p>Pinch with two fingers to zoom your page.</p></div>}
  </div>;
}
