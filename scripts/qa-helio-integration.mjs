import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { openBrowser } from './browser-config.mjs';
const url = process.argv[2] ?? 'http://127.0.0.1:5191/';
const output = process.argv[3] ?? 'evidence/v9/integration-local.json';
const shots = process.argv[4] ?? 'qa-private/v9-local';
const openDemos = process.argv[5] === 'demos';
mkdirSync(shots, { recursive: true });
const report = { checkedAt: new Date().toISOString(), url, scope: 'Targeted compact Helio integration alongside existing tools: language/theme pairs at1440/390, long KK at360/768 and one320 text200 probe. Directed browser commands; no full external app audit, physical phone or Safari claim.', cases: [], demos: [] };
const configurations = [];
for (const width of [1440,390]) for (const language of ['ru','kk','en']) for (const theme of ['light','dark']) configurations.push([width,language,theme,100]);
for (const width of [360,768]) for (const theme of ['light','dark']) configurations.push([width,'kk',theme,100]);
configurations.push([320,'kk','dark',200]);
const browser = await openBrowser();
try {
  for (const [width,language,theme,text] of configurations) {
    const context = await browser.newContext({ viewport: { width, height: width >= 768 ? 1000 : 844 }, reducedMotion: 'reduce', hasTouch: width < 768, acceptDownloads: true });
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    const entry = { width,language,theme,text,errors:[],passed:false }; report.cases.push(entry);
    page.on('pageerror', error => entry.errors.push(error.message));
    try {
      await page.addInitScript(p=>localStorage.setItem('portfolio.preferences.v1',JSON.stringify(p)),{language,theme});
      const response = await page.goto(url,{waitUntil:'load',timeout:30000}); assert.equal(response.status(),200);
      await page.locator('.preferences').waitFor(); await page.evaluate(()=>document.fonts.ready);
      if (text===200) await page.evaluate(()=>document.documentElement.style.fontSize='200%');
      assert.equal(await page.locator('html').getAttribute('lang'),language); assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
      const dictionary=JSON.parse(readFileSync(`src/locales/${language}.json`,'utf8'));
      const mismatches=await page.evaluate(d=>[...document.querySelectorAll('#framepack [data-i18n],#shapecheck [data-i18n],#helio [data-i18n]')].filter(node=>node.textContent!==d[node.dataset.i18n]).map(node=>node.dataset.i18n),dictionary);
      assert.deepEqual(mismatches,[]);
      assert.deepEqual(await page.locator('#work > article').evaluateAll(nodes=>nodes.map(node=>node.id)),['rowline','framepack','shapecheck','helio','atyrau','neuralbrief','artportal']);
      assert.deepEqual(await page.locator('.case-number').allTextContents(),['01','02','03','04','05','06','07']);
      assert.equal(await page.locator('#framepack img,#shapecheck img,#helio img,#rowline img,#hobby,.case-hobby,.image-help,a[href*="krasnaya-nit"]').count(),0);
      for (const [id,qa] of [['framepack','qa/QA.md'],['shapecheck','docs/LIVE-QA.md'],['helio','evidence/live-map-qa.md']]) {
        for (const expected of [`https://moyisey.github.io/${id}/`,`https://github.com/MOYISEY/${id}`,`https://github.com/MOYISEY/${id}/blob/main/${qa}`]) {
          const link=page.locator(`#${id} a[href="${expected}"]`); assert.equal(await link.count(),1); assert.equal(await link.getAttribute('target'),'_blank'); assert((await link.getAttribute('rel')).includes('noopener'));
        }
        await page.locator(`#${id}`).scrollIntoViewIfNeeded();
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        const overflow=await page.locator(`#${id}`).evaluate(root=>[...root.querySelectorAll('*')].filter(node=>!node.classList.contains('sr-only')).filter(node=>{const b=node.getBoundingClientRect();return b.width>0&&(b.left < -1||b.right>innerWidth+1);}).map(node=>({tag:node.tagName,class:node.className})));
        assert.deepEqual(overflow,[]);
        await page.screenshot({path:`${shots}/${width}-${language}-${theme}-${text}-${id}.png`});
      }
      if (text===100) {
        await page.locator('#sample-fix').click();assert.equal(await page.locator('#sample-sku').innerText(),'00124');
        await page.locator('#language-select').selectOption(language==='en'?'ru':'en');await page.locator('#language-select').selectOption(language);
        await page.locator('#theme-select').selectOption(theme==='dark'?'light':'dark');await page.locator('#theme-select').selectOption(theme);
        assert.equal(await page.locator('#sample-sku').innerText(),'00124');
        await page.locator('#sample-fix').click();assert.equal(await page.locator('#sample-sku').innerText(),'·00124·');
        if(width===390&&language==='ru'&&theme==='light') {
          const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#sample-export').click()]);const path=`${shots}/unchanged-sample.csv`;await download.saveAs(path);assert.equal(readFileSync(path,'utf8'),'sku,stock\r\n" 00124 ",12\r\n"00125",8\r\n');entry.csvDownloaded=true;
        }
        const axe=await new AxeBuilder({page}).include('#framepack').include('#shapecheck').include('#helio').withTags(['wcag2a','wcag2aa','wcag21aa','best-practice']).analyze();
        entry.axe={violations:axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})),incomplete:axe.incomplete.map(v=>({id:v.id,nodes:v.nodes.length}))};assert.deepEqual(entry.axe.violations,[]);
      }
      assert.deepEqual(entry.errors,[]);entry.passed=true;console.log(`${width} ${language}/${theme} text${text}: PASS`);
    } catch (error) {entry.failure=error.message;console.log(`${width} ${language}/${theme} text${text}: FAIL ${error.message.slice(0,250)}`);}
    finally {writeFileSync(output,JSON.stringify(report,null,2));await context.close();}
  }
  if (openDemos) {
    const context=await browser.newContext();const page=await context.newPage();await page.goto(url,{waitUntil:'load',timeout:30000});
    for (const id of ['framepack','shapecheck','helio']) {
      const entry={id,errors:[],passed:false};report.demos.push(entry);
      try {
        const [popup]=await Promise.all([page.waitForEvent('popup'),page.locator(`#${id} .primary-link`).click()]);popup.on('pageerror',e=>entry.errors.push(e.message));
        await popup.waitForLoadState('load',{timeout:30000});entry.url=popup.url();entry.title=await popup.title();entry.openerIsNull=await popup.evaluate(()=>opener===null);entry.visibleButtons=await popup.locator('button').allTextContents();
        assert.equal(entry.url,`https://moyisey.github.io/${id}/`);assert(entry.title.toLowerCase().includes(id));assert.equal(entry.openerIsNull,true);assert(entry.visibleButtons.length>2);assert.deepEqual(entry.errors,[]);entry.passed=true;console.log(`${id} actual popup: PASS`);await popup.close();
      }catch(error){entry.failure=error.message;console.log(`${id} actual popup: FAIL ${error.message.slice(0,250)}`);}
    }await context.close();
  }
}finally{await browser.close();}
report.passed=report.cases.every(x=>x.passed)&&report.demos.every(x=>x.passed);writeFileSync(output,JSON.stringify(report,null,2));if(!report.passed)process.exitCode=1;
