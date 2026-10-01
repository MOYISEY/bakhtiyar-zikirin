/** Keep the whole portfolio usable if the optional 3D layer cannot run. */
export function showSceneFallback() {
  const canvas = document.querySelector<HTMLCanvasElement>('#scene');
  if (canvas) { canvas.hidden = true; canvas.removeAttribute('tabindex'); }
  document.querySelector('#scene-viewport')?.classList.remove('is-ready');
  const status = document.querySelector('#scene-status');
  if (status) status.textContent = '3D не запустилось / статичный вид';
  document.querySelectorAll<HTMLButtonElement>('.scene-toolbar button').forEach(button => { button.disabled = true; });
  const hint = document.querySelector<HTMLElement>('.scene-hint');
  if (hint) hint.hidden = true;
}
