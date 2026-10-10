import type { QueueSchedule } from './models';
import { countdownParts, eventLabel, getScheduleView, hasNoPlannedOutages } from './schedule-view';

const schedule: QueueSchedule = { queue: '1.1', intervals: [
  { start: 0, end: 630, state: 'on' },
  { start: 630, end: 690, state: 'possible' },
  { start: 690, end: 1440, state: 'off' },
] };

describe('local schedule clock', () => {
  it('confirms a full day with power and rejects incomplete or uncertain data', () => {
    const full: QueueSchedule = { queue: '1.1', intervals: [{ start: 0, end: 1440, state: 'on' }] };
    expect(hasNoPlannedOutages(full)).toBe(true);
    expect(hasNoPlannedOutages(undefined)).toBe(false);
    expect(hasNoPlannedOutages({ ...full, intervals: [] })).toBe(false);
    expect(hasNoPlannedOutages({ ...full, intervals: [{ start: 0, end: 1410, state: 'on' }] })).toBe(false);
    expect(hasNoPlannedOutages({ ...full, intervals: [{ start: 30, end: 1440, state: 'on' }] })).toBe(false);
    expect(hasNoPlannedOutages({ ...full, intervals: [{ start: 0, end: 1440, state: 'unknown' }] })).toBe(false);
    expect(hasNoPlannedOutages(schedule)).toBe(false);
    const view = getScheduleView(undefined, 600, true);
    expect(view.noOutagesPlanned).toBe(true);
    expect(view.state).toBe('on');
    expect(view.remainingSeconds).toBeNull();
  });
  it('counts down to a possible outage without claiming a guaranteed outage', () => {
    const view = getScheduleView(schedule, 629.5);
    expect(view.remainingSeconds).toBe(30);
    expect(view.next?.state).toBe('possible');
    expect(eventLabel(view.next!.state)).toBe('до можливого відключення');
    expect(countdownParts(30)).toEqual(['00', '00', '30']);
  });
  it('recomputes the current interval and event at exact boundaries', () => {
    const view = getScheduleView(schedule, 630);
    expect(view.state).toBe('possible');
    expect(view.intervals).toHaveLength(2);
    expect(view.intervals[0].isCurrent).toBe(true);
    expect(view.remainingSeconds).toBe(3600);
  });
  it('clears the timer without a next event and preserves the last minute', () => {
    expect(getScheduleView(schedule, 1439.5).state).toBe('off');
    expect(getScheduleView(schedule, 1439.5).remainingSeconds).toBeNull();
    expect(getScheduleView(schedule, 1440).state).toBe('unknown');
    expect(getScheduleView(undefined, 600).remainingSeconds).toBeNull();
  });
  it('does not predict an event through unknown data or a gap', () => {
    const unknown: QueueSchedule = { queue: '2.1', intervals: [{ start: 0, end: 30, state: 'on' }, { start: 30, end: 60, state: 'unknown' }, { start: 60, end: 90, state: 'off' }] };
    expect(getScheduleView(unknown, 10).remainingSeconds).toBeNull();
    expect(getScheduleView(unknown, 40).remainingSeconds).toBeNull();
    expect(getScheduleView({ ...unknown, intervals: [unknown.intervals[0], unknown.intervals[2]] }, 10).next).toBeNull();
  });
  it('does not retain the previous queue timer after switching', () => {
    expect(getScheduleView(schedule, 600).remainingSeconds).toBe(1800);
    expect(getScheduleView({ queue: '6.2', intervals: [{ start: 0, end: 1440, state: 'on' }] }, 600).remainingSeconds).toBeNull();
  });
});
