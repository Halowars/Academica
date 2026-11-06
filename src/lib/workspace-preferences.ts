import type {Section} from './model';

/** A view preference only: never sort or mutate the manuscript's sections. */
export function orderedOutline(sections:Section[],order:unknown):Section[]{
  const saved=Array.isArray(order)?order.filter((id):id is string=>typeof id==='string'):[];
  const byId=new Map(sections.map(section=>[section.id,section]));
  const result:Section[]=[];
  for(const id of saved){const section=byId.get(id);if(section){result.push(section);byId.delete(id);}}
  return [...result,...byId.values()];
}

export function moveOutlineItem(order:string[],id:string,targetId:string){
  const from=order.indexOf(id),to=order.indexOf(targetId);
  if(from<0||to<0||from===to)return order;
  const next=order.slice();next.splice(from,1);next.splice(to,0,id);return next;
}

export function zoomValue(value:unknown):string{
  if(value==='fit')return 'fit';
  const number=Number(value);
  return Number.isFinite(number)&&number>0?String(Math.round(Math.min(5,Math.max(.25,number))*100)/100):'fit';
}

export function fitScale(available:number,pageWidth:number){return Math.max(.1,Math.min(1,(available-28)/pageWidth));}
