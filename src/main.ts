import './style.css';
import { showSceneFallback } from './fallback';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const system = document.querySelector<HTMLElement>('#system')!;
const layerDescriptions: Record<string, string> = {
  interface: 'Компоненты, состояние и действия человека. Здесь начинается запрос.',
  logic: 'Запросы, условия и проверка ответа. Здесь определяется поведение приложения.',
  data: 'Сущности, связи и хранение. Ответ возвращается в интерфейс как новое состояние.',
};
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
  document.querySelector('#layer-description')!.textContent = layerDescriptions[layer];
  window.dispatchEvent(new CustomEvent('portfolio:layer', { detail: layer }));
}));

const briefSteps = [
  { label: 'Интервью с клиентом', title: ['Сначала —', 'нужные вопросы.'], text: 'Цель сайта, аудитория, функции и ограничения. Ответы становятся исходными данными для ТЗ.', output: 'Идея клиента → ответы на вопросы' },
  { label: 'Структурированные требования', title: ['Ответы становятся', 'документом.'], text: 'Результат интервью собирается в ТЗ. У команды появляется общее описание задачи вместо разрозненных сообщений.', output: 'Ответы → структурированное ТЗ' },
  { label: 'Работа команды', title: ['Разные роли.', 'Один проект.'], text: 'Клиент, менеджер, разработчик и директор работают с проектом в своих разделах. Trello и Resend связывают задачи и уведомления.', output: 'ТЗ → работа команды по ролям' },
];
const briefButtons = document.querySelectorAll<HTMLButtonElement>('[data-step]');
briefButtons.forEach(button => button.addEventListener('click', () => {
  const index = Number(button.dataset.step);
  const step = briefSteps[index];
  if (!step) return;
  briefButtons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
  const content = document.querySelector('#brief-content')!;
  content.querySelector('.brief-label')!.textContent = step.label;
  content.querySelector('h4')!.replaceChildren(document.createTextNode(step.title[0]), document.createElement('br'), document.createTextNode(step.title[1]));
  content.querySelector('p')!.textContent = step.text;
  document.querySelector('#brief-output-text')!.textContent = step.output;
  document.querySelectorAll('.route-node').forEach((node, position) => node.classList.toggle('is-current', position === index));
}));

const signalButton = document.querySelector<HTMLButtonElement>('#signal-start')!;
const signalStatus = document.querySelector('#signal-status')!;
let signalTimer: ReturnType<typeof setTimeout> | undefined;
const signalStages = [
  { layer: 'interface', text: '01 / Человек нажимает кнопку в интерфейсе.' },
  { layer: 'logic', text: '02 / Логика формирует запрос и проверяет условия.' },
  { layer: 'data', text: '03 / Данные читаются или изменяются.' },
  { layer: 'interface', text: '04 / Ответ обновляет состояние интерфейса. Путь завершён.' },
];
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
    system.dataset.signal = current.layer;
    signalStatus.textContent = current.text;
    window.dispatchEvent(new CustomEvent('portfolio:signal', { detail: current.layer }));
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
document.querySelectorAll<HTMLButtonElement>('[data-js-only]').forEach(button => { button.disabled = false; });

const loadScene = () => import('./scene').then(({ initScene }) => initScene()).catch(showSceneFallback);
if (typeof requestIdleCallback === 'function') requestIdleCallback(loadScene, { timeout: 800 });
else setTimeout(loadScene, 80);
