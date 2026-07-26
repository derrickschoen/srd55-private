import type { DatabaseLifecycle } from '../db/database-lifecycle';
import { RpcError } from '../rpc/protocol';
import type { HandlerContext, RuntimeEnvironment } from './handler';

/**
 * The worker's boot outcome.
 *
 * Historically `worker.ts` held `const ready = initialize()` and every dispatch
 * did `await ready`. That made a failed open TERMINAL: the promise rejected,
 * so every method — including `system.reset`, the only way out — failed with a
 * generic `handler_error`. An OPFS image whose schema this build cannot accept
 * was therefore unrecoverable from inside the app.
 *
 * Boot now resolves either way. On failure it resolves to `schema_mismatch`,
 * which keeps the lifecycle object (and therefore the raw storage handle)
 * reachable so the two recovery methods still work.
 *
 * Auto-resetting on mismatch is deliberately NOT done: a mismatch can equally
 * mean genuine corruption, and silently discarding a user's database to make
 * the app boot is worse than refusing to boot.
 *
 * `status` is the START-UP outcome and is deliberately immutable. It is NOT
 * the authorisation input on its own — see {@link isDegraded}.
 */
export type DatabaseBoot =
  | { readonly status: 'ready'; readonly lifecycle: DatabaseLifecycle }
  | {
      readonly status: 'schema_mismatch';
      readonly lifecycle: DatabaseLifecycle;
      readonly detail: string;
    };

/**
 * The only methods dispatchable while degraded.
 *
 * `system.exportDatabase` reads the raw stored bytes so the unopenable image
 * can be rescued first; `system.reset` then overwrites it with a fresh schema.
 * Neither touches `context.db`, which is what makes them safe here — every
 * other handler dereferences the closed `DatabaseContext` and would throw an
 * unhelpful "Database lifecycle is closed."
 */
export const DEGRADED_SAFE_METHODS: ReadonlySet<string> = new Set([
  'system.exportDatabase',
  'system.reset',
]);

export function bootDatabase(lifecycle: DatabaseLifecycle): DatabaseBoot {
  try {
    lifecycle.open();
    return { status: 'ready', lifecycle };
  } catch (error) {
    return {
      status: 'schema_mismatch',
      lifecycle,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Builds the handler context with a LAZY `db`. Eager construction
 * (`{ db: lifecycle.database, ... }`) throws while degraded, before the
 * dispatcher can produce a typed rejection.
 */
export function bootHandlerContext(
  boot: DatabaseBoot,
  environment: RuntimeEnvironment,
): HandlerContext {
  return {
    get db() {
      return boot.lifecycle.database;
    },
    lifecycle: boot.lifecycle,
    environment,
  };
}

/**
 * Whether the worker is degraded RIGHT NOW, as opposed to whether it booted
 * degraded.
 *
 * `boot.status` records the outcome of the single `open()` attempt made at
 * start-up and never changes — the worker holds one `DatabaseBoot` for its
 * whole life. Authorising dispatch from that value alone made the advertised
 * recovery path a lie: `system.reset` reopens the lifecycle and returns
 * `{ reset: true }`, but every ordinary method kept failing with
 * `schema_mismatch` until the page was reloaded.
 *
 * The live signal is the lifecycle. `DatabaseLifecycle.open()` performs the
 * FULL acceptance check — integrity, foreign keys, the table inventory, both
 * triggers, and the schema signature — and `isOpen` is true only after it has
 * succeeded, so an open lifecycle is by construction one this build accepts.
 * A boot that started `ready` stays authorised regardless, which preserves the
 * previous behaviour for the healthy path exactly.
 */
export function isDegraded(boot: DatabaseBoot): boolean {
  return boot.status !== 'ready' && !boot.lifecycle.isOpen;
}

/**
 * The typed rejection for a method that is not dispatchable while degraded,
 * or `null` when dispatch may proceed.
 *
 * The `status === 'ready'` early return is what narrows `boot` so `detail` is
 * reachable below; the live check is delegated to {@link isDegraded} so there
 * is exactly one definition of "degraded now".
 */
export function degradedRejection(
  boot: DatabaseBoot,
  method: string,
): RpcError | null {
  if (boot.status === 'ready') {
    return null;
  }
  if (!isDegraded(boot) || DEGRADED_SAFE_METHODS.has(method)) {
    return null;
  }
  return new RpcError(
    'schema_mismatch',
    `The stored database does not match this build's schema, so "${method}" ` +
      'is unavailable. Export the database to keep a copy, then reset it. ' +
      `Details: ${boot.detail}`,
  );
}
