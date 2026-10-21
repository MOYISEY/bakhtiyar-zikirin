import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
const projects: { id: string }[] = JSON.parse(readFileSync(resolve(process.cwd(), 'src/content/projects.json'), 'utf8'));
const pages=['index.html','projects/index.html',...projects.map(({id})=>'projects/'+id+'.html')];
export default defineConfig({ base: './', build: { outDir: 'docs', emptyOutDir: true, chunkSizeWarningLimit: 650, rollupOptions:{input:pages.map(path=>resolve(process.cwd(),path))} } });
