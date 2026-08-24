import { describe, expect, it } from 'vitest';
import {
  combatantConditions,
  createEncounter,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { PersistentAreaInput, PersistentAreaMaterial } from '../../../src/combat/persistent-areas';
import {
  GREASE_MATERIAL,
  WEB_MATERIAL,
  persistentAreaContains,
} from '../../../src/combat/persistent-areas';
import { spellDefinition } from '../../../src/combat/spells/definitions';
import { feetPoint } from '../../../src/combat/templates';
import { damageType, dieSides, feet, type DamageType } from '../../../src/combat/values';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const NONFLAMMABLE_MATERIAL: PersistentAreaMaterial = {
  id: 'stone-dust',
  flammability: { kind: 'nonflammable' },
};

function faceOne(): number {
  return 0;
}

function setup(optionalRules: readonly 'flammable_grease'[] = []) {
  const owner = playerProfile('surface-owner', { initiativeBonus: 30, hitPoints: 30 });
  const fireDealer = playerProfile('surface-fire-dealer', { initiativeBonus: 20, hitPoints: 30 });
  const target = monsterProfile('surface-target', { initiativeBonus: 10, hitPoints: 30 });
  const state = reduceEncounter(createEncounter({
    config: { initiativeMode: 'per_combatant', optionalRules },
    bounds: { columns: 8, rows: 3 },
    combatants: [owner, fireDealer, target],
    tokens: [placedToken(owner, 0, 1), placedToken(fireDealer, 1, 1), placedToken(target, 3, 1)],
  }), { type: 'roll_initiative' }, faceOne).state;
  return { state, owner, fireDealer, target };
}

function webHooks(): PersistentAreaInput['hooks'] {
  return (['on_enter', 'on_start_of_turn_inside'] as const).map((hook) => ({
    hook,
    frequency: 'once_per_turn' as const,
    effect: {
      kind: 'save_gated' as const,
      ability: 'dexterity' as const,
      dc: 20,
      rollMode: 'normal' as const,
      onSuccess: 'none' as const,
      payload: {
        kind: 'effect' as const,
        payload: { kind: 'condition' as const, condition: 'Restrained' as const },
        lifetime: { kind: 'while_inside' as const },
      },
    },
  }));
}

function area(
  state: EncounterState,
  material: PersistentAreaMaterial,
  hooks: PersistentAreaInput['hooks'] = [],
): PersistentAreaInput {
  const owner = state.combatants[0]?.profile.id;
  const target = state.combatants[2]?.profile.id;
  if (owner === undefined || target === undefined) throw new Error('Surface fixture is incomplete.');
  return {
    owner,
    origin: { kind: 'fixed', point: feetPoint(15, 5) },
    shape: { kind: 'sphere', radius: feet(20) },
    duration: { kind: 'rounds', remaining: 10 },
    targetFilter: { kind: 'selected', combatants: [target] },
    difficultTerrain: true,
    material,
    hooks,
    movable: null,
  };
}

function createArea(
  state: EncounterState,
  input: PersistentAreaInput,
): EncounterState {
  return reduceEncounter(state, {
    type: 'create_persistent_area', actor: input.owner, area: input, cost: 'none',
  }, faceOne).state;
}

function advanceToFireDealer(
  state: EncounterState,
  owner: ReturnType<typeof playerProfile>,
): EncounterState {
  return reduceEncounter(state, { type: 'end_turn', actor: owner.id }, faceOne).state;
}

function dealDamage(
  state: EncounterState,
  actor: ReturnType<typeof playerProfile>,
  target: ReturnType<typeof monsterProfile>,
  type: DamageType,
): EncounterState {
  return reduceEncounter(state, {
    type: 'force_save', actor: actor.id, target: target.id,
    ability: 'dexterity', dc: 20, rollMode: 'normal', onSuccess: 'none', cost: 'none',
    damage: {
      terms: [{ type, dice: { count: 0, sides: dieSides(4), modifier: 1 } }],
      critical: false,
      responses: [],
    },
  }, faceOne).state;
}

function hitPoints(state: EncounterState, id: string): number {
  const subject = state.combatants.find((candidate) => candidate.profile.id === id);
  if (subject === undefined) throw new Error(`Missing combatant ${id}.`);
  return subject.hitPoints;
}

describe('D371.1 and D373.17 flammable persistent-area cells', () => {
  it('bundled Web is RAW-flammable while Grease is a default-off named optional rule', () => {
    const web = spellDefinition('web');
    const grease = spellDefinition('grease');
    expect(web?.operation).toMatchObject({
      kind: 'persistent_area', material: { id: 'webs', flammability: { kind: 'flammable' } },
    });
    expect(grease?.operation).toMatchObject({
      kind: 'persistent_area', material: {
        id: 'grease', flammability: { kind: 'optional_rule', rule: 'flammable_grease' },
      },
    });
  });

  it('ignition_ignores_exposure: fire ignites the exact exposed cube but not an unexposed neighbor', () => {
    const subject = setup();
    let state = createArea(subject.state, area(subject.state, WEB_MATERIAL));
    state = advanceToFireDealer(state, subject.owner);
    state = dealDamage(state, subject.fireDealer, subject.target, damageType('Fire'));
    const web = state.persistentAreas[0];
    if (web === undefined) throw new Error('Web area was not created.');
    const exposed = state.tokens.find((token) => token.combatantId === subject.target.id)?.position;
    if (exposed === undefined) throw new Error('Target token was not placed.');
    const neighbor = { column: exposed.column + 1, row: exposed.row };
    expect(persistentAreaContains(web, neighbor, null, state)).toBe(true);
    expect(web.burningCells.map((entry) => entry.cell)).toEqual([exposed]);
    expect(web.burningCells.some((entry) =>
      entry.cell.column === neighbor.column && entry.cell.row === neighbor.row)).toBe(false);

    state = reduceEncounter(state, { type: 'end_turn', actor: subject.fireDealer.id }, faceOne).state;
    expect(state.persistentAreas[0]?.burningCells.map((entry) => entry.cell)).toEqual([exposed]);
  });

  it('cold_ignites: non-fire damage in the same cell does not ignite while Fire damage does', () => {
    const run = (type: 'Cold' | 'Fire'): EncounterState => {
      const subject = setup();
      let state = createArea(subject.state, area(subject.state, WEB_MATERIAL));
      state = advanceToFireDealer(state, subject.owner);
      return dealDamage(state, subject.fireDealer, subject.target, damageType(type));
    };
    expect(run('Cold').persistentAreas[0]?.burningCells).toEqual([]);
    expect(run('Fire').persistentAreas[0]?.burningCells).toHaveLength(1);
  });

  it('same Fire event ignites flammable overlapping areas and leaves a nonflammable area unchanged', () => {
    const subject = setup();
    let state = createArea(subject.state, area(subject.state, WEB_MATERIAL));
    state = createArea(state, area(state, WEB_MATERIAL));
    state = createArea(state, area(state, NONFLAMMABLE_MATERIAL));
    state = advanceToFireDealer(state, subject.owner);
    state = dealDamage(state, subject.fireDealer, subject.target, damageType('Fire'));
    expect(state.persistentAreas.map((candidate) => candidate.burningCells.length)).toEqual([1, 1, 0]);
  });

  it('optional-rule flag off vs on: 2024 Grease stays nonflammable unless flammable_grease is enabled', () => {
    const run = (enabled: boolean): EncounterState => {
      const subject = setup(enabled ? ['flammable_grease'] : []);
      let state = createArea(subject.state, area(subject.state, GREASE_MATERIAL));
      state = advanceToFireDealer(state, subject.owner);
      return dealDamage(state, subject.fireDealer, subject.target, damageType('Fire'));
    };
    expect(run(false).persistentAreas[0]?.burningCells).toEqual([]);
    expect(run(true).persistentAreas[0]?.burningCells).toHaveLength(1);
  });

  it('burning Web deals exactly 2d4 Fire damage at start of turn', () => {
    const subject = setup();
    let state = createArea(subject.state, area(subject.state, WEB_MATERIAL));
    state = advanceToFireDealer(state, subject.owner);
    state = dealDamage(state, subject.fireDealer, subject.target, damageType('Fire'));
    expect(hitPoints(state, subject.target.id)).toBe(29);
    state = reduceEncounter(state, { type: 'end_turn', actor: subject.fireDealer.id }, faceOne).state;
    expect(hitPoints(state, subject.target.id)).toBe(27);
  });

  it('burn_lingers: an ignited cube burns away after exactly one full round', () => {
    const subject = setup();
    let state = createArea(subject.state, area(subject.state, WEB_MATERIAL));
    state = advanceToFireDealer(state, subject.owner);
    state = dealDamage(state, subject.fireDealer, subject.target, damageType('Fire'));
    const exposed = state.persistentAreas[0]?.burningCells[0]?.cell;
    if (exposed === undefined) throw new Error('Web cube did not ignite.');

    state = reduceEncounter(state, { type: 'end_turn', actor: subject.fireDealer.id }, faceOne).state;
    state = reduceEncounter(state, { type: 'end_turn', actor: subject.target.id }, faceOne).state;
    expect(state.persistentAreas[0]?.burningCells).toHaveLength(1);
    expect(state.persistentAreas[0]?.burnedAwayCells).toEqual([]);

    state = reduceEncounter(state, { type: 'end_turn', actor: subject.owner.id }, faceOne).state;
    expect(state.persistentAreas[0]?.burningCells).toEqual([]);
    expect(state.persistentAreas[0]?.burnedAwayCells).toEqual([exposed]);
  });

  it('restraint_survives_burn: Web restraint ends when its burned cube burns away', () => {
    const subject = setup();
    let state = createArea(subject.state, area(subject.state, WEB_MATERIAL, webHooks()));
    expect(combatantConditions(state, subject.target.id).map((condition) => condition.name)).toContain('Restrained');
    state = advanceToFireDealer(state, subject.owner);
    state = dealDamage(state, subject.fireDealer, subject.target, damageType('Fire'));
    state = reduceEncounter(state, { type: 'end_turn', actor: subject.fireDealer.id }, faceOne).state;
    state = reduceEncounter(state, { type: 'end_turn', actor: subject.target.id }, faceOne).state;
    expect(combatantConditions(state, subject.target.id).map((condition) => condition.name)).toContain('Restrained');

    state = reduceEncounter(state, { type: 'end_turn', actor: subject.owner.id }, faceOne).state;
    expect(combatantConditions(state, subject.target.id).map((condition) => condition.name)).not.toContain('Restrained');
  });
});
