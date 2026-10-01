# Раунд 2 — дизайн, доступность и производительность

Дата: 2026-10-01. Независимый ревьюер: Codex-подагент `audit_design`. Локальный preview: `http://127.0.0.1:5173/`. Production preview для измерений: `http://127.0.0.1:5184/`.

Прочитаны README, index.html, main.ts, scene.ts, fallback.ts, style.css, package.json и первый аудит. Product-код ревьюер не менял. Просмотрены реальные скриншоты `design-1440.png`, `design-768.png`, `design-320.png`, `design-text-200.png`. Дополнительные проверки выполнены в Chromium через Playwright и CDP; аппаратное устройство и физический сенсорный экран не использовались.

## Находки и состояние исправлений

1. **A2-01 / P2 — контраст номеров неактивных этапов, исправлено.** Исходная матрица axe на 1440 / 1024 / 768 / 390 / 320 px нашла единственную категорию нарушений: `color-contrast` у номеров 02 и 03, 4.25:1 вместо 4.5:1. Причина — opacity .7 на `.brief-steps button span`. Владелец исправил opacity на 1. Независимо прочитан `design-final-baseline.json`: violations [], errors [], clipped [], overflow false во всех пяти ширинах. Исходный результат сохранён в `design-baseline.json`.

2. **A2-02 / P2 — 200% text-only увеличение, исправлено и перепроверено владельцем задачи.** Эмуляция увеличивает предварительно вычисленные размеры всех текстовых элементов вдвое, сохраняя размеры viewport и блоков. Исходно имя клипилось, hero-footnote накладывался на CTA. Первый набор исправлений закрыл desktop 1440 → 1440, но mobile 390 → 581 ещё не проходил. Затем применены minmax(0,1fr)/min-width:0 у mobile grid, overflow-wrap у заголовков и отдельного contact-address, flex-wrap у header/hero-bottom/scene controls/brief steps, auto height у mobile scene-shell. После восстановления транспорта владелец выполнил отдельный `scripts/text-recheck.mjs`: desktop **1440 → 1440**, mobile **390 → 390**, overflowElements [] в обоих случаях. Это выполненная перепроверка владельца после ревью подагента; подагент сам этот последний прогон не выполнял. Оригинальные отрицательные доказательства сохранены. Финальные доказательства: `text200-final.json`, `text200-final-1440.png`, `text200-final-390.png`.

3. **A2-03 / P3 — skip link не передавал активный focus в main.** До исправления переход менял hash на #main, activeElement оставался BODY. Владелец добавил main tabindex=-1. Повторная клавиатурная проверка: первая Tab — «К содержанию», Enter — MAIN#main.

## Подтверждённое поведение

- Исходная responsive матрица владельца: 1440, 1024, 768, 390, 320 px; во всех scrollWidth равен viewport, ошибок JavaScript нет. Самостоятельно осмотрены desktop, tablet и самый узкий скриншот; композиция, порядок разделов и читаемость сохраняются.
- Эквивалент 200% browser zoom на исходном desktop viewport 1440 px: CSS viewport 720 px, scrollWidth 720, clipped text/control boxes []. Это проверка reflow, отдельная от text-only emulation.
- Вкладки клавиатуры проходят навигацию, CTA, canvas, 3D-переключатели, этапы схемы, native details, ссылки репозиториев и footer. Во время проверки присутствуют focus outlines.
- ArrowRight изменяет сцену. Независимая повторная проверка Home возвращает начальный canvas байт-в-байт; пиксельное сравнение: 0 changed pixels. Исходный неоднозначный результат первого прогона снят изолированной перепроверкой.
- При prefers-reduced-motion движение исходно выключено; за 1.1 секунды дополнительных WebGL drawCalls **0**. Resume запускает отрисовку; после Pause за 1 секунду дополнительных drawCalls **0**. Это проверяет фактическую работу паузы, а не только aria-атрибут.
- Mobile viewport 390 × 844 с hasTouch/isMobile. Computed touch-action canvas — pan-y. Native touch-свайп через CDP начинается внутри canvas: scrollY 160 → 491. Свайп не блокируется OrbitControls.
- Mobile tap-переключения этапов 1 → 2 → 0 работают; содержимое и aria-pressed соответствуют выбранному этапу. Native details раскрывается. Footer «Наверх» меняет hash на #top и возвращает scrollY 59 (положение начала hero после header).
- После всех доп. runtime проверок ошибок JavaScript **нет**.

## Дизайн и текст

Композиция использует крупное имя, собственную металлическую 3D-сцену, светлый проектный раздел, интерактивную схему и разные по масштабу типографические блоки. Повторяющейся сетки одинаковых карточек нет. Короткие тексты объясняют действия и назначение проектов. Формы, вымышленных отзывов, метрик или обещаний занятости нет. NeuralBrief и практика опираются на предоставленный контекст; README явно отделяет их от проверенных публичных репозиториев.

## Измерения производительности

`design-verify.json` содержит отдельный local production прогон без network/CPU throttling в Chromium с разрешённым SwiftShader fallback. Фактический renderer в этом прогоне не записывался; флаг `--enable-unsafe-swiftshader` не заставляет браузер использовать software renderer. LCP **232 ms**, CLS **0.00973**, fonts=loaded. Long tasks при загрузке/инициализации: 115, 162, 74 ms. Это локальные измерения; они не являются Core Web Vitals полевых пользователей или Lighthouse score.

Основной JavaScript — 4467 decoded bytes / 2490 transferred bytes. Отдельный динамический 3D chunk — 571486 decoded bytes / 141975 transferred bytes. 3D не блокирует доступность основного HTML и загружается после текстового первого экрана. Отрисовка при паузе прекращается; код также прекращает её вне viewport и в фоновой вкладке, что проверяется владельцем в регрессионном раунде.

## Доказательства и ограничения

- `scripts/audit-design-extra.mjs` → `design-extra.json`, `design-text-200.png`, `design-mobile-details.png`.
- `scripts/audit-design-verify.mjs` → `design-verify.json`, `design-zoom-200-equivalent.png`, `design-scene-home-initial.png`, `design-scene-home-changed.png`, `design-scene-home-reset.png`.
- `scripts/audit-text-resize.mjs` → `design-text-resize.json`, `design-text-200-1440.png`, `design-text-200-390.png`; проверка bbox и реальных text-node rects отдельно.
- `scripts/design-check.mjs` владельца → исходный `design-baseline.json` и responsive screenshots.
- Safari/Firefox, реальный Android/iPhone, screen reader и публичный URL в этом раунде не проверялись. Финальная live-регрессия составляет следующий отдельный аудит.
- Во время checkpoint был краткий сбой shell-команд `exec-server transport disconnected`; следующая команда прошла. Среда снова доступна, данный сбой не является текущим блокером.
