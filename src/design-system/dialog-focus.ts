import type { RefObject } from 'react';
import type { TextInput, View } from 'react-native';
import { useEffect } from 'react';
import { AccessibilityInfo, findNodeHandle, Platform } from 'react-native';

export function useDialogFocus(ref: RefObject<View | TextInput | null>, enabled = true) {
  useEffect(() => {
    if (!enabled)
      return;
    const frame = requestAnimationFrame(() => {
      const target = ref.current;
      if (!target)
        return;
      target.focus?.();
      if (Platform.OS !== 'web') {
        const node = findNodeHandle(target);
        if (node)
          AccessibilityInfo.setAccessibilityFocus(node);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [enabled, ref]);
}
