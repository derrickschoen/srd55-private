import { z } from 'zod';
import { conditionNames } from '../combat/conditions';
import type { EffectPayload } from '../combat/effects';
import {
  armedWeaponHitRiderShape,
  damageOperationSpecSchema,
} from '../combat/damage-operation-schema';
import type {
  BranchSpellOperation,
  CompositionOperation,
  CompositionStep,
  NonCompositionSpellOperation,
  SpellOperation,
} from '../combat/spells/types';
import { abilities, damageTypes, skills } from '../domain/enums';

export const MAX_IMPORTED_DICE_COUNT = 100;
export const MAX_IMPORTED_DISTANCE_FEET = 100_000;
export const MAX_IMPORTED_LEVEL = 20;
export const MAX_IMPORTED_ROUNDS = 1_000_000;
export const MAX_IMPORTED_SCALAR = 1_000_000;
/** The sourced high-water mark is Phantom Steed's 100 feet; 500 leaves fivefold magic/homebrew headroom. */
export const MAX_IMPORTED_SPEED_FEET = 500;

const safeInteger = z.number().int().safe();
const nonNegativeInteger = safeInteger.min(0);
const positiveInteger = safeInteger.min(1);
const boundedNonNegative = nonNegativeInteger.max(MAX_IMPORTED_SCALAR);
const boundedPositive = positiveInteger.max(MAX_IMPORTED_SCALAR);
const importedRounds = positiveInteger.max(MAX_IMPORTED_ROUNDS);
const importedDistance = nonNegativeInteger.max(MAX_IMPORTED_DISTANCE_FEET);
const importedPositiveDistance = positiveInteger.max(MAX_IMPORTED_DISTANCE_FEET);
const importedSpeed = nonNegativeInteger.max(MAX_IMPORTED_SPEED_FEET);
const importedPositiveSpeed = positiveInteger.max(MAX_IMPORTED_SPEED_FEET);
const importedDieSides = z.union([
  z.literal(4), z.literal(6), z.literal(8), z.literal(10), z.literal(12), z.literal(20),
]);
const nonExhaustionConditions = conditionNames.filter((condition) => condition !== 'Exhaustion');

/** Content dice must actually roll at least one die; engine-internal flat terms use another boundary. */
export const importedOperationDiceSchema = z.strictObject({
  baseCount: positiveInteger.max(MAX_IMPORTED_DICE_COUNT),
  sides: importedDieSides,
  modifier: safeInteger.min(-MAX_IMPORTED_SCALAR).max(MAX_IMPORTED_SCALAR),
  perSlotCount: nonNegativeInteger.max(MAX_IMPORTED_DICE_COUNT),
  perSlotModifier: safeInteger.min(-MAX_IMPORTED_SCALAR).max(MAX_IMPORTED_SCALAR),
  cantripUpgrade: z.boolean(),
  minimumTotal: boundedNonNegative.optional(),
  maximumTotal: boundedNonNegative.optional(),
  rerollBelow: z.strictObject({
    threshold: positiveInteger.max(20),
    maximumRerollsPerDie: z.literal(1),
  }).optional(),
}).superRefine((dice, context) => {
  if (dice.minimumTotal !== undefined && dice.maximumTotal !== undefined && dice.minimumTotal > dice.maximumTotal) {
    context.addIssue({ code: 'custom', path: ['minimumTotal'], message: 'Minimum damage cannot exceed maximum damage.' });
  }
  if (dice.rerollBelow !== undefined && dice.rerollBelow.threshold > dice.sides) {
    context.addIssue({ code: 'custom', path: ['rerollBelow', 'threshold'], message: 'Reroll threshold cannot exceed the die size.' });
  }
});

const EFFECT_PAYLOAD_KINDS = [
  'ability_check_advantage', 'ability_check_modifier', 'action_surge', 'alarm_ward',
  'appearance_illusion', 'arcane_eye', 'arcane_lock', 'armor_class_modifier',
  'attack_roll_modifier', 'attack_roll_mode_modifier', 'attacks_against_target_roll_mode',
  'augury', 'aura_of_life', 'banishment', 'base_armor_class', 'beacon_of_hope',
  'bestow_curse', 'black_tentacles_area', 'blink', 'bonus_action_attack_grant',
  'bonus_action_dash', 'calm_emotions', 'cannot_regain_hit_points', 'charm_monster',
  'clairvoyance_sensor', 'commanded_action', 'communication_link', 'condition',
  'condition_bundle', 'condition_choice', 'confusion_area', 'conjure_minor_elementals',
  'conjured_hand', 'consumable_healing_pool', 'control_water', 'corpse_preservation',
  'created_food_and_water', 'creature_type_protection', 'd20_test_modifier',
  'damage_reduction', 'damage_resistances', 'damage_rider', 'darkvision', 'daylight_area',
  'death_ward', 'detect_thoughts', 'detection_sense', 'dimension_door', 'divination',
  'energy_protection', 'ensnaring_strike',
  'environmental_water', 'exhaustion', 'extra_attack_count_override', 'faerie_fire',
  'fabricate', 'faithful_hound', 'falling_protection', 'fear', 'fire_shield', 'flaming_sphere', 'flight', 'floating_disk',
  'food_purification', 'form_alteration', 'freedom_of_movement', 'gaseous_form',
  'glyph_of_warding', 'granted_breath', 'guardian_of_faith', 'gust_of_wind_area',
  'hallucinatory_terrain', 'haste', 'hit_point_maximum_modifier', 'hypnotic_pattern',
  'ice_storm_terrain', 'illusion', 'illusory_script', 'image_illusion', 'jump_movement',
  'language_comprehension', 'levitation', 'light_source', 'locate_creature',
  'location_tracking', 'magic_aura', 'magic_circle', 'magic_identification',
  'magic_missile_immunity', 'magic_mouth', 'magic_weapon', 'major_image',
  'meld_into_stone', 'minor_magic', 'mirror_images', 'movement_modifier', 'nondetection',
  'object_location', 'object_repair', 'object_unlock', 'obscured_area', 'ongoing_damage',
  'opportunity_attacks_disabled', 'phantasmal_killer', 'phantom_steed', 'poison_protection',
  'polymorph', 'private_sanctum', 'ray_enfeeblement', 'recurring_damage_operation', 'resilient_sphere',
  'rope_trick', 'sanctuary', 'saving_throw_modifier', 'secret_chest', 'see_invisibility',
  'sending', 'shield_defense', 'silence_area', 'size_alteration', 'skill_modifier',
  'sleep_sequence', 'sleet_storm_area', 'slow', 'speak_with_dead', 'spider_climb',
  'spirit_guardians_area', 'spiritual_weapon', 'stinking_cloud_area', 'stone_shape',
  'summoned_familiar', 'summoned_undead', 'teleport', 'temporary_banishment',
  'tiny_hut', 'trap_detection', 'truth_zone', 'universal_language', 'unseen_servant',
  'vampiric_touch', 'wall_of_fire', 'warding_bond', 'water_breathing', 'water_walk',
  'web_area',
] as const satisfies readonly Exclude<EffectPayload, { readonly kind: 'sustained_effect' }>['kind'][];

