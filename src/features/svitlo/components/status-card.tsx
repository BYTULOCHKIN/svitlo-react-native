import type { PowerState } from '../models';
import type { ScheduleView } from '../schedule-view';
import { Platform, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { formatMinute } from '../models';
import { countdownParts, eventLabel } from '../schedule-view';
import { states } from '../theme';
import { SvitloIcon } from './svitlo-icon';

export function StatusCard({ state, view }: { state: PowerState; view?: ScheduleView }) {
  const theme = states[state];
  return (
    <View style={{ borderRadius: 32, overflow: 'hidden', padding: 24, alignItems: 'center', marginHorizontal: 16 }}>
      <Svg style={{ position: 'absolute', inset: 0 }} width="100%" height="100%">
        <Defs>
          <LinearGradient id="status" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.gradient[0]} />
            <Stop offset="1" stopColor={theme.gradient[1]} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#status)" />
      </Svg>
      <View style={{ width: 80, height: 80, alignItems: 'center', justifyContent: 'center' }}><SvitloIcon name="bulb" size={64} color={theme.color} /></View>
      <Text style={{ color: theme.color, fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginTop: 16 }}>{view?.noOutagesPlanned ? 'Відключення не заплановані на сьогодні' : theme.title}</Text>
      <Text style={{ color: '#FFFFFF99', fontSize: 14, textAlign: 'center', marginTop: 8 }}>{view?.noOutagesPlanned ? 'За графіком оператора на весь день' : view?.next ? `Наступна подія: ${formatMinute(view.next.start)} — ${eventLabel(view.next.state)}` : 'Наступна подія невідома'}</Text>
      {view?.remainingSeconds != null && (
        <View style={{ width: '100%', backgroundColor: '#00000033', borderRadius: 24, padding: 16, marginTop: 32, alignItems: 'center' }}>
          <Text style={{ color: theme.color, fontSize: 11, letterSpacing: 2, marginBottom: 12 }}>ЗАЛИШИЛОСЬ</Text>
          <View accessibilityLabel={`Залишилось ${countdownParts(view.remainingSeconds).join(':')}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {countdownParts(view.remainingSeconds).map((part, index) => (
              <View key={['hours', 'minutes', 'seconds'][index]} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {index > 0 && <Text style={{ color: theme.color, fontSize: 22 }}>:</Text>}
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ width: 52, textAlign: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: '#1F293780', color: theme.color, fontWeight: 'bold', fontSize: 28, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>{part}</Text>
                  <Text style={{ color: '#FFFFFF66', fontSize: 10, marginTop: 8 }}>{['год', 'хв', 'сек'][index]}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
