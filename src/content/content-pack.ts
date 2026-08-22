import { z } from 'zod';
import type { CombatantProfile } from '../combat/combatant';
import { monsterCombatantProfile } from '../combat/combatant';
import type { CombatFeatureEffect } from '../combat/effects';
import { conditionNames } from '../combat/conditions';
import {
  armedWeaponHitRiderShape,
  damageOperationSpecSchema,
  operationDiceSchema,
} from '../combat/damage-operation-schema';
import type { EncounterCommand } from '../combat/events';
import type { MonsterAction, MonsterStatblock, MonsterStatblockInput, SenseKind } from '../combat/statblock';
import { monsterStatblock } from '../combat/statblock';
import { SPELL_MANIFEST } from '../combat/spells/manifest';
import {
  SPELL_OPERATION_KINDS,
  type SpellDefinition,
  type SpellOperation,
} from '../combat/spells/types';
import { STARTER_MONSTER_ROSTER } from '../combat/statblocks/roster';
import {
  damageType,
  dieSides,
  encounterEffectId,
  limitedResourcePoolId,
  type CombatantId,
} from '../combat/values';
import { abilities, damageTypes, skills, type Ability, type Skill } from '../domain/enums';
import {
  FEATURE_EFFECT_KINDS,
  externalPartyPackFeatureEffectSchema,
  externalPartyPackResourceSchema,
  loadedFeatureEffect,
  type ExternalPartyPackEffect,
  type ExternalPartyPackResource,
} from '../vtt/party-pack';

export const CONTENT_PACK_SCHEMA_VERSION = 1 as const;

const identifier = z.string().regex(/^[a-z][a-z0-9._-]{0,63}$/u);
const recordIdentifier = z.string().regex(/^[a-z0-9][a-z0-9._-]{0,95}$/u);
const trimmedText = z.string().min(1).max(1_000).refine((value) => value.trim() === value);
const safeInteger = z.number().int().safe();
const nonNegativeInteger = safeInteger.min(0);
const positiveInteger = safeInteger.min(1);
const spellLevel = z.union([
  z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4),
  z.literal(5), z.literal(6), z.literal(7), z.literal(8), z.literal(9),
]);

const recordIdentityShape = {
  sourceId: identifier,
  recordId: recordIdentifier,
  name: trimmedText,
} as const;

const provenanceSchema = z.strictObject({
  sourceName: trimmedText,
  sourceKind: z.enum(['srd', 'homebrew', 'user_import']),
  importedAt: z.iso.datetime({ offset: true }),
});

const spellSchoolSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('known'),
    name: z.enum(['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation']),
  }),
  z.strictObject({ kind: z.literal('other'), name: trimmedText }),
]);

const spellRangeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('self') }),
  z.strictObject({ kind: z.literal('touch') }),
  z.strictObject({ kind: z.literal('feet'), feet: nonNegativeInteger.max(100_000) }),
  z.strictObject({ kind: z.literal('sight') }),
  z.strictObject({ kind: z.literal('unlimited') }),
]);

const spellDurationSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('instantaneous') }),
  z.strictObject({ kind: z.literal('rounds'), rounds: positiveInteger.max(1_000_000) }),
  z.strictObject({ kind: z.literal('until_dispelled') }),
  z.strictObject({ kind: z.literal('special'), text: trimmedText }),
]);

const componentsSchema = z.strictObject({
  verbal: z.boolean(),
  somatic: z.boolean(),
  material: z.union([
    z.null(),
    z.strictObject({ text: trimmedText, consumed: z.boolean() }),
  ]),
});

const targetingSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('self') }),
  z.strictObject({
    kind: z.literal('single'),
    rangeFeet: nonNegativeInteger,
    willing: z.boolean(),
    allowDead: z.literal(true).optional(),
    rangeByCasterLevel: z.array(z.strictObject({
      minimumLevel: positiveInteger.max(20),
      rangeFeet: nonNegativeInteger,
    })).optional(),
  }),
  z.strictObject({
    kind: z.literal('multiple'),
    rangeFeet: nonNegativeInteger,
    baseMaximum: positiveInteger,
    additionalPerSlot: nonNegativeInteger,
    willing: z.boolean().optional(),
  }),
  z.strictObject({
    kind: z.literal('area'),
    rangeFeet: nonNegativeInteger,
    shape: z.enum(['cone', 'cube', 'cylinder', 'emanation', 'line', 'sphere']),
    baseSizeFeet: nonNegativeInteger,
    sizePerSlotFeet: nonNegativeInteger,
    secondarySizeFeet: nonNegativeInteger.optional(),
    surface: z.literal('ground_square').optional(),
  }),
  z.strictObject({
    kind: z.literal('area_selected'),
    rangeFeet: nonNegativeInteger,
    shape: z.enum(['cone', 'cube', 'cylinder', 'emanation', 'line', 'sphere']),
    baseSizeFeet: nonNegativeInteger,
    sizePerSlotFeet: nonNegativeInteger,
    secondarySizeFeet: nonNegativeInteger.optional(),
    baseMaximum: positiveInteger,
    additionalPerSlot: nonNegativeInteger,
  }),
  z.strictObject({ kind: z.literal('all_in_range'), rangeFeet: nonNegativeInteger }),
  z.strictObject({ kind: z.literal('remote'), range: z.literal('unlimited') }),
  z.strictObject({ kind: z.literal('utility'), rangeFeet: nonNegativeInteger }),
]);