type MissingEffectPayloadKind = Exclude<
  Exclude<EffectPayload, { readonly kind: 'sustained_effect' }>['kind'],
  (typeof EFFECT_PAYLOAD_KINDS)[number]
>;
const effectPayloadInventoryIsComplete: MissingEffectPayloadKind extends never ? true : never = true;
void effectPayloadInventoryIsComplete;

const importedJsonValue: z.ZodType<unknown> = z.lazy(() => z.union([
  z.null(), z.boolean(), z.string(), z.number().finite(),
  z.array(importedJsonValue).max(10_000),
  z.record(z.string(), importedJsonValue),
]));

const effectPayloadSchema = z.object({
  kind: z.enum(EFFECT_PAYLOAD_KINDS),
}).catchall(importedJsonValue);

const effectDataSchema = z.strictObject({
  payload: effectPayloadSchema,
  target: z.enum(['self', 'targets']),
  concentration: z.boolean(),
  durationRounds: importedRounds.nullable(),
  expiresAt: z.enum(['source_start', 'source_end', 'target_start', 'target_end']),
  stacking: z.strictObject({
    key: z.string().min(1).max(1_000),
    mode: z.enum(['coexist', 'replace', 'extend_duration']),
  }).optional(),
  repeatedSave: z.strictObject({
    ability: z.enum(abilities),
    rollMode: z.enum(['normal', 'advantage', 'disadvantage']),
    timing: z.enum(['target_start', 'target_end']),
  }).optional(),
  durationRoundsPerSlot: nonNegativeInteger.max(MAX_IMPORTED_ROUNDS).optional(),
  slotDurationTiers: z.array(z.strictObject({
    minimumSlot: positiveInteger.max(9),
    durationRounds: importedRounds.nullable(),
    concentration: z.boolean(),
  })).max(9).optional(),
});

const conditionLifecycleDurationSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('fixed_rounds'), rounds: importedRounds, expiresAt: z.enum(['source_start', 'source_end', 'target_start', 'target_end']) }),
  z.strictObject({ kind: z.literal('concentration') }),
  z.strictObject({ kind: z.literal('fixed_rounds_or_concentration'), rounds: importedRounds, expiresAt: z.enum(['source_start', 'source_end', 'target_start', 'target_end']) }),
]);

