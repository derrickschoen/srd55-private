import {
  check,
  foreignKey,
  index,
  integer,
  sqliteTable,
  uniqueIndex,
  type AnySQLiteColumn,
} from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import type {
  CharacterId,
  ClassDefinitionId,
  SlotId,
  SourceInstanceId,
  SpellVersionId,
  SubclassDefinitionId,
} from '../../src/domain/ids';
import type {
  Ability,
  DomainSourceType,
  KnownAbilityAllocationMethod,
  RulesEdition,
  SelectionEligibility,
  SlotBucket,
  SlotState,
} from '../../src/domain/enums';
import {
  abilities,
  abilityAllocationMethods,
  rulesEditions,
  selectionEligibilities,
  slotBuckets,
  slotStates,
} from '../../src/domain/enums';
import {
  datetime,
  integerAtLeast,
  nullOrIntegerAtLeast,
  nullOrOneOf,
  oneOf,
  sqlText,
  tinyint1,
  varchar,
} from './columns';
import { class_definitions, subclass_definitions } from './catalog-classes';
import { spell_versions } from './catalog-spells';

/**
 * THE CHARACTER AGGREGATE.
 *
 * `characters` is the aggregate root. Every other table here cascades from it,
 * directly or through `character_source_instances`, which is what makes
 * "delete a character" a single statement and what the snapshot / backup /
 * share scopes in `src/domain/contracts/tables.ts` are derived over.
 */

export const characters = sqliteTable('characters', {
  id: integer('id')
    .primaryKey({ autoIncrement: true })
    .notNull()
    .$type<CharacterId>(),
  name: varchar()('name').notNull(),
  strength: integer('strength').notNull().default(10),
  dexterity: integer('dexterity').notNull().default(10),
  constitution: integer('constitution').notNull().default(10),
  intelligence: integer('intelligence').notNull().default(10),
  wisdom: integer('wisdom').notNull().default(10),
  charisma: integer('charisma').notNull().default(10),
  /**
   * How the six base scores were allocated (D64), or NULL for never allocated.
   *
   * A DEFENDED NULL, and the whole point of the column: the six score columns
   * are NOT NULL with a DEFAULT of 10, so nothing else in the schema can
   * distinguish a chosen 10 from a defaulted one (plan B-A2). The method
   * doubles as the allocation signal — one column serves D64's method warnings
   * and the abilities step's completion detection, so there is no second
   * thing to keep in step. Written only by the atomic `allocate_abilities`
   * command; `update_ability` edits never touch it.
   */
  ability_allocation_method: varchar<KnownAbilityAllocationMethod>()(
    'ability_allocation_method',
  ),
  /** Null means "derive from total level"; it is a genuine override slot. */
  proficiency_bonus_override: integer('proficiency_bonus_override'),
  rules_edition_preference: varchar<RulesEdition>()('rules_edition_preference')
    .notNull()
    .default('2024'),
  allow_legacy: tinyint1('allow_legacy').notNull().default(false),
  revision: integer('revision').notNull().default(0),
  notes: sqlText()('notes'),
  created_at: datetime()('created_at'),
  updated_at: datetime()('updated_at'),
}, () => [
  /**
   * 1..30 is not a house rule: it is the range `UpdateAbilityCommand` refuses
   * outside of ("Ability scores must be between 1 and 30."), the range the
   * portable-backup validator refuses outside of, the range share import
   * refuses outside of, and the range `abilityScore` in the row contracts
   * already declares. All six columns are named so that omitting one from this
   * expression is a failing test rather than a silent gap.
   */
  check(
    'characters_ability_scores_check',
    sql`strength BETWEEN 1 AND 30
      AND dexterity BETWEEN 1 AND 30
      AND constitution BETWEEN 1 AND 30
      AND intelligence BETWEEN 1 AND 30
      AND wisdom BETWEEN 1 AND 30
      AND charisma BETWEEN 1 AND 30`,
  ),
  /**
   * An edition outside this set matches no catalog row, so the character's
   * spell lists come back empty with no error anywhere — the silent-wrong this
   * constraint exists to make impossible. Both restore paths already refuse it
   * in a document (`character-backup.ts`, `sharing/schema.ts`).
   */
  /**
   * NULL is the never-allocated state and is the constraint's most important
   * limb. A non-member here would make the guided builder's completion
   * detection lie in both directions at once — an unknown method neither warns
   * (D64 keys warnings on the method) nor reads as unallocated.
   */
  check(
    'characters_ability_allocation_method_check',
    nullOrOneOf('ability_allocation_method', abilityAllocationMethods),
  ),
  check(
    'characters_rules_edition_preference_check',
    oneOf('rules_edition_preference', rulesEditions),
  ),
  /**
   * A DEFENDED NULL: null means "derive the bonus from total level" and is the
   * normal case, so the null limb is the constraint's most important half. What
   * is refused is 0 and below — a proficiency bonus of zero is not an override,
   * it is a lost one. The backup validator already requires a positive integer.
   *
   * `nullOrIntegerAtLeast` rather than a bare `>= 1` — see its comment in
   * `columns.ts`. Written bare, `'abc' >= 1` is TRUE in SQLite, so the
   * constraint would wave through the one value class it is here to stop.
   */
  check(
    'characters_proficiency_bonus_override_check',
    nullOrIntegerAtLeast('proficiency_bonus_override', 1),
  ),
  /**
   * `revision` is the optimistic-concurrency counter every command compares
   * against; a negative one cannot be reached by incrementing from the
   * default 0. A TEXT revision would not merely be wrong, it would defeat the
   * comparison outright, which is why the integer limb is load-bearing here
   * rather than decorative.
   */
  check('characters_revision_check', integerAtLeast('revision', 0)),
]);

