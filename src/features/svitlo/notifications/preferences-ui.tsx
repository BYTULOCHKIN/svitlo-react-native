import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppButton } from '@/design-system/button';
import { AppText } from '@/design-system/text';
import { AppToggle } from '@/design-system/toggle';
import { palette, radius, space } from '@/design-system/tokens';
import { useLocations } from '../location-store';
import { useNotificationPreferencesSync } from './preferences-sync';

export function NotificationPreferencesCard() {
  const { locations, regionalPushEnabled, setRegionalPush, setLocationNotifications } = useLocations();
  const [error, setError] = useState('');
  const sync = useNotificationPreferencesSync();
  function save(action: () => void) {
    try {
      action();
      setError('');
    }
    catch { setError('Не вдалося зберегти налаштування на пристрої.'); }
  }
  return (
    <View style={styles.card}>
      <AppText variant="section" accessibilityRole="header">Налаштування сповіщень</AppText>
      <AppToggle label="Публікації та зміни графіків" description="Push про графіки всього регіону. Історія зберігається й після вимкнення." value={regionalPushEnabled} onValueChange={value => save(() => setRegionalPush(value))} />
      <AppText variant="section" accessibilityRole="header">Попередження за 10 хвилин</AppText>
      <AppText tone="secondary">Попередження про заплановане відключення для всіх увімкнених локацій. Локації однієї черги отримують одне спільне повідомлення.</AppText>
      {locations.map(location => <AppToggle key={location.id} label={`Попередження: ${location.name}`} description={`Черга ${location.queue}`} value={location.notificationsEnabled ?? true} onValueChange={value => save(() => setLocationNotifications(location.id, value))} />)}
      {!!error && <AppText accessibilityRole="alert" tone="danger">{error}</AppText>}
      {sync.isFetching && <AppText tone="secondary" accessibilityLiveRegion="polite">Синхронізуємо налаштування…</AppText>}
      {sync.error && (
        <>
          <AppText tone="danger" accessibilityRole="alert">Налаштування збережено на пристрої. Сервер застосує їх після синхронізації.</AppText>
          <AppButton variant="secondary" onPress={() => { void sync.refetch(); }}>Повторити синхронізацію</AppButton>
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({ card: { gap: space.md, padding: space.lg, borderRadius: radius.card, backgroundColor: palette.card } });
