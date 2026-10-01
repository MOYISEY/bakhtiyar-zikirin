# Раунд 3 — независимая финальная регрессия и live QA

Аудитор Codex `v2_audit_live`, 1 октября 2026, 19:08–19:25 UTC. Проверен публичный сайт https://moyisey.github.io/bakhtiyar-zikirin/ после публикации продуктового commit `19dd89c3922f76a2697cf94b1bc552d21de53183`. Продуктовые файлы аудитор не изменял. Проверки v1 не включены в результат этого раунда.

Итог: все 15 предусмотренных live-сценариев имеют успешное выполнение, один — после отдельного целевого повтора. Первоначальный запуск дал 14/15; неуспешный WebKit/mobile результат сохранён. Подтверждённых блокирующих дефектов продукта не обнаружено. Две нестабильности автоматизированного захвата/ожидания описаны ниже и не скрыты.

## Подтверждение опубликованной версии

В 19:08:57 UTC публичный HTML вернул HTTP 200, содержал «Пишу интерфейсы» и `theme-color=#f3f0e8`. В трёх настоящих браузерных движках проверены тот же заголовок и светлая палитра. В отдельном live-сценарии Chromium публичные entry JavaScript и CSS совпали побайтно с текущей продуктовой сборкой `docs/`; SHA-256 и размеры сохранены в [live-targeted/chromium.json](live-targeted/chromium.json). Полная сверка опубликованных 15 файлов с product commit выполнена основным агентом отдельно: [publication-product.json](publication-product.json).

## Матрица браузеров

Использованы реальные установленные движки на подключённом Windows-компьютере: Chromium 153.0.8010.12, Firefox 155.0, Playwright WebKit 26.6. Desktop — 1440×1000, mobile — viewport 390×844 с `hasTouch`; mobile является эмуляцией viewport/input, а не физическим телефоном. Матрица запущена с `prefers-reduced-motion: reduce`.

| Движок | Desktop | Mobile | Без WebGL | Без JavaScript | Отказ загрузки 3D chunk |
| --- | --- | --- | --- | --- | --- |
| Chromium | PASS | PASS | PASS | PASS | PASS |
| Firefox | PASS | PASS | PASS | PASS | PASS |
| WebKit | PASS | PASS после целевого повтора | PASS | PASS | PASS |

Первый результат: [live/summary.json](live/summary.json). Единственный целевой повтор без изменений продукта, `force` или обхода обработчиков: [live-webkit-mobile-retry/summary.json](live-webkit-mobile-retry/summary.json).

Каждый завершённый обычный desktop/mobile сценарий содержит 46 записанных действий. Через браузерные клики проверены три вида схемы и различие их изображений, три слоя и тексты, «Проследить клик», reset, включение движения и pause, мышиное вращение, ArrowLeft/Right/Up/Down и Home, три шага NeuralBrief, открытие/закрытие трёх `details`, все внутренние ссылки включая footer/top, загрузка реального снимка кампус-тура, все четыре внешние ссылки с настоящими вкладками GitHub. Для внешних вкладок проверен `window.opener === null`. Skip link переносит фокус в `main`. Начальная ширина документа не превышает viewport. В завершённых обычных сценариях не зарегистрированы `pageerror`, `console.error` или неожиданные `requestfailed`.

Настоящая навигация на контрольную страницу и браузерный Back возвращают работающие кнопки. Только Chromium в этих live-запусках показал `pageshow.persisted=true`; Firefox/WebKit показали `false`. Для последних двух не заявляется подтверждённое попадание в bfcache.

В сценариях без WebGL и при намеренно заблокированном 3D chunk сохраняются 2D-схема, все три кейса, режимы, слои, signal и нативные раскрывающиеся блоки; 3D-only кнопки скрыты. Без JavaScript видны текст, 2D-схема и кейсы, работают нативные `details`, JS-кнопки скрыты. Нет пустой панели вместо смыслового содержимого.

## Дополнительные целевые live-проверки

[live-targeted/summary.json](live-targeted/summary.json) — PASS в трёх движках:

