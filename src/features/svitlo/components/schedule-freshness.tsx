import type { ScheduleSnapshot } from '../schedule-repository';
import { View } from 'react-native';
import { AppText as Text } from '@/design-system/text';
import { palette, space, typography } from '@/design-system/tokens';

export function ScheduleFreshness({ snapshot, current, fetching, failed }: { snapshot?: ScheduleSnapshot; current: boolean; fetching: boolean; failed: boolean }) {
  if (!snapshot)
    return null;
  return (
    <View style={{ gap: space.xs }}>
      {!current && <Text style={[typography.caption, { color: palette.warning }]}>{`Збережений графік на ${snapshot.day.date}. Даних на сьогодні немає.`}</Text>}
      <Text style={[typography.caption, { color: palette.secondary }]}>
        {fetching ? 'Оновлення… · ' : failed ? 'Збережені дані · ' : ''}
        {`Отримано ${new Date(snapshot.updatedAt).toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} (Київ)`}
      </Text>
      {snapshot.persistenceWarning && <Text style={[typography.caption, { color: palette.warning }]}>Не вдалося зберегти графік на пристрої. Після перезапуску він може бути недоступний.</Text>}
    </View>
  );
}
