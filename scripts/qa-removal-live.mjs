import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { openBrowser } from './browser-config.mjs';
const url = process.argv[2] ?? 'https://moyisey.github.io/bakhtiyar-zikirin/';
const output = process.argv[3] ?? '../portfolio-v7-live-removal.json';
const shots = process.argv[4] ?? 'qa-private/v7-public';
const commit = process.argv[5] ?? 'current';
mkdirSync(shots, { recursive: true });
const report = { checkedAt: new Date().toISOString(), url, commit, scope: 'Six directed public Chromium cases with language/theme pairs and 360/390/768/1165/1440 viewport emulation. Confirm absence, actual CSV bytes, retained sample/navigation/3D. Not a physical-device, Safari or screen-reader check.', cases: [], removedAssets: [] };
const browser = await openBrowser();
try {
  for (const [width, height, language, theme] of [[1165,747,'ru','dark'],[1440,1000,'en','light'],[390,844,'kk','light'],[360,844,'kk','dark'],[768,1024,'ru','light'],[768,1024,'en','dark']]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width <= 768, reducedMotion: 'reduce', acceptDownloads: true });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const entry = { width, height, language, theme, errors: [], retiredImageRequests: [], passed: false };
    report.cases.push(entry);
    page.on('pageerror', error => entry.errors.push(error.message));
    page.on('request', request => { if (/projects\/(?:krasnaya-nit-board|rowline-desktop|rowline-mobile)\.png/.test(request.url())) entry.retiredImageRequests.push(request.url()); });
    try {
      await page.addInitScript(p => localStorage.setItem('portfolio.preferences.v1', JSON.stringify(p)), { language, theme });
      const response = await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      assert.equal(response.status(), 200);
      await page.locator('.preferences').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const dictionary = JSON.parse(readFileSync(`src/locales/${language}.json`, 'utf8'));
      assert.equal(await page.locator('html').getAttribute('lang'), language);
      assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
      assert.equal(await page.locator('#hobby, .case-hobby, .rowline-visual, .rowline-scroll, .image-help, #rowline img, #rowline picture, a[href*="krasnaya-nit"], a[href*="rowline-desktop.png"]').count(), 0);
      assert.equal(/Красная нить|Krasnaya Nit/i.test(await page.locator('body').innerText()), false);
      assert.deepEqual(await page.locator('#work > article').evaluateAll(nodes => nodes.map(node => node.id)), ['rowline','atyrau','neuralbrief','artportal']);
      await page.screenshot({ path: `${shots}/${width}-${language}-${theme}-hero.png` });
      await page.locator('#sample-fix').click();
      assert.equal(await page.locator('#sample-sku').innerText(), '00124');
      await page.locator('#language-select').selectOption(language === 'en' ? 'kk' : 'en');
      await page.locator('#language-select').selectOption(language);
      await page.locator('#theme-select').selectOption(theme === 'dark' ? 'light' : 'dark');
      await page.locator('#theme-select').selectOption(theme);
      assert.equal(await page.locator('#sample-sku').innerText(), '00124');
      const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#sample-export').click()]);
      const path = `${shots}/${width}-${language}-${theme}.csv`;
      await download.saveAs(path);
      assert.equal(readFileSync(path, 'utf8'), 'sku,stock\r\n"00124",12\r\n"00125",8\r\n');
      await page.locator('#sample-fix').click();
      assert.equal(await page.locator('#sample-sku').innerText(), '·00124·');
      await page.locator('.sample-case-link').click();
      assert.equal(new URL(page.url()).hash, '#rowline');
      await page.screenshot({ path: `${shots}/${width}-${language}-${theme}-rowline.png` });
      assert.equal(await page.locator('#rowline a[href="https://moyisey.github.io/rowline/"]').count(), 1);
      await page.locator('#rowline summary').click();
      assert.equal(await page.locator('#rowline details').evaluate(node => node.open), true);
      await page.locator('#rowline summary').click();
      await page.locator('.header nav a[href="#approach"]').click();
      await page.locator('#system').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => ['ready','fallback'].includes(document.querySelector('#scene-status').dataset.sceneState), null, { timeout: 20000 });
      entry.sceneState = await page.locator('#scene-status').getAttribute('data-scene-state');
      await page.locator('button[data-layer="logic"]').click();
      assert.equal(await page.locator('#layer-description').innerText(), dictionary['layer.logic']);
      await page.locator('#signal-start').click();
      assert.equal(await page.locator('#signal-status').innerText(), dictionary['signal.3']);
      await page.locator('.footer a[href="#top"]').click();
      assert.equal(new URL(page.url()).hash, '#top');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.equal(await page.locator('.resume-link').count(), 2);
      assert.deepEqual(entry.retiredImageRequests, []);
      assert.deepEqual(entry.errors, []);
      entry.passed = true;
      console.log(`${width} ${language}/${theme}: PASS absence/CSV/anchors/scene`);
    } catch (error) { entry.failure = error.message; console.log(`${width} ${language}/${theme}: FAIL ${error.message.slice(0,220)}`); }
    finally { writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); await context.close(); }
  }
  report.removedAssets = await Promise.all(['krasnaya-nit-board.png','rowline-desktop.png','rowline-mobile.png'].map(async file => {
    const target = new URL(`projects/${file}?removed-check=${commit}`, url).href;
    try { const response = await fetch(target, { signal: AbortSignal.timeout(20000), cache: 'no-store' }); return { file, status: response.status, absent: response.status === 404 }; }
    catch (error) { return { file, failure: error.message, absent: false }; }
  }));
} finally { await browser.close(); }
report.passed = report.cases.every(entry => entry.passed) && report.removedAssets.every(entry => entry.absent);
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ passed: report.passed, cases: report.cases.length, removedAssets: report.removedAssets }, null, 2));
if (!report.passed) process.exitCode = 1;
