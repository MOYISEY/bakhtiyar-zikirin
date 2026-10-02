import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { openBrowser } from './browser-config.mjs';
const url = process.argv[2] ?? 'https://moyisey.github.io/bakhtiyar-zikirin/';
const output = process.argv[3] ?? 'evidence/v6/special-links-public.json';
const shots = process.argv[4] ?? 'qa-private/v6-live-special';
mkdirSync(shots, { recursive: true });
mkdirSync('qa-private/downloads', { recursive: true });
const report = { url, checkedAt: new Date().toISOString(), scope: 'Directed actual browser clicks/taps, two unchanged resume downloads and both mailto destinations (preventDefault, no email sent), native full-image popup, mobile trusted CDP gesture in screenshot region. Captures require separate visual inspection.', cases: [] };
const browser = await openBrowser();
try {
  for (const [width, height, language, theme] of [[1165, 747, 'ru', 'light'], [390, 844, 'kk', 'dark']]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 760, reducedMotion: 'reduce', acceptDownloads: true });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const entry = { width, language, theme, actions: [], errors: [], passed: false };
    report.cases.push(entry);
    page.on('pageerror', error => entry.errors.push(error.message));
    try {
      await page.addInitScript(p => localStorage.setItem('portfolio.preferences.v1', JSON.stringify(p)), { language, theme });
      await page.goto(url, { waitUntil: 'load', timeout: 30000 });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${shots}/${width}-hero.png` });
      const links = page.locator('.resume-link');
      assert.equal(await links.count(), 2);
      entry.pdf = [];
      for (let i = 0; i < 2; i++) {
        const [download] = await Promise.all([page.waitForEvent('download'), links.nth(i).click()]);
        const path = `qa-private/downloads/${width}-${i}-public-resume.pdf`;
        await download.saveAs(path);
        const sha256 = createHash('sha256').update(readFileSync(path)).digest('hex');
        assert.equal(sha256, '566051b1e65dbfdf17982f0466948e2556157887f512b5db4d7bb248272060cb');
        entry.pdf.push({ position: i === 0 ? 'hero' : 'contact', bytes: readFileSync(path).length, sha256 });
      }
      entry.actions.push('Actual hero and contact PDF downloads match unchanged public PDF');
      const emails = page.locator('a[href^="mailto:"]');
      assert.equal(await emails.count(), 2);
      for (let i = 0; i < 2; i++) {
        const link = emails.nth(i);
        await link.evaluate(el => el.addEventListener('click', e => { window.auditMailto = el.href; e.preventDefault(); }, { once: true }));
        await link.click();
        assert.equal(await page.evaluate(() => window.auditMailto), 'mailto:b.zikirin@gmail.com');
      }
      entry.actions.push('Both mailto clicks intercepted at approved address; no email sent');
      const [popup] = await Promise.all([page.waitForEvent('popup'), page.locator('.image-help a').click()]);
      await popup.waitForLoadState('load', { timeout: 30000 });
      entry.image = await popup.evaluate(() => ({ width: document.images[0]?.naturalWidth, height: document.images[0]?.naturalHeight, openerIsNull: opener === null, url: location.href }));
      assert.equal(entry.image.width, 1440);
      assert.equal(entry.image.height, 1303);
      assert.equal(entry.image.openerIsNull, true);
      await popup.close();
      entry.actions.push('Full real Rowline screenshot opened in a separate protected tab');
      const region = page.locator('.rowline-scroll');
      await region.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.rowline-visual img').complete && document.querySelector('.rowline-visual img').naturalWidth > 0);
      if (width < 760) {
        const cdp = await context.newCDPSession(page);
        const box = await region.boundingBox();
        const x = box.x + box.width / 2, y = box.y + Math.min(box.height - 30, 410);
        const beforePage = await page.evaluate(() => scrollY);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let i = 1; i <= 8; i++) {
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 24 }] });
          await page.waitForTimeout(30);
        }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForFunction(() => document.querySelector('.rowline-scroll').scrollTop > 0);
        entry.touch = await region.evaluate(el => ({ regionTop: el.scrollTop, pageY: scrollY }));
        assert.equal(entry.touch.pageY, beforePage);
        entry.actions.push('Trusted CDP touch gesture scrolls real image region while page remains stationary');
      }
      await page.screenshot({ path: `${shots}/${width}-rowline.png` });
      await page.locator('#contact').scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${shots}/${width}-contact.png` });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(entry.errors, []);
      entry.passed = true;
      console.log(`${width} special live links: PASS`);
    } catch (error) { entry.failure = error.message; console.log(`${width} special live links: FAIL ${error.message.slice(0, 250)}`); }
    finally { writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); await context.close(); }
  }
} finally { await browser.close(); }
report.passed = report.cases.every(e => e.passed);
writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
if (!report.passed) process.exitCode = 1;
