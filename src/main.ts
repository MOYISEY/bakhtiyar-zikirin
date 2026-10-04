import './style.css';
import './hierarchy.css';
import './concise.css';
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
['work', 'experience', 'contact'].forEach(id => sectionObserver.observe(document.getElementById(id)!));

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

// The diagram is optional. Opening it is the only request for its renderer.
let sceneRequested = false;
const diagram = document.querySelector<HTMLDetailsElement>('#approach')!;
function loadScene() {
  if (sceneRequested || !diagram.open) return;
  sceneRequested = true;
  import('./scene').then(({ initScene }) => initScene()).catch(showSceneFallback);
}
diagram.addEventListener('toggle', () => { if (diagram.open) loadScene(); });
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
  document.querySelector<HTMLDetailsElement>('.mobile-navigation')!.open = false;
  target.focus({ preventScroll: true });
  requestAnimationFrame(() => target.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'start' }));
}
window.addEventListener('hashchange', revealHash);
navLinks.forEach(link => link.addEventListener('click', () => {
  if (link.hash === location.hash) revealHash();
}));
if (location.hash) revealHash();
const appearance = document.querySelector<HTMLDetailsElement>('.appearance-menu')!;
document.addEventListener('pointerdown', event => { if (!appearance.contains(event.target as Node)) appearance.open = false; });
appearance.addEventListener('keydown', event => {
  if (event.key === 'Escape') { appearance.open = false; appearance.querySelector('summary')!.focus(); }
});
const mobileNav = document.querySelector<HTMLDetailsElement>('.mobile-navigation')!;
appearance.addEventListener('toggle', () => { if (appearance.open) mobileNav.open = false; });
mobileNav.addEventListener('toggle', () => { if (mobileNav.open) appearance.open = false; });
document.addEventListener('pointerdown', event => { if (!mobileNav.contains(event.target as Node)) mobileNav.open = false; });
mobileNav.addEventListener('keydown', event => {
  if (event.key === 'Escape') { mobileNav.open = false; mobileNav.querySelector('summary')!.focus(); }
});
const hero = document.querySelector<HTMLElement>('.hero')!;
let heroVisible = true;
const updateHero = () => hero.classList.toggle('motion-paused', !heroVisible || document.hidden);
new IntersectionObserver(entries => { heroVisible = entries[0]?.isIntersecting ?? false; updateHero(); }).observe(hero);
document.addEventListener('visibilitychange', updateHero);
