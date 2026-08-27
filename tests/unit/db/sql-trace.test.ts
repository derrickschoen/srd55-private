import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from '../../helpers/test-filesystem';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  getSqlite3,
  MemoryDatabaseStorage,
  openTestDatabase,
} from '../../helpers/open-db';

interface TraceRecord {
  testFile: string;
  sql: string;
  count: number;
  totalDurationUs: number;
  maxDurationUs: number;
  totalFullScanSteps: number;
  maxFullScanSteps: number;
  totalVmSteps: number;
  maxVmSteps: number;
}

const temporaryDirectories: string[] = [];
const originalTraceDirectory = process.env.DND_SQL_TRACE;

afterEach(() => {
  if (originalTraceDirectory === undefined) {
    delete process.env.DND_SQL_TRACE;
  } else {
    process.env.DND_SQL_TRACE = originalTraceDirectory;
  }
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'dnd-sql-trace-'));
  temporaryDirectories.push(directory);
  return directory;
}

function readRecords(directory: string): TraceRecord[] {
  const filenames = readdirSync(directory);
  expect(filenames).toHaveLength(1);
  const filename = filenames[0];
  if (filename === undefined) throw new Error('SQL trace file is missing.');
  return readFileSync(join(directory, filename), 'utf8')
    .trim()
    .split('\n')
    .filter((line) => line !== '')
    .map((line) => JSON.parse(line) as TraceRecord);
}

describe('test database SQL tracing', () => {
  it('does not create trace state when DND_SQL_TRACE is absent', async () => {
    delete process.env.DND_SQL_TRACE;

    const db = await openTestDatabase({ applySchema: false });
    expect(Object.hasOwn(db, 'close')).toBe(false);
    db.exec('SELECT 1');
    db.close();
  });

  it('aggregates raw parameterized SQL, timings, and scan counters', async () => {
    const directory = temporaryDirectory();
    process.env.DND_SQL_TRACE = directory;
    const db = await openTestDatabase({ applySchema: false });
    db.exec('CREATE TABLE traced (id INTEGER PRIMARY KEY, label TEXT NOT NULL)');
    db.exec({
      sql: 'INSERT INTO traced (id, label) VALUES (?, ?)',
      bind: [1, 'alpha-private-value'],
    });
    db.exec({
      sql: 'INSERT INTO traced (id, label) VALUES (?, ?)',
      bind: [2, 'beta-private-value'],
    });
    db.selectObjects(
      `SELECT id, label
       FROM traced
       WHERE label <> ?`,
      ['missing-private-value'],
    );
    db.close();

    const secondDb = await openTestDatabase({ applySchema: false });
    secondDb.exec(
      'CREATE TABLE traced (id INTEGER PRIMARY KEY, label TEXT NOT NULL)',
    );
    secondDb.exec({
      sql: 'INSERT INTO traced (id, label) VALUES (?, ?)',
      bind: [3, 'gamma-private-value'],
    });
    secondDb.close();

    const records = readRecords(directory);
    expect(JSON.stringify(records)).not.toContain('private-value');
    const inserts = records.find(
      (record) => record.sql === 'INSERT INTO traced (id, label) VALUES (?, ?)',
    );
    expect(inserts).toMatchObject({
      count: 3,
      testFile: 'tests/unit/db/sql-trace.test.ts',
    });
    expect(inserts?.totalDurationUs).toBeGreaterThanOrEqual(0);
    expect(inserts?.maxDurationUs).toBeGreaterThanOrEqual(0);
    expect(inserts?.totalVmSteps).toBeGreaterThan(0);

    const select = records.find(
      (record) => record.sql === 'SELECT id, label FROM traced WHERE label <> ?',
    );
    expect(select?.count).toBe(1);
    expect(select?.totalFullScanSteps).toBeGreaterThan(0);
    expect(select?.maxFullScanSteps).toBeGreaterThan(0);
  });

  it('traces databases opened through MemoryDatabaseStorage', async () => {
    const directory = temporaryDirectory();
    process.env.DND_SQL_TRACE = directory;
    const sqlite3 = await getSqlite3();
    const storage = new MemoryDatabaseStorage(sqlite3);
    const db = storage.open();
    db.exec('CREATE TABLE storage_trace (value INTEGER NOT NULL)');
    db.exec('INSERT INTO storage_trace (value) VALUES (7)');
    db.close();

    expect(readRecords(directory)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          count: 1,
          sql: 'INSERT INTO storage_trace (value) VALUES (7)',
        }),
      ]),
    );
  });
});
