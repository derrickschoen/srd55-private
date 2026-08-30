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
import { mkdtempSync, readFileSync } from '../../helpers/test-filesystem';

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
    expect(firstCalls.every((config) =>
      config.model === 'gpt-5.6-luna' && config.effort === 'low' && config.reps === 2 &&
      config.captureRlData && config.kbPath?.endsWith('/tests/fixtures/ai-dm-kb/k6.txt') === true,
    )).toBe(true);
    expect(firstCalls.every((config) => config.generateMissingRooms)).toBe(true);
    expect(firstCalls.every((config) => config.combatModel === 'monster_block_v1')).toBe(true);
    expect(firstCalls.every((config) => config.initiativeProfile === 'legacy')).toBe(true);
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
      adapterCliName: 'codex',
      adapterCliVersion: null,
      kbId: 'K6',
      basis: 'standard',
      combatModel: 'monster_block_v1',
      initiativeProfile: 'legacy',
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

  it('generates an unfrozen seed deterministically and runs it through the simulated arena', { timeout: 30_000 }, async () => {
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
