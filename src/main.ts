import './style.css';
import { showSceneFallback } from './fallback';
import { initPreferences, t } from './preferences';

initPreferences();

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

const briefSteps = () => [
  { label: t('s084'), title: [t('s085'), t('s086')], text: t('s087'), output: t('s089') },
  { label: t('brief.label1'), title: [t('brief.title1a'), t('brief.title1b')], text: t('brief.text1'), output: t('brief.output1') },
  { label: t('brief.label2'), title: [t('brief.title2a'), t('brief.title2b')], text: t('brief.text2'), output: t('brief.output2') },
];
let briefIndex = 0;
const briefButtons = document.querySelectorAll<HTMLButtonElement>('[data-step]');
function renderBrief(index: number) {
  const step = briefSteps()[index];
  if (!step) return;
  briefIndex = index;
  briefButtons.forEach(item => item.setAttribute('aria-pressed', String(Number(item.dataset.step) === index)));
  const content = document.querySelector('#brief-content')!;
  content.querySelector('.brief-label')!.textContent = step.label;
  content.querySelector('h4')!.replaceChildren(document.createTextNode(step.title[0]), document.createElement('br'), document.createTextNode(step.title[1]));
  content.querySelector('p')!.textContent = step.text;
  document.querySelector('#brief-output-text')!.textContent = step.output;
  document.querySelectorAll('.route-node').forEach((node, position) => node.classList.toggle('is-current', position === index));
}
briefButtons.forEach(button => button.addEventListener('click', () => renderBrief(Number(button.dataset.step))));

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
['work', 'experience', 'approach'].forEach(id => sectionObserver.observe(document.getElementById(id)!));

function updateMotionPreference() {
  document.documentElement.classList.toggle('reduced-motion', reducedMotion.matches);
  if (reducedMotion.matches) endSignal();
}
updateMotionPreference();
reducedMotion.addEventListener('change', updateMotionPreference);
window.addEventListener('portfolio:preferences', () => {
  document.querySelector('#layer-description')!.textContent = layerDescription(system.dataset.layer ?? 'interface');
  renderBrief(briefIndex);
  if (lastSignalStage !== undefined) signalStatus.textContent = t('signal.' + lastSignalStage);
  const status = document.querySelector<HTMLElement>('#scene-status')!;
  status.textContent = t(status.dataset.sceneState === 'ready' ? 'scene.ready' : status.dataset.sceneState === 'fallback' ? 'scene.fallback' : 's024');
});
document.querySelectorAll<HTMLButtonElement>('[data-js-only]').forEach(button => { button.disabled = false; });

const loadScene = () => import('./scene').then(({ initScene }) => initScene()).catch(showSceneFallback);
if (typeof requestIdleCallback === 'function') requestIdleCallback(loadScene, { timeout: 800 });
else setTimeout(loadScene, 80);
