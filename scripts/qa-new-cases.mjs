import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import {chromium} from 'playwright';

const base=process.argv[2]??'http://127.0.0.1:5202/';
const scope=process.argv[3]??'local';
const out='evidence/new-cases-2026-10-21';
const shots=out+'/screenshots';
mkdirSync(shots,{recursive:true});
const ids=['scanproof','quotelens'];
const projects=JSON.parse(readFileSync('src/content/projects.json','utf8'));
const report={at:new Date().toISOString(),base,scope,method:'Installed Edge, desktop 1366×768 and touch mobile 390×844 emulation with reduced motion. RU/KK/EN content, real image decode, native gallery keyboard actions, link targets, catalog filtering, overflow and selected axe WCAG checks. No physical device or Safari claim.',checks:[],cases:[],passed:false};
const ok=(name,value)=>{assert(value,name);report.checks.push(name)};
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 for(const [label,width,height,theme] of [['desktop',1366,768,'light'],['mobile',390,844,'dark']]){
  for(const lang of ['ru','kk','en']){
   const context=await browser.newContext({viewport:{width,height},isMobile:label==='mobile',hasTouch:label==='mobile',reducedMotion:'reduce',colorScheme:theme});
   await context.addInitScript(p=>localStorage.setItem('portfolio.preferences.v1',JSON.stringify(p)),{language:lang,theme});
   const page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const entry={label,lang,theme,cases:[],passed:false};report.cases.push(entry);
   try{
    let response=await page.goto(new URL('projects/?lang='+lang,base).href,{waitUntil:'load'});
    ok(label+' '+lang+' catalog HTTP',response.status()===200);
    await page.waitForFunction(()=>document.body.dataset.siteReady==='true');
    await page.evaluate(()=>document.fonts.ready);
    ok(label+' '+lang+' catalog has 11 cards',await page.locator('.visual-card').count()===projects.length);
    ok(label+' '+lang+' catalog count',await page.locator('#filter-count').innerText()===String(projects.length));
    await page.locator('[data-filter="tools"]').click();
    ok(label+' '+lang+' tools filter has 5',await page.locator('.visual-card:visible').count()===5);
    for(const id of ids){
     const card=page.locator('#'+id),project=projects.find(x=>x.id===id);
     ok(label+' '+lang+' '+id+' card visible',await card.isVisible());
     ok(label+' '+lang+' '+id+' demo link',await card.locator('.project-preview').getAttribute('href')===project.demo);
     await card.scrollIntoViewIfNeeded();
     await card.locator('img').evaluate(async img=>{img.loading='eager';await img.decode()});
     ok(label+' '+lang+' '+id+' card image decoded',await card.locator('img').evaluate(img=>img.naturalWidth>0));
    }
    ok(label+' '+lang+' catalog fits width',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    if(lang==='ru'){
     await page.locator('#scanproof').scrollIntoViewIfNeeded();
     await page.screenshot({path:shots+'/'+scope+'-'+label+'-ru-catalog.png'});
     const axe=await new AxeBuilder({page}).include('#scanproof').include('#quotelens').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
     ok(label+' catalog cards axe clean',axe.violations.length===0);
    }
    for(const id of ids){
     const project=projects.find(x=>x.id===id),dictionary=JSON.parse(readFileSync('src/locales/'+lang+'.json','utf8'));
     response=await page.goto(new URL('projects/'+id+'.html?lang='+lang,base).href,{waitUntil:'load'});
     ok(label+' '+lang+' '+id+' case HTTP',response.status()===200);
     await page.waitForFunction(()=>document.body.dataset.siteReady==='true');
     await page.evaluate(()=>document.fonts.ready);
     ok(label+' '+lang+' '+id+' heading and locale',await page.locator('#project-title').innerText()===project.title&&await page.locator('html').getAttribute('lang')===lang);
     ok(label+' '+lang+' '+id+' captured on 21 October',await page.locator('.capture-note').innerText()===dictionary[id+'.captured']);
     const hrefs=await page.locator('.case-actions a').evaluateAll(els=>els.map(x=>x.href));
     ok(label+' '+lang+' '+id+' links',hrefs.includes(project.demo)&&hrefs.includes(project.code)&&hrefs.includes(project.qa));
     ok(label+' '+lang+' '+id+' two real screenshots',await page.locator('.case-media').count()===2);
     const mismatch=await page.locator('[data-i18n]').evaluateAll((els,d)=>els.filter(e=>e.textContent!==d[e.dataset.i18n]).map(e=>e.dataset.i18n),dictionary);
     ok(label+' '+lang+' '+id+' translated content',mismatch.length===0);
     for(const img of await page.locator('.case-media img').all()){
      await img.scrollIntoViewIfNeeded();await img.evaluate(async e=>{e.loading='eager';await e.decode()});
      ok(label+' '+lang+' '+id+' image decoded',await img.evaluate(e=>e.naturalWidth>0));
     }
     ok(label+' '+lang+' '+id+' fits width',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
     if(lang==='ru'){
      await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({path:shots+'/'+scope+'-'+label+'-'+id+'.png'});
      const axe=await new AxeBuilder({page}).include('.project-page').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      ok(label+' '+id+' case axe clean',axe.violations.length===0);
     }
     await page.locator('.gallery-open').first().click();
     ok(label+' '+lang+' '+id+' gallery open',await page.locator('#gallery-dialog').evaluate(e=>e.open));
     await page.keyboard.press('ArrowRight');
     ok(label+' '+lang+' '+id+' gallery next',await page.locator('#gallery-caption').innerText()===dictionary['v12.'+id+'.shot2']);
     await page.locator('#gallery-image').evaluate(e=>e.decode());
     await page.keyboard.press('Escape');
     await page.waitForFunction(()=>!document.querySelector('#gallery-dialog').open&&document.querySelector('.gallery-open')===document.activeElement);
     ok(label+' '+lang+' '+id+' gallery Escape focus',await page.locator('.gallery-open').first().evaluate(e=>e===document.activeElement));
     entry.cases.push(id);
    }
    ok(label+' '+lang+' no runtime errors',errors.length===0);
    entry.passed=true;
    console.log('PASS '+label+' '+lang);
   }catch(e){entry.failure=e.message;entry.errors=errors;console.error('FAIL '+label+' '+lang+': '+e.message)}
   finally{await context.close()}
  }
 }
 report.passed=report.cases.every(x=>x.passed);
}finally{
 await browser.close();
 writeFileSync(out+'/'+scope+'-new-cases.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,cases:report.cases.length,failures:report.cases.filter(x=>!x.passed)}));
}
if(!report.passed)process.exitCode=1;
