import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { mulberry32 } from '../../../src/combat/random';
import { damageType, dieSides, effectStackingIdentity } from '../../../src/combat/values';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

const fixedD20 = (face: number) => () => (face - 0.5) / 20;

function requiredSearchMemories(state: EncounterState) {
  if (state.searchMemories === undefined) throw new Error('Expected persisted D420 search memory.');
  return state.searchMemories;
}

function invisibleSelf(actor: ReturnType<typeof playerProfile>): EncounterCommand {
  return {
    type: 'apply_effect',
    actor: actor.id,
    cost: 'none',
    effect: {
      targets: [actor.id],
      duration: { kind: 'permanent' },
      concentration: false,
      stackingIdentity: effectStackingIdentity('d420:test-invisible'),
      stacking: 'replace_same_source',
      repeatedSave: null,
      payload: { kind: 'condition', condition: 'Invisible' },
    },
  };
}

function invisibleEncounter(): {
  readonly pc: ReturnType<typeof playerProfile>;
  readonly monster: ReturnType<typeof monsterProfile>;
  readonly state: EncounterState;
} {
  const pc = playerProfile('search-target', { initiativeBonus: 20 });
  const monster = monsterProfile('searcher', { initiativeBonus: -20 });
  let state = createEncounter({
    bounds: { columns: 5, rows: 5 },
    combatants: [pc, monster],
    tokens: [placedToken(pc, 2, 2), placedToken(monster, 0, 2)],
  });
  state = reduceEncounter(state, { type: 'roll_initiative' }, fixedD20(10)).state;
  state = reduceEncounter(state, invisibleSelf(pc), fixedD20(10)).state;
  return { pc, monster, state };
}

function endActiveTurn(state: EncounterState): EncounterState {
  if (state.activeCombatant === null) throw new Error('The fixture has no active turn.');
  return reduceEncounter(
    state,
    { type: 'end_turn', actor: state.activeCombatant },
    fixedD20(10),
  ).state;
}

function damage(amount: number) {
  return {
    terms: [{
      type: damageType('Force'),
      dice: { count: 0, sides: dieSides(6), modifier: amount },
    }],
    critical: false,
    responses: [],
  } as const;
}

