import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import { parseScheduleJson } from '../schedule-json';

export const widgetNative = Platform.OS === 'android'
  ? requireOptionalNativeModule<{
      sync: (locations: string, endpoint: string, scheme: string) => void;
      readDay: (date: string) => string | null;
    }>('SvitloWidget')
  : null;

export function readWidgetDay(date: string) {
  try {
    const raw = widgetNative?.readDay(date);
    return raw ? parseScheduleJson(JSON.parse(raw), date) : undefined;
  }
  catch {
    return undefined;
  }
}
