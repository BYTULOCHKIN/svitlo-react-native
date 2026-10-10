import type { ReactNode, Ref } from 'react';
import type { PressableProps } from 'react-native';
import { createRadio } from '@gluestack-ui/core/radio/creator';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { AppIcon } from './icon';
import { AppText } from './text';
import { fontSize, metrics, motion, palette, radius, space } from './tokens';

type ChoiceSurfaceProps = PressableProps & { ref?: Ref<View>; states?: { focusVisible?: boolean } };

function ChoiceSurface({ ref, states, style, ...props }: ChoiceSurfaceProps) {
  return <Pressable {...props} ref={ref} style={state => [typeof style === 'function' ? style(state) : style, states?.focusVisible && styles.focus]} />;
}

const Radio = createRadio({ Root: ChoiceSurface, Group: View, Icon: View, Indicator: View, Label: AppText });

export type ChoiceOption<T extends string> = { value: T; label: string; accessibilityLabel?: string; icon?: ReactNode; disabled?: boolean };
type Props<T extends string> = { label: string; options: readonly ChoiceOption<T>[]; value: T | ''; onChange: (value: T) => void; iconOnly?: boolean; disabled?: boolean };

export function AppChoiceGrid<T extends string>({ label, options, value, onChange, iconOnly = false, disabled = false }: Props<T>) {
  const { width, fontScale } = useWindowDimensions();
  const [measuredWidth, setMeasuredWidth] = useState<number>();
  const availableWidth = measuredWidth ?? Math.max(metrics.touchTarget, width - 2 * (space.lg + space.xxl));
  const labelLength = Math.max(1, ...options.map(option => option.label.length));
  const minimumWidth = iconOnly ? metrics.touchTarget + space.lg : Math.max(metrics.touchTarget, labelLength * fontSize.emphasis * fontScale * 0.75 + 2 * space.md + metrics.iconSmall + space.sm);
  const columns = Math.max(1, Math.floor((availableWidth + space.sm) / (minimumWidth + space.sm)));
  const choiceWidth = (availableWidth - (columns - 1) * space.sm) / columns;

  function change(next: string) {
    const option = options.find(option => option.value === next);
    if (option && !option.disabled && !disabled)
      onChange(option.value);
  }

  return (
    <View style={styles.container}>
      <AppText variant="label" tone="secondary">{label}</AppText>
      <Radio.Group aria-label={label} accessibilityLabel={label} value={value} onChange={change} isDisabled={disabled} style={styles.grid} onLayout={event => setMeasuredWidth(event.nativeEvent.layout.width)}>
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <Radio key={option.value} value={option.value} aria-label={option.accessibilityLabel ?? option.label} accessibilityLabel={option.accessibilityLabel ?? option.label} accessibilityRole="radio" accessibilityState={{ checked, disabled: disabled || option.disabled }} isDisabled={disabled || option.disabled} style={state => [styles.choice, { width: choiceWidth }, checked && styles.checked, state.pressed && styles.pressed, (disabled || option.disabled) && styles.disabled]}>
              {option.icon && <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">{option.icon}</View>}
              {!iconOnly && <AppText variant="emphasis" style={styles.label}>{option.label}</AppText>}
              {checked && <View style={iconOnly ? styles.iconCheck : undefined} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><AppIcon name="check" color={palette.green} size={metrics.iconSmall} /></View>}
            </Radio>
          );
        })}
      </Radio.Group>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  choice: { minWidth: metrics.touchTarget, minHeight: metrics.touchTarget, padding: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm, borderRadius: radius.control, backgroundColor: palette.subtle, borderWidth: metrics.hairline, borderColor: palette.muted },
  label: { flexShrink: 1, textAlign: 'center' },
  checked: { borderColor: palette.green, backgroundColor: palette.selected },
  focus: { borderColor: palette.text },
  pressed: { opacity: motion.pressedOpacity },
  disabled: { opacity: motion.disabledOpacity },
  iconCheck: { position: 'absolute', top: space.xxs, right: space.xxs },
});
