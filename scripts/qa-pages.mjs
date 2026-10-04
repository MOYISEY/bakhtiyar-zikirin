import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import {openBrowser} from './browser-config.mjs';
const base=process.argv[2]??'http://127.0.0.1:5202/',scope=process.argv[3]??'local';
const out=`evidence/v12/${scope}-pages.json`,shots=`qa-private/v12/${scope}`;mkdirSync(shots,{recursive:true});mkdirSync('evidence/v12/screenshots',{recursive:true});
const projects=JSON.parse(readFileSync('src/content/projects.json','utf8')),routes=[{path:'',page:'home'},{path:'projects/',page:'catalog'},...projects.map(p=>({path:'projects/'+p.id+'.html',page:'project',id:p.id}))];
const report={at:new Date().toISOString(),base,scope,method:'Directed native Chromium clicks and direct HTTP navigation. All 11 static entries in language/theme/viewport matrix; mobile is touch emulation. Selected axe checks, actual image decode, route refresh, history, filters, gallery keyboard/mobile controls and preferences. Physical phones, Safari and screen reader not claimed.',cases:[],interactions:[],edges:[],passed:false};
let b;const save=()=>writeFileSync(out,JSON.stringify(report,null,2));
async function decodeImages(page){return page.locator('img[src]').evaluateAll(async nodes=>{const errors=[];for(const n of nodes){try{n.loading='eager';await Promise.race([n.decode(),new Promise((_,reject)=>setTimeout(()=>reject(Error('Image decode timeout')),10000))]);if(!n.naturalWidth)errors.push(n.src);}catch{errors.push(n.src);}}return errors;});}
async function shot(page,name,publish=false){await page.screenshot({path:shots+'/'+name+'.png'});if(publish)await page.screenshot({path:'evidence/v12/screenshots/'+scope+'-'+name+'.png'});}
try {
for(const width of [1366,390])for(const lang of ['ru','kk','en'])for(const theme of ['light','dark']) {
 if(scope==='live'&&theme!==(width===1366?'light':'dark'))continue;
 b=await openBrowser();const context=await b.newContext({viewport:{width,height:width===1366?768:844},hasTouch:width===390,reducedMotion:'reduce',colorScheme:theme,acceptDownloads:true});
 await context.addInitScript(p=>localStorage.setItem('portfolio.preferences.v1',JSON.stringify(p)),{language:lang,theme});
 let page;const d=JSON.parse(readFileSync('src/locales/'+lang+'.json','utf8')),prefix=`${width}-${lang}-${theme}`,errors=[];
 try {
  for(const route of routes) {
   if(page)await page.close();page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
   const e={width,lang,theme,path:route.path,passed:false};report.cases.push(e);save();
   try {
    const response=await page.goto(new URL(route.path,base).href,{waitUntil:'load',timeout:45000});assert.equal(response.status(),200);await page.waitForFunction(()=>document.body.dataset.siteReady==='true');await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('body').getAttribute('data-page'),route.page);if(route.id)assert.equal(await page.locator('body').getAttribute('data-project'),route.id);
    assert.equal(await page.locator('html').getAttribute('lang'),lang);assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
    assert.equal(new URL(page.url()).searchParams.get('lang'),lang);
    const mismatch=await page.locator('[data-i18n]').evaluateAll((nodes,d)=>nodes.filter(n=>n.textContent!==d[n.dataset.i18n]).map(n=>({key:n.dataset.i18n,text:n.textContent})),d);assert.deepEqual(mismatch,[]);
    assert.deepEqual(await decodeImages(page),[]);assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('#hobby,a[href*="krasnaya-nit"],.hero-name,.featured-gallery').count(),0);
    e.overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert(e.overflow<=1);
    assert.deepEqual(errors,[]);
    if(route.page==='home') {
     assert.equal(await page.locator('.visual-card').count(),3);assert.equal(await page.locator('.hero .sample').count(),0);
     await page.locator('#work').evaluate(el=>el.scrollIntoView({block:'start'}));await shot(page,prefix+'-cards',lang==='ru'&&width===1366||lang==='kk'&&width===390&&theme==='dark');
    } else if(route.page==='catalog') {
     assert.equal(await page.locator('.visual-card').count(),9);assert.equal(await page.locator('.project-preview img').count(),9);await shot(page,prefix+'-catalog',lang==='ru'&&width===1366||lang==='en'&&width===390&&theme==='light');
    } else {
     const project=projects.find(p=>p.id===route.id);assert.equal(await page.locator('.case-media').count(),project.diagram?1:2);
     assert.equal(await page.locator('.diagram-note').count(),project.diagram?1:0);assert.equal(await page.locator('.case-actions a').count(),[project.demo,project.code,project.qa,project.windows].filter(Boolean).length);
     await page.locator('.gallery-open').first().click();assert.equal(await page.locator('#gallery-dialog').evaluate(e=>e.open),true);assert.deepEqual(await decodeImages(page),[]);
     assert.equal(await page.locator('#gallery-close').evaluate(el=>el===document.activeElement),true);assert.equal(await page.locator('#gallery-counter').innerText(),'1 / '+(project.diagram?1:2));
     if(!project.diagram){await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#gallery-caption').innerText(),d['v12.'+route.id+'.shot2']);await page.locator('#gallery-prev').click();assert.equal(await page.locator('#gallery-caption').innerText(),d['v12.'+route.id+'.shot1']);await page.locator('#gallery-next').click();assert.equal(await page.locator('#gallery-caption').innerText(),d['v12.'+route.id+'.shot2']);await page.locator('#gallery-prev').click();}
     if(route.id==='keyform')await shot(page,prefix+'-viewer',lang==='ru'&&width===1366&&theme==='light'||lang==='kk'&&width===390&&theme==='dark');
     await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#gallery-dialog').open&&document.querySelector('.gallery-open')===document.activeElement);assert.equal(await page.locator('#gallery-dialog').evaluate(e=>e.open),false);assert.equal(await page.locator('.gallery-open').first().evaluate(el=>el===document.activeElement),true);
     await page.locator('.gallery-open').first().click();await page.locator('#gallery-close').click();assert.equal(await page.locator('#gallery-dialog').evaluate(e=>e.open),false);
     const before=new URL(page.url()).pathname;await page.locator('#language-select').selectOption(lang==='en'?'ru':'en');assert.equal(new URL(page.url()).pathname,before);await page.locator('#language-select').selectOption(lang);
     if(route.id==='keyform'||route.id==='neuralbrief') {await page.evaluate(()=>scrollTo(0,0));await shot(page,prefix+'-'+route.id,lang==='ru'&&width===1366&&theme==='light'||lang==='kk'&&width===390&&theme==='dark');}
     await page.reload({waitUntil:'load'});assert.equal(await page.locator('body').getAttribute('data-project'),route.id);assert.equal(await page.locator('html').getAttribute('lang'),lang);
     await page.locator('.next-case').click();const next=projects[(projects.indexOf(project)+1)%projects.length];await page.waitForFunction(id=>document.body.dataset.project===id,next.id);assert.equal(await page.locator('html').getAttribute('lang'),lang);assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
     await page.evaluate(()=>history.back());await page.waitForFunction(id=>document.body.dataset.project===id,route.id);assert.equal(await page.locator('body').getAttribute('data-project'),route.id);
    }
    if(lang==='ru'&&theme==='light'&&[1366,390].includes(width)&&['','projects/','projects/keyform.html','projects/neuralbrief.html'].includes(route.path)) {
     const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();e.axe=a.violations.map(v=>({id:v.id,nodes:v.nodes.length}));assert.deepEqual(e.axe,[]);
    }
    e.passed=true;
   }catch(error){e.failure=error.message;}
   save();
  }
  const flow={width,lang,theme,checks:[],passed:false};report.interactions.push(flow);
  try {
   await page.goto(new URL('projects/',base).href,{waitUntil:'load'});
   for(const [filter,count] of [['spatial',3],['tools',3],['games',1],['cases',2],['all',9]]) {await page.locator(`[data-filter=${filter}]`).click();assert.equal(await page.locator('.visual-card:visible').count(),count);assert.equal(await page.locator('#filter-count').innerText(),String(count));}
   await page.locator('[data-filter=spatial]').click();await page.locator('[data-filter=tools]').click();await page.goBack();assert.equal(await page.locator('.visual-card:visible').count(),3);assert.equal(await page.locator('[data-filter=spatial]').getAttribute('aria-pressed'),'true');await page.goForward();assert.equal(await page.locator('[data-filter=tools]').getAttribute('aria-pressed'),'true');flow.checks.push('all five filters, counts, URL, back and forward');
   await page.locator('#rowline .project-preview').click();await page.waitForFunction(()=>document.body.dataset.project==='rowline');assert.equal(await page.locator('html').getAttribute('lang'),lang);await page.locator('.case-back a').click();assert.equal(await page.locator('[data-filter=tools]').getAttribute('aria-pressed'),'true');flow.checks.push('image opens separate case; back restores category and language');
   await page.goto(new URL('projects/rowline.html',base).href,{waitUntil:'load'});await page.waitForFunction(()=>document.body.dataset.sampleReady==='true');await page.locator('#sample-fix').click();assert.equal(await page.locator('#sample-sku').innerText(),'00124');await page.locator('#sample-fix').click();assert.equal(await page.locator('#sample-sku').innerText(),'·00124·');const [csv]=await Promise.all([page.waitForEvent('download'),page.locator('#sample-export').click()]);assert(readFileSync(await csv.path(),'utf8').includes('00124'));flow.checks.push('real Rowline sample trim, undo and CSV');
   await page.goto(base,{waitUntil:'load'});const requestScripts=[];page.on('request',r=>{if(r.resourceType()==='script')requestScripts.push(r.url());});
   await page.locator('#scene-disclosure>summary').click();await page.waitForFunction(()=>['ready','fallback'].includes(document.querySelector('#scene-status').dataset.sceneState),null,{timeout:20000});
   for(const mode of ['solid','wire','explode']){await page.locator(`[data-mode=${mode}]`).click();assert.equal(await page.locator('#system').getAttribute('data-view'),mode);}
   await page.locator('button[data-layer=logic]').click();assert.equal(await page.locator('#layer-description').innerText(),d['layer.logic']);await page.locator('#signal-start').click();assert.equal(await page.locator('#signal-status').innerText(),d['signal.3']);
   flow.scene=await page.locator('#scene-status').getAttribute('data-scene-state');if(flow.scene==='ready'){assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'true');await page.locator('#motion-toggle').click();await page.locator('#motion-toggle').click();await page.locator('#scene').focus();await page.keyboard.press('ArrowLeft');await page.keyboard.press('Home');await page.locator('#scene-reset').click();}flow.checks.push('opt-in 3D/fallback, controls, pause and reduced motion');
   await page.locator('#theme-select').selectOption('system');assert.equal(await page.locator('html').getAttribute('data-theme'),theme);await page.locator('#theme-select').selectOption(theme);
   await page.locator('.hero .resume-link').click({trial:true});const [pdf]=await Promise.all([page.waitForEvent('download'),page.locator('.hero .resume-link').click()]);assert.equal(readFileSync(await pdf.path()).subarray(0,5).toString(),'%PDF-');flow.checks.push('system theme and public PDF');
   assert.deepEqual(errors,[]);flow.passed=true;
  }catch(error){flow.failure=error.message;}save();
 }finally{await context.close();await b.close();}
 console.log(JSON.stringify({width,lang,theme,passed:report.cases.filter(c=>c.width===width&&c.lang===lang&&c.theme===theme).every(c=>c.passed),flow:report.interactions.at(-1).passed}));
}
if(scope==='local') {
 b=await openBrowser();
 for(const path of ['', 'projects/','projects/keyform.html']) {
  const context=await b.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),page=await context.newPage(),edge={type:'no-js',path,passed:false};
  try{const response=await page.goto(new URL(path,base).href);assert.equal(response.status(),200);assert.deepEqual(await decodeImages(page),[]);assert.equal(await page.locator('h1').count(),1);if(path==='projects/')assert.equal(await page.locator('.visual-card').count(),9);if(path.includes('keyform')){const href=await page.locator('.gallery-open').first().getAttribute('href');assert.equal((await context.request.get(new URL(href,page.url()).href)).status(),200);}edge.passed=true;}catch(error){edge.failure=error.message;}report.edges.push(edge);await context.close();
 }
 const context=await b.newContext(),page=await context.newPage(),edge={type:'explicit-language-query-and-legacy-deep-link',passed:false};
 try{await page.goto(new URL('projects/keyform.html?lang=kk#shot-2',base).href);assert.equal(await page.locator('html').getAttribute('lang'),'kk');await page.reload();assert.equal(await page.locator('body').getAttribute('data-project'),'keyform');await page.goto(base+'#rowline');await page.waitForFunction(()=>document.body.dataset.project==='rowline');assert.equal(await page.locator('html').getAttribute('lang'),'kk');edge.passed=true;}catch(error){edge.failure=error.message;}report.edges.push(edge);await context.close();
}
report.passed=report.cases.every(c=>c.passed)&&report.interactions.every(c=>c.passed)&&report.edges.every(c=>c.passed);save();
console.log(JSON.stringify({scope,passed:report.passed,routes:report.cases.length,flows:report.interactions.length,edges:report.edges.length,failed:[...report.cases,...report.interactions,...report.edges].filter(c=>!c.passed).map(c=>({width:c.width,lang:c.lang,theme:c.theme,path:c.path,failure:c.failure}))}));if(!report.passed)process.exitCode=1;
}finally{await b?.close();}
