import { z } from 'zod';
import type { InferSelectModel } from 'drizzle-orm';
import {
  COLUMN_FACTS,
  type AnyColumnKey,
  type DegradedColumnKey,
} from './generated/column-facts';
import {
  JSON_COLUMNS,
  jsonColumnError,
  type JsonColumnKey,
} from './json-columns';
import type {
  BackupTable,
  SpellDefinitionTable,
  TableFor,
} from './tables';
import {
  catalogContentFingerprintInvariantError,
  catalogContentIdentityInvariantError,
  weaponDamagePayloadError,
  weaponRangePayloadError,
  classResourceFormulaInvariantError,
} from './row-rules';
import {
  classFormulaResourceKinds,
  classResourceFormulaKinds,
  classResourceKinds,
  resourceFormulaAbilities,
} from '../class-resources';
import {
  abilities,
  abilityAllocationMethods,
  armorCategories,
  armorDexBonuses,
  armorSlots,
  backgroundEquipmentOptions,
  characterEffectKinds,
  classEquipmentOptions,
  equipmentItemKinds,
  conditionType,
  creatureSizes,
  creatureTypes,
  creatureSize,
  creatureType,
  damageTypes,
  damageType,
  domainSourceTypes,
  effectReliabilityCategories,
  extraAttackWeaponScopes,
  featAbilityPoints,
  levelFeatChoiceKinds,
  materialCostKinds,
  rulesEditions,
  selectionEligibilities,
  spellbookAcquisitionStates,
  skillGrantStates,
  slotBuckets,
  skills,
  spellAreaShapes,
  spellRangeKinds,
  spellSchool,
  slotStates,
  effectKinds,
  featureTemplateEffectKinds,
  speciesTemplateEffectKinds,
  srdWeaponGroups,
  weaponAttackKinds,
  weaponMasteryGrants,
  weaponMasteryProperties,
  weaponProficiencyCategories,
} from '../enums';
import { weaponRangeKinds } from '../weapon-range';
import {
  CONTENT_FINGERPRINT_SCHEME_V1,
  CONTENT_FINGERPRINT_SCHEME_V2,
  contentKinds,
} from '../../catalog/content-identity';
import {
  catalogContentAliasKinds,
  catalogContentFingerprintRoles,
  catalogContentKeyKinds,
  catalogContentLayers,
  catalogContentMatchDecisions,
} from '../../catalog/content-registry';
import { authoredContentKinds } from '../../authoring/contracts';
import {
  HEADING_ONLY_DESCRIPTION,
  nonEmptySubclassFeatureDescription,
  type SubclassFeatureDescription,
} from '../subclass-feature-description';

/**
 * PER-TABLE ROW CONTRACTS FOR UNTRUSTED ROWS.
 *
 * The portable character backup is a foreign artifact: a JSON document a user
 * hands us, whose `tables.<name>[]` entries are written into SQLite VERBATIM BY
 * COLUMN NAME (`insertPortableRow` in `src/backup/character-backup.ts`). Before
 * this module the backup validator checked ownership, unique ids and catalog
 * references but NEVER the shape of a row — a row carrying an unknown column
 * reached the INSERT statement, and a row carrying a JSON object where a string
 * belongs reached the driver.
 *
 * WHERE THE CONTRACTS COME FROM.
 * `generated/column-facts.ts` is produced at build time by running drizzle-zod
 * over `db/schema/*.ts`. It is the single source of truth for which columns
 * exist and which are nullable. This module never restates either.
 *
 * WHAT DRIZZLE-ZOD COULD NOT DO, AND WHAT REPLACES IT.
 * Most text-ish columns come out of drizzle-zod as `z.any()`, because they are
 * Drizzle `customType` columns (`db/schema/columns.ts`) and a custom type
 * carries no runtime schema. Shipping those as `z.any()` would be validation
 * theatre, so every one is refined: JSON columns get their shape from
 * `./json-columns.ts`, and the rest are refined by `REFINEMENTS` below. The
 * split is COMPILE-ENFORCED and the two sides cannot overlap:
 * `REFINEMENTS satisfies Record<RequiredRefinementKey, …>` fails to compile if a
 * degraded column has neither a refinement nor a JSON classification, and
 * `RequiredRefinementKey` excludes the JSON columns, so declaring one in both
 * places is also a compile error.
 *
 * JSON COLUMNS ARE CLASSIFIED ELSEWHERE, ON PURPOSE.
 * `./json-columns.ts` says which TEXT columns hold serialized JSON and what
 * shape each column's READER requires. A single "parses as JSON" refinement was
 * measured to be wrong in both directions — `allowed_spell_lists = '{}'` parses
 * and then silently erases a slot's spell restrictions, while `config = ''` is
 * refused here although `jsonRecord` deliberately reads it as `{}`. The
 * classification is shared with `src/db/candidate-audit.ts` so a backup document
 * and a restored image are held to exactly the same standard.
 *
 * THE D6b GUARD, AND EXACTLY WHAT IT DOES NOT SEE.
 * D6b governs: "a contract stricter than the column will reject valid rows on
 * import, which is a data-loss bug". `_NoOverTightening` at the bottom of this
 * file discharges the part of that a type can discharge — see its own comment
 * for the precise, deliberately narrow claim. It does NOT see any narrowing that
 * `z.infer` erases, and `.min(1)` on a `varchar NOT NULL` is exactly such a
 * narrowing: the model type is `string`, `''` is a member of it, and the guard
 * still compiles. Those narrowings are therefore declared by hand in
 * {@link NARROWED_REFINEMENTS} and each one is proved to reject by
 * `tests/unit/contracts/row-contracts.test.ts`. A new ad-hoc narrowing cannot be
 * smuggled in: every value of `REFINEMENTS` must be one of the shared schemas in
 * {@link COLUMN_REFINEMENTS}, and that is asserted by test.
 *
 * DELIBERATELY NOT PINNED.
 * Timestamp FORMAT is not constrained past "is a string". The writers disagree
 * — `src/character/character-state.ts` uses SQLite `CURRENT_TIMESTAMP`
 * (`YYYY-MM-DD HH:MM:SS`) while ~20 call sites use `new Date().toISOString()`
 * — so any single format would reject rows this application itself produces.
 * `z.string()` is still a real constraint: it refuses the objects, arrays and
 * numbers that a hostile document would use.
 *
 * STRING LENGTH is not constrained either, except on the two columns where the
 * pre-existing validator already required non-emptiness. An empty
 * `display_name` or `slot_key` is a poor row, not a dangerous one, and refusing
 * it would reject a row the schema permits for no security gain.
 */

// --- shared column refinements -------------------------------------------

/** Any TEXT/VARCHAR value. Rejects every non-string, which is the point. */
const sqlText = z.string();

/**
 * TEXT/VARCHAR that must not be empty.
 *
 * Used on exactly the two columns where the PRE-EXISTING backup validator
 * already required a non-empty string, so this changes nothing about which
 * documents are accepted: `characters.name`
 * (`Character backup character.name must be a non-empty string`) and
 * `character_source_instances.instance_uuid`
 * (`instance_uuid must be a unique non-empty string`). Both of those checks are
 * still in `src/backup/character-backup.ts` and both are stricter than this one.
 * It is registered in {@link NARROWED_REFINEMENTS} regardless, because the
 * compile guard cannot see it.
 */
const nonEmptyText = z.string().min(1);

/**
 * D152 reserves the named empty state for bundled heading-only feature rows;
 * authored/imported feature prose occupies the branded non-empty state.
 */
const subclassFeatureDescription: z.ZodType<
  SubclassFeatureDescription,
  string
> = z.union([
  z.literal(HEADING_ONLY_DESCRIPTION),
  nonEmptyText.transform(nonEmptySubclassFeatureDescription),
]);

/** A DATETIME column. Format deliberately unpinned — see the module comment. */
const sqlTimestamp = z.string();

/**
 * A `TINYINT(1)` column.
 *
 * SQLite stores 0/1 and the export path produces numbers, but the pre-existing
 * validator accepted a JSON `true`/`false` for `characters.allow_legacy`, and
 * narrowing that away here would be a weakening of nothing and a rejection of
 * documents that are accepted today.
 */
const sqlBool = z.union([z.literal(0), z.literal(1), z.boolean()]);

/** A row id or a reference to one. */
const positiveInt = z.int().min(1);

/** An ability score, matching the range the backup validator already enforced. */
const abilityScore = z.int().min(1).max(30);

/**
 * A CLASS level, 1..20.
 *
 * THREE COLUMNS USE THIS AND THEY DO NOT ALL HAVE THE SAME SAFETY ARGUMENT.
 * Two of them are backed by a CHECK; the third is not, and pretending otherwise
 * was the whole of F11.
 *
 * ── The two CHECK-backed columns (`character_hit_point_rolls.class_level`,
 * `class_weapon_mastery_counts.class_level`) ──
 *
 * D13 recorded this as a divergence and said which way to close it: the schema
 * constrains `class_weapon_mastery_counts.class_level` to 1..20, the contract
 * accepted any positive integer, and the fix is to TIGHTEN the contract rather
 * than loosen the constraint. Tightening cannot lose data there. The CHECK has
 * been on the table since it was created, so no database can hold a row outside
 * the range, and a portable backup is generated from such a database — there is
 * no legitimate document carrying a class level of 0 or 21 for this contract to
 * reject.
 *
 * ── `character_class_levels.level`, which HAS NO CHECK — F11, implemented ──
 *
 * THE PARAGRAPH ABOVE DOES NOT TRANSFER, and F11 said so explicitly: the
 * argument there rests on the CHECK, and this column deliberately has none
 * (`db/schema/character.ts` records why —
 * `tests/integration/rules/class-progression.test.ts` writes level 21 through
 * RAW SQL to force a missing progression row, which no contract sees). So the
 * database CAN hold a 21 and the safety argument has to be made from the
 * WRITERS instead of from the storage:
 *
 *  1. **No writer in this application can emit one.** All three bound the value
 *     before it is stored — `add-source.ts:220` and `update-class.ts:111` throw
 *     "Class level must be between 1 and 20", and share import refuses
 *     `classes[i].level` outside 1..20 in `src/sharing/schema.ts`. So no
 *     document any version of this app has ever produced carries a level
 *     outside the range, and the contract rejects nothing a user could own.
 *  2. **The one path that could deliver a 21 is the one the contracts exist
 *     for.** `src/backup/character-backup.ts` calls a backup document "a
 *     foreign artifact written into SQLite verbatim by column name". An
 *     unbounded level arriving that way reaches the proficiency bonus, the hit
 *     point maximum and the multiclass slot table and produces plausible wrong
 *     numbers with no error anywhere — which is the failure the whole layer
 *     exists to stop, not an edge case it may waive.
 *  3. **It is symmetric, so it cannot strand a database.** These contracts gate
 *     the EXPORT path too. A stored 21 therefore fails on the way OUT, naming
 *     the row, rather than producing a document this application's own importer
 *     would refuse. That is the outcome to want: the alternative — export
 *     succeeds, import fails — is a backup whose uselessness is only discovered
 *     when it is needed. Pinned by `tests/integration/backup/row-contracts.ts`.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO is bound the COMBINED total across
 * classes. That rule is real and the guided builder enforces it, but D11 part 2
 * puts it on the sheet, not at the boundary: refusing a whole document over a
 * multiclass total would lose a character to state a number. See
 * `total_level_exceeds_maximum` in `src/rules/sheet.ts`.
 */
