import type { LocationIcon } from '../models';
import { AppChoiceGrid } from '@/design-system/choice-grid';
import { AppText } from '@/design-system/text';
import { palette } from '@/design-system/tokens';
import { SvitloIcon } from './svitlo-icon';

const icons: { value: LocationIcon; label: string }[] = [
  { value: 'home', label: 'Дім' },
  { value: 'work', label: 'Робота' },
  { value: 'school', label: 'Навчання' },
  { value: 'shop', label: 'Магазин' },
  { value: 'gym', label: 'Спортзал' },
  { value: 'parents', label: 'Батьки' },
  { value: 'cafe', label: 'Кафе' },
  { value: 'heart', label: 'Кохані' },
];

type Props = { queues: string[]; queue: string; onQueueChange: (queue: string) => void; icon: LocationIcon; onIconChange: (icon: LocationIcon) => void };

export function LocationChoices({ queues, queue, onQueueChange, icon, onIconChange }: Props) {
  return (
    <>
      <AppChoiceGrid label="Оберіть іконку" value={icon} onChange={onIconChange} iconOnly options={icons.map(choice => ({ ...choice, accessibilityLabel: `Іконка: ${choice.label}`, icon: <SvitloIcon name={choice.value} color={choice.value === icon ? palette.green : palette.secondary} /> }))} />
      <AppChoiceGrid label="Оберіть чергу" value={queue} onChange={onQueueChange} options={[...new Set(queues)].map(value => ({ value, label: value, accessibilityLabel: `Черга ${value}` }))} />
      {!queues.length && <AppText tone="secondary">Немає доступних черг. Оновіть графік.</AppText>}
    </>
  );
}
