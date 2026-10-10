import type { Interval, QueueSchedule } from './models';
import { getCurrentState } from './models';

export type ScheduleView = ReturnType<typeof getScheduleView>;

export function getScheduleView(schedule: QueueSchedule | undefined, minute: number) {
  const intervals = schedule?.intervals ?? [];
  const current = intervals.find(interval => minute >= interval.start && minute < interval.end);
  const next = findNextEvent(current, intervals);
  return {
    state: getCurrentState(schedule, minute),
    next,
    remainingSeconds: next ? Math.max(0, Math.round(next.start * 60 - minute * 60)) : null,
    intervals: intervals.filter(interval => interval.end > minute).map(interval => ({ ...interval, isCurrent: interval === current })),
  };
}

function findNextEvent(current: Interval | undefined, intervals: Interval[]) {
  if (!current || current.state === 'unknown')
    return null;
  let boundary = current.end;
  for (const interval of intervals.filter(item => item.start >= current.end)) {
    if (interval.start !== boundary || interval.state === 'unknown')
      return null;
    if (interval.state !== current.state)
      return interval;
    boundary = interval.end;
  }
  return null;
}

export function eventLabel(state: Interval['state']) {
  return { on: 'до відновлення за графіком', off: 'до відключення', possible: 'до можливого відключення', unknown: 'немає даних про наступну подію' }[state];
}

export function countdownParts(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return [Math.floor(value / 3600), Math.floor(value % 3600 / 60), value % 60].map(part => String(part).padStart(2, '0'));
}
