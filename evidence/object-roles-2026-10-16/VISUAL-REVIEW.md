# Реальные сравнимые кадры

Baseline d53 → финальный candidate, одинаковые buffer/camera/projection, свет включён. Полные PNG без редактирования; все 20 кадров просмотрены в ходе финального QA. При исходной оценке контекстных подсказок использованы настоящие native-сценарии, не capture API. Материалы и принятая геометрия мебели, окна, коридора, свет/шнур сохранены; изменены роли wall prints и повторных документов.

| Ракурс | До d53 | После |
|---|---|---|
| desktop / desk | [Полный PNG](comparison/desktop-desk-before.png) | [Полный PNG](comparison/desktop-desk-after.png) |
| desktop / overview | [Полный PNG](comparison/desktop-overview-before.png) | [Полный PNG](comparison/desktop-overview-after.png) |
| desktop / cabinet | [Полный PNG](comparison/desktop-cabinet-before.png) | [Полный PNG](comparison/desktop-cabinet-after.png) |
| desktop / drawer | [Полный PNG](comparison/desktop-drawer-before.png) | [Полный PNG](comparison/desktop-drawer-after.png) |
| desktop / window | [Полный PNG](comparison/desktop-window-before.png) | [Полный PNG](comparison/desktop-window-after.png) |
| touch / desk | [Полный PNG](comparison/touch-desk-before.png) | [Полный PNG](comparison/touch-desk-after.png) |
| touch / overview | [Полный PNG](comparison/touch-overview-before.png) | [Полный PNG](comparison/touch-overview-after.png) |
| touch / cabinet | [Полный PNG](comparison/touch-cabinet-before.png) | [Полный PNG](comparison/touch-cabinet-after.png) |
| touch / drawer | [Полный PNG](comparison/touch-drawer-before.png) | [Полный PNG](comparison/touch-drawer-after.png) |
| touch / window | [Полный PNG](comparison/touch-window-before.png) | [Полный PNG](comparison/touch-window-after.png) |

## Native-проверка

- [Текст ошибки до исправления](touch-context-before/no-preference-ru-cube-hint.png): «Потяни вниз» при касании кубика.
- [Правильная RU-подсказка](touch-context/no-preference-ru-cube-hint.png), [KK-подсказка](touch-context/no-preference-kk-orbit-hint.png), [EN-подсказка](touch-context/no-preference-en-robot-hint.png): компактный контекст, второе касание открывает viewer.
- [Desktop шкаф](native/desktop-no-preference-cabinet.png), [touch документы на стене](native/touch-no-preference-wall-documents.png): постоянных крупных табличек нет.
- [Desktop CV hover](cv/1440-no-preference-hover.png): тихий 44px маркер и подсказка. Touch сохраняет явно названный PDF.
- [Книга RU desktop](content-matrix/desktop-ru-book-top.png), [книга RU touch, низ](content-matrix/touch-ru-book-bottom.png): три записи опыта и собственная навигация.
- [Обычные реальные документы KK touch](content-matrix/touch-kk-ordinary-documents.png). Остальные языки/кадры находятся рядом; overflow проверен автоматикой.

Полные автоматические результаты, ограничения и точные счётчики — [QA.md](QA.md). Визуальные выводы: рамки сохраняют mitred rails и пропорции настоящих документов, мебель/пол/свет без новых видимых пересечений; принятый большой daylight shadow сохранён. Cabinet/detail и узкий touch частично кадрируют боковые документы — нативные действия открывают их целиком; это не потеря или обрезка исходного изображения. Факты опыта и оригинальные публичные документы не менялись.
