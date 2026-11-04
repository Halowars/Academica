import type {LocatorType,Passage,Source} from './model';

// Only typography and PDF line wrapping are normalized. Similar wording is not evidence.
export function normalizeQuotation(text:string){return text.normalize('NFKC').replace(/\u00ad/g,'').replace(/([\p{L}])-\s*\n\s*(?=[\p{Ll}])/gu,'$1').replace(/[“”„]/g,'"').replace(/[‘’]/g,"'").replace(/[–—−]/g,'-').replace(/\s+/g,' ').trim();}
export function passageLocation(passage:Passage):{locator:string;locatorType:LocatorType}{
  if(passage.locationVerified===false)return{locator:'',locatorType:'page'};
  if(passage.pdfPage)return{locator:passage.pageLabel||'',locatorType:'page'};
  if(passage.heading)return{locator:passage.heading+(passage.paragraph?', para. '+passage.paragraph:''),locatorType:'section'};
  return{locator:passage.paragraph?String(passage.paragraph):'',locatorType:'paragraph'};
}
export type QuoteMatch={status:'verified'|'saved'|'unmatched'|'unavailable';locator:string;locatorType:LocatorType;passageId?:string;ambiguous?:boolean};
type PassageIndex={text:string;spans:{from:number;to:number;passage:Passage}[]};
const passageIndexes=new WeakMap<Passage[],PassageIndex>();
const matches=new WeakMap<Source,{passages:Passage[];saved:Source['savedPassages'];values:Map<string,QuoteMatch>}>();
function passageIndex(passages:Passage[]):PassageIndex{
  const cached=passageIndexes.get(passages);if(cached)return cached;
  let text='';const spans:PassageIndex['spans']=[];
  for(const passage of passages){const part=normalizeQuotation(passage.text);if(!part)continue;
    // A PDF can divide a hyphenated word across two imported paragraphs/pages.
    if(/\p{L}-$/u.test(text)&&/^\p{Ll}/u.test(part)){text=text.slice(0,-1);if(spans.length)spans[spans.length-1].to=text.length;}
    else if(text)text+=' ';
    const from=text.length;text+=part;spans.push({from,to:text.length,passage});
  }
  const result={text,spans};passageIndexes.set(passages,result);return result;
}
export function matchQuotation(source:Source,quote:string):QuoteMatch{
  const needle=normalizeQuotation(quote),fallback:QuoteMatch={status:source.passages.length?'unmatched':'unavailable',locator:'',locatorType:'page'};
  if(!needle)return fallback;
  let cached=matches.get(source);if(!cached||cached.passages!==source.passages||cached.saved!==source.savedPassages){cached={passages:source.passages,saved:source.savedPassages,values:new Map()};matches.set(source,cached);}const prior=cached.values.get(needle);if(prior)return prior;
  const {text,spans}=passageIndex(source.passages),at=text.indexOf(needle);
  let result:QuoteMatch;
  if(at>=0){const first=spans.find(s=>s.to>at)!,last=spans.find(s=>s.to>=at+needle.length)!,location=passageLocation(first.passage);
    if(location.locatorType==='page'&&location.locator&&last.passage.pdfPage!==first.passage.pdfPage&&last.passage.pageLabel)location.locator+='–'+last.passage.pageLabel;
    result=text.indexOf(needle,at+1)>=0?{status:'verified',locator:'',locatorType:location.locatorType,ambiguous:true}:{status:'verified',...location,passageId:first.passage.id};
  }else{
  const saved=source.savedPassages.find(p=>normalizeQuotation(p.text)===needle);
    result=saved?{status:'saved',locator:saved.locator,locatorType:saved.locatorType,passageId:saved.passageId}:fallback;
  }
  if(cached.values.size>=128)cached.values.delete(cached.values.keys().next().value!);cached.values.set(needle,result);return result;
}
export function quotationBefore(text:string){
  const match=text.match(/(?:“([^“”\ufffc]+)”|"([^"\ufffc]+)")([\s.,;:!?]*)$/);
  if(!match||!(match[1]||match[2]).trim())return null;
  return{text:(match[1]||match[2]).trim(),from:match.index!,to:text.length-match[3].length};
}
export function pastedQuotation(text:string){
  const value=text.trim();if(!value||/^https?:\/\/\S+$/i.test(value)||value.length>12000)return null;
  const outer=value.match(/^(?:“([\s\S]+)”|"([\s\S]+)")$/);
  if(outer)return(outer[1]||outer[2]).trim()||null;
  return value.split(/\s+/).length>=6&&value.length>=30?value:null;
}

export type QuoteOccurrence={passageId:string;locator:string;locatorType:LocatorType;parts:{passageId:string;from:number;to:number}[]};
// Keep a UTF-16 map back to the original text, including ligatures and PDF wraps.
export function quotationIndex(raw:string){
  let text='',map:{from:number;to:number}[]=[];
  const chars=Array.from(new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(raw),s=>s.segment);let offset=0;
  for(let i=0;i<chars.length;i++){
    const char=chars[i],start=offset;offset+=char.length;
    if(char==='\u00ad')continue;
    if(char==='-'&&i>0&&/\p{L}/u.test(chars[i-1])){const wrap=raw.slice(offset).match(/^\s*\n\s*(?=\p{Ll})/u);if(wrap){let skipped=0;while(skipped<wrap[0].length&&i+1<chars.length){i++;skipped+=chars[i].length;offset+=chars[i].length;}continue;}}
    const normalized=char.normalize('NFKC').replace(/[“”„]/g,'"').replace(/[‘’]/g,"'").replace(/[–—−]/g,'-');
    for(const c of normalized){if(/\s/u.test(c)){if(text.endsWith(' ')){map[map.length-1].to=offset;continue;}if(!text)continue;text+=' ';map.push({from:start,to:offset});}else{text+=c;for(let j=0;j<c.length;j++)map.push({from:start,to:offset});}}
  }
  if(text.endsWith(' ')){text=text.slice(0,-1);map.pop();}return{text,map};
}
const occurrenceIndexes=new WeakMap<Passage[],{index:ReturnType<typeof quotationIndex>;offsets:{start:number;end:number;id:string}[]}>();
export function quotationOccurrences(source:Source,quote:string):QuoteOccurrence[]{
  const needle=normalizeQuotation(quote);if(!needle)return[];let cached=occurrenceIndexes.get(source.passages);
  if(!cached){const offsets:{start:number;end:number;id:string}[]=[];let raw='';for(const p of source.passages){if(raw)raw+='\n';const start=raw.length;raw+=p.text;offsets.push({start,end:raw.length,id:p.id});}cached={index:quotationIndex(raw),offsets};occurrenceIndexes.set(source.passages,cached);}
  const {text,map}=cached.index,{offsets}=cached,result:QuoteOccurrence[]=[];let at=0;
  while(result.length<200&&(at=text.indexOf(needle,at))!==-1){const start=map[at].from,end=map[at+needle.length-1].to;const parts=offsets.filter(p=>p.end>start&&p.start<end).map(p=>({passageId:p.id,from:Math.max(0,start-p.start),to:Math.min(p.end-p.start,end-p.start)}));const first=source.passages.find(p=>p.id===parts[0]?.passageId);if(first)result.push({passageId:first.id,...passageLocation(first),parts});at+=Math.max(1,needle.length);}return result;
}
