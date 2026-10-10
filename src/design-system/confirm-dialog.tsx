import type { View } from 'react-native';
import { useRef } from 'react';
import { View as NativeView, StyleSheet } from 'react-native';
import { AppButton } from './button';
import { AppDialog } from './dialog';
import { useDialogFocus } from './dialog-focus';
import { AppText } from './text';
import { space } from './tokens';

export type ConfirmationProps = {
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  danger?: boolean;
  error?: string;
};

// Forms can use this body inside their existing AppDialog to keep one native
// modal window while switching between a draft and its confirmation.
export function AppConfirmDialogBody({ message, cancelLabel, confirmLabel, onCancel, onConfirm, danger = false, error }: ConfirmationProps) {
  const cancelRef = useRef<View>(null);
  useDialogFocus(cancelRef);
  return (
    <>
      <AppText>{message}</AppText>
      {!!error && <AppText tone="danger" accessibilityRole="alert" accessibilityLiveRegion="polite">{error}</AppText>}
      <NativeView style={styles.actions}>
        <AppButton ref={cancelRef} variant="secondary" accessibilityHint={message} onPress={onCancel}>{cancelLabel}</AppButton>
        <AppButton variant={danger ? 'danger' : 'primary'} onPress={onConfirm}>{confirmLabel}</AppButton>
      </NativeView>
    </>
  );
}

export function AppConfirmDialog({ open, title, ...props }: ConfirmationProps & { open: boolean; title: string }) {
  return <AppDialog open={open} title={title} onRequestClose={props.onCancel}><AppConfirmDialogBody {...props} /></AppDialog>;
}

const styles = StyleSheet.create({ actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: space.sm } });
