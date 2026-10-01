import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {openBrowser} from './browser-config.mjs';
const url=process.argv[2]??'http://127.0.0.1:5191/';const output=process.argv[3]??'evidence/v5/links-local.json';const shots=process.argv[4]??'evidence/v5/link-screenshots';mkdirSync(shots,{recursive:true});mkdirSync('qa-private/downloads',{recursive:true});
const report={url,checkedAt:new Date().toISOString(),scope:'Portfolio integration: real PDF download bytes, mailto href and click interception, actual demo/code popups, no email sent and no repeat claim of external product unit/E2E tests.',scenarios:[]};const browser=await openBrowser();
try{for(const [name,width,height,language,theme]of[['desktop',1440,1000,'en','light'],['mobile',390,844,'kk','dark']]){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',colorScheme:theme,acceptDownloads:true});const page=await context.newPage();page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(40000);const e={name,language,theme,links:[],errors:[],passed:false};report.scenarios.push(e);page.on('pageerror',error=>e.errors.push(error.message));
 try{
  await page.goto(url,{waitUntil:'domcontentloaded'});await page.locator('.preferences').waitFor();await page.locator('#language-select').selectOption(language);await page.locator('#theme-select').selectOption(theme);
  assert.equal(await page.locator('.resume-link').getAttribute('href'),'./files/Zikirin_Bakhtiyar_Developer_Resume_Public.pdf');assert.equal(await page.locator('.email-link').getAttribute('href'),'mailto:b.zikirin@gmail.com');
  assert.equal(await page.locator('#hobby').count(),1);assert.equal(await page.locator('#work > article.case').count(),4);
  const [download]=await Promise.all([page.waitForEvent('download',{timeout:20000}),page.locator('.resume-link').click()]);const target=`qa-private/downloads/${name}-${download.suggestedFilename()}`;await download.saveAs(target);const bytes=readFileSync(target);assert(bytes.subarray(0,5).toString()==='%PDF-');const sha256=createHash('sha256').update(bytes).digest('hex');assert.equal(sha256,'566051b1e65dbfdf17982f0466948e2556157887f512b5db4d7bb248272060cb');e.download={filename:download.suggestedFilename(),sizeBytes:bytes.length,sha256,passed:true};
  await page.locator('.email-link').evaluate(el=>el.addEventListener('click',event=>{window.__mailtoClicked=el.href;event.preventDefault();},{once:true}));await page.locator('.email-link').click();assert.equal(await page.evaluate(()=>window.__mailtoClicked),'mailto:b.zikirin@gmail.com');e.mailtoClickIntercepted=true;
  await page.locator('#contact').scrollIntoViewIfNeeded();await page.screenshot({path:`${shots}/${name}-contact.png`});await page.locator('#hobby').scrollIntoViewIfNeeded();await page.screenshot({path:`${shots}/${name}-hobby.png`});
  e.internalLinks=[];const internal=page.locator('a[href^="#"]:not(.skip-link)');for(let i=0;i<await internal.count();i++){const link=internal.nth(i),href=await link.getAttribute('href');assert.equal(await page.locator(href).count(),1);await link.click();assert.equal(new URL(page.url()).hash,href);e.internalLinks.push({href,clicked:true});}
  const external=await page.locator('a[href^="https://"]').evaluateAll(links=>[...new Set(links.map(link=>link.href))]);
  for(const expected of external){const selector=`a[href="${expected}"]`;
   if(expected.endsWith('/QA.md')&&!await page.locator(selector).first().isVisible())await page.locator('#rowline summary').click();
   const [popup]=await Promise.all([page.waitForEvent('popup',{timeout:20000}),page.locator(selector).first().click()]);popup.setDefaultNavigationTimeout(40000);await popup.waitForLoadState('domcontentloaded',{timeout:40000});assert(popup.url().startsWith(expected));assert.equal(await popup.evaluate(()=>opener===null),true);const title=await popup.title();
   if(new URL(expected).hostname==='moyisey.github.io'&&new URL(expected).pathname==='/rowline/'){await popup.getByRole('button',{name:'Открыть пример',exact:true}).click({timeout:30000});await popup.waitForFunction(()=>document.body.innerText.includes('Искусственный пример загружен'),null,{timeout:20000});}
   if(expected.includes('tour_v2'))await popup.waitForFunction(()=>typeof viewer!=='undefined'&&viewer?.isLoaded(),null,{timeout:40000});
   if(expected.includes('github.io/krasnaya-nit')){await popup.waitForFunction(()=>document.body.innerText.includes('Красная нить'),null,{timeout:30000});e.hobbyLoaded=true;}
   e.links.push({selector,expected,actual:popup.url(),title,openerIsNull:true});await popup.close();
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(e.errors,[]);e.passed=true;console.log(name+': PASS download/mailto/Rowline/Atyrau/hobby/code');
 }catch(error){e.failure=error.message;console.log(name+': FAIL '+error.message.slice(0,250));}finally{writeFileSync(output,JSON.stringify(report,null,2));await context.close();}
}report.passed=report.scenarios.every(e=>e.passed);if(!report.passed)process.exitCode=1;}finally{writeFileSync(output,JSON.stringify(report,null,2));await browser.close();}
