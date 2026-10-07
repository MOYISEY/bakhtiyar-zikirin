import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { openBrowser } from './browser-config.mjs';
const base=process.argv[2]??'http://127.0.0.1:4331/bakhtiyar-zikirin/';
const label=process.argv[3]??'local';
const onlyRepro=process.argv.includes('--repro-only');
const out=`qa-private/rail-focus/${label}`;mkdirSync(out,{recursive:true});
const results=[];
const browser=await openBrowser({args:['--mute-audio']});
const focusedBounds=()=>{
 const active=document.activeElement,rail=document.querySelector('#project-rail'),a=active.getBoundingClientRect(),r=rail.getBoundingClientRect();
 return {id:active.closest('.visual-card')?.id,text:active.textContent?.trim(),width:a.width,visible:Math.max(0,Math.min(a.right,r.right)-Math.max(a.left,r.left)),left:a.left,right:a.right,railLeft:r.left,railRight:r.right,scrollLeft:rail.scrollLeft,scrollY};
};
try{
 for(const width of onlyRepro?[1600]:[320,390,1600])for(const theme of onlyRepro?['light']:['light','dark'])for(const motion of onlyRepro?['reduce']:['reduce','no-preference']){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:motion,colorScheme:theme});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(theme=>localStorage.setItem('portfolio.preferences.v1',JSON.stringify({language:'ru',theme})),theme);
  await page.goto(base+'?lang=ru');await page.evaluate(()=>document.fonts.ready);
  const rail=page.locator('#project-rail');await rail.scrollIntoViewIfNeeded();await rail.focus();await page.keyboard.press('Home');await page.waitForTimeout(600);
  for(let n=0;n<14;n++)await page.keyboard.press('Tab');
  await page.waitForTimeout(1000);const reproduced=await page.evaluate(focusedBounds);
  await page.screenshot({path:`${out}/${width}-${theme}-${motion}-framepack.png`});
  results.push({width,theme,motion,reproduced});writeFileSync(`${out}/checks.json`,JSON.stringify({results},null,2));
  assert.equal(reproduced.id,'framepack');assert.match(reproduced.text,/Framepack/);
  assert(reproduced.visible>=reproduced.width-2,`Framepack clipped: ${JSON.stringify(reproduced)}`);
  if(!onlyRepro){
   await rail.focus();await page.keyboard.press('Home');await page.waitForTimeout(600);
   const count=await rail.locator('a[href]').count();
   for(let n=0;n<count;n++){
    await page.keyboard.press('Tab');
    await page.waitForFunction(()=>{const a=document.activeElement,r=document.querySelector('#project-rail');if(!r.contains(a))return false;const b=a.getBoundingClientRect(),v=r.getBoundingClientRect();return b.left>=v.left-2&&b.right<=v.right+2},null,{timeout:2000});
   }
   for(let n=1;n<count;n++){
    await page.keyboard.press('Shift+Tab');
    await page.waitForFunction(()=>{const a=document.activeElement,r=document.querySelector('#project-rail');if(!r.contains(a))return false;const b=a.getBoundingClientRect(),v=r.getBoundingClientRect();return b.left>=v.left-2&&b.right<=v.right+2},null,{timeout:2000});
   }
   // Horizontal correction itself must not move the document vertically.
   await rail.focus();await page.keyboard.press('Home');await page.waitForTimeout(600);const y=await page.evaluate(()=>scrollY);
   await page.locator('#framepack .project-title').evaluate(e=>e.focus({preventScroll:true}));
   await page.waitForTimeout(800);assert.equal(await page.evaluate(()=>scrollY),y);
   assert.equal((await page.evaluate(focusedBounds)).id,'framepack');
   await Promise.all([page.waitForURL('**/projects/framepack.html?lang=ru'),page.keyboard.press('Enter')]);
   assert.equal(errors.length,0);results.at(-1).forwardReverseLinks=count;results.at(-1).enter=true;results.at(-1).verticalStable=true;
  }
  await context.close();
 }
 writeFileSync(`${out}/checks.json`,JSON.stringify({pass:true,results},null,2));console.log(`PASS ${results.length} focus variants`);
}finally{await browser.close()}
