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
const FAKE_CODEX = 'tests/fixtures/fake-codex-dm.mjs';

const DEFAULT_EXECUTION = {
  dmModel: 'gpt-5.6-terra',
  dmEffort: 'medium' as const,
  requestTimeoutMs: 2_000,
  tableTimeoutMs: 10_000,
};

function processExists(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ESRCH') return false;
    throw error;
  }
}

async function expectProcessGone(pid: number): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (!processExists(pid)) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 10));
  }
  expect(processExists(pid)).toBe(false);
}

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
      ...DEFAULT_EXECUTION,
    });

    expect(summary.tables.map((table) => table.partySource)).toEqual([
      'reference',
      'external-pack',
    ]);
    expect(summary.schemaVersion).toBe(2);
    expect(new Set(summary.tables.map((table) => table.seed)).size).toBe(2);
    expect(summary.tables.map((table) => table.coordinatorPartySize)).toEqual([3, 3]);
    expect(summary.tables.map((table) => table.status)).toEqual(['completed', 'completed']);
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

  it('defaults executable real mode to Terra medium with bounded request and table timeouts', () => {
    const config = decodeVttSoakArguments([
      '--tables', '2',
      '--seed', '1',
      '--rounds', '4',
      '--out', '/tmp/vtt-soak-real-config',
      '--pack', 'tests/fixtures/external-party-pack-valid.json',
      '--bridge', 'real',
    ]);
    expect(config).toMatchObject({
      bridge: { mode: 'real' },
      dmModel: 'gpt-5.6-terra',
      dmEffort: 'medium',
      requestTimeoutMs: 120_000,
      tableTimeoutMs: 900_000,
    });
    expect(decodeVttSoakArguments([
      '--tables=1',
      '--seed=2',
      '--rounds=3',
      '--out=/tmp/vtt-soak-real-overrides',
      '--pack=tests/fixtures/external-party-pack-valid.json',
      '--bridge=real',
      '--dm-model=stand-in-model',
      '--dm-effort=high',
      '--request-timeout-ms=321',
      '--table-timeout-ms=654',
    ])).toMatchObject({
      dmModel: 'stand-in-model',
      dmEffort: 'high',
      requestTimeoutMs: 321,
      tableTimeoutMs: 654,
    });
  });

  it('spawns and connects the real bridge to a scripted Codex binary, records telemetry, and tears it down', async () => {
    const outDirectory = await mkdtemp(join(tmpdir(), 'vtt-soak-real-wiring-'));
    temporaryDirectories.push(outDirectory);
    const lifecycle: { readonly kind: string; readonly pid: number }[] = [];
    const summary = await runVttSoak({
      tables: 1,
      seed: 317_006,
      rounds: 1,
      outDirectory,
      packFile: 'tests/fixtures/external-party-pack-valid.json',
      bridge: { mode: 'real' },
      ...DEFAULT_EXECUTION,
    }, {
      codexBinary: FAKE_CODEX,
      onBridgeLifecycle: (event) => lifecycle.push(event),
    });

    expect(summary.tables[0]).toMatchObject({
      status: 'completed',
      exitCode: 0,
      abortReason: null,
    });
    expect(summary.tables[0]?.bridgeTelemetry).toHaveLength(1);
    expect(summary.tables[0]?.bridgeTelemetry[0]).toMatchObject({
      modelId: 'gpt-5.6-terra',
      reasoningEffort: 'medium',
      tokenCounts: { input: 101, cachedInput: 17, output: 23, reasoning: 7 },
      correctionAttempts: 0,
    });
    expect(summary.tables[0]?.bridgeTelemetry[0]?.latencyMs).toBeGreaterThanOrEqual(0);
    expect(lifecycle.map((event) => event.kind)).toEqual(['spawned', 'terminated']);
    const bridgePid = lifecycle[0]?.pid;
    expect(bridgePid).toBeTypeOf('number');
    await expectProcessGone(bridgePid!);

    const bundle = decodeReplayBundle(
      await readFile(join(outDirectory, 'table-0000.replay.json'), 'utf8'),
    );
    const agentTelemetry = bundle.transcripts
      .filter((record) => record.controller.kind === 'agent')
      .map((record) => record.fleet);
    expect(agentTelemetry.length).toBeGreaterThan(0);
    expect(agentTelemetry.every((entry) => entry.tokenCounts?.input === 101)).toBe(true);
    expect(replayBundle(bundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE)).toEqual(
      summary.tables[0]?.proof,
    );
  }, 30_000);

  it('records one correction after the scripted bridge returns a strict-invalid plan first', async () => {
    const outDirectory = await mkdtemp(join(tmpdir(), 'vtt-soak-real-correction-'));
    temporaryDirectories.push(outDirectory);
    const lifecycle: { readonly kind: string; readonly pid: number }[] = [];
    const summary = await runVttSoak({
      tables: 1,
      seed: 317_602,
      rounds: 1,
      outDirectory,
      packFile: 'tests/fixtures/external-party-pack-valid.json',
      bridge: { mode: 'real' },
      ...DEFAULT_EXECUTION,
    }, {
      codexBinary: FAKE_CODEX,
      bridgeEnvironment: {
        FAKE_CODEX_MODE: 'malformed_once',
        FAKE_CODEX_STATE_FILE: join(outDirectory, 'fake-codex-state'),
      },
      onBridgeLifecycle: (event) => lifecycle.push(event),
    });

    expect(summary.tables[0]).toMatchObject({ status: 'completed', exitCode: 0, abortReason: null });
    expect(summary.tables[0]?.bridgeTelemetry.map((entry) => entry.correctionAttempts)).toEqual([0, 1]);
    const bundle = decodeReplayBundle(
      await readFile(join(outDirectory, 'table-0000.replay.json'), 'utf8'),
    );
    expect(bundle.transcripts
      .filter((record) => record.controller.kind === 'agent')
      .every((record) => record.fleet.correctionAttempts === 1)).toBe(true);
    expect(lifecycle.map((event) => event.kind)).toEqual(['spawned', 'terminated']);
    await expectProcessGone(lifecycle[0]!.pid);
  }, 30_000);

  it('exports an aborted replay and kills the bridge process group after a request timeout', async () => {
    const outDirectory = await mkdtemp(join(tmpdir(), 'vtt-soak-real-timeout-'));
    temporaryDirectories.push(outDirectory);
    const fakePidFile = join(outDirectory, 'fake-codex.pid');
    const lifecycle: { readonly kind: string; readonly pid: number }[] = [];
    const summary = await runVttSoak({
      tables: 1,
      seed: 317_607,
      rounds: 1,
      outDirectory,
      packFile: 'tests/fixtures/external-party-pack-valid.json',
      bridge: { mode: 'real' },
      dmModel: 'gpt-5.6-terra',
      dmEffort: 'medium',
      requestTimeoutMs: 75,
      tableTimeoutMs: 2_000,
    }, {
      codexBinary: FAKE_CODEX,
      bridgeEnvironment: {
        FAKE_CODEX_MODE: 'hang',
        FAKE_CODEX_PID_FILE: fakePidFile,
      },
      onBridgeLifecycle: (event) => lifecycle.push(event),
    });

    expect(summary.tables[0]).toMatchObject({ status: 'aborted', exitCode: 1 });
    expect(summary.tables[0]?.abortReason).toMatch(/exceeded 75ms|HTTP 422/);
    expect(await readdir(outDirectory)).toContain('table-0000.replay.json');
    const bundle = decodeReplayBundle(
      await readFile(join(outDirectory, 'table-0000.replay.json'), 'utf8'),
    );
    expect(bundle.build.buildId).toContain('-aborted');
    expect(replayBundle(bundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE)).toEqual(
      summary.tables[0]?.proof,
    );
    expect(lifecycle.map((event) => event.kind)).toEqual(['spawned', 'terminated']);
    await expectProcessGone(Number(await readFile(fakePidFile, 'utf8')));
    await expectProcessGone(lifecycle[0]!.pid);
  });

  it('aborts the whole table at its deadline even when the request deadline is longer', async () => {
    const outDirectory = await mkdtemp(join(tmpdir(), 'vtt-soak-table-timeout-'));
    temporaryDirectories.push(outDirectory);
    const lifecycle: { readonly kind: string; readonly pid: number }[] = [];
    const summary = await runVttSoak({
      tables: 1,
      seed: 317_608,
      rounds: 1,
      outDirectory,
      packFile: 'tests/fixtures/external-party-pack-valid.json',
      bridge: { mode: 'real' },
      dmModel: 'gpt-5.6-terra',
      dmEffort: 'medium',
      requestTimeoutMs: 2_000,
      tableTimeoutMs: 75,
    }, {
      codexBinary: FAKE_CODEX,
      bridgeEnvironment: { FAKE_CODEX_MODE: 'hang' },
      onBridgeLifecycle: (event) => lifecycle.push(event),
    });

    expect(summary.tables[0]).toMatchObject({
      status: 'aborted',
      exitCode: 1,
      abortReason: 'Soak table exceeded 75ms.',
    });
    expect(await readdir(outDirectory)).toContain('table-0000.replay.json');
    expect(lifecycle.map((event) => event.kind)).toEqual(['spawned', 'terminated']);
    await expectProcessGone(lifecycle[0]!.pid);
  });
});
