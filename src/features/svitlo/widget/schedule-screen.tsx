import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from '@/design-system/button';
import { AppText } from '@/design-system/text';
import { palette, radius, space } from '@/design-system/tokens';
import { useLocations } from '../location-store';
import { formatMinute } from '../models';
import { fetchSchedule } from '../poe-api';
import { useClock } from '../use-clock';
import { readWidgetDay } from './native';

export function WidgetScheduleScreen() {
  const now = useClock();
  const { locationId, date = '' } = useLocalSearchParams<{ locationId?: string; date?: string }>();
  const location = useLocations(state => state.locations.find(item => item.id === locationId));
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().startsWith(date);
  const cached = useMemo(() => validDate ? readWidgetDay(date) : undefined, [date, validDate]);
  const query = useQuery({ queryKey: ['svitlo-widget-day', date], queryFn: ({ signal }) => fetchSchedule(date, signal), enabled: validDate && !!location, initialData: cached, initialDataUpdatedAt: 0, retry: 1 });
  const day = query.data;
  const intervals = day?.noOutagesScope === 'region' ? [{ start: 0, end: 1440, state: 'on' as const }] : day?.queues.find(item => item.queue === location?.queue)?.intervals;
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <AppText variant="title">Графік відключень</AppText>
        <AppText>{`${location?.name ?? 'Локацію видалено'}${location ? ` · #${location.queue}` : ''}`}</AppText>
        <AppText>{validDate ? new Date(`${date}T12:00:00Z`).toLocaleDateString('uk-UA', { timeZone: 'Europe/Kyiv', day: 'numeric', month: 'long', year: 'numeric' }) : 'Некоректна дата'}</AppText>
        {validDate && location && query.isPending && <ActivityIndicator accessibilityLabel="Завантаження графіка" color={palette.green} />}
        {day?.verifiedAt && <AppText variant="caption">{`Перевірено ${new Date(day.verifiedAt).toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv' })} · Київ`}</AppText>}
        {(query.error || (day?.verifiedAt && now.getTime() - day.verifiedAt >= 30 * 60000)) && <AppText>{day ? 'Дані можуть бути застарілими. Показано збережений графік.' : 'Графік поки недоступний.'}</AppText>}
        {day && !intervals && <AppText>Немає даних для цієї черги.</AppText>}
        {intervals?.every(item => item.state === 'on') && <AppText>Відключень не заплановано.</AppText>}
        {intervals?.map(interval => (
          <View key={interval.start} style={styles.row}>
            <AppText>{`${formatMinute(interval.start)}–${formatMinute(interval.end)}`}</AppText>
            <AppText style={{ color: interval.state === 'off' ? palette.red : interval.state === 'possible' ? palette.warning : palette.green }}>
              {{ on: 'Увімкнено за графіком', off: 'Відключення за графіком', possible: 'Можливе відключення', unknown: 'Немає даних' }[interval.state]}
            </AppText>
          </View>
        ))}
        {validDate && location && <ActionButton secondary disabled={query.isFetching} onPress={() => { void query.refetch(); }}>Оновити</ActionButton>}
        <ActionButton onPress={() => router.replace('/')}>На головну</ActionButton>
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({ screen: { flex: 1, backgroundColor: palette.background }, content: { padding: space.lg, gap: space.md }, row: { padding: space.md, gap: space.xs, borderRadius: radius.control, backgroundColor: palette.card } });
