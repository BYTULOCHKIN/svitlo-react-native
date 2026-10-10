import type { ReactNode } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { AppText } from './text';
import { metrics, motion, palette, radius, space, typography } from './tokens';

export function ActionButton({ children, onPress, secondary = false, disabled = false }: { children: ReactNode; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, secondary ? styles.secondary : styles.primary, (pressed || disabled) && { opacity: motion.pressedOpacity }]}>
      <AppText style={[typography.emphasis, { textAlign: 'center', color: secondary ? palette.green : palette.onAccent }]}>{children}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: metrics.touchTarget, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.control, justifyContent: 'center' },
  primary: { backgroundColor: palette.green },
  secondary: { backgroundColor: palette.subtle },
});
