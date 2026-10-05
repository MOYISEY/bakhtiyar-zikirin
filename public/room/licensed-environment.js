import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export async function buildLicensedEnvironment(scene,{wall,cloth,box,contact,wood,brass}){
 const loader=new GLTFLoader(),tex=new T.TextureLoader();
 const [facade,foliage,plant,...maps]=await Promise.all([loader.loadAsync('assets/facade/selected.gltf'),loader.loadAsync('assets/foliage/selected.gltf'),loader.loadAsync('assets/potted_plant_02/selected.gltf'),...['cobblestone_floor_08','white_plaster_02'].flatMap(a=>['diff','nor_gl','rough'].map(p=>tex.loadAsync(`assets/${a}/${p}.webp`))),tex.loadAsync('assets/cloth-normal.webp')]);
 for(const root of [facade.scene,foliage.scene,plant.scene])root.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){m.aoMapIntensity=.85;if(m.map)m.map.anisotropy=4;if(m.normalMap)m.normalScale.set(.65,.65);if(m.transparent)m.depthWrite=false;}}});
 function surface(list,repeat){list[0].colorSpace=T.SRGBColorSpace;for(const t of list){t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=4;}return{map:list[0],normalMap:list[1],roughnessMap:list[2]};}
 const plasterMap=maps[3],pc=document.createElement('canvas');pc.width=plasterMap.image.width;pc.height=plasterMap.image.height;const px=pc.getContext('2d');px.drawImage(plasterMap.image,0,0);const pd=px.getImageData(0,0,pc.width,pc.height);for(let i=0;i<pd.data.length;i+=4){pd.data[i]=pd.data[i]*.16+218*.84;pd.data[i+1]=pd.data[i+1]*.16+217*.84;pd.data[i+2]=pd.data[i+2]*.16+209*.84;}px.putImageData(pd,0,0);plasterMap.image=pc;plasterMap.needsUpdate=true;Object.assign(wall,surface(maps.slice(3,6),[6,6]));wall.bumpMap=null;wall.normalScale.set(.055,.055);wall.color.set('#eee8d4');wall.needsUpdate=true;
 const fabric=maps[6];fabric.wrapS=fabric.wrapT=T.RepeatWrapping;fabric.repeat.set(2.3,2.3);fabric.anisotropy=8;cloth.normalMap=fabric;cloth.normalScale.set(.28,.28);cloth.bumpMap=null;cloth.needsUpdate=true;
 const garden=new T.Group();scene.add(garden);
 const paving=new T.MeshStandardMaterial({color:'#c2cad0',...surface(maps.slice(0,3),[10,9]),normalScale:new T.Vector2(.6,.6),roughness:.65});
 const ground=new T.Mesh(new T.PlaneGeometry(30,27),paving);ground.rotation.x=-Math.PI/2;ground.position.set(0,-.20,-15);ground.receiveShadow=true;garden.add(ground);
 const stone=new T.MeshStandardMaterial({color:'#aab5b6',roughness:.89}),soil=new T.MeshStandardMaterial({color:'#353b2f',roughness:1}),backing=new T.MeshStandardMaterial({color:'#49565a',roughness:.96});
 // An assembled 15m facade: original 3m architectural modules, recessed openings,
 // doors, skirting, cornice and crown. The source showroom layout is discarded.
 function module(name,parent,x,y,z){const source=facade.scene.getObjectByName(name);if(!source)throw new Error('Missing licensed facade module '+name);const n=source.clone(true);n.position.set(x,y,z);parent.add(n);return n;}
 function wing(parent,columns,floors){for(let col=0;col<columns;col++){const x=(col+1)*3;module('base_standard_01',parent,x,-.2,0);module('dado_standard_standard_01',parent,x,.5,.015);for(let row=0;row<floors;row++){const door=row===0&&col===Math.floor(columns/2),type=door?'door':'window',suffix=door?'01':row%2?'02':'01';module(`wall_${type}_centered_large_${suffix}`,parent,x,row*3-.2,0);module(`${type}_centered_large_${suffix}`,parent,x,row*3-.2,0);if(row>0)module('cornice_standard_standard_01',parent,x,row*3-.22,.01);}module('crown_standard_standard_01',parent,x,floors*3-.2,0);}box(parent,columns*1.5,floors*1.5-.2,-2.55,columns*3,floors*3,4,backing,.008);box(parent,columns*1.5,floors*3-.15,-2.0,columns*3+.05,.18,4.3,stone,.015);}
 const rear=new T.Group();rear.position.set(-8.7,0,-14.5);garden.add(rear);wing(rear,5,3);
 const side=new T.Group();side.position.set(6.3,0,-5.5);side.rotation.y=-Math.PI/2;garden.add(side);wing(side,3,3);
 // Continuous curb and textured courtyard, with grounded planted beds.
 for(let i=0;i<20;i++)box(garden,-9.5+i,-.10,-12.7,.985,.20,.24,stone,.016);
 for(let i=0;i<7;i++)box(garden,5.1,-.10,-6.2-i,.24,.20,.985,stone,.016);
 for(const [x,z,w,d]of [[-3.5,-9.5,3.5,1.45],[2.7,-10.8,2.8,1.4]]){box(garden,x,-.05,z,w,.30,d,stone,.028);box(garden,x,.11,z,w-.18,.035,d-.18,soil,.008);for(let i=0;i<4;i++){const n=foliage.scene.children[i%2].clone(true);n.position.set(x-w*.34+i*w*.225,.125,z+(i%2-.5)*.29);n.scale.setScalar(i%2?1.45:1.55);n.rotation.y=i*1.9;garden.add(n);}}
 const indoor=plant.scene;const bounds=new T.Box3().setFromObject(indoor),size=bounds.getSize(new T.Vector3()),scale=1.03/size.y;indoor.scale.setScalar(scale);indoor.position.set(2.02,.0125-bounds.min.y*scale,-1.93);scene.add(indoor);indoor.updateMatrixWorld(true);const groundedBounds=new T.Box3().setFromObject(indoor);window.__PLANT_CONTACT__={floorY:.0125,minY:groundedBounds.min.y,gapMetres:groundedBounds.min.y-.0125};contact(2.02,-1.93,.62,.62,.92,.0132,'#191b18');
 // Tight contact shadows supplement the broad real-time shadow map.
 for(const x of [-.82,.82])for(const z of [-.29,.29])contact(-1.10+x*1.04,-1.57+z*1.12,.16,.16,.9,.017);
 for(const x of [-.232,.232])for(const z of [-.217,.217]){const px=x*1.18,pz=z*1.24;contact(-1.01+Math.cos(.19)*px+Math.sin(.19)*pz,-.54-Math.sin(.19)*px+Math.cos(.19)*pz,.16,.16,.95,.042);}
 const outdoorLight=new T.DirectionalLight('#c5d9e7',1.0);outdoorLight.position.set(-3,9,-8);outdoorLight.target.position.set(0,0,-12);outdoorLight.castShadow=true;outdoorLight.shadow.mapSize.set(1024,1024);Object.assign(outdoorLight.shadow.camera,{left:-11,right:11,top:10,bottom:-10,near:.5,far:25});outdoorLight.shadow.bias=-.00005;outdoorLight.shadow.normalBias=.025;outdoorLight.shadow.radius=4;scene.add(outdoorLight,outdoorLight.target);
 return{outdoorLight,garden,indoor,facadeModules:facade.scene.children.length,foliageVariants:foliage.scene.children.length};
}
