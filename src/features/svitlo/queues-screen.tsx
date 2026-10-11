import type { PowerState } from './models';
import { ActivityIndicator, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/design-system/button';
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
  const { width: screenWidth, fontScale } = useWindowDimensions();
  const labelWidth = metrics.matrixLabel * Math.max(1, fontScale);
  const width = Math.max(metrics.matrixMinWidth * Math.max(1, fontScale), screenWidth - 2 * metrics.pageGutter);
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView style={{ flexGrow: 0, flexShrink: 0, maxHeight: '50%' }} contentContainerStyle={{ padding: metrics.pageGutter, gap: space.lg }}>
        <Text variant="title" accessibilityRole="header">Загальний графік по всіх чергах</Text>
        <ScheduleFreshness snapshot={query.snapshot} current={!!query.currentDay} fetching={query.isFetching} failed={!!query.error} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.md }}>
          {(Object.keys(colors) as PowerState[]).map(state => (
            <View key={state} style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs, maxWidth: '100%' }}>
              <View style={{ width: metrics.matrixDot, height: metrics.matrixDot, backgroundColor: colors[state] }} />
              <Text style={{ color: palette.secondary, ...typography.caption, flexShrink: 1 }}>{states[state].title}</Text>
            </View>
          ))}
        </View>
        {query.isPending && <ActivityIndicator color={palette.green} />}
        {query.error && (
          <View style={{ gap: space.md }}>
            <Text style={{ color: palette.red }}>{query.data ? 'Не вдалося оновити графік. Показано останні отримані дані.' : query.error.message}</Text>
            <AppButton variant="secondary" onPress={() => { void query.refresh(); }}>Спробувати ще раз</AppButton>
          </View>
        )}
        {!query.isPending && !rows.length && <Text tone="secondary">{query.currentDay?.noOutagesScope === 'region' ? 'Відключення не заплановані на сьогодні. Оператор не надав таблицю черг.' : 'Немає даних про графіки.'}</Text>}
      </ScrollView>
      <ScrollView horizontal style={{ flex: 1, marginHorizontal: metrics.pageGutter }}>
        <ScrollView stickyHeaderIndices={[0]} style={{ width }} contentContainerStyle={{ paddingBottom: space.xxl }}>
          <View style={{ backgroundColor: palette.background }}>
            <View style={{ flexDirection: 'row', paddingVertical: space.xs, paddingHorizontal: space.xs }}>
              <View style={{ width: labelWidth }} />
              {Array.from({ length: 12 }, (_, index) => <Text key={index} numberOfLines={1} style={{ flex: 2, ...typography.caption, color: palette.muted }}>{index * 2}</Text>)}
              <View style={{ width: labelWidth }} />
            </View>
          </View>
          {rows.map(row => (
            <View key={row.queue} accessibilityLabel={`Черга ${row.queue}${row.queue === active ? ', вибрана' : ''}, світло ${row.lightMinutes / 60} годин`} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xs, paddingVertical: metrics.matrixRowPadding, marginBottom: space.xxs, borderRadius: radius.small, backgroundColor: row.queue === active ? palette.subtle : palette.transparent }}>
              <Text style={{ width: labelWidth, color: palette.text, textAlign: 'center', fontFamily: fonts.semibold }}>{row.queue}</Text>
              <View style={{ flex: 1, flexDirection: 'row', height: metrics.matrixHeight * Math.max(1, fontScale), borderRadius: radius.small, overflow: 'hidden' }}>
                {hours.map(hour => <View key={hour} accessibilityLabel={`${hour}:30, ${states[row.hours[hour]].title}`} style={{ flex: 1, backgroundColor: colors[row.hours[hour]], borderWidth: metrics.matrixBorder, borderColor: palette.background }} />)}
              </View>
              <Text numberOfLines={1} style={{ width: labelWidth, textAlign: 'right', color: row.queue === active ? palette.text : colors.on, ...typography.caption }}>{`${row.lightMinutes / 60} г`}</Text>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}
