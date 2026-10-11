import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createNotificationsClient } from '../../src/features/svitlo/notifications/client';

async function main() {
  const url = process.env.SVITLO_PILOT_URL ?? 'http://127.0.0.1:8788';
  const identity = { id: randomUUID(), secret: randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '') };
  const client = createNotificationsClient({ url, getIdentity: async () => identity });
  assert.equal((await fetch(`${url}/health`)).status, 200);
  await client.connect();
  await client.updateDelivery({ permission: 'denied' });
  assert.deepEqual((await client.history()).items, []);
  assert.equal((await fetch(`${url}/v1/history`, { headers: { 'X-Installation-Id': identity.id, 'Authorization': `Bearer ${'00'.repeat(32)}` } })).status, 401);
  assert.equal((await fetch(`${url}/pilot/publication`, { method: 'POST' })).status, 404);
  if (process.argv.includes('--cron'))
    assert.equal((await fetch(`${url}/cdn-cgi/handler/scheduled?cron=*+*+*+*+*`)).status, 200);
  console.info('Worker health, D1 registration, permission denial, empty history, authentication and private endpoint: PASS');
}

void main().catch(() => {
  console.error('Worker smoke: FAIL (no credentials or response bodies are logged)');
  process.exitCode = 1;
});
