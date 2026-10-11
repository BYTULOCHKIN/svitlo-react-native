import type { NotificationDatabase, SqlQuery } from './database';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export function openLocalDatabase(path: string) {
  const sqlite = new DatabaseSync(path);
  sqlite.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  sqlite.exec(readFileSync(resolve('server/notifications/migrations/0001-history.sql'), 'utf8'));
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
