import { writeFileSync } from 'node:fs';
import { openBrowser } from './browser-config.mjs';
const destination = 'https://github.com/MOYISEY/rowline/blob/main/QA.md';
const report = { checkedAt: new Date().toISOString(), reason: 'The first live popup retained the correct URL but showed a transient GitHub Unicorn error title. One bounded check; this does not audit the external application.', destination };
const browser = await openBrowser();
try {
  const page = await browser.newPage();
  try {
    const response = await page.goto(destination, { waitUntil: 'domcontentloaded', timeout: 25000 });
    report.browser = { status: response?.status(), title: await page.title(), finalUrl: page.url() };
  } catch (error) { report.browser = { failure: error.message }; }
  const rawUrl = 'https://raw.githubusercontent.com/MOYISEY/rowline/main/QA.md';
  try {
    const response = await fetch(rawUrl, { signal: AbortSignal.timeout(20000) });
    const body = await response.text();
    report.raw = { url: rawUrl, status: response.status, bytes: Buffer.byteLength(body), contentPresent: response.ok && body.includes('Rowline') };
  } catch (error) { report.raw = { failure: error.message }; }
} finally { await browser.close(); }
writeFileSync('evidence/v6/github-destination-check.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
