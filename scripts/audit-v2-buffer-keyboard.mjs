import { openBrowser } from './browser-config.mjs';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const report={checkedAt:new Date().toISOString(),url:'http://127.0.0.1:5191/',engines:[]};
const label=process.argv[2]??'';
const limit=setTimeout(()=>{console.error('Buffer/keyboard check deadline');process.exit(2);},90000);
try{
 for(const engine of ['chromium','firefox','webkit']){
  let browser;const result={engine};report.engines.push(result);
  try{
   browser=await openBrowser({timeout:15000},engine);result.version=browser.version();
   const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
   await page.addInitScript(()=>{
    window.__perf={lcp:[],cls:0,longtasks:[]};
    for(const type of ['largest-contentful-paint','layout-shift','longtask']){
     if(!PerformanceObserver.supportedEntryTypes.includes(type))continue;
     new PerformanceObserver(list=>{for(const e of list.getEntries()){if(type==='largest-contentful-paint')window.__perf.lcp.push({start:e.startTime,size:e.size,tag:e.element?.tagName});if(type==='layout-shift'&&!e.hadRecentInput)window.__perf.cls+=e.value;if(type==='longtask')window.__perf.longtasks.push({start:e.startTime,duration:e.duration});}}).observe({type,buffered:true});
    }
   });
   await page.goto(report.url,{waitUntil:'load',timeout:15000});await page.waitForFunction(()=>document.querySelector('#scene-viewport').classList.contains('is-ready'),null,{timeout:12000});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(220);
   async function snapshot(){const data=await page.locator('#scene').evaluate(canvas=>{const image=document.createElement('canvas');image.width=canvas.width;image.height=canvas.height;const ctx=image.getContext('2d');ctx.drawImage(canvas,0,0);const pixels=ctx.getImageData(0,0,image.width,image.height).data;let painted=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0)painted++;return{painted,width:canvas.width,height:canvas.height,url:canvas.toDataURL()};});const hash=createHash('sha256').update(data.url).digest('hex');return{painted:data.painted,width:data.width,height:data.height,hash};}
   const first=await snapshot();await page.waitForTimeout(1100);const second=await snapshot();result.pausedBuffer={first,second,stable:first.hash===second.hash,painted:first.painted>1000&&second.painted>1000};
   result.isolatedLocalPerformance=await page.evaluate(()=>({navigation:performance.getEntriesByType('navigation').map(e=>({response:e.responseEnd,domContentLoaded:e.domContentLoadedEventEnd,load:e.loadEventEnd})),observer:window.__perf,observerTypes:PerformanceObserver.supportedEntryTypes,resources:performance.getEntriesByType('resource').map(e=>({name:new URL(e.name).pathname,encodedBytes:e.encodedBodySize,duration:e.duration}))}));
   if(label)await page.locator('#system').screenshot({path:`evidence/v2/screenshots/audit2-${label}-${engine}-system.png`});
   await page.locator('#scene').focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(120);result.keyboardRotatedBuffer=await snapshot();result.rotated=result.keyboardRotatedBuffer.hash!==second.hash;await page.keyboard.press('Home');await page.waitForTimeout(120);result.homeBuffer=await snapshot();result.homeRestores=result.homeBuffer.hash===second.hash;
   await page.goto(report.url,{waitUntil:'load',timeout:15000});await page.keyboard.press('Tab');result.defaultTab=await page.evaluate(()=>({tag:document.activeElement.tagName,class:document.activeElement.className,id:document.activeElement.id}));
   if(result.defaultTab.class!=='skip-link'){await page.keyboard.press('Alt+Tab');result.altTab=await page.evaluate(()=>({tag:document.activeElement.tagName,class:document.activeElement.className,id:document.activeElement.id}));}
   if((result.altTab??result.defaultTab).class!=='skip-link'){await page.locator('.skip-link').focus();result.directFocusUsed=true;}
   result.skipBeforeEnter=await page.locator('.skip-link').evaluate(e=>({top:e.getBoundingClientRect().top,outline:getComputedStyle(e).outline}));await page.keyboard.press('Enter');await page.waitForTimeout(150);result.skipAfterEnter=await page.evaluate(()=>({active:document.activeElement.id,hash:location.hash}));
  }catch(e){result.error=e.message;}finally{if(browser)await browser.close();}
  console.log(JSON.stringify({engine,result}));
 }
}finally{clearTimeout(limit);await writeFile(`evidence/v2/design-buffer-keyboard${label?'-'+label:''}.json`,JSON.stringify(report,null,2));}