const operationRequiredFields = {
  caster_choice: ['modes'],
  random_branch: ['dieSides', 'branches'],
  target_branch: ['branches', 'otherwise'],
  reevaluated_branch: ['hook', 'durationRounds', 'operation'],
  condition_lifecycle: ['condition', 'immunity', 'initialSave', 'repeatedSave', 'damageBreak', 'duration', 'stacking'],
  roll_dice_modifier: ['die', 'sign', 'duration'],
  damage_dice_reduction: ['damageType', 'die', 'uses', 'duration'],
  roll_mode_modifier: ['mode', 'duration'],
  armor_class_modifier: ['modification', 'duration'],
  damage_response_modifier: ['damageType', 'response', 'duration'],
  targeted_defense_modifier: ['against', 'armorClassBonus', 'duration'],
  damage_operation: ['delivery', 'instancesPerTarget', 'packets', 'timing'],
  armed_weapon_hit_rider: ['damage', 'durationRounds', 'concentration', 'persistence', 'saveGatedRider'],
  persistent_area: ['origin', 'shape', 'durationRounds', 'concentration', 'targetFilter', 'includeOwner', 'difficultTerrain', 'movableFeet', 'hooks', 'initialEffects'],
  world_operations: ['operations'],
  teleport: ['subject', 'maximumDistanceFeet', 'destination'],
  forced_movement: ['direction', 'origin', 'distanceFeet', 'save'],
  movement_mode: ['grants', 'difficultTerrainImmunity', 'magicalSpeedReductionImmunity', 'durationRounds', 'concentration', 'expiresAt'],
  movement_region: ['region', 'difficultTerrain', 'entry', 'damage'],
  speed_modification: ['modification', 'durationRounds', 'concentration', 'expiresAt'],
  attack_damage: ['attackKind', 'damageType', 'dice', 'rider'],
  attack_then_save_damage: ['attackKind', 'attackDamageType', 'attackDice', 'saveAbility', 'saveDamageType', 'saveDice', 'onSaveSuccess', 'burstShape', 'burstRadiusFeet'],
  attack_damage_over_time: ['attackKind', 'damageType', 'initialDice', 'missDamage', 'laterDice', 'laterTiming'],
  hit_point_maximum_increase: ['baseAmount', 'additionalPerSlot'],
  save_damage: ['ability', 'onSuccess', 'damageType', 'dice', 'riderOnFailure', 'pushFeetOnFailure'],
  save_multi_damage: ['ability', 'onSuccess', 'terms', 'effect'],
  save_damage_over_time: ['ability', 'onSuccess', 'damageType', 'initialDice', 'laterDice', 'laterTiming'],
  save_damage_and_effect: ['ability', 'onSuccess', 'damageType', 'dice', 'effect'],
  healing: ['dice', 'addSpellcastingModifier'],
  fixed_healing: ['baseAmount', 'additionalPerSlot', 'removesConditions'],
  temporary_hit_points: ['dice'],
  effect: ['effect'],
  save_effect: ['ability', 'rollMode', 'effect'],
  save_push: ['ability', 'pushFeetOnFailure', 'effect'],
  remove_condition: ['conditions'],
  remove_condition_and_effect: ['condition', 'effect'],
  save_branch_effect: ['ability', 'successEffect', 'failureEffect'],
  attack_rays: ['baseRays', 'additionalPerSlot', 'damageType', 'dice'],
  attack_beams: ['attackKind', 'baseBeams', 'additionalBeamLevels', 'damageType', 'dice'],
  summoned_weapon_attack: ['damageType', 'dice', 'addSpellcastingModifier', 'attackReachFeet', 'moveFeetPerBonusAction', 'effect'],
  reaction_save_cancel: ['ability'],
  dispel_magic: ['baseAutomaticLevel', 'checkDcBase'],
  revive: ['hitPoints', 'maximumDeathAgeRounds'],
  remove_curse: [],
  lifedrain_attack: ['damageType', 'dice', 'healingDivisor', 'effect'],
  magic_missiles: ['baseDarts', 'additionalPerSlot', 'damageType', 'dice'],
  stabilize: [],
  weapon_attack_augmentation: ['timing', 'extraDamage'],
  utility: ['effect', 'concentration', 'durationRounds'],
} as const satisfies Readonly<Record<SpellOperation['kind'], readonly string[]>>;

const operationOptionalFields = {
  save_effect: ['excludeCaster', 'willingTargetSkipsSave'],
  reaction_save_cancel: ['trigger'],
  weapon_attack_augmentation: ['attackAbility', 'damageAbility', 'damageTypeChoice', 'consumeOnHit', 'concentration', 'durationRounds', 'followUp'],
  utility: ['durationRoundsPerSlot', 'becomesPermanentAtSlot', 'losesConcentrationAtSlot', 'stateful'],
} as const satisfies Partial<Readonly<Record<SpellOperation['kind'], readonly string[]>>>;

function objectRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function operationKind(value: unknown): string | null {
  const operation = objectRecord(value);
  return operation !== null && typeof operation.kind === 'string' ? operation.kind : null;
}

const persistentAreaScaledDiceSchema = operationDiceSchema;

const persistentAreaShapeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('sphere'), radius: positiveInteger.max(100_000) }),
  z.strictObject({ kind: z.literal('cube'), size: positiveInteger.max(100_000) }),
  z.strictObject({ kind: z.literal('cylinder'), radius: positiveInteger.max(100_000), height: positiveInteger.max(100_000) }),
  z.strictObject({
    kind: z.literal('line'), length: positiveInteger.max(100_000), width: positiveInteger.max(100_000),
    direction: z.strictObject({ x: z.number().finite(), y: z.number().finite() }),
  }),
  z.strictObject({ kind: z.literal('emanation'), radius: nonNegativeInteger.max(100_000) }),
]);

const persistentAreaLifetimeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('while_inside') }),
  z.strictObject({ kind: z.literal('area_duration') }),
  z.strictObject({ kind: z.literal('fixed_rounds'), rounds: positiveInteger.max(1_000_000), boundary: z.enum(['start', 'end']) }),
  z.strictObject({ kind: z.literal('save_ends'), boundary: z.enum(['start', 'end']) }),
]);

const persistentAreaAppliedPayloadSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('condition'), condition: z.enum(conditionNames.filter((name) => name !== 'Exhaustion')) }),
  z.strictObject({ kind: z.literal('skill_modifier'), skill: z.literal('stealth'), amount: safeInteger.min(-30).max(30) }),
  z.strictObject({ kind: z.literal('armor_class_modifier'), amount: safeInteger.min(-30).max(30) }),
  z.strictObject({ kind: z.literal('movement_modifier'), speedDeltaFeet: safeInteger.min(-1_000).max(1_000) }),
]);

const persistentAreaSpellPayloadSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('damage'), damageType: z.enum(damageTypes), dice: persistentAreaScaledDiceSchema }),
  z.strictObject({ kind: z.literal('effect'), payload: persistentAreaAppliedPayloadSchema, lifetime: persistentAreaLifetimeSchema }),
]);

const persistentAreaSpellEffectSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('automatic'), payload: persistentAreaSpellPayloadSchema }),
  z.strictObject({
    kind: z.literal('save_gated'), ability: z.enum(abilities), rollMode: z.enum(['normal', 'advantage', 'disadvantage']),
    onSuccess: z.enum(['none', 'half']), payload: persistentAreaSpellPayloadSchema,
  }),
]).superRefine((effect, context) => {
  if (effect.kind === 'automatic' && effect.payload.kind === 'effect' && effect.payload.lifetime.kind === 'save_ends') {
    context.addIssue({ code: 'custom', message: 'A save-ends area payload requires a save gate.' });
  }
  if (effect.kind === 'save_gated' && effect.onSuccess === 'half' && effect.payload.kind !== 'damage') {
    context.addIssue({ code: 'custom', message: 'Only persistent-area damage can be halved.' });
  }
});

