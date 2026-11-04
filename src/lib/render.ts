import {appURL} from './urls';
import katex from 'katex';
import { escapeHTML,formatPaper } from './citations';
import { objectLabels,safeLink,type Paper,type RichNode } from './model';

export function renderNode(node:RichNode,paper:Paper,{annotations=false}:{annotations?:boolean}={}):string {
  const attrs=node.attrs||{},e=escapeHTML,labels=objectLabels(paper),citations=formatPaper(paper);
  const content=()=>node.content?.map(child=>renderNode(child,paper,{annotations})).join('')||'';
  if(node.type==='text'){
    let text=e(node.text||'');for(const mark of node.marks||[]){if(mark.type==='bold')text='<strong>'+text+'</strong>';if(mark.type==='italic')text='<em>'+text+'</em>';if(mark.type==='underline')text='<u>'+text+'</u>';if(mark.type==='strike')text='<s>'+text+'</s>';if(mark.type==='code')text='<code>'+text+'</code>';if(mark.type==='link'&&safeLink(mark.attrs?.href||''))text=`<a href="${e(safeLink(mark.attrs?.href))}">${text}</a>`;}return text;
  }
  if(node.type==='doc')return content();
  if(node.type==='paragraph'&&paper.style==='apa'&&node.content?.some(n=>n.type==='quotation'&&String(n.attrs?.text||'').trim().split(/\s+/).length>=40)){
    let result='',line='';for(const child of node.content){if(child.type==='quotation'&&String(child.attrs?.text||'').trim().split(/\s+/).length>=40){if(line.trim())result+='<p>'+line+'</p>';line='';result+=renderNode(child,paper,{annotations});}else line+=renderNode(child,paper,{annotations});}return result+(line.trim()?'<p>'+line+'</p>':'');
  }
  if(node.type==='annotation'){
    const note=paper.annotations[attrs.id];if(!annotations||!note)return '';
    const remaining=note.tasks.filter(t=>!t.done).length;
    return `<button type="button" class="reading-note-marker ${note.kind==='todo'?'checklist-marker':''}" data-annotation-id="${e(attrs.id)}" aria-label="${note.kind==='todo'?'Open passage checklist':'Open passage note'}">${note.kind==='todo'?(remaining?'☐':'✓'):'·'}</button>`;
  }
  if(node.type==='citation')return `<span class="paper-citation" data-source-id="${e(attrs.sourceId)}">${citations.inline[attrs.id]||'(source needed)'}</span>`;
  if(node.type==='quotation'){
    const quote=e(attrs.text||''),cite=citations.inline[attrs.id]||'(source needed)';
    const long=(attrs.text||'').trim().split(/\s+/).length>=40&&paper.style==='apa';
    return long?`<blockquote data-source-id="${e(attrs.sourceId)}">${quote} ${cite}</blockquote>`:`<span class="paper-quotation" data-source-id="${e(attrs.sourceId)}">“${quote}” ${cite}</span>`;
  }
  if(node.type==='figure'||node.type==='image'){
    const src=String(attrs.src||'');if(!src.startsWith('/api/assets/')&&!/^data:image\/(?:png|jpeg|webp|gif);base64,/.test(src)&&!safeLink(src))return '';
    return `<figure id="object-${e(attrs.id)}"><img src="${e(src)}" alt="${e(attrs.alt||attrs.caption||'Figure')}"><figcaption><strong>${e(labels[attrs.id]||'Figure')}</strong>${attrs.caption?'. '+e(attrs.caption):''}</figcaption></figure>`;
  }
  if(node.type==='equation')return `<div class="equation" id="object-${e(attrs.id)}">${katex.renderToString(attrs.latex||'',{throwOnError:false,displayMode:true,trust:false})}<span class="equation-number">(${e((labels[attrs.id]||'').replace('Equation ',''))})</span></div>`;
  if(node.type==='crossref')return `<a class="cross-reference" href="#object-${e(attrs.targetId)}">${e(labels[attrs.targetId]||'reference needed')}</a>`;
  if(node.type==='table')return `<div class="table-block" id="object-${e(attrs.id)}"><p class="table-caption"><strong>${e(labels[attrs.id]||'Table')}</strong>${attrs.caption?'. '+e(attrs.caption):''}</p><table><tbody>${content()}</tbody></table></div>`;
  if(node.type==='tableRow')return '<tr>'+content()+'</tr>';
  if(node.type==='tableCell'||node.type==='tableHeader'){const tag=node.type==='tableHeader'?'th':'td';return `<${tag} colspan="${Number(attrs.colspan)||1}" rowspan="${Number(attrs.rowspan)||1}">${content()}</${tag}>`;}
  const tags:Record<string,string>={paragraph:'p',bulletList:'ul',orderedList:'ol',listItem:'li',blockquote:'blockquote'};
  if(node.type==='heading'){const level=Math.max(1,Math.min(3,Number(attrs.level)||2));return `<h${level}>${content()}</h${level}>`;}
  if(node.type==='hardBreak')return '<br>';if(node.type==='horizontalRule')return '<hr>';
  return tags[node.type]?'<'+tags[node.type]+'>'+content()+'</'+tags[node.type]+'>':content();
}
export function bodyHTML(paper:Paper,annotations=false){return paper.sections.map((section,index)=>`<section class="paper-section" id="object-${escapeHTML(section.id)}"><h2>${paper.kind==='dissertation'?(index+1)+'. ':''}${escapeHTML(section.title)}</h2>${renderNode(section.content,paper,{annotations})}</section>`).join('');}
export function referencesHTML(paper:Paper){const bib=formatPaper(paper).bibliography;return bib.length?`<section class="references-section"><h2>${paper.style==='apa'?'References':'Works Cited'}</h2>${bib.map(b=>b.html).join('')}</section>`:'';}
export function titleHTML(paper:Paper){const e=escapeHTML;const date=paper.date?new Date(paper.date+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}):'';if(paper.style==='mla')return `<div class="mla-heading">${[paper.author,paper.instructor,paper.course,date].filter(Boolean).map(text=>'<div>'+e(text)+'</div>').join('')}</div><h1 class="manuscript-title">${e(paper.title)}</h1>`;return `<section class="title-page"><h1>${e(paper.title)}</h1>${[paper.author,paper.institution,paper.course,paper.instructor,date].filter(Boolean).map(text=>'<p>'+e(text)+'</p>').join('')}</section><h1 class="body-title">${e(paper.title)}</h1>`;}
export function printHTML(paper:Paper,{referencesOnly=false}={}){
  const e=escapeHTML;
  const last=paper.author.trim().split(/\s+/).at(-1)||'';
  const origin=typeof window!=='undefined'?window.location.origin:'';
  const content=referencesOnly?referencesHTML(paper).replace('class="references-section"','class="references-only"'):titleHTML(paper)+bodyHTML(paper)+referencesHTML(paper);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><base href="${typeof window!=='undefined'?appURL():'./'}"><title>${e(paper.title)}</title><link rel="stylesheet" href="vendor/katex/katex.min.css"><style id="paper-style">
@page{size:letter;margin:1in;@top-right{content:${paper.style==='mla'?JSON.stringify(last+' ')+' ':''}counter(page);font:12pt 'Times New Roman',serif;vertical-align:bottom;padding-bottom:.35in;}}
*{box-sizing:border-box}html,body{margin:0;padding:0;color:#161616;background:#3d484b;font:12pt/2 'Times New Roman',serif}p{margin:0;text-indent:.5in;orphans:2;widows:2}h1,h2,h3{font-size:12pt;line-height:2;margin:0;break-after:avoid}h1,h2{font-weight:bold}h1,.paper-section>h2{text-align:${paper.style==='apa'?'center':'left'}}h3{font-weight:bold}.title-page{break-after:page;text-align:center;padding-top:2in}.title-page h1{margin-bottom:.25in}.title-page p{margin:0;text-indent:0}.body-title,.manuscript-title{text-align:center;margin-bottom:0}.mla-heading{line-height:2}.references-section{break-before:page}.references-section h2{text-align:center;margin:0}.csl-entry{padding-left:.5in;text-indent:-.5in;margin:0;line-height:2}.csl-bib-body{margin:0}blockquote{margin:0 0 0 .5in;padding:0;line-height:2}blockquote p{text-indent:0}a{color:inherit;text-decoration:none;overflow-wrap:anywhere}strong{font-weight:bold}ul,ol{margin:0}table{width:100%;border-collapse:collapse;line-height:1.5}td,th{border:1px solid #777;padding:5px;vertical-align:top}td p,th p{text-indent:0}thead{display:table-header-group}tr{break-inside:avoid}figure,.table-block{margin:.2in 0;break-inside:avoid}figure img{max-width:100%;height:auto;max-height:7in;object-fit:contain}figcaption,.table-caption{line-height:1.5;text-indent:0}.equation{position:relative;break-inside:avoid}.equation-number{position:absolute;right:0;top:40%}.katex{font-size:1.08em}.katex-display{overflow:visible}.paper-section{margin:0}.pagedjs_pages{display:flex;flex-direction:column;align-items:center;gap:24px;padding:24px}.pagedjs_page{background:white;box-shadow:0 5px 25px #28202815;flex-shrink:0}.paper-status{font:14px system-ui;padding:24px;text-align:center}.reading-note-marker{display:none}
@media print{html,body{background:white}.pagedjs_pages{display:block;padding:0;gap:0}.pagedjs_page{margin:0;box-shadow:none;break-after:page}.paper-status{display:none}@page{margin:0}}
</style><script>window.PagedConfig={auto:false};<\/script><script src="vendor/paged.polyfill.js"><\/script></head><body><div class="paper-status" id="status">Laying out your paper…</div><div id="pages"></div><script>
(async()=>{try{const content=${JSON.stringify(content).replaceAll('<',String.fromCharCode(92)+'u003c')};const styles=document.getElementById('paper-style').textContent;const styleURL=URL.createObjectURL(new Blob([styles],{type:'text/css'}));const previewer=new Paged.Previewer();const flow=await previewer.preview(content,[styleURL],document.getElementById('pages'));document.getElementById('status').remove();URL.revokeObjectURL(styleURL);parent.postMessage({type:'academica-pages',count:flow.total,paperId:${JSON.stringify(paper.id)}},${JSON.stringify(origin)});}catch(e){document.getElementById('status').textContent='The layout could not finish. Try reopening Paper view.';parent.postMessage({type:'academica-pages-error'},${JSON.stringify(origin)});}})();
window.addEventListener('message',event=>{if(event.source===parent&&event.origin===${JSON.stringify(origin)}&&event.data?.type==='academica-print')window.print();});
<\/script></body></html>`;
}
