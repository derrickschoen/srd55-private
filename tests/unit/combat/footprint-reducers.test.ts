import { describe, expect, it } from 'vitest';
import { combatToken, type CombatantProfile } from '../../../src/combat/combatant';
import {
  autoRelocatePlacement,
  normalPlacementFor,
  sizedCombatantState,
} from '../../../src/combat/creature-space';
import { createEncounter, EncounterRuleError, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterEffect } from '../../../src/combat/effects';
import { referencePartySpellSlots } from '../../../src/combat/spells/resources';
import type { SpellCastCommand } from '../../../src/combat/spells/types';
import { effectStackingIdentity, encounterEffectId, type CombatantId } from '../../../src/combat/values';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import { wholeBodyMovementCandidates } from '../../../src/vtt/engine-query-port';
import { generateRoom } from '../../../src/vtt/room-generator';
import { movedTo } from '../../helpers/board-cell';
import { homebrewSpellPack } from '../../helpers/shape-curse-pack';
import { declareTestInputs } from '../../helpers/test-inputs';
import { monsterProfile, playerProfile } from './fixtures';

// FOOTPRINT (owner D900): the reducers mint every token they move or place, so a body past the edge is never built
// (W6-W10, W9b, W12, W12b, W12c). Every expected anchor is hand-derived: D514 orders candidates by Chebyshev distance
// from the previous anchor, then by row, then by column; a Large body is 2 x 2 and a Huge one 3 x 3 (D511).

const PACK = 'tests/fixtures/content-pack-v1-homebrew.json';
const inputs = declareTestInputs({ fixtures: [PACK] });
const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

function sized(key: string, size: 'Medium' | 'Large' | 'Huge', initiativeBonus = -10): CombatantProfile {
  const base = monsterProfile(key, { initiativeBonus });
  return { ...base, rules: { ...base.rules, sizeCategory: size } };
}

/** The value `action` returns, asserting that it does not throw (a refusal here is an assertion failure). */
function accepted<T>(action: () => T): T {
  let value: T | undefined;
  expect(() => { value = action(); }).not.toThrow();
  return value as T;
}

function tokenOf(state: EncounterState, id: CombatantId) {
  return state.tokens.find((token) => token.combatantId === id);
}

function sizeStep(caster: CombatantProfile, target: CombatantProfile, operation: 'enlarge' | 'reduce'): SpellCastCommand {
  return {
    type: 'cast_spell', actor: caster.id, spellId: 'enlarge-reduce', slotLevel: 2, castAsRitual: false,
    casterLevel: 3, attackBonus: 5, saveDc: 13, spellcastingModifier: 3, targets: [target.id], area: null,
    weaponAttack: null, selectedOption: { kind: 'size_step', operation },
  };
}

/** `state` with `target` banished by `caster`'s concentration: its token becomes an absent token (a return origin). */
function banished(state: EncounterState, caster: CombatantProfile, target: CombatantId): EncounterState {
  const token = tokenOf(state, target);
  if (token === undefined) throw new Error('The banished creature has no token.');
  const effect: EncounterEffect = {
    id: encounterEffectId('effect:footprint-banishment'), source: caster.id, targets: [target], createdRevision: state.revision,
    duration: { kind: 'permanent' }, concentrationOwner: caster.id,
    stackingIdentity: effectStackingIdentity('footprint:banishment'), stacking: 'replace_same_source', repeatedSave: null,
    payload: {
      kind: 'temporary_banishment', returnPlacement: 'previous_or_nearest_unoccupied',
      returnDamage: { terms: [], critical: false, responses: [] },
    },
  };
  return {
    ...state,
    tokens: state.tokens.filter((candidate) => candidate.combatantId !== target),
    absentTokens: [...(state.absentTokens ?? []), token],
    effects: [...state.effects, effect],
  };
}

