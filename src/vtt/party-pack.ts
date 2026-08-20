import { z } from 'zod';
import type { CombatantProfile } from '../combat/combatant';
import { conditionNames, type ConditionName } from '../combat/conditions';
import { SPELL_MANIFEST, type SpellManifestRow } from '../combat/spells/manifest';
import {
  armorClass,
  combatantId,
  damageType,
  dieSides,
  encounterEffectId,
  feet,
  tokenId,
  type DamageType,
  type DieSides,
  type EncounterEffectId,
} from '../combat/values';
import { abilities, damageTypes, type Ability } from '../domain/enums';
import { SRD_CLASS_NAMES } from '../rules/class-traits-srd';
import {
  createGapReport,
  deduplicateGapReports,
  type GapReport,
} from './srd-gap-report';

export const EXTERNAL_PARTY_PACK_SCHEMA_VERSION = 1 as const;

const partyIdSchema = z.string().regex(/^party:[a-z0-9][a-z0-9-]{0,79}$/u);
const combatantIdSchema = z.string().regex(/^combatant:[a-z0-9][a-z0-9-]{0,79}$/u);
const tokenIdSchema = z.string().regex(/^token:[a-z0-9][a-z0-9-]{0,79}$/u);
const effectIdSchema = z.string().regex(/^effect:[a-z0-9][a-z0-9:-]{0,119}$/u);
const attackIdSchema = z.string().regex(/^attack:[a-z0-9][a-z0-9-]{0,79}$/u);
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

const startingConditionSchema = z.strictObject({
  effectId: effectIdSchema,
  conditionId: z.enum(conditionNames),
});

const manifestSpellIdSchema = z.string().refine(
  (id) => SPELL_MANIFEST.some((spell) => spell.id === id),
  'Spell selection must use a manifest spell id.',
);

const memberCoreSchema = z.strictObject({
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
  spellSlots: z.array(spellSlotSchema).max(9),
});

const memberSchema = memberCoreSchema.extend({
  attacks: z.array(attackSchema).max(100),
  spellSelections: z.array(manifestSpellIdSchema).max(SPELL_MANIFEST.length),
  startingConditions: z.array(startingConditionSchema).max(100),
}).strict();

export const externalPartyPackSchema = z.strictObject({
  schemaVersion: z.literal(EXTERNAL_PARTY_PACK_SCHEMA_VERSION),
  partyId: partyIdSchema,
  allowPartial: z.boolean(),
  members: z.array(memberSchema).min(3).max(5),
});

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
export type ExternalPartyPackMember = z.infer<typeof memberSchema>;
export type ExternalPartyPackAttack = z.infer<typeof attackSchema>;
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

export interface LoadedPartyMember {
  readonly source: ExternalPartyPackMember;
  readonly profile: Extract<CombatantProfile, { readonly kind: 'player_character' }>;
  readonly attacks: readonly LoadedPartyAttack[];
  readonly spells: readonly SpellManifestRow[];
  readonly startingConditions: readonly LoadedPartyCondition[];
}

export interface LoadedExternalPartyPack {
  readonly pack: ExternalPartyPack;
  readonly members: readonly LoadedPartyMember[];
}

export type PartyPackRefusalReason =
  | 'invalid_json'
  | 'invalid_structure'
  | 'gaps_not_allowed'
  | 'no_mappable_members';

export interface PartyPackRefusal {
  readonly kind: 'external_party_pack_refusal';
  readonly reason: PartyPackRefusalReason;
}

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
const MEMBER_FIELDS = new Set([
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
  'spellSlots',
  'attacks',
  'spellSelections',
  'startingConditions',
]);
const CLASS_FIELDS = new Set(['classId', 'level']);
const ABILITY_FIELDS = new Set<string>(abilities);
const SPELL_SLOT_FIELDS = new Set(['level', 'maximum']);
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

