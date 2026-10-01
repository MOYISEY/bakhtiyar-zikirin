import { openBrowser } from './browser-config.mjs';
import { writeFile,readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const report={checkedAt:new Date().toISOString(),target:'http://127.0.0.1:5191/',indexSha256:createHash('sha256').update(await readFile('docs/index.html')).digest('hex'),engines:[]};
const deadline=setTimeout(()=>{console.error('Targeted recheck deadline');process.exit(2);},75000);
try{
for(const engine of ['chromium','firefox','webkit']){
 let browser;const result={engine};report.engines.push(result);
 try{
 browser=await openBrowser({timeout:15000},engine);result.version=browser.version();
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});result.errors=[];result.httpFailures=[];page.on('pageerror',e=>result.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)result.httpFailures.push({url:new URL(r.url()).pathname,status:r.status()});});
 await page.goto(report.target,{waitUntil:'load',timeout:15000});await page.waitForFunction(()=>document.querySelector('#scene-status').textContent.includes('3D'),null,{timeout:12000});
 await page.locator('#approach').scrollIntoViewIfNeeded();await page.waitForTimeout(150);result.inApproach=await page.locator('.header nav [aria-current]').evaluateAll(e=>e.map(x=>x.hash));await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(250);result.atTop=await page.locator('.header nav [aria-current]').evaluateAll(e=>e.map(x=>x.hash));result.topPosition=await page.evaluate(()=>scrollY);result.navPass=result.inApproach.includes('#approach')&&result.atTop.length===0&&result.topPosition===0;
 await page.setViewportSize({width:320,height:640});await page.evaluate(()=>document.documentElement.style.fontSize='32px');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(120);result.text200=await page.evaluate(()=>({width:innerWidth,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth}));result.reflowPass=result.text200.clientWidth===result.text200.scrollWidth;
 result.image=await page.locator('#atyrau img').evaluate(e=>({path:e.getAttribute('src'),loading:e.loading,width:e.width,height:e.height}));
 }catch(e){result.error=e.message;}finally{if(browser)await browser.close();}console.log(JSON.stringify(result));
}
}finally{clearTimeout(deadline);await writeFile('evidence/v2/design-nav-recheck.json',JSON.stringify(report,null,2));}
