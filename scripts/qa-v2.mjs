import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser-config.mjs';
const base=process.argv[2]??'http://127.0.0.1:5191/';
const label=process.argv[3]??'local';
const directory=`evidence/v2/${label}`;mkdirSync(directory,{recursive:true});
const results=[];
function digest(buffer){return createHash('sha256').update(buffer).digest('hex');}
function safeError(error){return String(error.stack??error.message).replaceAll(process.cwd(),'[project]').replaceAll(process.cwd().replaceAll('\\','/'),'[project]');}
for(const engine of ['chromium','firefox','webkit']){
  const browser=await openBrowser({},engine);
  try{
    for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]]){
      const context=await browser.newContext({viewport:{width,height},hasTouch:device==='mobile',deviceScaleFactor:1,reducedMotion:'reduce'});
      const page=await context.newPage();page.setDefaultTimeout(12000);
      const record={engine,browserVersion:browser.version(),device,viewport:{width,height},url:base,checkedAt:new Date().toISOString(),actions:[],errors:[],failedRequests:[],consoleErrors:[]};
      const action=(name,value=true)=>record.actions.push({name,value,time:new Date().toISOString()});
      page.on('pageerror',error=>record.errors.push(error.message));
      page.on('console',message=>{if(message.type()==='error')record.consoleErrors.push(message.text());});
      page.on('requestfailed',request=>{if(request.failure()?.errorText!=='net::ERR_ABORTED')record.failedRequests.push({url:request.url(),error:request.failure()?.errorText});});
      await page.addInitScript(()=>{
        window.__frames=0;const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=callback=>raf(time=>{window.__frames++;callback(time);});
        window.addEventListener('pageshow',event=>{sessionStorage.setItem('qa-pageshow',String(event.persisted));});
      });
      try{
        await page.goto(base,{waitUntil:'networkidle',timeout:30000});
        await page.waitForFunction(()=>document.querySelector('#scene-viewport')?.classList.contains('is-ready')||document.querySelector('#scene-status')?.textContent?.includes('недоступно'));
        record.scene=await page.locator('#scene-status').textContent();record.webgl=await page.locator('#scene').isVisible();
        record.userAgent=await page.evaluate(()=>navigator.userAgent);
        assert.match(await page.locator('h1').textContent(),/Пишу интерфейсы/);
        assert.equal(await page.locator('article.case').count(),3);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);action('Initial content and no horizontal overflow');
        await page.screenshot({path:`${directory}/${engine}-${device}-hero.png`});
        const canvasHashes=[];
        for(const mode of ['solid','explode','wire']){
          await page.locator(`[data-mode="${mode}"]`).click();assert.equal(await page.locator('#system').getAttribute('data-view'),mode);
          assert.equal(await page.locator(`[data-mode="${mode}"]`).getAttribute('aria-pressed'),'true');
          await page.waitForTimeout(100);
          canvasHashes.push(digest(await page.locator(record.webgl?'#scene':'.scene-fallback').screenshot()));action(`View ${mode}`);
        }
        assert.equal(new Set(canvasHashes).size,3);action('Three views have distinct visual output',canvasHashes);
        for(const layer of ['interface','logic','data']){await page.locator(`button[data-layer="${layer}"]`).click();assert.equal(await page.locator('#system').getAttribute('data-layer'),layer);assert.equal(await page.locator(`button[data-layer="${layer}"]`).getAttribute('aria-pressed'),'true');action(`Select layer ${layer}`,await page.locator('#layer-description').textContent());}
        await page.locator('#signal-start').click();assert.match(await page.locator('#signal-status').textContent(),/Путь завершён/);assert.equal(await page.locator('#signal-start').isEnabled(),true);action('Reduced motion signal completes immediately');
        if(record.webgl){
          await page.locator('#scene-reset').click();action('Reset 3D view');
          await page.locator('#scene').focus();for(const key of ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home']){await page.keyboard.press(key);action(`3D keyboard ${key}`);}
          const box=await page.locator('#scene').boundingBox();const start=digest(await page.locator('#scene').screenshot());
          await page.mouse.move(box.x+box.width*.5,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.65,box.y+box.height*.6,{steps:8});await page.mouse.up();await page.waitForTimeout(100);
          assert.notEqual(digest(await page.locator('#scene').screenshot()),start);action('Mouse drag rotates 3D');
          await page.locator('#scene-reset').click();await page.locator('#motion-toggle').click();assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'false');
          let before=await page.evaluate(()=>window.__frames);await page.waitForTimeout(250);let after=await page.evaluate(()=>window.__frames);assert(after>before);action('User enabled motion produces frames',after-before);
          await page.locator('#motion-toggle').click();await page.waitForTimeout(100);before=await page.evaluate(()=>window.__frames);await page.waitForTimeout(250);after=await page.evaluate(()=>window.__frames);assert.equal(after,before);action('Pause stops requestAnimationFrame',after-before);
        }
        for(const index of [0,1,2]){await page.locator(`[data-step="${index}"]`).click();assert.equal(await page.locator(`[data-step="${index}"]`).getAttribute('aria-pressed'),'true');action(`NeuralBrief step ${index+1}`,await page.locator('#brief-output-text').textContent());}
        for(const id of ['neuralbrief','atyrau','artportal']){const details=page.locator(`#${id} details`);await details.locator('summary').click();assert.equal(await details.getAttribute('open'),'');action(`Expand ${id} case`);await details.locator('summary').click();assert.equal(await details.getAttribute('open'),null);action(`Collapse ${id} case`);}
        await page.locator('#atyrau img').scrollIntoViewIfNeeded();assert.equal(await page.locator('#atyrau img').evaluate(img=>img.complete&&img.naturalWidth===1200),true);action('Real tour screenshot loaded');
        const anchors=await page.locator('a[href^="#"]').evaluateAll(nodes=>nodes.map((node,index)=>({index,href:node.getAttribute('href'),text:node.getAttribute('aria-label')||node.textContent.trim()})));
        for(const anchor of anchors){const link=page.locator('a[href^="#"]').nth(anchor.index);if(anchor.href==='#main'){await page.keyboard.press('Control+Home');await page.keyboard.press('Tab');await link.focus();}await link.click();assert.equal(await page.evaluate(hash=>!!document.querySelector(hash),anchor.href),true);action(`Anchor ${anchor.text}`,anchor.href);}
        for(const link of await page.locator('a[target="_blank"]').all()){
          const href=await link.getAttribute('href');const [popup]=await Promise.all([context.waitForEvent('page'),link.click()]);await popup.waitForLoadState('domcontentloaded',{timeout:30000});assert.equal(new URL(popup.url()).host,'github.com');assert.equal(await popup.evaluate(()=>window.opener===null),true);action('External link opens safely',popup.url());await popup.close();
          assert(href.startsWith('https://github.com/'));
        }
        await page.keyboard.press('Control+Home');await page.locator('.skip-link').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement?.id),'main');action('Skip link moves keyboard focus to main');
        await page.route('**/qa-navigation-probe.html',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Navigation probe</title><p>QA</p>'}));
        const navigation=new URL('qa-navigation-probe.html',base).href;await page.goto(navigation);await page.goBack({waitUntil:'commit'});await page.waitForFunction(()=>document.querySelector('#signal-start')&&!document.querySelector('#signal-start').disabled);
        action('History back restores functional page',{pageshowPersisted:await page.evaluate(()=>sessionStorage.getItem('qa-pageshow'))});
        await page.locator('[data-mode="solid"]').click();assert.equal(await page.locator('#system').getAttribute('data-view'),'solid');
        await page.locator('#system').screenshot({path:`${directory}/${engine}-${device}-system.png`});
        assert.deepEqual(record.errors,[]);assert.deepEqual(record.consoleErrors,[]);assert.deepEqual(record.failedRequests,[]);record.passed=true;
      }catch(error){record.passed=false;record.failure=safeError(error);console.log(`${engine}/${device}: ${error.message}`);}
      writeFileSync(`${directory}/${engine}-${device}.json`,JSON.stringify(record,null,2));results.push(record);await context.close();
    }
    for(const scenario of ['no-webgl','no-js','scene-chunk-failure']){
      const context=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:scenario!=='no-js',reducedMotion:'reduce'});const page=await context.newPage();page.setDefaultTimeout(10000);
      const record={engine,scenario,url:base,checkedAt:new Date().toISOString(),actions:[]};
      try{
        if(scenario==='no-webgl')await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'||type==='webgl2'||type==='experimental-webgl'?null:original.call(this,type,...args);};});
        if(scenario==='scene-chunk-failure')await page.route(/\/src\/scene\.ts|\/assets\/scene-[^/]+\.js/,route=>route.abort());
        await page.goto(base,{waitUntil:'networkidle',timeout:30000});
        assert.equal(await page.locator('#scene').isVisible(),false);assert.equal(await page.locator('.scene-fallback').isVisible(),true);
        assert.equal(await page.locator('article.case').count(),3);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        if(scenario!=='no-js'){
          await page.locator('[data-mode="solid"]').click();assert.equal(await page.locator('#system').getAttribute('data-view'),'solid');await page.locator('button[data-layer="logic"]').click();assert.match(await page.locator('#layer-description').textContent(),/условия/);await page.locator('#signal-start').click();assert.match(await page.locator('#signal-status').textContent(),/Путь завершён/);assert.equal(await page.locator('#scene-reset').isVisible(),false);record.actions.push('2D modes, layers and signal remain functional');
        }else assert.equal(await page.locator('.scene-controls').isVisible(),false);
        for(const id of ['neuralbrief','atyrau','artportal']){await page.locator(`#${id} summary`).click();assert.equal(await page.locator(`#${id} details`).getAttribute('open'),'');}
        await page.locator('#system').screenshot({path:`${directory}/${engine}-${scenario}.png`});record.passed=true;
      }catch(error){record.passed=false;record.failure=safeError(error);console.log(`${engine}/${scenario}: ${error.message}`);}
      writeFileSync(`${directory}/${engine}-${scenario}.json`,JSON.stringify(record,null,2));results.push(record);await context.close();
    }
  }finally{await browser.close();}
}
const summary={url:base,checkedAt:new Date().toISOString(),checks:results.length,passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).map(r=>({engine:r.engine,device:r.device,scenario:r.scenario,failure:r.failure})),physicalDevices:false,realSafari:false,webkitIsSafari:false};
writeFileSync(`${directory}/summary.json`,JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));if(summary.failed.length)process.exitCode=1;
