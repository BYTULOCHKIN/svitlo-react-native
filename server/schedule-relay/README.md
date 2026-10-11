# Render backend для ЄСвітло

11 жовтня 2026 погоджено архітектуру: Node.js на Render отримує та перевіряє графіки, обслуговує API застосунку, створює історію й відправляє Expo push. Cloudflare запускає захищений `/internal/tick` щохвилини та надає захищений доступ до постійної D1. Платний тариф не вмикається.

## Реалізована поведінка

- `GET /health` — перевірка запуску Node, без запиту до джерела.
- `GET /v1/schedules?date=YYYY-MM-DD` — публічний JSON із D1: `date`, `queues`, `verifiedAt`, `stale`. Читання не звертається до обленерго. Після невдалої перевірки timestamp збереженого графіка не змінюється.
- `POST /v1/installations`, `GET /v1/history`, `PUT /v1/delivery` — чинний контракт інсталяції, її секрету, історії та дозволу ОС. Node використовує ті самі таблиці, тому ідентичність та попередня історія зберігаються.
- `POST /internal/tick` із `Authorization: Bearer <TICK_RUN_TOKEN>` — перевіряє сьогодні та завтра за Europe/Kyiv, зберігає валідні графіки, створює першу публікацію нового дня та відправляє до 100 повідомлень одним пакетом Expo. Неправильний токен повертає 404.
- Початкові вже доступні графіки утворюють базовий стан без старих публікацій. Унікальність подій та outbox зберігається в D1. Зміна вже відомого графіка оновлює JSON; повідомлення про зміну, попередження за 10 хвилин, підписки та 30-денне очищення залишаються наступними issue.
- Блокування в D1 допускає один цикл за хвилинний слот. Воно переживає перезапуск; після аварійного завершення звільняється через 5 хвилин. Вже claimed або неоднозначно відправлені push не повторюються автоматично — повне відновлення доставки залишається issue 14.

Чинний production gateway: `https://svitlo-notifications-storage.svitlonorify.workers.dev`. Доступ до `/internal/database` лише за `STORAGE_API_TOKEN`. Команди параметризовані, обмежені за кількістю, розміром і видами SQL. Секрет дає доступ тільки до прив'язаної бази застосунку; Cloudflare account API key на Render не потрібен.

## Запуск Render Free

