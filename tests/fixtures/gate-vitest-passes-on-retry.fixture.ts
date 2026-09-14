import { existsSync, writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('fails once and then passes using an external sentinel', () => {
  const sentinel = process.env.DND_GATE_RETRY_SENTINEL;
  if (sentinel === undefined) throw new Error('DND_GATE_RETRY_SENTINEL is required.');
  const existed = existsSync(sentinel);
  if (!existed) writeFileSync(sentinel, 'created by initial attempt\n', 'utf8');
  expect(existed).toBe(true);
});
