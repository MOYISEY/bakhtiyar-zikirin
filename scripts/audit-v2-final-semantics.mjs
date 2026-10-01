import { openBrowser } from './browser-config.mjs';
import { writeFile,readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const browser=await openBrowser({timeout:15000});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const errors=[],httpFailures=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)httpFailures.push({url:new URL(r.url()).pathname,status:r.status()});});
 await page.goto('http://127.0.0.1:5191/',{waitUntil:'load',timeout:15000});
 const entityRole=await page.locator('.entity-map').getAttribute('role');
 const entityAriaSnapshot=await page.locator('.entity-map').ariaSnapshot();
 await page.locator('#approach').scrollIntoViewIfNeeded();await page.waitForTimeout(150);const currentInApproach=await page.locator('.header nav [aria-current]').evaluateAll(e=>e.map(x=>x.hash));await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(200);const currentAtTop=await page.locator('.header nav [aria-current]').evaluateAll(e=>e.map(x=>x.hash));
 const report={checkedAt:new Date().toISOString(),engine:'chromium',version:browser.version(),indexSha256:createHash('sha256').update(await readFile('docs/index.html')).digest('hex'),entityRole,entityAriaSnapshot,currentInApproach,currentAtTop,errors,httpFailures,pass:entityRole==='group'&&entityAriaSnapshot.includes('Проект связан с автором')&&currentInApproach.includes('#approach')&&currentAtTop.length===0&&errors.length===0&&httpFailures.length===0};
 await writeFile('evidence/v2/design-final-semantics.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();}
