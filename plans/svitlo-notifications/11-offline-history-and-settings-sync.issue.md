# 11. Офлайн-історія та синхронізація після відновлення зв’язку

Тип: AFK.

Статус: не почато.

Джерело: [PRD](../svitlo-notifications.prd.md). [Погоджене розбиття](../svitlo-notifications.issues-proposal.md).

User stories PRD: 23, 30, 31, 35.

## What to build

Без інтернету користувач бачить уже завантажену історію. Повернення зв’язку синхронізує нові події, виправлення, прочитаність та офлайн-зміни підписок.

## Acceptance criteria

- [ ] Кешована історія доступна з позначкою «Без інтернету»; незавантажені записи не вважаються доступними. Є перше завантаження, порожній стан, повтор і помилка з кешем.
- [ ] Стабільна пагінація та повторна синхронізація не дублюють записи; старі скасування/перенесення приходять незалежно від курсора нових записів.
- [ ] Офлайн-зміни локацій і перемикачів збережені локально з видимим станом очікування синхронізації; після зв’язку серверний план відповідає останнім налаштуванням.
- [ ] Перевірено перезапуск офлайн, відновлення зв’язку, API-недоступність та незалежність читання історії від доступності обленерго.

## Blocked by

- Blocked by #[plans/svitlo-notifications/05-regional-push-preference.issue.md](./05-regional-push-preference.issue.md).
- Blocked by #[plans/svitlo-notifications/07-all-location-subscriptions.issue.md](./07-all-location-subscriptions.issue.md).
- Blocked by #[plans/svitlo-notifications/09-warning-rescheduling-and-history.issue.md](./09-warning-rescheduling-and-history.issue.md).
- Blocked by #[plans/svitlo-notifications/10-unread-history-badge.issue.md](./10-unread-history-badge.issue.md).
