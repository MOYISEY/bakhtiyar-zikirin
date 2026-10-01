import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const findings = [];
let filesChecked = 0;
const patterns = [
  ['GitHub token', /(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})/],
  ['OpenAI-style key', /sk-[A-Za-z0-9_-]{30,}/],
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['local Windows user path', /[A-Z]:[\\/]+Users[\\/]+(?!Public[\\/])[A-Za-z0-9_.-]+[\\/]/i],
];
function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (['node_modules', '.git', '.sites-runtime', 'qa-private', 'test-results'].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(?:[cm]?js|ts|json|html|css|md|txt|svg)$/.test(entry.name)) {
      filesChecked++;
      const text = readFileSync(path, 'utf8');
      for (const [kind, pattern] of patterns) if (pattern.test(text)) findings.push({ file: relative(root, path).replaceAll('\\', '/'), kind });
    }
  }
}
walk(root);
const report = { checkedAt: new Date().toISOString(), filesChecked, findings, limitation: 'A limited pattern scan of deliverable text files; not a comprehensive secret detector or a scan of Git history.' };
writeFileSync('evidence/final-source-safety-scan.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (findings.length) process.exitCode = 1;
