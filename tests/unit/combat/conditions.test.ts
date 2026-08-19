import { describe, expect, it } from 'vitest';
import {
  conditionCoverageManifest,
  conditionMechanicalState,
  conditionNames,
  type AppliedCondition,
  type ConditionName,
  type ExhaustionLevel,
  type MechanicalClause,
} from '../../../src/combat/conditions';
import { combatantId } from '../../../src/combat/values';

const source = combatantId('combatant:source');

function applied(name: ConditionName): AppliedCondition {
  switch (name) {
    case 'Charmed':
    case 'Frightened':
    case 'Grappled':
      return { name, source };
    case 'Exhaustion':
      return { name, level: 3 };
    case 'Blinded':
    case 'Deafened':
    case 'Incapacitated':
    case 'Invisible':
    case 'Paralyzed':
    case 'Petrified':
    case 'Poisoned':
    case 'Prone':
    case 'Restrained':
    case 'Stunned':
    case 'Unconscious':
      return { name };
  }
}

const expectedClauseKinds: Readonly<Record<ConditionName, readonly MechanicalClause['kind'][]>> = {
  Blinded: ['cannot_see', 'roll_mode', 'roll_mode'],
  Charmed: ['cannot_harm', 'social_advantage_for'],
  Deafened: ['cannot_hear'],
  Exhaustion: ['exhaustion'],
  Frightened: ['roll_mode', 'roll_mode', 'cannot_approach'],
  Grappled: ['speed_zero', 'roll_mode', 'grapple_movable'],
  Incapacitated: ['inactive', 'breaks_concentration', 'cannot_speak', 'roll_mode'],
  Invisible: ['roll_mode', 'concealed', 'roll_mode', 'roll_mode'],
  Paralyzed: [
    'inactive',
    'breaks_concentration',
    'cannot_speak',
    'speed_zero',
    'automatic_save_failure',
    'roll_mode',
    'critical_if_hit_within',
  ],
  Petrified: [
    'inanimate_transformation',
    'inactive',
    'breaks_concentration',
    'cannot_speak',
    'speed_zero',
    'roll_mode',
    'automatic_save_failure',
    'all_damage_response',
    'condition_immunity',
  ],
  Poisoned: ['roll_mode', 'roll_mode'],
  Prone: ['prone_movement', 'roll_mode', 'roll_mode', 'roll_mode'],
  Restrained: ['speed_zero', 'roll_mode', 'roll_mode', 'roll_mode'],
  Stunned: ['inactive', 'breaks_concentration', 'cannot_speak', 'automatic_save_failure', 'roll_mode'],
  Unconscious: [
    'inert',
    'inactive',
    'breaks_concentration',
    'cannot_speak',
    'speed_zero',
    'roll_mode',
    'automatic_save_failure',
    'critical_if_hit_within',
    'unaware',
  ],
};

describe('SRD condition coverage manifest', () => {
  it('contains exactly the fifteen SRD inventory rows in source order', () => {
    expect(conditionCoverageManifest).toHaveLength(15);
    expect(conditionCoverageManifest.map((row) => row.condition)).toEqual(conditionNames);
    expect(
      conditionCoverageManifest.every(
        (row) =>
          row.inventorySource === 'docs/srd/source/domain-vocabularies.txt:30-54' &&
          row.mechanicsSource.startsWith('docs/srd/full/srd-5.2.1.txt:') &&
          row.mechanicalClauseCount > 0,
      ),
    ).toBe(true);
  });

  it.each(conditionNames)(
    '%s maps every mechanical clause to typed state without narration or untyped modifiers',
    (name) => {
      const state = conditionMechanicalState([applied(name)]);
      expect(state.handledManifestRows).toEqual([name]);
      expect(state.clauses.map((clause) => clause.kind)).toEqual(expectedClauseKinds[name]);
      expect(
        state.clauses.every(
          (clause) =>
            !Object.hasOwn(clause, 'narration') && !Object.hasOwn(clause, 'modifier'),
        ),
      ).toBe(true);
    },
  );

  it.each([
    [1, -2, -5, false],
    [2, -4, -10, false],
    [3, -6, -15, false],
    [4, -8, -20, false],
    [5, -10, -25, false],
    [6, -12, -30, true],
  ] as const)(
    'applies the exact Exhaustion level %i mechanics rather than an adjacent level',
    (level, d20Penalty, speedPenaltyFeet, dies) => {
      const state = conditionMechanicalState([
        { name: 'Exhaustion', level: level as ExhaustionLevel },
      ]);
      expect(state.clauses).toEqual([
        {
          kind: 'exhaustion',
          level,
          d20Penalty,
          speedPenaltyFeet,
          dies,
          longRestLevelsRemoved: 1,
        },
      ]);
    },
  );
});
