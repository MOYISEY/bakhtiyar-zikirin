# Раунд 3 — финальная регрессия и live QA

Дата: 2026-10-01. Независимый Codex-подагент: `audit_live_final`. Проверяемый публичный сайт: https://moyisey.github.io/bakhtiyar-zikirin/ . Репозиторий: https://github.com/MOYISEY/bakhtiyar-zikirin .

Первые live-проверки выполнены для product commit `a4e4a5f7edd649a1de3efcab5a5ac3e98132b193`. Найденные в этом раунде продуктовые замечания исправил владелец задачи и опубликовал в commit `b62d5f84c8b611819beab63a1210edc4fd43911e`. Родительский агент подтвердил Pages build этого commit в 15:36:32 UTC. Независимая целевая live-перепроверка исправленной сборки — `audit3-live-fixed.json`, начиная с 15:38:51 UTC; финальная перепроверка ссылок и back navigation — `audit3-live-recheck-final.json`, начиная с 15:41:57 UTC.

## Объём независимого ревью

Прочитаны README, package.json, Vite config, src/main.ts, src/scene.ts, src/fallback.ts, src/style.css, .gitignore, собранный docs/index.html, первые два аудита и safety scan. AGENTS.md в проекте и непосредственно проверенных родительских каталогах не найден. Подагент не менял product-код, Git или настройки публикации; добавлял только диагностические scripts и evidence.

Относительная base `./` и относительные ссылки assets совместимы с подпапкой Pages. Динамический 3D-модуль отделён от основного HTML. Факты проектов и границы их проверки описаны в README; вымышленных метрик, клиентов, отзывов и уровня должности нет. В проверенном product-коде отсутствуют формы отправки и пользовательский ввод для innerHTML; его значения — авторские статичные строки. Внешние ссылки используют noopener/noreferrer; код и шрифты поставляются локально.

## Найдено, исправлено и перепроверено

1. **A3-01 / P2 — двухпальцевое вращение не работало.** Live CDP touch gesture сохранял canvas hash без изменений. В source было `controls.touches.TWO = THREE.TOUCH.ROTATE`. В установленном OrbitControls switch для двух указателей обрабатывает DOLLY_PAN и DOLLY_ROTATE, но не ROTATE. Владелец заменил значение на DOLLY_ROTATE при сохранённом enableZoom=false. Финальная проверка на опубликованной сборке: canvas hash изменился с `08f6b475…` на `813248c5…`; последующий однопальцевый свайп прокрутил страницу **0 → 358 px**. Устранение ошибки не заблокировало обычную прокрутку.

2. **A3-02 / P3 — статичный fallback не объяснял недоступность 3D.** Старый status сообщал только «Этюд № 01 / статичный вид». Владелец заменил его на «3D не запустилось / статичный вид». Live проверка при искусственно недоступном WebGL на 320 px подтвердила новый текст, видимый still image, скрытый canvas без tabindex и отключённые controls. scrollWidth=320, axe violations=[], screenshot сохранён и просмотрен.

Неразрешённых воспроизводимых продуктовых ошибок в выполненном объёме этого раунда не осталось.

## Базовая регрессия на публичном URL

`scripts/qa.mjs` был запущен один раз с prefix `audit3-live`. Исходный отчёт честно сохраняет **15 pass / 2 timeout**, а не переписан как безусловные 17/17. Подтверждены:

- reduced-motion начинает сцену на паузе; два canvas screenshot hash совпали;
- Форма, Каркас и Разобрать дают три разных изображения и корректный aria-pressed;
- Pause/Resume меняют состояние и фактическое изображение;
- клавиатурные стрелки вращают сцену, Home возвращает исходный вид; mouse drag работает;
- CTA и три header anchors переходят к своим разделам; footer «Наверх» и оба логотипа ведут в #top;
- все три этапа NeuralBrief меняют содержание и выбранное состояние; details открывается и закрывается;
- первый Tab достигает skip link, Enter передаёт активный focus в MAIN#main;
- WebGL context loss, отсутствие WebGL при initialization и блокировка optional scene chunk оставляют рабочий статичный fallback;
- synthetic persisted pagehide/pageshow приостанавливают и возобновляют сцену;
- однопальцевый mobile swipe внутри canvas прокручивает страницу **0 → 209 px**.

