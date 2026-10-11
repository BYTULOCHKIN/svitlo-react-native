export async function authorizedInternal(request: Request, token?: string) {
  const supplied = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  if (!token || token.length < 32 || token.length > 256 || supplied.length !== token.length)
    return false;
  const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  const [actual, expected] = await Promise.all([digest(supplied), digest(token)]);
  let difference = 0;
  for (let index = 0; index < expected.length; index++)
    difference |= actual[index] ^ expected[index];
  return difference === 0;
}

export async function boundedBody(request: Request | Response, limit: number) {
  if (!request.body)
    return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let body = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done)
        return body + decoder.decode();
      size += value.byteLength;
      if (size > limit)
        throw new Error('Body too large');
      body += decoder.decode(value, { stream: true });
    }
  }
  finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function internalJson(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function httpsOrigin(value: string) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash)
    throw new Error('Expected HTTPS origin');
  return url.origin;
}
