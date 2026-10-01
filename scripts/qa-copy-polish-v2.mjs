import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {openBrowser} from './browser-config.mjs';
const url=process.argv[2]??'http://127.0.0.1:5191/';
const output=process.argv[3]??'evidence/v2/copy-polish-local.json';
const shots=url.startsWith('https:')?'qa-private/copy-polish-live':'evidence/v2/copy-polish-screenshots';mkdirSync(shots,{recursive:true});
const browser=await openBrowser();const report={url,checkedAt:new Date().toISOString(),scope:'Targeted editorial checks only; behavior, CSS and scene are unchanged.',scenarios:[]};
try{
  for(const[device,width,height]of[['desktop',1440,1000],['mobile',390,844]]){
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});const entry={device,width,height,errors:[]};report.scenarios.push(entry);page.on('pageerror',error=>entry.errors.push(error.message));
    await page.goto(url,{waitUntil:'networkidle',timeout:30000});
    await page.waitForFunction(()=>document.querySelector('#scene-viewport')?.classList.contains('is-ready')||document.querySelector('#scene-status')?.textContent.includes('недоступно'));
    const body=await page.locator('body').innerText();assert(!/не подтвержден|не подтверждён|выдуман|Честная граница|Граница доказательств|границами проверки/i.test(body));
    assert.match(body,/Здесь показана схема проекта\. Ссылка на демо не представлена/);assert.match(body,/Учебный проект с открытым кодом\. В этом кейсе — структура данных/);
    for(const id of ['neuralbrief','atyrau','artportal']){await page.locator(`#${id} summary`).click();assert.equal(await page.locator(`#${id} details`).getAttribute('open'),'');}
    assert(!/не подтвержден|не подтверждён|выдуман|Честная граница|Граница доказательств|границами проверки/i.test(await page.locator('body').innerText()));
    assert.equal(await page.locator('#artportal .details-grid h4').last().textContent(),'Статус проекта');
    assert.match(await page.locator('#artportal .details-grid p').last().textContent(),/ссылка на публичное демо не представлена/);
    assert.match(await page.locator('#neuralbrief .visual-footnote').textContent(),/Авторская схема процесса/);
    assert.equal(await page.locator('#atyrau img, #atyrau figure').count(),0);
    assert.match(await page.locator('#artportal .visual-footnote').textContent(),/Схема данных/);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.locator('#artportal').screenshot({path:`${shots}/${device}-artportal.png`});
    await page.locator('#neuralbrief').screenshot({path:`${shots}/${device}-neuralbrief.png`});
    entry.texts={neuralStatus:await page.locator('#neuralbrief .case-status').textContent(),artStatus:await page.locator('#artportal .case-facts div').last().textContent(),artProjectStatus:await page.locator('#artportal .details-grid p').last().textContent(),tourLead:await page.locator('#atyrau .case-lead').textContent()};assert.deepEqual(entry.errors,[]);entry.passed=true;await page.close();
  }
  report.passed=true;
}catch(error){report.passed=false;report.failure=error.message;process.exitCode=1;}
finally{writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
