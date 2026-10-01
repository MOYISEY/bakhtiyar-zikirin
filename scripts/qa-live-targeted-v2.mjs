import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {openBrowser} from './browser-config.mjs';

const url='https://moyisey.github.io/bakhtiyar-zikirin/';
const productCommit='19dd89c3922f76a2697cf94b1bc552d21de53183';
const directory='evidence/v2/live-targeted';mkdirSync(directory,{recursive:true});
const hash=buffer=>createHash('sha256').update(buffer).digest('hex');
const results=[];
const deadline=setTimeout(()=>{console.error('Targeted live checks reached 180 second deadline');process.exit(2);},180000);
for(const engine of ['chromium','firefox','webkit']){
  const browser=await openBrowser({},engine);
  const record={engine,browserVersion:browser.version(),url,productCommit,checkedAt:new Date().toISOString(),checks:[],errors:[]};
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const page=await context.newPage();page.setDefaultTimeout(15000);
    page.on('pageerror',error=>record.errors.push(error.message));
    await page.goto(url,{waitUntil:'networkidle',timeout:30000});
    await page.waitForFunction(()=>document.querySelector('#scene-viewport')?.classList.contains('is-ready'));
    assert.match(await page.locator('h1').textContent(),/Пишу интерфейсы/);
    assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'true');
    record.identity=await page.evaluate(()=>({theme:document.querySelector('meta[name="theme-color"]').content,background:getComputedStyle(document.body).backgroundColor,h1:document.querySelector('h1').textContent,userAgent:navigator.userAgent}));
    assert.equal(record.identity.theme,'#f3f0e8');
    record.checks.push('Public redesign marker, light palette and paused reduced-motion state');
    await page.locator('#system').scrollIntoViewIfNeeded();
    const pixels=[];
    for(let i=0;i<4;i++){
      await page.waitForTimeout(250);
      const screenshot=await page.locator('#scene').screenshot();pixels.push(hash(screenshot));
      if(i===0)writeFileSync(`${directory}/${engine}-paused-canvas.png`,screenshot);
    }
    assert.equal(new Set(pixels).size,1);record.pausedCanvasHashes=pixels;
    record.checks.push('Four repeated paused canvas screenshots have identical pixels');
    await page.locator('#atyrau img').scrollIntoViewIfNeeded();
    await page.waitForFunction(()=>document.querySelector('#atyrau img').complete);
    const security=await page.evaluate(()=>({forms:document.querySelectorAll('form').length,mailLinks:[...document.querySelectorAll('a[href^="mailto:"]')].map(a=>a.href),pdfLinks:[...document.querySelectorAll('a[href]')].filter(a=>/\.pdf(?:$|[?#])/i.test(a.href)).map(a=>a.href),emailMatches:document.body.innerText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[],externalLinks:[...document.querySelectorAll('a[target="_blank"]')].map(a=>({href:a.href,rel:a.rel})),image:[...document.querySelectorAll('#atyrau img')].map(i=>({complete:i.complete,width:i.naturalWidth,height:i.naturalHeight}))}));
    assert.equal(security.forms,0);assert.equal(security.mailLinks.length,0);assert.equal(security.pdfLinks.length,0);assert.equal(security.emailMatches.length,0);
    for(const link of security.externalLinks){assert.equal(new URL(link.href).hostname,'github.com');assert(link.rel.includes('noopener')&&link.rel.includes('noreferrer'));}
    record.security=security;record.checks.push('No email, PDF/CV, form or unsafe external link in public DOM');
    await page.screenshot({path:`${directory}/${engine}-desktop-full.png`,fullPage:true});
    record.reflow=[];
    for(const [width,height,fontSize] of [[320,720,'100%'],[390,844,'200%']]){
      await page.setViewportSize({width,height});
      await page.evaluate(size=>{document.documentElement.style.fontSize=size;},fontSize);
      await page.waitForTimeout(150);
      const dimensions=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
      assert.equal(dimensions.document<=width,true);record.reflow.push({width,height,fontSize,dimensions});
      await page.keyboard.press('Control+Home');
      await page.screenshot({path:`${directory}/${engine}-${width}-${fontSize.replace('%','percent')}-hero.png`});
    }
    record.checks.push('No horizontal overflow at 320px and 390px with 200% CSS root font size');
    if(engine==='chromium'){
      const assets=await page.evaluate(async()=>{
        const paths=[...new Set([...document.querySelectorAll('script[src],link[href]')].map(node=>node.src||node.href).filter(path=>path.includes('/assets/')))];
        return Promise.all(paths.map(async path=>{const response=await fetch(path);return {url:path,status:response.status,bytes:Array.from(new Uint8Array(await response.arrayBuffer()))};}));
      });
      record.assetIntegrity=assets.map(asset=>{const relative=new URL(asset.url).pathname.split('/bakhtiyar-zikirin/')[1];const local=readFileSync('docs/'+relative);const published=Buffer.from(asset.bytes);assert.equal(asset.status,200);assert.equal(hash(local),hash(published));return {url:asset.url,bytes:published.length,sha256:hash(published),matchesLocalBuiltFile:true};});
      record.checks.push('Entry JavaScript and CSS public bytes match current docs build');
    }
    assert.deepEqual(record.errors,[]);record.passed=true;await context.close();
  }catch(error){record.passed=false;record.failure=String(error.stack||error.message).replaceAll(process.cwd(),'[project]');}
  finally{await browser.close();}
  results.push(record);writeFileSync(`${directory}/${engine}.json`,JSON.stringify(record,null,2));console.log(`${engine}: ${record.passed?'PASS':record.failure}`);
}
clearTimeout(deadline);
const summary={url,productCommit,checkedAt:new Date().toISOString(),passed:results.every(result=>result.passed),results,physicalPhones:false,nativeSafari:false,screenReader:false,fontReflowMethod:'CSS root font size 200%, not browser zoom'};
writeFileSync(`${directory}/summary.json`,JSON.stringify(summary,null,2));if(!summary.passed)process.exitCode=1;
