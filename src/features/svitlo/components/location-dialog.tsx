import type { Location, LocationIcon } from '../models';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, TextInput, View } from 'react-native';
import { AppPressable as Pressable } from '@/design-system/pressable';
import { AppText as Text } from '@/design-system/text';
import { fonts, metrics, palette, radius, space, typography } from '@/design-system/tokens';
import { useLocations } from '../location-store';

import { SvitloIcon } from './svitlo-icon';

const icons: { icon: LocationIcon; label: string }[] = [
  { icon: 'home', label: 'Дім' },
  { icon: 'work', label: 'Робота' },
  { icon: 'school', label: 'Навчання' },
  { icon: 'shop', label: 'Магазин' },
  { icon: 'gym', label: 'Спортзал' },
  { icon: 'parents', label: 'Батьки' },
  { icon: 'cafe', label: 'Кафе' },
  { icon: 'heart', label: 'Кохані' },
];
type Props = { location?: Location; queues: string[]; onClose: () => void };

export function LocationDialog({ location, queues, onClose }: Props) {
  const [name, setName] = useState(location?.name ?? '');
  const [queue, setQueue] = useState(location?.queue ?? '');
  const [icon, setIcon] = useState<LocationIcon>(location?.icon ?? 'home');
  const [error, setError] = useState('');
  const { add, edit, remove } = useLocations();
  const choices = [...new Set([...queues, ...(location ? [location.queue] : [])])];
  function save() {
    try {
      if (location)
        edit({ ...location, name, queue, icon });
      else add({ name, queue, icon });
      onClose();
    }
    catch { setError('Не вдалося зберегти локацію. Спробуйте ще раз.'); }
  }
  function deleteLocation() {
    if (!location)
      return;
    try {
      remove(location.id);
      onClose();
    }
    catch { setError('Не вдалося видалити локацію. Спробуйте ще раз.'); }
  }
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: palette.overlay, justifyContent: 'center', padding: space.xxl }}>
        <View accessibilityViewIsModal style={{ backgroundColor: palette.card, borderRadius: radius.dialog, padding: space.xxl, maxHeight: metrics.dialogMaxHeight }}>
          <Text style={{ ...typography.title, color: palette.text, marginBottom: space.lg }}>{location ? 'Редагувати' : 'Нова локація'}</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={{ color: palette.secondary, marginBottom: space.sm }}>Назва локації</Text>
            <TextInput accessibilityLabel="Назва локації" value={name} onChangeText={setName} maxLength={20} placeholder="Назва локації" placeholderTextColor={palette.muted} style={{ ...typography.body, minHeight: metrics.touchTarget, color: palette.text, borderWidth: metrics.hairline, borderColor: palette.green, borderRadius: radius.control, padding: space.md, marginBottom: space.lg }} />
            <Text style={{ color: palette.secondary, marginBottom: space.sm }}>Оберіть іконку</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.lg }}>
              {icons.map(choice => <Pressable android_ripple={{ color: palette.pressed }} key={choice.icon} accessibilityRole="button" accessibilityLabel={`Іконка: ${choice.label}`} accessibilityState={{ selected: icon === choice.icon }} onPress={() => setIcon(choice.icon)} style={{ width: metrics.iconChoiceWidth, minHeight: metrics.touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radius.control, backgroundColor: icon === choice.icon ? palette.selected : palette.subtle, borderWidth: metrics.hairline, borderColor: icon === choice.icon ? palette.green : palette.transparent }}><SvitloIcon name={choice.icon} color={icon === choice.icon ? palette.green : palette.secondary} size={metrics.icon} /></Pressable>)}
            </View>
            <Text style={{ color: palette.secondary, marginBottom: space.sm }}>Оберіть чергу</Text>
            {!choices.length && <Text style={{ color: palette.secondary }}>Немає доступних черг. Оновіть графік.</Text>}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {choices.map(choice => <Pressable android_ripple={{ color: palette.pressed }} key={choice} accessibilityRole="button" accessibilityLabel={`Черга ${choice}`} accessibilityState={{ selected: choice === queue }} onPress={() => setQueue(choice)} style={{ minWidth: metrics.queueMinWidth, padding: space.md, borderRadius: radius.control, alignItems: 'center', backgroundColor: choice === queue ? palette.green : palette.subtle }}><Text style={{ color: choice === queue ? palette.background : palette.text, fontFamily: fonts.semibold }}>{choice}</Text></Pressable>)}
            </View>
            {!!error && <Text accessibilityRole="alert" style={{ color: palette.red, paddingVertical: space.md }}>{error}</Text>}
          </ScrollView>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', gap: space.md, marginTop: space.lg }}>
            {location && <Pressable android_ripple={{ color: palette.pressed }} accessibilityRole="button" accessibilityLabel="Видалити локацію" onPress={deleteLocation} style={{ marginRight: 'auto', padding: space.md }}><SvitloIcon name="trash" color={palette.red} /></Pressable>}
            <Pressable android_ripple={{ color: palette.pressed }} accessibilityRole="button" onPress={onClose} style={{ padding: space.md }}><Text style={{ color: palette.secondary }}>Скасувати</Text></Pressable>
            <Pressable android_ripple={{ color: palette.pressed }} accessibilityRole="button" accessibilityState={{ disabled: !name.trim() || !queue }} disabled={!name.trim() || !queue} onPress={save} style={{ borderRadius: radius.dialog, padding: space.md, backgroundColor: name.trim() && queue ? palette.green : palette.muted }}><Text style={{ color: palette.background }}>Зберегти</Text></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
