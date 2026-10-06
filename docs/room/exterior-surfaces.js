import * as T from 'three';
// Original metre-scale samples; no photos, remote maps or per-frame texture work.
export function exteriorSurfaces(){
 let seed=4320;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 const canvas=(size)=>{const c=document.createElement('canvas');c.width=c.height=size;return c};
 const texture=(c,color=true)=>{const t=new T.CanvasTexture(c);t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;return t};
 const p=canvas(512),ctx=p.getContext('2d'),rough=canvas(512),r=rough.getContext('2d');ctx.fillStyle='#898d88';ctx.fillRect(0,0,512,512);r.fillStyle='#dddddd';r.fillRect(0,0,512,512);
 // 0.6 x 1.2m sawn pavers in a restrained running bond, 9.6m square sample.
 for(let y=0;y<16;y++)for(let x=-1;x<8;x++){const px=x*64+(y%2)*32,v=rand()*7;ctx.fillStyle=`rgb(${166+v},${166+v},${156+v})`;ctx.fillRect(px+.7,y*32+.6,62.6,30.8);r.fillStyle=`rgb(${206+v*2},${206+v*2},${206+v*2})`;r.fillRect(px+1,y*32+1,62,30)}
 const image=ctx.getImageData(0,0,512,512);for(let i=0;i<image.data.length;i+=4){const grain=(rand()-.5)*6;for(let k=0;k<3;k++)image.data[i+k]+=grain}ctx.putImageData(image,0,0);
 const paving=new T.MeshStandardMaterial({name:'Sawn limestone paving / 0.6 x 1.2m',map:texture(p),roughnessMap:texture(rough,false),roughness:1});paving.map.repeat.set(600/9.6,600/9.6);paving.roughnessMap.repeat.copy(paving.map.repeat);
 const g=canvas(256),gc=g.getContext('2d'),gi=gc.createImageData(256,256);for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4,wide=Math.sin(x*.031+Math.sin(y*.024))*3+Math.sin(y*.047)*2,fine=(rand()-.5)*12;gi.data.set([103+wide+fine,119+wide+fine,80+wide+fine,255],i)}gc.putImageData(gi,0,0);
 const grass=new T.MeshStandardMaterial({name:'Dry summer lawn / 24m sample',map:texture(g),roughness:1});grass.map.repeat.set(1/24,1/24);
 const z=canvas(256),zc=z.getContext('2d'),zi=zc.createImageData(256,256);for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4,v=182+(rand()-.5)*7+Math.sin(x*.098)*2;zi.data.set([v-4,v,v-1,255],i)}zc.putImageData(zi,0,0);const zinc=new T.MeshStandardMaterial({name:'Weathered zinc / 8m sample',map:texture(z),metalness:.48,roughness:.72});zinc.map.repeat.set(1/8,1/8);
 // Low-resolution ambient contact field, not painted sunlight. UV1 spans the plaza once.
 const ao=canvas(1024),a=ao.getContext('2d'),scale=1024/600,px=x=>(x+520)*scale,py=z=>(z+380)*scale;a.fillStyle='white';a.fillRect(0,0,1024,1024);
 function capsule(x,z,w,d,rot){a.save();a.translate(px(x),py(z));a.rotate(-rot);a.scale(scale,scale);for(let spread=5;spread>=.5;spread-=.5){a.fillStyle='rgba(0,0,0,.017)';a.beginPath();a.roundRect(-w/2-spread,-d/2-spread,w+2*spread,d+2*spread,(d+2*spread)/2);a.fill()}a.restore()}
 for(const h of [[-112,-149,91,38,.28],[-114,-9,78,43,-.35],[-284,-40,95,38,-.4]])capsule(...h);capsule(-210,-98,92,92,0);
 for(let i=0;i<22;i++)for(const z of [-211,75]){const x=-360+i*14;const gradient=a.createRadialGradient(px(x),py(z),0,px(x),py(z),3.2*scale);gradient.addColorStop(0,'rgba(0,0,0,.25)');gradient.addColorStop(1,'rgba(0,0,0,0)');a.fillStyle=gradient;a.fillRect(px(x)-4*scale,py(z)-4*scale,8*scale,8*scale)}
 paving.aoMap=texture(ao,false);paving.aoMap.wrapS=paving.aoMap.wrapT=T.ClampToEdgeWrapping;paving.aoMap.channel=1;paving.aoMapIntensity=.7;
 // Existing broad terrain gets restrained large-scale colour, without a sharp empty horizon band.
 const e=canvas(128),ec=e.getContext('2d'),ei=ec.createImageData(128,128);for(let y=0;y<128;y++)for(let x=0;x<128;x++){const i=(y*128+x)*4,v=Math.sin(x*.055)*3+Math.cos(y*.044+x*.02)*3+(rand()-.5)*2;ei.data.set([154+v,161+v,140+v,255],i)}ec.putImageData(ei,0,0);const terrain=new T.MeshStandardMaterial({name:'Subordinate distant terrain / 3km sample',map:texture(e),roughness:1});terrain.map.repeat.set(1/3000,1/3000);
 return{paving,grass,zinc,terrain};
}
export function planarUV(geometry){const p=geometry.attributes.position,uv=[];for(let i=0;i<p.count;i++)uv.push(p.getX(i),p.getZ(i));geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));return geometry;}
