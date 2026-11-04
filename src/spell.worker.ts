/// <reference lib="webworker" />
import nspell from 'nspell';
let spell:ReturnType<typeof nspell>|null=null;
const ignored=new Set<string>();
self.onmessage=async(event:MessageEvent)=>{const data=event.data;try{
  if(data.type==='init'){const [aff,dic]=await Promise.all([fetch(data.base+'spelling/en.aff').then(r=>{if(!r.ok)throw Error();return r.text();}),fetch(data.base+'spelling/en.dic').then(r=>{if(!r.ok)throw Error();return r.text();})]);spell=nspell(aff,dic);for(const word of data.words||[])spell.add(word);self.postMessage({type:'ready'});return;}
  if(data.type==='add'){spell?.add(data.word);ignored.add(data.word.toLowerCase());return;}
  if(data.type==='suggest'){self.postMessage({id:data.id,suggestions:spell?.suggest(data.word).slice(0,6)||[]});return;}
  if(data.type==='check'&&spell){const errors:{from:number;to:number;word:string}[]=[];for(const block of data.blocks){const urls=[...block.text.matchAll(/(?:https?:\/\/|www\.)\S+/g)].map((m:any)=>[m.index,m.index+m[0].length]);for(const match of block.text.matchAll(/[A-Za-z]+(?:[’'-][A-Za-z]+)*/g)){const word=match[0];if(word.length<2||word.length>55||/^[A-Z]{2,}$/.test(word)||ignored.has(word.toLowerCase())||urls.some((r:number[])=>match.index>=r[0]&&match.index<r[1]))continue;if(!spell.correct(word.replaceAll('’',"'")))errors.push({from:block.pos+match.index,to:block.pos+match.index+word.length,word});if(errors.length>=500)break;}if(errors.length>=500)break;}self.postMessage({id:data.id,errors});}
}catch{self.postMessage({type:'failed',id:data.id});}};
