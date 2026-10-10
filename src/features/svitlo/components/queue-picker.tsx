import { ActivityIndicator, Modal, ScrollView, View } from 'react-native';
import { AppPressable as Pressable } from '@/design-system/pressable';
import { AppText as Text } from '@/design-system/text';
import { fonts, metrics, palette, radius, space, typography } from '@/design-system/tokens';

type Props = { visible: boolean; queues: string[]; loading: boolean; error?: string; emptyMessage?: string; onChoose: (queue: string) => void; onClose: () => void; onRetry: () => void };

export function QueuePicker({ visible, queues, loading, error, emptyMessage, onChoose, onClose, onRetry }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: palette.overlay, justifyContent: 'center', padding: space.xxl }}>
        <View accessibilityViewIsModal style={{ borderRadius: radius.dialog, padding: space.xxl, backgroundColor: palette.card, maxHeight: metrics.pickerMaxHeight }}>
          <Text style={{ color: palette.text, ...typography.title, marginBottom: space.lg }}>Оберіть чергу</Text>
          {loading && <ActivityIndicator color={palette.green} accessibilityLabel="Завантаження черг" />}
          {error && <Text style={{ color: palette.red }}>{error}</Text>}
          {!loading && !queues.length && emptyMessage && <Text style={{ color: palette.secondary }}>{emptyMessage}</Text>}
          {(error || (!loading && !queues.length)) && <Pressable android_ripple={{ color: palette.pressed }} accessibilityRole="button" onPress={onRetry} style={{ paddingVertical: space.lg }}><Text style={{ color: palette.green }}>Спробувати ще раз</Text></Pressable>}
          <ScrollView>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {queues.map(queue => <Pressable android_ripple={{ color: palette.pressed }} key={queue} accessibilityRole="button" accessibilityLabel={`Черга ${queue}`} onPress={() => onChoose(queue)} style={{ backgroundColor: palette.subtle, padding: space.lg, borderRadius: radius.control, minWidth: metrics.queueMinWidth, alignItems: 'center' }}><Text style={{ color: palette.text, fontFamily: fonts.semibold }}>{queue}</Text></Pressable>)}
            </View>
          </ScrollView>
          <Pressable android_ripple={{ color: palette.pressed }} accessibilityRole="button" onPress={onClose} style={{ alignSelf: 'flex-end', padding: space.md, marginTop: space.lg }}><Text style={{ color: palette.secondary }}>Скасувати</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
}
