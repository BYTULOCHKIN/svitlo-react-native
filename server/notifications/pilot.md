# Перевірка задачі 02

Статус: прототип розгорнуто у власному Cloudflare акаунті; /health і remote API/D1 smoke PASS. Власний EAS проєкт і Android Firebase конфігурацію підключено. Реальний push на Samsung та Cloudflare Free gate очікують FCM service account/key, пристрою й вимірювань. iOS не перевірено. Платний тариф не вмикається автоматично.

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

FCM v1 service account та ключ ще не налаштовано. Автоматична перевірка дозволів відхилила запуск допоміжного скрипта з гілками створення service account, зміни IAM та генерації приватного ключа через відсутність явного погодження точного обсягу. Ці гілки не виконувалися; їх видалено перед окремою перевіркою лише читання. Read-only перевірка підтвердила, що запланованого `svitlo-expo-fcm` account і локального ключа ще немає. Поточні IAM bindings не змінювалися.

Підготовлений наступний крок після явного погодження: у проєкті `svitlode-e9787ac8` створити service account `svitlo-expo-fcm`, надати йому лише `roles/firebasecloudmessaging.admin`, зберігши всі наявні bindings і використавши IAM etag для захисту від конкурентних змін. Згенерувати один JSON-ключ, зберегти в ігнорованій `.credentials/fcm-service-account.json` і завантажити через EAS у credentials для `ua.svitlo.rn.development`. Приватний ключ дозволяє надсилати FCM повідомлення від імені проєкту; він не входить у Git або застосунок. Платний тариф не потрібен для цього налаштування.

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

Фактичні перевірки цього налаштування: resolved Expo config PASS, Firebase project/package match PASS, Android Google Services plugin і native конфігурація присутні. `prebuild:development -- --platform android --no-install` PASS; `app:assembleDebug --no-daemon` PASS за 4 хв 18 с, APK — `android/app/build/outputs/apk/debug/app-debug.apk`. TypeScript і lint PASS; 30 Jest suites / 142 tests PASS. EAS read-only перевірка підтвердила відсутність FCM v1 credentials. `adb devices -l` повернув порожній список, тому встановлення APK й реальний push ще не перевірено.