describe('FOOTPRINT: the reducers place whole bodies only', () => {
  it('W6: a Medium at (9,0) on 10 columns, Enlarged, becomes a Large at (8,0)', () => {
    // A Large at (9,0) covers columns 9-10: off the grid. Distance 1, row 0 first: (8,0) covers 8-9 x 0-1, free.
    const caster = playerProfile('w6-caster', { initiativeBonus: 100, spellSlots: referencePartySpellSlots('Wizard') });
    const target = sized('w6-target', 'Medium');
    const created = createEncounter({
      bounds: { columns: 10, rows: 4 }, combatants: [caster, target],
      tokens: [combatToken(caster, { column: 6, row: 2 }), combatToken(target, { column: 9, row: 0 })],
    });
    const started = reduceEncounter(created, { type: 'roll_initiative' }, () => 0.5).state;
    const grown = accepted(() => reduceEncounter(started, sizeStep(caster, target, 'enlarge'), () => 0.5).state);
    expect(tokenOf(grown, target.id)).toMatchObject({ position: { column: 8, row: 0 }, placementMode: { kind: 'normal', actual: 'Large' } });
  });

  it('W7: a Large reduced and banished comes back Large when Reduce ends while it is away', () => {
    // 10 x 4, walls (8,0) (9,0). The Large starts at (8,1); Reduce makes it Medium there; it steps to (9,1) and is
    // banished. Reduce ends while it is absent; the banishment ends: its stored mode {normal, Medium} is not of its
    // size (Large), so it returns {normal, Large} from (9,1): distance 0 covers column 10; distance 1, row 0:
    // (8,0) and (9,0) are walls; row 1: (8,1) covers 8-9 x 1-2, free.
    const reducer = playerProfile('w7-reducer', { initiativeBonus: 100, spellSlots: referencePartySpellSlots('Wizard') });
    const banisher = playerProfile('w7-banisher', { initiativeBonus: 50 });
    const target = sized('w7-target', 'Large');
    const created = createEncounter({
      bounds: { columns: 10, rows: 4 }, combatants: [reducer, banisher, target],
      tokens: [combatToken(reducer, { column: 5, row: 1 }), combatToken(banisher, { column: 0, row: 3 }), combatToken(target, { column: 8, row: 1 })],
      blockedCells: [{ column: 8, row: 0 }, { column: 9, row: 0 }],
    });
    const started = reduceEncounter(created, { type: 'roll_initiative' }, () => 0.5).state;
    const reduced = reduceEncounter(started, sizeStep(reducer, target, 'reduce'), () => 0.5).state;
    expect(tokenOf(reduced, target.id)).toMatchObject({ position: { column: 8, row: 1 }, placementMode: { kind: 'normal', actual: 'Medium' } });
    const stepped: EncounterState = { ...reduced, tokens: reduced.tokens.map((token) => token.combatantId === target.id ? movedTo(reduced, token, { column: 9, row: 1 }) : token) };
    const away = banished(stepped, banisher, target.id);
    const reduceEnded = accepted(() => reduceEncounter(away, { type: 'end_concentration', actor: reducer.id }, () => 0.5).state);
    expect(reduceEnded.absentTokens?.[0]).toMatchObject({ position: { column: 9, row: 1 }, placementMode: { kind: 'normal', actual: 'Medium' } });
    // The banisher acts next (initiative 50 after 100) and ends its concentration.
    const banisherTurn = reduceEncounter(reduceEnded, { type: 'end_turn', actor: reducer.id }, () => 0.5).state;
    const returned = accepted(() => reduceEncounter(banisherTurn, { type: 'end_concentration', actor: banisher.id }, () => 0.5).state);
    expect(tokenOf(returned, target.id)).toMatchObject({ position: { column: 8, row: 1 }, placementMode: { kind: 'normal', actual: 'Large' } });
    expect(returned.absentTokens ?? []).toEqual([]);
  });

  it('W8: a Large pushed 15 ft east from (6,2) on 10 columns stops at (8,2), where the grid ends', () => {
    // Away from the caster at (4,2): east. (7,2) covers 7-8, (8,2) covers 8-9, (9,2) would cover column 10.
    const pack = homebrewSpellPack(JSON.parse(inputs.fixtures.readText(PACK)) as Record<string, unknown>, 'footprint-shove', [{
      recordId: 'shove-wave', concentration: false,
      targeting: { kind: 'single', rangeFeet: 30, willing: false },
      operation: { kind: 'forced_movement', direction: 'away', origin: 'caster', distanceFeet: 15, save: null },
    }]);
    const caster = playerProfile('w8-caster', { initiativeBonus: 100, spellSlots: [{ level: 1, maximum: 4 }] });
    const large = sized('w8-large', 'Large');
    const medium = sized('w8-medium', 'Medium');
    const created = createEncounter({
      bounds: { columns: 10, rows: 5 }, contentPacks: [pack], combatants: [caster, large, medium],
      tokens: [combatToken(caster, { column: 4, row: 2 }), combatToken(large, { column: 6, row: 2 }), combatToken(medium, { column: 0, row: 0 })],
    });
    const started = reduceEncounter(created, { type: 'roll_initiative' }, () => 0.5).state;
    const push = (target: CombatantProfile): SpellCastCommand => ({
      type: 'cast_spell', actor: caster.id, spellId: 'greenforge:shove-wave', slotLevel: 1, castAsRitual: false,
      casterLevel: 5, attackBonus: 6, saveDc: 14, spellcastingModifier: 3, targets: [target.id], area: null,
      weaponAttack: null, selectedOption: null,
    });
    const pushed = accepted(() => reduceEncounter(started, push(large), () => 0.5));
    expect(pushed.events).toContainEqual(expect.objectContaining({
      type: 'movement_completed', combatant: large.id, path: [{ column: 7, row: 2 }, { column: 8, row: 2 }],
    }));
    expect(tokenOf(pushed.state, large.id)?.position).toEqual({ column: 8, row: 2 });
    // The north-west corner stops a push the same way: away from (4,2), the Medium at (0,0) would step to (-1,-1).
    const cornered = accepted(() => reduceEncounter(started, push(medium), () => 0.5));
    expect(cornered.events).toContainEqual(expect.objectContaining({ type: 'movement_completed', combatant: medium.id, path: [] }));
    expect(tokenOf(cornered.state, medium.id)?.position).toEqual({ column: 0, row: 0 });
  });

  it('W9: a Large teleported to a destination its body does not fit is refused with the typed destination refusal', () => {
    // A Large at (0,0) on 10 x 2 teleports itself: (9,0) would cover column 10; (8,0) fits.
    const pack = homebrewSpellPack(JSON.parse(inputs.fixtures.readText(PACK)) as Record<string, unknown>, 'footprint-skip', [{
      recordId: 'skip', concentration: false,
      targeting: { kind: 'single', rangeFeet: 150, willing: true },
      operation: {
        kind: 'teleport', subject: 'caster', maximumDistanceFeet: 60,
        destination: { requireUnoccupied: true, requireOccupiable: true, requireLineOfSight: false },
      },
    }]);
    const base = playerProfile('w9-teleporter', { initiativeBonus: 100, spellSlots: [{ level: 1, maximum: 4 }] });
    const teleporter = { ...base, rules: { ...base.rules, sizeCategory: 'Large' as const } };
    const created = createEncounter({
      bounds: { columns: 10, rows: 2 }, contentPacks: [pack], combatants: [teleporter],
      tokens: [combatToken(teleporter, { column: 0, row: 0 })],
    });
    const started = reduceEncounter(created, { type: 'roll_initiative' }, () => 0.5).state;
    const skip = (column: number): SpellCastCommand => ({
      type: 'cast_spell', actor: teleporter.id, spellId: 'greenforge:skip', slotLevel: 1, castAsRitual: false,
      casterLevel: 5, attackBonus: 6, saveDc: 14, spellcastingModifier: 3, targets: [teleporter.id], area: null,
      weaponAttack: null, selectedOption: null, spatialPoint: { column, row: 0 },
    });
    expect(() => reduceEncounter(started, skip(9), () => 0.5)).toThrowError(EncounterRuleError);
    expect(() => reduceEncounter(started, skip(9), () => 0.5)).toThrow(/unoccupied, occupiable destination/u);
    expect(tokenOf(accepted(() => reduceEncounter(started, skip(8), () => 0.5).state), teleporter.id)?.position).toEqual({ column: 8, row: 0 });
  });

  it('W9b: a Large summoned where its body would leave the grid is refused with the summon destination refusal', () => {
    // 10 x 4, the caster at (5,1). A Large at (9,1) would cover column 10; (8,1) covers 8-9 x 1-2, free, 15 ft away.
    const source = JSON.parse(inputs.fixtures.readText(PACK)) as Record<string, unknown> & { monsters: { statblock: Record<string, unknown> }[] };
    const monster = source.monsters[0];
    if (monster === undefined) throw new Error('The homebrew pack fixture has no monster.');
    monster.statblock = { ...monster.statblock, sizeCategory: 'Large' };
    const pack = homebrewSpellPack(source, 'footprint-summon', [{
      recordId: 'call-large', concentration: true,
      targeting: { kind: 'utility', rangeFeet: 30 },
      operation: {
        kind: 'summon', monsterId: 'brassleaf-mote', count: { kind: 'fixed', count: 1 }, placementRangeFeet: 30,
        lifecycle: { concentration: true, durationRounds: 10, expiresAt: 'source_start' },
      },
    }]);
    const caster = playerProfile('w9b-caster', { initiativeBonus: 100, spellSlots: [{ level: 1, maximum: 4 }] });
    const other = sized('w9b-other', 'Medium');
    const created = createEncounter({
      bounds: { columns: 10, rows: 4 }, contentPacks: [pack], combatants: [caster, other],
      tokens: [combatToken(caster, { column: 5, row: 1 }), combatToken(other, { column: 0, row: 3 })],
    });
    const started = reduceEncounter(created, { type: 'roll_initiative' }, () => 0.5).state;
    const summon = (column: number): SpellCastCommand => ({
      type: 'cast_spell', actor: caster.id, spellId: 'greenforge:call-large', slotLevel: 1, castAsRitual: false,
      casterLevel: 5, attackBonus: 6, saveDc: 14, spellcastingModifier: 3, targets: [], area: null,
      weaponAttack: null, selectedOption: null, summonDestinations: [{ column, row: 1 }],
    });
    expect(() => reduceEncounter(started, summon(9), () => 0.5)).toThrowError(EncounterRuleError);
    expect(() => reduceEncounter(started, summon(9), () => 0.5)).toThrow(/summon destination is not an occupiable cell/u);
    const summoned = accepted(() => reduceEncounter(started, summon(8), () => 0.5).state);
    expect(summoned.tokens.filter((token) => token.combatantId !== caster.id && token.combatantId !== other.id)).toEqual([
      expect.objectContaining({ position: { column: 8, row: 1 }, placementMode: { kind: 'normal', actual: 'Large' } }),
    ]);
  });

  it('W10: a Large actor one column from the east edge has 5 whole-body movement candidates of its 8 neighbours', () => {
    // Large at (8,2) on 10 x 6: its neighbours in column 9 would cover column 10. Rows 1-3 keep rows <= 4.
    const actor = sized('w10-large', 'Large');
    const pc = playerProfile('w10-pc', { initiativeBonus: 20 });
    const state = createEncounter({
      bounds: { columns: 10, rows: 6 }, combatants: [actor, pc],
      tokens: [combatToken(actor, { column: 8, row: 2 }), combatToken(pc, { column: 0, row: 5 })],
    });
    expect(wholeBodyMovementCandidates(state, actor.id, { column: 8, row: 2 })).toEqual([
      { column: 7, row: 1 }, { column: 8, row: 1 }, { column: 7, row: 2 }, { column: 7, row: 3 }, { column: 8, row: 3 },
    ]);
    const options = accepted(() => OFFER_ENVIRONMENT.queries.movementOptions(state, actor.id, pc.id, 'attack'));
    expect(options?.candidates.every((candidate) => candidate.destination.column <= 8) ?? true).toBe(true);
  });

  it('W12: the generator places seed 6203009 monster-3 at (16,2), and every brutal room of seeds 1..200 fits', () => {
    // Its preferred anchor (17,3) overhangs 19 columns; distance 1, row 2 first: (16,2), clear of monster-1 at (17,1)
    // and monster-2 (a Medium Ghost before D466) at (16,1).
    const room = generateRoom(6_203_009, { difficulty: 'brutal' });
    expect(room.encounter.state.tokens.find((token) => token.combatantId === 'combatant:generated-6203009-monster-3')?.position)
      .toEqual({ column: 16, row: 2 });
    for (let seed = 1; seed <= 200; seed += 1) {
      accepted(() => generateRoom(seed, { difficulty: 'brutal' }));
    }
  });

  it('W12b: D514 breaks a distance tie row-major: (2,1) before (1,2), which column-major would take', () => {
    const medium = sizedCombatantState('Medium');
    const legal = new Set(['2,1', '1,2', '3,3']);
    const relocated = autoRelocatePlacement(medium, { column: 1, row: 1 }, normalPlacementFor(medium), { columns: 4, rows: 4 },
      (space) => legal.has(`${String(space.anchor.column)},${String(space.anchor.row)}`));
    expect(relocated.kind === 'placed' ? relocated.placement.anchor : null).toEqual({ column: 2, row: 1 });
  });

  it('W12c: a banished Medium returns row-major to (2,1) when another Medium took its (1,1)', () => {
    // 4 x 4, walls (0,0) (1,0) (2,0) (0,1) (0,2). Distance 1 around (1,1), row-major: four walls, then (2,1) free.
    // Column-major would reach (1,2) first ((0,0) (0,1) (0,2) (1,0) are walls).
    const banisher = playerProfile('w12c-banisher', { initiativeBonus: 100 });
    const away = sized('w12c-away', 'Medium');
    const taker = sized('w12c-taker', 'Medium');
    const created = createEncounter({
      bounds: { columns: 4, rows: 4 }, combatants: [banisher, away, taker],
      tokens: [combatToken(banisher, { column: 3, row: 0 }), combatToken(away, { column: 1, row: 1 }), combatToken(taker, { column: 3, row: 3 })],
      blockedCells: [{ column: 0, row: 0 }, { column: 1, row: 0 }, { column: 2, row: 0 }, { column: 0, row: 1 }, { column: 0, row: 2 }],
    });
    const started = reduceEncounter(created, { type: 'roll_initiative' }, () => 0.5).state;
    const gone = banished(started, banisher, away.id);
    const taken: EncounterState = { ...gone, tokens: gone.tokens.map((token) => token.combatantId === taker.id ? movedTo(gone, token, { column: 1, row: 1 }) : token) };
    const returned = accepted(() => reduceEncounter(taken, { type: 'end_concentration', actor: banisher.id }, () => 0.5).state);
    expect(tokenOf(returned, away.id)).toMatchObject({ position: { column: 2, row: 1 }, placementMode: { kind: 'normal', actual: 'Medium' } });
  });
});

