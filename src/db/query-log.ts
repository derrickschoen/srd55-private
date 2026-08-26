/**
 * SQL query profiling, enabled only when the SQL_QUERY_LOG environment
 * variable names a directory (Node test runs; the check is inert in the
 * browser, where `process` does not exist). Every statement that passes
 * through query.ts is aggregated by its SQL text — count and total wall
 * time — and each process flushes its aggregate to
 * `${SQL_QUERY_LOG}/sql-log-<pid>.json` on exit. Merge the per-process
 * files offline; concurrent vitest workers never share a file.
 */

interface QueryStats {
  count: number;
  totalMs: number;
}

const logDirectory: string | undefined =
  typeof process === 'object' && process.env !== undefined
    ? process.env['SQL_QUERY_LOG']
    : undefined;

const statsBySql: Map<string, QueryStats> | undefined =
  logDirectory === undefined || logDirectory === '' ? undefined : new Map();

// Vitest terminates worker threads without running process exit handlers, so
// the aggregate is flushed eagerly on a throttle instead of at exit. Worker
// threads share a pid — the instance suffix keeps files distinct.
const instanceId = `${String(typeof process === 'object' ? process.pid : 0)}-${Math.random().toString(36).slice(2, 8)}`;

// process.getBuiltinModule loads Node built-ins without an import statement,
// so the bundler never sees node:fs/node:path (a dynamic import here forced
// code-splitting, which the iife worker build forbids). Browser: process is
// absent and profiling is inert.
const fsModule =
  statsBySql === undefined
    ? undefined
    : (process.getBuiltinModule('node:fs') as typeof import('node:fs'));
const pathModule =
  statsBySql === undefined
    ? undefined
    : (process.getBuiltinModule('node:path') as typeof import('node:path'));
// Negative infinity so the very first record flushes — sub-second runs still
// leave a file; the 2s throttle applies from then on.
let lastFlushAtMs = Number.NEGATIVE_INFINITY;

function flush(): void {
  if (statsBySql === undefined || logDirectory === undefined) return;
  if (fsModule === undefined || pathModule === undefined) return;
  try {
    fsModule.mkdirSync(logDirectory, { recursive: true });
    const rows = [...statsBySql.entries()]
      .map(([sql, stats]) => ({ sql, count: stats.count, totalMs: Number(stats.totalMs.toFixed(3)) }))
      .sort((a, b) => b.totalMs - a.totalMs);
    fsModule.writeFileSync(
      pathModule.join(logDirectory, `sql-log-${instanceId}.json`),
      JSON.stringify(rows),
    );
  } catch {
    // Profiling must never fail a run.
  }
}

export const sqlQueryLogEnabled: boolean = statsBySql !== undefined;

export function recordQuery(sql: string, startedAtMs: number): void {
  if (statsBySql === undefined) return;
  const elapsed = performance.now() - startedAtMs;
  const existing = statsBySql.get(sql);
  if (existing === undefined) {
    statsBySql.set(sql, { count: 1, totalMs: elapsed });
  } else {
    existing.count += 1;
    existing.totalMs += elapsed;
  }
  const now = performance.now();
  if (now - lastFlushAtMs > 2000) {
    lastFlushAtMs = now;
    flush();
  }
}
