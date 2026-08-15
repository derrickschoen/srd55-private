import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { damageType } from '../../../src/domain/enums';
import type { ContentKey } from '../../../src/domain/ids';
import {
  positiveDiceCount,
  routineEventId,
  sourceStableKey,
  type AutomaticDamageEvent,
  type SourceRef,
} from '../../../src/simulation/contracts';
import {
  assertReviewedDamageRollGroups,
  assertReviewedSourceSpanDigest,
  normalizeReviewedSourceSpan,
  reviewedSaveAvailabilityOracle,
  reviewedSaveSuccessClauses,
  reviewedSourceSpanSha256Oracle,
} from '../../../src/simulation/coverage';
import { foldAutomaticDamageEvent } from '../../../src/simulation/probability';
import {
  deriveSaveDamageCoverageFromBodies,
  sourceFixedSaveDc,
  spellDescriptionsByHeading,
} from '../../../src/simulation/spell-source-reader';

const spellExtract = readFileSync('docs/srd/source/spell-descriptions.txt', 'utf8');
const spellBodies = spellDescriptionsByHeading(spellExtract);

function occurrences(body: string): readonly (readonly [number, number])[] {
  return deriveSaveDamageCoverageFromBodies(new Map([['Round 15', body]]))
    .clauses_by_heading.get('Round 15')?.[0]?.damage_occurrences
    .filter((occurrence) => occurrence.arm === 'failure')
    .map((occurrence) => [occurrence.slot_index, occurrence.roll_index] as const) ?? [];
}

function onlyClause(heading: string, body: string) {
  const clause = deriveSaveDamageCoverageFromBodies(new Map([[heading, body]]))
    .clauses_by_heading.get(heading)?.[0];
  if (clause === undefined) {
    throw new Error(`${heading} has no derived save-damage clause.`);
  }
  return clause;
}

describe('round 15 registration and totality reproductions', () => {
  it('refuses automatic damage whose clause is unregistered', () => {
    const stableKey = sourceStableKey('homebrew:unregistered-save');
    const source: SourceRef = {
      kind: 'catalog_content',
      content_key: String(stableKey) as ContentKey,
      stable_key: stableKey,
    };
    const event: AutomaticDamageEvent = {
      kind: 'automatic_damage',
      event_id: routineEventId('round-15:unregistered-auto'),
      source,
      damage_clause_id: 'srd-5.2.1:spell:unregistered-save:save:damage',
      evidence: reviewedSaveSuccessClauses.fireball.evidence,
      frequency: { kind: 'each_declared_event' },
      duration: { kind: 'instantaneous' },
      damage: [{
        source,
        damage_type: damageType('Fire'),
        components: [{
          kind: 'dice',
          pool: { count: positiveDiceCount(8), die: 6 },
        }],
      }],
    };

    const result = foldAutomaticDamageEvent(event, [
      { damage_type: damageType('Fire'), response: 'normal' },
    ]);
    expect(result.status).toBe('unavailable');
    expect(result).not.toHaveProperty('expected_damage');
  });

  it('does not represent availability as an 11-row negative list', () => {
    expect(Object.keys(reviewedSaveAvailabilityOracle)).toHaveLength(79);
    expect(new Set(Object.keys(reviewedSaveAvailabilityOracle)))
      .toEqual(new Set(Object.keys(reviewedSaveSuccessClauses)));
  });
});

describe('round 15 fixed-DC reproductions', () => {
  it('refuses the missing roll-of threshold vocabulary', () => {
    expect(sourceFixedSaveDc(
      'A creature makes a Dexterity saving throw. A roll of 15 or higher succeeds.',
    )).toEqual({
      status: 'unavailable',
      reason: 'The source fixed save DC syntax is not representable: A roll of 15 or higher.',
    });
  });

  it('does not let a later check consume the preceding save DC', () => {
    expect(sourceFixedSaveDc(
      'The target makes a Dexterity saving throw against the ward of St. Cuthbert. ' +
      'The DC is 15 and a Strength check can also end the effect.',
    )).toEqual({ status: 'available', value: 15 });
  });

  it('still assigns an immediately following DC 15 Strength check to the check', () => {
    expect(sourceFixedSaveDc(
      'A creature makes a Dexterity saving throw against your spell save DC. ' +
      'The creature can escape with a DC 15 Strength check.',
    )).toEqual({ status: 'available', value: null });
  });
});

