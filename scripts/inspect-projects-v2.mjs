import { mkdirSync, writeFileSync } from 'node:fs';
const root = 'qa-private/projects';
mkdirSync(root, { recursive: true });
const names = ['atyrau-tour-3d', 'art_portal'];
const results = await Promise.all(names.map(async name => {
  const repo = await fetch(`https://api.github.com/repos/MOYISEY/${name}`, { signal: AbortSignal.timeout(15000) }).then(response => response.json());
  const head = await fetch(`https://api.github.com/repos/MOYISEY/${name}/commits/${repo.default_branch}`, { signal: AbortSignal.timeout(15000) }).then(response => response.json());
  const paths = name === 'atyrau-tour-3d' ? ['tour_v2/index.html'] : ['README.md', 'models.py', 'views.py', 'forms.py', 'page.tsx', 'home.html'];
  mkdirSync(`${root}/${name}`, { recursive: true });
  const files = await Promise.all(paths.map(async path => {
    const url = `https://raw.githubusercontent.com/MOYISEY/${name}/${head.sha}/${path}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const text = await response.text();
    if (response.ok) { const directory = path.includes('/') ? `${root}/${name}/${path.slice(0, path.lastIndexOf('/'))}` : `${root}/${name}`; mkdirSync(directory, { recursive: true }); writeFileSync(`${root}/${name}/${path}`, text); }
    return { path, url, status: response.status, text: response.ok ? text : undefined };
  }));
  return { name, url: repo.html_url, private: repo.private, commit: head.sha, files };
}));
writeFileSync(`${root}/sources.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results.map(result => ({ ...result, files: result.files.map(file => ({ path: file.path, status: file.status, length: file.text?.length })) })), null, 2));
