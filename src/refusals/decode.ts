import type {
  CharacterId,
  CharacterItemId,
  CharacterRevision,
  GrantOrdinal,
  GrantRuleKey,
  SourceInstanceId,
} from '../domain/ids';
import {
  attunementSlotsFullRefusal,
  characterArchivedRefusal,
  levelUpRefused,
  revisionConflictRefusal,
  speciesLineageRefused,
  type AttunementSlotsFullRefusal,
  type CharacterArchivedRefusal,
  type LevelUpPlannedGrantLocator,
  type LevelUpPlannedGrantSource,
  type LevelUpRefused,
  type LevelUpRefusalReason,
  type LevelUpSubchoiceKind,
  type LevelUpSubchoiceRefusalIssue,
  type Refusal,
  type RefusalKind,
  type RevisionConflictRefusal,
  type SpeciesLineageRefused,
  type SpeciesLineageRefusalReason,
} from './refusal';
import {
  REFUSALS_WIRE_VERSION,
  ok,
  refused,
  type IncompatibleRefusal,
  type KnownOutcome,
} from './outcome';

type UnknownRecord = Readonly<Record<string, unknown>>;
type RefusalDecoder<K extends RefusalKind> = (
  record: UnknownRecord,
) => Extract<Refusal, { readonly kind: K }> | null;
type RefusalDecoderTable = {
  readonly [K in RefusalKind]: RefusalDecoder<K>;
};

const refusalKinds = {
  attunement_slots_full: true,
  revision_conflict: true,
  character_archived: true,
  level_up_refused: true,
  species_lineage_refused: true,
} as const satisfies Record<RefusalKind, true>;

const simpleLevelUpReasons = {
  class_not_held: true,
  ability_increase_required: true,
  level_not_adjacent: true,
  incomplete_level_one: true,
} as const satisfies Record<
  Exclude<LevelUpRefusalReason, 'planned_subchoice_refused'>,
  true
>;

const subchoiceKinds = {
  skill: true,
  expertise: true,
  spell: true,
} as const satisfies Record<LevelUpSubchoiceKind, true>;

const levelUpSubchoiceIssues = {
  locator_not_found: true,
  source_not_available: true,
  expected_unfilled: true,
  expected_filled: true,
  grant_not_found: true,
  grant_already_filled: true,
  skill_not_in_pool: true,
  skill_already_held: true,
  skill_not_proficient: true,
  skill_already_has_expertise: true,
  spell_not_eligible: true,
} as const satisfies Record<LevelUpSubchoiceRefusalIssue, true>;

const speciesLineageReasons = {
  guided_species_source_missing: true,
  wrong_source_kind: true,
  configured_choice_unavailable: true,
  invalid_option: true,
  invalid_spellcasting_ability: true,
  invalid_replaceable_spell: true,
} as const satisfies Record<SpeciesLineageRefusalReason, true>;

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(
  record: UnknownRecord,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(record);
  return actual.length === keys.length
    && keys.every((key) => Object.prototype.hasOwnProperty.call(record, key));
}

function isSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isSafeInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return isSafeInteger(value) && value > 0;
}

function isCharacterId(value: unknown): value is CharacterId {
  return isPositiveInteger(value);
}

function isCharacterItemId(value: unknown): value is CharacterItemId {
  return isPositiveInteger(value);
}

function isCharacterRevision(value: unknown): value is CharacterRevision {
  return isNonNegativeInteger(value);
}

function isGrantOrdinal(value: unknown): value is GrantOrdinal {
  return isPositiveInteger(value);
}

function isGrantRuleKey(value: unknown): value is GrantRuleKey {
  return typeof value === 'string' && value.length > 0;
}

function isSourceInstanceId(value: unknown): value is SourceInstanceId {
  return isPositiveInteger(value);
}

function isRefusalKind(value: unknown): value is RefusalKind {
  return typeof value === 'string'
    && Object.prototype.hasOwnProperty.call(refusalKinds, value);
}

function isSimpleLevelUpReason(
  value: unknown,
): value is Exclude<LevelUpRefusalReason, 'planned_subchoice_refused'> {
  return typeof value === 'string'
    && Object.prototype.hasOwnProperty.call(simpleLevelUpReasons, value);
}

function isSubchoiceKind(
  value: unknown,
): value is LevelUpSubchoiceKind {
  return typeof value === 'string'
    && Object.prototype.hasOwnProperty.call(subchoiceKinds, value);
}

function isLevelUpSubchoiceIssue(
  value: unknown,
): value is LevelUpSubchoiceRefusalIssue {
  return typeof value === 'string'
    && Object.prototype.hasOwnProperty.call(levelUpSubchoiceIssues, value);
}

function isSpeciesLineageReason(
  value: unknown,
): value is SpeciesLineageRefusalReason {
  return typeof value === 'string'
    && Object.prototype.hasOwnProperty.call(speciesLineageReasons, value);
}

function decodeLevelUpSource(value: unknown): LevelUpPlannedGrantSource | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null;
  switch (value.kind) {
    case 'selected_class':
      return hasExactKeys(value, ['kind']) ? { kind: 'selected_class' } : null;
    case 'selected_class_subclass':
      return hasExactKeys(value, ['kind'])
        ? { kind: 'selected_class_subclass' }
        : null;
    case 'selected_feat':
      return hasExactKeys(value, ['kind']) ? { kind: 'selected_feat' } : null;
    case 'existing_source':
      return hasExactKeys(value, ['kind', 'source_instance_id'])
        && isSourceInstanceId(value.source_instance_id)
        ? {
            kind: 'existing_source',
            source_instance_id: value.source_instance_id,
          }
        : null;
    default:
      return null;
  }
}

