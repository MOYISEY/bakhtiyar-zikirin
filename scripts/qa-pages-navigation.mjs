import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {openBrowser} from './browser-config.mjs';
const base=process.argv[2]??'http://127.0.0.1:5202/',scope=process.argv[3]??'local',ids=JSON.parse(readFileSync('src/content/projects.json','utf8')).map(p=>p.id);
const version=process.env.QA_EVIDENCE_VERSION??'v12';
const report={at:new Date().toISOString(),base,scope,method:'Actual clicks on all twelve image cards, all nine catalog project titles, all four primary navigation links, home work anchor and return-to-top. Both public mailto destinations checked without launching an OS client. Native Chromium desktop and touch emulation; no physical device claim.',checks:[],passed:false};
const browser=await openBrowser();
try {
 for(const [width,lang,theme] of [[1366,'ru','light'],[390,'kk','dark']]) {
  const context=await browser.newContext({viewport:{width,height:width===1366?768:844},hasTouch:width===390,reducedMotion:'reduce'});
  await context.addInitScript(p=>localStorage.setItem('portfolio.preferences.v1',JSON.stringify(p)),{language:lang,theme});
  const page=await context.newPage(),entry={width,lang,theme,clicked:[],passed:false};
  try {
   for(const [path,projects] of [['',ids.slice(0,3)],['projects/',ids]])for(const id of projects) {
    await page.goto(new URL(path,base).href);await page.waitForFunction(()=>document.body.dataset.siteReady==='true');await page.locator('#'+id+' .project-preview').click();await page.waitForFunction(id=>document.body.dataset.project===id,id);
    assert.equal(await page.locator('html').getAttribute('lang'),lang);assert.equal(await page.locator('html').getAttribute('data-theme'),theme);entry.clicked.push((path||'home/')+id+' image');
   }
   for(const id of ids) {
    await page.goto(new URL('projects/',base).href);await page.locator('#'+id+' .project-title').click();await page.waitForFunction(id=>document.body.dataset.project===id,id);entry.clicked.push(id+' title');
   }
   for(const [index,target,hash] of [[0,'home',''],[1,'catalog',''],[2,'home','#experience'],[3,'home','#contact']]) {
    await page.goto(new URL('projects/keyform.html',base).href);await page.locator('.header nav a').nth(index).click();await page.waitForFunction(target=>document.body.dataset.page===target,target);assert.equal(new URL(page.url()).hash,hash);entry.clicked.push('primary nav '+index);
   }
   await page.goto(base);await page.locator('.hero a[href="#work"]').click();assert.equal(new URL(page.url()).hash,'#work');await page.locator('#contact .back-top').click();assert.equal(new URL(page.url()).hash,'#top');await page.waitForFunction(()=>scrollY<=1);
   assert.equal(await page.locator('a[href="mailto:b.zikirin@gmail.com"]').count(),2);entry.clicked.push('home work anchor and return-to-top; both mailto destinations verified without launching mail client');entry.passed=true;
  }catch(error){entry.failure=error.message;}
  report.checks.push(entry);await context.close();
 }
}finally{await browser.close();}
report.passed=report.checks.every(c=>c.passed);writeFileSync('evidence/'+version+'/'+scope+'-navigation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
