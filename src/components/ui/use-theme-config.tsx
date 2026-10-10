import type { Theme } from '@react-navigation/native';
import { DarkTheme as _DarkTheme } from '@react-navigation/native';
import { palette } from '@/design-system/tokens';

const DarkTheme: Theme = {
  ..._DarkTheme,
  colors: {
    ..._DarkTheme.colors,
    primary: palette.green,
    background: palette.background,
    text: palette.text,
    border: palette.border,
    card: palette.card,
    notification: palette.red,
  },
};

export function getAppTheme() {
  return DarkTheme;
}
