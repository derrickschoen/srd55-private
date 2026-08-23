import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { CombatantProfile } from '../../../src/combat/combatant';
import {
  createEncounter,
  EquipmentRuleError,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { CombatantEquipment } from '../../../src/combat/equipment';
import type { EncounterCommand } from '../../../src/combat/events';
import type { SpellOperation } from '../../../src/combat/spells/types';
import { damageType, itemId, type EncounterEffectId, type ItemId } from '../../../src/combat/values';
import { loadContentPack, type LoadedContentPack } from '../../../src/content/content-pack';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const SWORD = itemId('greenforge:iron-sword');
const DAGGER = itemId('greenforge:iron-dagger');
const CROSSBOW = itemId('greenforge:heavy-crossbow');
const ARMOR = itemId('greenforge:plate-armor');
const WOODEN_STAFF = itemId('greenforge:wooden-staff');

const HEAT_METAL_STEP = {
  kind: 'heat_metal',
  requiredMaterial: 'metal',
  damageType: damageType('Fire'),
  dice: {
    baseCount: 2, sides: 8, modifier: 0,
    perSlotCount: 1, perSlotModifier: 0, cantripUpgrade: false,
  },
  failedSave: {
    ability: 'constitution', rollMode: 'normal',
    cannotDrop: [
      {
        kind: 'roll_mode_modifier', roll: 'attack_roll', mode: 'disadvantage',
        scope: { kind: 'target_rolls' },
        duration: { kind: 'fixed_rounds', rounds: 1, expiresAt: 'target_start' },
      },
      {
        kind: 'roll_mode_modifier', roll: 'ability_check', mode: 'disadvantage',
        scope: { kind: 'target_rolls' },
        duration: { kind: 'fixed_rounds', rounds: 1, expiresAt: 'target_start' },
      },
    ],
  },
} as const satisfies SpellOperation;

function fixture(): Readonly<Record<string, unknown>> {
  const base = JSON.parse(readFileSync('tests/fixtures/content-pack-v1-homebrew.json', 'utf8')) as {
    readonly spells: readonly Readonly<Record<string, unknown>>[];
    readonly [key: string]: unknown;
  };
  const template = base.spells[0];
  if (template === undefined) throw new Error('Content-pack spell fixture is missing.');
  const items = [
    { recordId: 'iron-sword', name: 'Iron Sword', equip: { kind: 'held', handCapacity: 1, droppable: true }, materials: [{ kind: 'known', name: 'metal' }] },
    { recordId: 'iron-dagger', name: 'Iron Dagger', equip: { kind: 'held', handCapacity: 1, droppable: true }, materials: [{ kind: 'known', name: 'metal' }] },
    { recordId: 'heavy-crossbow', name: 'Heavy Crossbow', equip: { kind: 'held', handCapacity: 2, droppable: true }, materials: [{ kind: 'known', name: 'metal' }] },
    { recordId: 'plate-armor', name: 'Plate Armor', equip: { kind: 'worn', droppable: false }, materials: [{ kind: 'known', name: 'metal' }] },
    { recordId: 'wooden-staff', name: 'Wooden Staff', equip: { kind: 'held', handCapacity: 1, droppable: true }, materials: [{ kind: 'other', name: 'wood' }] },
  ].map((item) => ({
    sourceId: 'greenforge', ...item,
  }));
  return {
    ...base,
    items,
    spells: [{
      ...template,
      recordId: 'heat-metal-equipment', name: 'Heat Metal', level: 2,
      castingTime: 'action', concentration: true,
      range: { kind: 'feet', feet: 60 },
      duration: { kind: 'rounds', rounds: 10 },
      targeting: { kind: 'utility', rangeFeet: 60 },
      operation: {
        kind: 'sustained_effect', establishment: HEAT_METAL_STEP,
        lifecycle: { concentration: true, durationRounds: 10, expiresAt: 'source_start' },
        targetBinding: { kind: 'bound', to: 'cast_object_targets' },
        activation: {
          action: { phrasing: 'explicit', actionType: 'bonus_action' },
          targeting: { kind: 'utility', rangeFeet: 60 }, operation: HEAT_METAL_STEP,
        },
      } satisfies SpellOperation,
    }],
  };
}

function pack(value: unknown = fixture()): LoadedContentPack {
  const result = loadContentPack(value);
  if (result.status !== 'loaded') throw new Error(`Equipment fixture refused: ${result.refusal.reason}`);
  return result.content;
}

function inventory(
  combatant: CombatantProfile,
  options: Omit<CombatantEquipment, 'combatant'>,
): CombatantEquipment {
  return { combatant: combatant.id, ...options };
}

function castHeatMetal(caster: CombatantProfile, target: ItemId): Extract<EncounterCommand, { type: 'cast_spell' }> {
  return {
    type: 'cast_spell', actor: caster.id, spellId: 'greenforge:heat-metal-equipment',
    slotLevel: 2, castAsRitual: false, casterLevel: 5, attackBonus: 6, saveDc: 100,
    spellcastingModifier: 4, targets: [], area: null, weaponAttack: null,
    selectedOption: null, objectTargets: [target],
  };
}

function nextTurn(state: EncounterState): EncounterState {
  const actor = state.activeCombatant;
  if (actor === null) throw new Error('Initiative is not active.');
  return reduceEncounter(state, { type: 'end_turn', actor }, () => 0).state;
}

function stateEquipment(state: EncounterState, combatant: CombatantProfile): CombatantEquipment {
  const found = state.equipment?.find((candidate) => candidate.combatant === combatant.id);
  if (found === undefined) throw new Error(`Missing equipment for ${combatant.id}.`);
  return found;
}

function hitPoints(state: EncounterState, combatant: CombatantProfile): number {
  const found = state.combatants.find((candidate) => candidate.profile.id === combatant.id);
  if (found === undefined) throw new Error(`Missing combatant ${combatant.id}.`);
  return found.hitPoints;
}

function sustainedEffectId(state: EncounterState): EncounterEffectId {
  const effect = state.effects.find((candidate) => candidate.payload.kind === 'sustained_effect');
  if (effect === undefined) throw new Error('Heat Metal did not establish its sustained effect.');
  return effect.id;
}

function equipmentRefusal(operation: () => unknown): EquipmentRuleError {
  try {
    operation();
  } catch (error) {
    if (error instanceof EquipmentRuleError) return error;
    throw error;
  }
  throw new Error('Expected an equipment refusal.');
}

describe('D339.4/D340.1 imported equipment model', () => {
  it('item_registry_reject_record_load_rest: malformed and undeclared item records are rejected while a healthy item resolves by namespaced id', () => {
    const candidate = structuredClone(fixture()) as {
      items: Array<{ sourceId: string; recordId: string; equip: { handCapacity?: number } }>;
    };
    const malformed = structuredClone(candidate.items[0]);
    const undeclared = structuredClone(candidate.items[1]);
    if (malformed === undefined || undeclared === undefined) throw new Error('Item fixtures are missing.');
    malformed.recordId = 'broken';
    malformed.equip.handCapacity = 3;
    undeclared.recordId = 'foreign';
    undeclared.sourceId = 'foreign';
    candidate.items = [malformed, undeclared, candidate.items[2]!];
    const content = pack(candidate);
    expect(content.diagnostics).toEqual([
      expect.objectContaining({ surface: 'items', recordId: 'broken', reason: 'malformed_record' }),
      expect.objectContaining({ surface: 'items', recordId: 'foreign', reason: 'undeclared_namespace' }),
    ]);
    expect(content.items.map((item) => item.id)).toEqual([CROSSBOW]);
  });

  it('two_handed_in_one_hand: hand capacity succeeds with exactly one free unit, then refuses a two-handed item when both units are full', () => {
    const content = pack();
    const actor = playerProfile('capacity-actor', { initiativeBonus: 20 });
    const witness = monsterProfile('capacity-witness', { initiativeBonus: -20 });
    let state = createEncounter({
      bounds: { columns: 4, rows: 2 }, combatants: [actor, witness],
      tokens: [placedToken(actor, 0), placedToken(witness, 3)], contentPacks: [content],
      equipment: [inventory(actor, {
        hands: { kind: 'one_handed', items: [SWORD] }, worn: [], carried: [DAGGER, CROSSBOW],
      })],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0).state;
    const twoHandedRefusal = equipmentRefusal(() => reduceEncounter(
      state, { type: 'equip_item', actor: actor.id, item: CROSSBOW, interaction: 'free' }, () => 0,
    ));
    expect(twoHandedRefusal.code).toBe('hand_capacity_exceeded');
    state = reduceEncounter(state, { type: 'equip_item', actor: actor.id, item: DAGGER, interaction: 'free' }, () => 0).state;
    expect(stateEquipment(state, actor).hands).toEqual({ kind: 'one_handed', items: [DAGGER, SWORD] });
    const fullRefusal = equipmentRefusal(() => reduceEncounter(
      state, { type: 'equip_item', actor: actor.id, item: CROSSBOW, interaction: 'utilize_action' }, () => 0,
    ));
    expect(fullRefusal.code).toBe('hand_capacity_exceeded');
  });

  it('material_property_targeting: Heat Metal selects the imported metal property and typed-refuses a nonmetal item', () => {
    const content = pack();
    const caster = playerProfile('material-caster', { initiativeBonus: 20, spellSlots: [{ level: 2, maximum: 1 }] });
    const witness = monsterProfile('material-witness', { initiativeBonus: -20 });
    let state = createEncounter({
      bounds: { columns: 4, rows: 2 }, combatants: [caster, witness],
      tokens: [placedToken(caster, 0), placedToken(witness, 3)], contentPacks: [content],
      equipment: [inventory(caster, { hands: { kind: 'empty' }, worn: [], carried: [WOODEN_STAFF] })],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0).state;
    expect(equipmentRefusal(() => reduceEncounter(state, castHeatMetal(caster, WOODEN_STAFF), () => 0)).code)
      .toBe('material_mismatch');
  });

  it('second_interaction_free: exactly one free interaction succeeds, a second free interaction is typed-refused, and Utilize pays the action', () => {
    const content = pack();
    const actor = playerProfile('economy-actor', { initiativeBonus: 20 });
    const witness = monsterProfile('economy-witness', { initiativeBonus: -20 });
    let state = createEncounter({
      bounds: { columns: 4, rows: 2 }, combatants: [actor, witness],
      tokens: [placedToken(actor, 0), placedToken(witness, 3)], contentPacks: [content],
      equipment: [inventory(actor, {
        hands: { kind: 'one_handed', items: [SWORD] }, worn: [], carried: [CROSSBOW],
      })],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0).state;
    state = reduceEncounter(state, { type: 'stow_item', actor: actor.id, item: SWORD, interaction: 'free' }, () => 0).state;
    expect(state.combatants.find((subject) => subject.profile.id === actor.id)?.turn.objectInteractionsUsed).toBe(1);
    expect(equipmentRefusal(() => reduceEncounter(
      state, { type: 'equip_item', actor: actor.id, item: CROSSBOW, interaction: 'free' }, () => 0,
    )).code).toBe('free_interaction_spent');
    state = reduceEncounter(state, { type: 'equip_item', actor: actor.id, item: CROSSBOW, interaction: 'utilize_action' }, () => 0).state;
    expect(state.combatants.find((subject) => subject.profile.id === actor.id)?.turn.action).toEqual({ kind: 'spent' });
    expect(stateEquipment(state, actor).carried).toEqual([SWORD]);
    expect(stateEquipment(state, actor).hands).toEqual({ kind: 'two_handed', item: CROSSBOW });
    state = nextTurn(nextTurn(state));
    state = reduceEncounter(state, { type: 'drop_item', actor: actor.id, item: CROSSBOW, interaction: 'free' }, () => 0).state;
    expect(state.groundItems).toEqual([{ item: CROSSBOW, position: placedToken(actor, 0).position }]);
    expect(equipmentRefusal(() => reduceEncounter(
      state, { type: 'pickup_item', actor: actor.id, item: CROSSBOW, interaction: 'free' }, () => 0,
    )).code).toBe('free_interaction_spent');
    state = reduceEncounter(state, { type: 'pickup_item', actor: actor.id, item: CROSSBOW, interaction: 'utilize_action' }, () => 0).state;
    expect(state.groundItems).toEqual([]);
    expect(stateEquipment(state, actor).carried).toEqual([CROSSBOW, SWORD]);
  });

  it('worn_armor_drops: failed Heat Metal save drops a held sword but retained worn armor receives attack and ability-check Disadvantage', () => {
    const content = pack();
    const caster = playerProfile('heat-caster', { initiativeBonus: 20, spellSlots: [{ level: 2, maximum: 2 }] });
    const holder = monsterProfile('heat-holder', { initiativeBonus: -20, hitPoints: 30 });
    const heldInitial = createEncounter({
      config: { initiativeMode: 'per_combatant' }, bounds: { columns: 8, rows: 2 },
      combatants: [caster, holder], tokens: [placedToken(caster, 0), placedToken(holder, 4)], contentPacks: [content],
      equipment: [inventory(holder, { hands: { kind: 'one_handed', items: [SWORD] }, worn: [], carried: [] })],
    });
    const heldStarted = reduceEncounter(heldInitial, { type: 'roll_initiative' }, () => 0).state;
    const held = reduceEncounter(heldStarted, castHeatMetal(caster, SWORD), () => 0).state;
    expect(stateEquipment(held, holder).hands).toEqual({ kind: 'empty' });
    expect(held.groundItems).toEqual([{ item: SWORD, position: placedToken(holder, 4).position }]);

    const wornInitial = createEncounter({
      config: { initiativeMode: 'per_combatant' }, bounds: { columns: 8, rows: 2 },
      combatants: [caster, holder], tokens: [placedToken(caster, 0), placedToken(holder, 4)], contentPacks: [content],
      equipment: [inventory(holder, { hands: { kind: 'empty' }, worn: [ARMOR], carried: [] })],
    });
    const wornStarted = reduceEncounter(wornInitial, { type: 'roll_initiative' }, () => 0).state;
    const worn = reduceEncounter(wornStarted, castHeatMetal(caster, ARMOR), () => 0).state;
    expect(stateEquipment(worn, holder).worn).toEqual([ARMOR]);
    expect(worn.groundItems).toEqual([]);
    expect(worn.effects.filter((effect) =>
      effect.targets.includes(holder.id) && effect.payload.kind === 'attack_roll_mode_modifier')
      .map((effect) => effect.payload.kind === 'attack_roll_mode_modifier' ? effect.payload.appliesTo.kind : null)
      .sort()).toEqual(['ability_checks_by_target', 'all_attacks_by_target']);
  });

  it('dropped_item_vanishes and contact_damage_holder_only: cast drops onto the holder cell; pickup, re-equip, and later Bonus Action re-trigger damage every contact and drop it again', () => {
    const content = pack();
    const caster = playerProfile('sequence-caster', { initiativeBonus: 20, spellSlots: [{ level: 2, maximum: 1 }] });
    const holder = monsterProfile('sequence-holder', { initiativeBonus: -10, hitPoints: 40 });
    const otherContact = monsterProfile('sequence-contact', { initiativeBonus: -20, hitPoints: 40 });
    let state = createEncounter({
      config: { initiativeMode: 'per_combatant' }, bounds: { columns: 12, rows: 2 },
      combatants: [caster, holder, otherContact],
      tokens: [placedToken(caster, 0), placedToken(holder, 4), placedToken(otherContact, 8)],
      contentPacks: [content],
      equipment: [inventory(holder, { hands: { kind: 'one_handed', items: [SWORD] }, worn: [], carried: [] })],
      itemContacts: [{ item: SWORD, combatant: otherContact.id }],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0).state;
    state = reduceEncounter(state, castHeatMetal(caster, SWORD), () => 0).state;
    expect(hitPoints(state, holder)).toBe(38);
    expect(hitPoints(state, otherContact)).toBe(38);
    expect(state.groundItems).toEqual([{ item: SWORD, position: placedToken(holder, 4).position }]);
    const effectId = sustainedEffectId(state);

    state = nextTurn(state);
    state = reduceEncounter(state, { type: 'pickup_item', actor: holder.id, item: SWORD, interaction: 'free' }, () => 0).state;
    expect(state.groundItems).toEqual([]);
    expect(stateEquipment(state, holder).carried).toEqual([SWORD]);
    state = reduceEncounter(state, { type: 'equip_item', actor: holder.id, item: SWORD, interaction: 'utilize_action' }, () => 0).state;
    expect(stateEquipment(state, holder).hands).toEqual({ kind: 'one_handed', items: [SWORD] });

    state = nextTurn(state);
    state = nextTurn(state);
    state = reduceEncounter(state, {
      type: 'activate_sustained_effect', actor: caster.id, effectId,
      targets: [], objectTargets: [SWORD], ownedObjectTargets: [], area: null, selectedOption: null,
    }, () => 0).state;
    expect(hitPoints(state, holder)).toBe(36);
    expect(hitPoints(state, otherContact)).toBe(36);
    expect(state.groundItems).toEqual([{ item: SWORD, position: placedToken(holder, 4).position }]);
    expect(state.combatants.find((subject) => subject.profile.id === caster.id)?.turn.bonusActionAvailable).toBe(false);
  });
});