Оба исходных отрицательных результата исследованы отдельно:

- **Back navigation:** первоначальный `goBack({waitUntil:'load'})` достиг URL портфолио, но ожидание load истекло. В двух изолированных перепроверках `waitUntil:'commit'` подтвердил реальный возврат, `pageshow.persisted=true` и рабочую кнопку Каркас; ошибок JavaScript нет. В отличие от synthetic lifecycle test, здесь действительно наблюдалось принятие страницы в bfcache. Владелец обновил ожидание в qa.mjs; полный базовый набор после этой правки повторно не запускался.
- **Внешние ссылки:** исходный GitHub popup waitForURL истёк через 25 секунд. Первое отдельное исследование также остановилось на screenshot waiting for fonts, поэтому его результат сохранён как отрицательный. Финальная изолированная проверка успешно выполнила все три настоящих клика: Atyrau Tour, Art Portal и MOYISEY открылись в новых вкладках с точными ожидаемыми URL и реальными GitHub titles. Все три DOMContentLoaded прошли, requestFailures=[] и errors=[]. Дополнительные публичные HTTP-запросы дали 200 для каждого URL. Это самостоятельная успешная перепроверка, не замена сохранённых отрицательных прогонов.

## Адаптация, доступность, ресурсы и движение

`audit3-live-extra.json`: live страницы HTTP200 с правильным title; axe WCAG2A/AA и WCAG2.1AA на **1440, 390 и 320 px** — violations=[] во всех трёх случаях. Во всех scrollWidth равен viewport width, clipped text/control boxes=[]. Подагент просмотрел реальные full-page screenshots 1440 и 320 px: имя, 3D, NeuralBrief, проектные строки, подход и связь сохраняют порядок и читаемость; перекрытия и горизонтальный клиппинг не обнаружены.

При JavaScript disabled на 390 px сохраняются имя, текст, GitHub ссылки, still image, переход к связи и native details. Неактивные 3D controls и этапы схемы скрыты. Переполнения нет.

Инструментирование WebGL draw calls подтвердило: при работающей анимации они растут; после реального скролла сцены вне viewport прирост **0**, после возврата снова растут. При synthetic document.hidden=true прирост **0**, после synthetic visibilitychange возврата снова растут. При смене media preference на reduced-motion прирост **0**, aria-pressed=true. Проверка состояния hidden является synthetic branch test, а не фактическим переводом вкладки в фон.

На первой публикации независимо сравнивались remote/local SHA-256 HTML, favicon, still image, основного JS и CSS — все совпали. На исправленной публикации совпали HTML и оба JS-файла: `assets/index-pQRW49da.js`, `assets/scene-Cl0X3otF.js`. HTML SHA-256 исправленного деплоя: `56ad8100d6fd547f80f1b50a58d75c5303ddc1957891217f18ba5c6a44f6db27`. Следовательно, целевые проверки выполнялись для опубликованного product-кода, соответствующего локальной сборке, а не локального dev server.

При normal-motion отдельно проверено завершение плавной header-навигации: work/about/contact из реально видимого header после instant scrollTop, а также about/contact через locator autoscroll из нижней части work. Все пять действий дождались нужного heading в viewport и правильного hash. Короткие ранние снимки на незавершённой smooth-scroll анимации не трактуются как доказательство ошибки навигации.

