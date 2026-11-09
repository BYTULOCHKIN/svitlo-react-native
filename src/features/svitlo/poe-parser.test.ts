import liveResponse from './fixtures/poe-2026-10-10.json';
import modernResponse from './fixtures/poe-2026-11-09.json';
import noOutagesResponse from './fixtures/poe-no-outages-2026-10-01.json';
import { getCurrentState } from './models';
import { parsePoeHtml } from './poe-parser';

function table(slots: string[]) {
  return `<table class="turnoff-scheduleui-table"><tbody><tr><td class="turnoff-scheduleui-table-queue" rowspan="2">1 черга</td><td>1</td>${slots.map(state => `<td class="${state}">&nbsp;</td>`).join('')}</tr><tr><td>2</td><td class="light_1" colspan="48"></td></tr></tbody></table>`;
}

describe('полтаваобленерго', () => {
  it('parses the new live table once, ignoring its vertical duplicate and decorative classes', () => {
    const day = parsePoeHtml(modernResponse.html, modernResponse.date);
    expect(day.queues.map(queue => queue.queue)).toEqual(['1.1', '1.2', '2.1', '2.2', '3.1', '3.2', '4.1', '4.2', '5.1', '5.2', '6.1', '6.2']);
    expect(day.queues.every(queue => queue.intervals[0].start === 0 && queue.intervals.at(-1)?.end === 1440)).toBe(true);
    expect(day.queues[0].intervals).toEqual([
      { start: 0, end: 180, state: 'on' },
      { start: 180, end: 300, state: 'off' },
      { start: 300, end: 330, state: 'possible' },
      { start: 330, end: 360, state: 'on' },
      { start: 360, end: 390, state: 'off' },
      { start: 390, end: 420, state: 'possible' },
      { start: 420, end: 540, state: 'on' },
      { start: 540, end: 780, state: 'off' },
      { start: 780, end: 810, state: 'possible' },
      { start: 810, end: 900, state: 'on' },
      { start: 900, end: 1140, state: 'off' },
      { start: 1140, end: 1170, state: 'possible' },
      { start: 1170, end: 1260, state: 'on' },
      { start: 1260, end: 1440, state: 'off' },
    ]);
  });
  it('rejects malformed queue IDs, incomplete days and duplicate rows in the new format', () => {
    const row = `<td class="gpv-q">1.1</td><td class="gpv-c gpv-s1" colspan="48"></td>`;
    const modernTable = (content: string) => `<table class="gpv-table"><tbody>${content}</tbody></table>`;
    for (const broken of [row.replace('1.1', '1.1.2'), row.replace('48', '47'), row.replace('48', '49'), row.replace('48', '0'), row.replace('gpv-c', 'other')])
      expect(() => parsePoeHtml(modernTable(`<tr>${broken}</tr>`), modernResponse.date)).toThrow();
    expect(() => parsePoeHtml(modernTable(`<tr>${row}</tr><tr>${row}</tr>`), modernResponse.date)).toThrow('Дубльовані');
    const unknown = parsePoeHtml(modernTable(`<tr>${row.replace('gpv-s1', 'gpv-s4')}</tr>`), modernResponse.date);
    expect(unknown.queues[0].intervals).toEqual([{ start: 0, end: 1440, state: 'unknown' }]);
  });
  it('recognizes the captured region-wide confirmation only for its date and scope', () => {
    expect(parsePoeHtml(noOutagesResponse.html, noOutagesResponse.date)).toEqual({ date: noOutagesResponse.date, queues: [], noOutagesScope: 'region' });
    expect(() => parsePoeHtml(noOutagesResponse.html, '2026-10-02')).toThrow();
    expect(() => parsePoeHtml(noOutagesResponse.html.replace('у Полтавській області', 'для окремої черги'), noOutagesResponse.date)).toThrow();
    expect(() => parsePoeHtml(noOutagesResponse.html.replace('не прогнозується', 'прогнозується'), noOutagesResponse.date)).toThrow();
  });
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
