import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fetchScheduleSnapshot } from './pilot-source';

const url = process.env.SVITLO_BENCHMARK_URL;
const tokenFile = process.env.SVITLO_BENCHMARK_TOKEN_FILE;
if (!url?.startsWith('https://') || !tokenFile)
  throw new Error('Set SVITLO_BENCHMARK_URL and SVITLO_BENCHMARK_TOKEN_FILE for the disposable test Worker');
const token = readFileSync(tokenFile, 'utf8').trim();
if (!/^[a-f0-9]{64}$/.test(token))
  throw new Error('Invalid benchmark token file');

async function call(path: string, body: unknown) {
  const response = await fetch(`${url}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(45000) });
  if (!response.ok)
    return { status: response.status, failed: true };
  return response.json();
}

async function main() {
  const results: unknown[] = [];
  const users = Array.from({ length: 100 }, () => ({ id: randomUUID(), secretHash: randomBytes(32).toString('hex'), token: `ExponentPushToken[svitloTest${randomBytes(9).toString('base64url')}]` }));
  const sources = process.env.SVITLO_BENCHMARK_SOURCES?.split(',') ?? ['json', 'table', 'no-outages'];
  if (sources.some(source => !['json', 'table', 'no-outages'].includes(source)))
    throw new Error('Invalid benchmark sources');
  for (const source of sources) {
    for (let iteration = 1; iteration <= 3; iteration++) {
      const seed = await call('/seed', users);
      if (seed.installations !== 100)
        throw new Error('Benchmark seed failed');
      const snapshot = source === 'json' ? await fetchScheduleSnapshot() : undefined;
      const result = { source, iteration, ...(await call('/run', { source, transport: 'mock', snapshot })) };
      results.push(result);
      console.log(JSON.stringify(result));
    }
  }
  if (process.env.SVITLO_BENCHMARK_EXPO !== '0') {
    const seed = await call('/seed', users);
    if (seed.installations !== 100)
      throw new Error('Benchmark seed failed');
    const result = { source: 'json', transport: 'expo', ...(await call('/run', { source: 'json', transport: 'expo', snapshot: await fetchScheduleSnapshot() })) };
    results.push(result);
    console.log(JSON.stringify(result));
  }
  writeFileSync('.expo/notifications/benchmark-results.json', JSON.stringify(results, null, 2));
}

void main().catch(() => {
  console.error('Benchmark failed; credentials omitted. Check aggregate Worker/D1 metrics.');
  process.exitCode = 1;
});
