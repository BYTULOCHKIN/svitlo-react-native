import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createSourceDiagnosticsApi } from './source-diagnostics';

test('source network diagnostics authenticate before I/O, ignore URL inputs and coalesce parallel probes', async () => {
  const token = 'ab'.repeat(32);
  let probes = 0;
  let resolve: (value: { hostname: string; addresses: string[]; probes: [] }) => void = () => {};
  const pending = new Promise<{ hostname: string; addresses: string[]; probes: [] }>((done) => {
    resolve = done;
  });
  const api = createSourceDiagnosticsApi(token, async () => Response.json({ ok: true }), () => {
    probes++;
    return pending;
  });
  const url = 'https://backend.invalid/internal/source-diagnostics?url=http://127.0.0.1';
  assert.equal((await api(new Request(url, { method: 'POST' }))).status, 404);
  const headers = { Authorization: `Bearer ${token}` };
  assert.equal((await api(new Request(url, { headers }))).status, 405);
  assert.equal(probes, 0);
  const first = api(new Request(url, { method: 'POST', headers }));
  const second = api(new Request(url, { method: 'POST', headers }));
  await new Promise(done => setTimeout(done, 10));
  assert.equal(probes, 1);
  resolve({ hostname: 'www.poe.pl.ua', addresses: [], probes: [] });
  for (const response of await Promise.all([first, second])) {
    assert.equal(response.status, 200);
    assert.equal((await response.json()).hostname, 'www.poe.pl.ua');
  }
  assert.equal((await api(new Request('https://backend.invalid/health'))).status, 200);
});