function parsedCore(
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
    spellSlots: sanitizedArrayRecords(
      value.spellSlots,
      SPELL_SLOT_FIELDS,
      partyEntry,
      [...prefix, 'spellSlots'],
      gaps,
    ),
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

function loadedMember(
  member: ExternalPartyPackMember,
  spells: readonly SpellManifestRow[],
): LoadedPartyMember {
  const savingThrowBonuses = Object.fromEntries(
    abilities.map((ability) => [ability, member.savingThrowBonuses[ability]]),
  ) as Record<Ability, number>;
  return {
    source: member,
    profile: {
      kind: 'player_character',
      id: combatantId(member.combatantId),
      tokenId: tokenId(member.tokenId),
      name: member.combatantId.slice('combatant:'.length),
      characterId: member.characterId,
      rules: {
        armorClass: armorClass(member.armorClass),
        hitPointMaximum: member.hitPointMaximum,
        speed: feet(member.walkingSpeedFeet),
        initiativeBonus: member.initiativeBonus,
        savingThrowBonuses,
        attacksPerAction: member.attacksPerAction,
        reach: feet(Math.max(5, ...member.attacks.map((attack) => attack.reachFeet))),
        damageResponses: [],
        conditionImmunities: [],
        usesDeathSaves: true,
        spellSlots: member.spellSlots.map((capacity) => ({
          level: capacity.level,
          maximum: capacity.maximum,
        })),
      },
    },
    attacks: member.attacks.map(loadedAttack),
    spells,
    startingConditions: member.startingConditions.map((condition) => ({
      effectId: encounterEffectId(condition.effectId),
      condition: condition.conditionId,
    })),
  };
}

function refusal(
  reason: PartyPackRefusalReason,
  gaps: readonly GapReport[],
): PartyPackLoadResult {
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
    schemaVersion: z.literal(EXTERNAL_PARTY_PACK_SCHEMA_VERSION),
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
  const mapped: Array<{
    readonly member: ExternalPartyPackMember;
    readonly spells: readonly SpellManifestRow[];
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
    gaps.push(...unexpectedFieldGaps(memberInput, MEMBER_FIELDS, entry, ['members', index]));
    const core = memberCoreSchema.safeParse(parsedCore(memberInput, entry, index, gaps));
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
    const spellSlots = core.data.spellSlots.filter((capacity, capacityIndex, capacities) => {
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

    const spellInput = Array.isArray(memberInput.spellSelections) ? memberInput.spellSelections : [];
    if (!Array.isArray(memberInput.spellSelections)) gaps.push(issueGap(entry, ['members', index, 'spellSelections']));
    if (spellInput.length > SPELL_MANIFEST.length) {
      gaps.push(issueGap(entry, ['members', index, 'spellSelections'], 'value_not_in_engine_vocabulary'));
    }
    const spells: SpellManifestRow[] = [];
    const spellIds: string[] = [];
    for (const [spellIndex, spellValue] of spellInput.slice(0, SPELL_MANIFEST.length).entries()) {
      const spell = typeof spellValue === 'string'
        ? SPELL_MANIFEST.find((candidate) => candidate.id === spellValue)
        : undefined;
      if (spell === undefined) {
        gaps.push(issueGap(entry, ['members', index, 'spellSelections', spellIndex], 'value_not_in_engine_vocabulary'));
      } else if (spell.status !== 'implemented') {
        gaps.push(issueGap(entry, ['members', index, 'spellSelections', spellIndex], 'manifest_spell_not_implemented'));
      } else if (spellIds.includes(spell.id)) {
        gaps.push(issueGap(entry, ['members', index, 'spellSelections', spellIndex], 'value_not_in_engine_vocabulary'));
      } else {
        spellIds.push(spell.id);
        spells.push(spell);
      }
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

    const reconstructed = memberSchema.parse({
      ...core.data,
      spellSlots,
      attacks,
      spellSelections: spellIds,
      startingConditions,
    });
    mapped.push({ member: reconstructed, spells });
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
    schemaVersion: EXTERNAL_PARTY_PACK_SCHEMA_VERSION,
    partyId: header.data.partyId,
    allowPartial: header.data.allowPartial,
    members: mapped.map(({ member }) => member),
  });
  return {
    status: 'loaded',
    party: {
      pack,
      members: mapped.map(({ member, spells }) => loadedMember(member, spells)),
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
