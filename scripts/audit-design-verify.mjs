import { openBrowser } from './browser-config.mjs';
import { writeFileSync } from 'node:fs';

const browser = await openBrowser();
const output = { createdAt: new Date().toISOString() };
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
await mobile.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await mobile.waitForFunction(() => document.querySelector('#scene-viewport')?.classList.contains('is-ready'));
await mobile.locator('.brief-demo').scrollIntoViewIfNeeded();
await mobile.waitForTimeout(100);
output.mobileSteps = [];
for (const index of [1, 2, 0]) {
  await mobile.locator(`[data-step="${index}"]`).tap();
  await mobile.waitForTimeout(100);
  output.mobileSteps.push(await mobile.evaluate(() => ({ requestedActive: document.querySelector('[data-step][aria-pressed="true"]').dataset.step, content: document.querySelector('#brief-content').textContent.trim() })));
}

const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.querySelector('#scene-viewport')?.classList.contains('is-ready'));
await page.waitForTimeout(200);
await page.locator('#scene').focus();
const initial = await page.locator('#scene').screenshot({ path: 'evidence/design-scene-home-initial.png' });
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(100);
const changed = await page.locator('#scene').screenshot({ path: 'evidence/design-scene-home-changed.png' });
await page.keyboard.press('Home');
await page.waitForTimeout(100);
const reset = await page.locator('#scene').screenshot({ path: 'evidence/design-scene-home-reset.png' });
output.home = { changed: !initial.equals(changed), restoredByteExact: initial.equals(reset), initialSize: initial.length, resetSize: reset.length };
output.home.pixelComparison = await page.evaluate(async ({ original, reset }) => {
  async function decode(base64) {
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    const image = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0);
    return context.getImageData(0, 0, image.width, image.height).data;
  }
  const a = await decode(original), b = await decode(reset);
  let different = 0, maxDifference = 0, totalDifference = 0;
  for (let index = 0; index < a.length; index += 4) {
    const difference = Math.max(Math.abs(a[index] - b[index]), Math.abs(a[index + 1] - b[index + 1]), Math.abs(a[index + 2] - b[index + 2]));
    if (difference) different++;
    maxDifference = Math.max(maxDifference, difference); totalDifference += difference;
  }
  return { changedPixelFraction: different / (a.length / 4), maxDifference, meanDifference: totalDifference / (a.length / 4) };
}, { original: initial.toString('base64'), reset: reset.toString('base64') });

// 1440px desktop at 200% browser zoom has a 720px CSS layout viewport.
await page.setViewportSize({ width: 720, height: 500 });
await page.screenshot({ path: 'evidence/design-zoom-200-equivalent.png', fullPage: true });
output.zoomEquivalent = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth, clipped: [...document.querySelectorAll('h1,h2,h3,h4,p,a,button')].filter(element => { const r = element.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1); }).map(element => element.textContent.trim()) }));

const production = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
await production.addInitScript(() => {
  window.__metrics = { cls: 0, largestContentfulPaint: 0, longTasks: [] };
  new PerformanceObserver(list => list.getEntries().forEach(entry => { if (!entry.hadRecentInput) window.__metrics.cls += entry.value; })).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver(list => list.getEntries().forEach(entry => { window.__metrics.largestContentfulPaint = entry.startTime; })).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver(list => list.getEntries().forEach(entry => window.__metrics.longTasks.push({ start: entry.startTime, duration: entry.duration }))).observe({ type: 'longtask', buffered: true });
});
await production.goto('http://127.0.0.1:5184/', { waitUntil: 'networkidle' });
await production.waitForFunction(() => document.querySelector('#scene-viewport')?.classList.contains('is-ready'));
await production.waitForTimeout(1000);
output.production = await production.evaluate(() => ({ ...window.__metrics, navigation: performance.getEntriesByType('navigation').map(entry => ({ domContentLoaded: entry.domContentLoadedEventEnd, load: entry.loadEventEnd })), resources: performance.getEntriesByType('resource').map(entry => ({ name: new URL(entry.name).pathname, bytes: entry.decodedBodySize, transferred: entry.transferSize, duration: entry.duration })), fonts: document.fonts.status }));
await browser.close();
writeFileSync('evidence/design-verify.json', JSON.stringify(output, null, 2));
console.log(JSON.stringify(output, null, 2));
