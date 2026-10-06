import { t } from './preferences';

export function initProjectRail() {
  const rail = document.querySelector<HTMLElement>('#project-rail');
  if (!rail) return;
  const cards = [...rail.querySelectorAll<HTMLElement>('.visual-card')];
  const previous = document.querySelector<HTMLButtonElement>('#project-rail-prev')!;
  const next = document.querySelector<HTMLButtonElement>('#project-rail-next')!;
  const position = document.querySelector<HTMLElement>('#project-rail-position')!;
  document.querySelector<HTMLElement>('.project-rail-controls')!.hidden = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const offsets = () => cards.map(card => card.getBoundingClientRect().left - rail.getBoundingClientRect().left + rail.scrollLeft);
  const closest = () => offsets().reduce((best, value, index, all) => Math.abs(value - rail.scrollLeft) < Math.abs(all[best] - rail.scrollLeft) ? index : best, 0);
  function update() {
    const bounds = rail!.getBoundingClientRect();
    const visible = cards.flatMap((card, index) => {
      const box = card.getBoundingClientRect();
      return box.right > bounds.left + 24 && box.left < bounds.right - 24 ? [index + 1] : [];
    });
    previous.disabled = rail!.scrollLeft <= 2;
    next.disabled = rail!.scrollLeft >= rail!.scrollWidth - rail!.clientWidth - 2;
    position.textContent = `${t('rail.position')} ${visible[0] ?? 1}–${visible.at(-1) ?? 1} / ${cards.length}`;
  }
  function go(index: number, immediate = false) {
    rail!.scrollTo({ left: offsets()[Math.max(0, Math.min(cards.length - 1, index))], behavior: immediate || reducedMotion.matches ? 'instant' : 'smooth' });
  }
  previous.addEventListener('click', () => go(closest() - 1));
  next.addEventListener('click', () => go(closest() + 1));
  rail.addEventListener('keydown', event => {
    if (event.target !== rail) return;
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? cards.length - 1 : event.key === 'ArrowLeft' ? closest() - 1 : event.key === 'ArrowRight' ? closest() + 1 : null;
    if (index === null) return;
    event.preventDefault();
    go(index);
  });
  let timer: ReturnType<typeof setTimeout>;
  rail.addEventListener('scroll', () => { clearTimeout(timer); timer = setTimeout(update, 120); }, { passive: true });
  new ResizeObserver(update).observe(rail);
  window.addEventListener('portfolio:preferences', update);

  // Touch stays native, including vertical page scrolling. Only mouse drag is enhanced.
  let drag: { id: number; x: number; y: number; left: number; active: boolean } | null = null;
  let suppressClickUntil = 0;
  rail.addEventListener('pointerdown', event => {
    suppressClickUntil = 0;
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, left: rail.scrollLeft, active: false };
  });
  rail.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.active) {
      if (Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
      if (Math.abs(dx) < 8) return;
      drag.active = true;
      rail.classList.add('is-dragging');
      rail.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    rail.scrollLeft = drag.left - dx;
  });
  function finish(event: PointerEvent) {
    if (!drag || drag.id !== event.pointerId) return;
    const active = drag.active;
    drag = null;
    if (!active) return;
    suppressClickUntil = performance.now() + 500;
    const index = closest();
    rail!.classList.remove('is-dragging');
    if (rail!.hasPointerCapture(event.pointerId)) rail!.releasePointerCapture(event.pointerId);
    go(index, true);
    update();
  }
  rail.addEventListener('pointerup', finish);
  rail.addEventListener('pointercancel', finish);
  rail.addEventListener('lostpointercapture', finish);
  rail.addEventListener('pointerleave', () => { if (drag && !drag.active) drag = null; });
  rail.addEventListener('dragstart', event => event.preventDefault());
  rail.addEventListener('click', event => {
    if (performance.now() < suppressClickUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  update();
}
