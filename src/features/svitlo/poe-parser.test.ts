import liveResponse from './fixtures/poe-2026-10-10.json';
import { getCurrentState } from './models';
import { parsePoeHtml } from './poe-parser';

function table(slots: string[]) {
  return `<table class="turnoff-scheduleui-table"><tbody><tr><td class="turnoff-scheduleui-table-queue" rowspan="2">1 черга</td><td>1</td>${slots.map(state => `<td class="${state}">&nbsp;</td>`).join('')}</tr><tr><td>2</td><td class="light_1" colspan="48"></td></tr></tbody></table>`;
}

describe('полтаваобленерго', () => {
  it('parses a captured live response into all twelve subqueues', () => {
    const day = parsePoeHtml(liveResponse.html, liveResponse.date);
    expect(day.queues).toHaveLength(12);
    expect(day.queues[0].queue).toBe('1.1');
    expect(day.queues.every(queue => queue.intervals.at(-1)?.end === 1440)).toBe(true);
  });
  it('preserves possible and unknown states, rowspan and half-hour boundaries', () => {
    const day = parsePoeHtml(table(['light_1', 'light_1', 'light_2', 'light_3', 'other']), '2026-10-10');
    expect(day.queues[0].intervals).toEqual([{ start: 0, end: 60, state: 'on' }, { start: 60, end: 90, state: 'off' }, { start: 90, end: 120, state: 'possible' }, { start: 120, end: 150, state: 'unknown' }]);
    expect(day.queues[1].queue).toBe('1.2');
    expect(getCurrentState(day.queues[0], 90)).toBe('possible');
    expect(getCurrentState(day.queues[0], 150)).toBe('unknown');
  });
  it('rejects empty or unexpected HTML instead of claiming power is on', () => {
    expect(() => parsePoeHtml('', '2026-10-10')).toThrow();
    expect(() => parsePoeHtml('<p>Помилка</p>', '2026-10-10')).toThrow();
  });
});
