import { z } from 'zod';
import type { CombatantProfile } from '../combat/combatant';
import type { TurnLegalActions } from '../combat/coordinator';
import { conditionNames, type ConditionName } from '../combat/conditions';
import {
  armedWeaponHitRiderShape,
  damageOperationSpecSchema,
} from '../combat/damage-operation-schema';
import {
  damageRiderGates,
  isAttackFormSubstitutionPayload,
  isTypedCombatFeaturePayload,
  type CombatFeatureEffect,
  type EffectApplication,
} from '../combat/effects';
import type { EncounterCommand } from '../combat/events';
import { gridDistance } from '../combat/grid';
import type { PersistentAreaEffectSpec, PersistentAreaShape } from '../combat/persistent-areas';
import type { SpellCastCommand } from '../combat/spells/types';
import { SPELL_MANIFEST, type SpellManifestRow } from '../combat/spells/manifest';
import {
  armorClass,
  combatantId,
  damageType,
  dieSides,
  encounterEffectId,
  effectStackingIdentity,
  feet,
  limitedResourcePoolId,
  tokenId,
  worldObjectId,
  type DamageType,
  type DieSides,
  type EncounterEffectId,
} from '../combat/values';
import type { WorldOperation } from '../combat/world-objects';
import { abilities, creatureSizes, damageTypes, skills, type Ability, type KnownCreatureSize, type Skill } from '../domain/enums';
import { SRD_CLASS_NAMES } from '../rules/class-traits-srd';
import {
  createGapReport,
  deduplicateGapReports,
  type GapReport,
} from './srd-gap-report';

export const EXTERNAL_PARTY_PACK_SCHEMA_VERSION = 2 as const;
export const EXTERNAL_PARTY_PACK_MINIMUM_SCHEMA_VERSION = 1 as const;

const partyIdSchema = z.string().regex(/^party:[a-z0-9][a-z0-9-]{0,79}$/u);
const combatantIdSchema = z.string().regex(/^combatant:[a-z0-9][a-z0-9-]{0,79}$/u);
const tokenIdSchema = z.string().regex(/^token:[a-z0-9][a-z0-9-]{0,79}$/u);
const effectIdSchema = z.string().regex(/^effect:[a-z0-9][a-z0-9:-]{0,119}$/u);
const attackIdSchema = z.string().regex(/^attack:[a-z0-9][a-z0-9-]{0,79}$/u);
const resourcePoolIdSchema = z.string().regex(/^resource:[a-z0-9][a-z0-9-]{0,79}$/u);
const worldObjectIdSchema = z.string().regex(/^object:[a-z0-9][a-z0-9:-]{0,119}$/u);
const integerSchema = z.number().int().safe();
const modifierSchema = integerSchema.min(-30).max(30);
const classLevelSchema = integerSchema.min(1).max(20);
const abilityScoreSchema = integerSchema.min(1).max(30);
const distanceSchema = integerSchema.min(0).max(1_000);
const dieSidesSchema = z.union([
  z.literal(4),
  z.literal(6),
  z.literal(8),
  z.literal(10),
  z.literal(12),
  z.literal(20),
]);
const spellSlotLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
  z.literal(9),
]);

const abilityRecordShape = Object.fromEntries(
  abilities.map((ability) => [ability, abilityScoreSchema]),
) as Record<Ability, typeof abilityScoreSchema>;
const saveRecordShape = Object.fromEntries(
  abilities.map((ability) => [ability, modifierSchema]),
) as Record<Ability, typeof modifierSchema>;

const classSchema = z.strictObject({
  classId: z.enum(SRD_CLASS_NAMES),
  level: classLevelSchema,
});

const attackSchema = z.strictObject({
  attackId: attackIdSchema,
  kind: z.enum(['melee', 'ranged']),
  attackBonus: modifierSchema,
  criticalFloor: integerSchema.min(2).max(20),
  reachFeet: distanceSchema,
  rangeFeet: distanceSchema,
  damage: z.array(z.strictObject({
    damageTypeId: z.enum(damageTypes),
    count: integerSchema.min(0).max(100),
    sides: dieSidesSchema,
    modifier: modifierSchema,
  })).min(1).max(20),
});

const gridCellSchema = z.strictObject({
  column: integerSchema.min(0).max(100_000),
  row: integerSchema.min(0).max(100_000),
});

const externalWorldObjectSchema = z.strictObject({
  objectId: worldObjectIdSchema,
  name: z.string().trim().min(1).max(1_000),
  kind: z.enum(['barrier', 'cover', 'door', 'hazard', 'light-source', 'summoned-terrain', 'generic']),
  position: gridCellSchema,
  footprint: z.array(gridCellSchema).min(1).max(400),
  durability: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('indestructible') }),
    z.strictObject({
      kind: z.literal('hit_points'),
      hitPoints: integerSchema.min(1).max(1_000_000),
      maximumHitPoints: integerSchema.min(1).max(1_000_000),
    }),
  ]),
  armorClass: integerSchema.min(0).max(100),
  damageResponses: z.array(z.strictObject({
    damageTypeId: z.enum(damageTypes),
    response: z.enum(['normal', 'resistant', 'vulnerable', 'immune']),
  })).max(damageTypes.length),
  blocking: z.strictObject({
    movement: z.boolean(),
    lineOfSight: z.boolean(),
    cover: z.enum(['none', 'half', 'three_quarters', 'total']),
  }),
}).superRefine((object, context) => {
  if (object.durability.kind === 'hit_points' && object.durability.hitPoints > object.durability.maximumHitPoints) {
    context.addIssue({ code: 'custom', path: ['durability', 'hitPoints'], message: 'Object Hit Points cannot exceed its maximum.' });
  }
});

const externalDamageRequestSchema = z.strictObject({
  terms: z.array(z.strictObject({
    damageTypeId: z.enum(damageTypes),
    count: integerSchema.min(0).max(100),
    sides: dieSidesSchema,
    modifier: modifierSchema,
  })).min(1).max(20),
  critical: z.boolean(),
});

const externalWorldOperationSchema = z.strictObject({
  operationId: z.string().regex(/^world:[a-z0-9][a-z0-9-]{0,79}$/u),
  cost: z.enum(['action', 'bonus_action', 'reaction', 'none']),
  operation: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('create_object'), object: externalWorldObjectSchema }),
    z.strictObject({
      kind: z.literal('modify_object'), objectId: worldObjectIdSchema,
      changes: z.strictObject({
        name: z.string().trim().min(1).max(1_000).optional(),
        kind: z.enum(['barrier', 'cover', 'door', 'hazard', 'light-source', 'summoned-terrain', 'generic']).optional(),
        position: gridCellSchema.optional(),
        footprint: z.array(gridCellSchema).min(1).max(400).optional(),
        durability: externalWorldObjectSchema.shape.durability.optional(),
        armorClass: integerSchema.min(0).max(100).optional(),
        damageResponses: externalWorldObjectSchema.shape.damageResponses.optional(),
        blocking: externalWorldObjectSchema.shape.blocking.optional(),
      }),
    }),
    z.strictObject({
      kind: z.literal('remove_object'), objectId: worldObjectIdSchema,
      reason: z.enum(['destroyed', 'dismissed']),
    }),
    z.strictObject({
      kind: z.literal('damage_object'), objectId: worldObjectIdSchema,
      delivery: z.discriminatedUnion('kind', [
        z.strictObject({ kind: z.literal('area_effect') }),
        z.strictObject({
          kind: z.literal('attack'), attackBonus: modifierSchema,
          criticalFloor: integerSchema.min(2).max(20),
          rollMode: z.enum(['normal', 'advantage', 'disadvantage']),
        }),
      ]),
      damage: externalDamageRequestSchema,
    }),
    z.strictObject({
      kind: z.literal('transform_terrain'),
      region: z.strictObject({ id: z.string().trim().min(1).max(200), cells: z.array(gridCellSchema).min(1).max(10_000) }),
      difficultTerrain: z.boolean(),
    }),
    z.strictObject({
      kind: z.literal('set_light_level'),
      region: z.strictObject({ id: z.string().trim().min(1).max(200), cells: z.array(gridCellSchema).min(1).max(10_000) }),
      level: z.enum(['bright', 'dim', 'darkness']),
    }),
  ]),
}).superRefine((entry, context) => {
  const operation = entry.operation;
  if (operation.kind === 'create_object') {
    const footprintKeys = operation.object.footprint.map((cell) => `${String(cell.column)},${String(cell.row)}`);
    const positionKey = `${String(operation.object.position.column)},${String(operation.object.position.row)}`;
    if (new Set(footprintKeys).size !== footprintKeys.length || !footprintKeys.includes(positionKey)) {
      context.addIssue({ code: 'custom', path: ['operation', 'object', 'footprint'], message: 'Object footprint must be unique and include position.' });
    }
  }
  if (operation.kind === 'modify_object' && Object.keys(operation.changes).length === 0) {
    context.addIssue({ code: 'custom', path: ['operation', 'changes'], message: 'Object modifications cannot be empty.' });
  }
  if (operation.kind === 'transform_terrain' || operation.kind === 'set_light_level') {
    const keys = operation.region.cells.map((cell) => `${String(cell.column)},${String(cell.row)}`);
    if (new Set(keys).size !== keys.length) {
      context.addIssue({ code: 'custom', path: ['operation', 'region', 'cells'], message: 'Environment cells must be unique.' });
    }
  }
});

const spellSlotSchema = z.strictObject({
  level: spellSlotLevelSchema,
  maximum: integerSchema.min(1).max(99),
});

const v2SpellSlotSchema = z.strictObject({
  level: spellSlotLevelSchema,
  count: integerSchema.min(1).max(99),
  recharge: z.literal('long_rest'),
});

const pactSpellSlotSchema = z.strictObject({
  level: spellSlotLevelSchema,
  count: integerSchema.min(1).max(99),
  recharge: z.literal('short_rest'),
});

const resourceSpellUseSchema = z.strictObject({
  spellId: z.string(),
  resourcePoolId: resourcePoolIdSchema,
});

const preparedSpellGrantSchema = z.strictObject({
  spellId: z.string(),
  ability: z.enum(abilities),
});

const startingConditionSchema = z.strictObject({
  effectId: effectIdSchema,
  conditionId: z.enum(conditionNames),
});

export const externalPartyPackResourceSchema = z.strictObject({
  resourcePoolId: resourcePoolIdSchema,
  maximum: integerSchema.min(1).max(999),
  recharge: z.enum(['short_rest', 'long_rest']),
});

const featureEffectBaseShape = {
  effectId: effectIdSchema,
  resourcePoolId: resourcePoolIdSchema.optional(),
} as const;
const activatedEffectTriggerSchema = z.enum(['always_on', 'action', 'bonus_action', 'reaction']);
const damageRiderTriggerSchema = z.enum(['on_hit', 'on_crit']);

const effectDamageSchema = z.strictObject({
  damageTypeId: z.enum(damageTypes),
  count: integerSchema.min(0).max(100),
  sides: dieSidesSchema,
  modifier: modifierSchema,
});

const nonExhaustionConditionNames = conditionNames.filter(
  (condition): condition is Exclude<ConditionName, 'Exhaustion'> => condition !== 'Exhaustion',
);

export const FEATURE_EFFECT_KINDS = [
  'damage_operation',
  'armed_weapon_hit_rider',
  'damage_rider',
  'once_per_turn_damage_rider',
  'slot_spend_damage_rider',
  'first_hit_damage_rider',
  'bonus_action_attack_grant',
  'extra_attack_count_override',
  'action_surge',
  'attack_roll_modifier',
  'attack_roll_mode',
  'reckless_attack_mode',
  'armor_class_modifier',
  'saving_throw_modifier',
  'skill_modifier',
  'temporary_hit_points',
  'condition_application',
  'exhaustion_application',
  'movement_modifier',
  'attack_ability_substitution',
  'attack_damage_die_override',
  'attack_reach_range_override',
  'save_gated_banishment_on_hit',
  'spell_damage_ability_modifier',
  'timed_spellcasting_mode',
  'attack_damage_type_choice',
  'resource_die_maneuver',
  'exploding_spell_damage_die',
  'elemental_fury',
  'persistent_area',
] as const;

const persistentAreaShapeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('sphere'), radiusFeet: distanceSchema.min(1) }),
  z.strictObject({ kind: z.literal('cube'), sizeFeet: distanceSchema.min(1) }),
  z.strictObject({ kind: z.literal('cylinder'), radiusFeet: distanceSchema.min(1), heightFeet: distanceSchema.min(1) }),
  z.strictObject({
    kind: z.literal('line'), lengthFeet: distanceSchema.min(1), widthFeet: distanceSchema.min(1),
    direction: z.strictObject({ x: z.number().finite(), y: z.number().finite() }),
  }),
  z.strictObject({ kind: z.literal('emanation'), radiusFeet: distanceSchema }),
]);

const persistentAreaLifetimeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('while_inside') }),
  z.strictObject({ kind: z.literal('area_duration') }),
  z.strictObject({ kind: z.literal('fixed_rounds'), rounds: integerSchema.min(1).max(1_000_000), boundary: z.enum(['start', 'end']) }),
  z.strictObject({ kind: z.literal('save_ends'), boundary: z.enum(['start', 'end']) }),
]);

const persistentAreaPayloadSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('damage'), damage: z.array(effectDamageSchema).min(1).max(20) }),
  z.strictObject({ kind: z.literal('condition'), conditionId: z.enum(nonExhaustionConditionNames), lifetime: persistentAreaLifetimeSchema }),
  z.strictObject({ kind: z.literal('skill_modifier'), skillId: z.literal('stealth'), amount: modifierSchema, lifetime: persistentAreaLifetimeSchema }),
  z.strictObject({ kind: z.literal('movement_modifier'), speedDeltaFeet: modifierSchema, lifetime: persistentAreaLifetimeSchema }),
  z.strictObject({ kind: z.literal('armor_class_modifier'), amount: modifierSchema, lifetime: persistentAreaLifetimeSchema }),
]);

const persistentAreaEffectSpecSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('automatic'), payload: persistentAreaPayloadSchema }),
  z.strictObject({
    kind: z.literal('save_gated'), ability: z.enum(abilities), saveDc: integerSchema.min(1).max(50),
    rollMode: z.enum(['normal', 'advantage', 'disadvantage']), onSuccess: z.enum(['none', 'half']),
    payload: persistentAreaPayloadSchema,
  }),
]);

const persistentAreaHookSchema = z.strictObject({
  hook: z.enum(['on_enter', 'on_start_of_turn_inside', 'on_end_of_turn_inside', 'on_exit']),
  frequency: z.enum(['once_per_turn', 'every_trigger']),
  effect: persistentAreaEffectSpecSchema,
});

const persistentAreaDurationSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('rounds'), rounds: integerSchema.min(1).max(1_000_000) }),
  z.strictObject({ kind: z.literal('concentration'), rounds: integerSchema.min(1).max(1_000_000) }),
]);

const featureEffectSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('damage_operation'),
    trigger: z.enum(['action', 'bonus_action']),
    saveDc: integerSchema.min(1).max(50),
    ...damageOperationSpecSchema.shape,
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('armed_weapon_hit_rider'),
    trigger: z.enum(['action', 'bonus_action']),
    saveDc: integerSchema.min(1).max(50),
    ...armedWeaponHitRiderShape,
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('damage_rider'),
    trigger: damageRiderTriggerSchema,
    damage: z.array(effectDamageSchema).min(1).max(20),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('once_per_turn_damage_rider'),
    trigger: z.literal('on_hit'),
    oncePerTurnGate: z.literal(damageRiderGates[2]),
    qualifyingGates: z.array(z.enum([
      damageRiderGates[0],
      damageRiderGates[1],
    ])).min(1).max(2),
    damage: z.array(effectDamageSchema).min(1).max(20),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('slot_spend_damage_rider'),
    trigger: z.literal('on_hit'),
    spendGate: z.literal(damageRiderGates[4]),
    criticalGate: z.literal(damageRiderGates[3]),
    damageTypeId: z.enum(damageTypes),
    baseCount: integerSchema.min(0).max(100),
    countPerSlotLevel: integerSchema.min(1).max(20),
    sides: dieSidesSchema,
    modifier: modifierSchema,
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('first_hit_damage_rider'),
    trigger: z.literal('on_hit'),
    gate: z.literal(damageRiderGates[2]),
    damageTypeId: z.enum(damageTypes),
    amount: integerSchema.min(0).max(100_000),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('bonus_action_attack_grant'),
    attackCount: integerSchema.min(1).max(20),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('extra_attack_count_override'),
    levels: z.array(z.strictObject({
      minimumLevel: classLevelSchema,
      attackCount: integerSchema.min(1).max(20),
    })).min(1).max(20),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('action_surge'),
    resourcePoolId: resourcePoolIdSchema,
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('attack_roll_modifier'),
    trigger: activatedEffectTriggerSchema,
    count: integerSchema.min(1).max(20),
    sides: dieSidesSchema,
    sign: z.union([z.literal(1), z.literal(-1)]),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('attack_roll_mode'),
    trigger: z.enum(['action', 'bonus_action', 'reaction']),
    mode: z.enum(['advantage', 'disadvantage']),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('reckless_attack_mode'),
    strengthBasedMeleeAttackIds: z.array(attackIdSchema).min(1).max(100),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('armor_class_modifier'),
    trigger: activatedEffectTriggerSchema,
    amount: modifierSchema,
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('saving_throw_modifier'),
    trigger: activatedEffectTriggerSchema,
    count: integerSchema.min(1).max(20),
    sides: dieSidesSchema,
    sign: z.union([z.literal(1), z.literal(-1)]),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('skill_modifier'),
    trigger: activatedEffectTriggerSchema,
    skillId: z.enum(skills),
    count: integerSchema.min(1).max(20),
    sides: dieSidesSchema,
    sign: z.union([z.literal(1), z.literal(-1)]),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('temporary_hit_points'),
    trigger: activatedEffectTriggerSchema,
    amount: integerSchema.min(0).max(100_000),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('condition_application'),
    trigger: activatedEffectTriggerSchema,
    conditionId: z.enum(nonExhaustionConditionNames),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('exhaustion_application'),
    trigger: activatedEffectTriggerSchema,
    level: z.union([
      z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6),
    ]),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('movement_modifier'),
    trigger: activatedEffectTriggerSchema,
    speedDeltaFeet: modifierSchema,
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('attack_ability_substitution'),
    attackId: attackIdSchema,
    damageTermIndex: integerSchema.min(0).max(19),
    replacesAbility: z.enum(abilities),
    spellcastingAbility: z.enum(abilities),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('attack_damage_die_override'),
    attackId: attackIdSchema,
    damageTermIndex: integerSchema.min(0).max(19),
    levels: z.array(z.strictObject({
      minimumLevel: classLevelSchema,
      count: integerSchema.min(0).max(100),
      sides: dieSidesSchema,
    })).min(1).max(20),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('attack_reach_range_override'),
    attackId: attackIdSchema,
    reachFeet: distanceSchema.optional(),
    rangeFeet: distanceSchema.optional(),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('save_gated_banishment_on_hit'),
    trigger: z.literal('on_hit'),
    saveAbility: z.enum(abilities),
    saveDc: integerSchema.min(1).max(50),
    rollMode: z.literal('normal'),
    returnAt: z.literal('source_next_turn_start'),
    returnDamage: effectDamageSchema,
    returnPlacement: z.literal('previous_or_nearest_unoccupied'),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('spell_damage_ability_modifier'),
    spellId: z.string().min(1).max(100),
    application: z.literal('one_damage_roll_per_turn'),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('timed_spellcasting_mode'),
    trigger: z.literal('bonus_action'),
    resourcePoolId: resourcePoolIdSchema,
    additionalLeveledSpellActions: z.literal(1),
    duration: z.literal('this_turn'),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('attack_damage_type_choice'),
    attackId: attackIdSchema,
    damageTermIndex: integerSchema.min(0).max(19),
    damageTypeIds: z.array(z.enum(damageTypes)).min(2).max(3),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('resource_die_maneuver'),
    trigger: z.literal('on_hit'),
    resourcePoolId: resourcePoolIdSchema,
    sides: dieSidesSchema,
    damageType: z.literal('attack_primary'),
    conditionId: z.enum(nonExhaustionConditionNames),
    conditionDuration: z.literal('until_end_of_target_next_turn'),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('exploding_spell_damage_die'),
    spellId: z.string().min(1).max(100),
    triggerFace: z.literal('maximum'),
    maximumExplosionsPerDie: z.literal(1),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('elemental_fury'),
    attackIds: z.array(attackIdSchema).min(1).max(100),
    damageTypeIds: z.array(z.enum(damageTypes)).min(2).max(4),
    selectedDamageTypeId: z.enum(damageTypes),
    amount: integerSchema.min(0).max(100_000),
    gate: z.literal('first_hit_this_turn'),
  }),
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('persistent_area'),
    trigger: z.enum(['action', 'bonus_action', 'reaction']),
    origin: z.enum(['self', 'selected']),
    shape: persistentAreaShapeSchema,
    duration: persistentAreaDurationSchema,
    targetFilter: z.enum(['all', 'allies', 'enemies']),
    difficultTerrain: z.boolean(),
    movableFeet: distanceSchema.min(1).nullable(),
    hooks: z.array(persistentAreaHookSchema).max(16),
  }),
]).superRefine((effect, context) => {
  if (effect.kind === 'damage_operation') {
    for (const packet of effect.packets) {
      if (packet.dice.perSlotCount !== 0 || packet.dice.perSlotModifier !== 0 || packet.dice.cantripUpgrade) {
        context.addIssue({ code: 'custom', message: 'Feature damage cannot use spell-slot or cantrip scaling.' });
      }
    }
  }
  if (effect.kind === 'armed_weapon_hit_rider' && effect.damage !== null) {
    if (effect.damage.scaling.kind !== 'none' || effect.damage.thresholdRider !== null) {
      context.addIssue({ code: 'custom', message: 'Armed weapon-hit damage cannot defer target scaling or a threshold rider.' });
    }
    if (
      effect.damage.dice.perSlotCount !== 0 ||
      effect.damage.dice.perSlotModifier !== 0 ||
      effect.damage.dice.cantripUpgrade
    ) {
      context.addIssue({ code: 'custom', message: 'Feature rider damage cannot use spell-slot or cantrip scaling.' });
    }
  }
  if (
    'trigger' in effect &&
    effect.trigger === 'always_on' &&
    effect.resourcePoolId !== undefined
  ) {
    context.addIssue({ code: 'custom', message: 'Always-on effects cannot spend a limited resource.' });
  }
  if (
    effect.kind === 'extra_attack_count_override' &&
    (effect.resourcePoolId !== undefined ||
      new Set(effect.levels.map((level) => level.minimumLevel)).size !== effect.levels.length)
  ) {
    context.addIssue({ code: 'custom', message: 'Extra Attack overrides require unique levels and no resource.' });
  }
  if (
    effect.kind === 'slot_spend_damage_rider' &&
    effect.resourcePoolId !== undefined
  ) {
    context.addIssue({ code: 'custom', message: 'Slot-spend riders use spell slots, not limited resources.' });
  }
  if (
    effect.kind === 'once_per_turn_damage_rider' &&
    new Set(effect.qualifyingGates).size !== effect.qualifyingGates.length
  ) {
    context.addIssue({ code: 'custom', message: 'Once-per-turn rider gates must be unique.' });
  }
  if (
    effect.kind === 'reckless_attack_mode' &&
    (effect.resourcePoolId !== undefined ||
      new Set(effect.strengthBasedMeleeAttackIds).size !== effect.strengthBasedMeleeAttackIds.length)
  ) {
    context.addIssue({ code: 'custom', message: 'Reckless Attack requires unique attack ids and no resource.' });
  }
  if (
    (effect.kind === 'attack_ability_substitution' ||
      effect.kind === 'attack_damage_die_override' ||
      effect.kind === 'attack_reach_range_override') &&
    effect.resourcePoolId !== undefined
  ) {
    context.addIssue({ code: 'custom', message: 'Attack-form substitutions are always-on and cannot spend a resource.' });
  }
  if (
    effect.kind === 'attack_damage_die_override' &&
    new Set(effect.levels.map((level) => level.minimumLevel)).size !== effect.levels.length
  ) {
    context.addIssue({ code: 'custom', message: 'Damage-die override levels must be unique.' });
  }
  if (
    effect.kind === 'attack_reach_range_override' &&
    effect.reachFeet === undefined &&
    effect.rangeFeet === undefined
  ) {
    context.addIssue({ code: 'custom', message: 'A reach/range override must replace at least one distance.' });
  }
  if (
    effect.kind === 'attack_damage_type_choice' &&
    new Set(effect.damageTypeIds).size !== effect.damageTypeIds.length
  ) {
    context.addIssue({ code: 'custom', message: 'Attack damage-type choices must be unique.' });
  }
  if (
    effect.kind === 'elemental_fury' &&
    (new Set(effect.attackIds).size !== effect.attackIds.length ||
      new Set(effect.damageTypeIds).size !== effect.damageTypeIds.length ||
      !effect.damageTypeIds.includes(effect.selectedDamageTypeId))
  ) {
    context.addIssue({ code: 'custom', message: 'Elemental Fury requires unique attacks and elements plus a declared selection.' });
  }
  if (
    (effect.kind === 'spell_damage_ability_modifier' ||
      effect.kind === 'attack_damage_type_choice' ||
      effect.kind === 'exploding_spell_damage_die' ||
      effect.kind === 'elemental_fury' ||
      effect.kind === 'save_gated_banishment_on_hit') &&
    effect.resourcePoolId !== undefined
  ) {
    context.addIssue({ code: 'custom', message: 'This typed feature is automatic and cannot spend a resource.' });
  }
  if (effect.kind === 'persistent_area') {
    if (effect.origin === 'self' && effect.movableFeet !== null) {
      context.addIssue({ code: 'custom', message: 'A self-anchored area cannot also move independently.' });
    }
    for (const hook of effect.hooks) {
      if (hook.effect.kind === 'automatic' && hook.effect.payload.kind !== 'damage' && hook.effect.payload.lifetime.kind === 'save_ends') {
        context.addIssue({ code: 'custom', message: 'A save-ends area payload requires a save gate.' });
      }
      if (hook.effect.kind === 'save_gated' && hook.effect.onSuccess === 'half' && hook.effect.payload.kind !== 'damage') {
        context.addIssue({ code: 'custom', message: 'Only area damage can resolve to half on a successful save.' });
      }
    }
  }
});

export const externalPartyPackFeatureEffectSchema = featureEffectSchema;

const passiveSkillSchema = z.strictObject({
  skillId: z.enum(skills),
  bonus: modifierSchema,
});

const passiveDamageResponseSchema = z.strictObject({
  damageTypeId: z.enum(damageTypes),
  response: z.enum(['resistant', 'vulnerable', 'immune']),
});

const optionalSaveModifierShape = Object.fromEntries(
  abilities.map((ability) => [ability, modifierSchema.optional()]),
) as Record<Ability, z.ZodOptional<typeof modifierSchema>>;

const passivesSchema = z.strictObject({
  armorClassBonus: modifierSchema.optional(),
  initiativeBonus: modifierSchema.optional(),
  savingThrowBonuses: z.strictObject(optionalSaveModifierShape).optional(),
  skillBonuses: z.array(passiveSkillSchema).max(skills.length).optional(),
  speedAdjustmentFeet: modifierSchema.optional(),
  damageResponses: z.array(passiveDamageResponseSchema).max(damageTypes.length).optional(),
  conditionImmunities: z.array(z.enum(conditionNames)).max(conditionNames.length).optional(),
});

const manifestSpellIdSchema = z.string().refine(
  (id) => SPELL_MANIFEST.some((spell) => spell.id === id),
  'Spell selection must use a manifest spell id.',
);

const memberBaseShape = {
  combatantId: combatantIdSchema,
  tokenId: tokenIdSchema,
  characterId: integerSchema.min(1),
  classes: z.array(classSchema).min(1).max(12),
  abilities: z.strictObject(abilityRecordShape),
  armorClass: integerSchema.min(1).max(50),
  hitPointMaximum: integerSchema.min(1).max(100_000),
  walkingSpeedFeet: distanceSchema,
  initiativeBonus: modifierSchema,
  savingThrowBonuses: z.strictObject(saveRecordShape),
  attacksPerAction: integerSchema.min(1).max(20),
} as const;

const memberSharedShape = {
  attacks: z.array(attackSchema).max(100),
  startingConditions: z.array(startingConditionSchema).max(100),
} as const;

const v1MemberCoreSchema = z.strictObject({
  ...memberBaseShape,
  spellSlots: z.array(spellSlotSchema).max(9),
});

const v1MemberSchema = z.strictObject({
  ...memberBaseShape,
  spellSlots: z.array(spellSlotSchema).max(9),
  ...memberSharedShape,
  spellSelections: z.array(manifestSpellIdSchema).max(SPELL_MANIFEST.length),
});

const spellcastingSourceShape = {
  ability: z.enum(abilities),
  spellSaveDc: integerSchema.min(1).max(50),
  spellAttackBonus: modifierSchema,
  preparedSpellIds: z.array(manifestSpellIdSchema).max(SPELL_MANIFEST.length),
  knownSpellIds: z.array(manifestSpellIdSchema).max(SPELL_MANIFEST.length),
  grants: z.array(preparedSpellGrantSchema).max(SPELL_MANIFEST.length).optional(),
  resourceSpellUses: z.array(resourceSpellUseSchema).max(SPELL_MANIFEST.length).optional(),
} as const;

const spellcastingSourceSchema = z.strictObject(spellcastingSourceShape);

const legacySpellcastingSchema = z.strictObject({
  ...spellcastingSourceShape,
  spellSlots: z.array(v2SpellSlotSchema).max(9),
});

const spellcastingSourceInputShape = {
  ability: z.enum(abilities),
  spellSaveDc: integerSchema.min(1).max(50),
  spellAttackBonus: modifierSchema,
  preparedSpellIds: z.array(z.string()).max(SPELL_MANIFEST.length),
  knownSpellIds: z.array(z.string()).max(SPELL_MANIFEST.length),
  grants: z.array(preparedSpellGrantSchema).max(SPELL_MANIFEST.length).optional(),
  resourceSpellUses: z.array(resourceSpellUseSchema).max(SPELL_MANIFEST.length).optional(),
} as const;

