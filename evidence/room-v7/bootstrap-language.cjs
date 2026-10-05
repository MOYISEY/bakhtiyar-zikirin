const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.ROOM_URL || 'http://127.0.0.1:4200/bakhtiyar-zikirin/room/';
const out = 'evidence/room-v7/';
const expected = {
  ru: { title: 'Студия Бахтияра', menu: 'Меню', skip: 'К управлению', hint: 'Потяните, чтобы осмотреться', caption: 'Разработка. Проекты. Опыт.', canvas: '3D-студия Бахтияра', retry: 'Повторить', error: 'Не удалось запустить 3D. Обычный вид доступен сверху.' },
  kk: { title: 'Бақтияр студиясы', menu: 'Мәзір', skip: 'Басқаруға өту', hint: 'Айналаны қарау үшін сүйреңіз', caption: 'Әзірлеу. Жобалар. Тәжірибе.', canvas: 'Бақтиярдың 3D студиясы', retry: 'Қайталау', error: '3D іске қосылмады. Қалыпты көрініс жоғарыда.' },
  en: { title: 'Bakhtiyar’s studio', menu: 'Menu', skip: 'Skip to controls', hint: 'Drag to look around', caption: 'Development. Projects. Experience.', canvas: 'Bakhtiyar’s 3D studio', retry: 'Retry', error: '3D could not start. The regular view is available above.' }
};
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.ROOM_BROWSER });
  const report = { result: 'RUNNING', cases: [], healthyErrors: [], externalRequests: [] };
  try {
    for (const mode of ['import', 'webgl']) for (const lang of ['ru', 'kk', 'en']) {
      const page = await browser.newPage({ reducedMotion: 'reduce' });
      await page.addInitScript(({ lang, mode }) => {
        localStorage.setItem('room-professional-language', lang === 'ru' ? 'en' : 'ru');
        if (mode === 'webgl' && !sessionStorage.getItem('allowWebGL')) {
          const getContext = HTMLCanvasElement.prototype.getContext;
          HTMLCanvasElement.prototype.getContext = function (type, ...args) {
            return /webgl/i.test(type) ? null : getContext.call(this, type, ...args);
          };
        }
      }, { lang, mode });
      if (mode === 'import') await page.route('**/vendor/three.module.js', route => route.abort());
      page.on('request', request => { if (!request.url().startsWith(base)) report.externalRequests.push(request.url()); });
      await page.goto(base + '?lang=' + lang);
      await page.locator('#retry').waitFor({ state: 'visible' });
      const e = expected[lang];
      assert.equal(await page.locator('html').getAttribute('lang'), lang);
      assert.equal(await page.title(), e.title);
      for (const [selector, value] of Object.entries({ '#brand': e.title, '#menu-toggle': e.menu, '.skip': e.skip, '#hint': e.hint, '#caption strong': e.caption, '#retry': e.retry, '#load-text': e.error })) {
        assert.equal(await page.locator(selector).textContent(), value, mode + ' ' + lang + ' ' + selector);
      }
      assert.equal(await page.locator('#canvas').getAttribute('aria-label'), e.canvas);
      assert((await page.locator('#ordinary').getAttribute('href')).endsWith('?lang=' + lang));
      assert.equal(await page.locator(`[data-lang=${lang}]`).getAttribute('aria-pressed'), 'true');
      if (lang === 'en') {
        const strings = await page.locator('body').evaluate(body => [...body.querySelectorAll('*')].filter(el => el.tagName !== 'NOSCRIPT').flatMap(el => [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).concat(el.getAttribute('aria-label') || '')));
        assert(!/[А-Яа-яЁё]/.test(strings.join(' ')), 'No Russian shell text remains in English fallback');
      }
      if (mode === 'import' && lang !== 'ru') await page.screenshot({ path: out + 'fallback-' + lang + '-fixed.png' });
      if (mode === 'import') await page.unroute('**/vendor/three.module.js');
      else await page.evaluate(() => sessionStorage.setItem('allowWebGL', '1'));
      page.on('pageerror', error => report.healthyErrors.push(error.message));
      await page.locator('#retry').click();
      await page.waitForFunction(() => window.__STUDIO__?.detailsReady, null, { timeout: 60000 });
      assert.equal(await page.locator('html').getAttribute('lang'), lang);
      assert.equal(await page.title(), e.title);
      assert(await page.locator('#loading').isHidden());
      await page.locator('#menu-toggle').click();
      assert(await page.locator('#menu').isVisible());
      const next = lang === 'en' ? 'kk' : 'en';
      await page.locator(`[data-lang=${next}]`).click();
      assert.equal(new URL(page.url()).searchParams.get('lang'), next);
      assert.equal(await page.locator('#brand').textContent(), expected[next].title);
      await page.keyboard.press('Escape');
      assert(await page.locator('#menu').isHidden());
      report.cases.push({ mode, lang, oppositeSavedLanguageOverridden: true, shellLocalized: true, retryRecovers: true, healthyMenuAndLanguageSwitch: true });
      await page.close();
    }
    for (const test of [{ query: '?lang=en', stored: 'kk', denied: true, expected: 'en' }, { query: '?lang=invalid', stored: 'kk', expected: 'kk' }, { query: '', stored: 'invalid', expected: 'ru' }]) {
      const page = await browser.newPage();
      await page.addInitScript(test => { if (test.denied) Object.defineProperty(window, 'localStorage', { get() { throw Error('denied'); } }); else localStorage.setItem('room-professional-language', test.stored); }, test);
      await page.route('**/studio.js', route => route.abort());
      await page.goto(base + test.query);
      await page.locator('#retry').waitFor({ state: 'visible' });
      assert.equal(await page.locator('html').getAttribute('lang'), test.expected);
      assert.equal(await page.title(), expected[test.expected].title);
      report.cases.push({ ...test, fallbackPriorityCorrect: true });
      await page.close();
    }
    assert.deepEqual(report.healthyErrors, []);
    assert.deepEqual(report.externalRequests, []);
    report.result = 'PASS';
  } catch (error) { report.result = 'FAIL'; report.error = error.message; throw error; }
  finally { fs.writeFileSync(out + 'bootstrap-language.json', JSON.stringify(report, null, 2)); console.log(report); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
