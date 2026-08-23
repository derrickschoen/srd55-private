import { describe, expect, it } from 'vitest';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import { dmVisibleEncounter, projectDmView, type DmVisibleEncounterState } from '../../../src/combat/visibility';
import { combatantId } from '../../../src/combat/values';
import { decodeDecisionProgramStructure } from '../../../src/vtt/dm-bridge/round-plan-contract';
import {
  JS_TURN_PROGRAM_GRAMMAR,
  JsTurnProgramRuntimeError,
  JsTurnProgramSyntaxError,
  interpretJsTurnProgram,
} from '../../../src/vtt/dm-bridge/js-turn-program';
import {
  TURN_PROGRAM_LIBRARY_DOC,
  TURN_PROGRAM_LIBRARY_FUNCTIONS,
  TURN_PROGRAM_LIBRARY_VERSION,
} from '../../../src/vtt/dm-bridge/turn-program-library';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

function projection(): DmVisibleEncounterState {
  const monsterA = monsterProfile('library-a', { hitPoints: 40 });
  const monsterB = monsterProfile('library-b', { hitPoints: 30 });
  const playerA = playerProfile('library-player-a');
  const playerB = playerProfile('library-player-b');
  const base = createEncounter({
    bounds: { columns: 12, rows: 4 },
    combatants: [monsterA, monsterB, playerB, playerA],
    tokens: [
      placedToken(monsterA, 0),
      placedToken(monsterB, 1),
      placedToken(playerB, 3),
      placedToken(playerA, 3, 1),
    ],
  });
  const state: EncounterState = { ...base, activeCombatant: monsterA.id };
  return dmVisibleEncounter(projectDmView(state));
}

const ACTOR = combatantId('combatant:library-a');
const ALLY = combatantId('combatant:library-b');
const TARGET = combatantId('combatant:library-player-a');
const target = { kind: 'combatant' as const, combatantId: TARGET };