1. Створити або підключити власний Expo/EAS проєкт; задати `EXPO_ACCOUNT_OWNER` та `EAS_PROJECT_ID`. Чужий шаблонний проєкт не використовується.
2. У власному Firebase додати Android application ID профілю збірки: `ua.svitlo.rn.development` для development. `GOOGLE_SERVICES_JSON` вказує на локальний `google-services.json`; файл і credentials не комітяться.
3. Підключити FCM v1 service account до власного EAS проєкту за [інструкцією Expo](https://docs.expo.dev/push-notifications/push-notifications-setup/). Для iOS окремо потрібні APNs credentials; Android-тест їх не підтверджує.
4. Задати HTTPS адресу Worker в `EXPO_PUBLIC_NOTIFICATIONS_API_URL`. Серверні токени не додаються до `EXPO_PUBLIC_*`.
5. Перебудувати dev client, установити APK на Samsung, обрати чергу та натиснути «Увімкнути сповіщення». Звірити дозвіл і наявність токена в D1 без копіювання токена в звіт.

## Cloudflare та фактичний gate

11 жовтня 2026 року в `wrangler.jsonc` підключено створену користувачем D1 через прив’язку `DB`, обидві віддалені міграції застосовано. Код Worker розгорнуто на https://svitlo-notifications-pilot.svitlonorify.workers.dev, version `820c41a9-c27b-4d9e-811d-676fe3b99374`. `PILOT_RUN_TOKEN` збережено після розгортання; значення секрету не читалося. Cron `* * * * *` зареєстровано; успішний scheduled invocation і доступ до джерела ще потребують окремого підтвердження.

Початкову помилку налаштування усунуто: автоматично додана друга D1-прив’язка мала реальний ID, тоді як `DB` залишалася з нульовим ID. Їх об’єднано в одну коректну `DB`. До виправлення створена база не мала таблиць; додавання секрету створило Worker без розгортання коду застосунку.

1. Увійти у власний Cloudflare акаунт на Free plan, створити D1 (`wrangler d1 create svitlo-notifications-pilot`) і підставити ID у конфіг. Застосувати міграції з `--remote`, розгорнути Worker. Платний тариф не вмикати.
2. Задати приватний `PILOT_RUN_TOKEN` через `wrangler secret put` — від 32 випадкових символів. Якщо Expo enhanced push security увімкнено, задати серверний `EXPO_ACCESS_TOKEN`. Значення не передавати в чат або мобільний bundle.
3. Звірити реальний cron у Cloudflare: `sourceValid=true`, відсутність CPU/subrequest/D1 errors. Виміряти обидва формати: таблицю відключень і «відключення не прогнозуються». Дешева відповідь без таблиці не доводить працездатність її парсингу.
4. Після реєстрації інсталяції на закритому Samsung викликати приватний `POST /pilot/publication`. Публікація для дати створюється один раз; повторний виклик не є тестом нової доставки. Для повторного першого публікування потрібна інша дата або окрема disposable pilot database, а не очищення production історії.
5. Звірити Expo ticket, receipt і фактичний показ на Samsung. Tap із закритого застосунку відкриває власну картку. Окремо перевірити foreground, відмову дозволу й повернення після зміни системних налаштувань. Receipt означає прийняття FCM/APNs; показ доводиться пристроєм.
6. В окремій тестовій D1 підготувати 100 авторизованих тестових інсталяцій і токенів. Синтетичні токени дають помилки Expo й не доводять доставку на 100 пристроїв; спільний токен не слід використовувати для 100 пушів на один телефон. Зберегти точний опис одержувачів і відповіді Expo без секретів.
7. Виміряти CPU-time у Cloudflare Workers observability, HTTP/cron subrequests, SQL та фактичні D1 rows read/written; розрахувати добове навантаження при 1440 cron-викликах. У логах є агреговані `queries`, `rowsRead`, `rowsWritten`, `dbMs`, `attempted`, `accepted`; токени, секрети й ID інсталяцій не логуються.

Поточні [Workers Free limits](https://developers.cloudflare.com/workers/platform/limits/): 10 ms CPU на invocation, 50 subrequests, 100 000 запитів на добу. [D1 Free](https://developers.cloudflare.com/d1/platform/pricing/): 5 млн прочитаних і 100 000 записаних рядків на добу, 5 GB сумарно; [одна база Free — до 500 MB](https://developers.cloudflare.com/d1/platform/limits/). SQL робота може впливати на CPU; проходження лише ліміту SQL недостатньо.

## Результати

| Перевірка | Локально | Cloudflare / пристрій |
| --- | --- | --- |
| Дозвіл, відмова, OS settings, push navigation | Jest PASS | Samsung очікується |
| Auth, міграції, історія через Worker/D1 | workerd HTTP smoke PASS | Remote smoke PASS; обидві міграції застосовано |
| Реальне джерело з локального workerd | `sourceValid=true`; cron `wallMs=328`, 3 SQL | Доступ із Cloudflare не перевірено |
| 100 одержувачів, один REST-запит, без дублів | SQLite integration PASS; публікація + розсилка = 8 SQL; Expo transport підмінений | Не виконано |
| Worker bundle, Android APK | Wrangler dry-run, assembleDebug PASS | Worker розгорнуто; /health 200 `{"ok":true}`; Samsung очікується |
| CPU, квоти D1, добовий бюджет | Локальні значення не доказ | Не виміряно |
| Реальний показ / tap / cold launch | Код і unit-тести підготовлені | Samsung потребує стабільного USB-з’єднання |

Перевірки застосунку: TypeScript і lint PASS; 30 Jest suites / 142 tests PASS; 14 серверних інтеграційних тестів PASS; design:check і 31 contrast combinations PASS. Існуюче попередження `act` у тесті login-form не є помилкою push. Android `assembleDebug` PASS; iOS і screen reader не перевірено.

Спроба native-перевірки: Samsung `R5CX30FC4SH` з’явився як `device` у ADB, але встановлення APK й Maestro не отримали відповіді. Окрема проста shell-команда перевищила таймаут 15 секунд. Власні завислі процеси зупинено; після `adb reconnect` пристрій став недоступним. Встановлення APK та проходження flows не підтверджені. Потрібне перепідключення USB й розблокований телефон; звичайне сховище застосунку не очищувалося.

Висновок gate: **очікує вимірювань**, а не PASS або виміряний FAIL. Задачі 03–15 не починаються до підтвердження 02 або погодженого перегляду архітектури за результатами вимірювання.
