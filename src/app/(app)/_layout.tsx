import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/design-system/text';
import { metrics, space, typography } from '@/design-system/tokens';
import { SvitloIcon } from '@/features/svitlo/components/svitlo-icon';
import { palette } from '@/features/svitlo/theme';

export default function TabLayout() {
  const { width, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const largeText = fontScale > metrics.timerStackFontScale;
  const tabHeight = metrics.icon + space.xs + typography.caption.lineHeight * fontScale * (largeText ? 2 : 1) + space.sm * 2 + insets.bottom;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      sceneStyle: { backgroundColor: palette.background },
      tabBarActiveTintColor: palette.green,
      tabBarInactiveTintColor: palette.muted,
      tabBarStyle: { backgroundColor: palette.card, borderTopColor: palette.border, borderTopWidth: metrics.hairline, height: tabHeight, paddingTop: space.xs },
      tabBarLabelPosition: 'below-icon',
      tabBarLabel: ({ color, children }) => <AppText variant="caption" accessibilityLabel={children} style={{ color, textAlign: 'center', paddingHorizontal: space.xs }}>{largeText && children === 'Сповіщення' ? 'Спові-\nщення' : largeText && width < metrics.timerStackWidth && children === 'Головна' ? 'Голо-\nвна' : children}</AppText>,
    }}
    >
      <Tabs.Screen name="index" options={{ title: 'Головна', tabBarIcon: ({ color }) => <SvitloIcon name="home" color={color} /> }} />
      <Tabs.Screen name="queues" options={{ title: 'Черги', tabBarIcon: ({ color }) => <SvitloIcon name="list" color={color} /> }} />
      <Tabs.Screen name="notifications" options={{ title: 'Сповіщення', tabBarIcon: ({ color }) => <SvitloIcon name="bell" color={color} /> }} />
    </Tabs>
  );
}
