import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AppState, Linking, Platform, StyleSheet, View } from 'react-native';
import { AppButton } from '@/design-system/button';
import { AppDialog } from '@/design-system/dialog';
import { AppText } from '@/design-system/text';
import { radius, space } from '@/design-system/tokens';
import { storage } from '@/lib/storage';
import { pushPermission } from './native-push';

const queryKey = ['svitlo-push-permission'];
const explanationKey = 'svitlo.notifications.explanation.v1';

function usePushPermission() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey, queryFn: pushPermission.inspect, enabled: Platform.OS !== 'web', retry: false, staleTime: Infinity });
  const enable = useMutation({ mutationFn: pushPermission.enable, onSuccess: state => queryClient.setQueryData(queryKey, state) });
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active')
        void queryClient.invalidateQueries({ queryKey });
    });
    return () => listener.remove();
  }, [queryClient]);
  return { query, enable };
}

export function PushPermissionCard() {
  const { query, enable } = usePushPermission();
  if (Platform.OS === 'web' || query.isPending)
    return null;
  const permission = query.data?.permission;
  return (
    <View style={styles.card}>
      <AppText variant="section" accessibilityRole="header">Push-сповіщення</AppText>
      <AppText tone="secondary">{permission === 'granted' ? 'Дозвіл у налаштуваннях телефона ввімкнений.' : permission === 'denied' ? 'Сповіщення вимкнені в налаштуваннях телефона. Історія залишається доступною.' : 'Повідомлятимемо про графіки та попереджатимемо про заплановане відключення за 10 хвилин.'}</AppText>
      {permission === 'granted' && !query.data?.ready && <AppText tone="secondary">Не вдалося підключити push. Історія залишається доступною.</AppText>}
      {(query.error || enable.error) && <AppText accessibilityRole="alert" tone="danger">Не вдалося перевірити сповіщення. Спробуйте ще раз.</AppText>}
      {permission === 'undetermined' && <AppButton loading={enable.isPending} onPress={() => enable.mutate()}>Увімкнути сповіщення</AppButton>}
      {(permission === 'denied' || permission === 'granted') && <AppButton variant="secondary" onPress={() => { void Linking.openSettings(); }}>Налаштування телефона</AppButton>}
      {(query.error || (permission === 'granted' && !query.data?.ready)) && <AppButton variant="secondary" loading={query.isFetching} onPress={() => { void query.refetch(); }}>Спробувати підключити ще раз</AppButton>}
    </View>
  );
}

export function PushPermissionExplanation() {
  const { query, enable } = usePushPermission();
  const [dismissed, setDismissed] = useState(() => storage.getBoolean(explanationKey) ?? false);
  const close = () => {
    storage.set(explanationKey, true);
    setDismissed(true);
  };
  return (
    <AppDialog open={!dismissed && query.data?.permission === 'undetermined'} title="Сповіщення про відключення" onRequestClose={close} footer={<AppButton variant="ghost" onPress={close}>Пізніше</AppButton>}>
      <AppText>Повідомлятимемо про публікацію й оновлення графіків та попереджатимемо за 10 хвилин до запланованого відключення.</AppText>
      <AppText tone="secondary">Дозвіл необов’язковий. Історія сповіщень буде доступна й без push.</AppText>
      {enable.error && <AppText accessibilityRole="alert" tone="danger">Не вдалося налаштувати сповіщення. Спробуйте ще раз.</AppText>}
      <AppButton loading={enable.isPending} onPress={() => enable.mutate(undefined, { onSuccess: close })}>Увімкнути сповіщення</AppButton>
    </AppDialog>
  );
}

const styles = StyleSheet.create({ card: { gap: space.md, padding: space.lg, borderRadius: radius.card } });