/**
 * A source a character has taken: a class, subclass, feat, species or
 * background.
 *
 * `source_definition_id` is a POLYMORPHIC reference: which `*_definitions`
 * table it points into is decided at runtime by `source_type`. SQL cannot
 * express that, so there is no foreign key on it and it stays nullable — the
 * backup format's `requireReference(..., nullable = true)` accepts and
 * re-inserts a null, so tightening it would reject legitimately-produced
 * backups.
 *
 * `parent_source_instance_id` is the schema's ONLY `ON DELETE SET NULL`: a
 * subclass instance survives the deletion of the class instance that granted
 * it, orphaned rather than removed.
 */
export const character_source_instances = sqliteTable(
  'character_source_instances',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<SourceInstanceId>(),
    character_id: integer('character_id')
      .notNull()
      .$type<CharacterId>()
      .references(() => characters.id, { onDelete: 'cascade' }),
    instance_uuid: varchar()('instance_uuid').notNull(),
    parent_source_instance_id: integer('parent_source_instance_id')
      .$type<SourceInstanceId>()
      .references((): AnySQLiteColumn => character_source_instances.id, {
        onDelete: 'set null',
      }),
    source_type: varchar<DomainSourceType>()('source_type').notNull(),
    source_definition_id: integer('source_definition_id'),
    display_name: varchar()('display_name').notNull(),
    config: sqlText()('config'),
    acquired_at_character_level: integer('acquired_at_character_level'),
    /**
     * NO CHECK CONSTRAINT, AND THE REASON IS STRONGER THAN "THE PROOF PHASE
     * WAS UNSURE". This looks like the most obvious enum column in the schema —
     * it is a `state`, it is `NOT NULL`, it defaults to `'active'` — and
     * constraining it to `slotStates` would have broken class removal on its
     * FIRST WRITE. `'tombstoned'` is not a member of `slotStates`, yet four
     * shipped writers set it here: `remove-source.ts:53`, `update-class.ts:250`
     * and `:337`, and `grant-rule-slot-generator.ts:724`.
     *
     * `spell_selection_slots.state` a few tables down IS constrained, to a
     * vocabulary this column does not share. Two columns named `state`, two
     * different closed sets, and only one of them is declared — which is
     * exactly the trap. This column's real vocabulary has never been written
     * down anywhere: it is `varchar()` with no type parameter, and
     * `src/domain/contracts/rows.ts` types it `sqlText` on purpose, because
     * "inventing a constraint the schema does not declare is exactly the
     * over-tightening D6b forbids".
     *
     * Declaring the enum first, in `src/domain/enums.ts`, and typing the column
     * with it is the prerequisite. A CHECK transcribed here from a grep of the
     * writers would be a second, unowned copy of a vocabulary — the precise
     * duplication `oneOf` exists to prevent.
     */
    state: varchar()('state').notNull().default('active'),
    notes: sqlText()('notes'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    uniqueIndex('character_source_instances_instance_uuid_unique').on(
      table.instance_uuid,
    ),
    index('character_source_instances_character_id_state_index').on(
      table.character_id,
      table.state,
    ),
    // Composite-FK companion: the target of spell_selection_slots'
    // (source_instance_id, character_id) reference, which is what stops a slot
    // from being attached to another character's source instance.
    uniqueIndex('character_source_instances_id_character_id_unique').on(
      table.id,
      table.character_id,
    ),
  ],
);

