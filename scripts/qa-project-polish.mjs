import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {openBrowser} from './browser-config.mjs';
const base=process.argv[2]??'http://127.0.0.1:4331/',label=process.argv[3]??'local',out=`qa-private/project-polish/${label}`;
mkdirSync(out,{recursive:true});
const projects=JSON.parse(readFileSync('src/content/projects.json','utf8')),report={at:new Date().toISOString(),base,checks:[],cases:[],passed:false};
const ok=(label,value)=>{assert(value,label);report.checks.push(label)};
const browser=await openBrowser({args:['--mute-audio']});
try{
 for(const [width,language,theme]of [[1440,'ru','light'],[1440,'en','dark'],[390,'kk','light'],[390,'en','dark'],[320,'ru','light'],[320,'kk','dark']])for(const motion of ['reduce','no-preference']){
  const name=`${width}-${language}-${theme}-${motion}`,mobile=width<700,context=await browser.newContext({viewport:{width,height:mobile?844:1000},hasTouch:mobile,isMobile:mobile,colorScheme:theme,reducedMotion:motion});
  try{
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(p=>localStorage.setItem('portfolio.preferences.v1',JSON.stringify(p)),{language,theme});
   await page.goto(base+'?lang='+language);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);
   ok(name+': featured work uses real Helio hero',await page.locator('.hero-project img').evaluate(i=>i.complete&&i.naturalWidth>0&&i.currentSrc.includes('helio-hero')));
   ok(name+': studio entry remains available',await page.locator('.room-entry').isVisible());
   for(const project of projects){
    const card=page.locator('#'+project.id),preview=card.locator('.project-preview');
    ok(name+': '+project.id+' preview destination',project.demo?new URL(await preview.getAttribute('href'),base).href===project.demo:new URL(await preview.getAttribute('href'),base).pathname===new URL('projects/'+project.id+'.html',base).pathname);
    ok(name+': '+project.id+' verified stack',await card.locator('.card-stack').innerText()===project.stack.slice(0,3).join(' / '));
   }
   await page.screenshot({path:out+'/'+name+'-hero.png'});
   const rail=page.locator('#project-rail');await rail.scrollIntoViewIfNeeded();await rail.focus();await page.keyboard.press('Home');await page.waitForTimeout(250);const y=await page.evaluate(()=>scrollY);
   await page.keyboard.press('PageDown');await page.waitForTimeout(550);ok(name+': keyboard pages sideways',await rail.evaluate(e=>e.scrollLeft>10));ok(name+': paging preserves vertical position',Math.abs(await page.evaluate(()=>scrollY)-y)<2);
   await page.keyboard.press('Home');await page.waitForTimeout(550);ok(name+': Home returns to first project',await rail.evaluate(e=>e.scrollLeft<2));
   await page.screenshot({path:out+'/'+name+'-projects.png'});
   if(mobile&&motion==='reduce'){
    const session=await context.newCDPSession(page),r=await page.locator('#helio .project-preview').boundingBox(),touchY=Math.min(750,Math.max(100,r.y+r.height*.55));
    const swipe=async(x0,y0,x1,y1)=>{await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y:y0}]});for(let i=1;i<=8;i++){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x0+(x1-x0)*i/8,y:y0+(y1-y0)*i/8}]});await page.waitForTimeout(18)}await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(650)};
    const originalY=await page.evaluate(()=>scrollY);await swipe(width-45,touchY,45,touchY);ok(name+': native touch swipes projects',await rail.evaluate(e=>e.scrollLeft>10));ok(name+': sideways swipe keeps page position',Math.abs(await page.evaluate(()=>scrollY)-originalY)<3);
    await page.reload();await page.evaluate(()=>document.fonts.ready);await page.locator('#helio .project-preview').evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));await page.waitForTimeout(150);const verticalBox=await page.locator('#helio .project-preview').boundingBox(),verticalStart=Math.min(700,Math.max(230,verticalBox.y+verticalBox.height*.65)),verticalY=await page.evaluate(()=>scrollY);await swipe(width/2,verticalStart,width/2,verticalStart-170);ok(name+': vertical touch scroll remains native',await page.evaluate(()=>scrollY)>verticalY+30);await session.detach();
   }
   await page.locator('#helio .project-title').scrollIntoViewIfNeeded();
   await page.locator('#helio .project-title').click();await page.waitForURL('**/projects/helio.html?lang='+language);await page.waitForFunction(()=>document.body.dataset.siteReady==='true');
   const transition=await page.evaluate(()=>({animation:getComputedStyle(document.querySelector('#main')).animationName,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches})); ok(name+': arrival respects reduced motion',transition.animation===(motion==='reduce'?'none':'page-arrive'));
   ok(name+': full case retains language',await page.locator('html').getAttribute('lang')===language);ok(name+': no overflow',await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=1));ok(name+': no runtime errors',errors.length===0);
   report.cases.push({width,language,theme,motion,transition,passed:true});
  }finally{await context.close()}
 }
 report.passed=true;
}finally{await browser.close();writeFileSync(out+'/checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,checks:report.checks.length}))}
