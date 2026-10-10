import type { ScheduleView } from '../schedule-view';
import { Text, View } from 'react-native';
import { formatMinute } from '../models';
import { eventLabel } from '../schedule-view';
import { palette, states } from '../theme';
import { SvitloIcon } from './svitlo-icon';

export function ScheduleTimeline({ view }: { view: ScheduleView }) {
  return (
    <View style={{ marginHorizontal: 16, marginTop: 24, gap: 6 }}>
      <Text style={{ color: palette.text, fontSize: 18, marginBottom: 4 }}>Графік на сьогодні</Text>
      {!view.intervals.length && <Text style={{ color: palette.secondary }}>Немає даних на сьогодні</Text>}
      {view.intervals.map((interval) => {
        const theme = states[interval.state];
        return (
          <View key={interval.start} style={{ minHeight: interval.isCurrent ? 110 : 70, padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: `${theme.gradient[0]}99`, borderWidth: interval.isCurrent ? 2 : 0, borderColor: `${theme.color}99` }}>
            <View style={{ width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: `${theme.color}18` }}><SvitloIcon name="bulb" color={theme.color} /></View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: palette.text, fontSize: interval.isCurrent ? 18 : 14 }}>{`${formatMinute(interval.start)} - ${formatMinute(interval.end)}`}</Text>
              <Text style={{ color: theme.color, fontSize: 13 }}>{theme.title}</Text>
              {interval.isCurrent && <Text style={{ color: palette.secondary, fontSize: 12 }}>{view.next && view.remainingSeconds != null ? `${eventLabel(view.next.state)}: ${Math.floor(view.remainingSeconds / 3600)} год ${Math.floor(view.remainingSeconds % 3600 / 60)} хв` : 'Наступна подія невідома'}</Text>}
            </View>
          </View>
        );
      })}
    </View>
  );
}
