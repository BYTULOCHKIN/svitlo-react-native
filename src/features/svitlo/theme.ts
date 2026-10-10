import type { PowerState } from './models';

export const palette = { background: '#1B1B1B', card: '#2C2C2C', border: '#333333', text: '#FFFFFF', secondary: '#B0B0B0', muted: '#6E6E6E', green: '#2ECC71', red: '#E74C3C' };
export const states: Record<PowerState, { title: string; color: string; gradient: [string, string] }> = {
  on: { title: 'Світло Є!', color: '#22C55E', gradient: ['#1B4332', '#081C15'] },
  off: { title: 'Світла Немає', color: '#EF4444', gradient: ['#431B1B', '#1C0808'] },
  possible: { title: 'Можливе відключення', color: '#FFA726', gradient: ['#49321B', '#24190D'] },
  unknown: { title: 'Немає даних', color: '#B0B0B0', gradient: ['#333333', '#1E1E1E'] },
};
