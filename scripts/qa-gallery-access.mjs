import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import {openBrowser} from './browser-config.mjs';
const base=process.argv[2]??'https://moyisey.github.io/bakhtiyar-zikirin/';
const report={at:new Date().toISOString(),base,method:'Directed native Chromium clicks, keyboard scrolling, localized gallery control checks and axe WCAG A/AA on the open gallery. Touch emulation, no physical phone or screen reader claim.',checks:[],passed:false};
const browser=await openBrowser();
try{
 for(const width of [1366,390])for(const lang of (width===390?['ru','kk','en']:['ru']))for(const theme of ['light','dark']){
  const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:width===390?3:2,hasTouch:width===390,reducedMotion:'reduce'}),page=await context.newPage();
  await context.addInitScript(p=>localStorage.setItem('portfolio.preferences.v1',JSON.stringify(p)),{language:lang,theme});const d=JSON.parse(readFileSync('src/locales/'+lang+'.json','utf8')),entry={width,lang,theme,passed:false};report.checks.push(entry);
  try{
   await page.goto(new URL('projects/helio.html',base).href,{waitUntil:'load'});await page.locator('.gallery-open').first().click();await page.locator('#gallery-image').evaluate(i=>i.decode());
   assert.equal(await page.locator('#gallery-zoom').innerText(),d['v13.details']);assert((await page.locator('#gallery-file').innerText()).includes(d['v13.openFile']));
   const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();entry.axe=a.violations.map(v=>({id:v.id,nodes:v.nodes.length}));assert.deepEqual(entry.axe,[]);
   await page.locator('#gallery-zoom').click();await page.locator('#gallery-image').evaluate(i=>i.decode());assert.equal(await page.locator('#gallery-zoom').innerText(),d['v13.fit']);
   await page.locator('.gallery-viewport').focus();await page.keyboard.press('PageDown');await page.waitForTimeout(160);entry.scrollTop=await page.locator('.gallery-viewport').evaluate(el=>el.scrollTop);assert(entry.scrollTop>0);assert.equal(await page.locator('#gallery-counter').innerText(),'1 / 2');
   if(lang==='ru'&&theme===(width===390?'dark':'light'))await page.screenshot({path:`evidence/v13/screenshots/live-${width}-gallery-details-controls.png`});
   await page.locator('#gallery-zoom').click();assert.equal(await page.locator('#gallery-zoom').innerText(),d['v13.details']);await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#gallery-counter').innerText(),'2 / 2');
   await page.locator('#gallery-close').click();await page.waitForFunction(()=>!document.querySelector('#gallery-dialog').open&&document.querySelector('.gallery-open')===document.activeElement);assert(await page.locator('.gallery-open').first().evaluate(el=>el===document.activeElement));entry.passed=true;
  }catch(error){entry.failure=error.message;}finally{await context.close();writeFileSync('evidence/v13/live-gallery-access.json',JSON.stringify(report,null,2)+'\n');}
 }
 report.passed=report.checks.every(c=>c.passed);writeFileSync('evidence/v13/live-gallery-access.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
}finally{await browser.close();}
