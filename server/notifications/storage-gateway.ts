import type { NotificationDatabase, SqlQuery } from './database';
import { authorizedInternal, boundedBody, internalJson } from './internal-http';

type Operation = 'first' | 'all' | 'batch';

function parseCommand(value: unknown): { operation: Operation; queries: SqlQuery[] } {
  if (!value || typeof value !== 'object' || !('operation' in value) || !('queries' in value)
    || !['first', 'all', 'batch'].includes(String(value.operation)) || !Array.isArray(value.queries)
    || !value.queries.length || value.queries.length > 20 || (value.operation !== 'batch' && value.queries.length !== 1)) {
    throw new Error('Invalid command');
  }
  const operation = value.operation as Operation;
  const queries = value.queries.map((query: unknown) => {
    if (!query || typeof query !== 'object' || !('sql' in query) || !('params' in query)
      || typeof query.sql !== 'string' || query.sql.length > 16384 || query.sql.includes(';')
      || !(operation === 'batch' ? /^(?:INSERT|UPDATE|DELETE)\s/i : /^SELECT\s/i).test(query.sql.trim())
      || !Array.isArray(query.params) || query.params.length > 100
      || query.params.some(param => typeof param === 'string' ? param.length > 64000 : typeof param !== 'number' || !Number.isFinite(param))) {
      throw new Error('Invalid query');
    }
    return { sql: query.sql, params: query.params as (string | number)[] };
  });
  return { operation, queries };
}

// This server-only credential is scoped to the bound app database, never an account API key.
export function createStorageGateway(database: NotificationDatabase, token?: string) {
  return async (request: Request) => {
    if (new URL(request.url).pathname !== '/internal/database' || !await authorizedInternal(request, token))
      return internalJson({ error: 'Not found' }, 404);
    if (request.method !== 'POST')
      return internalJson({ error: 'Method not allowed' }, 405);
    let body: string;
    try {
      body = await boundedBody(request, 128000);
    }
    catch { return internalJson({ error: 'Body too large' }, 413); }
    let command: ReturnType<typeof parseCommand>;
    try {
      command = parseCommand(JSON.parse(body));
    }
    catch { return internalJson({ error: 'Invalid command' }, 400); }
    try {
      if (command.operation === 'batch') {
        await database.batch(command.queries);
        return internalJson({ ok: true });
      }
      if (command.operation === 'first') {
        const row = await database.first(command.queries[0]);
        return internalJson({ rows: row === undefined ? [] : [row] });
      }
      const rows = await database.all(command.queries[0]);
      if (rows.length > 200)
        return internalJson({ error: 'Result too large' }, 413);
      return internalJson({ rows });
    }
    catch { return internalJson({ error: 'Storage unavailable' }, 503); }
  };
}