/**
 * `subclass_definition_id` stays nullable: a class is taken before its
 * subclass is chosen.
 *
 * CAUTION for contract authors: SQLite foreign keys are MATCH SIMPLE, so while
 * this column is NULL the composite reference to
 * `subclass_definitions (id, class_definition_id)` is NOT ENFORCED AT ALL. The
 * contract must not present the pairing as total.
 */
export const character_class_levels = sqliteTable(
  'character_class_levels',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    character_id: integer('character_id')
      .notNull()
      .$type<CharacterId>()
      .references(() => characters.id, { onDelete: 'cascade' }),
    class_definition_id: integer('class_definition_id')
      .notNull()
      .$type<ClassDefinitionId>()
      .references(() => class_definitions.id),
    subclass_definition_id: integer(
      'subclass_definition_id',
    ).$type<SubclassDefinitionId>(),
    level: integer('level').notNull().default(1),
    is_starting_class: tinyint1('is_starting_class')
      .notNull()
      .default(false),
    spellcasting_ability_override: varchar<Ability>()(
      'spellcasting_ability_override',
    ),
    notes: sqlText()('notes'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    /**
     * Nullable because most classes never override their spellcasting ability;
     * the null limb is the ordinary case. A non-member here would feed a save
     * DC and an attack bonus computed off an ability score column that does not
     * exist. `UpdateAbilityCommand` and share import both already refuse one.
     *
     * NOT CONSTRAINED HERE: `level`. Production bounds it to 1..20 in three
     * places, but `tests/integration/rules/class-progression.test.ts` inserts
     * level 21 on purpose to force a missing progression row, so the proof
     * phase classified the bound BLOCKED rather than accepted. Unblocking it
     * means rewriting that fixture, which is a separate decision.
     */
    check(
      'character_class_levels_spellcasting_ability_override_check',
      nullOrOneOf('spellcasting_ability_override', abilities),
    ),
    uniqueIndex(
      'character_class_levels_character_id_class_definition_id_unique',
    ).on(table.character_id, table.class_definition_id),
    foreignKey({
      columns: [table.subclass_definition_id, table.class_definition_id],
      foreignColumns: [
        subclass_definitions.id,
        subclass_definitions.class_definition_id,
      ],
    }),
  ],
);

/**
 * A spell slot in the planner sense: one place a character can put (or has
 * been given) a spell.
 *
 * THREE correlated-null groups live in this table:
 *
 *  1. ASSIGNMENT — `fixed_spell_version_id` (a grant) XOR
 *     `current_spell_version_id` (a user selection) XOR neither (empty).
 *     Enforced three ways: the named CHECK below and both BEFORE triggers.
 *  2. LIFECYCLE — `state = 'orphaned'` travels with `orphan_reason_code`,
 *     `orphaned_at` and `prior_config`.
 *  3. ELIGIBILITY — `selection_eligibility = 'invalid'` travels with
 *     `selection_invalid_reason`.
 *
 * NOT YET MODELLED. Each group is still declared as independently nullable
 * columns here and in `src/domain/models.ts`, so the type system permits
 * combinations the database rejects — an `orphan_reason_code` on an active
 * slot, or both assignment columns set. Turning these into discriminated
 * unions is the whole point of the contracts work and has NOT been done; this
 * comment records the target, not the state.
 */