const spellcastingSourceInputSchema = z.strictObject(spellcastingSourceInputShape);

const legacySpellcastingInputSchema = z.strictObject({
  ...spellcastingSourceInputShape,
  spellSlots: z.array(v2SpellSlotSchema).max(9),
});

const v2MemberCoreSchema = z.strictObject({
  ...memberBaseShape,
  sizeCategory: z.enum(creatureSizes),
});

const v2MemberSchema = z.strictObject({
  ...memberBaseShape,
  sizeCategory: z.enum(creatureSizes),
  ...memberSharedShape,
  spellcasting: z.union([
    legacySpellcastingSchema,
    z.array(spellcastingSourceSchema).min(1).max(4),
  ]).optional(),
  sharedSpellSlots: z.array(v2SpellSlotSchema).max(9).optional(),
  pactSpellSlots: z.array(pactSpellSlotSchema).max(9).optional(),
  effects: z.array(externalPartyPackFeatureEffectSchema).max(100).optional(),
  resources: z.array(externalPartyPackResourceSchema).max(100).optional(),
  passives: passivesSchema.optional(),
  worldOperations: z.array(externalWorldOperationSchema).max(100).optional(),
}).superRefine((member, context) => {
  if (Array.isArray(member.spellcasting) && member.sharedSpellSlots === undefined) {
    context.addIssue({
      code: 'custom',
      path: ['sharedSpellSlots'],
      message: 'Array-form spellcasting sources require member-level sharedSpellSlots.',
    });
  }
});

const externalPartyPackV1Schema = z.strictObject({
  schemaVersion: z.literal(EXTERNAL_PARTY_PACK_MINIMUM_SCHEMA_VERSION),
  partyId: partyIdSchema,
  allowPartial: z.boolean(),
  members: z.array(v1MemberSchema).min(3).max(5),
});

const externalPartyPackV2Schema = z.strictObject({
  schemaVersion: z.literal(EXTERNAL_PARTY_PACK_SCHEMA_VERSION),
  partyId: partyIdSchema,
  allowPartial: z.boolean(),
  members: z.array(v2MemberSchema).min(3).max(5),
});

export const externalPartyPackSchema = z.discriminatedUnion('schemaVersion', [
  externalPartyPackV1Schema,
  externalPartyPackV2Schema,
]);

export const externalPackPartySourceSchema = z.strictObject({
  packFile: z.string().min(1).max(4_096).refine(
    (value) => value.trim() === value,
    'External party-pack paths must be trimmed.',
  ),
});
export const partySourceSchema = z.union([
  z.literal('reference'),
  externalPackPartySourceSchema,
]);

export type ExternalPartyPack = z.infer<typeof externalPartyPackSchema>;
export type ExternalPartyPackV1 = z.infer<typeof externalPartyPackV1Schema>;
export type ExternalPartyPackV2 = z.infer<typeof externalPartyPackV2Schema>;
export type ExternalPartyPackMember = ExternalPartyPack['members'][number];
export type ExternalPartyPackAttack = z.infer<typeof attackSchema>;
export type ExternalPartyPackEffect = z.infer<typeof externalPartyPackFeatureEffectSchema>;
export type ExternalPartyPackResource = z.infer<typeof externalPartyPackResourceSchema>;
export type ExternalWorldOperation = z.infer<typeof externalWorldOperationSchema>;
export type PartySource = z.infer<typeof partySourceSchema>;

export interface LoadedPartyAttack {
  readonly attackId: ExternalPartyPackAttack['attackId'];
  readonly kind: ExternalPartyPackAttack['kind'];
  readonly attackBonus: number;
  readonly criticalFloor: number;
  readonly reach: ReturnType<typeof feet>;
  readonly range: ReturnType<typeof feet>;
  readonly damage: readonly {
    readonly type: DamageType;
    readonly count: number;
    readonly sides: DieSides;
    readonly modifier: number;
  }[];
}

export interface LoadedPartyCondition {
  readonly effectId: EncounterEffectId;
  readonly condition: ConditionName;
}

export interface LoadedPartySpellcastingSource {
  readonly ability: Ability;
  readonly spellSaveDc: number;
  readonly spellAttackBonus: number;
  readonly spellcastingModifier: number;
  readonly casterLevel: number;
  readonly preparedSpells: readonly SpellManifestRow[];
  readonly knownSpells: readonly SpellManifestRow[];
  readonly grants: readonly {
    readonly spell: SpellManifestRow;
    readonly ability: Ability;
    readonly spellSaveDc: number;
    readonly spellAttackBonus: number;
    readonly spellcastingModifier: number;
  }[];
  readonly resourceSpellUses: readonly {
    readonly spellId: string;
    readonly resourcePoolId: ReturnType<typeof limitedResourcePoolId>;
  }[];
}

export interface LoadedPartyMember {
  readonly source: ExternalPartyPackMember;
  readonly profile: Extract<CombatantProfile, { readonly kind: 'player_character' }>;
  readonly attacks: readonly LoadedPartyAttack[];
  readonly spells: readonly SpellManifestRow[];
  readonly spellcasting: readonly LoadedPartySpellcastingSource[];
  readonly sharedSpellSlots: readonly {
    readonly level: z.infer<typeof spellSlotLevelSchema>;
    readonly maximum: number;
    readonly recharge: 'long_rest';
  }[];
  readonly startingConditions: readonly LoadedPartyCondition[];
  readonly effects: readonly CombatFeatureEffect[];
  readonly worldOperations: readonly {
    readonly operationId: string;
    readonly cost: Extract<EncounterCommand, { readonly type: 'world_operation' }>['cost'];
    readonly operation: WorldOperation;
  }[];
}

export interface LoadedExternalPartyPack {
  readonly pack: ExternalPartyPack;
  readonly members: readonly LoadedPartyMember[];
}

export type PartyPackRefusalReason =
  | 'invalid_json'
  | 'invalid_structure'
  | 'unknown_spell_id'
  | 'too_many_spellcasting_sources'
  | 'pact_slots_unmodelled'
  | 'unsupported_effect_shape'
  | 'gaps_not_allowed'
  | 'no_mappable_members';

export type PartyPackRefusal =
  | {
      readonly kind: 'external_party_pack_refusal';
      readonly reason: Exclude<PartyPackRefusalReason, 'unsupported_effect_shape'>;
    }
  | {
      readonly kind: 'external_party_pack_refusal';
      readonly reason: 'unsupported_effect_shape';
      readonly unsupportedShape: string;
    };

export type PartyPackLoadResult =
  | {
      readonly status: 'loaded';
      readonly party: LoadedExternalPartyPack;
      readonly gaps: readonly GapReport[];
    }
  | {
      readonly status: 'refused';
      readonly refusal: PartyPackRefusal;
      readonly gaps: readonly GapReport[];
    };

export type LoadedPartySource =
  | { readonly kind: 'reference' }
  | {
      readonly kind: 'external-pack';
      readonly packFile: string;
      readonly result: PartyPackLoadResult;
    };

export async function loadPartySource(
  sourceValue: unknown,
  readPackFile: (packFile: string) => Promise<string>,
): Promise<LoadedPartySource> {
  const source = partySourceSchema.parse(sourceValue);
  if (source === 'reference') return { kind: 'reference' };
  return {
    kind: 'external-pack',
    packFile: source.packFile,
    result: loadExternalPartyPackBytes(await readPackFile(source.packFile)),
  };
}

const TOP_LEVEL_FIELDS = new Set(['schemaVersion', 'partyId', 'allowPartial', 'members']);
const SHARED_MEMBER_FIELDS = [
  'combatantId',
  'tokenId',
  'characterId',
  'classes',
  'abilities',
  'armorClass',
  'hitPointMaximum',
  'walkingSpeedFeet',
  'initiativeBonus',
  'savingThrowBonuses',
  'attacksPerAction',
  'attacks',
  'startingConditions',
] as const;
const V1_MEMBER_FIELDS = new Set([
  ...SHARED_MEMBER_FIELDS,
  'spellSlots',
  'spellSelections',
]);
const V2_MEMBER_FIELDS = new Set([
  ...SHARED_MEMBER_FIELDS,
  'sizeCategory',
  'spellcasting',
  'sharedSpellSlots',
  'pactSpellSlots',
  'effects',
  'resources',
  'passives',
  'worldOperations',
]);
const CLASS_FIELDS = new Set(['classId', 'level']);
const ABILITY_FIELDS = new Set<string>(abilities);
const SPELL_SLOT_FIELDS = new Set(['level', 'maximum']);
const V2_SPELL_SLOT_FIELDS = new Set(['level', 'count', 'recharge']);
const SPELLCASTING_SOURCE_FIELDS = new Set([
  'ability',
  'spellSaveDc',
  'spellAttackBonus',
  'preparedSpellIds',
  'knownSpellIds',
  'grants',
  'resourceSpellUses',
]);
const LEGACY_SPELLCASTING_FIELDS = new Set([
  ...SPELLCASTING_SOURCE_FIELDS,
  'spellSlots',
]);
const RESOURCE_SPELL_USE_FIELDS = new Set(['spellId', 'resourcePoolId']);
const PREPARED_SPELL_GRANT_FIELDS = new Set(['spellId', 'ability']);
const ATTACK_FIELDS = new Set([
  'attackId', 'kind', 'attackBonus', 'criticalFloor', 'reachFeet', 'rangeFeet', 'damage',
]);
const DAMAGE_FIELDS = new Set(['damageTypeId', 'count', 'sides', 'modifier']);
const CONDITION_FIELDS = new Set(['effectId', 'conditionId']);

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function pathText(path: readonly PropertyKey[]): string {
  return path.length === 0 ? 'party-pack' : path.map(String).join('.');
}

function issueGap(
  partyEntry: string,
  path: readonly PropertyKey[],
  reason: GapReport['engineRefusalReason'] = 'invalid_party_pack_structure',
): GapReport {
  const featurePath = pathText(path);
  return createGapReport({
    packEntry: partyEntry,
    featurePath,
    requestedCapability: `field:${featurePath}`,
    engineRefusalReason: reason,
  });
}

function unexpectedFieldGaps(
  value: Readonly<Record<string, unknown>>,
  allowed: ReadonlySet<string>,
  partyEntry: string,
  prefix: readonly PropertyKey[],
): readonly GapReport[] {
  return Object.keys(value)
    .filter((key) => !allowed.has(key))
    .map((key) => issueGap(
      partyEntry,
      [...prefix, key],
      'field_not_in_engine_vocabulary',
    ));
}

function sanitizedRecord(
  value: unknown,
  allowed: ReadonlySet<string>,
  partyEntry: string,
  prefix: readonly PropertyKey[],
  gaps: GapReport[],
): unknown {
  const input = record(value);
  if (input === null) return value;
  gaps.push(...unexpectedFieldGaps(input, allowed, partyEntry, prefix));
  return Object.fromEntries(
    [...allowed].filter((key) => Object.hasOwn(input, key)).map((key) => [key, input[key]]),
  );
}

function sanitizedArrayRecords(
  value: unknown,
  allowed: ReadonlySet<string>,
  partyEntry: string,
  prefix: readonly PropertyKey[],
  gaps: GapReport[],
): unknown {
  if (!Array.isArray(value)) return value;
  return value.map((entry, index) =>
    sanitizedRecord(entry, allowed, partyEntry, [...prefix, index], gaps));
}

function parsedBase(
  value: Readonly<Record<string, unknown>>,
  partyEntry: string,
  memberIndex: number,
  gaps: GapReport[],
): unknown {
  const prefix = ['members', memberIndex] as const;
  return {
    combatantId: value.combatantId,
    tokenId: value.tokenId,
    characterId: value.characterId,
    classes: sanitizedArrayRecords(value.classes, CLASS_FIELDS, partyEntry, [...prefix, 'classes'], gaps),
    abilities: sanitizedRecord(value.abilities, ABILITY_FIELDS, partyEntry, [...prefix, 'abilities'], gaps),
    armorClass: value.armorClass,
    hitPointMaximum: value.hitPointMaximum,
    walkingSpeedFeet: value.walkingSpeedFeet,
    initiativeBonus: value.initiativeBonus,
    savingThrowBonuses: sanitizedRecord(
      value.savingThrowBonuses,
      ABILITY_FIELDS,
      partyEntry,
      [...prefix, 'savingThrowBonuses'],
      gaps,
    ),
    attacksPerAction: value.attacksPerAction,
  };
}

function parsedV1Core(
  value: Readonly<Record<string, unknown>>,
  partyEntry: string,
  memberIndex: number,
  gaps: GapReport[],
): unknown {
  const prefix = ['members', memberIndex] as const;
  return {
    ...parsedBase(value, partyEntry, memberIndex, gaps) as Readonly<Record<string, unknown>>,
    spellSlots: sanitizedArrayRecords(
      value.spellSlots,
      SPELL_SLOT_FIELDS,
      partyEntry,
      [...prefix, 'spellSlots'],
      gaps,
    ),
  };
}

function parsedV2Core(
  value: Readonly<Record<string, unknown>>,
  partyEntry: string,
  memberIndex: number,
  gaps: GapReport[],
): unknown {
  return {
    ...parsedBase(value, partyEntry, memberIndex, gaps) as Readonly<Record<string, unknown>>,
    sizeCategory: value.sizeCategory,
  };
}

function sanitizedSpellcasting(
  value: unknown,
  partyEntry: string,
  memberIndex: number,
  sourceIndex: number | null,
  legacy: boolean,
  gaps: GapReport[],
): unknown {
  const prefix: readonly PropertyKey[] = sourceIndex === null
    ? ['members', memberIndex, 'spellcasting']
    : ['members', memberIndex, 'spellcasting', sourceIndex];
  const sanitized = sanitizedRecord(
    value,
    legacy ? LEGACY_SPELLCASTING_FIELDS : SPELLCASTING_SOURCE_FIELDS,
    partyEntry,
    prefix,
    gaps,
  );
  const input = record(sanitized);
  if (input === null) return sanitized;
  return {
    ...input,
    ...(legacy
      ? {
          spellSlots: sanitizedArrayRecords(
            input.spellSlots,
            V2_SPELL_SLOT_FIELDS,
            partyEntry,
            [...prefix, 'spellSlots'],
            gaps,
          ),
        }
      : {}),
    ...(Object.hasOwn(input, 'resourceSpellUses')
      ? {
          resourceSpellUses: sanitizedArrayRecords(
            input.resourceSpellUses,
            RESOURCE_SPELL_USE_FIELDS,
            partyEntry,
            [...prefix, 'resourceSpellUses'],
            gaps,
          ),
        }
      : {}),
    ...(Object.hasOwn(input, 'grants')
      ? {
          grants: sanitizedArrayRecords(
            input.grants,
            PREPARED_SPELL_GRANT_FIELDS,
            partyEntry,
            [...prefix, 'grants'],
            gaps,
          ),
        }
      : {}),
  };
}

function sanitizedAttack(
  value: unknown,
  partyEntry: string,
  memberIndex: number,
  attackIndex: number,
  gaps: GapReport[],
): unknown {
  const prefix = ['members', memberIndex, 'attacks', attackIndex] as const;
  const attack = sanitizedRecord(value, ATTACK_FIELDS, partyEntry, prefix, gaps);
  const input = record(attack);
  if (input === null) return attack;
  return {
    ...input,
    damage: sanitizedArrayRecords(
      input.damage,
      DAMAGE_FIELDS,
      partyEntry,
      [...prefix, 'damage'],
      gaps,
    ),
  };
}

