import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {openBrowser} from './browser-config.mjs';
const directory='evidence/v2/live-canvas-buffer';mkdirSync(directory,{recursive:true});
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
const url='https://moyisey.github.io/bakhtiyar-zikirin/';const browser=await openBrowser();
const record={url,checkedAt:new Date().toISOString(),frames:[],nativeBufferHashes:[],locatorHashes:[],viewportHashes:[],errors:[]};
try{
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const page=await context.newPage();
  await page.addInitScript(()=>{window.__qaFrames=0;const original=requestAnimationFrame;window.requestAnimationFrame=callback=>original(time=>{window.__qaFrames++;callback(time);});});
  page.on('pageerror',error=>record.errors.push(error.message));
  await page.goto(url,{waitUntil:'networkidle',timeout:30000});await page.waitForFunction(()=>document.querySelector('#scene-viewport').classList.contains('is-ready'));
  await page.locator('#contact').scrollIntoViewIfNeeded();await page.waitForTimeout(100);await page.locator('#scene').scrollIntoViewIfNeeded();await page.waitForTimeout(500);
  for(let i=0;i<4;i++){
    const data=await page.locator('#scene').evaluate(canvas=>canvas.toDataURL('image/png'));
    const native=Buffer.from(data.split(',')[1],'base64');record.nativeBufferHashes.push(hash(native));writeFileSync(`${directory}/native-buffer-${i}.png`,native);
    const locator=await page.locator('#scene').screenshot();record.locatorHashes.push(hash(locator));writeFileSync(`${directory}/locator-${i}.png`,locator);
    const viewport=await page.screenshot();record.viewportHashes.push(hash(viewport));writeFileSync(`${directory}/viewport-${i}.png`,viewport);
    record.frames.push(await page.evaluate(()=>window.__qaFrames));await page.waitForTimeout(200);
  }
  assert.equal(new Set(record.nativeBufferHashes).size,1);assert.equal(new Set(record.frames).size,1);assert.deepEqual(record.errors,[]);
  record.passed=true;record.locatorScreenshotStable=new Set(record.locatorHashes).size===1;record.viewportScreenshotStable=new Set(record.viewportHashes).size===1;await context.close();
}catch(error){record.passed=false;record.failure=String(error.stack||error.message).replaceAll(process.cwd(),'[project]');}
finally{await browser.close();}
writeFileSync(`${directory}/result.json`,JSON.stringify(record,null,2));console.log(JSON.stringify(record,null,2));if(!record.passed)process.exitCode=1;
