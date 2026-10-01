import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { openBrowser } from './browser-config.mjs';

const root=resolve('docs');
const out=resolve('evidence/v2');
const label=process.argv[2]??'initial';
const engines=(process.argv[3]??'chromium,firefox,webkit').split(',');
const serverMisses=[];
await mkdir(resolve(out,'screenshots'),{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
    if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403).end();return;}
    const bytes=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]??'application/octet-stream'});res.end(bytes);
  }catch(e){serverMisses.push({path:req.url,code:e.code});res.writeHead(404).end('Not found');}
});
await new Promise(resolve=>server.listen(5194,'127.0.0.1',resolve));
const url='http://127.0.0.1:5194/';
const report={checkedAt:new Date().toISOString(),target:'Local production build served from docs',buildIndexSha256:createHash('sha256').update(await readFile('docs/index.html')).digest('hex'),serverMisses,engines:[],limitations:['Viewport and touch settings are emulation, not physical phones.','Playwright WebKit is not native Safari.','Axe does not replace a screen-reader session; no screen reader used.']};
const deadline=setTimeout(()=>{console.error('Audit timed out');process.exit(2);},270000);
const summary=async page=>page.evaluate(()=>{
  const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,right:r.right};};
  return{viewport:{width:innerWidth,height:innerHeight},document:{scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth},canvasVisible:!!document.querySelector('#scene')&&!document.querySelector('#scene').hidden,status:document.querySelector('#scene-status').textContent,h1:document.querySelector('h1').innerText,role:document.querySelector('.identity small').innerText,contact:document.querySelector('.header-contact')?.href,headings:[...document.querySelectorAll('h2,h3')].map(e=>e.textContent),images:[...document.images].map(e=>({src:e.getAttribute('src'),complete:e.complete,width:e.naturalWidth})),overflowingText:[...document.querySelectorAll('p,h1,h2,h3,h4,dd,dt,summary,button,a,pre')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left< -1)&&!e.classList.contains('skip-link');}).map(e=>({tag:e.tagName,text:e.textContent.trim().slice(0,90),...rect(e)})),smallText:[...document.querySelectorAll('button,p,small,figcaption')].filter(e=>{const s=getComputedStyle(e);return parseFloat(s.fontSize)<11&&e.getBoundingClientRect().width>0;}).map(e=>({selector:e.id||e.className||e.tagName,text:e.textContent.trim().slice(0,80),fontSize:getComputedStyle(e).fontSize})),controls:[...document.querySelectorAll('button,a,summary')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&getComputedStyle(e).visibility!=='hidden';}).map(e=>({tag:e.tagName,text:e.textContent.trim().slice(0,60),...rect(e)}))};
});
const axe=async(page,name)=>{
  const legacyMode=page.context().browser().browserType().name()==='firefox';
  let timer;
  try{
  const r=await Promise.race([new AxeBuilder({page}).setLegacyMode(legacyMode).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa','best-practice']).analyze(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Axe operation exceeded 12 seconds')),12000);})]);
  return {name,legacyMode,violations:r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,failureSummary:n.failureSummary}))})),passes:r.passes.length,incomplete:r.incomplete.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,failureSummary:n.failureSummary}))}))};
  }finally{clearTimeout(timer);}
};
async function ready(page,context){
  await page.goto(url,{waitUntil:'load',timeout:15000});
  if(context!=='nojs')await page.waitForFunction(()=>document.querySelector('#scene-status')?.textContent.includes('3D'),null,{timeout:12000});
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(220);
}
try{
  for(const engine of engines){
    const entry={engine,scenarios:[],errors:[],consoleErrors:[],failedRequests:[]};report.engines.push(entry);
    let browser;
    try{
      browser=await openBrowser({timeout:15000},engine);entry.version=browser.version();
      const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
      await context.addInitScript(()=>{
        window.__audit={rafCount:0,lcp:[],cls:0,longtasks:[]};
        const raf=window.requestAnimationFrame;window.requestAnimationFrame=function(callback){window.__audit.rafCount++;return raf.call(this,callback);};
        for(const type of ['largest-contentful-paint','layout-shift','longtask']){
          if(!PerformanceObserver.supportedEntryTypes.includes(type))continue;
          new PerformanceObserver(list=>{for(const e of list.getEntries()){if(type==='largest-contentful-paint')window.__audit.lcp.push({start:e.startTime,size:e.size,tag:e.element?.tagName});if(type==='layout-shift'&&!e.hadRecentInput)window.__audit.cls+=e.value;if(type==='longtask')window.__audit.longtasks.push({start:e.startTime,duration:e.duration});}}).observe({type,buffered:true});
        }
      });
      const page=await context.newPage();page.on('pageerror',e=>entry.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')entry.consoleErrors.push({text:m.text(),location:m.location()});});page.on('requestfailed',r=>entry.failedRequests.push({url:r.url(),error:r.failure()?.errorText}));
      await ready(page);entry.scenarios.push({name:'desktop1440-reduced-motion',...(await summary(page)),axe:await axe(page,'desktop initial'),motionPressed:await page.locator('#motion-toggle').getAttribute('aria-pressed')});
      const count=()=>page.evaluate(()=>window.__audit.rafCount);
      let before=await count();await page.waitForTimeout(1100);entry.reducedMotionIdleFrames=(await count())-before;
      entry.performance=await page.evaluate(()=>({includesAxe:true,navigation:performance.getEntriesByType('navigation').map(e=>({response:e.responseEnd,domContentLoaded:e.domContentLoadedEventEnd,load:e.loadEventEnd})),observer:window.__audit,resources:performance.getEntriesByType('resource').map(e=>({name:new URL(e.name).pathname,encodedBytes:e.encodedBodySize,transferBytes:e.transferSize,duration:e.duration}))}));
      await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('#system').scrollIntoViewIfNeeded();await page.waitForTimeout(200);before=await count();await page.waitForTimeout(1100);entry.visibleAnimationFrames=(await count())-before;
      await page.locator('#contact').scrollIntoViewIfNeeded();await page.waitForTimeout(200);before=await count();await page.waitForTimeout(1100);entry.offscreenAnimationFrames=(await count())-before;
      await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>window.scrollTo(0,0));
      await page.evaluate(()=>document.querySelectorAll('details').forEach(e=>e.open=true));
      await page.locator('[data-step="2"]').click();
      entry.scenarios.push({name:'desktop-expanded',axe:await axe(page,'All details expanded; role step selected')});
      await page.goto(url,{waitUntil:'load'});await page.keyboard.press('Tab');
      const skip={focused:await page.evaluate(()=>document.activeElement.className),rect:await page.locator('.skip-link').boundingBox()};
      await page.keyboard.press('Enter');await page.waitForTimeout(150);skip.after=await page.evaluate(()=>({focused:document.activeElement.id,hash:location.hash}));entry.skip=skip;
      const focus=[];for(let i=0;i<32;i++){await page.keyboard.press('Tab');focus.push(await page.evaluate(()=>({tag:document.activeElement.tagName,id:document.activeElement.id,text:document.activeElement.textContent.trim().slice(0,55),outline:getComputedStyle(document.activeElement).outline,visible:!!document.activeElement.getBoundingClientRect().width})));}
      entry.keyboardSequence=focus;
      await page.evaluate(()=>{document.documentElement.style.fontSize='32px';document.querySelectorAll('details').forEach(e=>e.open=true);window.scrollTo(0,0);document.activeElement.blur();});await page.waitForTimeout(120);
      entry.scenarios.push({name:'desktop-text200',...(await summary(page))});
      await page.screenshot({path:resolve(out,'screenshots',`audit2-${label}-${engine}-text200.png`),fullPage:true});
      await page.evaluate(()=>document.documentElement.style.fontSize='16px');
      await page.setViewportSize({width:390,height:844});await page.waitForTimeout(120);await page.evaluate(()=>{document.querySelectorAll('details').forEach(e=>e.open=false);window.scrollTo(0,0);});
      entry.scenarios.push({name:'mobile390',...(await summary(page)),axe:await axe(page,'390 wide')});
      await page.screenshot({path:resolve(out,'screenshots',`audit2-${label}-${engine}-390.png`),fullPage:true});
      await page.setViewportSize({width:320,height:640});await page.waitForTimeout(120);
      entry.scenarios.push({name:'mobile320',...(await summary(page))});
      await page.evaluate(()=>document.documentElement.style.fontSize='32px');await page.waitForTimeout(120);
      entry.scenarios.push({name:'mobile320-text200',...(await summary(page))});
      await page.screenshot({path:resolve(out,'screenshots',`audit2-${label}-${engine}-320-text200.png`),fullPage:true});
      await context.close();
      const fallback=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
      await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(String(kind).startsWith('webgl'))return null;return original.call(this,kind,...args);};});
      const fp=await fallback.newPage();await ready(fp);await fp.locator('[data-mode="solid"]').click();await fp.locator('[data-layer="data"]').click();await fp.locator('#signal-start').click();
      entry.scenarios.push({name:'webgl-disabled-390',...(await summary(fp)),axe:await axe(fp,'No WebGL'),pressed:await fp.locator('[data-mode="solid"]').getAttribute('aria-pressed'),signal:await fp.locator('#signal-status').textContent(),resetHidden:await fp.locator('#scene-reset').isHidden()});
      await fp.screenshot({path:resolve(out,'screenshots',`audit2-${label}-${engine}-fallback.png`),fullPage:true});await fallback.close();
      const nojs=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});
      const np=await nojs.newPage();await ready(np,'nojs');entry.scenarios.push({name:'no-js-production390',...(await summary(np)),styleApplied:await np.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),hiddenDeadButtons:await np.locator('.scene-controls').isHidden(),briefControlsHidden:await np.locator('.brief-steps').isHidden()});
      await np.locator('#atyrau summary').click();entry.nojsDetailsOpen=await np.locator('#atyrau details').getAttribute('open');await np.screenshot({path:resolve(out,'screenshots',`audit2-${label}-${engine}-nojs.png`),fullPage:true});await nojs.close();
    }catch(e){entry.auditError={message:e.message,stack:e.stack};}
    finally{if(browser)await browser.close();await writeFile(resolve(out,`design-accessibility-${label}.json`),JSON.stringify(report,null,2));}
    console.log(JSON.stringify({engine:entry.engine,version:entry.version,scenarios:entry.scenarios.length,axeViolations:entry.scenarios.flatMap(s=>s.axe?.violations??[]).map(v=>v.id),error:entry.auditError?.message}));
  }
}finally{clearTimeout(deadline);server.close();await writeFile(resolve(out,`design-accessibility-${label}.json`),JSON.stringify(report,null,2));}
