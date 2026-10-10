import type { DefaultTreeAdapterTypes } from 'parse5';
import type { PowerState, QueueSchedule, ScheduleDay } from './models';
import { parseFragment } from 'parse5';

type Cell = { classes: string[]; text: string; span: number };

function toState(classes: string[]): PowerState {
  if (classes.includes('light_1'))
    return 'on';
  if (classes.includes('light_2'))
    return 'off';
  if (classes.includes('light_3'))
    return 'possible';
  return 'unknown';
}

function readRow(cells: Cell[], previousQueue: string) {
  const hasQueue = cells[0]?.classes.includes('turnoff-scheduleui-table-queue');
  const queue = hasQueue ? cells[0].text.replace(/\D/g, '') : previousQueue;
  const subqueue = cells[hasQueue ? 1 : 0]?.text.trim();
  const slots = cells.slice(hasQueue ? 2 : 1).flatMap(cell => Array.from({ length: cell.span }, () => toState(cell.classes)));
  if (!queue || !/^\d+$/.test(subqueue ?? '') || slots.length === 0 || slots.length > 48)
    throw new Error('Неочікуваний формат таблиці графіка');
  const intervals: QueueSchedule['intervals'] = [];
  slots.forEach((state, index) => {
    const previous = intervals.at(-1);
    if (previous?.state === state)
      previous.end = (index + 1) * 30;
    else intervals.push({ start: index * 30, end: (index + 1) * 30, state });
  });
  return { queue, schedule: { queue: `${queue}.${subqueue}`, intervals } };
}

type Node = DefaultTreeAdapterTypes.Node;
type Element = DefaultTreeAdapterTypes.Element;

function elements(node: Node, tag: string): Element[] {
  if (!('childNodes' in node))
    return [];
  return node.childNodes.flatMap(child => [
    ...('tagName' in child && child.tagName === tag ? [child] : []),
    ...elements(child, tag),
  ]);
}

function attr(node: Element, name: string) {
  return node.attrs.find(attribute => attribute.name === name)?.value ?? '';
}

function text(node: Node): string {
  if ('value' in node)
    return node.value;
  return 'childNodes' in node ? node.childNodes.map(text).join('') : '';
}

export function parsePoeHtml(html: string, date: string): ScheduleDay {
  const table = elements(parseFragment(html), 'table').find(node => attr(node, 'class').split(/\s+/).includes('turnoff-scheduleui-table'));
  const queues: QueueSchedule[] = [];
  let currentQueue = '';
  for (const row of table ? elements(table, 'tbody').flatMap(body => elements(body, 'tr')) : []) {
    const cells = elements(row, 'td').map(node => ({ classes: attr(node, 'class').split(/\s+/), text: text(node), span: Number(attr(node, 'colspan') || 1) }));
    if (!cells.length)
      continue;
    if (cells.some(cell => !Number.isInteger(cell.span) || cell.span < 1 || cell.span > 48))
      throw new Error('Некоректна ширина клітинки графіка');
    const result = readRow(cells, currentQueue);
    currentQueue = result.queue;
    queues.push(result.schedule);
  }
  if (!queues.length)
    throw new Error('Немає даних про графіки');
  if (new Set(queues.map(queue => queue.queue)).size !== queues.length)
    throw new Error('Дубльовані черги у відповіді');
  return { date, queues };
}
