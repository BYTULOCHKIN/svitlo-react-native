import type { NotificationDatabase, SqlQuery } from './database';
import { boundedBody, httpsOrigin } from './internal-http';

type Options = { url: string; token: string; request?: typeof fetch };

export function createHttpDatabase(options: Options): NotificationDatabase {
  const origin = httpsOrigin(options.url);
  if (options.token.length < 32 || options.token.length > 256)
    throw new Error('Invalid storage token');
  const request = options.request ?? fetch;
  async function execute(operation: 'first' | 'all' | 'batch', queries: SqlQuery[]) {
    const response = await request(`${origin}/internal/database`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${options.token}` },
      body: JSON.stringify({ operation, queries }),
      signal: AbortSignal.timeout(15000),
      redirect: 'error',
    });
    if (!response.ok)
      throw new Error('Storage request failed');
    const result: unknown = JSON.parse(await boundedBody(response, 256000));
    if (!result || typeof result !== 'object')
      throw new Error('Invalid storage response');
    if (operation === 'batch') {
      if (!('ok' in result) || result.ok !== true)
        throw new Error('Storage write not acknowledged');
      return [];
    }
    if (!('rows' in result) || !Array.isArray(result.rows) || result.rows.length > 200
      || (operation === 'first' && result.rows.length > 1)) {
      throw new Error('Invalid storage rows');
    }
    return result.rows;
  }
  return {
    async first<T>(query: SqlQuery) { return (await execute('first', [query]))[0] as T | undefined; },
    async all<T>(query: SqlQuery) { return await execute('all', [query]) as T[]; },
    async batch(queries) {
      if (queries.length)
        await execute('batch', queries);
    },
  };
}