const conditionLifecycleOperationSchema = z.strictObject({
  kind: z.literal('condition_lifecycle'),
  condition: z.enum(nonExhaustionConditions),
  immunity: z.union([z.null(), z.strictObject({ condition: z.enum(conditionNames) })]),
  initialSave: z.union([z.null(), z.strictObject({
    ability: z.enum(abilities), rollMode: z.enum(['normal', 'advantage', 'disadvantage']), applyOn: z.literal('failure'),
  })]),
  repeatedSave: z.union([z.null(), z.strictObject({
    hook: z.enum(['target_start', 'target_end']), ability: z.enum(abilities),
    rollMode: z.enum(['normal', 'advantage', 'disadvantage']), onSuccess: z.enum(['remove_target', 'end_effect']),
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
  count: positiveInteger.max(MAX_IMPORTED_DICE_COUNT),
  sides: importedDieSides,
});
const castChoice = <T extends z.ZodType>(schema: T) => z.union([
  schema,
  z.strictObject({ kind: z.literal('chosen_when_cast'), options: z.array(schema).min(1).max(100) }),
]);
const modifierDuration = conditionLifecycleDurationSchema;

const rollDiceModifierOperationSchema = z.discriminatedUnion('application', [
  z.strictObject({
    kind: z.literal('roll_dice_modifier'), application: z.literal('every_qualifying_roll'),
    tests: z.array(z.enum(['attack_roll', 'saving_throw'])).min(1).max(2),
    die: modifierDieSchema, sign: z.union([z.literal(1), z.literal(-1)]), duration: modifierDuration,
  }),
  z.strictObject({
    kind: z.literal('roll_dice_modifier'), application: z.literal('chosen_skill_checks'),
    skill: castChoice(z.enum(skills)), die: modifierDieSchema,
    sign: z.union([z.literal(1), z.literal(-1)]), duration: modifierDuration,
  }),
]);

const damageTypeChoiceSchema = castChoice(z.enum(damageTypes));
const damageDiceReductionOperationSchema = z.strictObject({
  kind: z.literal('damage_dice_reduction'), damageType: damageTypeChoiceSchema,
  die: z.strictObject({ count: z.literal(1), sides: z.literal(4) }),
  uses: z.literal('once_per_turn'), duration: modifierDuration,
});
const rollModeModifierOperationSchema = z.discriminatedUnion('roll', [
  z.strictObject({ kind: z.literal('roll_mode_modifier'), roll: z.literal('attack_roll'), mode: z.enum(['advantage', 'disadvantage']), scope: z.discriminatedUnion('kind', [z.strictObject({ kind: z.literal('target_rolls') }), z.strictObject({ kind: z.literal('attacks_against_target') })]), duration: modifierDuration }),
  z.strictObject({ kind: z.literal('roll_mode_modifier'), roll: z.literal('saving_throw'), mode: z.enum(['advantage', 'disadvantage']), scope: z.strictObject({ kind: z.literal('target_rolls') }), duration: modifierDuration }),
  z.strictObject({ kind: z.literal('roll_mode_modifier'), roll: z.literal('ability_check'), mode: z.enum(['advantage', 'disadvantage']), scope: z.strictObject({ kind: z.literal('target_rolls') }), duration: modifierDuration }),
]);
const armorClassModifierOperationSchema = z.strictObject({
  kind: z.literal('armor_class_modifier'),
  modification: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('bonus'), amount: safeInteger.min(-30).max(30) }),
    z.strictObject({ kind: z.literal('floor'), minimum: nonNegativeInteger.max(100) }),
  ]),
  duration: modifierDuration,
});
const damageResponseModifierOperationSchema = z.strictObject({
  kind: z.literal('damage_response_modifier'), damageType: damageTypeChoiceSchema,
  response: z.enum(['resistant', 'vulnerable']), duration: modifierDuration,
});
const targetedDefenseModifierOperationSchema = z.strictObject({
  kind: z.literal('targeted_defense_modifier'), against: z.literal('selected_attacker'),
  armorClassBonus: positiveInteger.max(30), duration: modifierDuration,
});
const heatMetalOperationSchema = z.strictObject({
  kind: z.literal('heat_metal'),
  requiredMaterial: z.literal('metal'),
  damageType: z.literal('Fire'),
  dice: importedOperationDiceSchema,
  failedSave: z.strictObject({
    ability: z.literal('constitution'),
    rollMode: z.literal('normal'),
    cannotDrop: z.tuple([
      z.strictObject({
        kind: z.literal('roll_mode_modifier'), roll: z.literal('attack_roll'),
        mode: z.literal('disadvantage'), scope: z.strictObject({ kind: z.literal('target_rolls') }),
        duration: z.strictObject({ kind: z.literal('fixed_rounds'), rounds: z.literal(1), expiresAt: z.literal('target_start') }),
      }),
      z.strictObject({
        kind: z.literal('roll_mode_modifier'), roll: z.literal('ability_check'),
        mode: z.literal('disadvantage'), scope: z.strictObject({ kind: z.literal('target_rolls') }),
        duration: z.strictObject({ kind: z.literal('fixed_rounds'), rounds: z.literal(1), expiresAt: z.literal('target_start') }),
      }),
    ]),
  }),
});

const importedDamageOperationSchema = damageOperationSpecSchema.extend({ kind: z.literal('damage_operation') });
const armedWeaponHitRiderSchema = z.strictObject({ kind: z.literal('armed_weapon_hit_rider'), ...armedWeaponHitRiderShape });

const persistentAreaShapeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('sphere'), radius: importedPositiveDistance }),
  z.strictObject({ kind: z.literal('cube'), size: importedPositiveDistance }),
  z.strictObject({ kind: z.literal('cylinder'), radius: importedPositiveDistance, height: importedPositiveDistance }),
  z.strictObject({ kind: z.literal('line'), length: importedPositiveDistance, width: importedPositiveDistance, direction: z.strictObject({ x: z.number().finite(), y: z.number().finite() }) }),
  z.strictObject({ kind: z.literal('emanation'), radius: importedDistance }),
]);
const persistentAreaLifetimeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('while_inside') }), z.strictObject({ kind: z.literal('area_duration') }),
  z.strictObject({ kind: z.literal('fixed_rounds'), rounds: importedRounds, boundary: z.enum(['start', 'end']) }),
  z.strictObject({ kind: z.literal('save_ends'), boundary: z.enum(['start', 'end']) }),
]);
const persistentAreaPayloadSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('damage'), damageType: z.enum(damageTypes), dice: importedOperationDiceSchema }),
  z.strictObject({
    kind: z.literal('effect'),
    payload: z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('condition'), condition: z.enum(nonExhaustionConditions) }),
      z.strictObject({ kind: z.literal('skill_modifier'), skill: z.literal('stealth'), amount: safeInteger.min(-30).max(30) }),
      z.strictObject({ kind: z.literal('armor_class_modifier'), amount: safeInteger.min(-30).max(30) }),
      z.strictObject({ kind: z.literal('movement_modifier'), speedDeltaFeet: safeInteger.min(-MAX_IMPORTED_DISTANCE_FEET).max(MAX_IMPORTED_DISTANCE_FEET) }),
    ]),
    lifetime: persistentAreaLifetimeSchema,
  }),
]);
const persistentAreaEffectSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('automatic'), payload: persistentAreaPayloadSchema }),
  z.strictObject({ kind: z.literal('save_gated'), ability: z.enum(abilities), rollMode: z.enum(['normal', 'advantage', 'disadvantage']), onSuccess: z.enum(['none', 'half']), payload: persistentAreaPayloadSchema }),
]);
const persistentAreaOperationSchema = z.strictObject({
  kind: z.literal('persistent_area'), origin: z.enum(['selected_when_cast', 'anchored_to_caster']),
  shape: persistentAreaShapeSchema.nullable(), durationRounds: importedRounds, concentration: z.boolean(),
  targetFilter: z.enum(['all', 'allies', 'enemies', 'selected']), includeOwner: z.boolean(), difficultTerrain: z.boolean(),
  movableFeet: importedPositiveDistance.nullable(),
  hooks: z.array(z.strictObject({ hook: z.enum(['on_enter', 'on_start_of_turn_inside', 'on_end_of_turn_inside', 'on_exit']), frequency: z.enum(['once_per_turn', 'every_trigger']), effect: persistentAreaEffectSchema })).max(16),
  initialEffects: z.array(z.strictObject({ excludeOwner: z.boolean(), effect: persistentAreaEffectSchema })).max(16),
});

