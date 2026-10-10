import type { Ref } from 'react';
import type { TextProps } from 'react-native';
import { Text as NativeText } from 'react-native';
import { palette, typography } from './tokens';

type AppTextProps = TextProps & {
  ref?: Ref<NativeText>;
  variant?: keyof typeof typography;
  tone?: 'default' | 'secondary' | 'muted' | 'danger';
};

const tones = { default: palette.text, secondary: palette.secondary, muted: palette.muted, danger: palette.red };

export function AppText({ ref, variant = 'body', tone = 'default', style, ...props }: AppTextProps) {
  return <NativeText {...props} ref={ref} style={[typography[variant], { color: tones[tone] }, style]} />;
}
