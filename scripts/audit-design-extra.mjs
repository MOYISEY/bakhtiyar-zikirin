import { openBrowser } from './browser-config.mjs';
import { writeFileSync } from 'node:fs';

const target = process.argv[2] ?? 'http://127.0.0.1:5173/';
const browser = await openBrowser();
const results = { target, createdAt: new Date().toISOString(), keyboard: {}, textResize: {}, mobile: {}, motion: {}, errors: [] };
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
page.on('pageerror', error => results.errors.push(error.message));
await page.addInitScript(() => {
  window.__drawCalls = 0;
  for (const ctor of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!ctor) continue;
    for (const name of ['drawArrays', 'drawElements']) {
      const original = ctor.prototype[name];
      ctor.prototype[name] = function (...args) { window.__drawCalls++; return original.apply(this, args); };
    }
  }
});
await page.goto(target, { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.querySelector('#scene-viewport')?.classList.contains('is-ready'), { timeout: 20000 });
await page.waitForTimeout(250);

const focused = [];
await page.keyboard.press('Tab');
results.keyboard.first = await page.evaluate(() => ({ text: document.activeElement.textContent.trim(), tag: document.activeElement.tagName }));
await page.keyboard.press('Enter');
results.keyboard.skipTarget = await page.evaluate(() => ({ tag: document.activeElement.tagName, id: document.activeElement.id, hash: location.hash }));
await page.goto(target, { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.querySelector('#scene-viewport')?.classList.contains('is-ready'));
for (let index = 0; index < 23; index++) {
  await page.keyboard.press('Tab');
  focused.push(await page.evaluate(() => ({ tag: document.activeElement.tagName, id: document.activeElement.id, text: document.activeElement.textContent?.trim().slice(0, 80), aria: document.activeElement.getAttribute('aria-label'), outline: getComputedStyle(document.activeElement).outlineStyle, viewport: (() => { const r = document.activeElement.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; })() })));
}
results.keyboard.sequence = focused;
await page.locator('#scene').focus();
const beforeArrow = await page.locator('#scene').screenshot();
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(80);
const afterArrow = await page.locator('#scene').screenshot();
results.keyboard.sceneChangedWithArrow = !beforeArrow.equals(afterArrow);
await page.keyboard.press('Home');
await page.waitForTimeout(80);
const afterHome = await page.locator('#scene').screenshot();
results.keyboard.sceneRestoredWithHome = beforeArrow.equals(afterHome);

const readFrames = () => page.evaluate(() => window.__drawCalls);
const stationaryStart = await readFrames();
await page.waitForTimeout(1100);
results.motion.reducedMotionExtraDrawCalls = await readFrames() - stationaryStart;
results.motion.initial = await page.locator('#motion-toggle').evaluate(element => ({ pressed: element.getAttribute('aria-pressed'), label: element.getAttribute('aria-label') }));
await page.locator('#motion-toggle').click();
const resumeStart = await readFrames();
await page.waitForTimeout(1000);
results.motion.resumedDrawCalls = await readFrames() - resumeStart;
await page.locator('#motion-toggle').click();
await page.waitForTimeout(100);
const pauseStart = await readFrames();
await page.waitForTimeout(1000);
results.motion.pausedExtraDrawCalls = await readFrames() - pauseStart;

// Browser text-only zoom emulation: double computed text sizes, preserving layout dimensions.
await page.goto(target, { waitUntil: 'networkidle' });
await page.evaluate(() => {
  const nodes = [...document.querySelectorAll('body *')];
  const sizes = nodes.map(element => [element, parseFloat(getComputedStyle(element).fontSize)]);
  sizes.forEach(([element, size]) => { element.style.fontSize = `${size * 2}px`; });
});
await page.screenshot({ path: 'evidence/design-text-200.png', fullPage: true });
results.textResize = await page.evaluate(() => ({
  viewportWidth: innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  overflows: [...document.querySelectorAll('h1,h2,h3,h4,button,a,p,span')].filter(element => { const r = element.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1); }).map(element => ({ tag: element.tagName, text: element.textContent.trim().slice(0, 100), rect: (() => { const r = element.getBoundingClientRect(); return { left: r.left, right: r.right, width: r.width }; })() })),
  hero: (() => { const elements = ['.hero', '.hero h1', '.hero-bottom', '.hero-footnote']; return Object.fromEntries(elements.map(selector => { const r = document.querySelector(selector).getBoundingClientRect(); return [selector, { top: r.top, bottom: r.bottom, height: r.height }]; })); })(),
}));

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' });
mobile.on('pageerror', error => results.errors.push(error.message));
await mobile.goto(target, { waitUntil: 'networkidle' });
await mobile.waitForFunction(() => document.querySelector('#scene-viewport')?.classList.contains('is-ready'));
results.mobile.touchAction = await mobile.locator('#scene').evaluate(element => getComputedStyle(element).touchAction);
await mobile.evaluate(() => window.scrollTo(0, 160));
const canvasBox = await mobile.locator('#scene').boundingBox();
const cdp = await mobile.context().newCDPSession(mobile);
const x = 190;
const fromY = Math.min(650, canvasBox.y + canvasBox.height - 20);
const beforeSwipe = await mobile.evaluate(() => scrollY);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: fromY }] });
for (let index = 1; index <= 8; index++) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: fromY - index * 25 }] });
  await mobile.waitForTimeout(20);
}
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await mobile.waitForTimeout(200);
results.mobile.swipe = { beforeScroll: beforeSwipe, afterScroll: await mobile.evaluate(() => scrollY), beganOnCanvas: { x, y: fromY, canvasBox } };
results.mobile.stepInteractions = [];
for (const index of [1, 2, 0]) {
  await mobile.locator(`[data-step="${index}"]`).tap();
  results.mobile.stepInteractions.push(await mobile.evaluate(() => ({ pressed: document.querySelector('[data-step][aria-pressed="true"]').dataset.step, content: document.querySelector('#brief-content').textContent.trim() })));
}
await mobile.locator('.project-details summary').tap();
results.mobile.detailsOpen = await mobile.locator('.project-details').evaluate(element => element.open);
await mobile.screenshot({ path: 'evidence/design-mobile-details.png', fullPage: true });
await mobile.locator('.back-top').tap();
await mobile.waitForTimeout(50);
results.mobile.backTop = await mobile.evaluate(() => ({ hash: location.hash, scrollY }));

await browser.close();
writeFileSync('evidence/design-extra.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify({ keyboard: { first: results.keyboard.first, skipTarget: results.keyboard.skipTarget, sceneChangedWithArrow: results.keyboard.sceneChangedWithArrow, sceneRestoredWithHome: results.keyboard.sceneRestoredWithHome }, textResize: results.textResize, mobile: results.mobile, motion: results.motion, errors: results.errors }, null, 2));