const worldObjectDamageResponseSchema = z.strictObject({
  type: z.enum(damageTypes),
  response: z.enum(['normal', 'resistant', 'vulnerable', 'resistant_and_vulnerable', 'immune']),
});
const worldObjectDurabilitySchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('hit_points'), hitPoints: boundedPositive, maximumHitPoints: boundedPositive }),
  z.strictObject({ kind: z.literal('indestructible') }),
]);
const worldObjectBlockingSchema = z.strictObject({
  movement: z.boolean(), lineOfSight: z.boolean(), cover: z.enum(['none', 'half', 'three_quarters', 'total']),
});
const worldObjectTemplateSchema = z.strictObject({
  name: z.string().min(1).max(1_000),
  kind: z.enum(['barrier', 'cover', 'door', 'hazard', 'light-source', 'summoned-terrain', 'generic']),
  durability: worldObjectDurabilitySchema,
  armorClass: nonNegativeInteger.max(100),
  damageResponses: z.array(worldObjectDamageResponseSchema).max(damageTypes.length),
  blocking: worldObjectBlockingSchema,
}).superRefine((object, context) => {
  if (object.durability.kind === 'hit_points' && object.durability.hitPoints > object.durability.maximumHitPoints) {
    context.addIssue({ code: 'custom', path: ['durability', 'hitPoints'], message: 'Object Hit Points cannot exceed its maximum.' });
  }
});
const worldDamageRequestSchema = z.strictObject({
  terms: z.array(z.strictObject({
    type: z.enum(damageTypes),
    dice: z.strictObject({ count: positiveInteger.max(MAX_IMPORTED_DICE_COUNT), sides: importedDieSides, modifier: safeInteger.min(-MAX_IMPORTED_SCALAR).max(MAX_IMPORTED_SCALAR) }),
  })).min(1).max(20),
  critical: z.boolean(),
  responses: z.tuple([]),
});
const worldOperationsOperationSchema = z.strictObject({
  kind: z.literal('world_operations'),
  operations: z.array(z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('create_object'), placement: z.enum(['caster_cell', 'area_origin']), footprintOffsets: z.array(z.strictObject({ column: safeInteger, row: safeInteger })).min(1).max(400), object: worldObjectTemplateSchema }),
    z.strictObject({ kind: z.literal('transform_terrain'), regionId: z.string().min(1).max(64), difficultTerrain: z.boolean() }),
    z.strictObject({ kind: z.literal('set_light_level'), regionId: z.string().min(1).max(64), level: z.enum(['bright', 'dim', 'darkness']) }),
    z.strictObject({ kind: z.literal('remove_objects'), reason: z.enum(['destroyed', 'dismissed']) }),
    z.strictObject({ kind: z.literal('modify_objects'), changes: z.strictObject({
      name: z.string().min(1).max(1_000).optional(),
      kind: z.enum(['barrier', 'cover', 'door', 'hazard', 'light-source', 'summoned-terrain', 'generic']).optional(),
      durability: worldObjectDurabilitySchema.optional(), armorClass: nonNegativeInteger.max(100).optional(),
      damageResponses: z.array(worldObjectDamageResponseSchema).max(damageTypes.length).optional(),
      blocking: worldObjectBlockingSchema.optional(),
    }).refine((changes) => Object.keys(changes).length > 0, { message: 'Object modifications cannot be empty.' }) }),
    z.strictObject({ kind: z.literal('move_owned_object'), maximumDistanceFeet: importedPositiveDistance }),
    z.strictObject({ kind: z.literal('damage_objects'), damage: worldDamageRequestSchema }),
  ])).min(1).max(32),
}).superRefine((operation, context) => {
  for (const [index, entry] of operation.operations.entries()) {
    if (entry.kind !== 'create_object') continue;
    const cells = entry.footprintOffsets.map((cell) => `${String(cell.column)},${String(cell.row)}`);
    if (!cells.includes('0,0') || new Set(cells).size !== cells.length) {
      context.addIssue({ code: 'custom', path: ['operations', index, 'footprintOffsets'], message: 'Object footprint offsets must be unique and include the placement cell.' });
    }
  }
});

