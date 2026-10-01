import { strict as assert } from 'node:assert';
import { writeFileSync } from 'node:fs';
import { openBrowser } from './browser-config.mjs';

const target = 'https://moyisey.github.io/bakhtiyar-zikirin/';
const browser = await openBrowser();
const report = { target, createdAt: new Date().toISOString(), results: [] };
async function check(name, run) { try { report.results.push({ name, pass: true, detail: await run() }); } catch (error) { report.results.push({ name, pass: false, error: error.message }); } }
await check('isolated all external links open their expected destinations', async () => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 1000 } });
  try {
    const page = await context.newPage(); await page.goto(target, { waitUntil: 'networkidle' });
    const links = page.locator('a[target="_blank"]'), results = [];
    for (let index = 0; index < await links.count(); index++) {
      const link = links.nth(index), expected = await link.getAttribute('href');
      const popupPromise = context.waitForEvent('page'); await link.click(); const popup = await popupPromise;
      const failures = [], errors = [];
      popup.on('requestfailed', request => failures.push({ url: request.url(), failure: request.failure() }));
      popup.on('pageerror', error => errors.push(error.message));
      let navigationError;
      try { await popup.waitForURL(expected, { waitUntil: 'domcontentloaded', timeout: 25000 }); }
      catch (error) { navigationError = error.message; }
      const detail = { expected, actual: popup.url(), title: await popup.title(), failures, errors, navigationError, screenshot: `evidence/audit3-live-link-${index}.png` };
      results.push(detail);
      writeFileSync('evidence/audit3-live-link-diagnostics.json', JSON.stringify(results, null, 2));
      try { await popup.screenshot({ path: detail.screenshot, timeout: 1500 }); }
      catch (error) { detail.screenshotError = error.message; }
      await popup.close();
      try {
        const response = await context.request.get(expected, { timeout: 15000 });
        const html = await response.text();
        detail.publicHttp = { status: response.status(), url: response.url(), title: html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] };
      } catch (error) { detail.publicHttpError = error.message; }
      writeFileSync('evidence/audit3-live-link-diagnostics.json', JSON.stringify(results, null, 2));
    }
    writeFileSync('evidence/audit3-live-link-diagnostics.json', JSON.stringify(results, null, 2));
    assert(results.every(item => item.actual.startsWith(item.expected) && item.publicHttp?.status === 200), 'See saved link diagnostics for navigation destination and public HTTP results');
    return results;
  } finally { await context.close(); }
});
await check('isolated actual browser back restores scene with commit wait', async () => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  try {
    await context.addInitScript(() => { window.__pageshows = []; window.addEventListener('pageshow', event => window.__pageshows.push({ persisted: event.persisted, time: performance.now() })); });
    const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(target, { waitUntil: 'networkidle' }); await page.waitForFunction(() => document.querySelector('#scene-viewport')?.classList.contains('is-ready'));
    await page.goto(new URL('favicon.svg', target).href, { waitUntil: 'load' });
    await page.goBack({ waitUntil: 'commit', timeout: 15000 });
    await page.waitForFunction(() => document.querySelector('#scene-viewport')?.classList.contains('is-ready'));
    await page.locator('[data-mode="wire"]').click(); assert.equal(await page.locator('[data-mode="wire"]').getAttribute('aria-pressed'), 'true');
    const events = await page.evaluate(() => window.__pageshows); assert.deepEqual(errors, []);
    return { url: page.url(), pageshowEvents: events, bfcacheObserved: events.some(event => event.persisted), errors, note: 'Actual back navigation; browser cache admission is claimed only if persisted=true.' };
  } finally { await context.close(); }
});
await browser.close();
writeFileSync('evidence/audit3-live-recheck.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.results.some(result => !result.pass)) process.exitCode = 1;
