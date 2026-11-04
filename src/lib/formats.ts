import type {Paper,Style} from './model';

export const styles:Record<Style,string>={apa:'APA 7',mla:'MLA 9',chicago:'Chicago 18 · author–date',ieee:'IEEE',vancouver:'Vancouver',ama:'AMA 11'};
export const documentTypes={essay:'Essay',research:'Research paper',review:'Literature review',report:'Lab / technical report',conference:'Conference paper',thesis:'Thesis',dissertation:'Dissertation'};
export type DocumentFormat={font:'Times New Roman'|'Arial'|'Georgia'|'Calibri';size:number;lineHeight:number;margin:number;paper:'letter'|'a4';indent:number;paragraphAfter:number;titlePage:boolean;numberSections:boolean;contents:boolean;listFigures:boolean;listTables:boolean;header:string;pagePosition:'top-right'|'bottom-center';columns:1|2};
export function defaultFormat(style:Style):DocumentFormat{return{font:'Times New Roman',size:style==='ieee'?10:12,lineHeight:['ieee','vancouver'].includes(style)?1:2,margin:1,paper:'letter',indent:.5,paragraphAfter:0,titlePage:style==='apa'||style==='chicago',numberSections:style==='ieee',contents:false,listFigures:false,listTables:false,header:'',pagePosition:'top-right',columns:1};}
export function documentFormat(paper:Paper):DocumentFormat{return{...defaultFormat(paper.style),...paper.format};}
export function normalizeFormat(input:any):Partial<DocumentFormat>|undefined{
  if(!input||typeof input!=='object')return undefined;const out:Partial<DocumentFormat>={};
  if(['Times New Roman','Arial','Georgia','Calibri'].includes(input.font))out.font=input.font;
  for(const [k,min,max] of [['size',8,24],['lineHeight',1,3],['margin',.5,2],['indent',0,1.5],['paragraphAfter',0,24]] as const)if(Number.isFinite(input[k]))out[k]=Math.min(max,Math.max(min,input[k]));
  if(['letter','a4'].includes(input.paper))out.paper=input.paper;
  for(const k of ['titlePage','numberSections','contents','listFigures','listTables'] as const)if(typeof input[k]==='boolean')out[k]=input[k];
  if(typeof input.header==='string')out.header=input.header.slice(0,160);
  if(['top-right','bottom-center'].includes(input.pagePosition))out.pagePosition=input.pagePosition;
  if(input.columns===1||input.columns===2)out.columns=input.columns;return out;
}
export function formatDifferences(paper:Paper){const defaults=defaultFormat(paper.style),current=documentFormat(paper);return(['font','size','lineHeight','margin','indent','columns'] as const).filter(k=>current[k]!==defaults[k]);}
export const bibliographyTitle=(style:Style)=>style==='mla'?'Works Cited':style==='chicago'?'References':'References';
export function sectionLabel(paper:Paper,index:number){const section=paper.sections[index];return(['abstract','acknowledgments'].includes(section.kind||'')?'':section.kind==='appendix'?'Appendix '+String.fromCharCode(65+paper.sections.slice(0,index).filter(s=>s.kind==='appendix').length)+'. ':['thesis','dissertation'].includes(paper.kind)||documentFormat(paper).numberSections?(paper.sections.slice(0,index+1).filter(s=>!['abstract','acknowledgments','appendix'].includes(s.kind||'')).length)+'. ':'')+section.title;}
export function pageDimensions(format:DocumentFormat){return format.paper==='a4'?{width:793.7,height:1122.52}:{width:816,height:1056};}
