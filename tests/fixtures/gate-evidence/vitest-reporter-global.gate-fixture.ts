import { expect, it } from 'vitest';

it('passes before an unhandled error is observed', () => {
  expect(true).toBe(true);
  queueMicrotask(() => {
    throw new Error('intentional global error');
  });
});
