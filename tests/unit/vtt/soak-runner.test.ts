import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { decodeReplayBundle, replayBundle } from '../../../src/vtt/replay';
import { TEST_APPROVED_FIRST_SKIRMISH_FIXTURE } from '../../../src/vtt/test-approved-first-skirmish';
import {
  decodeVttSoakArguments,
  partySourceForTable,
  runVttSoak,
} from '../../../tools/vtt-soak';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  for (const directory of temporaryDirectories.splice(0)) {
    await rm(directory, { recursive: true, force: true });
  }
});

describe('headless VTT soak runner', () => {
  it('fifty_fifty_skewed alternates reference and external-pack tables from index zero', () => {
    expect(Array.from({ length: 6 }, (_value, index) =>
      partySourceForTable(index, 'generic-pack.json') === 'reference'
        ? 'reference'
        : 'external-pack',
    )).toEqual([
      'reference',
      'external-pack',
      'reference',
      'external-pack',
      'reference',
      'external-pack',
    ]);
  });

  it('writes two seeded fake-bridge bundles plus a replayable gap summary', async () => {
    const outDirectory = await mkdtemp(join(tmpdir(), 'vtt-soak-smoke-'));
    temporaryDirectories.push(outDirectory);
    const summary = await runVttSoak({
      tables: 2,
      seed: 424_242,
      rounds: 1,
      outDirectory,
      packFile: 'tests/fixtures/external-party-pack-valid.json',
      bridge: { mode: 'fake' },
    });

    expect(summary.tables.map((table) => table.partySource)).toEqual([
      'reference',
      'external-pack',
    ]);
    expect(new Set(summary.tables.map((table) => table.seed)).size).toBe(2);
    expect(summary.tables.map((table) => table.coordinatorPartySize)).toEqual([3, 3]);
    expect(summary.tables.every((table) => table.proof.rounds <= 1)).toBe(true);
    expect((await readdir(outDirectory)).sort()).toEqual([
      'gap-report-summary.json',
      'table-0000.replay.json',
      'table-0001.replay.json',
    ]);

    for (const table of summary.tables) {
      const bundle = decodeReplayBundle(
        await readFile(join(outDirectory, table.replayFile), 'utf8'),
      );
      expect(replayBundle(bundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE)).toEqual(table.proof);
    }
    const writtenSummary: unknown = JSON.parse(
      await readFile(join(outDirectory, 'gap-report-summary.json'), 'utf8'),
    );
    expect(writtenSummary).toEqual(summary);
  }, 30_000);

  it('accepts only local real-bridge configuration and never executes it in tests', async () => {
    const config = decodeVttSoakArguments([
      '--tables', '2',
      '--seed', '1',
      '--rounds', '4',
      '--out', '/tmp/vtt-soak-real-config',
      '--pack', 'tests/fixtures/external-party-pack-valid.json',
      '--bridge', 'real',
      '--bridge-endpoint', 'ws://127.0.0.1:4321',
    ]);
    expect(config.bridge).toEqual({ mode: 'real', endpoint: 'ws://127.0.0.1:4321' });
    await expect(runVttSoak(config)).rejects.toThrow('configuration-only');
    expect(() => decodeVttSoakArguments([
      '--tables=2',
      '--seed=1',
      '--rounds=4',
      '--out=/tmp/vtt-soak-real-config',
      '--pack=tests/fixtures/external-party-pack-valid.json',
      '--bridge=real',
      '--bridge-endpoint=wss://example.invalid/bridge',
    ])).toThrow('must be local');
  });
});