const persistentAreaOperationSchema = z.strictObject({
  kind: z.literal('persistent_area'),
  origin: z.enum(['selected_when_cast', 'anchored_to_caster']),
  shape: persistentAreaShapeSchema.nullable(),
  durationRounds: positiveInteger.max(1_000_000),
  concentration: z.boolean(),
  targetFilter: z.enum(['all', 'allies', 'enemies', 'selected']),
  includeOwner: z.boolean(),
  difficultTerrain: z.boolean(),
  movableFeet: positiveInteger.max(100_000).nullable(),
  hooks: z.array(z.strictObject({
    hook: z.enum(['on_enter', 'on_start_of_turn_inside', 'on_end_of_turn_inside', 'on_exit']),
    frequency: z.enum(['once_per_turn', 'every_trigger']),
    effect: persistentAreaSpellEffectSchema,
  })).max(16),
  initialEffects: z.array(z.strictObject({ excludeOwner: z.boolean(), effect: persistentAreaSpellEffectSchema })).max(16),
}).superRefine((operation, context) => {
  if ((operation.origin === 'selected_when_cast') !== (operation.shape === null)) {
    context.addIssue({ code: 'custom', message: 'Selected areas use the cast template; anchored areas declare their shape.' });
  }
  if (operation.origin === 'anchored_to_caster' && operation.movableFeet !== null) {
    context.addIssue({ code: 'custom', message: 'An anchored area cannot also move independently.' });
  }
});

const worldObjectDamageResponseSchema = z.strictObject({
  type: z.enum(damageTypes),
  response: z.enum(['normal', 'resistant', 'vulnerable', 'resistant_and_vulnerable', 'immune']),
});

const worldObjectTemplateSchema = z.strictObject({
  name: trimmedText,
  kind: z.enum(['barrier', 'cover', 'door', 'hazard', 'light-source', 'summoned-terrain', 'generic']),
  durability: z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('hit_points'),
      hitPoints: positiveInteger.max(1_000_000),
      maximumHitPoints: positiveInteger.max(1_000_000),
    }),
    z.strictObject({ kind: z.literal('indestructible') }),
  ]),
  armorClass: nonNegativeInteger.max(100),
  damageResponses: z.array(worldObjectDamageResponseSchema).max(damageTypes.length),
  blocking: z.strictObject({
    movement: z.boolean(),
    lineOfSight: z.boolean(),
    cover: z.enum(['none', 'half', 'three_quarters', 'total']),
  }),
}).superRefine((object, context) => {
  if (object.durability.kind === 'hit_points' && object.durability.hitPoints > object.durability.maximumHitPoints) {
    context.addIssue({ code: 'custom', path: ['durability', 'hitPoints'], message: 'Object Hit Points cannot exceed its maximum.' });
  }
  if (new Set(object.damageResponses.map((response) => response.type)).size !== object.damageResponses.length) {
    context.addIssue({ code: 'custom', path: ['damageResponses'], message: 'Object damage responses must be unique.' });
  }
});

const worldOperationSpellSchema = z.strictObject({
  kind: z.literal('world_operations'),
  operations: z.array(z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('create_object'),
      placement: z.enum(['caster_cell', 'area_origin']),
      footprintOffsets: z.array(z.strictObject({ column: safeInteger, row: safeInteger })).min(1).max(400),
      object: worldObjectTemplateSchema,
    }),
    z.strictObject({
      kind: z.literal('transform_terrain'),
      regionId: identifier,
      difficultTerrain: z.boolean(),
    }),
    z.strictObject({
      kind: z.literal('set_light_level'),
      regionId: identifier,
      level: z.enum(['bright', 'dim', 'darkness']),
    }),
    z.strictObject({
      kind: z.literal('remove_objects'),
      reason: z.enum(['destroyed', 'dismissed']),
    }),
    z.strictObject({
      kind: z.literal('modify_objects'),
      changes: z.strictObject({
        name: trimmedText.optional(),
        kind: z.enum(['barrier', 'cover', 'door', 'hazard', 'light-source', 'summoned-terrain', 'generic']).optional(),
        durability: worldObjectTemplateSchema.shape.durability.optional(),
        armorClass: nonNegativeInteger.max(100).optional(),
        damageResponses: z.array(worldObjectDamageResponseSchema).max(damageTypes.length).optional(),
        blocking: worldObjectTemplateSchema.shape.blocking.optional(),
      }),
    }),
    z.strictObject({
      kind: z.literal('damage_objects'),
      damage: z.strictObject({
        terms: z.array(z.strictObject({
          type: z.enum(damageTypes),
          dice: z.strictObject({
            count: nonNegativeInteger.max(100),
            sides: z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(10), z.literal(12), z.literal(20)]),
            modifier: safeInteger.min(-100_000).max(100_000),
          }),
        })).min(1).max(20),
        critical: z.boolean(),
        responses: z.tuple([]),
      }),
    }),
  ])).min(1).max(32),
}).superRefine((operation, context) => {
  for (const [index, entry] of operation.operations.entries()) {
    if (entry.kind !== 'create_object') continue;
    const keys = entry.footprintOffsets.map((cell) => `${String(cell.column)},${String(cell.row)}`);
    if (new Set(keys).size !== keys.length || !keys.includes('0,0')) {
      context.addIssue({
        code: 'custom', path: ['operations', index, 'footprintOffsets'],
        message: 'Object footprint offsets must be unique and include the placement cell.',
      });
    }
  }
  for (const [index, entry] of operation.operations.entries()) {
    if (entry.kind === 'modify_objects' && Object.keys(entry.changes).length === 0) {
      context.addIssue({
        code: 'custom', path: ['operations', index, 'changes'],
        message: 'Object modifications cannot be empty.',
      });
    }
  }
});

const damageOperationSchema = damageOperationSpecSchema.extend({
  kind: z.literal('damage_operation'),
});

const conditionLifecycleDurationSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('fixed_rounds'), rounds: positiveInteger.max(1_000_000),
    expiresAt: z.enum(['target_start', 'target_end']),
  }),
  z.strictObject({ kind: z.literal('concentration') }),
  z.strictObject({
    kind: z.literal('fixed_rounds_or_concentration'), rounds: positiveInteger.max(1_000_000),
    expiresAt: z.enum(['target_start', 'target_end']),
  }),
]);

const conditionLifecycleOperationSchema = z.strictObject({
  kind: z.literal('condition_lifecycle'),
  condition: z.enum(conditionNames.filter((name) => name !== 'Exhaustion')),
  immunity: z.union([z.null(), z.strictObject({ condition: z.enum(conditionNames) })]),
  initialSave: z.union([z.null(), z.strictObject({
    ability: z.enum(abilities), rollMode: z.enum(['normal', 'advantage', 'disadvantage']),
    applyOn: z.literal('failure'),
  })]),
  repeatedSave: z.union([z.null(), z.strictObject({
    hook: z.enum(['target_start', 'target_end']), ability: z.enum(abilities),
    rollMode: z.enum(['normal', 'advantage', 'disadvantage']),
    onSuccess: z.enum(['remove_target', 'end_effect']),
  })]),
  damageBreak: z.union([z.null(), z.strictObject({
    sources: z.enum(['any', 'effect_source_or_allies']), minimumDamage: z.literal(1),
  })]),
  duration: conditionLifecycleDurationSchema,
  stacking: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('coexist') }),
    z.strictObject({ kind: z.literal('replace'), sources: z.enum(['same_source', 'any_source']) }),
    z.strictObject({ kind: z.literal('extend_duration'), sources: z.enum(['same_source', 'any_source']) }),
  ]),
}).superRefine((operation, context) => {
  if (operation.stacking.kind === 'extend_duration' && operation.duration.kind !== 'fixed_rounds') {
    context.addIssue({ code: 'custom', path: ['stacking'], message: 'Only a fixed-round effect can extend an existing duration.' });
  }
});

