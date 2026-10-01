import { strict as assert } from 'node:assert';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { openBrowser } from './browser-config.mjs';

const target = 'https://moyisey.github.io/bakhtiyar-zikirin/';
const browser = await openBrowser();
const report = { target, createdAt: new Date().toISOString(), results: [], errors: [], badResponses: [], requestFailures: [] };
const hash = value => createHash('sha256').update(value).digest('hex');
const ready = page => page.waitForFunction(() => document.querySelector('#scene-viewport')?.classList.contains('is-ready'));
async function check(name, run) {
  try { report.results.push({ name, pass: true, detail: await run() }); }
  catch (error) { report.results.push({ name, pass: false, error: error.message }); }
}
function monitor(page) {
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) report.badResponses.push({ url: response.url(), status: response.status() }); });
  page.on('requestfailed', request => report.requestFailures.push({ url: request.url(), failure: request.failure() }));
}
for (const width of [1440, 390, 320]) {
  await check(`live responsive and axe ${width}px`, async () => {
    const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 844 }, deviceScaleFactor: 1, isMobile: width !== 1440, hasTouch: width !== 1440, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage(); monitor(page);
      const response = await page.goto(target, { waitUntil: 'networkidle' }); await ready(page); await page.waitForTimeout(200);
      assert.equal(response.status(), 200);
      assert.equal(await page.title(), 'Бахтияр Зикирин — веб-разработчик');
      const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, clipped: [...document.querySelectorAll('h1,h2,h3,h4,p,a,button,summary')].filter(element => { const r = element.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1); }).map(element => element.textContent.trim()), fonts: document.fonts.status }));
      await page.screenshot({ path: `evidence/audit3-live-${width}.png`, fullPage: true });
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      const violations = axe.violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) }));
      assert.equal(layout.scrollWidth, width); assert.deepEqual(layout.clipped, []); assert.deepEqual(violations, []);
      return { status: response.status(), title: await page.title(), layout, violations };
    } finally { await context.close(); }
  });
}
await check('live HTML and direct assets match the local deployed build', async () => {
  const context = await browser.newContext();
  try {
    const paths = ['index.html', 'favicon.svg', 'scene-still.png', ...Array.from(readFileSync('docs/index.html', 'utf8').matchAll(/(?:src|href)="\.\/(assets\/[^"#]+)"/g), match => match[1])];
    const results = [];
    for (const path of paths) {
      const response = await context.request.get(new URL(path, target).href); assert.equal(response.status(), 200);
      const remote = await response.body(), local = readFileSync(`docs/${path}`);
      const match = hash(remote) === hash(local); assert(match, `Body mismatch for ${path}`);
      results.push({ path, bytes: remote.length, sha256: hash(remote), match });
    }
    return results;
  } finally { await context.close(); }
});
await check('live no-JavaScript page retains content, links and still scene', async () => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  try {
    const page = await context.newPage(); monitor(page); await page.goto(target, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('#hero-title').textContent(), 'БахтиярЗикирин.');
    assert.equal(await page.locator('.scene-fallback img').isVisible(), true);
    assert.equal(await page.locator('#scene').isVisible(), false);
    assert.equal(await page.locator('.scene-toolbar').isVisible(), false);
    assert.equal(await page.locator('.brief-steps').isVisible(), false);
    await page.locator('.header nav a[href="#contact"]').click(); assert.equal(new URL(page.url()).hash, '#contact');
    await page.locator('summary').click(); assert.equal(await page.locator('details').getAttribute('open'), '');
    const width = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth })); assert.equal(width.innerWidth, width.scrollWidth);
    await page.screenshot({ path: 'evidence/audit3-live-no-js.png', fullPage: true });
    return { fallbackImage: true, contactAnchor: true, nativeDetails: true, width };
  } finally { await context.close(); }
});
await check('live render loop pauses offscreen and with visibility state hidden', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  try {
    await context.addInitScript(() => {
      window.__drawCalls = 0;
      for (const prototype of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
        for (const method of ['drawArrays', 'drawElements', 'drawArraysInstanced', 'drawElementsInstanced']) {
          const original = prototype[method]; if (!original) continue;
          prototype[method] = function (...args) { window.__drawCalls++; return original.apply(this, args); };
        }
      }
    });
    const page = await context.newPage(); monitor(page); await page.goto(target, { waitUntil: 'networkidle' }); await ready(page);
    async function sample() { const before = await page.evaluate(() => window.__drawCalls); await page.waitForTimeout(350); return await page.evaluate(() => window.__drawCalls) - before; }
    const running = await sample(); assert(running > 0);
    await page.locator('#contact').scrollIntoViewIfNeeded(); await page.waitForTimeout(200); const offscreen = await sample(); assert.equal(offscreen, 0);
    await page.locator('#scene').scrollIntoViewIfNeeded(); await page.waitForTimeout(200); const back = await sample(); assert(back > 0);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    const hidden = await sample(); assert.equal(hidden, 0);
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
    const resumed = await sample(); assert(resumed > 0);
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.waitForTimeout(150); const reduced = await sample(); assert.equal(reduced, 0); assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'), 'true');
    return { running, offscreen, back, hidden, resumed, reduced, note: 'Intersection check is actual scroll; visibility state branch is synthetic, not an actual background tab.' };
  } finally { await context.close(); }
});
await check('live two-finger mobile gesture rotates scene', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  try {
    const page = await context.newPage(); monitor(page); await page.goto(target, { waitUntil: 'networkidle' }); await ready(page);
    await page.locator('#scene').scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
    const before = hash(await page.locator('#scene').screenshot()), box = await page.locator('#scene').boundingBox(), cdp = await context.newCDPSession(page);
    const x = Math.round(box.x + box.width / 2), y = Math.round(box.y + box.height / 2);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 40, y: y - 15, id: 1 }, { x: x + 40, y: y + 15, id: 2 }] });
    for (let index = 1; index <= 8; index++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 40 + index * 5, y: y - 15, id: 1 }, { x: x + 40 + index * 5, y: y + 15, id: 2 }] }); await page.waitForTimeout(30); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(200);
    const after = hash(await page.locator('#scene').screenshot()); assert.notEqual(before, after); return { changed: true, before, after, note: 'Chromium CDP mobile touch emulation, not a physical phone.' };
  } finally { await context.close(); }
});
await browser.close();
writeFileSync('evidence/audit3-live-extra.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.results.some(result => !result.pass) || report.errors.length || report.badResponses.length || report.requestFailures.length) process.exitCode = 1;
