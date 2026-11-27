# Вкусы страны

Вёрстка сайта «Вкусы страны» под Битрикс.
Макет: https://www.figma.com/design/rwR6Lnn3nbubN02pxBrrVF/%D0%92%D0%BA%D1%83%D1%81%D1%8B-%D1%81%D1%82%D1%80%D0%B0%D0%BD%D1%8B?node-id=0-1

Сборка основана на шаблоне desisan.
Шаблонизатор — Nunjucks, стили — Sass (БЭМ), JS — Webpack.

## Запуск

- `npm ci` — установка версий из lock-файла (Node.js 22.13+).
- `npm run dev` — сборка, BrowserSync и наблюдение за файлами.
- `npm run prod` — production-режим, также с сервером и наблюдением.
- `npx gulp build` — разовая development-сборка.
- `npx gulp build --prod` — разовая production-сборка.
- `npm run qa:v2` — браузерная проверка собранного `dist`: семь страниц на
  12 ширинах, ресурсы, слайдеры, календарь и FAQ. Нужен установленный Chrome
  или Chromium; при необходимости путь задаётся переменной `CHROME_PATH`.
  Для снимков 28 основных экранов задайте `QA_SCREENSHOTS=1`; команда
  `node scripts/qa-v2-overlays.mjs` затем создаст наложения, если локально
  доступны эталоны `.figma/shots`.

## Структура

- `src/*.html` — страницы Nunjucks.
- `src/html/layouts` — базовый шаблон.
- `src/html/includes` — переиспользуемые блоки (шапка, подвал, модалки).
- `src/data/data.json` — данные, доступные в каждом шаблоне.
- `src/assets/styles/main.sass` — точка входа Sass, отдельные файлы блоков, БЭМ.
- `src/assets/styles/libs` — стили библиотек, собираются отдельно.
- `src/assets/js/app.js` — JavaScript; сборка через Webpack.
- `src/assets/img`, `fonts`, `video` — ресурсы.
- `dist` — результат сборки, очищается перед полной сборкой.

В dist также копируются исходные шаблоны (`html`) и исходный JS (`assets/js/raw`).
JPG, PNG, GIF конвертируются в WebP с качеством 80, оригиналы сохраняются.
Development включает source maps; production — Autoprefixer и сортировку media queries.
CSS не минифицируется. JS проходит через Terser без mangle и compress, с beautify.

## Статус

Стартовая структура: сборка и шаблоны подготовлены, вёрстка страниц
выполняется по макету Figma. Демонстрационные данные заменяются данными Битрикс.

## Контракт адаптивности

- Минимальная поддерживаемая ширина — **360 CSS px**: на 360–1920 горизонтального
  overflow нет (`document.documentElement.scrollWidth === innerWidth`).
- 320 px — fallback ниже минимума макета (минимальный frame Figma — 375):
  контент доступен через горизонтальную прокрутку body, ничего не обрезается.
- Композиции макета: 375 / 768 / 1280 / 1920. В промежутках высоты ключевых
  карточек интерполируются (`clamp()`), без скачков на границах диапазонов.
- Интеграция с Битрикс (PHP-шаблоны, инфоблоки, AJAX-контракт) вне текущего
  объёма: точки интеграции — `window.TastesIntegrations`
  (`submitDiscount`, `setCity`, `loadWeek`), данные — fixture в `src/data/data.json`.
