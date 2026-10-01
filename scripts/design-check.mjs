import AxeBuilder from '@axe-core/playwright';
import { mkdirSync,writeFileSync } from 'node:fs';
import {openBrowser} from './browser-config.mjs';
const target=process.argv[2]??'http://127.0.0.1:5173/';
const prefix=process.argv[3]??'design';
const browser=await openBrowser();
mkdirSync('evidence',{recursive:true});
const results=[];
for(const width of [1440,1024,768,390,320]){
 const context=await browser.newContext({viewport:{width,height:1000},deviceScaleFactor:1,reducedMotion:'reduce'});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(target,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('#scene-status')?.textContent?.includes('интерактивный'));
 await page.waitForTimeout(300);
 await page.screenshot({path:`evidence/${prefix}-${width}.png`,fullPage:true});
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
 const layout=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,clipped:[...document.querySelectorAll('h1,h2,h3,button,a')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1||r.left< -1}).map(e=>e.textContent?.trim()).filter(Boolean)}));
 results.push({width,layout,errors,violations:axe.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
 if(width===1440){await page.locator('.hero h1,.hero-bottom').evaluateAll(nodes=>nodes.forEach(node=>node.style.visibility='hidden'));await page.locator('#scene-viewport').screenshot({path:'public/scene-still.png'});}
 await context.close();
}
writeFileSync(`evidence/${prefix}-baseline.json`,JSON.stringify({target,results},null,2));console.log(JSON.stringify(results,null,2));
await browser.close();
