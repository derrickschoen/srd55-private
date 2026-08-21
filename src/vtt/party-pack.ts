import { z } from 'zod';
import type { CombatantProfile } from '../combat/combatant';
import { conditionNames, type ConditionName } from '../combat/conditions';
import {
  type CombatFeatureEffect,
  type EffectApplication,
} from '../combat/effects';
import type { EncounterCommand } from '../combat/events';
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
  type DamageType,
  type DieSides,
  type EncounterEffectId,
} from '../combat/values';
import { abilities, damageTypes, skills, type Ability, type Skill } from '../domain/enums';
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

const startingConditionSchema = z.strictObject({
  effectId: effectIdSchema,
  conditionId: z.enum(conditionNames),
});

const resourcePoolSchema = z.strictObject({
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

const FEATURE_EFFECT_KINDS = [
  'damage_rider',
  'attack_roll_modifier',
  'attack_roll_mode',
  'armor_class_modifier',
  'saving_throw_modifier',
  'skill_modifier',
  'temporary_hit_points',
  'condition_application',
  'exhaustion_application',
  'movement_modifier',
] as const;

const featureEffectSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...featureEffectBaseShape,
    kind: z.literal('damage_rider'),
    trigger: damageRiderTriggerSchema,
    damage: z.array(effectDamageSchema).min(1).max(20),
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
]).superRefine((effect, context) => {
  if (effect.trigger === 'always_on' && effect.resourcePoolId !== undefined) {
    context.addIssue({ code: 'custom', message: 'Always-on effects cannot spend a limited resource.' });
  }
});

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
  resourceSpellUses: z.array(resourceSpellUseSchema).max(SPELL_MANIFEST.length).optional(),
} as const;

const spellcastingSourceInputSchema = z.strictObject(spellcastingSourceInputShape);

const legacySpellcastingInputSchema = z.strictObject({
  ...spellcastingSourceInputShape,
  spellSlots: z.array(v2SpellSlotSchema).max(9),
});

const v2MemberCoreSchema = z.strictObject(memberBaseShape);

const v2MemberSchema = z.strictObject({
  ...memberBaseShape,
  ...memberSharedShape,
  spellcasting: z.union([
    legacySpellcastingSchema,
    z.array(spellcastingSourceSchema).min(1).max(4),
  ]).optional(),
  sharedSpellSlots: z.array(v2SpellSlotSchema).max(9).optional(),
  pactSpellSlots: z.array(pactSpellSlotSchema).max(9).optional(),
  effects: z.array(featureEffectSchema).max(100).optional(),
  resources: z.array(resourcePoolSchema).max(100).optional(),
  passives: passivesSchema.optional(),
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
export type ExternalPartyPackEffect = z.infer<typeof featureEffectSchema>;
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
  'spellcasting',
  'sharedSpellSlots',
  'pactSpellSlots',
  'effects',
  'resources',
  'passives',
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
  'resourceSpellUses',
]);
const LEGACY_SPELLCASTING_FIELDS = new Set([
  ...SPELLCASTING_SOURCE_FIELDS,
  'spellSlots',
]);
const RESOURCE_SPELL_USE_FIELDS = new Set(['spellId', 'resourcePoolId']);
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

function loadedFeatureEffect(effect: ExternalPartyPackEffect): CombatFeatureEffect {
  const common = {
    id: encounterEffectId(effect.effectId),
    trigger: effect.trigger,
    resourcePoolId: effect.resourcePoolId === undefined
      ? null
      : limitedResourcePoolId(effect.resourcePoolId),
  } as const;
  switch (effect.kind) {
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
    case 'attack_roll_modifier':
      return { ...common, payload: { kind: 'attack_roll_modifier', count: effect.count, sides: effect.sides, sign: effect.sign } };
    case 'attack_roll_mode':
      return { ...common, payload: { kind: 'attack_roll_mode_modifier', mode: effect.mode, appliesTo: 'next_attack_against_target' } };
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
  }
}

type ExternalPartyPackV2Member = ExternalPartyPackV2['members'][number];

