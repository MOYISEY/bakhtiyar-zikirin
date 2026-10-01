import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { showSceneFallback } from './fallback';
import { darkTheme, t } from './preferences';

type Layer = 'interface' | 'logic' | 'data';
type View = 'solid' | 'explode' | 'wire';
const layerY: Record<Layer, number> = { interface: 1.22, logic: 0, data: -1.22 };

export function initScene() {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
  const viewport = document.querySelector<HTMLElement>('#scene-viewport')!;
  const system = document.querySelector<HTMLElement>('#system')!;
  const toggle = document.querySelector<HTMLButtonElement>('#motion-toggle')!;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer: THREE.WebGLRenderer;
  try {
    // Rendering stops when paused. Keep the last frame visible without a permanent RAF loop.
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  } catch { showSceneFallback(); return; }
  const resources = new Set<{ dispose(): void }>();
  const own = <T extends { dispose(): void }>(resource: T): T => { resources.add(resource); return resource; };
  let released = false;
  let stopPendingWork = () => {};
  function release() {
    if (released) return;
    released = true;
    resources.forEach(resource => { try { resource.dispose(); } catch { /* Continue releasing remaining resources. */ } });
    resources.clear(); renderer.dispose();
  }
  try {
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 760 ? 1.35 : 1.6));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(33, 1, .1, 60);
  const bounds = viewport.getBoundingClientRect();
  camera.position.set(...(bounds.width < 600 ? [7.8, 6.7, 9.2] : [6.4, 5.3, 7.4]) as [number, number, number]);
  const pmrem = own(new THREE.PMREMGenerator(renderer));
  const room = own(new RoomEnvironment());
  const environment = own(pmrem.fromScene(room, 0, .1, 100, { size: innerWidth < 760 ? 64 : 128 }));
  scene.environment = environment.texture;
  room.dispose(); pmrem.dispose(); resources.delete(room); resources.delete(pmrem);
  scene.add(new THREE.HemisphereLight(0xfffbed, 0x79847a, 2.3));
  const key = new THREE.DirectionalLight(0xfff8e7, 4.2); key.position.set(3, 6, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xd0e7e0, 3.4); rim.position.set(-4, 2, -3); scene.add(rim);
  const object = new THREE.Group(); object.rotation.y = -.28; scene.add(object);
  const metal = own(new THREE.MeshStandardMaterial({ color: 0x9daaa2, metalness: .85, roughness: .31 }));
  const copper = own(new THREE.MeshStandardMaterial({ color: 0xbb5135, metalness: .65, roughness: .28 }));
  const rounded = new THREE.Shape();
  const w = 4.6, h = 2.8, r = .22;
  rounded.moveTo(-w/2+r, -h/2); rounded.lineTo(w/2-r, -h/2);
  rounded.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r); rounded.lineTo(w/2,h/2-r);
  rounded.quadraticCurveTo(w/2,h/2,w/2-r,h/2); rounded.lineTo(-w/2+r,h/2);
  rounded.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r); rounded.lineTo(-w/2,-h/2+r);
  rounded.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
  const boardGeometry = own(new THREE.ExtrudeGeometry(rounded, { depth: .07, bevelEnabled: true, bevelThickness: .025, bevelSize: .025, bevelSegments: 2, steps: 1 }));
  boardGeometry.rotateX(-Math.PI/2);
  const screwGeometry = own(new THREE.CylinderGeometry(.055,.055,.065,12));
  const layers = {} as Record<Layer, { group: THREE.Group; edge: THREE.LineSegments; material: THREE.MeshStandardMaterial }>;
  const repaintSurfaces: (() => void)[] = [];

  function addSurface(group: THREE.Group, layer: Layer) {
    const drawing = document.createElement('canvas'); drawing.width = 1024; drawing.height = 640;
    const ctx = drawing.getContext('2d')!;
    function paint() {
    const dark = darkTheme();
    ctx.fillStyle = layer === 'interface' ? (dark ? '#20382e' : '#fffef8') : layer === 'logic' ? (dark ? '#264d41' : '#23615b') : (dark ? '#38553e' : '#bdc8b4');
    ctx.fillRect(0,0,1024,640);
    ctx.strokeStyle = layer === 'logic' ? '#518779' : (dark ? '#58745f' : '#a3b09f'); ctx.lineWidth=1;
    for(let x=32;x<1024;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,640);ctx.stroke();}
    for(let y=32;y<640;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1024,y);ctx.stroke();}
    ctx.font='24px monospace'; ctx.fillStyle=layer==='logic'||dark?'#f3f0e8':'#172223';
    ctx.fillText(t(layer==='interface'?'s019':layer==='logic'?'s018':'s017'),40,52);
    if(layer==='interface'){
      ctx.fillStyle=dark?'#172c23':'#fffef8';ctx.fillRect(90,96,844,476);ctx.strokeStyle='#9dab99';ctx.strokeRect(90,96,844,476);
      ctx.fillStyle=dark?'#35523e':'#e7ebdf';ctx.fillRect(90,96,844,42);
      [0,1,2].forEach(i=>{ctx.fillStyle=i===0?'#da4d30':'#afbba9';ctx.beginPath();ctx.arc(112+i*22,117,5,0,Math.PI*2);ctx.fill();});
      ctx.fillStyle=dark?'#d5e4cb':'#172223';ctx.fillRect(130,194,430,24);ctx.fillRect(130,236,340,24);
      ctx.fillStyle='#9dab99';ctx.fillRect(130,287,370,7);ctx.fillRect(130,305,285,7);
      ctx.fillStyle='#da4d30';ctx.beginPath();ctx.arc(763,252,65,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#23615b';ctx.fillRect(130,355,200,54);ctx.fillStyle='#fffef8';ctx.font='23px monospace';ctx.fillText(t('surface.click'),145,391);
      for(let i=0;i<3;i++){ctx.fillStyle=dark?'#35523e':'#e7ebdf';ctx.fillRect(130+i*260,454,230,76);ctx.fillStyle='#a8b7a0';ctx.fillRect(150+i*260,474,100,6);}
    } else if(layer==='logic') {
      ctx.strokeStyle='#b8ceb5';ctx.lineWidth=4;
      [[100,166,390,166],[635,166,900,166],[100,460,390,460],[635,460,900,460]].forEach(v=>{ctx.beginPath();ctx.moveTo(v[0],v[1]);ctx.lineTo(v[2],v[3]);ctx.stroke();});
      ctx.font='28px monospace';ctx.fillStyle='#f3f0e8';ctx.fillText('API',90,138);ctx.fillText(t('surface.state'),700,138);ctx.fillText(t('surface.rules'),90,504);ctx.fillText(t('surface.response'),670,504);
    } else {
      ctx.strokeStyle='#637e65';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(170,330);ctx.lineTo(854,330);ctx.stroke();
      ctx.font='24px monospace';ctx.fillStyle=dark?'#d9e7ce':'#23615b';['surface.entities','surface.relations','surface.storage'].forEach((v,i)=>ctx.fillText(t(v),80+i*325,534));
    }
    }
    paint();
    const texture = own(new THREE.CanvasTexture(drawing)); texture.colorSpace=THREE.SRGBColorSpace; texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    repaintSurfaces.push(() => { paint(); texture.needsUpdate = true; });
    const surface = new THREE.Mesh(own(new THREE.PlaneGeometry(4.35,2.6)),own(new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide})));
    surface.rotation.x=-Math.PI/2; surface.position.y=.101;group.add(surface);
  }
  (['data','logic','interface'] as Layer[]).forEach(layer=>{
    const group=new THREE.Group();group.position.y=layerY[layer];object.add(group);
    const material=own(new THREE.MeshStandardMaterial({color:layer==='interface'?0xe7ecdf:layer==='logic'?0x23615b:0xa6b09f,metalness:.18,roughness:.42}));
    group.add(new THREE.Mesh(boardGeometry,material));
    const edge=new THREE.LineSegments(own(new THREE.EdgesGeometry(boardGeometry,35)),own(new THREE.LineBasicMaterial({color:0x172223,transparent:true,opacity:.28})));group.add(edge);
    addSurface(group,layer);
    [[-2.05,-1.16],[2.05,-1.16],[-2.05,1.16],[2.05,1.16]].forEach(([x,z])=>{const screw=new THREE.Mesh(screwGeometry,metal);screw.position.set(x,.13,z);group.add(screw);});
    layers[layer]={group,edge,material};
  });
  const processor=new THREE.Mesh(own(new THREE.BoxGeometry(1.08,.25,.9)),own(new THREE.MeshStandardMaterial({color:0xe2e7d5,metalness:.35,roughness:.36})));processor.position.y=.23;layers.logic.group.add(processor);
  const chipMark=new THREE.Mesh(own(new THREE.BoxGeometry(.56,.014,.07)),copper);chipMark.position.set(0,.365,0);layers.logic.group.add(chipMark);
  const pinGeometry=own(new THREE.BoxGeometry(.12,.055,.075));
  for(let i=0;i<7;i++) for(const side of [-1,1]){const pin=new THREE.Mesh(pinGeometry,metal);pin.position.set(side*.595,.22,(i-3)*.105);layers.logic.group.add(pin);}
  const diskGeometry=own(new THREE.CylinderGeometry(.31,.31,.12,32));
  const databaseMaterial=own(new THREE.MeshStandardMaterial({color:0x23615b,metalness:.48,roughness:.3}));
  for(let i=0;i<3;i++)for(let j=0;j<3;j++){const disk=new THREE.Mesh(diskGeometry,databaseMaterial);disk.position.set((i-1)*1.4,.2+j*.17,0);layers.data.group.add(disk);}
  const rods: THREE.Mesh[]=[];
  const rodGeometry=own(new THREE.CylinderGeometry(.024,.024,1,8));
  [[-2,-1],[2,-1],[-2,1],[2,1]].forEach(([x,z])=>{const rod=new THREE.Mesh(rodGeometry,metal);rod.position.set(x,0,z);object.add(rod);rods.push(rod);});
  const pulse=new THREE.Mesh(own(new THREE.SphereGeometry(.11,16,12)),own(new THREE.MeshBasicMaterial({color:0xda4d30})));pulse.visible=false;object.add(pulse);
  const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
  const shadowCtx=shadowCanvas.getContext('2d')!;const gradient=shadowCtx.createRadialGradient(64,64,4,64,64,64);gradient.addColorStop(0,'rgba(23,34,35,.2)');gradient.addColorStop(1,'rgba(23,34,35,0)');shadowCtx.fillStyle=gradient;shadowCtx.fillRect(0,0,128,128);
  const shadowTexture=own(new THREE.CanvasTexture(shadowCanvas));
  const shadow=new THREE.Mesh(own(new THREE.PlaneGeometry(7,5)),own(new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false})));shadow.rotation.x=-Math.PI/2;shadow.position.y=-1.54;scene.add(shadow);

  const controls=own(new OrbitControls(camera,canvas));controls.target.set(0,.15,0);controls.update();controls.saveState();
  controls.enableZoom=false;controls.enablePan=false;controls.enableDamping=false;controls.rotateSpeed=.65;
  controls.touches.ONE=null as unknown as THREE.TOUCH;controls.touches.TWO=THREE.TOUCH.DOLLY_ROTATE;canvas.style.touchAction='pan-y';
  let view=(system.dataset.view??'explode') as View;
  let activeLayer=(system.dataset.layer??'interface') as Layer;
  let signalLayer: Layer|null=null;
  let paused=preference.matches,visible=true,dirty=true,disposed=false,suspended=false;
  let frame=0,previous=0,elapsed=0;
  const handlers=new AbortController();
  stopPendingWork=()=>{disposed=true;if(frame)cancelAnimationFrame(frame);frame=0;handlers.abort();};
  function motionUI(){toggle.setAttribute('aria-pressed',String(paused));toggle.setAttribute('aria-label',t(paused?'scene.resume':'s200'));toggle.textContent=paused?'▷':'Ⅱ';}
  function requestFrame(){dirty=true;if(!frame&&visible&&!document.hidden&&!disposed&&!suspended)frame=requestAnimationFrame(draw);}
  function appearance(){
    object.traverse(node=>{if(node instanceof THREE.Mesh&&node!==pulse)(Array.isArray(node.material)?node.material:[node.material]).forEach(material=>{if('wireframe' in material)(material as THREE.MeshBasicMaterial).wireframe=view==='wire';});});
    (Object.keys(layers) as Layer[]).forEach(layer=>{const selected=layer===activeLayer;const line=layers[layer].edge.material as THREE.LineBasicMaterial;line.color.set(selected?(darkTheme()?0xff9d81:0xda4d30):(darkTheme()?0xafc4b4:0x172223));line.opacity=selected?.8:.28;layers[layer].material.emissive.set(selected?0x5f2718:0x000000);layers[layer].material.emissiveIntensity=selected?.045:0;});
    requestFrame();
  }
  function draw(time:number){
    frame=0;if(!visible||document.hidden||disposed||suspended)return;
    const dt=previous?Math.min((time-previous)/1000,.04):0;previous=time;
    let moving=false;
    (Object.keys(layers) as Layer[]).forEach(layer=>{const group=layers[layer].group;const target=view==='solid'?layerY[layer]*.2:layerY[layer];if(Math.abs(group.position.y-target)>.001){group.position.y=paused||preference.matches?target:THREE.MathUtils.lerp(group.position.y,target,.11);moving=true;}});
    const bottom=layers.data.group.position.y,top=layers.interface.group.position.y;
    rods.forEach(rod=>{rod.position.y=(bottom+top)/2+.04;rod.scale.y=top-bottom+.1;});
    pulse.visible=!!signalLayer;
    if(signalLayer){const target=new THREE.Vector3(-1.25,layers[signalLayer].group.position.y+.43,.45);if(pulse.position.distanceToSquared(target)>.0001){if(paused||preference.matches)pulse.position.copy(target);else pulse.position.lerp(target,.14);moving=true;}}
    if(!paused){elapsed+=dt;object.rotation.y+=dt*.028;object.position.y=Math.sin(elapsed*.7)*.025;dirty=true;}
    if(dirty||moving){renderer.render(scene,camera);dirty=false;}
    if(!paused||moving)frame=requestAnimationFrame(draw);
  }
  function reset(){controls.reset();object.rotation.set(0,-.28,0);object.position.set(0,0,0);elapsed=previous=0;requestFrame();}
  controls.addEventListener('change',requestFrame);
  toggle.addEventListener('click',()=>{paused=!paused;previous=0;motionUI();requestFrame();},{signal:handlers.signal});
  preference.addEventListener('change',()=>{paused=preference.matches;previous=0;motionUI();requestFrame();},{signal:handlers.signal});
  document.querySelector('#scene-reset')!.addEventListener('click',reset,{signal:handlers.signal});
  window.addEventListener('portfolio:mode',event=>{view=(event as CustomEvent<View>).detail;appearance();},{signal:handlers.signal});
  window.addEventListener('portfolio:layer',event=>{activeLayer=(event as CustomEvent<Layer>).detail;appearance();},{signal:handlers.signal});
  window.addEventListener('portfolio:signal',event=>{signalLayer=(event as CustomEvent<Layer|null>).detail;requestFrame();},{signal:handlers.signal});
  window.addEventListener('portfolio:preferences',()=>{repaintSurfaces.forEach(repaint=>repaint());motionUI();appearance();},{signal:handlers.signal});
  canvas.addEventListener('keydown',event=>{const changes:Record<string,[number,number]>={ArrowLeft:[0,-.14],ArrowRight:[0,.14],ArrowUp:[-.14,0],ArrowDown:[.14,0]};if(event.key==='Home'){event.preventDefault();reset();}else if(changes[event.key]){event.preventDefault();object.rotation.x+=changes[event.key][0];object.rotation.y+=changes[event.key][1];requestFrame();}},{signal:handlers.signal});
  function size(){const {width,height}=viewport.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();requestFrame();}
  const resize=new ResizeObserver(size);resources.add({dispose:()=>resize.disconnect()});resize.observe(viewport);size();
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;previous=0;if(visible)requestFrame();else if(frame){cancelAnimationFrame(frame);frame=0;}},{rootMargin:'100px'});intersection.observe(viewport);
  resources.add({dispose:()=>intersection.disconnect()});
  document.addEventListener('visibilitychange',()=>{previous=0;if(!document.hidden)requestFrame();else if(frame){cancelAnimationFrame(frame);frame=0;}},{signal:handlers.signal});
  function dispose(){
    if(disposed)return;disposed=true;if(frame)cancelAnimationFrame(frame);frame=0;
    resize.disconnect();intersection.disconnect();controls.removeEventListener('change',requestFrame);controls.dispose();handlers.abort();
    resources.delete(controls); release();
  }
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();dispose();showSceneFallback();},{signal:handlers.signal});
  window.addEventListener('pagehide',event=>{if(event.persisted){suspended=true;if(frame)cancelAnimationFrame(frame);frame=0;}else dispose();},{signal:handlers.signal});
  window.addEventListener('pageshow',event=>{if(event.persisted){suspended=false;previous=0;requestFrame();}},{signal:handlers.signal});
  motionUI();appearance();canvas.hidden=false;canvas.tabIndex=0;
  document.querySelectorAll<HTMLElement>('[data-webgl-only]').forEach(element=>{element.hidden=false;});
  document.querySelector('#scene-status')!.setAttribute('data-scene-state','ready');document.querySelector('#scene-status')!.textContent=t('scene.ready');viewport.classList.add('is-ready');requestFrame();
  } catch { stopPendingWork(); release(); showSceneFallback(); }
}
