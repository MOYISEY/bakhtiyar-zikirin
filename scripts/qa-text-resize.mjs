import { writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { openBrowser } from './browser-config.mjs';
const url = process.argv[2] ?? 'http://127.0.0.1:5191/';
const output = process.argv[3] ?? 'evidence/v6/text-resize.json';
const shots = process.argv[4] ?? 'qa-private/v6-text-resize';
mkdirSync(shots, { recursive: true });
const report = { url, checkedAt: new Date().toISOString(), scope: '320px CSS viewport with root font size 200%. Text enlargement emulation, not browser zoom or a physical phone. Two-dimensional table scroll remains local to its labelled keyboard-focusable region.', cases: [] };
const browser = await openBrowser();
try {
  for (const language of ['ru', 'kk', 'en']) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 320, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const entry = { language, theme, passed: false };
    report.cases.push(entry);
    try {
      await page.addInitScript(p => localStorage.setItem('portfolio.preferences.v1', JSON.stringify(p)), { language, theme });
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      await page.evaluate(() => document.fonts.ready);
      await page.locator('.sample').scrollIntoViewIfNeeded();
      entry.geometry = await page.evaluate(() => {
        const region = document.querySelector('.sample-table-wrap');
        const cells = [...document.querySelectorAll('.sample-table tbody tr')].map(row => [...row.cells].map(cell => { const r = cell.getBoundingClientRect(); const range = document.createRange(); range.selectNodeContents(cell); const text = range.getBoundingClientRect(); return { cell: { left: r.left, right: r.right }, text: { left: text.left, right: text.right } }; }));
        return { docWidth: document.documentElement.scrollWidth, regionWidth: region.clientWidth, tableWidth: region.scrollWidth, cells, overflow: [...document.querySelectorAll('body *')].filter(el => { if (el.closest('.sample-table-wrap') || el.closest('.scene-viewport') || el.closest('.sr-only')) return false; const r = el.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).map(el => ({ tag: el.tagName, class: typeof el.className === 'string' ? el.className : '', right: el.getBoundingClientRect().right, left: el.getBoundingClientRect().left })) };
      });
      assert(entry.geometry.docWidth <= 320);
      assert(entry.geometry.tableWidth > entry.geometry.regionWidth);
      for (const cells of entry.geometry.cells) for (const cell of cells) assert(cell.text.left >= cell.cell.left - 1 && cell.text.right <= cell.cell.right + 1);
      await page.locator('.sample-table-wrap').focus();
      await page.keyboard.press('ArrowRight');
      await page.waitForFunction(() => document.querySelector('.sample-table-wrap').scrollLeft > 0, null, { timeout: 2000, polling: 50 });
      entry.scrollLeft = await page.locator('.sample-table-wrap').evaluate(el => el.scrollLeft);
      assert(entry.scrollLeft > 0);
      await page.screenshot({ path: `${shots}/${language}-${theme}-200.png` });
      entry.passed = true;
      console.log(`${language}/${theme} 320 text200: PASS`);
    } catch (error) { entry.failure = error.message; console.log(`${language}/${theme} text200: FAIL ${error.message}`); }
    finally { writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); await context.close(); }
  }
} finally { await browser.close(); }
report.passed = report.cases.every(e => e.passed);
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
if (!report.passed) process.exitCode = 1;
