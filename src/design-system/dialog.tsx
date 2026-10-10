import type { ReactNode, RefObject } from 'react';
import { createModal } from '@gluestack-ui/core/modal/creator';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIconButton } from './button';
import { AppIcon } from './icon';
import { AppText } from './text';
import { metrics, palette, radius, space } from './tokens';

const Dialog = createModal({ Root: KeyboardAvoidingView, Content: View, CloseButton: Pressable, Header: View, Footer: View, Body: ScrollView, Backdrop: Pressable });

export type AppDialogProps = {
  open: boolean;
  onRequestClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  initialFocusRef?: RefObject<unknown>;
  finalFocusRef?: RefObject<unknown>;
};

export function AppDialog({ open, onRequestClose, title, children, footer, initialFocusRef, finalFocusRef }: AppDialogProps) {
  return (
    <Dialog isOpen={open} onClose={onRequestClose} useRNModal animationPreset="none" initialFocusRef={initialFocusRef} finalFocusRef={finalFocusRef} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <Dialog.Backdrop testID="app-dialog-backdrop" accessible={false} importantForAccessibility="no" style={styles.backdrop} />
      <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
        <Dialog.Content style={styles.content} accessibilityLabel={title}>
          <Dialog.Body keyboardShouldPersistTaps="handled" style={styles.scroll} contentContainerStyle={styles.body}>
            <Dialog.Header style={styles.header}>
              <AppText variant="title" accessibilityRole="header" style={styles.title}>{title}</AppText>
              <AppIconButton accessibilityLabel="Закрити діалог" icon={<AppIcon name="close" />} onPress={onRequestClose} />
            </Dialog.Header>
            {children}
            {footer && <Dialog.Footer style={styles.footer}>{footer}</Dialog.Footer>}
          </Dialog.Body>
        </Dialog.Content>
      </SafeAreaView>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: palette.overlay },
  safeArea: { flex: 1, justifyContent: 'center', padding: space.lg },
  content: { backgroundColor: palette.card, borderRadius: radius.dialog, maxHeight: metrics.dialogMaxHeight, width: '100%', overflow: 'hidden' },
  scroll: { flexGrow: 0, flexShrink: 1 },
  body: { padding: space.xxl, gap: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { flex: 1, minWidth: 0 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: space.sm },
});
