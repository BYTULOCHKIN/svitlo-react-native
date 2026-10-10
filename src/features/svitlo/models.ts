export type PowerState = 'on' | 'off' | 'possible' | 'unknown';
export type Interval = { start: number; end: number; state: PowerState };
export type QueueSchedule = { queue: string; intervals: Interval[] };
export type ScheduleDay = { date: string; queues: QueueSchedule[] };
export type LocationIcon = 'home' | 'work' | 'school' | 'shop' | 'gym' | 'parents' | 'cafe' | 'heart';
export type Location = { id: string; name: string; queue: string; icon: LocationIcon };

export function getDateKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function getMinute(now = new Date()) {
  return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
}

export function getCurrentState(schedule: QueueSchedule | undefined, minute: number): PowerState {
  return schedule?.intervals.find(interval => minute >= interval.start && minute < interval.end)?.state ?? 'unknown';
}

export function formatMinute(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}
