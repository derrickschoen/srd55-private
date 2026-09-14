import { createServer } from 'node:net';
import { expect, it } from 'vitest';

it('D544 leaves one handle open so Vitest emits onProcessTimeout', async () => {
  const server = createServer();
  await new Promise<void>((resolveListening) => server.listen(0, resolveListening));
  expect(server.listening).toBe(true);
});
