import { readFileSync,writeFileSync,mkdirSync,existsSync } from 'node:fs';
import { resolve,sep } from 'node:path';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { openBrowser } from './browser-config.mjs';
const commit='a9e5082851339df47c064fc153032d3e91a113fb';
const root=resolve('qa-private/projects/atyrau-tour-3d/tour_v2');
const html=readFileSync(resolve(root,'index.html'),'utf8');
const firstFloor=html.slice(html.indexOf('const SCENES'),html.indexOf('  floor2_start:'));
const images=[...firstFloor.matchAll(/img:\s*"([^"]+)"/g)].map(match=>match[1]);
mkdirSync(resolve(root,'images'),{recursive:true});
const downloads=await Promise.all(images.map(async path=>{
  const destination=resolve(root,path),url=`https://raw.githubusercontent.com/MOYISEY/atyrau-tour-3d/${commit}/tour_v2/${path}`;
  if(!existsSync(destination)){const response=await fetch(url,{signal:AbortSignal.timeout(40000)});if(!response.ok)throw new Error(`${response.status}: ${url}`);writeFileSync(destination,Buffer.from(await response.arrayBuffer()));}
  return {path,url,bytes:readFileSync(destination).length};
}));
const server=createServer((request,response)=>{
  const path=resolve(root,'.'+decodeURIComponent(new URL(request.url,'http://localhost').pathname));
  if(path!==root&&!path.startsWith(root+sep)){response.writeHead(403).end();return;}
  try{const file=path===root?resolve(root,'index.html'):path;response.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':'image/jpeg');response.end(readFileSync(file));}catch{response.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(5290,'127.0.0.1',resolve));
let browser;
try{
  browser=await openBrowser();const page=await browser.newPage({viewport:{width:1200,height:720},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:5290/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>typeof pannellum!=='undefined'&&eval('viewer')?.isLoaded(),{timeout:30000});
  await page.locator('#loader.gone').waitFor({state:'attached',timeout:15000});
  await page.evaluate(()=>eval('viewer').setYaw(160,false));
  await page.waitForTimeout(1000);
  mkdirSync('public/projects',{recursive:true});await page.screenshot({path:'public/projects/atyrau-tour.jpg',type:'jpeg',quality:84});
  const report={checkedAt:new Date().toISOString(),repository:'https://github.com/MOYISEY/atyrau-tour-3d',sourceCommit:commit,sourcePath:'tour_v2/index.html',capture:'public/projects/atyrau-tour.jpg',viewport:{width:1200,height:720},localExecution:true,scene:await page.evaluate(()=>eval('currentScene')),yaw:await page.evaluate(()=>eval('viewer').getYaw()),loaded:await page.evaluate(()=>eval('viewer').isLoaded()),pageErrors:errors,images:downloads,screenshotSha256:createHash('sha256').update(readFileSync('public/projects/atyrau-tour.jpg')).digest('hex')};
  mkdirSync('evidence/v2',{recursive:true});writeFileSync('evidence/v2/tour-screenshot-provenance.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
