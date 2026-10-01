import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser-config.mjs';
const url='https://moyisey.github.io/bakhtiyar-zikirin/';
const directory='evidence/v2/live-diagnostic';mkdirSync(directory,{recursive:true});
const deadline=setTimeout(()=>{console.error('Diagnostic deadline reached');process.exit(2);},90000);
const records=[];
for(const engine of ['webkit','chromium']){
  const browser=await openBrowser({},engine);
  const record={engine,url,checkedAt:new Date().toISOString(),actions:[],errors:[]};
  try{
    const context=await browser.newContext({viewport:engine==='webkit'?{width:390,height:844}:{width:1440,height:1000},hasTouch:engine==='webkit',reducedMotion:'reduce'});
    const page=await context.newPage();page.setDefaultTimeout(10000);
    page.on('pageerror',error=>record.errors.push(error.message));
    await page.addInitScript(()=>{
      window.__qaContextLosses=[];window.__qaStatuses=[];
      document.addEventListener('DOMContentLoaded',()=>{
        document.querySelector('#scene')?.addEventListener('webglcontextlost',()=>window.__qaContextLosses.push(Date.now()));
        const status=document.querySelector('#scene-status');if(status)new MutationObserver(()=>window.__qaStatuses.push(status.textContent)).observe(status,{childList:true,subtree:true});
      });
    });
    await page.goto(url,{waitUntil:'networkidle',timeout:30000});
    await page.waitForFunction(()=>document.querySelector('#scene-viewport').classList.contains('is-ready'));
    record.fonts=await page.evaluate(()=>({headingWeight:getComputedStyle(document.querySelector('h1')).fontWeight,headingFamily:getComputedStyle(document.querySelector('h1')).fontFamily,headingSize:getComputedStyle(document.querySelector('h1')).fontSize,faces:[...document.fonts].map(face=>({family:face.family,weight:face.weight,status:face.status})),supportsVariations:CSS.supports('font-variation-settings','"wght" 700')}));
    const state=async label=>record.actions.push({label,time:new Date().toISOString(),state:await page.evaluate(()=>{
      const button=document.querySelector('#motion-toggle'),canvas=document.querySelector('#scene'),box=button.getBoundingClientRect(),style=getComputedStyle(button),parent=button.parentElement;
      return {status:document.querySelector('#scene-status').textContent,canvasHidden:canvas.hidden,buttonHidden:button.hidden,parentHidden:parent.hidden,display:style.display,visibility:style.visibility,pressed:button.getAttribute('aria-pressed'),bbox:{x:box.x,y:box.y,width:box.width,height:box.height},scrollY,contextLosses:window.__qaContextLosses,statusHistory:window.__qaStatuses};
    })});
    if(engine==='webkit'){
      for(const mode of ['solid','explode','wire'])await page.locator(`[data-mode="${mode}"]`).click();
      for(const layer of ['interface','logic','data'])await page.locator(`button[data-layer="${layer}"]`).click();
      await page.locator('#signal-start').click();await page.locator('#scene-reset').click();
      await page.locator('#scene').focus();for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'])await page.keyboard.press(key);
      await state('Before pointer drag');
      const box=await page.locator('#scene').boundingBox();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.65,box.y+box.height*.6,{steps:8});await page.mouse.up();
      await state('After pointer drag');await page.locator('#scene-reset').click();await state('Before motion click');
      try{await page.locator('#motion-toggle').click();await state('After enable motion click');assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'false');await page.locator('#motion-toggle').click();await state('After pause click');}
      catch(error){await state('Motion click failure');throw error;}
      await page.locator('#system').screenshot({path:`${directory}/webkit-mobile-system.png`});
    }else{
      for(const id of ['neuralbrief','atyrau','artportal','experience','contact'])await page.locator('#'+id).screenshot({path:`${directory}/chromium-${id}.png`});
      await page.locator('#scene').scrollIntoViewIfNeeded();await page.waitForTimeout(250);
      const pixels=[];for(let i=0;i<2;i++){const image=await page.locator('#scene').screenshot();pixels.push(createHash('sha256').update(image).digest('hex'));writeFileSync(`${directory}/chromium-returned-canvas-${i}.png`,image);}
      assert.equal(pixels[0],pixels[1]);record.returnedCanvasHashes=pixels;
      record.actions.push({label:'Returning from offscreen sections restores stable visible canvas'});
    }
    assert.deepEqual(record.errors,[]);record.passed=true;await context.close();
  }catch(error){record.passed=false;record.failure=String(error.stack||error.message).replaceAll(process.cwd(),'[project]');}
  finally{await browser.close();}
  records.push(record);writeFileSync(`${directory}/${engine}.json`,JSON.stringify(record,null,2));console.log(`${engine}: ${record.passed?'PASS':record.failure}`);
}
clearTimeout(deadline);writeFileSync(`${directory}/summary.json`,JSON.stringify({url,checkedAt:new Date().toISOString(),records},null,2));if(records.some(record=>!record.passed))process.exitCode=1;
