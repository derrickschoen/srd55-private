import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { EncounterRuleError, createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterCommand, EncounterEvent } from '../../../src/combat/events';
import type { SpellOperation } from '../../../src/combat/spells/types';
import { damageType, feet } from '../../../src/combat/values';
import { feetPoint, type AreaTemplate } from '../../../src/combat/templates';
import { loadContentPack, type LoadedContentPack } from '../../../src/content/content-pack';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

interface SpellSpec {
  readonly id: string;
  readonly operation: SpellOperation;
  readonly targeting?: Readonly<Record<string, unknown>>;
}

function packWithSpells(specs: readonly SpellSpec[]): LoadedContentPack {
  const fixture = JSON.parse(readFileSync('tests/fixtures/content-pack-v1-homebrew.json', 'utf8')) as {
    readonly spells: readonly Readonly<Record<string, unknown>>[];
    readonly [key: string]: unknown;
  };
  const template = fixture.spells[0];
  if (template === undefined) throw new Error('Content-pack spell fixture is missing.');
  const result = loadContentPack({
    ...fixture,
    spells: specs.map((spec) => ({
      ...template,
      recordId: spec.id,
      name: spec.id,
      targeting: spec.targeting ?? { kind: 'single', rangeFeet: 150, willing: true },
      operation: spec.operation,
    })),
  });
  if (result.status !== 'loaded') throw new Error(`Spatial fixture refused: ${result.refusal.reason}`);
  return result.content;
}

function command(
  actor: ReturnType<typeof playerProfile>,
  spellId: string,
  targets: readonly ReturnType<typeof playerProfile>['id'][],
  options: { readonly spatialPoint?: { readonly column: number; readonly row: number }; readonly area?: AreaTemplate } = {},
): EncounterCommand {
  return {
    type: 'cast_spell', actor: actor.id, spellId: `greenforge:${spellId}`, slotLevel: 1,
    castAsRitual: false, casterLevel: 5, attackBonus: 8, saveDc: 15,
    spellcastingModifier: 4, targets, area: options.area ?? null, weaponAttack: null,
    selectedOption: null,
    ...(options.spatialPoint === undefined ? {} : { spatialPoint: options.spatialPoint }),
  };
}

function initiative(state: EncounterState): EncounterState {
  return reduceEncounter(state, { type: 'roll_initiative' }, () => 0).state;
}

function cast(state: EncounterState, castCommand: EncounterCommand): { readonly state: EncounterState; readonly events: readonly EncounterEvent[] } {
  return reduceEncounter(state, castCommand, () => 0);
}

function endTurn(state: EncounterState, actor: ReturnType<typeof playerProfile>): EncounterState {
  return reduceEncounter(state, { type: 'end_turn', actor: actor.id }, () => 0).state;
}

function position(state: EncounterState, id: ReturnType<typeof playerProfile>['id']): { readonly column: number; readonly row: number } {
  const placed = state.tokens.find((token) => token.combatantId === id);
  if (placed === undefined) throw new Error(`Missing token ${id}.`);
  return placed.position;
}

function adjudicatePosition(
  state: EncounterState,
  target: ReturnType<typeof playerProfile>,
  to: { readonly column: number; readonly row: number },
): ReturnType<typeof reduceEncounter> {
  return reduceEncounter(state, {
    type: 'adjudicate', target: target.id, subject: 'persistent-area test relocation',
    reasoning: 'Exercise multiple area-entry hooks without advancing the active turn.',
    consequence: { kind: 'relocate', to },
  }, () => 0);
}

function movementRegion(
  id: string,
  cells: readonly { readonly column: number; readonly row: number }[],
  entry: 'allowed' | 'blocked',
  damage: boolean,
): SpellOperation {
  return {
    kind: 'movement_region', region: { id, cells }, difficultTerrain: damage, entry,
    damage: damage ? {
      damageType: damageType('Piercing'), dice: { count: 1, sides: 4, modifier: 0 },
      unitFeet: 5, partialUnit: 'completed_units_only',
    } : null,
  };
}

