import { writeFileSync } from 'node:fs';
import { openBrowser } from './browser-config.mjs';

const target = 'https://moyisey.github.io/bakhtiyar-zikirin/';
const browser = await openBrowser();
const report = { target, checkedAt: new Date().toISOString(), contexts: [] };
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, hasTouch: mobile, isMobile: mobile });
    try {
      const page = await context.newPage();
      const result = { mobile, console: [], pageErrors: [], failedRequests: [], badOwnResponses: [] };
      page.on('console', message => result.console.push({ type: message.type(), text: message.text(), location: message.location() }));
      page.on('pageerror', error => result.pageErrors.push(error.message));
      page.on('requestfailed', request => result.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
      page.on('response', response => { if (response.url().startsWith(target) && response.status() >= 400) result.badOwnResponses.push({ url: response.url(), status: response.status() }); });
      const response = await page.goto(target, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.querySelector('#scene-viewport')?.classList.contains('is-ready'));
      await page.evaluate(() => document.fonts.ready);
      for (const mode of ['wire', 'explode', 'solid']) {
        const button = page.locator(`[data-mode="${mode}"]`);
        if (mobile) await button.tap(); else await button.click();
      }
      await page.locator('#motion-toggle').click();
      await page.waitForTimeout(300);
      await page.locator('#motion-toggle').click();
      await page.waitForTimeout(500);
      result.status = response.status();
      result.title = await page.title();
      result.renderer = await page.locator('#scene').evaluate(canvas => {
        const gl = canvas.getContext('webgl2'), info = gl?.getExtension('WEBGL_debug_renderer_info');
        return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'Not exposed';
      });
      report.contexts.push(result);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
writeFileSync('evidence/live-console-final.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (report.contexts.some(context => context.pageErrors.length || context.console.some(message => message.type === 'error') || context.badOwnResponses.length || context.failedRequests.length)) process.exitCode = 1;
