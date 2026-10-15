import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser-config.mjs';
const base=process.argv[2]??'http://127.0.0.1:5202/',scope=process.argv[3]??'local';
const version=process.env.QA_EVIDENCE_VERSION??'v12';mkdirSync('evidence/'+version,{recursive:true});
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
    await context.route('**/projects/media/keyform*',r=>r.abort());
    await page.goto(new URL('projects/',base).href);await page.waitForFunction(()=>document.body.dataset.siteReady==='true');
    await page.locator('#keyform .project-preview').scrollIntoViewIfNeeded();await page.locator('#keyform .media-error').waitFor({state:'visible'});
    const [demo]=await Promise.all([page.waitForEvent('popup'),page.locator('#keyform .project-preview').click()]);await demo.waitForURL(u=>u.href.startsWith('https://moyisey.github.io/keyform/'),{waitUntil:'commit'});await demo.close();await page.locator('#keyform .project-title').click();await page.waitForFunction(()=>document.body.dataset.project==='keyform');
    await page.locator('.gallery-open .media-error').first().waitFor({state:'visible'});await page.locator('.gallery-open').first().click();await page.locator('#gallery-error').waitFor({state:'visible'});
    assert(await page.locator('#gallery-image').isHidden());await page.locator('#gallery-close').click();await page.waitForFunction(()=>document.querySelector('.gallery-open')===document.activeElement);assert(await page.locator('.gallery-open').first().evaluate(e=>e===document.activeElement));
    assert.equal(await page.locator('.case-actions .primary-link').getAttribute('href'),'https://moyisey.github.io/keyform/');
   } else {
    if(test==='controls-chunk-failure')await context.route('**/assets/scene-controls-*.js',r=>r.abort());
    if(test==='renderer-chunk-failure')await context.route(/\/assets\/scene-(?!controls-)[^/]+\.js/,r=>r.abort());
    if(test==='startup-and-webgl-fallback')await context.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/.test(kind)?null:original.call(this,kind,...args);};});
    const scripts=[],failed=[];page.on('request',r=>{if(r.resourceType()==='script')scripts.push(r.url());});page.on('requestfailed',r=>failed.push(r.url()));
    await page.goto(base);await page.waitForFunction(()=>document.body.dataset.siteReady==='true');await page.locator('#scene-disclosure').scrollIntoViewIfNeeded();
    entry.disclosureOpen=await page.locator('#scene-disclosure').evaluate(el=>el.open);
    if(!entry.disclosureOpen)await page.locator('#scene-disclosure>summary').click();await page.waitForFunction(()=>document.querySelector('#scene-status').dataset.sceneState==='fallback');
    assert(await page.locator('#scene').isHidden());if(test==='controls-chunk-failure')assert(failed.some(url=>/scene-controls-/.test(url)));if(test==='renderer-chunk-failure')assert(failed.some(url=>/scene-(?!controls-)/.test(url)));assert(await page.locator('.home-hero').isVisible());assert.equal(await page.locator('#education').count(),1);assert(await page.locator('.resume-link').count()>0);entry.failedScripts=failed;
    if(test!=='controls-chunk-failure'){await page.locator('[data-mode=wire]').click();assert.equal(await page.locator('#system').getAttribute('data-view'),'wire');await page.locator('button[data-layer=data]').click();assert.equal(await page.locator('#system').getAttribute('data-layer'),'data');}
   }
   assert((await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth))<=1);entry.passed=true;
  }catch(error){entry.failure=error.message;}
  report.checks.push(entry);await context.close();
 }
}finally{await browser.close();}
report.passed=report.checks.every(c=>c.passed);writeFileSync('evidence/'+version+'/'+scope+'-edges.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
