import {useEffect,useState,type CSSProperties} from 'react';
import {PawPrint,Volume2,VolumeX,X} from 'lucide-react';
import {appURL} from './lib/urls';
import {ANIMAL_BREAK_MS,animalBreaks,randomAnimalPhoto,type AnimalKind} from './lib/animal-breaks';

type Celebration={kind:AnimalKind;index:number;token:number};
let audio:HTMLAudioElement|null=null,sequence=0;
const sounds=new Map<AnimalKind,HTMLAudioElement>(),previous=new Map<AnimalKind,number>(),preloaded=new Set<AnimalKind>();
function muted(){try{return (localStorage.getItem('academica-break-muted')??localStorage.getItem('academica-puppy-muted'))==='true';}catch{return false;}}
function stopAnimalSound(){
  audio?.pause();
}
function sound(kind:AnimalKind){
  stopAnimalSound();
  let player=sounds.get(kind);
  if(!player){player=new Audio(appURL(kind+'/'+animalBreaks[kind].sound));player.preload='auto';sounds.set(kind,player);}
  // This recording already contains three different, naturally paced duck calls.
  const next=player;
  audio=next;next.volume=kind==='duck'?1:.3;next.currentTime=0;next.playbackRate=1;
  return next.play();
}
export function showAnimalBreak(kind:AnimalKind){
  stopAnimalSound();
  const config=animalBreaks[kind];
  if(!preloaded.has(kind)){preloaded.add(kind);config.photos.forEach(photo=>{const image=new Image();image.src=appURL(kind+'/'+photo.file);});}
  const index=randomAnimalPhoto(config.photos.length,previous.get(kind));previous.set(kind,index);
  const token=++sequence;
  window.dispatchEvent(new CustomEvent('academica-animal-break',{detail:{kind,index,token}}));
  if(!muted())sound(kind).catch(()=>window.dispatchEvent(new CustomEvent('academica-animal-sound-blocked',{detail:{token}})));
}
export default function AnimalBreak(){
  const [celebration,setCelebration]=useState<Celebration|null>(null),[loaded,setLoaded]=useState(0),[quiet,setQuiet]=useState(muted),[blockedToken,setBlockedToken]=useState(0);
  function dismiss(){setCelebration(null);stopAnimalSound();}
  useEffect(()=>{
    const show=(event:Event)=>setCelebration((event as CustomEvent<Celebration>).detail);
    const block=(event:Event)=>setBlockedToken((event as CustomEvent<{token:number}>).detail.token);
    window.addEventListener('academica-animal-break',show);window.addEventListener('academica-animal-sound-blocked',block);
    return()=>{window.removeEventListener('academica-animal-break',show);window.removeEventListener('academica-animal-sound-blocked',block);stopAnimalSound();};
  },[]);
  useEffect(()=>{
    if(!celebration)return;
    const timer=setTimeout(dismiss,ANIMAL_BREAK_MS);
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dismiss();}};
    document.addEventListener('keydown',key,true);
    return()=>{clearTimeout(timer);document.removeEventListener('keydown',key,true);};
  },[celebration]);
  if(!celebration)return null;
  const {kind,index,token}=celebration,photo=animalBreaks[kind].photos[index],blocked=blockedToken===token;
  function play(){sound(kind).then(()=>setBlockedToken(0)).catch(()=>setBlockedToken(token));}
  return <div className="animal-celebration" key={token}>
    <div className="animal-confetti" aria-hidden="true">{Array.from({length:28},(_,i)=><i key={i} style={{'--x':(i*37%100)+'vw','--delay':(i%7)*.08+'s','--turn':(i%2?1:-1)*(180+i*23)+'deg','--drift':(i%2?1:-1)*(20+i*3)+'px',background:['#d8b07d','#a8c4af','#d896a4','#9ab6ce','#e9d58e'][i%5]} as CSSProperties}/>)}</div>
    <aside className="animal-break" role="status" aria-label={'Four-second '+kind+' break'} data-ready={loaded===token}>
      <img src={appURL(kind+'/'+photo.file)} alt={photo.alt} onLoad={()=>setLoaded(token)}/>
      <button className="animal-close" aria-label={'Close '+kind+' break'} onClick={dismiss}><X size={16}/></button>
      <div className="animal-caption"><span>{kind==='puppy'?<PawPrint size={15}/>:<span aria-hidden="true">🦆</span>}A little {kind} break.</span><button aria-label={blocked?'Play '+kind+' sound':quiet?'Unmute '+kind+' sound':'Mute '+kind+' sound'} onClick={()=>{if(blocked){play();return;}const next=!quiet;setQuiet(next);try{localStorage.setItem('academica-break-muted',String(next));}catch{}if(next)stopAnimalSound();else play();}}>{quiet?<VolumeX size={16}/>:<Volume2 size={16}/>}</button></div>
      <div className="animal-countdown" aria-hidden="true"/>
    </aside>
  </div>;
}
