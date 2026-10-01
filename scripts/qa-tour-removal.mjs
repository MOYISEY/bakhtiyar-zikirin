import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {openBrowser} from './browser-config.mjs';
const url=process.argv[2]??'http://127.0.0.1:5191/';
const live=url.startsWith('https:');const output=process.argv[3]??'evidence/v3/photo-removal-local.json';
const shots=live?'qa-private/photo-removal-live':'evidence/v3/photo-removal-screenshots';mkdirSync(shots,{recursive:true});
const report={url,checkedAt:new Date().toISOString(),scope:'Targeted campus-case removal and layout checks; no whole audit matrix rerun.',scenarios:[]};const browser=await openBrowser();
try{for(const[name,width,height,size]of[['desktop',1440,1000,100],['mobile',390,844,100],['reflow',320,720,200]]){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});const entry={name,width,height,textSizePercent:size,errors:[]};report.scenarios.push(entry);page.on('pageerror',e=>entry.errors.push(e.message));
 await page.goto(url,{waitUntil:'networkidle'});if(size!==100)await page.evaluate(size=>document.documentElement.style.fontSize=size+'%',size);
 assert.equal(await page.locator('#atyrau img, #atyrau figure, #atyrau .screenshot-frame, #atyrau figcaption').count(),0);
 assert.equal(await page.locator('img[src*=atyrau-tour]').count(),0);
 assert.match(await page.locator('#atyrau').innerText(),/Pannellum/);assert.match(await page.locator('#atyrau').innerText(),/Четыре этажа/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.locator('#atyrau summary').click();assert.equal(await page.locator('#atyrau details').getAttribute('open'),'');
 const [popup]=await Promise.all([page.waitForEvent('popup'),page.locator('#atyrau .source-link').click()]);await popup.waitForLoadState('domcontentloaded');assert(popup.url().startsWith('https://github.com/MOYISEY/atyrau-tour-3d'));assert.equal(await popup.evaluate(()=>opener===null),true);entry.sourceUrl=popup.url();await popup.close();
 await page.locator('#atyrau summary').click();assert.equal(await page.locator('#atyrau details').getAttribute('open'),null);
 await page.locator('#atyrau').screenshot({path:`${shots}/${name}.png`});assert.deepEqual(entry.errors,[]);entry.passed=true;await page.close();
 }report.passed=true;
}catch(error){report.passed=false;report.failure=error.message;process.exitCode=1;}
finally{writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
