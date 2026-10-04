# Независимый аудит 1 — код, корректность и безопасность v10

Аудитор: отдельный Codex agent `/root/v10_code_audit`. Дата: 2026-10-04. Исходники сайта не изменялись аудитором; созданы только собственные скрипты и доказательства в `qa-private/v10/`. После основного прогона выполнено дополнение по интеграции Keyform, исправлению README и восстановившемуся npm advisory API; актуальный итог приведён в конце.

## Объект и границы

Проверены `index.html`, `src/main.ts`, `src/preferences.ts`, `src/rowline-sample.ts`, `src/fallback.ts`, `src/scene.ts`, `src/concise.css`, три словаря, настройки Vite и README. Основной браузерный прогон выполнен на production preview `http://127.0.0.1:5202/`, дополнительный — на собственном read-only preview той же папки `docs/` на порту 5212. Gallery в этом снимке: Helio, Framepack, Poslesvet; остальные пять проектов — в закрытом disclosure. Keyform ещё не интегрирован и этим аудитом не проверен.

Это фактически выполненные локальные проверки в установленном headless Chromium/Playwright с WebGL и эмуляцией размеров окна. Они не означают проверку физического телефона, Safari, screen reader, аппаратной производительности GPU, опубликованного v10 или доступности внешних серверов.

## Находки

1. **Средняя, корректность сведений: при сокращении образования исчез тип учреждения. Исправлена.** `v10.education` ранее сообщал «Astana IT University — выпуск 2026», хотя сохранённый проверенный ключ `s171` указывает «Колледж Astana IT University». Такое сокращение допускает неверное прочтение уровня образования. Рекомендация — вернуть «Колледж» в RU/KK/EN и статический RU. Root внёс исправление. Отдельный браузерный повтор на собранной версии подтвердил три исправленных текста: `audit-1/education-fix.json`.

2. **Низкая, документация: README описывал прежний способ загрузки и прежнюю галерею. Исправлена и подтверждена в дополнении.** Изначально абзац README:5 сообщал о загрузке 3D «при приближении» к секции, тогда как `main.ts:96–100` импортирует модуль только при открытом `#approach`; также был указан прежний состав галереи. Теперь README явно описывает раскрытие по запросу, Helio/Keyform/Poslesvet и шесть остальных проектов.

Критических и высоких находок в проверенном коде и поведении не обнаружено. Это не утверждение об отсутствии неизвестных уязвимостей зависимостей.

## Выполненные проверки

- **12/12 комбинаций:** RU/KK/EN × light/dark × 1366×768/390×844. Все текущие `data-i18n`, `data-i18n-nodes` и `data-i18n-attrs` сверены с соответствующим словарём; по 351 ключу, наборы ключей совпадают. Проверены реальное `html.lang` и применённая тема.
- Нет дубликатов DOM IDs и отсутствующих внутренних hash-целей. Все текущие `target="_blank"` ссылки содержат `noopener`. Для NeuralBrief отсутствует вымышленный demo/code.
- Во всех комбинациях открыты и закрыты все три featured и все пять secondary project disclosures. Явные кнопки закрытия возвращают фокус на свой summary; закрытие внешнего списка работает.
- На mobile проверены native menu через Enter, переход к experience, повторный переход по текущему hash, Escape, закрытие меню и восстановление фокуса. Системная тема действительно реагирует на runtime смену OS media preference в обе стороны.
- До раскрытия 3D основной маршрут запрашивает только локальные assets и не запрашивает scene chunk. Прямой `#approach` во всех 12 вариантах загружает реальный WebGL; проверены layer/data с переведённым описанием, wire mode, ArrowLeft/Home и signal при reduced-motion, затем явное закрытие с восстановлением фокуса.
- Свежий `#rowline` раскрывает внешний список. Дополнительная проверка подтверждает: несмотря на `document.activeElement === body` у нефокусируемого article, следующий Tab идёт к ссылке Rowline, а не в начало header. То же после sample-case перехода. Поэтому это не зарегистрировано как дефект фокуса.
- **4/4 краевых сценария:** недопустимые/malicious значения preferences безопасно сбрасываются; заблокированный localStorage не мешает переключать язык/тему в текущем посещении; повреждённый percent-encoded hash не вызывает исключение; принудительно отсутствующий WebGL включает честный 2D fallback с рабочими mode-кнопками.
- Дополнительно реально вызван `WEBGL_lose_context`: canvas скрывается, статус становится fallback, mode Solid остаётся рабочим; uncaught page errors отсутствуют.
- `npx tsc --noEmit` завершён с кодом 0. Повторная сборка сайта не выполнялась аудитором, чтобы не менять production output параллельно с root.

## Проверка безопасности и ограничение advisories

В проверенных source paths нет `eval`, `new Function`, `innerHTML`, `outerHTML` setter или пользовательского HTML-ввода. Переводы устанавливаются через `textContent` и разрешённые статические attribute bindings. Hash используется в `getElementById`, percent decoding защищён `try/catch`; CSS/HTML из hash не строится. Preferences проходят allowlist для языка и темы; чтение/запись необязательного хранилища защищены. Rowline mini-example использует фиксированные искусственные строки и локальный Blob export, object URL освобождается. Не найдено нового network API, формы отправки, аналитики или динамического third-party script в reviewed paths.

