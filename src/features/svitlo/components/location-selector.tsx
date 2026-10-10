import type { Location } from '../models';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocations } from '../location-store';
import { palette } from '../theme';
import { LocationDialog } from './location-dialog';
import { SvitloIcon } from './svitlo-icon';

export function LocationSelector({ queues }: { queues: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<Location | null | undefined>();
  const [error, setError] = useState('');
  const { locations, selectedId, select } = useLocations();
  const selected = locations.find(location => location.id === selectedId);
  if (!selected)
    return null;
  function choose(id: string) {
    try {
      select(id);
    }
    catch { setError('Не вдалося зберегти вибір локації.'); }
    setExpanded(false);
  }
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel="Обрати локацію" onPress={() => setExpanded(true)} style={{ marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#FFFFFF1A', backgroundColor: '#0000004D', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <SvitloIcon name={selected.icon} color={palette.green} />
        <Text style={{ flex: 1, color: palette.text, fontSize: 18 }}>{selected.name}</Text>
        <Text style={{ color: palette.green, fontWeight: 'bold' }}>{`Черга: ${selected.queue} ⌄`}</Text>
      </Pressable>
      {!!error && <Text accessibilityRole="alert" style={{ color: palette.red, padding: 16 }}>{error}</Text>}
      <Modal visible={expanded} transparent animationType="fade" onRequestClose={() => setExpanded(false)}>
        <Pressable accessibilityLabel="Закрити вибір локації" onPress={() => setExpanded(false)} style={{ flex: 1, backgroundColor: '#00000066', paddingTop: 130, paddingHorizontal: 16 }}>
          <View accessibilityViewIsModal style={{ backgroundColor: palette.card, borderRadius: 16, padding: 8, maxHeight: '65%' }}>
            <ScrollView>
              {locations.map(location => (
                <View key={location.id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: location.id === selectedId ? '#2ECC7126' : 'transparent' }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Локація ${location.name}, черга ${location.queue}`} accessibilityState={{ selected: location.id === selectedId }} onPress={() => choose(location.id)} style={{ flex: 1, flexDirection: 'row', gap: 12, padding: 16 }}>
                    <SvitloIcon name={location.icon} color={palette.green} />
                    <Text style={{ color: palette.text }}>{`${location.name} (${location.queue})`}</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Редагувати ${location.name}`}
                    onPress={() => {
                      setExpanded(false);
                      setEditing(location);
                    }}
                    style={{ padding: 16 }}
                  >
                    <SvitloIcon name="edit" size={20} color={palette.secondary} />
                  </Pressable>
                </View>
              ))}
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setExpanded(false);
                  setEditing(null);
                }}
                style={{ flexDirection: 'row', gap: 12, padding: 16 }}
              >
                <SvitloIcon name="plus" color={palette.green} />
                <Text style={{ color: palette.green }}>Додати локацію</Text>
              </Pressable>
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
      {editing !== undefined && <LocationDialog location={editing ?? undefined} queues={queues} onClose={() => setEditing(undefined)} />}
    </>
  );
}
