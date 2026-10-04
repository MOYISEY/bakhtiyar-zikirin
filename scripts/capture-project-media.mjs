import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser-config.mjs';
const root='public/projects/media',report={at:new Date().toISOString(),method:'Fresh native Chromium screenshots of the actual public demos, 1280×800, JPEG quality 86. Preview images are browser-canvas resizes of the same capture, 720×450 JPEG quality 78; no generated interface or replaced project pixels.',captures:[],passed:false};
mkdirSync(root,{recursive:true});mkdirSync('evidence/v12',{recursive:true});
if(process.argv.includes('--resume')&&existsSync('evidence/v12/media-provenance.json')) {
 const previous=JSON.parse(readFileSync('evidence/v12/media-provenance.json','utf8'));
 report.captures=previous.captures.filter(c=>previous.captures.filter(x=>x.id===c.id).length===2);
}
const only=process.argv.find(x=>x.startsWith('--project='))?.split('=')[1];
if(only)report.captures=report.captures.filter(c=>c.id!==only);
const b=await openBrowser(),save=()=>writeFileSync('evidence/v12/media-provenance.json',JSON.stringify(report,null,2));
const urls={helio:'https://moyisey.github.io/helio/?city=london&date=2026-06-21&lang=ru&time=08:00',keyform:'https://moyisey.github.io/keyform/',poslesvet:'https://moyisey.github.io/poslesvet/',framepack:'https://moyisey.github.io/framepack/',shapecheck:'https://moyisey.github.io/shapecheck/',rowline:'https://moyisey.github.io/rowline/',atyrau:'https://moyisey.github.io/atyrau-tour-3d/tour_v2/'};
async function shot(page,id,index,state,errors){
 assert.deepEqual(errors,[],id+' page errors');
 const name=`${id}-${index}.jpg`,bytes=await page.screenshot({type:'jpeg',quality:86});writeFileSync(root+'/'+name,bytes);
 const entry={id,index,url:page.url(),state,at:new Date().toISOString(),width:1280,height:800,file:'projects/media/'+name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),errors:[...errors]};
 if(index===1){
  const encoded=await page.evaluate(async data=>{const img=new Image();img.src='data:image/jpeg;base64,'+data;await img.decode();const canvas=document.createElement('canvas');canvas.width=720;canvas.height=450;canvas.getContext('2d').drawImage(img,0,0,720,450);return canvas.toDataURL('image/jpeg',.78).split(',')[1];},bytes.toString('base64'));
  const preview=Buffer.from(encoded,'base64');writeFileSync(root+'/'+id+'-preview.jpg',preview);entry.preview={file:'projects/media/'+id+'-preview.jpg',width:720,height:450,bytes:preview.length,sha256:createHash('sha256').update(preview).digest('hex')};
 }
 report.captures.push(entry);save();console.log(JSON.stringify({id,index,bytes:entry.bytes,preview:entry.preview?.bytes}));
}
try {
for(const [id,url] of Object.entries(urls)) {
 if(only&&id!==only)continue;
 if(report.captures.filter(c=>c.id===id).length===2)continue;
 const context=await b.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'}),p=await context.newPage(),errors=[];
 p.on('pageerror',x=>errors.push(x.message));p.setDefaultTimeout(30000);
 try {
  const r=await p.goto(url,{waitUntil:'domcontentloaded',timeout:60000});assert.equal(r.status(),200);await p.evaluate(()=>document.fonts.ready);
  if(id==='helio') {
   await p.locator('.build-neighborhood:enabled').waitFor({timeout:60000});await p.locator('.build-neighborhood').click();
   await p.waitForFunction(()=>Number(document.querySelector('.map-panel')?.dataset.modelParts)>0,null,{timeout:45000});
   const view=p.getByRole('button',{name:'Объёмный вид',exact:true});if(await view.getAttribute('aria-pressed')!=='true')await view.click();
   await p.locator('.neighborhood-map').evaluate(el=>scrollTo(0,scrollY+el.getBoundingClientRect().top-14));await p.waitForTimeout(1200);
   const state=await p.locator('.map-panel').evaluate(el=>({...el.dataset}));assert.equal(state.modelIncomplete,'false');assert(!await p.locator('.map-fallback').count());
   await shot(p,id,1,{view:'real London neighborhood, morning',...state,attribution:await p.locator('.maplibregl-ctrl-attrib').innerText()},errors);
   await p.locator('#map-time').evaluate(el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'1080');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});await p.waitForTimeout(1000);
   await shot(p,id,2,{view:'same neighborhood, evening',...await p.locator('.map-panel').evaluate(el=>({...el.dataset})),attribution:await p.locator('.maplibregl-ctrl-attrib').innerText()},errors);
  } else if(id==='keyform') {
   await p.waitForFunction(()=>document.body.innerText.includes('3D готово'));await p.getByRole('button',{name:'По слоям',exact:true}).click();await p.waitForTimeout(1000);
   await shot(p,id,1,{view:'75% layout, exploded keyboard layers'},errors);
   await p.getByRole('button',{name:'В сборе',exact:true}).click();await p.getByRole('button',{name:'65%',exact:true}).click();await p.getByRole('button',{name:'Шалфей',exact:true}).click();await p.waitForTimeout(800);
   await shot(p,id,2,{view:'65% layout, assembled sage case'},errors);
  } else if(id==='poslesvet') {
   await p.waitForFunction(()=>{const status=document.querySelector('#status');return !status||getComputedStyle(status).display==='none';},null,{timeout:45000});
   await p.waitForTimeout(2000);await p.locator('#canvas').focus();await p.keyboard.press('Enter');await p.waitForTimeout(800);
   await shot(p,id,1,{view:'loaded Godot game, first shift after pressing Enter'},errors);
   await p.keyboard.press('h');await p.waitForTimeout(500);await shot(p,id,2,{view:'actual in-game rules opened with H'},errors);
  } else if(id==='framepack') {
   await p.getByRole('button',{name:'Попробовать демо',exact:true}).click();await p.getByRole('button',{name:'Подготовить ассеты',exact:true}).click();
   await p.waitForFunction(()=>document.body.innerText.includes('Готово: 3/3'),null,{timeout:45000});
   await p.locator('main').evaluate(el=>scrollTo(0,0));await shot(p,id,1,{view:'built-in synthetic demo images processed locally'},errors);
   const compare=p.getByRole('button',{name:/Сравнить/}).first();await compare.click();await p.waitForTimeout(300);await shot(p,id,2,{view:'actual comparison dialog for a processed built-in demo image'},errors);
  } else if(id==='shapecheck') {
   await p.locator('select').first().selectOption('ru');await p.getByRole('button',{name:/Проверить все/}).click();await p.waitForTimeout(300);
   await shot(p,id,1,{view:'built-in valid order fixture'},errors);
   await p.getByRole('button',{name:/Type drift/}).click();await p.waitForTimeout(300);await shot(p,id,2,{view:'built-in invalid fixture with validation results'},errors);
  } else if(id==='rowline') {
   await p.getByRole('button',{name:'Открыть пример',exact:true}).click();await p.waitForTimeout(1200);
   await shot(p,id,1,{view:'built-in synthetic CSV example, loaded table and validation'},errors);
   await p.getByRole('button',{name:'Добавить правило',exact:true}).click();await p.waitForTimeout(200);await shot(p,id,2,{view:'actual cleaning-rule selection dialog'},errors);
  } else if(id==='atyrau') {
   await p.waitForFunction(()=>typeof viewer!=='undefined'&&viewer.isLoaded(),null,{timeout:45000});
   await p.evaluate(()=>{window.__captureLoaded=false;viewer.on('load',()=>window.__captureLoaded=true);});
   await p.locator('.thumb').nth(1).click();
   await p.waitForFunction(()=>window.__captureLoaded===true&&viewer.isLoaded(),null,{timeout:60000});await p.evaluate(()=>viewer.setYaw(0));await p.waitForTimeout(1800);
   await shot(p,id,1,{view:'fresh university facade scene, thumbnail 2; not the old portfolio photograph'},errors);
   await p.evaluate(()=>window.__captureLoaded=false);await p.locator('.ftab').nth(1).click();await p.waitForFunction(()=>Number(currentFloor)===2&&window.__captureLoaded===true&&viewer.isLoaded(),null,{timeout:60000});await p.waitForTimeout(1200);
   await shot(p,id,2,{view:'actual second-floor panorama'},errors);
  }
 }finally{await context.close();}
}
report.passed=report.captures.length===14;save();
}catch(error){report.failure=error.message;save();console.error(error.message);process.exitCode=1;}finally{await b.close();}