const modifierDieSchema = z.strictObject({
  count: positiveInteger.max(100),
  sides: z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(10), z.literal(12), z.literal(20)]),
});

const modifierSkillChoiceSchema = z.union([
  z.enum(skills),
  z.strictObject({
    kind: z.literal('chosen_when_cast'),
    options: z.array(z.enum(skills)).min(1).max(skills.length)
      .refine((options) => new Set(options).size === options.length),
  }),
]);

const modifierDamageTypeChoiceSchema = z.union([
  z.enum(damageTypes),
  z.strictObject({
    kind: z.literal('chosen_when_cast'),
    options: z.array(z.enum(damageTypes)).min(1).max(damageTypes.length)
      .refine((options) => new Set(options).size === options.length),
  }),
]);

const rollDiceModifierOperationSchema = z.discriminatedUnion('application', [
  z.strictObject({
    kind: z.literal('roll_dice_modifier'), application: z.literal('every_qualifying_roll'),
    tests: z.array(z.enum(['attack_roll', 'saving_throw'])).min(1).max(2)
      .refine((tests) => new Set(tests).size === tests.length),
    die: modifierDieSchema, sign: z.union([z.literal(1), z.literal(-1)]),
    duration: conditionLifecycleDurationSchema,
  }),
  z.strictObject({
    kind: z.literal('roll_dice_modifier'), application: z.literal('chosen_skill_checks'),
    skill: modifierSkillChoiceSchema, die: modifierDieSchema,
    sign: z.union([z.literal(1), z.literal(-1)]), duration: conditionLifecycleDurationSchema,
  }),
]);

const damageDiceReductionOperationSchema = z.strictObject({
  kind: z.literal('damage_dice_reduction'), damageType: modifierDamageTypeChoiceSchema,
  die: z.strictObject({ count: z.literal(1), sides: z.literal(4) }),
  uses: z.literal('once_per_turn'), duration: conditionLifecycleDurationSchema,
});

const rollModeModifierOperationSchema = z.discriminatedUnion('roll', [
  z.strictObject({
    kind: z.literal('roll_mode_modifier'), roll: z.literal('attack_roll'),
    mode: z.enum(['advantage', 'disadvantage']),
    scope: z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('target_rolls') }),
      z.strictObject({ kind: z.literal('attacks_against_target') }),
    ]),
    duration: conditionLifecycleDurationSchema,
  }),
  z.strictObject({
    kind: z.literal('roll_mode_modifier'), roll: z.literal('saving_throw'),
    mode: z.enum(['advantage', 'disadvantage']), scope: z.strictObject({ kind: z.literal('target_rolls') }),
    duration: conditionLifecycleDurationSchema,
  }),
  z.strictObject({
    kind: z.literal('roll_mode_modifier'), roll: z.literal('ability_check'),
    mode: z.enum(['advantage', 'disadvantage']), scope: z.strictObject({ kind: z.literal('target_rolls') }),
    duration: conditionLifecycleDurationSchema,
  }),
]);

const armorClassModifierOperationSchema = z.strictObject({
  kind: z.literal('armor_class_modifier'),
  modification: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('bonus'), amount: safeInteger.min(-30).max(30) }),
    z.strictObject({ kind: z.literal('floor'), minimum: nonNegativeInteger.max(100) }),
  ]),
  duration: conditionLifecycleDurationSchema,
});

const damageResponseModifierOperationSchema = z.strictObject({
  kind: z.literal('damage_response_modifier'), damageType: modifierDamageTypeChoiceSchema,
  response: z.enum(['resistant', 'vulnerable']), duration: conditionLifecycleDurationSchema,
});

const targetedDefenseModifierOperationSchema = z.strictObject({
  kind: z.literal('targeted_defense_modifier'), against: z.literal('selected_attacker'),
  armorClassBonus: safeInteger.min(1).max(30), duration: conditionLifecycleDurationSchema,
});

const armedWeaponHitRiderSchema = z.strictObject({
  kind: z.literal('armed_weapon_hit_rider'),
  ...armedWeaponHitRiderShape,
}).superRefine((operation, context) => {
  if (operation.damage !== null && (
    operation.damage.scaling.kind !== 'none' ||
    operation.damage.thresholdRider !== null
  )) {
    context.addIssue({ code: 'custom', message: 'Armed weapon-hit damage cannot defer target scaling or a threshold rider.' });
  }
});

const gridCellSchema = z.strictObject({ column: nonNegativeInteger, row: nonNegativeInteger });
const movementDurationShape = {
  durationRounds: positiveInteger.max(1_000_000),
  concentration: z.boolean(),
  expiresAt: z.enum(['source_start', 'source_end', 'target_start', 'target_end']),
} as const;
const speedChangeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('set'), speedFeet: nonNegativeInteger.max(100_000) }),
  z.strictObject({ kind: z.literal('increase'), feet: positiveInteger.max(100_000) }),
  z.strictObject({
    kind: z.literal('reduce'),
    reduction: z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('feet'), feet: positiveInteger.max(100_000) }),
      z.strictObject({ kind: z.literal('multiplier'), multiplier: z.number().finite().min(0).max(1) }),
    ]),
  }),
]);
const movementModeGrantSchema = z.strictObject({
  mode: z.enum(['flying', 'climbing', 'swimming']),
  speed: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('fixed'), feet: positiveInteger.max(100_000) }),
    z.strictObject({ kind: z.literal('walking_speed') }),
  ]),
});
const movementDamageSchema = z.strictObject({
  damageType: z.enum(damageTypes),
  dice: z.strictObject({
    count: positiveInteger.max(100), sides: z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(10), z.literal(12), z.literal(20)]),
    modifier: safeInteger.min(-1_000_000).max(1_000_000),
  }),
  unitFeet: z.literal(5),
  partialUnit: z.literal('completed_units_only'),
});
const teleportOperationSchema = z.strictObject({
  kind: z.literal('teleport'), subject: z.enum(['caster', 'targets']),
  maximumDistanceFeet: nonNegativeInteger.max(100_000),
  destination: z.strictObject({
    requireUnoccupied: z.literal(true), requireOccupiable: z.literal(true), requireLineOfSight: z.boolean(),
  }),
});
const forcedMovementOperationSchema = z.strictObject({
  kind: z.literal('forced_movement'), direction: z.enum(['away', 'toward']),
  origin: z.enum(['caster', 'selected_point']), distanceFeet: positiveInteger.max(100_000),
  save: z.union([z.null(), z.strictObject({
    ability: z.enum(abilities), rollMode: z.enum(['normal', 'advantage', 'disadvantage']), moveOn: z.literal('failure'),
  })]),
});
const movementModeOperationSchema = z.strictObject({
  kind: z.literal('movement_mode'), grants: z.array(movementModeGrantSchema).min(1).max(3),
  difficultTerrainImmunity: z.boolean(), magicalSpeedReductionImmunity: z.boolean(),
  ...movementDurationShape,
});
const movementRegionOperationSchema = z.strictObject({
  kind: z.literal('movement_region'),
  region: z.strictObject({ id: identifier, cells: z.array(gridCellSchema).min(1).max(10_000) }),
  difficultTerrain: z.boolean(), entry: z.enum(['allowed', 'blocked']), damage: movementDamageSchema.nullable(),
});
const speedModificationOperationSchema = z.strictObject({
  kind: z.literal('speed_modification'), modification: speedChangeSchema, ...movementDurationShape,
});

