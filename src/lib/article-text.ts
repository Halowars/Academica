import {Readability} from '@mozilla/readability';
import {emptySource,safeLink,uid,type Passage,type Source} from './model';
export const ARTICLE_TEXT_LIMIT=120000;
export type ReaderFailure='verification'|'restricted'|'rate-limit'|'network'|'empty'|'outdated';
export class ArticleReadError extends Error {constructor(public reason:ReaderFailure,message:string){super(message);this.name='ArticleReadError';}}
export function readerError(error:unknown){
  if(error instanceof ArticleReadError)return error.message;
  const message=error instanceof Error?error.message:'';
  if(/dynamically imported module|loading chunk|importing a module script/i.test(message))return 'This tab is using an older version of Academica. Reload the page and try again.';
  return 'The article could not be retrieved. Open it in your browser and add its text, saved HTML, or PDF.';
}
export function assertArticlePage(title:string,text:string,status=200){
  if(status===429)throw new ArticleReadError('rate-limit','The public reader is busy or rate-limited. Try again later, or import the article text or file.');
  if(/just a moment|checking (?:your )?browser|^access denied|verify (?:you are|you.re) human/i.test(title)||/(?:^|\n)\s*#*\s*(?:are you a robot\??|verify you are human|checking your browser|please (?:confirm|verify) (?:that )?you are (?:a )?human)/i.test(text.slice(0,6000))||/complet(?:e|ing) (?:the |a )?captcha challenge/i.test(text.slice(0,4000)))throw new ArticleReadError('verification','The publisher returned a human-verification page. Open the article normally, then import text, saved HTML, or a PDF you can access.');
  if(status===401||status===403||/^sign[ -]?in|^log[ -]?in|^subscribe (?:to|for)/i.test(title))throw new ArticleReadError('restricted','The publisher requires access or sign-in. Import the article text or file from a copy you can read.');
  if(status>=400)throw new ArticleReadError('network','The publisher did not provide this article. Open it in your browser or import a saved copy.');
}
export function publicReaderTarget(value:string){
  const safe=safeLink(value);if(!safe)throw new ArticleReadError('restricted','Use a public article URL for web reading.');const url=new URL(safe),host=url.hostname.toLowerCase();
  if(url.protocol!=='https:'||url.username||url.password||url.port||!host.includes('.')||/^[\d.]+$/.test(host)||host.includes(':')||/(^|\.)(localhost|local|internal|test|invalid|example|onion)$/.test(host))throw new ArticleReadError('restricted','This address is private or local. Import its text or file directly instead.');
  if([...url.searchParams.keys()].some(key=>/token|api.?key|password|secret|authorization|session|signature|credential|access.?key|^key$|^sig$/i.test(key)))throw new ArticleReadError('restricted','This link may contain private access details. Import its text or file directly instead of sending the link to the public reader.');
  url.hash='';return url.href;
}
export function publicReaderEnabled(){try{return localStorage.getItem('academica-public-reader')!=='disabled';}catch{return true;}}
export function setPublicReaderEnabled(value:boolean){try{localStorage.setItem('academica-public-reader',value?'enabled':'disabled');}catch{}}
function cleanDOI(value:string){return value.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'').replace(/^doi:\s*/i,'');}
function value(meta:Record<string,any>,key:string){const item=meta[key];return Array.isArray(item)?item.map(String).join('\n'):typeof item==='string'?item:'';}
function cleanText(text:string){
  if(/<\/?(?:script|style|p|span|div|a|sup|sub|em|strong|br)(?:\s|>)/i.test(text)){const doc=new DOMParser().parseFromString(text,'text/html');doc.querySelectorAll('script,style,iframe,form,input,button,nav').forEach(el=>el.remove());text=doc.body.textContent||'';}
  return text.replace(/!\[[^\]]*\]\([^\n]*?\)/g,'').replace(/\[([^\]]+)\]\((?:[^()\n]|\([^()\n]*\))*\)/g,'$1').replace(/\*\*([^*]+)\*\*/g,'$1').replace(/__([^_]+)__/g,'$1').replace(/`([^`]+)`/g,'$1').replace(/\s+/g,' ').trim();
}
function limitedPassages(items:{text:string;heading?:string;paragraph?:number;locationVerified?:boolean}[]){
  const passages:Passage[]=[];let count=0,truncated=false;
  for(const item of items){if(item.text.length<8)continue;const remaining=ARTICLE_TEXT_LIMIT-count;if(remaining<=0){truncated=true;break;}let text=item.text;if(text.length>remaining){text=text.slice(0,remaining);truncated=true;}
    // Preserve long paragraphs across the project validator's per-passage limit.
    for(let offset=0;offset<text.length;){let end=Math.min(offset+11000,text.length);if(end<text.length){const space=text.lastIndexOf(' ',end);if(space>offset+9000)end=space;}passages.push({id:uid(),...item,text:text.slice(offset,end).trim()});offset=end;}
    count+=text.length;
  }
  return{passages,truncated};
}
export function textPassages(text:string,markdown=false){
  let heading='',paragraph=0,buffer:string[]=[];const items:{text:string;heading?:string;paragraph?:number;locationVerified?:boolean}[]=[];
  const flush=()=>{const content=markdown?cleanText(buffer.join(' ')):buffer.join(' ').replace(/\s+/g,' ').trim();if(content)items.push({text:content,heading,paragraph:++paragraph,locationVerified:markdown&&!!heading?undefined:false});buffer=[];};
  for(const line of text.replace(/\r\n?/g,'\n').split('\n')){
    const title=markdown?line.match(/^#{1,6}\s+(.+)$/)?.[1]:undefined;
    if(title){flush();heading=cleanText(title).slice(0,300);paragraph=0;continue;}
    if(!line.trim()||markdown&&/^\s*(?:```|~~~|---+$|\*\*\*+$)/.test(line)){flush();continue;}
    if(markdown&&/^\s*!\[/.test(line))continue;
    buffer.push(line.trim());
  }
  flush();return limitedPassages(items);
}
export function sourceFromPlainText(text:string,source:Source){
  assertArticlePage('',text);const extracted=textPassages(text);if(!extracted.passages.length)throw new ArticleReadError('empty','Paste the article’s readable text before importing.');
  return{...structuredClone(source),passages:extracted.passages,textStatus:'partial' as const,textMethod:'paste' as const,textOrigin:source.url||'Pasted article text',textRetrievedAt:new Date().toISOString(),textMessage:(extracted.truncated?'A text excerpt was saved (120,000-character limit). ':'')+'Text imported from your copy. Check quotations against the original; printed citation pages must be added manually.'};
}
export function sourceFromHTML(html:string,original='',existing?:Source):Source{
  if(html.length>5000000)throw new Error('Choose an HTML file smaller than 5 MB.');const doc=new DOMParser().parseFromString(html,'text/html');
  const meta=(name:string)=>[...doc.querySelectorAll(`meta[name="${name}"],meta[property="${name}"]`)].map(el=>el.getAttribute('content')?.trim()||'').filter(Boolean).join('\n');
  assertArticlePage(doc.title,doc.body?.textContent||'');
  const incomingDOI=cleanDOI(meta('citation_doi'));if(existing?.doi&&incomingDOI&&cleanDOI(existing.doi).toLowerCase()!==incomingDOI.toLowerCase())throw new ArticleReadError('restricted','This HTML belongs to a different DOI. Import it as a separate source.');
  const originalURL=safeLink(original)||safeLink(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')||meta('og:url'));
  doc.querySelectorAll('script,style,noscript,iframe,object,embed,form,input,button,nav,aside,footer').forEach(el=>el.remove());
  const article=new Readability(doc.cloneNode(true) as Document,{charThreshold:100}).parse();
  const source=existing?structuredClone(existing):emptySource();const fields={title:meta('citation_title')||meta('og:title')||article?.title||doc.title,authors:meta('citation_author')||meta('author')||article?.byline||'',year:(meta('citation_publication_date')||meta('article:published_time')).match(/\d{4}/)?.[0]||'',container:meta('citation_journal_title')||meta('og:site_name'),volume:meta('citation_volume'),issue:meta('citation_issue'),pages:[meta('citation_firstpage'),meta('citation_lastpage')].filter(Boolean).join('–'),doi:incomingDOI,url:originalURL};
  for(const [key,field] of Object.entries(fields))if(!(source as any)[key]&&field)(source as any)[key]=field;
  if(!existing?.title&&(source.doi||meta('citation_journal_title')))source.type='article-journal';
  const body=new DOMParser().parseFromString(article?.content||'','text/html');let heading='',paragraph=0;const items:{text:string;heading?:string;paragraph?:number}[]=[];
  for(const node of body.querySelectorAll('h1,h2,h3,h4,p,li,blockquote')){if(node.matches('li p,blockquote p'))continue;if(node.tagName.startsWith('H')){heading=node.textContent?.replace(/\s+/g,' ').trim()||'';paragraph=0;continue;}const text=node.textContent?.replace(/\s+/g,' ').trim()||'';if(text.length>=15)items.push({text,heading,paragraph:++paragraph});}
  const extracted=limitedPassages(items);if(!extracted.passages.length)throw new ArticleReadError('empty','No article paragraphs were found in this HTML. Try copying the readable text or importing its PDF.');
  Object.assign(source,{passages:extracted.passages,textStatus:'partial',textMethod:'html',textOrigin:originalURL||'Saved HTML file',textRetrievedAt:new Date().toISOString(),textMessage:extracted.truncated?'A reader excerpt was saved (120,000-character limit).':'Readable HTML text imported. The page may contain only an abstract or excerpt; check the original for complete content.'});return source;
}
export function sourceFromReaderResponse(payload:any,original:string,existing?:Source):Source{
  const data=payload?.data;if(payload?.code===429)throw new ArticleReadError('rate-limit','The public reader is rate-limited. Try again later or import a copy.');
  if(!data||typeof data.content!=='string')throw new ArticleReadError('empty','The public reader returned no article text. Import a saved copy instead.');
  assertArticlePage(String(data.title||''),data.content,Number(data.httpStatus)||Number(payload.code)||200);
  if(data.finalUrl)publicReaderTarget(data.finalUrl);
  const source=existing?structuredClone(existing):emptySource(),metadata=data.metadata||{},incomingDOI=cleanDOI(value(metadata,'citation_doi'));if(existing?.doi&&incomingDOI&&cleanDOI(existing.doi).toLowerCase()!==incomingDOI.toLowerCase())throw new ArticleReadError('restricted','The retrieved page belongs to a different DOI. Check this source’s URL.');
  const fields={title:value(metadata,'citation_title')||data.title||'',authors:value(metadata,'citation_author')||value(metadata,'author'),year:(value(metadata,'citation_publication_date')||value(metadata,'article:published_time')).match(/\d{4}/)?.[0]||'',container:value(metadata,'citation_journal_title')||value(metadata,'og:site_name'),volume:value(metadata,'citation_volume'),issue:value(metadata,'citation_issue'),doi:incomingDOI,pages:[value(metadata,'citation_firstpage'),value(metadata,'citation_lastpage')].filter(Boolean).join('–'),url:original};
  for(const[key,field]of Object.entries(fields))if(!(source as any)[key]&&field)(source as any)[key]=String(field);
  if(!existing?.title&&(source.doi||value(metadata,'citation_journal_title')))source.type='article-journal';
  const extracted=textPassages(data.content,true);if(!extracted.passages.length)throw new ArticleReadError('empty','The public reader found no readable article paragraphs. Import a copy you can access.');
  Object.assign(source,{passages:extracted.passages,textStatus:'partial',textMethod:'web-reader',textOrigin:original,textRetrievedAt:new Date().toISOString(),textMessage:(extracted.truncated?'A reader excerpt was saved (120,000-character limit). ':'')+'Public page text fetched with Jina Reader. This may be an abstract or excerpt; no publisher sign-in was used.'});return source;
}
export async function readPublicPage(url:string,existing?:Source){
  const target=publicReaderTarget(url);let response:Response;
  try{response=await fetch('https://r.jina.ai/'+target,{headers:{Accept:'application/json'},credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(35000)});}catch{throw new ArticleReadError('network','The public reader could not reach the article. Import readable text, saved HTML, or a PDF instead.');}
  assertArticlePage('','',response.status);const body=await response.text();if(body.length>2500000)throw new ArticleReadError('empty','The web page is too large for automatic reading. Import a shorter copy.');let payload:any;try{payload=JSON.parse(body);}catch{throw new ArticleReadError('empty','The public reader did not return readable article text. Import a saved copy.');}
  return sourceFromReaderResponse(payload,target,existing);
}
export function mergeReaderText(existing:Source,incoming:Source):Source{
  if(!incoming.passages.length&&existing.passages.length)return existing;
  return{...existing,passages:incoming.passages,textStatus:incoming.textStatus,textMethod:incoming.textMethod,textOrigin:incoming.textOrigin,textMessage:incoming.textMessage,textRetrievedAt:incoming.textRetrievedAt,textAttemptVersion:incoming.textAttemptVersion};
}
