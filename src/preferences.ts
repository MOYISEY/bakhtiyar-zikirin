import ru from './locales/ru.json';
import kk from './locales/kk.json';
import en from './locales/en.json';

export type Language = 'ru' | 'kk' | 'en';
type Theme = 'system' | 'light' | 'dark';
type Preferences = { language: Language; theme: Theme };
const storageKey = 'portfolio.preferences.v1';
const dictionaries: Record<Language, Record<string, string>> = { ru, kk, en };
const systemTheme = matchMedia('(prefers-color-scheme: dark)');
let preferences: Preferences = { language: 'ru', theme: 'system' };
function sanitize(value: unknown): Preferences {
  const input = value as Partial<Preferences> | null;
  return { language: input && ['ru', 'kk', 'en'].includes(input.language ?? '') ? input.language! : 'ru', theme: input && ['system', 'light', 'dark'].includes(input.theme ?? '') ? input.theme! : 'system' };
}
try { preferences = sanitize(JSON.parse(localStorage.getItem(storageKey) ?? 'null')); } catch { /* Preferences are optional, including when storage is blocked. */ }
export const language = () => preferences.language;
export const darkTheme = () => (preferences.theme === 'system' ? systemTheme.matches : preferences.theme === 'dark');
export function t(key: string): string { return dictionaries[preferences.language][key] ?? dictionaries.ru[key] ?? key; }

type TextBinding = { node: Node; key: string; before: string; after: string };
const bindings: TextBinding[] = [];
function notify() { window.dispatchEvent(new CustomEvent('portfolio:preferences', { detail: { ...preferences, resolvedTheme: darkTheme() ? 'dark' : 'light' } })); }
function applyLanguage() {
  document.documentElement.lang = preferences.language;
  for (const binding of bindings) binding.node.textContent = binding.before + t(binding.key) + binding.after;
  document.querySelectorAll<HTMLElement>('[data-i18n-attrs]').forEach(element => {
    for (const { attr, key } of JSON.parse(element.dataset.i18nAttrs!) as { attr: string; key: string }[]) element.setAttribute(attr, t(key));
  });
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n!); });
  document.querySelector<HTMLSelectElement>('#language-select')!.value = preferences.language;
}
function applyTheme() {
  const theme = darkTheme() ? 'dark' : 'light';
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themePreference = preferences.theme;
  document.querySelector<HTMLSelectElement>('#theme-select')!.value = preferences.theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#111214' : '#eeeef0');
}
function save() { try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch { /* Changes still work for this visit. */ } }
export function initPreferences() {
  document.querySelectorAll<HTMLElement>('[data-i18n-nodes]').forEach(element => {
    for (const { index, key } of JSON.parse(element.dataset.i18nNodes!) as { index: number; key: string }[]) {
      const node = element.childNodes[index];
      if (!node || node.nodeType !== Node.TEXT_NODE) continue;
      const text = node.textContent ?? '';
      bindings.push({ node, key, before: text.match(/^\s*/)?.[0] ?? '', after: text.match(/\s*$/)?.[0] ?? '' });
    }
  });
  applyLanguage(); applyTheme();
  delete document.documentElement.dataset.localePending;
  document.querySelector<HTMLElement>('.preferences')!.hidden = false;
  document.querySelector<HTMLSelectElement>('#language-select')!.addEventListener('change', event => {
    preferences.language = (event.target as HTMLSelectElement).value as Language;
    save(); applyLanguage(); notify();
  });
  document.querySelector<HTMLSelectElement>('#theme-select')!.addEventListener('change', event => {
    preferences.theme = (event.target as HTMLSelectElement).value as Theme;
    save(); applyTheme(); notify();
  });
  systemTheme.addEventListener('change', () => { if (preferences.theme === 'system') { applyTheme(); notify(); } });
  window.addEventListener('storage', event => { if (event.key === storageKey) { try { preferences = sanitize(JSON.parse(event.newValue ?? 'null')); } catch { preferences = sanitize(null); } applyLanguage(); applyTheme(); notify(); } });
}
