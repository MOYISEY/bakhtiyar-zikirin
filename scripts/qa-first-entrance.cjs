const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const repo = process.cwd();
const { chromium } = createRequire(path.join(repo, 'package.json'))('playwright');
const base = process.env.STARTUP_BASE || 'http://127.0.0.1:4332/';
const label = process.env.STARTUP_LABEL || 'baseline';
const rounds = Number(process.env.STARTUP_ROUNDS || 3);
const latency = Number(process.env.STARTUP_LATENCY_MS || 40);
const down = Number(process.env.STARTUP_DOWN_BYTES || 1250000);
const upload = Number(process.env.STARTUP_UP_BYTES || 250000);
const profiles = process.env.STARTUP_PROFILE === 'touch' ? [true] : process.env.STARTUP_PROFILE === 'desktop' ? [false] : [false, true];
const routes = process.env.STARTUP_ROUTE === 'room' ? ['room/index.html?lang=ru'] : process.env.STARTUP_ROUTE === 'ordinary' ? ['index.html'] : ['index.html', 'room/index.html?lang=ru'];
const out = path.resolve(process.env.STARTUP_OUTPUT || path.join('qa-private', 'first-entrance', `${label}.json`));
fs.mkdirSync(path.dirname(out), { recursive: true });
const report = { label, base, rounds, started: new Date().toISOString(), method: 'Installed headless Edge; configured network throttle and CPU1x; each cold load uses fresh context and clearBrowserCache, each warm load reloads in that context; serial desktop 1440x900 DPR1 and touch emulation 390x844 DPR1.75; natural HTTP cache.', network: { latency, down, upload }, runs: [] };

async function run() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--mute-audio'] });
  report.browser = browser.version();
  try {
    for (let round = 0; round < rounds; round++) for (const mobile of profiles) for (const route of routes) {
      const room = route.startsWith('room/');
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: mobile ? 1.75 : 1, isMobile: mobile, hasTouch: mobile, reducedMotion: 'no-preference' });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
      await cdp.send('Network.clearBrowserCache');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency, downloadThroughput: down, uploadThroughput: upload });
      await context.addInitScript(() => {
        localStorage.setItem('room-studio-slice-audio-v1', JSON.stringify({ version: 1, muted: true }));
        sessionStorage.setItem('office-cord-guide', 'seen');
        window.startupProbe = { lcp: [], long: [], usable: null };
        new PerformanceObserver(list => list.getEntries().forEach(e => startupProbe.lcp.push(e.startTime))).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver(list => list.getEntries().forEach(e => startupProbe.long.push({ start: e.startTime, duration: e.duration }))).observe({ type: 'longtask', buffered: true });
        addEventListener('room-scene-ready', () => { startupProbe.usable = performance.now(); });
      });
      try {
        for (const mode of ['cold', 'warm']) {
          const row = { round, profile: mobile ? 'touch-emulation' : 'desktop', route: room ? 'room' : 'ordinary', mode, errors: [], failed: [], badStatuses: [] };
          const onError = e => row.errors.push(e.message);
          const onFailed = r => row.failed.push({ url: r.url(), failure: r.failure() });
          const onResponse = r => { if (r.status() >= 400) row.badStatuses.push({ url: r.url(), status: r.status() }); };
          page.on('pageerror', onError); page.on('requestfailed', onFailed); page.on('response', onResponse);
          const wall = Date.now();
          try {
            await page.goto(base + route, { waitUntil: 'load', timeout: 90000 });
            if (room) await page.waitForFunction(() => window.__SLICE__?.ready && window.sliceUsable && document.querySelector('#loading')?.hidden, null, { timeout: 90000 });
            else await page.waitForFunction(() => document.body.dataset.siteReady === 'true', null, { timeout: 30000 });
            await page.waitForTimeout(250);
            Object.assign(row, await page.evaluate(() => {
              const resources = performance.getEntriesByType('resource').map(e => ({ path: new URL(e.name).pathname, duration: e.duration, end: e.responseEnd, transfer: e.transferSize, encoded: e.encodedBodySize, decoded: e.decodedBodySize }));
              const state = window.__SLICE__?.inspect();
              const nav = performance.getEntriesByType('navigation')[0];
              return { readyMs: startupProbe.usable ?? nav.domContentLoadedEventEnd, firstFrameMs: state?.firstFrameAt, fullSceneMs: state?.fullSceneAt, phase: state?.stream?.phases, lcpMs: startupProbe.lcp.at(-1), longTaskMs: startupProbe.long.reduce((n, e) => n + e.duration, 0), resourceCount: resources.length, transferBytes: resources.reduce((n, e) => n + e.transfer, 0), resources, state: state ? { doorAngle: state.doorAngle, progress: state.progress, camera: state.camera, draws: state.drawCalls, triangles: state.triangles } : null, loaderHidden: document.querySelector('#loading')?.hidden, sceneResource: resources.some(r => /scene-(?!controls)[^/]+\.js|three\.module\.js|\/room\/main\.js/.test(r.path)), eagerDocument: resources.filter(r => /(?:\.pdf|diploma-public|iqadam-2025-public|hackalem-2026-public)/i.test(r.path)).map(r => r.path) };
            }));
            if (room) {
              const start = Date.now();
              if (await page.locator('#controls').isHidden()) await page.locator('#actions-toggle').click();
              await page.locator('#desk-button').click();
              await page.waitForFunction(() => { const s = __SLICE__.inspect(); return s.viewName === 'desk' && s.progress > .98 && s.doorAngle > 1.4; }, null, { timeout: 20000 });
              row.firstDoorTransitionMs = Date.now() - start;
              row.afterDoor = await page.evaluate(() => { const s = __SLICE__.inspect(); return { doorAngle: s.doorAngle, progress: s.progress, cameraClear: s.cameraClear }; });
            }
            row.passed = row.errors.length === 0 && row.badStatuses.length === 0 && (room ? row.loaderHidden && row.phase && Object.values(row.phase).every(p => p.status === 'ready' && p.failed.length === 0) : !row.sceneResource);
          } catch (error) { row.passed = false; row.failure = error.message; }
          row.wallMs = Date.now() - wall;
          row.slowest = row.resources?.toSorted((a, b) => b.end - a.end).slice(0, 5).map(({ path, end, transfer }) => ({ path, end, transfer }));
          report.runs.push(row);
          fs.writeFileSync(out, JSON.stringify(report, null, 2));
          console.log(JSON.stringify({ label, round, profile: row.profile, route: row.route, mode, readyMs: row.readyMs, lcpMs: row.lcpMs, firstDoorTransitionMs: row.firstDoorTransitionMs, transferBytes: row.transferBytes, sceneResource: row.sceneResource, eagerDocument: row.eagerDocument, passed: row.passed, failure: row.failure, slowest: row.slowest?.[0] }));
          page.off('pageerror', onError); page.off('requestfailed', onFailed); page.off('response', onResponse);
          if (!row.passed) throw Error('Failed ' + JSON.stringify({ round, mobile, route, mode, row: row.failure, errors: row.errors, badStatuses: row.badStatuses, failed: row.failed }));
        }
      } finally { await context.close(); }
    }
    report.passed = true;
  } finally { report.ended = new Date().toISOString(); fs.writeFileSync(out, JSON.stringify(report, null, 2)); await browser.close(); }
}
run().catch(e => { console.error(e); process.exitCode = 1; });
