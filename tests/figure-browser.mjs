import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const {chromium}=await import(process.env.ACADEMICA_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try{
  const base=process.env.ACADEMICA_PREVIEW_URL||'http://127.0.0.1:4173';
  for(let i=0;i<40;i++){try{const response=await fetch(base);if(response.ok)break;}catch{}await wait(500);}
  await page.goto(base);
  await page.getByRole('button',{name:'Edit paper details'}).waitFor({timeout:30000});
  const now=new Date().toISOString(),pixel='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a34sAAAAASUVORK5CYII=';
  const fixture={schemaVersion:1,id:'figure-browser-check',title:'Figure layout check',author:'',institution:'',course:'',instructor:'',date:now.slice(0,10),style:'apa',kind:'research',theme:'linen',format:{titlePage:false,lineHeight:2},sources:[],annotations:{},researchNotes:'',createdAt:now,updatedAt:now,sections:[{id:'figure-test-section',title:'Introduction',content:{type:'doc',content:[
    {type:'paragraph',content:[{type:'text',text:'A figure should share the page with the surrounding explanation.'}]},
    {type:'figure',attrs:{id:'browser-figure',src:pixel,caption:'Original caption',figureWidth:50,figureAlign:'right',figureWrap:'none'}},
    {type:'paragraph',content:[{type:'text',text:Array(32).fill('The accompanying explanation remains editable and flows beside the figure before continuing below it.').join(' ')}]}
  ]}}]};
  await page.locator('input[type="file"][accept*=".json"]').setInputFiles({name:'figure-check.academica.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'academica-backup',version:1,paper:fixture,assets:{}}))});
  const editor=page.locator('.academic-editor[data-section-id="figure-test-section"]');
  await editor.waitFor();await page.getByRole('button',{name:'Edit figure',exact:true}).click();
  const tools=page.getByRole('complementary',{name:'Figure tools'});await tools.waitFor();
  const image=editor.locator('.figure-object img');await image.evaluate(image=>image.decode());await wait(500);
  const initial=(await image.boundingBox()).width;
  const slider=page.getByRole('slider',{name:'Figure width'});
  await slider.evaluate(input=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'35');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.waitForFunction(()=>document.querySelector('input[aria-label="Figure width"]').value==='35');
  await wait(500);
  const resized=(await image.boundingBox()).width;assert.ok(resized<initial*.8,'The actual image must shrink immediately');
  await page.getByRole('textbox',{name:'Figure caption',exact:true}).fill('Caption updates on the page');
  await page.waitForFunction(()=>document.querySelector('.figure-object figcaption')?.textContent?.includes('Caption updates on the page'));
  assert.equal(await page.getByRole('textbox',{name:'Figure caption',exact:true}).evaluate(el=>document.activeElement===el),true,'Live caption updates must keep keyboard focus');
  await page.getByRole('button',{name:'Text beside',exact:true}).click();await wait(500);
  const geometry=()=>editor.evaluate(root=>{
    const figure=root.querySelector('.node-figure'),image=figure.querySelector('img'),paragraph=root.querySelector('p:last-of-type');
    const text=paragraph.firstChild,range=document.createRange();range.setStart(text,0);range.setEnd(text,Math.min(20,text.length));
    const box=element=>{const r=element.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    return{figure:box(figure),image:box(image),line:box(range),flow:getComputedStyle(figure).float};
  });
  const right=await geometry();assert.equal(right.flow,'right');assert.ok(right.line.right<=right.image.left-8,'Text must fit to the left of a right figure');assert.ok(right.line.top<right.image.bottom&&right.line.top>=right.image.top-4,'Text must start beside the figure');
  await editor.locator('p:last-of-type').click({position:{x:30,y:10}});await page.keyboard.type('WRAPPED EDIT ');
  assert.ok((await editor.innerText()).includes('WRAPPED EDIT'),'The manuscript must accept typing while figure tools stay open');
  assert.equal(await tools.isVisible(),true);
  await page.getByRole('button',{name:'Align figure left',exact:true}).click();await wait(500);
  const left=await geometry();assert.equal(left.flow,'left');assert.ok(left.line.left>=left.image.right+8,'Text must fit to the right of a left figure');
  await mkdir('work/figure-proof',{recursive:true});await page.screenshot({path:'work/figure-proof/desktop.png',fullPage:true});
  await page.setViewportSize({width:680,height:920});await wait(700);
  const narrow=await page.evaluate(()=>{const p=document.querySelector('.figure-inspector').getBoundingClientRect(),v=document.querySelector('.page-scroll').getBoundingClientRect();return{panelTop:p.top,panelBottom:p.bottom,panelHeight:p.height,pageTop:v.top,pageBottom:v.bottom,pageHeight:v.height};});
  assert.ok(narrow.panelTop>300&&narrow.panelHeight<=421,'Narrow-window tools must dock below the paper');
  assert.ok(narrow.pageHeight>180&&narrow.pageBottom<=narrow.panelTop+24,'The page must remain visible above the tools');
  await page.screenshot({path:'work/figure-proof/narrow.png',fullPage:true});
  await page.getByRole('button',{name:'Done',exact:true}).click();await tools.waitFor({state:'hidden'});await wait(700);
  await page.getByRole('button',{name:'Edit figure',exact:true}).click();await tools.waitFor();
  assert.equal(await slider.inputValue(),'35');assert.equal(await page.getByRole('button',{name:'Text beside',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Done',exact:true}).click();
  await page.setViewportSize({width:1440,height:1000});await wait(500);
  await editor.click();await page.keyboard.press('Control+End');await page.keyboard.press('Enter');await page.keyboard.type('/figure');await page.keyboard.press('Enter');
  await tools.waitFor();
  await page.getByLabel('Figure image',{exact:true}).setInputFiles({name:'test-figure.png',mimeType:'image/png',buffer:Buffer.from(pixel.split(',')[1],'base64')});
  await page.waitForFunction(()=>document.querySelectorAll('.figure-object img').length===2);
  const newImage=editor.locator('.figure-object img').nth(1),newInitial=(await newImage.boundingBox()).width;
  await slider.evaluate(input=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'40');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));});
  await wait(400);assert.ok((await newImage.boundingBox()).width<newInitial*.6,'A new /figure must resize on the actual paper before Done');
  await page.getByRole('button',{name:'Text beside',exact:true}).click();
  await page.getByRole('textbox',{name:'Figure caption',exact:true}).fill('New figure caption');
  await page.getByRole('button',{name:'Done',exact:true}).click();await tools.waitFor({state:'hidden'});
  assert.equal(await editor.locator('.figure-object').count(),2);
  assert.ok(!(await editor.innerText()).includes('/figure'),'The slash command must disappear after inserting the image');
  await page.getByRole('button',{name:'Paper',exact:true}).click();
  const paperFrame=page.frameLocator('iframe[title="Paginated academic paper"]');
  await paperFrame.locator('.pagedjs_page').first().waitFor({timeout:30000});
  await paperFrame.locator('#status').waitFor({state:'hidden',timeout:30000});
  const printed=await paperFrame.locator('#pages').evaluate(root=>[...root.querySelectorAll('figure img')].filter(image=>image.getBoundingClientRect().height>0).map(image=>{
    const bounds=image.getBoundingClientRect(),content=image.closest('.pagedjs_page_content').getBoundingClientRect();
    return{left:bounds.left,right:bounds.right,top:bounds.top,bottom:bounds.bottom,content:{left:content.left,right:content.right,top:content.top,bottom:content.bottom},caption:image.closest('figure').querySelector('figcaption')?.textContent};
  }));
  assert.equal(printed.length,2,'Paper view must show each figure once');
  for(const image of printed){assert.ok(image.left>=image.content.left-2&&image.right<=image.content.right+2&&image.top>=image.content.top-2&&image.bottom<=image.content.bottom+2,'A wrapped figure must stay within the printed page margins');assert.ok(image.caption);}
  await page.getByRole('button',{name:'Write',exact:true}).click();await editor.waitFor();
  const audio=await page.evaluate(async()=>{
    window.__duckPlays=[];window.__duckEnds=[];
    const watched=new WeakSet(),original=HTMLMediaElement.prototype.play;window.__restoreMediaPlay=()=>HTMLMediaElement.prototype.play=original;
    HTMLMediaElement.prototype.play=function(){
      if(this.src.includes('/duck/natural-three-quacks-v3.mp3')){
        window.__duckPlays.push({time:performance.now(),volume:this.volume,rate:this.playbackRate});
        if(!watched.has(this)){watched.add(this);this.addEventListener('ended',()=>window.__duckEnds.push(performance.now()));}
      }
      return original.apply(this,arguments);
    };
    const context=new AudioContext(),buffer=await context.decodeAudioData(await(await fetch('/duck/natural-three-quacks-v3.mp3')).arrayBuffer()),samples=buffer.getChannelData(0);
    let peak=0,power=0;for(const value of samples){peak=Math.max(peak,Math.abs(value));power+=value*value;}await context.close();
    const windowSize=Math.round(buffer.sampleRate*.02),levels=[];
    for(let offset=0;offset<samples.length;offset+=windowSize){const slice=samples.subarray(offset,offset+windowSize);let sum=0;for(const value of slice)sum+=value*value;levels.push(Math.sqrt(sum/slice.length));}
    const threshold=Math.max(...levels)*.12,bursts=[];let start=-1,last=-1;
    for(let i=0;i<levels.length;i++){if(levels[i]>threshold){if(start<0)start=i;last=i;}else if(start>=0&&i-last>=6){if((last-start+1)*.02>=.1)bursts.push({start:start*.02,end:(last+1)*.02});start=-1;}}
    if(start>=0&&(last-start+1)*.02>=.1)bursts.push({start:start*.02,end:(last+1)*.02});
    return{duration:buffer.duration,peak,rms:Math.sqrt(power/samples.length),bursts};
  });
  await editor.locator('p:last-of-type').click();await page.keyboard.press('Control+End');await page.keyboard.press('Enter');await page.keyboard.type('/duck');await page.keyboard.press('Enter');
  await wait(3800);
  const quacks=await page.evaluate(()=>{window.__restoreMediaPlay();return{plays:window.__duckPlays,ends:window.__duckEnds};});
  assert.equal(quacks.plays.length,1,'The three-quack recording must play once');assert.equal(quacks.plays[0].volume,1);assert.equal(quacks.plays[0].rate,1,'Natural calls must keep their original pitch and speed');
  assert.equal(audio.bursts.length,3,'The recording must contain three distinct audible quacks');
  for(let i=1;i<3;i++)assert.ok(audio.bursts[i].start-audio.bursts[i-1].end>=.25,'Recorded quacks must have clear pauses');
  assert.equal(quacks.ends.length,1,'The full recording must finish before the popup closes');
  assert.ok(audio.peak>.45&&audio.rms>.03,'The source recording must have audible signal levels');
  assert.deepEqual(errors,[],'The figure workflow must not throw browser errors');
  console.log(JSON.stringify({result:'Figure browser checks passed',initialWidth:initial,resizedWidth:resized,right,left,narrow,printed,audio,quacks}));
}catch(error){
  console.error('Browser diagnostics:',JSON.stringify({errors,state:await page.evaluate(()=>({body:document.body.innerText.slice(0,7000),editors:[...document.querySelectorAll('.academic-editor')].map(e=>({section:e.getAttribute('data-section-id'),text:e.textContent.slice(0,120)}))})).catch(()=>null)}));
  await mkdir('work/figure-proof',{recursive:true});await page.screenshot({path:'work/figure-proof/failure.png',fullPage:true}).catch(()=>{});
  throw error;
}finally{await browser.close();}
