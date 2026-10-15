import { t } from './preferences';
export function initProjectShowcase() {
  const host = document.querySelector<HTMLElement>('#project-showcase');
  if (!host) return;
  const choices = [...host.querySelectorAll<HTMLAnchorElement>('[data-showcase-select]')];
  const panels = [...host.querySelectorAll<HTMLElement>('[data-showcase-panel]')];
  const stage = host.querySelector<HTMLElement>('.showcase-stage')!;
  stage.setAttribute('role', 'group'); stage.setAttribute('aria-label', t('showcase.swipe'));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0, revision = 0;
  const animations: Animation[] = [];
  function select(index: number, focus = false, remember = true) {
    index = (index + choices.length) % choices.length;
    const serial = ++revision;
    animations.splice(0).forEach(a => a.cancel());
    const old = panels[current], next = panels[index];
    panels.forEach(p => { p.hidden = p !== old; p.style.position = ''; p.style.inset = ''; p.inert = p !== old; });
    choices.forEach((c, i) => { c.setAttribute('aria-selected', String(i === index)); c.tabIndex = i === index ? 0 : -1; });
    current = index;
    if (focus) choices[index].focus({ preventScroll: true });
    if (remember) history.replaceState(history.state, '', '#' + choices[index].dataset.showcaseSelect);
    next.hidden = false; next.inert = false;
    if (old !== next && !reduced.matches) {
      old.inert = true; old.style.position = 'absolute'; old.style.inset = '0';
      const fadeOut = old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-out' });
      const fadeIn = next.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
      animations.push(fadeOut, fadeIn);
      fadeIn.finished.then(() => { if (serial === revision) { old.hidden = true; old.style.position = ''; old.style.inset = ''; } }).catch(() => {});
    } else panels.forEach(p => { p.hidden = p !== next; p.inert = p !== next; });
  }
  host.querySelector('.showcase-list')!.setAttribute('role', 'tablist');
  host.querySelector('.showcase-list')!.setAttribute('aria-orientation', 'vertical');
  choices.forEach((choice, index) => {
    choice.setAttribute('role', 'tab'); choice.setAttribute('aria-controls', panels[index].id);
    panels[index].setAttribute('role', 'tabpanel'); panels[index].setAttribute('aria-labelledby', choice.id);
    choice.addEventListener('click', event => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); select(index); });
    choice.addEventListener('keydown', event => {
      const next = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? index - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1 : event.key === ' ' ? index : null;
      if (next === null) return;
      event.preventDefault(); select(next, true);
    });
  });
  // Native vertical scrolling owns touch. A short horizontal gesture on the
  // preview supplements the visible project names and never captures a pointer.
  let swipe: { id: number; x: number; y: number } | null = null, suppressUntil = 0;
  stage.style.touchAction = 'pan-y pinch-zoom';
  stage.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') swipe = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
  stage.addEventListener('pointerup', e => {
    if (!swipe || swipe.id !== e.pointerId) return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y; swipe = null;
    if (Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.6) { suppressUntil = performance.now() + 500; select(current + (dx < 0 ? 1 : -1)); }
  });
  stage.addEventListener('pointercancel', () => { swipe = null; });
  stage.addEventListener('click', e => { if (performance.now() < suppressUntil) { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
  function fromHash() { const index = choices.findIndex(c => '#' + c.dataset.showcaseSelect === location.hash); if (index >= 0) select(index, false, false); }
  window.addEventListener('hashchange', fromHash);
  window.addEventListener('portfolio:preferences', () => { stage.setAttribute('aria-label', t('showcase.swipe')); });
  select(0, false, false); fromHash();
}
