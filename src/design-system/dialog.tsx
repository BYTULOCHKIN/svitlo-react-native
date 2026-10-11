import type { ReactNode, RefObject } from 'react';
import { createModal } from '@gluestack-ui/core/modal/creator';
import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
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
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());
  const { width, height, fontScale } = useWindowDimensions();
  const compact = keyboardVisible || height < metrics.dialogCompactHeight || (width < metrics.timerStackWidth && fontScale > metrics.timerStackFontScale);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return (
    <Dialog isOpen={open} onClose={onRequestClose} useRNModal animationPreset="none" initialFocusRef={initialFocusRef} finalFocusRef={finalFocusRef} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.root}>
      <Dialog.Backdrop testID="app-dialog-backdrop" accessible={false} importantForAccessibility="no" style={styles.backdrop} />
      <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
        <Dialog.Content style={styles.content} accessibilityLabel={title}>
          <Dialog.Header style={[styles.header, compact && styles.compactHeader]}>
            <AppText variant={compact ? (fontScale > metrics.timerStackFontScale ? 'emphasis' : 'section') : 'title'} accessibilityRole="header" style={styles.title}>{title}</AppText>
            <AppIconButton accessibilityLabel="Закрити діалог" icon={<AppIcon name="close" />} onPress={onRequestClose} />
          </Dialog.Header>
          <Dialog.Body testID="app-dialog-body" keyboardShouldPersistTaps="handled" style={styles.scroll} contentContainerStyle={[styles.body, compact && styles.compactBody]}>
            {children}
            {footer && compact && <Dialog.Footer>{footer}</Dialog.Footer>}
          </Dialog.Body>
          {footer && !compact && <Dialog.Footer style={styles.footer}>{footer}</Dialog.Footer>}
        </Dialog.Content>
      </SafeAreaView>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: palette.overlay },
  safeArea: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: space.lg },
  content: { backgroundColor: palette.card, borderRadius: radius.dialog, maxHeight: metrics.dialogMaxHeight, maxWidth: metrics.dialogMaxWidth, width: '100%', overflow: 'hidden' },
  scroll: { flexGrow: 0, flexShrink: 1 },
  body: { paddingHorizontal: space.xxl, paddingBottom: space.xxl, gap: space.lg },
  compactBody: { paddingHorizontal: space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.xxl, paddingBottom: space.lg },
  compactHeader: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.sm },
  title: { flex: 1, minWidth: 0 },
  footer: { paddingHorizontal: space.xxl, paddingBottom: space.xxl, paddingTop: space.sm },
});
