import { writeFileSync } from 'node:fs';
import { openBrowser } from './browser-config.mjs';
const browser = await openBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1165, height: 747 } });
  const report = { time: new Date().toISOString(), errors: [], failedRequests: [], responses: [] };
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('requestfailed', r => report.failedRequests.push({ url: r.url(), error: r.failure()?.errorText }));
  page.on('response', r => { if (r.status() >= 400) report.responses.push({ url: r.url(), status: r.status() }); });
  await page.goto('https://moyisey.github.io/atyrau-tour-3d/tour_v2/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);
  report.state = await page.evaluate(() => ({ title: document.title, pannellum: typeof pannellum, viewer: typeof viewer, loaded: typeof viewer !== 'undefined' && viewer?.isLoaded(), floor: typeof currentFloor !== 'undefined' ? currentFloor : null, scene: typeof currentScene !== 'undefined' ? currentScene : null, errorText: document.querySelector('.pnlm-error-msg')?.textContent, body: document.body.innerText.slice(0, 2000), scripts: [...document.scripts].map(s => s.src), loading: document.querySelector('.pnlm-load-box')?.textContent }));
  await page.screenshot({ path: 'qa-private/v6-tour-diagnostic.png' });
  writeFileSync('evidence/v6/tour-diagnostic.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
