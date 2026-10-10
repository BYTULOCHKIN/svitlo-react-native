# Issues: спільна компонентна основа Svitlo

Статус: поділ на 12 задач погоджено. Реалізація пілота 01–05 готова, Android E2E пройшли на Samsung. Задача 06 очікує iOS та ручного TalkBack/VoiceOver приймання перед задачами 07–11.

Джерело: [PRD](../svitlo-component-foundation.prd.md). [Погоджений поділ і детальні критерії](../svitlo-component-foundation.issues-proposal.md).

AFK — не потрібні нові продуктові рішення. HITL — потрібні фактичні платформні перевірки й перегляд результату. Статус готовності відображає виконані критерії, а не лише написаний код.

| № | Задача | Тип | Залежить від | Статус |
|---|---|---|---|---|
| 01 | [Додавання локації на gluestack](./01-add-location-gluestack-pilot.issue.md) | AFK | — | Реалізовано; native — 06 |
| 02 | [Редагування локації та відновлення даних](./02-edit-location-and-persistence.issue.md) | AFK | 01 | Реалізовано; Android E2E PASS |
| 03 | [Адаптивна сітка черг та іконок у формі](./03-inline-adaptive-choice-grid.issue.md) | AFK | 02 | Реалізовано; native — 06 |
| 04 | [Підтвердження скасування незбережених змін](./04-unsaved-location-changes.issue.md) | AFK | 03 | Android E2E PASS; screen reader focus очікує |
| 05 | [Підтвердження видалення локації](./05-confirm-location-deletion.issue.md) | AFK | 04 | Реалізовано; Android E2E PASS |
| 06 | [Перевірка пілота форми на Android та iOS](./06-native-location-pilot-acceptance.issue.md) | HITL | 05 | Android E2E PASS; iOS та ручна a11y очікують |
| 07 | [Перший вибір черги в нижній панелі](./07-queue-select-bottom-sheet.issue.md) | AFK | 06 | Не почато |
| 08 | [Вибір локації та перехід до форми](./08-location-picker-bottom-sheet.issue.md) | AFK | 07 | Не почато |
| 09 | [Спільні текст і кнопки на продуктових екранах](./09-product-typography-and-actions.issue.md) | AFK | 06 | Не почато |
| 10 | [Внутрішній екран компонентів і станів](./10-development-component-gallery.issue.md) | AFK | 08, 09 | Не почато |
| 11 | [Базова робота web і сумісність старих споживачів](./11-web-and-template-compatibility.issue.md) | AFK | 10 | Не почато |
| 12 | [Приймання всіх сценаріїв на Android та iOS](./12-native-component-foundation-acceptance.issue.md) | HITL | 11 | Не почато |

Задачі виконуються наскрізно: компонент, продуктовий сценарій, дані та відповідні компонентні/інтеграційні/E2E-перевірки. Задача 06 перевіряє пілот перед масовою міграцією; задача 12 приймає весь результат. Можливий порядок після пілота: 07 → 08 та 09 → 10 → 11 → 12. Задача 09 залежить від 06 і не потребує завершення 07–08.

TypeScript перевіряється наявним script type-check, стилі й правила — lint. Залежності встановлюються через pnpm, зафіксований у проєкті. Публікація GitHub issues, релізи, віддалені платні збірки й зміни бізнес-логіки не входять до роботи.

Перевірки пілота 10.10.2026: type-check, lint, design:check, 23 suites / 114 тестів, production JS export Android/iOS/web та native Android assembleDebug пройшли. Після додавання доступного пояснення підтвердження повторно пройшли релевантні 27 тестів, lint, type-check та export. Старий тест login-form виводить наявне попередження act, але проходить. E2E використовує окремий MMKV та локальні графіки; test flag не активується в release. [Інструкція запуску](../../.maestro/svitlo/README.md). Результат native-приймання й обмеження середовища — у задачі 06.

У задачі 06 додано `design:contrast`: 31 комбінація токенів проходить після виправлення pressed opacity кнопок. Останні перевірки: type-check, lint, design:check та 23 suites / 120 тестів PASS. На Samsung SM-S928U1, Android 16, fontScale 1.0 пройшли повний E2E, сценарій клавіатури й окремий live API flow для всіх 12 черг і restart із 6.2. Виправлено перехоплення першого натискання клавіатурою. `start:e2e` тепер використовує реальний API; фікстура вмикається тільки через `start:e2e:fixtures` та має окреме сховище. [Протокол ручного приймання](./native-pilot-checklist.md): iOS, найбільший доступний системний шрифт та ручний TalkBack/VoiceOver залишаються відкритими.

Live API flow повторно пройшов із системним fontScale 2.0: дві колонки, усі 12 черг доступні, збереження 6.2 та restart працюють. Початковий fontScale 1.0 відновлено. Перевірка максимального preset у системному UI Samsung та ручна a11y залишаються відкритими.
