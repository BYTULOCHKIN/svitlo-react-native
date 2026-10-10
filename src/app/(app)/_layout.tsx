import { Tabs } from 'expo-router';
import { metrics, typography } from '@/design-system/tokens';
import { SvitloIcon } from '@/features/svitlo/components/svitlo-icon';
import { palette } from '@/features/svitlo/theme';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      sceneStyle: { backgroundColor: palette.background },
      tabBarActiveTintColor: palette.green,
      tabBarInactiveTintColor: palette.muted,
      tabBarStyle: { backgroundColor: palette.card, borderTopColor: palette.border, borderTopWidth: metrics.hairline },
      tabBarLabelStyle: typography.caption,
    }}
    >
      <Tabs.Screen name="index" options={{ title: 'Головна', tabBarIcon: ({ color }) => <SvitloIcon name="home" color={color} /> }} />
      <Tabs.Screen name="queues" options={{ title: 'Черги', tabBarIcon: ({ color }) => <SvitloIcon name="list" color={color} /> }} />
      <Tabs.Screen name="notifications" options={{ title: 'Сповіщення', tabBarIcon: ({ color }) => <SvitloIcon name="bell" color={color} /> }} />
    </Tabs>
  );
}