function loadedAttack(attack: ExternalPartyPackAttack): LoadedPartyAttack {
  return {
    attackId: attack.attackId,
    kind: attack.kind,
    attackBonus: attack.attackBonus,
    criticalFloor: attack.criticalFloor,
    reach: feet(attack.reachFeet),
    range: feet(attack.rangeFeet),
    damage: attack.damage.map((term) => ({
      type: damageType(term.damageTypeId),
      count: term.count,
      sides: dieSides(term.sides),
      modifier: term.modifier,
    })),
  };
}

function loadedExternalWorldObject(
  object: z.infer<typeof externalWorldObjectSchema>,
): Extract<WorldOperation, { readonly kind: 'create_object' }>['object'] {
  return {
    id: worldObjectId(object.objectId),
    name: object.name,
    kind: object.kind,
    position: object.position,
    footprint: object.footprint,
    durability: object.durability,
    armorClass: armorClass(object.armorClass),
    damageResponses: object.damageResponses.map((response) => ({
      type: damageType(response.damageTypeId),
      response: response.response,
    })),
    blocking: object.blocking,
  };
}

function loadedWorldOperation(operation: ExternalWorldOperation['operation']): WorldOperation {
  switch (operation.kind) {
    case 'create_object':
      return { kind: 'create_object', object: loadedExternalWorldObject(operation.object) };
    case 'modify_object':
      return {
        kind: 'modify_object',
        objectId: worldObjectId(operation.objectId),
        changes: {
          ...(operation.changes.name === undefined ? {} : { name: operation.changes.name }),
          ...(operation.changes.kind === undefined ? {} : { kind: operation.changes.kind }),
          ...(operation.changes.position === undefined ? {} : { position: operation.changes.position }),
          ...(operation.changes.footprint === undefined ? {} : { footprint: operation.changes.footprint }),
          ...(operation.changes.durability === undefined ? {} : { durability: operation.changes.durability }),
          ...(operation.changes.armorClass === undefined ? {} : { armorClass: armorClass(operation.changes.armorClass) }),
          ...(operation.changes.damageResponses === undefined ? {} : {
            damageResponses: operation.changes.damageResponses.map((response) => ({
              type: damageType(response.damageTypeId), response: response.response,
            })),
          }),
          ...(operation.changes.blocking === undefined ? {} : { blocking: operation.changes.blocking }),
        },
      };
    case 'remove_object':
      return {
        kind: 'remove_object', objectId: worldObjectId(operation.objectId), reason: operation.reason,
      };
    case 'damage_object':
      return {
        kind: 'damage_object',
        objectId: worldObjectId(operation.objectId),
        delivery: operation.delivery,
        damage: {
          terms: operation.damage.terms.map((term) => ({
            type: damageType(term.damageTypeId),
            dice: { count: term.count, sides: dieSides(term.sides), modifier: term.modifier },
          })),
          critical: operation.damage.critical,
          responses: [],
        },
      };
    case 'transform_terrain':
      return {
        kind: 'transform_terrain', region: operation.region,
        difficultTerrain: operation.difficultTerrain,
      };
    case 'set_light_level':
      return { kind: 'set_light_level', region: operation.region, level: operation.level };
  }
}

type ExternalPersistentAreaEffect = Extract<ExternalPartyPackEffect, { readonly kind: 'persistent_area' }>;

function loadedPersistentAreaShape(shape: ExternalPersistentAreaEffect['shape']): PersistentAreaShape {
  switch (shape.kind) {
    case 'sphere': return { kind: 'sphere', radius: feet(shape.radiusFeet) };
    case 'cube': return { kind: 'cube', size: feet(shape.sizeFeet) };
    case 'cylinder': return { kind: 'cylinder', radius: feet(shape.radiusFeet), height: feet(shape.heightFeet) };
    case 'line': return {
      kind: 'line', length: feet(shape.lengthFeet), width: feet(shape.widthFeet), direction: shape.direction,
    };
    case 'emanation': return { kind: 'emanation', radius: feet(shape.radiusFeet) };
  }
}

function loadedPersistentAreaEffect(
  spec: ExternalPersistentAreaEffect['hooks'][number]['effect'],
): PersistentAreaEffectSpec {
  const payload = (() => {
    switch (spec.payload.kind) {
      case 'damage':
        return {
          kind: 'damage' as const,
          damage: {
            terms: spec.payload.damage.map((term) => ({
              type: damageType(term.damageTypeId),
              dice: { count: term.count, sides: dieSides(term.sides), modifier: term.modifier },
            })),
            critical: false,
            responses: [],
          },
        };
      case 'condition':
        return { kind: 'effect' as const, payload: { kind: 'condition' as const, condition: spec.payload.conditionId }, lifetime: spec.payload.lifetime };
      case 'skill_modifier':
        return { kind: 'effect' as const, payload: { kind: 'skill_modifier' as const, skill: spec.payload.skillId, amount: spec.payload.amount }, lifetime: spec.payload.lifetime };
      case 'movement_modifier':
        return { kind: 'effect' as const, payload: { kind: 'movement_modifier' as const, speedDeltaFeet: spec.payload.speedDeltaFeet }, lifetime: spec.payload.lifetime };
      case 'armor_class_modifier':
        return { kind: 'effect' as const, payload: { kind: 'armor_class_modifier' as const, amount: spec.payload.amount }, lifetime: spec.payload.lifetime };
    }
  })();
  return spec.kind === 'automatic'
    ? { kind: 'automatic', payload }
    : {
        kind: 'save_gated', ability: spec.ability, dc: spec.saveDc,
        rollMode: spec.rollMode, onSuccess: spec.onSuccess, payload,
      };
}

export function loadedFeatureEffect(
  effect: ExternalPartyPackEffect,
  totalLevel: number,
): CombatFeatureEffect {
  const common = {
    id: encounterEffectId(effect.effectId),
    trigger: 'trigger' in effect ? effect.trigger : 'always_on' as const,
    resourcePoolId: effect.resourcePoolId === undefined
      ? null
      : limitedResourcePoolId(effect.resourcePoolId),
  } as const;
  switch (effect.kind) {
    case 'damage_operation':
      return {
        ...common,
        payload: {
          kind: 'damage_operation',
          saveDc: effect.saveDc,
          delivery: effect.delivery,
          instancesPerTarget: effect.instancesPerTarget,
          packets: effect.packets.map((packet) => ({
            damageType: packet.damageType.kind === 'fixed'
              ? { kind: 'fixed', damageType: damageType(packet.damageType.damageType) }
              : {
                  kind: 'conversion',
                  from: damageType(packet.damageType.from),
                  to: damageType(packet.damageType.to),
                },
            dice: {
              baseCount: packet.dice.baseCount,
              sides: packet.dice.sides,
              modifier: packet.dice.modifier,
              perSlotCount: packet.dice.perSlotCount,
              perSlotModifier: packet.dice.perSlotModifier,
              cantripUpgrade: packet.dice.cantripUpgrade,
              ...(packet.dice.minimumTotal === undefined ? {} : { minimumTotal: packet.dice.minimumTotal }),
              ...(packet.dice.maximumTotal === undefined ? {} : { maximumTotal: packet.dice.maximumTotal }),
              ...(packet.dice.rerollBelow === undefined ? {} : { rerollBelow: packet.dice.rerollBelow }),
            },
            scaling: packet.scaling,
            thresholdRider: packet.thresholdRider,
          })),
          timing: effect.timing,
        },
      };
    case 'armed_weapon_hit_rider': {
      const packet = effect.damage;
      const selectedType = packet === null
        ? null
        : packet.damageType.kind === 'fixed'
          ? damageType(packet.damageType.damageType)
          : damageType(packet.damageType.to);
      return {
        ...common,
        payload: {
          kind: 'damage_rider',
          damage: {
            terms: packet === null || selectedType === null
              ? []
              : [{
                  type: selectedType,
                  dice: {
                    count: packet.dice.baseCount,
                    sides: dieSides(packet.dice.sides),
                    modifier: packet.dice.modifier,
                    ...(packet.dice.minimumTotal === undefined ? {} : { minimumTotal: packet.dice.minimumTotal }),
                    ...(packet.dice.maximumTotal === undefined ? {} : { maximumTotal: packet.dice.maximumTotal }),
                    ...(packet.dice.rerollBelow === undefined ? {} : { rerollBelow: packet.dice.rerollBelow }),
                  },
                }],
            critical: false,
            responses: [],
          },
          appliesTo: 'weapon_attack_by_target',
          consumeOnHit: effect.persistence === 'consume_on_hit',
          arming: { durationRounds: effect.durationRounds, concentration: effect.concentration },
          ...(effect.saveGatedRider === null
            ? {}
            : {
                followUp: {
                  kind: 'save_then_condition' as const,
                  saveAbility: effect.saveGatedRider.ability,
                  saveDc: effect.saveDc,
                  rollMode: effect.saveGatedRider.rollMode,
                  condition: effect.saveGatedRider.condition,
                  expiresAt: effect.saveGatedRider.expiresAt,
                  durationRounds: effect.saveGatedRider.durationRounds,
                },
              }),
        },
      };
    }
    case 'damage_rider':
      return {
        ...common,
        payload: {
          kind: 'damage_rider',
          damage: {
            terms: effect.damage.map((term) => ({
              type: damageType(term.damageTypeId),
              dice: {
                count: term.count,
                sides: dieSides(term.sides),
                modifier: term.modifier,
              },
            })),
            critical: false,
            responses: [],
          },
          appliesTo: 'weapon_attack_by_target',
        },
      };
    case 'once_per_turn_damage_rider':
      return {
        ...common,
        payload: {
          kind: 'damage_rider',
          damage: {
            terms: effect.damage.map((term) => ({
              type: damageType(term.damageTypeId),
              dice: { count: term.count, sides: dieSides(term.sides), modifier: term.modifier },
            })),
            critical: false,
            responses: [],
          },
          appliesTo: 'weapon_attack_by_target',
          gating: {
            kind: 'once_per_turn',
            oncePerTurnGate: effect.oncePerTurnGate,
            qualifyingGates: effect.qualifyingGates,
          },
        },
      };
    case 'slot_spend_damage_rider':
      return {
        ...common,
        payload: {
          kind: 'damage_rider',
          damage: {
            terms: [{
              type: damageType(effect.damageTypeId),
              dice: { count: 0, sides: dieSides(effect.sides), modifier: effect.modifier },
            }],
            critical: false,
            responses: [],
          },
          appliesTo: 'weapon_attack_by_target',
          gating: {
            kind: 'slot_spend',
            spendGate: effect.spendGate,
            criticalGate: effect.criticalGate,
            baseCount: effect.baseCount,
            countPerSlotLevel: effect.countPerSlotLevel,
          },
        },
      };
    case 'first_hit_damage_rider':
      return {
        ...common,
        payload: {
          kind: 'damage_rider',
          damage: {
            terms: [{
              type: damageType(effect.damageTypeId),
              dice: { count: 0, sides: dieSides(6), modifier: effect.amount },
            }],
            critical: false,
            responses: [],
          },
          appliesTo: 'weapon_attack_by_target',
          gating: { kind: 'first_hit_this_turn', gate: effect.gate },
        },
      };
    case 'bonus_action_attack_grant':
      return { ...common, payload: { kind: 'bonus_action_attack_grant', attackCount: effect.attackCount } };
    case 'extra_attack_count_override': {
      const attackCount = [...effect.levels]
        .filter((level) => level.minimumLevel <= totalLevel)
        .sort((left, right) => right.minimumLevel - left.minimumLevel)[0]?.attackCount ?? 1;
      return { ...common, payload: { kind: 'extra_attack_count_override', attackCount } };
    }
    case 'action_surge':
      return { ...common, payload: { kind: 'action_surge', perShortRest: true } };
    case 'attack_roll_modifier':
      return { ...common, payload: { kind: 'attack_roll_modifier', count: effect.count, sides: effect.sides, sign: effect.sign } };
    case 'attack_roll_mode':
      return { ...common, payload: { kind: 'attack_roll_mode_modifier', mode: effect.mode, appliesTo: { kind: 'next_attack_against_target' } } };
    case 'reckless_attack_mode':
      return {
        ...common,
        payload: {
          kind: 'reckless_attack_mode',
          strengthBasedMeleeAttackIds: effect.strengthBasedMeleeAttackIds,
        },
      };
    case 'armor_class_modifier':
      return { ...common, payload: { kind: 'armor_class_modifier', amount: effect.amount } };
    case 'saving_throw_modifier':
      return { ...common, payload: { kind: 'saving_throw_modifier', count: effect.count, sides: effect.sides, sign: effect.sign } };
    case 'skill_modifier':
      return { ...common, payload: { kind: 'ability_check_modifier', count: effect.count, sides: effect.sides, sign: effect.sign, skill: effect.skillId } };
    case 'temporary_hit_points':
      return { ...common, payload: { kind: 'temporary_hit_points', amount: effect.amount } };
    case 'condition_application':
      return { ...common, payload: { kind: 'condition', condition: effect.conditionId } };
    case 'exhaustion_application':
      return { ...common, payload: { kind: 'exhaustion', level: effect.level } };
    case 'movement_modifier':
      return { ...common, payload: { kind: 'movement_modifier', speedDeltaFeet: effect.speedDeltaFeet } };
    case 'attack_ability_substitution':
      return {
        ...common,
        payload: {
          kind: 'attack_ability_substitution',
          attackId: effect.attackId,
          damageTermIndex: effect.damageTermIndex,
          replacesAbility: effect.replacesAbility,
          spellcastingAbility: effect.spellcastingAbility,
        },
      };
    case 'attack_damage_die_override':
      return {
        ...common,
        payload: {
          kind: 'attack_damage_die_override',
          attackId: effect.attackId,
          damageTermIndex: effect.damageTermIndex,
          levels: effect.levels,
        },
      };
    case 'attack_reach_range_override':
      return {
        ...common,
        payload: {
          kind: 'attack_reach_range_override',
          attackId: effect.attackId,
          ...(effect.reachFeet === undefined ? {} : { reachFeet: effect.reachFeet }),
          ...(effect.rangeFeet === undefined ? {} : { rangeFeet: effect.rangeFeet }),
        },
      };
    case 'save_gated_banishment_on_hit':
      return {
        ...common,
        payload: {
          kind: 'save_gated_banishment_on_hit',
          saveAbility: effect.saveAbility,
          saveDc: effect.saveDc,
          rollMode: effect.rollMode,
          returnAt: effect.returnAt,
          returnDamage: {
            terms: [{
              type: damageType(effect.returnDamage.damageTypeId),
              dice: {
                count: effect.returnDamage.count,
                sides: dieSides(effect.returnDamage.sides),
                modifier: effect.returnDamage.modifier,
              },
            }],
            critical: false,
            responses: [],
          },
          returnPlacement: effect.returnPlacement,
        },
      };
    case 'spell_damage_ability_modifier':
      return {
        ...common,
        payload: {
          kind: 'spell_damage_ability_modifier',
          spellId: effect.spellId,
          application: effect.application,
        },
      };
    case 'timed_spellcasting_mode':
      return {
        ...common,
        payload: {
          kind: 'timed_spellcasting_mode',
          additionalLeveledSpellActions: effect.additionalLeveledSpellActions,
          duration: effect.duration,
        },
      };
    case 'attack_damage_type_choice':
      return {
        ...common,
        payload: {
          kind: 'attack_damage_type_choice',
          attackId: effect.attackId,
          damageTermIndex: effect.damageTermIndex,
          options: effect.damageTypeIds.map(damageType),
        },
      };
    case 'resource_die_maneuver':
      return {
        ...common,
        payload: {
          kind: 'resource_die_maneuver',
          dieSides: dieSides(effect.sides),
          damageType: effect.damageType,
          condition: effect.conditionId,
          conditionDuration: effect.conditionDuration,
        },
      };
    case 'exploding_spell_damage_die':
      return {
        ...common,
        payload: {
          kind: 'exploding_spell_damage_die',
          spellId: effect.spellId,
          triggerFace: effect.triggerFace,
          maximumExplosionsPerDie: effect.maximumExplosionsPerDie,
        },
      };
    case 'elemental_fury':
      return {
        ...common,
        payload: {
          kind: 'elemental_fury',
          attackIds: effect.attackIds,
          damageTypes: effect.damageTypeIds.map(damageType),
          selectedDamageType: damageType(effect.selectedDamageTypeId),
          amount: effect.amount,
          gate: effect.gate,
        },
      };
    case 'persistent_area':
      return {
        ...common,
        payload: {
          kind: 'persistent_area',
          area: {
            origin: effect.origin,
            shape: loadedPersistentAreaShape(effect.shape),
            duration: { kind: effect.duration.kind, remaining: effect.duration.rounds },
            targetFilter: { kind: effect.targetFilter },
            difficultTerrain: effect.difficultTerrain,
            hooks: effect.hooks.map((hook) => ({
              hook: hook.hook,
              frequency: hook.frequency,
              effect: loadedPersistentAreaEffect(hook.effect),
            })),
            movable: effect.movableFeet === null ? null : { maximumFeet: feet(effect.movableFeet) },
          },
        },
      };
  }
}

