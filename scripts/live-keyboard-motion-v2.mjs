import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {openBrowser} from './browser-config.mjs';
const url='https://moyisey.github.io/bakhtiyar-zikirin/';const browser=await openBrowser();
const report={url,checkedAt:new Date().toISOString(),actions:[],errors:[]};
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});page.on('pageerror',error=>report.errors.push(error.message));
  await page.goto(url,{waitUntil:'networkidle',timeout:30000});await page.locator('#scene-viewport.is-ready').waitFor();
  await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement?.className),'skip-link');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement?.id),'main');report.actions.push({name:'First Tab reveals skip; Enter moves focus to main'});
  await page.screenshot({path:'evidence/v2/manual-screenshots/desktop-skip-keyboard.png'});
  await page.locator('#signal-start').click();
  for(const number of ['01','02','03','04']){await page.waitForFunction(number=>document.querySelector('#signal-status')?.textContent?.startsWith(number),number,{timeout:2500});report.actions.push({name:'Animated signal stage '+number,status:await page.locator('#signal-status').textContent(),time:new Date().toISOString()});if(number==='02')await page.locator('#system').screenshot({path:'evidence/v2/manual-screenshots/desktop-signal-animation.png'});}
  await page.waitForFunction(()=>!document.querySelector('#signal-start').disabled);assert.equal(await page.locator('#system').getAttribute('data-signal'),null);report.actions.push({name:'Animated signal ends and button is enabled'});
  await page.locator('.hero-index a[href="#atyrau"]').click();await page.locator('#atyrau img').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#atyrau img').complete&&document.querySelector('#atyrau img').naturalWidth===1200);
  await page.locator('.back-top').click();await page.waitForFunction(()=>scrollY===0);await page.screenshot({path:'evidence/v2/manual-screenshots/desktop-final-full.png',fullPage:true});report.actions.push({name:'Complete desktop visual capture after lazy screenshot has loaded'});
  assert.deepEqual(report.errors,[]);report.passed=true;
}catch(error){report.passed=false;report.failure=error.message;throw error;}
finally{writeFileSync('evidence/v2/manual-keyboard-motion.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
