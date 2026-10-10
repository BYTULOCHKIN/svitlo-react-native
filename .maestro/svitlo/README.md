# Svitlo E2E

Потрібні development build `ua.svitlo.rn.development`, Maestro та підключений Android або iOS simulator. Для Android перенаправте порт: `adb reverse tcp:8082 tcp:8082`. Для детермінованого flow запустіть `pnpm start:e2e:fixtures`, потім `pnpm test:e2e:svitlo`. Для іншого simulator або адреси сервера передайте власні `APP_ID`, `DEV_URL` та `RESET_URL` у `maestro test .maestro/svitlo/`.

`pnpm start:e2e` використовує реальний API та всі повернуті ним черги, зберігаючи дані в окремому MMKV `svitlo.e2e`. `EXPO_PUBLIC_E2E=1` сам по собі не підміняє графік. Локальний графік для поточної дати з чергами 1.1, 1.2, 2.1 вмикається тільки додатковим `EXPO_PUBLIC_E2E_FIXTURES=1` через `start:e2e:fixtures`; його MMKV — `svitlo.e2e.fixtures`, тому кеші реального API та фікстури не змішуються. Обидва прапорці діють лише в development bundle. Release bundle завжди використовує звичайне сховище та API оператора. Flow відкриває `/e2e-reset`, який скидає тільки активне ізольоване тестове сховище; у звичайному development та release він лише перенаправляє на головну. Flow не очищає дані інсталяції.

Назва `Office` використовує ASCII через [обмеження inputText на Android](https://docs.maestro.dev/extra-materials/troubleshooting/known-issues). Українські назви, крайні пробіли та ліміт 20 символів перевіряються інтеграційними тестами.

Команди запуску та deep link відповідають [launchApp](https://docs.maestro.dev/reference/commands-available/launchapp), [openLink](https://docs.maestro.dev/reference/commands-available/openlink) та [React Native](https://docs.maestro.dev/get-started/supported-platform/react-native).

Наявність flow не означає його успішне виконання. Фактичні результати native E2E та ручних перевірок фіксуються в issue 06 і 12.

Окремий live API flow — `../svitlo-api/01-all-api-queues.yaml`. Він запускається з `start:e2e` та параметром `API_QUEUES` — актуальні черги з API, розділені комами. Flow перевіряє кожну повернуту чергу в початковому виборі та формі додавання, вибирає останню, зберігає локацію й перевіряє її після restart. Список не зафіксований у flow. Команди циклу та прокручування відповідають [repeat](https://docs.maestro.dev/reference/commands-available/repeat) і [scrollUntilVisible](https://docs.maestro.dev/reference/commands-available/scrolluntilvisible).

Перед native запуском вимкніть Expo Element inspector: він перехоплює натискання, тому семантичні перевірки дерева можуть пройти без виконання дії користувача.