export const spell_selection_slots = sqliteTable(
  'spell_selection_slots',
  {
    id: integer('id')
      .primaryKey({ autoIncrement: true })
      .notNull()
      .$type<SlotId>(),
    character_id: integer('character_id')
      .notNull()
      .$type<CharacterId>()
      .references(() => characters.id, { onDelete: 'cascade' }),
    source_instance_id: integer('source_instance_id')
      .notNull()
      .$type<SourceInstanceId>(),
    slot_key: varchar()('slot_key').notNull(),
    rule_key: varchar()('rule_key').notNull(),
    ordinal: integer('ordinal').notNull().default(0),
    bucket: varchar<SlotBucket>()('bucket').notNull(),
    eligibility_kind: varchar()('eligibility_kind').notNull(),
    fixed_spell_version_id: integer('fixed_spell_version_id')
      .$type<SpellVersionId>()
      .references(() => spell_versions.id),
    current_spell_version_id: integer('current_spell_version_id')
      .$type<SpellVersionId>()
      .references(() => spell_versions.id),
    label: varchar()('label'),
    spell_level_min: integer('spell_level_min')
      .notNull()
      .default(0),
    spell_level_max: integer('spell_level_max')
      .notNull()
      .default(9),
    allowed_spell_lists: sqlText()('allowed_spell_lists'),
    /**
     * Serialized JSON, not one school scalar. The column therefore remains
     * TEXT; its logical type is `SpellSchool[]` at the row/read boundary and
     * its Zod contract proves the JSON contains strings without closing them.
     */
    allowed_schools: sqlText()('allowed_schools'),
    allowed_tags: sqlText()('allowed_tags'),
    always_prepared: tinyint1('always_prepared')
      .notNull()
      .default(false),
    with_slots: tinyint1('with_slots').notNull().default(true),
    free_cast: sqlText()('free_cast'),
    counts_against_limit: tinyint1('counts_against_limit')
      .notNull()
      .default(true),
    required: tinyint1('required').notNull().default(false),
    is_locked: tinyint1('is_locked').notNull().default(false),
    state: varchar<SlotState>()('state')
      .notNull()
      .default('active'),
    orphan_reason_code: varchar()('orphan_reason_code'),
    orphaned_at: datetime()('orphaned_at'),
    prior_config: sqlText()('prior_config'),
    override_note: sqlText()('override_note'),
    sort_order: integer('sort_order').notNull().default(0),
    notes: sqlText()('notes'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
    selection_collection: varchar()('selection_collection'),
    selection_eligibility: varchar<SelectionEligibility>()(
      'selection_eligibility',
    )
      .notNull()
      .default('unselected'),
    selection_invalid_reason: sqlText()('selection_invalid_reason'),
  },
  (table) => [
    check(
      'spell_slots_exclusive_assignment_check',
      sql`fixed_spell_version_id IS NULL OR current_spell_version_id IS NULL`,
    ),
    /**
     * A slot in a bucket nobody knows is invisible to every prepared/known
     * count in the planner — it simply stops being counted, with no warning.
     * `GrantRule` already refuses a non-member before the sole writer
     * (`grant-rule-slot-generator.ts`) ever binds it.
     */
    check('spell_selection_slots_bucket_check', oneOf('bucket', slotBuckets)),
    /**
     * `isUsableSlotState` returns false for anything outside this set, so an
     * unknown state silently disables the slot rather than erroring.
     */
    check('spell_selection_slots_state_check', oneOf('state', slotStates)),
    check(
      'spell_selection_slots_selection_eligibility_check',
      oneOf('selection_eligibility', selectionEligibilities),
    ),
    /**
     * ONE constraint, because it is one fact: the slot's level window is
     * well-formed. `GrantRule.level()` already refuses a bound outside 0..9 and
     * `GrantRule` already refuses `level_min > level_max` with an explicit
     * RangeError. An inverted window is worse than an out-of-range one: it
     * matches no spell at all, so the slot renders as an empty picker.
     *
     * NOT CONSTRAINED HERE: `eligibility_kind`. Its vocabulary is
     * `grantRuleKinds`, but the column is a plain `varchar()` whose row
     * contract deliberately declines to enum it, and a unit fixture writes the
     * shorthand `'list'`. Proof phase: BLOCKED.
     */
    check(
      'spell_selection_slots_level_window_check',
      sql`spell_level_min BETWEEN 0 AND 9
        AND spell_level_max BETWEEN 0 AND 9
        AND spell_level_min <= spell_level_max`,
    ),
    foreignKey({
      columns: [table.source_instance_id, table.character_id],
      foreignColumns: [
        character_source_instances.id,
        character_source_instances.character_id,
      ],
    }).onDelete('cascade'),
    uniqueIndex('spell_selection_slots_character_id_slot_key_unique').on(
      table.character_id,
      table.slot_key,
    ),
    index('spell_selection_slots_character_id_state_index').on(
      table.character_id,
      table.state,
    ),
    index('spell_selection_slots_character_id_bucket_index').on(
      table.character_id,
      table.bucket,
    ),
    index('slots_character_collection_index').on(
      table.character_id,
      table.selection_collection,
    ),
  ],
);

/**
 * The final migration removed the provenance/cost/source columns: the
 * spellbook is now only a per-character set of acquired spell versions.
 */
export const wizard_spellbook_entries = sqliteTable(
  'wizard_spellbook_entries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    character_id: integer('character_id')
      .notNull()
      .$type<CharacterId>()
      .references(() => characters.id, { onDelete: 'cascade' }),
    spell_version_id: integer('spell_version_id')
      .notNull()
      .$type<SpellVersionId>()
      .references(() => spell_versions.id),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    uniqueIndex(
      'wizard_spellbook_entries_character_id_spell_version_id_unique',
    ).on(table.character_id, table.spell_version_id),
  ],
);

