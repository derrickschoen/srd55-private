import type {
  Ability,
  DomainSourceType,
  EffectReliabilityCategory,
  KnownAbilityAllocationMethod,
  MaterialCostKind,
  ProgressionType,
  RulesEdition,
  SelectionEligibility,
  SlotBucket,
  SlotState,
  SourceInstanceState,
  SpellAreaShape,
  SpellRangeKind,
  SpellSchool,
} from './enums';
import type {
  AuditEntityId,
  CharacterClassLevelId,
  CharacterId,
  CharacterOperationId,
  CharacterRevision,
  ChangeLogId,
  ClassDefinitionId,
  SlotId,
  SourceDefinitionId,
  SourceInstanceId,
  SpellIdentityId,
  SpellVersionId,
  StandaloneDefinitionId,
  SubclassDefinitionId,
  WizardSpellbookEntryId,
} from './ids';

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { readonly [key: string]: JsonValue };

export interface TimestampedRow {
  created_at: string | null;
  updated_at: string | null;
}

export interface DefinitionRow extends TimestampedRow {
  id: StandaloneDefinitionId;
  content_key: string;
  name: string;
  rules_edition: RulesEdition;
  category: string | null;
  repeatable: boolean;
  prerequisites: JsonValue | null;
  grant_rules: JsonValue | null;
  notes: string | null;
}

export interface SpellIdentityRow extends TimestampedRow {
  id: SpellIdentityId;
  content_key: string;
  canonical_name: string;
  normalized_name: string;
  notes: string | null;
}

export interface SpellVersionRow extends TimestampedRow {
  id: SpellVersionId;
  content_key: string;
  spell_identity_id: SpellIdentityId;
  display_name: string;
  rules_edition: RulesEdition;
  level: number;
  school: SpellSchool;
  ritual: boolean;
  concentration: boolean;
  casting_time: string | null;
  action_type: string | null;
  /** The printed Range line, verbatim. See `src/domain/spell-range.ts`. */
  range: string | null;
  duration: string | null;
  /**
   * The printed Components line, verbatim.
   *
   * `string | null` AND NOT `JsonValue | null`. This field said `JsonValue`
   * while the column was declared `VARCHAR` and the importer wrote an opaque
   * string into it, and the contradiction was live for long enough that
   * `src/queries/catalog-queries.ts` carried an `Omit<SpellVersionRow,
   * 'components'>` whose only job was to say `string | null` again. The DDL and
   * the writer agreed with each other and this type disagreed with both; it now
   * follows the writer, and the `Omit` is gone.
   */
  components: string | null;
  /** What is inside `M (…)`. See `src/domain/spell-components.ts`. */
  material_component_summary: string | null;
  material_cost_copper: number | null;
  material_cost_kind: MaterialCostKind | null;
  range_kind: SpellRangeKind | null;
  range_feet: number | null;
  area_shape: SpellAreaShape | null;
  area_feet: number | null;
  healing: boolean;
  short_summary: string | null;
  /** Text for the SLOT-level progression. See `spell_version_upcast_levels`. */
  upcast_summary: string | null;
  /**
   * Text for the CHARACTER-level Cantrip Upgrade. See
   * `spell_version_cantrip_upgrade_levels`. A separate field from
   * `upcast_summary` because it describes a separate mechanic, and the two
   * columns exist so that neither has to be read as the other.
   */
  cantrip_upgrade_summary: string | null;
  requires_mod_for_effect: boolean;
  effect_reliability_category: EffectReliabilityCategory;
  provenance: string;
  seed_version: string | null;
  is_active: boolean;
}

export interface CharacterRow extends TimestampedRow {
  id: CharacterId;
  name: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  /**
   * How the six base scores were allocated (D64); NULL means never allocated.
   * The nullable method IS the allocation signal — see `db/schema/character.ts`.
   */
  ability_allocation_method: KnownAbilityAllocationMethod | null;
  proficiency_bonus_override: number | null;
  rules_edition_preference: RulesEdition;
  allow_legacy: boolean;
  revision: CharacterRevision;
  alignment: string | null;
  appearance: string | null;
  backstory: string | null;
  notes: string | null;
  /** NULL is active; a timestamp is archived library lifecycle state. */
  archived_at: string | null;
}

