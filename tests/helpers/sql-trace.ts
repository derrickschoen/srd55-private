import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import type {
  Database,
  Sqlite3Static,
} from '@sqlite.org/sqlite-wasm';
import { getCurrentSuite, getCurrentTest } from '@vitest/runner';

interface StatementAggregate {
  count: number;
  totalDurationUs: number;
  maxDurationUs: number;
  totalFullScanSteps: number;
  maxFullScanSteps: number;
  totalVmSteps: number;
  maxVmSteps: number;
}

interface TraceFileState {
  readonly outputPath: string;
  readonly testFile: string;
  readonly statements: Map<string, StatementAggregate>;
}

interface SqlTraceRecord extends StatementAggregate {
  testFile: string;
  sql: string;
}

type SqliteTraceCallback = Parameters<
  Sqlite3Static['capi']['sqlite3_trace_v2']
>[2];

type SqliteTraceV2 = (
  db: number,
  mask: number,
  callback: SqliteTraceCallback,
  context: number,
) => number;

const traceFiles = new Map<string, TraceFileState>();

function currentTestFile(): string {
  const filepath =
    getCurrentTest()?.file.filepath ?? getCurrentSuite().file.filepath;
  const projectRelative = relative(process.cwd(), filepath);
  return projectRelative.startsWith('..') ? filepath : projectRelative;
}

function traceFileName(testFile: string): string {
  return `${testFile.replaceAll('\\', '/').replaceAll('/', '__')}.jsonl`;
}

function normalizeSql(sql: string): string {
  return sql.trim().replace(/\s+/gu, ' ');
}

function traceState(outputDirectory: string): TraceFileState {
  const testFile = currentTestFile();
  const outputPath = resolve(outputDirectory, traceFileName(testFile));
  const existing = traceFiles.get(outputPath);
  if (existing !== undefined) return existing;

  const created: TraceFileState = {
    outputPath,
    testFile,
    statements: new Map(),
  };
  traceFiles.set(outputPath, created);
  return created;
}

function flushTrace(state: TraceFileState): void {
  mkdirSync(dirname(state.outputPath), { recursive: true });
  const records: SqlTraceRecord[] = [...state.statements.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([sql, aggregate]) => ({
      testFile: state.testFile,
      sql,
      ...aggregate,
    }));
  const jsonl = records.map((record) => JSON.stringify(record)).join('\n');
  writeFileSync(state.outputPath, jsonl === '' ? '' : `${jsonl}\n`, 'utf8');
}

/**
 * Installs test-only SQLite profiling when DND_SQL_TRACE names an output
 * directory. The absent-variable path returns before inspecting or changing
 * the connection, so normal test execution retains the raw sqlite-wasm DB.
 */
export function attachSqlTrace(
  db: Database,
  sqlite3: Sqlite3Static,
): void {
  const outputDirectory = process.env.DND_SQL_TRACE;
  if (outputDirectory === undefined || outputDirectory === '') return;

  const state = traceState(outputDirectory);
  const pointer = db.pointer;
  if (pointer === undefined) {
    throw new Error('Cannot trace a closed SQLite test connection.');
  }

  // The package declaration omits sqlite3_trace_v2's required pCtx argument;
  // the shipped runtime and SQLite C API both require all four arguments.
  const traceV2 = sqlite3.capi.sqlite3_trace_v2 as unknown as SqliteTraceV2;
  const result = traceV2(
    pointer,
    sqlite3.capi.SQLITE_TRACE_PROFILE,
    (reason, _context, statementPointer, durationPointer) => {
      if (reason !== sqlite3.capi.SQLITE_TRACE_PROFILE) return 0;

      const sql = normalizeSql(sqlite3.capi.sqlite3_sql(statementPointer));
      const durationNs = sqlite3.wasm.peek64(durationPointer);
      const durationUs = Number((durationNs + 500n) / 1_000n);
      const fullScanSteps = sqlite3.capi.sqlite3_stmt_status(
        statementPointer,
        sqlite3.capi.SQLITE_STMTSTATUS_FULLSCAN_STEP,
        1,
      );
      const vmSteps = sqlite3.capi.sqlite3_stmt_status(
        statementPointer,
        sqlite3.capi.SQLITE_STMTSTATUS_VM_STEP,
        1,
      );
      const aggregate = state.statements.get(sql) ?? {
        count: 0,
        totalDurationUs: 0,
        maxDurationUs: 0,
        totalFullScanSteps: 0,
        maxFullScanSteps: 0,
        totalVmSteps: 0,
        maxVmSteps: 0,
      };
      aggregate.count += 1;
      aggregate.totalDurationUs += durationUs;
      aggregate.maxDurationUs = Math.max(aggregate.maxDurationUs, durationUs);
      aggregate.totalFullScanSteps += fullScanSteps;
      aggregate.maxFullScanSteps = Math.max(
        aggregate.maxFullScanSteps,
        fullScanSteps,
      );
      aggregate.totalVmSteps += vmSteps;
      aggregate.maxVmSteps = Math.max(aggregate.maxVmSteps, vmSteps);
      state.statements.set(sql, aggregate);
      return 0;
    },
    0,
  );
  if (result !== sqlite3.capi.SQLITE_OK) {
    throw new Error(
      `Could not install SQLite trace callback (result ${result}).`,
    );
  }

  const close = db.close.bind(db);
  db.close = () => {
    try {
      close();
    } finally {
      flushTrace(state);
    }
  };
}
