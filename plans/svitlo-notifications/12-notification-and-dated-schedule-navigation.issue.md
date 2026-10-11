# 12. Перехід із push до запису та графіка його дати

Тип: AFK.

Статус: не почато.

Джерело: [PRD](../svitlo-notifications.prd.md). [Погоджене розбиття](../svitlo-notifications.issues-proposal.md).

User stories PRD: 26, 27.

## What to build

Холодний або теплий запуск із будь-якого push відкриває та знаходить потрібну картку. Її дія показує графік саме зазначеної дати, включно із завтра, або явну недоступність.

## Acceptance criteria

- [ ] Payload має стабільний ID; відкриття завантажує потрібний запис поза першою сторінкою й прокручує до нього без дублювання.
- [ ] Пройдені холодний/теплий запуск, відсутній кеш, повільна мережа й офлайн; користувач бачить явний стан, якщо запис поки недоступний.
- [ ] «Переглянути графік» використовує дату картки, а не сьогодні; недоступний графік має окреме повідомлення без підміни іншою датою.
- [ ] Перевірено всі три типи, картку зі зміненим часом і native-переходи. Повний календар або порівняння версій не додаються.

## Blocked by

- Blocked by #[plans/svitlo-notifications/09-warning-rescheduling-and-history.issue.md](./09-warning-rescheduling-and-history.issue.md).
- Blocked by #[plans/svitlo-notifications/11-offline-history-and-settings-sync.issue.md](./11-offline-history-and-settings-sync.issue.md).
