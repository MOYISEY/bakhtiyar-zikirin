import { showSceneFallback } from './fallback';
import { t } from './preferences';
export function initSceneControls() {
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

}
