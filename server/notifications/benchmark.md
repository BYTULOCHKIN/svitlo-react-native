# Cloudflare/D1: 100 тестових інсталяцій

11 жовтня 2026 року. Тестовий Worker `svitlo-notifications-benchmark` та окрема D1 `svitlo-notifications-benchmark`; production-історія й токени Samsung не змінювалися. Немає cron або публічних fixture-маршрутів у основному Worker. Benchmark маршрути потребують окремого секрету та `ENVIRONMENT=benchmark`.

## Метод

100 синтетичних інсталяцій із різними UUID, hash секретів і незареєстрованими Expo-токенами. Приватний `/seed` очищує лише disposable benchmark D1; `/run` використовує справжні repository, D1 adapter, збереження графіка та dispatchPush. Усі 100 отримують різні картки history та цілі навігації.

Варіанти джерела: захоплена повна HTML-таблиця, повідомлення «відключення не прогнозуються», JSON поточного графіка, валідованого локальним Node. JSON не є доказом доступності джерела з Cloudflare. Успішний transport — окремий HTTP-запит до захищеного `/expo-mock`; він повертає 100 синтетичних tickets. Справжній Expo API окремо отримав один пакет із 100 незареєстрованих токенів та повернув HTTP 200 і 100 ticket-відповідей; accepted 0, rejected 100. Доставка на 100 фізичних пристроїв не заявляється; реальний Samsung push підтверджений окремо.

Для Worker-to-Worker HTTP потрібен `global_fetch_strictly_public`; до його ввімкнення mock-запит отримував 404, ці спроби не включено в успішні результати. Дублювання читання response через `clone()` видалено з benchmark, щоб не додавати зайву роботу до production-шляху.

## Виміряні результати

| Остаточний сценарій | REST-запитів | Повідомлень | SQL | D1 rows read / written | CPU time | Wall time |
| --- | --- | --- | --- | --- | --- | --- |
| JSON + успішний HTTP mock, 3 спостережені повтори | 1 | 100 | 9 | 17355 / 1105 | 9, 11, 15 ms | 327, 306, 307 ms у прикладному логу |
| Повна HTML-таблиця + mock, 3 спостережені повтори | 1 | 100 | 9 | 17355 / 1105 | 78, 34, 16 ms | 357, 295, 282 ms |
| «Без відключень» + mock, два CPU-спостереження | 1 | 100 | 9 | 17355 / 1105 | 8, 27 ms | 295, 308 ms |
| JSON + справжній Expo, усі токени синтетичні | 1 | 100 | 9 | 12504 / 1205 | Останній CPU sample не захоплено; попередній варіант — 21 ms | 481 ms |

CPU — поле `cpuTime` з реального Cloudflare tail, а не wall time або `dbMs`. CPU samples збережені для Worker version `59bd8b5a-0439-40a6-8e19-19056ac1f595`. Пізніші зміни лише захищають benchmark середовище; для нового висновку потрібні нові вимірювання. Під час оновлення Worker tail потрібно перепідключити й дочекатися `Connected`, інакше перші запити можуть не потрапити у файл.

9 SQL включають нове збереження snapshot: 1 кеш + 3 публікація + 5 dispatch. Весь пакет не перетворюється на 100 окремих SQL statements. Заміна runtime-компіляції вкладених схем на обмежену структурну перевірку зберегла захист від невідомих станів, неповних діб, некоректних ticket-відповідей та mismatch кількості. Regression-тести пройдені.

## Висновок

Цей висновок стосується попереднього варіанта, де обробка та push працювали всередині одного Worker. Новий погоджений Node/gateway варіант виміряно окремо нижче.