const classLevel = z.int().min(1).max(20);

const featAbilityPointsEnum = z.union([
  z.literal(featAbilityPoints[0]),
  z.literal(featAbilityPoints[1]),
  z.literal(featAbilityPoints[2]),
]);

const nonNegativeInt = z.int().min(0);

/**
 * A signed integer that must not be zero — `character_effects.amount`, the
 * `ability_increase` payload. A zero contribution is not a contribution; it is
 * a row that changes nothing and can never be noticed, and the column's own
 * CHECK (`character_effects_amount_check`) refuses it for the same reason.
 * Registered in {@link NARROWED_REFINEMENTS} because `.refine()` is invisible
 * to `z.infer` and the compile guard cannot see the narrowing.
 */
const nonZeroInt = z
  .int()
  .refine((value) => value !== 0, { message: 'must not be zero' });

/** What an `integer()` column gets when it needs nothing narrower. */
const sqlInteger = z.int();

const rulesEditionEnum = z.enum(rulesEditions);
const abilityEnum = z.enum(abilities);
const abilityAllocationMethodEnum = z.enum(abilityAllocationMethods);
const sourceTypeEnum = z.enum(domainSourceTypes);
const slotBucketEnum = z.enum(slotBuckets);
const slotStateEnum = z.enum(slotStates);
const skillGrantStateEnum = z.enum(skillGrantStates);
const levelFeatChoiceKindEnum = z.enum(levelFeatChoiceKinds);
const spellbookAcquisitionStateEnum = z.enum(spellbookAcquisitionStates);
const selectionEligibilityEnum = z.enum(selectionEligibilities);
const weaponMasteryPropertyEnum = z.enum(weaponMasteryProperties);
const weaponMasteryGrantEnum = z.enum(weaponMasteryGrants);
const srdWeaponGroupEnum = z.enum(srdWeaponGroups);
const weaponAttackKindEnum = z.enum(weaponAttackKinds);
const classResourceKindEnum = z.enum(classResourceKinds);
const classFormulaResourceKindEnum = z.enum(classFormulaResourceKinds);
const classResourceFormulaKindEnum = z.enum(classResourceFormulaKinds);
const resourceFormulaAbilityEnum = z.enum(resourceFormulaAbilities);
/**
 * D27's `simple | martial` on a character's weapon.
 *
 * SEPARATE FROM `srdWeaponGroupEnum` and not a widening of it. That one is the
 * source's four table HEADINGS and lives only on `weapon_templates`; this is the
 * two categories the Core Traits tables grant proficiency in. A single enum over
 * all six would let `martial_ranged` be stored on a character's weapon, where it
 * would match no class's proficiency grant and silently read as "not
 * proficient".
 */
const weaponProficiencyCategoryEnum = z.enum(weaponProficiencyCategories);
const weaponDamageKindEnum = z.enum([
  'dice',
  'flat',
  'custom',
  'not_recorded',
]);
const versatileWeaponDamageKindEnum = z.enum([
  'dice',
  'flat',
  'custom',
  'not_applicable',
]);
const weaponRangeKindEnum = z.enum(weaponRangeKinds);
/**
 * The closed set of mechanical effects a character or a template can carry.
 *
 * An enum and not `sqlText`, unlike `creature_type` / `size` / `damage_type`
 * beside it — the difference is not tidiness. Those three are OPEN vocabularies
 * by decision (see `db/schema/origins.ts`), so a contract narrowing them would
 * reject rows the schema permits. `effect_kind` is closed in the schema too, by
 * `character_effects_kind_check` and its catalog twin, and a value outside it
 * reads as "no effect" to `src/rules/species-effects.ts` — mechanics that
 * vanish with no error anywhere.
 */
const effectKindEnum = z.enum(effectKinds);
const speciesTemplateEffectKindEnum = z.enum(speciesTemplateEffectKinds);
/**
 * `character_effects.effect_kind`'s OWN, wider enum (AC-1) — see
 * `characterEffectKinds` in `src/domain/enums.ts`. Deliberately a SEPARATE
 * schema from {@link effectKindEnum} rather than a widening of it:
 * `species_template_trait_effects.effect_kind` keeps the narrower one, and a
 * shared schema would let an AC-1 kind pass validation for a row it can never
 * legally belong to.
 */
const characterEffectKindEnum = z.enum(characterEffectKinds);
const featureTemplateEffectKindEnum = z.enum(featureTemplateEffectKinds);
/**
 * The weapon-scope vocabulary `character_effects.weapon_scope` reuses from
 * Extra Attack's own grant model (AC-1, D72) — see the column's comment in
 * `db/schema/origins.ts` for why one vocabulary serves both questions.
 */
const extraAttackWeaponScopeEnum = z.enum(extraAttackWeaponScopes);
const armorSlotEnum = z.enum(armorSlots);
const armorCategoryEnum = z.enum(armorCategories);
const armorDexBonusEnum = z.enum(armorDexBonuses);
/**
 * The eighteen skills, closed. An enum rather than `sqlText` for the reason
 * `character_skill_proficiencies_skill_check` gives: `abilityForSkill` is an
 * exhaustive map over exactly this vocabulary, so a nineteenth value has no
 * ability to be checked with and reads as "no modifier" to any non-exhaustive
 * branch — a proficiency that vanishes with no error anywhere.
 */
const skillEnum = z.enum(skills);
/**
 * The two printed equipment packages, and the four kinds of line one may hold.
 *
 * Enums rather than `sqlText` for the reason `effectKindEnum` gives one screen
 * up: both are closed in the schema too, and a value outside `item_kind` reads
 * as no payload at all to
 * `describeBackgroundEquipmentItem`'s exhaustive switch — an item that vanishes
 * with no error anywhere.
 */
const backgroundEquipmentOptionEnum = z.enum(backgroundEquipmentOptions);
const classEquipmentOptionEnum = z.enum(classEquipmentOptions);
const equipmentItemKindEnum = z.enum(equipmentItemKinds);
const spellRangeKindEnum = z.enum(spellRangeKinds);
const spellAreaShapeEnum = z.enum(spellAreaShapes);
const materialCostKindEnum = z.enum(materialCostKinds);
const effectReliabilityCategoryEnum = z.enum(effectReliabilityCategories);

/**
 * Open-vocabulary schemas transform the storage string to the domain union
 * without rejecting unknown members. The transformation is identity at
 * runtime; its output type carries the vocabulary-specific passthrough brand.
 */
const spellSchoolVocabulary = z.string().transform(spellSchool);
const damageTypeVocabulary = z.string().transform(damageType);
const conditionTypeVocabulary = z.string().transform(conditionType);
const creatureTypeVocabulary = z.string().transform(creatureType);
const creatureSizeVocabulary = z.string().transform(creatureSize);
const damageTypeEnum = z.enum(damageTypes);
const creatureTypeEnum = z.enum(creatureTypes);
const creatureSizeEnum = z.enum(creatureSizes);
const contentKindEnum = z.enum(contentKinds);
const authoredContentKindEnum = z.enum(authoredContentKinds);
const contentKeyKindEnum = z.enum(catalogContentKeyKinds);
const contentLayerEnum = z.enum(catalogContentLayers);
const contentFingerprintSchemeEnum = z.union([
  z.literal(CONTENT_FINGERPRINT_SCHEME_V1),
  z.literal(CONTENT_FINGERPRINT_SCHEME_V2),
]);
const contentFingerprintRoleEnum = z.enum(catalogContentFingerprintRoles);
const contentAliasKindEnum = z.enum(catalogContentAliasKinds);
const contentMatchDecisionEnum = z.enum(catalogContentMatchDecisions);
const contentFingerprintDigest = z.string().regex(/^[0-9a-f]{64}$/);

/**
 * THE CLOSED SET of shared refinements.
 *
 * `REFINEMENTS` below may only use these. The test that asserts it is what stops
 * someone adding an inline `z.string().min(3)` to one column: an unregistered
 * schema fails the closed-set check, and a registered one must declare whether
 * it narrows the model type.
 */
