import {openBrowser} from './browser-config.mjs';
import {readFileSync,writeFileSync} from 'node:fs';
const base=process.argv[2]??'http://127.0.0.1:5202/',scope=process.argv[3]??'local';
const report={at:new Date().toISOString(),base,scope,method:'Actual native Chromium clicks on each distinct external action in the nine case pages and GitHub profile. The popup navigation HTTP response, page title and native ZIP signature; no claim of a new child-app audit or OS mail client test.',links:[],passed:false};
const browser=await openBrowser(),context=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true}),page=await context.newPage();
const projects=JSON.parse(readFileSync('src/content/projects.json','utf8')),seen=new Set(),downloads=[];
const responses=new Map();context.on('response',r=>{if(r.request().isNavigationRequest())responses.set(r.url(),r.status());});
context.on('page',p=>p.on('download',d=>downloads.push(d)));page.on('download',d=>downloads.push(d));
try {
 for(const project of projects) {
  await page.goto(new URL('projects/'+project.id+'.html',base).href);await page.waitForFunction(()=>document.body.dataset.siteReady==='true');
  const links=await page.locator('.case-actions a,a.source-link[href="https://github.com/MOYISEY"]').evaluateAll(nodes=>nodes.map(n=>n.href));
  for(const url of links) {
   if(seen.has(url))continue;seen.add(url);const entry={project:project.id,url,passed:false};report.links.push(entry);
   try {
    const index=await page.locator('a').evaluateAll((nodes,url)=>nodes.findIndex(n=>n.href===url),url),action=page.locator('a').nth(index);
    if(url.includes('/releases/download/')) {
     const before=downloads.length;await action.click();const until=Date.now()+45000;while(downloads.length===before&&Date.now()<until)await new Promise(r=>setTimeout(r,100));
     if(downloads.length===before)throw Error('No native ZIP download event');const download=downloads.at(-1);entry.filename=download.suggestedFilename();entry.error=await download.failure();const file=await download.path();entry.zipMagic=file?readFileSync(file).subarray(0,4).toString('hex'):null;entry.passed=!entry.error&&entry.zipMagic==='504b0304';
     for(const popup of context.pages())if(popup!==page)await popup.close();
    }else {
     const [popup]=await Promise.all([context.waitForEvent('page'),action.click()]);await popup.waitForLoadState('domcontentloaded',{timeout:45000});entry.finalUrl=popup.url();entry.title=await popup.title();
     entry.status=responses.get(entry.finalUrl);entry.passed=entry.status>=200&&entry.status<400&&!/404|not found|privacy error/i.test(entry.title)&&!entry.finalUrl.startsWith('chrome-error:');await popup.close();
    }
   }catch(error){entry.error=error.message.split(/\r?\n/,1)[0];}
   writeFileSync('evidence/v12/'+scope+'-links.json',JSON.stringify(report,null,2));console.log((entry.passed?'PASS ':'FAIL ')+url);
  }
 }
 report.passed=report.links.every(l=>l.passed);writeFileSync('evidence/v12/'+scope+'-links.json',JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
}finally{await context.close();await browser.close();}
