# Раунд 1 — код, корректность, безопасность

Дата: 2026-10-01. Независимое ревью: Codex-подагент `audit_code`.

Прочитаны index.html, src/main.ts, src/scene.ts, src/style.css, favicon, README, package.json, tsconfig, Vite config, .gitignore. AGENTS.md в проекте и проверенных родительских каталогах не найден. Подагент не менял product-код.

Подагент выполнил `npm exec tsc -- --noEmit`: exit 0 после исправления CSS declaration и requestIdleCallback narrowing. Владелец задачи отдельно выполнил production build: exit 0. Публичные GitHub-профиль, Atyrau Tour и Art Portal независимо прочитаны через web. NeuralBrief и стажировка проверены только по контексту владельца; README раскрывает это ограничение.

## Найдено и исправлено после восстановления соединения

1. **A1-01 / P2:** OrbitControls.connect устанавливает inline `touch-action:none`, перекрывая CSS pan-y. Один палец мог блокировать прокрутку. Исправление: после создания controls явно установить canvas.style.touchAction='pan-y'. Реальный свайп подлежит runtime-проверке.
2. **A1-02 / P2:** pagehide без проверки persisted уничтожает renderer и controls даже при сохранении страницы в bfcache. Исправление: persisted pagehide только приостанавливает кадры; persisted pageshow возобновляет их. Ресурсы освобождаются при обычном уходе со страницы.
3. **A1-03 / P3:** cleanup пропускает LineSegments и анонимные handlers. Исправление: общий idempotent dispose, Sets для общих geometry/material, освобождение line resources, AbortController для handlers, удаление controls change handler.
4. **A1-04 / P3:** ошибка загрузки динамического 3D-модуля оставляет прозрачный canvas с tabindex. Исправление: общий fallback скрывает canvas, убирает tabindex, отключает controls и меняет status. Используется при import failure, WebGL initialization failure и context loss.

## Безопасность и факты

В проверенных product-исходниках не найдено credentials, API keys, форм отправки, runtime remote scripts или путей получения непроверенного пользовательского ввода. innerHTML принимает авторские статичные строки. Внешние ссылки имеют noopener/noreferrer. Шрифты и Three.js поставляются локально. Личная почта, возраст, документы, клиенты, отзывы, выдуманные метрики и seniority не опубликованы.

Это ручной source review, не автоматический secret scan конечного Git history. Непосредственно в этом раунде подагент не выполнил полный production build, runtime swipe, bfcache, blocked chunk, WebGL-disabled и live QA. Начальная проверка владельца: Chromium 1440 px, работающий 3D, JS errors=[], fonts=loaded, overflow=false (initial-browser.json и desktop-initial.png).

Попытка независимого `npm audit --json` не получила registry advisory endpoint в sandbox; сетевой повтор не выполнился из-за timeout approval review, затем компьютер отключился. Это не отказ политики и не обнаруженная уязвимость. Отчёт восстановлен из полного финального сообщения подагента после возвращения connected environment. Runtime-проверки исправлений записываются отдельно, без приписывания их первоначальному ревью.

## Закрытие проверок после восстановления соединения

Владелец выполнил разрешённый сетевой повтор `npm audit --json` 2026-10-01: exit 0, обнаружено 0 уязвимостей; результат — `dependency-audit.json`. Проверка 33 текстовых исходников на распространённые credential patterns и пути локального имени пользователя не нашла совпадений (`source-safety-scan.json`). Это ограниченный шаблонный поиск, не гарантия отсутствия всех возможных секретов.

Исправления runtime позднее проверены на публичном сайте в отдельном третьем раунде: one-finger scroll, fallback при недоступном WebGL и blocked chunk, возврат в реально наблюдавшемся bfcache. Подробные результаты находятся в `audit-3-live.md`, а исходные отрицательные прогоны сохранены.
