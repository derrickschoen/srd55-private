import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { runArena, type ArenaConfig } from '../../../tools/ai-dm-arena';
import {
  generateData,
  parseGenerateDataArgs,
  type ArenaBatchRunner,
} from '../../../tools/rl/generate-data';
import { readRepoCommit } from '../../../tools/rl/repo-commit';
import { mkdtempSync, readFileSync, writeFileSync } from '../../helpers/test-filesystem';

/**
 * One batch (seeds 3943001-3943003, reps 2), typed by hand in the pre-LUNA6 schema (tools/rl/generate-data.ts at
 * 71940c8f: arena-rl-batch-v1 on gpt-5.6-luna low) or in the v2 schema. Only the format and the model differ between
 * the two, so a refusal is the route's and not a configuration mismatch.
 */
async function storedBatch(targetDirectory: string, format: string, model: string) {
  const kbHash = createHash('sha256').update(readFileSync(
    join(process.cwd(), 'tests/fixtures/ai-dm-kb/k6.txt'),
  )).digest('hex');
  const repoCommit = await readRepoCommit(process.cwd());
  const outputPath = (seed: number): string =>
    join(targetDirectory, 'batch-3943001-3943003', `seed-${String(seed)}.jsonl`);
  return {
    format,
    range: { start: 3_943_001, end: 3_943_003 },
    reps: 2,
    model,
    effort: 'low',
    adapterCliName: 'codex',
    adapterCliVersion: null,
    kbId: 'K6',
    kbHash,
    repoCommit,
    toolArgv: ['--seed-range', '3943001-3943003', '--reps', '2', '--target-dir', targetDirectory],
    flapPolicy: 'arena-retry-then-resume-seed',
    basis: 'standard',
    combatModel: 'initiative_segments_v1',
    initiativeProfile: 'derived_v1',
    seeds: [
      {
        seed: 3_943_001, outputPath: outputPath(3_943_001), status: 'complete',
        rows: 1, flapRetries: 0, serviceNullRows: 0, error: null,
      },
      {
        seed: 3_943_002, outputPath: outputPath(3_943_002), status: 'flapped',
        rows: 1, flapRetries: 2, serviceNullRows: 1, error: null,
      },
      {
        seed: 3_943_003, outputPath: outputPath(3_943_003), status: 'complete',
        rows: 1, flapRetries: 0, serviceNullRows: 0, error: null,
      },
    ],
    totals: {
      seeds: 3, completeSeeds: 2, flappedSeeds: 1, failedSeeds: 0,
      rows: 3, flapRetries: 2, serviceNullRows: 1,
    },
  };
}

/**
 * Runs the batch into a target directory whose manifest path already holds `storedBatch` (or the `bytes` of it given),
 * and records the outcome as { ok } or { error }, the seeds the arena was called for, and whether the stored bytes
 * survived.
 */
async function generateOverStoredBatch(stored: {
  readonly format: string;
  readonly model: string;
  readonly resume: boolean;
  readonly bytes?: (manifest: string) => string;
}) {
  const targetDirectory = mkdtempSync(join(tmpdir(), 'luna6-generate-over-'));
  const manifestPath = join(targetDirectory, 'batch-3943001-3943003.manifest.json');
  const manifest = `${JSON.stringify(await storedBatch(targetDirectory, stored.format, stored.model))}\n`;
  const bytes = stored.bytes === undefined ? manifest : stored.bytes(manifest);
  writeFileSync(manifestPath, bytes, 'utf8');
  const calls: number[] = [];
  const outcome = await generateData(parseGenerateDataArgs([
    '--seed-range', '3943001-3943003', '--reps', '2', '--target-dir', targetDirectory,
    ...(stored.resume ? ['--resume'] : []),
  ]), {
    arenaRunner: async (config) => {
      calls.push(config.seed);
      return [{ outcome: 'authorized', serviceNull: false, flapRetries: 0 }];
    },
    heartbeat: () => undefined,
  }).then(
    (manifests) => ({
      ok: manifests.map((written) => ({ format: written.format, model: written.model, effort: written.effort })),
    }),
    (error: unknown) => ({
      // A JSON parse error's wording is V8's, not ours; its name is the contract.
      error: error instanceof SyntaxError
        ? error.name
        : error instanceof Error
          ? `${error.name}: ${error.message.replace(manifestPath, '<manifest>')}`
          : String(error),
    }),
  );
  return { outcome, calls, storedBytesKept: readFileSync(manifestPath, 'utf8') === bytes };
}

