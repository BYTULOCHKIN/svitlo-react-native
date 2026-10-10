import type { ComponentPropsWithoutRef, ForwardRefExoticComponent, Ref, RefAttributes } from 'react';
import type { TextInputProps } from 'react-native';
import { createInput } from '@gluestack-ui/core/input/creator';
import { useId, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { AppText } from './text';
import { metrics, motion, palette, radius, space, typography } from './tokens';

type InputSurfaceProps = TextInputProps & { 'ref'?: Ref<TextInput>; 'aria-describedby'?: string };

function InputSurface({ ref, accessibilityElementsHidden: _hidden, ...props }: InputSurfaceProps) {
  // Disabled inputs remain discoverable; gluestack otherwise hides them on iOS.
  return <TextInput {...props} ref={ref} editable={!props.readOnly} accessibilityElementsHidden={false} />;
}

const InputParts = createInput({ Root: View, Input: InputSurface, Icon: View, Slot: Pressable });
// Gluestack forwards the native TextInput, despite declaring the ref as its props.
const InputField = InputParts.Input as unknown as ForwardRefExoticComponent<ComponentPropsWithoutRef<typeof InputParts.Input> & RefAttributes<TextInput>>;

export type AppInputProps = TextInputProps & {
  ref?: Ref<TextInput>;
  label: string;
  helperText?: string;
  error?: string;
  disabled?: boolean;
};

export function AppInput({ ref, label, helperText, error, disabled = false, style, onFocus, onBlur, accessibilityLabel, accessibilityHint, ...props }: AppInputProps) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const message = error || helperText;
  return (
    <View style={styles.container}>
      <AppText variant="label" tone={error ? 'danger' : 'secondary'}>{label}</AppText>
      <InputParts isDisabled={disabled} isInvalid={!!error}>
        <InputField
          {...props}
          ref={ref}
          aria-label={accessibilityLabel ?? label}
          aria-describedby={message ? `${id}-message` : undefined}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={[accessibilityHint, message].filter(Boolean).join('. ') || undefined}
          accessibilityState={{ ...props.accessibilityState, disabled }}
          editable={!disabled && props.editable !== false}
          placeholderTextColor={palette.muted}
          style={[styles.field, focused && styles.focused, !!error && styles.invalid, disabled && styles.disabled, style]}
          onFocus={(event: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
            setFocused(false);
            onBlur?.(event);
          }}
        />
      </InputParts>
      {message && <AppText nativeID={`${id}-message`} variant="caption" tone={error ? 'danger' : 'secondary'} accessibilityRole={error ? 'alert' : undefined} accessibilityLiveRegion={error ? 'polite' : undefined}>{message}</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: space.sm },
  field: { ...typography.body, minHeight: metrics.touchTarget, color: palette.text, borderWidth: metrics.hairline, borderColor: palette.muted, borderRadius: radius.control, backgroundColor: palette.raised, paddingHorizontal: space.md, paddingVertical: space.md },
  focused: { borderColor: palette.green },
  invalid: { borderColor: palette.red },
  disabled: { opacity: motion.disabledOpacity },
});