function hasOnlyKeys(record: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const allowed = new Set(keys);
  return Object.keys(record).every((key) => allowed.has(key));
}

function validCasterChoiceOperation(operation: Readonly<Record<string, unknown>>): boolean {
  if (!hasOnlyKeys(operation, ['kind', 'modes']) || !Array.isArray(operation.modes) || operation.modes.length === 0) {
    return false;
  }
  const modes = operation.modes.map(objectRecord);
  if (modes.some((mode) => mode === null)) return false;
  const keys: string[] = [];
  for (const mode of modes) {
    if (
      mode === null ||
      !hasOnlyKeys(mode, ['mode', 'operation']) ||
      typeof mode.mode !== 'string' ||
      !identifier.safeParse(mode.mode).success ||
      !structurallyValidOperation(mode.operation)
    ) return false;
    keys.push(mode.mode);
  }
  return new Set(keys).size === keys.length;
}

function validRandomBranchOperation(operation: Readonly<Record<string, unknown>>): boolean {
  if (
    !hasOnlyKeys(operation, ['kind', 'dieSides', 'branches']) ||
    ![4, 6, 8, 10, 12, 20].includes(operation.dieSides as number) ||
    !Array.isArray(operation.branches) ||
    operation.branches.length === 0
  ) return false;
  const covered = new Set<number>();
  for (const value of operation.branches) {
    const branch = objectRecord(value);
    if (
      branch === null ||
      !hasOnlyKeys(branch, ['minimum', 'maximum', 'operation']) ||
      !Number.isSafeInteger(branch.minimum) ||
      !Number.isSafeInteger(branch.maximum) ||
      (branch.minimum as number) < 1 ||
      (branch.maximum as number) > (operation.dieSides as number) ||
      (branch.minimum as number) > (branch.maximum as number) ||
      !structurallyValidOperation(branch.operation)
    ) return false;
    for (let face = branch.minimum as number; face <= (branch.maximum as number); face += 1) {
      if (covered.has(face)) return false;
      covered.add(face);
    }
  }
  return covered.size === operation.dieSides;
}

function validTargetBranchOperation(operation: Readonly<Record<string, unknown>>): boolean {
  if (
    !hasOnlyKeys(operation, ['kind', 'branches', 'otherwise']) ||
    !Array.isArray(operation.branches) ||
    operation.branches.length === 0 ||
    !(operation.otherwise === null || structurallyValidOperation(operation.otherwise))
  ) return false;
  const creatureTypes = new Set<string>();
  for (const value of operation.branches) {
    const branch = objectRecord(value);
    const predicate = objectRecord(branch?.predicate);
    if (
      branch === null ||
      !hasOnlyKeys(branch, ['predicate', 'operation']) ||
      predicate === null ||
      !structurallyValidOperation(branch.operation)
    ) return false;
    if (
      predicate.kind !== 'creature_type' ||
      !hasOnlyKeys(predicate, ['kind', 'creatureType']) ||
      typeof predicate.creatureType !== 'string' ||
      !trimmedText.safeParse(predicate.creatureType).success ||
      creatureTypes.has(predicate.creatureType)
    ) return false;
    creatureTypes.add(predicate.creatureType);
  }
  return true;
}

function validReevaluatedBranchOperation(operation: Readonly<Record<string, unknown>>): boolean {
  return hasOnlyKeys(operation, ['kind', 'hook', 'durationRounds', 'operation']) &&
    (operation.hook === 'target_start' || operation.hook === 'target_end') &&
    Number.isSafeInteger(operation.durationRounds) &&
    (operation.durationRounds as number) >= 1 &&
    structurallyValidOperation(operation.operation);
}

function structurallyValidOperation(value: unknown): value is SpellOperation {
  const operation = objectRecord(value);
  const kind = operationKind(value);
  if (
    operation === null ||
    kind === null ||
    !SPELL_OPERATION_KINDS.includes(kind as SpellOperation['kind'])
  ) return false;
  const typedKind = kind as SpellOperation['kind'];
  if (typedKind === 'caster_choice') return validCasterChoiceOperation(operation);
  if (typedKind === 'random_branch') return validRandomBranchOperation(operation);
  if (typedKind === 'target_branch') return validTargetBranchOperation(operation);
  if (typedKind === 'reevaluated_branch') return validReevaluatedBranchOperation(operation);
  if (typedKind === 'condition_lifecycle') return conditionLifecycleOperationSchema.safeParse(value).success;
  if (typedKind === 'roll_dice_modifier') return rollDiceModifierOperationSchema.safeParse(value).success;
  if (typedKind === 'damage_dice_reduction') return damageDiceReductionOperationSchema.safeParse(value).success;
  if (typedKind === 'roll_mode_modifier') return rollModeModifierOperationSchema.safeParse(value).success;
  if (typedKind === 'armor_class_modifier') return armorClassModifierOperationSchema.safeParse(value).success;
  if (typedKind === 'damage_response_modifier') return damageResponseModifierOperationSchema.safeParse(value).success;
  if (typedKind === 'targeted_defense_modifier') return targetedDefenseModifierOperationSchema.safeParse(value).success;
  if (typedKind === 'persistent_area') return persistentAreaOperationSchema.safeParse(value).success;
  if (typedKind === 'world_operations') return worldOperationSpellSchema.safeParse(value).success;
  if (typedKind === 'damage_operation') return damageOperationSchema.safeParse(value).success;
  if (typedKind === 'armed_weapon_hit_rider') return armedWeaponHitRiderSchema.safeParse(value).success;
  if (typedKind === 'teleport') return teleportOperationSchema.safeParse(value).success;
  if (typedKind === 'forced_movement') return forcedMovementOperationSchema.safeParse(value).success;
  if (typedKind === 'movement_mode') return movementModeOperationSchema.safeParse(value).success;
  if (typedKind === 'movement_region') return movementRegionOperationSchema.safeParse(value).success;
  if (typedKind === 'speed_modification') return speedModificationOperationSchema.safeParse(value).success;
  const required = operationRequiredFields[typedKind];
  if (required.some((field) => !Object.hasOwn(operation, field))) return false;
  const allowed = new Set<string>([
    'kind',
    ...required,
    ...(operationOptionalFields[typedKind as keyof typeof operationOptionalFields] ?? []),
  ]);
  return Object.keys(operation).every((field) => allowed.has(field));
}

