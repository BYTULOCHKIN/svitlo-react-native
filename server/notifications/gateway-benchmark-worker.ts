import type { D1Binding } from './d1-database';
import { createD1Database } from './d1-database';
import { createStorageGateway } from './storage-gateway';

// Dedicated disposable D1 only. Metrics never include SQL, parameters or identities.
export default {
  async fetch(request: Request, env: { DB: D1Binding; STORAGE_API_TOKEN?: string }) {
    const database = createD1Database(env.DB);
    const response = await createStorageGateway(database, env.STORAGE_API_TOKEN)(request);
    const headers = new Headers(response.headers);
    for (const [name, value] of Object.entries(database.metrics))
      headers.set(`X-Svitlo-D1-${name}`, String(value));
    console.info(JSON.stringify({ operation: 'benchmark-storage', ...database.metrics }));
    return new Response(response.body, { status: response.status, headers });
  },
};
