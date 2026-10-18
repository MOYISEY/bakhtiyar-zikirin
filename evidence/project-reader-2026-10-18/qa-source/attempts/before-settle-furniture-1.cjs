const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict'),zlib=require('zlib'),crypto=require('crypto');
const base=process.argv[2]||'http://127.0.0.1:4331/',label=process.argv[3]||'local',out=path.resolve('qa-private/furniture/'+label);fs.mkdirSync(out,{recursive:true});
const report={at:new Date().toISOString(),base,label,checks:[],scenarios:[],passed:false},ok=(n,v)=>{assert(v,n);report.checks.push(n)};
const sceneUrl=lang=>base+'room/?lang='+lang;
const click=async(p,s,mobile)=>mobile?p.locator(s).tap():p.locator(s).click();
const openActions=async(p,mobile)=>{if(await p.locator('#controls').isHidden())await click(p,'#actions-toggle',mobile);await p.locator('#controls').waitFor({state:'visible'});};
const waitDrawer=(p,value)=>p.waitForFunction(value=>Math.abs(__SLICE__.inspect().drawer-value)<.0001,value);
const pos=async(p,id)=>p.locator(id).evaluate(e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}});
async function drag(page,context,from,to,mobile){
 if(mobile){const s=await context.newCDPSession(page);await s.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});for(let i=1;i<=12;i++){await s.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*i/12,y:from.y+(to.y-from.y)*i/12}]});await page.waitForTimeout(18)}await s.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await s.detach();/* Separate native gestures: Chromium suppresses compatibility clicks immediately after a prevented touch drag. */await page.waitForTimeout(350)}
 else{await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:12});await page.mouse.up()}
}
(async()=>{let browser;try{
 for(const model of JSON.parse(fs.readFileSync('models/room/assets.json','utf8')).models){const id=model.id;
  const raw=fs.readFileSync('public/room/assets/studio-furniture/'+id+'.glb'),compressed=fs.readFileSync('public/room/assets/studio-furniture/'+id+'.glb.gz'),j=JSON.parse(raw.subarray(20,20+raw.readUInt32LE(12)).toString());
  ok(id+': metadata hash matches actual GLB',crypto.createHash('sha256').update(raw).digest('hex')===model.sha256);ok(id+': metadata sizes match published files',raw.length===model.rawBytes&&compressed.length===model.gzipBytes);ok(id+': one isolated model scene',j.scenes.length===1);ok(id+': gzip expands to exact GLB',zlib.gunzipSync(compressed).equals(raw));ok(id+': no external texture requests',(j.images||[]).every(i=>i.bufferView!==undefined));
 }
 browser=await chromium.launch({headless:true,executablePath:process.env.ROOM_BROWSER,args:['--mute-audio']});
 for(const mobile of [false,true])for(const motion of ['no-preference','reduce']){
  const name=(mobile?'mobile':'desktop')+'-'+motion;if(process.argv.includes('--mobile-reduced')&&name!=='mobile-reduce')continue;const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile,reducedMotion:motion});
  try{
   const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   await p.addInitScript(()=>{localStorage.setItem('room-studio-slice-audio-v1',JSON.stringify({version:1,muted:true}));sessionStorage.setItem('office-cord-guide','seen')});
   await p.addInitScript(()=>{window.__inputLog=[];for(const type of ['pointerdown','pointerup','click','focusout','focusin'])document.addEventListener(type,e=>{window.__inputLog.push({type,target:e.target.id,detail:e.detail,related:e.relatedTarget?.id,menuHidden:document.querySelector('#controls')?.hidden,time:performance.now()});if(window.__inputLog.length>150)window.__inputLog.shift()},true)});
   await p.goto(sceneUrl('en'));await p.waitForFunction(()=>window.__SLICE__?.ready,null,{timeout:90000});
   const initial=await p.evaluate(()=>__SLICE__.inspect());ok(name+': authored furniture assembled',initial.furniture.variant==='authored');ok(name+': no unsolicited audio',!initial.audio.armed&&initial.audio.desiredMaster===0);
   ok(name+': chair keeps physical units and floor contact',initial.assets.find(a=>a.id==='chair').nativeScale.every(v=>v===1)&&Math.abs(initial.assets.find(a=>a.id==='chair').floorGap)<.001);
   ok(name+': no drawer marker through the closed door',await p.locator('#object-drawer').isHidden());
   await p.locator('#scene').hover();for(let step=0;step<3;step++){await p.mouse.wheel(0,220);await p.waitForFunction(()=>Math.abs(__SLICE__.inspect().progress-__SLICE__.inspect().target)<.0002)}await p.waitForTimeout(400);
   const early=await p.evaluate(()=>__SLICE__.inspect());ok(name+': drawer available before end of entry',early.progress<.96&&early.camera[2]<1.9&&await p.locator('#object-drawer').isVisible());
   const closed=await pos(p,'#object-drawer');await p.locator('#object-drawer').focus();await p.keyboard.press('Enter');await waitDrawer(p,1);
   ok(name+': keyboard opens a bounded physical drawer',await p.evaluate(()=>Math.abs(__SLICE__.inspect().furniture.drawerOffset-.29)<.0001));
   ok(name+': keyboard keeps drawer focus',await p.evaluate(()=>document.activeElement.id==='object-drawer'));
   await p.screenshot({path:out+'/'+name+'-drawer-open.png'});
   const opened=await pos(p,'#object-drawer'),endpoints=await p.evaluate(()=>__SLICE__.drawerGrip());await drag(p,context,opened,{x:opened.x+(endpoints.closed.x-endpoints.current.x)*1.2,y:opened.y+(endpoints.closed.y-endpoints.current.y)*1.2},mobile);await waitDrawer(p,0);
   ok(name+': native drag closes drawer',await p.evaluate(()=>__SLICE__.inspect().furniture.drawerOffset<.0001));
   await click(p,'#object-drawer',mobile);await waitDrawer(p,1);ok(name+': pointer tap opens drawer',await p.locator('#object-drawer').getAttribute('aria-pressed')==='true');
   const stableTextures=await p.evaluate(()=>__SLICE__.inspect().textureCount);
   for(let n=0;n<8;n++){await p.locator('#object-drawer').focus();await p.keyboard.press('Enter');await waitDrawer(p,n%2===0?0:1)}
   ok(name+': repeated mechanics allocate no textures',await p.evaluate(count=>__SLICE__.inspect().textureCount===count,stableTextures));
   await openActions(p,mobile);await click(p,'#profile-button',mobile);await p.locator('#panel[open]').waitFor();
   for(const lang of ['ru','kk','en']){await p.locator('#language').selectOption(lang);ok(name+': '+lang+' language accessible with book open',await p.locator('#language').isVisible()&&await p.locator('html').getAttribute('lang')===lang)}
   ok(name+': book preserves drawer state',await p.evaluate(()=>__SLICE__.inspect().drawer===1));await p.keyboard.press('Escape');await p.waitForFunction(()=>!__SLICE__.inspect().held);
   await openActions(p,mobile);await click(p,'#desk-button',mobile);await p.waitForTimeout(2200);
   await p.locator('#object-lamp').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>__SLICE__.inspect().lamp===false);ok(name+': keyboard controls authored lamp',await p.locator('#object-lamp').getAttribute('aria-pressed')==='false');
   const cord=await p.evaluate(()=>__SLICE__.cord());await drag(p,context,cord.grip,{x:cord.grip.x,y:Math.min(820,cord.grip.y+110)},mobile);await p.waitForFunction(()=>__SLICE__.inspect().lamp===true);
   await p.waitForFunction(()=>__SLICE__.inspect().pull===0);ok(name+': real cord drag returns to its travel limit',await p.evaluate(()=>__SLICE__.inspect().pullLimit===.12&&__SLICE__.inspect().pullThreshold===.065));
   if(process.argv.includes('--mobile-reduced')){console.log(JSON.stringify(await p.evaluate(()=>({phase:'before-window-menu',state:__SLICE__.inspect(),controls:document.querySelector('#controls').hidden,active:document.activeElement.id,events:window.__inputLog?.slice(-45)}))));await p.screenshot({path:out+'/before-window.png'})}
   try{await openActions(p,mobile)}catch(error){console.log(JSON.stringify(await p.evaluate(()=>({phase:'failed-window-menu',state:__SLICE__.inspect(),controls:document.querySelector('#controls').hidden,active:document.activeElement.id,events:window.__inputLog?.slice(-45)}))));await p.screenshot({path:out+'/failed-window.png'});throw error}await click(p,'#window-button',mobile);await p.waitForFunction(()=>__SLICE__.inspect().progress===1);await p.waitForTimeout(motion==='reduce'?100:600);
   ok(name+': window view hides occluded desk actions',await p.locator('#object-drawer').isHidden()&&await p.locator('#object-case').isHidden());
   await openActions(p,mobile);await click(p,'#entrance-button',mobile);await p.waitForFunction(()=>__SLICE__.inspect().progress===0);await p.waitForTimeout(500);
   ok(name+': exit preserves physical camera clearance',await p.evaluate(()=>__SLICE__.inspect().cameraClear));ok(name+': no unavailable markers at entrance',await p.locator('.object-action:visible').count()===0);ok(name+': no runtime errors',errors.length===0);
   report.scenarios.push({name,earlyProgress:early.progress,textures:initial.textureCount,assets:initial.assets,passed:true});
  }finally{await context.close()}
 }
 const rawFallback=await browser.newContext({reducedMotion:'reduce'});try{
  let rawRequested=false;const p=await rawFallback.newPage();p.on('request',r=>{if(r.url().endsWith('/chair.glb'))rawRequested=true});
  await rawFallback.route('**/assets/studio-furniture/chair.glb.gz',r=>r.abort());await p.goto(sceneUrl('en'));await p.waitForFunction(()=>window.__SLICE__?.ready,null,{timeout:90000});
  ok('load: raw GLB recovers when compressed asset fails',rawRequested&&await p.evaluate(()=>__SLICE__.inspect().furniture.variant==='authored'));
 }finally{await rawFallback.close()}
 const fallback=await browser.newContext({viewport:{width:320,height:568}});try{
  await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args)}});
  const p=await fallback.newPage();await p.goto(sceneUrl('kk'));await p.waitForFunction(()=>window.sliceFatal&&document.querySelector('#actions-toggle').disabled===false);
  ok('fallback: physical drawer action is unavailable',await p.locator('#object-drawer').isHidden()&&await p.locator('#drawer-button').isDisabled());
  await p.locator('#load-projects').click();ok('fallback: six real projects remain accessible',await p.locator('[data-project]').count()===6);
 }finally{await fallback.close()}
 const small=await browser.newContext({viewport:{width:320,height:568},hasTouch:true,isMobile:true,reducedMotion:'reduce'});try{
  const p=await small.newPage();await p.goto(sceneUrl('kk'));await p.waitForFunction(()=>window.__SLICE__?.ready,null,{timeout:90000});await openActions(p,true);
  ok('small viewport: room menu fits the visible height',await p.locator('#controls').evaluate(e=>e.getBoundingClientRect().bottom<=innerHeight-10));
  await p.locator('#rain-motion-button').scrollIntoViewIfNeeded();ok('small viewport: last action can be reached',await p.locator('#rain-motion-button').isVisible());
  ok('small viewport: drawer label is translated',await p.locator('#drawer-button').textContent()==='Түйіндеме · тартпа');
 }finally{await small.close()}
 report.passed=true;
}finally{await browser?.close();fs.writeFileSync(out+'/checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,checks:report.checks.length,scenarios:report.scenarios.length}))}})().catch(e=>{console.error(e);process.exitCode=1});