export const COLUMN_REFINEMENTS = {
  sqlText,
  nonEmptyText,
  subclassFeatureDescription,
  sqlTimestamp,
  sqlBool,
  positiveInt,
  abilityScore,
  classLevel,
  featAbilityPointsEnum,
  nonNegativeInt,
  nonZeroInt,
  sqlInteger,
  rulesEditionEnum,
  abilityEnum,
  abilityAllocationMethodEnum,
  sourceTypeEnum,
  slotBucketEnum,
  slotStateEnum,
  skillGrantStateEnum,
  levelFeatChoiceKindEnum,
  spellbookAcquisitionStateEnum,
  selectionEligibilityEnum,
  weaponMasteryPropertyEnum,
  weaponMasteryGrantEnum,
  srdWeaponGroupEnum,
  weaponAttackKindEnum,
  classResourceKindEnum,
  classFormulaResourceKindEnum,
  classResourceFormulaKindEnum,
  resourceFormulaAbilityEnum,
  weaponProficiencyCategoryEnum,
  weaponDamageKindEnum,
  versatileWeaponDamageKindEnum,
  weaponRangeKindEnum,
  effectKindEnum,
  featureTemplateEffectKindEnum,
  speciesTemplateEffectKindEnum,
  characterEffectKindEnum,
  extraAttackWeaponScopeEnum,
  armorSlotEnum,
  armorCategoryEnum,
  armorDexBonusEnum,
  skillEnum,
  backgroundEquipmentOptionEnum,
  classEquipmentOptionEnum,
  equipmentItemKindEnum,
  spellRangeKindEnum,
  spellAreaShapeEnum,
  materialCostKindEnum,
  effectReliabilityCategoryEnum,
  spellSchoolVocabulary,
  damageTypeVocabulary,
  conditionTypeVocabulary,
  creatureTypeVocabulary,
  creatureSizeVocabulary,
  damageTypeEnum,
  creatureTypeEnum,
  creatureSizeEnum,
  contentKindEnum,
  authoredContentKindEnum,
  contentKeyKindEnum,
  contentLayerEnum,
  contentFingerprintSchemeEnum,
  contentFingerprintRoleEnum,
  contentAliasKindEnum,
  contentMatchDecisionEnum,
  contentFingerprintDigest,
} as const;

/**
 * EVERY REFINEMENT THAT ACCEPTS LESS THAN THE DRIZZLE MODEL TYPE PERMITS.
 *
 * `_NoOverTightening` compares `z.infer` of the contract against
 * `InferSelectModel` of the table, and `z.infer` erases `.min()`, `.max()` and
 * `.refine()` — `z.string().min(1)` infers as `string`, so a length constraint
 * is invisible to it. Rather than let that hide, each such narrowing is listed
 * here with the value it refuses and the reason it is defensible, and
 * `tests/unit/contracts/row-contracts.test.ts` proves every `rejects` value is
 * genuinely refused. Enum refinements are absent on purpose: `z.enum` DOES
 * survive `z.infer`, so the compile guard already proves each enum matches the
 * column's declared domain type.
 */
export const NARROWED_REFINEMENTS: readonly {
  readonly name: keyof typeof COLUMN_REFINEMENTS;
  readonly rejects: unknown;
  readonly reason: string;
}[] = [
  {
    name: 'nonEmptyText',
    rejects: '',
    reason:
      'Pre-existing: the backup validator already refused an empty characters.name and instance_uuid, with stricter checks that still run.',
  },
  {
    name: 'positiveInt',
    rejects: 0,
    reason:
      'Pre-existing: `positiveInteger()` in the backup validator refused a non-positive id, reference or proficiency_bonus_override.',
  },
  {
    name: 'abilityScore',
    rejects: 31,
    reason:
      'Pre-existing: the backup validator required 1..30, and `update-ability.ts:30` enforces the same range on every write.',
  },
  {
    name: 'classLevel',
    rejects: 21,
    reason:
      'Two of the three columns match a `class_level BETWEEN 1 AND 20` CHECK carried since their table was created, so no stored row and no backup generated from one can fall outside it (D13). The third, `character_class_levels.level`, has NO CHECK and rests on a different argument: all three of its writers refuse a level outside 1..20, so no document this application has produced carries one (F11).',
  },
  {
    name: 'nonNegativeInt',
    rejects: -1,
    reason:
      'Pre-existing for characters.revision. New for spell_selection_slots.ordinal, whose only writer is a loop index — a negative ordinal cannot be produced by this application.',
  },
  {
    name: 'nonZeroInt',
    rejects: 0,
    reason:
      'Matches the character_effects_amount_check CHECK carried since the column was created, so no stored row and no artifact generated from one can hold a zero amount. A zero ability contribution changes nothing and can never be noticed; the schema and this contract refuse it together.',
  },
  {
    name: 'sqlInteger',
    rejects: 1.5,
    reason:
      'What drizzle-zod itself established for an `integer()` column, and what the pre-existing validator asserted with `Number.isSafeInteger`.',
  },
  {
    name: 'contentFingerprintDigest',
    rejects: 'not-a-sha256-digest',
    reason:
      'Matches the registry tables’ lowercase 64-hex CHECK constraints exactly.',
  },
];

// --- the tables that get a row contract ------------------------------------

/**
 * Every table whose rows a portable backup writes.
 *
 * `BackupTable` is derived from `TABLE_SCOPES`, so classifying a new table as
 * `backup: true` makes it a member here — and since `REFINEMENTS` must then
 * cover its degraded columns, the new table cannot reach `insertPortableRow`
 * without a contract. `characters` is added by hand because the aggregate root
 * is deliberately all-false in the scope table: it travels in the document's
 * own `character` field, not through the table loop.
 */
export type RowContractTable =
  | 'characters'
  | BackupTable
  | NativeContractTable;

/**
 * Tables that get a row contract WITHOUT being backup-scoped.
 *
 * `BackupTable` is the reason most contracts exist — a backup document is a
 * foreign artifact written into SQLite verbatim by column name — but it is not
 * the only reason a row can be untrusted or worth checking before it is
 * written:
 *
 *  - `weapon_templates` rows are PARSED out of `docs/srd/source/weapons-table.txt`
 *    by `src/rules/weapons-srd.ts`. A parser is exactly the kind of writer that
 *    can produce a plausible-looking wrong row, and the contract is what stands
 *    between a mis-parse and 38 quietly wrong catalog entries.
 *  - `character_weapons` rows are assembled from a user-authored command
 *    payload in `src/commands/weapons.ts`.
 *  - the two mastery tables are seeded from the progression extract by the same
 *    parser.
 *  - spell-catalog rows in a character backup are user-authored definitions
 *    arriving from an untrusted JSON artifact.
 *
 * Listing them here is what makes their nullability DERIVED rather than
 * restated: `columnSchema` reads `COLUMN_FACTS`, and `_NoOverTightening` below
 * fails to compile if any of these contracts refuses a value the column allows.
 */
type NativeContractTable =
  | 'catalog_content_identities'
  | 'catalog_content_archive_members'
  | 'catalog_content_drafts'
  | 'catalog_content_fingerprints'
  | 'catalog_content_aliases'
  | 'catalog_content_match_decisions'
  | 'catalog_content_supersessions'
  | 'feat_definitions'
  | 'character_weapons'
  | 'weapon_templates'
  | 'item_definitions'
  | 'item_definition_effects'
  | 'class_weapon_mastery_grants'
  | 'class_weapon_mastery_counts'
  | 'class_resources'
  | 'class_resource_formulas'
  // The origins TEMPLATE tables. Same reason `weapon_templates` is here: their
  // rows are PARSED out of `docs/srd/source/species-descriptions.txt` and
  // `docs/srd/source/backgrounds.txt` by `src/rules/origins-srd.ts`, and a
  // parser is exactly the writer that can produce a plausible-looking wrong
  // row. The three CHARACTER-side origin tables are not listed: they are
  // `backup: true` and arrive through `BackupTable` already.
  | 'species_templates'
  | 'species_template_traits'
  | 'species_template_trait_effects'
  | 'background_templates'
  | 'background_template_effects'
  | 'background_equipment_items'
  | 'subclass_features'
  | 'subclass_feature_effects'
  | 'class_equipment_items'
  // Every carried user-authored spell row crosses the same untrusted backup
  // boundary as the character-owned tables.
  | SpellDefinitionTable;

type Facts = typeof COLUMN_FACTS;

/**
 * A degraded column needs a refinement UNLESS it is a JSON column, which gets
 * its contract from `./json-columns.ts` instead. Excluding them from both key
 * unions makes the two sources mutually exclusive by construction: a column
 * cannot be classified in both places, so there is never a question of which
 * one wins.
 */
type RequiredRefinementKey = Exclude<
  { [T in RowContractTable]: DegradedColumnKey<T> }[RowContractTable],
  JsonColumnKey
>;

type OptionalRefinementKey = Exclude<
  { [T in RowContractTable]: AnyColumnKey<T> }[RowContractTable],
  JsonColumnKey
>;

/**
 * THE REFINEMENT TABLE.
 *
 * Required for every column drizzle-zod degraded to `z.any()` that is not a
 * classified JSON column; permitted for any other contracted column that
 * deserves a narrower check than "an integer".
 *
 * The enum choices are NOT a second transcription of the schema: the Drizzle
 * declaration writes `varchar<RulesEdition>()` using the type from
 * `src/domain/enums.ts` and this table uses the VALUE array from that same
 * module, so there is one source. `_NoOverTightening` proves the pairing —
 * naming the wrong enum for a column stops compiling.
 *
 * Columns declared as a plain `varchar()` deliberately get a text refinement
 * rather than an enum even where a single writer happens to produce enum-like
 * values (`eligibility_kind`, `character_source_instances.state`): inventing a
 * constraint the schema does not declare is exactly the over-tightening D6b
 * forbids.
 */
