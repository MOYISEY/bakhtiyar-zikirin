import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from 'vite';

// Cached HTML may request its hashed imports while Pages switches deployments.
// Keep one previous release, including lazy chunks; never accumulate every build.
const directory = 'docs/assets';
const manifest = 'docs/asset-history.json';
const safeName = name => typeof name === 'string' && /^[\w.-]+\.(?:js|css|woff2)$/.test(name);
const list = () => existsSync(directory) ? readdirSync(directory).filter(safeName).sort() : [];
const before = new Map(list().map(name => [name, readFileSync(join(directory, name))]));
const history = existsSync(manifest)
  ? JSON.parse(readFileSync(manifest, 'utf8'))
  : { current: [...before.keys()], previous: [] };
if (!Array.isArray(history.current) || !Array.isArray(history.previous) ||
    ![...history.current, ...history.previous].every(safeName)) {
  throw new Error('Invalid asset history manifest');
}

const git = args => execFileSync('git', args, { stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 8 * 1024 * 1024 });
let published;
try {
  const revision = git(['rev-parse', '--verify', 'origin/main']).toString().trim();
  let names, previous = [], retainedFrom = revision;
  try {
    const saved = JSON.parse(git(['show', `${revision}:${manifest}`]).toString());
    names = saved.current; previous = saved.previous; retainedFrom = saved.retainedFrom;
  }
  catch { names = git(['ls-tree', '--name-only', `${revision}:${directory}`]).toString().trim().split(/\r?\n/); }
  if (!Array.isArray(names) || !Array.isArray(previous) || ![...names, ...previous].every(safeName)) throw new Error('Invalid published asset list');
  published = { revision, names, previous, retainedFrom };
} catch {
  // Source archives without Git can still retain one previous local build.
}

await build();
const current = list();
const unchanged = JSON.stringify(current) === JSON.stringify([...history.current].sort());
// A repeated build of the same source must not discard the previous release.
const sameAsPublished = published && JSON.stringify(current) === JSON.stringify([...published.names].sort());
const candidates = published ? (sameAsPublished ? published.previous : published.names) : (unchanged ? history.previous : history.current);
const previous = candidates
  .filter(name => !current.includes(name) && (published || before.has(name))).sort();
for (const name of previous) {
  const bytes = published ? git(['show', `${published.revision}:${directory}/${name}`]) : before.get(name);
  writeFileSync(join(directory, name), bytes);
}
const retainedFrom = published ? (sameAsPublished ? published.retainedFrom : published.revision) : 'local-build';
writeFileSync(manifest, JSON.stringify({ current, previous, retainedFrom }, null, 2) + '\n');
console.log(`Retained ${previous.length} hashed assets from ${retainedFrom}.`);