type ExternalPartyPackV2Member = ExternalPartyPackV2['members'][number];

function v2MemberExtensions(member: ExternalPartyPackMember): {
  readonly effects: readonly ExternalPartyPackEffect[];
  readonly resources: readonly ExternalPartyPackResource[];
  readonly passives: z.infer<typeof passivesSchema> | null;
  readonly sizeCategory: KnownCreatureSize | null;
  readonly worldOperations: readonly ExternalWorldOperation[];
} {
  if (
    !Object.hasOwn(member, 'effects') &&
    !Object.hasOwn(member, 'resources') &&
    !Object.hasOwn(member, 'passives') &&
    !Object.hasOwn(member, 'worldOperations')
  ) {
    return {
      effects: [], resources: [], passives: null,
      worldOperations: [],
      sizeCategory: Object.hasOwn(member, 'sizeCategory')
        ? (member as ExternalPartyPackV2Member).sizeCategory
        : null,
    };
  }
  const v2Member = member as ExternalPartyPackV2Member;
  return {
    effects: v2Member.effects ?? [],
    resources: v2Member.resources ?? [],
    passives: v2Member.passives ?? null,
    worldOperations: v2Member.worldOperations ?? [],
    sizeCategory: v2Member.sizeCategory,
  };
}

function loadedMember(
  member: ExternalPartyPackMember,
  spells: readonly SpellManifestRow[],
  spellSlots: readonly { readonly level: z.infer<typeof spellSlotLevelSchema>; readonly maximum: number }[],
  spellcasting: readonly LoadedPartySpellcastingSource[],
): LoadedPartyMember {
  const extensions = v2MemberExtensions(member);
  const passive = extensions.passives;
  const savingThrowBonuses = Object.fromEntries(
    abilities.map((ability) => [
      ability,
      member.savingThrowBonuses[ability] + (passive?.savingThrowBonuses?.[ability] ?? 0),
    ]),
  ) as Record<Ability, number>;
  const totalLevel = member.classes.reduce((sum, heldClass) => sum + heldClass.level, 0);
  const effects = extensions.effects.map((effect) => loadedFeatureEffect(effect, totalLevel));
  const skillBonuses = Object.fromEntries(
    (passive?.skillBonuses ?? []).map((entry) => [entry.skillId, entry.bonus]),
  ) as Partial<Record<Skill, number>>;
  return {
    source: member,
    profile: {
      kind: 'player_character',
      id: combatantId(member.combatantId),
      tokenId: tokenId(member.tokenId),
      name: member.combatantId.slice('combatant:'.length),
      characterId: member.characterId,
      rules: {
        armorClass: armorClass(member.armorClass + (passive?.armorClassBonus ?? 0)),
        hitPointMaximum: member.hitPointMaximum,
        speed: feet(member.walkingSpeedFeet + (passive?.speedAdjustmentFeet ?? 0)),
        initiativeBonus: member.initiativeBonus + (passive?.initiativeBonus ?? 0),
        savingThrowBonuses,
        attacksPerAction: member.attacksPerAction,
        reach: feet(Math.max(5, ...member.attacks.map((attack) => attack.reachFeet))),
        damageResponses: (passive?.damageResponses ?? []).map((entry) => ({
          type: damageType(entry.damageTypeId),
          response: entry.response,
        })),
        conditionImmunities: [...(passive?.conditionImmunities ?? [])],
        usesDeathSaves: true,
        ...(extensions.sizeCategory === null ? {} : { sizeCategory: extensions.sizeCategory }),
        spellSlots: spellSlots.map((capacity) => ({
          level: capacity.level,
          maximum: capacity.maximum,
        })),
        ...(Object.hasOwn(member, 'resources')
          ? {
              limitedResources: extensions.resources.map((pool) => ({
                id: limitedResourcePoolId(pool.resourcePoolId),
                maximum: pool.maximum,
                recharge: pool.recharge,
              })),
            }
          : {}),
        ...(Object.hasOwn(member, 'effects') ? { featureEffects: effects } : {}),
        ...(passive?.skillBonuses === undefined ? {} : { skillBonuses }),
      },
    },
    attacks: member.attacks.map(loadedAttack),
    spells,
    spellcasting,
    sharedSpellSlots: spellSlots.map((capacity) => ({
      ...capacity,
      recharge: 'long_rest',
    })),
    startingConditions: member.startingConditions.map((condition) => ({
      effectId: encounterEffectId(condition.effectId),
      condition: condition.conditionId,
    })),
    effects,
    worldOperations: extensions.worldOperations.map((entry) => ({
      operationId: entry.operationId,
      cost: entry.cost,
      operation: loadedWorldOperation(entry.operation),
    })),
  };
}

export class PartySpellcastingError extends Error {
  override readonly name = 'PartySpellcastingError' as const;

  constructor(readonly reason: 'spellcasting_unavailable' | 'spell_not_referenced' | 'ambiguous_spell_source') {
    super(reason === 'spellcasting_unavailable'
      ? 'The loaded party member has no v2 spellcasting capability.'
      : reason === 'spell_not_referenced'
        ? 'The requested spell is not referenced by the loaded party member.'
        : 'The requested spell is referenced by multiple spellcasting sources.');
  }
}

export class PartyFeatureEffectError extends Error {
  override readonly name = 'PartyFeatureEffectError' as const;

  constructor(readonly reason: 'effect_not_referenced' | 'effect_is_automatic') {
    super(reason === 'effect_not_referenced'
      ? 'The requested effect is not referenced by the loaded party member.'
      : 'The requested effect is driven automatically by its trigger.');
  }
}

export class PartyAttackError extends Error {
  override readonly name = 'PartyAttackError' as const;

  constructor() {
    super('The requested attack is not referenced by the loaded party member.');
  }
}

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function effectiveLoadedPartyAttack(
  member: LoadedPartyMember,
  attack: LoadedPartyAttack,
): LoadedPartyAttack {
  let effective = attack;
  const totalLevel = member.source.classes.reduce((sum, heldClass) => sum + heldClass.level, 0);
  for (const effect of member.effects) {
    const payload = effect.payload;
    if (!('attackId' in payload) || payload.attackId !== attack.attackId) continue;
    switch (payload.kind) {
      case 'attack_ability_substitution': {
        const modifierDelta = abilityModifier(member.source.abilities[payload.spellcastingAbility]) -
          abilityModifier(member.source.abilities[payload.replacesAbility]);
        effective = {
          ...effective,
          attackBonus: effective.attackBonus + modifierDelta,
          damage: effective.damage.map((term, index) =>
            index === payload.damageTermIndex
              ? { ...term, modifier: term.modifier + modifierDelta }
              : term),
        };
        break;
      }
      case 'attack_damage_die_override': {
        const tier = [...payload.levels]
          .filter((level) => level.minimumLevel <= totalLevel)
          .sort((left, right) => right.minimumLevel - left.minimumLevel)[0];
        if (tier === undefined) break;
        effective = {
          ...effective,
          damage: effective.damage.map((term, index) =>
            index === payload.damageTermIndex
              ? { ...term, count: tier.count, sides: dieSides(tier.sides) }
              : term),
        };
        break;
      }
      case 'attack_reach_range_override':
        effective = {
          ...effective,
          reach: payload.reachFeet === undefined ? effective.reach : feet(payload.reachFeet),
          range: payload.rangeFeet === undefined ? effective.range : feet(payload.rangeFeet),
        };
        break;
      case 'attack_damage_type_choice':
        break;
    }
  }
  return effective;
}

/** Builds a standard weapon attack; on-hit/on-crit feature riders stay reducer-owned. */
export function loadedPartyAttackCommand(
  member: LoadedPartyMember,
  attackId: string,
  target: Extract<EncounterCommand, { readonly type: 'attack' }>['target'],
  options: {
    readonly recklessAttackEffectId?: EncounterEffectId;
    readonly bonusActionGrantEffectId?: EncounterEffectId;
    readonly riderSelections?: readonly {
      readonly effectId: EncounterEffectId;
      readonly slotLevel: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
    }[];
    readonly damageTypeSelection?: {
      readonly effectId: EncounterEffectId;
      readonly damageTypeId: string;
    };
    readonly maneuverEffectId?: EncounterEffectId;
  } = {},
): Extract<EncounterCommand, { readonly type: 'attack' }> {
  const declaredAttack = member.attacks.find((candidate) => candidate.attackId === attackId);
  if (declaredAttack === undefined) throw new PartyAttackError();
  const attack = effectiveLoadedPartyAttack(member, declaredAttack);
  const declaredDamageTypeChoice = member.effects.find((candidate) =>
    candidate.payload.kind === 'attack_damage_type_choice' &&
    candidate.payload.attackId === attack.attackId);
  if (declaredDamageTypeChoice !== undefined && options.damageTypeSelection === undefined) {
    throw new PartyAttackError();
  }
  const damageTypeSelection = options.damageTypeSelection === undefined
    ? undefined
    : (() => {
        const effect = member.effects.find((candidate) => candidate.id === options.damageTypeSelection?.effectId);
        const selected = damageType(options.damageTypeSelection.damageTypeId);
        if (
          effect?.payload.kind !== 'attack_damage_type_choice' ||
          effect.payload.attackId !== attack.attackId ||
          !effect.payload.options.includes(selected)
        ) {
          throw new PartyAttackError();
        }
        return { effectId: effect.id, damageType: selected };
      })();
  if (options.maneuverEffectId !== undefined) {
    const maneuver = member.effects.find((candidate) => candidate.id === options.maneuverEffectId);
    if (maneuver?.payload.kind !== 'resource_die_maneuver' || maneuver.resourcePoolId === null) {
      throw new PartyAttackError();
    }
  }
  return {
    type: 'attack',
    actor: member.profile.id,
    target,
    attackBonus: attack.attackBonus,
    criticalFloor: attack.criticalFloor,
    rollMode: 'normal',
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    damage: {
      terms: attack.damage.map((term) => ({
        type: term.type,
        dice: { count: term.count, sides: term.sides, modifier: term.modifier },
      })),
      critical: false,
      responses: [],
    },
    attackId: attack.attackId,
    ...(options.recklessAttackEffectId === undefined
      ? {}
      : { recklessAttackEffectId: options.recklessAttackEffectId }),
    ...(options.bonusActionGrantEffectId === undefined
      ? {}
      : { bonusActionGrantEffectId: options.bonusActionGrantEffectId }),
    ...(options.riderSelections === undefined
      ? {}
      : { riderSelections: options.riderSelections }),
    ...(damageTypeSelection === undefined ? {} : { damageTypeSelection }),
    ...(options.maneuverEffectId === undefined ? {} : { maneuverEffectId: options.maneuverEffectId }),
  };
}

function loadedMemberPosition(state: Parameters<TurnLegalActions>[0], id: ReturnType<typeof combatantId>) {
  const found = state.tokens.find((candidate) => candidate.combatantId === id);
  if (found === undefined) throw new Error(`Loaded party combatant ${id} has no token.`);
  return found.position;
}

