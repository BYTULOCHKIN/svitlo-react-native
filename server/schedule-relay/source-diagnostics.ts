import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { authorizedInternal, internalJson } from '../notifications/internal-http';

const hostname = 'www.poe.pl.ua';
type Probe = { address: string; protocol: string; status?: number; code?: string; tcpConnected: boolean; tlsConnected: boolean; wallMs: number };

function safeCode(error: unknown) {
  const code = (error as { code?: string })?.code;
  return code && ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ENETUNREACH', 'EHOSTUNREACH', 'ENOTFOUND', 'EAI_AGAIN', 'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'].includes(code) ? code : 'unavailable';
}

function probe(address: string, secure: boolean): Promise<Probe> {
  return new Promise((resolve) => {
    const started = Date.now();
    const result: Probe = { address, protocol: secure ? 'https' : 'http', tcpConnected: false, tlsConnected: false, wallMs: 0 };
    const transport = secure ? httpsRequest : httpRequest;
    const outgoing = transport({
      hostname: address,
      servername: hostname,
      port: secure ? 443 : 80,
      method: 'HEAD',
      path: '/customs/newgpv-info.php',
      headers: { Host: hostname },
      agent: false,
    }, (response) => {
      clearTimeout(timer);
      response.destroy();
      resolve({ ...result, status: response.statusCode, wallMs: Date.now() - started });
    });
    const timer = setTimeout(() => outgoing.destroy(Object.assign(new Error('Source probe timeout'), { code: 'ETIMEDOUT' })), 6000);
    outgoing.once('socket', (socket) => {
      socket.once('connect', () => {
        result.tcpConnected = true;
      });
      socket.once('secureConnect', () => {
        result.tlsConnected = true;
      });
    });
    outgoing.once('error', (error) => {
      clearTimeout(timer);
      resolve({ ...result, code: safeCode(error), wallMs: Date.now() - started });
    });
    outgoing.end();
  });
}

export async function sourceDiagnostics() {
  try {
    const records = await lookup(hostname, { all: true, family: 4 });
    const addresses = [...new Set(records.map(record => record.address))].slice(0, 4);
    const probes = await Promise.all(addresses.flatMap(address => [probe(address, true), probe(address, false)]));
    return { hostname, addresses, probes };
  }
  catch (error) { return { hostname, dnsCode: safeCode(error) }; }
}

export function createSourceDiagnosticsApi(token: string, next: (request: Request) => Promise<Response>, run = sourceDiagnostics) {
  let pending: ReturnType<typeof sourceDiagnostics> | undefined;
  return async (request: Request) => {
    if (new URL(request.url).pathname !== '/internal/source-diagnostics')
      return next(request);
    if (!await authorizedInternal(request, token))
      return internalJson({ error: 'Not found' }, 404);
    if (request.method !== 'POST')
      return internalJson({ error: 'Method not allowed' }, 405);
    pending ??= run().finally(() => {
      pending = undefined;
    });
    return internalJson(await pending);
  };
}
