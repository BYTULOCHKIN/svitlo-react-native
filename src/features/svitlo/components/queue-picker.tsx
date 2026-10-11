import { ActivityIndicator } from 'react-native';
import { AppButton } from '@/design-system/button';
import { AppChoiceGrid } from '@/design-system/choice-grid';
import { AppDialog } from '@/design-system/dialog';
import { AppText as Text } from '@/design-system/text';
import { palette } from '@/design-system/tokens';

type Props = { visible: boolean; queues: string[]; loading: boolean; error?: string; emptyMessage?: string; onChoose: (queue: string) => void; onClose: () => void; onRetry: () => void };

export function QueuePicker({ visible, queues, loading, error, emptyMessage, onChoose, onClose, onRetry }: Props) {
  return (
    <AppDialog open={visible} title="Оберіть чергу" onRequestClose={onClose} footer={<AppButton variant="ghost" onPress={onClose}>Скасувати</AppButton>}>
      {loading && <ActivityIndicator color={palette.green} accessibilityLabel="Завантаження черг" />}
      {error && <Text tone="danger">{error}</Text>}
      {!loading && !queues.length && <Text tone="secondary">{emptyMessage ?? 'Немає доступних черг. Спробуйте оновити дані.'}</Text>}
      {(error || (!loading && !queues.length)) && <AppButton variant="secondary" onPress={onRetry}>Спробувати ще раз</AppButton>}
      {!!queues.length && <AppChoiceGrid label="Доступні черги" options={queues.map(queue => ({ value: queue, label: queue, accessibilityLabel: `Черга ${queue}` }))} value="" onChange={onChoose} />}
    </AppDialog>
  );
}