/**
 * The append-only audit log.
 *
 * `entity_type` is deliberately NOT narrowed to a table union on the read
 * side: historical rows written under an older vocabulary must stay parseable
 * forever. The WRITE side is typed (see `AUDIT_ENTITY_TYPES` in the
 * contracts), which is where a typo can still be caught.
 *
 * `group_id` and `operation_uuid` are nullable in the DDL but have a single
 * writer that always binds them, and no restore path reaches this table — it
 * is in no snapshot, backup or share list. They are therefore CANDIDATES for
 * tightening. Nothing tightens them today: both remain nullable in the DDL and
 * in the read models, because narrowing them means either an evidenced
 * backfill of existing rows or a decode boundary that rejects a null, and
 * neither exists yet.
 */
export const change_log = sqliteTable(
  'change_log',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    character_id: integer('character_id')
      .notNull()
      .$type<CharacterId>()
      .references(() => characters.id, { onDelete: 'cascade' }),
    sequence: integer('sequence').notNull(),
    group_id: varchar()('group_id'),
    operation_uuid: varchar()('operation_uuid'),
    entity_type: varchar()('entity_type').notNull(),
    entity_id: integer('entity_id'),
    previous_value: sqlText()('previous_value'),
    new_value: sqlText()('new_value'),
    reason: varchar()('reason'),
    action_type: varchar()('action_type').notNull(),
    reversible: tinyint1('reversible').notNull().default(true),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    uniqueIndex('change_log_character_id_sequence_unique').on(
      table.character_id,
      table.sequence,
    ),
    index('change_log_character_id_group_id_index').on(
      table.character_id,
      table.group_id,
    ),
    index('change_log_operation_uuid_index').on(table.operation_uuid),
  ],
);

export const character_save_points = sqliteTable('character_save_points', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  character_id: integer('character_id')
    .notNull()
    .$type<CharacterId>()
    .references(() => characters.id, { onDelete: 'cascade' }),
  label: varchar()('label').notNull(),
  snapshot: sqlText()('snapshot').notNull(),
  schema_version: varchar()('schema_version').notNull(),
  created_at: datetime()('created_at'),
  updated_at: datetime()('updated_at'),
});

