# 10. Внутрішній екран компонентів і станів

Тип: AFK.

Статус: не почато.

Джерело: [PRD](../svitlo-component-foundation.prd.md).

User stories PRD: 39, 40, 41, 42, 43, 45, 46, 47, 48, 49, 50, 51, 52, 54, 55, 56, 57, 60.

## What to build

Відкрити лише в development внутрішній екран, переглянути всі компоненти та реально взаємодіяти з діалогами, панелями й виборами. Тут також перевірити звичайне представлення AppSelect списком поряд із сіткою черг.

## Acceptance criteria

- [ ] Демонструються погоджені варіанти та normal, focused/pressed, disabled, loading, error, empty, selected, довгі тексти та короткі черги.
- [ ] Контрольовані приклади select зі списком і сіткою підтримують зміну value/options; відсутнє значення не спричиняє неявної зміни.
- [ ] Можна відкрити й закрити реальні діалоги, підтвердження та панелі з правильним поверненням фокуса.
- [ ] Системний масштаб шрифту зберігається; приклади дозволяють ручну перевірку a11y.
- [ ] Екран відсутній у продуктовій навігації та недоступний прямим переходом у production.
- [ ] Перевірки доступу й публічної поведінки компонентів, TypeScript, lint і синхронність токенів проходять.

## Blocked by

- Blocked by #plans/svitlo-component-foundation/08-location-picker-bottom-sheet.issue.md — [Вибір локації та перехід до форми](./08-location-picker-bottom-sheet.issue.md).
- Blocked by #plans/svitlo-component-foundation/09-product-typography-and-actions.issue.md — [Спільні текст і кнопки на продуктових екранах](./09-product-typography-and-actions.issue.md).
