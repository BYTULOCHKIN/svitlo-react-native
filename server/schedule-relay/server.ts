import { createServer } from 'node:http';
import { createRelayApi } from './api';

const api = createRelayApi({ token: process.env.SCHEDULE_RELAY_TOKEN ?? '' });
const port = Number(process.env.PORT ?? 10000);
if (!Number.isInteger(port) || port < 1 || port > 65535)
  throw new Error('Invalid PORT');
const server = createServer(async (incoming, outgoing) => {
  try {
    const request = new Request(`http://relay.internal${incoming.url}`, {
      method: incoming.method,
      headers: { Authorization: incoming.headers.authorization ?? '' },
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
server.listen(port, '0.0.0.0', () => console.log('Schedule relay listening'));
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
