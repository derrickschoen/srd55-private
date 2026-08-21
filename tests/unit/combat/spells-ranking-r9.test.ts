import { describe, expect, it } from 'vitest';
import type { CombatantProfile } from '../../../src/combat/combatant';
import {
  combatantConditions,
  createEncounter,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { EncounterCommand, EncounterEvent } from '../../../src/combat/events';
import { spellDefinition } from '../../../src/combat/spells/definitions';
import type { SpellCastCommand } from '../../../src/combat/spells/types';
import { feetPoint } from '../../../src/combat/templates';
import { damageType, dieSides, feet } from '../../../src/combat/values';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

function startedEncounter(
  caster: CombatantProfile,
  target: CombatantProfile,
  targetColumn = 1,
): EncounterState {
  const created = createEncounter({
    bounds: { columns: 8, rows: 3 },
    combatants: [caster, target],
    tokens: [placedToken(caster, 0, 1), placedToken(target, targetColumn, 1)],
  });
  return reduceEncounter(created, { type: 'roll_initiative' }, () => 0.5).state;
}

function cast(
  caster: CombatantProfile,
  spellId: string,
  slotLevel: 1 | 2 | 3 | 6,
  options: Partial<Pick<SpellCastCommand, 'targets' | 'area'>> = {},
): SpellCastCommand {
  return {
    type: 'cast_spell',
    actor: caster.id,
    spellId,
    slotLevel,
    castAsRitual: false,
    casterLevel: 7,
    attackBonus: 8,
    saveDc: 100,
    spellcastingModifier: 4,
    targets: options.targets ?? [],
    area: options.area ?? null,
    weaponAttack: null,
    selectedOption: null,
  };
}

function weaponAttack(
  caster: CombatantProfile,
  target: CombatantProfile,
): Extract<EncounterCommand, { readonly type: 'attack' }> {
  return {
    type: 'attack',
    actor: caster.id,
    target: target.id,
    attackBonus: 100,
    criticalFloor: 20,
    rollMode: 'normal',
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    damage: {
      terms: [{ type: damageType('Slashing'), dice: { count: 1, sides: dieSides(8), modifier: 0 } }],
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
  if (event === undefined) throw new Error('Expected an attack resolution.');
  return event;
}

describe('r9 spell weapon-attack augmentation cluster', () => {
  it('pins Divine Favor as a one-minute non-concentration 1d4 Radiant rider', () => {
    expect(spellDefinition('divine-favor')).toMatchObject({
      level: 1,
      castingTime: 'bonus_action',
      targeting: { kind: 'self' },
      operation: {
        kind: 'weapon_attack_augmentation',
        extraDamage: { type: damageType('Radiant'), dice: { baseCount: 1, sides: 4, perSlotCount: 0 } },
        consumeOnHit: false,
        concentration: false,
        durationRounds: 10,
        followUp: null,
      },
    });
  });

  it('pins Ensnaring Strike save, restraint, recurring dice, scaling, and concentration literals', () => {
    expect(spellDefinition('ensnaring-strike')).toMatchObject({
      level: 1,
      castingTime: 'bonus_action',
      operation: {
        kind: 'weapon_attack_augmentation',
        extraDamage: null,
        consumeOnHit: true,
        concentration: true,
        followUp: {
          kind: 'save_then_restrain',
          saveAbility: 'strength',
          damageType: damageType('Piercing'),
          dice: { baseCount: 1, sides: 6, perSlotCount: 1 },
          timing: 'target_start',
        },
      },
    });
  });

  it('pins the Searing Smite next-hit and slot-scaling literals', () => {
    const definition = spellDefinition('searing-smite');
    expect(definition).toMatchObject({
      level: 1,
      operation: {
        kind: 'weapon_attack_augmentation',
        extraDamage: { type: damageType('Fire'), dice: { baseCount: 1, sides: 6, perSlotCount: 1 } },
        consumeOnHit: true,
        followUp: {
          kind: 'ongoing_damage_save_ends',
          dice: { baseCount: 1, sides: 6, perSlotCount: 1 },
          saveAbility: 'constitution',
          timing: 'target_start',
        },
      },
    });
  });

  it('armed_rider_persists_after_hit: Searing Smite fires on the next weapon hit only once', () => {
    const caster = playerProfile('searing-caster', {
      hitPoints: 100,
      initiativeBonus: 10,
      attacksPerAction: 2,
      spellSlots: [{ level: 3, maximum: 1 }],
    });
    const target = monsterProfile('searing-target', { hitPoints: 200, initiativeBonus: 0 });
    let state = startedEncounter(caster, target);
    state = reduceEncounter(state, cast(caster, 'searing-smite', 3), () => 0.5).state;
    expect(state.effects[0]?.payload).toMatchObject({
      kind: 'damage_rider',
      damage: { terms: [{ type: damageType('Fire'), dice: { count: 3, sides: 6 } }] },
      followUp: { damage: { terms: [{ type: damageType('Fire'), dice: { count: 3, sides: 6 } }] } },
    });

    const first = reduceEncounter(state, weaponAttack(caster, target), () => 0.5);
    expect(attackEvent(first.events).damage?.terms).toHaveLength(2);
    expect(first.state.effects.map((effect) => effect.payload.kind)).toEqual(['ongoing_damage']);

    const second = reduceEncounter(first.state, weaponAttack(caster, target), () => 0.5);
    expect(attackEvent(second.events).damage?.terms).toHaveLength(1);
    expect(second.events.filter((event) =>
      event.type === 'effect_ended' && event.reason === 'trigger_consumed')).toHaveLength(0);
  });

  it('Divine Favor remains an active rider across subsequent weapon hits', () => {
    const caster = playerProfile('favor-caster', {
      initiativeBonus: 10,
      attacksPerAction: 2,
      spellSlots: [{ level: 1, maximum: 1 }],
    });
    const target = monsterProfile('favor-target', { hitPoints: 100, initiativeBonus: 0 });
    let state = startedEncounter(caster, target);
    state = reduceEncounter(state, cast(caster, 'divine-favor', 1), () => 0.5).state;
    const first = reduceEncounter(state, weaponAttack(caster, target), () => 0.5);
    const second = reduceEncounter(first.state, weaponAttack(caster, target), () => 0.5);

    expect(attackEvent(first.events).damage?.terms).toHaveLength(2);
    expect(attackEvent(second.events).damage?.terms).toHaveLength(2);
    expect(second.state.effects).toMatchObject([{ payload: { kind: 'damage_rider', consumeOnHit: false } }]);
  });

  it('Ensnaring Strike consumes on hit and applies its failed-save restrained damage lifecycle', () => {
    const caster = playerProfile('ensnaring-caster', {
      initiativeBonus: 10,
      spellSlots: [{ level: 2, maximum: 1 }],
    });
    const target = monsterProfile('ensnaring-target', { hitPoints: 100, initiativeBonus: 0 });
    let state = startedEncounter(caster, target);
    state = reduceEncounter(state, cast(caster, 'ensnaring-strike', 2), () => 0.5).state;
    state = reduceEncounter(state, weaponAttack(caster, target), () => 0.5).state;

    expect(state.effects).toMatchObject([{
      targets: [target.id],
      concentrationOwner: caster.id,
      payload: {
        kind: 'ensnaring_strike',
        damage: { terms: [{ type: damageType('Piercing'), dice: { count: 2, sides: 6 } }] },
      },
    }]);
    expect(combatantConditions(state, target.id)).toContainEqual({ name: 'Restrained' });
  });
});

describe('r9 single-spell manifest wins', () => {
  it('heal_value_drifted: Heal pins and restores the flat 70 HP literal', () => {
    expect(spellDefinition('heal')).toMatchObject({
      level: 6,
      targeting: { kind: 'single', rangeFeet: 60 },
      operation: {
        kind: 'fixed_healing',
        baseAmount: 70,
        additionalPerSlot: 10,
        removesConditions: ['Blinded', 'Deafened', 'Poisoned'],
      },
    });
    const caster = playerProfile('heal-caster', {
      initiativeBonus: 10,
      spellSlots: [{ level: 6, maximum: 1 }],
    });
    const target = monsterProfile('heal-target', { hitPoints: 100, initiativeBonus: 0 });
    let state = startedEncounter(caster, target);
    state = {
      ...state,
      combatants: state.combatants.map((combatant) =>
        combatant.profile.id === target.id ? { ...combatant, hitPoints: 1 } : combatant),
    };
    state = reduceEncounter(state, cast(caster, 'heal', 6, { targets: [target.id] }), () => 0.5).state;

    expect(state.combatants.find((combatant) => combatant.profile.id === target.id)?.hitPoints).toBe(71);
  });

  it('moonbeam_save_dropped: Moonbeam pins 2d10 Radiant plus Constitution save-half and repeats the save at turn end', () => {
    expect(spellDefinition('moonbeam')).toMatchObject({
      level: 2,
      targeting: { kind: 'area', rangeFeet: 120, shape: 'cylinder', baseSizeFeet: 5, secondarySizeFeet: 40 },
      operation: {
        kind: 'save_damage_and_effect',
        ability: 'constitution',
        onSuccess: 'half',
        damageType: damageType('Radiant'),
        dice: { baseCount: 2, sides: 10, perSlotCount: 1 },
        effect: { payload: { kind: 'moonbeam_area', saveAbility: 'constitution', onSuccess: 'half' } },
      },
    });
    const caster = playerProfile('moonbeam-caster', {
      initiativeBonus: 10,
      spellSlots: [{ level: 2, maximum: 1 }],
    });
    const target = monsterProfile('moonbeam-target', { hitPoints: 100, initiativeBonus: 0 });
    let state = startedEncounter(caster, target, 4);
    const placed = {
      shape: 'cylinder' as const,
      template: { origin: feetPoint(20, 5), radius: feet(5), height: feet(40) },
    };
    const initial = reduceEncounter(
      state,
      cast(caster, 'moonbeam', 2, { area: placed }),
      () => 0.5,
    );
    expect(initial.events.filter((event) => event.type === 'save_resolved')).toHaveLength(1);
    expect(initial.state.combatants.find((combatant) => combatant.profile.id === target.id)?.hitPoints).toBe(88);

    state = reduceEncounter(initial.state, { type: 'end_turn', actor: caster.id }, () => 0.5).state;
    const recurring = reduceEncounter(state, { type: 'end_turn', actor: target.id }, () => 0.5);
    expect(recurring.events.filter((event) => event.type === 'save_resolved')).toHaveLength(1);
    expect(recurring.state.combatants.find((combatant) => combatant.profile.id === target.id)?.hitPoints).toBe(76);
  });
});
