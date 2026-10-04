import { defineConfig } from 'vite';
import { resolve } from 'node:path';
const pages=['index.html','projects/index.html',...['helio','keyform','poslesvet','framepack','shapecheck','rowline','atyrau','neuralbrief','artportal'].map(id=>'projects/'+id+'.html')];
export default defineConfig({ base: './', build: { outDir: 'docs', emptyOutDir: true, chunkSizeWarningLimit: 650, rollupOptions:{input:pages.map(path=>resolve(process.cwd(),path))} } });
