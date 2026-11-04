import {appURL} from './urls';
import {emptySource,uid,type Source,type Passage} from './model';

export function findDOI(text:string){return text.match(/\b10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i)?.[0].replace(/[.,;]+$/,'')||'';}
type PDFItem={str:string;transform:number[];width:number;height:number;hasEOL?:boolean};
// PDF item order usually follows the author's text flow. Retain line breaks for dehyphenation.
export function pdfLines(items:PDFItem[]){let line='',lines:string[]=[];for(const item of items){line+=item.str+' ';if(item.hasEOL){lines.push(line.trim());line='';}}if(line.trim())lines.push(line.trim());return lines;}
export function pdfParagraphs(items:PDFItem[]){
  const lines:{text:string;x:number;y:number;height:number}[]=[];let text='',first:PDFItem|undefined;
  const flush=()=>{if(text.trim()&&first)lines.push({text:text.trim(),x:first.transform[4],y:first.transform[5],height:first.height||10});text='';first=undefined;};
  for(const item of items){if(item.str.trim()&&!first)first=item;text+=item.str+' ';if(item.hasEOL)flush();}flush();
  let result='';for(let i=0;i<lines.length;i++){const line=lines[i],previous=lines[i-1];const boundary=previous&&(Math.abs(line.y-previous.y)>Math.max(line.height,previous.height)*1.55||line.y>previous.y+5||line.height>previous.height*1.15||line.x>previous.x+8&&/[.!?]$/.test(previous.text));result+=(result?(boundary?'\n\n':result.endsWith('-')?'\n':' '):'')+line.text;}
  return result.replace(/([\p{L}])-\n(?=[\p{Ll}])/gu,'$1');
}
export function printedPageLabels(candidates:(string|undefined)[]){
  // A PDF sheet number is not a printed citation page. Require consecutive visible labels.
  return candidates.map((label,i)=>{
    if(!label||!/^\d{1,5}$/.test(label))return undefined;
    const previous=candidates[i-1],next=candidates[i+1];
    return previous&&Number(previous)+1===Number(label)||next&&Number(label)+1===Number(next)?label:undefined;
  });
}
export async function extractPDF(data:ArrayBuffer,name:string,url=''):Promise<Source>{
  if(data.byteLength>10000000)throw new Error('Choose a PDF smaller than 10 MB.');
  const pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc=appURL('vendor/pdf.worker.min.mjs');
  const loading=pdfjs.getDocument({data:new Uint8Array(data)}),doc=await loading.promise;
  try{
    if(doc.numPages>120)throw new Error('Import a PDF or excerpt of up to 120 pages.');
    const source=emptySource();source.type='article-journal';source.url=url;source.title=name.replace(/\.pdf$/i,'');
    const metadata=await doc.getMetadata().catch(()=>null),info=metadata?.info as any;
    if(info?.Title&&String(info.Title).trim())source.title=String(info.Title).trim();if(info?.Author)source.authors=String(info.Author).trim();
    const labels=await doc.getPageLabels().catch(()=>null),visibleLabels:(string|undefined)[]=[],passages:Passage[]=[];
    let total=0,truncated=false;
    for(let number=1;number<=doc.numPages;number++){
      const page=await doc.getPage(number),content=await page.getTextContent(),items=content.items.filter((i):i is typeof i&PDFItem=>'str'in i);
      const height=page.getViewport({scale:1}).height;
      const candidates=items.filter(i=>/^\d{1,5}$/.test(i.str.trim())&&i.transform[5]<height*.14).sort((a,b)=>a.transform[5]-b.transform[5]);
      visibleLabels.push(candidates[0]?.str.trim());
      const text=pdfParagraphs(items).trim();
      if(number===1){source.doi=findDOI(text);if(!info?.Title){const first=pdfLines(items).find(line=>line.length>15&&!/^(doi|https?|www\.)/i.test(line));if(first)source.title=first;}}
      if(total+text.length>120000){truncated=true;page.cleanup();break;}
      if(text)passages.push({id:uid(),text,pdfPage:number});total+=text.length;page.cleanup();
    }
    const detected=printedPageLabels(visibleLabels);
    passages.forEach((passage,i)=>{const explicit=labels?.[i];passage.pageLabel=explicit&&explicit!==String(i+1)?explicit:detected[i];});
    if(!passages.length)throw new Error('This PDF has no selectable text. Upload a text-based PDF or add passages manually.');
    source.passages=passages;source.textStatus=truncated?'partial':'ready';source.textOrigin=url||'Uploaded PDF';source.textRetrievedAt=new Date().toISOString();
    source.textMessage=truncated?'Reader excerpt saved (120,000-character limit). Matches only check the imported text.':'PDF text imported. Check the original for tables, equations, and extraction errors.';
    return source;
  }finally{await loading.destroy();}
}