function v2MemberExtensions(member: ExternalPartyPackMember): {
  readonly effects: readonly ExternalPartyPackEffect[];
  readonly resources: readonly z.infer<typeof resourcePoolSchema>[];
  readonly passives: z.infer<typeof passivesSchema> | null;
} {
  if (!Object.hasOwn(member, 'effects') && !Object.hasOwn(member, 'resources') && !Object.hasOwn(member, 'passives')) {
    return { effects: [], resources: [], passives: null };
  }
  const v2Member = member as ExternalPartyPackV2Member;
  return {
    effects: v2Member.effects ?? [],
    resources: v2Member.resources ?? [],
    passives: v2Member.passives ?? null,
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
  const effects = extensions.effects.map(loadedFeatureEffect);
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

/** Builds a standard weapon attack; on-hit/on-crit feature riders stay reducer-owned. */
export function loadedPartyAttackCommand(
  member: LoadedPartyMember,
  attackId: string,
  target: Extract<EncounterCommand, { readonly type: 'attack' }>['target'],
): Extract<EncounterCommand, { readonly type: 'attack' }> {
  const attack = member.attacks.find((candidate) => candidate.attackId === attackId);
  if (attack === undefined) throw new PartyAttackError();
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
  };
}

/** Activates an action-economy feature through existing effect/temp-HP commands. */
export function loadedPartyEffectCommand(
  member: LoadedPartyMember,
  effectId: string,
  targets: readonly Extract<EncounterCommand, { readonly type: 'apply_effect' }>['effect']['targets'][number][],
): Extract<EncounterCommand, { readonly type: 'apply_effect' | 'grant_temporary_hit_points' }> {
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

export type LoadedPartySpellCastDetails = Pick<
  SpellCastCommand,
  | 'slotLevel'
  | 'castAsRitual'
  | 'targets'
  | 'area'
  | 'weaponAttack'
  | 'selectedOption'
> & { readonly resourcePoolId?: string };

/** Builds the existing resolver command exclusively from a v2 member's referenced spell vocabulary. */
export function loadedPartySpellCastCommand(
  member: LoadedPartyMember,
  spellId: string,
  details: LoadedPartySpellCastDetails,
): SpellCastCommand {
  if (member.spellcasting.length === 0) throw new PartySpellcastingError('spellcasting_unavailable');
  const matchingSources = member.spellcasting.filter((source) =>
    source.preparedSpells.some((spell) => spell.id === spellId) ||
    source.knownSpells.some((spell) => spell.id === spellId));
  if (matchingSources.length === 0 || !member.spells.some((spell) => spell.id === spellId)) {
    throw new PartySpellcastingError('spell_not_referenced');
  }
  if (matchingSources.length > 1) throw new PartySpellcastingError('ambiguous_spell_source');
  const spellcasting = matchingSources[0];
  if (spellcasting === undefined) throw new PartySpellcastingError('spell_not_referenced');
  const resourceUse = details.resourcePoolId === undefined
    ? undefined
    : spellcasting.resourceSpellUses.find((use) =>
      use.spellId === spellId && use.resourcePoolId === details.resourcePoolId);
  if (details.resourcePoolId !== undefined && resourceUse === undefined) {
    throw new RangeError(
      `Spell ${spellId} is not declared for loaded resource pool ${details.resourcePoolId}.`,
    );
  }
  return {
    type: 'cast_spell',
    actor: member.profile.id,
    spellId,
    casterLevel: spellcasting.casterLevel,
    attackBonus: spellcasting.spellAttackBonus,
    saveDc: spellcasting.spellSaveDc,
    spellcastingModifier: spellcasting.spellcastingModifier,
    slotLevel: details.slotLevel,
    castAsRitual: details.castAsRitual,
    targets: details.targets,
    area: details.area,
    weaponAttack: details.weaponAttack,
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
      : v2MemberCoreSchema.safeParse(parsedBase(memberInput, entry, index, gaps));
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
    const resources: z.infer<typeof resourcePoolSchema>[] = [];
    let passives: z.infer<typeof passivesSchema> | undefined;
    if (header.data.schemaVersion === 2) {
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
          const parsed = featureEffectSchema.safeParse(effectValue);
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
          const parsed = resourcePoolSchema.safeParse(resourceValue);
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
      effects = effects.filter((effect, effectIndex) => {
        const valid = effect.resourcePoolId === undefined || resourceIds.has(effect.resourcePoolId);
        if (!valid) {
          gaps.push(issueGap(
            entry,
            ['members', index, 'effects', effectIndex, 'resourcePoolId'],
            'value_not_in_engine_vocabulary',
          ));
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
