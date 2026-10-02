import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { openBrowser } from './browser-config.mjs';

const baseline = '26fdb668389d7ba8deeaf538ca64c2a96a2fb4fb';
const output = process.argv[2] ?? 'evidence/v6/startup-performance.json';
const repo = process.cwd().replaceAll('\\', '/');
const git = args => execFileSync('git', ['-c', `safe.directory=${repo}`, ...args], { maxBuffer: 10 * 1024 * 1024 });
const files = { baseline: new Map(), candidate: new Map() };
for (const path of git(['ls-tree', '-r', '--name-only', baseline, '--', 'docs']).toString().trim().split(/\r?\n/)) files.baseline.set(path.slice(5), git(['show', `${baseline}:${path}`]));
function collect(dir, prefix = '') {
  for (const name of readdirSync(dir)) {
    const path = resolve(dir, name);
    if (statSync(path).isDirectory()) collect(path, prefix + name + '/');
    else files.candidate.set(prefix + name, readFileSync(path));
  }
}
collect('docs');
const server = createServer((request, response) => {
  const [, version, ...parts] = new URL(request.url, 'http://localhost').pathname.split('/');
  const path = parts.join('/') || 'index.html';
  const bytes = files[version]?.get(path);
  if (!bytes) { response.writeHead(404); response.end(); return; }
  const type = path.endsWith('.js') ? 'text/javascript' : path.endsWith('.css') ? 'text/css' : path.endsWith('.html') ? 'text/html' : path.endsWith('.svg') ? 'image/svg+xml' : path.endsWith('.woff2') ? 'font/woff2' : path.endsWith('.png') ? 'image/png' : 'application/octet-stream';
  const compress = /^text\//.test(type) || type === 'image/svg+xml';
  response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store', ...(compress ? { 'Content-Encoding': 'gzip' } : {}) });
  response.end(compress ? gzipSync(bytes) : bytes);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const report = { baselineCommit: baseline, checkedAt: new Date().toISOString(), scope: 'Cold synthetic Chromium laboratory startup comparison, same local gzip server, 390x844 RU/light, 150ms latency, 1.6Mbps down, CPU4x. Three alternating runs per build; not Lighthouse or field Core Web Vitals. No scrolling or interaction before measurement.', runs: [] };
const browser = await openBrowser();
report.browserVersion = browser.version();
try {
  for (let round = 0; round < 3; round++) for (const version of ['baseline', 'candidate']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(() => {
      localStorage.setItem('portfolio.preferences.v1', JSON.stringify({ language: 'ru', theme: 'light' }));
      window.lab = { lcp: [], cls: [], longTasks: [] };
      new PerformanceObserver(list => list.getEntries().forEach(e => window.lab.lcp.push(e.startTime))).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => list.getEntries().forEach(e => { if (!e.hadRecentInput) window.lab.cls.push(e.value); })).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(list => list.getEntries().forEach(e => window.lab.longTasks.push(e.duration))).observe({ type: 'longtask', buffered: true });
    });
    await page.goto(`http://127.0.0.1:${port}/${version}/`, { waitUntil: 'networkidle', timeout: 40000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    const values = await page.evaluate(() => ({ ...window.lab, resources: performance.getEntriesByType('resource').map(e => ({ name: new URL(e.name).pathname, bytes: e.transferSize, decodedBytes: e.decodedBodySize, duration: e.duration })), sceneState: document.querySelector('#scene-status').dataset.sceneState ?? 'not-requested' }));
    const sceneRequested = values.resources.some(e => /scene-.*\.js/.test(e.name));
    assert.equal(sceneRequested, version === 'baseline');
    const run = { version, round, lcpMs: values.lcp.at(-1), cls: values.cls.reduce((a, b) => a + b, 0), longTaskCount: values.longTasks.length, longTaskMs: values.longTasks.reduce((a, b) => a + b, 0), resourceBytes: values.resources.reduce((a, b) => a + b.bytes, 0), sceneRequested, sceneState: values.sceneState, resources: values.resources };
    report.runs.push(run);
    console.log(`${version} ${round}: LCP ${run.lcpMs?.toFixed(0)}ms, CLS ${run.cls.toFixed(4)}, ${run.resourceBytes} bytes, scene ${run.sceneRequested}`);
    writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    await context.close();
  }
  const median = list => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];
  report.medians = Object.fromEntries(['baseline', 'candidate'].map(version => { const runs = report.runs.filter(r => r.version === version); return [version, Object.fromEntries(['lcpMs', 'cls', 'longTaskMs', 'resourceBytes'].map(key => [key, median(runs.map(r => r[key]))]))]; }));
  report.passed = true;
} finally {
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