function decodeLevelUpLocator(
  value: unknown,
): LevelUpPlannedGrantLocator | null {
  if (
    !isRecord(value)
    || !hasExactKeys(value, ['source', 'rule_key', 'ordinal'])
    || !isGrantRuleKey(value.rule_key)
    || !isGrantOrdinal(value.ordinal)
  ) return null;
  const source = decodeLevelUpSource(value.source);
  return source === null
    ? null
    : {
        source,
        rule_key: value.rule_key,
        ordinal: value.ordinal,
      };
}

function decodeAttunementSlotsFull(
  record: UnknownRecord,
): AttunementSlotsFullRefusal | null {
  if (
    !hasExactKeys(record, ['kind', 'limit', 'occupants'])
    || !isPositiveInteger(record.limit)
    || !Array.isArray(record.occupants)
    || record.occupants.length !== record.limit
  ) return null;

  const occupants: AttunementSlotsFullRefusal['occupants'][number][] = [];
  for (const value of record.occupants) {
    if (
      !isRecord(value)
      || !hasExactKeys(value, ['slot', 'item_id', 'name'])
      || (value.slot !== 1 && value.slot !== 2 && value.slot !== 3)
      || !isCharacterItemId(value.item_id)
      || typeof value.name !== 'string'
    ) return null;
    occupants.push({
      slot: value.slot,
      item_id: value.item_id,
      name: value.name,
    });
  }
  return attunementSlotsFullRefusal(record.limit, occupants);
}

function decodeRevisionConflict(
  record: UnknownRecord,
): RevisionConflictRefusal | null {
  return hasExactKeys(record, ['kind', 'expected', 'actual'])
    && isCharacterRevision(record.expected)
    && isCharacterRevision(record.actual)
    ? revisionConflictRefusal(
        record.expected,
        record.actual,
      )
    : null;
}

function decodeCharacterArchived(
  record: UnknownRecord,
): CharacterArchivedRefusal | null {
  return hasExactKeys(record, ['kind', 'character_id', 'current_revision'])
    && isCharacterId(record.character_id)
    && isCharacterRevision(record.current_revision)
    ? characterArchivedRefusal(
        record.character_id,
        record.current_revision,
      )
    : null;
}

function decodeLevelUpRefused(record: UnknownRecord): LevelUpRefused | null {
  if (isSimpleLevelUpReason(record.reason)) {
    return hasExactKeys(record, ['kind', 'reason'])
      ? levelUpRefused({ reason: record.reason })
      : null;
  }
  if (
    record.reason !== 'planned_subchoice_refused'
    || !hasExactKeys(record, [
      'kind',
      'reason',
      'subchoice_kind',
      'index',
      'issue',
      'locator',
    ])
    || !isSubchoiceKind(record.subchoice_kind)
    || !isNonNegativeInteger(record.index)
    || !isLevelUpSubchoiceIssue(record.issue)
  ) return null;
  const locator = decodeLevelUpLocator(record.locator);
  return locator === null
    ? null
    : levelUpRefused({
        reason: record.reason,
        subchoice_kind: record.subchoice_kind,
        index: record.index,
        issue: record.issue,
        locator,
      });
}

function decodeSpeciesLineageRefused(
  record: UnknownRecord,
): SpeciesLineageRefused | null {
  return hasExactKeys(record, ['kind', 'reason'])
    && isSpeciesLineageReason(record.reason)
    ? speciesLineageRefused(record.reason)
    : null;
}

const refusalDecoders = {
  attunement_slots_full: decodeAttunementSlotsFull,
  revision_conflict: decodeRevisionConflict,
  character_archived: decodeCharacterArchived,
  level_up_refused: decodeLevelUpRefused,
  species_lineage_refused: decodeSpeciesLineageRefused,
} satisfies RefusalDecoderTable;

function incompatible(wireVersion: number | null): IncompatibleRefusal {
  return { kind: 'incompatible_refusal', wire_version: wireVersion };
}

export function decodeOutcome<T>(
  data: unknown,
  isValue: (value: unknown) => value is T,
): KnownOutcome<T> | IncompatibleRefusal {
  if (!isRecord(data) || typeof data.kind !== 'string') {
    return incompatible(null);
  }
  if (data.kind === 'ok') {
    return hasExactKeys(data, ['kind', 'value']) && isValue(data.value)
      ? ok(data.value)
      : incompatible(null);
  }
  const wireVersion = isSafeInteger(data.wire_version)
    ? data.wire_version
    : null;
  if (
    data.kind !== 'refused'
    || !hasExactKeys(data, ['kind', 'wire_version', 'refusal'])
    || wireVersion !== REFUSALS_WIRE_VERSION
    || !isRecord(data.refusal)
    || !isRefusalKind(data.refusal.kind)
  ) return incompatible(wireVersion);

  const refusal = refusalDecoders[data.refusal.kind](data.refusal);
  return refusal === null ? incompatible(wireVersion) : refused(refusal);
}
