import * as T from 'three';
import {createWorld} from './world.js';
import {RoomAudio} from './audio.js';
import {$,L,attachApp,openPanel,weatherText} from './ui.js';
const canvas=$('#scene'),renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const camera=new T.PerspectiveCamera(52,innerWidth/innerHeight,.05,6000),world=await createWorld(renderer,camera),scene=world.scene;
let storage;try{storage=localStorage}catch{}const audio=new RoomAudio(storage);audio.setRain(false);
const captureMode=new URLSearchParams(location.search).has('capture');let captureFrozen=false,captureReferenceFraming=false;
let rainPaused=false;try{rainPaused=storage?.getItem('room-weather-motion-v1')==='paused'}catch{}
const reduced=captureMode?{matches:true}:matchMedia('(prefers-reduced-motion: reduce)');const ray=new T.Raycaster(),mouse=new T.Vector2(),look=new T.Vector3();
let lastReduced=reduced.matches;
let firstFrameAt=null,fullSceneAt=null,doorNear=false,preExit=false,viewName='desk',progress=0,target=0,lookX=0,lookY=0,moveX=0,moveZ=0,pointer=null,dragging=false,pull=0,pullVelocity=0,pullTriggered=false,light=true,brightness=1,folder=0,folderTarget=0,dirty=true,last=performance.now(),frameCount=0,renderCount=0;
const mobile=()=>innerWidth/innerHeight<.82,clamp=T.MathUtils.clamp,smooth=(v)=>v*v*(3-2*v);
const path=new T.CatmullRomCurve3([new T.Vector3(0,1.60,9.55),new T.Vector3(.02,1.57,5.20),new T.Vector3(.04,1.55,1.60),new T.Vector3(.40,1.50,1.15),new T.Vector3(.65,1.60,1.50)]);
// Stop outside the door's sweep until the physical opening is clear.
const doorStopProgress=(()=>{let lo=0,hi=.8;for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(path.getPoint(smooth(mid)).z>2.65)lo=mid;else hi=mid}return lo})();
let activeHotspot=null,pointerHotspot=null,focusHotspot=null,leaveTimer=null,keyboardMode=false;
const api={hold:false,audio,get rainPaused(){return rainPaused},get rainMotionBlocked(){return reduced.matches},toggleRainMotion(){rainPaused=!rainPaused;try{storage?.setItem('room-weather-motion-v1',rainPaused?'paused':'playing')}catch{}weatherText();dirty=true},localize(){world.localize();streamStatus();renderHotspot();dirty=true},go(value,gesture=false){if(!window.sliceUsable)return;preExit=value<.5&&progress>.96&&!reduced.matches;viewName='desk';target=clamp(value,0,1);lookX=lookY=moveX=moveZ=0;if(target>.4){if(gesture)audio.enter(true);else audio.setInside(true)}else audio.setInside(false);dirty=true},view(name){api.go(1,true);viewName=name;lookX=0;dirty=true},pull(){toggleLight();pull=.09;pullVelocity=0;dirty=true},folder(){folderTarget=folderTarget>.5?0:1;dirty=true}};
function toggleLight(){$('#object-lamp').classList.remove('cord-guide-visible');light=!light;audio.effect();for(const id of ['#lamp-button','#object-lamp'])$(id).setAttribute('aria-pressed',String(light));dirty=true}
attachApp(api);reduced.addEventListener?.('change',()=>{weatherText();dirty=true});
function streamStatus(){
 const state=world.inspectStream(),box=$('#stream-status');box.hidden=state.ready;
 const names={room:L('Комната','Бөлме','Room'),decor:L('Предметы','Заттар','Objects'),expo:L('Вид из окна','Терезе көрінісі','Window view')};
 $('#stream-message').hidden=true;$('#stream-retry').hidden=true;
 if(state.ready&&state.skyFallback){document.querySelector('main').append(box);box.hidden=false;$('#stream-message').hidden=false;$('#stream-message').textContent=L('Небо не загрузилось — показан запасной фон.','Аспан жүктелмеді — қосалқы фон көрсетілді.','The sky could not load — a fallback is shown.')}
 for(const [name,p]of Object.entries(state.phases)){const row=$('#stream-'+name);row.hidden=p.status==='idle'||state.ready;row.querySelector('span').textContent=names[name]+' · '+p.completed+'/'+p.total;row.querySelector('progress').max=p.total;row.querySelector('progress').value=p.completed;row.querySelector('progress').ariaLabel=names[name]}
 $('#scene').setAttribute('aria-busy',String(!state.ready));
 if(state.ready&&fullSceneAt===null)fullSceneAt=performance.now();
 window.sliceLoading?.(state);
}
world.onChange(()=>{dirty=true;streamStatus()});window.sliceRetry=()=>world.retry();$('#stream-retry').onclick=window.sliceRetry;
// Downloads start during entry compilation; assembly waits for its first frame.
world.prepare(true);
let cordGuideShown=false;try{cordGuideShown=sessionStorage.getItem('office-cord-guide')==='seen'}catch{}
// Raycast surfaces and semantic buttons feed a single tooltip renderer.
function renderHotspot(){
 const el=$('#object-hint'),guide=$('#object-lamp');
 const id=pointerHotspot||focusHotspot||(!guide.hidden&&guide.classList.contains('cord-guide-visible')?'lamp':null);
 const button=id&&$('#object-'+id),blocked=!window.sliceUsable||window.sliceFatal||api.hold||pointer||!$('#controls').hidden;
 const visible=!!id&&!blocked&&(!button||!button.hidden);
 const next=visible?id:null;if(next!==activeHotspot){activeHotspot=next;world.highlight(next);dirty=true}
 el.hidden=!visible;el.setAttribute('aria-hidden',String(!visible));el.dataset.hotspot=next||'';if(!visible)return;
 el.textContent=button?(!pointerHotspot&&!focusHotspot?guide.querySelector('.cord-guide').textContent:button.ariaLabel):L('Открыть дверь','Есікті ашу','Open door');
 let x,y;if(button){const r=button.getBoundingClientRect();x=r.x+r.width/2;y=r.y+r.height/2}else{const v=new T.Box3().setFromObject(world.door).getCenter(new T.Vector3()).project(camera);x=(v.x+1)*innerWidth/2;y=(1-v.y)*innerHeight/2}
 const width=el.offsetWidth,height=el.offsetHeight;
 el.style.left=clamp(x+32+width>innerWidth-12?x-32-width:x+32,12,Math.max(12,innerWidth-width-12))+'px';
 el.style.top=clamp(y-height/2,80,Math.max(80,innerHeight-height-32))+'px';
}
function pointHotspot(id){if(!window.sliceUsable||window.sliceFatal){clearHotspots();return}clearTimeout(leaveTimer);if(id){pointerHotspot=id;focusHotspot=null;keyboardMode=false;renderHotspot()}else leaveTimer=setTimeout(()=>{pointerHotspot=null;renderHotspot()},90)}
function clearHotspots(){clearTimeout(leaveTimer);pointerHotspot=focusHotspot=null;renderHotspot()}
document.addEventListener('keydown',()=>{keyboardMode=true;clearTimeout(leaveTimer);pointerHotspot=null;const el=document.activeElement;focusHotspot=el?.classList.contains('object-action')?el.id.slice(7):null;renderHotspot()},true);
document.addEventListener('pointerdown',()=>{keyboardMode=false;clearHotspots()},true);
window.addEventListener('room-scene-disabled',()=>{audio.setInside(false);audio.pauseForPage();if(pointer)release({pointerId:pointer.id},true);keyboardMode=false;$('#object-lamp').classList.remove('cord-guide-visible','pulling');clearHotspots();canvas.style.cursor='default'});
window.addEventListener('room-scene-ready',()=>{dirty=true;updateActions();weatherText()});
window.addEventListener('room-panel-open',clearHotspots);
window.addEventListener('room-actions',()=>{if(!$('#controls').hidden)clearHotspots();else renderHotspot()});
$('#panel').addEventListener('close',renderHotspot);
canvas.addEventListener('pointerleave',()=>pointHotspot(null));
for(const id of ['case','profile','lamp','keyform','poslesvet','contacts']){
 const el=$('#object-'+id);
 el.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')pointHotspot(id)});
 el.addEventListener('pointerleave',()=>pointHotspot(null));
 el.addEventListener('focus',()=>{if(keyboardMode||el.matches(':focus-visible')){focusHotspot=id;renderHotspot()}});
 el.addEventListener('blur',()=>{if(focusHotspot===id)focusHotspot=null;renderHotspot()});
}

