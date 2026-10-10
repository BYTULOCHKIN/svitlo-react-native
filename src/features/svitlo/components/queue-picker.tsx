import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { palette } from '../theme';

type Props = { visible: boolean; queues: string[]; loading: boolean; error?: string; onChoose: (queue: string) => void; onClose: () => void; onRetry: () => void };

export function QueuePicker({ visible, queues, loading, error, onChoose, onClose, onRetry }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#00000099', justifyContent: 'center', padding: 24 }}>
        <View accessibilityViewIsModal style={{ borderRadius: 28, padding: 24, backgroundColor: palette.card, maxHeight: '80%' }}>
          <Text style={{ color: palette.text, fontSize: 24, marginBottom: 16 }}>Оберіть чергу</Text>
          {loading && <ActivityIndicator color={palette.green} accessibilityLabel="Завантаження черг" />}
          {error && <Text style={{ color: palette.red }}>{error}</Text>}
          {error && <Pressable accessibilityRole="button" onPress={onRetry} style={{ paddingVertical: 16 }}><Text style={{ color: palette.green }}>Спробувати ще раз</Text></Pressable>}
          <ScrollView>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {queues.map(queue => <Pressable key={queue} accessibilityRole="button" accessibilityLabel={`Черга ${queue}`} onPress={() => onChoose(queue)} style={{ backgroundColor: '#FFFFFF1A', padding: 16, borderRadius: 10, minWidth: '29%', alignItems: 'center' }}><Text style={{ color: palette.text, fontWeight: 'bold' }}>{queue}</Text></Pressable>)}
            </View>
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={onClose} style={{ alignSelf: 'flex-end', padding: 12, marginTop: 16 }}><Text style={{ color: palette.secondary }}>Скасувати</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}
