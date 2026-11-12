import {MoreHorizontal} from 'lucide-react';
import type {Paper,Section} from './lib/model';
import {sectionLabel} from './lib/formats';

export default function SectionHeading({paper,section,breakBefore=false,onEdit}:{paper:Paper;section:Section;breakBefore?:boolean;onEdit:(section:Section)=>void}){
  return <div data-flow-external data-flow-break={breakBefore?'true':undefined} className="flow-section-heading">
    <h2>{sectionLabel(paper,paper.sections.indexOf(section))}</h2>
    <button className="icon-button" title={'Edit '+section.title+' section'} aria-label={'Edit '+section.title+' section'} onClick={()=>onEdit(section)}><MoreHorizontal size={16}/></button>
  </div>;
}
