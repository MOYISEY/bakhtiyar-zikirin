import './style.css';
import { showSceneFallback } from './fallback';

const steps = [
  { label: 'Интервью с клиентом', title: 'Что должен<br />делать сайт?', text: 'Цель, аудитория, функции, сроки — вопросы помогают собрать исходные данные.' },
  { label: 'Структурированное ТЗ', title: 'Ответы становятся<br />требованиями.', text: 'Информация из разговора собирается в документ, с которым может работать команда.' },
  { label: 'Работа студии', title: 'У каждого —<br />своя роль.', text: 'Клиент, менеджер, разработчик и директор работают с проектом в своих разделах.' },
];
document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(button => {
  button.addEventListener('click', () => {
    const step = steps[Number(button.dataset.step)];
    if (!step) return;
    document.querySelectorAll('[data-step]').forEach(el => el.setAttribute('aria-pressed', String(el === button)));
    const content = document.querySelector('#brief-content');
    if (content) content.innerHTML = `<span class="brief-label">${step.label}</span><h4>${step.title}</h4><p>${step.text}</p>`;
  });
});

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const navLinks = document.querySelectorAll<HTMLAnchorElement>('.header nav a');
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    navLinks.forEach(link => {
      const current = link.hash === `#${entry.target.id}`;
      if (current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  });
}, { rootMargin: '-20% 0px -55% 0px' });
['work', 'about', 'contact'].forEach(id => { const section = document.getElementById(id); if (section) sectionObserver.observe(section); });

const viewport = document.querySelector<HTMLElement>('#scene-viewport');
if (viewport) {
  // The 3D engine loads after the textual first screen, without blocking navigation.
  const loadScene = () => import('./scene').then(({ initScene }) => initScene()).catch(showSceneFallback);
  if (typeof requestIdleCallback === 'function') requestIdleCallback(loadScene, { timeout: 900 });
  else setTimeout(loadScene, 80);
}

// Motion preference applies immediately and also when changed while the page is open.
function updateMotionPreference() { document.documentElement.classList.toggle('reduced-motion', reducedMotion.matches); }
updateMotionPreference();
reducedMotion.addEventListener('change', updateMotionPreference);
