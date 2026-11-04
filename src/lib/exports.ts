import {appURL} from './urls';
import { emptySource,uid,validatePaper,allNodes,objectLabels,type Paper,type RichNode,type Source } from './model';
import { formatPaper } from './citations';

function fileName(title:string){return title.replace(/[^\p{L}\p{N} ._-]/gu,'').trim().slice(0,100)||'Academica paper';}
function download(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function dataURL(file:Blob):Promise<string>{return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('The file could not be read.'));reader.readAsDataURL(file);});}
export async function uploadFile(file:File,cloud:boolean){
  if(file.size>10000000)throw new Error('Choose a file smaller than 10 MB.');
  if(!['image/png','image/jpeg','image/webp','image/gif','application/pdf'].includes(file.type))throw new Error('Use a PNG, JPEG, WebP, GIF, or PDF file.');
  if(file.type==='application/pdf')throw new Error('PDF originals stay on this device; their extracted text is saved with the paper.');
  if(file.size>500000){const url=URL.createObjectURL(file),img=new Image();img.src=url;await img.decode();const scale=Math.min(1,1600/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=img.width*scale;canvas.height=img.height*scale;canvas.getContext('2d')!.drawImage(img,0,0,canvas.width,canvas.height);URL.revokeObjectURL(url);return canvas.toDataURL('image/jpeg',.8);}
  return dataURL(file);
}
export async function sourceFromPDF(file:File,cloud:boolean):Promise<Source>{
  if(file.size>10000000)throw new Error('Choose a PDF smaller than 10 MB.');
  const pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc=appURL('vendor/pdf.worker.min.mjs');
  const loading=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())});
  const doc=await loading.promise;
  try{
    if(doc.numPages>120)throw new Error('This first version supports PDFs up to 120 pages. Import a shorter excerpt.');
    const source=emptySource();source.type='article-journal';source.title=file.name.replace(/\.pdf$/i,'');
    const metadata=await doc.getMetadata().catch(()=>null);const info=metadata?.info as any;if(info?.Title)source.title=String(info.Title);if(info?.Author)source.authors=String(info.Author);
    let total=0;
    for(let number=1;number<=doc.numPages;number++){
      const page=await doc.getPage(number),text=await page.getTextContent();let line='',lines:string[]=[];
      for(const item of text.items){if(!('str' in item))continue;line+=item.str+' ';if(item.hasEOL){lines.push(line.trim());line='';}}
      if(line.trim())lines.push(line.trim());const content=lines.join(' ').replace(/\s+/g,' ').trim();total+=content.length;
      if(total>450000)throw new Error('This PDF contains too much text for one source. Import a shorter excerpt.');
      if(content)source.passages.push({id:uid(),text:content,pdfPage:number});page.cleanup();
    }
    if(!source.passages.length)throw new Error('This PDF has no selectable text. Add its reference and passages manually.');
    // Text remains portable; no billed Firebase Storage dependency.
    return source;
  }finally{await loading.destroy();}
}
export async function exportBackup(paper:Paper){
  const urls=[...new Set([...allNodes(paper).filter(n=>n.type==='figure'||n.type==='image').map(n=>String(n.attrs?.src||'')),...paper.sources.map(s=>s.fileUrl||'')].filter(url=>url.startsWith('/api/assets/')))];
  const assets:Record<string,{data:string;name:string}>={};
  for(const url of urls){const response=await fetch(url);if(!response.ok)throw new Error('An attached file could not be included. Reconnect and try again.');const blob=await response.blob();assets[url]={data:await dataURL(blob),name:'attachment.'+(blob.type.split('/')[1]||'bin')};}
  download(new Blob([JSON.stringify({format:'academica-backup',version:1,paper,assets},null,2)],{type:'application/json'}),fileName(paper.title)+'.academica.json');
}
export async function importBackupFile(file:File,cloud:boolean){
  if(file.size>80000000)throw new Error('Choose a backup smaller than 80 MB.');
  let data:any;try{data=JSON.parse(await file.text());}catch{throw new Error('This file is not a readable project backup.');}
  if(data.format!=='academica-backup'||data.version!==1)throw new Error('Choose an Academica project backup.');
  const paper=validatePaper(data.paper),urls=new Map<string,string>();
  for(const [url,item] of Object.entries(data.assets||{})){
    if(!url.startsWith('/api/assets/')||typeof (item as any)?.data!=='string'||!/^data:(image\/(png|jpeg|webp|gif)|application\/pdf);base64,/.test((item as any).data))throw new Error('The backup contains an unsupported attachment.');
    const attachment=item as {data:string;name:string},blob=await (await fetch(attachment.data)).blob();
    if(!cloud&&blob.type==='application/pdf'){urls.set(url,'');continue;}
    urls.set(url,await uploadFile(new File([blob],attachment.name||'attachment',{type:blob.type}),cloud));
  }
  allNodes(paper).forEach(n=>{if(n.attrs?.src?.startsWith('/api/assets/')){const restored=urls.get(n.attrs.src);if(!restored)throw new Error('The backup is missing an attached image.');n.attrs.src=restored;}});
  paper.sources.forEach(s=>{if(s.fileUrl?.startsWith('/api/assets/'))s.fileUrl=urls.get(s.fileUrl)||'';});
  paper.id=uid();paper.title+=' — restored';paper.createdAt=new Date().toISOString();paper.updatedAt=paper.createdAt;return paper;
}

