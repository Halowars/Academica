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
export function matchQuotation(source:Source,quote:string):QuoteMatch{
  const needle=normalizeQuotation(quote),fallback:QuoteMatch={status:source.passages.length?'unmatched':'unavailable',locator:'',locatorType:'page'};
  if(!needle)return fallback;
  let found:QuoteMatch|undefined;
  for(let i=0;i<source.passages.length;i++){
    const passage=source.passages[i];
    // Include following paragraphs so a pasted excerpt may span a paragraph or page break.
    let haystack='';
    for(let j=i;j<source.passages.length&&haystack.length<needle.length+24000;j++){
      haystack+=(haystack?'\n':'')+source.passages[j].text;
      const normalized=normalizeQuotation(haystack),index=normalized.indexOf(needle);
      if(index>=0){
        // A match beginning in a later passage will be handled at that passage, with its location.
        if(index>=normalizeQuotation(passage.text).length)break;
        const location=passageLocation(passage);
        const last=source.passages[j];
        if(location.locatorType==='page'&&location.locator&&last.pdfPage!==passage.pdfPage&&last.pageLabel)location.locator+='–'+last.pageLabel;
        if(found||normalized.indexOf(needle,index+1)>=0)return{status:'verified',locator:'',locatorType:location.locatorType,ambiguous:true};
        found={status:'verified',...location,passageId:passage.id};break;
      }
      if(normalized.length>needle.length+12000)break;
    }
  }
  if(found)return found;
  const saved=source.savedPassages.find(p=>normalizeQuotation(p.text)===needle);
  return saved?{status:'saved',locator:saved.locator,locatorType:saved.locatorType,passageId:saved.passageId}:fallback;
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
    if(char==='-'&&i>0&&/\p{L}/u.test(chars[i-1])){const tail=chars.slice(i+1).join(''),wrap=tail.match(/^\s*\n\s*(?=\p{Ll})/u);if(wrap){let skipped=0;while(skipped<wrap[0].length&&i+1<chars.length){i++;skipped+=chars[i].length;offset+=chars[i].length;}continue;}}
    const normalized=char.normalize('NFKC').replace(/[“”„]/g,'"').replace(/[‘’]/g,"'").replace(/[–—−]/g,'-');
    for(const c of normalized){if(/\s/u.test(c)){if(text.endsWith(' ')){map[map.length-1].to=offset;continue;}if(!text)continue;text+=' ';map.push({from:start,to:offset});}else{text+=c;for(let j=0;j<c.length;j++)map.push({from:start,to:offset});}}
  }
  if(text.endsWith(' ')){text=text.slice(0,-1);map.pop();}return{text,map};
}
export function quotationOccurrences(source:Source,quote:string):QuoteOccurrence[]{
  const needle=quotationIndex(quote).text;if(!needle)return[];const offsets:{start:number;end:number;id:string}[]=[];let raw='';
  for(const p of source.passages){if(raw)raw+='\n';const start=raw.length;raw+=p.text;offsets.push({start,end:raw.length,id:p.id});}
  const {text,map}=quotationIndex(raw),result:QuoteOccurrence[]=[];let at=0;
  while(result.length<200&&(at=text.indexOf(needle,at))!==-1){const start=map[at].from,end=map[at+needle.length-1].to;const parts=offsets.filter(p=>p.end>start&&p.start<end).map(p=>({passageId:p.id,from:Math.max(0,start-p.start),to:Math.min(p.end-p.start,end-p.start)}));const first=source.passages.find(p=>p.id===parts[0]?.passageId);if(first)result.push({passageId:first.id,...passageLocation(first),parts});at+=Math.max(1,needle.length);}return result;
}
