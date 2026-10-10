import type { PowerState } from '../models';
import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { states } from '../theme';
import { SvitloIcon } from './svitlo-icon';

export function StatusCard({ state }: { state: PowerState }) {
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
      <Text style={{ color: theme.color, fontSize: 32, fontWeight: 'bold', textAlign: 'center', marginTop: 16 }}>{theme.title}</Text>
    </View>
  );
}
