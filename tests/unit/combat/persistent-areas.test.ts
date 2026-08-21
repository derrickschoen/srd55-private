import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import {
  combatantConditions,
  createEncounter,
  effectiveSkillModifier,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import type { PersistentAreaInput } from '../../../src/combat/persistent-areas';
import { feetPoint } from '../../../src/combat/templates';
import { damageType, dieSides, feet, persistentAreaId } from '../../../src/combat/values';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

const force = damageType('Force');

function fixedDamage(amount: number) {
  return {
    terms: [{ type: force, dice: { count: 0, sides: dieSides(6), modifier: amount } }],
    critical: false,
    responses: [],
  } as const;
}

function started(columns: readonly number[] = [0, 4]): EncounterState {
  const owner = playerProfile('area-owner', { initiativeBonus: 20, hitPoints: 30 });
  const target = monsterProfile('area-target', { initiativeBonus: -20, hitPoints: 30 });
  const state = createEncounter({
    bounds: { columns: 12, rows: 3 },
    combatants: [owner, target],
    tokens: [placedToken(owner, columns[0] ?? 0, 1), placedToken(target, columns[1] ?? 4, 1)],
  });
  return reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
}

function baseArea(state: EncounterState, overrides: Partial<PersistentAreaInput> = {}): PersistentAreaInput {
  const owner = state.combatants[0]!.profile.id;
  return {
    owner,
    origin: { kind: 'fixed', point: feetPoint(15, 5) },
    shape: { kind: 'sphere', radius: feet(2) },
    duration: { kind: 'rounds', remaining: 10 },
    targetFilter: { kind: 'all' },
    difficultTerrain: false,
    movable: null,
    hooks: [],
    ...overrides,
  };
}

function createArea(state: EncounterState, area: PersistentAreaInput, rng: () => number = () => 0.5) {
  return reduceEncounter(state, {
    type: 'create_persistent_area', actor: area.owner, area, cost: 'none',
  }, rng);
}

function hitPoints(state: EncounterState, id: string): number {
  const subject = state.combatants.find((candidate) => candidate.profile.id === id);
  if (subject === undefined) throw new Error(`Missing combatant ${id}.`);
  return subject.hitPoints;
}

describe('persistent areas and deterministic membership hooks', () => {
  it('area_triggers_every_step: crossing a three-square zone resolves once per entry, not once per step', () => {
    let state = started([8, 0]);
    const owner = state.combatants[0]!.profile.id;
    const target = state.combatants[1]!.profile.id;
    state = createArea(state, baseArea(state, {
      origin: { kind: 'fixed', point: feetPoint(15, 5) },
      shape: { kind: 'sphere', radius: feet(7) },
      hooks: [{ hook: 'on_enter', frequency: 'every_trigger', effect: { kind: 'automatic', payload: { kind: 'damage', damage: fixedDamage(3) } } }],
    })).state;
    state = reduceEncounter(state, { type: 'end_turn', actor: owner }, () => 0.5).state;

    const moved = reduceEncounter(state, {
      type: 'move', actor: target,
      path: [{ column: 1, row: 1 }, { column: 2, row: 1 }, { column: 3, row: 1 }, { column: 4, row: 1 }, { column: 5, row: 1 }],
      cause: 'reactions_resolved',
    }, () => 0.5);

    expect(moved.events.filter((event) => event.type === 'persistent_area_triggered')).toHaveLength(1);
    expect(hitPoints(moved.state, target)).toBe(27);
  });

  it('standing_inside_triggers_start_once: start-of-turn hooks resolve exactly once in each round', () => {
    let state = started([0, 2]);
    const owner = state.combatants[0]!.profile.id;
    const target = state.combatants[1]!.profile.id;
    state = createArea(state, baseArea(state, {
      origin: { kind: 'fixed', point: feetPoint(15, 5) },
      shape: { kind: 'sphere', radius: feet(3) },
      hooks: [{ hook: 'on_start_of_turn_inside', frequency: 'once_per_turn', effect: { kind: 'automatic', payload: { kind: 'damage', damage: fixedDamage(2) } } }],
    })).state;

    const targetTurn = reduceEncounter(state, { type: 'end_turn', actor: owner }, () => 0.5);
    expect(targetTurn.events.filter((event) => event.type === 'persistent_area_triggered')).toHaveLength(1);
    expect(hitPoints(targetTurn.state, target)).toBe(28);
    const nextOwner = reduceEncounter(targetTurn.state, { type: 'end_turn', actor: target }, () => 0.5).state;
    const nextTarget = reduceEncounter(nextOwner, { type: 'end_turn', actor: owner }, () => 0.5);
    expect(nextTarget.events.filter((event) => event.type === 'persistent_area_triggered')).toHaveLength(1);
    expect(hitPoints(nextTarget.state, target)).toBe(26);
  });

  it('emanation_uses_stale_origin: an anchored emanation follows every owner step and catches an adjacent creature', () => {
    const owner = playerProfile('moving-aura-owner', { initiativeBonus: 20 });
    const beneficiary = playerProfile('moving-aura-beneficiary', { initiativeBonus: -20 });
    let state = reduceEncounter(createEncounter({
      bounds: { columns: 10, rows: 3 }, combatants: [owner, beneficiary],
      tokens: [placedToken(owner, 0, 1), placedToken(beneficiary, 4, 1)],
    }), { type: 'roll_initiative' }, () => 0.5).state;
    state = createArea(state, baseArea(state, {
      owner: owner.id,
      origin: { kind: 'anchored', combatant: owner.id },
      shape: { kind: 'emanation', radius: feet(5) },
      targetFilter: { kind: 'allies' },
      hooks: [{
        hook: 'on_enter', frequency: 'every_trigger',
        effect: { kind: 'automatic', payload: { kind: 'effect', payload: { kind: 'skill_modifier', skill: 'stealth', amount: 4 }, lifetime: { kind: 'while_inside' } } },
      }],
    })).state;
    expect(effectiveSkillModifier(state, beneficiary.id, 'stealth')).toBe(0);

    state = reduceEncounter(state, {
      type: 'move', actor: owner.id,
      path: [{ column: 1, row: 1 }, { column: 2, row: 1 }, { column: 3, row: 1 }], cause: 'reactions_resolved',
    }, () => 0.5).state;

    expect(state.persistentAreas[0]?.origin).toEqual({ kind: 'anchored', combatant: owner.id });
    expect(state.persistentAreas[0]?.members).toContain(beneficiary.id);
    expect(effectiveSkillModifier(state, beneficiary.id, 'stealth')).toBe(4);
  });

  it('emanation_origin_occupant_is_affected: an eligible creature on the emanation origin takes the effect', () => {
    const owner = playerProfile('origin-aura-owner', { initiativeBonus: 20, hitPoints: 30 });
    const hostile = monsterProfile('origin-aura-hostile', { initiativeBonus: -20, hitPoints: 30 });
    let state = reduceEncounter(createEncounter({
      bounds: { columns: 4, rows: 3 }, combatants: [owner, hostile],
      tokens: [placedToken(owner, 3, 1), placedToken(hostile, 0, 1)],
    }), { type: 'roll_initiative' }, () => 0.5).state;

    state = createArea(state, baseArea(state, {
      owner: owner.id,
      origin: { kind: 'fixed', point: feetPoint(0, 5) },
      shape: { kind: 'emanation', radius: feet(10) },
      targetFilter: { kind: 'enemies' },
      hooks: [{
        hook: 'on_enter', frequency: 'every_trigger',
        effect: { kind: 'automatic', payload: { kind: 'damage', damage: fixedDamage(5) } },
      }],
    })).state;

    expect(state.persistentAreas[0]?.members).toContain(hostile.id);
    expect(state.persistentAreas[0]?.members).not.toContain(owner.id);
    expect(hitPoints(state, hostile.id)).toBe(25);
    expect(hitPoints(state, owner.id)).toBe(30);
  });

  it('emanation_owner_membership_follows_filter: an ally aura includes its anchor while a hostile aura excludes it', () => {
    const owner = playerProfile('filtered-aura-owner', { initiativeBonus: 20 });
    const hostile = monsterProfile('filtered-aura-hostile', { initiativeBonus: -20 });
    const initial = (): EncounterState => reduceEncounter(createEncounter({
      bounds: { columns: 6, rows: 3 }, combatants: [owner, hostile],
      tokens: [placedToken(owner, 0, 1), placedToken(hostile, 5, 1)],
    }), { type: 'roll_initiative' }, () => 0.5).state;
    const conditionHook = {
      hook: 'on_enter',
      frequency: 'every_trigger',
      effect: {
        kind: 'automatic',
        payload: {
          kind: 'effect',
          payload: { kind: 'condition', condition: 'Frightened' },
          lifetime: { kind: 'area_duration' },
        },
      },
    } as const;

    const alliedInitial = initial();
    const allied = createArea(alliedInitial, baseArea(alliedInitial, {
      owner: owner.id,
      origin: { kind: 'anchored', combatant: owner.id },
      shape: { kind: 'emanation', radius: feet(10) },
      targetFilter: { kind: 'allies' },
      hooks: [conditionHook],
    })).state;
    expect(allied.persistentAreas[0]?.members).toContain(owner.id);
    expect(combatantConditions(allied, owner.id).map((condition) => condition.name)).toContain('Frightened');

    const hostileInitial = initial();
    const hostileOnly = createArea(hostileInitial, baseArea(hostileInitial, {
      owner: owner.id,
      origin: { kind: 'anchored', combatant: owner.id },
      shape: { kind: 'emanation', radius: feet(10) },
      targetFilter: { kind: 'enemies' },
      hooks: [conditionHook],
    })).state;
    expect(hostileOnly.persistentAreas[0]?.members).not.toContain(owner.id);
    expect(combatantConditions(hostileOnly, owner.id).map((condition) => condition.name)).not.toContain('Frightened');
  });

  it('save_ends_never_ends: a later successful save removes an area-applied condition', () => {
    let state = started([8, 0]);
    const owner = state.combatants[0]!.profile.id;
    const target = state.combatants[1]!.profile.id;
    state = createArea(state, baseArea(state, {
      hooks: [{
        hook: 'on_enter', frequency: 'every_trigger',
        effect: {
          kind: 'save_gated', ability: 'wisdom', dc: 10, rollMode: 'normal', onSuccess: 'none',
          payload: { kind: 'effect', payload: { kind: 'condition', condition: 'Frightened' }, lifetime: { kind: 'save_ends', boundary: 'end' } },
        },
      }],
    })).state;
    state = reduceEncounter(state, { type: 'end_turn', actor: owner }, () => 0.5).state;
    state = reduceEncounter(state, {
      type: 'move', actor: target, path: [{ column: 1, row: 1 }, { column: 2, row: 1 }], cause: 'reactions_resolved',
    }, () => 0).state;
    expect(combatantConditions(state, target).map((condition) => condition.name)).toContain('Frightened');

    state = reduceEncounter(state, { type: 'end_turn', actor: target }, () => 0.999).state;
    expect(combatantConditions(state, target).map((condition) => condition.name)).not.toContain('Frightened');
  });

  it('membership_order_nondeterministic: overlapping areas always resolve by creation sequence', () => {
    const initial = started([8, 0]);
    const owner = initial.combatants[0]!.profile.id;
    const target = initial.combatants[1]!.profile.id;
    const commands: EncounterCommand[] = [1, 2].map((amount) => ({
      type: 'create_persistent_area', actor: owner, cost: 'none',
      area: baseArea(initial, {
        hooks: [{ hook: 'on_enter', frequency: 'every_trigger', effect: { kind: 'automatic', payload: { kind: 'damage', damage: fixedDamage(amount) } } }],
      }),
    }));
    const run = (): EncounterState => {
      let state = initial;
      for (const command of commands) state = reduceEncounter(state, command, () => 0.5).state;
      state = reduceEncounter(state, { type: 'end_turn', actor: owner }, () => 0.5).state;
      return reduceEncounter(state, {
        type: 'move', actor: target, path: [{ column: 1, row: 1 }, { column: 2, row: 1 }], cause: 'reactions_resolved',
      }, () => 0.5).state;
    };
    const first = run();
    const second = run();
    expect(first.eventLog.filter((event) => event.type === 'persistent_area_triggered').map((event) => event.areaId))
      .toEqual([persistentAreaId('area:1'), persistentAreaId('area:2')]);
    expect(canonicalJson(second)).toBe(canonicalJson(first));
  });
});
