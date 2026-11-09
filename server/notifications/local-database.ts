import type { NotificationDatabase, SqlQuery } from './database';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function openLocalDatabase(path: string) {
  const sqlite = new DatabaseSync(path);
  sqlite.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  sqlite.exec('CREATE TABLE IF NOT EXISTS _local_migrations (name TEXT PRIMARY KEY)');
  const migrations = resolve('server/notifications/migrations');
  for (const file of readdirSync(migrations).filter(file => file.endsWith('.sql')).sort()) {
    if (sqlite.prepare('SELECT name FROM _local_migrations WHERE name = ?').get(file))
      continue;
    sqlite.exec('BEGIN IMMEDIATE');
    try {
      sqlite.exec(readFileSync(resolve(migrations, file), 'utf8'));
      sqlite.prepare('INSERT INTO _local_migrations (name) VALUES (?)').run(file);
      sqlite.exec('COMMIT');
    }
    catch (error) {
      sqlite.exec('ROLLBACK');
      sqlite.close();
      throw error;
    }
  }
  const database: NotificationDatabase = {
    async first<T>({ sql, params }: SqlQuery) {
      return sqlite.prepare(sql).get(...params) as T | undefined;
    },
    async all<T>({ sql, params }: SqlQuery) {
      return sqlite.prepare(sql).all(...params) as T[];
    },
    async batch(queries) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        for (const { sql, params } of queries)
          sqlite.prepare(sql).run(...params);
        sqlite.exec('COMMIT');
      }
      catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return { database, close: () => sqlite.close() };
}
