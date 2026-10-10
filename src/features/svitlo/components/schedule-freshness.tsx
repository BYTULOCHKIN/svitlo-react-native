import type { ScheduleSnapshot } from '../schedule-repository';
import { View } from 'react-native';
import { AppText as Text } from '@/design-system/text';
import { palette, space, typography } from '@/design-system/tokens';

export function ScheduleFreshness({ snapshot, current, fetching, failed }: { snapshot?: ScheduleSnapshot; current: boolean; fetching: boolean; failed: boolean }) {
  if (!snapshot || (current && !fetching && !failed && !snapshot.persistenceWarning))
    return null;
  return (
    <View style={{ gap: space.xs }}>
      {!current && <Text style={[typography.caption, { color: palette.warning }]}>{`Збережений графік на ${snapshot.day.date}. Даних на сьогодні немає.`}</Text>}
      {fetching && <Text style={[typography.caption, { color: palette.secondary }]}>Оновлення…</Text>}
      {failed && <Text style={[typography.caption, { color: palette.secondary }]}>Показано збережені дані</Text>}
      {snapshot.persistenceWarning && <Text style={[typography.caption, { color: palette.warning }]}>Не вдалося зберегти графік на пристрої. Після перезапуску він може бути недоступний.</Text>}
    </View>
  );
}
