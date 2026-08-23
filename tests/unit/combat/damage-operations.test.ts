import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { combatantConditions, createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import type { SpellOperation } from '../../../src/combat/spells/types';
import { damageType, dieSides } from '../../../src/combat/values';
import { loadContentPack, type LoadedContentPack } from '../../../src/content/content-pack';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

const FIXTURE_PATH = 'tests/fixtures/content-pack-v1-homebrew.json';

function sequenceRng(values: readonly number[]): () => number {
  let index = 0;
  return () => values[index++] ?? 0;
}

function packet(overrides: Partial<Extract<SpellOperation, { readonly kind: 'damage_operation' }>['packets'][number]> = {}) {
  return {
    damageType: { kind: 'fixed' as const, damageType: damageType('Force') },
    dice: {
      baseCount: 1, sides: 4, modifier: 0,
      perSlotCount: 0, perSlotModifier: 0, cantripUpgrade: false,
    },
    scaling: { kind: 'none' as const },
    thresholdRider: null,
    ...overrides,
  };
}

function damageOperation(
  overrides: Partial<Extract<SpellOperation, { readonly kind: 'damage_operation' }>> = {},
): Extract<SpellOperation, { readonly kind: 'damage_operation' }> {
  return {
    kind: 'damage_operation',
    delivery: { kind: 'automatic' },
    instancesPerTarget: 1,
    packets: [packet()],
    timing: { kind: 'immediate' },
    ...overrides,
  };
}

function loadedSpell(
  operation: SpellOperation,
  options: { readonly multiple?: boolean; readonly castingTime?: 'action' | 'bonus_action' } = {},
): LoadedContentPack {
  const candidate = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as {
    spells: Array<Record<string, unknown>>;
  };
  const spell = candidate.spells[0];
  if (spell === undefined) throw new Error('Homebrew spell fixture is missing.');
  spell.operation = operation;
  spell.castingTime = options.castingTime ?? 'action';
  spell.targeting = options.multiple
    ? { kind: 'multiple', rangeFeet: 30, baseMaximum: 4, additionalPerSlot: 0 }
    : { kind: 'single', rangeFeet: 30, willing: false };
  const result = loadContentPack(candidate);
  if (result.status !== 'loaded') throw new Error(`Damage operation fixture was refused: ${result.refusal.reason}.`);
  return result.content;
}

function encounter(
  operation: SpellOperation,
  targets = [monsterProfile('damage-operation-target', { hitPoints: 40, initiativeBonus: -20 })],
  options: { readonly multiple?: boolean; readonly castingTime?: 'action' | 'bonus_action'; readonly attacksPerAction?: number } = {},
): { readonly state: EncounterState; readonly caster: ReturnType<typeof playerProfile>; readonly targets: typeof targets } {
  const caster = playerProfile('damage-operation-caster', {
    initiativeBonus: 20,
    ...(options.attacksPerAction === undefined ? {} : { attacksPerAction: options.attacksPerAction }),
    spellSlots: [{ level: 1, maximum: 4 }],
  });
  const sizedTargets = targets.map((target) => ({
    ...target,
    rules: { ...target.rules, sizeCategory: 'Large' as const },
  }));
  let state = createEncounter({
    bounds: { columns: 10, rows: 2 },
    combatants: [caster, ...sizedTargets],
    tokens: [placedToken(caster, 0), ...sizedTargets.map((target, index) => placedToken(target, index + 2))],
    contentPacks: [loadedSpell(operation, options)],
  });
  state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
  return { state, caster, targets: sizedTargets };
}

function cast(actor: ReturnType<typeof playerProfile>, targets: readonly ReturnType<typeof monsterProfile>[]): EncounterCommand {
  return {
    type: 'cast_spell', actor: actor.id, spellId: 'greenforge:prism-pebble', slotLevel: 1,
    castAsRitual: false, casterLevel: 3, attackBonus: 8, saveDc: 12,
    spellcastingModifier: 3, targets: targets.map((target) => target.id), area: null,
    weaponAttack: null, selectedOption: null,
  };
}

function hp(state: EncounterState, id: ReturnType<typeof monsterProfile>['id']): number {
  const subject = state.combatants.find((candidate) => candidate.profile.id === id);
  if (subject === undefined) throw new Error(`Missing combatant ${id}.`);
  return subject.hitPoints;
}

describe('typed imported damage operations', () => {
  it('scales damage by target size and missing-HP tiers with literal counts', () => {
    const operation = damageOperation({
      packets: [
        packet({
          scaling: {
            kind: 'target_size',
            additionalDiceBySize: { Tiny: 0, Small: 0, Medium: 1, Large: 2, Huge: 3, Gargantuan: 4 },
          },
        }),
        packet({
          scaling: { kind: 'target_missing_hit_points', hitPointsPerAdditionalDie: 5, maximumAdditionalDice: 3 },
        }),
      ],
    });
    const started = encounter(operation);
    const target = started.targets[0];
    if (target === undefined) throw new Error('Scaling target is missing.');
    const wounded = {
      ...started.state,
      combatants: started.state.combatants.map((subject) => subject.profile.id === target.id
        ? { ...subject, hitPoints: 30 }
        : subject),
    };
    const result = reduceEncounter(wounded, cast(started.caster, [target]), () => 0.99);
    expect(result.events.filter((event) => event.type === 'damage_applied').map((event) => event.amount)).toEqual([12, 12]);
    expect(hp(result.state, target.id)).toBe(6);
  });

  it('multi_instance_shares_one_roll: multi-instance damage rolls every packet independently on each selected target', () => {
    const left = monsterProfile('multi-left', { hitPoints: 20, initiativeBonus: -20 });
    const right = monsterProfile('multi-right', { hitPoints: 20, initiativeBonus: -19 });
    const started = encounter(damageOperation({ instancesPerTarget: 2 }), [left, right], { multiple: true });
    const draws = [0, 0.25, 0.5, 0.75];
    const result = reduceEncounter(started.state, cast(started.caster, started.targets), () => {
      const next = draws.shift();
      if (next === undefined) throw new Error('Pinned multi-instance RNG was exhausted.');
      return next;
    });
    expect(result.events.filter((event) => event.type === 'damage_applied').map((event) => event.amount)).toEqual([1, 2, 3, 4]);
    expect(started.targets.map((target) => hp(result.state, target.id))).toEqual([17, 13]);
  });

  it('threshold_rider_off_by_one: threshold rider fires at the exact boundary and not one point below', () => {
    const boundary = monsterProfile('threshold-boundary', { hitPoints: 20, initiativeBonus: -20 });
    const below = monsterProfile('threshold-below', { hitPoints: 20, initiativeBonus: -19 });
    const started = encounter(damageOperation({
      packets: [packet({
        thresholdRider: { minimumDamage: 4, condition: 'Frightened', durationRounds: 1, expiresAt: 'target_end' },
      })],
    }), [boundary, below], { multiple: true });
    const draws = [0.75, 0.5];
    const result = reduceEncounter(started.state, cast(started.caster, started.targets), () => draws.shift() ?? 0);
    expect(combatantConditions(result.state, started.targets[0]!.id).map((condition) => condition.name)).toContain('Frightened');
    expect(combatantConditions(result.state, started.targets[1]!.id).map((condition) => condition.name)).not.toContain('Frightened');
  });

  it('save-half and damage conversion use the converted response type', () => {
    const target = monsterProfile('conversion-target', { hitPoints: 20, initiativeBonus: -20 });
    const immuneToSource = {
      ...target,
      rules: {
        ...target.rules,
        damageResponses: [{ type: damageType('Fire'), response: 'immune' as const }],
      },
    };
    const started = encounter(damageOperation({
      delivery: { kind: 'save', ability: 'dexterity', rollMode: 'normal', onSuccess: 'half' },
      packets: [packet({
        damageType: { kind: 'conversion', from: damageType('Fire'), to: damageType('Cold') },
      })],
    }), [immuneToSource]);
    const draws = [0.95, 0.75];
    const result = reduceEncounter(started.state, cast(started.caster, started.targets), () => draws.shift() ?? 0);
    expect(result.events.filter((event) => event.type === 'damage_applied').map((event) => event.amount)).toEqual([2]);
    expect(hp(result.state, started.targets[0]!.id)).toBe(18);
  });

  it('dot_ticks_twice_per_turn: recurring per-combatant damage ticks exactly once per target turn for its duration', () => {
    const started = encounter(damageOperation({
      timing: { kind: 'recurring', initial: 'none', tick: 'target_end', durationRounds: 2, concentration: false },
    }));
    const target = started.targets[0]!;
    let state = reduceEncounter(started.state, cast(started.caster, [target]), () => 0.75).state;
    state = reduceEncounter(state, { type: 'end_turn', actor: started.caster.id }, () => 0.75).state;
    const first = reduceEncounter(state, { type: 'end_turn', actor: target.id }, () => 0.75);
    expect(first.events.filter((event) => event.type === 'damage_applied').map((event) => event.amount)).toEqual([4]);
    state = reduceEncounter(first.state, { type: 'end_turn', actor: started.caster.id }, () => 0.75).state;
    const second = reduceEncounter(state, { type: 'end_turn', actor: target.id }, () => 0.75);
    expect(second.events.filter((event) => event.type === 'damage_applied').map((event) => event.amount)).toEqual([4]);
    expect(hp(second.state, target.id)).toBe(32);
    expect(second.state.effects.some((effect) => effect.payload.kind === 'recurring_damage_operation')).toBe(false);
  });

  it('minimum/maximum clamps apply and reroll-below-N replaces each die only once', () => {
    const reroll = encounter(damageOperation({
      packets: [packet({
        dice: {
          baseCount: 1, sides: 6, modifier: 0, perSlotCount: 0, perSlotModifier: 0,
          cantripUpgrade: false, minimumTotal: 3, maximumTotal: 5,
          rerollBelow: { threshold: 4, maximumRerollsPerDie: 1 },
        },
      })],
    }));
    const lowDraws = [0, 0.2];
    const low = reduceEncounter(reroll.state, cast(reroll.caster, reroll.targets), () => lowDraws.shift() ?? 0.99);
    expect(low.events.filter((event) => event.type === 'damage_applied').map((event) => event.amount)).toEqual([3]);

    const maximum = encounter(damageOperation({
      packets: [packet({
        dice: {
          baseCount: 1, sides: 6, modifier: 0, perSlotCount: 0, perSlotModifier: 0,
          cantripUpgrade: false, minimumTotal: 3, maximumTotal: 5,
        },
      })],
    }));
    const high = reduceEncounter(maximum.state, cast(maximum.caster, maximum.targets), () => 0.99);
    expect(high.events.filter((event) => event.type === 'damage_applied').map((event) => event.amount)).toEqual([5]);
  });

  it('armed_rider_fires_on_every_hit: armed rider fires on the next weapon hit only and applies its condition only on a failed save', () => {
    const armed: Extract<SpellOperation, { readonly kind: 'armed_weapon_hit_rider' }> = {
      kind: 'armed_weapon_hit_rider',
      damage: packet(),
      durationRounds: 2,
      concentration: false,
      persistence: 'consume_on_hit',
      saveGatedRider: {
        ability: 'wisdom', rollMode: 'normal', condition: 'Frightened',
        durationRounds: 1, expiresAt: 'target_end',
      },
    };
    const started = encounter(armed, undefined, { castingTime: 'bonus_action', attacksPerAction: 2 });
    const target = started.targets[0]!;
    let state = reduceEncounter(started.state, cast(started.caster, [target]), () => 0.5).state;
    const attack = (): Extract<EncounterCommand, { readonly type: 'attack' }> => ({
      type: 'attack', actor: started.caster.id, target: target.id, attackBonus: 100,
      criticalFloor: 20, rollMode: 'normal', attackerCanSeeTarget: true, targetCanSeeAttacker: true,
      damage: { terms: [{ type: damageType('Slashing'), dice: { count: 0, sides: dieSides(6), modifier: 0 } }], critical: false, responses: [] },
    });
    const firstDraws = [0.5, 0.75, 0];
    state = reduceEncounter(state, attack(), () => firstDraws.shift() ?? 0).state;
    const second = reduceEncounter(state, attack(), () => 0.5);
    expect(hp(second.state, target.id)).toBe(36);
    expect(combatantConditions(second.state, target.id).map((condition) => condition.name)).toContain('Frightened');
    expect(second.state.effects.some((effect) => effect.payload.kind === 'damage_rider')).toBe(false);

    const saved = encounter(armed, undefined, { castingTime: 'bonus_action', attacksPerAction: 2 });
    const savedTarget = saved.targets[0]!;
    let savedState = reduceEncounter(saved.state, cast(saved.caster, [savedTarget]), () => 0.5).state;
    const savedDraws = [0.5, 0.75, 0.99];
    savedState = reduceEncounter(savedState, {
      ...attack(), actor: saved.caster.id, target: savedTarget.id,
    }, () => savedDraws.shift() ?? 0.99).state;
    expect(combatantConditions(savedState, savedTarget.id).map((condition) => condition.name)).not.toContain('Frightened');
  });

  it('an armed duration rider remains available after its first weapon hit', () => {
    const armed: Extract<SpellOperation, { readonly kind: 'armed_weapon_hit_rider' }> = {
      kind: 'armed_weapon_hit_rider', damage: packet(), durationRounds: 2,
      concentration: false, persistence: 'duration', saveGatedRider: null,
    };
    const started = encounter(armed, undefined, { castingTime: 'bonus_action', attacksPerAction: 2 });
    const target = started.targets[0]!;
    let state = reduceEncounter(started.state, cast(started.caster, [target]), () => 0.5).state;
    const attack: Extract<EncounterCommand, { readonly type: 'attack' }> = {
      type: 'attack', actor: started.caster.id, target: target.id, attackBonus: 100,
      criticalFloor: 20, rollMode: 'normal', attackerCanSeeTarget: true, targetCanSeeAttacker: true,
      damage: { terms: [{ type: damageType('Slashing'), dice: { count: 0, sides: dieSides(6), modifier: 0 } }], critical: false, responses: [] },
    };
    state = reduceEncounter(state, attack, sequenceRng([0.5, 0.75])).state;
    state = reduceEncounter(state, attack, sequenceRng([0.5, 0.75])).state;
    expect(hp(state, target.id)).toBe(32);
    expect(state.effects.some((effect) => effect.payload.kind === 'damage_rider')).toBe(true);
  });
});
