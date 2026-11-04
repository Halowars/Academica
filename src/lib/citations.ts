import CSL from 'citeproc';
import apa from './csl/apa.csl?raw';
import mla from './csl/mla.csl?raw';
import chicago from './csl/chicago.csl?raw';
import ieee from './csl/ieee.csl?raw';
import vancouver from './csl/vancouver.csl?raw';
import ama from './csl/ama.csl?raw';
import locale from './csl/en-US.xml?raw';
import { citedIds,citationNodes,safeLink,type Paper,type Source } from './model';

function names(value:string){return value.split(/\n|;/).map(s=>s.trim()).filter(Boolean).map(s=>{const i=s.indexOf(',');return i<0?{literal:s}:{family:s.slice(0,i).trim(),given:s.slice(i+1).trim()};});}
export function toCSL(source:Source){const year=Number(source.year.match(/\d{4}/)?.[0]);return{id:source.id,type:source.type,title:source.title,author:names(source.authors),'container-title':source.container,publisher:source.publisher,volume:source.volume,issue:source.issue,page:source.pages,DOI:/^10\.\d{4,9}\//.test(source.doi)?source.doi:undefined,URL:safeLink(source.url)||undefined,...(year?{issued:{'date-parts':[[year]]}}:{}),...(source.accessed?{accessed:{'date-parts':[source.accessed.split('-').map(Number)]}}:{})};}
export type CitationOutput={inline:Record<string,string>;bibliography:{sourceId:string;html:string}[]};
let lastKey='',lastResult:CitationOutput={inline:{},bibliography:[]};
export function formatPaper(paper:Paper):CitationOutput{
  const nodes=citationNodes(paper),ids=citedIds(paper);const key=JSON.stringify([paper.style,paper.sources,nodes.map(n=>n.attrs)]);
  if(lastKey===key)return lastResult;
  const sourceMap=new Map(paper.sources.map(s=>[s.id,s]));const result:CitationOutput={inline:{},bibliography:[]};
  if(!ids.length){lastKey=key;lastResult=result;return result;}
  const engine=new CSL.Engine({retrieveLocale:()=>locale,retrieveItem:(id:string)=>toCSL(sourceMap.get(String(id))!)},{apa,mla,chicago,ieee,vancouver,ama}[paper.style],'en-US');
  engine.setOutputFormat('html');engine.updateItems(ids.filter(id=>sourceMap.has(id)));
  const prior:[string,number][]=[];
  for(let index=0;index<nodes.length;index++){
    const attrs=nodes[index].attrs||{},source=sourceMap.get(attrs.sourceId),citationID=String(attrs.id||'citation-'+index);
    if(!source){result.inline[citationID]='(source needed)';continue;}
    const item:any={id:source.id};if(attrs.locator){item.locator=attrs.locator;item.label=attrs.locatorType||'page';}
    const cluster={citationID,citationItems:[item],properties:{noteIndex:0}};
    try{const processed=engine.processCitationCluster(cluster,prior,[]);for(const update of processed[1])result.inline[String(update[2])]=update[1];prior.push([citationID,0]);}catch{result.inline[citationID]='(citation needs review)';}
  }
  const bibliography=engine.makeBibliography();
  if(bibliography){const [settings,entries]=bibliography;result.bibliography=entries.map((html:string,i:number)=>{const sourceId=String(settings.entry_ids[i][0]);const source=sourceMap.get(sourceId)!;const override=source.overrides?.[paper.style];return{sourceId,html:override?'<div class="csl-entry">'+escapeHTML(override)+'</div>':html};});}
  lastKey=key;lastResult=result;return result;
}
export function escapeHTML(value:unknown){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
