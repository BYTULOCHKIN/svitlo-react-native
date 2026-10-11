# 14. Відновлення push після помилок і зміни токена

Тип: AFK.

Статус: не почато.

Джерело: [PRD](../svitlo-notifications.prd.md). [Погоджене розбиття](../svitlo-notifications.issues-proposal.md).

User stories PRD: 2, 15, 20, 22, 31, 36, 38.

## What to build

Зміни дозволу або токена й тимчасові збої доставки не руйнують історію та майбутні повідомлення. Сервер стійко відновлює обробку завдань без дублікатів історії й запізнілих попереджень.

## Acceptance criteria

- [ ] Клієнт актуалізує дозвіл і токен після повернення в застосунок; сервер припиняє використання невалідного токена, новий токен не створює другу інсталяцію.
- [ ] Оброблено tickets/receipts, помилки, неоднозначний timeout, конкурентний cron і перезапуск між записом та відправленням; статус провайдера не подається як підтвердження показу ОС.
- [ ] Повтори обмежені строком і актуальністю події. Пропущені попередження не наздоганяються, застарілі версії не відправляються; власна історія не дублюється.
- [ ] Завершений сценарій збою та відновлення перевірено від серверного стану до синхронізованої картки й наступного коректного push. Є вимірювання помилок/затримок без токенів або секретів у журналах.

## Blocked by

- Blocked by #[plans/svitlo-notifications/06-ten-minute-location-warning.issue.md](./06-ten-minute-location-warning.issue.md).
- Blocked by #[plans/svitlo-notifications/09-warning-rescheduling-and-history.issue.md](./09-warning-rescheduling-and-history.issue.md).
- Blocked by #[plans/svitlo-notifications/11-offline-history-and-settings-sync.issue.md](./11-offline-history-and-settings-sync.issue.md).
