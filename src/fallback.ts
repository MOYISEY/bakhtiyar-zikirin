/** The DOM/2D system stays interactive when the optional WebGL layer cannot run. */
export function showSceneFallback() {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene');
  if (canvas) { canvas.hidden = true; canvas.removeAttribute('tabindex'); }
  document.querySelector('#scene-viewport')?.classList.remove('is-ready');
  document.querySelectorAll<HTMLElement>('[data-webgl-only]').forEach(element => { element.hidden = true; });
  const status = document.querySelector('#scene-status');
  if (status) status.textContent = '3D недоступно в этом браузере · работает 2D-схема';
}
