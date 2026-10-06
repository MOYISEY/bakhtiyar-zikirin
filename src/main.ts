import './style.css';
import './hierarchy.css';
import './restoration.css';
import './pages.css';
import { initPreferences, language, t } from './preferences';
import { showSceneFallback } from './fallback';
import { initProjectRail } from './project-rail';

initPreferences();
initProjectRail();
const copyEmail = document.querySelector<HTMLButtonElement>('#copy-email');
if (copyEmail) {
  const wrapper = copyEmail.closest<HTMLElement>('.email-copy')!;
  const status = wrapper.querySelector<HTMLElement>('#email-copy-status')!;
  const fallback = wrapper.querySelector<HTMLInputElement>('#email-copy-fallback')!;
  let statusKey = '';
  let copying = false;
  wrapper.hidden = false;
  copyEmail.addEventListener('click', async () => {
    if (copying) return;
    copying = true;
    copyEmail.setAttribute('aria-busy', 'true');
    try {
      await navigator.clipboard.writeText(fallback.value);
      fallback.hidden = true;
      statusKey = 'contact.emailCopied';
    } catch {
      fallback.hidden = false;
      fallback.focus();
      fallback.select();
      statusKey = 'contact.copyManual';
    } finally {
      status.textContent = t(statusKey);
      copying = false;
      copyEmail.removeAttribute('aria-busy');
    }
  });
  window.addEventListener('portfolio:preferences', () => {
    if (statusKey) status.textContent = t(statusKey);
  });
}

function limitDetailImages() {
  document.querySelectorAll<HTMLAnchorElement>('.case-media .gallery-open[data-kind="screenshot"]').forEach(link => {
    const figure = link.closest<HTMLElement>('.case-media')!;
    figure.style.maxWidth = `${Math.min(1100, Number(link.dataset.width) / devicePixelRatio)}px`;
  });
}
limitDetailImages();
window.addEventListener('resize', limitDetailImages);
document.querySelectorAll<HTMLElement>('.project-preview, .gallery-open, .hero-preview > a').forEach(wrapper => {
  const image = wrapper.querySelector<HTMLImageElement>('img');
  if (!image) return;
  const failed = () => {
    wrapper.classList.add('image-failed');
    wrapper.querySelector<HTMLElement>('.media-error')!.hidden = false;
  };
  image.addEventListener('error', failed);
  if (image.complete && !image.naturalWidth) failed();
});
const allowedFilters = ['all', 'spatial', 'tools', 'games', 'cases'];
const cards = [...document.querySelectorAll<HTMLElement>('.catalog-grid .visual-card')];
const filterButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-filter]')];
function filterFromUrl() {
  const candidate = new URL(location.href).searchParams.get('filter') ?? 'all';
  return allowedFilters.includes(candidate) ? candidate : 'all';
}
function syncLinks() {
  const filter = filterFromUrl();
  document.querySelectorAll<HTMLAnchorElement>('a.site-internal').forEach(link => {
    const target = new URL(link.getAttribute('href')!, location.href);
    if (target.origin !== location.origin) return;
    target.searchParams.set('lang', language());
    if (target.pathname.includes('/projects/') && filter !== 'all') target.searchParams.set('filter', filter);
    else target.searchParams.delete('filter');
    link.href = target.href;
  });
}
function applyFilter() {
  const selected = filterFromUrl();
  for (const card of cards) card.hidden = selected !== 'all' && card.dataset.category !== selected;
  for (const button of filterButtons) button.setAttribute('aria-pressed', String(button.dataset.filter === selected));
  const count = document.querySelector('#filter-count');
  if (count) count.textContent = String(cards.filter(card => !card.hidden).length);
  syncLinks();
}
filterButtons.forEach(button => {
  button.disabled = false;
  button.addEventListener('click', () => {
    if (button.dataset.filter === filterFromUrl()) return;
    const url = new URL(location.href);
    if (button.dataset.filter === 'all') url.searchParams.delete('filter');
    else url.searchParams.set('filter', button.dataset.filter!);
    history.pushState(null, '', url); applyFilter();
  });
});
window.addEventListener('popstate', applyFilter);
applyFilter();

