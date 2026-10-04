import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {openBrowser} from './browser-config.mjs';
const manifest=JSON.parse(readFileSync('src/content/media.json','utf8'));
const proof=JSON.parse(readFileSync('evidence/v13/media-provenance.json','utf8'));
const browser=await openBrowser();
async function encode(page,id,data,crop,widths,stem) {
 const result=await page.evaluate(async ({base64,crop,widths})=>{
  const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();
  const rect=crop??{x:0,y:0,width:image.width,height:image.height};
  if(rect.x<0||rect.y<0||rect.x+rect.width>image.width||rect.y+rect.height>image.height)throw Error('Crop exceeds lossless source');
  return {sourceWidth:image.width,sourceHeight:image.height,crop:rect,quality:.94,variants:widths.filter(w=>w<=rect.width).map(width=>{
   const height=Math.round(width*rect.height/rect.width),c=document.createElement('canvas');c.width=width;c.height=height;
   const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(image,rect.x,rect.y,rect.width,rect.height,0,0,width,height);
   return {width,height,data:c.toDataURL('image/webp',.94).split(',')[1]};
  })};
 },{base64:data.toString('base64'),crop,widths});
 result.variants=result.variants.map(({data,...meta})=>{const bytes=Buffer.from(data,'base64'),file=`projects/media/${stem}-${meta.width}.webp`;writeFileSync('public/'+file,bytes);return {...meta,file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};});
 return result;
}
async function shot(page,id,clip,state){
 const data=await page.screenshot({type:'png',clip});writeFileSync(`qa-private/v13/${id}-focused-source.png`,data);
 return {data,source:{index:'card',url:page.url(),at:new Date().toISOString(),dpr:await page.evaluate(()=>devicePixelRatio),clip,state,canvas:[],losslessSourceBytes:data.length,losslessSourceSha256:createHash('sha256').update(data).digest('hex')}};
}
const save=()=>{writeFileSync('src/content/media.json',JSON.stringify(manifest,null,2)+'\n');writeFileSync('evidence/v13/media-provenance.json',JSON.stringify(proof,null,2)+'\n');};
try{
 const c=await browser.newContext(),encoder=await c.newPage();
 const hero=await encode(encoder,'helio',readFileSync('qa-private/v13/helio-card-source.png'),null,[800,1600,2400,3000],'helio-hero');
 manifest.helio.hero=hero.variants;proof.projects.helio.hero=hero;
 for(const index of [1,2]) {
  const asset=await encode(encoder,'keyform',readFileSync(`qa-private/v13/keyform-${index}-source.png`),null,[960,1600,2400,2880],`keyform-detail-${index}`);
  manifest.keyform.shots[index-1]=asset.variants;proof.projects.keyform.shots[index-1]=asset;
 }
 // The thumbnail uses the existing lossless PNG, cropped to the complete processed queue.
 const frame=await encode(encoder,'framepack',readFileSync('qa-private/v13/framepack-1-source.png'),{x:880,y:480,width:2048,height:1280},[480,800,1200,1600],'framepack-card');
 manifest.framepack.card=frame.variants;proof.projects.framepack.card=frame;proof.projects.framepack.captures[1]={...proof.projects.framepack.captures[0],index:'card',state:{view:'focused crop of complete processed queue from the first lossless capture'},crop:frame.crop};
 await c.close();save();
 for(const id of (process.argv.includes('--encode-only')?[]:['shapecheck','rowline'])) {
  const context=await browser.newContext({viewport:{width:1600,height:1050},deviceScaleFactor:3,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(proof.projects[id].sourceUrl,{waitUntil:'load'});await page.evaluate(()=>document.fonts.ready);
  let clip;
  if(id==='shapecheck'){
   await page.locator('select').first().selectOption('ru');await page.getByRole('button',{name:/Проверить вс[её]/}).waitFor({timeout:45000});await page.getByRole('button',{name:/Проверить вс[её]/}).click();await page.getByRole('button',{name:/Проверить вс[её]/}).waitFor({timeout:45000});
   const rect=await page.locator('.payload-panel').boundingBox();assert(rect);clip={x:rect.x,y:rect.y,width:rect.width,height:rect.height};
  }else{
   await page.getByRole('button',{name:'Открыть пример',exact:true}).click();await page.waitForTimeout(600);
   await page.locator('.data-panel').evaluate(el=>scrollTo({top:scrollY+el.getBoundingClientRect().top-8,behavior:'instant'}));await page.waitForTimeout(150);
   const rect=await page.locator('.data-panel').boundingBox();assert(rect);clip={x:rect.x,y:Math.max(0,rect.y),width:rect.width,height:rect.width/1.6};
  }
  const card=await shot(page,id,clip,{view:id==='shapecheck'?'focused actual valid JSON response panel':'focused actual synthetic CSV table with toolbar'}),asset=await encode(page,id,card.data,null,[480,800,1200,1600],id+'-card');
  assert.deepEqual(errors,[]);manifest[id].card=asset.variants;proof.projects[id].card=asset;proof.projects[id].captures[1]=card.source;save();console.log(JSON.stringify({id,clip,variants:asset.variants.map(v=>({width:v.width,bytes:v.bytes}))}));await context.close();
 }
 // A real viewpoint toward the campus building, rather than the reverse view across the square.
 if(!process.argv.includes('--encode-only')){
 const context=await browser.newContext({viewport:{width:1600,height:1000},deviceScaleFactor:2,reducedMotion:'reduce'}),page=await context.newPage();await page.goto(proof.projects.atyrau.sourceUrl,{waitUntil:'load'});
 await page.waitForFunction(()=>typeof viewer!=='undefined'&&viewer.isLoaded(),null,{timeout:60000});await page.evaluate(()=>{window.__captureLoaded=false;viewer.on('load',()=>window.__captureLoaded=true);});await page.locator('.thumb').nth(1).click();await page.waitForFunction(()=>window.__captureLoaded&&viewer.isLoaded(),null,{timeout:60000});await page.evaluate(()=>{viewer.setYaw(180);viewer.setHfov(85);});await page.waitForTimeout(1200);
 const data=await page.screenshot({type:'png'});writeFileSync('qa-private/v13/atyrau-1-source.png',data);
 const panorama=await page.evaluate(async()=>{const url=new URL(viewer.getConfig().panorama,location.href).href,img=new Image();img.src=url;await img.decode();return {url,width:img.naturalWidth,height:img.naturalHeight,hfov:viewer.getHfov(),yaw:viewer.getYaw()};});
 const source={index:1,url:page.url(),at:new Date().toISOString(),dpr:2,state:{view:'actual campus facade facing the building; panorama source remains the detail limit',panorama},canvas:await page.locator('canvas').evaluateAll(nodes=>nodes.map(c=>({width:c.width,height:c.height,cssWidth:c.getBoundingClientRect().width,cssHeight:c.getBoundingClientRect().height}))),losslessSourceBytes:data.length,losslessSourceSha256:createHash('sha256').update(data).digest('hex')};
 const detail=await encode(page,'atyrau',data,null,[960,1600,2400,3200],'atyrau-detail-1');
 const card=await encode(page,'atyrau',data,{x:266,y:112,width:2668,height:1668},[480,800,1200,1600],'atyrau-card');
 manifest.atyrau.card=card.variants;manifest.atyrau.shots[0]=detail.variants;proof.projects.atyrau.card=card;proof.projects.atyrau.shots[0]=detail;proof.projects.atyrau.captures[0]=source;proof.projects.atyrau.captures[1]={...source,index:'card',crop:card.crop};save();await context.close();
 }
}finally{await browser.close();}