const REFINEMENTS = {
  // --- catalog content identity registry ---------------------------------
  'catalog_content_identities.content_key': nonEmptyText,
  'catalog_content_identities.content_kind': contentKindEnum,
  'catalog_content_identities.key_kind': contentKeyKindEnum,
  'catalog_content_identities.catalog_layer': contentLayerEnum,
  'catalog_content_identities.normalized_name': nonEmptyText,
  'catalog_content_identities.created_at': sqlTimestamp,
  'catalog_content_identities.archived_at': sqlTimestamp,

  'catalog_content_archive_members.content_kind': authoredContentKindEnum,
  'catalog_content_archive_members.content_key': sqlText,
  'catalog_content_archive_members.character_id': positiveInt,
  'catalog_content_archive_members.character_revision': nonNegativeInt,
  'catalog_content_archive_members.character_name': sqlText,
  'catalog_content_archive_members.archived_at': sqlTimestamp,

  'catalog_content_fingerprints.content_kind': contentKindEnum,
  'catalog_content_fingerprints.fingerprint_scheme':
    contentFingerprintSchemeEnum,
  'catalog_content_fingerprints.fingerprint_digest':
    contentFingerprintDigest,
  'catalog_content_fingerprints.canonical_json': sqlText,
  'catalog_content_fingerprints.content_key': nonEmptyText,
  'catalog_content_fingerprints.fingerprint_role':
    contentFingerprintRoleEnum,

  'catalog_content_aliases.content_kind': contentKindEnum,
  'catalog_content_aliases.alias_key': nonEmptyText,
  'catalog_content_aliases.content_key': nonEmptyText,
  'catalog_content_aliases.alias_kind': contentAliasKindEnum,

  'catalog_content_match_decisions.content_kind': contentKindEnum,
  'catalog_content_match_decisions.incoming_fingerprint_scheme':
    contentFingerprintSchemeEnum,
  'catalog_content_match_decisions.incoming_fingerprint_digest':
    contentFingerprintDigest,
  'catalog_content_match_decisions.decision': contentMatchDecisionEnum,
  'catalog_content_match_decisions.target_content_key': nonEmptyText,
  'catalog_content_match_decisions.reviewed_at': sqlTimestamp,

  'catalog_content_supersessions.content_kind': contentKindEnum,
  'catalog_content_supersessions.superseded_content_key': nonEmptyText,
  'catalog_content_supersessions.successor_content_key': nonEmptyText,
  'catalog_content_supersessions.recorded_at': sqlTimestamp,

  'catalog_content_drafts.draft_uuid': nonEmptyText,
  'catalog_content_drafts.content_kind': authoredContentKindEnum,
  'catalog_content_drafts.document_version': positiveInt,
  'catalog_content_drafts.base_content_key': sqlText,
  'catalog_content_drafts.revision': nonNegativeInt,
  'catalog_content_drafts.document_json': nonEmptyText,
  'catalog_content_drafts.created_at': sqlTimestamp,
  'catalog_content_drafts.updated_at': sqlTimestamp,

  // --- bundled feat catalog -----------------------------------------------
  'feat_definitions.id': positiveInt,
  'feat_definitions.content_key': nonEmptyText,
  'feat_definitions.name': nonEmptyText,
  'feat_definitions.rules_edition': rulesEditionEnum,
  // Open for homebrew grouping names; bundled content writes the four known
  // source-shaped groupings.
  'feat_definitions.category': sqlText,
  'feat_definitions.min_level': classLevel,
  'feat_definitions.ability_points': featAbilityPointsEnum,
  'feat_definitions.ability_increase_maximum': abilityScore,
  'feat_definitions.repeatable': sqlBool,
  'feat_definitions.notes': sqlText,
  'feat_definitions.created_at': sqlTimestamp,
  'feat_definitions.updated_at': sqlTimestamp,

  // --- user-imported spell catalog ----------------------------------------
  'spell_identities.id': positiveInt,
  'spell_identities.content_key': sqlText,
  'spell_identities.canonical_name': sqlText,
  'spell_identities.normalized_name': sqlText,
  'spell_identities.notes': sqlText,
  'spell_identities.created_at': sqlTimestamp,
  'spell_identities.updated_at': sqlTimestamp,

  'spell_identity_aliases.id': positiveInt,
  'spell_identity_aliases.spell_identity_id': positiveInt,
  'spell_identity_aliases.alias': sqlText,
  'spell_identity_aliases.normalized_alias': sqlText,
  'spell_identity_aliases.created_at': sqlTimestamp,
  'spell_identity_aliases.updated_at': sqlTimestamp,

  'spell_list_memberships.id': positiveInt,
  'spell_list_memberships.spell_version_id': positiveInt,
  'spell_list_memberships.spell_list_key': sqlText,
  'spell_list_memberships.created_at': sqlTimestamp,
  'spell_list_memberships.updated_at': sqlTimestamp,

  'spell_version_publications.id': positiveInt,
  'spell_version_publications.spell_version_id': positiveInt,
  'spell_version_publications.source_book': sqlText,
  'spell_version_publications.source_reference': sqlText,
  'spell_version_publications.created_at': sqlTimestamp,
  'spell_version_publications.updated_at': sqlTimestamp,

  'spell_version_tags.id': positiveInt,
  'spell_version_tags.spell_version_id': positiveInt,
  'spell_version_tags.tag': sqlText,

  'spell_version_attack_modes.id': positiveInt,
  'spell_version_attack_modes.spell_version_id': positiveInt,
  'spell_version_attack_modes.attack_mode': sqlText,

  'spell_version_save_abilities.id': positiveInt,
  'spell_version_save_abilities.spell_version_id': positiveInt,
  'spell_version_save_abilities.save_ability': sqlText,

  'spell_version_upcast_levels.id': positiveInt,
  'spell_version_upcast_levels.spell_version_id': positiveInt,

  'spell_version_cantrip_upgrade_levels.id': positiveInt,
  'spell_version_cantrip_upgrade_levels.spell_version_id': positiveInt,

  'spell_versions.id': positiveInt,
  'spell_versions.content_key': nonEmptyText,
  'spell_versions.spell_identity_id': positiveInt,
  'spell_versions.display_name': nonEmptyText,
  'spell_versions.forked_from_content_key': sqlText,
  // Deliberately open: placeholder import writes an arbitrary key prefix.
  'spell_versions.rules_edition': sqlText,
  'spell_versions.school': spellSchoolVocabulary,
  'spell_versions.ritual': sqlBool,
  'spell_versions.concentration': sqlBool,
  'spell_versions.casting_time': sqlText,
  'spell_versions.action_type': sqlText,
  'spell_versions.range': sqlText,
  'spell_versions.range_kind': spellRangeKindEnum,
  'spell_versions.area_shape': spellAreaShapeEnum,
  'spell_versions.duration': sqlText,
  'spell_versions.components': sqlText,
  'spell_versions.material_component_summary': sqlText,
  'spell_versions.material_cost_kind': materialCostKindEnum,
  'spell_versions.healing': sqlBool,
  'spell_versions.short_summary': sqlText,
  'spell_versions.upcast_summary': sqlText,
  'spell_versions.cantrip_upgrade_summary': sqlText,
  'spell_versions.requires_mod_for_effect': sqlBool,
  'spell_versions.effect_reliability_category':
    effectReliabilityCategoryEnum,
  'spell_versions.provenance': nonEmptyText,
  'spell_versions.seed_version': sqlText,
  'spell_versions.is_active': sqlBool,
  'spell_versions.created_at': sqlTimestamp,
  'spell_versions.updated_at': sqlTimestamp,

  'spell_version_damage_types.id': positiveInt,
  'spell_version_damage_types.spell_version_id': positiveInt,
  'spell_version_damage_types.damage_type': damageTypeVocabulary,

  'spell_version_conditions.id': positiveInt,
  'spell_version_conditions.spell_version_id': positiveInt,
  'spell_version_conditions.condition_type': conditionTypeVocabulary,

  // --- characters ---------------------------------------------------------
  'characters.id': positiveInt,
  'characters.name': nonEmptyText,
  'characters.strength': abilityScore,
  'characters.dexterity': abilityScore,
  'characters.constitution': abilityScore,
  'characters.intelligence': abilityScore,
  'characters.wisdom': abilityScore,
  'characters.charisma': abilityScore,
  // Nullability comes from COLUMN_FACTS, never restated here: `columnSchema`
  // adds `| null` because the column is nullable, and NULL means never
  // allocated (plan §3.1).
  'characters.ability_allocation_method': abilityAllocationMethodEnum,
  'characters.proficiency_bonus_override': positiveInt,
  'characters.rules_edition_preference': rulesEditionEnum,
  'characters.allow_legacy': sqlBool,
  'characters.revision': nonNegativeInt,
  'characters.alignment': sqlText,
  'characters.appearance': sqlText,
  'characters.backstory': sqlText,
  'characters.notes': sqlText,
  'characters.archived_at': sqlTimestamp,
  'characters.created_at': sqlTimestamp,
  'characters.updated_at': sqlTimestamp,

  // --- character_class_levels ---------------------------------------------
  'character_class_levels.id': positiveInt,
  'character_class_levels.character_id': positiveInt,
  'character_class_levels.class_definition_id': positiveInt,
  'character_class_levels.subclass_definition_id': positiveInt,
  // F11: the ONLY level column in the schema with neither a CHECK nor a bounded
  // contract, and the number every sheet computation runs off. See `classLevel`
  // above for why the CHECK-backed columns' safety argument does not apply here
  // and what replaces it.
  'character_class_levels.level': classLevel,
  'character_class_levels.is_starting_class': sqlBool,
  'character_class_levels.spellcasting_ability_override': abilityEnum,
  'character_class_levels.notes': sqlText,
  'character_class_levels.created_at': sqlTimestamp,
  'character_class_levels.updated_at': sqlTimestamp,

  // --- character_source_instances -----------------------------------------
  'character_source_instances.id': positiveInt,
  'character_source_instances.character_id': positiveInt,
  'character_source_instances.instance_uuid': nonEmptyText,
  'character_source_instances.parent_source_instance_id': positiveInt,
  'character_source_instances.source_type': sourceTypeEnum,
  'character_source_instances.source_definition_id': positiveInt,
  'character_source_instances.display_name': sqlText,
  'character_source_instances.state': sqlText,
  'character_source_instances.notes': sqlText,
  'character_source_instances.created_at': sqlTimestamp,
  'character_source_instances.updated_at': sqlTimestamp,

  // --- spell_selection_slots ----------------------------------------------
  'spell_selection_slots.id': positiveInt,
  'spell_selection_slots.character_id': positiveInt,
  'spell_selection_slots.source_instance_id': positiveInt,
  'spell_selection_slots.slot_key': sqlText,
  'spell_selection_slots.rule_key': sqlText,
  'spell_selection_slots.ordinal': nonNegativeInt,
  'spell_selection_slots.bucket': slotBucketEnum,
  'spell_selection_slots.eligibility_kind': sqlText,
  'spell_selection_slots.fixed_spell_version_id': positiveInt,
  'spell_selection_slots.current_spell_version_id': positiveInt,
  'spell_selection_slots.label': sqlText,
  'spell_selection_slots.always_prepared': sqlBool,
  'spell_selection_slots.with_slots': sqlBool,
  'spell_selection_slots.counts_against_limit': sqlBool,
  'spell_selection_slots.required': sqlBool,
  'spell_selection_slots.is_locked': sqlBool,
  'spell_selection_slots.state': slotStateEnum,
  'spell_selection_slots.orphan_reason_code': sqlText,
  'spell_selection_slots.orphaned_at': sqlTimestamp,
  'spell_selection_slots.override_note': sqlText,
  'spell_selection_slots.notes': sqlText,
  'spell_selection_slots.created_at': sqlTimestamp,
  'spell_selection_slots.updated_at': sqlTimestamp,
  'spell_selection_slots.selection_collection': sqlText,
  'spell_selection_slots.selection_eligibility': selectionEligibilityEnum,
  'spell_selection_slots.selection_invalid_reason': sqlText,
  'spell_selection_slots.selection_acquired_at_class_level': classLevel,

  // --- wizard_spellbook_entries -------------------------------------------
  'wizard_spellbook_entries.id': positiveInt,
  'wizard_spellbook_entries.character_id': positiveInt,
  'wizard_spellbook_entries.source_instance_id': positiveInt,
  'wizard_spellbook_entries.rule_key': sqlText,
  'wizard_spellbook_entries.ordinal': positiveInt,
  'wizard_spellbook_entries.acquired_at_class_level': classLevel,
  'wizard_spellbook_entries.spell_version_id': positiveInt,
  'wizard_spellbook_entries.spell_level_min': nonNegativeInt,
  'wizard_spellbook_entries.spell_level_max': nonNegativeInt,
  'wizard_spellbook_entries.state': spellbookAcquisitionStateEnum,
  'wizard_spellbook_entries.orphan_reason_code': sqlText,
  'wizard_spellbook_entries.orphaned_at': sqlTimestamp,
  'wizard_spellbook_entries.selection_eligibility':
    selectionEligibilityEnum,
  'wizard_spellbook_entries.selection_invalid_reason': sqlText,
  'wizard_spellbook_entries.created_at': sqlTimestamp,
  'wizard_spellbook_entries.updated_at': sqlTimestamp,

  // --- character_spell_preferences ----------------------------------------
  'character_spell_preferences.id': positiveInt,
  'character_spell_preferences.character_id': positiveInt,
  'character_spell_preferences.spell_version_id': positiveInt,
  'character_spell_preferences.favourite': sqlBool,
  'character_spell_preferences.notes': sqlText,
  'character_spell_preferences.created_at': sqlTimestamp,
  'character_spell_preferences.updated_at': sqlTimestamp,

  // --- character_rule_overrides -------------------------------------------
  'character_rule_overrides.id': positiveInt,
  'character_rule_overrides.character_id': positiveInt,
  'character_rule_overrides.rule_key': sqlText,
  'character_rule_overrides.note': sqlText,
  'character_rule_overrides.created_at': sqlTimestamp,
  'character_rule_overrides.updated_at': sqlTimestamp,

  // --- warning_acknowledgements -------------------------------------------
  'warning_acknowledgements.id': positiveInt,
  'warning_acknowledgements.character_id': positiveInt,
  'warning_acknowledgements.warning_fingerprint': sqlText,
  'warning_acknowledgements.note': sqlText,
  'warning_acknowledgements.invalidated_at': sqlTimestamp,
  'warning_acknowledgements.created_at': sqlTimestamp,
  'warning_acknowledgements.updated_at': sqlTimestamp,

  // --- character_save_points ----------------------------------------------
  'character_save_points.id': positiveInt,
  'character_save_points.character_id': positiveInt,
  // A save-point label is user-authored free text; an empty one is a poor label,
  // not an invalid row.
  'character_save_points.label': sqlText,
  // Not an enum: the one accepted value is asserted by the backup validator and
  // by the audit, which both compare against CHARACTER_SNAPSHOT_SCHEMA_VERSION.
  'character_save_points.schema_version': sqlText,
  'character_save_points.created_at': sqlTimestamp,
  'character_save_points.updated_at': sqlTimestamp,

  // --- spell_loadouts ------------------------------------------------------
  'spell_loadouts.id': positiveInt,
  'spell_loadouts.character_id': positiveInt,
  'spell_loadouts.name': sqlText,
  'spell_loadouts.notes': sqlText,
  'spell_loadouts.created_at': sqlTimestamp,
  'spell_loadouts.updated_at': sqlTimestamp,

  // --- spell_loadout_entries ----------------------------------------------
  'spell_loadout_entries.id': positiveInt,
  'spell_loadout_entries.spell_loadout_id': positiveInt,
  'spell_loadout_entries.spell_version_id': positiveInt,
  'spell_loadout_entries.role': sqlText,
  'spell_loadout_entries.created_at': sqlTimestamp,
  'spell_loadout_entries.updated_at': sqlTimestamp,

  // --- character_weapons ---------------------------------------------------
  // NOTE THE NULLABLE COLUMNS ARE NOT LISTED AS NULLABLE HERE. `columnSchema`
  // adds `| null` from `COLUMN_FACTS[table][column].notNull`, so a contract can
  // never be stricter than its column by accident — which is the whole D6b
  // point. The cross-column refinement below then proves the discriminator owns
  // exactly one payload without pretending any nullable payload is always set.
  'character_weapons.id': positiveInt,
  'character_weapons.character_id': positiveInt,
  // Non-empty: a weapon with no name cannot be picked out of a list, and the
  // add/update commands already refuse one.
  'character_weapons.name': nonEmptyText,
  // D46. Nullability is derived from the column facts: null means the copy has
  // no recorded melee/ranged fact and must not be classified from its range or
  // property columns.
  'character_weapons.attack_kind': weaponAttackKindEnum,
  // Dice and custom payloads remain open strings at this row-contract layer.
  // The discriminator and cross-column rule decide which payload is applicable;
  // custom preserves anything a user's table agreed on.
  'character_weapons.damage_kind': weaponDamageKindEnum,
  'character_weapons.damage_dice': sqlText,
  'character_weapons.damage_custom': sqlText,
  'character_weapons.damage_type': damageTypeVocabulary,
  'character_weapons.versatile_damage_kind': versatileWeaponDamageKindEnum,
  'character_weapons.versatile_damage_dice': sqlText,
  'character_weapons.versatile_damage_custom': sqlText,
  'character_weapons.finesse': sqlBool,
  'character_weapons.heavy': sqlBool,
  'character_weapons.light': sqlBool,
  'character_weapons.loading': sqlBool,
  'character_weapons.reach': sqlBool,
  'character_weapons.thrown': sqlBool,
  'character_weapons.two_handed': sqlBool,
  'character_weapons.ammunition': sqlBool,
  'character_weapons.ammunition_kind': sqlText,
  'character_weapons.range_kind': weaponRangeKindEnum,
  // D27. Nullability is DERIVED from the column facts, so this cannot be
  // stricter than the column: a weapon that arrived with no category — an older
  // share link, or one someone typed in — still passes, and the sheet says it
  // cannot check that weapon rather than refusing the row.
  'character_weapons.proficiency_category': weaponProficiencyCategoryEnum,
  'character_weapons.mastery_property': weaponMasteryPropertyEnum,
  'character_weapons.mastery_selected': sqlBool,
  'character_weapons.other_properties': sqlText,
  'character_weapons.notes': sqlText,
  'character_weapons.created_at': sqlTimestamp,
  'character_weapons.updated_at': sqlTimestamp,

  // --- the four stored sheet inputs ----------------------------------------
  // Nullability is DERIVED, not restated: `columnSchema` adds `| null` from
  // `COLUMN_FACTS[table][column].notNull`, so none of these can be stricter
  // than its column by accident.
  'character_armor.id': positiveInt,
  'character_armor.character_id': positiveInt,
  'character_armor.slot': armorSlotEnum,
  // Non-empty: armour with no name cannot be told apart from the unarmoured
  // case on the sheet, and the write command already refuses one.
  'character_armor.name': nonEmptyText,
  'character_armor.category': armorCategoryEnum,
  // At least 1 for every category. For `light`/`medium`/`heavy` this is a base
  // Armor Class and for `shield` it is the printed `+2` bonus — a distinction
  // `category` carries, not this contract.
  'character_armor.armor_class': positiveInt,
  'character_armor.dex_bonus': armorDexBonusEnum,
  // ZERO IS LEGITIMATE and `positiveInt` would be wrong: a cap of 0 is a
  // coherent house rule, and the pairing with `dex_bonus = 'capped'` is what
  // the CHECK enforces, not the magnitude.
  'character_armor.dex_bonus_max': nonNegativeInt,
  'character_armor.strength_requirement': positiveInt,
  'character_armor.stealth_disadvantage': sqlBool,
  'character_armor.notes': sqlText,
  'character_armor.created_at': sqlTimestamp,
  'character_armor.updated_at': sqlTimestamp,

  'character_hit_point_rolls.id': positiveInt,
  'character_hit_point_rolls.character_id': positiveInt,
  // The class this roll is filed under, by NAME. Non-empty because an empty
  // name matches no class and the roll would be permanently unreadable.
  'character_hit_point_rolls.class_name': nonEmptyText,
  'character_hit_point_rolls.class_level': classLevel,
  // `positiveInt` and not the tighter 1..12 the CHECK declares, deliberately
  // and in the same direction as `class_weapon_mastery_counts.class_level`: the
  // contract may not be STRICTER than the column, and the upper bound belongs
  // to the database and to the two boundaries, which all read
  // `SHEET_ROLL_BOUNDS`. A 13 clears this contract and dies at the CHECK.
  'character_hit_point_rolls.rolled_value': positiveInt,
  'character_hit_point_rolls.created_at': sqlTimestamp,
  'character_hit_point_rolls.updated_at': sqlTimestamp,

  'character_skill_proficiencies.id': positiveInt,
  'character_skill_proficiencies.character_id': positiveInt,
  'character_skill_proficiencies.skill': skillEnum,
  'character_skill_proficiencies.created_at': sqlTimestamp,
  'character_skill_proficiencies.updated_at': sqlTimestamp,

  // --- character_skill_grants ----------------------------------------------
  // The provenance source of truth the flat table above is a projection of.
  // Nullability is DERIVED, not restated: `columnSchema` adds `| null` from
  // the column facts, so `skill` — the defended "granted but unfilled" null —
  // cannot be tightened here by accident.
  'character_skill_grants.id': positiveInt,
  'character_skill_grants.character_id': positiveInt,
  'character_skill_grants.source_instance_id': positiveInt,
  // Open text, not an enum: the pinned literals live in
  // `SKILL_GRANT_KEYS` (src/builder/contracts.ts), and rule-driven feat keys
  // will join the vocabulary when that unit lands — closing it here would
  // refuse those rows at the backup boundary for no schema reason.
  'character_skill_grants.grant_key': nonEmptyText,
  // Matches the `>= 1` CHECK carried since the table was created (§3.6's
  // "positive ordinal"), so no stored row can fall outside it.
  'character_skill_grants.ordinal': positiveInt,
  'character_skill_grants.skill': skillEnum,
  'character_skill_grants.state': skillGrantStateEnum,
  'character_skill_grants.orphan_reason_code': sqlText,
  'character_skill_grants.orphaned_at': sqlTimestamp,
  'character_skill_grants.created_at': sqlTimestamp,
  'character_skill_grants.updated_at': sqlTimestamp,

  'character_skill_expertise_grants.id': positiveInt,
  'character_skill_expertise_grants.character_id': positiveInt,
  'character_skill_expertise_grants.source_instance_id': positiveInt,
  'character_skill_expertise_grants.grant_key': nonEmptyText,
  'character_skill_expertise_grants.ordinal': positiveInt,
  'character_skill_expertise_grants.granted_at_class_level': classLevel,
  'character_skill_expertise_grants.skill': skillEnum,
  'character_skill_expertise_grants.state': skillGrantStateEnum,
  'character_skill_expertise_grants.orphan_reason_code': sqlText,
  'character_skill_expertise_grants.orphaned_at': sqlTimestamp,
  'character_skill_expertise_grants.created_at': sqlTimestamp,
  'character_skill_expertise_grants.updated_at': sqlTimestamp,

  'character_level_feat_choices.id': positiveInt,
  'character_level_feat_choices.character_id': positiveInt,
  'character_level_feat_choices.character_class_level_id': positiveInt,
  'character_level_feat_choices.class_level': classLevel,
  'character_level_feat_choices.choice_kind': levelFeatChoiceKindEnum,
  'character_level_feat_choices.feat_source_instance_id': positiveInt,
  'character_level_feat_choices.created_at': sqlTimestamp,
  'character_level_feat_choices.updated_at': sqlTimestamp,

  'character_sheet_adjustments.id': positiveInt,
  'character_sheet_adjustments.character_id': positiveInt,
  'character_sheet_adjustments.created_at': sqlTimestamp,
  'character_sheet_adjustments.updated_at': sqlTimestamp,

  // --- weapon_templates ----------------------------------------------------
  'weapon_templates.id': positiveInt,
  'weapon_templates.content_key': nonEmptyText,
  'weapon_templates.rules_edition': rulesEditionEnum,
  'weapon_templates.name': nonEmptyText,
  'weapon_templates.srd_group': srdWeaponGroupEnum,
  'weapon_templates.damage_kind': weaponDamageKindEnum,
  'weapon_templates.damage_dice': sqlText,
  'weapon_templates.damage_custom': sqlText,
  // CI-3c makes the catalog user-writable, so D12/Q4's known-plus-passthrough
  // rule now applies here exactly as it already does on character weapons.
  'weapon_templates.damage_type': damageTypeVocabulary,
  'weapon_templates.versatile_damage_kind': versatileWeaponDamageKindEnum,
  'weapon_templates.versatile_damage_dice': sqlText,
  'weapon_templates.versatile_damage_custom': sqlText,
  'weapon_templates.finesse': sqlBool,
  'weapon_templates.heavy': sqlBool,
  'weapon_templates.light': sqlBool,
  'weapon_templates.loading': sqlBool,
  'weapon_templates.reach': sqlBool,
  'weapon_templates.thrown': sqlBool,
  'weapon_templates.two_handed': sqlBool,
  'weapon_templates.ammunition': sqlBool,
  'weapon_templates.ammunition_kind': sqlText,
  'weapon_templates.range_kind': weaponRangeKindEnum,
  'weapon_templates.mastery_property': weaponMasteryPropertyEnum,
  'weapon_templates.other_properties': sqlText,
  'weapon_templates.created_at': sqlTimestamp,
  'weapon_templates.updated_at': sqlTimestamp,

  // --- item definitions (CI-3c) ------------------------------------------
  'item_definitions.id': positiveInt,
  'item_definitions.content_key': nonEmptyText,
  'item_definitions.name': nonEmptyText,
  'item_definitions.rules_edition': rulesEditionEnum,
  'item_definitions.description': sqlText,
  'item_definitions.requires_attunement': sqlBool,
  'item_definitions.created_at': sqlTimestamp,
  'item_definitions.updated_at': sqlTimestamp,
  'item_definition_effects.id': positiveInt,
  'item_definition_effects.item_definition_id': positiveInt,
  'item_definition_effects.sort_order': positiveInt,
  'item_definition_effects.effect_kind': characterEffectKindEnum,
  'item_definition_effects.damage_type': damageTypeVocabulary,
  'item_definition_effects.ability': abilityEnum,
  'item_definition_effects.amount': nonZeroInt,
  'item_definition_effects.maximum': abilityScore,
  'item_definition_effects.base': positiveInt,
  'item_definition_effects.ability_1': abilityEnum,
  'item_definition_effects.ability_2': abilityEnum,
  'item_definition_effects.allows_shield': sqlBool,
  'item_definition_effects.weapon_scope': extraAttackWeaponScopeEnum,
  'item_definition_effects.label': nonEmptyText,
  'item_definition_effects.notes': sqlText,
  'item_definition_effects.created_at': sqlTimestamp,
  'item_definition_effects.updated_at': sqlTimestamp,

  // --- class weapon mastery content ---------------------------------------
  'class_weapon_mastery_grants.id': positiveInt,
  'class_weapon_mastery_grants.class_definition_id': positiveInt,
  'class_weapon_mastery_grants.grant': weaponMasteryGrantEnum,
  'class_weapon_mastery_grants.created_at': sqlTimestamp,
  'class_weapon_mastery_grants.updated_at': sqlTimestamp,
  'class_weapon_mastery_counts.id': positiveInt,
  'class_weapon_mastery_counts.class_definition_id': positiveInt,
  'class_weapon_mastery_counts.class_level': classLevel,
  // Zero is a legitimate mastery count in principle and no printed row carries
  // one, so this is `nonNegativeInt` rather than `positiveInt`: refusing 0
  // would be inventing a rule the source does not state.
  'class_weapon_mastery_counts.mastery_count': nonNegativeInt,
  'class_weapon_mastery_counts.created_at': sqlTimestamp,
  'class_weapon_mastery_counts.updated_at': sqlTimestamp,

  // --- class resource catalogs (D91/D120) ---------------------------------
  'class_resources.id': positiveInt,
  'class_resources.class_definition_id': positiveInt,
  'class_resources.class_level': classLevel,
  'class_resources.resource_kind': classResourceKindEnum,
  'class_resources.maximum': nonNegativeInt,
  'class_resources.created_at': sqlTimestamp,
  'class_resources.updated_at': sqlTimestamp,
  'class_resource_formulas.id': positiveInt,
  'class_resource_formulas.class_definition_id': positiveInt,
  'class_resource_formulas.resource_kind': classFormulaResourceKindEnum,
  'class_resource_formulas.formula_kind': classResourceFormulaKindEnum,
  'class_resource_formulas.minimum_class_level': classLevel,
  'class_resource_formulas.fixed_count': positiveInt,
  'class_resource_formulas.ability': resourceFormulaAbilityEnum,
  'class_resource_formulas.multiplier': positiveInt,
  'class_resource_formulas.later_fixed_count_steps': sqlText,
  'class_resource_formulas.created_at': sqlTimestamp,
  'class_resource_formulas.updated_at': sqlTimestamp,

  // --- species_templates ---------------------------------------------------
  'species_templates.id': positiveInt,
  'species_templates.content_key': nonEmptyText,
  'species_templates.rules_edition': rulesEditionEnum,
  'species_templates.name': nonEmptyText,
  'species_templates.creature_type': creatureTypeVocabulary,
  'species_templates.size': creatureSizeVocabulary,
  'species_templates.alternate_size': creatureSizeVocabulary,
  'species_templates.base_speed_feet': positiveInt,
  'species_templates.created_at': sqlTimestamp,
  'species_templates.updated_at': sqlTimestamp,

  // --- species_template_traits ---------------------------------------------
  'species_template_traits.id': positiveInt,
  'species_template_traits.species_template_id': positiveInt,
  'species_template_traits.sort_order': positiveInt,
  'species_template_traits.name': nonEmptyText,
  // Non-empty: every printed trait has text, and an empty description here is a
  // two-column mis-join rather than a trait.
  'species_template_traits.description': nonEmptyText,
  'species_template_traits.created_at': sqlTimestamp,
  'species_template_traits.updated_at': sqlTimestamp,

  // --- species_template_trait_effects --------------------------------------
  // Authorable catalog rows preserve unknown mechanical strings verbatim.
  'species_template_trait_effects.id': positiveInt,
  'species_template_trait_effects.species_template_trait_id': positiveInt,
  'species_template_trait_effects.sort_order': positiveInt,
  'species_template_trait_effects.effect_kind': characterEffectKindEnum,
  'species_template_trait_effects.damage_type': damageTypeVocabulary,
  // `sqlInteger` by omission would accept 1.5; these are explicitly the signed
  // integers the schema allows, and NOT `positiveInt` — Dwarven Toughness is
  // seeded `hit_points_flat = 0`, and a user's own trait may carry a penalty.
  'species_template_trait_effects.base': positiveInt,
  'species_template_trait_effects.ability': abilityEnum,
  'species_template_trait_effects.amount': nonZeroInt,
  'species_template_trait_effects.maximum': abilityScore,
  'species_template_trait_effects.ability_1': abilityEnum,
  'species_template_trait_effects.ability_2': abilityEnum,
  'species_template_trait_effects.allows_shield': sqlBool,
  'species_template_trait_effects.weapon_scope': extraAttackWeaponScopeEnum,
  'species_template_trait_effects.label': nonEmptyText,
  'species_template_trait_effects.notes': sqlText,
  'species_template_trait_effects.created_at': sqlTimestamp,
  'species_template_trait_effects.updated_at': sqlTimestamp,

  // --- background_templates ------------------------------------------------
  'background_templates.id': positiveInt,
  'background_templates.content_key': nonEmptyText,
  'background_templates.rules_edition': rulesEditionEnum,
  'background_templates.name': nonEmptyText,
  // The printed WORDS, not the lowercase `abilities` members — see the column
  // comments in `db/schema/origins.ts`. `abilityEnum` here would reject every
  // row the seeder writes.
  'background_templates.ability_score_1': nonEmptyText,
  'background_templates.ability_score_2': nonEmptyText,
  'background_templates.ability_score_3': nonEmptyText,
  'background_templates.feat_name': nonEmptyText,
  'background_templates.default_origin_feat_content_key': nonEmptyText,
  'background_templates.skill_proficiency_1': nonEmptyText,
  'background_templates.skill_proficiency_2': nonEmptyText,
  'background_templates.tool_proficiency': nonEmptyText,
  'background_templates.equipment_option_a': nonEmptyText,
  'background_templates.equipment_option_b': nonEmptyText,
  'background_templates.created_at': sqlTimestamp,
  'background_templates.updated_at': sqlTimestamp,

  // --- background_template_effects ----------------------------------------
  'background_template_effects.id': positiveInt,
  'background_template_effects.background_template_id': positiveInt,
  'background_template_effects.sort_order': positiveInt,
  'background_template_effects.effect_kind': characterEffectKindEnum,
  'background_template_effects.damage_type': damageTypeVocabulary,
  'background_template_effects.ability': abilityEnum,
  'background_template_effects.amount': nonZeroInt,
  'background_template_effects.maximum': abilityScore,
  'background_template_effects.base': positiveInt,
  'background_template_effects.ability_1': abilityEnum,
  'background_template_effects.ability_2': abilityEnum,
  'background_template_effects.allows_shield': sqlBool,
  'background_template_effects.weapon_scope': extraAttackWeaponScopeEnum,
  'background_template_effects.label': nonEmptyText,
  'background_template_effects.notes': sqlText,
  'background_template_effects.created_at': sqlTimestamp,
  'background_template_effects.updated_at': sqlTimestamp,

  // --- authored subclass feature graph ------------------------------------
  'subclass_features.id': positiveInt,
  'subclass_features.subclass_definition_id': positiveInt,
  'subclass_features.class_level': classLevel,
  'subclass_features.sort_order': positiveInt,
  'subclass_features.name': nonEmptyText,
  'subclass_features.description': subclassFeatureDescription,
  'subclass_features.created_at': sqlTimestamp,
  'subclass_features.updated_at': sqlTimestamp,
  'subclass_feature_effects.id': positiveInt,
  'subclass_feature_effects.subclass_feature_id': positiveInt,
  'subclass_feature_effects.sort_order': positiveInt,
  'subclass_feature_effects.effect_kind': featureTemplateEffectKindEnum,
  'subclass_feature_effects.damage_type': damageTypeVocabulary,
  'subclass_feature_effects.ability': abilityEnum,
  'subclass_feature_effects.amount': nonZeroInt,
  'subclass_feature_effects.maximum': abilityScore,
  'subclass_feature_effects.base': positiveInt,
  'subclass_feature_effects.ability_1': abilityEnum,
  'subclass_feature_effects.ability_2': abilityEnum,
  'subclass_feature_effects.allows_shield': sqlBool,
  'subclass_feature_effects.weapon_scope': extraAttackWeaponScopeEnum,
  'subclass_feature_effects.attack_count': positiveInt,
  'subclass_feature_effects.label': nonEmptyText,
  'subclass_feature_effects.notes': sqlText,
  'subclass_feature_effects.created_at': sqlTimestamp,
  'subclass_feature_effects.updated_at': sqlTimestamp,

  // --- background_equipment_items ------------------------------------------
  // Contracted for the reason `background_templates` is: every row is PARSED
  // out of `docs/srd/source/backgrounds.txt`, and a parser is exactly the writer
  // that can produce a plausible-looking wrong row. This one has more room to be
  // wrong than its parent — it splits one printed string into a list and reads a
  // leading numeral off each entry — so the seeder asserts every row against
  // this contract before it is written.
  'background_equipment_items.id': positiveInt,
  'background_equipment_items.background_template_id': positiveInt,
  'background_equipment_items.option': backgroundEquipmentOptionEnum,
  'background_equipment_items.sort_order': positiveInt,
  // `positiveInt` and NOT `nonNegativeInt`: a line with a quantity of zero is
  // not a line, and the CHECK on the column says the same thing.
  'background_equipment_items.quantity': positiveInt,
  'background_equipment_items.item_name': nonEmptyText,
  'background_equipment_items.item_kind': equipmentItemKindEnum,
  'background_equipment_items.created_at': sqlTimestamp,
  'background_equipment_items.updated_at': sqlTimestamp,

  // --- class_equipment_items -----------------------------------------------
  // The same parsed package-item contract as the background table, with the
  // class-specific A/B/C discriminant.
  'class_equipment_items.id': positiveInt,
  'class_equipment_items.class_definition_id': positiveInt,
  'class_equipment_items.option': classEquipmentOptionEnum,
  'class_equipment_items.sort_order': positiveInt,
  'class_equipment_items.quantity': positiveInt,
  'class_equipment_items.item_name': nonEmptyText,
  'class_equipment_items.item_kind': equipmentItemKindEnum,
  'class_equipment_items.created_at': sqlTimestamp,
  'class_equipment_items.updated_at': sqlTimestamp,

  // --- character_species ---------------------------------------------------
  // As with `character_weapons`, the nullable columns are NOT written as
  // nullable here: `columnSchema` adds `| null` from `COLUMN_FACTS`, so a
  // contract can never be tighter than its column by accident.
  'character_species.id': positiveInt,
  'character_species.character_id': positiveInt,
  // Non-empty: the absence of a species is the absence of the ROW, so a row
  // with no name could not be shown or told apart from having none.
  'character_species.name': nonEmptyText,
  'character_species.creature_type': creatureTypeVocabulary,
  'character_species.size': creatureSizeVocabulary,
  'character_species.base_speed_feet': positiveInt,
  'character_species.notes': sqlText,
  'character_species.created_at': sqlTimestamp,
  'character_species.updated_at': sqlTimestamp,

  // --- character_species_traits --------------------------------------------
  'character_species_traits.id': positiveInt,
  'character_species_traits.character_id': positiveInt,
  'character_species_traits.sort_order': positiveInt,
  'character_species_traits.name': nonEmptyText,
  // `sqlText` and not `nonEmptyText`, unlike the template's: a user may name a
  // trait before writing what it does, and the column is nullable for exactly
  // that reason (D6b limb 3).
  'character_species_traits.description': sqlText,
  'character_species_traits.notes': sqlText,
  'character_species_traits.created_at': sqlTimestamp,
  'character_species_traits.updated_at': sqlTimestamp,

  // --- character_background ------------------------------------------------
  'character_background.id': positiveInt,
  'character_background.character_id': positiveInt,
  'character_background.name': nonEmptyText,
  'character_background.ability_score_1': sqlText,
  'character_background.ability_score_2': sqlText,
  'character_background.ability_score_3': sqlText,
  'character_background.feat_name': sqlText,
  'character_background.skill_proficiency_1': sqlText,
  'character_background.skill_proficiency_2': sqlText,
  'character_background.tool_proficiency': sqlText,
  'character_background.equipment_option_a': sqlText,
  'character_background.equipment_option_b': sqlText,
  'character_background.notes': sqlText,
  'character_background.created_at': sqlTimestamp,
  'character_background.updated_at': sqlTimestamp,

  // --- character_effects ---------------------------------------------------
  'character_effects.id': positiveInt,
  'character_effects.character_id': positiveInt,
  'character_effects.sort_order': positiveInt,
  // The WIDER, table-own enum (AC-1) — see `characterEffectKindEnum`.
  'character_effects.effect_kind': characterEffectKindEnum,
  // Open vocabulary in the schema, so open here — the same call
  // `spell_version_damage_types.damage_type` makes.
  'character_effects.damage_type': damageTypeVocabulary,
  // The three hit-point/speed payload columns are deliberately absent:
  // `sqlInteger` is what `columnSchema` falls back to for an integer column,
  // and a signed integer is exactly what the schema permits. `positiveInt`
  // would reject Dwarven Toughness's seeded `hit_points_flat = 0` and every
  // user-written penalty.
  //
  // The `ability_increase` payload (B2) IS refined, mirroring its CHECKs:
  // the ability names one of the closed six, the amount is signed but never
  // zero, and the maximum shares `abilityScore`'s 1..30 because that is the
  // range `AbilityScore` can represent — a stored 32 would drive a resolved
  // total past 30 and throw where a person expected a sheet. `ability` is now
  // ALSO `attack_ability_override`'s payload (AC-1) and the same closed six
  // covers it; `amount` is now ALSO `armor_class_bonus` /
  // `weapon_attack_bonus` / `weapon_damage_bonus`'s flat addend, and the same
  // signed-non-zero rule covers all four.
  'character_effects.ability': abilityEnum,
  'character_effects.amount': nonZeroInt,
  'character_effects.maximum': abilityScore,
  // The `armor_class_formula` payload (AC-1): a flat base of at least 1 (the
  // same floor `character_armor_armor_class_check` uses), up to two abilities
  // from the closed six, and a plain boolean.
  'character_effects.base': positiveInt,
  'character_effects.ability_1': abilityEnum,
  'character_effects.ability_2': abilityEnum,
  'character_effects.allows_shield': sqlBool,
  // Shared by `attack_ability_override`, `weapon_attack_bonus` and
  // `weapon_damage_bonus` (AC-1) — see `extraAttackWeaponScopeEnum`.
  'character_effects.weapon_scope': extraAttackWeaponScopeEnum,
  'character_effects.source_instance_id': positiveInt,
  'character_effects.character_item_id': positiveInt,
  'character_effects.character_weapon_id': positiveInt,
  'character_effects.template_ref': sqlText,
  // Non-empty: an effect nobody can name is an effect nobody can find to edit
  // or delete, and `''` is a null in costume.
  'character_effects.label': nonEmptyText,
  'character_effects.notes': sqlText,
  'character_effects.created_at': sqlTimestamp,
  'character_effects.updated_at': sqlTimestamp,

  // --- character_items (AC-1, D72) -----------------------------------------
  'character_items.id': positiveInt,
  'character_items.character_id': positiveInt,
  // Non-empty, matching `character_effects.label`: an item nobody can name is
  // an item nobody can find to edit or delete.
  'character_items.name': nonEmptyText,
  'character_items.description': sqlText,
  'character_items.quantity': positiveInt,
  'character_items.requires_attunement': sqlBool,
  'character_items.source_instance_id': positiveInt,
  'character_items.created_at': sqlTimestamp,
  'character_items.updated_at': sqlTimestamp,

  // --- character_attunement_slots (D92) ----------------------------------
  'character_attunement_slots.character_id': positiveInt,
  'character_attunement_slots.slot_1_item_id': positiveInt,
  'character_attunement_slots.slot_2_item_id': positiveInt,
  'character_attunement_slots.slot_3_item_id': positiveInt,
} as const satisfies Record<RequiredRefinementKey, z.ZodType> &
  Partial<Record<OptionalRefinementKey, z.ZodType>>;

