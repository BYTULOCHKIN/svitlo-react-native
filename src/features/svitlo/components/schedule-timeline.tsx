import type { ScheduleView } from '../schedule-view';
import { StyleSheet, View } from 'react-native';
import { AppText as Text } from '@/design-system/text';
import { metrics, palette, radius, space, timelineColors, typography } from '@/design-system/tokens';
import { formatMinute } from '../models';
import { eventLabel } from '../schedule-view';
import { states } from '../theme';
import { SvitloIcon } from './svitlo-icon';

export function ScheduleTimeline({ view }: { view: ScheduleView }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={typography.section}>Графік на сьогодні</Text>
      {!view.intervals.length && <Text style={styles.empty}>Даних на сьогодні поки немає</Text>}
      {view.intervals.map((interval) => {
        const theme = timelineColors[interval.state];
        const hasCountdown = interval.isCurrent && view.next && view.remainingSeconds != null;
        const seconds = view.remainingSeconds ?? 0;
        return (
          <View key={interval.start} style={[styles.row, { backgroundColor: theme.surface }, interval.isCurrent && [styles.current, { borderColor: theme.border }]]}>
            <View style={[styles.icon, { backgroundColor: theme.surface }]}>
              <SvitloIcon name={interval.state === 'on' ? 'zap' : interval.state === 'off' ? 'zapOff' : 'bulb'} size={metrics.timelineIcon} color={theme.color} />
            </View>
            <View style={styles.content}>
              <View style={styles.timeRow}>
                <Text style={interval.isCurrent ? typography.emphasis : typography.body}>{`${formatMinute(interval.start)} — ${formatMinute(interval.end)}`}</Text>
                {interval.isCurrent && (
                  <View style={[styles.badge, { backgroundColor: theme.badge }]}>
                    <Text style={[typography.timelineBadge, { color: theme.color }]}>ЗАРАЗ</Text>
                  </View>
                )}
              </View>
              <Text style={[typography.caption, { color: theme.color, opacity: 0.8 }]}>{states[interval.state].title}</Text>
              {hasCountdown && (
                <View>
                  <Text style={[typography.caption, { color: theme.color, opacity: 0.8 }]}>{eventLabel(view.next!.state)}</Text>
                  <Text style={[typography.timelineCountdown, { color: theme.color }]}>{`${Math.floor(seconds / 3600)} год ${Math.floor(seconds % 3600 / 60)} хв`}</Text>
                </View>
              )}
              {interval.isCurrent && view.noOutagesPlanned && <Text style={[typography.caption, { color: theme.color }]}>Відключення не заплановані на сьогодні</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: metrics.timelineGap },
  row: { minHeight: metrics.timelineRowHeight, paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.timeline, flexDirection: 'row', alignItems: 'center', gap: space.lg },
  current: { minHeight: metrics.timelineCurrentHeight, paddingVertical: space.md, borderWidth: metrics.timelineBorder },
  icon: { width: metrics.touchTarget, height: metrics.touchTarget, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, minWidth: 0, gap: space.xs },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  badge: { paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radius.pill },
  empty: { color: palette.secondary },
});
