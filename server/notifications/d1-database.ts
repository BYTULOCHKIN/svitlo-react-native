import type { NotificationDatabase, SqlQuery } from './database';

type Result<T> = { results: T[]; meta?: { rows_read: number; rows_written: number; duration: number } };
type Statement = {
  bind: (...params: (string | number)[]) => Statement;
  first: <T>() => Promise<T | null>;
  all: <T>() => Promise<Result<T>>;
};
export type D1Binding = { prepare: (sql: string) => Statement; batch: (statements: Statement[]) => Promise<Result<unknown>[]> };

export function createD1Database(binding: D1Binding): NotificationDatabase & { metrics: { queries: number; rowsRead: number; rowsWritten: number; dbMs: number } } {
  const prepare = ({ sql, params }: SqlQuery) => binding.prepare(sql).bind(...params);
  const metrics = { queries: 0, rowsRead: 0, rowsWritten: 0, dbMs: 0 };
  function measure<T>(result: Result<T>) {
    metrics.queries++;
    metrics.rowsRead += result.meta?.rows_read ?? 0;
    metrics.rowsWritten += result.meta?.rows_written ?? 0;
    metrics.dbMs += result.meta?.duration ?? 0;
    return result;
  }
  return {
    metrics,
    async first<T>(query: SqlQuery) { return measure(await prepare(query).all<T>()).results[0]; },
    async all<T>(query: SqlQuery) { return measure(await prepare(query).all<T>()).results; },
    async batch(queries) {
      if (queries.length)
        (await binding.batch(queries.map(prepare))).forEach(measure);
    },
  };
}
