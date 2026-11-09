import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { createSourceTransport } from './source-transport';

test('source requests use CONNECT and fail closed when the WireGuard proxy is unavailable', async () => {
  const proxy = createServer();
  const tunnels: string[] = [];
  proxy.on('connect', (request, socket) => {
    tunnels.push(request.url ?? '');
    socket.end('HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\n\r\n');
  });
  await new Promise<void>(resolve => proxy.listen(0, '127.0.0.1', resolve));
  const address = proxy.address();
  assert.ok(address && typeof address !== 'string');
  const transport = createSourceTransport(`http://127.0.0.1:${address.port}`);
  try {
    await assert.rejects(transport.request('https://www.poe.pl.ua/customs/newgpv-info.php', { method: 'POST', signal: AbortSignal.timeout(2000) }));
    assert.deepEqual(tunnels, ['www.poe.pl.ua:443']);
    await assert.rejects(transport.request('https://example.com'), /Unexpected source URL/);
    assert.equal(tunnels.length, 1);
  }
  finally {
    await transport.close();
    await new Promise<void>(resolve => proxy.close(() => resolve()));
  }
});