const operationSchema = z.custom<SpellOperation>(structurallyValidOperation);

const spellSchema = z.strictObject({
  ...recordIdentityShape,
  level: spellLevel,
  school: spellSchoolSchema,
  castingTime: z.enum(['action', 'bonus_action', 'reaction', 'minute', 'ten_minutes', 'hour']),
  ritual: z.literal(true).optional(),
  range: spellRangeSchema,
  components: componentsSchema,
  duration: spellDurationSchema,
  concentration: z.boolean(),
  targeting: targetingSchema,
  operation: operationSchema,
});

const resourceSchema = externalPartyPackResourceSchema;
const featureSchema = z.strictObject({
  ...recordIdentityShape,
  effects: z.array(externalPartyPackFeatureEffectSchema).min(1).max(100),
  resources: z.array(resourceSchema).max(100),
});

const senseSchema = z.strictObject({
  kind: z.enum(['blindsight', 'darkvision', 'tremorsense', 'truesight'] satisfies readonly SenseKind[]),
  rangeFeet: positiveInteger.max(100_000),
});
const originGrantSchema = z.strictObject({
  abilityScoreIncreases: z.array(z.strictObject({
    ability: z.enum(abilities),
    amount: safeInteger.min(-30).max(30),
  })).max(abilities.length),
  skills: z.array(z.enum(skills)).max(skills.length),
  speedFeet: nonNegativeInteger.max(1_000),
  senses: z.array(senseSchema).max(4),
});
const speciesSchema = z.strictObject({ ...recordIdentityShape, grants: originGrantSchema });
const backgroundSchema = z.strictObject({ ...recordIdentityShape, grants: originGrantSchema });
const subclassSchema = z.strictObject({
  ...recordIdentityShape,
  className: trimmedText,
  featureSets: z.array(z.strictObject({
    level: positiveInteger.max(20),
    featureIds: z.array(trimmedText).min(1).max(100),
  })).min(1).max(20),
});

const monsterActionSchema = z.custom<MonsterAction>((value) => {
  const action = objectRecord(value);
  if (action === null || typeof action.kind !== 'string') return false;
  if (!['attack', 'multiattack', 'saving_throw', 'spellcasting'].includes(action.kind)) return false;
  if (typeof action.id !== 'string' || action.id.length === 0) return false;
  if (action.kind !== 'attack') return true;
  return typeof action.name === 'string' &&
    typeof action.attackBonus === 'number' &&
    objectRecord(action.delivery) !== null &&
    Array.isArray(action.damage) &&
    Array.isArray(action.onHit);
});

const savingThrowBonusesShape = Object.fromEntries(
  abilities.map((ability) => [ability, safeInteger.min(-30).max(30)]),
) as Record<Ability, z.ZodNumber>;
const monsterSchema = z.strictObject({
  ...recordIdentityShape,
  statblock: z.strictObject({
    creatureType: trimmedText.optional(),
    armorClass: positiveInteger.max(100),
    hitPointMaximum: positiveInteger.max(1_000_000),
    speedFeet: nonNegativeInteger.max(1_000),
    initiativeBonus: safeInteger.min(-30).max(30),
    savingThrowBonuses: z.strictObject(savingThrowBonusesShape),
    attacksPerAction: positiveInteger.max(100).optional(),
    reachFeet: nonNegativeInteger.max(1_000).optional(),
    damageResponses: z.array(z.strictObject({
      type: z.enum(damageTypes),
      response: z.enum(['normal', 'resistant', 'vulnerable', 'resistant_and_vulnerable', 'immune']),
    })).max(damageTypes.length).optional(),
    conditionImmunities: z.array(trimmedText).max(100).optional(),
    usesDeathSaves: z.boolean().optional(),
  }),
  actions: z.array(monsterActionSchema).min(1).max(100),
});

export const contentPackV1Schema = z.strictObject({
  schemaVersion: z.literal(CONTENT_PACK_SCHEMA_VERSION),
  packId: identifier,
  provenance: provenanceSchema,
  spells: z.array(spellSchema).max(10_000),
  features: z.array(featureSchema).max(10_000),
  species: z.array(speciesSchema).max(10_000),
  backgrounds: z.array(backgroundSchema).max(10_000),
  subclasses: z.array(subclassSchema).max(10_000),
  monsters: z.array(monsterSchema).max(10_000),
});

export type ContentPackV1 = z.infer<typeof contentPackV1Schema>;
export type ContentPackProvenance = ContentPackV1['provenance'];
export type ContentPackOriginGrants = z.infer<typeof originGrantSchema>;

export interface LoadedContentSpell {
  readonly id: string;
  readonly sourceId: string;
  readonly recordId: string;
  readonly name: string;
  readonly school: ContentPackV1['spells'][number]['school'];
  readonly range: ContentPackV1['spells'][number]['range'];
  readonly duration: ContentPackV1['spells'][number]['duration'];
  readonly concentration: boolean;
  readonly definition: SpellDefinition;
}

export interface LoadedContentFeature {
  readonly id: string;
  readonly sourceId: string;
  readonly recordId: string;
  readonly name: string;
  readonly effectDefinitions: readonly ExternalPartyPackEffect[];
  readonly resources: readonly {
    readonly id: ReturnType<typeof limitedResourcePoolId>;
    readonly maximum: number;
    readonly recharge: 'short_rest' | 'long_rest';
  }[];
}

export interface LoadedContentOrigin {
  readonly id: string;
  readonly sourceId: string;
  readonly recordId: string;
  readonly name: string;
  readonly grants: {
    readonly abilityScoreIncreases: readonly { readonly ability: Ability; readonly amount: number }[];
    readonly skills: readonly Skill[];
    readonly speedFeet: number;
    readonly senses: readonly { readonly kind: SenseKind; readonly rangeFeet: number }[];
  };
}

export interface LoadedContentSubclass {
  readonly id: string;
  readonly sourceId: string;
  readonly recordId: string;
  readonly name: string;
  readonly className: string;
  readonly featureSets: readonly { readonly level: number; readonly featureIds: readonly string[] }[];
}

export interface LoadedContentMonster {
  readonly id: string;
  readonly sourceId: string;
  readonly recordId: string;
  readonly name: string;
  readonly creatureType?: string;
  readonly statblock: MonsterStatblock;
  readonly actions: readonly MonsterAction[];
}

