import { Buffer } from 'node:buffer';
import { mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { createNotificationApi } from './api';
import { openLocalDatabase } from './local-database';
import { createNotificationRepository } from './repository';

const path = resolve(process.env.SVITLO_LOCAL_DB ?? '.expo/notifications/local.sqlite');
mkdirSync(dirname(path), { recursive: true });
const { database, close } = openLocalDatabase(path);
const api = createNotificationApi(createNotificationRepository(database));
const server = createServer(async (incoming, outgoing) => {
  try {
    const chunks: Buffer[] = [];
    let length = 0;
    for await (const chunk of incoming) {
      const buffer = Buffer.from(chunk);
      length += buffer.length;
      if (length > 4096) {
        outgoing.writeHead(413).end();
        return;
      }
      chunks.push(buffer);
    }
    const request = new Request(`http://127.0.0.1${incoming.url}`, { method: incoming.method, headers: new Headers(Object.entries(incoming.headers).flatMap(([key, value]) => value ? [[key, Array.isArray(value) ? value.join(',') : value]] : [])), body: incoming.method === 'POST' ? Buffer.concat(chunks).toString('utf8') : undefined });
    const response = await api(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(await response.text());
  }
  catch {
    outgoing.writeHead(503).end();
  }
});
server.listen(8787, '127.0.0.1', () => console.log('Local notification pilot: http://127.0.0.1:8787'));
process.on('SIGINT', () => server.close(() => {
  close();
  process.exit(0);
}));
