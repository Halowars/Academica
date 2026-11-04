import {normalizeFormat,type DocumentFormat} from './formats';
export type Style = 'apa' | 'mla' | 'chicago' | 'ieee' | 'vancouver' | 'ama';
export type LocatorType = 'page' | 'paragraph' | 'section';
export type RichNode = { type: string; text?: string; attrs?: Record<string, any>; marks?: {type:string;attrs?:Record<string,any>}[]; content?: RichNode[] };
export type Section = { id: string; title: string; kind?:'body'|'abstract'|'appendix'|'acknowledgments'; content: RichNode };
export type Passage = { id:string; text:string; heading?:string; paragraph?:number; pdfPage?:number; pageLabel?:string; locationVerified?:boolean };
export type Source = {
  id:string; type:'article-journal'|'paper-conference'|'webpage'|'book'; title:string; authors:string; year:string;
  container:string; publisher:string; volume:string; issue:string; pages:string; url:string; doi:string;
  accessed:string; passages:Passage[]; savedPassages:{id:string;text:string;locator:string;locatorType:LocatorType;passageId?:string}[];
  fileUrl?:string; overrides?:Partial<Record<Style,string>>;
  textStatus?:'ready'|'partial'|'unavailable'; textMethod?:'publisher'|'europe-pmc'|'pdf'|'web-reader'|'html'|'paste'; textAttemptVersion?:number; textOrigin?:string; textMessage?:string; textRetrievedAt?:string;
  health?:{checkedAt:string;state:'clear'|'notice'|'unknown';messages:string[]};
};
export type Annotation = { id:string; kind:'note'|'todo'; context:string; text:string; tasks:{id:string;text:string;done:boolean}[]; createdAt:string };
export type Paper = {
  schemaVersion:1; id:string; title:string; author:string; institution:string; course:string; instructor:string; date:string;
  style:Style; kind:'essay'|'research'|'dissertation'|'thesis'|'review'|'report'|'conference'; theme:'linen'|'rose'|'midnight'; appearance?:{canvas:string;paper:string;text:string;accent:string;size:number;lineHeight:number;font:'serif'|'sans';texture:boolean};
  format?:Partial<DocumentFormat>;sections:Section[]; sources:Source[]; annotations:Record<string,Annotation>; researchNotes:string;
  createdAt:string; updatedAt:string;
};
export type PaperSummary = {id:string;title:string;updatedAt:string;revision:number};
export type Revision = {id:string;paperId:string;name:string;createdAt:string;paper?:Paper};
export const uid = () => crypto.randomUUID?.()||'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(Number(c)^crypto.getRandomValues(new Uint8Array(1))[0]&15>>Number(c)/4).toString(16));
export const emptyDoc = ():RichNode => ({type:'doc',content:[{type:'paragraph'}]});
const paragraph = (text:string):RichNode => ({type:'paragraph',content:text?[{type:'text',text}]:[]});
export function createPaper(author='',example=false):Paper {
  const now=new Date().toISOString();
  const paper:Paper={schemaVersion:1,id:uid(),title:example?'Resource use in a modular hydroponic system':'Untitled paper',author,institution:'',course:'',instructor:'',date:now.slice(0,10),style:'apa',kind:'research',theme:'linen',sections:[{id:uid(),title:'Introduction',content:emptyDoc()},{id:uid(),title:'Methods',content:emptyDoc()}],sources:[],annotations:{},researchNotes:'',createdAt:now,updatedAt:now};
  if(example){
    const sid=uid(),noteId=uid(),todoId=uid();
    paper.sources=[{id:sid,type:'article-journal',title:'Comparison of land, water, and energy requirements of lettuce grown using hydroponic vs. conventional agricultural methods',authors:'Barbosa, Guilherme Lages\nGadelha, Francisca Daiane Almeida\nKublik, Natalya\nProctor, Alan\nReichelm, Lucas\nWeissinger, Emily\nWohlleb, Gregory M.\nHalden, Rolf U.',year:'2015',container:'International Journal of Environmental Research and Public Health',publisher:'',volume:'12',issue:'6',pages:'6879–6891',url:'https://doi.org/10.3390/ijerph120606879',doi:'10.3390/ijerph120606879',accessed:now.slice(0,10),passages:[{id:'abstract',heading:'Abstract',paragraph:1,text:'energy availability as a major factor'}],savedPassages:[{id:uid(),text:'energy availability as a major factor',locator:'Abstract',locatorType:'section',passageId:'abstract'}]}];
    paper.sections[0].content={type:'doc',content:[paragraph('This proposed study will evaluate water and energy use in a modular recirculating hydroponic system. The comparison will distinguish resource efficiency from plant growth.'),{type:'paragraph',content:[{type:'text',text:'Prior research identifies '},{type:'quotation',attrs:{id:uid(),sourceId:sid,text:'energy availability as a major factor',locator:'Abstract',locatorType:'section',passageId:'abstract'}},{type:'text',text:'. This motivates measuring energy input alongside water use.'},{type:'annotation',attrs:{id:noteId}}]}]};
    paper.sections[1].content={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'The proposed comparison will keep crop variety, lighting, and observation period consistent. The replication plan will be finalized before data collection.'},{type:'annotation',attrs:{id:todoId}}]}]};
    paper.annotations[noteId]={id:noteId,kind:'note',context:'measuring energy input alongside water use',text:'Check how the reference system measures energy before choosing a comparison method.',tasks:[],createdAt:now};
    paper.annotations[todoId]={id:todoId,kind:'todo',context:'The replication plan will be finalized before data collection.',text:'',tasks:[{id:uid(),text:'Choose the number of replicates',done:false},{id:uid(),text:'Define measurement intervals',done:false}],createdAt:now};
    paper.researchNotes='Define the reference design, measurement protocol, and analysis plan before the experiment. Keep observations separate from interpretations.';
  }
  return paper;
}
export function walk(node:RichNode,fn:(node:RichNode)=>void){fn(node);node.content?.forEach(child=>walk(child,fn));}
export function allNodes(paper:Paper,type?:string){const result:RichNode[]=[];paper.sections.forEach(s=>walk(s.content,n=>{if(!type||n.type===type)result.push(n);}));return result;}
export function citationNodes(paper:Paper){return allNodes(paper).filter(n=>n.type==='citation'||n.type==='quotation');}
export function citedIds(paper:Paper){return [...new Set(citationNodes(paper).map(n=>String(n.attrs?.sourceId||'')).filter(Boolean))];}
export function nodeText(node:RichNode):string { if(node.type==='annotation')return '';if(node.type==='quotation')return String(node.attrs?.text||'');return node.text||node.content?.map(nodeText).join(node.type==='doc'?'\n':'')||''; }
const sectionWordCounts=new WeakMap<RichNode,number>();
export function wordCount(paper:Paper){return paper.sections.reduce((total,section)=>{let count=sectionWordCounts.get(section.content);if(count===undefined){const text=nodeText(section.content).trim();count=text?text.split(/\s+/).length:0;sectionWordCounts.set(section.content,count);}return total+count;},0);}
const labelOutputs=new WeakMap<Paper,Record<string,string>>();
export function objectLabels(paper:Paper){const cached=labelOutputs.get(paper);if(cached)return cached;const result:Record<string,string>={};const counts:Record<string,number>={figure:0,table:0,equation:0};let body=0,appendix=0;paper.sections.forEach(section=>{if(section.kind==='appendix')result[section.id]='Appendix '+String.fromCharCode(65+appendix++);else if(['abstract','acknowledgments'].includes(section.kind||''))result[section.id]=section.title;else{body++;result[section.id]=['dissertation','thesis'].includes(paper.kind)?'Chapter '+body:paper.format?.numberSections?'Section '+body:section.title;}walk(section.content,node=>{if(node.attrs?.id&&node.type in counts){counts[node.type]++;result[node.attrs.id]=(node.type==='figure'?'Figure ':node.type==='table'?'Table ':'Equation ')+counts[node.type];}});});labelOutputs.set(paper,result);return result;}
export function safeLink(input:string){try{const url=new URL(input);return ['http:','https:'].includes(url.protocol)?url.href:'';}catch{return '';}}
export function normalizedSourceLink(value:string){const input=value.trim();return /^10\.\d{4,9}\/\S+$/i.test(input)?'https://doi.org/'+input:safeLink(input);}
export function sourceLabel(source:Source){const authors=source.authors.split(/\n|;/).map(s=>s.trim()).filter(Boolean);if(!authors.length)return source.title;const names=authors.map(a=>a.split(',')[0]);return names.length>2?names[0]+' et al.':names.join(' & ');}
export function emptySource():Source{return{id:uid(),type:'webpage',title:'',authors:'',year:'',container:'',publisher:'',volume:'',issue:'',pages:'',url:'',doi:'',accessed:new Date().toISOString().slice(0,10),passages:[],savedPassages:[]};}