describe('D420 persistent monster-side search memory', () => {
  it('pins the last-known position when invisibility makes a target unseen', () => {
    const { pc, monster, state } = invisibleEncounter();

    expect(state.searchMemories).toEqual([expect.objectContaining({
      policy: 'search-memory-v1',
      observer: monster.id,
      target: pc.id,
      cause: 'invisibility',
      lastKnownPosition: { column: 2, row: 2 },
      lostAtRound: 1,
      lastExpandedRound: 1,
      expires: { kind: 'start_of_round', round: 4 },
      suspicion: {
        kind: 'grid_radius',
        center: { column: 2, row: 2 },
        radius: 0,
        cells: [{ column: 2, row: 2 }],
      },
    })]);
    expect(state.eventLog).toContainEqual(expect.objectContaining({
      type: 'search_memory_recorded',
      observer: monster.id,
      target: pc.id,
      cause: 'invisibility',
      lastKnownPosition: { column: 2, row: 2 },
    }));
    expect(requiredSearchMemories(state)[0]?.legalOptions.map((option) => option.kind)).toEqual([
      'move_and_search',
      'ready_action',
      'attack_suspected_square',
      'area_effect_over_region',
    ]);
    const serialized = JSON.stringify(state);
    const roundTripped = JSON.parse(serialized) as unknown as EncounterState;
    expect(JSON.stringify(roundTripped)).toBe(serialized);
    expect(requiredSearchMemories(roundTripped)).toEqual(requiredSearchMemories(state));
  });

  it('expands the suspicion region by hand-computed grid cells each round', () => {
    let { state } = invisibleEncounter();
    state = endActiveTurn(state);
    state = endActiveTurn(state);

    expect(state.round).toBe(2);
    expect(requiredSearchMemories(state)[0]?.suspicion).toEqual({
      kind: 'grid_radius',
      center: { column: 2, row: 2 },
      radius: 5,
      cells: [
        { column: 1, row: 1 }, { column: 2, row: 1 }, { column: 3, row: 1 },
        { column: 1, row: 2 }, { column: 2, row: 2 }, { column: 3, row: 2 },
        { column: 1, row: 3 }, { column: 2, row: 3 }, { column: 3, row: 3 },
      ],
    });

    state = endActiveTurn(state);
    state = endActiveTurn(state);
    expect(state.round).toBe(3);
    expect(requiredSearchMemories(state)[0]?.suspicion.radius).toBe(10);
    expect(requiredSearchMemories(state)[0]?.suspicion.cells).toHaveLength(25);
    expect(requiredSearchMemories(state)[0]?.suspicion.cells).toEqual(
      Array.from({ length: 5 }, (_rowValue, row) =>
        Array.from({ length: 5 }, (_columnValue, column) => ({ column, row }))).flat(),
    );
  });

  it('forces unseen-target disadvantage when a monster attacks the occupied suspected square', () => {
    const fixture = invisibleEncounter();
    const state = endActiveTurn(fixture.state);
    const result = reduceEncounter(state, {
      type: 'attack_suspected_square',
      actor: fixture.monster.id,
      suspectedTarget: fixture.pc.id,
      square: { column: 2, row: 2 },
      attackBonus: 100,
      criticalFloor: 20,
      damage: damage(0),
    }, fixedD20(10));

    const attack = result.events.find((event) => event.type === 'attack_resolved');
    const suspected = result.events.find((event) => event.type === 'suspected_square_attacked');
    expect(attack?.type === 'attack_resolved' ? attack.attack.roll : null).toEqual({
      mode: 'disadvantage',
      faces: [10, 10],
      chosen: 10,
    });
    expect(suspected).toMatchObject({
      type: 'suspected_square_attacked',
      actor: fixture.monster.id,
      suspectedTarget: fixture.pc.id,
      square: { column: 2, row: 2 },
      outcome: 'target_present',
      roll: { mode: 'disadvantage', faces: [10, 10], chosen: 10 },
    });
  });

  it('automatically misses with disadvantage when the remembered square is empty', () => {
    const fixture = invisibleEncounter();
    let state = reduceEncounter(fixture.state, {
      type: 'move',
      actor: fixture.pc.id,
      path: [{ column: 3, row: 2 }],
      cause: 'voluntary',
    }, fixedD20(10)).state;
    state = endActiveTurn(state);
    const result = reduceEncounter(state, {
      type: 'attack_suspected_square',
      actor: fixture.monster.id,
      suspectedTarget: fixture.pc.id,
      square: { column: 2, row: 2 },
      attackBonus: 100,
      criticalFloor: 20,
      damage: damage(10),
    }, fixedD20(10));

    expect(result.events.find((event) => event.type === 'suspected_square_attacked')).toMatchObject({
      type: 'suspected_square_attacked',
      outcome: 'empty',
      square: { column: 2, row: 2 },
      roll: { mode: 'disadvantage', faces: [10, 10], chosen: 10 },
    });
    expect(result.events.some((event) => event.type === 'damage_applied')).toBe(false);
    expect(requiredSearchMemories(result.state)[0]?.lastKnownPosition).toEqual({ column: 2, row: 2 });
  });

  it('clears expired memory at the typed round boundary', () => {
    let { state } = invisibleEncounter();
    while (state.round < 4) state = endActiveTurn(state);

    expect(state.searchMemories).toBeUndefined();
    expect(state.eventLog).toContainEqual(expect.objectContaining({
      type: 'search_memory_cleared',
      reason: 'expired',
    }));
  });

  it('records heavy obscurement as a separate unseen transition cause', () => {
    const pc = playerProfile('obscured-target', { initiativeBonus: 20 });
    const monster = monsterProfile('obscurement-searcher', { initiativeBonus: -20 });
    let state = createEncounter({
      bounds: { columns: 4, rows: 1 },
      combatants: [pc, monster],
      tokens: [placedToken(pc, 2), placedToken(monster, 0)],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, fixedD20(10)).state;
    state = reduceEncounter(state, {
      type: 'world_operation',
      actor: null,
      cost: 'none',
      operation: {
        kind: 'set_obscurement',
        region: { id: 'd420-heavy', cells: [{ column: 2, row: 0 }] },
        obscurement: 'heavy',
      },
    }, fixedD20(10)).state;

    expect(state.searchMemories).toEqual([expect.objectContaining({
      observer: monster.id,
      target: pc.id,
      cause: 'obscurement',
      lastKnownPosition: { column: 2, row: 0 },
    })]);
  });

  it('records a successful Hide as the active search-memory cause', () => {
    const pc = playerProfile('hidden-target', { initiativeBonus: 20 });
    const monster = monsterProfile('hide-searcher', { initiativeBonus: -20 });
    let state = createEncounter({
      bounds: { columns: 4, rows: 1 },
      combatants: [pc, monster],
      tokens: [placedToken(pc, 2), placedToken(monster, 0)],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, fixedD20(15)).state;
    state = reduceEncounter(state, {
      type: 'world_operation',
      actor: null,
      cost: 'none',
      operation: {
        kind: 'set_obscurement',
        region: { id: 'd420-hide-cover', cells: [{ column: 2, row: 0 }] },
        obscurement: 'heavy',
      },
    }, fixedD20(15)).state;
    state = reduceEncounter(state, { type: 'hide', actor: pc.id }, fixedD20(15)).state;

    expect(state.eventLog).toContainEqual(expect.objectContaining({
      type: 'hide_resolved',
      combatant: pc.id,
      outcome: 'hidden',
    }));
    expect(state.searchMemories).toEqual([expect.objectContaining({
      observer: monster.id,
      target: pc.id,
      cause: 'hiding',
      lastKnownPosition: { column: 2, row: 0 },
    })]);
  });

  it('replays the same seed and command transcript to identical search events', () => {
    const run = () => {
      const pc = playerProfile('deterministic-target', { initiativeBonus: 20 });
      const monster = monsterProfile('deterministic-searcher', { initiativeBonus: -20 });
      const rng = mulberry32(0xD420);
      let state = createEncounter({
        bounds: { columns: 5, rows: 5 },
        combatants: [pc, monster],
        tokens: [placedToken(pc, 2, 2), placedToken(monster, 0, 2)],
      });
      const transcript: readonly EncounterCommand[] = [
        { type: 'roll_initiative' },
        invisibleSelf(pc),
        { type: 'end_turn', actor: pc.id },
        { type: 'end_turn', actor: monster.id },
      ];
      for (const command of transcript) state = reduceEncounter(state, command, rng).state;
      return state;
    };

    const first = run();
    const replayed = run();
    expect(canonicalJson(replayed.eventLog)).toBe(canonicalJson(first.eventLog));
    expect(canonicalJson(replayed.searchMemories)).toBe(canonicalJson(first.searchMemories));
  });
});
