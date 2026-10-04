import {readFileSync,writeFileSync} from 'node:fs';
import {openBrowser} from './browser-config.mjs';
const media=JSON.parse(readFileSync('src/content/media.json','utf8'));
const browser=await openBrowser(),page=await browser.newPage({viewport:{width:1680,height:650},deviceScaleFactor:2});
const data=file=>'data:image/'+(file.endsWith('.jpg')?'jpeg':'webp')+';base64,'+readFileSync('public/'+file).toString('base64');
try{
 await page.setContent(`<html lang="ru"><style>body{margin:0;padding:24px;background:#f3f0e8;color:#172223;font:18px Arial}h1{font-size:28px;margin:0 0 12px}p{margin:0 0 18px}.row{display:flex;gap:24px}figure{margin:0;width:800px}img{display:block;width:800px;height:500px;object-fit:contain;background:#e4e8df}figcaption{margin:10px 0}</style><h1>Helio: новое изображение первого экрана</h1><p>Одинаковая ширина 800 CSS px, DPR 2. Собственные снимки реального приложения.</p><div class="row"><figure><img src="${data('projects/media/helio-preview.jpg')}"><figcaption>V12: 720 × 450, JPEG</figcaption></figure><figure><img src="${data(media.helio.hero.find(v=>v.width===2400).file)}"><figcaption>V13: 2400 px, WebP из нового PNG / рендер DPR 3</figcaption></figure></div></html>`);
 await page.locator('img').evaluateAll(async nodes=>{for(const n of nodes)await n.decode();});await page.screenshot({path:'evidence/v13/helio-before-after.png'});
 const regions={helio:[[32,1830],[32,1830]],keyform:[[80,35],[80,35]],poslesvet:[[90,190],[900,340]],framepack:[[880,750],[300,0]],shapecheck:[[1850,600],[100,2100]],rowline:[[570,1220],[950,540]],atyrau:[[1200,300],[1400,650]]};
 for(const [id,project]of Object.entries(media))for(let i=0;i<2;i++){
  const image=project.shots[i].at(-1),[x,y]=regions[id][i];
  const png=await page.evaluate(async ({src,x,y})=>{const img=new Image();img.src=src;await img.decode();const c=document.createElement('canvas');c.width=Math.min(1000,img.naturalWidth-x);c.height=Math.min(340,img.naturalHeight-y);c.getContext('2d').drawImage(img,x,y,c.width,c.height,0,0,c.width,c.height);return c.toDataURL('image/png').split(',')[1];},{src:data(image.file),x,y});
  writeFileSync(`evidence/v13/${id}-detail-${i+1}-native-crop.png`,Buffer.from(png,'base64'));
 }
}finally{await browser.close();}