describe('round 15 registered-span digest guard', () => {
  const fireball = spellBodies.get('Fireball');
  if (fireball === undefined) {
    throw new Error('Fireball is missing from the bundled spell extract.');
  }
  const originalWording =
    'makes a Dexterity saving throw, taking 8d6 Fire damage on a failed save or half as much damage on a successful one.';

  it('puts one independently stored digest on every registered clause', () => {
    expect(Object.keys(reviewedSourceSpanSha256Oracle)).toHaveLength(79);
    expect(new Set(Object.keys(reviewedSourceSpanSha256Oracle)))
      .toEqual(new Set(Object.keys(reviewedSaveSuccessClauses)));
    for (const [key, clause] of Object.entries(reviewedSaveSuccessClauses)) {
      expect(clause.source_span_sha256).toBe(
        reviewedSourceSpanSha256Oracle[
          key as keyof typeof reviewedSourceSpanSha256Oracle
        ],
      );
      expect(clause.source_span_sha256).toMatch(/^[0-9a-f]{64}$/u);
    }
  });

  it('pins whitespace normalization to trim plus one-space collapsing', () => {
    expect(normalizeReviewedSourceSpan(' \n\tAlpha\u00a0 Beta \r\n'))
      .toBe('Alpha Beta');
    const clause = reviewedSaveSuccessClauses.fireball;
    expect(() => assertReviewedSourceSpanDigest(
      'fireball',
      clause.id,
      `\n${clause.source_span.replaceAll(' ', '\t\n')}\n`,
    )).not.toThrow();
  });

  for (const [name, wording] of [
    [
      'roll-of threshold',
      'makes a Dexterity saving throw. A roll of 15 or higher succeeds. On a failed save, the creature takes 8d6 Fire damage. On a successful save, it takes half as much damage.',
    ],
    [
      'preceding DC plus later check',
      'makes a Dexterity saving throw against the ward of St. Cuthbert. The DC is 15 and a Strength check can also end the effect. On a failed save, the creature takes 8d6 Fire damage. On a successful save, it takes half as much damage.',
    ],
  ] as const) {
    it(`makes the module-load guard reject Fireball ${name} drift`, () => {
      const mutated = fireball.replace(originalWording, wording);
      const clause = onlyClause('Fireball', mutated);
      expect(() => assertReviewedSourceSpanDigest(
        'fireball',
        reviewedSaveSuccessClauses.fireball.id,
        clause.span,
      )).toThrow(/fireball:save:damage source span digest mismatch/iu);
    });
  }
});

describe('round 15 one-roll marker boundaries', () => {
  const cases = {
    between: {
      body: 'A creature makes a Dexterity saving throw, taking 1d6 Fire damage as one damage roll plus 2d6 Cold damage on a failed save. On a successful save, it takes no damage.',
      expected: [[0, 0], [1, 1]],
    },
    start: {
      body: 'A creature makes a Dexterity saving throw, taking as one damage roll 1d6 Fire damage plus 2d6 Cold damage on a failed save. On a successful save, it takes no damage.',
      expected: [[0, 0], [1, 0]],
    },
    three_one_phrase: {
      body: 'A creature makes a Dexterity saving throw, taking 1d6 Fire damage plus 2d6 Cold damage plus 3d6 Acid damage as one damage roll on a failed save. On a successful save, it takes no damage.',
      expected: [[0, 0], [1, 0], [2, 0]],
    },
    three_two_phrases: {
      body: 'A creature makes a Dexterity saving throw, taking 1d6 Fire damage plus 2d6 Cold damage as one damage roll and 3d6 Acid damage as one damage roll on a failed save. On a successful save, it takes no damage.',
      expected: [[0, 0], [1, 0], [2, 1]],
    },
    one_in_range: {
      body: 'A creature makes a Dexterity saving throw, taking 1d6 Fire damage as one damage roll, then taking 2d6 Cold damage on a failed save. On a successful save, it takes no damage.',
      expected: [[0, 0], [1, 1]],
    },
  } as const;

  for (const [name, probe] of Object.entries(cases)) {
    it(`keeps the ${name} boundary`, () => {
      expect(occurrences(probe.body)).toEqual(probe.expected);
    });
  }

  it('makes the digest guard catch the registered Flame Strike drift too', () => {
    const flameStrike = spellBodies.get('Flame Strike');
    if (flameStrike === undefined) {
      throw new Error('Flame Strike is missing from the bundled spell extract.');
    }
    const mutated = flameStrike.replace(
      'taking 5d6 Fire damage and 5d6 Radiant damage on a failed save',
      'taking as one damage roll 5d6 Fire damage and 5d6 Radiant damage on a failed save',
    );
    expect(() => assertReviewedSourceSpanDigest(
      'flame_strike',
      reviewedSaveSuccessClauses.flame_strike.id,
      onlyClause('Flame Strike', mutated).span,
    )).toThrow(/flame-strike:save:damage source span digest mismatch/iu);
  });
});

describe('round 15 gate damage scanning', () => {
  function mutatedGeasClause() {
    const geas = spellBodies.get('Geas');
    if (geas === undefined) {
      throw new Error('Geas is missing from the bundled spell extract.');
    }
    const mutated = geas.replace(
      'While Charmed, the creature takes 5d10 Psychic damage if it acts in a manner directly counter to your command.',
      'While Charmed, because it failed that saving throw, the creature immediately takes 5d10 Psychic damage.',
    );
    return onlyClause('Geas', mutated);
  }

  it('finds a failed-save damage arm added to Geas', () => {
    expect(mutatedGeasClause().damage_occurrences
      .filter((occurrence) => occurrence.arm === 'failure')
      .map((occurrence) => [occurrence.slot_index, occurrence.roll_index]))
      .toEqual([[0, 0]]);
  });

  it('rejects Geas through the digest guard', () => {
    expect(() => assertReviewedSourceSpanDigest(
      'geas',
      reviewedSaveSuccessClauses.geas.id,
      mutatedGeasClause().span,
    )).toThrow(/geas:save:recurring-damage source span digest mismatch/iu);
  });

  it('still rejects Geas structurally when the digest check is deliberately bypassed', () => {
    expect(() => assertReviewedDamageRollGroups('geas', mutatedGeasClause()))
      .toThrow(/damage-roll groups disagree/iu);
  });
});
