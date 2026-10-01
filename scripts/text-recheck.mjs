import {openBrowser} from './browser-config.mjs';
import {writeFileSync} from 'node:fs';
const target=process.argv[2]??'http://127.0.0.1:5173/';
const browser=await openBrowser();
const results=[];
for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
 await page.goto(target,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('#scene-viewport')?.classList.contains('is-ready'));
 await page.evaluate(()=>{const nodes=[...document.querySelectorAll('body *')];const sizes=nodes.map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]);sizes.forEach(([e,size])=>{e.style.fontSize=`${size*2}px`;});});
 await page.screenshot({path:`evidence/text200-final-${width}.png`,fullPage:true});
 results.push(await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflowElements:[...document.querySelectorAll('body *')].filter(e=>{if(getComputedStyle(e).position==='absolute'||e.classList.contains('sr-only'))return false;const r=e.getBoundingClientRect();return r.width>0&&(r.left< -1||r.right>innerWidth+1)}).map(e=>({tag:e.tagName,class:e.className,text:e.textContent?.trim().slice(0,60),right:e.getBoundingClientRect().right}))})));
 await page.close();
}
await browser.close();writeFileSync('evidence/text200-final.json',JSON.stringify({target,results},null,2));console.log(JSON.stringify(results,null,2));if(results.some(r=>r.scrollWidth!==r.width))process.exitCode=1;
