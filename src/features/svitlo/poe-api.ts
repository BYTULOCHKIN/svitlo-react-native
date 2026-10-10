import { parsePoeHtml } from './poe-parser';

export async function fetchSchedule(date: string, signal?: AbortSignal) {
  const [year, month, day] = date.split('-');
  const response = await fetch('https://www.poe.pl.ua/customs/newgpv-info.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
    body: `seldate=${encodeURIComponent(JSON.stringify({ date_in: `${day}-${month}-${year}` }))}`,
    signal,
  });
  if (!response.ok)
    throw new Error('Не вдалося отримати графік. Спробуйте ще раз.');
  return parsePoeHtml(await response.text(), date);
}
