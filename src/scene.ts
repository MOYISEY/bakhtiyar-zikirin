import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { showSceneFallback } from './fallback';

export function initScene() {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
  const viewport = document.querySelector<HTMLElement>('#scene-viewport')!;
  const status = document.querySelector<HTMLElement>('#scene-status')!;
  const toggle = document.querySelector<HTMLButtonElement>('#motion-toggle')!;
  const modeButtons = document.querySelectorAll<HTMLButtonElement>('[data-mode]');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch {
    showSceneFallback();
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 760 ? 1.4 : 1.7));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 40);
  camera.position.set(0, .3, 8.2);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .03);
  scene.environment = environment.texture;
  room.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xf4ffe4, 0x141814, 2));
  const key = new THREE.DirectionalLight(0xf9fff3, 5); key.position.set(3, 4, 3); scene.add(key);
  const acidLight = new THREE.PointLight(0xd9ff43, 30, 10); acidLight.position.set(-3, 1, 2); scene.add(acidLight);
  const back = new THREE.DirectionalLight(0x95acc8, 3); back.position.set(2, -1, -3); scene.add(back);
  const object = new THREE.Group(); object.rotation.set(.25, -.35, -.25); scene.add(object);
  const metal = new THREE.MeshStandardMaterial({ color: 0xa6afa0, metalness: 1, roughness: .23 });
  const acid = new THREE.MeshStandardMaterial({ color: 0xd9ff43, metalness: .5, roughness: .23 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x272e23, metalness: .95, roughness: .28 });
  const parts: { mesh: THREE.Mesh; origin: THREE.Vector3; destination: THREE.Vector3 }[] = [];
  const arcGeometry = new THREE.TorusGeometry(1.45, .255, 24, 96, Math.PI * 1.64);
  for (let i = 0; i < 3; i++) {
    const mesh = new THREE.Mesh(arcGeometry, i === 1 ? acid : metal);
    mesh.rotation.set(i === 0 ? .35 : i === 1 ? 1.25 : -.95, i * 1.05, i * 2.1);
    object.add(mesh);
    parts.push({ mesh, origin: mesh.position.clone(), destination: new THREE.Vector3(Math.cos(i*2.1)*.85, Math.sin(i*2.1)*.65, (i-1)*.6) });
  }
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(.64, 1), dark); core.rotation.set(.4, .3, .1); object.add(core);
  const innerLines = new THREE.LineSegments(new THREE.EdgesGeometry(core.geometry), new THREE.LineBasicMaterial({ color: 0xd9ff43, transparent: true, opacity: .45 })); core.add(innerLines);
  const satellites = new THREE.Group(); object.add(satellites);
  for (let i=0;i<7;i++) {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(i===0?.15:.055,12,12), i%2 ? acid : metal);
    sphere.position.set(Math.cos(i*1.9)*2.15, Math.sin(i*1.9)*1.65, Math.sin(i*2.3)*.85); satellites.add(sphere);
  }
  const orbit = new THREE.Mesh(new THREE.TorusGeometry(2.18,.007,6,120), new THREE.MeshBasicMaterial({ color:0xa8b59b,transparent:true,opacity:.22 })); orbit.rotation.set(1.2,.2,.35); object.add(orbit);
  const controls = new OrbitControls(camera, canvas);
  controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = false;
  controls.rotateSpeed = .65;
  // One finger keeps the page scrollable on touch screens. Mouse drag and keyboard rotate the scene.
  controls.touches.ONE = null as unknown as THREE.TOUCH;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  // OrbitControls sets inline touch-action:none; restore native vertical scrolling.
  canvas.style.touchAction = 'pan-y';
  let paused = preference.matches;
  let visible = true;
  let exploded = false;
  let dirty = true;
  let frame = 0;
  let previous = 0;
  let disposed = false;
  let suspended = false;
  const handlers = new AbortController();
  function setMotionUI() {
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Включить движение' : 'Остановить движение');
    toggle.innerHTML = `<span aria-hidden="true">${paused ? '▷' : 'Ⅱ'}</span>`;
  }
  setMotionUI();
  function requestFrame() { dirty = true; if (!frame && visible && !document.hidden && !disposed && !suspended) frame = requestAnimationFrame(draw); }
  function draw(time: number) {
    frame = 0;
    if (!visible || document.hidden || disposed || suspended) return;
    const dt = previous ? Math.min((time-previous)/1000,.04) : 0; previous = time;
    let movingParts = false;
    parts.forEach(part => {
      const target = exploded ? part.destination : part.origin;
      if (part.mesh.position.distanceToSquared(target) > .00001) {
        if (preference.matches || paused) part.mesh.position.copy(target);
        else part.mesh.position.lerp(target, .085);
        movingParts = true;
      }
    });
    if (!paused) { object.rotation.y += dt * .12; satellites.rotation.z -= dt * .07; dirty = true; }
    if (dirty || movingParts) { renderer.render(scene,camera); dirty = false; }
    if (!paused || movingParts) frame = requestAnimationFrame(draw);
  }
  controls.addEventListener('change',requestFrame);
  toggle.addEventListener('click', () => { paused=!paused; previous=0; setMotionUI(); requestFrame(); }, { signal: handlers.signal });
  preference.addEventListener('change', () => { paused=preference.matches; previous=0; setMotionUI(); requestFrame(); }, { signal: handlers.signal });
  modeButtons.forEach(button => button.addEventListener('click', () => {
    const mode = button.dataset.mode;
    exploded = mode === 'explode';
    metal.wireframe = acid.wireframe = dark.wireframe = mode === 'wire';
    modeButtons.forEach(el => el.setAttribute('aria-pressed', String(el===button)));
    requestFrame();
  }, { signal: handlers.signal }));
  canvas.addEventListener('keydown', event => {
    const changes:Record<string,[number,number]> = { ArrowLeft:[0,-.14],ArrowRight:[0,.14],ArrowUp:[-.14,0],ArrowDown:[.14,0] };
    if(event.key==='Home'){ event.preventDefault();object.rotation.set(.25,-.35,-.25);controls.reset();requestFrame(); }
    else if(changes[event.key]){event.preventDefault();object.rotation.x+=changes[event.key][0];object.rotation.y+=changes[event.key][1];requestFrame();}
  }, { signal: handlers.signal });
  const resize = new ResizeObserver(() => {
    const {width,height}=viewport.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();requestFrame();
  }); resize.observe(viewport);
  const intersection = new IntersectionObserver(entries => { visible=entries[0].isIntersecting;previous=0;if(visible)requestFrame();else if(frame){cancelAnimationFrame(frame);frame=0;} },{rootMargin:'100px'}); intersection.observe(viewport);
  document.addEventListener('visibilitychange',()=>{previous=0;if(!document.hidden)requestFrame();else if(frame){cancelAnimationFrame(frame);frame=0;}}, { signal: handlers.signal });
  function disposeScene() {
    if(disposed) return;
    disposed=true;if(frame)cancelAnimationFrame(frame);frame=0;
    resize.disconnect();intersection.disconnect();controls.removeEventListener('change',requestFrame);controls.dispose();handlers.abort();
    const geometries=new Set<THREE.BufferGeometry>();
    const materials=new Set<THREE.Material>();
    scene.traverse(node=>{
      if(node instanceof THREE.Mesh || node instanceof THREE.LineSegments){
        geometries.add(node.geometry);
        (Array.isArray(node.material)?node.material:[node.material]).forEach(material=>materials.add(material));
      }
    });
    geometries.forEach(geometry=>geometry.dispose());materials.forEach(material=>material.dispose());
    environment.dispose();renderer.dispose();
  }
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();disposeScene();showSceneFallback();
  }, { signal: handlers.signal });
  window.addEventListener('pagehide',event=>{
    if(event.persisted){suspended=true;if(frame)cancelAnimationFrame(frame);frame=0;}
    else disposeScene();
  }, { signal: handlers.signal });
  window.addEventListener('pageshow',event=>{if(event.persisted){suspended=false;previous=0;requestFrame();}}, { signal: handlers.signal });
  modeButtons.forEach(button=>{button.disabled=false;});toggle.disabled=false;
  status.textContent='Этюд № 01 / интерактивный 3D';
  viewport.classList.add('is-ready');requestFrame();
}