- Четыре последовательных PNG paused-canvas совпали по SHA-256 в каждом движке. Включён reduced motion, кнопка показывает паузу; содержание доступно.
- При ширине 320 px и при ширине 390 px с CSS root font size 200% документ не выходит за viewport. Это проверка увеличения текста CSS, а не browser zoom.
- В публичном DOM нет формы, `mailto:`, PDF/CV-ссылки или строки email. Все внешние ссылки ведут на GitHub и имеют `noopener noreferrer`. Это проверка наблюдаемого публичного DOM, а не утверждение об исчерпывающей проверке любых данных репозитория.
- Снимок кампус-тура загружается с реальной шириной 1200 px. На публичной странице он прямо подписан как снимок локального запуска, а схема Art Portal — как схема по моделям, без заявления о работающей live-версии проекта.

Реальные public PNG просмотрены визуально: desktop hero Chromium/Firefox/WebKit, mobile Chromium/WebKit, Chromium 2D fallback, отдельные кейсы Атырау и Art Portal, native canvas и обычный viewport после возврата к сцене. Светлый фон, акценты, тексты, три уровня модели, контролы, честные подписи визуальных материалов и композиция отображаются. WebKit рисует некоторые веса шрифта тоньше; ошибки загрузки кириллического заголовка не подтверждены.

## Наблюдения, перепроверка и ограничения

### Неподтверждённый transient: WebKit/mobile click timeout

Первый запуск остановился после успешных режимов, слоёв, signal, keyboard, drag и reset: Playwright 12 секунд ожидал `#motion-toggle` visible/enabled/stable. В этом контексте не было JS/network/console errors; исходный JSON сохранён: [live/webkit-mobile.json](live/webkit-mobile.json). Матрица закрыла контекст в `finally`, поэтому состояние видимости или context loss именно в момент первоначального timeout уже недоступно; причина не установлена.

Полный целевой WebKit/mobile повтор прошёл все 46 действий. Дополнительная точная последовательность с диагностикой также прошла: [live-diagnostic/webkit.json](live-diagnostic/webkit.json). До/после drag, reset, enable/pause кнопка была видима с размером 44×44, canvas виден, 3D status сохранён, WebGL context loss не зарегистрирован. Это подтверждает работоспособность повторных сценариев, а не задним числом объясняет первоначальный timeout.

### Нестабильный screenshot capture после прокрутки

При больших element/full-page снимках и возврате к сцене один Chromium диагностический запуск дал разные locator PNG. Ещё один запуск после простой прокрутки дал две чередующиеся SHA при неизменных viewport, bounds и RAF; обе картинки содержали модель. Исходные отрицательные результаты сохранены: [live-diagnostic/chromium.json](live-diagnostic/chromium.json), [live-canvas-return/result.json](live-canvas-return/result.json). Они не выдаются за успешные проверки.

В отдельной проверке контакт → сцена → 500 ms проверены непосредственно native `canvas.toDataURL`, обычный viewport и locator screenshot: четыре native PNG имеют одну SHA-256, четыре viewport PNG имеют одну SHA-256, четыре locator PNG также совпадают; RAF 4→4. Модель видна при визуальном просмотре native и viewport изображений. [live-canvas-buffer/result.json](live-canvas-buffer/result.json), [live-canvas-buffer/viewport-0.png](live-canvas-buffer/viewport-0.png). Таким образом, подтверждённой потери модели или продолжающегося движения в drawing buffer нет; поведение захвата не следует использовать как доказательство пустого пользовательского экрана. Причина transient нестабильности screenshot pipeline не установлена.

### WebKit fonts и console

В раннем WebKit диагностическом контексте math-subset Onest имел `status=error`; кириллица и латиница были loaded. Отдельная проверка [live-fonts/webkit.json](live-fonts/webkit.json) получила HTTP 200 для четырёх потребованных woff2, без failed requests; Cyrillic, Latin, Symbols и Math имеют loaded. `document.fonts.load` для русского h1 вернул Cyrillic/Latin loaded, `document.fonts.check` прошёл, computed weight — 550. В console только предупреждение Three/D3D X4122 о точности чисел; font-decode warning и console error отсутствуют. Эти факты не подтверждают дефект кириллического шрифта.

Этот раунд не является проверкой настоящего Safari, физического iOS/Android устройства, screen reader, всей WCAG или production-нагрузки. UA Playwright WebKit содержит слово Safari, но результат по-прежнему относится только к WebKit. Axe повторно не запускался: его результаты относятся к независимому второму аудиту. Отдельная направленная проверка основного агента с кликами, клавиатурой, normal motion и CDP touch сохранена в [manual-live-qa.md](manual-live-qa.md) и [manual-live-log.json](manual-live-log.json); она не выдается за физические устройства или собственные действия этого аудитора.
