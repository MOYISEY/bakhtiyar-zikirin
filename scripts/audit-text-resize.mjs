import {openBrowser} from './browser-config.mjs';
import {writeFileSync} from 'node:fs';
const browser=await openBrowser();
const results=[];
for(const width of [1440,390]){
 const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('#scene-viewport')?.classList.contains('is-ready'));
 await page.evaluate(()=>{const nodes=[...document.querySelectorAll('body *')];const sizes=nodes.map(element=>[element,parseFloat(getComputedStyle(element).fontSize)]);sizes.forEach(([element,size])=>{element.style.fontSize=`${size*2}px`;});});
 const result=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,boxesOutside:[...document.querySelectorAll('h1,h2,h3,h4,p,a,button')].filter(element=>{const r=element.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left< -1);}).map(element=>({selector:element.tagName+'.'+element.className,text:element.textContent.trim().slice(0,70),right:element.getBoundingClientRect().right,left:element.getBoundingClientRect().left})),textOutside:[...document.querySelectorAll('body *')].flatMap(element=>[...element.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim()).map(node=>{const range=document.createRange();range.selectNode(node);const rects=[...range.getClientRects()].filter(r=>r.width>0&&(r.left< -1||r.right>innerWidth+1));return rects.length?{parent:element.tagName+'.'+element.className,text:node.textContent.trim().slice(0,70),rects:rects.map(r=>({left:r.left,right:r.right}))}:null;})).filter(Boolean)}));
 await page.screenshot({path:`evidence/design-text-200-${width}.png`,fullPage:true});
 results.push(result);await page.close();
}
await browser.close();writeFileSync('evidence/design-text-resize.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
