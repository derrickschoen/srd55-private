/// <reference lib="webworker" />

import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import {
  createSahPoolStorage,
  type DatabaseLifecycle,
} from './database-lifecycle';
import {
  applicationBootVerificationBuildKey,
  createApplicationLifecycle,
} from './bootstrap';
import {
  planBootVerification,
  storedDatabaseImageDigest,
} from './boot-verification-stamp';
import { opfsBootVerificationStampStore } from './boot-verification-stamp-opfs';
import {
  isRpcRequest,
  rpcFailure,
  RpcError,
  type RpcResponse,
} from '../rpc/protocol';
import { rpcRegistry } from '../worker/registry';
import type { RuntimeEnvironment } from '../worker/handler';
import {
  bootDatabase,
  bootHandlerContext,
  degradedRejection,
  type DatabaseBoot,
} from '../worker/boot';
import {
  databaseBootProgress,
  type DatabaseBootStage,
} from './database-boot-progress';

const scope = self as DedicatedWorkerGlobalScope;
const filename = '/dnd-multiclass-spells.sqlite3';
/**
 * The D283 stamp lives BESIDE the image, in the OPFS root rather than inside
 * the SAH pool's directory: the pool owns every file it manages and maps names
 * through its own table, so a stranger file in there is not ours to create.
 */
const stampFilename = 'dnd-multiclass-spells.boot-verification-stamp';

async function initialize(): Promise<DatabaseBoot> {
  const report = (stage: DatabaseBootStage): void => {
    scope.postMessage(databaseBootProgress(stage, performance.now()));
  };
  report('loading_engine');
  const sqlite3 = await sqlite3InitModule();
  report('opening_storage');
  const pool = await sqlite3.installOpfsSAHPoolVfs({
    initialCapacity: 6,
    name: 'dnd-multiclass-spells-sahpool',
    directory: '/dnd-multiclass-spells-sahpool',
  });
  const storage = createSahPoolStorage(pool, filename);
  // D283. Decided BEFORE the open, because the open is what it changes. Both
  // halves are cheap: the build key is frozen constants, and the image digest
  // is one native SHA-256 over bytes the pool reads synchronously — tens of
  // milliseconds against the ~4s a reproduced stamp skips.
  report('checking_saved_verification');
  const plan = await planBootVerification({
    store: opfsBootVerificationStampStore(navigator.storage, stampFilename),
    build: applicationBootVerificationBuildKey(),
    imageDigest: () => storedDatabaseImageDigest(storage),
  });
  const lifecycle = createApplicationLifecycle(sqlite3, storage, report);
  // A failed open resolves to a degraded boot rather than rejecting, so the
  // recovery methods stay reachable. Failures BEFORE this point (wasm init,
  // VFS install) still reject: there is no database to recover from.
  report(
    plan.mode === 'stamped' ? 'reusing_verification' : 'checking_structure',
  );
  const boot = bootDatabase(lifecycle, plan.mode);
  if (boot.status === 'ready') {
    // Off the critical path on purpose: readiness must not wait on a cache
    // write, and a stamp that never lands only costs the next boot its speed.
    void plan.commit();
  }
  return boot;
}

const ready = initialize();
let requestQueue: Promise<void> = Promise.resolve();

async function respond(value: unknown): Promise<void> {
  let response: RpcResponse;
  if (!isRpcRequest(value)) {
    const id =
      value !== null &&
      typeof value === 'object' &&
      Number.isSafeInteger((value as { id?: unknown }).id)
        ? Number((value as { id: number }).id)
        : 0;
    response = rpcFailure(
      id,
      new RpcError(
        'invalid_request',
        'RPC request must contain a numeric id, method, and params.',
      ).toPayload(),
    );
  } else {
    try {
      const boot = await ready;
      const rejection = degradedRejection(boot, value.method);
      response =
        rejection === null
          ? await rpcRegistry.dispatch(
              value,
              bootHandlerContext(
                boot,
                import.meta.env.MODE as RuntimeEnvironment,
              ),
            )
          : rpcFailure(value.id, rejection.toPayload());
    } catch (error) {
      response = rpcFailure(
        value.id,
        new RpcError(
          'handler_error',
          error instanceof Error ? error.message : String(error),
        ).toPayload(),
      );
    }
  }
  scope.postMessage(response);
}

scope.addEventListener('message', (event: MessageEvent<unknown>) => {
  const task = requestQueue.then(() => respond(event.data));
  requestQueue = task.catch(() => undefined);
});
