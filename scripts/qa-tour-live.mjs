import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {openBrowser} from './browser-config.mjs';
mkdirSync('evidence/v5',{recursive:true});
const report={url:'https://moyisey.github.io/atyrau-tour-3d/tour_v2/',sourceCommit:'a9e5082851339df47c064fc153032d3e91a113fb',checkedAt:new Date().toISOString(),scope:'Existing static project deployed without code changes; functional smoke check, not a new accessibility/security audit of the historical tour.',scenarios:[]};
const browser=await openBrowser();
try{for(const [name,width,height]of[['desktop',1440,1000],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height},hasTouch:name==='mobile'});page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(40000);
 const e={name,errors:[],actions:[]};report.scenarios.push(e);page.on('pageerror',error=>e.errors.push(error.message));
 const response=await page.goto(report.url,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);
 await page.waitForFunction(()=>typeof viewer!=='undefined'&&viewer?.isLoaded(),null,{timeout:40000});assert.equal(await page.locator('.pnlm-error-msg').isVisible(),false);e.actions.push('Panorama/WebGL loaded');
 for(const floor of [2,3,4,1]){await page.locator('.ftab').nth(floor-1).click();await page.waitForFunction(f=>currentFloor===f&&viewer.isLoaded(),floor,{timeout:40000});assert.equal(await page.locator('.ftab.active').count(),1);e.actions.push(`Floor ${floor}`);}
 await page.locator('.thumb').nth(1).click();await page.waitForFunction(()=>currentScene!==FLOOR_START[1]&&viewer.isLoaded(),null,{timeout:40000});e.actions.push('Thumbnail navigation');
 const before=await page.evaluate(()=>currentScene);await page.keyboard.press('ArrowRight');await page.waitForFunction(s=>currentScene!==s&&viewer.isLoaded(),before,{timeout:40000});e.actions.push('Keyboard next scene');
 await page.locator('#btnZoomIn').click();await page.locator('#btnZoomOut').click();await page.locator('#btnAutorot').click();await page.locator('#btnAutorot').click();await page.locator('#btnThumbToggle').click();await page.locator('#btnThumbToggle').click();e.actions.push('Zoom, rotation, thumbnails toggles');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:`evidence/v5/tour-${name}.png`});assert.deepEqual(e.errors,[]);e.passed=true;await page.close();
}report.passed=true;}catch(error){report.passed=false;report.failure=error.message;process.exitCode=1;}finally{writeFileSync('evidence/v5/tour-live.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
