import {refinedAccents,ACCENT_FILES} from './room-accents.js';
import {setFigureTemplates} from './collection-models.js';
import * as T from 'three';
import {DOCUMENTS} from './documents-data.js';
const certificateDocuments=DOCUMENTS.filter(d=>d.kind==='certificate');
import {addGalleryFrame,addCorridorDetails,batchStaticDetails} from './joinery-details.js';
import {installCabinet} from './cabinet-scene.js';
import {architecturalMaterial} from './architecture-materials.js';
import {createDaylight} from './daylight.js';
import {installWindow} from './window-fragment.js';
import {createStreaming} from './streaming.js';
import {L} from './ui.js';
import {PROJECTS} from './projects-data.js';
import {authoredFurniture,FURNITURE_FILES,refinedJoinery,JOINERY_FILES,installStudioFurniture} from './furniture.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

export async function createWorld(renderer,camera){
 const scene=new T.Scene();scene.background=new T.Color('#a8bac2');const daylight=createDaylight(scene,camera);
 const stream=createStreaming();let changed=()=>{},studioReady=false,warming=false,warmError=null,warmPromise=null,allPromise=null,skyFallback=false,windowRoot=null;
 const loader=new T.TextureLoader(),objects=[],assetInfo=[],colliders=[],localizedLabels=[];let architecture=true;
 let allowAssembly;const entrancePrepared=new Promise(resolve=>allowAssembly=resolve);
 const assembly={};const materialCopies=new Map();
 const cloneMaterial=original=>{const m=original.clone();if(!materialCopies.has(original))materialCopies.set(original,[]);materialCopies.get(original).push(m);return m};
 const texture=async(path,color=false)=>{const t=await loader.loadAsync(path);t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=8;return t};
 const [plasterMap,floorMap,oakMap]=await Promise.all(['plaster','floor','oak'].map(n=>texture('assets/entry/'+n+'.webp',true)));
 const plaster=new T.MeshStandardMaterial({map:plasterMap,color:'#f3eee4',roughness:.92,normalScale:new T.Vector2(.25,.25)}),floor=new T.MeshStandardMaterial({map:floorMap,color:'#e3d8c5',roughness:.62,normalScale:new T.Vector2(.25,.25)}),oak=new T.MeshStandardMaterial({map:oakMap,color:'#ede4d5',roughness:.78,normalScale:new T.Vector2(.25,.25)});
 let project=textMap(['HELIO'],{bg:'#345148',color:'#eadcc3'}),chair=null,lamp=null,cabinet=null,sideTable=null,lightSurface=null,exterior=null;
 let previewTexture=null,previewId=null,previewSource='',previewUpdates=0,furniture=null,collection=null;
 const galleryMaps=[null,null],workbenchFallback=[];let recordingWorkbench=false;
 // Share the established room oak texture, preserving its photographic grain.
 function matchOak(root){root.traverse(o=>{if(!o.isMesh)return;const materials=Array.isArray(o.material)?o.material:[o.material];if(!materials.some(m=>m.name.replaceAll('_',' ').toLowerCase()==='desk oak edge'))return;realUV(o.geometry);const uv=o.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,.35+uv.getX(i)*.16,.13+uv.getY(i)*.035);uv.needsUpdate=true;for(const m of materials)if(m.name.replaceAll('_',' ').toLowerCase()==='desk oak edge'){if(m.map!==oak.map)m.map?.dispose();m.map=oak.map;m.color.copy(oak.color);m.roughness=.64;m.needsUpdate=true}})}

 plaster.normalScale.set(.16,.16);const green=cloneMaterial(plaster);green.color.set('#345148');green.normalScale.set(.13,.13);
 const joinery=new T.MeshStandardMaterial({color:'#c4c0b3',roughness:.48,metalness:.02});joinery.name='Warm powder coat / matched window finish';
 const cream=new T.MeshStandardMaterial({color:'#d8cfbc',roughness:.73}),dark=new T.MeshStandardMaterial({color:'#202c29',roughness:.5}),black=new T.MeshStandardMaterial({color:'#202321',roughness:.28,metalness:.55}),brass=new T.MeshStandardMaterial({color:'#bd9860',metalness:.82,roughness:.3}),paper=new T.MeshStandardMaterial({color:'#e9e1cb',roughness:.9});
 function realUV(g){const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));uv.setXY(i,nx>ny&&nx>nz?z:x,ny>nz&&ny>nx?z:y)}uv.needsUpdate=true;return g}
 function box(w,h,d,m,x,y,z,r=.006,parent=scene){const g=r?new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)):new T.BoxGeometry(w,h,d);realUV(g);if(m===oak){const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,.35+uv.getX(i)*.16,.13+uv.getY(i)*.035)}const o=new T.Mesh(g,m);if(recordingWorkbench)workbenchFallback.push(o);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);if(architecture){g.computeBoundingBox();colliders.push(o)}return o}
 function cylinder(radius,height,m,x,y,z,parent=scene){const o=new T.Mesh(new T.CylinderGeometry(radius,radius,height,24),m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;parent.add(o);return o}
 function textMap(lines,{w=1024,h=512,bg='#ded5bd',color='#253e34',size=75,align='left',verticalCenter=false}={}){const c=document.createElement('canvas');c.width=w;c.height=h;const a=c.getContext('2d');a.fillStyle=bg;a.fillRect(0,0,w,h);a.fillStyle=color;a.textAlign=align;a.textBaseline=verticalCenter?'middle':'alphabetic';for(const [i,line]of lines.entries()){let fontSize=i===0?size:size*.38;const font=()=>`${i===0?'500':'400'} ${fontSize}px ${i===0?'Georgia':'Arial'}`;a.font=font();const measured=a.measureText(line).width,available=align==='center'?w-60:w-100;if(measured>available){fontSize*=available/measured;a.font=font()}a.fillText(line,align==='center'?w/2:70,(verticalCenter?h/2:100)+i*100)}const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t}
 function label(lines,w,h,x,y,z,options={},parent=scene){const t=textMap(lines,options),o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:t,roughness:.8}));o.position.set(x,y,z);parent.add(o);return o}
 function localizedLabel(lines,w,h,x,y,z,options={},parent=scene){const o=label(lines(),w,h,x,y,z,options,parent);localizedLabels.push({o,lines,options});return o}
 function cable(points,radius=.008,m=black,parent=scene){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const o=new T.Mesh(new T.TubeGeometry(curve,32,radius,8,false),m);o.castShadow=true;parent.add(o);return o}
 function contact(x,z,w,d,opacity=.28,y=.012){const c=document.createElement('canvas');c.width=c.height=128;const a=c.getContext('2d'),g=a.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,`rgba(13,17,13,${opacity})`);g.addColorStop(.6,`rgba(13,17,13,${opacity*.5})`);g.addColorStop(1,'rgba(13,17,13,0)');a.fillStyle=g;a.fillRect(0,0,128,128);const p=new T.Mesh(new T.PlaneGeometry(w,d),new T.MeshBasicMaterial({map:Object.assign(new T.CanvasTexture(c),{colorSpace:T.SRGBColorSpace}),transparent:true,depthWrite:false}));p.rotation.x=-Math.PI/2;p.position.set(x,y,z);scene.add(p)}
 // Room and narrow entrance. Surfaces use metre-based UVs, not stretched box UVs.
 box(6,.16,12,floor,0,-.08,2.3,.005);
 box(6,3.25,.16,plaster,0,1.625,-3.03,.006);
 box(.16,3.25,5.1,plaster,3.04,1.625,-.5,.006);
 const windowFallback=[];windowFallback.push(box(.16,.62,5.1,green,-3.04,.31,-.5,.004));
 windowFallback.push(box(.16,.32,5.1,plaster,-3.04,3.08,-.5,.004));
 windowFallback.push(box(.16,2.5,.44,plaster,-3.04,1.85,1.83,.005));
 windowFallback.push(box(.16,2.5,.46,plaster,-3.04,1.85,-2.8,.005));
 box(6.2,.1,5.3,cream,0,3.22,-.5,.004);
 box(2.40,3.25,.22,plaster,-1.80,1.625,2.06,.005);
 box(2.40,3.25,.22,plaster,1.80,1.625,2.06,.005);
 box(1.20,.8,.22,plaster,0,2.87,2.06,.004);
 // Short contemporary office passage. Architectural context, not extra destinations.
 const corridorMetal=new T.MeshStandardMaterial({color:'#46514e',metalness:.65,roughness:.34});
 const corridorFloor=architecturalMaterial('stone');
 box(2.65,.012,9.45,corridorFloor,0,.009,6.90,.002);
 const joint=new T.MeshStandardMaterial({color:'#8c9087',roughness:.9});
 for(let z=2.3;z<11.65;z+=1.1)box(2.63,.0003,.003,joint,0,.0152,z,0);
 box(.003,.0003,9.36,joint,0,.0152,6.945,0);
 const officeGlass=new T.MeshPhysicalMaterial({color:'#92a9a7',roughness:.48,metalness:.04,transparent:true,opacity:.73,side:T.DoubleSide});
 const frosted=new T.MeshStandardMaterial({color:'#adc0b9',roughness:.8,transparent:true,opacity:.92,side:T.DoubleSide});
 const doorNumbers=[],doorPlaques=[],bayFallback=new Map(),ceilingFallback=[],corridorLights=[];
 function sideDoor(side,z,number){
  const ff=[];bayFallback.set(number,ff);const profile=(...args)=>{const o=box(...args);ff.push(o);return o};
  const g=new T.Group();g.position.set(side*1.375,0,z);g.rotation.y=side<0?Math.PI/2:-Math.PI/2;scene.add(g);
  box(1.28,2.5,.14,dark,0,1.25,-.08,.004,g);
  box(1.10,2.35,.03,officeGlass,0,1.20,.013,.002,g);
  for(const x of [-.575,.575])profile(.05,2.45,.095,corridorMetal,x,1.225,.026,.005,g);
  for(const y of [.045,2.42])profile(1.20,.05,.095,corridorMetal,0,y,.026,.004,g);
  box(1.10,.80,.008,frosted,0,1.18,.038,.001,g);
  for(const x of [-.63,.63]){profile(.075,2.54,.045,cream,x,1.27,.084,.009,g);profile(.008,2.39,.008,dark,x*.91,1.23,.079,.001,g)}
  profile(1.33,.08,.045,cream,0,2.50,.084,.009,g);profile(1.17,.009,.19,corridorMetal,0,.025,.045,.003,g);
  for(const y of [.34,1.22,2.05])cylinder(.013,.09,corridorMetal,-.56,y,.09,g);
  addCorridorDetails(g,{trim:cream,metal:corridorMetal,dark});
  const plaque=box(.30,.15,.014,cream,-.31,1.63,.055,.005,g);
  const tag=label([number],.286,.136,-.31,1.63,.0625,{w:500,h:260,bg:'#d8cfbc',color:'#354c46',size:110,align:'center',verticalCenter:true},g);doorNumbers.push(number);doorPlaques.push({number,plaque,tag});
  batchStaticDetails(g,ff);
 }
 function corridorWall(side,doors){
  const x=side*1.445;let previous=2.18;
  for(const z of doors){const left=z-.66;if(left>previous)box(.16,3.0,left-previous,plaster,x,1.5,(previous+left)/2,.003);box(.16,.50,1.32,plaster,x,2.75,z,.003);previous=z+.66;}
  box(.16,3.0,11.65-previous,plaster,x,1.5,(previous+11.65)/2,.003);
  box(.06,.065,9.45,corridorMetal,side*1.335,.033,6.9,.002);
 }
 corridorWall(-1,[5.1]);corridorWall(1,[3.9,8.2]);sideDoor(-1,5.1,'01');sideDoor(1,3.9,'02');sideDoor(1,8.2,'03');
 const endWall=box(2.98,3.0,.16,plaster,0,1.5,11.73,.003);endWall.name='Closed corridor end';box(2.66,.065,.06,corridorMetal,0,.033,11.64,.002);box(2.66,.035,.075,cream,0,2.94,11.64,.006);
 box(2.98,.12,9.6,cream,0,3.06,6.9,.005);
 for(const x of [-1.20,1.20]){box(.075,.014,9.1,corridorMetal,x,2.985,6.9,.002);box(.041,.012,9.0,new T.MeshBasicMaterial({color:'#eaf0e7'}),x,2.975,6.9,.001);}
 // A shallow oak acoustic strip repeats the cabinet's material without copying its wall.
 box(.028,2.38,1.52,dark,-1.345,1.41,7.05,.004);
 const acousticWood=cloneMaterial(floor);acousticWood.color.set('#dfc496');acousticWood.normalScale.set(.08,.08);acousticWood.roughness=.7;
 acousticWood.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb=mix(diffuse*vec3(.35,.30,.24),diffuseColor.rgb,.35);')};acousticWood.customProgramCacheKey=()=> 'corridor-grain-v1';
 const corridorSlats=[];
 for(let z=6.32;z<7.8;z+=.065){const slat=box(.045,2.36,.038,acousticWood,-1.315,1.41,z,.005),uv=slat.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,.35+uv.getY(i)*.16,.13+uv.getX(i)*.035+(z-6.32)*.07);corridorSlats.push(slat)}
 // One static draw retains every authored vertex, grain UV and shadow. Physical
 // collider meshes remain separate; moving joinery never enters this batch.
 const slatParts=corridorSlats.map(o=>{o.updateMatrix();return o.geometry.clone().applyMatrix4(o.matrix)});
 const corridorBatch=new T.Mesh(mergeGeometries(slatParts,false),acousticWood);corridorBatch.name='Static corridor acoustic battens';corridorBatch.castShadow=corridorBatch.receiveShadow=true;
 slatParts.forEach(g=>g.dispose());corridorSlats.forEach(o=>o.removeFromParent());scene.add(corridorBatch);
 // Recessed base, upper cap and ceiling shadow gap establish construction scale.
 for(const side of [-1,1]){box(.012,.014,9.42,dark,side*1.334,.083,6.9,.002);box(.075,.035,9.42,cream,side*1.33,2.94,6.9,.006);}

 const fixtureMetal=new T.MeshStandardMaterial({color:'#9fa49d',metalness:.32,roughness:.48});
 function panelFallback(z){ceilingFallback.push(box(.36,.035,.70,fixtureMetal,0,2.975,z,.006),box(.316,.006,.656,new T.MeshBasicMaterial({color:'#fff6e4'}),0,2.952,z,.003))}
 for(const z of [4.5,7.9,10.5]){const l=new T.SpotLight('#fff2dd',20,7,1.12,.85,2);l.position.set(0,2.94,z);l.target.position.set(0,.2,z-.45);scene.add(l,l.target);corridorLights.push(l);panelFallback(z)}panelFallback(2.9);
 // Baseboards and ceiling trim give contact and scale.
 box(5.94,.11,.035,oak,0,.06,-2.924,.003);box(.035,.11,4.9,oak,2.94,.06,-.45,.003);
 box(5.98,.07,.045,cream,0,3.09,-2.91,.005);box(.05,.07,5,cream,2.92,3.09,-.4,.005);
 // Tall west glazing. Clear architectural view and quiet daylight, no stretched photo backdrop.
 const glass=new T.MeshPhysicalMaterial({color:'#d7e5e6',transparent:true,opacity:.075,roughness:.27,metalness:0,side:T.DoubleSide,depthWrite:false});
 const windowGlass=box(.025,2.2,4.2,glass,-3.02,1.77,-.5,.002);windowGlass.castShadow=false;
 for(const z of [-2.59,-1.22,.15,1.52])windowFallback.push(box(.12,2.36,.055,joinery,-2.99,1.76,z,.006));
 for(const y of [.59,1.52,2.94])windowFallback.push(box(.14,.07,4.25,joinery,-2.98,y,-.52,.007));
 windowFallback.push(box(.3,.075,4.4,joinery,-2.89,.6,-.5,.006));
 // Exterior is assembled only when the approach begins.
 // Door: mortise frame, inset panels, glazing, visible hinges and proper lever hardware.
 // Real mortises on the room-side inner corner leave room for hinge knuckles.
 box(.12,2.5,.32,joinery,-.60,1.25,2.06,.006);
 for(const [bottom,top]of [[0,.22],[.37,1.08],[1.23,2.03],[2.18,2.5]])box(.020,top-bottom,.32,joinery,-.530,(bottom+top)/2,2.06,.002);
 for(const y of [.295,1.155,2.105])box(.020,.150,.295,joinery,-.530,y,2.0725,.002);
 box(.14,2.5,.32,joinery,.59,1.25,2.06,.01);
 for(const x of [-.59,.59])box(.025,2.44,.02,brass,x+(x<0?.07:-.07),1.22,2.235,.003);
 box(1.32,.14,.32,joinery,0,2.46,2.06,.01);box(1.05,.016,.33,brass,0,.009,2.06,.003);
 const door=new T.Group();door.position.set(-.515,.025,1.90);scene.add(door);
 const width=1.03,height=2.35;
 for(const x of [.07,width-.07])box(.14,height,.095,joinery,x,height/2,0,.01,door);
 for(const [y,h]of [[.065,.13],[.73,.14],[height-.065,.13]])box(width-.2,h,.095,joinery,width/2,y,0,.008,door);
 box(width-.26,.57,.06,joinery,width/2,.365,-.013,.008,door);
 const pane=box(width-.27,1.41,.016,glass,width/2,1.525,0,.002,door);pane.castShadow=false;
 for(const x of [.155,width-.155])box(.028,1.45,.10,joinery,x,1.52,0,.003,door);
 for(const y of [.815,2.24])box(width-.28,.032,.10,joinery,width/2,y,0,.003,door);
 for(const y of [.27,1.13,2.08])cylinder(.022,.13,brass,.007,y,0,door);
 const plate=box(.07,.26,.012,brass,width-.075,1.04,.06,.008,door);
 const lever=cylinder(.016,.14,brass,width-.14,1.1,.105,door);lever.rotation.z=Math.PI/2;
 const handle=box(.15,.24,.18,new T.MeshBasicMaterial({visible:false}),width-.13,1.08,.07,0,door);handle.userData.action='door';objects.push(handle);
 const doorLabel=localizedLabel(()=>[L('СТУДИЯ','СТУДИЯ','STUDIO'),L('БАХТИЯР ЗИКИРИН','БАҚТИЯР ЗИКИРИН','BAKHTIYAR ZIKIRIN')],.49,.20,.515,1.84,.065,{w:1024,h:350,bg:'#dbc9a4',color:'#284239',size:112,align:'center'},door);doorLabel.userData.action='door';objects.push(doorLabel);
 box(.14,.28,.014,brass,.83,1.63,2.192,.01);
 label(['08'],.10,.16,.83,1.65,2.205,{w:200,h:300,bg:'#bd9860',color:'#2d4136',size:85,align:'center'});
 architecture=false;
 // Oak acoustic battens over felt: real spacing, depth, grain direction and shadows.
 const felt=new T.MeshStandardMaterial({color:'#426354',roughness:.96,normalMap:plaster.normalMap,normalScale:new T.Vector2(.12,.12)});
 box(2.9,1.64,.025,dark,.48,1.68,-2.90,.007);
 const slatMaterial=cloneMaterial(floor);slatMaterial.color.set('#ceb187');slatMaterial.roughness=.58;
 const slatGeometry=realUV(new RoundedBoxGeometry(.034,1.62,.027,2,.003));const suv=slatGeometry.attributes.uv;for(let i=0;i<suv.count;i++){const x=suv.getX(i);suv.setX(i,suv.getY(i));suv.setY(i,x)}suv.needsUpdate=true;
 const slats=new T.InstancedMesh(slatGeometry,slatMaterial,47),sm=new T.Matrix4();for(let i=0;i<47;i++){sm.makeTranslation(-.925+i*.061,1.68,-2.865);slats.setMatrixAt(i,sm)}slats.castShadow=slats.receiveShadow=true;scene.add(slats);
 recordingWorkbench=true;
 // Workbench: solid oak top, restrained black steel trestles and cable channel.
 const deskTop=box(2.3,.0206,.88,oak,.45,.8322,-2.03,.005);
 box(1.725,.04,.025,oak,.1625,.8019,-1.6025,.006);box(.485,.04,.025,oak,1.3575,.8019,-1.6025,.006);for(const x of [-.69,1.59])box(.022,.04,.82,oak,x,.8019,-2.03,.004);
 for(const x of [-.56,1.46]){box(.055,.8219,.64,dark,x,.41095,-2.03,.008);box(.23,.02,.72,black,x,.01,-2.03,.004);contact(x,-2.03,.4,.9,.4)}
 box(2.05,.085,.035,dark,.45,.69,-2.36,.004);
 contact(.45,-2.03,3.1,1.55,.24);
 recordingWorkbench=false;
 // Monitor carries a real Helio image, never a fictional client mock-up.
 const monitor=new T.Group();monitor.position.set(.18,1.22,-2.18);monitor.scale.setScalar(.80);scene.add(monitor);
 recordingWorkbench=true;box(1.31,.815,.075,black,0,0,0,.025,monitor);recordingWorkbench=false;
 const screen=new T.Mesh(new T.PlaneGeometry(1.245,.778),new T.MeshBasicMaterial({map:project,color:'#e8e4d7',toneMapped:false}));screen.position.set(0,0,.041);screen.userData.action='case';monitor.add(screen);objects.push(screen);
 // Reuse the decoded panel image after selection; no preview fetch during entry.
 // One authored canvas preserves aspect ratio and bounds GPU texture ownership.
 function previewProject(selected,image){
  if(!studioReady||!image.naturalWidth||!PROJECTS.some(p=>p.id===selected.id))return;
  const source=image.currentSrc||image.src;if(previewId===selected.id&&previewSource===source)return;
  const pixels=Number(source.match(/-(\d+)\.webp(?:[?#]|$)/)?.[1])||image.naturalWidth;
  const canvas=document.createElement('canvas');canvas.width=Math.min(1280,pixels);canvas.height=Math.round(canvas.width/1.6);
  const ctx=canvas.getContext('2d');ctx.fillStyle='#e1e2d8';ctx.fillRect(0,0,canvas.width,canvas.height);
  const scale=Math.min(canvas.width/image.naturalWidth,canvas.height/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;
  ctx.drawImage(image,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;
  previewTexture?.dispose();previewTexture=texture;previewId=selected.id;previewSource=source;previewUpdates++;
  screen.material.map=texture;screen.material.needsUpdate=true;localize(projectPlaque);changed();
 }
 const inspectProject=()=>({id:previewId||'helio',source:previewSource||'assets/helio.webp',updates:previewUpdates,dynamicTextures:previewTexture?1:0,width:previewTexture?.image.width||0,height:previewTexture?.image.height||0});
 recordingWorkbench=true;box(.075,.255,.055,black,.18, .976,-2.19,.008);
 box(.36,.025,.23,black,.18,.855,-2.12,.015);
 cylinder(.004,.004,new T.MeshBasicMaterial({color:'#c1e7c0'}),.66,.902,-2.142).rotation.x=Math.PI/2;
 box(.64,.027,.21,dark,.05,.856,-1.85,.009);
 for(let row=0;row<4;row++)for(let col=0;col<13;col++)box(.035,.008,.035,cream,-.226+col*.044,.873,-1.922+row*.044,.003);
 box(.09,.027,.13,black,.57,.856,-1.82,.018);
 recordingWorkbench=false;
 box(.94,.36,.018,oak,-.1,2.03,-2.832,.005);const projectPlaque=localizedLabel(()=>[previewId?String(PROJECTS.findIndex(p=>p.id===previewId)+1).padStart(2,'0')+' / '+(previewId==='poslesvet'?L('Послесвет','Послесвет','POSLESVET'):PROJECTS.find(p=>p.id===previewId).title.toUpperCase()):'01 / HELIO',previewId?PROJECTS.find(p=>p.id===previewId).stack.slice(0,3).join(' · '):L('СВЕТ · ГОРОД · ВРЕМЯ','ЖАРЫҚ · ҚАЛА · УАҚЫТ','LIGHT · CITY · TIME')],.90,.32,-.1,2.03,-2.82,{w:1024,h:320,bg:'#345148',color:'#eadcc3',size:102});// The wall plaque is decorative; project actions belong to the monitor.
 for(const x of [-.54,.34]){const screw=cylinder(.007,.018,brass,x,2.17,-2.81);screw.rotation.x=Math.PI/2;}
 // The notebook is the single developer/experience object; constrained cover hinge.
 const folder=new T.Group();folder.position.set(-.46,.843,-1.80);folder.rotation.y=.14;scene.add(folder);
 const leather=new T.MeshStandardMaterial({color:'#526252',roughness:.87});
 box(.32,.025,.26,leather,0,.012,0,.004,folder);box(.295,.021,.242,paper,0,.031,0,.002,folder);
 const page=localizedLabel(()=>[L('Б. ЗИКИРИН','Б. ЗИКИРИН','B. ZIKIRIN'),L('FRONTEND / АСТАНА','FRONTEND / АСТАНА','FRONTEND / ASTANA'),'2025 — 2026'],.27,.21,0,.044,0,{w:800,h:600,bg:'#e9e1cb',color:'#3c5246',size:65},folder);page.rotation.x=-Math.PI/2;
 const cover=new T.Group();cover.position.set(-.16,.046,0);folder.add(cover);
 const lid=box(.32,.01,.26,leather,.16,0,0,.003,cover);lid.userData.action='profile';objects.push(lid);
 const coverText=localizedLabel(()=>[L('ЗАМЕТКИ','ЖАЗБАЛАР','FIELD NOTES'),L('БАХТИЯР ЗИКИРИН','БАҚТИЯР ЗИКИРИН','BAKHTIYAR ZIKIRIN')],.25,.19,.16,.007,0,{w:800,h:500,bg:'#526252',color:'#ddd2b6',size:68},cover);coverText.rotation.x=-Math.PI/2;coverText.userData.action='profile';objects.push(coverText);
 const certificates=new T.Group();certificates.name='Verified certificate display';certificates.position.set(2.53,.687,-.24);certificates.rotation.y=-Math.PI/2;certificates.userData.action='certificates';scene.add(certificates);
 box(.51,.018,.20,dark,0,.009,0,.008,certificates);box(.48,.35,.027,cream,0,.19,-.018,.008,certificates);
 const certificatePlanes=certificateDocuments.map((d,i)=>{const slot=(.44-(certificateDocuments.length-1)*.012)/certificateDocuments.length,ratio=d.fullWidth/d.fullHeight,w=Math.min(slot,.25*ratio),h=w/ratio,o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({roughness:.86}));o.name=d.id+' certificate print';o.position.set((i-(certificateDocuments.length-1)/2)*(slot+.012),.20,0);o.receiveShadow=true;certificates.add(o);return o});objects.push(certificates);
 const gallery=[];
 for(let i=0;i<2;i++){const g=new T.Group();g.position.set(2.94,1.66,-1.02+i*1.25);g.rotation.y=-Math.PI/2;g.userData.action=i?'poslesvet':'keyform';scene.add(g);addGalleryFrame(g,{wood:oak,board:paper,mount:dark});const pic=new T.Mesh(new T.PlaneGeometry(.80,.50024),new T.MeshBasicMaterial({map:galleryMaps[i],toneMapped:false}));pic.name='Printed project image';pic.position.set(0,.039,-.0023);g.add(pic);localizedLabel(()=>[i?L('ПОСЛЕСВЕТ','ПОСЛЕСВЕТ','POSLESVET'):'KEYFORM'],.80,.068,0,-.253,-.0022,{w:1024,h:180,bg:'#b49165',color:'#1e362e',size:100},g);objects.push(g);gallery.push(g);}
 const lightPos=new T.Vector3(1.32,1.51,-1.94);
 const taskLight=new T.SpotLight('#ffcf8a',14,3.5,.68,.55,1.7);taskLight.position.copy(lightPos);taskLight.target.position.set(.84,.81,-1.64);taskLight.castShadow=true;taskLight.shadow.mapSize.set(1024,1024);taskLight.shadow.bias=-.0003;taskLight.shadow.normalBias=.01;scene.add(taskLight,taskLight.target);
 // Separate wired pull switch: porcelain body, brass mechanism, cord exit and bounded travel.
 const switchBase=cylinder(.055,.028,cream,1.05,1.87,-2.813);switchBase.rotation.x=Math.PI/2;
 box(.05,.075,.046,brass,1.05,1.845,-2.793,.009);
 cable([[1.05,1.81,-2.79],[1.05,1.30,-2.79],[1.05,.88,-2.79],[1.55,.75,-2.64],[1.52,.72,-1.8],[1.13,.74,-1.55],[1.065,.79,-1.59]],.006,black);
 for(const y of [1.2,1.57])box(.019,.028,.016,black,1.05,y,-2.78,.004);
 const cordRoot=new T.Group();cordRoot.position.set(1.05,1.80,-2.76);scene.add(cordRoot);
 const cord=new T.Group();cordRoot.add(cord);
 const cordLine=cylinder(.0035,.40,new T.MeshStandardMaterial({color:'#b3a488',roughness:.85}),0,-.2,0,cord);
 cordLine.userData.action='lamp';
 const cordGrip=cylinder(.017,.072,brass,0,-.434,0,cord);cordGrip.userData.action='lamp';objects.push(cordGrip);
 const cordHit=box(.14,.20,.10,new T.MeshBasicMaterial({visible:false}),0,-.425,0,0,cord);cordHit.userData.action='lamp';objects.push(cordHit);
 localizedLabel(()=>[L('ТЯНИТЕ','ТАРТЫҢЫЗ','PULL'),L('СВЕТ','ЖАРЫҚ','LIGHT')],.18,.12,1.25,1.48,-2.83,{w:512,h:320,bg:'#d9d2bc',color:'#354e43',size:64});
 const localize=(only)=>{for(const {o,lines,options}of localizedLabels){if(only&&o!==only)continue;const next=textMap(lines(),options);o.material.map.image=next.image;o.material.map.needsUpdate=true;next.dispose()}};localize();
 const fill=new T.HemisphereLight('#d2e2e7','#666459',.55);scene.add(fill);

 const entryLight=new T.SpotLight('#fff0da',10,6,1.15,.8,2);entryLight.position.set(0,2.93,2.9);entryLight.target.position.set(0,.1,3.6);scene.add(entryLight,entryLight.target);
 const interiorFill=new T.PointLight('#ffdeb1',1.8,5,2);interiorFill.position.set(1.4,2.7,.4);scene.add(interiorFill);
 const roomArea=new T.PointLight('#c6e0ee',9,7,2);roomArea.position.set(-2.9,1.8,-.5);roomArea.lookAt(0,1,-1);scene.add(roomArea);
 // Thin power cable behind monitor, fixed to the cable channel.
 cable([[.18,1.03,-2.23],[.19,.91,-2.31],[.3,.67,-2.35],[1.0,.67,-2.35]],.006,black);
 const highlightTargets={case:monitor,profile:folder,lamp:cord,certificates,keyform:gallery[0],poslesvet:gallery[1]};let highlighted=null,restores=[];
 function highlight(action){
  if(action===highlighted)return;
  for(const [o,m,temporary]of restores){o.material=m;temporary.dispose();}restores=[];highlighted=action;
  highlightTargets[action]?.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)&&o.material.emissive){const original=o.material,m=original.clone();daylight.material(m);m.emissive.set('#d8d5b2');m.emissiveIntensity=.16;o.material=m;restores.push([o,original,m]);}});
 }
 scene.updateMatrixWorld(true);


 // Loading and assembly are separate. Nothing is removed on exit or a repeated visit.
 function nativeMaterial(root){root.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m.map)m.map.anisotropy=8}})}
 function record(id,o){const b=new T.Box3().setFromObject(o);assetInfo.push({id,nativeScale:o.scale.toArray(),floorGap:b.min.y,bounds:b.getSize(new T.Vector3()).toArray()})}
 function installMaterial(original,maps){const old=original.map;for(const m of [original,...(materialCopies.get(original)||[])]){[m.map,m.normalMap,m.roughnessMap]=maps;m.needsUpdate=true}old?.dispose()}
 const fullMaterial=name=>Promise.all((name==='white_plaster_02'?['painted','nor_gl','rough']:['diff','nor_gl','rough']).map((part,i)=>stream.texture('room',`assets/${name}/${part}.webp`,i===0)));
 function loadRoom(){return stream.run('room',async()=>{
  const [maps,screenMap,frames,assets,environmentModule,windowAsset,windowIndirect,corridorAsset,corridorIndirect,studioAssets,workbenchAsset,accentAssets]=await Promise.all([
   Promise.all(['white_plaster_02','laminate_floor_02'].map(fullMaterial)),stream.texture('room','assets/helio.webp',true),Promise.all(['keyform','poslesvet'].map(n=>stream.texture('room','assets/'+n+'.webp',true))),
   Promise.all([authoredFurniture?FURNITURE_FILES[0]:'assets/sheen_chair/model.gltf',authoredFurniture?FURNITURE_FILES[1]:'assets/desk_lamp_arm_01/model.gltf',refinedJoinery?JOINERY_FILES[0]:'assets/modern_wooden_cabinet/model.gltf'].map(url=>stream.model('room',url))),import('three/addons/environments/RoomEnvironment.js'),stream.model('room','assets/window/window.glb'),stream.texture('room','assets/window/indirect.webp',true),stream.model('room','assets/corridor/profiles.glb'),stream.texture('room','assets/corridor/indirect.webp',true),authoredFurniture?Promise.all(FURNITURE_FILES.slice(2).map(url=>stream.model('room',url))):null,refinedJoinery?stream.model('room',JOINERY_FILES[1]):null,refinedAccents?Promise.all(ACCENT_FILES.map(url=>stream.model('room',url))):null]);
  assembly.room=()=>{if(accentAssets){setFigureTemplates({robot:accentAssets[0].scene,orbit:accentAssets[1].scene});ceilingFallback.forEach(o=>o.visible=false);for(const z of [2.9,4.5,7.9,10.5]){const panel=accentAssets[2].scene.clone(true);panel.name='Authored ceiling diffuser '+z;panel.position.set(0,3,z);nativeMaterial(panel);scene.add(panel)}}windowRoot=installWindow(scene,windowAsset.scene,windowIndirect);windowFallback.forEach(o=>o.visible=false);
  const bayRoot=installWindow(scene,corridorAsset.scene,corridorIndirect);bayRoot.name='Authored_corridor_profiles';for(const number of ['01','02','03'])bayFallback.get(number).forEach(o=>o.visible=false);

  [plaster,floor].forEach((m,i)=>installMaterial(m,maps[i]));installMaterial(oak,maps[1]);oak.color.set('#e1c797');oak.roughness=.58;oak.normalScale.set(.1,.1);
  const environment=new environmentModule.RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(environment,.03).texture;scene.environmentIntensity=.24;environment.dispose();pmrem.dispose();
  project.dispose();project=screenMap;screen.material.map=project;screen.material.needsUpdate=true;gallery.forEach((g,i)=>{const pic=g.children.find(o=>o.isMesh&&o.geometry.type==='PlaneGeometry');pic.material.map=frames[i];pic.material.needsUpdate=true});
  const [chairAsset,lampAsset,cabinetAsset]=assets;
  cabinet=cabinetAsset.scene;if(refinedJoinery)matchOak(cabinet);cabinet.position.set(2.66,0,-.34);cabinet.rotation.y=-Math.PI/2;scene.add(cabinet);cabinet.updateMatrixWorld(true);cabinet.position.y-=new T.Box3().setFromObject(cabinet).min.y;

  chair=chairAsset.scene;chair.position.set(-1.92,0,-1.60);chair.rotation.y=.72;scene.add(chair);
 let cb=new T.Box3().setFromObject(chair);chair.position.y-=cb.min.y;cb=new T.Box3().setFromObject(chair);contact(-1.92,-1.60,1.02,.9,.18);
 // Small contact patches at the four measured native foot tips; no model deformation.
 if(authoredFurniture)chair.traverse(o=>{if(o.name.startsWith('FootContact_')){const p=o.getWorldPosition(new T.Vector3());contact(p.x,p.z,.11,.11,.27,.001)}});else{contact(-2.247975981,-1.601758576,.11,.11,.27,.001);contact(-2.029286924,-1.220255099,.11,.11,.27,.001);contact(-1.878967690,-1.925403902,.11,.11,.27,.001);contact(-1.529245134,-1.658825700,.11,.11,.27,.001);}
 assetInfo.push({id:'chair',nativeScale:chair.scale.toArray(),bounds:cb.getSize(new T.Vector3()).toArray(),floorGap:cb.min.y,source:authoredFurniture?'studio-furniture/chair':'sheen_chair'});
 lamp=lampAsset.scene;lamp.position.set(1.075,.8421,-1.603);lamp.rotation.y=0;scene.add(lamp);
 lightSurface=null;for(const root of [chair,lamp])root.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;for(const m of Array.isArray(o.material)?o.material:[o.material]){if(m.map)m.map.anisotropy=8;if(m.name.includes('light'))lightSurface=o;}}});
 const lampBox=new T.Box3().setFromObject(lamp);assetInfo.push({id:'lamp',nativeScale:lamp.scale.toArray(),bounds:lampBox.getSize(new T.Vector3()).toArray(),source:authoredFurniture?'studio-furniture/lamp':'desk_lamp_arm_01'});


  if(workbenchAsset){for(const o of workbenchFallback){o.visible=false;o.geometry.dispose()}matchOak(workbenchAsset.scene);scene.add(workbenchAsset.scene);nativeMaterial(workbenchAsset.scene)}
  certificates.position.y=new T.Box3().setFromObject(cabinet).max.y+.001;
  nativeMaterial(cabinet);collection=installCabinet(cabinet,objects);highlightTargets.cabinet=collection.anchor;for(const [id,item]of Object.entries(collection.items))highlightTargets[id]=item;record('cabinet',cabinet);contact(2.66,-.34,.62,2.5,.32);
  if(lightSurface)lightPos.copy(new T.Box3().setFromObject(lightSurface).getCenter(new T.Vector3()));taskLight.position.copy(lightPos);
  if(studioAssets){furniture=installStudioFurniture({doorAsset:studioAssets[0],drawerAsset:studioAssets[1],scene,door,doorLabel,doorHandle:handle,objects});highlightTargets.drawer=furniture.tray;}
  daylight.prepare();scene.updateMatrixWorld(true);changed();};
 })}
 function loadDecor(){return stream.run('decor',async()=>{
  const [plantAsset,sideTableAsset,diplomaPreview,resumePreview,...certificatePreviews]=await Promise.all([stream.model('decor','assets/potted_plant_02/selected.gltf'),stream.model('decor',refinedJoinery?JOINERY_FILES[2]:'assets/side_table_01/model.gltf'),stream.texture('decor','../files/education/diploma-preview.webp',true),stream.texture('decor','../files/resume-preview.webp',true),...certificateDocuments.map(d=>stream.texture('decor','../files/education/'+d.file+'-preview.'+d.extension,true))]);
  assembly.decor=()=>{const plant=plantAsset.scene;plant.position.set(2.24,0,-2.16);plant.scale.setScalar(.9);scene.add(plant);plant.updateMatrixWorld(true);plant.position.y-=new T.Box3().setFromObject(plant).min.y;plant.traverse(o=>{if(o.isMesh)o.castShadow=o.receiveShadow=true});contact(2.24,-2.16,.63,.63,.60);contact(2.24,-2.16,.32,.32,.70);

  sideTable=sideTableAsset.scene;if(refinedJoinery)matchOak(sideTable);sideTable.position.set(-2.25,0,-.55);sideTable.rotation.y=.15;scene.add(sideTable);sideTable.updateMatrixWorld(true);sideTable.position.y-=new T.Box3().setFromObject(sideTable).min.y;

  nativeMaterial(sideTable);record('side_table',sideTable);contact(-2.25,-.55,.6,.6,.28);
  const sideTop=new T.Box3().setFromObject(sideTable).max.y;
  if(furniture){const tray=furniture.tray;
   const document=(id,x)=>{const root=new T.Group();root.name=id;root.userData.action=id;root.position.set(x,.03755,.01);tray.add(root);objects.push(root);const label=new T.Object3D();label.name=id+' label anchor';label.position.set(0,.09595,.216);root.add(label);root.userData.labelAnchor=label.name;return root};
   const sheet=(root,name,map,w,d,z)=>{const page=new T.Group();page.name=name+' sheet';page.userData.documentSheet=true;page.position.z=z;root.add(page);const stock=new T.Mesh(new T.BoxGeometry(w,.0015,d),paper);stock.name=name+' stock';stock.castShadow=stock.receiveShadow=true;page.add(stock);const image=new T.Mesh(new T.PlaneGeometry(w-.001,d-.001),new T.MeshStandardMaterial({map,roughness:.86}));image.name=name+' preview';image.rotation.x=-Math.PI/2;image.position.y=.00082;image.receiveShadow=true;page.add(image);return image};
   const cv=document('drawer-resume',-.105),education=document('drawer-education',.105);
   cv.userData.hotspotAnchor=sheet(cv,'Resume',resumePreview,.145,.205,0).name;
   education.userData.hotspotAnchor=sheet(education,'Diploma',diplomaPreview,.145,.10024,0).name;

   furniture.documents={'drawer-resume':cv,'drawer-education':education};
  }
  certificatePlanes.forEach((o,i)=>{o.material.map=certificatePreviews[i];o.material.needsUpdate=true});
  daylight.prepare();scene.updateMatrixWorld(true);changed();};
 })}
 function fallbackSky(){const c=document.createElement('canvas');c.width=512;c.height=256;const a=c.getContext('2d'),g=a.createLinearGradient(0,0,0,256);g.addColorStop(0,'#789bb7');g.addColorStop(.5,'#d7e3e6');g.addColorStop(.55,'#b2b4ac');g.addColorStop(1,'#7c8780');a.fillStyle=g;a.fillRect(0,0,512,256);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t}
 function loadExpo(){return stream.run('expo',async()=>{
  const [{createExpo},sky,treeAtlas,trunkAsset,skylineAsset]=await Promise.all([import('./expo.js'),stream.texture('expo','assets/urban_facade/sky.webp',true).catch(()=>{skyFallback=true;return fallbackSky()}),stream.texture('expo','assets/exterior/tree-atlas.webp',true),stream.model('expo','assets/exterior/tree-trunk.glb'),stream.model('expo','assets/exterior/skyline.glb')]);
  assembly.expo=()=>{exterior=createExpo(scene,sky,treeAtlas,trunkAsset.scene,skylineAsset.scene);exterior.bakeReflections(renderer);daylight.prepare();scene.updateMatrixWorld(true);changed();};
 })}
 async function warm(){if(warmPromise)return warmPromise;warmPromise=(async()=>{
  await entrancePrepared;warming=true;changed();
  // Keep the already rendered entrance visible while the final scene is assembled.
  await new Promise(resolve=>setTimeout(resolve,0));
  for(const name of ['room','decor','expo'])if(assembly[name]){const build=assembly[name];delete assembly[name];build()}
  daylight.update();scene.updateMatrixWorld(true);
  // Upload and compile before the door opens, without delaying the first corridor frame.
  const textures=new Set();scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])for(const value of Object.values(m))if(value?.isTexture)textures.add(value)});
  let i=0;for(const t of textures){renderer.initTexture(t);if(++i%3===0)await new Promise(r=>setTimeout(r,0))}
  if(renderer.compileAsync)await renderer.compileAsync(scene,camera);else renderer.compile(scene,camera);
  // Finish one real frame, including shadow programs, before opening the entry gate.
  daylight.update();exterior?.update?.(camera);scene.updateMatrixWorld(true);renderer.render(scene,camera);
  // Prepare representative interior/shadow variants behind the HTML loading screen.
  const savedCamera=camera.clone(),savedDoor=door.rotation.y;
  try{door.rotation.y=1.77;for(const [position,lookAt]of [[[0,1.57,3.3],[0,1.3,-2]],[[.65,1.6,1.5],[-.12,1.09,-2]],[[-.18,1.6,.8],[-12,1.95,-5]]]){camera.position.fromArray(position);camera.lookAt(...lookAt);camera.updateMatrixWorld(true);daylight.update();exterior?.update?.(camera);scene.updateMatrixWorld(true);renderer.render(scene,camera);await new Promise(resolve=>requestAnimationFrame(resolve))}}
  finally{camera.copy(savedCamera);door.rotation.y=savedDoor;camera.updateMatrixWorld(true);daylight.update();exterior?.update?.(camera);scene.updateMatrixWorld(true);renderer.render(scene,camera)}
  studioReady=true;warming=false;changed();
 })().catch(error=>{warming=false;warmPromise=null;warmError=error.message;changed()});return warmPromise}
 function prepare(all=false){loadRoom();if(all&&!allPromise){allPromise=Promise.all([loadRoom(),loadDecor(),loadExpo()]).then(results=>{if(results.every(Boolean))return warm()})}}
 function retry(){if(warmError){warmError=null;warm();return}stream.retry();allPromise=null;prepare(true)}
 function inspectStream(){return{ready:studioReady,warming,warmError,skyFallback,phases:stream.inspect()}}
 stream.onChange(()=>changed());
 // Physical colliders use the same transformed meshes as the rendered walls/doors.
 const probe=new T.Vector3(),closest=new T.Vector3();
 function clearance(position,radius=.14){return !colliders.some(o=>{probe.copy(position);o.worldToLocal(probe);closest.copy(probe).clamp(o.geometry.boundingBox.min,o.geometry.boundingBox.max);return closest.distanceToSquared(probe)<radius*radius})}
 function walk(from,to){const p=from.clone(),delta=to.clone().sub(from),steps=Math.max(1,Math.ceil(delta.length()/.045));delta.divideScalar(steps);for(let i=0;i<steps;i++){for(const axis of ['x','z','y']){const next=p.clone();next[axis]+=delta[axis];if(clearance(next))p.copy(next)}}return p}
 function windowBake(enabled=true){windowRoot?.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])m.lightMapIntensity=enabled?Math.PI:0})}
 daylight.prepare();
 function inspectWindow(){const meshes=[];windowRoot?.traverse(o=>{if(o.isMesh)meshes.push({uv2:!!o.geometry.attributes.uv1,material:o.material.name,lightmap:o.material.lightMap?.colorSpace,channel:o.material.lightMap?.channel,flipY:o.material.lightMap?.flipY,intensity:o.material.lightMapIntensity,indirectOnly:o.material.userData.indirectOnly})});return {loaded:!!windowRoot,meshes,liveLamp:taskLight.intensity}}
 return {inspectLighting(){return{closedCorridorEnd:!!scene.getObjectByName('Closed corridor end'),ceilingPanels:scene.children.filter(o=>o.name.startsWith('Authored ceiling diffuser')).length,corridorLights:corridorLights.map(l=>({position:l.position.toArray(),intensity:l.intensity})),taskLight:{position:taskLight.position.toArray(),intensity:taskLight.intensity,shadowBias:taskLight.shadow.bias,normalBias:taskLight.shadow.normalBias},environmentIntensity:scene.environmentIntensity,fill:fill.intensity,daylight:daylight.inspect(),plaques:doorPlaques.map(({number,plaque,tag})=>({number,offsetY:tag.position.y-plaque.position.y,frontGap:tag.position.z-(plaque.position.z+.007)}))}},geometryReport(){
  scene.updateMatrixWorld(true);const tray=furniture?.tray?new T.Box3().setFromObject(furniture.tray):null,leaf=furniture?.leaf;
  let entranceIntersections=0,checkedTriangles=0;
  if(leaf){const walls=colliders.filter(o=>{for(let p=o;p;p=p.parent)if(p===door)return false;return true}).map(o=>new T.Box3().copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));leaf.traverse(o=>{if(!o.isMesh)return;const bounds=new T.Box3().setFromObject(o),nearby=walls.filter(b=>b.intersectsBox(bounds));if(!nearby.length)return;const g=o.geometry,a=g.attributes.position,index=g.index,t=new T.Triangle(),vertex=(out,n)=>out.fromBufferAttribute(a,index?index.getX(n):n).applyMatrix4(o.matrixWorld);for(let i=0;i<(index?index.count:a.count);i+=3){vertex(t.a,i);vertex(t.b,i+1);vertex(t.c,i+2);checkedTriangles++;if(nearby.some(b=>b.clone().expandByScalar(-.0005).intersectsTriangle(t)))entranceIntersections++}})}
  return{cabinet:collection?.geometry(),drawer:tray?{top:tray.max.y,apronBottom:.7819,apronGap:.7819-tray.max.y,min:tray.min.toArray(),max:tray.max.toArray()}:null,entrance:{intersectingTriangles:entranceIntersections,checkedTriangles},education:null,documents:Object.entries(furniture?.documents||{}).map(([id,o])=>({id,pages:o.children.filter(p=>p.userData.documentSheet).map(p=>{const b=new T.Box3().setFromObject(p).applyMatrix4(furniture.tray.matrixWorld.clone().invert());return{name:p.name,min:b.min.toArray(),max:b.max.toArray()}})})),readingTable:sideTable?new T.Box3().setFromObject(sideTable).max.y:null};
 },get collectionTargets(){return collection?{cabinet:collection.anchor,...collection.items}:{}},setCabinet(value){collection?.set(value)},collectionReady(id){return !!collection?.items[id]&&collection.inspect().itemsAccessible},inspectCollection(){return collection?.inspect()||null},get cabinetHandles(){return collection?.handles||[]},cabinetGrip(hit){return collection?.grip(hit)||null},get drawerPull(){return furniture?.pull},get drawerDocuments(){return furniture?.documents||{}},setDrawer(value){furniture?.setDrawer(value)},inspectFurniture(){return furniture?.inspect()||{variant:'legacy',drawerTravel:0,drawerOffset:0}},previewProject,inspectProject,allowAssembly,get preparingGPU(){return warming},daylight,windowBake,inspectWindow,prepare,retry,inspectStream,onChange(fn){changed=fn},get studioReady(){return studioReady},clearance,walk,scene,objects,door,cover,cord,cordRoot,cordLine,cordGrip,taskLight,get lightSurface(){return lightSurface},get assetInfo(){return [...assetInfo].sort((a,b)=>['chair','lamp','cabinet','side_table'].indexOf(a.id)-['chair','lamp','cabinet','side_table'].indexOf(b.id))},get project(){return project},get chair(){return chair},get lamp(){return lamp},monitor,folder,lightPos,localize,get exterior(){return exterior},highlight,certificates,gallery,get cabinet(){return cabinet},get sideTable(){return sideTable},office:{doorWidth:width,doorHeight:height,corridorWidth:2.65,sideDoors:doorNumbers,corridorLength:9.47,corridorHeight:3.0,routeLength:8.0},cordHit};
}
