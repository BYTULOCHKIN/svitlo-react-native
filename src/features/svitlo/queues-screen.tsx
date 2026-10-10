import type { PowerState } from './models';
import { ActivityIndicator, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScheduleFreshness } from './components/schedule-freshness';
import { useLocations } from './location-store';
import { toMatrixRows } from './schedule-matrix';
import { palette, states } from './theme';
import { useClock } from './use-clock';
import { useSchedule } from './use-schedule';

const colors: Record<PowerState, string> = { on: '#66BB6A', off: '#EF5350', possible: '#FFA726', unknown: '#333333' };
const hours = Array.from({ length: 24 }, (_, hour) => hour);

export function QueuesScreen() {
  const query = useSchedule(useClock());
  const { locations, selectedId } = useLocations();
  const active = locations.find(location => location.id === selectedId)?.queue;
  const rows = toMatrixRows(query.data?.queues ?? []);
  const width = Math.max(440, useWindowDimensions().width - 16);
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.background }}>
      <Text style={{ color: palette.text, fontSize: 24, padding: 16 }}>Загальний графік по всіх чергах</Text>
      <ScheduleFreshness snapshot={query.snapshot} current={!!query.currentDay} fetching={query.isFetching} failed={!!query.error} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 12, paddingBottom: 16 }}>
        {(Object.keys(colors) as PowerState[]).map(state => (
          <View key={state} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 10, backgroundColor: colors[state] }} />
            <Text style={{ color: palette.secondary, fontSize: 11 }}>{states[state].title}</Text>
          </View>
        ))}
      </View>
      {query.isPending && <ActivityIndicator color={palette.green} />}
      {query.error && (
        <View style={{ padding: 16 }}>
          <Text style={{ color: palette.red }}>{query.data ? 'Не вдалося оновити графік. Показано останні отримані дані.' : query.error.message}</Text>
          <Pressable accessibilityRole="button" onPress={() => { void query.refresh(); }} style={{ paddingVertical: 16 }}><Text style={{ color: palette.green }}>Спробувати ще раз</Text></Pressable>
        </View>
      )}
      {!query.isPending && !rows.length && <Text style={{ color: palette.secondary, padding: 16 }}>{query.currentDay?.noOutagesScope === 'region' ? 'Відключення не заплановані на сьогодні. Оператор не надав таблицю черг.' : 'Немає даних про графіки.'}</Text>}
      <ScrollView horizontal style={{ marginHorizontal: 8 }}>
        <ScrollView stickyHeaderIndices={[0]} style={{ width }}>
          <View style={{ flexDirection: 'row', paddingVertical: 4, backgroundColor: palette.background }}>
            <View style={{ width: 52 }} />
            {Array.from({ length: 12 }, (_, index) => <Text key={index} style={{ flex: 2, fontSize: 9, color: palette.muted }}>{index * 2}</Text>)}
            <View style={{ width: 52 }} />
          </View>
          {rows.map(row => (
            <View key={row.queue} accessibilityLabel={`Черга ${row.queue}${row.queue === active ? ', вибрана' : ''}, світло ${row.lightMinutes / 60} годин`} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingVertical: 5, marginBottom: 2, borderRadius: 6, backgroundColor: row.queue === active ? '#FFFFFF1A' : 'transparent' }}>
              <Text style={{ width: 48, color: palette.text, textAlign: 'center', fontWeight: 'bold' }}>{row.queue}</Text>
              <View style={{ flex: 1, flexDirection: 'row', height: 22, borderRadius: 4, overflow: 'hidden' }}>
                {hours.map(hour => <View key={hour} accessibilityLabel={`${hour}:30, ${states[row.hours[hour]].title}`} style={{ flex: 1, backgroundColor: colors[row.hours[hour]], borderWidth: 0.5, borderColor: palette.background }} />)}
              </View>
              <Text style={{ width: 48, textAlign: 'right', color: row.queue === active ? palette.text : colors.on, fontSize: 12 }}>
                {row.lightMinutes / 60}
                г
              </Text>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}
