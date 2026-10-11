import type { Location } from '../models';
import { useState } from 'react';
import { Modal, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppPressable as Pressable } from '@/design-system/pressable';
import { AppText as Text } from '@/design-system/text';
import { metrics, motion, palette, radius, space, typography } from '@/design-system/tokens';
import { useLocations } from '../location-store';
import { AddLocationDialog } from './add-location-dialog';
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
      <Pressable android_ripple={{ color: palette.pressed }} accessibilityRole="button" accessibilityLabel={`Обрати локацію: ${selected.name}, черга ${selected.queue}`} onPress={() => setExpanded(true)} style={({ pressed }) => ({ minHeight: metrics.touchTarget, padding: space.md, borderRadius: radius.control, borderWidth: metrics.hairline, borderColor: palette.border, backgroundColor: palette.card, flexDirection: 'row', alignItems: 'center', gap: space.md, opacity: pressed ? motion.pressedOpacity : 1 })}>
        <SvitloIcon name={selected.icon} color={palette.green} size={metrics.icon} />
        <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
          <Text style={typography.emphasis}>{selected.name}</Text>
          <Text style={[typography.caption, { color: palette.secondary }]}>{`Черга ${selected.queue}`}</Text>
        </View>
        <SvitloIcon name="chevronDown" color={palette.secondary} size={metrics.iconSmall} />
      </Pressable>
      {!!error && <Text accessibilityRole="alert" style={{ color: palette.red, padding: space.lg }}>{error}</Text>}
      <Modal visible={expanded} transparent animationType="fade" onRequestClose={() => setExpanded(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: palette.overlay, padding: space.lg, justifyContent: 'center' }}>
          <Pressable android_ripple={{ color: palette.pressed }} accessibilityRole="button" accessibilityLabel="Закрити вибір локації" onPress={() => setExpanded(false)} style={{ position: 'absolute', inset: 0 }} />
          <View accessibilityViewIsModal style={{ backgroundColor: palette.card, borderRadius: radius.dialog, padding: space.sm, maxHeight: metrics.pickerMaxHeight, maxWidth: metrics.dialogMaxWidth, width: '100%', alignSelf: 'center', overflow: 'hidden' }}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {locations.map(location => (
                <View key={location.id} style={{ flexDirection: 'row', alignItems: 'center', borderRadius: radius.control, backgroundColor: location.id === selectedId ? palette.selected : palette.transparent }}>
                  <Pressable android_ripple={{ color: palette.pressed }} accessibilityRole="button" accessibilityLabel={`Локація ${location.name}, черга ${location.queue}`} accessibilityState={{ selected: location.id === selectedId }} onPress={() => choose(location.id)} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg }}>
                    <SvitloIcon name={location.icon} color={palette.green} />
                    <View style={{ flex: 1, minWidth: 0, gap: space.xxs }}>
                      <Text variant="emphasis">{location.name}</Text>
                      <Text variant="caption" tone="secondary">{`Черга ${location.queue}`}</Text>
                    </View>
                  </Pressable>
                  <Pressable
                    android_ripple={{ color: palette.pressed }}
                    accessibilityRole="button"
                    accessibilityLabel={`Редагувати ${location.name}`}
                    onPress={() => {
                      setExpanded(false);
                      setEditing(location);
                    }}
                    style={{ padding: space.lg, minHeight: metrics.touchTarget }}
                  >
                    <SvitloIcon name="edit" size={metrics.icon} color={palette.secondary} />
                  </Pressable>
                </View>
              ))}
              <Pressable
                android_ripple={{ color: palette.pressed }}
                accessibilityRole="button"
                onPress={() => {
                  setExpanded(false);
                  setEditing(null);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg }}
              >
                <SvitloIcon name="plus" color={palette.green} />
                <Text style={{ color: palette.green, flex: 1, minWidth: 0 }}>Додати локацію</Text>
              </Pressable>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
      {editing === null && <AddLocationDialog queues={queues} onClose={() => setEditing(undefined)} />}
      {editing && <LocationDialog location={editing} queues={queues} onClose={() => setEditing(undefined)} />}
    </>
  );
}
