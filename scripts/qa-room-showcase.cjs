const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const base=process.argv[2]||'http://127.0.0.1:4331/',label=process.argv[3]||'local';
const out=path.resolve('qa-private/showcase');fs.mkdirSync(out,{recursive:true});
const report={base,label,checks:[],scenarios:[]},ok=(name,value)=>{assert(value,name);report.checks.push(name)};
const ids=['helio','keyform','poslesvet','framepack','shapecheck','rowline'];
const click=async(page,selector,mobile)=>mobile?page.locator(selector).tap():page.locator(selector).click();
(async()=>{let browser;try{
 browser=await chromium.launch({headless:true,executablePath:process.env.ROOM_BROWSER,args:['--mute-audio']});
 for(const mobile of[false,true]){
  const name=mobile?'mobile':'desktop',context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:mobile?2:1,hasTouch:mobile,isMobile:mobile});
  try{
   const page=await context.newPage(),errors=[],detailRequests=[];
   page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>{if(/\/projects\/media\/.+-detail-1-/.test(request.url()))detailRequests.push(request.url())});
   await page.addInitScript(()=>localStorage.setItem('room-studio-slice-audio-v1',JSON.stringify({version:1,muted:true})));
   await page.goto(base+'room/?lang=en');await page.waitForFunction(()=>window.__SLICE__?.ready,null,{timeout:90000});
   const initial=await page.evaluate(()=>__SLICE__.inspect());
   ok(name+': no detail-preview requests before selection',detailRequests.length===0);
   ok(name+': no dynamic monitor texture during entry',initial.showcase.dynamicTextures===0);
   ok(name+': entry audio remains unarmed',!initial.audio.armed&&initial.audio.desiredMaster===0);
   await click(page,'#actions-toggle',mobile);await click(page,'#case-button',mobile);
   ok(name+': catalogue still has six existing projects',await page.locator('[data-project]').count()===6);
   ok(name+': catalogue does not prefetch detail shots',detailRequests.length===0);
   const slowHero=async route=>{await new Promise(resolve=>setTimeout(resolve,550));await route.continue().catch(()=>{})};
   await context.route('**/projects/media/keyform-detail-1-*',slowHero);
   await click(page,'[data-project="keyform"]',mobile);await click(page,'[data-back]',mobile);await click(page,'[data-project="shapecheck"]',mobile);
   await page.waitForFunction(()=>__SLICE__.inspect().showcase.id==='shapecheck');
   const latest=await page.evaluate(()=>__SLICE__.inspect().showcase);
   await page.waitForTimeout(700);
   ok(name+': late image cannot overwrite latest project',await page.evaluate(old=>__SLICE__.inspect().showcase.id===old.id&&__SLICE__.inspect().showcase.updates===old.updates,latest));
   ok(name+': rapid selection keeps current panel',await page.locator('#case-detail-shapecheck').count()===1);
   await context.unroute('**/projects/media/keyform-detail-1-*',slowHero);await click(page,'[data-back]',mobile);
   const observations=[];
   for(const id of ids){
    await click(page,`[data-project="${id}"]`,mobile);
    await page.waitForFunction(id=>__SLICE__.inspect().showcase.id===id&&document.querySelector('.project-hero')?.naturalWidth>0,id);
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const state=await page.evaluate(()=>({scene:__SLICE__.inspect(),image:{src:document.querySelector('.project-hero').currentSrc,width:document.querySelector('.project-hero').naturalWidth,display:document.querySelector('.project-hero').getBoundingClientRect().width},animation:getComputedStyle(document.querySelector('.project-showcase')).animationName}));
    ok(name+': '+id+' uses an existing responsive detail capture',state.image.src.includes('/projects/media/'+id+'-detail-1-'));
    // naturalWidth is density-corrected for width-descriptor srcset images.
    const physicalWidth=Number(state.image.src.match(/-(\d+)\.webp(?:[?#]|$)/)?.[1]);
    ok(name+': '+id+' image has enough pixels',physicalWidth>=state.image.display*(mobile?2:1));
    ok(name+': '+id+' one bounded monitor texture',state.scene.showcase.dynamicTextures===1&&state.scene.showcase.width<=1280&&state.scene.textureCount<=initial.textureCount+2);
    ok(name+': '+id+' changes no scene geometry',state.scene.triangles===initial.triangles);
    ok(name+': '+id+' keeps camera position and audio choices',JSON.stringify(state.scene.camera)===JSON.stringify(initial.camera)&&!state.scene.audio.armed&&state.scene.audio.preferences.muted);
    ok(name+': '+id+' local full-case link retained',await page.locator('#case-detail-'+id).getAttribute('href')===`../projects/${id}.html?lang=en`);
    ok(name+': '+id+' preview opens the existing project URL',await page.locator('.project-live-preview').getAttribute('href')===`https://moyisey.github.io/${id}/`);
    ok(name+': '+id+' no panel horizontal overflow',await page.locator('#panel-body').evaluate(e=>e.scrollWidth<=e.clientWidth));
    observations.push({id,image:state.image,showcase:state.scene.showcase,textures:state.scene.textureCount,triangles:state.scene.triangles});
    await click(page,'[data-back]',mobile);
    ok(name+': '+id+' back restores selected-card focus',await page.evaluate(id=>document.activeElement.dataset.project===id,id));
   }
   await click(page,'[data-project="keyform"]',mobile);
   await page.waitForFunction(()=>__SLICE__.inspect().showcase.id==='keyform');
   await page.locator('#language').selectOption('kk');
   ok(name+': Kazakh preview action is localized',await page.locator('.project-live-preview').getAttribute('aria-label')==='Жобаны ашу: Keyform');
   ok(name+': language switch preserves current project',await page.locator('#case-detail-keyform').getAttribute('href')==='../projects/keyform.html?lang=kk');
   await page.locator('#language').selectOption('ru');
   ok(name+': Russian preview action is localized',await page.locator('.project-live-preview').getAttribute('aria-label')==='Открыть проект: Keyform');
   await page.locator('#project-live-keyform').focus();
   await page.evaluate(()=>{const language=document.querySelector('#language');language.value='en';language.dispatchEvent(new Event('change',{bubbles:true}))});
   ok(name+': rerender preserves focused preview link',await page.evaluate(()=>document.activeElement.id==='project-live-keyform'));
   await page.emulateMedia({reducedMotion:'reduce'});
   ok(name+': reduced motion removes showcase fade',await page.locator('.project-showcase').evaluate(e=>getComputedStyle(e).animationName==='none'));
   await page.locator('#language').selectOption('en');await page.waitForFunction(()=>document.querySelector('.project-hero').complete);
   await page.screenshot({path:path.join(out,label+'-'+name+'-showcase.png')});
   // Check native link activation without loading an unrelated complete demo app.
   await context.route('https://moyisey.github.io/keyform/**',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>Existing project destination</title>'}));
   const opened=context.waitForEvent('page');
   if(mobile)await page.locator('.project-live-preview').tap();else{await page.locator('.project-live-preview').focus();await page.keyboard.press('Enter')}
   const popup=await opened;await popup.waitForLoadState();ok(name+': preview activation opens expected destination',popup.url()==='https://moyisey.github.io/keyform/');await popup.close();
   await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#panel').open&&!__SLICE__.inspect().held);
   ok(name+': Escape returns focus to the originating menu',await page.evaluate(()=>document.activeElement.id==='actions-toggle'));
   ok(name+': monitor retains the chosen project after Escape',await page.evaluate(()=>__SLICE__.inspect().showcase.id==='keyform'));
   await click(page,'#actions-toggle',mobile);await click(page,'#desk-button',mobile);await page.waitForFunction(()=>__SLICE__.inspect().progress===1);
   await click(page,'#object-case',mobile);await click(page,'[data-project="keyform"]',mobile);await page.keyboard.press('Escape');
   ok(name+': object-origin close restores monitor focus',await page.evaluate(()=>document.activeElement.id==='object-case'));
   const stable=await page.evaluate(()=>__SLICE__.inspect().showcase);
   await context.route('**/projects/media/rowline-detail-1-*',route=>route.abort('failed'));
   await click(page,'#actions-toggle',mobile);await click(page,'#case-button',mobile);await click(page,'[data-project="rowline"]',mobile);await page.locator('.preview-error').waitFor({state:'visible'});
   ok(name+': failed image keeps a usable project link',await page.locator('.project-live-preview').getAttribute('href')==='https://moyisey.github.io/rowline/');
   ok(name+': failed image retains last good monitor texture',await page.evaluate(old=>__SLICE__.inspect().showcase.id===old.id&&__SLICE__.inspect().showcase.updates===old.updates,stable));
   await page.keyboard.press('Escape');ok(name+': no runtime errors',errors.length===0);
   report.scenarios.push({name,initial:{firstFrameAt:initial.firstFrameAt,fullSceneAt:initial.fullSceneAt,textures:initial.textureCount,triangles:initial.triangles},observations});
  }finally{await context.close()}
 }
 const fallback=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
 try{
  await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/.test(type)?null:original.call(this,type,...args)}});
  await fallback.goto(base+'room/?lang=en');await fallback.waitForFunction(()=>window.sliceFatal&&document.querySelector('#actions-toggle').disabled===false);
  await fallback.locator('#load-projects').click();await fallback.locator('[data-project="keyform"]').click();await fallback.waitForFunction(()=>document.querySelector('.project-hero')?.naturalWidth>0);
  ok('fallback: responsive showcase available without WebGL',await fallback.locator('.project-live-preview').isVisible());
  ok('fallback: full case remains reachable',await fallback.locator('#case-detail-keyform').getAttribute('href')==='../projects/keyform.html?lang=en');
  await fallback.keyboard.press('Escape');ok('fallback: Escape closes the panel',await fallback.locator('#panel').evaluate(e=>!e.open));
 }finally{await fallback.close()}
 report.pass=true;
}finally{await browser?.close();fs.writeFileSync(path.join(out,label+'-checks.json'),JSON.stringify(report,null,2))}})().catch(error=>{console.error(error);process.exitCode=1});