/** Enumerates reducer-valid attacks and feature actions for loaded v2 party members. */
export function loadedPartyTurnLegalActions(
  members: readonly LoadedPartyMember[],
): TurnLegalActions {
  const byId = new Map(members.map((member) => [member.profile.id, member] as const));
  return (state, actor) => {
    const member = byId.get(actor);
    if (member === undefined) return { actions: [{ type: 'end_turn', actor }] };
    const acting = state.combatants.find((candidate) => candidate.profile.id === actor);
    if (acting === undefined) throw new Error(`Loaded party combatant ${actor} is absent from the encounter.`);
    if (!state.tokens.some((candidate) => candidate.combatantId === actor)) {
      return { actions: [{ type: 'end_turn', actor }] };
    }
    const targets = state.combatants.filter((candidate) =>
      candidate.profile.kind !== acting.profile.kind &&
      candidate.life !== 'dead' &&
      state.tokens.some((token) => token.combatantId === candidate.profile.id));
    const smites = member.effects.filter((effect) =>
      effect.payload.kind === 'damage_rider' && effect.payload.gating?.kind === 'slot_spend');
    const riderChoices = [undefined, ...smites.flatMap((effect) =>
      acting.spellSlots
        .filter((slot) => slot.remaining > 0 && slot.level >= 1 && slot.level <= 9)
        .map((slot) => [{ effectId: effect.id, slotLevel: slot.level as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 }]))];
    const commands = (
      bonusActionGrantEffectId?: EncounterEffectId,
    ): Extract<EncounterCommand, { readonly type: 'attack' }>[] =>
      targets.flatMap((target) => member.attacks.flatMap((declaredAttack) => {
        const attack = effectiveLoadedPartyAttack(member, declaredAttack);
        const distance = gridDistance(
          loadedMemberPosition(state, actor),
          loadedMemberPosition(state, target.profile.id),
        );
        const inRange = attack.kind === 'melee'
          ? distance <= attack.reach
          : distance <= attack.range;
        if (!inRange) return [];
        const recklessChoices = acting.turn.action.kind === 'available'
          ? member.effects.flatMap((effect) =>
              effect.payload.kind === 'reckless_attack_mode' &&
              effect.payload.strengthBasedMeleeAttackIds.includes(attack.attackId)
                ? [effect.id]
              : [])
          : [];
        const declaredDamageTypeChoices = member.effects.flatMap((effect) =>
          effect.payload.kind === 'attack_damage_type_choice' && effect.payload.attackId === attack.attackId
            ? effect.payload.options.map((type) => ({ effectId: effect.id, damageTypeId: String(type) }))
            : []);
        const damageTypeChoices = declaredDamageTypeChoices.length === 0
          ? [undefined]
          : declaredDamageTypeChoices;
        const maneuverChoices = [undefined, ...member.effects.flatMap((effect) => {
          if (effect.payload.kind !== 'resource_die_maneuver' || effect.resourcePoolId === null) return [];
          const pool = (acting.limitedResources ?? []).find((candidate) => candidate.id === effect.resourcePoolId);
          return (pool?.remaining ?? 0) > 0 ? [effect.id] : [];
        })];
        return riderChoices.flatMap((riderSelections) =>
          damageTypeChoices.flatMap((damageTypeSelection) =>
            maneuverChoices.flatMap((maneuverEffectId) => [
              loadedPartyAttackCommand(member, attack.attackId, target.profile.id, {
                ...(bonusActionGrantEffectId === undefined ? {} : { bonusActionGrantEffectId }),
                ...(riderSelections === undefined ? {} : { riderSelections }),
                ...(damageTypeSelection === undefined ? {} : { damageTypeSelection }),
                ...(maneuverEffectId === undefined ? {} : { maneuverEffectId }),
              }),
              ...recklessChoices.map((recklessAttackEffectId) => loadedPartyAttackCommand(
                member,
                attack.attackId,
                target.profile.id,
                {
                  recklessAttackEffectId,
                  ...(riderSelections === undefined ? {} : { riderSelections }),
                  ...(damageTypeSelection === undefined ? {} : { damageTypeSelection }),
                  ...(maneuverEffectId === undefined ? {} : { maneuverEffectId }),
                },
              )),
            ])));
      }));

    const actions: EncounterCommand[] = [];
    if (acting.turn.action.kind !== 'spent') actions.push(...commands());
    for (const effect of member.effects) {
      if (effect.payload.kind === 'bonus_action_attack_grant') {
        const pool = effect.resourcePoolId === null
          ? null
          : (acting.limitedResources ?? []).find((candidate) => candidate.id === effect.resourcePoolId);
        const continuing = (acting.turn.bonusAttacksRemaining ?? 0) > 0 &&
          acting.turn.bonusAttackGrantEffectId === effect.id;
        if (continuing || (acting.turn.bonusActionAvailable && (pool === null || (pool?.remaining ?? 0) > 0))) {
          actions.push(...commands(effect.id));
        }
      }
      if (effect.payload.kind === 'action_surge' && acting.turn.action.kind === 'spent') {
        const pool = effect.resourcePoolId === null
          ? null
          : (acting.limitedResources ?? []).find((candidate) => candidate.id === effect.resourcePoolId);
        if ((pool?.remaining ?? 0) > 0) {
          actions.push({ type: 'activate_action_surge', actor, effectId: effect.id });
        }
      }
      if (
        effect.payload.kind === 'timed_spellcasting_mode' &&
        acting.turn.bonusActionAvailable &&
        acting.turn.additionalLeveledSpellActionsRemaining !== 1
      ) {
        const pool = effect.resourcePoolId === null
          ? null
          : (acting.limitedResources ?? []).find((candidate) => candidate.id === effect.resourcePoolId);
        if ((pool?.remaining ?? 0) > 0) {
          actions.push({ type: 'activate_timed_spellcasting_mode', actor, effectId: effect.id });
        }
      }
      if (effect.payload.kind === 'persistent_area' && effect.payload.area.origin === 'self') {
        const pool = effect.resourcePoolId === null
          ? null
          : (acting.limitedResources ?? []).find((candidate) => candidate.id === effect.resourcePoolId);
        const resourceAvailable = pool === null || (pool?.remaining ?? 0) > 0;
        const costAvailable = effect.trigger === 'action'
          ? acting.turn.action.kind !== 'spent'
          : effect.trigger === 'bonus_action'
            ? acting.turn.bonusActionAvailable
            : false;
        if (resourceAvailable && costAvailable) actions.push(loadedPartyEffectCommand(member, String(effect.id), []));
      }
    }
    actions.push({ type: 'end_turn', actor });
    return { actions };
  };
}

/** Activates an action-economy feature through existing effect/temp-HP commands. */
export function loadedPartyWorldOperationCommand(
  member: LoadedPartyMember,
  operationId: string,
): Extract<EncounterCommand, { readonly type: 'world_operation' }> {
  const declared = member.worldOperations.find((entry) => entry.operationId === operationId);
  if (declared === undefined) throw new RangeError(`The party member does not declare ${operationId}.`);
  return {
    type: 'world_operation',
    actor: member.profile.id,
    cost: declared.cost,
    operation: structuredClone(declared.operation),
  };
}

export function loadedPartyEffectCommand(
  member: LoadedPartyMember,
  effectId: string,
  targets: readonly Extract<EncounterCommand, { readonly type: 'apply_effect' }>['effect']['targets'][number][],
): Extract<EncounterCommand, {
  readonly type:
    | 'apply_effect'
    | 'grant_temporary_hit_points'
    | 'create_persistent_area'
    | 'activate_damage_operation'
    | 'arm_weapon_hit_rider';
}> {
  const effect = member.effects.find((candidate) => candidate.id === effectId);
  if (effect === undefined) throw new PartyFeatureEffectError('effect_not_referenced');
  if (
    effect.trigger === 'always_on' ||
    effect.trigger === 'on_hit' ||
    effect.trigger === 'on_crit' ||
    effect.trigger === 'on_save_fail'
  ) {
    throw new PartyFeatureEffectError('effect_is_automatic');
  }
  const cost = effect.trigger;
  const resource = effect.resourcePoolId === null
    ? {}
    : { resourcePoolId: effect.resourcePoolId };
  if (effect.payload.kind === 'damage_operation') {
    return {
      type: 'activate_damage_operation',
      actor: member.profile.id,
      effectId: effect.id,
      targets,
    };
  }
  if (effect.payload.kind === 'damage_rider' && effect.payload.arming !== undefined) {
    if (targets.length !== 0) throw new RangeError('Arming a weapon-hit rider does not select a target.');
    return { type: 'arm_weapon_hit_rider', actor: member.profile.id, effectId: effect.id };
  }
  if (effect.payload.kind === 'persistent_area') {
    if (effect.payload.area.origin !== 'self') {
      throw new RangeError('A selected persistent area requires an explicit board placement command.');
    }
    const { origin: _origin, ...area } = effect.payload.area;
    return {
      type: 'create_persistent_area',
      actor: member.profile.id,
      area: {
        ...structuredClone(area),
        owner: member.profile.id,
        origin: { kind: 'anchored', combatant: member.profile.id },
      },
      cost,
      featureEffectId: effect.id,
    };
  }
  if (effect.payload.kind === 'temporary_hit_points') {
    const target = targets[0];
    if (target === undefined || targets.length !== 1) {
      throw new RangeError('Temporary Hit Points require exactly one target.');
    }
    return {
      type: 'grant_temporary_hit_points',
      actor: member.profile.id,
      target,
      amount: effect.payload.amount,
      cost,
      ...resource,
    };
  }
  if (
    isAttackFormSubstitutionPayload(effect.payload) ||
    effect.payload.kind === 'reckless_attack_mode' ||
    isTypedCombatFeaturePayload(effect.payload)
  ) {
    throw new PartyFeatureEffectError('effect_is_automatic');
  }
  const application: EffectApplication = {
    targets,
    duration: { kind: 'permanent' },
    concentration: false,
    stackingIdentity: effectStackingIdentity(`feature:${effect.id}`),
    stacking: 'replace_same_source',
    repeatedSave: null,
    payload: effect.payload,
  };
  return {
    type: 'apply_effect',
    actor: member.profile.id,
    effect: application,
    cost,
    ...resource,
  };
}

export type LoadedPartySpellCastDetails = Omit<Pick<
  SpellCastCommand,
  | 'slotLevel'
  | 'castAsRitual'
  | 'targets'
  | 'area'
  | 'weaponAttack'
  | 'selectedOption'
>, 'weaponAttack'> & {
  readonly weaponAttack: null | {
    readonly attackId: string;
    readonly damageTermIndex: number;
  };
  readonly resourcePoolId?: string;
};

/** Builds the existing resolver command exclusively from a v2 member's referenced spell vocabulary. */
export function loadedPartySpellCastCommand(
  member: LoadedPartyMember,
  spellId: string,
  details: LoadedPartySpellCastDetails,
): SpellCastCommand {
  if (member.spellcasting.length === 0) throw new PartySpellcastingError('spellcasting_unavailable');
  const matchingSources = member.spellcasting.flatMap((source) => [
    ...(source.preparedSpells.some((spell) => spell.id === spellId) ||
      source.knownSpells.some((spell) => spell.id === spellId)
      ? [{ source, grant: null }]
      : []),
    ...source.grants
      .filter((grant) => grant.spell.id === spellId)
      .map((grant) => ({ source, grant })),
  ]);
  if (matchingSources.length === 0 || !member.spells.some((spell) => spell.id === spellId)) {
    throw new PartySpellcastingError('spell_not_referenced');
  }
  if (matchingSources.length > 1) throw new PartySpellcastingError('ambiguous_spell_source');
  const castingRoute = matchingSources[0];
  if (castingRoute === undefined) throw new PartySpellcastingError('spell_not_referenced');
  const spellcasting = castingRoute.source;
  const resourceUse = details.resourcePoolId === undefined
    ? undefined
    : spellcasting.resourceSpellUses.find((use) =>
      use.spellId === spellId && use.resourcePoolId === details.resourcePoolId);
  if (details.resourcePoolId !== undefined && resourceUse === undefined) {
    throw new RangeError(
      `Spell ${spellId} is not declared for loaded resource pool ${details.resourcePoolId}.`,
    );
  }
  let weaponAttack: SpellCastCommand['weaponAttack'] = null;
  if (details.weaponAttack !== null) {
    const declaredAttack = member.attacks.find((candidate) =>
      candidate.attackId === details.weaponAttack?.attackId);
    if (declaredAttack === undefined) throw new PartyAttackError();
    const attack = effectiveLoadedPartyAttack(member, declaredAttack);
    const term = attack.damage[details.weaponAttack.damageTermIndex];
    if (term === undefined) throw new PartyAttackError();
    weaponAttack = {
      attackBonus: attack.attackBonus,
      damageType: term.type,
      damageCount: term.count,
      damageSides: term.sides,
      damageModifier: term.modifier,
    };
  }
  return {
    type: 'cast_spell',
    actor: member.profile.id,
    spellId,
    casterLevel: spellcasting.casterLevel,
    attackBonus: castingRoute.grant?.spellAttackBonus ?? spellcasting.spellAttackBonus,
    saveDc: castingRoute.grant?.spellSaveDc ?? spellcasting.spellSaveDc,
    spellcastingModifier: castingRoute.grant?.spellcastingModifier ?? spellcasting.spellcastingModifier,
    slotLevel: details.slotLevel,
    castAsRitual: details.castAsRitual,
    targets: details.targets,
    area: details.area,
    weaponAttack,
    selectedOption: details.selectedOption,
    ...(resourceUse === undefined ? {} : { resourcePoolId: resourceUse.resourcePoolId }),
  };
}

function refusal(
  reason: PartyPackRefusalReason,
  gaps: readonly GapReport[],
  unsupportedShape?: string,
): PartyPackLoadResult {
  if (reason === 'unsupported_effect_shape') {
    return {
      status: 'refused',
      refusal: {
        kind: 'external_party_pack_refusal',
        reason,
        unsupportedShape: unsupportedShape ?? 'missing_effect_kind',
      },
      gaps: deduplicateGapReports(gaps),
    };
  }
  return {
    status: 'refused',
    refusal: { kind: 'external_party_pack_refusal', reason },
    gaps: deduplicateGapReports(gaps),
  };
}

