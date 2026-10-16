import * as T from 'three';
import {layoutDocumentActions,hideDocumentLeaders} from './document-actions.js';
import {createWorld} from './world.js';
import {RoomAudio} from './audio.js';
import {$,L,attachApp,openPanel,weatherText} from './ui.js';
const canvas=$('#scene'),renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const camera=new T.PerspectiveCamera(52,innerWidth/innerHeight,.05,6000),world=await createWorld(renderer,camera),scene=world.scene;
let storage;try{storage=localStorage}catch{}const audio=new RoomAudio(storage);audio.setRain(!!world.exterior?.weather);
let touchHotspot=null,touchTimer=null,hoverSurface=null;
const captureMode=new URLSearchParams(location.search).has('capture');let captureFrozen=false,captureReferenceFraming=false;let closeCabinetFocus=false;
let rainPaused=false;try{rainPaused=storage?.getItem('room-weather-motion-v1')==='paused'}catch{}
const reduced=captureMode?{matches:true}:matchMedia('(prefers-reduced-motion: reduce)');const ray=new T.Raycaster(),mouse=new T.Vector2(),look=new T.Vector3();
const doorOpenAngle=1.54,doorPassAngle=1.48;
let lastReduced=reduced.matches,shadowUpdates=0,cachedShadowFrames=0,cabinetVelocity=0;
let firstFrameAt=null,fullSceneAt=null,doorNear=false,preExit=false,viewName='desk',progress=0,target=0,lookX=0,lookY=0,moveX=0,moveZ=0,pointer=null,dragging=false,pull=0,pullVelocity=0,pullTriggered=false,light=true,brightness=1,folder=0,folderTarget=0,drawer=0,drawerTarget=0,cabinet=0,cabinetTarget=0,dirty=true,last=performance.now(),frameCount=0,renderCount=0;
const mobile=()=>innerWidth/innerHeight<.82,clamp=T.MathUtils.clamp,smooth=(v)=>v*v*(3-2*v);
const path=new T.CatmullRomCurve3([new T.Vector3(0,1.60,9.55),new T.Vector3(.02,1.57,5.20),new T.Vector3(.04,1.55,1.60),new T.Vector3(.40,1.50,1.15),new T.Vector3(.65,1.60,1.50)]);
// Stop outside the door's sweep until the physical opening is clear.
const doorStopProgress=(()=>{let lo=0,hi=.8;for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(path.getPoint(smooth(mid)).z>2.65)lo=mid;else hi=mid}return lo})();
let activeHotspot=null,pointerHotspot=null,focusHotspot=null,leaveTimer=null,keyboardMode=false;
const api={hold:false,audio,canInspect(id){return world.collectionReady(id)},cabinet(){cabinetTarget=cabinetTarget>.5?0:1;dirty=true},closeCabinet(){if(api.hold||!cabinetCommandProjection()||cabinetTarget<=.5)return;closeCabinetFocus=document.activeElement===$('#cabinet-close');cabinetTarget=0;cabinetVelocity=0;dirty=true},previewProject(project,image){if(!window.sliceUsable||window.sliceFatal)return;world.previewProject(project,image);dirty=true},get rainPaused(){return rainPaused},get rainMotionBlocked(){return reduced.matches},toggleRainMotion(){rainPaused=!rainPaused;try{storage?.setItem('room-weather-motion-v1',rainPaused?'paused':'playing')}catch{}weatherText();dirty=true},localize(){world.localize();streamStatus();renderHotspot();dirty=true},go(value,gesture=false){if(!window.sliceUsable)return;preExit=value<.5&&progress>.96&&!reduced.matches;viewName='desk';target=clamp(value,0,1);lookX=lookY=moveX=moveZ=0;if(target>.4){if(gesture)audio.enter(true);else audio.setInside(true)}else audio.setInside(false);dirty=true},documents(){if(world.drawerPull){drawerTarget=1;api.view('drawer')}},view(name){if(name==='education'){api.documents();return}api.go(1,true);viewName=name;lookX=0;dirty=true},pull(){toggleLight();pull=.09;pullVelocity=0;dirty=true},folder(){folderTarget=folderTarget>.5?0:1;dirty=true},drawer(){if(!world.drawerPull)return;drawerTarget=drawerTarget>.5?0:1;if(drawerTarget){api.view('drawer')}else if(viewName==='drawer'){viewName='desk'}dirty=true}};
function toggleLight(){$('#object-lamp').classList.remove('cord-guide-visible');light=!light;audio.effect();for(const id of ['#lamp-button','#object-lamp'])$(id).setAttribute('aria-pressed',String(light));dirty=true}
attachApp(api);reduced.addEventListener?.('change',()=>{weatherText();dirty=true});
function streamStatus(){
 // The weather remains rainy when animation is paused or reduced; sound follows
 // the assembled exterior and still respects the existing gesture/mute controls.
 const raining=!!world.exterior?.weather;if(audio.raining!==raining)audio.setRain(raining);
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
const needsTouchContext=id=>['cube','robot','orbit','drawer-resume'].includes(id)||id.startsWith('wall-');
const surfaceRecord=hit=>hit?{kind:hit.action,object:hit.object,local:hit.object.worldToLocal(hit.point.clone())}:null;
function surfaceProjection(record){
 if(!record||api.hold)return null;
 const p=record.object.localToWorld(record.local.clone()).project(camera);if(p.z< -1||p.z>1||Math.abs(p.x)>=1||Math.abs(p.y)>=1)return null;
 const hit=hitAt((p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2);return hit?.action===record.kind?{p,hit}:null;
}
function confirmTouch(record){
 if(touchHotspot?.kind===record.kind){touchHotspot=null;clearTimeout(touchTimer);return true}
 touchHotspot=record;clearTimeout(touchTimer);touchTimer=setTimeout(()=>{touchHotspot=null;renderHotspot()},5000);renderHotspot();return false;
}
function renderHotspot(){
 const el=$('#object-hint'),guide=$('#object-lamp');
 const id=touchHotspot?.kind||pointerHotspot||focusHotspot||(!guide.hidden&&guide.classList.contains('cord-guide-visible')?'lamp':null),surface=touchHotspot||(pointerHotspot?hoverSurface:null),surfacePoint=surfaceProjection(surface);
 const button=id&&$('#object-'+id),blocked=!window.sliceUsable||window.sliceFatal||api.hold||pointer||!$('#controls').hidden;
 const visible=!!id&&!blocked&&(touchHotspot||!id.startsWith('drawer-')||matchMedia('(hover:hover) and (pointer:fine)').matches)&&(surface?!!surfacePoint:(!button||!button.hidden)&&canActivateObject(id));
 const next=visible?id:null;if(next!==activeHotspot){activeHotspot=next;world.highlight(next);dirty=true}
 el.hidden=!visible;el.setAttribute('aria-hidden',String(!visible));el.dataset.hotspot=next||'';if(!visible)return;
 el.textContent=button?(!touchHotspot&&!pointerHotspot&&!focusHotspot?guide.querySelector('.cord-guide').textContent:button.ariaLabel):L('Открыть дверь','Есікті ашу','Open door');
 if(touchHotspot)el.textContent+=' · '+L('ещё раз — открыть','қайта түрту — ашу','tap again to open');
 let x,y;if(surfacePoint){x=(surfacePoint.p.x+1)*innerWidth/2;y=(1-surfacePoint.p.y)*innerHeight/2}else if(button){const r=button.getBoundingClientRect();x=r.x+r.width/2;y=r.y+r.height/2}else{const v=new T.Box3().setFromObject(world.door).getCenter(new T.Vector3()).project(camera);x=(v.x+1)*innerWidth/2;y=(1-v.y)*innerHeight/2}
 const width=el.offsetWidth,height=el.offsetHeight;
 el.style.left=clamp(x+32+width>innerWidth-12?x-32-width:x+32,12,Math.max(12,innerWidth-width-12))+'px';
 el.style.top=clamp(y-height/2,80,Math.max(80,innerHeight-height-32))+'px';
}
function pointHotspot(id,surface=null){hoverSurface=surface;if(!window.sliceUsable||window.sliceFatal){clearHotspots();return}clearTimeout(leaveTimer);if(id){pointerHotspot=id;focusHotspot=null;keyboardMode=false;renderHotspot()}else leaveTimer=setTimeout(()=>{pointerHotspot=null;renderHotspot()},90)}
function clearHotspots(keepTouch=false){clearTimeout(leaveTimer);pointerHotspot=focusHotspot=hoverSurface=null;if(keepTouch!==true){touchHotspot=null;clearTimeout(touchTimer)}renderHotspot()}
document.addEventListener('keydown',()=>{keyboardMode=true;touchHotspot=null;clearTimeout(touchTimer);clearTimeout(leaveTimer);pointerHotspot=null;const el=document.activeElement;focusHotspot=el?.classList.contains('object-action')?el.id.slice(7):null;renderHotspot()},true);
document.addEventListener('pointerdown',()=>{keyboardMode=false;clearHotspots(true)},true);
window.addEventListener('room-scene-disabled',()=>{audio.setInside(false);audio.pauseForPage();if(pointer)release({pointerId:pointer.id},true);hideDocumentLeaders();keyboardMode=false;$('#object-lamp').classList.remove('cord-guide-visible','pulling');clearHotspots();canvas.style.cursor='default'});
window.addEventListener('room-scene-ready',()=>{dirty=true;updateActions();weatherText()});
window.addEventListener('room-panel-open',clearHotspots);
window.addEventListener('room-actions',()=>{if(!$('#controls').hidden)clearHotspots();else renderHotspot()});
$('#panel').addEventListener('close',renderHotspot);
canvas.addEventListener('pointerleave',()=>pointHotspot(null));
for(const id of ['case','profile','lamp','wall-diploma','wall-hackalem','wall-certificate','drawer','drawer-resume','drawer-education','cabinet','cube','robot','orbit']){
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
 const doorTarget=doorNear?doorOpenAngle:.04;world.door.rotation.y=reduced.matches?doorTarget:T.MathUtils.damp(world.door.rotation.y,doorTarget,12,cameraDelta);scene.updateMatrixWorld(true);
 const fov=viewName==='cabinet'?(mobile()?80:52):viewName==='room'?(mobile()?78:84):(mobile()?70:52);camera.fov=reduced.matches?fov:T.MathUtils.damp(camera.fov,fov,10,cameraDelta);camera.updateProjectionMatrix();
 if(viewName==='room')p.lerp(new T.Vector3(.65,1.72,1.35),inside);
 if(viewName==='drawer')p.lerp(new T.Vector3(.38,1.60,-.95),inside);
 if(viewName==='cabinet')p.lerp(mobile()?new T.Vector3(-.55,1.05,-.34):new T.Vector3(.85,1.04,-.34),inside);
 if(viewName==='window')p.lerp((captureReferenceFraming?new T.Vector3(.2,1.58,.8):new T.Vector3(-.18,1.60,.80)),inside);
 const base=p.clone();p.x+=moveX*progress;p.z+=moveZ*progress;p.copy(world.walk(base,p));
 const onRoute=Math.abs(progress-target)>.0001&&!preExit;const desired=cameraStarted&&!reduced.matches&&!onRoute?camera.position.clone().lerp(p,1-Math.exp(-10*cameraDelta)):p;camera.position.copy(cameraStarted&&!reduced.matches?world.walk(camera.position,desired):desired);if(preExit&&camera.position.distanceTo(p)<.025)preExit=false;
 look.set(T.MathUtils.lerp(0,mobile()?.47:-.12,t),T.MathUtils.lerp(1.36,mobile()?1.21:1.09,t),T.MathUtils.lerp(1.9,-2.0,t));
 if(viewName==='room')look.lerp(new T.Vector3(mobile()?3:.72,mobile()?1.25:1.13,mobile()?-.34:-.5),inside);
 if(viewName==='cabinet')look.lerp(new T.Vector3(2.66,.38,-.34),inside);
 if(viewName==='drawer')look.lerp(new T.Vector3(.38,.69,-1.48),inside);
 if(viewName==='window')look.lerp((captureReferenceFraming?new T.Vector3(-12,1.9,-7):new T.Vector3(-12,1.95,-5.0)),t);
 look.sub(camera.position).applyAxisAngle(new T.Vector3(0,1,0),-lookX).add(camera.position);look.y+=lookY;if(cameraStarted&&!reduced.matches)aim.lerp(look,1-Math.exp(-10*cameraDelta));else aim.copy(look);cameraStarted=true;camera.lookAt(aim);camera.updateMatrixWorld();updateActions();

 $('#intro').classList.toggle('away',progress>.10);$('#room-note').hidden=progress<.75;
 $('#entrance-button').setAttribute('aria-pressed',String(progress<.5));$('#desk-button').setAttribute('aria-pressed',String(progress>=.5));
}
// The same physical access decision backs rays, semantic controls and hints.
// Four metres covers object inspection; the wall cord keeps its accepted 4.29 m
// workspace reach (4.5 m). The room-side
// threshold prevents a visible object through the doorway being a remote target.
function actionTargets(){return{case:world.objects.find(o=>o.userData.action==='case'),profile:world.objects.find(o=>o.userData.action==='profile'),lamp:world.cordGrip,...world.documentTargets,drawer:world.drawerPull,...world.drawerDocuments,...world.collectionTargets}}
function actionEligible(action,distance=0){
 if(!window.sliceUsable||window.sliceFatal||!world.studioReady)return false;
 if(action==='door')return true;
 const p=camera.position;if(p.x<=-2.95||p.x>=2.95||p.z<=-2.94||p.z>=1.90||distance>(action==='lamp'?4.5:4))return false;
 if(action.startsWith('drawer-')&&drawer<.55)return false;
 if(['cube','robot','orbit'].includes(action)&&!world.collectionReady(action))return false;
 return true;
}
function projectedAction(id,o=actionTargets()[id]){
 if(!o||!actionEligible(id))return null;
 const anchor=o.userData.hotspotAnchor&&o.getObjectByName(o.userData.hotspotAnchor),points=[anchor?anchor.getWorldPosition(new T.Vector3()):new T.Box3().setFromObject(o).getCenter(new T.Vector3())];
 if(id==='cabinet')for(const handle of world.cabinetHandles)if(handle!==o)points.push(new T.Box3().setFromObject(handle).getCenter(new T.Vector3()));
 if(id.startsWith('drawer-'))o.traverse(page=>{if(page.isMesh&&page.name.endsWith(' preview')&&page!==anchor)points.push(page.getWorldPosition(new T.Vector3()))});
 const visible=points=>{for(const point of points){const p=point.project(camera);if(p.z< -1||p.z>1||Math.abs(p.x)>.96||Math.abs(p.y)>.92)continue;const hit=hitAt((p.x+1)*innerWidth/2,(1-p.y)*innerHeight/2);if(hit?.action===id)return{p,hit}}return null};
 const primary=visible(points);if(primary)return primary;
 // Extra bounds are needed only when the primary anchor is actually hidden.
 if(['cube','robot','orbit'].includes(id)){const fallback=[];let count=0;o.traverse(mesh=>{if(mesh.isMesh&&count++<18)fallback.push(new T.Box3().setFromObject(mesh).getCenter(new T.Vector3()))});return visible(fallback)}
 return null;
}
function canActivateObject(id){return !api.hold&&(id==='door'?actionEligible(id):!!projectedAction(id))}
document.addEventListener('click',e=>{const el=e.target.closest?.('.object-action');if(el&&!canActivateObject(el.id.slice(7))){e.preventDefault();e.stopImmediatePropagation();clearHotspots()}},true);
// This is an explicit close command in the cabinet view, not a displaced
// physical hotspot. Existing rays and all object eligibility remain unchanged.
function cabinetCommandProjection(){
 if(innerWidth>420||viewName!=='cabinet'||!world.cabinet||!actionEligible('cabinet'))return null;
 const p=world.cabinet.localToWorld(new T.Vector3(0,.142,.356)).project(camera);if(p.z< -1||p.z>1||Math.abs(p.x)>.96||Math.abs(p.y)>.92)return null;
 ray.setFromCamera(new T.Vector2(p.x,p.y),camera);
 for(const hit of ray.intersectObjects(scene.children,true)){const m=Array.isArray(hit.object.material)?hit.object.material[hit.face?.materialIndex||0]:hit.object.material;let shown=true;for(let parent=hit.object;parent;parent=parent.parent)if(!parent.visible)shown=false;if(!shown||!m||m.visible===false||m.transparent&&m.opacity<.45||hit.object.isLine)continue;let belongs=false;for(let o=hit.object;o;o=o.parent)if(o===world.cabinet)belongs=true;return belongs&&actionEligible('cabinet',hit.distance)?p:null}
 return null;
}
function updateCabinetCommand(collectionItems){
 const el=$('#cabinet-close'),p=cabinetCommandProjection();el.hidden=!p||cabinet<.01;el.disabled=window.sliceFatal||!window.sliceUsable||cabinetTarget<=.5;
 if(!el.hidden){const w=el.offsetWidth,h=el.offsetHeight,x=(p.x+1)*innerWidth/2,y=(1-p.y)*innerHeight/2,neighbours=collectionItems.filter(i=>!i.el.hidden).map(i=>i.el.getBoundingClientRect()),top=Math.max(90,y+10,...neighbours.map(r=>r.bottom+8));el.style.left=clamp(x,12+w/2,innerWidth-12-w/2)+'px';el.style.top=Math.min(top,innerHeight-h-40)+'px'}
 if(closeCabinetFocus&&cabinet===0){closeCabinetFocus=false;if(!api.hold&&(document.activeElement===el||document.activeElement===document.body))($('#object-cabinet').hidden?$('#actions-toggle'):$('#object-cabinet')).focus({preventScroll:true})}
}
function updateActions(){
 const documentItems=[],collectionItems=[];
 for(const [id,o]of Object.entries(actionTargets())){
  const el=$('#object-'+id),projection=projectedAction(id,o);el.hidden=el.disabled=!projection;if(!projection)continue;
  const {p}=projection,screenX=(p.x+1)*innerWidth/2,screenY=(1-p.y)*innerHeight/2;
  if(id.startsWith('drawer-')&&drawer<.55)el.hidden=true;el.disabled=el.hidden;if(el.hidden)continue;
  if(id.startsWith('drawer-')){documentItems.push({id,el,object:o});continue}
  if(['cube','robot','orbit'].includes(id))collectionItems.push({id,el,object:o});
  if(id==='lamp'&&!cordGuideShown){cordGuideShown=true;el.classList.add('cord-guide-visible');try{sessionStorage.setItem('office-cord-guide','seen')}catch{}setTimeout(()=>{el.classList.remove('cord-guide-visible');renderHotspot()},8000);}
  let x=screenX,y=screenY;
  if(id==='lamp'){
   const top=world.cordRoot.getWorldPosition(new T.Vector3()).project(camera),topY=(1-top.y)*innerHeight/2;
   el.style.height=Math.max(44,y-topY+18)+'px';y=(y+topY)/2+3;
  }
  const inset=el.offsetWidth/2+12;el.style.left=clamp(x,inset,innerWidth-inset)+'px';el.style.top=clamp(y,90,innerHeight-45)+'px';
 }
 layoutDocumentActions(documentItems,camera,$('#object-drawer'));
 updateCabinetCommand(collectionItems);
 $('#cabinet-button').setAttribute('aria-pressed',String(cabinetTarget>.5));
 $('#drawer-button').hidden=!world.drawerPull;for(const id of ['#drawer-button','#object-drawer'])$(id).setAttribute('aria-pressed',String(drawer>.5));
 renderHotspot();
}
function hitAt(x,y){mouse.set(x/innerWidth*2-1,-y/innerHeight*2+1);ray.setFromCamera(mouse,camera);const hits=ray.intersectObjects(scene.children,true);for(const hit of hits){const material=hit.object.material,m=Array.isArray(material)?material[hit.face?.materialIndex||0]:material;if(!m)continue;let shown=true;for(let parent=hit.object;parent;parent=parent.parent)if(!parent.visible){shown=false;break}if(!shown||(m.transparent&&m.opacity<.45)||hit.object.isLine)continue;let o=hit.object;while(o&&!o.userData.action)o=o.parent;if(o?.userData.action){const action=o.userData.action;if(!actionEligible(action,hit.distance))return null;return{...hit,action}};if(m.visible!==false)return null}return null}
world.monitor.userData.action='case';
function hint(hit){pointHotspot(hit?.action||null,surfaceRecord(hit));canvas.style.cursor=hit?.action==='lamp'||hit?.action==='profile'||hit?.action==='drawer'||hit?.action==='cabinet'?'grab':hit?'pointer':'grab'}
// Canvas and the transparent, cord-aligned semantic button share one gesture.
// The button supplies a minimum 44px touch target; the visible cord remains the affordance.
function beginPointer(e){
 if(!window.sliceUsable||api.hold||pointer||e.button!==0)return;
 const direct=e.currentTarget.id.startsWith('object-'),hit=direct?projectedAction(e.currentTarget.id.slice(7))?.hit:hitAt(e.clientX,e.clientY);
 if(direct&&!hit)return;
 if(hit?.action&&(api.hold||!actionEligible(hit.action,hit.distance)))return;
 const grip=world.cordGrip.getWorldPosition(new T.Vector3()),a=grip.clone().project(camera),b=grip.clone().add(new T.Vector3(0,-.1,0)).project(camera);
 const drawerPoint=world.drawerPull?new T.Box3().setFromObject(world.drawerPull).getCenter(new T.Vector3()):null,drawerTravel=world.inspectFurniture().drawerTravel||.29,drawerClosed=drawerPoint?.clone().add(new T.Vector3(0,0,-drawerTravel*drawer)),drawerOpen=drawerPoint?.clone().add(new T.Vector3(0,0,drawerTravel*(1-drawer))),drawerA=drawerClosed?.clone().project(camera),drawerB=drawerOpen?.clone().project(camera),drawerVector=drawerA?new T.Vector2((drawerB.x-drawerA.x)*innerWidth/2,(drawerA.y-drawerB.y)*innerHeight/2):new T.Vector2(0,40),drawerW0=drawerClosed?Math.max(.05,-drawerClosed.clone().applyMatrix4(camera.matrixWorldInverse).z):1,drawerW1=drawerOpen?Math.max(.05,-drawerOpen.clone().applyMatrix4(camera.matrixWorldInverse).z):1;
 const cabinetGrip=hit?.action==='cabinet'?world.cabinetGrip(hit):null,screen=p=>{const v=new T.Vector3().fromArray(p).project(camera);return{x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2}},cabinetCurrent=cabinetGrip&&screen(cabinetGrip.current),cabinetPath=cabinetGrip?.samples.map(s=>({...s,...screen(s.position)}));
 if(touchHotspot&&touchHotspot.kind!==hit?.action)clearHotspots();
 pointer={direct,surface:surfaceRecord(hit),cabinetStart:cabinet,cabinetOriginalTarget:cabinetTarget,cabinetPath,cabinetOffset:cabinetCurrent?{x:e.clientX-cabinetCurrent.x,y:e.clientY-cabinetCurrent.y}:null,drawerStart:drawer,drawerScreenStart:drawer*drawerW1/(drawerW0+drawer*(drawerW1-drawerW0)),drawerW0,drawerW1,drawerAxis:drawerVector.clone().normalize(),drawerPixels:Math.max(16,drawerVector.length()),id:e.pointerId,target:e.currentTarget,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,kind:hit?.action||'look',type:e.pointerType,folderStart:folder,pixelsPerMetre:Math.max(80,Math.abs(b.y-a.y)*innerHeight/2/.1)};
 if(pointer.kind==='cabinet'){cabinetTarget=cabinet;cabinetVelocity=0}
 dragging=false;pullTriggered=false;pointer.target.setPointerCapture(e.pointerId);pointer.target.focus({preventScroll:true});
 if(pointer.kind==='cabinet')e.preventDefault();
 if(pointer.kind==='lamp'){$('#object-lamp').classList.remove('cord-guide-visible');$('#object-lamp').classList.add('pulling');pullVelocity=0;e.preventDefault();}
 renderHotspot();if(progress>.7)audio.enter(true);
}
function movePointer(e){
 if(!window.sliceUsable)return;
 if(!pointer){if(e.currentTarget===canvas&&e.pointerType!=='touch')hint(hitAt(e.clientX,e.clientY),e.clientX,e.clientY);return}
 if(e.pointerId!==pointer.id)return;
 const dx=e.clientX-pointer.lastX,dy=e.clientY-pointer.lastY;pointer.lastX=e.clientX;pointer.lastY=e.clientY;
 if(!pointerAccessible(pointer)){release(e,true);return}
 if(progress<.96&&pointer.kind==='look'&&pointer.type==='touch'&&Math.abs(e.clientY-pointer.y)>8&&Math.abs(e.clientY-pointer.y)>Math.abs(e.clientX-pointer.x)*1.3)pointer.kind='navigate';
 if(Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>5)dragging=true;
 if(pointer.kind==='lamp'){
  pull=clamp((e.clientY-pointer.y)*.0014,0,.12);pullVelocity=0;
  if(pull>=.065&&!pullTriggered){toggleLight();pullTriggered=true;}
 }else if(pointer.kind==='drawer'){const delta=new T.Vector2(e.clientX-pointer.x,e.clientY-pointer.y).dot(pointer.drawerAxis);const screen=clamp(pointer.drawerScreenStart+delta/pointer.drawerPixels,0,1);drawerTarget=drawer=clamp(screen*pointer.drawerW0/(pointer.drawerW1-screen*(pointer.drawerW1-pointer.drawerW0)),0,1);}
 else if(pointer.kind==='profile')folderTarget=folder=clamp(pointer.folderStart+(pointer.x-e.clientX)*.009,0,1);
 else if(pointer.kind==='cabinet'){
  if(dragging&&pointer.cabinetPath){const q={x:e.clientX-pointer.cabinetOffset.x,y:e.clientY-pointer.cabinetOffset.y};let best=Infinity,amount=cabinet;for(let i=1;i<pointer.cabinetPath.length;i++){const a=pointer.cabinetPath[i-1],b=pointer.cabinetPath[i],dx=b.x-a.x,dy=b.y-a.y,t=clamp(((q.x-a.x)*dx+(q.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1),distance=(q.x-a.x-dx*t)**2+(q.y-a.y-dy*t)**2;if(distance<best){best=distance;amount=T.MathUtils.lerp(a.amount,b.amount,t)}}cabinet=cabinetTarget=clamp(amount,0,1);cabinetVelocity=0;world.setCabinet(cabinet)}
 }
 else if(pointer.kind==='navigate'){target=clamp(target-dy*.003,0,1);audio.setInside(target>.4);}
 else if(pointer.kind==='look'&&dragging){lookX=clamp(lookX-dx*.004,-1.2,1.2);lookY=clamp(lookY+dy*.003,-.45,.5);}
 dirty=true;renderHotspot();
}
function pointerAccessible(p){
 if(api.hold)return false;
 if(['look','navigate'].includes(p.kind))return true;
 // Canvas gestures retain their pressed surface; HTML controls retain their anchor.
 return p.direct?canActivateObject(p.kind):!!surfaceProjection(p.surface);
}
function release(e,cancel=false){
 if(!pointer||e.pointerId!==pointer.id)return;
 const old=pointer;pointer=null;if(old.target.hasPointerCapture(e.pointerId))old.target.releasePointerCapture(e.pointerId);
 if(!pointerAccessible(old))cancel=true;
 if(cancel&&old.kind==='cabinet'){cabinetTarget=old.cabinetOriginalTarget;cabinetVelocity=0}
 if(cancel&&old.kind==='drawer'){drawerTarget=old.drawerStart>.5?1:0;if(!drawerTarget&&viewName==='drawer')viewName='desk'}
 if(!cancel){
  if(old.kind==='drawer'){if(!dragging)api.drawer();else{drawerTarget=drawer>.5?1:0;if(drawerTarget)api.view('drawer');else if(viewName==='drawer')viewName='desk';}}
  else if(old.kind==='cabinet'){cabinetTarget=dragging?(cabinet>.5?1:0):(old.cabinetOriginalTarget>.5?0:1);cabinetVelocity=0}
  else if(old.kind==='profile'){if(!dragging)folderTarget=1;else folderTarget=folder>.5?1:0;if(folderTarget>0)openPanel('profile',old.target);}
  else if(!dragging&&(old.type!=='touch'||!needsTouchContext(old.kind)||confirmTouch(old.surface))){if(['case','wall-diploma','wall-hackalem','wall-certificate','education','cube','robot','orbit'].includes(old.kind))openPanel(old.kind,old.target);if(old.kind==='drawer-resume')$('#object-drawer-resume').click();if(old.kind==='drawer-education')openPanel('education',old.target);if(old.kind==='cabinet')api.cabinet();if(old.kind==='door')api.go(progress>.7?0:1,true);if(old.kind==='lamp'&&!pullTriggered)api.pull();}
 }
 if(reduced.matches&&old.kind==='lamp'){pull=pullVelocity=0;}
 pullTriggered=false;$('#object-lamp').classList.remove('pulling');dirty=true;canvas.style.cursor='grab';clearHotspots(!cancel);
}
for(const el of [canvas,...['lamp','profile','drawer','cabinet','cube','robot','orbit','wall-diploma','wall-hackalem','wall-certificate'].map(id=>$('#object-'+id))]){
 el.addEventListener('pointerdown',beginPointer);el.addEventListener('pointermove',movePointer);
 el.addEventListener('pointerup',e=>release(e));el.addEventListener('pointercancel',e=>release(e,true));
 el.addEventListener('lostpointercapture',e=>{if(pointer)release(e,true)});
}
canvas.addEventListener('wheel',e=>{if(!window.sliceUsable){e.preventDefault();return}if(api.hold||pointer?.kind==='lamp'||pointer?.kind==='drawer'||pointer?.kind==='cabinet')return;e.preventDefault();const amount=e.deltaY*(e.deltaMode===1?18:e.deltaMode===2?innerHeight:1);target=clamp(target+clamp(amount,-220,220)*.00105,0,1);if(target>.4)audio.setInside(true);else audio.setInside(false);lookX*=.7;lookY*=.7;dirty=true},{passive:false});
canvas.addEventListener('keydown',e=>{if(!window.sliceUsable)return;if(api.hold||e.ctrlKey||e.metaKey||e.altKey)return;let used=true;if(e.key==='Enter')api.go(progress<.5?1:0,true);else if(e.key==='Home')api.go(0,false);else if(e.key==='ArrowUp')lookY=clamp(lookY+.08,-.45,.5);else if(e.key==='ArrowDown')lookY=clamp(lookY-.08,-.45,.5);else if(e.key==='ArrowLeft')lookX=clamp(lookX-.12,-1.2,1.2);else if(e.key==='ArrowRight')lookX=clamp(lookX+.12,-1.2,1.2);else if(e.key.toLowerCase()==='w')moveZ=clamp(moveZ-.12,-.35,.8);else if(e.key.toLowerCase()==='s')moveZ=clamp(moveZ+.12,-.35,.8);else if(e.key.toLowerCase()==='a')moveX=clamp(moveX-.12,-.55,.65);else if(e.key.toLowerCase()==='d')moveX=clamp(moveX+.12,-.55,.65);else used=false;if(used){e.preventDefault();dirty=true}});
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();window.sliceFail()});
function frame(time){const dt=Math.min((time-last)/1000,.04);last=time;cameraDelta=dt;requestAnimationFrame(frame);frameCount++;if(document.hidden||captureFrozen||window.sliceFatal)return;
 if(world.preparingGPU)return;
 if(lastReduced!==reduced.matches){lastReduced=reduced.matches;weatherText();dirty=true}
 const manipulating=!!pointer&&['drawer','lamp','profile','cabinet','cube','robot','orbit','wall-diploma','wall-hackalem','wall-certificate'].includes(pointer.kind);
 const allowedTarget=!world.studioReady?0:target>progress&&world.door.rotation.y<doorPassAngle?Math.min(target,doorStopProgress):target;
 let moving=(!api.hold&&Math.abs(progress-allowedTarget)>.0001)||Math.abs(brightness-(light?1:0))>.0001||Math.abs(folder-folderTarget)>.0001||Math.abs(drawer-drawerTarget)>.0001||Math.abs(cabinet-cabinetTarget)>.0001||Math.abs(cabinetVelocity)>.0001||pull>.0001||Math.abs(pullVelocity)>.0001||(!api.hold&&Math.abs(world.door.rotation.y-(doorNear?doorOpenAngle:.04))>.0001);
 if(!api.hold&&!preExit&&!manipulating){const allowed=allowedTarget,next=T.MathUtils.damp(progress,allowed,6.5,dt);progress=reduced.matches?allowed:progress+clamp(next-progress,-.02,.02);if(Math.abs(progress-allowed)<.0001)progress=allowed}
 brightness=T.MathUtils.damp(brightness,light?1:0,10,dt);folder=T.MathUtils.damp(folder,folderTarget,reduced.matches?30:10,dt);
 if(pointer?.kind!=='lamp'){pullVelocity+=(-pull*180-pullVelocity*22)*dt;pull=clamp(pull+pullVelocity*dt,0,.12);if(pull<.0001&&Math.abs(pullVelocity)<.002){pull=pullVelocity=0}}
 drawer=reduced.matches?drawerTarget:T.MathUtils.damp(drawer,drawerTarget,14,dt);if(Math.abs(drawer-drawerTarget)<.0001)drawer=drawerTarget;world.setDrawer(drawer);if(reduced.matches){cabinet=cabinetTarget;cabinetVelocity=0}else{const x=cabinet-cabinetTarget,c=cabinetVelocity+6*x,e=Math.exp(-6*dt);cabinet=cabinetTarget+(x+c*dt)*e;cabinetVelocity=(cabinetVelocity-6*c*dt)*e;if(cabinet<0||cabinet>1){cabinet=clamp(cabinet,0,1);cabinetVelocity=0}if(Math.abs(cabinet-cabinetTarget)<.0001&&Math.abs(cabinetVelocity)<.0001){cabinet=cabinetTarget;cabinetVelocity=0}}world.setCabinet(cabinet);
 world.cordLine.scale.y=1+pull/.4;world.cordLine.position.y=-(.4+pull)/2;world.cordGrip.position.y=-.434-pull;world.cord.rotation.z=reduced.matches?0:pullVelocity*.025;world.cover.rotation.z=folder*1.95;world.taskLight.intensity=14*brightness;if(world.lightSurface){const mats=Array.isArray(world.lightSurface.material)?world.lightSurface.material:[world.lightSurface.material];for(const m of mats)if(m.emissive)m.emissiveIntensity=brightness*1.2}
 const weatherMoving=world.exterior?.weather?.animate(dt,camera,reduced.matches||rainPaused||api.hold);
 // Rain changes shader time only. Retain the last settled camera, billboard
 // transforms and shadow maps until input, motion, resize or asset changes.
 const sceneChanged=dirty||moving||(!api.hold&&cameraSettling>0);
 if(sceneChanged||weatherMoving){
  if(sceneChanged){if(dirty)cameraSettling=90;else if(!api.hold&&cameraSettling>0)cameraSettling--;if(manipulating||(api.hold&&cameraStarted))updateActions();else updateCamera();world.daylight.update();world.exterior?.update?.(camera)}
  // GPU preparation still renders its own camera variants with automatic shadows.
  renderer.shadowMap.autoUpdate=!world.studioReady;renderer.shadowMap.needsUpdate=sceneChanged;
  if(sceneChanged)shadowUpdates++;else cachedShadowFrames++;
  scene.updateMatrixWorld();renderer.render(scene,camera);renderCount++;if(renderCount===1){firstFrameAt=performance.now();world.allowAssembly()}dirty=false;
 }
}
window.__SLICE__={geometry:()=>world.geometryReport(),inspect:()=>({firstFrameAt,fullSceneAt,shadowUpdates,cachedShadowFrames,cabinetVelocity,doorNear,doorStopProgress,doorOpenAngle,doorPassAngle,window:world.inspectWindow(),lighting:world.inspectLighting(),showcase:world.inspectProject(),weather:{...world.exterior?.weather?.inspect(),paused:rainPaused,reduced:reduced.matches},stream:world.inspectStream(),cameraClear:world.clearance(camera.position),viewName,progress,target,doorAngle:world.door.rotation.y,camera:camera.position.toArray(),look:[lookX,lookY],move:[moveX,moveZ],lamp:light,brightness,pull,folder,drawer,collection:world.inspectCollection(),furniture:world.inspectFurniture(),held:api.hold,pointerKind:pointer?.kind||null,pullThreshold:.065,pullLimit:.12,office:world.office,assets:world.assetInfo,drawCalls:renderer.info.render.calls,textureCount:renderer.info.memory.textures,triangles:renderer.info.render.triangles,frames:frameCount,renders:renderCount,audio:audio.inspect()}),cabinetGrip:()=>{const g=world.cabinetGrip();if(!g)return null;const project=p=>{const v=new T.Vector3().fromArray(p).project(camera);return{x:(v.x+1)*innerWidth/2,y:(1-v.y)*innerHeight/2}};return{...g,current:project(g.current),samples:g.samples.map(s=>({...s,...project(s.position)}))}},drawerGrip:()=>{if(!world.drawerPull)return null;const p=new T.Box3().setFromObject(world.drawerPull).getCenter(new T.Vector3()),travel=world.inspectFurniture().drawerTravel,project=p=>{p.project(camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}};return{current:project(p.clone()),closed:project(p.clone().add(new T.Vector3(0,0,-travel*drawer))),open:project(p.clone().add(new T.Vector3(0,0,travel*(1-drawer))))}},points:()=>Object.fromEntries(world.objects.map(o=>{const p=new T.Box3().setFromObject(o).getCenter(new T.Vector3()).project(camera);return[o.userData.action,{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}]})),cord:()=>{const project=o=>{const p=o.getWorldPosition(new T.Vector3()).project(camera);return{x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2}};return{top:project(world.cordRoot),grip:project(world.cordGrip)}},get ready(){return world.studioReady&&window.sliceUsable}};
// Explicit review-only capture mode freezes scene state, not just CSS animation.
if(captureMode)window.__SLICE__.capture=async({view='corridor',yaw=0,pitch=0,x=0,z=0,assetsReady=true,baked=true,lampOn=true,referenceFraming=false,drawerOpen=false,cabinetOpen=false,drawerAmount=null,cabinetAmount=null,entranceAngle=null,cameraPose=null}={})=>{
 if(view==='education'){view='drawer';drawerOpen=true}
 if(assetsReady){world.prepare(true);const start=performance.now();while(!world.studioReady){if(performance.now()-start>90000)throw Error('Capture assets failed or timed out');await new Promise(r=>setTimeout(r,50))}}
 captureReferenceFraming=referenceFraming;captureFrozen=true;doorNear=false;api.hold=false;viewName=view==='corridor'?'desk':view;progress=target=view==='corridor'?0:1;lookX=clamp(yaw,-1.2,1.2);lookY=clamp(pitch,-.45,.5);moveX=clamp(x,-.55,.65);moveZ=clamp(z,-.35,.8);folder=folderTarget=0;pull=pullVelocity=0;light=lampOn;brightness=lampOn?1:0;pointer=null;preExit=false;cameraStarted=false;
 world.cordLine.scale.y=1;world.cordLine.position.y=-.2;world.cordGrip.position.y=-.434;world.cord.rotation.z=world.cover.rotation.z=0;world.taskLight.intensity=lampOn?14:0;world.windowBake(baked);if(world.lightSurface)for(const m of Array.isArray(world.lightSurface.material)?world.lightSurface.material:[world.lightSurface.material])if(m.emissive)m.emissiveIntensity=brightness*1.2;
 cabinetVelocity=0;cabinet=cabinetTarget=typeof cabinetAmount==='number'?clamp(cabinetAmount,0,1):cabinetOpen?1:0;world.setCabinet(cabinet);drawer=drawerTarget=typeof drawerAmount==='number'?clamp(drawerAmount,0,1):drawerOpen?1:0;world.setDrawer(drawer);
 cordGuideShown=true;$('#object-lamp').classList.remove('cord-guide-visible');clearHotspots();updateCamera();if(typeof entranceAngle==='number')world.door.rotation.y=clamp(entranceAngle,.04,doorOpenAngle);if(cameraPose){const position=new T.Vector3(...cameraPose.position),target=new T.Vector3(...cameraPose.target);if(![...position.toArray(),...target.toArray()].every(Number.isFinite)||!world.clearance(position))throw Error('Review camera must remain clear of physical architecture');camera.position.copy(position);camera.lookAt(target);camera.updateMatrixWorld(true)}world.daylight.update();world.exterior?.update?.(camera);scene.updateMatrixWorld(true);updateActions();renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
 const maps=[];scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap'])if(m[key])maps.push({material:m.name,type:key,colorSpace:m[key].colorSpace,url:m[key].image?.src||'generated',repeat:m[key].repeat.toArray()})});
 return{window:world.inspectWindow(),view,yaw:lookX,pitch:lookY,move:[moveX,moveZ],time:0,seed:4240,frozen:captureFrozen,camera:camera.position.toArray(),matrix:camera.matrixWorld.elements,projection:camera.projectionMatrix.elements,assets:world.inspectStream(),output:renderer.outputColorSpace,toneMapping:renderer.toneMapping,maps,drawCalls:renderer.info.render.calls,textureCount:renderer.info.memory.textures,triangles:renderer.info.render.triangles};
};
// Compile the final entry material configuration before its first use.
if(renderer.compileAsync)await renderer.compileAsync(scene,camera);
last=performance.now();
requestAnimationFrame(frame);
