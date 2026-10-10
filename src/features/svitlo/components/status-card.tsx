import type { PowerState } from '../models';
import type { ScheduleView } from '../schedule-view';
import { Fragment } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AppText as Text } from '@/design-system/text';
import { fonts, metrics, palette, radius, space, statusCardColors, typography } from '@/design-system/tokens';
import { formatMinute } from '../models';
import { countdownParts, eventLabel } from '../schedule-view';
import { states } from '../theme';
import { SvitloIcon } from './svitlo-icon';

export function StatusCard({ state, view, updatedAt }: { state: PowerState; view?: ScheduleView; updatedAt?: number }) {
  const theme = statusCardColors[state];
  const { width, fontScale } = useWindowDimensions();
  const largeText = fontScale > metrics.timerStackFontScale;
  const inlineTimestamp = width < metrics.timerStackWidth || largeText;
  const title = view?.noOutagesPlanned ? 'Світло на весь день' : state === 'on' ? 'Світло Є!' : states[state].title;
  const nextLabel = view?.noOutagesPlanned
    ? 'Відключення не заплановані на сьогодні'
    : view?.next ? `${eventLabel(view.next.state)} · ${formatMinute(view.next.start)}` : 'Наступна подія невідома';
  const updated = updatedAt != null ? new Date(updatedAt) : undefined;
  return (
    <View style={[styles.card, { minHeight: view?.remainingSeconds != null ? metrics.statusCardHeight : metrics.statusCardShortHeight }]}>
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
          {updated && (
            <Text
              accessibilityLabel={`Останнє оновлення графіка: ${updated.toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}, Київ`}
              style={[typography.caption, styles.updated, !inlineTimestamp && styles.cornerTimestamp]}
            >
              {`Оновлено ${updated.toLocaleTimeString('uk-UA', { timeZone: 'Europe/Kyiv', hour: '2-digit', minute: '2-digit' })}`}
            </Text>
          )}
          <SvitloIcon name="bulb" size={metrics.compactHeroIcon} color={theme.color} opacity={state === 'off' ? 0.6 : 1} />
        </View>
        <Text style={[typography.heroTitle, styles.centered, { color: theme.color }]}>{title}</Text>
        <View style={styles.event}>
          <SvitloIcon name={state === 'on' ? 'zapOff' : 'zap'} size={metrics.iconSmall} color={palette.heroSecondary} />
          <Text style={[typography.label, styles.description]}>{nextLabel}</Text>
        </View>
        {view?.remainingSeconds != null && <Countdown seconds={view.remainingSeconds} color={theme.color} stacked={largeText} />}
      </View>
    </View>
  );
}

function Countdown({ seconds, color, stacked }: { seconds: number; color: string; stacked: boolean }) {
  return (
    <View style={styles.countdown}>
      <Text style={[typography.timerLabel, styles.centered, { color, opacity: 0.7 }]}>ЗАЛИШИЛОСЬ</Text>
      <View accessible accessibilityLabel={`Залишилось ${countdownParts(seconds).join(':')}`} style={[styles.digits, stacked && styles.largeDigits]}>
        {countdownParts(seconds).map((part, index) => (
          <Fragment key={['hours', 'minutes', 'seconds'][index]}>
            {index > 0 && !stacked && <Text style={[typography.heroTitle, styles.separator, { color }]}>:</Text>}
            <View style={[styles.digit, stacked && styles.largeDigit]}>
              <Text style={[typography.heroTimer, styles.number, { color }]}>{part}</Text>
              <Text style={[typography.timerUnit, styles.unit]}>{['год', 'хв', 'сек'][index]}</Text>
            </View>
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.hero, overflow: 'hidden', justifyContent: 'center' },
  content: { padding: space.lg, gap: space.xs, alignItems: 'center' },
  heading: { width: '100%', alignItems: 'center', gap: space.xs },
  updated: { alignSelf: 'flex-end', color: palette.heroSecondary, textAlign: 'right' },
  cornerTimestamp: { position: 'absolute', top: 0, right: 0 },
  centered: { textAlign: 'center' },
  event: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs },
  description: { flexShrink: 1, color: palette.heroSecondary, textAlign: 'center' },
  countdown: { width: '100%', backgroundColor: palette.timerSurface, borderRadius: radius.dialog, paddingHorizontal: space.sm, paddingVertical: space.xs, gap: space.xs },
  digits: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: space.sm },
  largeDigits: { flexDirection: 'column', alignItems: 'stretch' },
  largeDigit: { flex: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  digit: { flex: 1, minWidth: 0, gap: space.xs },
  number: { textAlign: 'center', paddingVertical: space.xs, borderRadius: radius.control, backgroundColor: palette.timerBackground, fontFamily: Platform.OS === 'ios' ? fonts.monospaceIOS : fonts.monospaceAndroid },
  unit: { textAlign: 'center', color: palette.heroMuted },
  separator: { opacity: 0.5, paddingTop: space.xs },
});
