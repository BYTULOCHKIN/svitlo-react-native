# Іконка з Kotlin-версії

Оригінальні файли скопійовані без змін із `C:/work-projects/svitlo/app/src/main/res/mipmap-xxxhdpi/`:

- `ic_launcher.webp`: legacy launcher, 192 × 192.
- `ic_launcher_foreground.webp`: adaptive foreground, 432 × 432; збережено оригінальні поля й вбудоване зображення.

Kotlin `mipmap-anydpi-v26/ic_launcher.xml` використовує саме цей foreground і фон `#E6E5E5` із `values/ic_launcher_background.xml`. XML-вектор із `drawable/ic_launcher_foreground.xml` є шаблонним Android-роботом і не використовується для launcher.

Expo-ресурси отримані через Sharp без перемальовування:

- `../icon.png`: legacy launcher масштабовано до 1024 × 1024, прозорі краї заповнено `#E6E5E5`, щоб iOS icon була непрозорою. Вихідна деталізація залишається 192 × 192.
- `../adaptive-icon.png`: оригінальний adaptive foreground масштабовано до 1024 × 1024 зі збереженням прозорості; фон задається конфігурацією Expo.
- `../favicon.png`: legacy launcher масштабовано до 48 × 48.
- `../splash-icon.png`: PNG 512 × 512 із `../splash-bulb.svg`. Після переходу іконок на Lucide контур відповідає Lucide `Lightbulb` у `AppIcon` з ім'ям `bulb`, колір `#2ECC71`; фон splash `#1B1B1B`. Ліцензія скопійована в `../lucide-LICENSE.txt`.

Шаблонний плагін app-icon-badge прибрано з конфігурації, щоб стрічки середовища та версії не перекривали іконку. Іконка й splash потребують нативної перебудови. Штучної затримки запуску не додано; наявне приховування splash після layout збережено.

10 жовтня 2026 року Android prebuild та Gradle assembleDebug завершилися успішно, оновлення встановлене на Samsung. Візуальна перевірка launcher/splash ще не виконана: телефон був заблокований. Нативний запуск iOS не перевірявся.
