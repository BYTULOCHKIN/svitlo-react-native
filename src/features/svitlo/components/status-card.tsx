import type { PowerState } from '../models';
import type { ScheduleView } from '../schedule-view';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AppText as Text } from '@/design-system/text';
import { metrics, palette, radius, space, typography } from '@/design-system/tokens';
import { formatMinute } from '../models';
import { countdownParts, eventLabel } from '../schedule-view';
import { states } from '../theme';
import { SvitloIcon } from './svitlo-icon';

export function StatusCard({ state, view }: { state: PowerState; view?: ScheduleView }) {
  const theme = states[state];
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < metrics.timerStackWidth || fontScale > metrics.timerStackFontScale;
  const nextLabel = view?.next ? eventLabel(view.next.state) : 'Наступна подія невідома';
  return (
    <View style={[styles.card, { borderColor: theme.border }]}>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="status" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.gradient[0]} />
            <Stop offset="1" stopColor={theme.gradient[1]} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#status)" />
      </Svg>
      <View style={styles.content}>
        <View style={styles.heading}>
          <View style={[styles.icon, { backgroundColor: theme.surface }]}><SvitloIcon name="bulb" size={metrics.heroIcon} color={theme.color} /></View>
          <View style={styles.headingText}>
            <Text style={[typography.caption, { color: theme.color }]}>ЗАРАЗ · ЗА ГРАФІКОМ</Text>
            <Text style={typography.title}>{view?.noOutagesPlanned ? 'Світло на весь день' : theme.title}</Text>
          </View>
        </View>
        {view?.remainingSeconds != null
          ? (
              <View style={[styles.countdown, { borderColor: theme.border }]}>
                <View style={[styles.event, stacked && styles.stacked]}>
                  <Text style={[typography.label, styles.eventLabel]}>{nextLabel}</Text>
                  {view.next && <Text style={[typography.emphasis, { color: theme.color }]}>{formatMinute(view.next.start)}</Text>}
                </View>
                <View accessible accessibilityLabel={`Залишилось ${countdownParts(view.remainingSeconds).join(':')}`} style={[styles.digits, fontScale > metrics.timerStackFontScale && styles.largeDigits]}>
                  {countdownParts(view.remainingSeconds).map((part, index) => (
                    <View key={['hours', 'minutes', 'seconds'][index]} style={[styles.digit, fontScale > metrics.timerStackFontScale && styles.largeDigit]}>
                      <Text style={[typography.timer, { color: theme.color, textAlign: 'center' }]}>{part}</Text>
                      <Text style={[typography.caption, { color: palette.secondary, textAlign: 'center' }]}>{['год', 'хв', 'сек'][index]}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )
          : <Text style={[typography.body, styles.description]}>{view?.noOutagesPlanned ? 'Відключення не заплановані на сьогодні' : nextLabel}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, borderWidth: metrics.hairline, overflow: 'hidden' },
  content: { padding: space.lg, gap: space.md },
  heading: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  headingText: { flex: 1, minWidth: 0, gap: space.xs },
  icon: { width: metrics.touchTarget, height: metrics.touchTarget, borderRadius: radius.control, justifyContent: 'center', alignItems: 'center' },
  countdown: { borderTopWidth: metrics.hairline, paddingTop: space.md, gap: space.sm },
  event: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stacked: { flexDirection: 'column', alignItems: 'flex-start' },
  eventLabel: { flexShrink: 1, color: palette.secondary },
  digits: { flexDirection: 'row', gap: space.sm },
  largeDigits: { flexDirection: 'column' },
  largeDigit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  digit: { flex: 1, minWidth: 0, paddingVertical: space.xs },
  description: { color: palette.secondary },
});