export function loadExternalPartyPack(value: unknown): PartyPackLoadResult {
  const input = record(value);
  if (input === null) return refusal('invalid_structure', [issueGap('party-pack:root', [])]);

  const rootGaps = unexpectedFieldGaps(input, TOP_LEVEL_FIELDS, 'party-pack:root', []);
  const header = z.strictObject({
    schemaVersion: z.union([
      z.literal(EXTERNAL_PARTY_PACK_MINIMUM_SCHEMA_VERSION),
      z.literal(EXTERNAL_PARTY_PACK_SCHEMA_VERSION),
    ]),
    partyId: partyIdSchema,
    allowPartial: z.boolean(),
    members: z.array(z.unknown()).min(3).max(5),
  }).safeParse({
    schemaVersion: input.schemaVersion,
    partyId: input.partyId,
    allowPartial: input.allowPartial,
    members: input.members,
  });
  if (!header.success) {
    const gaps = [
      ...rootGaps,
      ...header.error.issues.map((issue) => issueGap('party-pack:root', issue.path)),
    ];
    return refusal('invalid_structure', gaps);
  }

  const gaps: GapReport[] = [...rootGaps];
  let unknownSpellId = false;
  let tooManySpellcastingSources = false;
  let pactSlotsNeeded = false;
  let unsupportedEffectShape: string | null = null;
  const mapped: Array<{
    readonly member: ExternalPartyPackMember;
    readonly spells: readonly SpellManifestRow[];
    readonly spellSlots: readonly {
      readonly level: z.infer<typeof spellSlotLevelSchema>;
      readonly maximum: number;
    }[];
    readonly spellcasting: readonly LoadedPartySpellcastingSource[];
  }> = [];

  for (const [index, memberValue] of header.data.members.entries()) {
    const entryFallback = `${header.data.partyId}:member-${String(index + 1)}`;
    const memberInput = record(memberValue);
    if (memberInput === null) {
      gaps.push(issueGap(entryFallback, ['members', index]));
      continue;
    }
    const entry = typeof memberInput.combatantId === 'string' && combatantIdSchema.safeParse(memberInput.combatantId).success
      ? memberInput.combatantId
      : entryFallback;
    const memberFields = header.data.schemaVersion === 1 ? V1_MEMBER_FIELDS : V2_MEMBER_FIELDS;
    gaps.push(...unexpectedFieldGaps(memberInput, memberFields, entry, ['members', index]));
    if (header.data.schemaVersion === 2 && Object.hasOwn(memberInput, 'pactSpellSlots')) {
      pactSlotsNeeded = true;
      gaps.push(issueGap(
        entry,
        ['members', index, 'pactSpellSlots'],
        'capability_not_implemented',
      ));
    }
    const core = header.data.schemaVersion === 1
      ? v1MemberCoreSchema.safeParse(parsedV1Core(memberInput, entry, index, gaps))
      : v2MemberCoreSchema.safeParse(parsedV2Core(memberInput, entry, index, gaps));
    if (!core.success) {
      gaps.push(...core.error.issues.map((issue) => issueGap(entry, ['members', index, ...issue.path])));
      continue;
    }
    const totalLevel = core.data.classes.reduce((total, heldClass) => total + heldClass.level, 0);
    if (totalLevel > 20) {
      gaps.push(issueGap(entry, ['members', index, 'classes'], 'value_not_in_engine_vocabulary'));
      continue;
    }
    if (new Set(core.data.classes.map((heldClass) => heldClass.classId)).size !== core.data.classes.length) {
      gaps.push(issueGap(entry, ['members', index, 'classes'], 'value_not_in_engine_vocabulary'));
      continue;
    }
    const rawSpellSlots = header.data.schemaVersion === 1
      ? v1MemberCoreSchema.parse(core.data).spellSlots.map((capacity) => ({
          level: capacity.level,
          maximum: capacity.maximum,
        }))
      : [];
    let spellSlots = rawSpellSlots.filter((capacity, capacityIndex, capacities) => {
      const first = capacities.findIndex((candidate) => candidate.level === capacity.level);
      if (first === capacityIndex) return true;
      gaps.push(issueGap(
        entry,
        ['members', index, 'spellSlots', capacityIndex, 'level'],
        'value_not_in_engine_vocabulary',
      ));
      return false;
    });

    const attacksInput = Array.isArray(memberInput.attacks) ? memberInput.attacks : [];
    if (!Array.isArray(memberInput.attacks)) gaps.push(issueGap(entry, ['members', index, 'attacks']));
    if (attacksInput.length > 100) {
      gaps.push(issueGap(entry, ['members', index, 'attacks'], 'value_not_in_engine_vocabulary'));
    }
    const attacks: ExternalPartyPackAttack[] = [];
    for (const [attackIndex, attackValue] of attacksInput.slice(0, 100).entries()) {
      const parsed = attackSchema.safeParse(sanitizedAttack(
        attackValue,
        entry,
        index,
        attackIndex,
        gaps,
      ));
      if (parsed.success) {
        if (attacks.some((attack) => attack.attackId === parsed.data.attackId)) {
          gaps.push(issueGap(
            entry,
            ['members', index, 'attacks', attackIndex, 'attackId'],
            'value_not_in_engine_vocabulary',
          ));
        } else {
          attacks.push(parsed.data);
        }
      }
      else gaps.push(...parsed.error.issues.map((issue) => issueGap(
        entry,
        ['members', index, 'attacks', attackIndex, ...issue.path],
        issue.code === 'unrecognized_keys'
          ? 'field_not_in_engine_vocabulary'
          : 'value_not_in_engine_vocabulary',
      )));
    }

    let loadedSpellcasting: LoadedPartySpellcastingSource[] = [];
    let parsedSpellcasting: z.infer<typeof spellcastingSourceInputSchema>[] = [];
    const spells: SpellManifestRow[] = [];
    const spellIds: string[] = [];
    if (header.data.schemaVersion === 1) {
      const spellInput = Array.isArray(memberInput.spellSelections) ? memberInput.spellSelections : [];
      if (!Array.isArray(memberInput.spellSelections)) {
        gaps.push(issueGap(entry, ['members', index, 'spellSelections']));
      }
      if (spellInput.length > SPELL_MANIFEST.length) {
        gaps.push(issueGap(entry, ['members', index, 'spellSelections'], 'value_not_in_engine_vocabulary'));
      }
      for (const [spellIndex, spellValue] of spellInput.slice(0, SPELL_MANIFEST.length).entries()) {
        const spell = typeof spellValue === 'string'
          ? SPELL_MANIFEST.find((candidate) => candidate.id === spellValue)
          : undefined;
        if (spell === undefined) {
          if (typeof spellValue === 'string') unknownSpellId = true;
          gaps.push(issueGap(
            entry,
            ['members', index, 'spellSelections', spellIndex],
            'value_not_in_engine_vocabulary',
          ));
        } else if (spell.status !== 'implemented') {
          gaps.push(issueGap(
            entry,
            ['members', index, 'spellSelections', spellIndex],
            'manifest_spell_not_implemented',
          ));
        } else if (spellIds.includes(spell.id)) {
          gaps.push(issueGap(
            entry,
            ['members', index, 'spellSelections', spellIndex],
            'value_not_in_engine_vocabulary',
          ));
        } else {
          spellIds.push(spell.id);
          spells.push(spell);
        }
      }
    } else if (Object.hasOwn(memberInput, 'spellcasting')) {
      const legacy = !Array.isArray(memberInput.spellcasting);
      const sourceInputs: readonly unknown[] = Array.isArray(memberInput.spellcasting)
        ? memberInput.spellcasting
        : [memberInput.spellcasting];
      if (sourceInputs.length > 4) {
        tooManySpellcastingSources = true;
        gaps.push(issueGap(
          entry,
          ['members', index, 'spellcasting'],
          'value_not_in_engine_vocabulary',
        ));
        continue;
      }
      if (sourceInputs.length === 0) {
        gaps.push(issueGap(entry, ['members', index, 'spellcasting']));
        continue;
      }

      if (legacy) {
        const parsed = legacySpellcastingInputSchema.safeParse(sanitizedSpellcasting(
          sourceInputs[0], entry, index, null, true, gaps,
        ));
        if (!parsed.success) {
          gaps.push(...parsed.error.issues.map((issue) => issueGap(
            entry,
            ['members', index, 'spellcasting', ...issue.path],
            issue.code === 'unrecognized_keys'
              ? 'field_not_in_engine_vocabulary'
              : 'value_not_in_engine_vocabulary',
          )));
          continue;
        }
        parsedSpellcasting = [{
          ability: parsed.data.ability,
          spellSaveDc: parsed.data.spellSaveDc,
          spellAttackBonus: parsed.data.spellAttackBonus,
          preparedSpellIds: parsed.data.preparedSpellIds,
          knownSpellIds: parsed.data.knownSpellIds,
          ...(parsed.data.grants === undefined ? {} : { grants: parsed.data.grants }),
          ...(parsed.data.resourceSpellUses === undefined
            ? {}
            : { resourceSpellUses: parsed.data.resourceSpellUses }),
        }];
        spellSlots = parsed.data.spellSlots.filter((capacity, capacityIndex, capacities) => {
          const first = capacities.findIndex((candidate) => candidate.level === capacity.level);
          if (first === capacityIndex) return true;
          gaps.push(issueGap(
            entry,
            ['members', index, 'spellcasting', 'spellSlots', capacityIndex, 'level'],
            'value_not_in_engine_vocabulary',
          ));
          return false;
        }).map((capacity) => ({ level: capacity.level, maximum: capacity.count }));
      } else {
        const sharedSlots = z.array(v2SpellSlotSchema).max(9).safeParse(sanitizedArrayRecords(
          memberInput.sharedSpellSlots,
          V2_SPELL_SLOT_FIELDS,
          entry,
          ['members', index, 'sharedSpellSlots'],
          gaps,
        ));
        if (!sharedSlots.success) {
          gaps.push(...sharedSlots.error.issues.map((issue) => issueGap(
            entry,
            ['members', index, 'sharedSpellSlots', ...issue.path],
            issue.code === 'unrecognized_keys'
              ? 'field_not_in_engine_vocabulary'
              : 'value_not_in_engine_vocabulary',
          )));
          continue;
        }
        spellSlots = sharedSlots.data.filter((capacity, capacityIndex, capacities) => {
          const first = capacities.findIndex((candidate) => candidate.level === capacity.level);
          if (first === capacityIndex) return true;
          gaps.push(issueGap(
            entry,
            ['members', index, 'sharedSpellSlots', capacityIndex, 'level'],
            'value_not_in_engine_vocabulary',
          ));
          return false;
        }).map((capacity) => ({ level: capacity.level, maximum: capacity.count }));

        for (const [sourceIndex, sourceInput] of sourceInputs.entries()) {
          const parsed = spellcastingSourceInputSchema.safeParse(sanitizedSpellcasting(
            sourceInput, entry, index, sourceIndex, false, gaps,
          ));
          if (!parsed.success) {
            gaps.push(...parsed.error.issues.map((issue) => issueGap(
              entry,
              ['members', index, 'spellcasting', sourceIndex, ...issue.path],
              issue.code === 'unrecognized_keys'
                ? 'field_not_in_engine_vocabulary'
                : 'value_not_in_engine_vocabulary',
            )));
          } else {
            parsedSpellcasting.push(parsed.data);
          }
        }
        if (parsedSpellcasting.length !== sourceInputs.length) continue;
      }
    } else if (Object.hasOwn(memberInput, 'sharedSpellSlots')) {
      gaps.push(issueGap(
        entry,
        ['members', index, 'sharedSpellSlots'],
        'value_not_in_engine_vocabulary',
      ));
    }

    if (header.data.schemaVersion === 2) {
      const normalizedSources: z.infer<typeof spellcastingSourceInputSchema>[] = [];
      for (const [sourceIndex, source] of parsedSpellcasting.entries()) {
        const sourcePrefix: readonly PropertyKey[] = Array.isArray(memberInput.spellcasting)
          ? ['members', index, 'spellcasting', sourceIndex]
          : ['members', index, 'spellcasting'];
        const sourceSpellIds: string[] = [];
        const references = [
          ...source.preparedSpellIds.map((value, spellIndex) => ({
            value,
            path: [...sourcePrefix, 'preparedSpellIds', spellIndex],
          })),
          ...source.knownSpellIds.map((value, spellIndex) => ({
            value,
            path: [...sourcePrefix, 'knownSpellIds', spellIndex],
          })),
          ...(source.grants ?? []).map((grant, grantIndex) => ({
            value: grant.spellId,
            path: [...sourcePrefix, 'grants', grantIndex, 'spellId'],
          })),
        ];
        for (const reference of references) {
          const spell = SPELL_MANIFEST.find((candidate) => candidate.id === reference.value);
          if (spell === undefined) {
            unknownSpellId = true;
            gaps.push(issueGap(entry, reference.path, 'value_not_in_engine_vocabulary'));
          } else if (spell.status !== 'implemented') {
            gaps.push(issueGap(entry, reference.path, 'manifest_spell_not_implemented'));
          } else if (sourceSpellIds.includes(spell.id)) {
            gaps.push(issueGap(entry, reference.path, 'value_not_in_engine_vocabulary'));
          } else {
            sourceSpellIds.push(spell.id);
            if (!spellIds.includes(spell.id)) {
              spellIds.push(spell.id);
              spells.push(spell);
            }
          }
        }

        const preparedSpellIds = source.preparedSpellIds.filter((id, preparedIndex, ids) =>
          sourceSpellIds.includes(id) && ids.indexOf(id) === preparedIndex);
        const preparedSet = new Set(preparedSpellIds);
        const knownSpellIds = source.knownSpellIds.filter((id, knownIndex, ids) => {
          if (!sourceSpellIds.includes(id) || ids.indexOf(id) !== knownIndex) return false;
          if (!preparedSet.has(id)) return true;
          gaps.push(issueGap(
            entry,
            [...sourcePrefix, 'knownSpellIds', knownIndex],
            'value_not_in_engine_vocabulary',
          ));
          return false;
        });
        const grants = (source.grants ?? []).filter((grant, grantIndex, candidates) => {
          if (!sourceSpellIds.includes(grant.spellId)) return false;
          if (candidates.findIndex((candidate) => candidate.spellId === grant.spellId) !== grantIndex) {
            return false;
          }
          if (!preparedSet.has(grant.spellId) && !knownSpellIds.includes(grant.spellId)) return true;
          gaps.push(issueGap(
            entry,
            [...sourcePrefix, 'grants', grantIndex, 'spellId'],
            'value_not_in_engine_vocabulary',
          ));
          return false;
        });
        const resourceSpellUses = (source.resourceSpellUses ?? []).filter((use, useIndex, uses) => {
          if (!sourceSpellIds.includes(use.spellId)) {
            if (!SPELL_MANIFEST.some((spell) => spell.id === use.spellId)) unknownSpellId = true;
            gaps.push(issueGap(
              entry,
              [...sourcePrefix, 'resourceSpellUses', useIndex, 'spellId'],
              'value_not_in_engine_vocabulary',
            ));
            return false;
          }
          const first = uses.findIndex((candidate) =>
            candidate.spellId === use.spellId && candidate.resourcePoolId === use.resourcePoolId);
          if (first === useIndex) return true;
          gaps.push(issueGap(
            entry,
            [...sourcePrefix, 'resourceSpellUses', useIndex],
            'value_not_in_engine_vocabulary',
          ));
          return false;
        });
        const normalized = {
          ...source,
          preparedSpellIds,
          knownSpellIds,
          ...(source.grants === undefined ? {} : { grants }),
          ...(source.resourceSpellUses === undefined ? {} : { resourceSpellUses }),
        };
        normalizedSources.push(normalized);
        loadedSpellcasting.push({
          ability: source.ability,
          spellSaveDc: source.spellSaveDc,
          spellAttackBonus: source.spellAttackBonus,
          spellcastingModifier: Math.floor((core.data.abilities[source.ability] - 10) / 2),
          casterLevel: totalLevel,
          preparedSpells: preparedSpellIds.flatMap((id) =>
            spells.filter((spell) => spell.id === id)),
          knownSpells: knownSpellIds.flatMap((id) =>
            spells.filter((spell) => spell.id === id)),
          grants: grants.flatMap((grant) => {
            const spell = spells.find((candidate) => candidate.id === grant.spellId);
            if (spell === undefined) return [];
            const sourceModifier = Math.floor((core.data.abilities[source.ability] - 10) / 2);
            const grantModifier = Math.floor((core.data.abilities[grant.ability] - 10) / 2);
            const modifierDelta = grantModifier - sourceModifier;
            return [{
              spell,
              ability: grant.ability,
              spellSaveDc: source.spellSaveDc + modifierDelta,
              spellAttackBonus: source.spellAttackBonus + modifierDelta,
              spellcastingModifier: grantModifier,
            }];
          }),
          resourceSpellUses: resourceSpellUses.map((use) => ({
            spellId: use.spellId,
            resourcePoolId: limitedResourcePoolId(use.resourcePoolId),
          })),
        });
      }
      parsedSpellcasting = normalizedSources;
    }

    const conditionsInput = Array.isArray(memberInput.startingConditions) ? memberInput.startingConditions : [];
    if (!Array.isArray(memberInput.startingConditions)) gaps.push(issueGap(entry, ['members', index, 'startingConditions']));
    if (conditionsInput.length > 100) {
      gaps.push(issueGap(entry, ['members', index, 'startingConditions'], 'value_not_in_engine_vocabulary'));
    }
    const startingConditions: ExternalPartyPackMember['startingConditions'][number][] = [];
    for (const [conditionIndex, conditionValue] of conditionsInput.slice(0, 100).entries()) {
      const parsed = startingConditionSchema.safeParse(sanitizedRecord(
        conditionValue,
        CONDITION_FIELDS,
        entry,
        ['members', index, 'startingConditions', conditionIndex],
        gaps,
      ));
      if (parsed.success) {
        if (startingConditions.some((condition) => condition.effectId === parsed.data.effectId)) {
          gaps.push(issueGap(
            entry,
            ['members', index, 'startingConditions', conditionIndex, 'effectId'],
            'value_not_in_engine_vocabulary',
          ));
        } else {
          startingConditions.push(parsed.data);
        }
      }
      else gaps.push(...parsed.error.issues.map((issue) => issueGap(
        entry,
        ['members', index, 'startingConditions', conditionIndex, ...issue.path],
        issue.code === 'unrecognized_keys'
          ? 'field_not_in_engine_vocabulary'
          : 'value_not_in_engine_vocabulary',
      )));
    }

    let effects: ExternalPartyPackEffect[] = [];
    const resources: ExternalPartyPackResource[] = [];
    let passives: z.infer<typeof passivesSchema> | undefined;
    const worldOperations: ExternalWorldOperation[] = [];
    if (header.data.schemaVersion === 2) {
      const worldOperationsInput = Object.hasOwn(memberInput, 'worldOperations')
        ? memberInput.worldOperations
        : [];
      if (!Array.isArray(worldOperationsInput)) {
        gaps.push(issueGap(entry, ['members', index, 'worldOperations']));
      } else if (worldOperationsInput.length > 100) {
        gaps.push(issueGap(entry, ['members', index, 'worldOperations'], 'value_not_in_engine_vocabulary'));
      } else {
        for (const [operationIndex, operationValue] of worldOperationsInput.entries()) {
          const parsed = externalWorldOperationSchema.safeParse(operationValue);
          if (!parsed.success) {
            gaps.push(...parsed.error.issues.map((issue) => issueGap(
              entry,
              ['members', index, 'worldOperations', operationIndex, ...issue.path],
              issue.code === 'unrecognized_keys'
                ? 'field_not_in_engine_vocabulary'
                : 'value_not_in_engine_vocabulary',
            )));
          } else if (worldOperations.some((operation) => operation.operationId === parsed.data.operationId)) {
            gaps.push(issueGap(
              entry,
              ['members', index, 'worldOperations', operationIndex, 'operationId'],
              'value_not_in_engine_vocabulary',
            ));
          } else {
            worldOperations.push(parsed.data);
          }
        }
      }
      const effectsInput = Object.hasOwn(memberInput, 'effects')
        ? memberInput.effects
        : [];
      if (!Array.isArray(effectsInput)) {
        gaps.push(issueGap(entry, ['members', index, 'effects']));
      } else if (effectsInput.length > 100) {
        gaps.push(issueGap(entry, ['members', index, 'effects'], 'value_not_in_engine_vocabulary'));
      }
      if (Array.isArray(effectsInput)) {
        for (const [effectIndex, effectValue] of effectsInput.slice(0, 100).entries()) {
          const effectRecord = record(effectValue);
          const shape = effectRecord?.kind;
          if (
            typeof shape !== 'string' ||
            !FEATURE_EFFECT_KINDS.includes(shape as (typeof FEATURE_EFFECT_KINDS)[number])
          ) {
            unsupportedEffectShape ??= typeof shape === 'string' ? shape : 'missing_effect_kind';
            gaps.push(issueGap(
              entry,
              ['members', index, 'effects', effectIndex, 'kind'],
              'capability_not_implemented',
            ));
            continue;
          }
          const parsed = externalPartyPackFeatureEffectSchema.safeParse(effectValue);
          if (!parsed.success) {
            gaps.push(...parsed.error.issues.map((issue) => issueGap(
              entry,
              ['members', index, 'effects', effectIndex, ...issue.path],
              issue.code === 'unrecognized_keys'
                ? 'field_not_in_engine_vocabulary'
                : 'value_not_in_engine_vocabulary',
            )));
          } else if (effects.some((effect) => effect.effectId === parsed.data.effectId)) {
            gaps.push(issueGap(
              entry,
              ['members', index, 'effects', effectIndex, 'effectId'],
              'value_not_in_engine_vocabulary',
            ));
          } else {
            effects.push(parsed.data);
          }
        }
      }

      const resourcesInput = Object.hasOwn(memberInput, 'resources')
        ? memberInput.resources
        : [];
      if (!Array.isArray(resourcesInput)) {
        gaps.push(issueGap(entry, ['members', index, 'resources']));
      } else if (resourcesInput.length > 100) {
        gaps.push(issueGap(entry, ['members', index, 'resources'], 'value_not_in_engine_vocabulary'));
      }
      if (Array.isArray(resourcesInput)) {
        for (const [resourceIndex, resourceValue] of resourcesInput.slice(0, 100).entries()) {
          const parsed = externalPartyPackResourceSchema.safeParse(resourceValue);
          if (!parsed.success) {
            gaps.push(...parsed.error.issues.map((issue) => issueGap(
              entry,
              ['members', index, 'resources', resourceIndex, ...issue.path],
              issue.code === 'unrecognized_keys'
                ? 'field_not_in_engine_vocabulary'
                : 'value_not_in_engine_vocabulary',
            )));
          } else if (resources.some((pool) => pool.resourcePoolId === parsed.data.resourcePoolId)) {
            gaps.push(issueGap(
              entry,
              ['members', index, 'resources', resourceIndex, 'resourcePoolId'],
              'value_not_in_engine_vocabulary',
            ));
          } else {
            resources.push(parsed.data);
          }
        }
      }

      if (Object.hasOwn(memberInput, 'passives')) {
        const parsed = passivesSchema.safeParse(memberInput.passives);
        if (!parsed.success) {
          gaps.push(...parsed.error.issues.map((issue) => issueGap(
            entry,
            ['members', index, 'passives', ...issue.path],
            issue.code === 'unrecognized_keys'
              ? 'field_not_in_engine_vocabulary'
              : 'value_not_in_engine_vocabulary',
          )));
        } else {
          passives = parsed.data;
          const passiveAc = core.data.armorClass + (passives.armorClassBonus ?? 0);
          const passiveSpeed = core.data.walkingSpeedFeet + (passives.speedAdjustmentFeet ?? 0);
          let validPassives = true;
          if (passiveAc < 1 || passiveAc > 50) {
            gaps.push(issueGap(entry, ['members', index, 'passives', 'armorClassBonus'], 'value_not_in_engine_vocabulary'));
            validPassives = false;
          }
          if (passiveSpeed < 0 || passiveSpeed > 1_000) {
            gaps.push(issueGap(entry, ['members', index, 'passives', 'speedAdjustmentFeet'], 'value_not_in_engine_vocabulary'));
            validPassives = false;
          }
          const passiveCollections = [
            ['skillBonuses', passives.skillBonuses?.map((candidate) => candidate.skillId) ?? []],
            ['damageResponses', passives.damageResponses?.map((candidate) => candidate.damageTypeId) ?? []],
            ['conditionImmunities', passives.conditionImmunities ?? []],
          ] as const;
          for (const [field, values] of passiveCollections) {
            if (new Set(values).size !== values.length) {
              gaps.push(issueGap(entry, ['members', index, 'passives', field], 'value_not_in_engine_vocabulary'));
              validPassives = false;
            }
          }
          if (!validPassives) passives = undefined;
        }
      }

      const resourceIds = new Set(resources.map((pool) => pool.resourcePoolId));
      const attackFormKeys = new Set<string>();
      effects = effects.filter((effect, effectIndex) => {
        const referencedPool = effect.resourcePoolId === undefined
          ? undefined
          : resources.find((pool) => pool.resourcePoolId === effect.resourcePoolId);
        const referencedAttack = 'attackId' in effect
          ? attacks.find((attack) => attack.attackId === effect.attackId)
          : undefined;
        const damageTermIndex = 'damageTermIndex' in effect ? effect.damageTermIndex : undefined;
        const attackFormKey = 'attackId' in effect
          ? `${effect.kind}:${effect.attackId}:${String(damageTermIndex ?? 'distance')}`
          : null;
        const uniqueAttackForm = attackFormKey === null || !attackFormKeys.has(attackFormKey);
        const validRecklessAttacks = effect.kind !== 'reckless_attack_mode' ||
          effect.strengthBasedMeleeAttackIds.every((attackId) =>
            attacks.some((attack) => attack.attackId === attackId && attack.kind === 'melee'));
        const validElementalAttacks = effect.kind !== 'elemental_fury' ||
          effect.attackIds.every((attackId) => attacks.some((attack) => attack.attackId === attackId));
        const namedSpell = 'spellId' in effect
          ? SPELL_MANIFEST.find((spell) => spell.id === effect.spellId)
          : undefined;
        const validNamedCantrip =
          (effect.kind !== 'spell_damage_ability_modifier' && effect.kind !== 'exploding_spell_damage_die') ||
          (namedSpell?.status === 'implemented' && namedSpell.level === 0 &&
            parsedSpellcasting.some((source) =>
              source.preparedSpellIds.includes(effect.spellId) ||
              source.knownSpellIds.includes(effect.spellId) ||
              (source.grants ?? []).some((grant) => grant.spellId === effect.spellId)));
        const valid = (effect.resourcePoolId === undefined || referencedPool !== undefined) &&
          (effect.kind !== 'action_surge' || referencedPool?.recharge === 'short_rest') &&
          (effect.kind !== 'timed_spellcasting_mode' || referencedPool?.recharge === 'long_rest') &&
          (effect.kind !== 'extra_attack_count_override' ||
            effect.levels.some((level) => level.minimumLevel <= totalLevel)) &&
          (!('attackId' in effect) || referencedAttack !== undefined) &&
          (damageTermIndex === undefined || referencedAttack?.damage[damageTermIndex] !== undefined) &&
          (effect.kind !== 'attack_ability_substitution' ||
            parsedSpellcasting.some((source) => source.ability === effect.spellcastingAbility)) &&
          (effect.kind !== 'attack_damage_die_override' ||
            effect.levels.some((level) => level.minimumLevel <= totalLevel)) &&
          validRecklessAttacks &&
          validElementalAttacks &&
          validNamedCantrip &&
          uniqueAttackForm;
        if (!valid) {
          const path = 'attackId' in effect && referencedAttack === undefined
            ? 'attackId'
            : damageTermIndex !== undefined && referencedAttack?.damage[damageTermIndex] === undefined
              ? 'damageTermIndex'
              : effect.kind === 'attack_ability_substitution' &&
                  !parsedSpellcasting.some((source) => source.ability === effect.spellcastingAbility)
                ? 'spellcastingAbility'
                : effect.kind === 'attack_damage_die_override' &&
                    !effect.levels.some((level) => level.minimumLevel <= totalLevel)
                  ? 'levels'
                  : !validNamedCantrip
                    ? 'spellId'
                    : !validElementalAttacks
                      ? 'attackIds'
                  : !validRecklessAttacks
                    ? 'strengthBasedMeleeAttackIds'
                  : attackFormKey !== null && !uniqueAttackForm
                    ? 'kind'
                    : effect.kind === 'extra_attack_count_override' ? 'levels' : 'resourcePoolId';
          gaps.push(issueGap(
            entry,
            ['members', index, 'effects', effectIndex, path],
            'value_not_in_engine_vocabulary',
          ));
        } else if (attackFormKey !== null) {
          attackFormKeys.add(attackFormKey);
        }
        return valid;
      });
      parsedSpellcasting = parsedSpellcasting.map((source, sourceIndex) => {
        const sourcePrefix: readonly PropertyKey[] = Array.isArray(memberInput.spellcasting)
          ? ['members', index, 'spellcasting', sourceIndex]
          : ['members', index, 'spellcasting'];
        const resourceSpellUses = (source.resourceSpellUses ?? []).filter((use, useIndex) => {
          if (resourceIds.has(use.resourcePoolId)) return true;
          gaps.push(issueGap(
            entry,
            [...sourcePrefix, 'resourceSpellUses', useIndex, 'resourcePoolId'],
            'value_not_in_engine_vocabulary',
          ));
          return false;
        });
        const loadedSource = loadedSpellcasting[sourceIndex];
        if (loadedSource !== undefined) {
          loadedSpellcasting[sourceIndex] = {
            ...loadedSource,
            resourceSpellUses: resourceSpellUses.map((use) => ({
              spellId: use.spellId,
              resourcePoolId: limitedResourcePoolId(use.resourcePoolId),
            })),
          };
        }
        return {
          ...source,
          ...(source.resourceSpellUses === undefined ? {} : { resourceSpellUses }),
        };
      });
    }

    const reconstructed: ExternalPartyPackMember = header.data.schemaVersion === 1
      ? v1MemberSchema.parse({
          ...core.data,
          spellSlots,
          attacks,
          spellSelections: spellIds,
          startingConditions,
        })
      : v2MemberSchema.parse({
          ...core.data,
          attacks,
          startingConditions,
          ...(Object.hasOwn(memberInput, 'effects') ? { effects } : {}),
          ...(Object.hasOwn(memberInput, 'resources') ? { resources } : {}),
          ...(passives === undefined ? {} : { passives }),
          ...(Object.hasOwn(memberInput, 'worldOperations') ? { worldOperations } : {}),
          ...(parsedSpellcasting.length === 0
            ? {}
            : {
                spellcasting: parsedSpellcasting,
                sharedSpellSlots: spellSlots.map((capacity) => ({
                  level: capacity.level,
                  count: capacity.maximum,
                  recharge: 'long_rest' as const,
                })),
              }),
        });
    mapped.push({
      member: reconstructed,
      spells,
      spellSlots,
      spellcasting: loadedSpellcasting,
    });
  }

  const uniqueCombatants = new Set(mapped.map(({ member }) => member.combatantId));
  const uniqueTokens = new Set(mapped.map(({ member }) => member.tokenId));
  const uniqueCharacters = new Set(mapped.map(({ member }) => member.characterId));
  if (
    uniqueCombatants.size !== mapped.length ||
    uniqueTokens.size !== mapped.length ||
    uniqueCharacters.size !== mapped.length
  ) {
    gaps.push(issueGap(header.data.partyId, ['members'], 'value_not_in_engine_vocabulary'));
  }

  const allGaps = deduplicateGapReports(gaps);
  if (unknownSpellId) return refusal('unknown_spell_id', allGaps);
  if (tooManySpellcastingSources) return refusal('too_many_spellcasting_sources', allGaps);
  if (pactSlotsNeeded) return refusal('pact_slots_unmodelled', allGaps);
  if (unsupportedEffectShape !== null) {
    return refusal('unsupported_effect_shape', allGaps, unsupportedEffectShape);
  }
  if (allGaps.length > 0 && !header.data.allowPartial) return refusal('gaps_not_allowed', allGaps);
  if (mapped.length === 0) return refusal('no_mappable_members', allGaps);
  if (mapped.length < 3) return refusal('invalid_structure', allGaps);
  if (
    uniqueCombatants.size !== mapped.length ||
    uniqueTokens.size !== mapped.length ||
    uniqueCharacters.size !== mapped.length
  ) {
    return refusal('invalid_structure', allGaps);
  }

  const pack = externalPartyPackSchema.parse({
    schemaVersion: header.data.schemaVersion,
    partyId: header.data.partyId,
    allowPartial: header.data.allowPartial,
    members: mapped.map(({ member }) => member),
  });
  return {
    status: 'loaded',
    party: {
      pack,
      members: mapped.map(({ member, spells, spellSlots: slots, spellcasting }) =>
        loadedMember(member, spells, slots, spellcasting)),
    },
    gaps: allGaps,
  };
}

export function loadExternalPartyPackBytes(bytes: string): PartyPackLoadResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes);
  } catch {
    return refusal('invalid_json', [issueGap('party-pack:root', ['json'])]);
  }
  return loadExternalPartyPack(parsed);
}
