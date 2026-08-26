import { describe, expect, it } from 'vitest';
import {
  RehearsalTimings,
  rehearsalTimingBlock,
} from '../../../tools/rehearsal/timing';

describe('rehearsal wall-time reporting', () => {
  it('aggregates repeated steps without losing phase totals or an active final segment', () => {
    let now = 0;
    const timings = new RehearsalTimings(() => now);
    timings.track('fight', 'pulse');
    now = 25;
    timings.track('fight', 'render');
    now = 40;
    timings.track('fight', 'pulse');
    now = 75;

    expect(timings.rows()).toEqual([
      { phase: 'fight', step: 'pulse', calls: 2, totalMs: 60, maximumMs: 35 },
      { phase: 'fight', step: 'render', calls: 1, totalMs: 15, maximumMs: 15 },
    ]);
    expect(rehearsalTimingBlock(timings.rows())).toContain('| fight | 75.0ms |');
    expect(rehearsalTimingBlock(timings.rows())).toContain('| fight | pulse | 2 | 60.0ms | 30.0ms | 35.0ms |');
  });
});