const gridCellSchema = z.strictObject({ column: nonNegativeInteger, row: nonNegativeInteger });
const movementDurationShape = { durationRounds: importedRounds, concentration: z.boolean(), expiresAt: z.enum(['source_start', 'source_end', 'target_start', 'target_end']) } as const;
const speedChangeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('set'), speedFeet: importedSpeed }),
  z.strictObject({ kind: z.literal('increase'), feet: importedPositiveSpeed }),
  z.strictObject({ kind: z.literal('reduce'), reduction: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('feet'), feet: importedPositiveSpeed }),
    z.strictObject({ kind: z.literal('multiplier'), multiplier: z.number().finite().min(0).max(1) }),
  ]) }),
]);
const teleportOperationSchema = z.strictObject({ kind: z.literal('teleport'), subject: z.enum(['caster', 'targets']), maximumDistanceFeet: importedDistance, destination: z.strictObject({ requireUnoccupied: z.literal(true), requireOccupiable: z.literal(true), requireLineOfSight: z.boolean() }) });
const forcedMovementOperationSchema = z.strictObject({ kind: z.literal('forced_movement'), direction: z.enum(['away', 'toward']), origin: z.enum(['caster', 'selected_point']), distanceFeet: importedPositiveDistance, save: z.union([z.null(), z.strictObject({ ability: z.enum(abilities), rollMode: z.enum(['normal', 'advantage', 'disadvantage']), moveOn: z.literal('failure') })]) });
const movementModeOperationSchema = z.strictObject({ kind: z.literal('movement_mode'), grants: z.array(z.strictObject({ mode: z.enum(['flying', 'climbing', 'swimming']), speed: z.discriminatedUnion('kind', [z.strictObject({ kind: z.literal('fixed'), feet: importedPositiveSpeed }), z.strictObject({ kind: z.literal('walking_speed') })]) })).min(1).max(3), difficultTerrainImmunity: z.boolean(), magicalSpeedReductionImmunity: z.boolean(), ...movementDurationShape });
const movementRegionOperationSchema = z.strictObject({ kind: z.literal('movement_region'), region: z.strictObject({ id: z.string().min(1).max(64), cells: z.array(gridCellSchema).min(1).max(10_000) }), difficultTerrain: z.boolean(), entry: z.enum(['allowed', 'blocked']), damage: z.union([z.null(), z.strictObject({ damageType: z.enum(damageTypes), dice: z.strictObject({ count: positiveInteger.max(MAX_IMPORTED_DICE_COUNT), sides: importedDieSides, modifier: safeInteger.min(-MAX_IMPORTED_SCALAR).max(MAX_IMPORTED_SCALAR) }), unitFeet: z.literal(5), partialUnit: z.literal('completed_units_only') })]) });
const speedModificationOperationSchema = z.strictObject({ kind: z.literal('speed_modification'), modification: speedChangeSchema, ...movementDurationShape });

