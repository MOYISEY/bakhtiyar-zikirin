const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { chromium } = createRequire(path.join(process.cwd(), 'package.json'))('playwright');

const base = process.argv[2] || 'http://127.0.0.1:5202/';
const output = path.resolve(process.argv[3] || 'qa-private/gallery-recovery');
fs.mkdirSync(output, { recursive: true });
const report = { base, at: new Date().toISOString(), browser: '', method: 'Installed Edge; real image requests are deliberately failed once, then restored; desktop/touch emulation and reduced/default motion, no physical device.', cases: [] };

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  report.browser = browser.version();
  try {
    for (const mobile of [false, true]) for (const motion of ['reduce', 'no-preference']) {
      const label = `${mobile ? 'touch' : 'desktop'}-${motion}`;
      const entry = { label, passed: false, pageErrors: [] };
      report.cases.push(entry);
      const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1366, height: 900 }, deviceScaleFactor: mobile ? 1.75 : 1, isMobile: mobile, hasTouch: mobile, reducedMotion: motion });
      const page = await context.newPage();
      page.on('pageerror', error => entry.pageErrors.push(error.message));
      const media = /helio-detail-1-\d+\.webp/;
      try {
        await page.route(media, route => route.abort('failed'));
        await page.goto(new URL('projects/helio.html?lang=ru', base).href, { waitUntil: 'load' });
        const trigger = page.locator('a.gallery-open').first();
        await page.waitForFunction(() => document.querySelector('a.gallery-open').classList.contains('image-failed'));
        entry.thumbnailInitialFailure = true;
        await trigger.focus();
        await page.keyboard.press('Enter');
        await page.locator('#gallery-error').waitFor({ state: 'visible' });
        entry.initial = await page.evaluate(() => ({ imageHidden: document.querySelector('#gallery-image').hidden, errorHidden: document.querySelector('#gallery-error').hidden, thumbnailFailed: document.querySelector('a.gallery-open').classList.contains('image-failed'), fileHref: document.querySelector('#gallery-file').href }));
        assert(entry.initial.imageHidden && !entry.initial.errorHidden);
        assert(entry.initial.fileHref.endsWith('helio-detail-1-3200.webp'));
        await page.screenshot({ path: path.join(output, `${label}-failed.png`) });

        await page.unroute(media);
        await page.locator('#gallery-zoom').click();
        await page.waitForFunction(() => { const image = document.querySelector('#gallery-image'); return image.complete && image.naturalWidth === 3200 && !image.hidden && document.querySelector('#gallery-error').hidden; });
        entry.galleryRecovered = await page.evaluate(() => ({ imageHidden: document.querySelector('#gallery-image').hidden, errorHidden: document.querySelector('#gallery-error').hidden, naturalWidth: document.querySelector('#gallery-image').naturalWidth }));
        assert.equal(entry.galleryRecovered.naturalWidth, 3200);
        await page.screenshot({ path: path.join(output, `${label}-recovered.png`) });

        await trigger.locator('img').evaluate(image => { image.srcset = ''; image.src = '../projects/media/helio-detail-1-missing.webp'; });
        await page.waitForFunction(() => document.querySelector('a.gallery-open').classList.contains('image-failed'));
        await trigger.locator('img').evaluate(image => { image.src = '../projects/media/helio-detail-1-3200.webp'; });
        await page.waitForFunction(() => { const link = document.querySelector('a.gallery-open'); return !link.classList.contains('image-failed') && link.querySelector('.media-error').hidden && link.querySelector('img').naturalWidth === 3200; });
        entry.thumbnailRecovered = true;

        await page.keyboard.press('ArrowRight');
        await page.keyboard.press('ArrowLeft');
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction(() => { const image = document.querySelector('#gallery-image'); return image.complete && image.naturalWidth > 0 && !image.hidden && document.querySelector('#gallery-error').hidden; });
        entry.afterInterruptedNavigation = await page.evaluate(() => ({ counter: document.querySelector('#gallery-counter').textContent, fileHref: document.querySelector('#gallery-file').href, alt: document.querySelector('#gallery-image').alt, caption: document.querySelector('#gallery-caption').textContent }));
        assert.equal(entry.afterInterruptedNavigation.counter, '2 / 2');
        assert(entry.afterInterruptedNavigation.fileHref.endsWith('helio-detail-2-3200.webp'));
        assert.equal(entry.afterInterruptedNavigation.alt, entry.afterInterruptedNavigation.caption);

        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('#gallery-dialog').open && document.activeElement === document.querySelector('a.gallery-open'));
        await page.keyboard.press('Enter');
        assert.equal(await page.locator('#gallery-counter').innerText(), '1 / 2');
        await page.locator('#gallery-close').click();
        await page.waitForFunction(() => document.activeElement === document.querySelector('a.gallery-open'));
        assert.deepEqual(entry.pageErrors, []);
        entry.passed = true;
        console.log(`${label}: PASS`);
      } catch (error) {
        entry.failure = error.message;
        console.error(`${label}: FAIL ${error.message}`);
      } finally {
        await context.close();
        fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
      }
    }
  } finally { await browser.close(); }
  report.passed = report.cases.every(entry => entry.passed);
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (!report.passed) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