export const ROW_REFINEMENTS: Readonly<Record<string, z.ZodType>> = REFINEMENTS;

type Refinements = typeof REFINEMENTS;

// --- contract construction -------------------------------------------------

const jsonSchemaCache = new Map<JsonColumnKey, z.ZodType>();

function jsonColumnSchema(key: JsonColumnKey): z.ZodType {
  const cached = jsonSchemaCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const fact = JSON_COLUMNS[key];
  // `superRefine` rather than `refine` so the shape's own message — "must be a
  // JSON array" versus "must be a JSON object" — reaches the caller instead of a
  // single generic one. The verdict itself comes from `jsonColumnError`, the
  // same function the quarantined-image audit calls.
  const schema = z.string().superRefine((value, context) => {
    const error = jsonColumnError(fact, value);
    if (error !== null) {
      context.addIssue({ code: 'custom', message: error });
    }
  });
  jsonSchemaCache.set(key, schema);
  return schema;
}

function columnSchema(table: RowContractTable, column: string): z.ZodType {
  const key = `${table}.${column}`;
  const fact = (COLUMN_FACTS[table] as Record<string, { notNull: boolean }>)[
    column
  ];
  /* c8 ignore next 3 -- unreachable: the caller iterates COLUMN_FACTS[table]. */
  if (fact === undefined) {
    throw new Error(`No column facts for ${table}.${column}.`);
  }
  // A degraded column always has either a JSON classification or a refinement
  // (compile-enforced above); an integer column falls back to what drizzle-zod
  // established for it.
  const base: z.ZodType = Object.hasOwn(JSON_COLUMNS, key)
    ? jsonColumnSchema(key as JsonColumnKey)
    : (REFINEMENTS[key as keyof Refinements] ?? sqlInteger);
  return fact.notNull ? base : z.union([base, z.null()]);
}

