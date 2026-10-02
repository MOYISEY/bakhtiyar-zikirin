import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import {openBrowser} from './browser-config.mjs';
const url=process.argv[2]??'http://127.0.0.1:5191/';
const out=process.argv[3]??'evidence/v5/matrix-local.json';
const shots=process.argv[4]??'evidence/v5/screenshots';
const engine=process.argv[5]??'chromium';
mkdirSync(shots,{recursive:true});
const report={url,engine,checkedAt:new Date().toISOString(),scope:'Six language/theme combinations in desktop and mobile viewport emulation. Directed browser interaction, DOM assertions, axe WCAG 2 AA; no physical phone, Safari or screen-reader claim.',scenarios:[]};
const browser=await openBrowser({},engine);report.browserVersion=browser.version();
const save=()=>writeFileSync(out,JSON.stringify(report,null,2));
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
const timeout=(promise,ms,label)=>Promise.race([promise,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error(label+' timed out')),ms);timer.unref();})]);
try {
 for(const language of ['ru','kk','en'])for(const theme of ['light','dark'])for(const [device,width,height]of [['desktop',1440,1000],['mobile',390,844]]){
  const entry={language,theme,device,width,height,actions:[],errors:[],passed:false};report.scenarios.push(entry);save();
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',colorScheme:theme,hasTouch:device==='mobile'});const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(30000);
  page.on('pageerror',e=>entry.errors.push(e.message));
  try{
   await page.addInitScript(p=>localStorage.setItem('portfolio.preferences.v1',JSON.stringify(p)),{language,theme});
   await page.goto(url,{waitUntil:'domcontentloaded'});await page.locator('.preferences').waitFor();
   assert.equal(await page.locator('html').getAttribute('lang'),language);assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
   const d=JSON.parse(readFileSync(`src/locales/${language}.json`,'utf8'));
   assert.equal(await page.locator('#hobby, .case-hobby, .rowline-visual, .rowline-scroll, .image-help').count(),0);
   assert.equal(await page.locator('#rowline img, #rowline picture, a[href*="krasnaya-nit"], a[href*="rowline-desktop.png"]').count(),0);
   assert.equal(await page.locator('#work > article').count(),4);entry.actions.push('Personal case and large Rowline image/full-image link absent; four retained projects');
   assert.equal(await page.title(),d.s207); // title key from the annotated document
   const mismatch=await page.evaluate(dictionary=>{
    const bad=[];document.querySelectorAll('[data-i18n-attrs]').forEach(e=>JSON.parse(e.dataset.i18nAttrs).forEach(({attr,key})=>{if(e.id!=='motion-toggle'&&e.getAttribute(attr)!==dictionary[key])bad.push({key,attr,actual:e.getAttribute(attr)});}));
    document.querySelectorAll('[data-i18n]').forEach(e=>{if(e.textContent!==dictionary[e.dataset.i18n])bad.push({key:e.dataset.i18n,actual:e.textContent});});return bad;
   },d);assert.deepEqual(mismatch,[]);entry.actions.push('Initial language, title, aria/alt/meta labels and first-paint theme');
   await page.keyboard.press('Tab');assert.equal(await page.locator('.skip-link').evaluate(e=>e===document.activeElement),true);await page.keyboard.press('Enter');entry.actions.push('Keyboard skip link');
   await page.locator('#language-select').selectOption(language==='en'?'ru':'en');await page.locator('#language-select').selectOption(language);
   await page.locator('#theme-select').selectOption(theme==='dark'?'light':'dark');await page.locator('#theme-select').selectOption(theme);
   assert.deepEqual(await page.evaluate(()=>Object.keys(JSON.parse(localStorage.getItem('portfolio.preferences.v1'))).sort()),['language','theme']);
   assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),['portfolio.preferences.v1']);entry.actions.push('Native language/theme changes; only preferences persisted');
   await page.locator('#system').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelector('#scene-status').dataset.sceneState==='ready'||document.querySelector('#scene-status').dataset.sceneState==='fallback',null,{timeout:20000});
   for(const mode of ['solid','wire','explode']){await page.locator(`[data-mode=${mode}]`).click();assert.equal(await page.locator('#system').getAttribute('data-view'),mode);assert.equal(await page.locator(`[data-mode=${mode}]`).getAttribute('aria-pressed'),'true');}
   for(const layer of ['logic','data','interface']){await page.locator(`button[data-layer=${layer}]`).click();assert.equal(await page.locator('#layer-description').innerText(),d[layer==='interface'?'s028':'layer.'+layer]);}
   await page.locator('#signal-start').click();assert.equal(await page.locator('#signal-status').innerText(),d['signal.3']);assert.equal(await page.locator('#signal-start').isEnabled(),true);
   const canvas=page.locator('#scene');
   if(await canvas.isVisible()){
    assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'true');
    await canvas.focus();await page.keyboard.press('ArrowLeft');await page.keyboard.press('Home');await page.locator('#scene-reset').click();
    const before=hash(await canvas.screenshot());await page.locator('#theme-select').selectOption(theme==='dark'?'light':'dark');const after=hash(await canvas.screenshot());assert.notEqual(before,after);await page.locator('#theme-select').selectOption(theme);
    await page.locator('#motion-toggle').click();assert.equal(await page.locator('#motion-toggle').getAttribute('aria-label'),d.s200);await page.locator('#motion-toggle').click();assert.equal(await page.locator('#motion-toggle').getAttribute('aria-label'),d['scene.resume']);
    entry.actions.push('3D keyboard, reset, pause/resume, paused texture repaint');
   }
   entry.sceneState=await page.locator('#scene-status').getAttribute('data-scene-state');entry.actions.push('All modes/layers; reduced-motion complete signal');
   await page.screenshot({path:`${shots}/${language}-${theme}-${device}-scene.png`});
   await page.locator('#neuralbrief').scrollIntoViewIfNeeded();
   for(const step of [1,2,0]){await page.locator(`[data-step="${step}"]`).click();assert.equal(await page.locator('#brief-output-text').innerText(),d[step===0?'s089':'brief.output'+step]);}
   await page.locator('[data-step="1"]').click();await page.locator('#language-select').selectOption(language==='en'?'kk':'en');await page.locator('#language-select').selectOption(language);assert.equal(await page.locator('#brief-output-text').innerText(),d['brief.output1']);await page.locator('[data-step="0"]').click();entry.actions.push('Three brief steps; selected step retained through language changes');
   for(const selector of ['#rowline summary','#neuralbrief summary','#atyrau summary','#artportal summary']){await page.locator(selector).click();assert.equal(await page.locator(selector).evaluate(e=>e.parentElement.open),true);}
   assert.equal(await page.locator('#atyrau img').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
   entry.axe=await timeout(new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','best-practice']).analyze(),45000,'axe');
   entry.axe={violations:entry.axe.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,failureSummary:n.failureSummary}))})),passes:entry.axe.passes.length,incomplete:entry.axe.incomplete.map(v=>({id:v.id,nodes:v.nodes.length}))};
   assert.deepEqual(entry.axe.violations,[]);entry.actions.push('All four disclosures opened; axe and horizontal overflow');
   for(const selector of ['#rowline summary','#neuralbrief summary','#atyrau summary','#artportal summary'])await page.locator(selector).click();
   await page.locator('#neuralbrief .brief-demo').scrollIntoViewIfNeeded();await page.screenshot({path:`${shots}/${language}-${theme}-${device}-brief.png`});
   await page.locator('#contact').scrollIntoViewIfNeeded();await page.screenshot({path:`${shots}/${language}-${theme}-${device}-contact.png`});
   await page.locator('.header').scrollIntoViewIfNeeded();await page.screenshot({path:`${shots}/${language}-${theme}-${device}-hero.png`});
   await page.locator('#language-select').focus();entry.focusStyle=await page.locator('#language-select').evaluate(e=>{const s=getComputedStyle(e);return{outline:s.outline,color:s.color,background:s.backgroundColor,colorScheme:s.colorScheme};});
   await page.reload({waitUntil:'domcontentloaded'});await page.locator('.preferences').waitFor();assert.equal(await page.locator('#language-select').inputValue(),language);assert.equal(await page.locator('#theme-select').inputValue(),theme);
   assert.deepEqual(entry.errors,[]);entry.passed=true;console.log(`${language}/${theme}/${device}: PASS (${entry.sceneState}, axe ${entry.axe.passes} passes)`);
  }catch(e){entry.failure=e.message;console.log(`${language}/${theme}/${device}: FAIL ${e.message.slice(0,350)}`);}
  finally{save();await context.close();}
 }
 report.passed=report.scenarios.every(e=>e.passed);if(!report.passed)process.exitCode=1;
}finally{save();await browser.close();}
