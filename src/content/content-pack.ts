import { z } from 'zod';
import type { CombatantProfile } from '../combat/combatant';
import { monsterCombatantProfile } from '../combat/combatant';
import type { CombatFeatureEffect } from '../combat/effects';
import { conditionNames } from '../combat/conditions';
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
import { abilities, creatureSizes, damageTypes, skills, type Ability, type Skill } from '../domain/enums';
import {
  FEATURE_EFFECT_KINDS,
  externalPartyPackFeatureEffectSchema,
  externalPartyPackResourceSchema,
  loadedFeatureEffect,
  type ExternalPartyPackEffect,
  type ExternalPartyPackResource,
} from '../vtt/party-pack';
import {
  contentPackOperationSchema,
  contentPackOperationJsonSchema,
  MAX_IMPORTED_DICE_COUNT,
  MAX_IMPORTED_DISTANCE_FEET,
  MAX_IMPORTED_LEVEL,
  MAX_IMPORTED_ROUNDS,
  MAX_IMPORTED_SPEED_FEET,
} from './content-pack-operation-schema';

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

const namespaceDeclarationSchema = z.array(identifier).max(1_000)
  .refine((namespaces) => new Set(namespaces).size === namespaces.length, {
    message: 'Manifest namespace declarations must be unique.',
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

/*
 * Every operation kind is dispatched to a concrete value schema in
 * content-pack-operation-schema.ts. Keep object inspection here only for
 * typed diagnostic classification before the record schema runs.
 */
function objectRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function operationKind(value: unknown): string | null {
  const operation = objectRecord(value);
  return operation !== null && typeof operation.kind === 'string' ? operation.kind : null;
}

const operationSchema = contentPackOperationSchema;

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
const publishedSpellSchema = spellSchema.extend({ operation: contentPackOperationJsonSchema });

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
  speedFeet: nonNegativeInteger.max(MAX_IMPORTED_SPEED_FEET),
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

const monsterDiceSchema = z.strictObject({
  count: positiveInteger.max(MAX_IMPORTED_DICE_COUNT),
  sides: z.union([z.literal(4), z.literal(6), z.literal(8), z.literal(10), z.literal(12), z.literal(20)]),
  modifier: safeInteger.min(-1_000_000).max(1_000_000),
});
const monsterDamageTriggerSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('always') }),
  z.strictObject({ kind: z.literal('attack_roll_advantage') }),
  z.strictObject({
    kind: z.literal('charge'),
    minimumStraightFeet: positiveInteger.max(MAX_IMPORTED_DISTANCE_FEET),
    maximumTargetSize: z.enum(creatureSizes),
  }),
]);
const monsterDamageTermSchema = z.strictObject({
  average: nonNegativeInteger.max(1_000_000),
  dice: monsterDiceSchema,
  type: z.enum(damageTypes),
  trigger: monsterDamageTriggerSchema,
});
const decodedDistanceSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('present'), value: positiveInteger.max(MAX_IMPORTED_DISTANCE_FEET) }),
  z.strictObject({ kind: z.literal('absent'), note: trimmedText }),
]);
const monsterDeliverySchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('melee'), reachFeet: positiveInteger.max(MAX_IMPORTED_DISTANCE_FEET) }),
  z.strictObject({ kind: z.literal('ranged'), rangeFeet: positiveInteger.max(MAX_IMPORTED_DISTANCE_FEET), longRangeFeet: decodedDistanceSchema }),
  z.strictObject({ kind: z.literal('melee_or_ranged'), reachFeet: positiveInteger.max(MAX_IMPORTED_DISTANCE_FEET), rangeFeet: positiveInteger.max(MAX_IMPORTED_DISTANCE_FEET), longRangeFeet: positiveInteger.max(MAX_IMPORTED_DISTANCE_FEET) }),
]);
const monsterSavingThrowSchema = z.strictObject({
  ability: z.enum(abilities),
  dc: positiveInteger.max(100),
});
const monsterEffectTargetSchema = z.strictObject({
  maximumSize: z.enum(creatureSizes).nullable(),
  excludedKinds: z.array(z.enum(['Undead', 'Elf'])).max(2),
});
const monsterOnHitEffectSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('condition'),
    condition: z.enum(['Frightened', 'Grappled', 'Paralyzed', 'Prone']),
    trigger: monsterDamageTriggerSchema,
    target: monsterEffectTargetSchema,
    savingThrow: monsterSavingThrowSchema.nullable(),
    escapeDc: positiveInteger.max(100).nullable(),
    duration: z.enum(['until_escape', 'until_end_of_target_next_turn', 'until_start_of_monster_next_turn']).nullable(),
  }),
  z.strictObject({ kind: z.literal('hit_point_maximum_reduction'), amount: z.literal('damage_taken') }),
  z.strictObject({ kind: z.literal('raises_as_zombie'), targetKind: z.literal('Humanoid'), delayHours: z.literal(24), controllerLimit: z.literal(12), preventedBy: z.tuple([z.literal('restored_to_life'), z.literal('body_destroyed')]) }),
]);
const decodedCombatNumberSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('present'), value: safeInteger.min(-100).max(100) }),
  z.strictObject({ kind: z.literal('absent'), note: trimmedText }),
]);
const monsterSpellReferenceSchema = z.strictObject({
  id: recordIdentifier,
  availability: z.enum(['at_will', '1_per_day', '3_per_day']),
  manifestStatus: z.enum(['implemented', 'pending']),
});
const monsterActionSchema: z.ZodType<MonsterAction> = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('attack'), id: trimmedText, name: trimmedText,
    attackBonus: safeInteger.min(-100).max(100), delivery: monsterDeliverySchema,
    damage: z.array(monsterDamageTermSchema).min(1).max(20),
    attackRollAdvantage: z.union([z.null(), z.strictObject({ kind: z.literal('target_grappled_by_attacker') })]),
    onHit: z.array(monsterOnHitEffectSchema).max(20),
  }),
  z.strictObject({
    kind: z.literal('multiattack'), id: trimmedText,
    count: positiveInteger.max(MAX_IMPORTED_DICE_COUNT),
    actionIds: z.array(trimmedText).min(1).max(MAX_IMPORTED_DICE_COUNT),
    combination: z.enum(['any', 'fixed', 'one_attack_may_be_replaced']),
  }),
  z.strictObject({
    kind: z.literal('saving_throw'), id: trimmedText, name: trimmedText,
    savingThrow: monsterSavingThrowSchema,
    target: monsterEffectTargetSchema.extend({ rangeFeet: positiveInteger.max(MAX_IMPORTED_DISTANCE_FEET) }),
    failure: z.strictObject({ damage: z.array(monsterDamageTermSchema).max(20), effects: z.array(monsterOnHitEffectSchema).max(20) }),
    success: z.strictObject({ kind: z.literal('none') }),
  }),
  z.strictObject({
    kind: z.literal('spellcasting'), id: trimmedText,
    actionEconomy: z.enum(['action', 'bonus_action']), ability: z.enum(abilities),
    saveDc: decodedCombatNumberSchema, spellAttackBonus: decodedCombatNumberSchema,
    spells: z.array(monsterSpellReferenceSchema).min(1).max(100),
  }),
]);

