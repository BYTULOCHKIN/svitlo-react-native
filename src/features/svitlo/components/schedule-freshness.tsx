import type { ScheduleSnapshot } from '../schedule-repository';
import { Text, View } from 'react-native';
import { palette } from '../theme';

export function ScheduleFreshness({ snapshot, current, fetching, failed }: { snapshot?: ScheduleSnapshot; current: boolean; fetching: boolean; failed: boolean }) {
  if (!snapshot)
    return null;
  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 4 }}>
      <Text style={{ color: current ? palette.secondary : '#FFA726', fontSize: 12 }}>{current ? `Графік на ${snapshot.day.date}` : `Збережений графік на ${snapshot.day.date}. Даних на сьогодні немає.`}</Text>
      <Text style={{ color: palette.secondary, fontSize: 12 }}>
        {fetching ? 'Оновлення… ' : failed ? 'Показано збережені дані. ' : ''}
        Отримано:
        {' '}
        {new Date(snapshot.updatedAt).toLocaleString('uk-UA')}
      </Text>
      {snapshot.persistenceWarning && <Text style={{ color: '#FFA726', fontSize: 12 }}>Не вдалося зберегти графік на пристрої. Після перезапуску він може бути недоступний.</Text>}
    </View>
  );
}