/**
 * Contracts are STRICT in both directions.
 *
 *  - unknown key → rejected. This is the security-relevant half: an unknown key
 *    became a column name in a generated `INSERT` statement.
 *  - missing key → rejected. Every producer of a backup row is `SELECT *`
 *    against a schema-signature-validated database, so a partial row is not a
 *    legitimate document. Accepting one silently substitutes column defaults
 *    for the user's data, or fails at the driver on a NOT NULL column with a
 *    message naming neither the table nor the row.
 */
function buildContract(
  table: RowContractTable,
  columns: readonly string[],
): z.ZodType {
  return z.strictObject(
    Object.fromEntries(
      columns.map((column) => [column, columnSchema(table, column)]),
    ),
  );
}

const contractCache = new Map<string, z.ZodType>();

function contractFor(
  table: RowContractTable,
  only: readonly string[] | undefined,
): z.ZodType {
  const cacheKey = only === undefined ? table : `${table}|${only.join(',')}`;
  const cached = contractCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const columns = only ?? Object.keys(COLUMN_FACTS[table]);
  const contract = buildContract(table, columns);
  contractCache.set(cacheKey, contract);
  return contract;
}

/**
 * Validates one row against its table's contract.
 *
 * Returns `null` when the row is well-shaped, or a message naming the TABLE and
 * ROW (through `label`, e.g. `Character backup tables.spell_selection_slots[3]`)
 * and the FIELD. Returning rather than throwing keeps this module free of any
 * dependency on the backup layer's error type.
 *
 * `only` restricts the contract to a subset of the table's columns — the one
 * caller is the undo/redo snapshot's `character` object, which is a projection
 * of `characters` onto `CHARACTER_STATE_COLUMNS` rather than a whole row.
 */
