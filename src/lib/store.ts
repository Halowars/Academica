import { create } from 'zustand';
import {type Paper,type Annotation,type Source,type RichNode} from './model';
type Store={epoch:number;paper:Paper|null;revision:number;generation:number;setPaper:(paper:Paper,revision?:number)=>void;edit:(fn:(paper:Paper)=>void)=>void;updateSection:(id:string,content:RichNode)=>void;updateAnnotation:(id:string,fn:(note:Annotation)=>void)=>void;updateSource:(source:Source)=>void;updateResearchNotes:(value:string)=>void;setRevision:(value:number)=>void};
export const useWorkspace=create<Store>((set)=>({
  epoch:0,paper:null,revision:0,generation:0,
  setPaper:(paper,revision=0)=>set(state=>({paper,revision,generation:0,epoch:state.epoch+1})),
  edit:fn=>set(state=>{if(!state.paper)return{};const paper=structuredClone(state.paper);fn(paper);paper.updatedAt=new Date().toISOString();return{paper,generation:state.generation+1};}),
  // Keystrokes replace only the changed section, preserving article/cache identity.
  updateSection:(id,content)=>set(state=>{const current=state.paper;if(!current)return{};const index=current.sections.findIndex(s=>s.id===id);if(index<0||current.sections[index].content===content)return{};const sections=current.sections.slice();sections[index]={...sections[index],content};return{paper:{...current,sections,updatedAt:new Date().toISOString()},generation:state.generation+1};}),
  updateAnnotation:(id,fn)=>set(state=>{const current=state.paper;if(!current?.annotations[id])return{};const note=structuredClone(current.annotations[id]);fn(note);return{paper:{...current,annotations:{...current.annotations,[id]:note},updatedAt:new Date().toISOString()},generation:state.generation+1};}),
  updateSource:source=>set(state=>{const current=state.paper;if(!current)return{};const sources=current.sources.slice(),index=sources.findIndex(s=>s.id===source.id);if(index<0)sources.push(source);else sources[index]=source;return{paper:{...current,sources,updatedAt:new Date().toISOString()},generation:state.generation+1};}),
  updateResearchNotes:value=>set(state=>{const current=state.paper;if(!current||current.researchNotes===value)return{};return{paper:{...current,researchNotes:value,updatedAt:new Date().toISOString()},generation:state.generation+1};}),
  setRevision:revision=>set({revision})
}));
