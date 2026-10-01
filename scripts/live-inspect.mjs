import {openBrowser} from './browser-config.mjs';
import {createInterface} from 'node:readline';
import {writeFileSync} from 'node:fs';
const target=process.argv[2];
if(!target)throw new Error('Provide the public portfolio URL');
const browser=await openBrowser();
let context,page,mobile=false;
const events=[],errors=[];
async function open(width,height,touch=false){
 if(context)await context.close();
 mobile=touch;context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:touch,hasTouch:touch});
 page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto(target,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>document.querySelector('#scene-viewport')?.classList.contains('is-ready'));
 return {status:response.status(),title:await page.title()};
}
async function snapshot(name,fullPage=false){
 const filename=`evidence/manual-${name.replace(/[^a-z0-9-]/gi,'')}.png`;
 await page.screenshot({path:filename,fullPage});
 return {screenshot:filename,url:page.url(),state:await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollY,scene:document.querySelector('#scene-status')?.textContent,mode:document.querySelector('[data-mode][aria-pressed="true"]')?.getAttribute('data-mode'),paused:document.querySelector('#motion-toggle')?.getAttribute('aria-pressed'),stage:document.querySelector('[data-step][aria-pressed="true"]')?.getAttribute('data-step'),stageTitle:document.querySelector('#brief-content h4')?.textContent,details:document.querySelector('details')?.open,interactive:[...document.querySelectorAll('a,button,summary,canvas[tabindex]')].map(e=>({tag:e.tagName,text:e.getAttribute('aria-label')??e.textContent?.trim(),href:e.getAttribute('href'),mode:e.getAttribute('data-mode'),step:e.getAttribute('data-step')}))}))};
}
console.log(JSON.stringify({ready:await open(1440,1000),target}));
const input=createInterface({input:process.stdin,crlfDelay:Infinity});
for await(const line of input){
 try{
  const command=JSON.parse(line);let detail;
  if(command.action==='close'){writeFileSync('evidence/manual-live-log.json',JSON.stringify({target,generatedAt:new Date().toISOString(),method:'Agent-directed browser inspection; Playwright input and mobile emulation, not physical-device testing.',events,errors},null,2));await browser.close();console.log(JSON.stringify({closed:true,events:events.length,errors}));break;}
  if(command.action==='viewport')detail=await open(command.width,command.height,command.mobile);
  else if(command.action==='click'){
   const element=page.locator(command.selector);
   detail={clicked:await element.innerText().catch(()=>''),selector:command.selector};
   if(mobile)await element.tap();else await element.click();
  }else if(command.action==='external'){
   const element=page.locator(command.selector);const expected=await element.getAttribute('href');
   const [popup]=await Promise.all([page.waitForEvent('popup'),mobile?element.tap():element.click()]);
   await popup.waitForURL(expected,{waitUntil:'domcontentloaded',timeout:25000});
   detail={expected,actual:popup.url(),title:await popup.title()};await popup.close();
  }else if(command.action==='drag'){
   const box=await page.locator('#scene').boundingBox();const x=box.x+box.width*.6,y=box.y+box.height*.45;
   await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+85,y-30,{steps:12});await page.mouse.up();detail={dragStart:{x,y},dragEnd:{x:x+85,y:y-30}};
  }else if(command.action==='key'){
   await page.locator('#scene').focus();await page.keyboard.press(command.key);detail={key:command.key};
  }else if(command.action==='swipe'){
   const box=await page.locator('#scene').boundingBox();const x=Math.round(box.x+box.width*.5),y=Math.round(Math.min(box.y+box.height*.75,760));const before=await page.evaluate(()=>scrollY);
   const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
   for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-i*28}]});await page.waitForTimeout(25);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(350);detail={before,after:await page.evaluate(()=>scrollY)};await cdp.detach();
  }else if(command.action!=='inspect')throw new Error('Unknown action');
  await page.waitForTimeout(700);const observed=await snapshot(command.name,command.fullPage);
  const event={name:command.name,action:command.action,detail,observed,time:new Date().toISOString()};events.push(event);console.log(JSON.stringify(event));
 }catch(error){const event={pass:false,error:error.message,time:new Date().toISOString()};events.push(event);console.log(JSON.stringify(event));}
}