export function rowContractError(
  table: RowContractTable,
  row: unknown,
  label: string,
  only?: readonly string[],
): string | null {
  const result = contractFor(table, only).safeParse(row);
  if (result.success) {
    if (only === undefined && table === 'catalog_content_identities') {
      return catalogContentIdentityInvariantError(
        result.data as Readonly<Record<string, unknown>>,
        label,
      );
    }
    if (only === undefined && table === 'catalog_content_fingerprints') {
      return catalogContentFingerprintInvariantError(
        result.data as Readonly<Record<string, unknown>>,
        label,
      );
    }
    if (
      only === undefined &&
      (table === 'character_weapons' || table === 'weapon_templates')
    ) {
      const stored = result.data as Readonly<Record<string, unknown>>;
      return (
        weaponDamagePayloadError(stored, label, 'damage') ??
        weaponDamagePayloadError(stored, label, 'versatile_damage') ??
        weaponRangePayloadError(
          stored,
          label,
          table === 'character_weapons',
        )
      );
    }
    if (only === undefined && table === 'class_resource_formulas') {
      return classResourceFormulaInvariantError(
        result.data as Readonly<Record<string, unknown>>,
        label,
      );
    }
    return null;
  }
  const issue = result.error.issues[0];
  /* c8 ignore next 3 -- zod never reports a failure with no issues. */
  if (issue === undefined) {
    return `${label} does not match the ${table} row contract.`;
  }
  const field = issue.path.map(String).join('.');
  return field === ''
    ? `${label} (${table}): ${issue.message}.`
    : `${label}.${field}: ${issue.message}.`;
}

