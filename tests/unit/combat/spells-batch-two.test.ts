import { describe, expect, it } from 'vitest';
import type { CombatantProfile, SpellSlotLevel } from '../../../src/combat/combatant';
import {
  combatantConditions,
  createEncounter,
  effectiveSkillModifier,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { EncounterCommand, EncounterEvent } from '../../../src/combat/events';
import { spellDefinition } from '../../../src/combat/spells/definitions';
import type { SpellCastCommand } from '../../../src/combat/spells/types';
import { feetPoint } from '../../../src/combat/templates';
import {
  damageType,
  dieSides,
  effectStackingIdentity,
  feet,
} from '../../../src/combat/values';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

function sequenceRng(values: readonly number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index];
    if (value === undefined) throw new Error(`RNG sequence exhausted at index ${index}.`);
    index += 1;
    return value;
  };
}

function startedEncounter(
  caster: CombatantProfile,
  target: CombatantProfile,
  targetColumn = 2,
): EncounterState {
  const state = createEncounter({
    bounds: { columns: 20, rows: 8 },
    combatants: [caster, target],
    tokens: [placedToken(caster, 0, 0), placedToken(target, targetColumn, 0)],
  });
  return reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
}

function casterFor(
  key: string,
  level: SpellSlotLevel,
  options: { readonly hitPoints?: number } = {},
): CombatantProfile {
  return playerProfile(key, {
    hitPoints: options.hitPoints ?? 30,
    initiativeBonus: 20,
    spellSlots: [{ level, maximum: 2 }],
  });
}

function cast(
  caster: CombatantProfile,
  spellId: string,
  slotLevel: SpellSlotLevel | null,
  options: Partial<Pick<SpellCastCommand, 'targets' | 'area' | 'casterLevel'>> = {},
): SpellCastCommand {
  return {
    type: 'cast_spell',
    actor: caster.id,
    spellId,
    slotLevel,
    castAsRitual: false,
    casterLevel: options.casterLevel ?? 7,
    attackBonus: 8,
    saveDc: 10,
    spellcastingModifier: 4,
    targets: options.targets ?? [],
    area: options.area ?? null,
    weaponAttack: null,
    selectedOption: null,
  };
}

function cube20(): NonNullable<SpellCastCommand['area']> {
  return {
    shape: 'cube',
    template: {
      origin: feetPoint(5, 0),
      center: feetPoint(15, 10),
      axis: { x: 1, y: 0 },
      size: feet(20),
      includeOrigin: false,
    },
  };
}

function weaponAttack(
  actor: CombatantProfile,
  target: CombatantProfile,
): Extract<EncounterCommand, { readonly type: 'attack' }> {
  return {
    type: 'attack',
    actor: actor.id,
    target: target.id,
    attackBonus: 100,
    criticalFloor: 20,
    rollMode: 'normal',
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    damage: {
      terms: [{ type: damageType('Slashing'), dice: { count: 1, sides: dieSides(6), modifier: 0 } }],
      critical: false,
      responses: [],
    },
  };
}

function attackEvent(events: readonly EncounterEvent[]) {
  const event = events.findLast(
    (candidate): candidate is Extract<EncounterEvent, { readonly type: 'attack_resolved' }> =>
      candidate.type === 'attack_resolved',
  );
  if (event === undefined) throw new Error('Expected an attack event.');
  return event;
}

const COMPONENT_PINS = [
  { id: 'hold-monster', castingTime: 'action', components: 'VSM', material: 'a straight piece of iron' },
  { id: 'faerie-fire', castingTime: 'action', components: 'V', material: null },
  { id: 'vicious-mockery', castingTime: 'action', components: 'V', material: null },
  { id: 'pass-without-trace', castingTime: 'action', components: 'VSM', material: 'ashes from burned mistletoe' },
  { id: 'entangle', castingTime: 'action', components: 'VS', material: null },
  { id: 'dissonant-whispers', castingTime: 'action', components: 'V', material: null },
  { id: 'goodberry', castingTime: 'action', components: 'VSM', material: 'a sprig of mistletoe' },
] as const;