export interface LoadedContentPack {
  readonly pack: ContentPackV1;
  readonly provenance: ContentPackProvenance;
  readonly spells: readonly LoadedContentSpell[];
  readonly features: readonly LoadedContentFeature[];
  readonly species: readonly LoadedContentOrigin[];
  readonly backgrounds: readonly LoadedContentOrigin[];
  readonly subclasses: readonly LoadedContentSubclass[];
  readonly monsters: readonly LoadedContentMonster[];
}

export type ContentPackRefusal =
  | { readonly kind: 'content_pack_refusal'; readonly reason: 'invalid_json' }
  | { readonly kind: 'content_pack_refusal'; readonly reason: 'version_mismatch'; readonly receivedVersion: unknown }
  | { readonly kind: 'content_pack_refusal'; readonly reason: 'missing_provenance' }
  | { readonly kind: 'content_pack_refusal'; readonly reason: 'unknown_operation_kind'; readonly operationKind: string }
  | { readonly kind: 'content_pack_refusal'; readonly reason: 'unknown_effect_variant'; readonly effectKind: string }
  | { readonly kind: 'content_pack_refusal'; readonly reason: 'malformed_record'; readonly path: readonly PropertyKey[] }
  | { readonly kind: 'content_pack_refusal'; readonly reason: 'id_collision'; readonly id: string };

export type ContentPackLoadResult =
  | { readonly status: 'loaded'; readonly content: LoadedContentPack }
  | { readonly status: 'refused'; readonly refusal: ContentPackRefusal };

export function importedContentId(sourceId: string, recordId: string): string {
  return `${sourceId}:${recordId}`;
}

function namespaceEffect(effect: ExternalPartyPackEffect, sourceId: string): ExternalPartyPackEffect {
  const suffix = effect.effectId.startsWith('effect:')
    ? effect.effectId.slice('effect:'.length)
    : effect.effectId;
  const resourcePoolId = effect.resourcePoolId === undefined
    ? {}
    : { resourcePoolId: `resource:${sourceId}:${effect.resourcePoolId.slice('resource:'.length)}` };
  return {
    ...effect,
    effectId: `effect:${sourceId}:${suffix}`,
    ...resourcePoolId,
  };
}

function namespaceResource(resource: ExternalPartyPackResource, sourceId: string): ExternalPartyPackResource {
  return {
    ...resource,
    resourcePoolId: `resource:${sourceId}:${resource.resourcePoolId.slice('resource:'.length)}`,
  };
}

function loadFeature(feature: ContentPackV1['features'][number]): LoadedContentFeature {
  const resources = feature.resources.map((resource) => namespaceResource(resource, feature.sourceId));
  return {
    id: importedContentId(feature.sourceId, feature.recordId),
    sourceId: feature.sourceId,
    recordId: feature.recordId,
    name: feature.name,
    effectDefinitions: feature.effects,
    resources: resources.map((resource) => ({
      id: limitedResourcePoolId(resource.resourcePoolId),
      maximum: resource.maximum,
      recharge: resource.recharge,
    })),
  };
}

function loadSpell(spell: ContentPackV1['spells'][number], provenance: ContentPackProvenance): LoadedContentSpell {
  const id = importedContentId(spell.sourceId, spell.recordId);
  return {
    id,
    sourceId: spell.sourceId,
    recordId: spell.recordId,
    name: spell.name,
    school: spell.school,
    range: spell.range,
    duration: spell.duration,
    concentration: spell.concentration,
    definition: {
      id,
      name: spell.name,
      level: spell.level,
      source: `content-pack:${provenance.sourceName}`,
      castingTime: spell.castingTime,
      ...(spell.ritual === undefined ? {} : { ritual: spell.ritual }),
      components: spell.components,
      targeting: spell.targeting as SpellDefinition['targeting'],
      operation: spell.operation,
    },
  };
}

function loadMonster(monster: ContentPackV1['monsters'][number]): LoadedContentMonster {
  const id = importedContentId(monster.sourceId, monster.recordId);
  const input: MonsterStatblockInput = {
    id,
    name: monster.name,
    armorClass: monster.statblock.armorClass,
    hitPointMaximum: monster.statblock.hitPointMaximum,
    speedFeet: monster.statblock.speedFeet,
    initiativeBonus: monster.statblock.initiativeBonus,
    savingThrowBonuses: monster.statblock.savingThrowBonuses,
    ...(monster.statblock.attacksPerAction === undefined
      ? {}
      : { attacksPerAction: monster.statblock.attacksPerAction }),
    ...(monster.statblock.reachFeet === undefined
      ? {}
      : { reachFeet: monster.statblock.reachFeet }),
    ...(monster.statblock.damageResponses === undefined
      ? {}
      : { damageResponses: monster.statblock.damageResponses }),
    ...(monster.statblock.conditionImmunities === undefined
      ? {}
      : { conditionImmunities: monster.statblock.conditionImmunities }),
    ...(monster.statblock.usesDeathSaves === undefined
      ? {}
      : { usesDeathSaves: monster.statblock.usesDeathSaves }),
  };
  return {
    id,
    sourceId: monster.sourceId,
    recordId: monster.recordId,
    name: monster.name,
    ...(monster.statblock.creatureType === undefined ? {} : { creatureType: monster.statblock.creatureType }),
    statblock: monsterStatblock(input),
    actions: monster.actions,
  };
}

function srdIds(): ReadonlySet<string> {
  return new Set([
    ...SPELL_MANIFEST.map((spell) => `srd:${spell.id}`),
    ...STARTER_MONSTER_ROSTER.map((monster) => `srd:${monster.id.slice('statblock:'.length)}`),
  ]);
}

function allRecords(pack: ContentPackV1): readonly { readonly sourceId: string; readonly recordId: string }[] {
  return [
    ...pack.spells,
    ...pack.features,
    ...pack.species,
    ...pack.backgrounds,
    ...pack.subclasses,
    ...pack.monsters,
  ];
}

function firstUnknownOperation(value: Readonly<Record<string, unknown>>): string | null {
  if (!Array.isArray(value.spells)) return null;
  for (const spellValue of value.spells) {
    const spell = objectRecord(spellValue);
    const kind = operationKind(spell?.operation);
    if (kind !== null && !SPELL_OPERATION_KINDS.includes(kind as SpellOperation['kind'])) return kind;
  }
  return null;
}

function firstUnknownEffect(value: Readonly<Record<string, unknown>>): string | null {
  if (!Array.isArray(value.features)) return null;
  for (const featureValue of value.features) {
    const feature = objectRecord(featureValue);
    if (!Array.isArray(feature?.effects)) continue;
    for (const effectValue of feature.effects) {
      const effect = objectRecord(effectValue);
      const kind = effect?.kind;
      if (
        typeof kind === 'string' &&
        !FEATURE_EFFECT_KINDS.includes(kind as (typeof FEATURE_EFFECT_KINDS)[number])
      ) return kind;
    }
  }
  return null;
}

