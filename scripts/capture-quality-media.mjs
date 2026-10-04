import assert from 'node:assert/strict';
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser-config.mjs';
const root='public/projects/media',proof='evidence/v13',privateRoot='qa-private/v13';
for(const path of [root,proof,privateRoot])mkdirSync(path,{recursive:true});
const selected=process.argv.find(x=>x.startsWith('--project='))?.split('=')[1];
const manifest=existsSync('src/content/media.json')?JSON.parse(readFileSync('src/content/media.json','utf8')):{};
const report=existsSync(proof+'/media-provenance.json')?JSON.parse(readFileSync(proof+'/media-provenance.json','utf8')):{at:new Date().toISOString(),method:'New real-application PNG captures. Separate focused card composition and detailed case images, single resize/encode from lossless capture; no old JPEG enlargement or generated UI. Source canvas dimensions and capture DPR recorded.',projects:{}};
const save=()=>{writeFileSync('src/content/media.json',JSON.stringify(manifest,null,2)+'\n');writeFileSync(proof+'/media-provenance.json',JSON.stringify(report,null,2)+'\n');};
const browser=await openBrowser();
const sourceUrls={keyform:'https://moyisey.github.io/keyform/',helio:'https://moyisey.github.io/helio/?city=london&date=2026-06-21&lang=ru&time=08:00',poslesvet:'https://moyisey.github.io/poslesvet/',framepack:'https://moyisey.github.io/framepack/',shapecheck:'https://moyisey.github.io/shapecheck/',rowline:'https://moyisey.github.io/rowline/',atyrau:'https://moyisey.github.io/atyrau-tour-3d/tour_v2/'};
async function encode(page,bytes,crop,widths,stem,quality=.94) {
 const outputs=await page.evaluate(async ({data,crop,widths,quality})=>{
  const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();
  const rect=crop??{x:0,y:0,width:image.width,height:image.height};
  if(rect.x<0||rect.y<0||rect.x+rect.width>image.width||rect.y+rect.height>image.height)throw Error('Crop exceeds lossless source');
  const variants=[];
  for(const width of widths.filter(w=>w<=rect.width)) {
   const height=Math.round(width*rect.height/rect.width),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
   const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,rect.x,rect.y,rect.width,rect.height,0,0,width,height);
   variants.push({width,height,base64:canvas.toDataURL('image/webp',quality).split(',')[1]});
  }
  return {sourceWidth:image.width,sourceHeight:image.height,crop:rect,variants};
 },{data:bytes.toString('base64'),crop,widths,quality});
 const variants=outputs.variants.map(({base64,...meta})=>{const data=Buffer.from(base64,'base64'),file=`projects/media/${stem}-${meta.width}.webp`;writeFileSync('public/'+file,data);return {...meta,file,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};});
 return {sourceWidth:outputs.sourceWidth,sourceHeight:outputs.sourceHeight,crop:outputs.crop,quality,variants};
}
async function capture(page,id,index,clip,state,fullPage=false) {
 const data=await page.screenshot({type:'png',...(clip?{clip}: {fullPage})});
 writeFileSync(`${privateRoot}/${id}-${index}-source.png`,data);
 const canvas=await page.locator('canvas').evaluateAll(nodes=>nodes.map(c=>({width:c.width,height:c.height,cssWidth:c.getBoundingClientRect().width,cssHeight:c.getBoundingClientRect().height})));
 return {data,source:{index,url:page.url(),at:new Date().toISOString(),dpr:await page.evaluate(()=>devicePixelRatio),clip,fullPage,state,canvas,losslessSourceBytes:data.length,losslessSourceSha256:createHash('sha256').update(data).digest('hex')}};
}
async function mapDensity(page) {
 return page.evaluate(()=>{
  const element=document.querySelector('.neighborhood-map'),key=Object.keys(element).find(k=>k.startsWith('__reactFiber'));
  for(let fiber=element[key],depth=0;fiber&&depth<18;fiber=fiber.return,depth++)for(let hook=fiber.memoizedState;hook;hook=hook.next) {
   const map=hook.memoizedState?.current;
   if(map&&typeof map.setPixelRatio==='function'&&typeof map.getCanvas==='function'&&map.getCanvas()===element.querySelector('canvas')) {
    map.setPixelRatio(devicePixelRatio);map.triggerRepaint();return {pixelRatio:map.getPixelRatio(),method:'existing MapLibre setPixelRatio(devicePixelRatio), this capture session only'};
   }
  }
  throw Error('Could not access the actual MapLibre instance for a real DPR2 render');
 });
}
async function elementClip(page,selector,ratio=1.6) {
 const rect=await page.locator(selector).first().boundingBox();
 assert(rect&&rect.width>0&&rect.height>0);
 const width=Math.min(rect.width,1600),height=width/ratio;
 const clip={x:Math.max(0,rect.x),y:Math.max(0,rect.y),width,height};
 await page.locator(selector).first().evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top,behavior:'instant'}));
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const after=await page.locator(selector).first().boundingBox();clip.y=Math.max(0,after.y);
 assert(clip.y+clip.height<=page.viewportSize().height+1,'capture rectangle must fit current viewport');
 return clip;
}
try {
 for(const [id,url] of Object.entries(sourceUrls)) {
  if(selected&&selected!==id)continue;
  if(!selected&&manifest[id])continue;
  const context=await browser.newContext({viewport:{width:id==='helio'?1280:1600,height:1000},deviceScaleFactor:id==='keyform'?1.8:id==='helio'?3:2,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try {
   const response=await page.goto(url,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);await page.evaluate(()=>document.fonts.ready);
   if(id==='keyform') {
   await page.waitForFunction(()=>document.body.innerText.includes('3D готово'));await page.getByRole('button',{name:'По слоям',exact:true}).click();await page.waitForTimeout(700);
   const first=await capture(page,id,1,null,{layout:'75%',mode:'exploded'});
   const firstAssets=await encode(page,first.data,null,[960,1600,2400,2880],id+'-detail-1');
   const buttons=await page.locator('button').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,aria:n.getAttribute('aria-label'),title:n.title})));writeFileSync(privateRoot+'/keyform-buttons.json',JSON.stringify(buttons,null,2));
   const cleanScene=await page.addStyleTag({content:'.workspace > :not(.scene) { visibility: hidden !important; }'});
   const scene=await page.locator('.scene').boundingBox(),clip={x:(1600-scene.height*1.6)/2,y:scene.y,width:scene.height*1.6,height:scene.height};
   const card=await capture(page,id,'card',clip,{layout:'75%',mode:'exploded',framing:'actual WebGL scene in a closer crop; DOM text overlays hidden only for this thumbnail capture'});
   await cleanScene.evaluate(n=>n.remove());
   const cardAssets=await encode(page,card.data,null,[480,800,1200,1600],id+'-card');
   await page.getByRole('button',{name:'В сборе',exact:true}).click();await page.getByRole('button',{name:'65%',exact:true}).click();await page.getByRole('button',{name:'Шалфей',exact:true}).click();await page.waitForTimeout(600);
   const second=await capture(page,id,2,null,{layout:'65%',mode:'assembled',case:'sage'}),secondAssets=await encode(page,second.data,null,[960,1600,2400,2880],id+'-detail-2');
   assert.deepEqual(errors,[]);manifest[id]={card:cardAssets.variants,shots:[firstAssets.variants,secondAssets.variants]};report.projects[id]={sourceUrl:url,errors,captures:[first.source,card.source,second.source],card:cardAssets,shots:[firstAssets,secondAssets]};save();
   console.log(JSON.stringify({id,card:cardAssets.variants,shots:[firstAssets.variants,secondAssets.variants]}));
   } else {
    let first,card,second,firstClip=null,secondClip=null;
    if(id==='helio') {
     await page.locator('.build-neighborhood:enabled').waitFor({timeout:60000});const density=await mapDensity(page);await page.locator('.build-neighborhood').click();
     await page.waitForFunction(()=>Number(document.querySelector('.map-panel')?.dataset.modelParts)>0,null,{timeout:45000});
     assert.equal(await page.locator('.map-panel').getAttribute('data-model-incomplete'),'false');
     firstClip=await elementClip(page,'.neighborhood-map');const controls=await page.locator('.neighborhood-controls').last().boundingBox();firstClip.height=controls.y+controls.height-firstClip.y+8;await page.waitForTimeout(1200);
     first=await capture(page,id,1,firstClip,{view:'London morning 08:00; actual neighborhood and time controls',density,attribution:await page.locator('.maplibregl-ctrl-attrib').innerText()});
     await page.setViewportSize({width:1120,height:900});await page.locator('.build-neighborhood').click();await page.waitForFunction(()=>Number(document.querySelector('.map-panel')?.dataset.modelParts)>0,null,{timeout:45000});await mapDensity(page);
     const cardClip=await elementClip(page,'.neighborhood-map');await page.waitForTimeout(1200);card=await capture(page,id,'card',cardClip,{view:'focused real map and beginning of the time readout',attribution:await page.locator('.maplibregl-ctrl-attrib').innerText()});
     await page.setViewportSize({width:1280,height:1000});await page.locator('.build-neighborhood').click();await page.waitForFunction(()=>Number(document.querySelector('.map-panel')?.dataset.modelParts)>0,null,{timeout:45000});await mapDensity(page);
     await page.locator('#map-time').evaluate(el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'1080');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});secondClip=await elementClip(page,'.neighborhood-map');const eveningControls=await page.locator('.neighborhood-controls').last().boundingBox();secondClip.height=eveningControls.y+eveningControls.height-secondClip.y+8;await page.waitForTimeout(1200);
     second=await capture(page,id,2,secondClip,{view:'same actual London neighborhood at 18:00',attribution:await page.locator('.maplibregl-ctrl-attrib').innerText()});
    } else if(id==='poslesvet') {
     await page.waitForFunction(()=>{const status=document.querySelector('#status');return !status||getComputedStyle(status).display==='none';},null,{timeout:60000});await page.waitForTimeout(2000);await page.locator('#canvas').focus();await page.keyboard.press('Enter');await page.waitForTimeout(800);
     first=await capture(page,id,1,null,{view:'real loaded first game watch'});
     card=first;await page.keyboard.press('h');await page.waitForTimeout(500);second=await capture(page,id,2,null,{view:'actual in-game rules'});
    } else if(id==='framepack') {
     await page.getByRole('button',{name:'Попробовать демо',exact:true}).click();await page.getByRole('button',{name:/Подготовить (набор|ассеты)/}).click();await page.waitForFunction(()=>document.body.innerText.includes('Готово: 3/3'),null,{timeout:45000});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
     first=await capture(page,id,1,null,{view:'synthetic built-in demo processed'});await page.getByRole('button',{name:/Сравнить/}).first().click();await page.waitForTimeout(400);
     await page.getByRole('heading',{name:/Сравнить/}).last().evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-24,behavior:'instant'}));await page.waitForTimeout(150);
     second=await capture(page,id,2,null,{view:'actual expanded processed-image comparison section, including its heading'});card=second;
    } else if(id==='shapecheck') {
     await page.locator('select').first().selectOption('ru');await page.getByRole('button',{name:/Проверить вс[её]/}).click();await page.getByRole('button',{name:/Проверить вс[её]/}).waitFor();await page.waitForTimeout(500);await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
     first=await capture(page,id,1,null,{view:'actual schema and valid fixture'});card=first;
     await page.getByRole('button',{name:/Type drift/}).click();await page.waitForTimeout(400);second=await capture(page,id,2,null,{view:'actual invalid fixture and validation results, full page including the error details'},true);
    } else if(id==='rowline') {
     await page.getByRole('button',{name:'Открыть пример',exact:true}).click();await page.waitForTimeout(1200);first=await capture(page,id,1,null,{view:'real table from built-in synthetic CSV'});card=first;
     await page.getByRole('button',{name:'Добавить правило',exact:true}).click();await page.waitForTimeout(300);second=await capture(page,id,2,null,{view:'actual rule selection dialog'});
    } else if(id==='atyrau') {
     await page.waitForFunction(()=>typeof viewer!=='undefined'&&viewer.isLoaded(),null,{timeout:60000});await page.evaluate(()=>{window.__captureLoaded=false;viewer.on('load',()=>window.__captureLoaded=true);});await page.locator('.thumb').nth(1).click();await page.waitForFunction(()=>window.__captureLoaded===true&&viewer.isLoaded(),null,{timeout:60000});await page.evaluate(()=>viewer.setYaw(0));await page.waitForTimeout(1600);
     const pano=await page.evaluate(async()=>{const url=new URL(viewer.getConfig().panorama,location.href).href,img=new Image();img.src=url;await img.decode();return {url,width:img.naturalWidth,height:img.naturalHeight,hfov:viewer.getHfov()};});
     first=await capture(page,id,1,null,{view:'fresh actual campus facade; source panorama quality is a hard limit',panorama:pano});card=first;
     await page.evaluate(()=>window.__captureLoaded=false);await page.locator('.ftab').nth(1).click();await page.waitForFunction(()=>Number(currentFloor)===2&&window.__captureLoaded===true&&viewer.isLoaded(),null,{timeout:60000});await page.waitForTimeout(1600);const secondPano=await page.evaluate(async()=>{const url=new URL(viewer.getConfig().panorama,location.href).href,img=new Image();img.src=url;await img.decode();return {url,width:img.naturalWidth,height:img.naturalHeight,hfov:viewer.getHfov()};});second=await capture(page,id,2,null,{view:'actual second-floor panorama',panorama:secondPano});
    }
    assert(first&&second&&card,id+' captures missing');assert.deepEqual(errors,[]);
    const firstAssets=await encode(page,first.data,null,[960,1600,2400,3200],id+'-detail-1');
    const secondAssets=await encode(page,second.data,null,[960,1600,2400,3200],id+'-detail-2');
    const cardAssets=await encode(page,card.data,null,[480,800,1200,1600],id+'-card');
    manifest[id]={card:cardAssets.variants,shots:[firstAssets.variants,secondAssets.variants]};report.projects[id]={sourceUrl:url,errors,captures:[first.source,card.source,second.source],card:cardAssets,shots:[firstAssets,secondAssets]};save();console.log(JSON.stringify({id,card:cardAssets.variants.map(v=>({width:v.width,bytes:v.bytes})),detail:firstAssets.variants.map(v=>({width:v.width,bytes:v.bytes})),canvas:first.source.canvas}));
   }
  }finally{await context.close();}
 }
}finally{await browser.close();}
