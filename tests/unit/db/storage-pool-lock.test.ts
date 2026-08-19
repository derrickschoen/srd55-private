import { describe, expect, it } from 'vitest';
import {
  classifyStoragePoolInstallFailure,
  DatabaseStoragePoolLockedError,
  storagePoolLockConflictReason,
} from '../../../src/db/storage-pool-lock';
import { classifyDatabaseBootFailure } from '../../../src/db/database-worker-boot';
import { bootFailureRejection } from '../../../src/worker/boot';
import { RpcError, rpcFailure } from '../../../src/rpc/protocol';

const POOL = 'dnd-multiclass-spells-sahpool';

/**
 * What a browser actually throws out of `createSyncAccessHandle` when another
 * tab already holds a handle on the same file, which sqlite's pool installer
 * re-throws unchanged. A real `DOMException`, because the thing under test is
 * precisely that a `DOMException` is NOT an `Error` and must be read
 * structurally.
 */
function lockConflict(
  name: string,
  message: string,
): DOMException {
  return new DOMException(message, name);
}

describe('storage pool lock detection', () => {
  it('reads the shape, not the prototype', () => {
    // An exception relayed across a boundary keeps its fields and loses its
    // class. Detection that depended on `instanceof Error` would miss it on
    // any engine whose DOMException does not inherit from Error.
    expect(
      storagePoolLockConflictReason({
        name: 'NoModificationAllowedError',
        message: 'already open',
      }),
    ).toBe('already open');
  });

  it('recognises the lock-conflict exception names browsers use', () => {
    expect(
      storagePoolLockConflictReason(
        lockConflict(
          'NoModificationAllowedError',
          'Access Handles cannot be created if there is another open Access Handle.',
        ),
      ),
    ).toBe(
      'Access Handles cannot be created if there is another open Access Handle.',
    );
    expect(
      storagePoolLockConflictReason(
        lockConflict('InvalidStateError', 'The file is already locked.'),
      ),
    ).toBe('The file is already locked.');
  });

  it('falls back to the exception name when the engine reports no message', () => {
    expect(
      storagePoolLockConflictReason(
        lockConflict('NoModificationAllowedError', '   '),
      ),
    ).toBe('NoModificationAllowedError');
  });

  it('does not claim unrelated boot failures', () => {
    expect(
      storagePoolLockConflictReason(new Error('Missing required OPFS APIs.')),
    ).toBeUndefined();
    expect(
      storagePoolLockConflictReason(lockConflict('NotFoundError', 'gone')),
    ).toBeUndefined();
    expect(storagePoolLockConflictReason('NoModificationAllowedError'))
      .toBeUndefined();
    expect(storagePoolLockConflictReason(null)).toBeUndefined();
    expect(storagePoolLockConflictReason(undefined)).toBeUndefined();
    expect(storagePoolLockConflictReason({ name: 42 })).toBeUndefined();
  });

  it('tags a lock conflict and passes every other failure through', () => {
    const conflict = classifyStoragePoolInstallFailure(
      lockConflict('NoModificationAllowedError', 'already open'),
      POOL,
    );
    expect(conflict).toBeInstanceOf(DatabaseStoragePoolLockedError);
    expect(conflict).toMatchObject({
      pool_name: POOL,
      reason: 'already open',
    });

    const unrelated = new Error('Missing required OPFS APIs.');
    expect(classifyStoragePoolInstallFailure(unrelated, POOL)).toBe(unrelated);
  });
});

describe('storage pool lock errors', () => {
  it('formats the refusal from its facts', () => {
    const error = new DatabaseStoragePoolLockedError(POOL, 'already open');
    expect(error.name).toBe('DatabaseStoragePoolLockedError');
    expect(error.message).toBe(
      "Storage pool 'dnd-multiclass-spells-sahpool' is already open in " +
        'another tab of this application, so this tab cannot open the ' +
        'database. The browser reported: already open',
    );
  });
});

describe('blocked second tab boot state', () => {
  it('crosses the worker boundary as its own RPC code', () => {
    const rejection = bootFailureRejection(
      classifyStoragePoolInstallFailure(
        lockConflict('NoModificationAllowedError', 'already open'),
        POOL,
      ),
    );
    expect(rejection.code).toBe('storage_pool_locked');

    // Everything else the worker can fail with keeps the generic code.
    expect(bootFailureRejection(new Error('seed failed')).code).toBe(
      'handler_error',
    );
    expect(bootFailureRejection('boom').code).toBe('handler_error');
  });

  it('reaches the shell as a distinct boot state that names the remedy', () => {
    // The whole seam: worker classification, serialisation through the RPC
    // envelope (which strips the class), reconstruction on the main thread.
    const payload = rpcFailure(
      1,
      bootFailureRejection(
        classifyStoragePoolInstallFailure(
          lockConflict('NoModificationAllowedError', 'already open'),
          POOL,
        ),
      ).toPayload(),
    );
    if (payload.ok) {
      throw new Error('Expected a failure envelope.');
    }
    const received = new RpcError(payload.error.code, payload.error.message);
    const failure = classifyDatabaseBootFailure(received);

    expect(failure.kind).toBe('another_tab_holds_database');
    if (failure.kind !== 'another_tab_holds_database') {
      return;
    }
    expect(failure.headline).toBe('Another tab has this database open');
    expect(failure.explanation).toContain(
      'only one tab at a time can open the local database',
    );
    expect(failure.explanation).toContain('Your characters are safe');
    expect(failure.remedy).toContain('Try again');
    expect(failure.detail).toContain(POOL);
  });

  it('classifies the tagged error itself, not only its RPC code', () => {
    expect(
      classifyDatabaseBootFailure(
        new DatabaseStoragePoolLockedError(POOL, 'already open'),
      ).kind,
    ).toBe('another_tab_holds_database');
  });

  it('leaves every other boot failure on the generic state', () => {
    for (
      const error of [
        new RpcError('handler_error', 'schema seed failed'),
        new RpcError('schema_mismatch', 'stored schema differs'),
        new RpcError('transport_error', 'worker died'),
        new Error('Missing required OPFS APIs.'),
        'boom',
      ]
    ) {
      const failure = classifyDatabaseBootFailure(error);
      expect(failure.kind).toBe('boot_failed');
      expect(failure.detail).not.toBe('');
    }
  });
});
