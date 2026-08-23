import { describe, expect, it } from 'vitest';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import { projectEncounter, type DmVisibleEncounterState } from '../../../src/combat/visibility';
import { combatantId } from '../../../src/combat/values';
import {
  JS_TURN_PROGRAM_CANONICAL_EXAMPLE,
  JsTurnProgramBudgetError,
  JsTurnProgramSyntaxError,
  interpretJsTurnProgram,
  parseJsTurnProgram,
} from '../../../src/vtt/dm-bridge/js-turn-program';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

function projection(): DmVisibleEncounterState {
  const monsterA = monsterProfile('js-program-a', { hitPoints: 40 });
  const monsterB = monsterProfile('js-program-b', { hitPoints: 30 });
  const playerA = playerProfile('js-program-player-a');
  const playerB = playerProfile('js-program-player-b');
  const base = createEncounter({
    bounds: { columns: 12, rows: 3 },
    combatants: [monsterA, monsterB, playerB, playerA],
    tokens: [
      placedToken(monsterA, 0),
      placedToken(monsterB, 1),
      placedToken(playerB, 3),
      placedToken(playerA, 3, 1),
    ],
  });
  const state: EncounterState = { ...base, activeCombatant: monsterA.id };
  return projectEncounter(state, { kind: 'dm' });
}

const ACTOR = combatantId('combatant:js-program-a');

