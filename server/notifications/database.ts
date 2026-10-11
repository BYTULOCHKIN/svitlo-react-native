export type SqlQuery = { sql: string; params: (string | number)[] };

// Both local SQLite and D1 can implement this small, asynchronous contract.
export type NotificationDatabase = {
  first: <T>(query: SqlQuery) => Promise<T | undefined>;
  all: <T>(query: SqlQuery) => Promise<T[]>;
  batch: (queries: SqlQuery[]) => Promise<void>;
};
