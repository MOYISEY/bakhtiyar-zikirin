import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser-config.mjs';
const base=process.argv[2]??'http://127.0.0.1:5202/',scope=process.argv[3]??'local';
const projects=JSON.parse(readFileSync('src/content/projects.json','utf8')),media=JSON.parse(readFileSync('src/content/media.json','utf8'));
const report={at:new Date().toISOString(),base,scope,method:'Native Chromium directed image/gallery clicks, desktop and touch mobile emulation at DPR 2 and 3. Encoded dimensions compared with actual painted dimensions; screenshots retained for visual inspection. No physical-device or additional independent audit claim.',integrity:[],routes:[],edges:[],passed:false};
const out=`evidence/v13/${scope}-quality.json`,shots=`qa-private/v13/${scope}-quality`;mkdirSync(shots,{recursive:true});mkdirSync('evidence/v13/screenshots',{recursive:true});
const save=()=>writeFileSync(out,JSON.stringify(report,null,2)+'\n');
for(const project of Object.values(media))for(const variants of [project.card,...project.shots,...(project.hero?[project.hero]:[])])for(const v of variants){const bytes=readFileSync('public/'+v.file);assert.equal(bytes.length,v.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),v.sha256);report.integrity.push(v.file);}
const b=await openBrowser();
async function metrics(image){
 await image.scrollIntoViewIfNeeded();await image.evaluate(async i=>{i.loading='eager';await i.decode();});
 return image.evaluate(async i=>{
  const file=new Image();file.src=i.currentSrc;await file.decode();const r=i.getBoundingClientRect();
  const vector=i.currentSrc.endsWith('.svg'),ratio=file.naturalWidth/file.naturalHeight,contain=getComputedStyle(i).objectFit==='contain';
  const paintedWidth=contain?Math.min(r.width,r.height*ratio):r.width;
  return {file:new URL(i.currentSrc).pathname.split('/').at(-1),encodedWidth:file.naturalWidth,encodedHeight:file.naturalHeight,cssWidth:r.width,cssHeight:r.height,paintedWidth,dpr:devicePixelRatio,physicalWidth:paintedWidth*devicePixelRatio,vector,srcset:i.srcset,sizes:i.sizes};
 });
}
async function check(image,entry,name,recordShot=true){
 const m=await metrics(image);entry.images.push({...m,name});assert(m.vector||m.encodedWidth+3>=m.physicalWidth,`${name}: ${m.encodedWidth}px source for ${m.physicalWidth}px painted`);
 if(recordShot)await image.screenshot({path:`${shots}/${entry.width}-dpr${entry.dpr}-${name}.png`});return m;
}
try{
 for(const [width,dpr]of [[1366,2],[1920,3],[390,2],[390,3]]){
  const context=await b.newContext({viewport:{width,height:width===390?844:1000},deviceScaleFactor:dpr,hasTouch:width===390,reducedMotion:'reduce',colorScheme:width===390?'dark':'light'});
  await context.addInitScript(p=>localStorage.setItem('portfolio.preferences.v1',JSON.stringify(p)),{language:'ru',theme:width===390?'dark':'light'});
  for(const route of ['', 'projects/',...projects.map(p=>'projects/'+p.id+'.html')]){
   const page=await context.newPage(),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.resourceType()==='image')requests.push(r.url());});
   const entry={width,dpr,path:route,images:[],gallery:[],passed:false};report.routes.push(entry);save();
   try{
    const response=await page.goto(new URL(route,base).href,{waitUntil:'load'});assert.equal(response.status(),200);await page.waitForFunction(()=>document.body.dataset.siteReady==='true');await page.evaluate(()=>document.fonts.ready);
    entry.initialImages=requests.map(x=>new URL(x).pathname.split('/').at(-1));
    if(route===''||route==='projects/')assert(!entry.initialImages.some(x=>x.includes('-detail-')),'Card page downloaded detailed case imagery');
    const images=page.locator('.hero-preview img,.project-preview img,.case-media img');
    for(let i=0;i<await images.count();i++)await check(images.nth(i),entry,(route===''?'home':route==='projects/'?'catalog':route.split('/').at(-1).replace('.html',''))+'-'+i);
    assert(!entry.images.some(i=>i.file.endsWith('.jpg')));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    if(route.includes('.html')){
     const links=page.locator('.case-media .gallery-open');
     for(let i=0;i<await links.count();i++){
      await links.nth(i).click();const dialog=page.locator('#gallery-dialog');assert(await dialog.evaluate(el=>el.open));
      const fit=await check(page.locator('#gallery-image'),entry,'gallery-'+route.split('/').at(-1).replace('.html','')+'-'+i);
      await page.locator('#gallery-zoom').click();assert.equal(await page.locator('#gallery-zoom').getAttribute('aria-pressed'),'true');
      const zoom=await check(page.locator('#gallery-image'),entry,'zoom-'+route.split('/').at(-1).replace('.html','')+'-'+i,false);
      await page.locator('.gallery-viewport').evaluate(el=>{el.scrollLeft=160;el.scrollTop=120;});
      const canScroll=await page.locator('.gallery-viewport').evaluate(el=>({x:el.scrollWidth>el.clientWidth,y:el.scrollHeight>el.clientHeight,scrollX:el.scrollLeft,scrollY:el.scrollTop}));
      await page.locator('#gallery-zoom').click();assert.equal(await page.locator('#gallery-zoom').getAttribute('aria-pressed'),'false');
      const href=await page.locator('#gallery-file').getAttribute('href');assert.equal(href,await links.nth(i).evaluate(el=>el.href));
      const popupPromise=page.waitForEvent('popup');await page.locator('#gallery-file').click();const popup=await popupPromise;await popup.waitForLoadState('load');assert.equal(popup.url(),href);await popup.close();
      entry.gallery.push({index:i,fit:fit.file,zoom:zoom.file,canScroll,openFile:href});
      await page.keyboard.press('Escape');assert(!await dialog.evaluate(el=>el.open));assert(await links.nth(i).evaluate(el=>el===document.activeElement));
     }
    }
    if(route===''&&(width===1366&&dpr===2||width===390&&dpr===3)){await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:`evidence/v13/screenshots/${scope}-${width}-dpr${dpr}-home.png`});}
    if(route==='projects/'&&width===1366&&dpr===2){await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:`evidence/v13/screenshots/${scope}-catalog.png`,fullPage:true});}
    assert.deepEqual(errors,[]);entry.passed=true;
   }catch(error){entry.failure=error.message;}finally{await page.close();save();}
  }
  await context.close();console.log(JSON.stringify({width,dpr,passed:report.routes.filter(r=>r.width===width&&r.dpr===dpr).every(r=>r.passed)}));
 }
 for(const type of ['no-js','failed-images']){
  const context=await b.newContext({viewport:{width:390,height:844},javaScriptEnabled:type!=='no-js'}),page=await context.newPage(),entry={type,passed:false};report.edges.push(entry);
  try{
   if(type==='failed-images')await page.route('**/projects/media/*.webp',r=>r.abort());
   await page.goto(new URL('projects/keyform.html',base).href,{waitUntil:'load'});
   if(type==='no-js'){const href=await page.locator('.gallery-open').first().getAttribute('href');assert.equal((await context.request.get(new URL(href,page.url()).href)).status(),200);assert.equal(await page.locator('h1').count(),1);}
   else {assert(await page.locator('.case-media .media-error').first().isVisible());await page.locator('.gallery-open').first().click();await page.waitForFunction(()=>!document.querySelector('#gallery-error').hidden);assert(await page.locator('#gallery-error').isVisible());await page.locator('#gallery-close').click();}
   entry.passed=true;
  }catch(error){entry.failure=error.message;}finally{await context.close();save();}
 }
 report.passed=report.routes.every(r=>r.passed)&&report.edges.every(r=>r.passed);save();console.log(JSON.stringify({scope,passed:report.passed,routes:report.routes.length,images:report.routes.reduce((n,r)=>n+r.images.length,0),failures:[...report.routes,...report.edges].filter(r=>!r.passed).map(r=>({path:r.path,width:r.width,dpr:r.dpr,type:r.type,failure:r.failure}))}));if(!report.passed)process.exitCode=1;
}finally{await b.close();}
