import { parsePoeHtml } from '../../src/features/svitlo/poe-parser';
import { canonicalSchedule } from './repository';

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

export async function fetchPilotSchedule() {
  const date = kyivToday();
  const [year, month, day] = date.split('-');
  const response = await fetch('https://www.poe.pl.ua/customs/newgpv-info.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
    body: new URLSearchParams({ seldate: JSON.stringify({ date_in: `${day}-${month}-${year}` }) }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error('Source unavailable');
  const html = await response.text();
  if (html.length > 256000)
    throw new Error('Source response too large');
  return validatePilotHtml(html, date);
}
