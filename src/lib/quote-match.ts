import type {LocatorType,Passage,Source} from './model';

// Only typography and PDF line wrapping are normalized. Similar wording is not evidence.
export function normalizeQuotation(text:string){return text.normalize('NFKC').replace(/\u00ad/g,'').replace(/([\p{L}])-\s*\n\s*(?=[\p{Ll}])/gu,'$1').replace(/[“”„]/g,'"').replace(/[‘’]/g,"'").replace(/[–—−]/g,'-').replace(/\s+/g,' ').trim();}
export function passageLocation(passage:Passage):{locator:string;locatorType:LocatorType}{
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