const allowed=new Set(['doc','paragraph','text','heading','bulletList','orderedList','listItem','blockquote','hardBreak','horizontalRule','table','tableRow','tableHeader','tableCell','citation','quotation','annotation','figure','equation','crossref','image','pageBreak','footnote']);
const allowedMarks=new Set(['bold','italic','underline','strike','code','link','highlight','label','evidence','quoted']);
export function normalizeDoc(input:any,budget={count:0}):RichNode {
  if(!input||typeof input!=='object'||!allowed.has(input.type)||++budget.count>50000)throw new Error('The document contains unsupported or too much content.');
  const attrs:Record<string,any>={};
  for(const key of ['id','sourceId','text','quoteText','locator','locatorType','passageId','verification','src','caption','alt','latex','targetId','label','level','start','colspan','rowspan','colwidth','textAlign','firstIndent','breakKind']){
    const value=input.attrs?.[key];if(typeof value==='string')attrs[key]=value.slice(0,key==='src'?15000000:key==='text'?100000:20000);else if(typeof value==='number')attrs[key]=value;else if(key==='colwidth'&&Array.isArray(value))attrs[key]=value.slice(0,20).map(Number);
  }
  if(attrs.src&&!attrs.src.startsWith('/api/assets/')&&!/^data:image\/(png|jpeg|webp|gif);base64,/.test(attrs.src)&&!safeLink(attrs.src))delete attrs.src;
  if(attrs.level)attrs.level=Math.max(1,Math.min(3,Number(attrs.level)));
  const node:RichNode={type:input.type};if(input.type==='text')node.text=String(input.text||'').slice(0,1000000);if(Object.keys(attrs).length)node.attrs=attrs;
  if(Array.isArray(input.content))node.content=input.content.map((n:any)=>normalizeDoc(n,budget));
  if(Array.isArray(input.marks))node.marks=input.marks.filter((m:any)=>allowedMarks.has(m.type)).map((m:any)=>({type:m.type,...(m.type==='link'&&safeLink(m.attrs?.href||'')?{attrs:{href:safeLink(m.attrs.href)}}:m.type==='label'?{attrs:{id:String(m.attrs?.id||uid()).slice(0,100),name:String(m.attrs?.name||'Claim').slice(0,100),color:/^#[a-f0-9]{6}$/i.test(m.attrs?.color)?m.attrs.color:'#e6c578'}}:m.type==='quoted'?{attrs:Object.fromEntries(['citationId','sourceId','passageId'].map(k=>[k,String(m.attrs?.[k]||'').slice(0,300)]))}:m.type==='evidence'?{attrs:Object.fromEntries(['sourceId','passageId','text','locator','locatorType'].map(k=>[k,String(m.attrs?.[k]||'').slice(0,k==='text'?12000:300)]))}:{} )}));
  return node;
}
export function validatePaper(input:any):Paper {
  if(!input||input.schemaVersion!==1||typeof input.id!=='string'||!input.id||input.id.length>100)throw new Error('This is not an Academica paper.');
  if(!Array.isArray(input.sections)||!input.sections.length||input.sections.length>100||!Array.isArray(input.sources)||input.sources.length>200)throw new Error('Paper sections or source library are invalid.');
  const p={...input} as Paper;
  for(const key of ['title','author','institution','course','instructor','date','researchNotes','createdAt','updatedAt'] as const)p[key]=String(input[key]||'').slice(0,key==='researchNotes'?100000:2000);
  if(!['apa','mla','chicago','ieee','vancouver','ama'].includes(p.style))throw new Error('Unsupported citation style.');
  p.format=normalizeFormat(input.format);
  if(!['essay','research','dissertation','thesis','review','report','conference'].includes(p.kind))p.kind='research';if(!['linen','rose','midnight'].includes(p.theme))p.theme='linen';
  const ids=new Set<string>();p.sections=input.sections.map((s:any)=>{if(!s.id||ids.has(s.id))throw new Error('Section identifiers must be unique.');ids.add(s.id);return{id:String(s.id),title:String(s.title||'Untitled section').slice(0,300),...(['body','abstract','appendix','acknowledgments'].includes(s.kind)?{kind:s.kind}:{}),content:normalizeDoc(s.content)};});
  const sourceIds=new Set<string>();p.sources=input.sources.map((s:any)=>{if(!s.id||sourceIds.has(s.id))throw new Error('Source identifiers must be unique.');sourceIds.add(s.id);const source={...emptySource(),...s};for(const key of ['id','title','authors','year','container','publisher','volume','issue','pages','url','doi','accessed'])source[key]=String(source[key]||'').slice(0,key==='authors'?10000:3000);if(!['article-journal','paper-conference','webpage','book'].includes(source.type))source.type='webpage';source.passages=Array.isArray(source.passages)?source.passages.slice(0,1200).map((item:any)=>({id:String(item.id).slice(0,100),text:String(item.text||'').slice(0,12000),heading:String(item.heading||'').slice(0,300),paragraph:Number(item.paragraph)||undefined,pdfPage:Number(item.pdfPage)||undefined,pageLabel:String(item.pageLabel||'').slice(0,30),locationVerified:item.locationVerified===false?false:undefined})):[];source.savedPassages=Array.isArray(source.savedPassages)?source.savedPassages.slice(0,500).map((item:any)=>({id:String(item.id||uid()).slice(0,100),text:String(item.text||'').slice(0,12000),locator:String(item.locator||'').slice(0,300),locatorType:['page','paragraph','section'].includes(item.locatorType)?item.locatorType:'page',passageId:String(item.passageId||'').slice(0,100)})):[];for(const key of ['textOrigin','textMessage','textRetrievedAt'])source[key]=String(source[key]||'').slice(0,1000);if(!['ready','partial','unavailable'].includes(source.textStatus))delete source.textStatus;if(!['publisher','europe-pmc','pdf','web-reader','html','paste'].includes(source.textMethod))delete source.textMethod;source.textAttemptVersion=Math.max(0,Math.min(100,Number(source.textAttemptVersion)||0));source.overrides=Object.fromEntries(['apa','mla','chicago','ieee','vancouver','ama'].map(style=>[style,String(source.overrides?.[style]||'').slice(0,30000)]));if(source.health)source.health={state:['clear','notice','unknown'].includes(source.health.state)?source.health.state:'unknown',checkedAt:String(source.health.checkedAt||'').slice(0,100),messages:Array.isArray(source.health.messages)?source.health.messages.slice(0,30).map((m:any)=>String(m).slice(0,1000)):[]};return source;});
  p.annotations={};for(const [id,a] of Object.entries(input.annotations||{}).slice(0,2000)){const item=a as any;p.annotations[id]={id,kind:item.kind==='todo'?'todo':'note',context:String(item.context||'').slice(0,500),text:String(item.text||'').slice(0,30000),tasks:Array.isArray(item.tasks)?item.tasks.slice(0,200).map((task:any)=>({id:String(task.id),text:String(task.text||'').slice(0,3000),done:Boolean(task.done)})):[],createdAt:String(item.createdAt||new Date().toISOString())};}
  return p;
}
