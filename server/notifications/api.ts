import type { createNotificationRepository } from './repository';
import { ZodError } from 'zod';
import { identitySchema } from '../../src/features/svitlo/notifications/models';
import { NotificationApiError } from './repository';

type Repository = ReturnType<typeof createNotificationRepository>;

export function createNotificationApi(repository: Repository) {
  return async (request: Request): Promise<Response> => {
    try {
      const url = new URL(request.url);
      if (url.pathname === '/health' && request.method === 'GET')
        return json({ ok: true });
      if (url.pathname === '/v1/installations' && request.method === 'POST') {
        const body = await request.text();
        if (body.length > 4096)
          throw new NotificationApiError(413, 'Завеликий запит');
        const identity = identitySchema.parse(JSON.parse(body));
        return json(await repository.register(identity));
      }
      if (url.pathname === '/v1/history' && request.method === 'GET') {
        const identity = identitySchema.parse({ id: request.headers.get('X-Installation-Id'), secret: request.headers.get('Authorization')?.replace(/^Bearer /, '') });
        return json(await repository.history(identity, url.searchParams.get('cursor') ?? undefined));
      }
      return json({ error: 'Не знайдено' }, 404);
    }
    catch (error) {
      if (error instanceof NotificationApiError)
        return json({ error: error.message }, error.status);
      if (error instanceof ZodError || error instanceof SyntaxError)
        return json({ error: 'Некоректний запит' }, 400);
      return json({ error: 'Не вдалося отримати сповіщення. Спробуйте ще раз.' }, 503);
    }
  };
}

function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store' } });
}
