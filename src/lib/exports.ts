import { uid,validatePaper,allNodes,objectLabels,type Paper,type RichNode,type Source } from './model';
import { formatPaper } from './citations';
import {documentFormat,sectionLabel,bibliographyTitle} from './formats';

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
  const {extractPDF}=await import('./pdf-source');
  const {enrichPDFSource}=await import('./source-import');
  return enrichPDFSource(await extractPDF(await file.arrayBuffer(),file.name));
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
  const D=await import('docx'),citations=formatPaper(paper),labels=objectLabels(paper),f=documentFormat(paper);
  const footnoteIds=new Map(allNodes(paper,'footnote').map((n,i)=>[n.attrs?.id,i+1]));
  const plain=(html:string)=>new DOMParser().parseFromString(html,'text/html').body.textContent||'';
  const run=(text:string,options:any={})=>new D.TextRun({text,font:f.font,size:f.size*2,...options});
  const richRuns=(html:string)=>{const root=new DOMParser().parseFromString(html,'text/html').body;function visit(node:Node,options:any={}):any[]{if(node.nodeType===3)return[run(node.textContent||'',options)];const tag=node.nodeName.toLowerCase();return [...node.childNodes].flatMap(child=>visit(child,{...options,...(['i','em'].includes(tag)?{italics:true}:['b','strong'].includes(tag)?{bold:true}:tag==='sup'?{superScript:true}:{})}));}return visit(root);};
  const inline=(node:RichNode):any[]=>{
    if(node.type==='annotation')return[];
    if(node.type==='citation')return richRuns(citations.inline[node.attrs?.id]||'(source needed)');
    if(node.type==='quotation')return[run('“'+(node.attrs?.text||'')+'” '+plain(citations.inline[node.attrs?.id]||'(source needed)'))];
    if(node.type==='crossref')return[run(labels[node.attrs?.targetId]||'reference needed')];
    if(node.type==='hardBreak')return[new D.TextRun({break:1})];
    if(node.type==='footnote')return[new D.FootnoteReferenceRun(footnoteIds.get(node.attrs?.id)||1)];
    if(node.type==='text'){const options={bold:node.marks?.some(m=>m.type==='bold'),italics:node.marks?.some(m=>m.type==='italic'),strike:node.marks?.some(m=>m.type==='strike'),underline:node.marks?.some(m=>m.type==='underline')?{}:undefined};return(node.text||'').split('\t').flatMap((part,i)=>i?[new D.TextRun({children:[new D.Tab()]}),run(part,options)]:[run(part,options)]);}
    return node.content?.flatMap(inline)||[];
  };
  const paragraph=(children:any[],options:any={})=>new D.Paragraph({children,spacing:{before:0,after:f.paragraphAfter*20,line:f.lineHeight*240},indent:{firstLine:f.indent*1440},...options});
  const blocks=async(node:RichNode):Promise<any[]>=>{
    if(node.type==='doc'||node.type==='listItem'){const results=[];for(const child of node.content||[])results.push(...await blocks(child));return results;}
    if(node.type==='paragraph'){
      const options=node.attrs?.firstIndent===null||node.attrs?.firstIndent===undefined?{}:{indent:{firstLine:Number(node.attrs.firstIndent)*1440}};
      const result:any[]=[];let line:any[]=[];for(const child of node.content||[]){if(paper.style==='apa'&&child.type==='quotation'&&String(child.attrs?.text||'').trim().split(/\s+/).length>=40){if(line.length)result.push(paragraph(line,options));line=[];result.push(paragraph([run(child.attrs?.text+' '+plain(citations.inline[child.attrs?.id]||'(source needed)'))],{indent:{left:720,firstLine:0}}));}else line.push(...inline(child));}if(line.length||!result.length)result.push(paragraph(line,options));return result;
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
    if(node.type==='pageBreak')return[new D.Paragraph({children:[new D.PageBreak()]})];
    return[];
  };
  const children:any[]=[],center={alignment:D.AlignmentType.CENTER,indent:{firstLine:0}};
  const date=paper.date?new Date(paper.date+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}):'';
  if(f.titlePage){
    children.push(paragraph([run(paper.title,{bold:true})],{...center,spacing:{before:2880,after:240,line:480}}));
    [paper.author,paper.institution,paper.course,paper.instructor,date].filter(Boolean).forEach(t=>children.push(paragraph([run(t)],center)));
    // The following heading owns its break so no empty page is introduced.
  }else [paper.author,paper.instructor,paper.course,date].filter(Boolean).forEach(t=>children.push(paragraph([run(t)],{indent:{firstLine:0}})));
  const firstBody=paper.sections.findIndex(s=>!['abstract','acknowledgments'].includes(s.kind||''));
  if(f.contents)children.push(new D.TableOfContents('Contents',{hyperlink:true,headingStyleRange:'1-3'}));
  for(const [index,section] of paper.sections.entries()){if(index===firstBody)children.push(paragraph([run(paper.title,{bold:paper.style==='apa'})],{...center,pageBreakBefore:f.titlePage||index>0}));if(!(paper.style==='apa'&&index===firstBody&&/^introduction$/i.test(section.title.trim())))children.push(paragraph([run(sectionLabel(paper,index),{bold:true})],{pageBreakBefore:index!==firstBody&&(['abstract','acknowledgments'].includes(section.kind||'')||index===0&&f.titlePage||['thesis','dissertation'].includes(paper.kind)),heading:D.HeadingLevel.HEADING_1,alignment:paper.style==='apa'?D.AlignmentType.CENTER:D.AlignmentType.LEFT,indent:{firstLine:0},keepNext:true}));children.push(...await blocks(section.content));}
  if(citations.bibliography.length){children.push(paragraph([run(bibliographyTitle(paper.style),{bold:paper.style==='apa'})],{...center,pageBreakBefore:true}));citations.bibliography.forEach(entry=>children.push(paragraph(richRuns(entry.html),{indent:{left:720,hanging:720}})));}
  const surname=paper.author.trim().split(/\s+/).at(-1)||'';
  const numbering=new D.Paragraph({alignment:f.pagePosition==='top-right'?D.AlignmentType.RIGHT:D.AlignmentType.CENTER,children:[run(paper.style==='mla'?surname+' ':f.header?f.header+' ':''),new D.TextRun({children:[D.PageNumber.CURRENT],font:f.font,size:f.size*2})]});
  const footnotes=Object.fromEntries(allNodes(paper,'footnote').map(n=>[footnoteIds.get(n.attrs?.id)!,{children:[paragraph([run(n.attrs?.text||'',{size:20})],{indent:{firstLine:0},spacing:{line:240}})]}]));
  const doc=new D.Document({creator:paper.author,title:paper.title,description:'Written in Academica',footnotes,styles:{default:{document:{run:{font:f.font,size:f.size*2},paragraph:{spacing:{line:f.lineHeight*240,after:f.paragraphAfter*20}}}}},sections:[{properties:{page:{size:f.paper==='a4'?{width:11906,height:16838}:{width:12240,height:15840},margin:{top:f.margin*1440,bottom:f.margin*1440,left:f.margin*1440,right:f.margin*1440,header:720,footer:720}}},...(f.pagePosition==='top-right'?{headers:{default:new D.Header({children:[numbering]})}}:{footers:{default:new D.Footer({children:[numbering]})}}),children}]});
  download(await D.Packer.toBlob(doc),fileName(paper.title)+'.docx');
}
