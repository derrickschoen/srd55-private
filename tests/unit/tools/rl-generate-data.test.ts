import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import type { ArenaConfig } from '../../../tools/ai-dm-arena';
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
    });

    expect(firstCalls.map((config) => config.seed)).toEqual([3_943_001, 3_943_002, 3_943_003]);
    expect(firstCalls.every((config) =>
      config.model === 'gpt-5.6-luna' && config.effort === 'low' && config.reps === 2 &&
      config.captureRlData && config.kbPath?.endsWith('/tests/fixtures/ai-dm-kb/k6.txt') === true,
    )).toBe(true);
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
    });

    expect(resumeCalls).toEqual([3_943_002]);
    expect(resumedManifest?.seeds.every((entry) => entry.status === 'complete')).toBe(true);
    expect(JSON.parse(readFileSync(
      join(targetDirectory, 'batch-3943001-3943003.manifest.json'),
      'utf8',
    ))).toEqual(resumedManifest);
  });
});
