import { resolve } from 'node:path';
import fixture from '../../src/features/svitlo/fixtures/poe-2026-10-10.json';
import { parsePoeHtml } from '../../src/features/svitlo/poe-parser';
import { openLocalDatabase } from './local-database';
import { createNotificationRepository } from './repository';

// Local CLI only. No public HTTP route can inject a publication.
async function publishFixture() {
  const { database, close } = openLocalDatabase(resolve(process.env.SVITLO_LOCAL_DB ?? '.expo/notifications/local.sqlite'));
  try {
    const day = parsePoeHtml(fixture.html, fixture.date);
    const publication = await createNotificationRepository(database).publish(day);
    console.log(`Local fixture published: ${publication.id} (${day.queues.length} queues)`);
  }
  finally {
    close();
  }
}
void publishFixture().catch(() => {
  console.error('Cannot publish local fixture. Start the local server first.');
  process.exitCode = 1;
});