const damageTypeSchema = z.enum(damageTypes);
const damageTypeOrChoiceSchema = z.union([damageTypeSchema, z.array(damageTypeSchema).min(1).max(damageTypes.length)]);
const basicSchemas = {
  attack_damage: z.strictObject({ kind: z.literal('attack_damage'), attackKind: z.enum(['melee', 'ranged']), damageType: damageTypeOrChoiceSchema, dice: importedOperationDiceSchema, rider: effectDataSchema.nullable() }),
  attack_then_save_damage: z.strictObject({ kind: z.literal('attack_then_save_damage'), attackKind: z.literal('ranged'), attackDamageType: damageTypeSchema, attackDice: importedOperationDiceSchema, saveAbility: z.enum(abilities), saveDamageType: damageTypeSchema, saveDice: importedOperationDiceSchema, onSaveSuccess: z.enum(['none', 'half']), burstShape: z.literal('sphere'), burstRadiusFeet: importedPositiveDistance }),
  attack_damage_over_time: z.strictObject({ kind: z.literal('attack_damage_over_time'), attackKind: z.literal('ranged'), damageType: damageTypeSchema, initialDice: importedOperationDiceSchema, missDamage: z.literal('half_initial'), laterDice: importedOperationDiceSchema, laterTiming: z.literal('target_end') }),
  hit_point_maximum_increase: z.strictObject({ kind: z.literal('hit_point_maximum_increase'), baseAmount: boundedPositive, additionalPerSlot: boundedNonNegative }),
  save_damage: z.strictObject({ kind: z.literal('save_damage'), ability: z.enum(abilities), onSuccess: z.enum(['none', 'half']), damageType: damageTypeSchema, dice: importedOperationDiceSchema, riderOnFailure: effectDataSchema.nullable(), pushFeetOnFailure: importedDistance }),
  save_multi_damage: z.strictObject({ kind: z.literal('save_multi_damage'), ability: z.enum(abilities), onSuccess: z.enum(['none', 'half']), terms: z.array(z.strictObject({ damageType: damageTypeSchema, dice: importedOperationDiceSchema })).min(1).max(20), effect: effectDataSchema.nullable() }),
  save_damage_over_time: z.strictObject({ kind: z.literal('save_damage_over_time'), ability: z.enum(abilities), onSuccess: z.literal('half_initial'), damageType: damageTypeSchema, initialDice: importedOperationDiceSchema, laterDice: importedOperationDiceSchema, laterTiming: z.literal('target_end') }),
  save_damage_and_effect: z.strictObject({ kind: z.literal('save_damage_and_effect'), ability: z.enum(abilities), onSuccess: z.enum(['none', 'half']), damageType: damageTypeSchema, dice: importedOperationDiceSchema, effect: effectDataSchema }),
  healing: z.strictObject({ kind: z.literal('healing'), dice: importedOperationDiceSchema, addSpellcastingModifier: z.boolean() }),
  fixed_healing: z.strictObject({ kind: z.literal('fixed_healing'), baseAmount: boundedPositive, additionalPerSlot: boundedNonNegative, removesConditions: z.array(z.enum(['Blinded', 'Deafened', 'Poisoned'])).max(3) }),
  temporary_hit_points: z.strictObject({ kind: z.literal('temporary_hit_points'), dice: importedOperationDiceSchema }),
  effect: z.strictObject({ kind: z.literal('effect'), effect: effectDataSchema }),
  save_effect: z.strictObject({ kind: z.literal('save_effect'), ability: z.enum(abilities), rollMode: z.enum(['normal', 'advantage', 'disadvantage']), effect: effectDataSchema, excludeCaster: z.literal(true).optional(), willingTargetSkipsSave: z.literal(true).optional() }),
  save_push: z.strictObject({ kind: z.literal('save_push'), ability: z.enum(abilities), pushFeetOnFailure: importedPositiveDistance, effect: effectDataSchema }),
  remove_condition: z.strictObject({ kind: z.literal('remove_condition'), conditions: z.array(z.enum(['Blinded', 'Deafened', 'Paralyzed', 'Poisoned'])).min(1).max(4) }),
  remove_condition_and_effect: z.strictObject({ kind: z.literal('remove_condition_and_effect'), condition: z.literal('Poisoned'), effect: effectDataSchema }),
  save_branch_effect: z.strictObject({ kind: z.literal('save_branch_effect'), ability: z.enum(abilities), successEffect: effectDataSchema, failureEffect: effectDataSchema }),
  attack_rays: z.strictObject({ kind: z.literal('attack_rays'), baseRays: positiveInteger.max(MAX_IMPORTED_DICE_COUNT), additionalPerSlot: nonNegativeInteger.max(MAX_IMPORTED_DICE_COUNT), damageType: damageTypeSchema, dice: importedOperationDiceSchema }),
  attack_beams: z.strictObject({ kind: z.literal('attack_beams'), attackKind: z.literal('ranged'), baseBeams: positiveInteger.max(MAX_IMPORTED_DICE_COUNT), additionalBeamLevels: z.array(positiveInteger.max(MAX_IMPORTED_LEVEL)).max(MAX_IMPORTED_LEVEL), damageType: damageTypeSchema, dice: importedOperationDiceSchema }),
  summoned_weapon_attack: z.strictObject({ kind: z.literal('summoned_weapon_attack'), damageType: damageTypeSchema, dice: importedOperationDiceSchema, addSpellcastingModifier: z.literal(true), attackReachFeet: importedPositiveDistance, moveFeetPerBonusAction: importedDistance, effect: effectDataSchema }),
  reaction_save_cancel: z.strictObject({ kind: z.literal('reaction_save_cancel'), ability: z.enum(abilities), trigger: z.literal('visible_creature_casts_spell_with_components').optional() }),
  dispel_magic: z.strictObject({ kind: z.literal('dispel_magic'), baseAutomaticLevel: nonNegativeInteger.max(9), checkDcBase: nonNegativeInteger.max(100) }),
  revive: z.strictObject({ kind: z.literal('revive'), hitPoints: boundedPositive, maximumDeathAgeRounds: importedRounds }),
  remove_curse: z.strictObject({ kind: z.literal('remove_curse') }),
  lifedrain_attack: z.strictObject({ kind: z.literal('lifedrain_attack'), damageType: damageTypeSchema, dice: importedOperationDiceSchema, healingDivisor: positiveInteger.max(MAX_IMPORTED_SCALAR), effect: effectDataSchema }),
  magic_missiles: z.strictObject({ kind: z.literal('magic_missiles'), baseDarts: positiveInteger.max(MAX_IMPORTED_DICE_COUNT), additionalPerSlot: nonNegativeInteger.max(MAX_IMPORTED_DICE_COUNT), damageType: damageTypeSchema, dice: importedOperationDiceSchema }),
  stabilize: z.strictObject({ kind: z.literal('stabilize') }),
  weapon_attack_augmentation: z.discriminatedUnion('timing', [
    z.strictObject({ kind: z.literal('weapon_attack_augmentation'), timing: z.literal('during_cast'), attackAbility: z.literal('spellcasting'), damageAbility: z.literal('spellcasting'), damageTypeChoice: z.literal('weapon_or_radiant'), extraDamage: z.strictObject({ type: damageTypeSchema, dice: importedOperationDiceSchema }) }),
    z.strictObject({ kind: z.literal('weapon_attack_augmentation'), timing: z.literal('subsequent_weapon_hits'), extraDamage: z.union([z.null(), z.strictObject({ type: damageTypeSchema, dice: importedOperationDiceSchema })]), consumeOnHit: z.boolean(), concentration: z.boolean(), durationRounds: importedRounds, followUp: z.union([z.null(), z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('ongoing_damage_save_ends'), damageType: damageTypeSchema, dice: importedOperationDiceSchema, saveAbility: z.enum(abilities), timing: z.literal('target_start'), durationRounds: importedRounds }),
      z.strictObject({ kind: z.literal('save_then_restrain'), saveAbility: z.enum(abilities), rollMode: z.literal('normal'), damageType: damageTypeSchema, dice: importedOperationDiceSchema, timing: z.literal('target_start'), durationRounds: importedRounds }),
    ])]) }),
  ]),
  utility: z.strictObject({ kind: z.literal('utility'), effect: effectPayloadSchema, concentration: z.boolean(), durationRounds: importedRounds.nullable(), durationRoundsPerSlot: nonNegativeInteger.max(MAX_IMPORTED_ROUNDS).optional(), becomesPermanentAtSlot: positiveInteger.max(9).optional(), losesConcentrationAtSlot: positiveInteger.max(9).optional(), stateful: z.literal(true).optional() }),
} as const;

type OperationSchema = z.ZodType<SpellOperation>;
type NonCompositionOperationSchema = z.ZodType<NonCompositionSpellOperation>;
type BranchOperationSchema = z.ZodType<BranchSpellOperation>;

let nonCompositionOperationSchema: NonCompositionOperationSchema;
let branchOperationSchema: BranchOperationSchema;
let spellOperationSchema: OperationSchema;

