import {emptySource,normalizedSourceLink,uid,type Source,type Passage} from './model';
import {Readability} from '@mozilla/readability';
export type ImportResult={source:Source;warning:string};
const EUROPE='https://www.ebi.ac.uk/europepmc/webservices/rest/';
const TEXT_LIMIT=120000;
export function sourceIdentifier(input:string){const link=normalizedSourceLink(input);if(!link)throw new Error('Enter an article link or DOI.');const url=new URL(link),decoded=decodeURIComponent(url.href);const doi=decoded.match(/10\.\d{4,9}\/[^\s?#]+/i)?.[0];const pii=/(^|\.)sciencedirect\.com$/.test(url.hostname)?url.pathname.match(/\/pii\/([A-Z0-9]+)/i)?.[1]:undefined;const pmcid=/(^|\.)(ncbi\.nlm\.nih\.gov|europepmc\.org)$/.test(url.hostname)?url.pathname.match(/PMC\d+/i)?.[0].toUpperCase():undefined;return{url,doi,pii,pmcid};}
async function get(url:string,timeout=15000){const response=await fetch(url,{signal:AbortSignal.timeout(timeout),credentials:'omit'});if(!response.ok)throw new Error('The source returned '+response.status+'.');return response;}
async function json(url:string){return await(await get(url)).json() as any;}
function plain(value:string){const doc=new DOMParser().parseFromString(value,'text/html');return doc.body.textContent?.replace(/\s+/g,' ').trim()||'';}
export function crossrefSource(m:any,original:string):Source{const s=emptySource();Object.assign(s,{type:m.type==='book'?'book':m.type==='proceedings-article'?'paper-conference':'article-journal',title:plain(m.title?.[0]||''),authors:(m.author||[]).map((a:any)=>a.family?[a.family,a.given].filter(Boolean).join(', '):a.name||'').filter(Boolean).join('\n'),year:String(m.published?.['date-parts']?.[0]?.[0]||m.issued?.['date-parts']?.[0]?.[0]||''),container:plain(m['container-title']?.[0]||''),publisher:m.publisher||'',volume:String(m.volume||''),issue:String(m.issue||''),pages:m.page||'',doi:m.DOI||'',url:original});return s;}
function europeSource(item:any,url:string){const s=emptySource(),j=item.journalInfo||{};Object.assign(s,{type:'article-journal',title:plain(item.title||''),authors:(item.authorList?.author||[]).map((a:any)=>a.lastName?[a.lastName,a.firstName].filter(Boolean).join(', '):a.fullName||'').filter(Boolean).join('\n')||item.authorString||'',year:String(item.pubYear||''),container:j.journal?.title||'',volume:j.volume||'',issue:j.issue||'',pages:item.pageInfo||'',doi:item.doi||'',url});return s;}
async function europeRecord(query:string){const result=await json(EUROPE+'search?query='+encodeURIComponent(query)+'&resultType=core&format=json');return result.resultList?.result||[];}
export function sourceFromJATS(xml:string,original:string,existing?:Source):Source{
  const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.querySelector('parsererror')||!doc.querySelector('article'))throw new Error('The full-text record was unreadable.');
  const front=doc.querySelector('article > front'),meta=front?.querySelector('article-meta');if(!meta)throw new Error('No article details were present.');
  const text=(selector:string)=>meta.querySelector(selector)?.textContent?.replace(/\s+/g,' ').trim()||'';
  const source=existing?structuredClone(existing):emptySource();
  if(!source.title){Object.assign(source,{type:'article-journal',title:text('article-title'),authors:[...meta.querySelectorAll('contrib[contrib-type="author"]')].map(a=>{const family=a.querySelector('surname')?.textContent||'',given=a.querySelector('given-names')?.textContent||'';return family?[family,given].filter(Boolean).join(', '):a.querySelector('collab')?.textContent||'';}).filter(Boolean).join('\n'),year:text('pub-date[pub-type="epub"] year')||text('pub-date year'),container:front?.querySelector('journal-title')?.textContent||'',publisher:front?.querySelector('publisher-name')?.textContent||'',volume:text('volume'),issue:text('issue'),pages:[text('fpage'),text('lpage')].filter(Boolean).join('–')||text('elocation-id'),doi:text('article-id[pub-id-type="doi"]'),url:original});}
  let total=0,truncated=false;const passages:Passage[]=[],paragraphs=new Map<Element,number>();
  for(const node of doc.querySelectorAll('article > front abstract p, article > front article-meta abstract p, article > body p')){
    if(node.closest('table-wrap,fig,supplementary-material'))continue;
    const value=node.textContent?.replace(/\s+/g,' ').trim()||'';if(value.length<15)continue;
    if(total+value.length>TEXT_LIMIT){truncated=true;break;}
    const section=node.closest('sec,abstract')||doc.querySelector('body')!,heading=section.tagName==='abstract'?'Abstract':section.querySelector(':scope > title')?.textContent?.trim()||'Article';
    const paragraph=(paragraphs.get(section)||0)+1;paragraphs.set(section,paragraph);
    passages.push({id:uid(),text:value,heading,paragraph});total+=value.length;
  }
  if(!passages.length)throw new Error('No readable article paragraphs were provided.');
  Object.assign(source,{passages,textStatus:truncated?'partial':'ready',textOrigin:original,textRetrievedAt:new Date().toISOString(),textMessage:truncated?'Reader excerpt saved (120,000-character limit). Matches only check the imported text.':'Article text from Europe PMC. Tables and figures remain in the original.'});return source;
}
async function fromEurope(pmcid:string,source?:Source){const url=EUROPE+pmcid+'/fullTextXML',response=await get(url);const xml=await response.text();if(xml.length>4000000)throw new Error('The article is too large for the reader.');return sourceFromJATS(xml,url,source);}
export async function enrichPDFSource(source:Source){
  if(!source.doi)return source;
  try{const meta=crossrefSource((await json('https://api.crossref.org/works/'+encodeURIComponent(source.doi))).message,source.url);return{...meta,id:source.id,passages:source.passages,savedPassages:source.savedPassages,textStatus:source.textStatus,textOrigin:source.textOrigin,textMessage:source.textMessage,textRetrievedAt:source.textRetrievedAt};}catch{return source;}
}
async function pdfSource(url:string){const response=await get(url,25000);if(Number(response.headers.get('content-length'))>10000000)throw new Error('Choose a PDF smaller than 10 MB.');const {extractPDF}=await import('./pdf-source');return enrichPDFSource(await extractPDF(await response.arrayBuffer(),decodeURIComponent(new URL(url).pathname.split('/').pop()||'PDF article'),url));}
async function extractPage(url:string,existing?:Source):Promise<Source>{
  const response=await get(url,10000);if(response.headers.get('content-type')?.includes('application/pdf')){const{extractPDF}=await import('./pdf-source');return enrichPDFSource(await extractPDF(await response.arrayBuffer(),'PDF article',url));}
  const html=await response.text();if(html.length>2500000)throw new Error('The article page is too large.');const doc=new DOMParser().parseFromString(html,'text/html'),meta=(name:string)=>doc.querySelector(`meta[name="${name}"],meta[property="${name}"]`)?.getAttribute('content')?.trim()||'';
  if(/checking your browser|verify you are human|just a moment/i.test(doc.title))throw new Error('The publisher requires an interactive verification.');
  let source=existing?structuredClone(existing):undefined;const doi=meta('citation_doi');
  if(!source&&/^10\.\d{4,9}\//.test(doi)){try{source=crossrefSource((await json('https://api.crossref.org/works/'+encodeURIComponent(doi))).message,url);}catch{}}
  const article=new Readability(doc.cloneNode(true) as Document,{charThreshold:100}).parse();
  if(!source){source=emptySource();const title=meta('citation_title')||meta('og:title')||article?.title||doc.title;if(!title.trim())throw new Error('No reliable title was found.');Object.assign(source,{title,authors:[...doc.querySelectorAll('meta[name="citation_author"]')].map(a=>a.getAttribute('content')).filter(Boolean).join('\n')||meta('author'),year:(meta('citation_publication_date')||meta('article:published_time')).match(/\d{4}/)?.[0]||'',container:meta('citation_journal_title')||meta('og:site_name'),volume:meta('citation_volume'),issue:meta('citation_issue'),pages:[meta('citation_firstpage'),meta('citation_lastpage')].filter(Boolean).join('–'),url,doi});}
  const body=new DOMParser().parseFromString(article?.content||'','text/html');let heading='',paragraph=0,total=0,truncated=false;const passages:Passage[]=[];
  for(const node of body.querySelectorAll('h2,h3,h4,p,blockquote')){if(node.tagName.startsWith('H')){heading=node.textContent?.trim()||'';paragraph=0;continue;}const text=node.textContent?.replace(/\s+/g,' ').trim()||'';paragraph++;if(text.length<15)continue;if(total+text.length>TEXT_LIMIT){truncated=true;break;}total+=text.length;passages.push({id:uid(),text,heading,paragraph});}
  if(!passages.length)throw new Error('The publisher provided no readable article text.');
  // Publisher landing pages frequently contain only the abstract. Do not call these full text.
  Object.assign(source,{passages,textStatus:'partial',textOrigin:url,textRetrievedAt:new Date().toISOString(),textMessage:truncated?'Reader excerpt saved (120,000-character limit).':'Readable page text imported; the publisher may have provided only an abstract or excerpt.'});return source;
}
export async function retrieveSourceText(source:Source):Promise<Source>{
  if(!source.url&&!source.doi)throw new Error('Add an article URL or upload its PDF to load the reader.');
  const original=source.url||'https://doi.org/'+source.doi,{url,pmcid}=sourceIdentifier(original);
  if(pmcid)return fromEurope(pmcid,source);
  if(/\.pdf$/i.test(url.pathname)){const loaded=await pdfSource(url.href);return{...source,...loaded,id:source.id,savedPassages:source.savedPassages,overrides:source.overrides};}
  if(source.doi){try{const items=await europeRecord('DOI:"'+source.doi+'"');const item=items.find((r:any)=>r.doi?.toLowerCase()===source.doi.toLowerCase()&&r.pmcid);if(item)return await fromEurope(item.pmcid,source);}catch{}}
  return extractPage(url.href,source);
}
export async function importSource(input:string):Promise<ImportResult>{
  const {url,doi,pii,pmcid}=sourceIdentifier(input);let source:Source|undefined;
  if(pmcid){try{source=await fromEurope(pmcid);source.url=url.href;}catch{const items=await europeRecord(pmcid);const item=items.find((r:any)=>r.pmcid===pmcid);if(item)source=europeSource(item,url.href);}}
  else if(/\.pdf$/i.test(url.pathname)){try{source=await pdfSource(url.href);}catch(e:any){throw new Error('The PDF could not be imported from its link. Download it and use Import PDF; citation details will be filled from its DOI when available. '+(e.message||''));}}
  else if(doi){source=crossrefSource((await json('https://api.crossref.org/works/'+encodeURIComponent(doi))).message,url.href);}
  else if(pii){const result=await json('https://api.crossref.org/works?filter=alternative-id:'+encodeURIComponent(pii)+'&rows=5');const exact=result.message?.items?.find((item:any)=>(item['alternative-id']||[]).some((id:string)=>id.toUpperCase()===pii.toUpperCase()));if(exact)source=crossrefSource(exact,url.href);}
  else if(url.hostname==='pubmed.ncbi.nlm.nih.gov'){const id=url.pathname.match(/\d+/)?.[0];if(id){const items=await europeRecord('EXT_ID:'+id+' AND SRC:MED'),item=items.find((r:any)=>r.id===id);if(item)source=europeSource(item,url.href);}}
  if(!source){try{source=await extractPage(url.href);}catch{throw new Error('Could not retrieve article metadata from this link. Try the DOI or Import PDF, or enter the source manually.');}}
  if(!source.title)throw new Error('No reliable title was found. Enter this source manually.');
  if(!source.passages.length){try{source=await retrieveSourceText(source);}catch{source.textStatus='unavailable';source.textMessage='Citation details imported. Article text could not be fetched; the publisher may restrict browser access. Import its PDF to read and verify quotations.';}}
  const missing=!source.authors||!source.year?' Check the author or publication year.':'';
  return{source,warning:(source.passages.length?'Reference and reader text imported.':'Reference imported; reader text unavailable. ')+(source.textStatus==='partial'?'Only the available excerpt was saved. ':'')+missing+(source.passages.length?'':source.textMessage||'')};
}
