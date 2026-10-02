# Регрессия версии 6

Исходная версия: `26fdb668389d7ba8deeaf538ca64c2a96a2fb4fb`. Новый scope — иерархия, реальные артефакты и приоритет работающих проектов. [Причины изменений](baseline-and-comparison.md), [независимый code-аудит](audit-1-code.md), [независимый design-аудит](audit-2-design.md), [проверка казахского текста](translation-review.md).

## Финальная локальная production-сборка

`npm run build` прошёл TypeScript и Vite. Проверенные assets: `index-BZvi39jK.css`, `index-DNTgf5wF.js`, `scene-DrAFHNv9.js`. HTML SHA-256 `f3207d1451c23e3ba726c844ae78615b88899b933aa9dafeae37c6c76afd294a`.

| Проверка | Фактический объём | Результат / доказательство |
| --- | --- | --- |
| Языки и темы | RU/KK/EN × light/dark × desktop1440/mobile390; все режимы/слои 3D, сигнал, keyboard/reset/pause, brief steps, четыре раскрытия, preferences/reload | 12 PASS; [matrix-local.json](matrix-local.json), axe WCAG + best-practice: 0 violations |
| Узкие и tablet размеры | 360/390/768 px × три языка × две темы, touch без hover, 3 trim/undo цикла, два исправленных экспорта и экспорт исходного значения, state при смене настроек | 18 PASS; [sample-reflow-local.json](sample-reflow-local.json) |
| Увеличенный текст | 320 px, root font 200%, все шесть языков/тем; локальная прокрутка таблицы, геометрия ячеек, отсутствие page overflow | 6 PASS; [text-resize-local.json](text-resize-local.json) |
| Edge/fallback | 6 forced-no-WebGL вариантов, no-JS light/dark, system theme/override, blocked storage, normal-motion/disabled/focus, aborted module | 12 PASS; [edge-local.json](edge-local.json) |
| Firefox / Playwright WebKit | RU/light/desktop и KK/dark/mobile в каждом engine: режимы/слои/steps/disclosures/preferences/reflow | 4 PASS; [engines-local.json](engines-local.json) |
| CSV в дополнительных engines | Реальные байты скачанного файла, undo, сохранение состояния при переводе, по desktop/mobile в Firefox и WebKit | 4 PASS; [sample-engines-local.json](sample-engines-local.json) |
| Ссылки и прежний PDF | Desktop EN/light и mobile KK/dark: реальные popup-вкладки, opener=null, demo content, PDF download bytes, mailto click interception | 2 PASS; [links-local.json](links-local.json) |
| Возврат наверх | Desktop1440/mobile390: переход к «Подходу», возврат и проверка сброса aria-current после layout/observer | 2 PASS; [navigation-return.json](navigation-return.json) |
| Ограниченный source scan | Deliverable text, четыре паттерна токенов/ключей/локальных путей; исключены private QA/tool dirs | [source-safety-scan.json](source-safety-scan.json), 0 findings; не полный scan истории Git |

Сценарии использовали фактические браузерные clicks/taps/keyboard и сохранение файлов. Отдельно просмотрены native viewport-снимки. [12 hero-снимков](screenshots/) и независимые before/after доказательства сохранены. Это не выдаётся за ручной тест на физическом устройстве или за свободное использование всех внешних приложений.

## Честные ограничения измерений производительности

[startup-performance.json](startup-performance.json): три чередующихся холодных запуска исходной и новой сборки на одном локальном gzip-сервере, Chromium390×844 RU/light, 150 ms latency, 1,6 Mbps down и CPU4×. До прокрутки 3D-chunk запрашивается в исходной версии и отсутствует во всех новых запусках.

Медианные переданные байты subresources: 274761 → 102907; суммарное время long tasks: 567 → 197 ms. LCP в этом небольшом лабораторном сравнении **не улучшился**: 940 → 1020 ms; CLS 0,0883 → 0,0954. Это не Lighthouse, не полевые Core Web Vitals и не обещание результатов на телефонах. Главный проверенный выигрыш — перенос тяжёлого renderer из стартовой загрузки.

## Внешний тур и отрицательная история

Первый link-check с 40 s readiness timeout не дождался panorama; [исходный отрицательный отчёт](initial-links-tour-timeout.json) сохранён. [Диагностика](tour-diagnostic.json) показала HTTP-страницу, загруженный Pannellum и прогресс первого изображения 1,57 / 6,12 MB без JS/network ошибок. Отдельный полный исторический smoke успел загрузить панораму и пройти четыре этажа, но не завершил следующий thumbnail в пределах40 s; [этот неполный результат](tour-initial-readiness.json) не засчитывается как полный PASS.

Повторный ограниченный integration-check активировал popup, использовал polling100 ms и максимум80 s: панорама фактически загрузилась на desktop и mobile, ссылки прошли. Код тура не менялся. Его крупные панорамы и CDN-зависимости остаются свойствами исторического проекта; внешние приложения не получили новый полный аудит безопасности/доступности.

Другие отрицательные результаты сохранены: [контраст matrix](initial-contrast-matrix.json), [контраст fallback](initial-contrast-edge.json), [caption overflow после исправления таблицы](initial-text-resize-after-table.json), [слишком ранний keyboard-scroll assert](initial-keyboard-scroll-timing.json). Последний исправлен ожиданием фактического native scroll в течение2 s, без изменения продукта. Старые v5 tour-артефакты восстановлены byte-for-byte после старого helper с жёстко заданным output; новые результаты находятся только в v6.

PDF не менялся: SHA-256 `566051b1e65dbfdf17982f0466948e2556157887f512b5db4d7bb248272060cb`. Даты IQadam сохранены без догадки; соцсети не редактировались. Фото Atyrau не возвращено. Playwright mobile/touch и WebKit не являются физическими телефонами/Safari; axe не заменяет screen-reader проверку.

Публичная регрессия и точный продуктовый commit зафиксированы в [post-deploy.md](post-deploy.md); там же указаны границы внешнего link-check и отдельная личная проверка заказчика.