function forwardIssues(schema: z.ZodType, value: unknown, context: z.core.$RefinementCtx<unknown>): void {
  const result = schema.safeParse(value);
  if (result.success) return;
  for (const issue of result.error.issues) {
    context.addIssue({ code: 'custom', path: issue.path, message: issue.message });
  }
}

const casterChoiceOperationSchema = z.strictObject({
  kind: z.literal('caster_choice'),
  modes: z.array(z.strictObject({ mode: z.string().regex(/^[a-z][a-z0-9._-]{0,63}$/u), operation: z.lazy(() => branchOperationSchema) })).min(1).max(100),
});
const randomBranchOperationSchema = z.strictObject({
  kind: z.literal('random_branch'), dieSides: importedDieSides,
  branches: z.array(z.strictObject({ minimum: positiveInteger.max(20), maximum: positiveInteger.max(20), operation: z.lazy(() => branchOperationSchema) })).min(1).max(20),
}).superRefine((operation, context) => {
  const faces = new Set<number>();
  for (const [index, branch] of operation.branches.entries()) {
    if (branch.minimum > branch.maximum || branch.maximum > operation.dieSides) {
      context.addIssue({ code: 'custom', path: ['branches', index], message: 'Branch range must fit the declared die.' });
      continue;
    }
    for (let face = branch.minimum; face <= branch.maximum; face += 1) {
      if (faces.has(face)) context.addIssue({ code: 'custom', path: ['branches', index], message: 'Branch ranges cannot overlap.' });
      faces.add(face);
    }
  }
  if (faces.size !== operation.dieSides) context.addIssue({ code: 'custom', path: ['branches'], message: 'Branches must cover every die face.' });
});
const targetBranchOperationSchema = z.strictObject({
  kind: z.literal('target_branch'),
  branches: z.array(z.strictObject({ predicate: z.strictObject({ kind: z.literal('creature_type'), creatureType: z.string().min(1).max(1_000) }), operation: z.lazy(() => branchOperationSchema) })).min(1).max(100),
  otherwise: z.lazy(() => branchOperationSchema).nullable(),
});
const reevaluatedBranchOperationSchema = z.strictObject({ kind: z.literal('reevaluated_branch'), hook: z.enum(['target_start', 'target_end']), durationRounds: importedRounds, operation: z.lazy(() => branchOperationSchema) });

const sustainedTargetingSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('self') }),
  z.strictObject({ kind: z.literal('single'), rangeFeet: importedDistance, willing: z.boolean(), allowDead: z.literal(true).optional(), rangeByCasterLevel: z.array(z.strictObject({ minimumLevel: positiveInteger.max(20), rangeFeet: importedDistance })).optional() }),
  z.strictObject({ kind: z.literal('multiple'), rangeFeet: importedDistance, baseMaximum: positiveInteger.max(MAX_IMPORTED_DICE_COUNT), additionalPerSlot: nonNegativeInteger.max(MAX_IMPORTED_DICE_COUNT), willing: z.boolean().optional() }),
  z.strictObject({ kind: z.literal('area'), rangeFeet: importedDistance, shape: z.enum(['cone', 'cube', 'cylinder', 'emanation', 'line', 'sphere']), baseSizeFeet: importedDistance, sizePerSlotFeet: importedDistance, secondarySizeFeet: importedDistance.optional(), surface: z.literal('ground_square').optional() }),
  z.strictObject({ kind: z.literal('area_selected'), rangeFeet: importedDistance, shape: z.enum(['cone', 'cube', 'cylinder', 'emanation', 'line', 'sphere']), baseSizeFeet: importedDistance, sizePerSlotFeet: importedDistance, secondarySizeFeet: importedDistance.optional(), baseMaximum: positiveInteger.max(MAX_IMPORTED_DICE_COUNT), additionalPerSlot: nonNegativeInteger.max(MAX_IMPORTED_DICE_COUNT) }),
  z.strictObject({ kind: z.literal('all_in_range'), rangeFeet: importedDistance }),
  z.strictObject({ kind: z.literal('remote'), range: z.literal('unlimited') }),
  z.strictObject({ kind: z.literal('utility'), rangeFeet: importedDistance }),
]);
const sustainedActionSchema = z.discriminatedUnion('phrasing', [
  z.strictObject({ phrasing: z.literal('explicit'), actionType: z.enum(['magic_action', 'bonus_action', 'reaction']) }),
  z.strictObject({ phrasing: z.literal('vague_action_on_later_turn'), actionType: z.literal('magic_action') }),
]);
const sustainedEffectOperationSchema = z.strictObject({
  kind: z.literal('sustained_effect'),
  establishment: z.lazy(() => branchOperationSchema).nullable(),
  lifecycle: z.strictObject({ concentration: z.boolean(), durationRounds: importedRounds.nullable(), expiresAt: z.enum(['source_start', 'source_end']) }),
  targetBinding: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('reselect') }),
    z.strictObject({ kind: z.literal('bound'), to: z.enum(['cast_combatant_targets', 'cast_object_targets', 'created_world_objects']) }),
  ]),
  activation: z.strictObject({
    action: sustainedActionSchema,
    targeting: sustainedTargetingSchema,
    operation: z.lazy(() => branchOperationSchema),
  }),
});

