import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {openBrowser} from './browser-config.mjs';
const directory='evidence/v2/live-canvas-return';mkdirSync(directory,{recursive:true});
const url='https://moyisey.github.io/bakhtiyar-zikirin/';
const browser=await openBrowser();
const record={url,checkedAt:new Date().toISOString(),actions:[],errors:[]};
try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const page=await context.newPage();page.setDefaultTimeout(12000);
  await page.addInitScript(()=>{window.__qaFrames=0;const original=requestAnimationFrame;window.requestAnimationFrame=callback=>original(time=>{window.__qaFrames++;callback(time);});});
  page.on('pageerror',error=>record.errors.push(error.message));
  await page.goto(url,{waitUntil:'networkidle',timeout:30000});await page.waitForFunction(()=>document.querySelector('#scene-viewport').classList.contains('is-ready'));
  await page.locator('#contact').scrollIntoViewIfNeeded();await page.waitForTimeout(100);await page.locator('#scene').scrollIntoViewIfNeeded();await page.waitForTimeout(500);
  const dimensions=()=>page.evaluate(()=>{const c=document.querySelector('#scene'),r=c.getBoundingClientRect();return {viewport:{width:innerWidth,height:innerHeight},scroll:{x:scrollX,y:scrollY},cssBounds:{x:r.x,y:r.y,width:r.width,height:r.height},drawingBuffer:{width:c.width,height:c.height},frames:window.__qaFrames,paused:document.querySelector('#motion-toggle').getAttribute('aria-pressed')};});
  const hashes=[];
  for(let i=0;i<4;i++){
    await page.waitForTimeout(200);const before=await dimensions();
    const png=await page.locator('#scene').screenshot();const hash=createHash('sha256').update(png).digest('hex');hashes.push(hash);writeFileSync(`${directory}/return-${i}.png`,png);
    record.actions.push({label:`Repeated visible screenshot ${i}`,before,after:await dimensions(),hash});
  }
  assert.equal(new Set(hashes).size,1);assert.deepEqual(record.errors,[]);record.passed=true;await context.close();
}catch(error){record.passed=false;record.failure=String(error.stack||error.message).replaceAll(process.cwd(),'[project]');}
finally{await browser.close();}
writeFileSync(`${directory}/result.json`,JSON.stringify(record,null,2));console.log(JSON.stringify(record,null,2));if(!record.passed)process.exitCode=1;
