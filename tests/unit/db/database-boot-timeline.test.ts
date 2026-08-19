import { describe, expect, it } from 'vitest';
import {
  databaseBootProgress,
  isDatabaseBootProgress,
} from '../../../src/db/database-boot-progress';
import {
  databaseBootMeasureName,
  DatabaseBootTimeline,
  DATABASE_BOOT_MEASURE_PREFIX,
} from '../../../src/db/database-boot-timeline';

describe('database boot timeline', () => {
  it('splits the boot into the phases between stage reports', () => {
    const timeline = new DatabaseBootTimeline(100);
    const phases = [
      timeline.observe(databaseBootProgress('loading_engine', 20)),
      timeline.observe(databaseBootProgress('opening_storage', 520)),
      timeline.observe(databaseBootProgress('checking_saved_verification', 700)),
      timeline.observe(databaseBootProgress('checking_structure', 800)),
      timeline.observe(databaseBootProgress('checking_database_integrity', 850)),
      timeline.observe(databaseBootProgress('checking_schema_compatibility', 875)),
      timeline.observe(databaseBootProgress('applying_data_updates', 900)),
      timeline.observe(databaseBootProgress('checking_bundled_rules', 950)),
      timeline.observe(databaseBootProgress('verifying_catalog_integrity', 2_400)),
      ...timeline.finish(3_000),
    ];

    expect(
      phases.map((phase) => [phase.name, phase.endMs - phase.startMs]),
    ).toEqual([
      ['worker_startup', 20],
      ['loading_engine', 500],
      ['opening_storage', 180],
      ['checking_saved_verification', 100],
      ['checking_structure', 50],
      ['checking_database_integrity', 25],
      ['checking_schema_compatibility', 25],
      ['applying_data_updates', 50],
      ['checking_bundled_rules', 1_450],
      ['verifying_catalog_integrity', 500],
      ['total', 2_900],
    ]);
  });

  it('leaves no gap or overlap between consecutive phases', () => {
    const timeline = new DatabaseBootTimeline(7);
    const first = timeline.observe(databaseBootProgress('loading_engine', 3));
    const second = timeline.observe(databaseBootProgress('opening_storage', 11));
    const closing = timeline.finish(40);

    expect([first.endMs, second.startMs]).toEqual([10, 10]);
    expect(closing.map((phase) => [phase.name, phase.startMs, phase.endMs]))
      .toEqual([
        ['opening_storage', 18, 40],
        ['total', 7, 40],
      ]);
    expect(second.endMs).toBe(18);
  });

  it('clamps a boundary that would run backwards rather than losing the phase', () => {
    const timeline = new DatabaseBootTimeline(50);
    timeline.observe(databaseBootProgress('loading_engine', 30));
    const backwards = timeline.observe(databaseBootProgress('opening_storage', 5));

    expect(backwards).toEqual({
      name: 'loading_engine',
      startMs: 80,
      endMs: 80,
    });
    expect([...timeline.finish(10)]).toEqual([
      { name: 'opening_storage', startMs: 80, endMs: 80 },
      { name: 'total', startMs: 50, endMs: 80 },
    ]);
  });

  it('names each measure under one greppable prefix', () => {
    const timeline = new DatabaseBootTimeline(0);

    expect(
      databaseBootMeasureName(
        timeline.observe(databaseBootProgress('loading_engine', 1)),
      ),
    ).toBe(`${DATABASE_BOOT_MEASURE_PREFIX}worker_startup`);
  });
});

describe('database boot progress timing', () => {
  it('carries the worker-clock instant of the stage it reports', () => {
    expect(databaseBootProgress('opening_storage', 12.5)).toEqual({
      kind: 'database_boot_progress',
      stage: 'opening_storage',
      elapsedMs: 12.5,
    });
  });

  it('rejects a progress message whose timing is missing or unusable', () => {
    expect(isDatabaseBootProgress(databaseBootProgress('loading_engine', 0)))
      .toBe(true);
    for (
      const elapsedMs of [undefined, '12', Number.NaN, Number.POSITIVE_INFINITY, -1]
    ) {
      expect(
        isDatabaseBootProgress({
          kind: 'database_boot_progress',
          stage: 'loading_engine',
          elapsedMs,
        }),
      ).toBe(false);
    }
  });
});
