import type { createNotificationsClient } from './client';
import type { PublicationNotification } from './models';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/design-system/button';
import { AppText } from '@/design-system/text';
import { metrics, palette, radius, space } from '@/design-system/tokens';

type Client = ReturnType<typeof createNotificationsClient>;

export function NotificationsScreen({ client, hasLocations, native = true }: { client?: Client; hasLocations: boolean; native?: boolean }) {
  const query = useInfiniteQuery({
    queryKey: ['svitlo-notifications'],
    enabled: !!client && hasLocations && native,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => client!.history(pageParam),
    getNextPageParam: page => page.nextCursor ?? undefined,
    retry: false,
    staleTime: 0,
  });
  const items = [...new Map(query.data?.pages.flatMap(page => page.items).map(item => [item.id, item])).values()];
  const canLoad = !!client && hasLocations && native;
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.page} refreshControl={canLoad ? <RefreshControl refreshing={query.isRefetching} onRefresh={() => { void query.refetch(); }} tintColor={palette.green} colors={[palette.green]} /> : undefined}>
        <AppText variant="title" accessibilityRole="header">Сповіщення</AppText>
        {!hasLocations && <AppText tone="secondary">Оберіть свою чергу на головному екрані, щоб почати отримувати сповіщення.</AppText>}
        {hasLocations && !native && <AppText tone="secondary">Сповіщення доступні в мобільному застосунку.</AppText>}
        {hasLocations && native && !client && <AppText tone="secondary">Сповіщення ще недоступні. Підключення з’явиться в наступному оновленні.</AppText>}
        {canLoad && query.isPending && <ActivityIndicator color={palette.green} accessibilityLabel="Завантаження сповіщень" />}
        {canLoad && query.error && (
          <View style={styles.message}>
            <AppText accessibilityRole="alert" tone="danger">Не вдалося завантажити сповіщення. Спробуйте ще раз.</AppText>
            <AppButton variant="secondary" loading={query.isFetching} onPress={() => { void query.refetch(); }}>Спробувати ще раз</AppButton>
          </View>
        )}
        {canLoad && !query.isPending && !query.error && !items.length && <AppText tone="secondary">Сповіщень поки немає. Тут з’являтимуться повідомлення після налаштування.</AppText>}
        {items.map(item => <PublicationCard key={item.id} item={item} />)}
        {query.hasNextPage && <AppButton variant="secondary" loading={query.isFetchingNextPage} onPress={() => { void query.fetchNextPage(); }}>Показати ще</AppButton>}
      </ScrollView>
    </SafeAreaView>
  );
}

function PublicationCard({ item }: { item: PublicationNotification }) {
  const scheduleDate = new Date(`${item.scheduleDate}T12:00:00Z`).toLocaleDateString('uk-UA', { timeZone: 'Europe/Kyiv', day: 'numeric', month: 'long', year: 'numeric' });
  const createdAt = new Date(item.createdAt).toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  return (
    <View style={styles.card} testID={`notification-${item.id}`}>
      <AppText variant="section" accessibilityRole="header">Опубліковано графік</AppText>
      <AppText>{`Графік на ${scheduleDate}`}</AppText>
      <AppText variant="caption" tone="secondary">{createdAt}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  page: { padding: metrics.pageGutter, paddingBottom: space.xxl, gap: space.lg, flexGrow: 1 },
  card: { padding: space.lg, borderRadius: radius.card, backgroundColor: palette.card, gap: space.sm },
  message: { gap: space.md },
});
