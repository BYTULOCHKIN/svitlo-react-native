import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LocationSelector } from './components/location-selector';
import { QueuePicker } from './components/queue-picker';
import { ScheduleFreshness } from './components/schedule-freshness';
import { ScheduleTimeline } from './components/schedule-timeline';
import { StatusCard } from './components/status-card';
import { useLocations } from './location-store';
import { getMinute } from './models';
import { getScheduleView } from './schedule-view';
import { palette } from './theme';
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
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView refreshControl={<RefreshControl refreshing={query.isFetching && !query.isPending} onRefresh={() => { void query.refresh(); }} tintColor={palette.green} colors={[palette.green]} />} contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}>
        <Text style={{ fontSize: 28, color: palette.text, padding: 16 }}>ЄСвітло</Text>
        <ScheduleFreshness snapshot={query.snapshot} current={!!query.currentDay} fetching={query.isFetching} failed={!!query.error} />
        {!selected
          ? (
              <View style={{ padding: 24, gap: 16 }}>
                <Text style={{ color: palette.text, fontSize: 20 }}>Оберіть свою чергу, щоб побачити графік відключень</Text>
                <Pressable accessibilityRole="button" onPress={() => setPicking(true)} style={{ backgroundColor: palette.green, borderRadius: 20, padding: 16 }}><Text style={{ textAlign: 'center', fontWeight: 'bold' }}>Обрати чергу</Text></Pressable>
              </View>
            )
          : (
              <>
                <LocationSelector queues={queues} />
                {query.isPending && !query.snapshot
                  ? <ActivityIndicator color={palette.green} style={{ height: 200 }} />
                  : (
                      <>
                        <StatusCard state={view.state} view={view} />
                        <ScheduleTimeline view={view} />
                      </>
                    )}
              </>
            )}
        {query.error && (
          <View style={{ padding: 16 }}>
            <Text style={{ color: palette.red }}>{query.data ? 'Не вдалося оновити графік. Показано останні отримані дані.' : 'Не вдалося завантажити графік.'}</Text>
            <Text style={{ color: palette.secondary, marginTop: 8 }}>{query.error.message}</Text>
            <Pressable accessibilityRole="button" onPress={() => { void query.refresh(); }} style={{ paddingVertical: 16 }}><Text style={{ color: palette.green }}>Спробувати ще раз</Text></Pressable>
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
