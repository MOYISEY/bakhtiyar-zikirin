# Сравнение оригинальных кадров

Просмотрены реальные PNG без редактирования. [Список 19 просмотренных файлов с SHA](visual-reviewed.json); все сохранённые кадры доступны в before, after и edges. Baseline и candidate сняты на одном Edge при одинаковом viewport. Перед сравнением размеров не масштабировать одну из сторон отдельно.

| Что сравнить | До | После |
|---|---|---|
| Desktop dark: документы | [873.75 px](before/desktop-dark-documents.png) | [392.92 px, один ряд](after/desktop-ru-dark-documents.png) |
| Touch light: документы | [1200.28 px](before/touch-light-documents.png) | [441.52 px, целая карточка](after/touch-ru-light-documents.png) |
| Desktop light: типографика | [главная](before/desktop-light-hero.png) | [главная](after/desktop-ru-light-hero.png) |
| Touch light: типографика | [главная](before/touch-light-hero.png) | [главная](after/touch-ru-light-hero.png) |

Дополнительно просмотрены: [desktop light документы](after/desktop-ru-light-documents.png), [touch dark документы](after/touch-ru-dark-documents.png), [dark EN hero](after/touch-en-dark-hero.png), [320 px normal motion](edges/320-ru-dark-no-preference.png), [без JavaScript](edges/390-ru-light-nojs.png), [760 px](edges/760-en-dark-no-preference.png). Нет обрезанных изображений или текста и общей горизонтальной прокрутки. Высота mobile определяется самой высокой карточкой, поэтому у коротких карточек остаётся часть пустого места; это обеспечивает стабильную высоту при переключении.

Подписи Helio: [обычная версия KK](after/touch-kk-light-notes.png), [room EN desktop](after/room-desktop-en-notes.png), [room RU touch](after/room-touch-ru-notes.png). Подписи не перекрывают друг друга, остаются внутри превью, контент читается без перехода в демо. Показан раскрытый по действию пользователя вариант; по умолчанию подписи закрыты. [Книга опыта KK](after/room-desktop-kk-book.png) сохраняет отдельные записи iQADAM 2025/2026; ниже окна остаётся обычная прокрутка. Референсные Library-пиксели не получены, это воспроизведение реального сайта по разрешённому fallback.
