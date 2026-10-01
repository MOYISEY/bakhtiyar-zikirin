import { chromium, firefox, webkit } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const name = process.argv[2];
const type = { chromium, firefox, webkit }[name];
if (!type) throw new Error('Choose chromium, firefox, or webkit');
mkdirSync('qa-private/reference', { recursive: true });
const report = { name, checkedAt: new Date().toISOString(), stage: 'launching', available: false };
const save = () => writeFileSync(`qa-private/reference/browser-${name}.json`, JSON.stringify(report, null, 2));
const deadline = setTimeout(() => { report.error = 'Probe deadline of 30 seconds exceeded'; save(); console.log(JSON.stringify(report)); process.exit(2); }, 30000);
let browser;
try {
  browser = await type.launch({ headless: true, timeout: 12000 }); report.stage = 'creating page'; save();
  const page = await browser.newPage(); report.stage = 'rendering document'; save();
  await page.setContent('<html><head><title>Browser availability probe</title></head><body>Portfolio QA</body></html>', { timeout: 5000 });
  report.version = browser.version(); report.userAgent = await page.evaluate(() => navigator.userAgent); report.title = await page.title(); report.available = true;
} catch (error) { report.error = error.message; }
finally {
  if (browser) await Promise.race([browser.close(), new Promise(resolve => setTimeout(resolve, 3000))]);
  clearTimeout(deadline); report.stage = 'finished'; save(); console.log(JSON.stringify(report, null, 2)); process.exit(report.available ? 0 : 1);
}
