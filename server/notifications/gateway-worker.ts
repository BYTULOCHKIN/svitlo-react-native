import type { D1Binding } from './d1-database';
import { createD1Database } from './d1-database';
import { boundedBody, httpsOrigin, internalJson } from './internal-http';
import { createStorageGateway } from './storage-gateway';

type Bindings = { DB: D1Binding; STORAGE_API_TOKEN?: string; TICK_RUN_TOKEN?: string; BACKEND_URL?: string };
const publicPaths = new Set(['/v1/installations', '/v1/history', '/v1/delivery', '/v1/schedules']);

export async function forwardBackend(request: Request, backendUrl: string, transport: typeof fetch = fetch) {
  const input = new URL(request.url);
  const target = new URL(input.pathname + input.search, httpsOrigin(backendUrl));
  const headers = new Headers();
  for (const key of ['Authorization', 'X-Installation-Id', 'Content-Type', 'Accept']) {
    const value = request.headers.get(key);
    if (value)
      headers.set(key, value);
  }
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await boundedBody(request, 4096);
  return transport(target.toString(), { method: request.method, headers, body, redirect: 'manual', signal: AbortSignal.timeout(20000) });
}

export async function triggerBackend(env: Pick<Bindings, 'BACKEND_URL' | 'TICK_RUN_TOKEN'>, transport: typeof fetch = fetch) {
  if (!env.BACKEND_URL || !env.TICK_RUN_TOKEN || env.TICK_RUN_TOKEN.length < 32)
    return { configured: false, ok: false };
  const response = await transport(`${httpsOrigin(env.BACKEND_URL)}/internal/tick`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.TICK_RUN_TOKEN}` },
    signal: AbortSignal.timeout(240000),
    redirect: 'error',
  });
  // No schedules, recipient arrays or Expo responses are processed in this invocation.
  await response.body?.cancel();
  return { configured: true, ok: response.ok, status: response.status };
}

export default {
  async fetch(request: Request, env: Bindings) {
    const path = new URL(request.url).pathname;
    if (path === '/health' && request.method === 'GET')
      return internalJson({ ok: true });
    if (path === '/internal/database')
      return createStorageGateway(createD1Database(env.DB), env.STORAGE_API_TOKEN)(request);
    if (!publicPaths.has(path) || !env.BACKEND_URL)
      return internalJson({ error: 'Not found' }, 404);
    try {
      return await forwardBackend(request, env.BACKEND_URL);
    }
    catch { return internalJson({ error: 'Backend unavailable' }, 503); }
  },
  async scheduled(_event: unknown, env: Bindings) {
    try {
      console.info(JSON.stringify({ operation: 'backend-tick', ...await triggerBackend(env) }));
    }
    catch { console.error(JSON.stringify({ operation: 'backend-tick', ok: false })); }
  },
};