Код розміщується у власному [GitHub-репозиторії](https://github.com/BYTULOCHKIN/svitlo-react-native) на гілці `main`. Render ще не розгорнуто; наступний крок — підключити цей репозиторій через Dashboard.

1. Підключити цей репозиторій у Render через **New → Blueprint**, вибравши гілку `main` з кореневим [render.yaml](../../render.yaml).
2. Blueprint створює `svitlo-backend-pilot`, **Web Service / Node / Free / Frankfurt**, Node `24.21.0`. Поле Root Directory залишити порожнім: збірка потребує спільних файлів із кореня репозиторію.
3. Build Command: `npm ci --prefix server/schedule-relay && npm run build --prefix server/schedule-relay`. Start Command: `npm start --prefix server/schedule-relay`. Health Check Path: `/health`. Кореневі Expo-залежності не встановлюються.
4. У Render задати серверні змінні:

| Змінна | Значення |
| --- | --- |
| `STORAGE_API_URL` | `https://svitlo-notifications-storage.svitlonorify.workers.dev` |
| `STORAGE_API_TOKEN` | Вміст локального `.credentials/storage-api-token.txt` |
| `TICK_RUN_TOKEN` | Вміст локального `.credentials/tick-run-token.txt` |
| `EXPO_ACCESS_TOKEN` | Лише якщо ввімкнено відповідний захист Expo Push API |

Обидва токени вже створені локально, виключені з Git і записані у production gateway. Не передавати їх у чат або `EXPO_PUBLIC_*`. Для автоматичного керування Render API key можна зберегти в `.credentials/render-api-key.txt` (**Account Settings → API Keys**); браузерний вхід не надає CLI/API сесію.

5. Після **Live** перевірити `/health`, авторизований `/internal/tick`, актуальні `verifiedAt` та графіки на обидві дати. Початковий запуск може зайняти довше, ніж звичайний HTTP timeout.
6. Після source/auth smoke Render спочатку видалити cron зі старого `server/notifications/wrangler.jsonc` й передеплоїти старий пілот: це зупиняє паралельне читання outbox, зберігаючи його HTTP API та секрети. Потім у [wrangler.gateway.jsonc](../notifications/wrangler.gateway.jsonc) додати `vars.BACKEND_URL` із фактичною HTTPS адресою Render та виконати:

```powershell
node.exe node_modules/wrangler/bin/wrangler.js deploy --config server/notifications/wrangler.gateway.jsonc
```

Cron уже оголошений як `* * * * *`, але без `BACKEND_URL` він не запускає обробку. Cloudflare надсилає POST із токеном, очікує результат і не розбирає графіки або Expo tickets. Статус фіксується без секретів.

7. Після перевірки фактичного cron задати в `.env.local` `EXPO_PUBLIC_SVITLO_API_URL=<фактична HTTPS адреса Render>` й перезапустити Metro/оновити збірку. Ця одна адреса підключає JSON графіків та історію/доставку. Помилка налаштованого backend не запускає прямий запит до обленерго; час у кеші зберігає серверний `verifiedAt`.
8. За потреби чинну адресу пілота можна переключити на `gateway-worker.ts` із тими самими D1 та новими secrets/vars — публічні `/v1/*` тоді проксіюються на Node. Прямий API Render залишається основним для застосунку.

## Перевірки та межі

Чиста окрема збірка Node без кореневого `node_modules` пройшла. Вона через реальний production gateway/D1 отримала живі графіки на 2026-10-11 та 2026-10-12 по 12 черг, виконала цикл за 2058 ms і повернула `stale: false`. Початковий цикл не створив старих push. Без токена `/internal/tick` повернув 404, чужа історія — 401. Локальний процес після smoke зупинено.

Це перевірка локального Node → Cloudflare/D1, **не доказ доступності обленерго з Render** або стабільності Render Free. Наступні хмарні перевірки: source access з Render, фактичний cron, холодний запуск/перезапуск, реальний Samsung push через Node та актуальні квоти/CPU gateway.

За [умовами Render Free](https://render.com/docs/free), сервіс засинає після 15 хвилин без вхідних запитів, має 750 годин на місяць на workspace, може перезапускатися. Щохвилинний робочий запит за нормальної роботи запобігає idle sleep. Локальні файли й SQLite не є постійним сховищем; історія, токени, графіки та завдання лежать у D1.

Для [окремого benchmark gateway](../notifications/wrangler.gateway-benchmark.jsonc) використовується тільки disposable D1. [benchmark-node.ts](./benchmark-node.ts) перевіряє три повтори з 100 синтетичними інсталяціями, один mock Expo пакет, 100 різних карток і відсутність дублювання після повтору/перезапуску. URL production відхиляється до очищення seed.

```powershell
$env:SVITLO_STORAGE_BENCHMARK_URL='https://svitlo-notifications-storage-benchmark.svitlonorify.workers.dev'
$env:SVITLO_STORAGE_BENCHMARK_TOKEN_FILE='.expo/notifications/storage-benchmark-token'
npm.cmd run notifications:backend:benchmark
```

Остаточні три повтори: 14 gateway HTTP-запитів на обробку публікації, один пакет зі 100 повідомлень, 100 mock accepted, 100 окремих карток, replay skipped. Wall time: 1493, 1753, 1742 ms; CPU локального Node: 47, 124, 63 ms. У tail захоплено 36 gateway samples із підготовки та двох серій вимірювань: усі `ok`, CPU 0–3 ms, медіана 1 ms, p95 2 ms. Tail не захопив усі запити, тому цей результат не є повним доказом бюджету кожної майбутньої операції.

TypeScript, lint, 30 серверних інтеграційних тестів і 31 Jest suite / 150 tests пройшли. Не заявляється доставка на 100 фізичних пристроїв. Заміри Node на локальному ПК не є вимірами Render. Результати gateway CPU беруться лише з Cloudflare tail.
