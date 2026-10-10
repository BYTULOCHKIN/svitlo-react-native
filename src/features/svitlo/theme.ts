import type { PowerState } from './models';
import { powerColors } from '@/design-system/tokens';

export { palette } from '@/design-system/tokens';
export const states = {
  on: { title: 'Світло є', ...powerColors.on },
  off: { title: 'Світла немає', ...powerColors.off },
  possible: { title: 'Можливе відключення', ...powerColors.possible },
  unknown: { title: 'Немає даних', ...powerColors.unknown },
} satisfies Record<PowerState, { title: string; color: string; surface: string; border: string; gradient: [string, string] }>;