describe('restricted JS turn-program parser and interpreter', () => {
  it('parses the typed grammar: const, arithmetic, comparisons, logic, arrays, objects, calls, if/else, and API-array for-of', () => {
    const source = `
      const radius = (2 + 4) * 5;
      const flags = [true, false, null];
      const note = {label: "deterministic", radius: radius};
      for (const ally of alliesWithin(radius)) {
        const allyHealthy = hpPercent(ally) >= 50 && distanceTo(ally) <= radius;
      }
      const target = lowestHp(enemiesWithin(radius));
      if (target !== null && !(1 > 2)) {
        emit(priority([attack(target), forceSave(target), move(target), retreat(1, 2), dash(), disengage(), dodge(), endTurn()]));
      } else {
        emit(endTurn());
      }
    `;

    const ast = parseJsTurnProgram(source);
    const result = interpretJsTurnProgram(source, projection(), ACTOR);

    expect(ast.kind).toBe('program');
    expect(ast.statements.map((statement) => statement.kind)).toEqual([
      'const', 'const', 'const', 'for_of', 'const', 'if',
    ]);
    expect(result.emittedDecisionProgram).toMatchObject({
      kind: 'priority',
      choices: [
        { kind: 'action', action: { kind: 'attack', target: { combatantId: 'combatant:js-program-player-a' } } },
        { kind: 'action', action: { kind: 'force_save' } },
        { kind: 'action', action: { kind: 'move_toward' } },
        { kind: 'action', action: { kind: 'retreat_toward' } },
        { kind: 'action', action: { action: 'dash' } },
        { kind: 'action', action: { action: 'disengage' } },
        { kind: 'action', action: { action: 'dodge' } },
        { kind: 'action', action: { action: 'end_turn' } },
      ],
    });
    expect(result.steps).toBeGreaterThan(30);
  });

  it.each([
    ['while loop', 'while (true) {}', 'Forbidden construct "while loop" at line 1, column 1.'],
    ['function declaration', 'function choose() {}', 'Forbidden construct "function declaration" at line 1, column 1.'],
    ['this', 'emit(this);', 'Forbidden construct "this" at line 1, column 6.'],
    ['class declaration', 'class Plan {}', 'Forbidden construct "class declaration" at line 1, column 1.'],
    ['prototype access', 'const x = prototype;', 'Forbidden prototype property "prototype" at line 1, column 11.'],
    ['prototype literal', 'const x = {__proto__: 1};', 'Forbidden prototype property "__proto__" at line 1, column 12.'],
    ['ambient global', 'emit(globalThis);', 'Forbidden global "globalThis" at line 1, column 6.'],
    ['import', 'import x from "x";', 'Forbidden construct "import" at line 1, column 1.'],
    ['try', 'try {} catch (error) {}', 'Forbidden construct "try statement" at line 1, column 1.'],
    ['regular expression', 'const x = /attack/;', 'Forbidden construct "regular expression" at line 1, column 11.'],
    ['Date', 'emit(Date);', 'Forbidden global "Date" at line 1, column 6.'],
    ['Math.random', 'emit(Math.random());', 'Forbidden global "Math" at line 1, column 6.'],
    ['member access', 'const target = nearestEnemy(); emit(target.id);', 'Member access is forbidden at line 1, column 43.'],
    ['assignment', 'const target = nearestEnemy(); target = null;', 'Assignment is forbidden at line 1, column 39.'],
    ['arrow function', 'const f = () => 1;', 'Forbidden construct "arrow function" at line 1, column 14.'],
  ])('rejects forbidden %s with a precise source error', (_name, source, message) => {
    expect(() => parseJsTurnProgram(source)).toThrowError(new JsTurnProgramSyntaxError(message));
  });

  it('rejects for-of over a locally constructed array rather than an API-returned array', () => {
    expect(() => parseJsTurnProgram('const xs = []; for (const x of xs) { emit(endTurn()); }')).toThrow(
      'For-of accepts only alliesWithin(...) or enemiesWithin(...)',
    );
  });

  it('rejects an object literal that tries to impersonate a typed API DecisionProgram', () => {
    const source = 'emit({kind: "action", action: {kind: "use_action", action: "end_turn"}});';
    expect(() => interpretJsTurnProgram(source, projection(), ACTOR)).toThrow(
      'emit requires a DecisionProgram.',
    );
  });

  it('forbidden_construct_executes rejects while before an executable AST exists', () => {
    expect(() => interpretJsTurnProgram('while (true) { emit(endTurn()); }', projection(), ACTOR)).toThrow(
      'Forbidden construct "while loop"',
    );
  });

  it('step_budget_ignored stops a costly API-array loop at the exact configured bound', () => {
    const source = `
      for (const enemy of enemiesWithin(100)) {
        const hp = hpPercent(enemy);
      }
      emit(endTurn());
    `;
    expect(() => interpretJsTurnProgram(source, projection(), ACTOR, { stepBudget: 5 })).toThrowError(
      new JsTurnProgramBudgetError('JS turn-program exceeded step budget 5.'),
    );
  });

  it('enforces the wall-clock budget through an injected monotonic clock', () => {
    let now = 0;
    expect(() => interpretJsTurnProgram('emit(endTurn());', projection(), ACTOR, {
      timeBudgetMs: 2,
      now: () => {
        now += 2;
        return now;
      },
    })).toThrowError(new JsTurnProgramBudgetError('JS turn-program exceeded time budget 2ms.'));
  });

  it('same source and projection emit an identical DecisionProgram', () => {
    const first = interpretJsTurnProgram(JS_TURN_PROGRAM_CANONICAL_EXAMPLE, projection(), ACTOR);
    const second = interpretJsTurnProgram(JS_TURN_PROGRAM_CANONICAL_EXAMPLE, projection(), ACTOR);
    expect(JSON.stringify(first.emittedDecisionProgram)).toBe(JSON.stringify(second.emittedDecisionProgram));
  });

  it('projection_order_changes_query uses combatant id as the stable equidistant tie-break', () => {
    const result = interpretJsTurnProgram('const target = nearestEnemy(); emit(attack(target));', projection(), ACTOR);
    expect(result.emittedDecisionProgram).toMatchObject({
      action: { target: { combatantId: 'combatant:js-program-player-a' } },
    });
  });

  it('emits explicit selectable programs for granted Bonus Action attacks and Action Surge', () => {
    const result = interpretJsTurnProgram(
      'const target = nearestEnemy(); emit(priority(bonusAttack(target), actionSurge(), attack(target)));',
      projection(),
      ACTOR,
    );
    expect(result.emittedDecisionProgram).toEqual({
      kind: 'priority',
      choices: [
        {
          kind: 'action',
          action: {
            kind: 'bonus_attack',
            target: { kind: 'combatant', combatantId: 'combatant:js-program-player-a' },
          },
        },
        { kind: 'action', action: { kind: 'use_action', action: 'action_surge' } },
        {
          kind: 'action',
          action: {
            kind: 'attack',
            target: { kind: 'combatant', combatantId: 'combatant:js-program-player-a' },
          },
        },
      ],
    });
  });
});
