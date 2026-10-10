import type { Location, LocationIcon } from '../models';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocations } from '../location-store';
import { palette } from '../theme';
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
  const { add, edit } = useLocations();
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
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: '#00000099', justifyContent: 'center', padding: 24 }}>
        <View accessibilityViewIsModal style={{ backgroundColor: palette.card, borderRadius: 28, padding: 24, maxHeight: '90%' }}>
          <Text style={{ fontSize: 24, color: palette.text, marginBottom: 16 }}>{location ? 'Редагувати' : 'Нова локація'}</Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={{ color: palette.secondary, marginBottom: 6 }}>Назва локації</Text>
            <TextInput accessibilityLabel="Назва локації" value={name} onChangeText={setName} maxLength={20} placeholder="Назва локації" placeholderTextColor={palette.muted} style={{ color: palette.text, borderWidth: 1, borderColor: palette.green, borderRadius: 8, padding: 12, marginBottom: 16 }} />
            <Text style={{ color: palette.secondary, marginBottom: 8 }}>Оберіть іконку</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {icons.map(choice => <Pressable key={choice.icon} accessibilityRole="button" accessibilityLabel={`Іконка: ${choice.label}`} accessibilityState={{ selected: icon === choice.icon }} onPress={() => setIcon(choice.icon)} style={{ width: '17%', minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: icon === choice.icon ? '#2ECC7126' : '#FFFFFF0D', borderWidth: 1, borderColor: icon === choice.icon ? palette.green : 'transparent' }}><SvitloIcon name={choice.icon} color={icon === choice.icon ? palette.green : palette.secondary} size={20} /></Pressable>)}
            </View>
            <Text style={{ color: palette.secondary, marginBottom: 8 }}>Оберіть чергу</Text>
            {!choices.length && <Text style={{ color: palette.secondary }}>Немає доступних черг. Оновіть графік.</Text>}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {choices.map(choice => <Pressable key={choice} accessibilityRole="button" accessibilityLabel={`Черга ${choice}`} accessibilityState={{ selected: choice === queue }} onPress={() => setQueue(choice)} style={{ minWidth: '29%', padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: choice === queue ? palette.green : '#FFFFFF1A' }}><Text style={{ color: choice === queue ? palette.background : palette.text, fontWeight: 'bold' }}>{choice}</Text></Pressable>)}
            </View>
            {!!error && <Text accessibilityRole="alert" style={{ color: palette.red, paddingVertical: 12 }}>{error}</Text>}
          </ScrollView>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 16 }}>
            <Pressable accessibilityRole="button" onPress={onClose} style={{ padding: 12 }}><Text style={{ color: palette.secondary }}>Скасувати</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !name.trim() || !queue }} disabled={!name.trim() || !queue} onPress={save} style={{ borderRadius: 24, padding: 12, backgroundColor: name.trim() && queue ? palette.green : palette.muted }}><Text style={{ color: palette.background }}>Зберегти</Text></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