const nonCompositionSchemas = {
  caster_choice: casterChoiceOperationSchema,
  random_branch: randomBranchOperationSchema,
  target_branch: targetBranchOperationSchema,
  reevaluated_branch: reevaluatedBranchOperationSchema,
  condition_lifecycle: conditionLifecycleOperationSchema,
  roll_dice_modifier: rollDiceModifierOperationSchema,
  damage_dice_reduction: damageDiceReductionOperationSchema,
  roll_mode_modifier: rollModeModifierOperationSchema,
  armor_class_modifier: armorClassModifierOperationSchema,
  damage_response_modifier: damageResponseModifierOperationSchema,
  targeted_defense_modifier: targetedDefenseModifierOperationSchema,
  heat_metal: heatMetalOperationSchema,
  sustained_effect: sustainedEffectOperationSchema,
  damage_operation: importedDamageOperationSchema,
  armed_weapon_hit_rider: armedWeaponHitRiderSchema,
  persistent_area: persistentAreaOperationSchema,
  world_operations: worldOperationsOperationSchema,
  teleport: teleportOperationSchema,
  forced_movement: forcedMovementOperationSchema,
  movement_mode: movementModeOperationSchema,
  movement_region: movementRegionOperationSchema,
  speed_modification: speedModificationOperationSchema,
  ...basicSchemas,
} as const satisfies Readonly<Record<BranchSpellOperation['kind'], z.ZodType>>;

function operationKind(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const kind = Reflect.get(value, 'kind');
  return typeof kind === 'string' ? kind : null;
}

branchOperationSchema = z.union([
  nonCompositionSchemas.caster_choice,
  nonCompositionSchemas.random_branch,
  ...Object.values(nonCompositionSchemas).slice(2),
]) as unknown as BranchOperationSchema;

const sharedOutcomeDamageReferenceSchema = z.strictObject({
  kind: z.literal('shared_outcome_damage_reference'),
  source: z.strictObject({ branch: z.literal('failure'), operationIndex: nonNegativeInteger.max(31) }),
  transform: z.literal('half_round_down'),
});
const sharedOutcomeAttackSchema = z.strictObject({
  kind: z.literal('shared_outcome'),
  delivery: z.strictObject({ kind: z.literal('attack'), attackKind: z.enum(['melee', 'ranged']) }),
  onHit: z.array(z.lazy(() => branchOperationSchema)).max(32),
  onMiss: z.array(z.lazy(() => branchOperationSchema)).max(32),
});
const sharedOutcomeSaveSchema = z.strictObject({
  kind: z.literal('shared_outcome'),
  delivery: z.strictObject({
    kind: z.literal('save'), ability: z.enum(abilities),
    rollMode: z.enum(['normal', 'advantage', 'disadvantage']),
  }),
  onFailure: z.array(z.lazy(() => branchOperationSchema)).max(32),
  onSuccess: z.array(z.union([
    z.lazy(() => branchOperationSchema),
    sharedOutcomeDamageReferenceSchema,
  ])).max(32),
}).superRefine((operation, context) => {
  for (const [index, branchOperation] of operation.onSuccess.entries()) {
    if (branchOperation.kind !== 'shared_outcome_damage_reference') continue;
    const referenced = operation.onFailure[branchOperation.source.operationIndex];
    if (
      referenced?.kind !== 'damage_operation' ||
      referenced.delivery.kind !== 'automatic' ||
      referenced.timing.kind !== 'immediate' ||
      referenced.instancesPerTarget !== 1 ||
      referenced.packets.length !== 1 ||
      referenced.packets[0]?.thresholdRider !== null
    ) {
      context.addIssue({
        code: 'custom', path: ['onSuccess', index, 'source', 'operationIndex'],
        message: 'A shared damage reference must identify one immediate automatic single-packet failure damage operation without a threshold rider.',
      });
    }
  }
});
const sharedOutcomeOperationSchema = z.union([sharedOutcomeAttackSchema, sharedOutcomeSaveSchema]);

nonCompositionOperationSchema = branchOperationSchema as NonCompositionOperationSchema;

const compositionTargetResolutionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('inherit') }),
  z.strictObject({ kind: z.literal('re_resolve'), selector: z.discriminatedUnion('kind', [z.strictObject({ kind: z.literal('caster') }), z.strictObject({ kind: z.literal('enclosing_area') })]) }),
]);
const compositionStepSchema: z.ZodType<CompositionStep> = z.strictObject({
  targetResolution: compositionTargetResolutionSchema,
  operation: z.lazy(() => spellOperationSchema),
});
const compositionOperationSchema: z.ZodType<CompositionOperation> = z.discriminatedUnion('ordering', [
  z.strictObject({ kind: z.literal('composition'), onRefusal: z.enum(['abort', 'continue']), steps: z.tuple([compositionStepSchema, compositionStepSchema]), ordering: z.literal('declaration_order') }),
  z.strictObject({ kind: z.literal('composition'), onRefusal: z.enum(['abort', 'continue']), steps: z.tuple([compositionStepSchema, compositionStepSchema]), ordering: z.literal('explicit'), order: z.union([z.tuple([z.literal(0), z.literal(1)]), z.tuple([z.literal(1), z.literal(0)])]) }),
]);

export const operationSchemas = {
  composition: compositionOperationSchema,
  shared_outcome: sharedOutcomeOperationSchema,
  ...nonCompositionSchemas,
} as const satisfies Readonly<Record<SpellOperation['kind'], z.ZodType>>;

spellOperationSchema = z.union([
  operationSchemas.composition,
  operationSchemas.shared_outcome,
  operationSchemas.caster_choice,
  ...Object.values(operationSchemas).slice(3),
]).transform((value) => value as SpellOperation);

export const contentPackOperationJsonSchema = spellOperationSchema;

export const contentPackOperationSchema: OperationSchema = z.unknown().superRefine((value, context) => {
  const kind = operationKind(value);
  if (kind === null || !(kind in operationSchemas)) {
    context.addIssue({ code: 'custom', path: ['kind'], message: `Unknown spell operation kind ${kind ?? '<missing>'}.` });
    return;
  }
  forwardIssues(operationSchemas[kind as keyof typeof operationSchemas], value, context);
}).transform((value) => value as SpellOperation);