describe('versioned JS turn-program pattern library', () => {
  it('derives the prompt documentation and function list from the versioned registry', () => {
    expect(TURN_PROGRAM_LIBRARY_VERSION).toBe('turn-program-library:v1');
    expect(TURN_PROGRAM_LIBRARY_FUNCTIONS).toEqual([
      'focusFire',
      'retreatWhenBelow',
      'flankWith',
      'holdChokepoint',
      'riderOnCrit',
    ]);
    expect(TURN_PROGRAM_LIBRARY_DOC).toContain('focusFire(targetSelector)');
    expect(TURN_PROGRAM_LIBRARY_DOC).toContain('riderOnCrit(followUpAction)');
    expect(JS_TURN_PROGRAM_GRAMMAR.endsWith(TURN_PROGRAM_LIBRARY_DOC)).toBe(true);
  });

  it.each([
    {
      helper: 'focusFire',
      source: 'const target = nearestEnemy(); emit(focusFire(target));',
      longForm: {
        kind: 'priority',
        choices: [
          { kind: 'action', action: { kind: 'attack', target } },
          { kind: 'action', action: { kind: 'move_toward', target } },
          { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
        ],
      },
    },
    {
      helper: 'retreatWhenBelow',
      source: 'emit(retreatWhenBelow(0.25, {column: 0, row: 2}));',
      longForm: {
        kind: 'if',
        predicate: { kind: 'hp_percent_below', combatantId: ACTOR, percent: 25 },
        then: {
          kind: 'priority',
          choices: [
            { kind: 'action', action: { kind: 'use_action', action: 'disengage' } },
            { kind: 'action', action: { kind: 'retreat_toward', destination: { column: 0, row: 2 } } },
            { kind: 'action', action: { kind: 'use_action', action: 'dash' } },
            { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
          ],
        },
        else: {
          kind: 'priority',
          choices: [
            { kind: 'action', action: { kind: 'attack', target: { kind: 'nearest_enemy' } } },
            { kind: 'action', action: { kind: 'move_toward', target: { kind: 'nearest_enemy' } } },
            { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
          ],
        },
      },
    },
    {
      helper: 'flankWith',
      source: 'const ally = lowestHp(alliesWithin(30)); const target = nearestEnemy(); emit(flankWith(ally, target));',
      longForm: {
        kind: 'if',
        predicate: { kind: 'distance_at_most', left: ALLY, right: TARGET, feet: 5 },
        then: {
          kind: 'priority',
          choices: [
            { kind: 'action', action: { kind: 'attack', target } },
            { kind: 'action', action: { kind: 'move_toward', target } },
            { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
          ],
        },
        else: {
          kind: 'priority',
          choices: [
            { kind: 'action', action: { kind: 'move_toward', target } },
            { kind: 'action', action: { kind: 'attack', target } },
            { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
          ],
        },
      },
    },
    {
      helper: 'holdChokepoint',
      source: 'emit(holdChokepoint({column: 2, row: 2}));',
      longForm: {
        kind: 'priority',
        choices: [
          { kind: 'action', action: { kind: 'retreat_toward', destination: { column: 2, row: 2 } } },
          { kind: 'action', action: { kind: 'use_action', action: 'dodge' } },
          { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
        ],
      },
    },
  ])('$helper expands exactly to its hand-written DecisionProgram', ({ source, longForm }) => {
    const expanded = interpretJsTurnProgram(source, projection(), ACTOR).emittedDecisionProgram;
    expect(expanded).toEqual(longForm);
    expect(decodeDecisionProgramStructure(expanded)).toEqual(longForm);
  });

  it('riderOnCrit expands to the same attached fixed follow-up as its hand-written long form', () => {
    const source = 'const target = nearestEnemy(); emit(attack(target, riderOnCrit(forceSave(target))));';
    const expanded = interpretJsTurnProgram(source, projection(), ACTOR).emittedDecisionProgram;
    const longForm = {
      kind: 'action' as const,
      action: { kind: 'attack' as const, target },
      riders: [{
        kind: 'on_critical_hit' as const,
        followUpAction: { kind: 'force_save' as const, target },
      }],
    };

    expect(expanded).toEqual(longForm);
    expect(decodeDecisionProgramStructure(expanded)).toEqual(longForm);
  });

  it('sandboxes helper arguments and rejects fabricated selectors and ambient globals', () => {
    expect(() => interpretJsTurnProgram(
      'emit(focusFire({kind: "combatant", combatantId: "combatant:library-player-a"}));',
      projection(),
      ACTOR,
    )).toThrowError(new JsTurnProgramRuntimeError('focusFire requires a combatant reference.'));
    expect(() => interpretJsTurnProgram(
      'emit(focusFire(globalThis));',
      projection(),
      ACTOR,
    )).toThrowError(JsTurnProgramSyntaxError);
  });

  it('helper_bypasses_validation rejects an invalid cell before it can become a DecisionProgram', () => {
    expect(() => interpretJsTurnProgram(
      'emit(retreatWhenBelow(0.25, {column: -1, row: 0}));',
      projection(),
      ACTOR,
    )).toThrow('cell selector coordinates must be non-negative safe integers');
  });

  it('fraction_hp_not_scaled converts the 0..1 fraction to the contract percentage exactly once', () => {
    const expanded = interpretJsTurnProgram(
      'emit(retreatWhenBelow(0.375, {column: 0, row: 0}));',
      projection(),
      ACTOR,
    ).emittedDecisionProgram;
    expect(expanded).toMatchObject({
      predicate: { kind: 'hp_percent_below', combatantId: ACTOR, percent: 37.5 },
    });
  });

  it('requires a fixed action rather than a searchable program as the rider follow-up', () => {
    const source = 'const target = nearestEnemy(); emit(attack(target, riderOnCrit(focusFire(target))));';
    expect(() => interpretJsTurnProgram(source, projection(), ACTOR)).toThrow(
      'riderOnCrit followUpAction must be an action.',
    );
  });
});