export const warning_acknowledgements = sqliteTable(
  'warning_acknowledgements',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    character_id: integer('character_id')
      .notNull()
      .$type<CharacterId>()
      .references(() => characters.id, { onDelete: 'cascade' }),
    warning_fingerprint: varchar()('warning_fingerprint').notNull(),
    note: sqlText()('note'),
    /** Set when a build change invalidates a previous acknowledgement. */
    invalidated_at: datetime()('invalidated_at'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    uniqueIndex(
      'warning_acknowledgements_character_id_warning_fingerprint_unique',
    ).on(table.character_id, table.warning_fingerprint),
  ],
);

export const spell_loadouts = sqliteTable('spell_loadouts', {
  id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
  character_id: integer('character_id')
    .notNull()
    .$type<CharacterId>()
    .references(() => characters.id, { onDelete: 'cascade' }),
  name: varchar()('name').notNull(),
  notes: sqlText()('notes'),
  created_at: datetime()('created_at'),
  updated_at: datetime()('updated_at'),
});

/**
 * The one character-owned table with NO `character_id` column: it reaches the
 * character only through `spell_loadouts`. That is exactly why it cannot
 * participate in the `character_id`-keyed direct-backup pass, and the scope
 * table in the contracts makes that a compile-time fact rather than a
 * convention.
 */
export const spell_loadout_entries = sqliteTable(
  'spell_loadout_entries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    spell_loadout_id: integer('spell_loadout_id')
      .notNull()
      .references(() => spell_loadouts.id, { onDelete: 'cascade' }),
    spell_version_id: integer('spell_version_id')
      .notNull()
      .$type<SpellVersionId>()
      .references(() => spell_versions.id),
    role: varchar()('role').notNull(),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    uniqueIndex(
      'spell_loadout_entries_spell_loadout_id_spell_version_id_role_unique',
    ).on(table.spell_loadout_id, table.spell_version_id, table.role),
  ],
);

export const character_spell_preferences = sqliteTable(
  'character_spell_preferences',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    character_id: integer('character_id')
      .notNull()
      .$type<CharacterId>()
      .references(() => characters.id, { onDelete: 'cascade' }),
    spell_version_id: integer('spell_version_id')
      .notNull()
      .$type<SpellVersionId>()
      .references(() => spell_versions.id),
    favourite: tinyint1('favourite').notNull().default(false),
    notes: sqlText()('notes'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    uniqueIndex(
      'character_spell_preferences_character_id_spell_version_id_unique',
    ).on(table.character_id, table.spell_version_id),
  ],
);

export const character_rule_overrides = sqliteTable(
  'character_rule_overrides',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    character_id: integer('character_id')
      .notNull()
      .$type<CharacterId>()
      .references(() => characters.id, { onDelete: 'cascade' }),
    rule_key: varchar()('rule_key').notNull(),
    /** Opaque JSON text. Validating its shape is a separate, flagged concern. */
    value: sqlText()('value').notNull(),
    note: sqlText()('note'),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    uniqueIndex('character_rule_overrides_character_id_rule_key_unique').on(
      table.character_id,
      table.rule_key,
    ),
  ],
);

/**
 * The optimistic-concurrency journal. Like `change_log`, no restore path
 * reaches it, so its timestamps are safe to tighten in the contract.
 */
export const character_operations = sqliteTable(
  'character_operations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }).notNull(),
    character_id: integer('character_id')
      .notNull()
      .$type<CharacterId>()
      .references(() => characters.id, { onDelete: 'cascade' }),
    operation_uuid: varchar()('operation_uuid').notNull(),
    expected_revision: integer('expected_revision').notNull(),
    resulting_revision: integer('resulting_revision').notNull(),
    inverse_command: sqlText()('inverse_command').notNull(),
    created_at: datetime()('created_at'),
    updated_at: datetime()('updated_at'),
  },
  (table) => [
    uniqueIndex('character_operations_operation_uuid_unique').on(
      table.operation_uuid,
    ),
    index('character_operations_character_id_resulting_revision_index').on(
      table.character_id,
      table.resulting_revision,
    ),
  ],
);