export async function exportWord(paper:Paper){
  const D=await import('docx'),citations=formatPaper(paper),labels=objectLabels(paper);
  const plain=(html:string)=>new DOMParser().parseFromString(html,'text/html').body.textContent||'';
  const run=(text:string,options:any={})=>new D.TextRun({text,font:'Times New Roman',size:24,...options});
  const inline=(node:RichNode):any[]=>{
    if(node.type==='annotation')return[];
    if(node.type==='citation')return[run(plain(citations.inline[node.attrs?.id]||'(source needed)'))];
    if(node.type==='quotation')return[run('“'+(node.attrs?.text||'')+'” '+plain(citations.inline[node.attrs?.id]||'(source needed)'))];
    if(node.type==='crossref')return[run(labels[node.attrs?.targetId]||'reference needed')];
    if(node.type==='hardBreak')return[new D.TextRun({break:1})];
    if(node.type==='text')return[run(node.text||'',{bold:node.marks?.some(m=>m.type==='bold'),italics:node.marks?.some(m=>m.type==='italic'),strike:node.marks?.some(m=>m.type==='strike'),underline:node.marks?.some(m=>m.type==='underline')?{}:undefined})];
    return node.content?.flatMap(inline)||[];
  };
  const paragraph=(children:any[],options:any={})=>new D.Paragraph({children,spacing:{before:0,after:0,line:480},indent:{firstLine:720},...options});
  const blocks=async(node:RichNode):Promise<any[]>=>{
    if(node.type==='doc'||node.type==='listItem'){const results=[];for(const child of node.content||[])results.push(...await blocks(child));return results;}
    if(node.type==='paragraph'){
      const result:any[]=[];let line:any[]=[];for(const child of node.content||[]){if(paper.style==='apa'&&child.type==='quotation'&&String(child.attrs?.text||'').trim().split(/\s+/).length>=40){if(line.length)result.push(paragraph(line));line=[];result.push(paragraph([run(child.attrs?.text+' '+plain(citations.inline[child.attrs?.id]||'(source needed)'))],{indent:{left:720,firstLine:0}}));}else line.push(...inline(child));}if(line.length||!result.length)result.push(paragraph(line));return result;
    }
    if(node.type==='heading')return[paragraph(inline(node).map(r=>r),{heading:D.HeadingLevel.HEADING_2,keepNext:true,indent:{firstLine:0}})];
    if(node.type==='equation')return[paragraph([run((node.attrs?.latex||'')+'    ('+(labels[node.attrs?.id]||'').replace('Equation ','')+')')],{alignment:D.AlignmentType.CENTER,indent:{firstLine:0}})];
    if(node.type==='figure'||node.type==='image'){
      const response=await fetch(node.attrs?.src);if(!response.ok)throw new Error('A figure could not be exported. Reconnect and try again.');
      const blob=await response.blob(),url=URL.createObjectURL(blob),img=new Image();img.src=url;await img.decode();const width=Math.min(600,img.naturalWidth),height=width*img.naturalHeight/img.naturalWidth;
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d')!.drawImage(img,0,0,width,height);URL.revokeObjectURL(url);
      const png=await(await fetch(canvas.toDataURL('image/png'))).arrayBuffer();
      return[paragraph([new D.ImageRun({data:new Uint8Array(png),type:'png',transformation:{width,height},altText:{title:node.attrs?.alt||'Figure',description:node.attrs?.alt||'' ,name:labels[node.attrs?.id]||'Figure'}})],{alignment:D.AlignmentType.CENTER,indent:{firstLine:0}}),paragraph([run((labels[node.attrs?.id]||'Figure')+'. '+(node.attrs?.caption||''))],{indent:{firstLine:0}})];
    }
    if(node.type==='table'){
      const rows=[];for(const row of node.content||[]){const cells=[];for(const cell of row.content||[])cells.push(new D.TableCell({children:(await blocks({type:'doc',content:cell.content})).map(p=>p)}));rows.push(new D.TableRow({children:cells,tableHeader:row.content?.[0]?.type==='tableHeader'}));}
      return[paragraph([run((labels[node.attrs?.id]||'Table')+'. '+(node.attrs?.caption||''))],{indent:{firstLine:0},keepNext:true}),new D.Table({rows,width:{size:100,type:D.WidthType.PERCENTAGE}}),paragraph([],{indent:{firstLine:0}})];
    }
    if(node.type==='bulletList'||node.type==='orderedList'){const result=[];let i=0;for(const item of node.content||[]){i++;result.push(paragraph([run(node.type==='bulletList'?'• ':i+'. '),...inline(item)],{indent:{left:720,hanging:360}}));}return result;}
    if(node.type==='blockquote')return[paragraph(inline(node),{indent:{left:720,firstLine:0}})];
    return[];
  };
  const children:any[]=[],center={alignment:D.AlignmentType.CENTER,indent:{firstLine:0}};
  const date=paper.date?new Date(paper.date+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}):'';
  if(paper.style==='apa'){
    children.push(paragraph([run(paper.title,{bold:true})],{...center,spacing:{before:2880,after:240,line:480}}));
    [paper.author,paper.institution,paper.course,paper.instructor,date].filter(Boolean).forEach(t=>children.push(paragraph([run(t)],center)));
    children.push(new D.Paragraph({children:[new D.PageBreak()]}));
  }else [paper.author,paper.instructor,paper.course,date].filter(Boolean).forEach(t=>children.push(paragraph([run(t)],{indent:{firstLine:0}})));
  children.push(paragraph([run(paper.title,{bold:paper.style==='apa'})],center));
  for(const [index,section] of paper.sections.entries()){children.push(paragraph([run((paper.kind==='dissertation'?index+1+'. ':'')+section.title,{bold:true})],{alignment:paper.style==='apa'?D.AlignmentType.CENTER:D.AlignmentType.LEFT,indent:{firstLine:0},keepNext:true}));children.push(...await blocks(section.content));}
  if(citations.bibliography.length){children.push(paragraph([run(paper.style==='apa'?'References':'Works Cited',{bold:paper.style==='apa'})],{...center,pageBreakBefore:true}));citations.bibliography.forEach(entry=>children.push(paragraph([run(plain(entry.html).trim())],{indent:{left:720,hanging:720}})));}
  const surname=paper.author.trim().split(/\s+/).at(-1)||'';
  const doc=new D.Document({creator:paper.author,title:paper.title,description:'Written in Academica',styles:{default:{document:{run:{font:'Times New Roman',size:24},paragraph:{spacing:{line:480,after:0}}}}},sections:[{properties:{page:{size:{width:12240,height:15840},margin:{top:1440,bottom:1440,left:1440,right:1440,header:720,footer:720}}},headers:{default:new D.Header({children:[new D.Paragraph({alignment:D.AlignmentType.RIGHT,children:[run(paper.style==='mla'?surname+' ':''),new D.TextRun({children:[D.PageNumber.CURRENT],font:'Times New Roman',size:24})]})]})},children}]});
  download(await D.Packer.toBlob(doc),fileName(paper.title)+'.docx');
}
