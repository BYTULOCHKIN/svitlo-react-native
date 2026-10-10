import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from '@/design-system/button';
import { AppText as Text } from '@/design-system/text';
import { metrics, palette, radius, space, typography } from '@/design-system/tokens';
import { LocationSelector } from './components/location-selector';
import { QueuePicker } from './components/queue-picker';
import { ScheduleFreshness } from './components/schedule-freshness';
import { ScheduleTimeline } from './components/schedule-timeline';
import { StatusCard } from './components/status-card';
import { useLocations } from './location-store';
import { getMinute } from './models';
import { getScheduleView } from './schedule-view';
import { useClock } from './use-clock';
import { useSchedule } from './use-schedule';

export function HomeScreen() {
  const [picking, setPicking] = useState(false);
  const { locations, selectedId, chooseFirst } = useLocations();
  const selected = locations.find(location => location.id === selectedId);
  const now = useClock();
  const query = useSchedule(now);
  const queues = query.data?.queues.map(schedule => schedule.queue).sort((a, b) => a.localeCompare(b, 'uk', { numeric: true })) ?? [];
  const schedule = query.currentDay?.queues.find(item => item.queue === selected?.queue);
  const view = getScheduleView(schedule, getMinute(now), query.currentDay?.noOutagesScope === 'region');
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScrollView refreshControl={<RefreshControl refreshing={query.isFetching && !query.isPending} onRefresh={() => { void query.refresh(); }} tintColor={palette.green} colors={[palette.green]} />} contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={typography.title}>ЄСвітло</Text>
          <Text style={styles.date}>{now.toLocaleDateString('uk-UA', { timeZone: 'Europe/Kyiv', day: 'numeric', month: 'long' })}</Text>
        </View>
        {!selected
          ? (
              <View style={styles.empty}>
                <Text style={typography.title}>Світло за вашою адресою</Text>
                <Text style={styles.description}>Оберіть свою чергу, щоб побачити графік відключень</Text>
                <ActionButton onPress={() => setPicking(true)}>Обрати чергу</ActionButton>
              </View>
            )
          : (
              <>
                <LocationSelector queues={queues} />
                {query.isPending && !query.snapshot
                  ? <ActivityIndicator accessibilityLabel="Завантаження графіка" color={palette.green} style={{ height: metrics.loadingHeight }} />
                  : (
                      <>
                        <StatusCard state={view.state} view={view} updatedAt={query.snapshot?.updatedAt} />
                        <ScheduleFreshness snapshot={query.snapshot} current={!!query.currentDay} fetching={query.isFetching} failed={!!query.error} />
                        <ScheduleTimeline view={view} />
                      </>
                    )}
              </>
            )}
        {query.error && (
          <View accessibilityRole="alert" style={styles.error}>
            <Text style={{ color: palette.red }}>{query.data ? 'Не вдалося оновити графік. Показано останні отримані дані.' : 'Не вдалося завантажити графік.'}</Text>
            <ActionButton secondary onPress={() => { void query.refresh(); }}>Спробувати ще раз</ActionButton>
          </View>
        )}
      </ScrollView>
      <QueuePicker
        visible={picking}
        queues={queues}
        loading={query.isPending}
        error={query.error?.message}
        emptyMessage={query.currentDay?.noOutagesScope === 'region' ? 'Відключення не заплановані на сьогодні. Оператор не надав перелік черг. Оновіть дані пізніше, щоб обрати чергу.' : undefined}
        onRetry={() => { void query.refresh(); }}
        onClose={() => setPicking(false)}
        onChoose={(queue) => {
          chooseFirst(queue);
          setPicking(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.background },
  page: { padding: metrics.pageGutter, paddingBottom: space.xxl, gap: space.lg, flexGrow: 1 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  date: { ...typography.caption, color: palette.secondary },
  empty: { padding: space.xl, borderRadius: radius.card, backgroundColor: palette.card, gap: space.lg },
  description: { color: palette.secondary },
  error: { padding: space.lg, borderRadius: radius.control, backgroundColor: palette.card, gap: space.md },
});