export function loadContentPack(value: unknown): ContentPackLoadResult {
  const root = objectRecord(value);
  if (root === null) {
    return { status: 'refused', refusal: { kind: 'content_pack_refusal', reason: 'malformed_record', path: [] } };
  }
  if (root.schemaVersion !== CONTENT_PACK_SCHEMA_VERSION) {
    return {
      status: 'refused',
      refusal: { kind: 'content_pack_refusal', reason: 'version_mismatch', receivedVersion: root.schemaVersion },
    };
  }
  if (!Object.hasOwn(root, 'provenance')) {
    return { status: 'refused', refusal: { kind: 'content_pack_refusal', reason: 'missing_provenance' } };
  }
  const unknownOperation = firstUnknownOperation(root);
  if (unknownOperation !== null) {
    return {
      status: 'refused',
      refusal: { kind: 'content_pack_refusal', reason: 'unknown_operation_kind', operationKind: unknownOperation },
    };
  }
  const unknownEffect = firstUnknownEffect(root);
  if (unknownEffect !== null) {
    return {
      status: 'refused',
      refusal: { kind: 'content_pack_refusal', reason: 'unknown_effect_variant', effectKind: unknownEffect },
    };
  }
  const parsed = contentPackV1Schema.safeParse(value);
  if (!parsed.success) {
    return {
      status: 'refused',
      refusal: {
        kind: 'content_pack_refusal',
        reason: 'malformed_record',
        path: parsed.error.issues[0]?.path ?? [],
      },
    };
  }
  const ids = allRecords(parsed.data).map((entry) => importedContentId(entry.sourceId, entry.recordId));
  const seen = new Set<string>();
  const existingSrdIds = srdIds();
  const collision = ids.find((id) => seen.has(id) || existingSrdIds.has(id) || (seen.add(id), false));
  if (collision !== undefined) {
    return {
      status: 'refused',
      refusal: { kind: 'content_pack_refusal', reason: 'id_collision', id: collision },
    };
  }
  try {
    const featureIds = new Set(parsed.data.features.map((feature) =>
      importedContentId(feature.sourceId, feature.recordId)));
    const subclasses = parsed.data.subclasses.map((subclass) => ({
      id: importedContentId(subclass.sourceId, subclass.recordId),
      sourceId: subclass.sourceId,
      recordId: subclass.recordId,
      name: subclass.name,
      className: subclass.className,
      featureSets: subclass.featureSets.map((set) => ({
        level: set.level,
        featureIds: set.featureIds.map((id) => id.includes(':') ? id : importedContentId(subclass.sourceId, id)),
      })),
    }));
    const missingFeature = subclasses.flatMap((subclass) => subclass.featureSets)
      .flatMap((set) => set.featureIds)
      .find((id) => !featureIds.has(id));
    if (missingFeature !== undefined) {
      return {
        status: 'refused',
        refusal: { kind: 'content_pack_refusal', reason: 'malformed_record', path: ['subclasses', 'featureSets', missingFeature] },
      };
    }
    return {
      status: 'loaded',
      content: {
        pack: parsed.data,
        provenance: parsed.data.provenance,
        spells: parsed.data.spells.map((spell) => loadSpell(spell, parsed.data.provenance)),
        features: parsed.data.features.map(loadFeature),
        species: parsed.data.species.map((species) => ({
          id: importedContentId(species.sourceId, species.recordId),
          sourceId: species.sourceId,
          recordId: species.recordId,
          name: species.name,
          grants: species.grants,
        })),
        backgrounds: parsed.data.backgrounds.map((background) => ({
          id: importedContentId(background.sourceId, background.recordId),
          sourceId: background.sourceId,
          recordId: background.recordId,
          name: background.name,
          grants: background.grants,
        })),
        subclasses,
        monsters: parsed.data.monsters.map(loadMonster),
      },
    };
  } catch {
    return {
      status: 'refused',
      refusal: { kind: 'content_pack_refusal', reason: 'malformed_record', path: [] },
    };
  }
}

export function loadContentPackBytes(bytes: string): ContentPackLoadResult {
  try {
    const value: unknown = JSON.parse(bytes);
    return loadContentPack(value);
  } catch {
    return { status: 'refused', refusal: { kind: 'content_pack_refusal', reason: 'invalid_json' } };
  }
}

export function importedSpellDefinition(
  packs: readonly LoadedContentPack[] | undefined,
  id: string,
): SpellDefinition | null {
  for (const pack of packs ?? []) {
    const spell = pack.spells.find((candidate) => candidate.id === id);
    if (spell !== undefined) return spell.definition;
  }
  return null;
}

export function importedMonsterProfile(
  monster: LoadedContentMonster,
  identity: { readonly combatantId: string; readonly tokenId: string },
): CombatantProfile {
  const profile = monsterCombatantProfile(monster.statblock, identity);
  return monster.creatureType === undefined
    ? profile
    : { ...profile, rules: { ...profile.rules, creatureType: monster.creatureType } };
}

export function importedMonsterAttackCommand(
  monster: LoadedContentMonster,
  actionId: string,
  actor: CombatantId,
  target: CombatantId,
): Extract<EncounterCommand, { readonly type: 'attack' }> {
  const action = monster.actions.find((candidate): candidate is Extract<MonsterAction, { readonly kind: 'attack' }> =>
    candidate.kind === 'attack' && candidate.id === actionId);
  if (action === undefined) throw new RangeError(`Imported monster has no attack ${actionId}.`);
  return {
    type: 'attack',
    actor,
    target,
    attackBonus: action.attackBonus,
    criticalFloor: 20,
    rollMode: 'normal',
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    damage: {
      terms: action.damage.filter((term) => term.trigger.kind === 'always').map((term) => ({
        type: damageType(term.type),
        dice: {
          count: term.dice.count,
          sides: dieSides(term.dice.sides),
          modifier: term.dice.modifier,
        },
      })),
      critical: false,
      responses: [],
    },
    attackId: action.id,
  };
}

export function featureEffectsForCombatant(
  features: readonly LoadedContentFeature[],
  totalLevel: number,
): readonly CombatFeatureEffect[] {
  if (!Number.isSafeInteger(totalLevel) || totalLevel < 1 || totalLevel > 20) {
    throw new RangeError('Imported feature level must be an integer from 1 through 20.');
  }
  const effects = features.flatMap((feature) => feature.effectDefinitions.map((effect) =>
    loadedFeatureEffect(namespaceEffect(effect, feature.sourceId), totalLevel)));
  const ids = effects.map((effect) => effect.id);
  if (new Set(ids).size !== ids.length) throw new RangeError('Imported feature effect ids must be unique.');
  return effects;
}
