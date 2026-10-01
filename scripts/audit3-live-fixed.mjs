import { strict as assert } from 'node:assert';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import { openBrowser } from './browser-config.mjs';
const target = 'https://moyisey.github.io/bakhtiyar-zikirin/';
const browser = await openBrowser();
const report = { target, createdAt: new Date().toISOString(), results: [], errors: [], badResponses: [] };
const hash = value => createHash('sha256').update(value).digest('hex');
async function check(name, run) { try { report.results.push({ name, pass: true, detail: await run() }); } catch (error) { report.results.push({ name, pass: false, error: error.message }); } }
function monitor(page) { page.on('pageerror', error => report.errors.push(error.message)); page.on('response', response => { if (response.status() >= 400) report.badResponses.push({ url: response.url(), status: response.status() }); }); }
await check('published fixed build matches local HTML and JavaScript files', async () => {
  const context = await browser.newContext();
  try {
    const response = await context.request.get(target); assert.equal(response.status(), 200);
    const html = await response.body(); assert.equal(hash(html), hash(readFileSync('docs/index.html')));
    const scripts = [...Array.from(html.toString().matchAll(/(?:src|href)="\.\/(assets\/[^"#]+\.js)"/g), match => match[1])];
    for (const path of scripts) {
      const scriptResponse = await context.request.get(new URL(path, target).href); assert.equal(scriptResponse.status(), 200);
      const body = await scriptResponse.body(); assert.equal(hash(body), hash(readFileSync(`docs/${path}`)));
      scripts.push(...Array.from(body.toString().matchAll(/\.\/(scene-[\w-]+\.js)/g), match => `assets/${match[1]}`).filter(path => !scripts.includes(path)));
    }
    return { htmlSha256: hash(html), scripts };
  } finally { await context.close(); }
});
await check('fixed mobile two-finger rotation and one-finger scroll coexist', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  try {
    const page = await context.newPage(); monitor(page); await page.goto(target, { waitUntil: 'networkidle' }); await page.waitForFunction(() => document.querySelector('#scene-viewport')?.classList.contains('is-ready'));
    await page.locator('#scene').scrollIntoViewIfNeeded(); await page.waitForTimeout(200); const before = hash(await page.locator('#scene').screenshot());
    const box = await page.locator('#scene').boundingBox(), cdp = await context.newCDPSession(page), x = Math.round(box.x + box.width / 2), y = Math.round(box.y + box.height / 2);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 40, y: y - 15, id: 1 }, { x: x + 40, y: y + 15, id: 2 }] });
    for (let index = 1; index <= 8; index++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 40 + index * 5, y: y - 15, id: 1 }, { x: x + 40 + index * 5, y: y + 15, id: 2 }] }); await page.waitForTimeout(30); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(200);
    const after = hash(await page.locator('#scene').screenshot()); assert.notEqual(before, after);
    const scrollBefore = await page.evaluate(() => scrollY), oneBox = await page.locator('#scene').boundingBox(), oneY = Math.round(oneBox.y + oneBox.height * .65);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: oneY }] });
    for (let index = 1; index <= 8; index++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: oneY - index * 28 }] }); await page.waitForTimeout(25); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(300);
    const scrollAfter = await page.evaluate(() => scrollY); assert(scrollAfter - scrollBefore > 100);
    await page.screenshot({ path: 'evidence/audit3-live-fixed-mobile.png' });
    return { twoFingerRotation: { before, after, changed: true }, oneFingerScroll: { before: scrollBefore, after: scrollAfter, delta: scrollAfter - scrollBefore } };
  } finally { await context.close(); }
});
await check('normal-motion header navigation reaches each target after scroll settles', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
  try {
    const page = await context.newPage(); monitor(page); await page.goto(target, { waitUntil: 'networkidle' });
    const results = [];
    async function waitForHeading(id) {
      await page.waitForFunction(id => { const box = document.querySelector(`#${id} h2`).getBoundingClientRect(); return box.top >= 0 && box.top < innerHeight && box.bottom > 0; }, id, { timeout: 10000 });
      await page.waitForTimeout(300);
      return page.evaluate(id => ({ hash: location.hash, scrollY, headingTop: document.querySelector(`#${id} h2`).getBoundingClientRect().top }), id);
    }
    for (const id of ['work', 'about', 'contact']) {
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await page.locator(`.header nav a[href="#${id}"]`).click();
      const detail = await waitForHeading(id); assert.equal(detail.hash, `#${id}`); results.push({ flow: 'actual visible header from page top', id, ...detail });
    }
    for (const id of ['about', 'contact']) {
      await page.evaluate(() => scrollTo({ top: document.querySelector('#work').offsetTop + 100, behavior: 'instant' }));
      await page.locator(`.header nav a[href="#${id}"]`).click();
      const detail = await waitForHeading(id); assert.equal(detail.hash, `#${id}`); results.push({ flow: 'locator autoscroll from lower work section', id, ...detail });
    }
    await page.screenshot({ path: 'evidence/audit3-live-normal-motion-contact.png' });
    return results;
  } finally { await context.close(); }
});
await check('fixed fallback explains unavailable 3D and stays accessible at 320px', async () => {
  const context = await browser.newContext({ viewport: { width: 320, height: 844 }, reducedMotion: 'reduce' });
  try {
    await context.addInitScript(() => { const original = HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type.includes('webgl') ? null : original.call(this, type, ...args); }; });
    const page = await context.newPage(); await page.goto(target, { waitUntil: 'networkidle' }); await page.waitForFunction(() => document.querySelector('#scene-status')?.textContent?.includes('3D не запустилось'));
    assert.equal(await page.locator('#scene').isVisible(), false); assert.equal(await page.locator('#scene').getAttribute('tabindex'), null);
    assert.equal(await page.locator('#motion-toggle').isDisabled(), true); assert.equal(await page.locator('.scene-fallback img').isVisible(), true);
    const layout = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, status: document.querySelector('#scene-status').textContent })); assert.equal(layout.width, layout.scrollWidth);
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze(); assert.deepEqual(axe.violations, []);
    await page.screenshot({ path: 'evidence/audit3-live-fixed-fallback-320.png', fullPage: true });
    return { layout, axeViolations: [], hiddenCanvas: true, disabledControls: true };
  } finally { await context.close(); }
});
await browser.close();
writeFileSync('evidence/audit3-live-fixed.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.results.some(result => !result.pass) || report.errors.length || report.badResponses.length) process.exitCode = 1;
