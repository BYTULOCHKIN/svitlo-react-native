# Перевірка задачі 02

Статус: прототип розгорнуто у власному Cloudflare акаунті; /health і remote API/D1 smoke PASS. Власні EAS, Firebase Android і FCM v1 credentials підключено; реальний push, receipt `ok` і tap підтверджені на Samsung. 100 синтетичних інсталяцій виміряно в окремій remote D1. Cloudflare Free gate не пройдено: пряме джерело завершується таймаутом, частина CPU-вимірювань перевищує 10 ms. Публічний JSON графіка розгорнуто, Node relay підготовлено й перевірено локально; його хмарний провайдер ще не погоджено. iOS не перевірено, платний тариф не вмикався.

## Публічний графік та поточний блокер

Працює [GET /v1/schedules](https://svitlo-notifications-pilot.svitlonorify.workers.dev/v1/schedules), без installation credentials. За замовчуванням — поточна київська дата; `?date=2026-10-11` повертає саме збережений графік за цією датою. JSON містить `date`, усі `queues` та їхні інтервали, `verifiedAt` (Unix milliseconds) і `stale` після п’яти хвилин від останньої успішної перевірки. Межі інтервалів — хвилини від 00:00; стани `on`, `off`, `possible`. Регіональна відсутність відключень позначена `noOutagesScope=region` з порожнім списком черг. Недійсна дата — 400, ще не отримана дата — 404. GET читає D1, не запускає зовнішню перевірку й не змінює час свіжості.

11 жовтня 2026 розгорнуто Worker version `486dc3e9-0281-47ac-8dba-50c40be6eda9`, застосовано третю віддалену міграцію. Початковий кеш одноразово заповнено приватним локальним helper із живого валідованого джерела: 12 черг, 1 SQL, 2 rows written. Перевірено remote HTTP 200, усі черги 1.1–6.2, 400 некоректної дати, 404 відсутньої дати й 404 неавторизованого private publication route. Заповнення кешу не створювало нових подій або push. Це не виправлення автоматичного джерела з Cloudflare: без доступного relay наступні прямі cron-перевірки все ще завершуються таймаутом, а кеш чесно стає застарілим.

Для альтернативного джерела підготовлено [Node relay](../schedule-relay/README.md), lockfile, standalone bundle і [Render Free Blueprint](../../render.yaml). Worker підтримує HTTPS `SCHEDULE_RELAY_URL` та серверний secret `SCHEDULE_RELAY_TOKEN`; дата, повнота графіка й вік relay timestamp перевіряються повторно, timestamp зберігається без оновлення при помилці. Автоматичне підключення Render не виконано: потрібні погоджений провайдер, власний акаунт і Git-репозиторій; нинішній origin належить upstream-шаблону. Node-сервіс локально отримав живий графік, але cloud-доступ із Render ще не доведено. Не заявляється завершення задачі 02.

[Повний benchmark на 100 інсталяцій](./benchmark.md): один REST-пакет, 9 SQL разом із snapshot-write; 100 accepted mock tickets, реальний Expo — 100 відмов для синтетичних токенів. Остаточний спостережений JSON/mock CPU — 9, 11, 15 ms; повна HTML-таблиця — 78, 34, 16 ms. SQL-ліміт дотримано, CPU Free стабільно не підтверджено. Успішний invocation `ok` не скасовує висновок за documented 10 ms. Подальше зменшення роботи одного invocation має зберегти доставку всім 100 у потрібний час; повний добовий бюджет із довгою історією ще не виміряно.

Поточна валідація: TypeScript, lint і Worker dry-run PASS; 31 Jest suites / 147 tests PASS; 21 серверний інтеграційний тест PASS. Нові перевірки охоплюють публічний кеш, stale-стан без нового timestamp, відкладені старі writes, межі relay date/time, обмежений response stream, relay auth/cache/concurrency/source failure та некоректні Expo tickets без втрати history або сліпого retry.

## Підготовлена реалізація

- Expo Notifications: пояснення після першої черги, системний запит лише після кнопки, фактичний стан дозволу, OS settings, повторна реєстрація токена при поверненні в застосунок.
- Автентифікований `PUT /v1/delivery`: `permission` і необов’язковий `token`. При тимчасовій відсутності токена попередній зберігається; відмова ОС очищує його. Увімкнення push не надсилає старих публікацій.
- Історія й outbox створюються атомарно. Пакет до 100 повідомлень іде одним Expo REST-запитом, результати оновлюються двома SQL-запитами через `json_each`. D1 Free має [ліміт 50 SQL-запитів на invocation](https://developers.cloudflare.com/d1/platform/limits/).
- Claim перед зовнішнім запитом запобігає повторній відправці. `sent` означає Expo ticket, а не показ на телефоні. Невизначений результат стає `DeliveryUnknown` без сліпого повтору; reconciliation receipts і відновлення після аварій розширюються в задачі 14.
- Натискання push відкриває історію, виділяє й прокручує до власної картки в завантаженій сторінці. Пошук старих карток за межами першої сторінки розширюється в задачі 12. Дані push не відкривають довільні URL.
- Worker використовує спільний репозиторій та D1-міграції. Cron щохвилини перевіряє реальне джерело й обробляє outbox. Автоматичне створення публікацій сьогодні/завтра додається в задачі 03.
- Приватний `POST /pilot/publication` завантажує поточний реальний графік, перевіряє дату, повноту та стани, формує публікацію й відправляє push. Працює тільки з `ENVIRONMENT=pilot` і серверним `PILOT_RUN_TOKEN` довжиною від 32 символів. Без авторизації — 404; для production маршрут вимкнено. Тіло запиту не вставляє довільний графік.

## Локальне відтворення

Потрібні Node.js 24 і залежності проєкту. З кореня:

```powershell
pnpm notifications:test
pnpm notifications:worker:check
pnpm exec wrangler d1 migrations apply svitlo-notifications-pilot --local --config server/notifications/wrangler.jsonc
pnpm notifications:worker -- --port 8788 --test-scheduled
```

В іншому терміналі:

```powershell
pnpm notifications:worker:smoke -- --cron
```

Smoke реєструє тестову інсталяцію, перевіряє D1, відмову дозволу, порожню історію, 401 із чужим секретом і 404 приватного маршруту без авторизації. `--cron` запускає локальну перевірку реального джерела; звірити `sourceValid=true` у журналі Worker. Cron endpoint існує лише в локальному Wrangler із `--test-scheduled`.

Локальні `wallMs` і `dbMs` не є CPU-time хмарного Worker. 100 інсталяцій у інтеграційному тесті використовують підмінений Expo transport і підтверджують алгоритм, а не реальну доставку або безкоштовний тариф.

## Власні акаунти й Android

11 жовтня 2026 року після входу власника створено й підключено EAS проєкт [@ruslan_krasiuk/svitlo-rn](https://expo.dev/accounts/ruslan_krasiuk/projects/svitlo-rn), UUID `3a8364d1-dd8b-40e0-bdc2-645cb69a6c50`. Публічні owner і project UUID задано в `app.config.ts`, змінні оточення можуть їх перевизначити. У наявному власному Firebase проєкті `svitlode-e9787ac8` зареєстровано Android app `ua.svitlo.rn.development`, app ID `1:1092513709069:android:27541a34446ff9490e2944`. Конфігурацію завантажено в локальний `.credentials/development/google-services.json`; перевірено правильність пакета та відсутність `private_key`. Локальний `.env.local` підключає цей файл і HTTPS адресу Worker.

Після явного погодження користувача створено service account `svitlo-expo-fcm@svitlode-e9787ac8.iam.gserviceaccount.com` і надано лише `roles/firebasecloudmessaging.admin`. Усі попередні IAM bindings збережено; запис захищено etag та перевірено повторним читанням. Згенеровано один JSON-ключ в ігнорованій `.credentials/fcm-service-account.json`; через EAS його прив’язано до FCM v1 credentials для `ua.svitlo.rn.development`. Перевірено збіг власного проєкту, service account і key ID. Приватний ключ не входить у Git, застосунок або звіт. Preview/production credentials та APNs не налаштовані.

Для повторного налаштування на іншому комп’ютері потрібен вхід власника у браузері:

```powershell
npx.cmd --yes eas-cli@latest login --browser
npx.cmd --yes firebase-tools@latest login
```

Вхід виконується у власні акаунти. Якщо акаунта Expo ще немає, його можна створити на [expo.dev/signup](https://expo.dev/signup); Firebase використовує Google-акаунт. Firebase CLI може запропонувати участь у діагностиці — вона не потрібна для FCM. Команди й спосіб входу звірено з [EAS CLI](https://docs.expo.dev/eas/cli/) та [Firebase CLI](https://firebase.google.com/docs/cli).

Після входу підключити наявні проєкти. Для EAS використовується slug `svitlo-rn`; динамічний `app.config.ts` уже містить власні публічні owner і project UUID. Локальні налаштування можна задати у `.env.local` за прикладом [`.env.local.example`](../../.env.local.example); приклад містить адресу вже розгорнутого Worker і поточні EAS ідентифікатори.

Для Firebase достатньо Spark plan: [Cloud Messaging має позначку No-cost](https://firebase.google.com/pricing). APK пілота можна зібрати локально; [Expo підтримує push із локальною native збіркою](https://docs.expo.dev/push-notifications/push-notifications-setup/), а FCM credentials при цьому потрібно налаштувати в EAS окремо.

| Профіль | Android package / application ID |
| --- | --- |
| development — поточний Samsung-пілот | `ua.svitlo.rn.development` |
| preview | `ua.svitlo.rn.preview` |
| production | `ua.svitlo.rn` |

Firebase конфігурація має відповідати пакету поточної збірки. Для першого тесту зареєструвати Android app `ua.svitlo.rn.development` у власному Firebase проєкті, завантажити його `google-services.json` у `.credentials/development/google-services.json` і задати `GOOGLE_SERVICES_JSON=./.credentials/development/google-services.json` у `.env.local`.

Потрібні два різні JSON-файли за [інструкцією FCM v1 від Expo](https://docs.expo.dev/push-notifications/fcm-credentials/):

- `google-services.json` — конфігурація Android із Firebase Project settings → Your apps; передається через `android.googleServicesFile` та включається у native збірку.
- Service account JSON з `private_key` — Firebase Project settings → Service accounts → Generate new private key. Зберігати окремо, наприклад `.credentials/fcm-service-account.json`, і завантажити в EAS для application ID `ua.svitlo.rn.development`. Цей файл не включається у застосунок або `EXPO_PUBLIC_*`.

Для завантаження ключа запустити `npx.cmd --yes eas-cli@latest credentials --platform android`, обрати профіль `development`, потім Google Service Account → Manage your Google Service Account Key for Push Notifications (FCM V1) → Set up → Upload a new service account key. Альтернатива: власний EAS project → Credentials → Android → application identifier `ua.svitlo.rn.development` → Service Credentials → FCM V1 service account key. Якщо використовується наявний service account, звірити роль Firebase Cloud Messaging API Admin. Папка `.credentials/` та `.env*.local` ігноруються Git; приватний ключ не надсилається в чат.

Після підключення перевірити resolved Expo config: правильні `owner`, `extra.eas.projectId`, `android.package` та `android.googleServicesFile`. Перебудувати й установити APK, бо зміна JavaScript не додає Firebase конфігурацію у вже зібраний Android застосунок. Реальний push вважається підтвердженим лише після показу на закритому Samsung і переходу до відповідної картки історії.

Фактичні перевірки цього налаштування: resolved Expo config PASS, Firebase project/package match PASS, Android Google Services plugin і native конфігурація присутні. `prebuild:development -- --platform android --no-install` PASS; `app:assembleDebug --no-daemon` PASS за 4 хв 18 с, APK — `android/app/build/outputs/apk/debug/app-debug.apk`. Після перепідключення Samsung USB shell працює; `adb install -r` завершився успішно. EAS read-only перевірка підтвердила призначені FCM v1 credentials. TypeScript і lint PASS; 31 Jest suites / 147 tests PASS.

1. Створити або підключити власний Expo/EAS проєкт; задати `EXPO_ACCOUNT_OWNER` та `EAS_PROJECT_ID`. Чужий шаблонний проєкт не використовується.
2. У власному Firebase додати Android application ID профілю збірки: `ua.svitlo.rn.development` для development. `GOOGLE_SERVICES_JSON` вказує на локальний `google-services.json`; файл і credentials не комітяться.
3. Підключити FCM v1 service account до власного EAS проєкту за [інструкцією Expo](https://docs.expo.dev/push-notifications/push-notifications-setup/). Для iOS окремо потрібні APNs credentials; Android-тест їх не підтверджує.
4. Задати HTTPS адресу Worker в `EXPO_PUBLIC_NOTIFICATIONS_API_URL`. Серверні токени не додаються до `EXPO_PUBLIC_*`.
5. Перебудувати dev client, установити APK на Samsung, обрати чергу та натиснути «Увімкнути сповіщення». Звірити дозвіл і наявність токена в D1 без копіювання токена в звіт.

## Cloudflare та фактичний gate

11 жовтня 2026 року в `wrangler.jsonc` підключено створену користувачем D1 через прив’язку `DB`, обидві віддалені міграції застосовано. Код Worker розгорнуто на https://svitlo-notifications-pilot.svitlonorify.workers.dev, version `820c41a9-c27b-4d9e-811d-676fe3b99374`. `PILOT_RUN_TOKEN` збережено після розгортання; значення секрету не читалося. Реальні scheduled invocations cron `* * * * *` спостерігалися через Wrangler tail. Вони завершуються `ok`, але `sourceValid=false`: успішний invocation не означає успішне отримання графіка.

Початкову помилку налаштування усунуто: автоматично додана друга D1-прив’язка мала реальний ID, тоді як `DB` залишалася з нульовим ID. Їх об’єднано в одну коректну `DB`. До виправлення створена база не мала таблиць; додавання секрету створило Worker без розгортання коду застосунку.

1. Увійти у власний Cloudflare акаунт на Free plan, створити D1 (`wrangler d1 create svitlo-notifications-pilot`) і підставити ID у конфіг. Застосувати міграції з `--remote`, розгорнути Worker. Платний тариф не вмикати.
2. Задати приватний `PILOT_RUN_TOKEN` через `wrangler secret put` — від 32 випадкових символів. Якщо Expo enhanced push security увімкнено, задати серверний `EXPO_ACCESS_TOKEN`. Значення не передавати в чат або мобільний bundle.
3. Звірити реальний cron у Cloudflare: `sourceValid=true`, відсутність CPU/subrequest/D1 errors. Виміряти обидва формати: таблицю відключень і «відключення не прогнозуються». Дешева відповідь без таблиці не доводить працездатність її парсингу.
4. Після реєстрації інсталяції на закритому Samsung викликати приватний `POST /pilot/publication`. Публікація для дати створюється один раз; повторний виклик не є тестом нової доставки. Для повторного першого публікування потрібна інша дата або окрема disposable pilot database, а не очищення production історії.
5. Звірити Expo ticket, receipt і фактичний показ на Samsung. Tap із закритого застосунку відкриває власну картку. Окремо перевірити foreground, відмову дозволу й повернення після зміни системних налаштувань. Receipt означає прийняття FCM/APNs; показ доводиться пристроєм.
6. В окремій тестовій D1 підготувати 100 авторизованих тестових інсталяцій і токенів. Синтетичні токени дають помилки Expo й не доводять доставку на 100 пристроїв; спільний токен не слід використовувати для 100 пушів на один телефон. Зберегти точний опис одержувачів і відповіді Expo без секретів.
7. Виміряти CPU-time у Cloudflare Workers observability, HTTP/cron subrequests, SQL та фактичні D1 rows read/written; розрахувати добове навантаження при 1440 cron-викликах. У логах є агреговані `queries`, `rowsRead`, `rowsWritten`, `dbMs`, `attempted`, `accepted`; токени, секрети й ID інсталяцій не логуються.

Поточні [Workers Free limits](https://developers.cloudflare.com/workers/platform/limits/): 10 ms CPU на invocation, 50 subrequests, 100 000 запитів на добу. [D1 Free](https://developers.cloudflare.com/d1/platform/pricing/): 5 млн прочитаних і 100 000 записаних рядків на добу, 5 GB сумарно; [одна база Free — до 500 MB](https://developers.cloudflare.com/d1/platform/limits/). SQL робота може впливати на CPU; проходження лише ліміту SQL недостатньо.

## Результати першої native-перевірки перед benchmark

### Samsung та реальна доставка, 11 жовтня 2026

Samsung SM-S928U1, Android 16: development APK установлено зі збереженням даних. Metro працював з ізольованим E2E-сховищем та реальною HTTPS адресою Worker; звичайне сховище не очищувалося. Maestro `01-empty-history.yaml` пройшов. Очікування готовності замінено з назви на splash на фактичний екран вибору черги або вкладку. Опційне закриття пояснення дозволу в цьому flow іноді потребує повтору через затримку появи діалогу; це не автоматизований тест усіх permission-сценаріїв.

Знайдено й виправлено native-помилку: Expo Android повертав `denied` разом із `canAskAgain=true` ще до першого системного запиту. Адаптер тепер відрізняє перший запит від відмови, зберігаючи факт явного запиту в локальному сховищі. Початкове інспектування не відкриває системний діалог. Після «Увімкнути сповіщення» на Samsung спостерігався системний запит, після дозволу — реальний Expo token у D1. Додано п’ять regression-тестів для початкового Android стану, явного запиту й відмови, дозволу й реєстрації, неможливості повторного запиту та iOS denial. Натискання «Не дозволяти» у початковому системному діалозі окремо не підтверджено; native-відмову перевірено вимкненням у налаштуваннях ОС.

Публікація поточного живого графіка за `2026-10-11` із 12 чергами створена атомарно в реальній remote D1: 3 SQL, 19 rows read, 26 rows written, dbMs 1.0504. Через збій доступу з Cloudflare графік для цього тесту отримано локальним приватним authenticated helper із remote D1 binding. Це не проходження розгорнутого `POST /pilot/publication`; наявний `PILOT_RUN_TOKEN` не читався й не змінювався. Розсилку outbox виконав саме розгорнутий cron: attempted 1, accepted 1, 5 SQL, 34 rows read, 4 rows written, CPU 7 ms, wallTime 15913 ms. Expo receipt `ok`; у системній шторці Samsung фактично показано «Опубліковано графік» із датою 2026-10-11. Натискання відкрило й виділило відповідну картку «Графік на 11 жовтня 2026».

Окремо перевірено холодне відкриття: debug-процес завершено під його власним UID без Android force-stop; до надсилання PID відсутній. Один прямий Expo test push «Перевірка відкриття графіка» повторно посилався на вже існуючу картку. Цей тест не створював подію й не змінював outbox. Після натискання запустився новий процес, відкрилася картка з accessibility label «Сповіщення, яке ви відкрили»; receipt `ok`. Це додатковий тест навігації, а не друга cron-публікація.

Кнопка «Налаштування телефона» відкрила системні налаштування ЄСвітло. Після вимкнення дозволу та повернення показано фактичний denied-стан, картка історії залишилася доступною, push token видалено з remote D1. Після повторного ввімкнення і повернення показано granted-стан і токен зареєстровано знову. Дозвіл залишено ввімкненим. iOS, APNs, TalkBack/VoiceOver та foreground-показ окремо не перевірені.

### Джерело з Cloudflare та межі вимірювання

Повторні фактичні cron-виклики завершилися `sourceValid=false` за приблизно 15.5 с; CPU 3–4 ms при порожньому outbox. Локальний виклик того самого валідатора успішно отримав поточний графік за 279 ms. Окрема read-only Cloudflare remote preview перевірка головної HTTPS сторінки, POST `newgpv-info.php` з www, без www та через HTTP дала TimeoutError за 7 с для кожного URL. Причину недоступності не встановлено; блокування IP обленерго є лише можливою причиною.

Виміряні 7 ms для одного одержувача включають невдалу перевірку джерела та успішну розсилку. Вони не доводять укладання повного парсингу таблиці й розсилки на 100 інсталяцій у 10 ms Free CPU. За відсутності подій 1440 cron-викликів означають приблизно 4320 SQL на добу; з фактичними 4 rows read на останніх порожніх викликах — 5760 rows read. Це лише поточний пілот із п’ятьма тестовими інсталяціями, не прогноз для 100 користувачів. Повний cloud fan-out і його квоти залишаються неперевіреними. Жодного платного тарифу або нового інфраструктурного сервісу не ввімкнено.

| Перевірка | Локально | Cloudflare / пристрій |
| --- | --- | --- |
| Дозвіл, відмова, OS settings, push navigation | Jest PASS, 5 нових native adapter regression-тестів | Samsung: запит, grant, settings denial, повторний grant та tap PASS; початковий OS deny не перевірено |
| Auth, міграції, історія через Worker/D1 | workerd HTTP smoke PASS | Remote smoke PASS; обидві міграції застосовано |
| Реальне джерело | workerd `sourceValid=true`; Node — 279 ms, 12 черг | FAIL: cron та альтернативні URL у remote preview завершуються таймаутом |
| 100 одержувачів, один REST-запит, без дублів | SQLite integration PASS; публікація + розсилка = 8 SQL; Expo transport підмінений | Не виконано |
| Worker bundle, Android APK | Wrangler dry-run, assembleDebug PASS | Worker розгорнуто; /health 200 `{"ok":true}`; APK встановлено |
| CPU, квоти D1, добовий бюджет | Локальні значення не доказ | Один push: 7 ms CPU, 5 SQL; повне джерело й 100 одержувачів не виміряно |
| Реальний показ / tap / cold launch | Unit-тести PASS | Cron push показано й відкрито; окремий прямий Expo replay підтвердив cold launch; обидва receipts `ok` |

Перевірки застосунку: TypeScript і lint PASS; 31 Jest suites / 147 tests PASS. Раніше пройдені 14 серверних інтеграційних тестів, design:check і 31 contrast combinations; цього кроку серверний production-код і дизайн не змінювалися. Існуюче попередження `act` у тесті login-form не є помилкою push. Android `assembleDebug` та встановлення APK PASS; iOS і screen reader не перевірено.

Висновок gate: **FAIL за прямим джерелом і CPU частини 100-одержувачевих вимірювань**. Android push transport працює; синтетичний cloud fan-out виміряно, але automatic source ще не підключено й повний бюджет не підтверджено. Задачі 03–15 не починаються до виправлення цього шляху й завершення вимірювань або погодженого перегляду архітектури. Сам факт успішного push не завершує задачу 02.
