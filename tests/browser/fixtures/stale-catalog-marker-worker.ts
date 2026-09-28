import sqlite3InitModule, {
  type Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';

/**
 * TEST-ONLY module worker for tests/browser/database-recovery.spec.ts, loaded
 * through the Vite dev server from a page that never opens the database.
 *
 * It opens the application's own stored image through the same OPFS SAH pool
 * the database worker uses and rewrites ONE row: the catalog data marker, set
 * back to the checksum an image created before PC-EXPORT-TRUTH carries. That
 * is exactly the stale database the owner accepted a reset for (D923 Q11). The
 * application's own paths cannot produce it — `system.replaceDatabase` runs
 * the catalog data migrations on a candidate and refuses this very image — so
 * the row is written beneath them, and nothing else in the image changes.
 *
 * The pool is paused before answering, so the application worker of the next
 * page can install it.
 */
interface PlantRequest {
  readonly poolName: string;
  readonly filename: string;
  readonly migrationId: string;
  readonly checksum: string;
}

export type PlantResult =
  | { readonly ok: true; readonly changed: number; readonly stored: unknown }
  | { readonly ok: false; readonly message: string };

/**
 * The page this spec just left ran the application worker, which held every
 * handle of the pool; the browser releases them asynchronously after that
 * worker is torn down. Installing is retried for a bounded time, and a pool
 * that never frees fails the spec with the browser's own error.
 */
async function installPool(sqlite3: Sqlite3Static, poolName: string) {
  const options = {
    name: poolName,
    directory: `/${poolName}`,
    initialCapacity: 6,
    forceReinitIfPreviouslyFailed: true,
  };
  const deadline = Date.now() + 15_000;
  for (;;) {
    try {
      return await sqlite3.installOpfsSAHPoolVfs(options);
    } catch (error: unknown) {
      if (Date.now() > deadline) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

async function plant(request: PlantRequest): Promise<PlantResult> {
  const sqlite3 = await sqlite3InitModule();
  const pool = await installPool(sqlite3, request.poolName);
  try {
    const files = pool.getFileNames();
    if (!files.includes(request.filename)) {
      return { ok: false, message: `No ${request.filename} in the pool (${files.join(', ')}).` };
    }
    const db = new pool.OpfsSAHPoolDb(request.filename);
    try {
      db.exec({
        sql: 'UPDATE catalog_data_migrations SET checksum = ? WHERE id = ?',
        bind: [request.checksum, request.migrationId],
      });
      return {
        ok: true,
        changed: db.changes(),
        stored: db.selectValue(
          'SELECT checksum FROM catalog_data_migrations WHERE id = ?',
          [request.migrationId],
        ),
      };
    } finally {
      db.close();
    }
  } finally {
    pool.pauseVfs();
  }
}

self.addEventListener('message', (event: MessageEvent<PlantRequest>) => {
  void plant(event.data).then(
    (result) => self.postMessage(result),
    (error: unknown) => self.postMessage({
      ok: false,
      message: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    } satisfies PlantResult),
  );
});
