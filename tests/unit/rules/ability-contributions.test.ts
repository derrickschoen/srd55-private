import { describe, expect, it } from 'vitest';
import type {
  AbilityIncreaseContribution,
  AbilityOverrideCandidate,
  GuidedAbilityScores,
} from '../../../src/builder/contracts';
import {
  resolveAbilities,
  resolveAbilityOverrideComputation,
} from '../../../src/rules/ability-contributions';

const BASE_19: GuidedAbilityScores = {
  strength: 19,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
};

function increase(
  amount: number,
  maximum: number,
): AbilityIncreaseContribution {
  return {
    ability: 'strength',
    amount,
    maximum,
    source_instance_id: 1,
  };
}

function override(
  effectId: number,
  setTo: number,
  label: string,
  provenance: 'item' | 'source' = 'item',
): AbilityOverrideCandidate {
  return {
    effect_id: effectId,
    ability: 'strength',
    set_to: setTo,
    label,
    source_instance_id: provenance === 'source' ? effectId + 100 : null,
    character_item_id: provenance === 'item' ? effectId : null,
  };
}

describe('B2 ability contribution arithmetic', () => {
  it('B2-CAP applies each maximum in acquisition order, so reversing the grants deliberately changes the result', () => {
    const cappedThenOpen = resolveAbilities(BASE_19, [
      increase(2, 20),
      increase(1, 30),
    ]);
    const openThenCapped = resolveAbilities(BASE_19, [
      increase(1, 30),
      increase(2, 20),
    ]);

    // Plan §3.3 pins these two different literals. An uncapped sum produces
    // 22 in both orders, while sorting the contributions erases the distinction.
    expect(cappedThenOpen.strength.total).toBe(21);
    expect(openThenCapped.strength.total).toBe(20);
  });

  it('D83 applies an override only after capped increases and retains a lower value as an inert named term', () => {
    const base = { ...BASE_19, strength: 20 };
    const resolved = resolveAbilities(
      base,
      [increase(2, 22)],
      [
        override(11, 21, 'Lesser Belt'),
        override(12, 24, 'Belt of Giant Strength'),
      ],
    );

    expect(resolved.strength).toEqual({
      base: 20,
      contributions: [increase(2, 22)],
      increased: 22,
      overrides: [
        {
          ...override(11, 21, 'Lesser Belt'),
          outcome: 'floored_by_increased_score',
        },
        {
          ...override(12, 24, 'Belt of Giant Strength'),
          outcome: 'applied',
        },
      ],
      total: 24,
    });
  });

  it('D83 chooses the highest set-to value without stacking two overrides', () => {
    const resolved = resolveAbilities(
      BASE_19,
      [],
      [
        override(21, 23, 'Hill Belt'),
        override(22, 25, 'Cloud Belt'),
      ],
    );

    expect(resolved.strength.total).toBe(25);
    expect(resolved.strength.overrides).toEqual([
      {
        ...override(21, 23, 'Hill Belt'),
        outcome: 'superseded_by_higher_override',
      },
      {
        ...override(22, 25, 'Cloud Belt'),
        outcome: 'applied',
      },
    ]);
  });

  it('D83 names an equal highest SET as a tie, not as a lower value', () => {
    const resolved = resolveAbilities(
      BASE_19,
      [],
      [
        override(26, 25, 'First Cloud Belt'),
        override(27, 25, 'Second Cloud Belt'),
      ],
    );

    expect(resolved.strength.total).toBe(25);
    expect(resolved.strength.overrides.map((entry) => entry.outcome)).toEqual([
      'applied',
      'tied_at_winning_value',
    ]);
  });

  it('D83 floors set-to 21 at an increase-past-20 result of 22', () => {
    const resolved = resolveAbilities(
      { ...BASE_19, strength: 20 },
      [increase(2, 22)],
      [override(31, 21, 'Lesser Belt')],
    );

    expect(resolved.strength.increased).toBe(22);
    expect(resolved.strength.total).toBe(22);
    expect(resolved.strength.overrides[0]?.outcome).toBe(
      'floored_by_increased_score',
    );
  });

  it('E3 regression-pins all four outcomes with provenance and acquisition order before typed-term integration', () => {
    const resolved = resolveAbilities(
      { ...BASE_19, strength: 20 },
      [increase(2, 22)],
      [
        override(41, 21, 'Floored belt'),
        override(42, 24, 'Winning belt'),
        override(43, 24, 'Equal belt'),
        override(44, 23, 'Lower belt'),
      ],
    );

    expect(resolved.strength).toEqual({
      base: 20,
      contributions: [increase(2, 22)],
      increased: 22,
      overrides: [
        {
          ...override(41, 21, 'Floored belt'),
          outcome: 'floored_by_increased_score',
        },
        {
          ...override(42, 24, 'Winning belt'),
          outcome: 'applied',
        },
        {
          ...override(43, 24, 'Equal belt'),
          outcome: 'tied_at_winning_value',
        },
        {
          ...override(44, 23, 'Lower belt'),
          outcome: 'superseded_by_higher_override',
        },
      ],
      total: 24,
    });
  });

  it('E3 maps that oracle to acquisition-ordered SetIfHigher Computed terms without changing it', () => {
    const candidates = [
      override(41, 21, 'Floored boon', 'source'),
      override(42, 24, 'Winning belt'),
      override(43, 24, 'Equal belt'),
      override(44, 23, 'Lower belt'),
    ];

    expect(resolveAbilityOverrideComputation(22, candidates)).toEqual({
      terms: [
        {
          source: { kind: 'character_effect', effect_id: 41, source_instance_id: 141 },
          op: 'set_if_higher',
          contribution: 21,
          status: 'floored_by_increased_score',
        },
        {
          source: { kind: 'character_effect', effect_id: 42, character_item_id: 42 },
          op: 'set_if_higher',
          contribution: 24,
          status: 'applied',
        },
        {
          source: { kind: 'character_effect', effect_id: 43, character_item_id: 43 },
          op: 'set_if_higher',
          contribution: 24,
          status: 'applied_equal',
        },
        {
          source: { kind: 'character_effect', effect_id: 44, character_item_id: 44 },
          op: 'set_if_higher',
          contribution: 23,
          status: {
            superseded_by: {
              kind: 'character_effect', effect_id: 42, character_item_id: 42,
            },
          },
        },
      ],
      value: 24,
      riders: [],
    });

    expect(resolveAbilities(
      { ...BASE_19, strength: 20 },
      [increase(2, 22)],
      candidates,
    ).strength.overrides.map((entry) => entry.outcome)).toEqual([
      'floored_by_increased_score',
      'applied',
      'tied_at_winning_value',
      'superseded_by_higher_override',
    ]);
  });
});
