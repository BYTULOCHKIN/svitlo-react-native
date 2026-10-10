import type { PressableProps } from 'react-native';
import { MotiView } from 'moti';
import * as React from 'react';
import { useCallback } from 'react';
import {
  I18nManager,
  Pressable,

  View,
} from 'react-native';
import colors from '@/components/ui/colors';
import { AppIcon } from '@/design-system/icon';

import { metrics, palette } from '@/design-system/tokens';

import { Text } from './text';

const SIZE = 20;
const WIDTH = 50;
const HEIGHT = 28;
const THUMB_HEIGHT = 22;
const THUMB_WIDTH = 22;
const THUMB_OFFSET = 4;

export type RootProps = {
  onChange: (checked: boolean) => void;
  checked?: boolean;
  className?: string;
  accessibilityLabel: string;
} & Omit<PressableProps, 'onPress'>;

export type IconProps = {
  checked: boolean;
};

export function Root({
  checked = false,
  children,
  onChange,
  disabled,
  className = '',
  ...props
}: RootProps) {
  const handleChange = useCallback(() => {
    onChange(!checked);
  }, [onChange, checked]);

  return (
    <Pressable
      onPress={handleChange}
      className={`flex-row items-center ${className} ${
        disabled ? 'opacity-50' : ''
      }`}
      accessibilityState={{ checked }}
      disabled={disabled}
      {...props}
    >
      {children}
    </Pressable>
  );
}

type LabelProps = {
  text: string;
  className?: string;
  testID?: string;
};

function Label({ text, testID, className = '' }: LabelProps) {
  return (
    <Text testID={testID} className={`${className} pl-2`}>
      {text}
    </Text>
  );
}

export function CheckboxIcon({ checked = false }: IconProps) {
  const color = checked ? colors.primary[300] : colors.charcoal[400];
  return (
    <MotiView
      style={{
        height: SIZE,
        width: SIZE,
        borderColor: color,
      }}
      className="items-center justify-center rounded-[5px] border-2"
      from={{ backgroundColor: 'transparent', borderColor: '#CCCFD6' }}
      animate={{
        backgroundColor: checked ? color : 'transparent',
        borderColor: color,
      }}
      transition={{
        backgroundColor: { type: 'timing', duration: 100 },
        borderColor: { type: 'timing', duration: 100 },
      }}
    >
      <MotiView
        from={{ opacity: 0 }}
        animate={{ opacity: checked ? 1 : 0 }}
        transition={{ opacity: { type: 'timing', duration: 100 } }}
      >
        <AppIcon name="check" size={metrics.iconSmall} color={palette.white} />
      </MotiView>
    </MotiView>
  );
}

function CheckboxRoot({ checked = false, children, ...props }: RootProps) {
  return (
    <Root checked={checked} accessibilityRole="checkbox" {...props}>
      {children}
    </Root>
  );
}

function CheckboxBase({
  checked = false,
  testID,
  label,

  ...props
}: RootProps & { label?: string }) {
  return (
    <CheckboxRoot checked={checked} testID={testID} {...props}>
      <CheckboxIcon checked={checked} />
      {label
        ? (
            <Label
              text={label}
              testID={testID ? `${testID}-label` : undefined}
              className="pr-2"
            />
          )
        : null}
    </CheckboxRoot>
  );
}

export const Checkbox = Object.assign(CheckboxBase, {
  Icon: CheckboxIcon,
  Root: CheckboxRoot,
  Label,
});

export function RadioIcon({ checked = false }: IconProps) {
  const color = checked ? colors.primary[300] : colors.charcoal[400];
  return (
    <MotiView
      style={{
        height: SIZE,
        width: SIZE,
        borderColor: color,
      }}
      className="items-center justify-center rounded-lg border-2 bg-transparent"
      from={{ borderColor: '#CCCFD6' }}
      animate={{
        borderColor: color,
      }}
      transition={{ borderColor: { duration: 100, type: 'timing' } }}
    >
      <MotiView
        className={`size-2.5 rounded-[10px] ${checked && 'bg-primary-300'}`}
        from={{ opacity: 0 }}
        animate={{ opacity: checked ? 1 : 0 }}
        transition={{ opacity: { duration: 50, type: 'timing' } }}
      />
    </MotiView>
  );
}

function RadioRoot({ checked = false, children, ...props }: RootProps) {
  return (
    <Root checked={checked} accessibilityRole="radio" {...props}>
      {children}
    </Root>
  );
}

function RadioBase({
  checked = false,
  testID,
  label,
  ...props
}: RootProps & { label?: string }) {
  return (
    <RadioRoot checked={checked} testID={testID} {...props}>
      <RadioIcon checked={checked} />
      {label
        ? (
            <Label text={label} testID={testID ? `${testID}-label` : undefined} />
          )
        : null}
    </RadioRoot>
  );
}

export const Radio = Object.assign(RadioBase, {
  Icon: RadioIcon,
  Root: RadioRoot,
  Label,
});

export function SwitchIcon({ checked = false }: IconProps) {
  const translateX = checked
    ? THUMB_OFFSET
    : WIDTH - THUMB_WIDTH - THUMB_OFFSET;

  const backgroundColor = checked ? colors.primary[300] : colors.charcoal[400];

  return (
    <View className="w-12.5 justify-center">
      <View className="overflow-hidden rounded-full">
        <View
          style={{
            width: WIDTH,
            height: HEIGHT,
            backgroundColor,
          }}
        />
      </View>
      <MotiView
        style={{
          height: THUMB_HEIGHT,
          width: THUMB_WIDTH,
          position: 'absolute',
          backgroundColor: 'white',
          borderRadius: 13,
          right: 0,
        }}
        animate={{
          translateX: I18nManager.isRTL ? translateX : -translateX,
        }}
        transition={{ translateX: { overshootClamping: true } }}
      />
    </View>
  );
}
function SwitchRoot({ checked = false, children, ...props }: RootProps) {
  return (
    <Root checked={checked} accessibilityRole="switch" {...props}>
      {children}
    </Root>
  );
}

function SwitchBase({
  checked = false,
  testID,
  label,
  ...props
}: RootProps & { label?: string }) {
  return (
    <SwitchRoot checked={checked} testID={testID} {...props}>
      <SwitchIcon checked={checked} />
      {label
        ? (
            <Label text={label} testID={testID ? `${testID}-label` : undefined} />
          )
        : null}
    </SwitchRoot>
  );
}

export const Switch = Object.assign(SwitchBase, {
  Icon: SwitchIcon,
  Root: SwitchRoot,
  Label,
});