function resize(){camera.aspect=innerWidth/innerHeight;camera.fov=mobile()?70:52;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight,false);dirty=true}window.addEventListener('resize',resize);resize();
let cameraSettling=0,cameraStarted=false,aim=new T.Vector3(),cameraDelta=.016;
function updateCamera(){
 const t=smooth(progress),inside=smooth(clamp((progress-.72)/.28,0,1)),p=path.getPoint(t);if(mobile()){p.x=T.MathUtils.lerp(p.x,.56,inside);p.z=T.MathUtils.lerp(p.z,1.25,inside);p.y=T.MathUtils.lerp(p.y,1.48,inside)}
 // Physical approach plus hysteresis: scroll intent alone never opens the door.
 const doorProbe=cameraStarted&&!reduced.matches?camera.position:p;
 if(!world.studioReady)doorNear=false;else if(doorProbe.z<3.85)doorNear=true;else if(doorProbe.z>4.25)doorNear=false;
 const doorTarget=doorNear?1.77:.04;world.door.rotation.y=reduced.matches?doorTarget:T.MathUtils.damp(world.door.rotation.y,doorTarget,12,cameraDelta);scene.updateMatrixWorld(true);
 const fov=viewName==='room'?(mobile()?78:84):(mobile()?70:52);camera.fov=reduced.matches?fov:T.MathUtils.damp(camera.fov,fov,10,cameraDelta);camera.updateProjectionMatrix();
 if(viewName==='room')p.lerp(new T.Vector3(.05,1.72,1.55),inside);
 if(viewName==='window')p.lerp((captureReferenceFraming?new T.Vector3(.2,1.58,.8):new T.Vector3(-.18,1.60,.80)),inside);
 const base=p.clone();p.x+=moveX*progress;p.z+=moveZ*progress;p.copy(world.walk(base,p));
 const onRoute=Math.abs(progress-target)>.0001&&!preExit;const desired=cameraStarted&&!reduced.matches&&!onRoute?camera.position.clone().lerp(p,1-Math.exp(-10*cameraDelta)):p;camera.position.copy(cameraStarted&&!reduced.matches?world.walk(camera.position,desired):desired);if(preExit&&camera.position.distanceTo(p)<.025)preExit=false;
 look.set(T.MathUtils.lerp(0,mobile()?.47:-.12,t),T.MathUtils.lerp(1.36,mobile()?1.21:1.09,t),T.MathUtils.lerp(1.9,-2.0,t));
 if(viewName==='room')look.lerp(new T.Vector3(mobile()?3:.72,mobile()?1.25:1.13,mobile()?-.34:-.5),inside);
 if(viewName==='window')look.lerp((captureReferenceFraming?new T.Vector3(-12,1.9,-7):new T.Vector3(-12,1.95,-5.0)),t);
 look.sub(camera.position).applyAxisAngle(new T.Vector3(0,1,0),-lookX).add(camera.position);look.y+=lookY;if(cameraStarted&&!reduced.matches)aim.lerp(look,1-Math.exp(-10*cameraDelta));else aim.copy(look);cameraStarted=true;camera.lookAt(aim);camera.updateMatrixWorld();updateActions();

 $('#intro').classList.toggle('away',progress>.10);$('#room-note').hidden=progress<.75;
 $('#entrance-button').setAttribute('aria-pressed',String(progress<.5));$('#desk-button').setAttribute('aria-pressed',String(progress>=.5));
}
function updateActions(){
 const targets={case:world.monitor,profile:world.folder,lamp:world.cordGrip,contacts:world.contacts,keyform:world.gallery[0],poslesvet:world.gallery[1]};
 for(const [id,o]of Object.entries(targets)){
  const el=$('#object-'+id),p=new T.Box3().setFromObject(o).getCenter(new T.Vector3()).project(camera);
  el.hidden=!window.sliceUsable||window.sliceFatal||progress<.96||p.z>1||Math.abs(p.x)>(mobile()&&id==='profile'?1.6:.96)||Math.abs(p.y)>.92;
  el.disabled=el.hidden;if(el.hidden)continue;
  if(id==='lamp'&&!cordGuideShown){cordGuideShown=true;el.classList.add('cord-guide-visible');try{sessionStorage.setItem('office-cord-guide','seen')}catch{}setTimeout(()=>{el.classList.remove('cord-guide-visible');renderHotspot()},8000);}
  let x=(p.x+1)*innerWidth/2,y=(1-p.y)*innerHeight/2+(id==='profile'?-24:0);
  if(id==='lamp'){
   const top=world.cordRoot.getWorldPosition(new T.Vector3()).project(camera),topY=(1-top.y)*innerHeight/2;
   el.style.height=Math.max(44,y-topY+18)+'px';y=(y+topY)/2+3;
  }
  const inset=el.offsetWidth/2+12;el.style.left=clamp(x,inset,innerWidth-inset)+'px';el.style.top=clamp(y,90,innerHeight-45)+'px';
 }
 renderHotspot();
}
function hitAt(x,y){mouse.set(x/innerWidth*2-1,-y/innerHeight*2+1);ray.setFromCamera(mouse,camera);const hits=ray.intersectObjects(scene.children,true);for(const hit of hits){const m=hit.object.material;if(!m)continue;if((m.transparent&&m.opacity<.45)||hit.object.isLine)continue;let o=hit.object;while(o&&!o.userData.action)o=o.parent;if(o?.userData.action)return{...hit,action:o.userData.action};if(m.visible!==false)return null}return null}
world.monitor.userData.action='case';
function hint(hit){pointHotspot(hit?.action||null);canvas.style.cursor=hit?.action==='lamp'||hit?.action==='profile'?'grab':hit?'pointer':'grab'}
// Canvas and the transparent, cord-aligned semantic button share one gesture.
// The button supplies a minimum 44px touch target; the visible cord remains the affordance.
function beginPointer(e){
 if(!window.sliceUsable||api.hold||pointer||e.button!==0)return;
 const direct=e.currentTarget.id.startsWith('object-'),hit=direct?{action:e.currentTarget.id.slice(7)}:hitAt(e.clientX,e.clientY);
 const grip=world.cordGrip.getWorldPosition(new T.Vector3()),a=grip.clone().project(camera),b=grip.clone().add(new T.Vector3(0,-.1,0)).project(camera);
 pointer={id:e.pointerId,target:e.currentTarget,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,kind:hit?.action||'look',type:e.pointerType,folderStart:folder,pixelsPerMetre:Math.max(80,Math.abs(b.y-a.y)*innerHeight/2/.1)};
 dragging=false;pullTriggered=false;pointer.target.setPointerCapture(e.pointerId);pointer.target.focus({preventScroll:true});
 if(pointer.kind==='lamp'){$('#object-lamp').classList.remove('cord-guide-visible');$('#object-lamp').classList.add('pulling');pullVelocity=0;e.preventDefault();}
 renderHotspot();if(progress>.7)audio.enter(true);
}
function movePointer(e){
 if(!window.sliceUsable)return;
 if(!pointer){if(e.currentTarget===canvas&&e.pointerType!=='touch')hint(hitAt(e.clientX,e.clientY),e.clientX,e.clientY);return}
 if(e.pointerId!==pointer.id)return;
 const dx=e.clientX-pointer.lastX,dy=e.clientY-pointer.lastY;pointer.lastX=e.clientX;pointer.lastY=e.clientY;
 if(progress<.96&&pointer.kind==='look'&&pointer.type==='touch'&&Math.abs(e.clientY-pointer.y)>8&&Math.abs(e.clientY-pointer.y)>Math.abs(e.clientX-pointer.x)*1.3)pointer.kind='navigate';
 if(Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>5)dragging=true;
 if(pointer.kind==='lamp'){
  pull=clamp((e.clientY-pointer.y)*.0014,0,.12);pullVelocity=0;
  if(pull>=.065&&!pullTriggered){toggleLight();pullTriggered=true;}
 }else if(pointer.kind==='profile')folderTarget=folder=clamp(pointer.folderStart+(pointer.x-e.clientX)*.009,0,1);
 else if(pointer.kind==='navigate'){target=clamp(target-dy*.003,0,1);audio.setInside(target>.4);}
 else{lookX=clamp(lookX-dx*.004,-1.2,1.2);lookY=clamp(lookY+dy*.003,-.45,.5);}
 dirty=true;renderHotspot();
}
function release(e,cancel=false){
 if(!pointer||e.pointerId!==pointer.id)return;
 const old=pointer;pointer=null;if(old.target.hasPointerCapture(e.pointerId))old.target.releasePointerCapture(e.pointerId);
 if(!cancel){
  if(old.kind==='profile'){if(!dragging)folderTarget=1;else folderTarget=folder>.5?1:0;if(folderTarget>0)openPanel('profile',old.target);}
  else if(!dragging){if(['case','keyform','poslesvet','contacts'].includes(old.kind))openPanel(old.kind,old.target);if(old.kind==='door')api.go(progress>.7?0:1,true);if(old.kind==='lamp'&&!pullTriggered)api.pull();}
 }
 if(reduced.matches&&old.kind==='lamp'){pull=pullVelocity=0;}
 pullTriggered=false;$('#object-lamp').classList.remove('pulling');dirty=true;canvas.style.cursor='grab';clearHotspots();
}
for(const el of [canvas,$('#object-lamp'),$('#object-profile')]){
 el.addEventListener('pointerdown',beginPointer);el.addEventListener('pointermove',movePointer);
 el.addEventListener('pointerup',e=>release(e));el.addEventListener('pointercancel',e=>release(e,true));
 el.addEventListener('lostpointercapture',e=>{if(pointer)release(e,true)});
}
canvas.addEventListener('wheel',e=>{if(!window.sliceUsable){e.preventDefault();return}if(api.hold||pointer?.kind==='lamp')return;e.preventDefault();const amount=e.deltaY*(e.deltaMode===1?18:e.deltaMode===2?innerHeight:1);target=clamp(target+clamp(amount,-220,220)*.00105,0,1);if(target>.4)audio.setInside(true);else audio.setInside(false);lookX*=.7;lookY*=.7;dirty=true},{passive:false});
canvas.addEventListener('keydown',e=>{if(!window.sliceUsable)return;if(api.hold||e.ctrlKey||e.metaKey||e.altKey)return;let used=true;if(e.key==='Enter')api.go(progress<.5?1:0,true);else if(e.key==='Home')api.go(0,false);else if(e.key==='ArrowUp')lookY=clamp(lookY+.08,-.45,.5);else if(e.key==='ArrowDown')lookY=clamp(lookY-.08,-.45,.5);else if(e.key==='ArrowLeft')lookX=clamp(lookX-.12,-1.2,1.2);else if(e.key==='ArrowRight')lookX=clamp(lookX+.12,-1.2,1.2);else if(e.key.toLowerCase()==='w')moveZ=clamp(moveZ-.12,-.35,.8);else if(e.key.toLowerCase()==='s')moveZ=clamp(moveZ+.12,-.35,.8);else if(e.key.toLowerCase()==='a')moveX=clamp(moveX-.12,-.55,.65);else if(e.key.toLowerCase()==='d')moveX=clamp(moveX+.12,-.55,.65);else used=false;if(used){e.preventDefault();dirty=true}});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();window.sliceFail()});
function frame(time){const dt=Math.min((time-last)/1000,.04);last=time;cameraDelta=dt;requestAnimationFrame(frame);frameCount++;if(document.hidden||captureFrozen||window.sliceFatal)return;
 if(world.preparingGPU)return;
 if(lastReduced!==reduced.matches){lastReduced=reduced.matches;weatherText();dirty=true}
 const allowedTarget=!world.studioReady?0:target>progress&&world.door.rotation.y<1.70?Math.min(target,doorStopProgress):target;
 let moving=Math.abs(progress-allowedTarget)>.0001||Math.abs(brightness-(light?1:0))>.0001||Math.abs(folder-folderTarget)>.0001||pull>.0001||Math.abs(pullVelocity)>.0001||Math.abs(world.door.rotation.y-(doorNear?1.77:.04))>.0001;
 if(!api.hold&&!preExit){const allowed=allowedTarget,next=T.MathUtils.damp(progress,allowed,6.5,dt);progress=reduced.matches?allowed:progress+clamp(next-progress,-.02,.02);if(Math.abs(progress-allowed)<.0001)progress=allowed}
 brightness=T.MathUtils.damp(brightness,light?1:0,10,dt);folder=T.MathUtils.damp(folder,folderTarget,reduced.matches?30:10,dt);
 if(pointer?.kind!=='lamp'){pullVelocity+=(-pull*180-pullVelocity*22)*dt;pull=clamp(pull+pullVelocity*dt,0,.12);if(pull<.0001&&Math.abs(pullVelocity)<.002){pull=pullVelocity=0}}
 world.cordLine.scale.y=1+pull/.4;world.cordLine.position.y=-(.4+pull)/2;world.cordGrip.position.y=-.434-pull;world.cord.rotation.z=reduced.matches?0:pullVelocity*.025;world.cover.rotation.z=folder*1.95;world.taskLight.intensity=14*brightness;if(world.lightSurface){const mats=Array.isArray(world.lightSurface.material)?world.lightSurface.material:[world.lightSurface.material];for(const m of mats)if(m.emissive)m.emissiveIntensity=brightness*1.2}
 const weatherMoving=world.exterior?.weather?.animate(dt,camera,reduced.matches||rainPaused||api.hold);
 if(dirty||moving||cameraSettling>0||weatherMoving){if(dirty)cameraSettling=90;else if(cameraSettling>0)cameraSettling--;updateCamera();world.daylight.update();world.exterior?.update?.(camera);scene.updateMatrixWorld();renderer.render(scene,camera);renderCount++;if(renderCount===1){firstFrameAt=performance.now();world.allowAssembly()}dirty=false}
}
window.__SLICE__={inspect:()=>({firstFrameAt,fullSceneAt,doorNear,doorStopProgress,window:world.inspectWindow(),weather:{...world.exterior?.weather?.inspect(),paused:rainPaused,reduced:reduced.matches},stream:world.inspectStream(),cameraClear:world.clearance(camera.position),viewName,progress,target,doorAngle:world.door.rotation.y,camera:camera.position.toArray(),look:[lookX,lookY],move:[moveX,moveZ],lamp:light,brightness,pull,folder,held:api.hold,pointerKind:pointer?.kind||null,pullThreshold:.065,pullLimit:.12,office:world.office,assets:world.assetInfo,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,frames:frameCount,renders:renderCount,audio:audio.inspect()}),points:()=>Object.fromEntries(world.objects.map(o=>{const p=new T.Box3().setFromObject(o).getCenter(new T.Vector3()).project(camera);return[o.userData.action,{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}]})),cord:()=>{const project=o=>{const p=o.getWorldPosition(new T.Vector3()).project(camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}};return{top:project(world.cordRoot),grip:project(world.cordGrip)}},get ready(){return world.studioReady&&window.sliceUsable}};
// Explicit review-only capture mode freezes scene state, not just CSS animation.
if(captureMode)window.__SLICE__.capture=async({view='corridor',yaw=0,pitch=0,x=0,z=0,assetsReady=true,baked=true,lampOn=true,referenceFraming=false}={})=>{
 if(assetsReady){world.prepare(true);const start=performance.now();while(!world.studioReady){if(performance.now()-start>90000)throw Error('Capture assets failed or timed out');await new Promise(r=>setTimeout(r,50))}}
 captureReferenceFraming=referenceFraming;captureFrozen=true;doorNear=false;api.hold=false;viewName=view==='corridor'?'desk':view;progress=target=view==='corridor'?0:1;lookX=clamp(yaw,-1.2,1.2);lookY=clamp(pitch,-.45,.5);moveX=clamp(x,-.55,.65);moveZ=clamp(z,-.35,.8);folder=folderTarget=0;pull=pullVelocity=0;light=lampOn;brightness=lampOn?1:0;pointer=null;preExit=false;cameraStarted=false;
 world.cordLine.scale.y=1;world.cordLine.position.y=-.2;world.cordGrip.position.y=-.434;world.cord.rotation.z=world.cover.rotation.z=0;world.taskLight.intensity=lampOn?14:0;world.windowBake(baked);if(world.lightSurface)for(const m of Array.isArray(world.lightSurface.material)?world.lightSurface.material:[world.lightSurface.material])if(m.emissive)m.emissiveIntensity=brightness*1.2;
 cordGuideShown=true;$('#object-lamp').classList.remove('cord-guide-visible');clearHotspots();updateCamera();world.daylight.update();world.exterior?.update?.(camera);scene.updateMatrixWorld(true);renderer.render(scene,camera);
 const maps=[];scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap'])if(m[key])maps.push({material:m.name,type:key,colorSpace:m[key].colorSpace,url:m[key].image?.src||'generated',repeat:m[key].repeat.toArray()})});
 return{window:world.inspectWindow(),view,yaw:lookX,pitch:lookY,move:[moveX,moveZ],time:0,seed:4240,frozen:captureFrozen,camera:camera.position.toArray(),matrix:camera.matrixWorld.elements,projection:camera.projectionMatrix.elements,assets:world.inspectStream(),output:renderer.outputColorSpace,toneMapping:renderer.toneMapping,maps,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
};
// Compile the final entry material configuration before its first use.
if(renderer.compileAsync)await renderer.compileAsync(scene,camera);
last=performance.now();
requestAnimationFrame(frame);
