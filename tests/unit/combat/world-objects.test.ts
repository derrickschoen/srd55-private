import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import {
  canCombatantSee,
  createEncounter,
  encounterMovementWorld,
  hasLineOfSight,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { findPath } from '../../../src/combat/movement';
import { armorClass, damageType, dieSides, feet, worldObjectId } from '../../../src/combat/values';
import type { CoverTier, WorldObject } from '../../../src/combat/world-objects';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

const force = damageType('Force');

function object(
  id: string,
  cells: readonly { readonly column: number; readonly row: number }[],
  options: {
    readonly movement?: boolean;
    readonly sight?: boolean;
    readonly cover?: CoverTier;
    readonly hitPoints?: number;
  } = {},
): WorldObject {
  const position = cells[0];
  if (position === undefined) throw new Error('A test world object needs a footprint.');
  return {
    id: worldObjectId(`object:${id}`),
    name: `Homebrew ${id}`,
    kind: 'barrier',
    position,
    footprint: cells,
    durability: options.hitPoints === undefined
      ? { kind: 'indestructible' }
      : { kind: 'hit_points', hitPoints: options.hitPoints, maximumHitPoints: options.hitPoints },
    armorClass: armorClass(12),
    damageResponses: [],
    blocking: {
      movement: options.movement ?? false,
      lineOfSight: options.sight ?? false,
      cover: options.cover ?? 'none',
    },
    createdRevision: 0,
  };
}

function setup(worldObjects: readonly WorldObject[] = []): EncounterState {
  const actor = playerProfile('world-actor', { initiativeBonus: 20 });
  const target = monsterProfile('world-target', { initiativeBonus: -20, hitPoints: 40 });
  return createEncounter({
    bounds: { columns: 8, rows: 5 },
    combatants: [actor, target],
    tokens: [placedToken(actor, 0, 2), placedToken(target, 6, 2)],
    worldObjects,
  });
}

function started(worldObjects: readonly WorldObject[] = []): EncounterState {
  return reduceEncounter(setup(worldObjects), { type: 'roll_initiative' }, () => 0.5).state;
}

function attack(state: EncounterState): Extract<EncounterCommand, { readonly type: 'attack' }> {
  const actor = state.combatants.find((entry) => entry.profile.kind === 'player_character')?.profile;
  const target = state.combatants.find((entry) => entry.profile.kind === 'monster')?.profile;
  if (actor === undefined || target === undefined) throw new Error('Attack fixture is incomplete.');
  return {
    type: 'attack', actor: actor.id, target: target.id,
    attackBonus: 0, criticalFloor: 20, rollMode: 'normal',
    attackerCanSeeTarget: true, targetCanSeeAttacker: true,
    damage: {
      terms: [{ type: force, dice: { count: 0, sides: dieSides(6), modifier: 1 } }],
      critical: false, responses: [],
    },
  };
}

describe('typed world objects and encounter environment', () => {
  it('wall_ignored_by_pathing: a movement blocker forces a strictly longer route', () => {
    const wall = object('path-wall', [2, 3, 4].flatMap((column) =>
      [0, 1, 2, 3].map((row) => ({ column, row }))), { movement: true });
    const state = setup([wall]);
    const actor = state.combatants[0]?.profile.id;
    if (actor === undefined) throw new Error('Path fixture has no actor.');
    const path = findPath(encounterMovementWorld(state), {
      actorId: actor,
      start: { column: 0, row: 2 },
      goal: { column: 6, row: 1 },
      maximumCost: feet(100),
    });
    expect(path).toMatchObject({ kind: 'found' });
    if (path.kind !== 'found') throw new Error('Wall route was unexpectedly unreachable.');
    expect(path.cost).toBeGreaterThan(30);
    expect(path.cells.some((cell) => cell.column >= 2 && cell.column <= 4 && cell.row < 4)).toBe(false);
  });

  it('a sight-blocker breaks line of sight and targeting', () => {
    const blocker = object('sight-wall', [{ column: 3, row: 2 }], { sight: true });
    const state = started([blocker]);
    expect(hasLineOfSight(state, { column: 0, row: 2 }, { column: 6, row: 2 })).toBe(false);
    expect(() => reduceEncounter(state, attack(state), () => 0.65)).toThrow('outside line of sight');
  });

  it('cover_tier_off_by_one: half and three-quarters cover change exact attack boundaries', () => {
    const half = started([object('half-cover', [{ column: 3, row: 2 }], { cover: 'half' })]);
    const halfHit = reduceEncounter(half, attack(half), () => 0.65);
    expect(halfHit.events.find((event) => event.type === 'attack_resolved')?.attack.outcome).toBe('hit');

    const threeQuarters = started([object('three-cover', [{ column: 3, row: 2 }], { cover: 'three_quarters' })]);
    const threeQuarterMiss = reduceEncounter(threeQuarters, attack(threeQuarters), () => 0.65);
    expect(threeQuarterMiss.events.find((event) => event.type === 'attack_resolved')?.attack.outcome).toBe('miss');
  });

  it('difficult_terrain_not_doubled: difficult terrain doubles entry cost exactly once', () => {
    const base = started();
    const actor = base.activeCombatant;
    if (actor === null) throw new Error('Movement fixture has no active actor.');
    const transformed = reduceEncounter(base, {
      type: 'world_operation', actor, cost: 'none',
      operation: {
        kind: 'transform_terrain', difficultTerrain: true,
        region: { id: 'homebrew-mire', cells: [{ column: 1, row: 2 }] },
      },
    }, () => 0.5).state;
    const moved = reduceEncounter(transformed, {
      type: 'move', actor, path: [{ column: 1, row: 2 }], cause: 'voluntary',
    }, () => 0.5);
    const event = moved.events.find((candidate) => candidate.type === 'movement_completed');
    expect(event).toMatchObject({ spent: 10 });
    expect(moved.state.combatants.find((entry) => entry.profile.id === actor)?.turn.movement.remaining).toBe(20);
  });

  it('destroyed_object_still_blocks: damage destroys an HP object and immediately opens its cell', () => {
    const wall = object('breakable-wall', [{ column: 1, row: 2 }], { movement: true, hitPoints: 5 });
    const state = started([wall]);
    const destroyed = reduceEncounter(state, {
      type: 'world_operation', actor: state.activeCombatant, cost: 'none',
      operation: {
        kind: 'damage_object', objectId: wall.id, delivery: { kind: 'area_effect' },
        damage: {
          terms: [{ type: force, dice: { count: 0, sides: dieSides(6), modifier: 5 } }],
          critical: false, responses: [],
        },
      },
    }, () => 0.5);
    expect(destroyed.state.worldObjects).toEqual([]);
    expect(destroyed.events.map((event) => event.type)).toEqual([
      'world_object_damaged', 'world_object_removed',
    ]);
    const actor = destroyed.state.activeCombatant;
    if (actor === null) throw new Error('Destruction fixture has no active actor.');
    expect(findPath(encounterMovementWorld(destroyed.state), {
      actorId: actor, start: { column: 0, row: 2 }, goal: { column: 1, row: 2 }, maximumCost: feet(5),
    })).toMatchObject({ kind: 'found', cost: 5 });
  });

  it('a light-level mutation flips the visibility query', () => {
    const base = started();
    const actor = base.activeCombatant;
    const target = base.combatants.find((entry) => entry.profile.kind === 'monster')?.profile.id;
    if (actor === null || target === undefined) throw new Error('Visibility fixture is incomplete.');
    expect(canCombatantSee(base, actor, target)).toBe(true);
    const dark = reduceEncounter(base, {
      type: 'world_operation', actor, cost: 'none',
      operation: {
        kind: 'set_light_level', level: 'darkness',
        region: { id: 'homebrew-eclipse', cells: [{ column: 6, row: 2 }] },
      },
    }, () => 0.5).state;
    expect(canCombatantSee(dark, actor, target)).toBe(false);
  });

  it('replaying object commands reconstructs the state byte-exactly', () => {
    const initial = started();
    const actor = initial.activeCombatant;
    if (actor === null) throw new Error('Replay fixture has no active actor.');
    const created = object('replay-wall', [{ column: 2, row: 1 }], { movement: true, sight: true });
    const command: EncounterCommand = {
      type: 'world_operation', actor, cost: 'none', operation: { kind: 'create_object', object: created },
    };
    const first = reduceEncounter(initial, command, () => 0.5);
    const replayed = reduceEncounter(structuredClone(initial), structuredClone(command), () => 0.5);
    expect(canonicalJson(replayed.state)).toBe(canonicalJson(first.state));
    expect(canonicalJson(replayed.events)).toBe(canonicalJson(first.events));
  });
});
