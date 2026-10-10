import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QueuePicker } from './components/queue-picker';
import { StatusCard } from './components/status-card';
import { SvitloIcon } from './components/svitlo-icon';
import { useLocations } from './location-store';
import { getCurrentState, getMinute } from './models';
import { palette } from './theme';
import { useSchedule } from './use-schedule';

export function HomeScreen() {
  const [picking, setPicking] = useState(false);
  const { locations, selectedId, chooseFirst } = useLocations();
  const selected = locations.find(location => location.id === selectedId);
  const query = useSchedule();
  const queues = query.data?.queues.map(schedule => schedule.queue).sort((a, b) => a.localeCompare(b, 'uk', { numeric: true })) ?? [];
  const schedule = query.data?.queues.find(item => item.queue === selected?.queue);
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={{ fontSize: 28, color: palette.text, padding: 16 }}>ЄСвітло</Text>
        {!selected
          ? (
              <View style={{ padding: 24, gap: 16 }}>
                <Text style={{ color: palette.text, fontSize: 20 }}>Оберіть свою чергу, щоб побачити графік відключень</Text>
                <Pressable accessibilityRole="button" onPress={() => setPicking(true)} style={{ backgroundColor: palette.green, borderRadius: 20, padding: 16 }}><Text style={{ textAlign: 'center', fontWeight: 'bold' }}>Обрати чергу</Text></Pressable>
              </View>
            )
          : (
              <>
                <View style={{ marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 20, backgroundColor: palette.card, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <SvitloIcon name={selected.icon} color={palette.green} />
                  <View>
                    <Text style={{ color: palette.text, fontSize: 18 }}>{selected.name}</Text>
                    <Text style={{ color: palette.secondary }}>{`Черга ${selected.queue}`}</Text>
                  </View>
                </View>
                {query.isPending ? <ActivityIndicator color={palette.green} style={{ height: 200 }} /> : <StatusCard state={getCurrentState(schedule, getMinute())} />}
                {query.error && <Text style={{ padding: 16, color: palette.red }}>{query.error.message}</Text>}
              </>
            )}
      </ScrollView>
      <QueuePicker
        visible={picking}
        queues={queues}
        loading={query.isPending}
        error={query.error?.message}
        onRetry={() => { void query.refetch(); }}
        onClose={() => setPicking(false)}
        onChoose={(queue) => {
          chooseFirst(queue);
          setPicking(false);
        }}
      />
    </SafeAreaView>
  );
}
