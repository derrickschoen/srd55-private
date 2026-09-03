import { describe, expect, it } from 'vitest';
import { readFileSync } from '../../helpers/test-filesystem';
import { completedContextUsage, main } from '../../../tools/measure-context-rollover';

describe('measured context rollover evidence parser', () => {
  it('reads stdout and persisted rollout shapes independently (mutation: total_token_usage)', () => {
    const lines = readFileSync(
      'tests/fixtures/context-rollover/rollout-mixed.SIMULATED.jsonl',
      'utf8',
    ).trim().split('\n');

    expect(lines.flatMap((line) => completedContextUsage(JSON.parse(line) as unknown))).toEqual([
      { inputTokens: 203, modelContextWindow: 258400 },
    ]);
  });

  it('runs main on a fixture directory and prints the per-call sample count', async () => {
    let printed = '';

    await main('tests/fixtures/context-rollover', (value) => { printed += value; });

    expect(printed).toContain('count: 1\n');
    expect(printed).toContain('median: 203\n');
  });
});
