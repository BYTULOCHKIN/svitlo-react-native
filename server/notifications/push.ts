import type { NotificationDatabase } from './database';
import { preferenceAllowsPush, warningIsCurrent } from './delivery-policy';

type Recipient = { history_id: string; push_token: string; schedule_date: string; installation_id: string; type?: 'schedule-published' | 'schedule-changed' | 'outage-warning'; details?: string | null };
type Ticket = { status: 'ok'; id: string } | { status: 'error'; details?: { error: string } };

function parseTickets(value: unknown): Ticket[] {
  if (!value || typeof value !== 'object' || !('data' in value) || !Array.isArray(value.data) || value.data.length > 100)
    throw new Error('Invalid Expo tickets');
  return value.data.map((ticket: unknown) => {
    if (!ticket || typeof ticket !== 'object' || !('status' in ticket))
      throw new Error('Invalid Expo ticket');
    if (ticket.status === 'ok' && 'id' in ticket && typeof ticket.id === 'string' && ticket.id.length > 0)
      return { status: 'ok', id: ticket.id };
    if (ticket.status === 'error') {
      if (!('details' in ticket))
        return { status: 'error' };
      const details = ticket.details;
      if (details && typeof details === 'object' && 'error' in details && typeof details.error === 'string')
        return { status: 'error', details: { error: details.error } };
    }
    throw new Error('Invalid Expo ticket');
  });
}

