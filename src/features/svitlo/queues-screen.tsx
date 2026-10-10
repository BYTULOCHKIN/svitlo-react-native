import type { PowerState } from './models';
import { ActivityIndicator, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppPressable as Pressable } from '@/design-system/pressable';
import { AppText as Text } from '@/design-system/text';
import { fonts, metrics, palette, powerColors, radius, space, typography } from '@/design-system/tokens';
import { ScheduleFreshness } from './components/schedule-freshness';
import { useLocations } from './location-store';
import { toMatrixRows } from './schedule-matrix';
import { states } from './theme';
import { useClock } from './use-clock';
import { useSchedule } from './use-schedule';

const colors: Record<PowerState, string> = { on: powerColors.on.color, off: powerColors.off.color, possible: powerColors.possible.color, unknown: powerColors.unknown.surface };
const hours = Array.from({ length: 24 }, (_, hour) => hour);

export function QueuesScreen() {
  const query = useSchedule(useClock());
  const { locations, selectedId } = useLocations();
  const active = locations.find(location => location.id === selectedId)?.queue;
  const rows = toMatrixRows(query.data?.queues ?? []);
  const width = Math.max(metrics.matrixMinWidth, useWindowDimensions().width - space.lg);
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.background }}>
      <Text style={{ color: palette.text, ...typography.title, padding: space.lg }}>Загальний графік по всіх чергах</Text>
      <View style={{ paddingHorizontal: metrics.pageGutter, paddingBottom: space.lg }}>
        <ScheduleFreshness snapshot={query.snapshot} current={!!query.currentDay} fetching={query.isFetching} failed={!!query.error} />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: space.lg, gap: space.md, paddingBottom: space.lg }}>
        {(Object.keys(colors) as PowerState[]).map(state => (
          <View key={state} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
            <View style={{ width: metrics.matrixDot, height: metrics.matrixDot, backgroundColor: colors[state] }} />
            <Text style={{ color: palette.secondary, ...typography.caption }}>{states[state].title}</Text>
          </View>
        ))}
      </View>
      {query.isPending && <ActivityIndicator color={palette.green} />}
      {query.error && (
        <View style={{ padding: space.lg, minHeight: metrics.touchTarget }}>
          <Text style={{ color: palette.red }}>{query.data ? 'Не вдалося оновити графік. Показано останні отримані дані.' : query.error.message}</Text>
          <Pressable android_ripple={{ color: palette.pressed }} accessibilityRole="button" onPress={() => { void query.refresh(); }} style={{ paddingVertical: space.lg }}><Text style={{ color: palette.green }}>Спробувати ще раз</Text></Pressable>
        </View>
      )}
      {!query.isPending && !rows.length && <Text style={{ color: palette.secondary, padding: space.lg }}>{query.currentDay?.noOutagesScope === 'region' ? 'Відключення не заплановані на сьогодні. Оператор не надав таблицю черг.' : 'Немає даних про графіки.'}</Text>}
      <ScrollView horizontal style={{ marginHorizontal: space.sm }}>
        <ScrollView stickyHeaderIndices={[0]} style={{ width }}>
          <View style={{ flexDirection: 'row', paddingVertical: space.xs, backgroundColor: palette.background }}>
            <View style={{ width: metrics.matrixHeaderLabel }} />
            {Array.from({ length: 12 }, (_, index) => <Text key={index} style={{ flex: 2, ...typography.caption, color: palette.muted }}>{index * 2}</Text>)}
            <View style={{ width: metrics.matrixHeaderLabel }} />
          </View>
          {rows.map(row => (
            <View key={row.queue} accessibilityLabel={`Черга ${row.queue}${row.queue === active ? ', вибрана' : ''}, світло ${row.lightMinutes / 60} годин`} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xs, paddingVertical: metrics.matrixRowPadding, marginBottom: space.xxs, borderRadius: radius.small, backgroundColor: row.queue === active ? palette.subtle : palette.transparent }}>
              <Text style={{ width: metrics.matrixLabel, color: palette.text, textAlign: 'center', fontFamily: fonts.semibold }}>{row.queue}</Text>
              <View style={{ flex: 1, flexDirection: 'row', height: metrics.matrixHeight, borderRadius: radius.small, overflow: 'hidden' }}>
                {hours.map(hour => <View key={hour} accessibilityLabel={`${hour}:30, ${states[row.hours[hour]].title}`} style={{ flex: 1, backgroundColor: colors[row.hours[hour]], borderWidth: metrics.matrixBorder, borderColor: palette.background }} />)}
              </View>
              <Text style={{ width: metrics.matrixLabel, textAlign: 'right', color: row.queue === active ? palette.text : colors.on, ...typography.caption }}>
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
