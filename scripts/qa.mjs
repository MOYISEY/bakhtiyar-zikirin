import { strict as assert } from 'node:assert';
import { mkdirSync,writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { openBrowser } from './browser-config.mjs';
const target=process.argv[2]??'http://127.0.0.1:5173/';
const prefix=process.argv[3]??'regression';
const browser=await openBrowser();
const results=[];
const hash=b=>createHash('sha256').update(b).digest('hex');
const settle=p=>p.waitForFunction(()=>document.querySelector('#scene-viewport')?.classList.contains('is-ready'));
mkdirSync('evidence',{recursive:true});
async function check(name,fn){try{const detail=await fn();results.push({name,pass:true,detail});}catch(error){results.push({name,pass:false,error:error.message});}}
const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
await context.addInitScript(()=>{window.__pageshows=[];window.addEventListener('pageshow',e=>window.__pageshows.push({persisted:e.persisted,time:performance.now()}));});
const page=await context.newPage();
const errors=[];const badResponses=[];
page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&r.url().startsWith(target))badResponses.push({url:r.url(),status:r.status()});});
await page.goto(target,{waitUntil:'networkidle'});await settle(page);await page.waitForTimeout(150);
await check('reduced motion starts paused and remains still',async()=>{
 assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'true');
 const a=hash(await page.locator('#scene').screenshot());await page.waitForTimeout(250);const b=hash(await page.locator('#scene').screenshot());assert.equal(a,b);return {canvasHash:a};
});
await check('all 3 scene modes produce different renders and selected states',async()=>{
 const hashes=[];
 for(const mode of ['solid','wire','explode']){await page.locator(`[data-mode="${mode}"]`).click();await page.waitForTimeout(100);assert.equal(await page.locator(`[data-mode="${mode}"]`).getAttribute('aria-pressed'),'true');hashes.push(hash(await page.locator('#scene').screenshot()));}
 assert.equal(new Set(hashes).size,3);await page.locator('[data-mode="solid"]').click();return hashes;
});
await check('motion toggle starts animation and stops it',async()=>{
 await page.locator('#motion-toggle').click();assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'false');
 const a=hash(await page.locator('#scene').screenshot());await page.waitForTimeout(350);const b=hash(await page.locator('#scene').screenshot());assert.notEqual(a,b);
 await page.locator('#motion-toggle').click();assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'true');return {changed:a!==b};
});
await check('keyboard scene controls and Home reset',async()=>{
 await page.locator('#scene').focus();await page.keyboard.press('Home');await page.waitForTimeout(100);const original=hash(await page.locator('#scene').screenshot());await page.keyboard.press('ArrowRight');await page.waitForTimeout(100);const rotated=hash(await page.locator('#scene').screenshot());assert.notEqual(original,rotated);await page.keyboard.press('Home');await page.waitForTimeout(100);assert.equal(hash(await page.locator('#scene').screenshot()),original);return {rotated:true,reset:true};
});
await check('mouse drag rotates scene',async()=>{
 const box=await page.locator('#scene').boundingBox();const before=hash(await page.locator('#scene').screenshot());await page.mouse.move(box.x+box.width*.6,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.6+90,box.y+box.height*.5-25,{steps:8});await page.mouse.up();await page.waitForTimeout(100);assert.notEqual(hash(await page.locator('#scene').screenshot()),before);return {dragged:true};
});
await check('hero project link and all 3 header anchors',async()=>{
 await page.locator('.primary-link').click();assert.equal(new URL(page.url()).hash,'#work');
 for(const id of ['work','about','contact']){await page.locator(`.header nav a[href="#${id}"]`).click();assert.equal(new URL(page.url()).hash,`#${id}`);const visible=await page.locator(`#${id} h2`).evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.top<innerHeight&&r.bottom>0;});assert(visible,`Target heading ${id} is outside viewport`);}
 return {anchors:['work','about','contact']};
});
await check('all 3 NeuralBrief stages update content',async()=>{
 const content=[];for(const step of ['0','1','2']){await page.locator(`[data-step="${step}"]`).click();assert.equal(await page.locator(`[data-step="${step}"]`).getAttribute('aria-pressed'),'true');content.push(await page.locator('#brief-content h4').innerText());}assert.equal(new Set(content).size,3);return content;
});
await check('project details open and close',async()=>{
 await page.locator('summary').click();assert.equal(await page.locator('details').getAttribute('open'),'');await page.locator('summary').click();assert.equal(await page.locator('details').getAttribute('open'),null);return true;
});
await check('all external links open the specified GitHub destinations',async()=>{
 const links=page.locator('a[target="_blank"]');const visited=[];
 for(let i=0;i<await links.count();i++){const link=links.nth(i);const expected=await link.getAttribute('href');const [popup]=await Promise.all([page.waitForEvent('popup'),link.click()]);await popup.waitForURL(expected,{waitUntil:'domcontentloaded',timeout:25000});visited.push({expected,actual:popup.url(),title:await popup.title()});assert(popup.url().startsWith(expected));await popup.close();}
 return visited;
});
await check('footer top and both logo links',async()=>{
 await page.locator('.back-top').click();assert.equal(new URL(page.url()).hash,'#top');for(const selector of ['.header .wordmark','.footer .wordmark']){await page.locator(selector).click();assert.equal(new URL(page.url()).hash,'#top');}return true;
});
await check('skip link keyboard focus reaches main',async()=>{await page.goto(target);await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement?.className),'skip-link');await page.keyboard.press('Enter');assert.equal(new URL(page.url()).hash,'#main');return {focused:await page.evaluate(()=>document.activeElement?.id)};});
await settle(page);await page.waitForTimeout(100);
await check('actual browser back navigation restores a usable scene',async()=>{
 await page.goto(new URL('favicon.svg',target).href,{waitUntil:'load'});await page.goBack({waitUntil:'load'});await settle(page);
 const events=await page.evaluate(()=>window.__pageshows);await page.locator('[data-mode="wire"]').click();assert.equal(await page.locator('[data-mode="wire"]').getAttribute('aria-pressed'),'true');
 return {pageshowEvents:events,bfcacheObserved:events.some(e=>e.persisted),note:'Actual navigation; bfcache only covered if persisted is true.'};
});
await check('synthetic persisted lifecycle suspends and resumes without disposing',async()=>{
 if(await page.locator('#motion-toggle').getAttribute('aria-pressed')==='true')await page.locator('#motion-toggle').click();
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
 const a=hash(await page.locator('#scene').screenshot());await page.waitForTimeout(250);const b=hash(await page.locator('#scene').screenshot());assert.equal(a,b);
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));await page.waitForTimeout(350);const c=hash(await page.locator('#scene').screenshot());assert.notEqual(c,b);
 await page.locator('#motion-toggle').click();return {suspended:true,resumed:true,note:'Synthetic events verify the handler branch, not actual browser cache admission.'};
});
await check('WebGL context loss produces accessible fallback',async()=>{
 await page.locator('#scene').evaluate(canvas=>canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context')?.loseContext());await page.waitForTimeout(150);
 assert.equal(await page.locator('#scene').isVisible(),false);assert.equal(await page.locator('#scene').getAttribute('tabindex'),null);assert.equal(await page.locator('#motion-toggle').isDisabled(),true);return {status:await page.locator('#scene-status').textContent()};
});
await context.close();
await check('WebGL unavailable initialization fallback',async()=>{
 const ctx=await browser.newContext();await ctx.addInitScript(()=>{const old=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:old.call(this,type,...args);};});const p=await ctx.newPage();await p.goto(target,{waitUntil:'networkidle'});await p.waitForFunction(()=>document.querySelector('#scene-status')?.textContent?.includes('статичный'));
 assert.equal(await p.locator('#scene').isVisible(),false);assert.equal(await p.locator('#scene').getAttribute('tabindex'),null);assert.equal(await p.locator('#motion-toggle').isDisabled(),true);await p.screenshot({path:`evidence/${prefix}-fallback.png`});await ctx.close();return true;
});
await check('blocked optional scene module fallback',async()=>{
 const ctx=await browser.newContext();await ctx.route(/(?:\/src\/scene\.ts|\/assets\/scene-[^/]+\.js)/,route=>route.abort());const p=await ctx.newPage();await p.goto(target,{waitUntil:'networkidle'});await p.waitForFunction(()=>document.querySelector('#scene-status')?.textContent?.includes('статичный'));
 assert.equal(await p.locator('#scene').isVisible(),false);assert.equal(await p.locator('#scene').getAttribute('tabindex'),null);assert.equal(await p.locator('#motion-toggle').isDisabled(),true);await ctx.close();return true;
});
await check('one-finger mobile swipe over canvas scrolls page',async()=>{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce'});const p=await ctx.newPage();await p.goto(target,{waitUntil:'networkidle'});await settle(p);const cdp=await ctx.newCDPSession(p);const box=await p.locator('#scene').boundingBox();const x=Math.round(box.x+box.width*.5),y=Math.min(780,Math.round(box.y+box.height*.7));const before=await p.evaluate(()=>scrollY);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*28}]});await p.waitForTimeout(25);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(300);const after=await p.evaluate(()=>scrollY);assert(after-before>100);await p.screenshot({path:`evidence/${prefix}-mobile-swipe.png`});await ctx.close();return {before,after,delta:after-before};
});
await browser.close();
const report={target,prefix,generatedAt:new Date().toISOString(),errors,badResponses,results};writeFileSync(`evidence/${prefix}-qa.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(results.some(r=>!r.pass)||errors.length||badResponses.length)process.exitCode=1;
