import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, ReactNode, Ref, RefAttributes } from 'react';
import type { PressableProps } from 'react-native';
import { createButton } from '@gluestack-ui/core/button/creator';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './text';
import { metrics, motion, palette, radius, space } from './tokens';

type ButtonSurfaceProps = PressableProps & { ref?: Ref<View>; states?: { focusVisible?: boolean } };

function ButtonSurface({ ref, states, style, ...props }: ButtonSurfaceProps) {
  return <Pressable {...props} ref={ref} style={state => [typeof style === 'function' ? style(state) : style, states?.focusVisible && styles.focus]} />;
}

const ButtonParts = createButton({ Root: ButtonSurface, Text: AppText, Group: View, Spinner: ActivityIndicator, Icon: View });
// The creator types its ref as the props object; the runtime forwards the native View.
const ButtonRoot = ButtonParts as unknown as ForwardRefExoticComponent<ComponentPropsWithoutRef<typeof ButtonParts> & RefAttributes<View>>;

export type AppButtonProps = Omit<PressableProps, 'children'> & {
  ref?: Ref<View>;
  children?: ReactNode;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
};

const variants = {
  primary: { background: palette.green, foreground: palette.onAccent },
  secondary: { background: palette.subtle, foreground: palette.green },
  ghost: { background: palette.transparent, foreground: palette.text },
  danger: { background: palette.red, foreground: palette.background },
};

export function AppButton({ ref, children, icon, variant = 'primary', loading = false, disabled = false, style, accessibilityState, ...props }: AppButtonProps) {
  const colors = variants[variant];
  const blocked = disabled || loading;
  return (
    <ButtonRoot
      {...props}
      ref={ref}
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, disabled: blocked, busy: loading }}
      isDisabled={blocked}
      style={state => [styles.button, { backgroundColor: colors.background }, state.pressed && { opacity: motion.pressedOpacity }, disabled && { opacity: motion.disabledOpacity }, typeof style === 'function' ? style(state) : style]}
    >
      {loading && <ActivityIndicator color={colors.foreground} accessible={false} />}
      {!loading && icon && <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{icon}</View>}
      {children != null && <AppText variant="emphasis" style={{ color: colors.foreground, textAlign: 'center', flexShrink: 1 }}>{children}</AppText>}
    </ButtonRoot>
  );
}

export function AppIconButton(props: Omit<AppButtonProps, 'children'> & { accessibilityLabel: string; icon: ReactNode }) {
  return <AppButton variant="ghost" {...props} style={state => [styles.iconButton, typeof props.style === 'function' ? props.style(state) : props.style]} />;
}

export function ActionButton({ children, onPress, secondary = false, disabled = false }: { children: ReactNode; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <AppButton onPress={onPress} variant={secondary ? 'secondary' : 'primary'} disabled={disabled}>{children}</AppButton>;
}

const styles = StyleSheet.create({
  button: { minHeight: metrics.touchTarget, minWidth: metrics.touchTarget, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.control, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, borderWidth: metrics.hairline, borderColor: palette.transparent },
  iconButton: { padding: space.md },
  focus: { borderColor: palette.text },
});
