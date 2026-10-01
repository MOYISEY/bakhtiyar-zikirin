import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {openBrowser} from './browser-config.mjs';
const url='https://moyisey.github.io/bakhtiyar-zikirin/';const directory='evidence/v2/live-fonts';mkdirSync(directory,{recursive:true});
const browser=await openBrowser({},'webkit');
const record={engine:'webkit',url,browserVersion:browser.version(),checkedAt:new Date().toISOString(),responses:[],requestsFailed:[],console:[]};
try{
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  page.on('console',message=>{if(message.type()==='warning'||message.type()==='error'||/font|woff|decode/i.test(message.text()))record.console.push({type:message.type(),text:message.text()});});
  page.on('response',response=>{if(response.url().includes('.woff'))record.responses.push({url:response.url(),status:response.status()});});
  page.on('requestfailed',request=>{if(request.url().includes('.woff'))record.requestsFailed.push({url:request.url(),error:request.failure()?.errorText});});
  await page.goto(url,{waitUntil:'networkidle',timeout:30000});
  record.fonts=await page.evaluate(async()=>{
    await document.fonts.ready;
    const headingFaces=await document.fonts.load('550 88px "Onest Variable"','Пишу интерфейсы.');
    const details=face=>({family:face.family,weight:face.weight,unicodeRange:face.unicodeRange,status:face.status});
    return {headingWeight:getComputedStyle(document.querySelector('h1')).fontWeight,headingFamily:getComputedStyle(document.querySelector('h1')).fontFamily,faces:[...document.fonts].map(details),headingFaces:headingFaces.map(details),headingFontCheck:document.fonts.check('550 88px "Onest Variable"','Пишу интерфейсы.')};
  });
  assert(record.fonts.headingFontCheck);assert(record.fonts.headingFaces.length>0);assert(record.fonts.headingFaces.every(face=>face.status==='loaded'));assert.deepEqual(record.requestsFailed,[]);record.passed=true;
}catch(error){record.passed=false;record.failure=String(error.stack||error.message).replaceAll(process.cwd(),'[project]');}
finally{await browser.close();}
writeFileSync(`${directory}/webkit.json`,JSON.stringify(record,null,2));console.log(JSON.stringify(record,null,2));if(!record.passed)process.exitCode=1;