export interface ClassDefinitionRow extends TimestampedRow {
  id: ClassDefinitionId;
  content_key: string;
  name: string;
  rules_edition: RulesEdition;
  spellcasting_ability: Ability | null;
  progression_type: ProgressionType;
  caster_fraction: string | null;
  caster_rounding: string | null;
  prepares_or_knows: string | null;
  supports_ritual_casting: boolean;
  ritual_casting_mode: string | null;
  primary_ability_expression: string | null;
  notes: string | null;
}

export interface SubclassDefinitionRow extends TimestampedRow {
  id: SubclassDefinitionId;
  content_key: string;
  class_definition_id: ClassDefinitionId;
  name: string;
  rules_edition: RulesEdition;
  spellcasting_ability: Ability | null;
  caster_fraction: string | null;
  caster_rounding: string | null;
  grant_rules: JsonValue | null;
}

export interface CharacterClassLevelRow extends TimestampedRow {
  id: CharacterClassLevelId;
  character_id: CharacterId;
  class_definition_id: ClassDefinitionId;
  subclass_definition_id: SubclassDefinitionId | null;
  level: number;
  is_starting_class: boolean;
  spellcasting_ability_override: Ability | null;
  notes: string | null;
}

export interface CharacterSourceInstanceRow extends TimestampedRow {
  id: SourceInstanceId;
  character_id: CharacterId;
  instance_uuid: string;
  parent_source_instance_id: SourceInstanceId | null;
  source_type: DomainSourceType;
  source_definition_id: SourceDefinitionId | null;
  display_name: string;
  config: JsonObject | null;
  acquired_at_character_level: number | null;
  state: SourceInstanceState;
  notes: string | null;
}

export interface SpellSelectionSlotRow extends TimestampedRow {
  id: SlotId;
  character_id: CharacterId;
  source_instance_id: SourceInstanceId;
  slot_key: string;
  rule_key: string;
  ordinal: number;
  bucket: SlotBucket;
  eligibility_kind: string;
  fixed_spell_version_id: SpellVersionId | null;
  current_spell_version_id: SpellVersionId | null;
  label: string | null;
  spell_level_min: number;
  spell_level_max: number;
  allowed_spell_lists: string[] | null;
  allowed_schools: SpellSchool[] | null;
  allowed_tags: string[] | null;
  always_prepared: boolean;
  with_slots: boolean;
  free_cast: JsonObject | null;
  counts_against_limit: boolean;
  required: boolean;
  is_locked: boolean;
  state: SlotState;
  orphan_reason_code: string | null;
  orphaned_at: string | null;
  prior_config: JsonObject | null;
  override_note: string | null;
  sort_order: number;
  notes: string | null;
  selection_collection: string | null;
  selection_eligibility: SelectionEligibility;
  selection_invalid_reason: string | null;
}

export interface WizardSpellbookEntryRow extends TimestampedRow {
  id: WizardSpellbookEntryId;
  character_id: CharacterId;
  spell_version_id: SpellVersionId;
}

export interface CharacterOperationRow extends TimestampedRow {
  id: CharacterOperationId;
  character_id: CharacterId;
  operation_uuid: string;
  expected_revision: CharacterRevision;
  resulting_revision: CharacterRevision;
  inverse_command: JsonObject;
}

export interface ChangeLogRow extends TimestampedRow {
  id: ChangeLogId;
  character_id: CharacterId;
  sequence: number;
  group_id: string | null;
  operation_uuid: string | null;
  entity_type: string;
  entity_id: AuditEntityId | null;
  previous_value: JsonValue | null;
  new_value: JsonValue | null;
  reason: string | null;
  action_type: string;
  reversible: boolean;
}

export interface CharacterSnapshot {
  version: string;
  character: JsonObject;
  tables: Readonly<Record<string, readonly JsonObject[]>>;
}
