import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  expectedEventDamage,
} from '../../../src/simulation/contracts';
import {
  assertReviewedResourceRecoverySourceDigests,
  reviewedResourceRecoveryClauses,
  reviewedResourceRecoverySourceSha256Oracle,
} from '../../../src/simulation/coverage';
import {
  composeRoundDamageFolds,
  type DamageEventFold,
} from '../../../src/simulation/probability';

describe('round 19 registered-fold and recovery-span boundaries', () => {
  it('refuses a structurally fabricated available fold at runtime', () => {
    const fabricated = {
      status: 'available',
      expected_damage: expectedEventDamage(950),
      contributions: [],
    } as unknown as DamageEventFold;

    expect(() => composeRoundDamageFolds([fabricated])).toThrow(
      /must be minted by a registered event-fold path/iu,
    );
  });

  it('pins every recovery row and refuses drift in an altered source copy', () => {
    expect(Object.fromEntries(Object.entries(reviewedResourceRecoveryClauses)
      .map(([row, clause]) => [row, clause.source_span_sha256])))
      .toEqual(reviewedResourceRecoverySourceSha256Oracle);

    const source = readFileSync('docs/srd/full/srd-5.2.1.txt', 'utf8');
    const altered = source.replace(
      'no more than a number',
      'no more than one number',
    );
    expect(altered).not.toBe(source);
    expect(() => assertReviewedResourceRecoverySourceDigests(altered)).toThrow(
      /sorcerous_restoration resource-recovery source span drift/iu,
    );
  });
});
