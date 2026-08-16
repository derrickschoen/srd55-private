import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { damageType } from '../../../src/domain/enums';
import type { ContentKey } from '../../../src/domain/ids';
import {
  attackRollModifier,
  damageFlatModifier,
  positiveDiceCount,
  routineEventId,
  sourceStableKey,
  targetArmorClass,
  type AttackRollEvent,
  type SourceRef,
} from '../../../src/simulation/contracts';
import {
  assertReviewedSpellBodyDigest,
  normalizeReviewedSpellBody,
  publicProbabilityCoverageManifest,
  reviewedSaveSuccessClauses,
  reviewedSpellBodySha256Oracle,
} from '../../../src/simulation/coverage';
import {
  foldAttackEvent,
  ordinaryDamageDistribution,
} from '../../../src/simulation/probability';
import {
  deriveSaveDamageCoverageFromBodies,
  spellBodyDigestInputsByHeading,
  spellDescriptionsByHeading,
} from '../../../src/simulation/spell-source-reader';

const spellExtract = readFileSync('docs/srd/source/spell-descriptions.txt', 'utf8');

function fireballFromExtract(extract: string) {
  const body = spellDescriptionsByHeading(extract).get('Fireball');
  const digestInput = spellBodyDigestInputsByHeading(extract).get('Fireball');
  if (body === undefined || digestInput === undefined) {
    throw new Error('Fireball is missing from the supplied spell extract.');
  }
  const clause = deriveSaveDamageCoverageFromBodies(new Map([['Fireball', body]]))
    .clauses_by_heading.get('Fireball')?.[0];
  if (clause === undefined) {
    throw new Error('Fireball has no derived save-damage clause.');
  }
  return { clause, digest_input: digestInput };
}

function failureOccurrences(body: string): readonly (readonly [number, number])[] {
  const clause = deriveSaveDamageCoverageFromBodies(new Map([['Round 16', body]]))
    .clauses_by_heading.get('Round 16')?.[0];
  if (clause === undefined) {
    throw new Error('Round 16 probe has no derived save-damage clause.');
  }
  return clause.damage_occurrences
    .filter((occurrence) => occurrence.arm === 'failure')
    .map((occurrence) => [occurrence.slot_index, occurrence.roll_index] as const);
}

describe('round 16 whole-spell-body digest reproductions', () => {
  it('preserves a line-break hyphen in the digest input', () => {
    expect(normalizeReviewedSpellBody('re-\nsign')).toBe('re- sign');
    expect(normalizeReviewedSpellBody('re-\nsign')).not.toBe(
      normalizeReviewedSpellBody('resign'),
    );
  });

  it('rejects a raw line-break-hyphen change that parses to the same Fireball text', () => {
    const mutated = spellExtract.replace(
      'Using a Higher-Level Spell Slot. The damage in-\n\ncreases by 1d6',
      'Using a Higher-Level Spell Slot. The damage increases by 1d6',
    );
    expect(mutated).not.toBe(spellExtract);
    const fireball = fireballFromExtract(mutated);

    expect(() => assertReviewedSpellBodyDigest(
      'fireball',
      reviewedSaveSuccessClauses.fireball.id,
      fireball.digest_input,
    )).toThrow(/fireball:save:damage spell body digest mismatch/iu);
  });

  it('rejects a nonmechanical Fireball example inserted outside the parsed clause', () => {
    const mutated = spellExtract.replace(
      'Flammable objects in the area that aren’t being\n\nworn or carried start burning.',
      'Flammable objects in the area that aren’t being\n\nworn or carried start burning. For example, dry parchment catches first.',
    );
    expect(mutated).not.toBe(spellExtract);
    const fireball = fireballFromExtract(mutated);

    expect(() => assertReviewedSpellBodyDigest(
      'fireball',
      reviewedSaveSuccessClauses.fireball.id,
      fireball.digest_input,
    )).toThrow(/fireball:save:damage spell body digest mismatch/iu);
  });

  it('pins 79 clauses to 72 collision-free spell bodies', () => {
    expect(Object.keys(reviewedSpellBodySha256Oracle)).toHaveLength(79);
    const digestBySpell = new Map<string, string>();
    for (const clause of Object.values(reviewedSaveSuccessClauses)) {
      const existing = digestBySpell.get(clause.effect_stable_key);
      if (existing !== undefined) {
        expect(clause.spell_body_sha256).toBe(existing);
      }
      digestBySpell.set(clause.effect_stable_key, clause.spell_body_sha256);
    }
    expect(digestBySpell.size).toBe(72);
    expect(new Set(digestBySpell.values()).size).toBe(72);
  });
});

describe('round 16 attack registration gate', () => {
  it('refuses the reviewer homebrew attack instead of returning 2.1', () => {
    const stableKey = sourceStableKey('homebrew:unregistered-attack');
    const source: SourceRef = {
      kind: 'catalog_content',
      content_key: String(stableKey) as ContentKey,
      stable_key: stableKey,
    };
    const event: AttackRollEvent = {
      kind: 'attack_roll',
      event_id: routineEventId('round-16:unregistered-attack'),
      source,
      attack_roll_clause_id: 'homebrew:unregistered-attack' as never,
      attack_roll_evidence: publicProbabilityCoverageManifest.attack_roll,
      attack_bonus: attackRollModifier(0),
      frequency: { kind: 'each_declared_event' },
      duration: { kind: 'instantaneous' },
      critical: {
        kind: 'natural_20',
        evidence: publicProbabilityCoverageManifest.critical_hit,
      },
      damage: [{
        source,
        damage_type: damageType('Fire'),
        components: [{
          kind: 'dice',
          pool: { count: positiveDiceCount(1), die: 6 },
          trigger: 'hit',
        }],
      }],
    };

    const result = foldAttackEvent(event, {
      armor_class: targetArmorClass(10),
      roll_state: 'normal',
      damage_responses: [{ damage_type: damageType('Fire'), response: 'normal' }],
    });
    expect(result.status).toBe('unavailable');
    expect(result).not.toHaveProperty('expected_damage');
  });
});

describe('round 16 comma-delimited prefix one-roll marker', () => {
  it('groups only the two damage expressions following the prefix marker', () => {
    expect(failureOccurrences(
      'A creature makes a Dexterity saving throw, taking 1d6 Fire damage ' +
      'plus, as one damage roll, 2d6 Cold damage and 3d6 Acid damage on a ' +
      'failed save. On a successful save, it takes no damage.',
    )).toEqual([[0, 0], [1, 1], [2, 1]]);
  });
});

describe('round 16 distribution-layer regression coverage', () => {
  it('sums both dice pools and modifiers before clamping the whole roll', () => {
    const distribution = ordinaryDamageDistribution([
      { kind: 'dice', pool: { count: positiveDiceCount(1), die: 4 } },
      { kind: 'dice', pool: { count: positiveDiceCount(1), die: 6 } },
      { kind: 'flat', modifier: damageFlatModifier(2) },
      { kind: 'flat', modifier: damageFlatModifier(-4) },
    ]);
    const expectation = distribution.reduce(
      (sum, outcome) => sum + outcome.total * outcome.probability,
      0,
    );

    expect(expectation).toBeCloseTo(4, 12);
    expect(expectation).not.toBeCloseTo(0.75, 12);
  });
});
