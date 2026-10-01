import {openBrowser} from './browser-config.mjs';
import {createInterface} from 'node:readline';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const target=process.argv[2];if(!target)throw new Error('Provide the public portfolio URL');
const browser=await openBrowser();const directory='evidence/v2/manual-screenshots';mkdirSync(directory,{recursive:true});
let context,page,mobile=false;const events=[],errors=[],consoleErrors=[];
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
async function open(width,height,touch=false){
  if(context)await context.close();mobile=touch;
  context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,isMobile:touch,hasTouch:touch,reducedMotion:'reduce'});
  page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  const response=await page.goto(target,{waitUntil:'networkidle',timeout:30000});
  await page.waitForFunction(()=>document.querySelector('#scene-viewport')?.classList.contains('is-ready')||document.querySelector('#scene-status')?.textContent.includes('недоступно'));
  return{status:response.status(),title:await page.title(),viewport:{width,height},mobileEmulation:touch};
}
async function snapshot(command){
  const filename=`${directory}/${command.name.replace(/[^a-z0-9-]/gi,'')}.png`;await page.screenshot({path:filename,fullPage:!!command.fullPage});
  const state=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,scrollY,scene:document.querySelector('#scene-status')?.textContent,view:document.querySelector('#system')?.getAttribute('data-view'),layer:document.querySelector('#system')?.getAttribute('data-layer'),description:document.querySelector('#layer-description')?.textContent,signal:document.querySelector('#signal-status')?.textContent,paused:document.querySelector('#motion-toggle')?.getAttribute('aria-pressed'),stage:document.querySelector('[data-step][aria-pressed="true"]')?.getAttribute('data-step'),stageTitle:document.querySelector('#brief-content h4')?.textContent,details:[...document.querySelectorAll('details')].map(d=>({case:d.closest('article')?.id,open:d.open}))}));
  return{screenshot:filename,url:page.url(),state};
}
console.log(JSON.stringify({ready:await open(1440,1000),target}));
const input=createInterface({input:process.stdin,crlfDelay:Infinity});
for await(const line of input){
  try{
    const command=JSON.parse(line);let detail;
    if(command.action==='close'){
      writeFileSync('evidence/v2/manual-live-log.json',JSON.stringify({target,generatedAt:new Date().toISOString(),browser:'Playwright Chromium '+browser.version(),method:'Agent-directed individual clicks and visual inspection through Playwright; touch via Chromium CDP. Emulation, not a physical device or human browser session.',events,errors,consoleErrors},null,2));input.close();process.stdin.pause();await browser.close();console.log(JSON.stringify({closed:true,events:events.length,errors,consoleErrors}));break;
    }
    if(command.action==='viewport')detail=await open(command.width,command.height,command.mobile);
    else if(command.action==='click'){const element=page.locator(command.selector);detail={selector:command.selector,text:await element.innerText().catch(()=>'')};if(mobile)await element.tap();else await element.click();}
    else if(command.action==='external'){
      const element=page.locator(command.selector);const expected=await element.getAttribute('href');
      const [popup]=await Promise.all([page.waitForEvent('popup'),mobile?element.tap():element.click()]);await popup.waitForLoadState('domcontentloaded',{timeout:30000});
      detail={expected,actual:popup.url(),title:await popup.title(),openerNull:await popup.evaluate(()=>window.opener===null)};await popup.close();
    }else if(command.action==='key'){await page.locator('#scene').focus();await page.keyboard.press(command.key);detail={key:command.key};}
    else if(command.action==='drag'){
      await page.locator('#scene').scrollIntoViewIfNeeded();const box=await page.locator('#scene').boundingBox();const before=hash(await page.locator('#scene').screenshot());
      const x=box.x+box.width*.5,y=box.y+box.height*.5;await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+95,y-35,{steps:12});await page.mouse.up();await page.waitForTimeout(100);
      detail={before,after:hash(await page.locator('#scene').screenshot())};
    }else if(command.action==='swipe'||command.action==='two-fingers'){
      await page.locator('#scene').scrollIntoViewIfNeeded();const box=await page.locator('#scene').boundingBox();const x=Math.round(box.x+box.width*.5),y=Math.round(Math.min(box.y+box.height*.7,700));
      const beforeY=await page.evaluate(()=>scrollY),beforeHash=hash(await page.locator('#scene').screenshot());const cdp=await context.newCDPSession(page);
      const points=(step)=>command.action==='swipe'?[{x,y:y-step*24,id:1}]:[{x:x-35+step*7,y:y-step*2,id:1},{x:x+35+step*7,y:y-step*2,id:2}];
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points(0)});
      for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points(i)});await page.waitForTimeout(25);}
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(350);await cdp.detach();
      detail={scrollBefore:beforeY,scrollAfter:await page.evaluate(()=>scrollY),before:beforeHash,after:hash(await page.locator('#scene').screenshot())};
    }else if(command.action==='inspect')detail={controls:await page.locator('a,button,summary').evaluateAll(nodes=>nodes.map(node=>({tag:node.tagName,text:node.getAttribute('aria-label')||node.textContent.trim(),href:node.getAttribute('href'),id:node.id,mode:node.getAttribute('data-mode'),layer:node.getAttribute('data-layer'),step:node.getAttribute('data-step')})))};
    else throw new Error('Unknown action');
    await page.waitForTimeout(250);const observed=await snapshot(command);const event={name:command.name,action:command.action,detail,observed,time:new Date().toISOString()};events.push(event);console.log(JSON.stringify(event));
  }catch(error){const event={pass:false,error:error.message,time:new Date().toISOString()};events.push(event);console.log(JSON.stringify(event));}
}