const persistentHook: SpellOperation = {
  kind: 'persistent_area', origin: 'anchored_to_caster',
  shape: { kind: 'emanation', radius: feet(0) }, durationRounds: 10, concentration: false,
  targetFilter: 'selected', includeOwner: false, difficultTerrain: false, movableFeet: null,
  hooks: [{
    hook: 'on_enter', frequency: 'every_trigger',
    effect: {
      kind: 'automatic', payload: {
        kind: 'damage', damageType: damageType('Piercing'),
        dice: { baseCount: 1, sides: 4, modifier: 0, perSlotCount: 0, perSlotModifier: 0, cantripUpgrade: false },
      },
    },
  }],
  initialEffects: [],
};

describe('CAP-IMP-009 imported spatial movement operations', () => {
  it('persistent_area_once_per_turn_is_scoped_per_target_same_turn: two targets each fire once while repeat entry is suppressed', () => {
    const pack = packWithSpells([{
      id: 'per-target-hook-field',
      targeting: { kind: 'area', rangeFeet: 60, shape: 'sphere', baseSizeFeet: 3, sizePerSlotFeet: 0 },
      operation: {
        kind: 'persistent_area', origin: 'selected_when_cast', shape: null,
        durationRounds: 3, concentration: false, targetFilter: 'all', includeOwner: false,
        difficultTerrain: false, movableFeet: null,
        hooks: [{
          hook: 'on_enter', frequency: 'once_per_turn',
          effect: {
            kind: 'automatic', payload: {
              kind: 'damage', damageType: damageType('Piercing'),
              dice: { baseCount: 1, sides: 4, modifier: 0, perSlotCount: 0, perSlotModifier: 0, cantripUpgrade: false },
            },
          },
        }],
        initialEffects: [],
      },
    }]);
    const caster = playerProfile('per-target-area-caster', {
      initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }],
    });
    const first = monsterProfile('per-target-area-first', { initiativeBonus: -10, hitPoints: 20 });
    const second = monsterProfile('per-target-area-second', { initiativeBonus: -20, hitPoints: 20 });
    let state = initiative(createEncounter({
      bounds: { columns: 16, rows: 3 }, combatants: [caster, first, second],
      tokens: [placedToken(caster, 10), placedToken(first, 0), placedToken(second, 0, 2)],
      contentPacks: [pack],
    }));
    state = cast(state, command(caster, 'per-target-hook-field', [], {
      area: { shape: 'sphere', template: { origin: feetPoint(15, 5), radius: feet(3) } },
    })).state;

    state = adjudicatePosition(state, first, { column: 2, row: 1 }).state;
    expect(state.combatants.find(({ profile }) => profile.id === first.id)?.hitPoints).toBe(19);
    state = adjudicatePosition(state, first, { column: 1, row: 1 }).state;
    state = adjudicatePosition(state, second, { column: 2, row: 1 }).state;
    expect(state.combatants.find(({ profile }) => profile.id === second.id)?.hitPoints).toBe(19);
    state = adjudicatePosition(state, second, { column: 1, row: 2 }).state;
    const repeated = adjudicatePosition(state, first, { column: 2, row: 1 });

    expect(repeated.state.combatants.find(({ profile }) => profile.id === first.id)?.hitPoints).toBe(19);
    expect(repeated.state.combatants.find(({ profile }) => profile.id === second.id)?.hitPoints).toBe(19);
    expect(repeated.events.filter((event) => event.type === 'damage_applied')).toEqual([]);
  });

  it('teleport_range_boundary: accepts a destination exactly at maximumDistanceFeet and refuses one grid step beyond', () => {
    const pack = packWithSpells([{
      id: 'silver-skip',
      operation: {
        kind: 'teleport', subject: 'caster', maximumDistanceFeet: 30,
        destination: { requireUnoccupied: true, requireOccupiable: true, requireLineOfSight: true },
      },
    }]);
    const teleporter = playerProfile('range-boundary-teleporter', {
      initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }],
    });
    const state = initiative(createEncounter({
      bounds: { columns: 8, rows: 1 }, combatants: [teleporter],
      tokens: [placedToken(teleporter, 0)], contentPacks: [pack],
    }));

    expect(() => cast(state, command(teleporter, 'silver-skip', [teleporter.id], {
      spatialPoint: { column: 7, row: 0 },
    }))).toThrowError(EncounterRuleError);
    expect(() => cast(state, command(teleporter, 'silver-skip', [teleporter.id], {
      spatialPoint: { column: 7, row: 0 },
    }))).toThrowError('silver-skip requires an unoccupied, occupiable destination satisfying its declared constraint.');

    const exact = cast(state, command(teleporter, 'silver-skip', [teleporter.id], {
      spatialPoint: { column: 6, row: 0 },
    }));
    expect(position(exact.state, teleporter.id)).toEqual({ column: 6, row: 0 });
  });

  it('teleport_traverses_cells: teleports to an occupiable visible cell without firing intervening on_enter hooks', () => {
    const pack = packWithSpells([
      { id: 'hook-field', operation: persistentHook },
      {
        id: 'silver-skip',
        operation: {
          kind: 'teleport', subject: 'caster', maximumDistanceFeet: 30,
          destination: { requireUnoccupied: true, requireOccupiable: true, requireLineOfSight: true },
        },
      },
    ]);
    const creator = playerProfile('teleport-area-creator', { initiativeBonus: 30, spellSlots: [{ level: 1, maximum: 1 }] });
    const teleporter = playerProfile('teleporter', { hitPoints: 20, initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
    let state = initiative(createEncounter({
      bounds: { columns: 6, rows: 2 }, combatants: [creator, teleporter],
      tokens: [placedToken(creator, 3, 1), placedToken(teleporter, 0)], contentPacks: [pack],
    }));
    state = cast(state, command(creator, 'hook-field', [teleporter.id])).state;
    state = endTurn(state, creator);
    expect(() => cast(state, command(teleporter, 'silver-skip', [teleporter.id], { spatialPoint: { column: 3, row: 1 } }))).toThrow(/unoccupied, occupiable destination/u);
    const result = cast(state, command(teleporter, 'silver-skip', [teleporter.id], { spatialPoint: { column: 4, row: 0 } }));

    expect(position(result.state, teleporter.id)).toEqual({ column: 4, row: 0 });
    expect(result.state.combatants.find(({ profile }) => profile.id === teleporter.id)?.hitPoints).toBe(20);
    expect(result.events.some((event) => event.type === 'persistent_area_triggered')).toBe(false);
  });

  it('push_ignores_obstacle: forced movement traverses entered cells and stops before a blocking cell', () => {
    const pack = packWithSpells([
      { id: 'thorn-strip', operation: movementRegion('thorn-strip', [{ column: 2, row: 0 }], 'allowed', true) },
      {
        id: 'force-wave', operation: {
          kind: 'forced_movement', direction: 'away', origin: 'caster', distanceFeet: 15, save: null,
        },
      },
    ]);
    const regionCaster = playerProfile('region-caster', { initiativeBonus: 30, spellSlots: [{ level: 1, maximum: 1 }] });
    const pusher = playerProfile('pusher', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
    const target = monsterProfile('pushed-target', { hitPoints: 20, initiativeBonus: 0 });
    let state = initiative(createEncounter({
      bounds: { columns: 6, rows: 2 }, blockedCells: [{ column: 3, row: 0 }],
      combatants: [regionCaster, pusher, target],
      tokens: [placedToken(regionCaster, 5, 1), placedToken(pusher, 0), placedToken(target, 1)], contentPacks: [pack],
    }));
    state = cast(state, command(regionCaster, 'thorn-strip', [pusher.id])).state;
    state = endTurn(state, regionCaster);
    const result = cast(state, command(pusher, 'force-wave', [target.id]));

    expect(position(result.state, target.id)).toEqual({ column: 2, row: 0 });
    expect(result.state.combatants.find(({ profile }) => profile.id === target.id)?.hitPoints).toBe(19);
    expect(result.events.find((event) => event.type === 'movement_completed')).toMatchObject({
      path: [{ column: 2, row: 0 }], spent: 0,
    });
  });

  it('movement_damage_off_by_one: charges each completed 5-foot cell and refuses an impassable region', () => {
    const pack = packWithSpells([
      { id: 'sealed-cell', operation: movementRegion('sealed-cell', [{ column: 3, row: 0 }], 'blocked', false) },
      { id: 'spike-lane', operation: movementRegion('spike-lane', [{ column: 1, row: 0 }, { column: 2, row: 0 }], 'allowed', true) },
    ]);
    const sealer = playerProfile('sealer', { initiativeBonus: 30, spellSlots: [{ level: 1, maximum: 1 }] });
    const mover = playerProfile('hazard-mover', { hitPoints: 20, initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
    let state = initiative(createEncounter({
      bounds: { columns: 6, rows: 2 }, combatants: [sealer, mover],
      tokens: [placedToken(sealer, 5, 1), placedToken(mover, 0)], contentPacks: [pack],
    }));
    state = cast(state, command(sealer, 'sealed-cell', [mover.id])).state;
    state = endTurn(state, sealer);
    state = cast(state, command(mover, 'spike-lane', [mover.id])).state;
    const moved = reduceEncounter(state, {
      type: 'move', actor: mover.id, cause: 'voluntary', path: [{ column: 1, row: 0 }, { column: 2, row: 0 }],
    }, () => 0);

    expect(moved.state.combatants.find(({ profile }) => profile.id === mover.id)?.hitPoints).toBe(18);
    expect(moved.events.filter((event) => event.type === 'damage_applied')).toHaveLength(2);
    expect(() => reduceEncounter(moved.state, {
      type: 'move', actor: mover.id, cause: 'voluntary', path: [{ column: 3, row: 0 }],
    }, () => 0)).toThrow(/blocked_step/u);
  });

  it('pulls toward a selected origin and ignores an incomplete trailing 5-foot increment', () => {
    const pack = packWithSpells([
      { id: 'pull-thorns', operation: movementRegion('pull-thorns', [{ column: 2, row: 0 }], 'allowed', true) },
      {
        id: 'gravity-tug', operation: {
          kind: 'forced_movement', direction: 'toward', origin: 'selected_point', distanceFeet: 7, save: null,
        },
      },
    ]);
    const regionCaster = playerProfile('pull-region', { initiativeBonus: 30, spellSlots: [{ level: 1, maximum: 1 }] });
    const puller = playerProfile('puller', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
    const target = monsterProfile('pulled-target', { hitPoints: 20, initiativeBonus: 0 });
    let state = initiative(createEncounter({
      bounds: { columns: 7, rows: 2 }, combatants: [regionCaster, puller, target],
      tokens: [placedToken(regionCaster, 6, 1), placedToken(puller, 5, 1), placedToken(target, 3)], contentPacks: [pack],
    }));
    state = cast(state, command(regionCaster, 'pull-thorns', [puller.id])).state;
    state = endTurn(state, regionCaster);
    const result = cast(state, command(puller, 'gravity-tug', [target.id], { spatialPoint: { column: 0, row: 0 } }));

    expect(position(result.state, target.id)).toEqual({ column: 2, row: 0 });
    expect(result.state.combatants.find(({ profile }) => profile.id === target.id)?.hitPoints).toBe(19);
    expect(result.events.filter((event) => event.type === 'damage_applied')).toHaveLength(1);
  });

  it('movement_damage_partial_unit_boundary: a 4-foot forced move completes zero 5-foot units and deals no region damage', () => {
    const pack = packWithSpells([
      { id: 'thorn-cell', operation: movementRegion('partial-unit-thorns', [{ column: 2, row: 0 }], 'allowed', true) },
      {
        id: 'short-push', operation: {
          kind: 'forced_movement', direction: 'away', origin: 'caster', distanceFeet: 4, save: null,
        },
      },
    ]);
    const regionCaster = playerProfile('partial-region-caster', { initiativeBonus: 30, spellSlots: [{ level: 1, maximum: 1 }] });
    const pusher = playerProfile('partial-pusher', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
    const target = monsterProfile('partial-push-target', { hitPoints: 20, initiativeBonus: 0 });
    let state = initiative(createEncounter({
      bounds: { columns: 6, rows: 2 }, combatants: [regionCaster, pusher, target],
      tokens: [placedToken(regionCaster, 5, 1), placedToken(pusher, 0), placedToken(target, 1)], contentPacks: [pack],
    }));
    state = cast(state, command(regionCaster, 'thorn-cell', [target.id])).state;
    state = endTurn(state, regionCaster);
    const result = cast(state, command(pusher, 'short-push', [target.id]));

    expect(position(result.state, target.id)).toEqual({ column: 1, row: 0 });
    expect(result.state.combatants.find(({ profile }) => profile.id === target.id)?.hitPoints).toBe(20);
    expect(result.events.filter((event) => event.type === 'damage_applied')).toHaveLength(0);
    expect(result.events.find((event) => event.type === 'movement_completed')).toMatchObject({ path: [] });
  });

  it('flight_ignores_immunity: an imported flying-speed grant pays normal cost in difficult terrain', () => {
    const pack = packWithSpells([{
      id: 'sky-step', operation: {
        kind: 'movement_mode', grants: [{ mode: 'flying', speed: { kind: 'fixed', feet: 60 } }],
        difficultTerrainImmunity: false, magicalSpeedReductionImmunity: false,
        durationRounds: 10, concentration: true, expiresAt: 'source_start',
      },
    }]);
    const flyer = playerProfile('flyer', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
    let state = initiative(createEncounter({
      bounds: { columns: 6, rows: 1 }, combatants: [flyer], tokens: [placedToken(flyer, 0)], contentPacks: [pack],
      environment: {
        lightRegions: [], difficultTerrainRegions: [{ id: 'mire', cells: [{ column: 1, row: 0 }] }], movementRegions: [],
      },
    }));
    state = cast(state, command(flyer, 'sky-step', [flyer.id])).state;
    const moved = reduceEncounter(state, {
      type: 'move', actor: flyer.id, cause: 'voluntary', path: [{ column: 1, row: 0 }],
    }, () => 0);

    expect(moved.events.find((event) => event.type === 'movement_completed')).toMatchObject({ spent: 5, remaining: 55 });
  });

  it('movement-mode immunity suppresses an imported magical speed reduction and difficult terrain', () => {
    const duration = { durationRounds: 10, concentration: false, expiresAt: 'target_start' as const };
    const pack = packWithSpells([
      {
        id: 'slow-field', operation: {
          kind: 'speed_modification', modification: { kind: 'reduce', reduction: { kind: 'multiplier', multiplier: 0.5 } }, ...duration,
        },
      },
      {
        id: 'free-swimmer', operation: {
          kind: 'movement_mode', grants: [{ mode: 'swimming', speed: { kind: 'walking_speed' } }],
          difficultTerrainImmunity: true, magicalSpeedReductionImmunity: true, ...duration,
        },
      },
    ]);
    const reducer = playerProfile('immunity-reducer', { initiativeBonus: 30, spellSlots: [{ level: 1, maximum: 1 }] });
    const target = playerProfile('immune-mover', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
    let state = initiative(createEncounter({
      bounds: { columns: 6, rows: 2 }, combatants: [reducer, target],
      tokens: [placedToken(reducer, 0, 1), placedToken(target, 0)], contentPacks: [pack],
      environment: {
        lightRegions: [], difficultTerrainRegions: [{ id: 'bog', cells: [{ column: 1, row: 0 }] }], movementRegions: [],
      },
    }));
    state = cast(state, command(reducer, 'slow-field', [target.id])).state;
    state = endTurn(state, reducer);
    state = cast(state, command(target, 'free-swimmer', [target.id])).state;
    const moved = reduceEncounter(state, {
      type: 'move', actor: target.id, cause: 'voluntary', path: [{ column: 1, row: 0 }],
    }, () => 0);

    expect(moved.events.find((event) => event.type === 'movement_completed')).toMatchObject({ spent: 5, remaining: 25 });
  });

  it('imports increase, reduction, and set-to-zero walking-speed changes for a duration', () => {
    const duration = { durationRounds: 10, concentration: false, expiresAt: 'target_start' as const };
    const pack = packWithSpells([
      { id: 'quicken', operation: { kind: 'speed_modification', modification: { kind: 'increase', feet: 10 }, ...duration } },
      { id: 'set-pace', operation: { kind: 'speed_modification', modification: { kind: 'set', speedFeet: 20 }, ...duration } },
      { id: 'halt', operation: { kind: 'speed_modification', modification: { kind: 'reduce', reduction: { kind: 'feet', feet: 100 } }, ...duration } },
    ]);
    const quickener = playerProfile('quickener', { initiativeBonus: 40, spellSlots: [{ level: 1, maximum: 1 }] });
    const reducer = playerProfile('reducer', { initiativeBonus: 30, spellSlots: [{ level: 1, maximum: 1 }] });
    const stopper = playerProfile('stopper', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
    const target = playerProfile('speed-target', { initiativeBonus: 10 });
    let state = initiative(createEncounter({
      bounds: { columns: 8, rows: 2 }, combatants: [quickener, reducer, stopper, target],
      tokens: [placedToken(quickener, 0, 1), placedToken(reducer, 1, 1), placedToken(stopper, 2, 1), placedToken(target, 0)],
      contentPacks: [pack],
    }));
    state = cast(state, command(quickener, 'quicken', [target.id])).state;
    state = endTurn(state, quickener);
    state = cast(state, command(reducer, 'set-pace', [target.id])).state;
    state = endTurn(state, reducer);
    state = cast(state, command(stopper, 'halt', [target.id])).state;
    state = endTurn(state, stopper);

    expect(state.combatants.find(({ profile }) => profile.id === target.id)?.turn.movement).toMatchObject({ speed: 0, remaining: 0 });
  });

  it('speed_reduction_zero_boundary: an imported reduction equal to walking speed reaches exactly 0', () => {
    const pack = packWithSpells([{
      id: 'exact-halt', operation: {
        kind: 'speed_modification', modification: { kind: 'reduce', reduction: { kind: 'feet', feet: 30 } },
        durationRounds: 10, concentration: false, expiresAt: 'target_start',
      },
    }]);
    const reducer = playerProfile('exact-speed-reducer', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
    const target = playerProfile('exact-speed-target', { initiativeBonus: 10 });
    const state = initiative(createEncounter({
      bounds: { columns: 2, rows: 2 }, combatants: [reducer, target],
      tokens: [placedToken(reducer, 0, 1), placedToken(target, 0)], contentPacks: [pack],
    }));
    const reduced = cast(state, command(reducer, 'exact-halt', [target.id])).state;

    expect(reduced.combatants.find(({ profile }) => profile.id === target.id)?.turn.movement)
      .toMatchObject({ speed: 0, spent: 0, remaining: 0 });
  });

  it('movement_mode_grant_speed_boundary: uses exactly the imported granted speed and leaves 0 movement', () => {
    const pack = packWithSpells([{
      id: 'long-flight', operation: {
        kind: 'movement_mode', grants: [{ mode: 'flying', speed: { kind: 'fixed', feet: 60 } }],
        difficultTerrainImmunity: false, magicalSpeedReductionImmunity: false,
        durationRounds: 10, concentration: true, expiresAt: 'source_start',
      },
    }]);
    const flyer = playerProfile('exact-grant-flyer', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
    let state = initiative(createEncounter({
      bounds: { columns: 13, rows: 1 }, combatants: [flyer],
      tokens: [placedToken(flyer, 0)], contentPacks: [pack],
    }));
    state = cast(state, command(flyer, 'long-flight', [flyer.id])).state;
    const moved = reduceEncounter(state, {
      type: 'move', actor: flyer.id, cause: 'voluntary',
      path: Array.from({ length: 12 }, (_, index) => ({ column: index + 1, row: 0 })),
    }, () => 0);

    expect(position(moved.state, flyer.id)).toEqual({ column: 12, row: 0 });
    expect(moved.events.find((event) => event.type === 'movement_completed'))
      .toMatchObject({ spent: 60, remaining: 0 });
    expect(moved.state.combatants.find(({ profile }) => profile.id === flyer.id)?.turn.movement)
      .toMatchObject({ speed: 60, spent: 60, remaining: 0 });
  });

  it('resolves a speed grant and reduction in stable effect-creation order', () => {
    const duration = { durationRounds: 10, concentration: false, expiresAt: 'target_start' as const };
    const pack = packWithSpells([
      {
        id: 'grant-flight', operation: {
          kind: 'movement_mode', grants: [{ mode: 'flying', speed: { kind: 'fixed', feet: 60 } }],
          difficultTerrainImmunity: false, magicalSpeedReductionImmunity: false, ...duration,
        },
      },
      {
        id: 'halve-speed', operation: {
          kind: 'speed_modification', modification: { kind: 'reduce', reduction: { kind: 'multiplier', multiplier: 0.5 } }, ...duration,
        },
      },
    ]);
    const run = (grantFirst: boolean): number => {
      const first = playerProfile(`first-${String(grantFirst)}`, { initiativeBonus: 30, spellSlots: [{ level: 1, maximum: 1 }] });
      const second = playerProfile(`second-${String(grantFirst)}`, { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
      const target = playerProfile(`ordered-target-${String(grantFirst)}`, { initiativeBonus: 10 });
      let state = initiative(createEncounter({
        bounds: { columns: 6, rows: 2 }, combatants: [first, second, target],
        tokens: [placedToken(first, 0, 1), placedToken(second, 1, 1), placedToken(target, 0)], contentPacks: [pack],
      }));
      state = cast(state, command(first, grantFirst ? 'grant-flight' : 'halve-speed', [target.id])).state;
      state = endTurn(state, first);
      state = cast(state, command(second, grantFirst ? 'halve-speed' : 'grant-flight', [target.id])).state;
      state = endTurn(state, second);
      return state.combatants.find(({ profile }) => profile.id === target.id)?.turn.movement.speed ?? -1;
    };

    expect(run(true)).toBe(30);
    expect(run(false)).toBe(60);
  });

  it('orders damaging movement regions before persistent on_enter hooks during forced movement', () => {
    const pack = packWithSpells([
      { id: 'hook-field', operation: persistentHook },
      { id: 'thorn-cell', operation: movementRegion('thorn-cell', [{ column: 2, row: 0 }], 'allowed', true) },
      { id: 'force-wave', operation: { kind: 'forced_movement', direction: 'away', origin: 'caster', distanceFeet: 5, save: null } },
    ]);
    const areaCaster = playerProfile('order-area', { initiativeBonus: 40, spellSlots: [{ level: 1, maximum: 1 }] });
    const regionCaster = playerProfile('order-region', { initiativeBonus: 30, spellSlots: [{ level: 1, maximum: 1 }] });
    const pusher = playerProfile('order-pusher', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
    const target = monsterProfile('order-target', { hitPoints: 20, initiativeBonus: 0 });
    let state = initiative(createEncounter({
      bounds: { columns: 6, rows: 2 }, combatants: [areaCaster, regionCaster, pusher, target],
      tokens: [placedToken(areaCaster, 3, 1), placedToken(regionCaster, 5, 1), placedToken(pusher, 0), placedToken(target, 1)],
      contentPacks: [pack],
    }));
    state = cast(state, command(areaCaster, 'hook-field', [target.id])).state;
    state = endTurn(state, areaCaster);
    state = cast(state, command(regionCaster, 'thorn-cell', [target.id])).state;
    state = endTurn(state, regionCaster);
    const result = cast(state, command(pusher, 'force-wave', [target.id]));
    const relevant = result.events.filter((event) => event.type === 'damage_applied' || event.type === 'persistent_area_triggered');

    expect(relevant.map((event) => event.type)).toEqual(['damage_applied', 'persistent_area_triggered', 'damage_applied']);
    expect(result.state.combatants.find(({ profile }) => profile.id === target.id)?.hitPoints).toBe(18);
  });
});