describe('RL arena batch generator', () => {
  it('writes per-batch manifests and resumes only incomplete or flapped seeds', async () => {
    const targetDirectory = mkdtempSync(join(tmpdir(), 'd410-generate-'));
    const args = [
      '--seed-range', '3943001-3943003',
      '--reps', '2',
      '--target-dir', targetDirectory,
    ] as const;
    const firstCalls: ArenaConfig[] = [];
    const heartbeats: string[] = [];
    const firstRunner: ArenaBatchRunner = async (config) => {
      firstCalls.push(config);
      return [{
        outcome: config.seed === 3_943_002 ? 'service_null' : 'authorized',
        serviceNull: config.seed === 3_943_002,
        flapRetries: config.seed === 3_943_002 ? 2 : 0,
      }];
    };

    const [firstManifest] = await generateData(parseGenerateDataArgs(args), {
      arenaRunner: firstRunner,
      heartbeat: (line) => { heartbeats.push(line); },
    });

    expect(firstCalls.map((config) => config.seed)).toEqual([3_943_001, 3_943_002, 3_943_003]);
    // LUNA6 (plan r5 §4.3, B2): the corpus is an effort study, so D887 (b) keeps it at low on gpt-6-luna; D890 (a)
    // and the owner's 2026-09-24 18:58 answer lift its 180 s round wall and leave only the 30 min per-call guard.
    expect(firstCalls.map(({ model, effort, timeoutMs, experimentPolicy }) =>
      ({ model, effort, timeoutMs, roundWallMs: experimentPolicy.roundWallMs }))).toEqual([
      { model: 'gpt-6-luna', effort: 'low', timeoutMs: 1800000, roundWallMs: null },
      { model: 'gpt-6-luna', effort: 'low', timeoutMs: 1800000, roundWallMs: null },
      { model: 'gpt-6-luna', effort: 'low', timeoutMs: 1800000, roundWallMs: null },
    ]);
    expect(firstCalls.every((config) =>
      config.reps === 2 && config.captureRlData && config.instructionSource === 'kb' &&
      config.kbPath.endsWith('/tests/fixtures/ai-dm-kb/k6.txt'),
    )).toBe(true);
    expect(firstCalls.every((config) => config.generateMissingRooms)).toBe(true);
    expect(firstCalls.every((config) => config.combatModel === 'initiative_segments_v1')).toBe(true);
    expect(firstCalls.every((config) => config.initiativeProfile === 'derived_v1')).toBe(true);
    expect(heartbeats).toContain(`start batches=1 reps=2 target=${targetDirectory}`);
    expect(heartbeats).toContain('batch start=3943001 end=3943003');
    expect(heartbeats).toContain('seed=3943002 status=start');
    expect(heartbeats).toContain('seed=3943002 status=flapped rows=1');
    expect(heartbeats).toContain('batch start=3943001 end=3943003 status=complete seeds=3');
    expect(firstManifest?.seeds.map(({ seed, status, flapRetries }) =>
      ({ seed, status, flapRetries }))).toEqual([
      { seed: 3_943_001, status: 'complete', flapRetries: 0 },
      { seed: 3_943_002, status: 'flapped', flapRetries: 2 },
      { seed: 3_943_003, status: 'complete', flapRetries: 0 },
    ]);
    expect(firstManifest).toMatchObject({
      format: 'arena-rl-batch-v2',
      model: 'gpt-6-luna',
      effort: 'low',
      adapterCliName: 'codex',
      adapterCliVersion: null,
      kbId: 'K6',
      basis: 'standard',
      combatModel: 'initiative_segments_v1',
      initiativeProfile: 'derived_v1',
      toolArgv: args,
      totals: {
        seeds: 3,
        completeSeeds: 2,
        flappedSeeds: 1,
        failedSeeds: 0,
        rows: 3,
        flapRetries: 2,
        serviceNullRows: 1,
      },
    });
    expect(firstManifest?.kbHash).toBe(createHash('sha256').update(readFileSync(
      join(process.cwd(), 'tests/fixtures/ai-dm-kb/k6.txt'),
    )).digest('hex'));
    expect(firstManifest?.repoCommit).toMatch(/^[0-9a-f]{40}$/u);

    const resumeCalls: number[] = [];
    const resumeRunner: ArenaBatchRunner = async (config) => {
      resumeCalls.push(config.seed);
      return [{ outcome: 'authorized', serviceNull: false, flapRetries: 1 }];
    };
    const [resumedManifest] = await generateData(parseGenerateDataArgs([...args, '--resume']), {
      arenaRunner: resumeRunner,
      heartbeat: () => undefined,
    });

    expect(resumeCalls).toEqual([3_943_002]);
    expect(resumedManifest?.seeds.every((entry) => entry.status === 'complete')).toBe(true);
    expect(resumedManifest?.totals).toEqual({
      seeds: 3, completeSeeds: 3, flappedSeeds: 0, failedSeeds: 0,
      rows: 3, flapRetries: 1, serviceNullRows: 0,
    });
    expect(JSON.parse(readFileSync(
      join(targetDirectory, 'batch-3943001-3943003.manifest.json'),
      'utf8',
    ))).toEqual(resumedManifest);
    // The generator's own --timeout-ms is removed: a gpt-6-luna low batch keeps only the hang guard (plan r5 §1.2).
    expect(() => parseGenerateDataArgs([...args, '--timeout-ms', '120000'])).toThrow(
      'LUNA6: gpt-6-luna low runs uncensored (owner 2026-09-24); --timeout-ms 120000 is refused (hang guard 1800000)',
    );
  });

  it('refuses to resume a v1 gpt-5.6-luna batch manifest into a v2 gpt-6-luna batch', async () => {
    // A batch written before LUNA6 (storedBatch in the v1 schema), beside the same batch in the v2 schema as the control.
    expect([
      await generateOverStoredBatch({ format: 'arena-rl-batch-v1', model: 'gpt-5.6-luna', resume: true }),
      await generateOverStoredBatch({ format: 'arena-rl-batch-v2', model: 'gpt-6-luna', resume: true }),
    ]).toEqual([
      {
        outcome: {
          error: 'HistoricalLunaBatchResumeError: LUNA6: <manifest> is an arena-rl-batch-v1 gpt-5.6-luna low batch; ' +
            'this generator writes arena-rl-batch-v2 gpt-6-luna low batches (D887 b) and never resumes a v1 batch ' +
            'into v2, which would mix the two routes in one batch. Start a new --target-dir.',
        },
        calls: [],
        storedBytesKept: true,
      },
      {
        outcome: { ok: [{ format: 'arena-rl-batch-v2', model: 'gpt-6-luna', effort: 'low' }] },
        calls: [3_943_002],
        storedBytesKept: false,
      },
    ]);
  });

  it('refuses a fresh run over a v1 gpt-5.6-luna batch manifest and keeps its bytes', async () => {
    // LUNA6 (B2 review r1 P3): a run without --resume used to replace whatever manifest its batch path held, so a fresh
    // v2 run over a v1 batch erased the v1 batch's provenance. A v1 manifest is now refused and left byte for byte;
    // so is a manifest that does not parse (a write cut short). A v2 manifest is still replaced (the control).
    expect([
      await generateOverStoredBatch({ format: 'arena-rl-batch-v1', model: 'gpt-5.6-luna', resume: false }),
      await generateOverStoredBatch({ format: 'arena-rl-batch-v2', model: 'gpt-6-luna', resume: false }),
      await generateOverStoredBatch({
        format: 'arena-rl-batch-v2', model: 'gpt-6-luna', resume: false, bytes: (manifest) => manifest.slice(0, 100),
      }),
    ]).toEqual([
      {
        outcome: {
          error: 'HistoricalLunaBatchOverwriteError: LUNA6: <manifest> is an arena-rl-batch-v1 gpt-5.6-luna low ' +
            'batch; a fresh arena-rl-batch-v2 gpt-6-luna low run never overwrites it, which would lose its ' +
            'provenance. Start a new --target-dir.',
        },
        calls: [],
        storedBytesKept: true,
      },
      {
        outcome: { ok: [{ format: 'arena-rl-batch-v2', model: 'gpt-6-luna', effort: 'low' }] },
        calls: [3_943_001, 3_943_002, 3_943_003],
        storedBytesKept: false,
      },
      { outcome: { error: 'SyntaxError' }, calls: [], storedBytesKept: true },
    ]);
  });

  it('refuses the removed --timeout-ms in every value and spelling and never ignores it', () => {
    // LUNA6 (plan r5 §1.2): the generator's own --timeout-ms is removed and refused with the lift message, whatever its
    // value, the hang guard's own 1800000 included. The parser matches whole option tokens and normalises nothing but
    // a leading '--', so an '=' spelling or a shortened name is an unknown option, never an ignored one. The first
    // case is the control: the same batch without a timeout parses.
    const batch = ['--seed-range', '3943001-3943003', '--reps', '2', '--target-dir', join(tmpdir(), 'luna6-parse')];
    const parse = (timeout: readonly string[]) => {
      try {
        return { ok: parseGenerateDataArgs([...batch, ...timeout]).toolArgv.slice(batch.length).join(' ') };
      } catch (error) {
        return { error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
      }
    };
    const lift = 'TypeError: LUNA6: gpt-6-luna low runs uncensored (owner 2026-09-24); ';

    expect([
      parse([]),
      parse(['--timeout-ms', '120000']),
      parse(['--timeout-ms', '1800000']),
      parse(['--timeout-ms=120000']),
      parse(['--timeout-ms']),
      parse(['--timeout', '120000']),
    ]).toEqual([
      { ok: '' },
      { error: `${lift}--timeout-ms 120000 is refused (hang guard 1800000)` },
      { error: `${lift}--timeout-ms 1800000 is refused (hang guard 1800000)` },
      { error: 'TypeError: Unknown generate-data option --timeout-ms=120000.' },
      { error: `${lift}--timeout-ms <missing> is refused (hang guard 1800000)` },
      { error: 'TypeError: Unknown generate-data option --timeout.' },
    ]);
  });

  it('records combat model propagation and hard-errors on a resume mismatch', async () => {
    const targetDirectory = mkdtempSync(join(tmpdir(), 'd416-combat-model-manifest-'));
    const common = [
      '--seed-range', '7000001-7000001',
      '--reps', '1',
      '--target-dir', targetDirectory,
    ] as const;
    const calls: ArenaConfig[] = [];
    const runner: ArenaBatchRunner = async (config) => {
      calls.push(config);
      return [{ outcome: 'authorized', serviceNull: false, flapRetries: 0 }];
    };

    const block = parseGenerateDataArgs([
      ...common, '--combat-model', 'monster_block_v1', '--initiative-profile', 'legacy',
    ]);
    expect(block.combatModel).toBe('monster_block_v1');
    expect(block.initiativeProfile).toBe('legacy');
    expect(parseGenerateDataArgs([...common, '--basis', 'brutal']).basis).toBe('brutal');
    expect(() => parseGenerateDataArgs([...common, '--basis', 'nightmare']))
      .toThrow('--basis must be standard, hard, or brutal.');

    const [manifest] = await generateData(parseGenerateDataArgs([
      ...common, '--combat-model', 'initiative_segments_v1',
      '--initiative-profile', 'derived_v1',
    ]), { arenaRunner: runner, heartbeat: () => undefined });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.combatModel).toBe('initiative_segments_v1');
    expect(calls[0]?.initiativeProfile).toBe('derived_v1');
    expect(manifest?.combatModel).toBe('initiative_segments_v1');
    expect(manifest?.initiativeProfile).toBe('derived_v1');
    await expect(generateData(parseGenerateDataArgs([
      ...common, '--combat-model', 'monster_block_v1', '--resume',
    ]), { arenaRunner: runner, heartbeat: () => undefined })).rejects.toThrow(
      'does not match this batch configuration',
    );
    expect(() => parseGenerateDataArgs([
      ...common, '--combat-model', 'unknown-model',
    ])).toThrow('--combat-model must be monster_block_v1 or initiative_segments_v1');
  });

  it('records a simulated per-seed generation failure and continues the batch', async () => {
    const targetDirectory = mkdtempSync(join(tmpdir(), 'd410-generation-failure-'));
    const calls: number[] = [];
    const heartbeats: string[] = [];
    const runner: ArenaBatchRunner = async (config) => {
      calls.push(config.seed);
      if (config.seed === 6_001_021) throw new Error('simulated room generation failure');
      return [{ outcome: 'authorized', serviceNull: false, flapRetries: 0 }];
    };

    const [manifest] = await generateData(parseGenerateDataArgs([
      '--seed-range', '6001020-6001022',
      '--reps', '1',
      '--target-dir', targetDirectory,
      '--basis', 'hard',
    ]), {
      arenaRunner: runner,
      heartbeat: (line) => { heartbeats.push(line); },
    });

    expect(calls).toEqual([6_001_020, 6_001_021, 6_001_022]);
    expect(manifest?.seeds).toEqual([
      {
        seed: 6_001_020,
        outputPath: join(targetDirectory, 'batch-6001020-6001022', 'seed-6001020.jsonl'),
        status: 'complete',
        rows: 1,
        flapRetries: 0,
        serviceNullRows: 0,
        error: null,
      },
      {
        seed: 6_001_021,
        outputPath: join(targetDirectory, 'batch-6001020-6001022', 'seed-6001021.jsonl'),
        status: 'failed',
        rows: 0,
        flapRetries: 0,
        serviceNullRows: 0,
        error: 'simulated room generation failure',
      },
      {
        seed: 6_001_022,
        outputPath: join(targetDirectory, 'batch-6001020-6001022', 'seed-6001022.jsonl'),
        status: 'complete',
        rows: 1,
        flapRetries: 0,
        serviceNullRows: 0,
        error: null,
      },
    ]);
    expect(manifest?.totals).toEqual({
      seeds: 3,
      completeSeeds: 2,
      flappedSeeds: 0,
      failedSeeds: 1,
      rows: 2,
      flapRetries: 0,
      serviceNullRows: 0,
    });
    expect(heartbeats).toContain(
      'seed=6001021 status=failed error="simulated room generation failure"',
    );
    expect(JSON.parse(readFileSync(
      join(targetDirectory, 'batch-6001020-6001022.manifest.json'),
      'utf8',
    ))).toEqual(manifest);
  });

  it('finishes every seed before failing a batch with no successful seeds', async () => {
    const targetDirectory = mkdtempSync(join(tmpdir(), 'd410-all-generation-failures-'));
    const calls: number[] = [];
    const generation = generateData(parseGenerateDataArgs([
      '--seed-range', '6001030-6001031',
      '--reps', '1',
      '--target-dir', targetDirectory,
      '--basis', 'hard',
    ]), {
      arenaRunner: async (config) => {
        calls.push(config.seed);
        throw new Error(`simulated failure ${String(config.seed)}`);
      },
      heartbeat: () => undefined,
    });

    await expect(generation).rejects.toThrow('Every seed in the generation batch failed.');
    expect(calls).toEqual([6_001_030, 6_001_031]);
    const saved = JSON.parse(readFileSync(
      join(targetDirectory, 'batch-6001030-6001031.manifest.json'),
      'utf8',
    )) as Readonly<Record<string, unknown>>;
    expect(saved['seeds']).toEqual([
      {
        seed: 6_001_030,
        outputPath: join(targetDirectory, 'batch-6001030-6001031', 'seed-6001030.jsonl'),
        status: 'failed',
        rows: 0,
        flapRetries: 0,
        serviceNullRows: 0,
        error: 'simulated failure 6001030',
      },
      {
        seed: 6_001_031,
        outputPath: join(targetDirectory, 'batch-6001030-6001031', 'seed-6001031.jsonl'),
        status: 'failed',
        rows: 0,
        flapRetries: 0,
        serviceNullRows: 0,
        error: 'simulated failure 6001031',
      },
    ]);
    expect(saved['totals']).toEqual({
      seeds: 2,
      completeSeeds: 0,
      flappedSeeds: 0,
      failedSeeds: 2,
      rows: 0,
      flapRetries: 0,
      serviceNullRows: 0,
    });
  });

  it('generates an unfrozen seed deterministically and runs it through the simulated arena', { timeout: 60_000 }, async () => {
    const targetDirectory = mkdtempSync(join(tmpdir(), 'd410-generate-unfrozen-'));
    const [manifest] = await generateData(parseGenerateDataArgs([
      '--seed-range', '6000001-6000001',
      '--reps', '1',
      '--target-dir', targetDirectory,
      '--combat-model', 'initiative_segments_v1',
      '--initiative-profile', 'derived_v1',
    ]), {
      arenaRunner: async (config) => runArena({ ...config, dryRun: true }),
      heartbeat: () => undefined,
    });

    expect(manifest?.seeds).toEqual([{
      seed: 6_000_001,
      outputPath: join(targetDirectory, 'batch-6000001-6000001', 'seed-6000001.jsonl'),
      status: 'complete',
      rows: 1,
      flapRetries: 0,
      serviceNullRows: 0,
      error: null,
    }]);
    const row = JSON.parse(readFileSync(
      join(targetDirectory, 'batch-6000001-6000001', 'seed-6000001.jsonl'),
      'utf8',
    )) as Readonly<Record<string, unknown>>;
    expect(row['seed']).toBe(6_000_001);
    expect(row['outcome']).toBe('authorized');
    // LUNA6 (plan r5 §2.3): a lifted row records the gpt-6-luna low route and no round-wall budget.
    expect({ model: row['model'], effort: row['effort'], roundWallBudgetMs: row['roundWallBudgetMs'] })
      .toEqual({ model: 'gpt-6-luna', effort: 'low', roundWallBudgetMs: null });
    expect(row['combatModel']).toBe('initiative_segments_v1');
    expect(row['initiativeOrder']).toEqual(expect.any(Array));
    expect(manifest?.initiativeProfile).toBe('derived_v1');
    expect(row).toHaveProperty('rawTurnContext');
    expect(row).toHaveProperty('turnContextGranularity', 'full');
    expect(row).toHaveProperty('repoCommit', manifest?.repoCommit);
    expect(row).toHaveProperty('sessionId', null);
    expect(row).toHaveProperty('escalationSessionId', null);
  });

  it('runs on bad CLI arguments and exits nonzero with usage text', { timeout: 15_000 }, () => {
    const environment = { ...process.env };
    delete environment.FORCE_COLOR;
    delete environment.NO_COLOR;
    delete environment.VITEST;
    const result = spawnSync(process.execPath, [
      'node_modules/vite-node/vite-node.mjs',
      'tools/rl/generate-data.ts',
      '--',
      '--not-a-generate-option',
    ], { cwd: process.cwd(), encoding: 'utf8', env: environment });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Usage: rl:generate-data');
    expect(result.stderr).toContain('Unknown generate-data option --not-a-generate-option.');
  });
});
