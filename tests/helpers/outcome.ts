import { expect } from 'vitest';
import type { DecodedOutcome, Outcome } from '../../src/refusals/outcome';

export function expectOkOutcome<T>(outcome: Outcome<T>): T;
export function expectOkOutcome<T>(outcome: DecodedOutcome<T>): T;
export function expectOkOutcome<T>(outcome: DecodedOutcome<T>): T {
  expect(outcome.kind).toBe('ok');
  if (outcome.kind !== 'ok') {
    throw new Error(`Expected an ok outcome, received ${outcome.kind}.`);
  }
  return outcome.value;
}
