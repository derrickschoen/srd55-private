/**
 * The OPFS SyncAccessHandle pool this application stores its database in is
 * EXCLUSIVE PER ORIGIN. `installOpfsSAHPoolVfs` acquires a
 * `FileSystemSyncAccessHandle` for every file in its pool directory, and the
 * File System Access specification allows exactly one live access handle per
 * file. A second tab of the same origin therefore cannot install the pool while
 * the first tab holds it — the second tab's `createSyncAccessHandle` rejects,
 * sqlite's installer releases whatever it had already taken and re-throws the
 * browser's exception unchanged (`acquireAccessHandles` in
 * `@sqlite.org/sqlite-wasm`).
 *
 * That raw exception is a `DOMException` with a message written by the browser
 * engine, which is why it must be CLASSIFIED here rather than shown. Untagged,
 * it is indistinguishable from "the wasm module failed to load" or "OPFS is
 * missing" at every layer above, and the user sees a generic failure for a
 * condition with an obvious remedy: close the other tab.
 *
 * Two things this module deliberately does NOT do:
 *
 * 1. It does not treat a lock conflict as recoverable by retrying. The owning
 *    tab keeps its handles for as long as it lives; a retry loop would spin.
 *    The remedy is a user action, so the classification exists to let the UI
 *    ASK for that action.
 * 2. It does not fall back to a second, empty database. A tab that silently
 *    opened a different image would show an empty character list and accept
 *    writes into storage the owning tab never reads — which is worse than
 *    refusing, and is the failure mode D284's read-only second tab exists to
 *    avoid.
 */

/**
 * `Error`, not `TypeError`: neither the input nor the build is wrong. Another
 * tab of the same origin legitimately holds an exclusive resource, and this
 * tab correctly declined to fight it for it.
 *
 * `reason` carries text from OUTSIDE the program — the browser engine's own
 * `DOMException` message, which differs per engine and which we did not write.
 * That is the admitted exception in the tagged-error taxonomy; every other
 * parameter here is a fact this program knows.
 */
export class DatabaseStoragePoolLockedError extends Error {
  override readonly name = 'DatabaseStoragePoolLockedError' as const;

  constructor(
    readonly pool_name: string,
    readonly reason: string,
  ) {
    super(
      `Storage pool '${pool_name}' is already open in another tab of this ` +
        'application, so this tab cannot open the database. The browser ' +
        `reported: ${reason}`,
    );
  }
}

/**
 * The `DOMException.name` values a browser uses to refuse a second access
 * handle on a file that already has one.
 *
 * `NoModificationAllowedError` is what the File System Access specification
 * mandates for "no lock available" and is what Chromium and Firefox throw.
 * `InvalidStateError` is included because WebKit has historically refused an
 * already-held handle with that name instead. Neither name is thrown by the
 * other failure modes on this boot path — a missing OPFS API rejects with a
 * plain `Error('Missing required OPFS APIs.')`, and a wasm load failure never
 * reaches the pool installer at all.
 */
const LOCK_CONFLICT_ERROR_NAMES: ReadonlySet<string> = new Set([
  'NoModificationAllowedError',
  'InvalidStateError',
]);

function readString(value: object, key: string): string {
  const property: unknown = Reflect.get(value, key);
  return typeof property === 'string' ? property : '';
}

/**
 * The engine's description of a pool-lock conflict, or `undefined` when the
 * failure is something else.
 *
 * Read STRUCTURALLY rather than through `instanceof Error`. Whether
 * `DOMException` inherits from `Error` is not something this classifier should
 * depend on: WebIDL says it does, older engines shipped one that did not, and
 * an exception relayed across a worker boundary arrives as neither. A `name`
 * on an object is the only part of the shape all three agree on.
 */
export function storagePoolLockConflictReason(
  error: unknown,
): string | undefined {
  if (error === null || typeof error !== 'object') {
    return undefined;
  }
  const name = readString(error, 'name');
  if (!LOCK_CONFLICT_ERROR_NAMES.has(name)) {
    return undefined;
  }
  const message = readString(error, 'message').trim();
  return message === '' ? name : message;
}

/**
 * Maps a pool-installation failure to the tagged error when it is a lock
 * conflict, and passes every other failure through untouched so it keeps its
 * own diagnosis.
 */
export function classifyStoragePoolInstallFailure(
  error: unknown,
  pool_name: string,
): unknown {
  const reason = storagePoolLockConflictReason(error);
  return reason === undefined
    ? error
    : new DatabaseStoragePoolLockedError(pool_name, reason);
}