В базовом, дополнительном и исправленном live-прогонах собранные pageerror=[] и HTTP responses >=400 отсутствуют. В extra-прогоне requestFailures=[]; финальные popup diagnostics тоже без request failures. В первоначальных scripts полный журнал консоли не собирался. Владелец позднее выполнил отдельную заключительную live-проверку console на desktop/mobile с режимами сцены и Pause/Resume (`live-console-final.json`, 15:52:28 UTC): console.error=[], pageErrors=[], failedRequests=[], badOwnResponses=[], HTTP200. Desktop сохранил одно предупреждение Three.js от компилятора шейдера X4122 о точности сумм с очень малыми величинами; mobile console пуст. Предупреждение не скрывалось; утверждение об отсутствии всех console messages не делается. Desktop fonts в одном раннем layout snapshot ещё имели status=loading; mobile snapshots — loaded. Полевые Web Vitals и скорость на реальных устройствах в этом раунде не измерялись.

## Направленный визуальный обход владельца задачи

Дополнительно прочитан `manual-live-log.json`: **42 записанных события** на desktop 1440 px и mobile 390 px. Владелец задачи последовательно отправлял клики, drag, клавиши и swipe в настоящий браузер на публичном URL и осматривал screenshots. Журнал включает режимы 3D, Pause, drag/ArrowRight/Home, CTA, все этапы NeuralBrief, details, навигацию, GitHub ссылки и возврат наверх; собранные JS errors=[]. Это отдельный agent-directed обход, а не работа человека на физическом устройстве.

Этот журнал сохраняет два timeout внешних вкладок; они не объявлены там успешно загруженными. Их успешно загруженные URL/titles подтверждает отдельный финальный link recheck данного подагента. Некоторые снимки навигации в журнале сделаны до завершения плавной прокрутки; для desktop эту неопределённость сняла описанная выше целевая normal-motion проверка. Родительский агент также сообщил о независимом облачном визуальном обходе и проверке трёх GitHub ссылок; этот факт отделён от локальных browser scripts.

## Основные доказательства

- `audit3-live-qa.json`: исходный набор 17 сценариев с двумя сохранёнными timeout.
- `audit3-live-extra.json`: live axe/responsive, resources integrity, no-JS, draw-loop и первоначальная отрицательная two-finger проверка.
- `audit3-live-recheck-initial.json`: первая отрицательная link диагностика и успешный actual bfcache check.
- `audit3-live-fixed.json`: четыре целевых проверки исправленного деплоя, все pass.
- `audit3-live-recheck-final.json`, `audit3-live-link-diagnostics-final.json`: финальные успешные ссылки и actual bfcache.
- `audit3-live-1440.png`, `audit3-live-390.png`, `audit3-live-320.png`, `audit3-live-no-js.png`, `audit3-live-fixed-fallback-320.png`, `audit3-live-fixed-mobile.png`, `audit3-live-normal-motion-contact.png`, `audit3-live-link-0.png` / `1.png` / `2.png`.
- `manual-live-log.json` и `manual-*.png`: отдельный направленный обход владельца задачи.

## Ограничения

Локальные live scripts использовали Chromium headless с `--enable-unsafe-swiftshader`, разрешающим software fallback. Это не флаг принудительного SwiftShader; фактический renderer в исходных прогонах не записывался. Заключительный live-прогон владельца явно получил ANGLE / NVIDIA GeForce RTX 3050 Laptop GPU / Direct3D11 для desktop и mobile (`live-console-final.json`). Интерактивная 3D подтверждена в WebGL на этом браузере. Mobile — Chromium touch/device emulation и CDP, не реальный Android/iPhone. Firefox, Safari, screen reader, физическая клавиатура/сенсорный экран и другие GPU/драйверы не проверялись. В облачном браузере родителя WebGL был недоступен, поэтому он подтвердил статичный fallback и обычный интерфейс, но не интерактивное 3D. Отключённые кнопки в этом состоянии намеренны: ими нельзя управлять статичным изображением; финальный status объясняет это пользователю.

Первая sandbox browser-команда вернула ERR_NETWORK_ACCESS_DENIED до сценариев. Повтор с разрешённым сетевым исполнением прошёл; это был доступ среды, а не неисправность публичного сайта. В течение данного раунда последующие команды и файлы успешно выполнялись и сохранялись. Подагент не создавал credentials и не менял security-настройки компьютера.
