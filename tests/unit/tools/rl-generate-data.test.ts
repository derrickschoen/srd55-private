import { spawnSync } from 'node:child_process';
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
    expect(JSON.parse(readFileSync(
      join(targetDirectory, 'batch-3943001-3943003.manifest.json'),
      'utf8',
    ))).toEqual(resumedManifest);
  });

  it('generates an unfrozen seed deterministically and runs it through the simulated arena', { timeout: 30_000 }, async () => {
    const targetDirectory = mkdtempSync(join(tmpdir(), 'd410-generate-unfrozen-'));
    const [manifest] = await generateData(parseGenerateDataArgs([
      '--seed-range', '6000001-6000001',
      '--reps', '1',
      '--target-dir', targetDirectory,
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