const dialog = document.querySelector<HTMLDialogElement>('#gallery-dialog');
const gallery = [...document.querySelectorAll<HTMLAnchorElement>('.gallery-open')];
let galleryIndex = 0;
let galleryTrigger: HTMLAnchorElement | undefined;
let galleryZoom = false;
function fitGalleryImage() {
  if (!dialog?.open) return;
  const current = gallery[galleryIndex];
  const image = dialog.querySelector<HTMLImageElement>('#gallery-image')!;
  const viewport = dialog.querySelector<HTMLElement>('.gallery-viewport')!;
  const nativeWidth = Number(current.dataset.width), nativeHeight = Number(current.dataset.height);
  const fitWidth = Math.min(viewport.clientWidth, innerHeight * (innerWidth <= 760 ? .58 : .66) * nativeWidth / nativeHeight, current.dataset.kind === 'diagram' ? Infinity : nativeWidth / devicePixelRatio);
  const width = galleryZoom ? Math.max(fitWidth, current.dataset.kind === 'diagram' ? fitWidth * 2 : nativeWidth / devicePixelRatio) : fitWidth;
  viewport.classList.toggle('is-zoomed', galleryZoom);
  image.style.width = `${width}px`; image.style.height = 'auto';
  image.sizes = `${Math.ceil(width)}px`;
  image.srcset = galleryZoom ? '' : current.dataset.srcset ?? '';
  image.src = galleryZoom ? current.href : current.querySelector<HTMLImageElement>('img')!.src;
  dialog.querySelector<HTMLButtonElement>('#gallery-zoom')!.setAttribute('aria-pressed', String(galleryZoom));
  const label = dialog.querySelector<HTMLElement>('#gallery-zoom span')!;
  label.dataset.i18n = galleryZoom ? 'v13.fit' : 'v13.details'; label.textContent = t(label.dataset.i18n);
}
function renderGallery() {
  if (!dialog) return;
  const current = gallery[galleryIndex];
  const image = dialog.querySelector<HTMLImageElement>('#gallery-image')!;
  image.hidden = false; dialog.querySelector<HTMLElement>('#gallery-error')!.hidden = true;
  galleryZoom = false; image.alt = t(current.dataset.captionKey!);
  dialog.querySelector<HTMLAnchorElement>('#gallery-file')!.href = current.href;
  fitGalleryImage();
  dialog.querySelector<HTMLElement>('.gallery-viewport')!.scrollTo(0, 0);
  dialog.querySelector('#gallery-caption')!.textContent = image.alt;
  dialog.querySelector('#gallery-counter')!.textContent = `${galleryIndex + 1} / ${gallery.length}`;
  dialog.querySelector<HTMLButtonElement>('#gallery-prev')!.disabled = gallery.length < 2;
  dialog.querySelector<HTMLButtonElement>('#gallery-next')!.disabled = gallery.length < 2;
}
function stepGallery(delta: number) { galleryIndex = (galleryIndex + delta + gallery.length) % gallery.length; renderGallery(); }
if (dialog) {
  dialog.querySelector<HTMLImageElement>('#gallery-image')!.addEventListener('error', () => {
    dialog.querySelector<HTMLImageElement>('#gallery-image')!.hidden = true;
    dialog.querySelector<HTMLElement>('#gallery-error')!.hidden = false;
  });
  gallery.forEach((link, index) => link.addEventListener('click', event => {
    event.preventDefault(); galleryIndex = index; galleryTrigger = link;
    dialog.showModal(); document.body.classList.add('gallery-open'); renderGallery();
    dialog.querySelector<HTMLButtonElement>('#gallery-close')!.focus();
  }));
  dialog.querySelector('#gallery-close')!.addEventListener('click', () => dialog.close());
  dialog.querySelector('#gallery-prev')!.addEventListener('click', () => stepGallery(-1));
  dialog.querySelector('#gallery-next')!.addEventListener('click', () => stepGallery(1));
  dialog.querySelector('#gallery-zoom')!.addEventListener('click', () => { galleryZoom = !galleryZoom; fitGalleryImage(); });
  window.addEventListener('resize', fitGalleryImage);
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', event => {
    if (galleryZoom && event.target === dialog.querySelector('.gallery-viewport')) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); stepGallery(event.key === 'ArrowRight' ? 1 : -1); }
  });
  dialog.addEventListener('close', () => { document.body.classList.remove('gallery-open'); galleryTrigger?.focus({ preventScroll: true }); });
}
window.addEventListener('portfolio:preferences', () => { syncLinks(); if (dialog?.open) renderGallery(); });

if (document.querySelector('#sample-fix')) {
  import('./rowline-sample').then(({ initRowlineSample }) => {
    initRowlineSample();
    for (const id of ['sample-fix', 'sample-export']) document.querySelector<HTMLButtonElement>('#' + id)!.disabled = false;
    document.body.dataset.sampleReady = 'true';
  });
}
const diagram = document.querySelector<HTMLDetailsElement>('#scene-disclosure');
let controlsRequested = false;
function requestDiagramControls() {
  if (!diagram?.open || controlsRequested) return;
  controlsRequested = true;
  import('./scene-controls').then(({ initSceneControls }) => initSceneControls()).catch(showSceneFallback);
}
diagram?.addEventListener('toggle', requestDiagramControls);
requestDiagramControls();
function revealHash() {
  let id: string; try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id);
  if (target) {
    for (let ancestor = target.parentElement; ancestor; ancestor = ancestor.parentElement) if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
    if (target instanceof HTMLDetailsElement) target.open = true;
    requestAnimationFrame(() => target.scrollIntoView({ block: 'start' }));
  } else if (document.body.dataset.page === 'home' && ['framepack', 'shapecheck', 'rowline', 'atyrau', 'neuralbrief', 'artportal'].includes(id)) {
    const url = new URL('projects/' + id + '.html', location.href); url.searchParams.set('lang', language()); location.replace(url);
  }
}
window.addEventListener('hashchange', revealHash);
if (location.hash) revealHash();
document.body.dataset.siteReady = 'true';
