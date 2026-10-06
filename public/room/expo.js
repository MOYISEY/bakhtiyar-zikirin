import * as T from 'three';
import {createVegetation} from './vegetation.js';
import {exteriorSurfaces,planarUV} from './exterior-surfaces.js';

// Original artistic EXPO view. Nur Alem proportions use the architects' published
// 80m diameter / 100m overall height. This is not a surveyed AITU viewpoint.
// Official photographs are reference-only; no architectural photographs ship.
export function createExpo(scene,sky,treeAtlas,trunkAsset,skyline){
 sky.colorSpace=T.SRGBColorSpace;sky.mapping=T.EquirectangularReflectionMapping;
 scene.background=sky;scene.backgroundIntensity=1.12;scene.backgroundRotation.y=.7;
 scene.fog=new T.Fog('#b8cbd0',900,5600); // Distant aerial perspective, not an edge-hiding fog bank.
 const group=new T.Group();group.name='Original_EXPO_view';scene.add(group);
 const ground=-16,centre=new T.Vector3(-210,44,-98);
 function mesh(geometry,material,x,y,z){const o=new T.Mesh(geometry,material);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;group.add(o);return o;}
 const silver=new T.MeshStandardMaterial({color:'#aeb5b0',metalness:.62,roughness:.43,envMap:sky,envMapIntensity:.7});
 const surfaces=exteriorSurfaces(),paving=surfaces.paving;
 const dark=new T.MeshStandardMaterial({color:'#263f44',metalness:.5,roughness:.3});
 function glazing(cols,rows){
  const c=document.createElement('canvas');c.width=2048;c.height=1024;const a=c.getContext('2d');
  a.fillStyle='#829b9d';a.fillRect(0,0,c.width,c.height);
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const v=((x*73+y*137)%19)/19;a.fillStyle=`rgba(21,61,67,${v*.13})`;a.fillRect(x*c.width/cols,y*c.height/rows,c.width/cols,c.height/rows);}
  a.lineWidth=.85;a.strokeStyle='#516869';a.beginPath();for(let x=0;x<=cols;x++){a.moveTo(x*c.width/cols,0);a.lineTo(x*c.width/cols,c.height);}for(let y=0;y<=rows;y++){a.moveTo(0,y*c.height/rows);a.lineTo(c.width,y*c.height/rows);}a.stroke();
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;
  return new T.MeshPhysicalMaterial({map:t,color:'#e2edf0',metalness:.22,roughness:.16,clearcoat:1,clearcoatRoughness:.09,ior:1.52,envMap:sky,envMapIntensity:1.15});
 }
 const sphereGeometry=new T.SphereGeometry(40,112,72),positions=sphereGeometry.attributes.position,axis=new T.Vector3(.34,.92,-.19).normalize();
 // Smooth local depression at the upper wind scoop. A continuous glass surface,
 // never a faceted geodesic ball or thousands of separate window meshes.
 for(let i=0;i<positions.count;i++){const p=new T.Vector3().fromBufferAttribute(positions,i),d=p.clone().normalize().dot(axis),inlet=T.MathUtils.smoothstep(d,.945,.995);p.addScaledVector(axis,-8*inlet);positions.setXYZ(i,p.x,p.y,p.z);}
 sphereGeometry.computeVertexNormals();
 const sphere=mesh(sphereGeometry,glazing(84,42),...centre.toArray());sphere.name='Nur_Alem_glass_sphere';
 const tangent=new T.Vector3().crossVectors(axis,new T.Vector3(0,0,1)).normalize(),bitangent=new T.Vector3().crossVectors(axis,tangent).normalize();
 const rim=[];for(let i=0;i<=80;i++){const a=i/80*Math.PI*2,p=axis.clone().multiplyScalar(.961).addScaledVector(tangent,Math.cos(a)*.276).addScaledVector(bitangent,Math.sin(a)*.276).normalize().multiplyScalar(40.12);p.add(centre);rim.push(p);}
 mesh(new T.TubeGeometry(new T.CatmullRomCurve3(rim,true),80,.22,5,true),silver,0,0,0);
 const podium=mesh(new T.CylinderGeometry(44,46,20,80,1),glazing(64,7),centre.x,ground+10,centre.z);podium.name='Nur_Alem_base';
 for(const [radius,y]of [[46.6,ground+.3],[47,10]])mesh(new T.CylinderGeometry(radius,radius,.6,80),silver,centre.x,y,centre.z);
 for(let i=0;i<20;i++){const a=i/20*Math.PI*2;mesh(new T.CylinderGeometry(.3,.3,6,8),silver,centre.x+Math.cos(a)*42,7,centre.z+Math.sin(a)*42);}
 // Exhibition halls have a structural envelope, recessed glazing and service roofs.
 // This is an original architectural interpretation, not a licensed surveyed EXPO model.
 function stadium(w,d){const q=new T.Shape(),r=d/2,l=w/2-r;q.moveTo(-l,-r);q.lineTo(l,-r);q.absarc(l,0,r,-Math.PI/2,Math.PI/2,false);q.lineTo(-l,r);q.absarc(-l,0,r,Math.PI/2,Math.PI*1.5,false);return q}
 function pavilion(x,z,w,d,h,rotation,roofKind){
  const g=new T.Group();g.position.set(x,ground,z);g.rotation.y=rotation;group.add(g);
  const add=(geo,mat,px,py,pz)=>{const o=new T.Mesh(geo,mat);o.position.set(px,py,pz);o.castShadow=o.receiveShadow=true;g.add(o);return o};
  const concrete=new T.MeshStandardMaterial({color:'#c1beb1',roughness:.86});
  function slab(y,depth,overhang,mat){const geo=new T.ExtrudeGeometry(stadium(w+overhang,d+overhang),{depth,bevelEnabled:true,bevelSize:.12,bevelThickness:.08,bevelSegments:2,steps:1,curveSegments:20});geo.rotateX(-Math.PI/2);if(mat===surfaces.zinc)planarUV(geo);add(geo,mat,0,y,0)}
  slab(.05,1.0,1.4,concrete);slab(h,.75,2.4,silver);slab(h+.76,.18,.1,surfaces.zinc);
  const perimeter=stadium(w,d).getSpacedPoints(Math.round((2*(w-d)+Math.PI*d)/2.5)),glass=glazing(1,3),mullion=new T.MeshStandardMaterial({color:'#4b5c5e',metalness:.7,roughness:.4});
  for(let i=0;i<perimeter.length-1;i++){const a=perimeter[i],b=perimeter[i+1],length=a.distanceTo(b);if(length<.05)continue;const panels=Math.ceil(length/2.1);for(let j=0;j<panels;j++){const u=a.clone().lerp(b,j/panels),v=a.clone().lerp(b,(j+1)/panels),mid=u.clone().add(v).multiplyScalar(.5),angle=Math.atan2(v.y-u.y,v.x-u.x);const pane=add(new T.BoxGeometry(u.distanceTo(v)-.07,h-1.4,.14),glass,mid.x,(h+1)/2,-mid.y);pane.rotation.y=angle;add(new T.CylinderGeometry(.065,.065,h-.8,6),mullion,u.x,h/2+.4,-u.y);}}
  // Authored roof use: clerestory on the near hall, paired rooflights on the east hall.
  const roofMetal=new T.MeshStandardMaterial({color:roofKind===1?'#a6aca7':'#bab9ac',metalness:.38,roughness:.62});
  const roofGlass=new T.MeshPhysicalMaterial({color:'#75989f',metalness:.22,roughness:.22,clearcoat:.6,envMap:sky});
  if(roofKind===1){
   add(new T.BoxGeometry(w*.50,1.7,5.8),roofGlass,0,h+1.50,0);
   add(new T.BoxGeometry(w*.52,.22,6.4),roofMetal,0,h+2.43,0);
   for(let xx=-w*.24;xx<=w*.24;xx+=3.4){add(new T.BoxGeometry(.12,1.65,5.92),silver,xx,h+1.5,0);}
  }else{
   for(const xx of [-w*.21,w*.21]){add(new T.BoxGeometry(w*.23,.85,7),roofGlass,xx,h+1.22,0);add(new T.BoxGeometry(w*.24,.13,7.3),roofMetal,xx,h+1.73,0);}
  }
  // Keep broad zinc roof planes quiet; fine repeated seam meshes removed after art review.
  // Two service walkways, gutter line and small drain heads make the roof usable.
  for(const zz of [-d*.30,d*.30])add(new T.BoxGeometry(w*.60,.045,.65),concrete,0,h+1.08,zz);
  for(const xx of [-w*.23,w*.23]){add(new T.BoxGeometry(1.1,.09,.65),mullion,xx,h+1.11,d*.42);add(new T.CylinderGeometry(.10,.10,h-.9,6),silver,xx,h/2,d*.47);}
  // Horizontal floor rails, visible deep roof fascia and recessed entry canopy.
  for(const y of [h*.43,h*.74])slab(y,.13,.10,mullion);
  add(new T.BoxGeometry(13,.35,5),silver,0,4.1,d/2+1.2);
  for(const xx of [-5.9,5.9])add(new T.CylinderGeometry(.13,.13,3.9,10),silver,xx,2.0,d/2+3.1);
  for(const xx of [-3,-1,1,3])add(new T.BoxGeometry(1.85,3.2,.24),dark,xx,2.1,d/2+.12);
  for(let xx=-w*.22;xx<=w*.22;xx+=12){add(new T.BoxGeometry(7.6,.18,3.6),mullion,xx,h+1.14,-1);add(new T.BoxGeometry(7,1.3,3),concrete,xx,h+1.72,-1);add(new T.BoxGeometry(6.6,.05,2.2),mullion,xx,h+2.39,-1);}
 }
 pavilion(-112,-149,91,38,13,.28,2);pavilion(-114,-9,78,43,11,-.35,1);pavilion(-284,-40,95,38,13,-.4,2);
 // Large plaza with subtle paving. World-space units keep its texture scale stable.
 const groundGeometry=new T.PlaneGeometry(600,600);groundGeometry.setAttribute('uv1',groundGeometry.attributes.uv.clone());
 const square=mesh(groundGeometry,paving,-220,ground-.12,-80);square.rotation.x=-Math.PI/2;
 // Continuous terrain extends beyond every allowed camera ray; plaza is a local inset.
 const terrain=surfaces.terrain;
 // The distant terrain has an actual plaza cut-out: no nearly coplanar surfaces.
 const terrainShape=new T.Shape();terrainShape.moveTo(-10000,-10000);terrainShape.lineTo(10000,-10000);terrainShape.lineTo(10000,10000);terrainShape.lineTo(-10000,10000);terrainShape.closePath();
 const plazaHole=new T.Path();plazaHole.moveTo(-300,-300);plazaHole.lineTo(-300,300);plazaHole.lineTo(300,300);plazaHole.lineTo(300,-300);plazaHole.closePath();terrainShape.holes.push(plazaHole);
 const earth=mesh(new T.ShapeGeometry(terrainShape),terrain,-220,ground-.18,-80);earth.rotation.x=-Math.PI/2;
 const asphalt=new T.MeshStandardMaterial({color:'#777f7b',roughness:.97}),curb=new T.MeshStandardMaterial({color:'#c1c0b4',roughness:.85});
 for(const z of [-230,94]){mesh(new T.BoxGeometry(1150,.03,20),asphalt,-300,ground-.06,z);for(const edge of [-10.4,10.4])mesh(new T.BoxGeometry(1150,.20,.65),curb,-300,ground+.04,z+edge)}
 for(const x of [-38,-390]){mesh(new T.BoxGeometry(17,.03,1100),asphalt,x,ground-.06,-250);for(const edge of [-8.8,8.8])mesh(new T.BoxGeometry(.65,.2,1100),curb,x+edge,ground+.04,-250)}
 // Low planted beds and pedestrian routes connect architecture to the ground.
 const bed=surfaces.grass;
 const vegetation=createVegetation(group,treeAtlas,trunkAsset);
 for(const [x,z,w,d]of [[-64,-62,8,198],[-197,62,280,8],[-194,-198,275,8]]){mesh(new T.BoxGeometry(w,.25,d),curb,x,ground+.06,z);mesh(planarUV(new T.BoxGeometry(w-.6,.26,d-.6)),bed,x,ground+.10,z)}
 // Nine authored architectural compositions with native-facade distance LODs.
 skyline.name='Authored_skyline_LOD';group.add(skyline);skyline.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.roughness=Math.max(m.roughness,.65);if(m.map)m.map.anisotropy=8}}});
 const lawn=surfaces.grass;
 for(const [x,z,w,d]of [[-60,-100,28,76],[-160,-155,48,24],[-162,12,54,26]])mesh(planarUV(new T.BoxGeometry(w,.18,d)),lawn,x,ground,z);
 // Slender light poles establish human scale without adding distant interactive props.
 for(let i=0;i<8;i++){const x=-67-i*17,z=-55;mesh(new T.CylinderGeometry(.10,.14,6,8),silver,x,ground+3,z);mesh(new T.CylinderGeometry(.65,.65,.12,16),silver,x,ground+6,z);}
 const sill=new T.MeshStandardMaterial({color:'#b5b1a3',roughness:.9});mesh(new T.BoxGeometry(.49,.12,4.6),sill,-3.23,.54,-.5);mesh(new T.BoxGeometry(.28,.85,4.6),sill,-3.24,.06,-.5);
 // Batch static distant architecture. Instanced foliage remains independently instanced.
 group.updateMatrixWorld(true);const batches=new Map();
 group.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&o!==sphere){if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(o)}});
 for(const [material,parts]of batches){if(parts.length<2)continue;const positions=[],normals=[],uvs=[];for(const part of parts){const g=(part.geometry.index?part.geometry.toNonIndexed():part.geometry.clone()).applyMatrix4(part.matrixWorld),a=g.attributes;positions.push(...a.position.array);normals.push(...a.normal.array);uvs.push(...a.uv.array);g.dispose();part.removeFromParent()}const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.computeBoundingSphere();const batched=new T.Mesh(geometry,material);batched.castShadow=batched.receiveShadow=true;group.add(batched)}
 function bakeReflections(renderer){const pmrem=new T.PMREMGenerator(renderer);const reflection=pmrem.fromEquirectangular(sky).texture;group.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.envMap){m.envMap=reflection;m.envMapIntensity=.9;m.needsUpdate=true}});sphere.material.roughness=.18;pmrem.dispose();}

 return{update:vegetation.update,vegetation:{count:vegetation.count,nearTrunks:vegetation.nearTrunks,representation:vegetation.representation},bakeReflections,type:'Original artistic Nur Alem / EXPO view',sphereDiameterM:80,overallHeightM:100,distanceM:Math.hypot(centre.x,centre.z),viewHeightAbovePlazaM:17.6,sphereSegments:[112,72],buildingPhotoBackdrop:false,officialPhotosShipped:false,terrainExtentM:20000,fogNearM:900,licensedDetailedExpoModel:false,exterior:group};
}
