import { parsePoeHtml } from '../../src/features/svitlo/poe-parser';
import { canonicalSchedule } from './repository';
import { validatedSnapshot } from './schedules';

type SourceOptions = { date?: string; relayUrl?: string; relayToken?: string; request?: typeof fetch; now?: () => number };

export function kyivToday(now = new Date()) {
  return now.toLocaleDateString('en-CA', { timeZone: 'Europe/Kyiv' });
}

export function validatePilotHtml(html: string, date: string) {
  const [year, month, dayNumber] = date.split('-').map(Number);
  const months = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  const heading = html.split('<table')[0].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  if (!heading.includes(`${dayNumber} ${months[month - 1]} ${year} року`))
    throw new Error('Source date does not match request');
  const day = parsePoeHtml(html, date);
  canonicalSchedule(day);
  if (day.queues.some(queue => queue.intervals.some(interval => interval.state === 'unknown')))
    throw new Error('Unknown schedule state');
  return day;
}

export async function readSourceText(response: Response, maxBytes = 256000) {
  if (!response.ok)
    throw new Error(`Source HTTP ${response.status}`);
  if (!response.body)
    throw new Error('Source unavailable');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let length = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done)
        return text + decoder.decode();
      length += value.byteLength;
      if (length > maxBytes)
        throw new Error('Source response too large');
      text += decoder.decode(value, { stream: true });
    }
  }
  finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export async function fetchScheduleSnapshot(options: SourceOptions = {}) {
  const now = options.now ?? Date.now;
  const date = options.date ?? kyivToday(new Date(now()));
  const request = options.request ?? fetch;
  if (options.relayUrl) {
    const url = new URL('/v1/schedules', options.relayUrl);
    if (url.protocol !== 'https:' || !options.relayToken || options.relayToken.length < 32)
      throw new Error('Invalid schedule relay configuration');
    url.searchParams.set('date', date);
    const response = await request(url.toString(), { headers: { Authorization: `Bearer ${options.relayToken}` }, signal: AbortSignal.timeout(15000) });
    return validatedSnapshot(JSON.parse(await readSourceText(response, 128000)), date, now());
  }
  const [year, month, dayNumber] = date.split('-');
  const response = await request('https://www.poe.pl.ua/customs/newgpv-info.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
    body: new URLSearchParams({ seldate: JSON.stringify({ date_in: `${dayNumber}-${month}-${year}` }) }),
    signal: AbortSignal.timeout(15000),
  });
  const day = validatePilotHtml(await readSourceText(response), date);
  return { day, verifiedAt: now() };
}

export async function fetchPilotSchedule(options: SourceOptions = {}) {
  return (await fetchScheduleSnapshot(options)).day;
}
