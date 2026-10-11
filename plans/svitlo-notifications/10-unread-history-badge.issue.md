# 10. Лічильник нових записів і прочитаність

Тип: AFK.

Статус: не почато.

Джерело: [PRD](../svitlo-notifications.prd.md). [Погоджене розбиття](../svitlo-notifications.issues-proposal.md).

User stories PRD: 24, 25.

## What to build

Вкладка «Сповіщення» показує кількість нових записів. Відкриття та завантаження історії позначають відображену межу прочитаною без втрати подій, що надійшли одночасно.

## Acceptance criteria

- [ ] Лічильник рахує повідомлення історії незалежно від дозволу ОС або успіху push; системний launcher badge не додається.
- [ ] API й клієнт використовують стабільну межу прочитання; нова подія після цієї межі залишається непрочитаною.
- [ ] Помилка завантаження не обнуляє невідомі записи; оновлення позначки старого запису не створює його копію.
- [ ] Інтеграційні й компонентні тести покривають повторне відкриття, пагінацію та одночасне надходження. Лічильник має доступну назву.

## Blocked by

- Blocked by #[plans/svitlo-notifications/04-regional-schedule-changes.issue.md](./04-regional-schedule-changes.issue.md).
- Blocked by #[plans/svitlo-notifications/06-ten-minute-location-warning.issue.md](./06-ten-minute-location-warning.issue.md).
