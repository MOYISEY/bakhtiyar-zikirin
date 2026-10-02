import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { openBrowser } from './browser-config.mjs';
const url = 'https://moyisey.github.io/krasnaya-nit/';
const browser = await openBrowser();
try {
  const context = await browser.newContext({ viewport: { width: 1165, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  await page.goto(url, { waitUntil: 'load', timeout: 40000 });
  await page.locator('#cards > *').first().waitFor();
  await page.locator('#fit').click();
  await page.waitForTimeout(250);
  const path = 'public/projects/krasnaya-nit-board.png';
  await page.locator('#board').screenshot({ path });
  writeFileSync('evidence/v6/hobby-media-provenance.json', JSON.stringify({ url, capturedAt: new Date().toISOString(), viewport: { width: 1165, height: 900 }, action: 'Opened the published default demo and clicked Fit. Captured the actual board element; no redraw or compositing.', path, sha256: createHash('sha256').update(readFileSync(path)).digest('hex'), cardCount: await page.locator('#cards > *').count() }, null, 2) + '\n');
  console.log('Captured real hobby board');
  await context.close();
} finally { await browser.close(); }
