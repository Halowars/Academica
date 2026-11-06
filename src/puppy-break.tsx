import {useEffect,useState,type CSSProperties} from 'react';
import {PawPrint,Volume2,VolumeX,X} from 'lucide-react';
import {appURL} from './lib/urls';

const puppies=[{file:'terrier.jpg',alt:'A little border terrier puppy looking up'},{file:'sleepy.jpg',alt:'A tiny black puppy resting in the sunshine'},{file:'running.jpg',alt:'A happy puppy running through the grass'}];
let audio:HTMLAudioElement|null=null,previous=-1,preloaded=false;
function muted(){try{return localStorage.getItem('academica-puppy-muted')==='true';}catch{return false;}}
function sound(){if(!audio){audio=new Audio(appURL('puppy/bark.mp3'));audio.volume=.3;audio.preload='auto';}audio.currentTime=0;return audio.play();}
export function showPuppyBreak(){
  audio?.pause();
  if(!preloaded){preloaded=true;puppies.forEach(photo=>{const image=new Image();image.src=appURL('puppy/'+photo.file);});}
  const next=(previous+1+Math.floor(Math.random()*(puppies.length-1)))%puppies.length;previous=next;
  window.dispatchEvent(new CustomEvent('academica-puppy',{detail:{index:next,token:Date.now()}}));
  if(!muted())sound()?.catch(()=>window.dispatchEvent(new CustomEvent('academica-puppy-sound-blocked')));
}
export default function PuppyBreak(){
  const [puppy,setPuppy]=useState<{index:number;token:number}|null>(null),[loaded,setLoaded]=useState(0),[quiet,setQuiet]=useState(muted),[blocked,setBlocked]=useState(false);
  useEffect(()=>{const show=(event:Event)=>{setPuppy((event as CustomEvent).detail);setBlocked(false);},block=()=>setBlocked(true);window.addEventListener('academica-puppy',show);window.addEventListener('academica-puppy-sound-blocked',block);return()=>{window.removeEventListener('academica-puppy',show);window.removeEventListener('academica-puppy-sound-blocked',block);audio?.pause();};},[]);
  useEffect(()=>{if(!puppy)return;const timer=setTimeout(()=>{setPuppy(null);audio?.pause();},loaded===puppy.token?4000:5000),key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setPuppy(null);audio?.pause();}};document.addEventListener('keydown',key,true);return()=>{clearTimeout(timer);document.removeEventListener('keydown',key,true);};},[puppy,loaded]);
  if(!puppy)return null;const photo=puppies[puppy.index];
  return <div className="puppy-celebration" key={puppy.token}>
    <div className="puppy-confetti" aria-hidden="true">{Array.from({length:28},(_,i)=><i key={i} style={{'--x':(i*37%100)+'vw','--delay':(i%7)*.08+'s','--turn':(i%2?1:-1)*(180+i*23)+'deg','--drift':(i%2?1:-1)*(20+i*3)+'px',background:['#d8b07d','#a8c4af','#d896a4','#9ab6ce','#e9d58e'][i%5]} as CSSProperties}/>)}</div>
    <aside className="puppy-break" role="status" aria-label="Four-second puppy break" data-ready={loaded===puppy.token}>
      <img src={appURL('puppy/'+photo.file)} alt={photo.alt} onLoad={()=>setLoaded(puppy.token)}/><button className="puppy-close" aria-label="Close puppy break" onClick={()=>{setPuppy(null);audio?.pause();}}><X size={16}/></button>
      <div className="puppy-caption"><span><PawPrint size={15}/>A little puppy break.</span><button aria-label={blocked?'Play puppy sound':quiet?'Unmute puppy sound':'Mute puppy sound'} onClick={()=>{if(blocked){sound()?.then(()=>setBlocked(false)).catch(()=>{});return;}const next=!quiet;setQuiet(next);try{localStorage.setItem('academica-puppy-muted',String(next));}catch{}if(next)audio?.pause();else sound()?.catch(()=>setBlocked(true));}}>{quiet?<VolumeX size={16}/>:<Volume2 size={16}/>}</button></div>
      {loaded===puppy.token&&<div className="puppy-countdown" aria-hidden="true"/>}
    </aside>
  </div>;
}
