import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from '@/design-system/button';
import { AppText } from '@/design-system/text';
import { palette, space } from '@/design-system/tokens';
import { useLocations } from '@/features/svitlo/location-store';

export default function WidgetEntry() {
  const { locationId, date } = useLocalSearchParams<{ locationId?: string; date?: string }>();
  const exists = useLocations(state => state.locations.some(location => location.id === locationId));
  useEffect(() => {
    if (exists && locationId)
      useLocations.getState().select(locationId);
    if (exists && locationId && date)
      router.replace({ pathname: '/widget-schedule', params: { locationId, date } });
    else if (!locationId || exists)
      router.replace('/');
  }, [exists, locationId, date]);
  if (!locationId || exists)
    return null;
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <AppText variant="title">Локацію видалено</AppText>
        <AppText>Оберіть іншу локацію в налаштуваннях віджета.</AppText>
        <ActionButton onPress={() => router.replace('/')}>Відкрити головну</ActionButton>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: palette.background }, content: { padding: space.xl, gap: space.lg } });