**Повний Cloudflare Free gate не пройдено.** [Free має 10 ms CPU на invocation](https://developers.cloudflare.com/workers/platform/limits/); і HTML, і частина JSON/100 результатів перевищують цей бюджет, хоча спостережені invocations завершувалися `ok`. Це не гарантує стійкості до ліміту. Не ввімкнено платний тариф. Для проходження gate потрібно перевірити зовнішнє отримання графіка та зменшити роботу одного invocation, наприклад відокремити публікацію від відправлення або обробляти менші пакети окремими invocations; зберегти своєчасність для всіх 100 користувачів.

Стан без подій із 100 інсталяціями та довга історія ще потребують окремого вимірювання. Поточні 17355 rows read — стартова історія однієї події. 1440 перевірок/день із одним snapshot-write — близько 2880 rows written лише кешем. Один виміряний fan-out — 1105 додаткових writes; це не добовий прогноз усіх змін і попереджень. [D1 Free](https://developers.cloudflare.com/d1/platform/pricing/) має 5 млн read / 100 тис. write rows на день і [50 SQL statements на invocation](https://developers.cloudflare.com/d1/platform/limits/).

## Відтворення

Конфіг окремої тестової бази: [wrangler.benchmark.jsonc](./wrangler.benchmark.jsonc). Не підставляти в нього production D1. На іншому акаунті створити власну disposable D1, підставити її ID та власну адресу benchmark.

```powershell
node.exe node_modules/wrangler/bin/wrangler.js d1 migrations apply svitlo-notifications-benchmark --remote --config server/notifications/wrangler.benchmark.jsonc
node.exe node_modules/wrangler/bin/wrangler.js deploy --config server/notifications/wrangler.benchmark.jsonc
node.exe node_modules/wrangler/bin/wrangler.js secret put BENCHMARK_RUN_TOKEN --config server/notifications/wrangler.benchmark.jsonc
```

Зберегти цей окремий секрет у локальному ігнорованому файлі, дочекатися підключення `wrangler tail`, потім:

```powershell
$env:SVITLO_BENCHMARK_URL='https://svitlo-notifications-benchmark.svitlonorify.workers.dev'
$env:SVITLO_BENCHMARK_TOKEN_FILE='.expo/notifications/benchmark-token'
npm.cmd run notifications:benchmark
```

Один повний прогін створює й скидає 100 інсталяцій десять разів, тому витрачає помітну частку щоденної write-квоти. Для перевірки лише зміненого JSON-шляху задати `SVITLO_BENCHMARK_SOURCES=json`, `SVITLO_BENCHMARK_EXPO=0`. Секрети, device-токени та сирі tail headers не додавати у звіт або Git; runner пише лише агреговані результати в `.expo/notifications/benchmark-results.json`.

## Погоджений Node backend + мінімальний gateway

11 жовтня 2026 реалізовано перенесення джерела, обробки, API застосунку й Expo transport на Node. Окремий `svitlo-notifications-storage-benchmark` розгорнуто з тим самим мінімальним [gateway-worker.ts](./gateway-worker.ts), що і production gateway, але прив'язано тільки до disposable D1. Нові таблиці завдань застосовані до обох баз; реальна історія та токени користувача не використовувалися для seed.

Перевірка [benchmark-node.ts](../schedule-relay/benchmark-node.ts) виконує Node → HTTP gateway → remote D1, використовує нормалізовану captured fixture й керований тестовий час, утворює початковий baseline, потім нову публікацію, mock Expo batch та повторний tick після створення нового backend instance. Production hostname відхиляється до очищення seed.

| Остаточний повтор | Gateway HTTP calls на публікацію | Expo requests / messages | Mock accepted / history targets | Wall time локального Node | CPU локального Node |
| --- | --- | --- | --- | --- | --- |
| 1 | 14 | 1 / 100 | 100 / 100 | 1493 ms | 47 ms |
| 2 | 14 | 1 / 100 | 100 / 100 | 1753 ms | 124 ms |
| 3 | 14 | 1 / 100 | 100 / 100 | 1742 ms | 63 ms |

У кожному повторі збережено рівно 100 карток для 100 інсталяцій, а replay був пропущений без нового Expo-запиту. Джерело, Node CPU і mock transport у цьому benchmark не є перевіркою Render або доставки на фізичні телефони.

З Cloudflare tail захоплено **36 gateway invocations** під час підготовки та двох серій вимірювань: усі `outcome: ok`, **CPU 0–3 ms**, медіана 1 ms, p95 2 ms. Tail захопив частину запитів; не заявляється покриття CPU кожної операції. Бізнес-логіки та Expo tickets у gateway немає. Це позитивний результат щодо нового кандидата, але **повний gate 02 залишається відкритим** до розгортання Render, фактичного cron/source/native тесту, перевірки холодного запуску, квот і довгої історії.

Окремий live smoke чистої Node-збірки з production gateway/D1 отримав живі графіки на 2026-10-11 та 2026-10-12 по 12 черг, цикл 2058 ms, `stale: false`, без старих публікацій. Це локальний Node, а не Render. [Налаштування та відтворення нового кандидата](../schedule-relay/README.md).
