import type { ScheduleView } from '../schedule-view';
import { StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/design-system/text';
import { metrics, palette, radius, space, typography } from '@/design-system/tokens';
import { formatMinute } from '../models';
import { states } from '../theme';

export function ScheduleTimeline({ view }: { view: ScheduleView }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={typography.section}>Графік на сьогодні</Text>
      {!view.intervals.length && <Text style={styles.empty}>Даних на сьогодні поки немає</Text>}
      {view.intervals.map((interval) => {
        const theme = states[interval.state];
        return (
          <View key={interval.start} style={[styles.row, { backgroundColor: interval.isCurrent ? theme.surface : palette.card, borderColor: interval.isCurrent ? theme.border : palette.border }]}>
            <View style={[styles.indicator, { backgroundColor: theme.color }]} />
            <View style={styles.content}>
              <View style={styles.timeRow}>
                <Text style={typography.emphasis}>{`${formatMinute(interval.start)} — ${formatMinute(interval.end)}`}</Text>
                {interval.isCurrent && <Text style={[typography.caption, { color: theme.color }]}>Зараз</Text>}
              </View>
              <Text style={[typography.label, { color: theme.color }]}>{theme.title}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  row: { padding: space.md, borderRadius: radius.control, borderWidth: metrics.hairline, flexDirection: 'row', alignItems: 'center', gap: space.md },
  indicator: { width: space.xs, alignSelf: 'stretch', borderRadius: radius.pill },
  content: { flex: 1, minWidth: 0, gap: space.xs },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  empty: { color: palette.secondary },
});
