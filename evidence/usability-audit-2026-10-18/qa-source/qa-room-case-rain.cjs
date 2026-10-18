const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const base = process.argv[2] || 'http://127.0.0.1:4331/';
const label = process.argv[3] || 'local';
const output = path.resolve('qa-private/room-case-rain');
fs.mkdirSync(output, { recursive: true });
const report = { base, label, checks: [], scenarios: [] };
const ok = (name, value) => { assert(value, name); report.checks.push(name); };
const prefsKey = 'room-studio-slice-audio-v1';
const cases = ['helio', 'keyform', 'poslesvet', 'framepack', 'shapecheck', 'rowline'];

(async () => {
 let browser;
 try {
  browser = await chromium.launch({ headless: true, executablePath: process.env.ROOM_BROWSER, args: ['--mute-audio'] });
  for (const mobile of [false, true]) {
   const name = mobile ? 'mobile' : 'desktop';
   const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, hasTouch: mobile, isMobile: mobile, reducedMotion: 'no-preference' });
   try {
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(key => {
     if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 1, muted: true, rain: { muted: false, volume: .18 } }));
    }, prefsKey);
    await page.goto(base + 'room/?lang=ru');
    await page.waitForFunction(() => window.__SLICE__?.ready, null, { timeout: 90000 });
    const first = await page.evaluate(() => __SLICE__.inspect());
    ok(name + ': exterior rain assembled', first.weather.rainCount > 0 && first.audio.raining);
    ok(name + ': no autoplay', !first.audio.armed && first.audio.desiredMaster === 0);
    report.scenarios.push({ name, renderer: await page.evaluate(() => {
     const gl = document.querySelector('#scene').getContext('webgl2');
     const info = gl.getExtension('WEBGL_debug_renderer_info');
     return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    }), initial: first.audio });
    for (const language of ['ru', 'kk', 'en']) {
     await page.locator('#language').selectOption(language);
     await page.locator('#actions-toggle').click();
     await page.locator('#case-button').click();
     for (const id of cases) {
      await page.locator(`[data-project="${id}"]`).click();
      const link = page.locator(`#case-detail-${id}`);
      ok(name + ': ' + language + ' ' + id + ' local case URL', await link.getAttribute('href') === `../projects/${id}.html?lang=${language}`);
      const response = await context.request.get(new URL(await link.getAttribute('href'), page.url()).href);
      ok(name + ': ' + language + ' ' + id + ' case and gallery exist', response.ok() && (await response.text()).includes('id="gallery-dialog"'));
      await page.locator('[data-back]').click();
     }
     await page.keyboard.press('Escape');
    }
    await page.locator('#actions-toggle').click();
    await page.locator('#case-button').click();
    await page.locator('[data-project="helio"]').click();
    await page.locator('#case-detail-helio').focus();
    await page.locator('#language').selectOption('kk');
    ok(name + ': translated case label', await page.locator('#case-detail-helio').textContent() === 'Толық кейс →');
    await page.locator('#case-detail-helio').scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(output, label + '-' + name + '-case.png') });
    if (mobile) await page.locator('#case-detail-helio').tap();
    else { await page.locator('#case-detail-helio').focus(); await page.keyboard.press('Enter'); }
    await page.waitForURL('**/projects/helio.html?lang=kk');
    ok(name + ': direct navigation preserves language', await page.locator('html').getAttribute('lang') === 'kk');
    await page.locator('.gallery-open').first().click();
    await page.locator('#gallery-dialog[open]').waitFor();
    await page.waitForFunction(() => { const img = document.querySelector('#gallery-image'); return img.complete && img.naturalWidth > 0; });
    ok(name + ': existing gallery opens', await page.locator('#gallery-image').evaluate(img => img.complete && img.naturalWidth > 0));
    await page.keyboard.press('Escape');
    await page.goto(base + 'room/?lang=en');
    await page.waitForFunction(() => window.__SLICE__?.ready, null, { timeout: 90000 });
    await page.locator('#actions-toggle').click();
    await page.locator('#window-button').click();
    await page.waitForFunction(() => __SLICE__.inspect().progress > .99 && __SLICE__.inspect().weather.windowVisible, null, { timeout: 30000 });
    await page.locator('#sound').click();
    await page.waitForFunction(() => {
     const a = __SLICE__.inspect().audio;
     return a.state === 'running' && a.musicReady && a.levels.rain.rms > .00001 && a.desiredMaster > 0;
    }, null, { timeout: 30000 });
    ok(name + ': explicit sound enables existing rain channel', await page.evaluate(() => __SLICE__.inspect().audio.sourceStarts.rain === 1));
    await page.locator('#actions-toggle').click();
    await page.locator('#rain-motion-button').click();
    const paused = await page.evaluate(() => __SLICE__.inspect());
    await page.waitForTimeout(350);
    const still = await page.evaluate(() => __SLICE__.inspect());
    ok(name + ': animation pause keeps rainy ambience', still.weather.paused && still.weather.time === paused.weather.time && still.audio.raining && still.audio.levels.rain.rms > .00001);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(350);
    ok(name + ': reduced motion preserves rain and audio choices', await page.evaluate(() => __SLICE__.inspect().weather.reduced && __SLICE__.inspect().audio.raining && !__SLICE__.inspect().audio.preferences.muted));
    await page.screenshot({ path: path.join(output, label + '-' + name + '-window.png') });
    await page.locator('#sound').click();
    await page.waitForFunction(() => __SLICE__.inspect().audio.state === 'suspended' && __SLICE__.inspect().audio.desiredMaster === 0);
    await page.reload();
    await page.waitForFunction(() => window.__SLICE__?.ready, null, { timeout: 90000 });
    ok(name + ': saved mute and rain pause survive reload', await page.evaluate(() => {
     const s = __SLICE__.inspect(); return s.audio.preferences.muted && !s.audio.armed && s.audio.desiredMaster === 0 && s.weather.paused && s.audio.raining;
    }));
    ok(name + ': no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    ok(name + ': no runtime errors', errors.length === 0);
   } finally { await context.close(); }
  }
  report.pass = true;
 } finally {
  await browser?.close();
  fs.writeFileSync(path.join(output, label + '.json'), JSON.stringify(report, null, 2));
 }
})().catch(error => { console.error(error); process.exitCode = 1; });
