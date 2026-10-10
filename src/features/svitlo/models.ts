export type PowerState = 'on' | 'off' | 'possible' | 'unknown';
export type Interval = { start: number; end: number; state: PowerState };
export type QueueSchedule = { queue: string; intervals: Interval[] };
export type ScheduleDay = { date: string; queues: QueueSchedule[]; noOutagesScope?: 'region' };
export type LocationIcon = 'home' | 'work' | 'school' | 'shop' | 'gym' | 'parents' | 'cafe' | 'heart';
export type Location = { id: string; name: string; queue: string; icon: LocationIcon };

const kyivDate = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', year: 'numeric', month: '2-digit', day: '2-digit' });
const kyivTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Kyiv', hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function getDateKey(now = new Date()) {
  const parts = kyivDate.formatToParts(now);
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}

export function getMinute(now = new Date()) {
  const parts = kyivTime.formatToParts(now);
  const value = (type: string) => Number(parts.find(part => part.type === type)!.value);
  return value('hour') * 60 + value('minute') + value('second') / 60;
}

export function getCurrentState(schedule: QueueSchedule | undefined, minute: number): PowerState {
  return schedule?.intervals.find(interval => minute >= interval.start && minute < interval.end)?.state ?? 'unknown';
}

export function formatMinute(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}
