/// <reference lib="webworker" />
import nspell from 'nspell';
import {dictionaryWords,personalWordCorrection} from './lib/personal-dictionary';
let spell:ReturnType<typeof nspell>|null=null;
const ignored=new Set<string>(),personal=new Set<string>(),accepted=new Set<string>();
function learn(word:string){personal.add(word);accepted.add(word.toLowerCase());spell?.add(word);}
self.onmessage=async(event:MessageEvent)=>{const data=event.data;try{
  if(data.type==='init'){for(const word of dictionaryWords(data.words))learn(word);const [aff,dic]=await Promise.all([fetch(data.base+'spelling/en.aff').then(r=>{if(!r.ok)throw Error();return r.text();}),fetch(data.base+'spelling/en.dic').then(r=>{if(!r.ok)throw Error();return r.text();})]);spell=nspell(aff,dic);for(const word of personal)spell.add(word);self.postMessage({type:'ready'});return;}
  if(data.type==='add'){for(const word of dictionaryWords([data.word]))learn(word);return;}
  if(data.type==='ignore'){ignored.clear();for(const word of dictionaryWords(data.words))ignored.add(word.toLowerCase());return;}
  if(data.type==='suggest'){const custom=personalWordCorrection(data.word,personal),suggestions=[...new Set([...(custom?[custom]:[]),...(spell?.suggest(data.word)||[])])].slice(0,6);self.postMessage({id:data.id,suggestions});return;}
  if(data.type==='check'&&spell){const errors:{from:number;to:number;word:string}[]=[],corrections:{from:number;to:number;word:string;replacement:string}[]=[];for(const block of data.blocks){const urls=[...block.text.matchAll(/(?:https?:\/\/|www\.)\S+/g)].map((m:any)=>[m.index,m.index+m[0].length]);for(const match of block.text.matchAll(/[A-Za-z]+(?:[’'-][A-Za-z]+)*/g)){const word=match[0];if(word.length<2||word.length>55||/^[A-Z]{2,}$/.test(word)||(ignored.has(word.toLowerCase())||accepted.has(word.toLowerCase()))||urls.some((r:number[])=>match.index>=r[0]&&match.index<r[1]))continue;if(!spell.correct(word.replaceAll('’',"'"))){const item={from:block.pos+match.index,to:block.pos+match.index+word.length,word};errors.push(item);const replacement=personalWordCorrection(word,personal);if(replacement&&/[\s.,;:!?)]/.test(block.text[match.index+word.length]||'\0'))corrections.push({...item,replacement});}if(errors.length>=500)break;}if(errors.length>=500)break;}self.postMessage({id:data.id,errors,corrections});}
}catch{self.postMessage({type:'failed',id:data.id});}};