export function publicationMessage(recipient: Recipient) {
  if (recipient.type === 'outage-warning') {
    const details: { queue: string; outageAt: number; locations: { name: string }[] } = JSON.parse(recipient.details!);
    const names: string[] = [];
    for (const location of details.locations) {
      if (new TextEncoder().encode([...names, location.name].join(', ')).length > 900)
        break;
      names.push(location.name);
    }
    const remaining = details.locations.length - names.length;
    const time = new Date(details.outageAt).toLocaleString('uk-UA', { timeZone: 'Europe/Kyiv', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
    return {
      to: recipient.push_token,
      title: 'Відключення за 10 хвилин',
      body: `${names.join(', ')}${remaining ? ` та ще ${remaining}` : ''} · Черга ${details.queue}. Заплановане відключення: ${time}.`,
      sound: 'default',
      channelId: 'svitlo-schedules',
      expiration: Math.floor(details.outageAt / 1000) - 1,
      data: { notificationId: recipient.history_id },
    };
  }
  return {
    to: recipient.push_token,
    title: recipient.type === 'schedule-changed' ? 'Графік змінено' : 'Опубліковано графік',
    body: recipient.type === 'schedule-changed' ? `Графік на ${recipient.schedule_date} оновлено. Перегляньте зміни у застосунку.` : `Графік на ${recipient.schedule_date} доступний у застосунку.`,
    sound: 'default',
    channelId: 'svitlo-schedules',
    data: { notificationId: recipient.history_id },
  };
}

// Pilot policy: claim before external I/O; ambiguous delivery is not retried blindly.
// Receipt reconciliation and recoverable failures are extended in issue 14.
export async function dispatchPush(database: NotificationDatabase, request: typeof fetch = fetch, options?: string | { accessToken?: string; now?: () => number }) {
  const { accessToken, now = Date.now } = typeof options === 'string' ? { accessToken: options } : options ?? {};
  const claim = crypto.randomUUID();
  await database.batch([{
    sql: `UPDATE push_outbox SET state = 'claimed', claim_key = ? WHERE history_id IN
      (SELECT o.history_id FROM push_outbox o JOIN notification_history h ON h.id = o.history_id
       JOIN notification_events e ON e.id = h.event_id WHERE o.state = 'queued'
       ORDER BY CASE WHEN e.type = 'outage-warning' THEN 0 ELSE 1 END, o.history_id LIMIT 100) AND state = 'queued'`,
    params: [claim],
  }]);
  await database.batch([{
    sql: `UPDATE push_outbox SET state = 'failed', error = 'DeliveryNoLongerEligible' WHERE claim_key = ? AND NOT EXISTS (
      SELECT 1 FROM notification_history h JOIN notification_events e ON e.id = h.event_id
      JOIN installation_delivery d ON d.installation_id = h.installation_id
      LEFT JOIN installation_preferences p ON p.installation_id = h.installation_id
      WHERE h.id = push_outbox.history_id AND d.permission = 'granted' AND d.push_token IS NOT NULL AND ${preferenceAllowsPush} AND ${warningIsCurrent(now())})`,
    params: [claim],
  }]);
  const recipients = await database.all<Recipient>({
    sql: `SELECT o.history_id, d.push_token, e.schedule_date, h.installation_id, e.type, h.details FROM push_outbox o
      JOIN notification_history h ON h.id = o.history_id JOIN notification_events e ON e.id = h.event_id
      JOIN installation_delivery d ON d.installation_id = h.installation_id
      LEFT JOIN installation_preferences p ON p.installation_id = h.installation_id
      WHERE o.claim_key = ? AND o.state = 'claimed' AND d.permission = 'granted' AND d.push_token IS NOT NULL
      AND ${preferenceAllowsPush} AND ${warningIsCurrent(now())} ORDER BY o.history_id`,
    params: [claim],
  });
  if (!recipients.length) {
    await database.batch([{ sql: 'UPDATE push_outbox SET state = \'failed\', error = \'DeliveryNoLongerEligible\' WHERE claim_key = ? AND state = \'claimed\'', params: [claim] }]);
    return { attempted: 0, accepted: 0 };
  }
  try {
    const response = await request('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify(recipients.map(publicationMessage)),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new Error('ExpoTransportError');
    const data = parseTickets(await response.json());
    if (data.length !== recipients.length)
      throw new Error('ExpoTicketCountMismatch');
    const results = data.map((ticket, index) => {
      const recipient = recipients[index];
      return { historyId: recipient.history_id, installationId: recipient.installation_id, token: recipient.push_token, state: ticket.status === 'ok' ? 'sent' : 'failed', ticket: ticket.status === 'ok' ? ticket.id : '', error: ticket.status === 'error' ? (ticket.details?.error ?? 'ExpoRejected') : '' };
    });
    // Set-based updates keep a 100-recipient fan-out below D1 Free's 50-query limit.
    const payload = JSON.stringify(results);
    await database.batch([{
      sql: `UPDATE push_outbox SET (state, ticket_id, error) =
        (SELECT json_extract(value, '$.state'), json_extract(value, '$.ticket'), json_extract(value, '$.error')
        FROM json_each(?) WHERE json_extract(value, '$.historyId') = push_outbox.history_id)
        WHERE claim_key = ? AND state = 'claimed' AND history_id IN
        (SELECT json_extract(value, '$.historyId') FROM json_each(?))`,
      params: [payload, claim, payload],
    }, {
      sql: `UPDATE installation_delivery SET push_token = NULL WHERE EXISTS
        (SELECT 1 FROM json_each(?) WHERE json_extract(value, '$.installationId') = installation_delivery.installation_id
        AND json_extract(value, '$.token') = installation_delivery.push_token AND json_extract(value, '$.error') = 'DeviceNotRegistered')`,
      params: [payload],
    }, {
      sql: 'UPDATE push_outbox SET state = \'failed\', error = \'DeliveryNoLongerEligible\' WHERE claim_key = ? AND state = \'claimed\'',
      params: [claim],
    }]);
    return { attempted: recipients.length, accepted: data.filter(ticket => ticket.status === 'ok').length };
  }
  catch {
    await database.batch([{ sql: 'UPDATE push_outbox SET state = \'failed\', error = \'DeliveryUnknown\' WHERE claim_key = ? AND state = \'claimed\'', params: [claim] }]);
    return { attempted: recipients.length, accepted: 0 };
  }
}
