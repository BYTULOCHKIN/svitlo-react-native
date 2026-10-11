import type { NotificationDatabase } from './database';

type Recipient = { history_id: string; push_token: string; schedule_date: string; installation_id: string };
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
  return {
    to: recipient.push_token,
    title: 'Опубліковано графік',
    body: `Графік на ${recipient.schedule_date} доступний у застосунку.`,
    sound: 'default',
    channelId: 'svitlo-schedules',
    data: { notificationId: recipient.history_id },
  };
}

// Pilot policy: claim before external I/O; ambiguous delivery is not retried blindly.
// Receipt reconciliation and recoverable failures are extended in issue 14.
export async function dispatchPush(database: NotificationDatabase, request: typeof fetch = fetch, accessToken?: string) {
  const claim = crypto.randomUUID();
  await database.batch([{
    sql: `UPDATE push_outbox SET state = 'claimed', claim_key = ? WHERE history_id IN
      (SELECT history_id FROM push_outbox WHERE state = 'queued' ORDER BY history_id LIMIT 100) AND state = 'queued'`,
    params: [claim],
  }]);
  const recipients = await database.all<Recipient>({
    sql: `SELECT o.history_id, d.push_token, e.schedule_date, h.installation_id FROM push_outbox o
      JOIN notification_history h ON h.id = o.history_id JOIN notification_events e ON e.id = h.event_id
      JOIN installation_delivery d ON d.installation_id = h.installation_id
      WHERE o.claim_key = ? AND d.permission = 'granted' AND d.push_token IS NOT NULL ORDER BY o.history_id`,
    params: [claim],
  });
  await database.batch([{ sql: 'UPDATE push_outbox SET state = \'failed\', error = \'PermissionRevoked\' WHERE claim_key = ? AND history_id NOT IN (SELECT h.id FROM notification_history h JOIN installation_delivery d ON d.installation_id = h.installation_id WHERE d.permission = \'granted\' AND d.push_token IS NOT NULL)', params: [claim] }]);
  if (!recipients.length)
    return { attempted: 0, accepted: 0 };
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
        WHERE claim_key = ? AND state = 'claimed'`,
      params: [payload, claim],
    }, {
      sql: `UPDATE installation_delivery SET push_token = NULL WHERE EXISTS
        (SELECT 1 FROM json_each(?) WHERE json_extract(value, '$.installationId') = installation_delivery.installation_id
        AND json_extract(value, '$.token') = installation_delivery.push_token AND json_extract(value, '$.error') = 'DeviceNotRegistered')`,
      params: [payload],
    }]);
    return { attempted: recipients.length, accepted: data.filter(ticket => ticket.status === 'ok').length };
  }
  catch {
    await database.batch([{ sql: 'UPDATE push_outbox SET state = \'failed\', error = \'DeliveryUnknown\' WHERE claim_key = ? AND state = \'claimed\'', params: [claim] }]);
    return { attempted: recipients.length, accepted: 0 };
  }
}
