# Аудит компонування

Запустити Metro через `npm run start:e2e` та відкрити development build на підключеному Android.

```sh
maestro test .maestro/svitlo-layout/ -e APP_ID=ua.svitlo.rn.development -e DEV_URL=svitlo-rn-development://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8082 -e RESET_URL=svitlo-rn-development://e2e-reset
```

Сценарії використовують ізольоване E2E-сховище. Перевірка компонування очікує доступну чергу `6.2` у реальному API; стан API на дату аудиту містить усі 12 черг. Якщо оператор не повернув цей графік, це потрібно відрізняти від регресії інтерфейсу.

`01-layout-audit` зберігає скриншоти основних екранів, форми та підтвердження; створює локацію з 20 широких символів. `02-keyboard-audit` перевіряє закриття й збереження одним натисканням із клавіатурою.

Для відкритої клавіатури прокрутка починається всередині `app-dialog-body`: типовий `scrollUntilVisible` стартує із середини екрана, яка може опинитись поза діалогом. Повторення обмежене 15 спробами й завершується перевіркою видимості дії. Див. [Maestro: swipe](https://docs.maestro.dev/reference/commands-available/swipe) та [scrollUntilVisible](https://docs.maestro.dev/reference/commands-available/scrolluntilvisible).

Прогони повторюються зі стандартним системним шрифтом, шрифтом 200% та вікном 320 × 640 dp. Тимчасові налаштування телефона потрібно відновлювати в `finally`. Протокол і висновки: [svitlo-layout-audit.md](../../plans/svitlo-layout-audit.md).
