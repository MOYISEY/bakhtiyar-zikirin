import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import {openBrowser} from './browser-config.mjs';
const base=process.argv[2]??'http://127.0.0.1:5202/';
const scope=process.argv[3]??'local',out=`evidence/v11/${scope}-regression.json`;
mkdirSync('evidence/v11/screenshots',{recursive:true});mkdirSync('qa-private/v11/screenshots',{recursive:true});
const report={at:new Date().toISOString(),scope,base,method:'Directed native Chromium browser clicks, DOM checks, visual screenshots and selected axe checks. 1366×768 laptop and 390×844 touch emulation, three languages and both themes. No physical-phone, Safari or screen-reader claim.',cases:[],links:[],passed:false};
const browser=await openBrowser();report.browserVersion=browser.version();
const save=()=>writeFileSync(out,JSON.stringify(report,null,2));
const ids=['helio','keyform','poslesvet','framepack','shapecheck','rowline','atyrau','neuralbrief','artportal'];
try {
 for(const width of [1366,390])for(const lang of ['ru','kk','en'])for(const theme of ['light','dark']) {
  if(scope==='live'&&theme!==(width===1366?'light':'dark'))continue;
  const e={width,lang,theme,checks:[],errors:[],passed:false};report.cases.push(e);save();
  const context=await browser.newContext({viewport:{width,height:width===1366?768:844},hasTouch:width===390,reducedMotion:'reduce',acceptDownloads:true,colorScheme:theme});
  const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',error=>e.errors.push(error.message));
  try {
   await page.addInitScript(p=>localStorage.setItem('portfolio.preferences.v1',JSON.stringify(p)),{language:lang,theme});
   await page.goto(base,{waitUntil:'load',timeout:45000});await page.evaluate(()=>document.fonts.ready);
   assert.equal(await page.locator('html').getAttribute('lang'),lang);assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
   const dictionary=JSON.parse(readFileSync(`src/locales/${lang}.json`,'utf8'));
   assert.deepEqual(await page.locator('[data-i18n]').evaluateAll((nodes,d)=>nodes.filter(n=>n.textContent!==d[n.dataset.i18n]).map(n=>n.dataset.i18n),dictionary),[]);
   assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'),theme==='light'?'#f3f0e8':'#121b1a');
   assert.equal(await page.locator('img,.hero-name,.featured-gallery,#other-projects,#hobby,a[href*="krasnaya-nit"]').count(),0);
   assert.equal(await page.locator('h1').evaluate(el=>getComputedStyle(el).webkitTextStrokeWidth),'0px');
   assert.equal(await page.locator('h1').evaluate(el=>getComputedStyle(el).animationName),'none');
   e.checks.push('v9 palette and static normal name; no v10 gallery, photos or removed personal case; complete short-copy bindings');
   for(const link of await page.locator('.header nav a').all()) {assert(await link.isVisible());await link.click();assert.equal(new URL(page.url()).hash,await link.getAttribute('href'));}
   assert.equal(await page.locator('#work > article').count(),9);
   for(const id of ids) {
    const card=page.locator('#'+id);assert(await card.isVisible());
    const d=card.locator('.restoration-details');await d.locator(':scope>summary').click();assert.equal(await d.evaluate(el=>el.open),true);
    await d.locator('[data-close-details]').click();assert.equal(await d.evaluate(el=>el.open),false);assert.equal(await d.locator('summary').evaluate(el=>el===document.activeElement),true);
    const link=card.locator(':scope>.project-actions>a');
    if(id!=='neuralbrief') {assert.equal(await link.count(),1);assert.equal(await link.getAttribute('target'),'_blank');assert.match(await link.getAttribute('rel'),/noopener/);
     await link.scrollIntoViewIfNeeded();assert(await link.evaluate(el=>{const b=el.getBoundingClientRect(),hit=document.elementFromPoint(b.x+b.width/2,b.y+b.height/2);return hit===el||el.contains(hit);}));}
    else assert.equal(await card.locator('a').count(),0);
   }
   e.checks.push('four visible navigation links; all nine project rows immediately available; every disclosure opens/closes with focus restored; primary links uncovered');
   await page.locator('#sample-fix').click();assert.equal(await page.locator('#sample-sku').innerText(),'00124');await page.locator('#sample-fix').click();assert.equal(await page.locator('#sample-sku').innerText(),'·00124·');
   const [csv]=await Promise.all([page.waitForEvent('download'),page.locator('#sample-export').click()]);const csvPath=await csv.path();assert(readFileSync(csvPath,'utf8').includes('00124'));assert(!readFileSync(csvPath,'utf8').includes(',6'));
   e.checks.push('restored hero Rowline trim/undo and actual CSV download');
   await page.locator('#theme-select').selectOption(theme==='light'?'dark':'light');await page.locator('#theme-select').selectOption(theme);
   await page.locator('#language-select').selectOption(lang==='en'?'ru':'en');await page.locator('#language-select').selectOption(lang);
   await page.reload({waitUntil:'load'});assert.equal(await page.locator('html').getAttribute('lang'),lang);assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
   await page.locator('#theme-select').selectOption('system');assert.equal(await page.locator('html').getAttribute('data-theme'),theme);await page.locator('#theme-select').selectOption(theme);
   e.checks.push('all native selectors change; preferences survive reload; system theme follows media');
   const name=`${scope}-${width}-${lang}-${theme}`;
   await page.evaluate(()=>scrollTo(0,0));
   await page.screenshot({path:`qa-private/v11/screenshots/${name}-hero.png`});
   if((width===1366&&lang==='ru')||(width===390&&lang==='kk'&&theme==='dark')||(width===390&&lang==='en'&&theme==='light'))await page.screenshot({path:`evidence/v11/screenshots/${name}-hero.png`});
   await page.locator('#work').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:`qa-private/v11/screenshots/${name}-projects.png`});
   if((width===1366&&lang==='ru')||(width===390&&lang==='kk'&&theme==='dark')||(width===390&&lang==='en'&&theme==='light'))await page.screenshot({path:`evidence/v11/screenshots/${name}-projects.png`});
   e.overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert(e.overflow<=1);
   if(lang==='ru') {const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();e.axe=axe.violations.map(x=>({id:x.id,impact:x.impact,nodes:x.nodes.length}));assert.deepEqual(e.axe,[]);}
   if(width===1366&&lang==='ru'&&theme==='light') {
    for(const id of ['helio','keyform','poslesvet']) {const details=page.locator('#'+id+' .restoration-details');await details.locator('summary').click();
     const locators=[page.locator('#'+id+' > .project-actions > a'),details.locator(`a[href="https://github.com/MOYISEY/${id}"]`)];
     for(const link of locators) {
      const href=await link.getAttribute('href');let status=null;
      const onResponse=r=>{if(r.request().isNavigationRequest()&&r.url().replace(/\/$/,'')===href.replace(/\/$/,''))status=r.status();};
      context.on('response',onResponse);
      const [popup]=await Promise.all([context.waitForEvent('page'),link.click()]);
      await popup.waitForLoadState('domcontentloaded',{timeout:45000});context.off('response',onResponse);
      assert(popup.url().startsWith(href));assert(status!==null&&status<400,href+' response must be captured');
      report.links.push({href,landed:popup.url(),status,clicked:true});await popup.close();
     }
     await details.locator('[data-close-details]').click();
    }
    const [pdf]=await Promise.all([page.waitForEvent('download'),page.locator('.hero .resume-link').click()]);assert.equal(readFileSync(await pdf.path()).subarray(0,5).toString(),'%PDF-');e.checks.push('actual primary demo/code popup visits for Helio, Keyform and Poslesvet; real public PDF download');
    if(scope==='live') {
     for(const id of ['framepack','shapecheck','rowline','atyrau','artportal']) {
      const link=page.locator('#'+id+' > .project-actions > a'),href=await link.getAttribute('href');let status=null;
      const onResponse=r=>{if(r.request().isNavigationRequest()&&r.url().replace(/\/$/,'')===href.replace(/\/$/,''))status=r.status();};
      context.on('response',onResponse);const [popup]=await Promise.all([context.waitForEvent('page'),link.click()]);
      await popup.waitForLoadState('domcontentloaded',{timeout:45000});context.off('response',onResponse);
      assert(popup.url().startsWith(href));assert(status!==null&&status<400,href+' response must be captured');
      report.links.push({href,landed:popup.url(),status,clicked:true});await popup.close();
     }
     const windows=page.locator('#poslesvet a[href$="Poslesvet-Windows-x64.zip"]');
     assert.equal(await windows.getAttribute('href'),'https://github.com/MOYISEY/poslesvet/releases/download/v0.2.0/Poslesvet-Windows-x64.zip');
     const response=await context.request.head(await windows.getAttribute('href'));assert.equal(response.status(),200);
     report.windowsRelease={href:await windows.getAttribute('href'),method:'HEAD',status:response.status()};
     e.checks.push('all remaining primary project destinations clicked; unchanged Windows release URL returns HTTP 200');
    }
   }
   await page.locator('#system').scrollIntoViewIfNeeded();await page.waitForFunction(()=>['ready','fallback'].includes(document.querySelector('#scene-status').dataset.sceneState),null,{timeout:20000});
   for(const mode of ['solid','wire','explode']) {await page.locator(`[data-mode=${mode}]`).click();assert.equal(await page.locator('#system').getAttribute('data-view'),mode);}
   await page.locator('button[data-layer=logic]').click();assert.equal(await page.locator('#layer-description').innerText(),dictionary['layer.logic']);await page.locator('#signal-start').click();assert.equal(await page.locator('#signal-status').innerText(),dictionary['signal.3']);
   e.sceneState=await page.locator('#scene-status').getAttribute('data-scene-state');e.checks.push('visible approach diagram loads; mode/layer/request controls respond with reduced motion');
   assert.deepEqual(e.errors,[]);e.passed=true;
  }catch(error){e.failure=error.message;}finally{await context.close();save();}
 }
 report.passed=report.cases.every(c=>c.passed);save();console.log(JSON.stringify({scope,passed:report.passed,cases:report.cases.length,failed:report.cases.filter(c=>!c.passed).map(c=>({width:c.width,lang:c.lang,theme:c.theme,failure:c.failure})),links:report.links.length}));
 if(!report.passed)process.exitCode=1;
}finally{await browser.close();}
