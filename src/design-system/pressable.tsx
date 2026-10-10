import type { PressableProps } from 'react-native';
import { Pressable as NativePressable } from 'react-native';
import { metrics, motion } from './tokens';

export function AppPressable({ style, ...props }: PressableProps) {
  return <NativePressable {...props} style={state => [{ minHeight: metrics.touchTarget }, typeof style === 'function' ? style(state) : style, state.pressed && { opacity: motion.pressedOpacity }, props.disabled && { opacity: motion.disabledOpacity }]} />;
}