describe('D318.1 spell batch 2 boundaries', () => {
  it.each(COMPONENT_PINS)('$id pins casting time and components', (pin) => {
    const definition = spellDefinition(pin.id);
    if (definition === null) throw new Error(`Missing definition ${pin.id}.`);
    expect({
      castingTime: definition.castingTime,
      components: `${definition.components.verbal ? 'V' : ''}${definition.components.somatic ? 'S' : ''}${definition.components.material === null ? '' : 'M'}`,
      material: definition.components.material?.text ?? null,
    }).toEqual({ castingTime: pin.castingTime, components: pin.components, material: pin.material });
  });

  it('Hold Monster pins targeting, duration, concentration, and its repeated Wisdom save', () => {
    expect(spellDefinition('hold-monster')).toMatchObject({
      level: 5,
      targeting: { kind: 'multiple', rangeFeet: 90, baseMaximum: 1, additionalPerSlot: 1 },
      operation: {
        kind: 'save_effect', ability: 'wisdom',
        effect: {
          concentration: true, durationRounds: 10, expiresAt: 'target_end',
          repeatedSave: { ability: 'wisdom', timing: 'target_end' },
          payload: { kind: 'condition', condition: 'Paralyzed' },
        },
      },
    });
  });

  it('hold_monster_save_end_dropped: DC-1 Paralyzes and blocks actions, then an exact-DC end-turn save ends it', () => {
    const caster = casterFor('hold-monster-caster', 5);
    const target = monsterProfile('hold-monster-target', { hitPoints: 40, initiativeBonus: 0 });
    let state = startedEncounter(caster, target);
    state = reduceEncounter(state, cast(caster, 'hold-monster', 5, { targets: [target.id] }), () => 0.4).state;
    expect(combatantConditions(state, target.id)).toContainEqual({ name: 'Paralyzed' });

    state = reduceEncounter(state, { type: 'end_turn', actor: caster.id }, () => 0.5).state;
    expect(() => reduceEncounter(state, { type: 'dash', actor: target.id }, () => 0.5))
      .toThrow('Incapacitated');

    state = reduceEncounter(state, { type: 'end_turn', actor: target.id }, () => 0.45).state;
    expect(combatantConditions(state, target.id)).not.toContainEqual({ name: 'Paralyzed' });

    const successState = startedEncounter(caster, target);
    const exactDc = reduceEncounter(
      successState,
      cast(caster, 'hold-monster', 5, { targets: [target.id] }),
      () => 0.45,
    ).state;
    expect(combatantConditions(exactDc, target.id)).not.toContainEqual({ name: 'Paralyzed' });
  });

  it('faerie_fire_no_advantage: DC-1 outlines while exact DC saves; outline grants Advantage and suppresses Invisible benefits', () => {
    const caster = casterFor('faerie-caster', 1);
    const target = monsterProfile('faerie-target', { hitPoints: 40, initiativeBonus: 0 });
    let state = startedEncounter(caster, target);
    state = reduceEncounter(state, {
      type: 'apply_effect', actor: caster.id, cost: 'none',
      effect: {
        targets: [target.id], duration: { kind: 'permanent' }, concentration: false,
        stackingIdentity: effectStackingIdentity('test:invisible'), stacking: 'coexist', repeatedSave: null,
        payload: { kind: 'condition', condition: 'Invisible' },
      },
    }, () => 0.5).state;
    expect(combatantConditions(state, target.id)).toContainEqual({ name: 'Invisible' });

    state = reduceEncounter(state, cast(caster, 'faerie-fire', 1, { area: cube20() }), () => 0.4).state;
    expect(combatantConditions(state, target.id)).not.toContainEqual({ name: 'Invisible' });
    state = reduceEncounter(state, { type: 'end_turn', actor: caster.id }, () => 0.5).state;
    state = reduceEncounter(state, { type: 'end_turn', actor: target.id }, () => 0.5).state;
    const attacked = reduceEncounter(state, weaponAttack(caster, target), sequenceRng([0.1, 0.8, 0]));
    expect(attackEvent(attacked.events).attack.roll.mode).toBe('advantage');

    const exactDc = reduceEncounter(
      startedEncounter(caster, target),
      cast(caster, 'faerie-fire', 1, { area: cube20() }),
      () => 0.45,
    ).state;
    expect(exactDc.effects.some((effect) =>
      effect.targets.includes(target.id) && effect.payload.kind === 'faerie_fire')).toBe(false);
  });

  it('mockery_disadvantage_persists: DC-1 takes scaled Psychic damage and only the next attack has Disadvantage', () => {
    const caster = casterFor('mockery-caster', 1);
    const target = monsterProfile('mockery-target', { hitPoints: 50, initiativeBonus: 0, attacksPerAction: 2 });
    let state = startedEncounter(caster, target);
    state = reduceEncounter(
      state,
      cast(caster, 'vicious-mockery', null, { targets: [target.id], casterLevel: 5 }),
      sequenceRng([0, 0, 0.4]),
    ).state;
    expect(state.combatants.find((subject) => subject.profile.id === target.id)?.hitPoints).toBe(48);
    state = reduceEncounter(state, { type: 'end_turn', actor: caster.id }, () => 0.5).state;

    const first = reduceEncounter(state, weaponAttack(target, caster), sequenceRng([0.8, 0.2, 0]));
    expect(attackEvent(first.events).attack.roll.mode).toBe('disadvantage');
    const second = reduceEncounter(first.state, weaponAttack(target, caster), sequenceRng([0.5, 0]));
    expect(attackEvent(second.events).attack.roll.mode).toBe('normal');

    const exactDc = reduceEncounter(
      startedEncounter(caster, target),
      cast(caster, 'vicious-mockery', null, { targets: [target.id] }),
      sequenceRng([0, 0, 0.45]),
    ).state;
    expect(exactDc.effects.some((effect) => effect.targets.includes(target.id) &&
      effect.payload.kind === 'attack_roll_mode_modifier')).toBe(false);
  });

  it('Pass without Trace accepts a beneficiary at exactly 30 feet and exposes +10 in the Stealth modifier', () => {
    expect(spellDefinition('pass-without-trace')).toMatchObject({
      level: 2,
      targeting: { kind: 'all_in_range', rangeFeet: 30 },
      operation: {
        kind: 'persistent_area', origin: 'anchored_to_caster', concentration: true, durationRounds: 600,
        shape: { kind: 'emanation', radius: feet(30) },
        hooks: [{
          hook: 'on_enter', frequency: 'every_trigger',
          effect: { kind: 'automatic', payload: { kind: 'effect', payload: { kind: 'skill_modifier', skill: 'stealth', amount: 10 }, lifetime: { kind: 'while_inside' } } },
        }],
      },
    });
    const caster = casterFor('trace-caster', 2);
    const beneficiary = monsterProfile('trace-beneficiary', { initiativeBonus: 0 });
    const state = startedEncounter(caster, beneficiary, 6);
    const result = reduceEncounter(
      state,
      cast(caster, 'pass-without-trace', 2, { targets: [caster.id, beneficiary.id] }),
      () => 0.5,
    ).state;
    expect(effectiveSkillModifier(result, caster.id, 'stealth')).toBe(10);
    expect(effectiveSkillModifier(result, beneficiary.id, 'stealth')).toBe(10);
    expect(result.persistentAreas[0]?.owner).toBe(caster.id);
    expect(result.persistentAreas[0]?.duration.kind).toBe('concentration');
    let moving = reduceEncounter(result, { type: 'end_turn', actor: caster.id }, () => 0.5).state;
    moving = reduceEncounter(moving, {
      type: 'move', actor: beneficiary.id, path: [{ column: 7, row: 0 }], cause: 'reactions_resolved',
    }, () => 0.5).state;
    expect(effectiveSkillModifier(moving, beneficiary.id, 'stealth')).toBe(0);
    moving = reduceEncounter(moving, {
      type: 'move', actor: beneficiary.id, path: [{ column: 6, row: 0 }], cause: 'reactions_resolved',
    }, () => 0.5).state;
    expect(effectiveSkillModifier(moving, beneficiary.id, 'stealth')).toBe(10);

    const outside = startedEncounter(caster, beneficiary, 7);
    expect(() => reduceEncounter(
      outside,
      cast(caster, 'pass-without-trace', 2, { targets: [beneficiary.id] }),
      () => 0.5,
    )).toThrow('out of range');
  });

  it('Entangle DC-1 applies Restrained in its exact square while an exact-DC save avoids it', () => {
    const caster = casterFor('entangle-caster', 1);
    const target = monsterProfile('entangle-target', { initiativeBonus: 0 });
    const failed = reduceEncounter(
      startedEncounter(caster, target),
      cast(caster, 'entangle', 1, { area: cube20() }),
      () => 0.4,
    ).state;
    expect(combatantConditions(failed, target.id)).toContainEqual({ name: 'Restrained' });
    expect(combatantConditions(failed, caster.id)).not.toContainEqual({ name: 'Restrained' });
    const exactDc = reduceEncounter(
      startedEncounter(caster, target),
      cast(caster, 'entangle', 1, { area: cube20() }),
      () => 0.45,
    ).state;
    expect(combatantConditions(exactDc, target.id)).not.toContainEqual({ name: 'Restrained' });
    const terrain = reduceEncounter(exactDc, { type: 'end_turn', actor: caster.id }, () => 0.5).state;
    const terrainMove = reduceEncounter(terrain, {
      type: 'move', actor: target.id, path: [{ column: 3, row: 0 }], cause: 'reactions_resolved',
    }, () => 0.5);
    expect(terrainMove.events).toContainEqual(expect.objectContaining({ type: 'movement_completed', spent: feet(10) }));
  });

  it('Dissonant Whispers pins 3d6 Psychic, DC-1 full damage, and exact-DC half damage', () => {
    expect(spellDefinition('dissonant-whispers')?.operation).toMatchObject({
      kind: 'save_damage', ability: 'wisdom', onSuccess: 'half', damageType: damageType('Psychic'),
      dice: { baseCount: 3, sides: 6, perSlotCount: 1 },
    });
    const caster = casterFor('whispers-caster', 1);
    const target = monsterProfile('whispers-target', { hitPoints: 50, initiativeBonus: 0 });
    const failed = reduceEncounter(
      startedEncounter(caster, target),
      cast(caster, 'dissonant-whispers', 1, { targets: [target.id] }),
      sequenceRng([0, 0, 0, 0.4]),
    ).state;
    expect(failed.combatants.find((subject) => subject.profile.id === target.id)?.hitPoints).toBe(47);

    const exactDc = reduceEncounter(
      startedEncounter(caster, target),
      cast(caster, 'dissonant-whispers', 1, { targets: [target.id] }),
      sequenceRng([0, 0, 0, 0.45]),
    ).state;
    expect(exactDc.combatants.find((subject) => subject.profile.id === target.id)?.hitPoints).toBe(49);
  });

  it('Goodberry creates a ten-use pool whose bonus-action consumption decrements once and heals exactly 1 HP', () => {
    const caster = casterFor('goodberry-caster', 1, { hitPoints: 20 });
    let state = startedEncounter(caster, monsterProfile('goodberry-witness', { initiativeBonus: 0 }));
    state = {
      ...state,
      combatants: state.combatants.map((subject) =>
        subject.profile.id === caster.id ? { ...subject, hitPoints: 5 } : subject),
    };
    state = reduceEncounter(state, cast(caster, 'goodberry', 1), () => 0.5).state;
    const pool = state.effects.find((effect) => effect.payload.kind === 'consumable_healing_pool');
    if (pool === undefined) throw new Error('Goodberry did not create its healing pool.');
    expect(pool.payload).toMatchObject({ remainingUses: 10, healingPerUse: 1, activation: 'bonus_action' });

    const consumed = reduceEncounter(state, {
      type: 'consume_healing_pool', actor: caster.id, effectId: pool.id,
    }, () => 0.5);
    expect(consumed.state.combatants.find((subject) => subject.profile.id === caster.id)?.hitPoints).toBe(6);
    expect(consumed.state.effects.find((effect) => effect.id === pool.id)?.payload)
      .toMatchObject({ kind: 'consumable_healing_pool', remainingUses: 9 });
    expect(consumed.events).toContainEqual(expect.objectContaining({
      type: 'healing_pool_consumed', combatant: caster.id, effectId: pool.id, remaining: 9,
    }));
  });
});
