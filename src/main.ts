import './style.css';
import './hierarchy.css';
import './restoration.css';
import { showSceneFallback } from './fallback';
import { initPreferences, t } from './preferences';
import { initRowlineSample } from './rowline-sample';

initPreferences();
initRowlineSample();

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const system = document.querySelector<HTMLElement>('#system')!;
const layerDescription = (layer: string) => t(({ interface: 's028', logic: 'layer.logic', data: 'layer.data' } as Record<string, string>)[layer]);
const modeButtons = document.querySelectorAll<HTMLButtonElement>('[data-mode]');
modeButtons.forEach(button => button.addEventListener('click', () => {
  system.dataset.view = button.dataset.mode;
  modeButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  window.dispatchEvent(new CustomEvent('portfolio:mode', { detail: button.dataset.mode }));
}));
const layerButtons = document.querySelectorAll<HTMLButtonElement>('button[data-layer]');
layerButtons.forEach(button => button.addEventListener('click', () => {
  const layer = button.dataset.layer!;
  system.dataset.layer = layer;
  layerButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  document.querySelector('#layer-description')!.textContent = layerDescription(layer);
  window.dispatchEvent(new CustomEvent('portfolio:layer', { detail: layer }));
}));

const signalButton = document.querySelector<HTMLButtonElement>('#signal-start')!;
const signalStatus = document.querySelector('#signal-status')!;
let signalTimer: ReturnType<typeof setTimeout> | undefined;
const signalStages = ['interface', 'logic', 'data', 'interface'];
let lastSignalStage: number | undefined;
function endSignal() {
  if (signalTimer) clearTimeout(signalTimer);
  signalTimer = undefined;
  delete system.dataset.signal;
  signalButton.disabled = false;
  window.dispatchEvent(new CustomEvent('portfolio:signal', { detail: null }));
}
signalButton.addEventListener('click', () => {
  endSignal();
  signalButton.disabled = true;
  let index = 0;
  function stage() {
    const current = signalStages[index];
    if (!current) { endSignal(); return; }
    system.dataset.signal = current;
    lastSignalStage = index;
    signalStatus.textContent = t('signal.' + index);
    window.dispatchEvent(new CustomEvent('portfolio:signal', { detail: current }));
    index++;
    if (reducedMotion.matches) {
      if (index < signalStages.length) stage();
      else endSignal();
    } else signalTimer = setTimeout(stage, 850);
  }
  stage();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) endSignal(); });
window.addEventListener('pagehide', endSignal);

const navLinks = document.querySelectorAll<HTMLAnchorElement>('.header nav a');
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) {
      navLinks.forEach(link => { if (link.hash === '#' + entry.target.id) link.removeAttribute('aria-current'); });
      return;
    }
    navLinks.forEach(link => {
      if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  });
}, { rootMargin: '-15% 0px -60% 0px' });
['work', 'experience', 'approach', 'contact'].forEach(id => sectionObserver.observe(document.getElementById(id)!));

function updateMotionPreference() {
  document.documentElement.classList.toggle('reduced-motion', reducedMotion.matches);
  if (reducedMotion.matches) endSignal();
}
updateMotionPreference();
reducedMotion.addEventListener('change', updateMotionPreference);
window.addEventListener('portfolio:preferences', () => {
  document.querySelector('#layer-description')!.textContent = layerDescription(system.dataset.layer ?? 'interface');
  if (lastSignalStage !== undefined) signalStatus.textContent = t('signal.' + lastSignalStage);
  const status = document.querySelector<HTMLElement>('#scene-status')!;
  status.textContent = t(status.dataset.sceneState === 'ready' ? 'scene.ready' : status.dataset.sceneState === 'fallback' ? 'scene.fallback' : 's024');
});
document.querySelectorAll<HTMLButtonElement>('[data-js-only]').forEach(button => { button.disabled = false; });

// Restore v9's visible diagram and load its renderer near the viewport.
let sceneRequested = false;
const sceneLoader = new IntersectionObserver(entries => {
  if (entries.some(entry => entry.isIntersecting)) loadScene();
}, { rootMargin: '600px' });
function loadScene() {
  if (sceneRequested) return;
  sceneRequested = true;
  sceneLoader.disconnect();
  import('./scene').then(({ initScene }) => initScene()).catch(showSceneFallback);
}
sceneLoader.observe(system);
system.addEventListener('pointerdown', loadScene, { once: true });
system.addEventListener('focusin', loadScene, { once: true });

document.querySelectorAll<HTMLButtonElement>('[data-close-details]').forEach(button => button.addEventListener('click', () => {
  const details = button.closest('details');
  if (!details) return;
  details.open = false;
  details.querySelector<HTMLElement>(':scope > summary')?.focus();
}));
function revealHash() {
  let id: string;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id);
  if (!target) return;
  for (let ancestor = target.parentElement; ancestor; ancestor = ancestor.parentElement) {
    if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
  }
  if (target instanceof HTMLDetailsElement) target.open = true;
  target.focus({ preventScroll: true });
  requestAnimationFrame(() => target.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' }));
}
window.addEventListener('hashchange', revealHash);
navLinks.forEach(link => link.addEventListener('click', () => {
  if (link.hash === location.hash) revealHash();
}));
if (location.hash) revealHash();
