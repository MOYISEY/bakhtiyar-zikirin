const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const base=process.argv[2]||'http://127.0.0.1:4331/',label=process.argv[3]||'local';
const out=path.resolve('qa-private/hotspots'),report={at:new Date().toISOString(),base,label,checks:[],scenarios:[]};fs.mkdirSync(out,{recursive:true});
const ok=(name,value)=>{assert(value,name);report.checks.push(name)};
(async()=>{let browser;try{
 browser=await chromium.launch({headless:true,executablePath:process.env.ROOM_BROWSER,args:['--mute-audio']});
 for(const mobile of [false,true]){
  const name=mobile?'mobile':'desktop',context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile});
  try{
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{localStorage.setItem('room-studio-slice-audio-v1',JSON.stringify({version:1,muted:true}));sessionStorage.setItem('office-cord-guide','seen')});
   await page.goto(base+'room/?lang=en');await page.waitForFunction(()=>window.__SLICE__?.ready,null,{timeout:90000});
   const visible=()=>page.locator('.object-action:not([hidden])').evaluateAll(nodes=>nodes.map(n=>n.id));
   ok(name+': no markers behind the closed entrance',!(await visible()).length);
   for(let step=1;step<=2;step++){
    await page.locator('#scene').hover();await page.mouse.wheel(0,220);
    await page.waitForFunction(()=>Math.abs(__SLICE__.inspect().target-__SLICE__.inspect().progress)<.0002);await page.waitForTimeout(150);
    if(step===1)ok(name+': distant closed door blocks room actions',!(await visible()).length);
   }
   const early=await page.evaluate(()=>__SLICE__.inspect());
   ok(name+': useful actions appear before the old .96 cutoff',early.progress<.6&&await page.locator('#object-case').isVisible()&&await page.locator('#object-lamp').isVisible());
   ok(name+': entry remains physically clear',early.cameraClear&&early.doorAngle>=early.doorPassAngle);
   const markers=await visible();
   await page.screenshot({path:path.join(out,label+'-'+name+'-early.png')});
   await page.locator('#object-case').focus();await page.keyboard.press('Enter');await page.locator('#panel[open]').waitFor();
   ok(name+': early keyboard marker opens projects',await page.locator('[data-project]').count()===6);
   ok(name+': panel suppresses object tooltip',await page.locator('#object-hint').isHidden());
   await page.keyboard.press('Escape');await page.waitForFunction(()=>!__SLICE__.inspect().held);
   ok(name+': early close restores object focus',await page.evaluate(()=>document.activeElement.id==='object-case'));
   if(mobile)await page.locator('#object-case').tap();else await page.locator('#object-case').click();
   await page.locator('#panel[open]').waitFor();ok(name+': early pointer marker opens projects',await page.locator('[data-project]').count()===6);
   await page.keyboard.press('Escape');await page.waitForFunction(()=>!__SLICE__.inspect().held);
   if(!mobile){
    await page.locator('#object-lamp').hover();await page.waitForFunction(()=>document.querySelector('#object-hint').dataset.hotspot==='lamp');
    await page.locator('#object-case').hover();await page.waitForFunction(()=>document.querySelector('#object-hint').dataset.hotspot==='case');
    ok(name+': pointer uses a single tooltip',await page.locator('#object-hint:visible').count()===1&&await page.locator('.cord-guide:visible').count()===0);
    await page.screenshot({path:path.join(out,label+'-'+name+'-hint.png')});
   }
   await page.locator('#scene').focus();for(let n=0;n<10;n++)await page.keyboard.press('ArrowRight');await page.waitForTimeout(500);
   ok(name+': turning away removes monitor marker',await page.locator('#object-case').isHidden());
   ok(name+': hidden monitor has no stale tooltip',await page.locator('#object-hint').getAttribute('data-hotspot')!=='case');
   await page.locator('#actions-toggle').click();await page.locator('#window-button').click();
   await page.waitForFunction(()=>__SLICE__.inspect().progress===1);await page.waitForTimeout(500);
   ok(name+': monitor behind the window view is unavailable',await page.locator('#object-case').isHidden());
   await page.locator('#actions-toggle').click();await page.locator('#entrance-button').click();
   await page.waitForFunction(()=>__SLICE__.inspect().progress===0);await page.waitForTimeout(800);
   ok(name+': exit removes room markers and hints',!(await visible()).length&&await page.locator('#object-hint').isHidden());
   ok(name+': no runtime errors',errors.length===0);
   report.scenarios.push({name,earlyProgress:early.progress,doorAngle:early.doorAngle,markers});
  }finally{await context.close()}
 }
 report.pass=true;
}finally{await browser?.close();fs.writeFileSync(path.join(out,label+'.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,checks:report.checks.length,scenarios:report.scenarios}))}})().catch(e=>{console.error(e);process.exitCode=1});
