import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser-config.mjs';
const base=process.argv[2]??'http://127.0.0.1:5202/',scope=process.argv[3]??'local';
const report={at:new Date().toISOString(),base,scope,checks:[],passed:false};
const hash=b=>createHash('sha256').update(b).digest('hex');
const provenance=JSON.parse(readFileSync('evidence/v12/media-provenance.json','utf8'));
for(const capture of provenance.captures)for(const item of [capture,capture.preview].filter(Boolean)) {
 assert.equal(hash(readFileSync('public/'+item.file)),item.sha256);assert.equal(hash(readFileSync('docs/'+item.file)),item.sha256);
}
report.checks.push({type:'all fourteen fresh screenshots and seven previews match provenance and production build',passed:true,captures:provenance.captures.length,previewBytes:provenance.captures.reduce((n,c)=>n+(c.preview?.bytes??0),0)});
const browser=await openBrowser();
try {
 for(const test of ['image-failure','controls-chunk-failure','renderer-chunk-failure','startup-and-webgl-fallback']) {
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),entry={type:test,passed:false};
  try {
   if(test==='image-failure') {
    await context.route('**/projects/media/keyform*.jpg',r=>r.abort());
    await page.goto(new URL('projects/',base).href);await page.waitForFunction(()=>document.body.dataset.siteReady==='true');
    await page.locator('#keyform .media-error').waitFor({state:'visible'});
    await page.locator('#keyform .project-preview').click();await page.waitForFunction(()=>document.body.dataset.project==='keyform');
    await page.locator('.gallery-open .media-error').first().waitFor({state:'visible'});await page.locator('.gallery-open').first().click();await page.locator('#gallery-error').waitFor({state:'visible'});
    assert(await page.locator('#gallery-image').isHidden());await page.locator('#gallery-close').click();assert(await page.locator('.gallery-open').first().evaluate(e=>e===document.activeElement));
    assert.equal(await page.locator('.case-actions .primary-link').getAttribute('href'),'https://moyisey.github.io/keyform/');
   } else {
    if(test==='controls-chunk-failure')await context.route('**/assets/scene-controls-*.js',r=>r.abort());
    if(test==='renderer-chunk-failure')await context.route(/\/assets\/scene-(?!controls-)[^/]+\.js/,r=>r.abort());
    if(test==='startup-and-webgl-fallback')await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/.test(kind)?null:original.call(this,kind,...args);};});
    const scripts=[];page.on('request',r=>{if(r.resourceType()==='script')scripts.push(r.url());});
    await page.goto(base);await page.waitForFunction(()=>document.body.dataset.siteReady==='true');await page.locator('#scene-disclosure').scrollIntoViewIfNeeded();
    assert(!scripts.some(url=>/scene-|rowline-sample/.test(url)));entry.optionalCodeAbsentBeforeOpen=true;
    await page.locator('#scene-disclosure>summary').click();await page.waitForFunction(()=>document.querySelector('#scene-status').dataset.sceneState==='fallback');
    assert(await page.locator('#scene').isHidden());
    if(test!=='controls-chunk-failure'){await page.locator('[data-mode=wire]').click();assert.equal(await page.locator('#system').getAttribute('data-view'),'wire');await page.locator('button[data-layer=data]').click();assert.equal(await page.locator('#system').getAttribute('data-layer'),'data');}
   }
   assert((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=1);entry.passed=true;
  }catch(error){entry.failure=error.message;}
  report.checks.push(entry);await context.close();
 }
}finally{await browser.close();}
report.passed=report.checks.every(c=>c.passed);writeFileSync('evidence/v12/'+scope+'-edges.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
