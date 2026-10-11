# 13. 30 днів історії та нова інсталяція

Тип: AFK.

Статус: не почато.

Джерело: [PRD](../svitlo-notifications.prd.md). [Погоджене розбиття](../svitlo-notifications.issues-proposal.md).

User stories PRD: 32, 33, 34.

## What to build

Історія автоматично обмежується 30 днями на сервері й пристрої. Перевстановлення створює нову історію; відкриття старого push не веде до помилкової картки.

## Acceptance criteria

- [ ] Строк рахується від початкового часу повідомлення; зміна позначки не продовжує його. Прострочений кеш прибирається також офлайн.
- [ ] Очищення виконується обмеженими порціями та прибирає непотрібні пов’язані завдання/версії; перевірено граничний момент 30 днів.
- [ ] Новий ідентифікатор інсталяції не отримує старих подій; заміна токена тієї самої інсталяції зберігає історію.
- [ ] Для видаленого за строком запису з push відкривається історія з поясненням. Немає ручного видалення, акаунта або міжпристроєвого відновлення.

## Blocked by

- Blocked by #[plans/svitlo-notifications/11-offline-history-and-settings-sync.issue.md](./11-offline-history-and-settings-sync.issue.md).
- Blocked by #[plans/svitlo-notifications/12-notification-and-dated-schedule-navigation.issue.md](./12-notification-and-dated-schedule-navigation.issue.md).
