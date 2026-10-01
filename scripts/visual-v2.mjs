import {mkdirSync,writeFileSync} from 'node:fs';
import {openBrowser} from './browser-config.mjs';
mkdirSync('evidence/v2/screenshots',{recursive:true});
const browser=await openBrowser();
try{
  for(const [name,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
    const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:5190/',{waitUntil:'networkidle',timeout:30000});
    await page.locator('#scene-viewport.is-ready').waitFor({timeout:20000});
    await page.screenshot({path:`evidence/v2/screenshots/${name}-hero.png`});
    await page.screenshot({path:`evidence/v2/screenshots/${name}-full.png`,fullPage:true});
    await page.locator('#system').screenshot({path:`evidence/v2/screenshots/${name}-system.png`});
    await page.locator('#neuralbrief').screenshot({path:`evidence/v2/screenshots/${name}-neuralbrief.png`});
    await page.locator('#atyrau').screenshot({path:`evidence/v2/screenshots/${name}-atyrau.png`});
    await page.locator('#artportal').screenshot({path:`evidence/v2/screenshots/${name}-artportal.png`});
    const report={name,width,height,errors,overflow:await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth})),status:await page.locator('#scene-status').textContent(),images:await page.locator('img').evaluateAll(images=>images.map(i=>({src:i.getAttribute('src'),complete:i.complete,naturalWidth:i.naturalWidth})))};
    writeFileSync(`evidence/v2/${name}-initial.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));await page.close();
  }
}finally{await browser.close();}
