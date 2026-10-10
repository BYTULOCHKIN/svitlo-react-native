import type { Interval, QueueSchedule } from './models';
import { getCurrentState } from './models';

export type ScheduleView = ReturnType<typeof getScheduleView>;

export function hasNoPlannedOutages(schedule: QueueSchedule | undefined) {
  const intervals = schedule?.intervals ?? [];
  let end = 0;
  for (const interval of intervals) {
    if (interval.state !== 'on' || interval.start !== end || interval.end <= end || interval.end > 1440)
      return false;
    end = interval.end;
  }
  return end === 1440;
}

export function getScheduleView(schedule: QueueSchedule | undefined, minute: number, regionNoOutages = false) {
  if (regionNoOutages)
    schedule = { queue: schedule?.queue ?? '', intervals: [{ start: 0, end: 1440, state: 'on' }] };
  const intervals = schedule?.intervals ?? [];
  const current = intervals.find(interval => minute >= interval.start && minute < interval.end);
  const next = findNextEvent(current, intervals);
  return {
    noOutagesPlanned: hasNoPlannedOutages(schedule),
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
