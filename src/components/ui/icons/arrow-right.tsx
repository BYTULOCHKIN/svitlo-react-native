import type { LucideProps } from 'lucide-react-native';
import { StyleSheet } from 'react-native';
import { AppIcon } from '@/design-system/icon';
import { isRTL } from '@/lib/i18n';

export function ArrowRight({ style, ...props }: LucideProps) {
  return <AppIcon name="chevronRight" {...props} style={StyleSheet.flatten([style, { transform: [{ scaleX: isRTL ? -1 : 1 }] }])} />;
}
