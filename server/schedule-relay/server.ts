import { Buffer } from 'node:buffer';
import { createServer } from 'node:http';
import { createHttpDatabase } from '../notifications/http-database';
import { createBackendApi } from './backend';
import { createSourceDiagnosticsApi } from './source-diagnostics';

const api = createSourceDiagnosticsApi(process.env.TICK_RUN_TOKEN ?? '', createBackendApi({
  database: createHttpDatabase({ url: process.env.STORAGE_API_URL ?? '', token: process.env.STORAGE_API_TOKEN ?? '' }),
  tickToken: process.env.TICK_RUN_TOKEN ?? '',
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN,
}));
const port = Number(process.env.PORT ?? 10000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('Invalid PORT');
const server = createServer(async (incoming, outgoing) => {
  try {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of incoming) {
      size += chunk.length;
      if (size > 4096) {
        outgoing.writeHead(413).end();
        return;
      }
      chunks.push(chunk);
    }
    const request = new Request(`http://relay.internal${incoming.url}`, {
      method: incoming.method,
      headers: {
        'Authorization': incoming.headers.authorization ?? '',
        'X-Installation-Id': String(incoming.headers['x-installation-id'] ?? ''),
        'Content-Type': String(incoming.headers['content-type'] ?? ''),
      },
      body: chunks.length ? Buffer.concat(chunks).toString('utf8') : undefined,
    });
    const response = await api(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(await response.text());
  }
  catch {
    outgoing.writeHead(503).end();
  }
});
server.requestTimeout = 20000;
server.headersTimeout = 10000;
server.listen(port, '0.0.0.0', () => console.log('Svitlo backend listening'));
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
