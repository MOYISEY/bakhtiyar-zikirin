import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { openBrowser } from './browser-config.mjs';
const url = process.argv[2] ?? 'http://127.0.0.1:5191/';
const output = process.argv[3] ?? 'evidence/v6/navigation-return.json';
const report = { url, checkedAt: new Date().toISOString(), cases: [] };
const browser = await openBrowser();
try {
  for (const [width, height] of [[1440, 1000], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
    const entry = { width, states: [], passed: false };
    report.cases.push(entry);
    const state = async name => entry.states.push({ name, ...(await page.evaluate(() => ({ scrollY, current: [...document.querySelectorAll('.header nav a[aria-current]')].map(el => el.hash) }))) });
    try {
      await state('initial');
      await page.locator('.header nav a[href="#approach"]').click();
      await page.waitForTimeout(250);
      await state('approach');
      await page.locator('.back-top').click();
      await page.waitForTimeout(700);
      await state('top-after-700ms');
      assert.deepEqual(entry.states.at(-1).current, []);
      entry.passed = true;
      console.log(`${width} navigation return: PASS`);
    } catch (error) { entry.failure = error.message; console.log(`${width} navigation return: FAIL ${error.message}`); }
    finally { writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); await context.close(); }
  }
} finally { await browser.close(); }
report.passed = report.cases.every(e => e.passed);
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
if (!report.passed) process.exitCode = 1;
