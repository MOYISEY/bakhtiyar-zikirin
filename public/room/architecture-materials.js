import * as T from 'three';

// Original repeatable surface samples; seed and physical scale are fixed.
// Colour is sRGB. Roughness and tangent normals are data, never colour converted.
export function architecturalMaterial(kind){
 const size=512,c=document.createElement('canvas');c.width=c.height=size;
 const rough=c.cloneNode(),normal=c.cloneNode(),ctx=c.getContext('2d'),r=rough.getContext('2d'),n=normal.getContext('2d');
 const pixels=ctx.createImageData(size,size),rp=r.createImageData(size,size),np=n.createImageData(size,size);let seed=4240;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,grain=random(),wood=kind==='joinery';
  const fine=wood?Math.sin(x*.53+Math.sin(y*.012)*.8)*2.2+Math.sin(x*.117+Math.sin(y*.025)*.25)*4:(grain-.5)*6;
  const base=wood?[166,139,105]:[181,178,166];const pore=grain>.996?(wood?-12:-25):0;
  for(let k=0;k<3;k++)pixels.data[i+k]=base[k]+fine+pore;pixels.data[i+3]=255;
  const roughness=wood?176+(grain-.5)*12:202+(grain-.5)*14;rp.data.set([roughness,roughness,roughness,255],i);
  np.data.set([128+(grain-.5)*9,128+(random()-.5)*9,255,255],i);
 }
 ctx.putImageData(pixels,0,0);r.putImageData(rp,0,0);n.putImageData(np,0,0);
 const tex=(canvas,color)=>{const t=new T.CanvasTexture(canvas);t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(kind==='joinery'?1.6:1/1.1,kind==='joinery'?.5:1/1.1);t.anisotropy=8;return t};
 const material=new T.MeshStandardMaterial({map:tex(c,true),roughnessMap:tex(rough,false),normalMap:tex(normal,false),normalScale:new T.Vector2(.18,.18),roughness:1});material.name=kind==='joinery'?'Original ash veneer / metres':'Original honed limestone / metres';return material;
}
