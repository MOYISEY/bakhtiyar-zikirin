import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openBrowser } from './browser-config.mjs';

const url = process.argv[2] ?? 'http://127.0.0.1:5191/';
const output = process.argv[3] ?? 'evidence/v6/hierarchy.json';
const shots = process.argv[4] ?? 'qa-private/v6-hierarchy';
mkdirSync(shots, { recursive: true });
mkdirSync(output.slice(0, output.lastIndexOf('/')), { recursive: true });
const report = { url, time: new Date().toISOString(), scope: 'Native viewport captures and measured document positions; laboratory browser timing, not field Core Web Vitals.', cases: [] };
const browser = await openBrowser();
try {
  for (const config of [
    { width: 1165, height: 747, language: 'ru', theme: 'light' },
    { width: 1440, height: 1000, language: 'en', theme: 'dark' },
    { width: 390, height: 844, language: 'ru', theme: 'light' },
    { width: 360, height: 800, language: 'kk', theme: 'dark' },
    { width: 768, height: 1024, language: 'kk', theme: 'light' },
  ]) {
    const context = await browser.newContext({ viewport: { width: config.width, height: config.height }, reducedMotion: 'reduce', ...(config.width < 768 ? { isMobile: true, hasTouch: true } : {}) });
    const errors = [];
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(prefs => {
      localStorage.setItem('portfolio.preferences.v1', JSON.stringify(prefs));
      window.auditTimings = { lcp: [], cls: [] };
      new PerformanceObserver(list => list.getEntries().forEach(e => window.auditTimings.lcp.push({ startTime: e.startTime, size: e.size, tag: e.element?.tagName }))).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => list.getEntries().forEach(e => { if (!e.hadRecentInput) window.auditTimings.cls.push(e.value); })).observe({ type: 'layout-shift', buffered: true });
    }, { language: config.language, theme: config.theme });
    const result = { ...config, errors, screenshots: [] };
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(700);
      result.measurements = await page.evaluate(() => {
        const rect = selector => { const el = document.querySelector(selector); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height, font: getComputedStyle(el).fontSize }; };
        return { viewport: { width: innerWidth, height: innerHeight }, scrollWidth: document.documentElement.scrollWidth, documentHeight: document.documentElement.scrollHeight, hero: rect('.hero'), title: rect('#hero-title'), project: rect('#rowline'), rowlineImage: rect('.rowline-visual img'), cv: rect('.resume-link'), email: rect('.email-link'), system: rect('#system'), hobby: rect('#hobby'), navigation: performance.getEntriesByType('navigation').map(e => ({ responseEnd: e.responseEnd, domContentLoaded: e.domContentLoadedEventEnd, load: e.loadEventEnd, bytes: e.transferSize })), resources: performance.getEntriesByType('resource').map(e => ({ name: e.name, duration: e.duration, transferSize: e.transferSize, decodedSize: e.decodedBodySize })), ...window.auditTimings };
      });
      for (const [name, selector] of [['hero', null], ['rowline', '#rowline'], ['hobby', '#hobby'], ['approach', '#approach'], ['contact', '#contact']]) {
        if (selector) await page.locator(selector).scrollIntoViewIfNeeded();
        await page.waitForTimeout(150);
        const file = join(shots, `${config.width}-${config.language}-${config.theme}-${name}.png`);
        await page.screenshot({ path: file });
        result.screenshots.push(file);
      }
      result.passed = errors.length === 0 && result.measurements.scrollWidth <= config.width;
    } catch (error) { result.passed = false; result.error = error.stack; }
    report.cases.push(result);
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    console.log(`${config.width} ${config.language}/${config.theme}: ${result.passed ? 'PASS' : 'FAIL'}; Rowline y=${result.measurements?.project?.y}, CV y=${result.measurements?.cv?.y}`);
    await context.close();
  }
} finally { await browser.close(); }
report.passed = report.cases.every(item => item.passed);
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
if (!report.passed) process.exitCode = 1;
