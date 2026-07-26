import { index, integer, sqliteTable, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { currentTimestamp, datetime, sqlText, varchar } from './columns';

/**
 * Laravel-only infrastructure tables.
 *
 * These carry no domain meaning in the browser product — nothing reads or
 * writes them. They remain declared so a database image can round-trip a
 * complete project database through export/import without data loss, which is
 * the reason the hand-written artifact carried them too.
 *
 * They are deliberately NOT pruned as part of the Drizzle cutover: pruning is
 * a separable change, and combining the two would make any cutover failure
 * ambiguous between "generation is wrong" and "removal broke something".
 */
export const SCHEMA_NOTE_INFRASTRUCTURE =
  'Final browser schema corresponding to the final state of every Laravel ' +
  'migration. Laravel-only infrastructure tables remain represented so ' +
  'database import/export can round-trip a complete project database without ' +
  'data loss.';

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    name: varchar()('name').notNull(),
    email: varchar()('email').notNull(),
    email_verified_at: datetime()('email_verified_at'),
    password: varchar()('password').notNull(),
    remember_token: varchar()('remember_token'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)],
);

export const password_reset_tokens = sqliteTable('password_reset_tokens', {
  email: varchar()('email').primaryKey().notNull(),
  token: varchar()('token').notNull(),
  created_at: datetime()('created_at'),
});

export const sessions = sqliteTable(
  'sessions',
  {
    id: varchar()('id').primaryKey().notNull(),
    user_id: integer('user_id'),
    ip_address: varchar()('ip_address'),
    user_agent: sqlText()('user_agent'),
    payload: sqlText()('payload').notNull(),
    last_activity: integer('last_activity').notNull(),
  },
  (table) => [
    index('sessions_user_id_index').on(table.user_id),
    index('sessions_last_activity_index').on(table.last_activity),
  ],
);

export const cache = sqliteTable(
  'cache',
  {
    key: varchar()('key').primaryKey().notNull(),
    value: sqlText()('value').notNull(),
    expiration: integer('expiration').notNull(),
  },
  (table) => [index('cache_expiration_index').on(table.expiration)],
);

export const cache_locks = sqliteTable(
  'cache_locks',
  {
    key: varchar()('key').primaryKey().notNull(),
    owner: varchar()('owner').notNull(),
    expiration: integer('expiration').notNull(),
  },
  (table) => [index('cache_locks_expiration_index').on(table.expiration)],
);

export const jobs = sqliteTable(
  'jobs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    queue: varchar()('queue').notNull(),
    payload: sqlText()('payload').notNull(),
    attempts: integer('attempts').notNull(),
    reserved_at: integer('reserved_at'),
    available_at: integer('available_at').notNull(),
    created_at: integer('created_at').notNull(),
  },
  (table) => [index('jobs_queue_index').on(table.queue)],
);

export const job_batches = sqliteTable('job_batches', {
  id: varchar()('id').primaryKey().notNull(),
  name: varchar()('name').notNull(),
  total_jobs: integer('total_jobs').notNull(),
  pending_jobs: integer('pending_jobs').notNull(),
  failed_jobs: integer('failed_jobs').notNull(),
  failed_job_ids: sqlText()('failed_job_ids').notNull(),
  options: sqlText()('options'),
  cancelled_at: integer('cancelled_at'),
  created_at: integer('created_at').notNull(),
  finished_at: integer('finished_at'),
});

export const failed_jobs = sqliteTable(
  'failed_jobs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    uuid: varchar()('uuid').notNull(),
    connection: varchar()('connection').notNull(),
    queue: varchar()('queue').notNull(),
    payload: sqlText()('payload').notNull(),
    exception: sqlText()('exception').notNull(),
    failed_at: datetime()('failed_at').notNull().default(currentTimestamp),
  },
  (table) => [
    uniqueIndex('failed_jobs_uuid_unique').on(table.uuid),
    index('failed_jobs_connection_queue_failed_at_index').on(
      table.connection,
      table.queue,
      table.failed_at,
    ),
  ],
);