Изначально `npm audit --omit=dev --json` не завершился: `ENOTFOUND registry.npmjs.org`. Один разрешённый сетевой повтор с отдельным cache в workspace дал тот же DNS-блокер; на этом этапе advisories не были проверены. После восстановления сети выполнен ещё один, отдельно запрошенный root запуск — успешный; точный результат и границы приведены в дополнении ниже. Lockfile фиксирует runtime Three 0.186.1 и Onest 5.3.1.

Публичные HTTP-статусы demo/repo/release URL этим аудитом не проверялись. Проверены DOM destinations и параметры безопасности ссылок; внешняя reachability и клики по живому v10 относятся к финальному live QA.

## Доказательства и воспроизведение

- `audit-1/report.json`: 12 matrix cases + 4 edge cases, время старта 2026-10-04T15:24:41.114Z, SHA-256 проверенных source/build файлов. Все 12 и 4 case имеют `passed: true`.
- `audit-1/extra.json`: отдельный подтверждённый пробег hash/Tab и context loss на 5212.
- `audit-1/education-fix.json`: три исправленных текста образования в актуальной сборке.
- Скрипты: `audit-1-probe.mjs`, `audit-1-extra.mjs`, `audit-1-education.mjs`.

Основной прогон до исправления текста образования проверял `docs/index.html` SHA-256 `93b01df8e94b2efc99df3da7fda22564fe93a1876deb4ff71f701c42ae163140` и `src/main.ts` SHA-256 `563cea69020bcedfd9d87af6d72d42e60b9d9945560f03198ee1af0cfc148b0a`. Новый HTML hash после исправления записан в education-fix evidence.

Первый вариант собственного test harness ошибочно проверял media-change synchronously до доставки `matchMedia change`; эти результаты сохранены отдельно в `audit-1/report-initial-race.json` и не трактуются как баг продукта. Harness исправлен ожиданием фактического состояния, после чего полный прогон прошёл. После transport interruption локальный 5202 временно завершился; единственный несостоявшийся extra-run не считается проверкой, затем выполнен успешный независимый повтор на 5212.

## Вывод

Основной прогон не обнаружил блокирующих code/security дефектов. Исправление college подтверждено в браузере. Найденная документационная регрессия закрыта дополнением ниже.

## Дополнение: Keyform, README и runtime advisories

Время browser delta: **2026-10-04T15:40:45.559Z**. Не повторялась вся матрица: выполнены три целевых кейса RU/KK/EN на 1366×768, light/reduced-motion, production preview 5202. **3/3 прошли**, page errors отсутствуют.

- Галерея содержит ровно **Helio / Keyform / Poslesvet**; закрытый дополнительный список — ровно **Framepack / Shapecheck / Rowline / Atyrau / NeuralBrief / Art Portal**. Framepack доступен, его demo и code сохранены. Текст «ещё 6» соответствует составу во всех трёх языках; duplicate IDs и отсутствующих внутренних целей нет.
- Keyform demo — `https://moyisey.github.io/keyform/`; code — `https://github.com/MOYISEY/keyform`; checks — точный run `https://github.com/MOYISEY/keyform/actions/runs/37212437733`. Demo проходит проверку browser actionability; disclosure открывается и закрывается с восстановлением фокуса. Code/CI имеют `target=_blank` и `noopener noreferrer`.
- Keyform benefit, disclaimer и alt сверены с соответствующими RU/KK/EN словарями. Реальная картинка загружается без ошибки, intrinsic size 1440×1026; disclaimer сохраняет ограничение схематичной внутренней компоновки и не обещает совместимость реальных деталей.
- README теперь указывает реальную gallery, шесть остальных проектов и загрузку 3D **только после раскрытия**; прежнее утверждение о proximity-loading отсутствует. Находка 2 закрыта.

**Read-only HTTP verification** в 2026-10-04T15:40:59.331Z: demo, repo и точный CI URL вернули HTTP **200** без подмены конечного URL. GitHub API подтвердил run 37212437733 в `MOYISEY/keyform`, `status=completed`, `conclusion=success`, `head_sha=11fe1bc0f7c1626a7404bccd59a51ba6528436d5`, совпадающий с provenance проекта. Это проверка интеграционных ссылок, не повтор функционального аудита самого Keyform.

После восстановления сети ровно один дополнительный запуск `npm audit --omit=dev --json --cache qa-private/v10/npm-audit-cache` завершился **exit 0**. Ответ registry: **0 известных advisories** во всех категориях для проверяемого runtime dependency scope, `vulnerabilities={}`. Ответ сохранён в `audit-1/npm-audit-runtime.json`. Это состояние npm advisory database в момент запроса; dev dependencies исключены, отсутствие неизвестных уязвимостей или гарантия безопасности не заявляются. Первоначальный DNS-блокер для этого runtime scan снят.

Доказательства: `audit-1/delta-keyform.json`, `audit-1/keyform-network.json`, `audit-1/npm-audit-runtime.json`; скрипты `audit-1-delta.mjs` и `audit-1-link-network.mjs`. Проверенный delta `docs/index.html` SHA-256: `f2310b36ce7a738ae4a7946bc032c4f8d4b62c54cb58df4ac496f45760043987`; README SHA-256: `342e54dd63092f9aeb7bd3d2f6c9eab2286501c0d0fab1575e62af160a3d9882`.

**Актуальный итог:** обе зарегистрированные находки закрыты; Keyform интеграция проверена целевым delta, runtime advisory scan успешно выполнен. Новых блокирующих code/security дефектов не обнаружено. Финальная визуальная регрессия и клики по опубликованному v10 остаются областью следующих аудитов, а полный внешний live QA остальных проектов этим дополнением не выполнялся.
