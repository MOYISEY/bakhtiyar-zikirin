import {readFileSync,writeFileSync} from 'node:fs';
import {openBrowser} from './browser-config.mjs';
const scope=process.argv[2]??'live',projects=JSON.parse(readFileSync('src/content/projects.json','utf8'));
const root=`qa-private/v13/${scope}-quality/`,out='evidence/v13/screenshots/';
const browser=await openBrowser(),page=await browser.newPage();
async function board(items,file,columns=2,cellWidth=640,cellHeight=410){
 const sources=items.map(({label,file})=>({label,data:'data:image/png;base64,'+readFileSync(root+file).toString('base64')}));
 const data=await page.evaluate(async ({sources,columns,cellWidth,cellHeight})=>{
  const c=document.createElement('canvas');c.width=columns*cellWidth;c.height=Math.ceil(sources.length/columns)*cellHeight;
  const ctx=c.getContext('2d');ctx.fillStyle='#f3f0e8';ctx.fillRect(0,0,c.width,c.height);
  for(let i=0;i<sources.length;i++){
   const {label,data}=sources[i],image=new Image();image.src=data;await image.decode();const x=(i%columns)*cellWidth,y=Math.floor(i/columns)*cellHeight;
   ctx.fillStyle='#172223';ctx.font='18px Arial';ctx.fillText(label,x+14,y+26);
   const scale=Math.min((cellWidth-28)/image.width,(cellHeight-52)/image.height);ctx.drawImage(image,x+14,y+42,image.width*scale,image.height*scale);
  }
  return c.toDataURL('image/png').split(',')[1];
 },{sources,columns,cellWidth,cellHeight});writeFileSync(out+file,Buffer.from(data,'base64'));
}
try{for(const [width,dpr]of [[1366,2],[390,3]]){
 const prefix=`${width}-dpr${dpr}-`;
 await board(projects.map((p,i)=>({label:`${p.title} · ${width}px / DPR${dpr}`,file:prefix+'catalog-'+i+'.png'})),`${scope}-cards-${width}-dpr${dpr}.png`,3,520,360);
 const images=projects.flatMap(p=>Array.from({length:p.diagram?1:2},(_,i)=>({label:`${p.title} ${i+1} · ${width}px / DPR${dpr}`,file:prefix+'gallery-'+p.id+'-'+i+'.png'})));
 for(let i=0;i<2;i++)await board(images.slice(i*8,i*8+8),`${scope}-gallery-${width}-dpr${dpr}-${i+1}.png`);
}}finally{await browser.close();}
