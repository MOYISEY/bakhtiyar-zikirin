import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { openBrowser } from './browser-config.mjs';
const url = process.argv[2] ?? 'http://127.0.0.1:5191/';
const output = process.argv[3] ?? 'evidence/v6/sample-engines.json';
mkdirSync('qa-private/downloads', { recursive: true });
const report = { url, checkedAt: new Date().toISOString(), scope: 'Targeted actual CSV download, undo and language state in Firefox and Playwright WebKit. Not Safari or physical-device testing.', cases: [] };
for (const engine of ['firefox', 'webkit']) {
  const browser = await openBrowser({}, engine);
  try {
    for (const [width, height, language, theme] of [[1440, 1000, 'ru', 'light'], [390, 844, 'kk', 'dark']]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', acceptDownloads: true });
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      const entry = { engine, version: browser.version(), width, language, theme, errors: [], passed: false };
      report.cases.push(entry);
      page.on('pageerror', e => entry.errors.push(e.message));
      try {
        await page.addInitScript(p => localStorage.setItem('portfolio.preferences.v1', JSON.stringify(p)), { language, theme });
        await page.goto(url, { waitUntil: 'load', timeout: 30000 });
        const dictionary = JSON.parse(readFileSync(`src/locales/${language}.json`, 'utf8'));
        await page.locator('#sample-fix').click();
        assert.equal(await page.locator('#sample-sku').innerText(), '00124');
        await page.locator('#language-select').selectOption('en');
        assert.equal(await page.locator('#sample-fix').getAttribute('aria-pressed'), 'true');
        await page.locator('#language-select').selectOption(language);
        assert.equal(await page.locator('#sample-fix span').first().innerText(), dictionary['sample.undo']);
        const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#sample-export').click()]);
        const path = `qa-private/downloads/${engine}-${width}-sample.csv`;
        await download.saveAs(path);
        assert.equal(readFileSync(path, 'utf8'), 'sku,stock\r\n"00124",12\r\n"00125",8\r\n');
        await page.locator('#sample-fix').click();
        assert.equal(await page.locator('#sample-sku').innerText(), '·00124·');
        assert.equal(await page.locator('#sample-fix').getAttribute('aria-pressed'), 'false');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        assert.deepEqual(entry.errors, []);
        entry.passed = true;
        console.log(`${engine} ${width} sample: PASS`);
      } catch (error) { entry.failure = error.message; console.log(`${engine} sample: FAIL ${error.message.slice(0, 200)}`); }
      finally { writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); await context.close(); }
    }
  } finally { await browser.close(); }
}
report.passed = report.cases.every(e => e.passed);
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
if (!report.passed) process.exitCode = 1;
