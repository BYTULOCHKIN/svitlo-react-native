import type { TextInput } from 'react-native';
import type { Location, LocationIcon } from '../models';
import { useRef, useState } from 'react';
import { AppButton } from '@/design-system/button';
import { AppButtonGroup } from '@/design-system/button-group';
import { AppConfirmDialogBody } from '@/design-system/confirm-dialog';
import { AppDialog } from '@/design-system/dialog';
import { useDialogFocus } from '@/design-system/dialog-focus';
import { AppInput } from '@/design-system/input';
import { AppText } from '@/design-system/text';
import { useLocations } from '../location-store';
import { LocationChoices } from './location-choices';

type Props = { location?: Location; queues: string[]; onClose: () => void };

export function LocationDialog({ location, queues, onClose }: Props) {
  const [name, setName] = useState(location?.name ?? '');
  const [queue, setQueue] = useState(location?.queue ?? '');
  const [icon, setIcon] = useState<LocationIcon>(location?.icon ?? 'home');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const [confirmation, setConfirmation] = useState<'discard' | 'delete' | null>(null);
  const [returnFocus, setReturnFocus] = useState(false);
  const nameRef = useRef<TextInput>(null);
  useDialogFocus(nameRef, returnFocus && !confirmation);
  const { add, edit, remove } = useLocations();
  const choices = [...new Set([...queues, ...(location ? [location.queue] : [])])];
  const valid = name.trim().length > 0 && name.trim().length <= 20 && /^\d+\.\d+$/.test(queue);
  const dirty = name !== (location?.name ?? '') || queue !== (location?.queue ?? '') || icon !== (location?.icon ?? 'home');

  function cancelConfirmation() {
    setConfirmation(null);
    setReturnFocus(true);
  }

  function requestClose() {
    if (confirmation)
      cancelConfirmation();
    else if (dirty)
      setConfirmation('discard');
    else onClose();
  }

  function save() {
    if (!valid)
      return;
    try {
      if (location)
        edit({ ...location, name, queue, icon });
      else add({ name, queue, icon });
      onClose();
    }
    catch {
      setError('Не вдалося зберегти локацію. Спробуйте ще раз.');
    }
  }

  function deleteLocation() {
    if (!location)
      return;
    try {
      remove(location.id);
      onClose();
    }
    catch {
      setError('Не вдалося видалити локацію. Спробуйте ще раз.');
    }
  }

  return (
    <AppDialog
      open
      title={confirmation === 'discard' ? 'Відкинути незбережені зміни?' : confirmation === 'delete' ? 'Видалити локацію?' : location ? 'Редагувати локацію' : 'Нова локація'}
      onRequestClose={requestClose}
      footer={!confirmation && (
        <AppButtonGroup>
          <AppButton variant="ghost" onPress={requestClose}>Скасувати</AppButton>
          <AppButton disabled={!valid} onPress={save}>Зберегти</AppButton>
        </AppButtonGroup>
      )}
    >
      {confirmation
        ? (
            <AppConfirmDialogBody
              key={confirmation}
              message={confirmation === 'discard' ? 'Ваші зміни ще не збережені. Відкинути їх?' : `Локацію «${location?.name}» буде видалено.`}
              cancelLabel={confirmation === 'discard' ? 'Продовжити редагування' : 'Скасувати'}
              confirmLabel={confirmation === 'discard' ? 'Відкинути зміни' : 'Видалити'}
              onCancel={cancelConfirmation}
              onConfirm={confirmation === 'discard' ? onClose : deleteLocation}
              danger
              error={confirmation === 'delete' ? error : undefined}
            />
          )
        : (
            <>
              <AppInput ref={nameRef} label="Назва локації" value={name} onChangeText={setName} onBlur={() => setTouched(true)} maxLength={20} placeholder="Наприклад, Дім" helperText="Назва обов’язкова, до 20 символів." error={touched && !name.trim() ? 'Вкажіть назву локації.' : undefined} />
              <LocationChoices queues={choices} queue={queue} onQueueChange={setQueue} icon={icon} onIconChange={setIcon} />
              {!!error && <AppText tone="danger" accessibilityRole="alert" accessibilityLiveRegion="polite">{error}</AppText>}
              {location && (
                <AppButton
                  variant="ghost"
                  onPress={() => {
                    setError('');
                    setConfirmation('delete');
                  }}
                >
                  Видалити локацію
                </AppButton>
              )}
            </>
          )}
    </AppDialog>
  );
}
