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
  await page.evaluate(async()=>{
    const {useWorkspace}=await import('/src/lib/store.ts'),{createPaper}=await import('/src/lib/model.ts');
    const paper=createPaper();paper.id='figure-browser-check';paper.title='Figure layout check';paper.format={titlePage:false,lineHeight:2};
    paper.sections=[{id:'figure-test-section',title:'Introduction',content:{type:'doc',content:[
      {type:'paragraph',content:[{type:'text',text:'A figure should share the page with the surrounding explanation.'}]},
      {type:'figure',attrs:{id:'browser-figure',src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a34sAAAAASUVORK5CYII=',caption:'Original caption',figureWidth:50,figureAlign:'right',figureWrap:'none'}},
      {type:'paragraph',content:[{type:'text',text:Array(32).fill('The accompanying explanation remains editable and flows beside the figure before continuing below it.').join(' ')}]}
    ]}}];
    useWorkspace.getState().setPaper(paper);
  });
  const editor=page.locator('.academic-editor[data-section-id="figure-test-section"]');
  await editor.waitFor();await page.getByRole('button',{name:'Edit figure',exact:true}).click({force:true});
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
  await page.getByRole('button',{name:'Done',exact:true}).click();await tools.waitFor({state:'hidden'});
  await page.getByRole('button',{name:'Edit figure',exact:true}).click({force:true});await tools.waitFor();
  assert.equal(await slider.inputValue(),'35');assert.equal(await page.getByRole('button',{name:'Text beside',exact:true}).getAttribute('aria-pressed'),'true');
  await page.getByRole('button',{name:'Done',exact:true}).click();
  const audio=await page.evaluate(async()=>{
    window.__duckPlays=[];window.__duckEnds=[];
    const watched=new WeakSet(),original=HTMLMediaElement.prototype.play;window.__restoreMediaPlay=()=>HTMLMediaElement.prototype.play=original;
    HTMLMediaElement.prototype.play=function(){
      if(this.src.includes('/duck/quack-distinct-v2.mp3')){
        window.__duckPlays.push({time:performance.now(),volume:this.volume});
        if(!watched.has(this)){watched.add(this);this.addEventListener('ended',()=>window.__duckEnds.push(performance.now()));}
      }
      return original.apply(this,arguments);
    };
    const context=new AudioContext(),buffer=await context.decodeAudioData(await(await fetch('/duck/quack-distinct-v2.mp3')).arrayBuffer()),samples=buffer.getChannelData(0);
    let peak=0,power=0;for(const value of samples){peak=Math.max(peak,Math.abs(value));power+=value*value;}await context.close();
    const {showAnimalBreak}=await import('/src/animal-break.tsx');showAnimalBreak('duck');
    return{duration:buffer.duration,peak,rms:Math.sqrt(power/samples.length)};
  });
  await wait(3800);
  const quacks=await page.evaluate(()=>{window.__restoreMediaPlay();return{plays:window.__duckPlays,ends:window.__duckEnds};});
  assert.equal(quacks.plays.length,3,'A duck break must play exactly three quacks');assert.ok(quacks.plays.every(p=>p.volume===1),'Duck quacks must use full playback volume');
  for(let i=1;i<3;i++)assert.ok(quacks.plays[i].time-quacks.ends[i-1]>=220,'Quacks must have distinct pauses');
  assert.ok(audio.peak>.45&&audio.rms>.03,'The source recording must have audible signal levels');
  assert.deepEqual(errors,[],'The figure workflow must not throw browser errors');
  console.log(JSON.stringify({result:'Figure browser checks passed',initialWidth:initial,resizedWidth:resized,right,left,narrow,audio,quacks}));
}catch(error){
  console.error('Browser diagnostics:',JSON.stringify({errors,state:await page.evaluate(()=>({body:document.body.innerText.slice(0,7000),editors:[...document.querySelectorAll('.academic-editor')].map(e=>({section:e.getAttribute('data-section-id'),text:e.textContent.slice(0,120)}))})).catch(()=>null)}));
  await mkdir('work/figure-proof',{recursive:true});await page.screenshot({path:'work/figure-proof/failure.png',fullPage:true}).catch(()=>{});
  throw error;
}finally{await browser.close();}