const savingThrowBonusesShape = Object.fromEntries(
  abilities.map((ability) => [ability, safeInteger.min(-30).max(30)]),
) as Record<Ability, z.ZodNumber>;
const monsterSchema = z.strictObject({
  ...recordIdentityShape,
  statblock: z.strictObject({
    creatureType: trimmedText.optional(),
    armorClass: positiveInteger.max(100),
    hitPointMaximum: positiveInteger.max(1_000_000),
    speedFeet: nonNegativeInteger.max(MAX_IMPORTED_SPEED_FEET),
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
  namespaces: namespaceDeclarationSchema,
  spells: z.array(spellSchema).max(10_000),
  features: z.array(featureSchema).max(10_000),
  species: z.array(speciesSchema).max(10_000),
  backgrounds: z.array(backgroundSchema).max(10_000),
  subclasses: z.array(subclassSchema).max(10_000),
  monsters: z.array(monsterSchema).max(10_000),
});

/** Serialization-only twin used to generate the public JSON Schema without Zod transform erasure. */
export const publishedContentPackV1Schema = contentPackV1Schema.extend({
  spells: z.array(publishedSpellSchema).max(10_000),
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
  readonly diagnostics: readonly ContentPackRecordDiagnostic[];
  readonly spells: readonly LoadedContentSpell[];
  readonly features: readonly LoadedContentFeature[];
  readonly species: readonly LoadedContentOrigin[];
  readonly backgrounds: readonly LoadedContentOrigin[];
  readonly subclasses: readonly LoadedContentSubclass[];
  readonly monsters: readonly LoadedContentMonster[];
}

export type ContentPackRecordSurface = 'spells' | 'features' | 'species' | 'backgrounds' | 'subclasses' | 'monsters';

export type ContentPackRecordDiagnostic = {
  readonly kind: 'content_pack_record_rejection';
  readonly surface: ContentPackRecordSurface;
  readonly index: number;
  readonly recordId: string;
  readonly path: readonly PropertyKey[];
  readonly operationKind?: string;
} & (
  | { readonly reason: 'malformed_record' }
  | { readonly reason: 'unknown_operation_kind'; readonly unknownOperationKind: string }
  | { readonly reason: 'nested_composition' }
  | { readonly reason: 'unknown_effect_variant'; readonly effectKind: string }
  | { readonly reason: 'undeclared_namespace'; readonly namespace: string }
  | { readonly reason: 'missing_feature_reference'; readonly featureId: string }
);

export type ContentPackRefusal =
  | { readonly kind: 'content_pack_refusal'; readonly reason: 'invalid_json' }
  | { readonly kind: 'content_pack_refusal'; readonly reason: 'version_mismatch'; readonly receivedVersion: unknown }
  | { readonly kind: 'content_pack_refusal'; readonly reason: 'missing_provenance' }
  | { readonly kind: 'content_pack_refusal'; readonly reason: 'unknown_operation_kind'; readonly operationKind: string }
  | { readonly kind: 'content_pack_refusal'; readonly reason: 'nested_composition' }
  | { readonly kind: 'content_pack_refusal'; readonly reason: 'unknown_effect_variant'; readonly effectKind: string }
  | { readonly kind: 'content_pack_refusal'; readonly reason: 'malformed_record'; readonly path: readonly PropertyKey[] }
  | { readonly kind: 'content_pack_refusal'; readonly reason: 'id_collision'; readonly id: string };

export type ContentPackLoadResult =
  | { readonly status: 'loaded'; readonly content: LoadedContentPack }
  | { readonly status: 'refused'; readonly refusal: ContentPackRefusal };

const contentPackEnvelopeSchema = z.strictObject({
  schemaVersion: z.literal(CONTENT_PACK_SCHEMA_VERSION),
  packId: identifier,
  provenance: provenanceSchema,
  namespaces: namespaceDeclarationSchema,
  spells: z.array(z.unknown()).max(10_000),
  features: z.array(z.unknown()).max(10_000),
  species: z.array(z.unknown()).max(10_000),
  backgrounds: z.array(z.unknown()).max(10_000),
  subclasses: z.array(z.unknown()).max(10_000),
  monsters: z.array(z.unknown()).max(10_000),
});

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

function nestedOperationValues(operation: Readonly<Record<string, unknown>>): readonly unknown[] {
  if (operation.kind === 'composition' && Array.isArray(operation.steps)) {
    return operation.steps.flatMap((value) => {
      const step = objectRecord(value);
      return step === null ? [] : [step.operation];
    });
  }
  if (operation.kind === 'caster_choice' && Array.isArray(operation.modes)) {
    return operation.modes.flatMap((value) => {
      const mode = objectRecord(value);
      return mode === null ? [] : [mode.operation];
    });
  }
  if (operation.kind === 'random_branch' && Array.isArray(operation.branches)) {
    return operation.branches.flatMap((value) => {
      const branch = objectRecord(value);
      return branch === null ? [] : [branch.operation];
    });
  }
  if (operation.kind === 'target_branch' && Array.isArray(operation.branches)) {
    return [
      ...operation.branches.flatMap((value) => {
        const branch = objectRecord(value);
        return branch === null ? [] : [branch.operation];
      }),
      ...(operation.otherwise === null || operation.otherwise === undefined ? [] : [operation.otherwise]),
    ];
  }
  if (operation.kind === 'shared_outcome') {
    const branchKeys = operation.delivery !== null && typeof operation.delivery === 'object' &&
      Reflect.get(operation.delivery, 'kind') === 'attack'
      ? ['onHit', 'onMiss'] as const
      : ['onFailure', 'onSuccess'] as const;
    return branchKeys.flatMap((key) => Array.isArray(operation[key]) ? operation[key] : []);
  }
  return operation.kind === 'reevaluated_branch' ? [operation.operation] : [];
}

function firstUnknownOperation(value: Readonly<Record<string, unknown>>): string | null {
  if (!Array.isArray(value.spells)) return null;
  for (const spellValue of value.spells) {
    const spell = objectRecord(spellValue);
    const pending: unknown[] = [spell?.operation];
    while (pending.length > 0) {
      const candidate = objectRecord(pending.pop());
      const kind = operationKind(candidate);
      if (
        kind !== null &&
        kind !== 'shared_outcome_damage_reference' &&
        !SPELL_OPERATION_KINDS.includes(kind as SpellOperation['kind'])
      ) return kind;
      if (candidate !== null) pending.push(...nestedOperationValues(candidate));
    }
  }
  return null;
}

function hasNestedComposition(value: Readonly<Record<string, unknown>>): boolean {
  if (!Array.isArray(value.spells)) return false;
  const pending: Array<{ readonly value: unknown; readonly root: boolean }> = value.spells.flatMap((spellValue) => {
    const spell = objectRecord(spellValue);
    return spell === null ? [] : [{ value: spell.operation, root: true }];
  });
  while (pending.length > 0) {
    const frame = pending.pop();
    if (frame === undefined) break;
    const operation = objectRecord(frame.value);
    if (operation === null) continue;
    if (!frame.root && operation.kind === 'composition') return true;
    for (const nested of nestedOperationValues(operation)) pending.push({ value: nested, root: false });
  }
  return false;
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
  const envelope = contentPackEnvelopeSchema.safeParse(value);
  if (!envelope.success) {
    return {
      status: 'refused',
      refusal: {
        kind: 'content_pack_refusal',
        reason: 'malformed_record',
        path: envelope.error.issues[0]?.path ?? [],
      },
    };
  }

  const diagnostics: ContentPackRecordDiagnostic[] = [];
  const declaredNamespaces = new Set(envelope.data.namespaces);
  const rawRecordId = (record: unknown): string => {
    const id = objectRecord(record)?.recordId;
    return typeof id === 'string' ? id : '<unknown>';
  };
  const namespaceDiagnostic = (
    surface: ContentPackRecordSurface,
    index: number,
    sourceId: string,
    recordId: string,
  ): ContentPackRecordDiagnostic | null => declaredNamespaces.has(sourceId) ? null : {
    kind: 'content_pack_record_rejection',
    reason: 'undeclared_namespace',
    surface,
    index,
    recordId,
    namespace: sourceId,
    path: [surface, index, 'sourceId'],
  };
  const malformedDiagnostic = (
    surface: ContentPackRecordSurface,
    index: number,
    record: unknown,
    path: readonly PropertyKey[],
  ): ContentPackRecordDiagnostic => {
    const operation = objectRecord(objectRecord(record)?.operation);
    const kind = operationKind(operation);
    return {
      kind: 'content_pack_record_rejection',
      reason: 'malformed_record',
      surface,
      index,
      recordId: rawRecordId(record),
      ...(kind === null ? {} : { operationKind: kind }),
      path: [surface, index, ...path],
    };
  };

  const spells: ContentPackV1['spells'][number][] = [];
  for (const [index, record] of envelope.data.spells.entries()) {
    const diagnosticRoot = { spells: [record] };
    const unknownOperation = firstUnknownOperation(diagnosticRoot);
    const operation = objectRecord(objectRecord(record)?.operation);
    const kind = operationKind(operation);
    if (unknownOperation !== null) {
      diagnostics.push({
        kind: 'content_pack_record_rejection', reason: 'unknown_operation_kind',
        surface: 'spells', index, recordId: rawRecordId(record),
        operationKind: unknownOperation, unknownOperationKind: unknownOperation,
        path: ['spells', index, 'operation', 'kind'],
      });
      continue;
    }
    if (hasNestedComposition(diagnosticRoot)) {
      diagnostics.push({
        kind: 'content_pack_record_rejection', reason: 'nested_composition',
        surface: 'spells', index, recordId: rawRecordId(record),
        ...(kind === null ? {} : { operationKind: kind }),
        path: ['spells', index, 'operation'],
      });
      continue;
    }
    const parsed = spellSchema.safeParse(record);
    if (!parsed.success) {
      diagnostics.push(malformedDiagnostic('spells', index, record, parsed.error.issues[0]?.path ?? []));
      continue;
    }
    const namespace = namespaceDiagnostic('spells', index, parsed.data.sourceId, parsed.data.recordId);
    if (namespace !== null) diagnostics.push(namespace);
    else spells.push(parsed.data);
  }

  const features: ContentPackV1['features'][number][] = [];
  for (const [index, record] of envelope.data.features.entries()) {
    const unknownEffect = firstUnknownEffect({ features: [record] });
    if (unknownEffect !== null) {
      diagnostics.push({
        kind: 'content_pack_record_rejection', reason: 'unknown_effect_variant',
        surface: 'features', index, recordId: rawRecordId(record), effectKind: unknownEffect,
        path: ['features', index, 'effects', 'kind'],
      });
      continue;
    }
    const parsed = featureSchema.safeParse(record);
    if (!parsed.success) {
      diagnostics.push(malformedDiagnostic('features', index, record, parsed.error.issues[0]?.path ?? []));
      continue;
    }
    const namespace = namespaceDiagnostic('features', index, parsed.data.sourceId, parsed.data.recordId);
    if (namespace !== null) diagnostics.push(namespace);
    else features.push(parsed.data);
  }

  const species: ContentPackV1['species'][number][] = [];
  for (const [index, record] of envelope.data.species.entries()) {
    const parsed = speciesSchema.safeParse(record);
    if (!parsed.success) diagnostics.push(malformedDiagnostic('species', index, record, parsed.error.issues[0]?.path ?? []));
    else {
      const namespace = namespaceDiagnostic('species', index, parsed.data.sourceId, parsed.data.recordId);
      if (namespace !== null) diagnostics.push(namespace);
      else species.push(parsed.data);
    }
  }
  const backgrounds: ContentPackV1['backgrounds'][number][] = [];
  for (const [index, record] of envelope.data.backgrounds.entries()) {
    const parsed = backgroundSchema.safeParse(record);
    if (!parsed.success) diagnostics.push(malformedDiagnostic('backgrounds', index, record, parsed.error.issues[0]?.path ?? []));
    else {
      const namespace = namespaceDiagnostic('backgrounds', index, parsed.data.sourceId, parsed.data.recordId);
      if (namespace !== null) diagnostics.push(namespace);
      else backgrounds.push(parsed.data);
    }
  }
  const subclassesBeforeReferences: ContentPackV1['subclasses'][number][] = [];
  for (const [index, record] of envelope.data.subclasses.entries()) {
    const parsed = subclassSchema.safeParse(record);
    if (!parsed.success) diagnostics.push(malformedDiagnostic('subclasses', index, record, parsed.error.issues[0]?.path ?? []));
    else {
      const namespace = namespaceDiagnostic('subclasses', index, parsed.data.sourceId, parsed.data.recordId);
      if (namespace !== null) diagnostics.push(namespace);
      else subclassesBeforeReferences.push(parsed.data);
    }
  }
  const monsters: ContentPackV1['monsters'][number][] = [];
  for (const [index, record] of envelope.data.monsters.entries()) {
    const parsed = monsterSchema.safeParse(record);
    if (!parsed.success) diagnostics.push(malformedDiagnostic('monsters', index, record, parsed.error.issues[0]?.path ?? []));
    else {
      const namespace = namespaceDiagnostic('monsters', index, parsed.data.sourceId, parsed.data.recordId);
      if (namespace !== null) diagnostics.push(namespace);
      else monsters.push(parsed.data);
    }
  }

  const featureIds = new Set(features.map((feature) => importedContentId(feature.sourceId, feature.recordId)));
  const subclasses: ContentPackV1['subclasses'][number][] = [];
  for (const subclass of subclassesBeforeReferences) {
    const missingFeature = subclass.featureSets.flatMap((set) => set.featureIds)
      .map((id) => id.includes(':') ? id : importedContentId(subclass.sourceId, id))
      .find((id) => !featureIds.has(id));
    if (missingFeature === undefined) subclasses.push(subclass);
    else diagnostics.push({
      kind: 'content_pack_record_rejection', reason: 'missing_feature_reference',
      surface: 'subclasses', index: envelope.data.subclasses.findIndex((record) => rawRecordId(record) === subclass.recordId),
      recordId: subclass.recordId, featureId: missingFeature,
      path: ['subclasses', 'featureSets', missingFeature],
    });
  }

  const pack: ContentPackV1 = {
    schemaVersion: CONTENT_PACK_SCHEMA_VERSION,
    packId: envelope.data.packId,
    provenance: envelope.data.provenance,
    namespaces: envelope.data.namespaces,
    spells, features, species, backgrounds, subclasses, monsters,
  };
  const ids = allRecords(pack).map((entry) => importedContentId(entry.sourceId, entry.recordId));
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
    const loadedSubclasses = pack.subclasses.map((subclass) => ({
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
    return {
      status: 'loaded',
      content: {
        pack,
        provenance: pack.provenance,
        diagnostics,
        spells: pack.spells.map((spell) => loadSpell(spell, pack.provenance)),
        features: pack.features.map(loadFeature),
        species: pack.species.map((species) => ({
          id: importedContentId(species.sourceId, species.recordId),
          sourceId: species.sourceId,
          recordId: species.recordId,
          name: species.name,
          grants: species.grants,
        })),
        backgrounds: pack.backgrounds.map((background) => ({
          id: importedContentId(background.sourceId, background.recordId),
          sourceId: background.sourceId,
          recordId: background.recordId,
          name: background.name,
          grants: background.grants,
        })),
        subclasses: loadedSubclasses,
        monsters: pack.monsters.map(loadMonster),
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