// --- compile-checked invariants -------------------------------------------

type Expect<T extends true> = T;
type IsNever<T> = [T] extends [never] ? true : false;

/** What the contract accepts for one column, as a type. */
type ColumnAccepts<
  T extends RowContractTable,
  C extends keyof Facts[T],
> = `${T}.${C & string}` extends infer K
  ? K extends JsonColumnKey
    ? string
    : K extends keyof Refinements
      ? z.input<Refinements[K]>
      : number
  : never;

type RowAccepts<T extends RowContractTable> = {
  [C in keyof Facts[T]]: Facts[T][C] extends { notNull: true }
    ? ColumnAccepts<T, C>
    : ColumnAccepts<T, C> | null;
};

type RowModel<T extends RowContractTable> = InferSelectModel<TableFor<T>>;

/**
 * THE D6b DISCHARGE, AND ITS EXACT LIMITS.
 *
 * For every contracted table and every column, every value the schema's own
 * model type permits must be a value the contract accepts as INPUT.
 * `Exclude<…>` is `never` when that holds. Input is deliberate: a contract may
 * brand a successfully parsed value without narrowing what it accepts.
 *
 * WHAT THIS PROVES. Three specific mistakes stop compiling:
 *
 *  1. dropping `null` from a column the schema declares nullable;
 *  2. pairing a column with the wrong enum, or with an enum at all where the
 *     schema types the column as plain `string` — `z.enum` survives `z.input`,
 *     so enum narrowing IS visible here;
 *  3. using a scalar refinement on a column the schema types as something else
 *     (a text refinement on a `boolean` column, say).
 *
 * WHAT IT CANNOT PROVE, STATED PLAINLY SO NOBODY OVER-READS IT. `z.input` erases
 * every runtime constraint that does not change the static type. `z.string()`
 * and `z.string().min(1)` both infer as `string`; `z.int()` and
 * `z.int().min(1).max(30)` both infer as `number`; the JSON shape refinements
 * accept `string`. So this guard is BLIND to length, range and shape
 * narrowing, and the compile passing says nothing about them. That blind spot is
 * covered by declaration instead: {@link NARROWED_REFINEMENTS} lists every one,
 * `./json-columns.ts` names the reader each JSON shape mirrors, and
 * `tests/unit/contracts/row-contracts.test.ts` proves both that each declared
 * narrowing really rejects and that no undeclared one can be introduced.
 */
type OverTightenedColumns<T extends RowContractTable> = {
  [C in keyof RowModel<T>]: C extends keyof RowAccepts<T>
    ? IsNever<Exclude<RowModel<T>[C], RowAccepts<T>[C]>> extends true
      ? never
      : C
    : C;
}[keyof RowModel<T>];

export type _NoOverTightening = Expect<
  IsNever<
    { [T in RowContractTable]: OverTightenedColumns<T> }[RowContractTable]
  >
>;

/**
 * ...and the contract covers exactly the columns the model has, so a column
 * added to the schema cannot slip past `strictObject` unvalidated.
 */
export type _ContractCoversEveryColumn = Expect<
  IsNever<
    {
      [T in RowContractTable]: Exclude<
        keyof RowModel<T>,
        keyof RowAccepts<T>
      >;
    }[RowContractTable]
  >
>;
