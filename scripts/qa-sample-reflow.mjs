import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { openBrowser } from './browser-config.mjs';
const url = process.argv[2] ?? 'http://127.0.0.1:5191/';
const out = process.argv[3] ?? 'evidence/v6/sample-reflow.json';
const shots = process.argv[4] ?? 'qa-private/v6-reflow';
const engine = process.argv[5] ?? 'chromium';
mkdirSync(shots, { recursive: true });
mkdirSync('qa-private/downloads', { recursive: true });
const report = { url, engine, checkedAt: new Date().toISOString(), scope: '360/390/768 CSS px, RU/KK/EN, light/dark. Touch emulation for compact widths, fixed-sample actual download bytes, repeated edits/exports/preferences. Not a physical-device test.', cases: [] };
const browser = await openBrowser({}, engine);
report.browserVersion = browser.version();
try {
  for (const width of [360, 390, 768]) for (const language of ['ru', 'kk', 'en']) for (const theme of ['light', 'dark']) {
    const height = width === 768 ? 1024 : 844;
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: engine !== 'firefox', reducedMotion: 'reduce', acceptDownloads: true });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const entry = { width, language, theme, errors: [], checks: [], passed: false };
    report.cases.push(entry);
    page.on('pageerror', error => entry.errors.push(error.message));
    try {
      await page.addInitScript(p => localStorage.setItem('portfolio.preferences.v1', JSON.stringify(p)), { language, theme });
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      await page.evaluate(() => document.fonts.ready);
      const dictionary = JSON.parse(readFileSync(`src/locales/${language}.json`, 'utf8'));
      assert.equal(await page.locator('html').getAttribute('lang'), language);
      assert.equal(await page.locator('#system').evaluate(el => el.closest('section').id), 'approach');
      assert.deepEqual(await page.locator('#work > article').evaluateAll(elements => elements.map(el => el.id)), ['rowline', 'framepack', 'shapecheck', 'atyrau', 'neuralbrief', 'artportal']);
      assert.equal(await page.locator('#hobby, .case-hobby, #rowline img, #rowline picture, .image-help, a[href*="krasnaya-nit"], a[href*="rowline-desktop.png"]').count(), 0);
      const overflow = await page.evaluate(() => [...document.querySelectorAll('main *, .header *')].filter(el => {
        if (el.closest('.scene-viewport') || el.closest('.sr-only') || getComputedStyle(el).display === 'none') return false;
        const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1);
      }).map(el => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right })));
      assert.deepEqual(overflow, []);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      entry.checks.push('No horizontal overflow; 3D in Approach; working projects lead');
      await page.screenshot({ path: `${shots}/${width}-${language}-${theme}-hero.png` });
      await page.locator('.sample').scrollIntoViewIfNeeded();
      // Tap rather than hover. Repeated edit/undo keeps state and original leading zeros.
      for (let iteration = 0; iteration < 3; iteration++) {
        await page.locator('#sample-fix').tap();
        assert.equal(await page.locator('#sample-sku').innerText(), '00124');
        assert.equal(await page.locator('#sample-fix').getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator('#sample-status').innerText(), dictionary['sample.statusFixed']);
        await page.locator('#sample-fix').tap();
        assert.equal(await page.locator('#sample-sku').innerText(), '·00124·');
        assert.equal(await page.locator('#sample-fix').getAttribute('aria-pressed'), 'false');
      }
      await page.locator('#sample-fix').tap();
      await page.locator('#language-select').selectOption(language === 'en' ? 'ru' : 'en');
      await page.locator('#theme-select').selectOption(theme === 'dark' ? 'light' : 'dark');
      await page.locator('#language-select').selectOption(language);
      await page.locator('#theme-select').selectOption(theme);
      assert.equal(await page.locator('#sample-sku').innerText(), '00124');
      assert.equal(await page.locator('#sample-fix span').first().innerText(), dictionary['sample.undo']);
      assert.equal(await page.locator('#sample-trim-label').innerText(), dictionary['sample.valid']);
      for (let iteration = 0; iteration < 2; iteration++) {
        const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#sample-export').tap()]);
        assert.equal(download.suggestedFilename(), 'rowline-synthetic-example.csv');
        const path = `qa-private/downloads/${engine}-${width}-${language}-${theme}-${iteration}-sample.csv`;
        await download.saveAs(path);
        assert.equal(readFileSync(path, 'utf8'), 'sku,stock\r\n"00124",12\r\n"00125",8\r\n');
        assert.equal(await page.locator('#sample-status').innerText(), dictionary['sample.statusExport']);
      }
      await page.locator('#sample-fix').tap();
      const [originalDownload] = await Promise.all([page.waitForEvent('download'), page.locator('#sample-export').tap()]);
      const originalPath = `qa-private/downloads/${engine}-${width}-${language}-${theme}-original.csv`;
      await originalDownload.saveAs(originalPath);
      assert.equal(readFileSync(originalPath, 'utf8'), 'sku,stock\r\n" 00124 ",12\r\n"00125",8\r\n');
      entry.checks.push('3 tap edit/undo cycles; state survives locale/theme; 2 identical corrected downloads and 1 original download; invalid row excluded');
      await page.locator('.sample').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${shots}/${width}-${language}-${theme}-sample.png` });
      await page.locator('#rowline').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${shots}/${width}-${language}-${theme}-rowline.png` });
      assert.equal(await page.locator('#atyrau img').count(), 0);
      assert.deepEqual(entry.errors, []);
      entry.passed = true;
      console.log(`${width} ${language}/${theme}: PASS`);
    } catch (error) { entry.failure = error.message; console.log(`${width} ${language}/${theme}: FAIL ${error.message.slice(0, 200)}`); }
    finally { writeFileSync(out, JSON.stringify(report, null, 2) + '\n'); await context.close(); }
  }
} finally { await browser.close(); }
report.passed = report.cases.every(e => e.passed);
writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
if (!report.passed) process.exitCode = 1;
