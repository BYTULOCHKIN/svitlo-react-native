import { ProxyAgent } from 'undici';
import { fetchScheduleSnapshot, kyivToday } from '../notifications/pilot-source';

const sourceUrl = 'https://www.poe.pl.ua/customs/newgpv-info.php';

// A per-request dispatcher keeps D1 and Expo traffic outside the VPN.
export function createSourceTransport(proxyUrl?: string) {
  const dispatcher = proxyUrl ? new ProxyAgent(proxyUrl) : undefined;
  const request: typeof fetch = async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url !== sourceUrl)
      throw new Error('Unexpected source URL');
    return fetch(input, { ...init, redirect: 'error', ...(dispatcher ? { dispatcher } : {}) });
  };
  return { request, close: async () => dispatcher?.close() };
}

export async function checkSourceTransport(request: typeof fetch) {
  const started = Date.now();
  const date = kyivToday();
  try {
    const snapshot = await fetchScheduleSnapshot({ date, request });
    return { route: 'wireguard', date, valid: true, queues: snapshot.day.queues.length, verifiedAt: snapshot.verifiedAt, wallMs: Date.now() - started };
  }
  catch { return { route: 'wireguard', date, valid: false, wallMs: Date.now() - started }; }
}
