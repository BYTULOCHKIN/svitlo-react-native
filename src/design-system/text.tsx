import type { TextProps } from 'react-native';
import { Text as NativeText } from 'react-native';
import { palette, typography } from './tokens';

export function AppText({ style, ...props }: TextProps) {
  return <NativeText {...props} style={[typography.body, { color: palette.text }, style]} />;
}
