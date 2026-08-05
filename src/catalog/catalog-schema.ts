import {
  abilities,
  armorCategories,
  armorDexBonuses,
  characterEffectKinds,
  classFeatureEffectKinds,
  effectReliabilityCategories,
  extraAttackWeaponScopes,
  isEnumValue,
  rulesEditions,
  srdWeaponGroups,
  spellSchool,
  weaponMasteryProperties,
  type ArmorCategory,
  type ArmorDexBonus,
  type DamageType,
  type EffectReliabilityCategory,
  type RulesEdition,
  type SrdWeaponGroup,
  type SpellSchool,
  type WeaponMasteryProperty,
} from '../domain/enums';
import type { AuthoringCharacterEffect } from '../authoring/effect-forms';
import { EQUIPMENT_EFFECT_COUNT_MAX } from '../domain/equipment-effects';
import {
  ORIGIN_EFFECT_MAGNITUDE_MAX,
  ORIGIN_TEXT_LIMITS,
} from '../domain/origin-limits';
import {
  SHEET_ARMOR_MAX,
  SHEET_ARMOR_MIN,
  SHEET_TEXT_LIMITS,
} from '../domain/sheet-limits';
import {
  WEAPON_RANGE_MAX_FEET,
  WEAPON_TEXT_LIMITS,
} from '../domain/weapon-limits';
import type { VersatileWeaponDamage, WeaponDamage } from '../domain/weapon-damage';
import type { WritableWeaponRange } from '../domain/weapon-range';
import {
  SPELL_CANTRIP_UPGRADE_LEVEL_MAX,
  SPELL_LEVEL_MAX,
  SPELL_LEVEL_MIN,
  SPELL_UPCAST_LEVEL_MAX,
} from '../domain/spell-limits';
import type { ClassFeatureEffect } from '../rules/class-feature-effects';
import {
  parseSourceCatalogRecord,
  type CatalogBackgroundRecord,
  type CatalogClassRecord,
  type CatalogFeatRecord,
  type CatalogSpeciesRecord,
} from './source-catalog-records';
import { isRecord } from '../worker/handler';
import { isImportedContentKey } from './catalog-key';
import { trimEqualCatalogLocator } from './catalog-field-values';
import { normalizeContentIdentityName } from './content-identity';
import type {
  ContentImportChoices,
  ContentImportPlanToken,
} from './content-adoption';
import {
  nonEmptySubclassFeatureDescription,
  type NonEmptySubclassFeatureDescription,
} from '../domain/subclass-feature-description';

/**
 * THE RECORD KINDS A TIER 1 DOCUMENT MAY CARRY, AND HOW A DOCUMENT SAYS WHICH.
 *
 * A TIER 1 DOCUMENT IS STILL A BARE JSON ARRAY, AND THAT IS THE WHOLE
 * COMPATIBILITY STORY. Every document this project has ever emitted — every
 * file `tools/scrape/build-catalog.ts` has written, every file a user already
 * holds — is an array of spell records with no discriminator on them at all.
 * Wrapping the format in an object envelope (`{spells: […], subclasses: […]}`)
 * would have bought a version number and broken all of them on the same day, so
 * the discriminator went on the ELEMENT instead: `kind` is optional, and an
 * element without one IS A SPELL. That is not a default chosen for convenience;
 * it is the meaning every existing document already has, restated so that it
 * keeps holding. `tests/fixtures/homebrew-catalog/legacy-pre-subclass.tier1.json`
 * is a frozen hand-built document from before this change and is the proof.
 *
 * AN UNKNOWN `kind` IS REFUSED RATHER THAN SKIPPED. Unknown FIELDS are dropped
 * silently — that is deliberate, and `tools/scrape/provenance.ts` depends on it
 * — but an unknown RECORD KIND is a whole record this build cannot store, and
 * skipping it would import a document as if it were complete while dropping
 * content the user can see in the file. Worse, a spell import is a full
 * replacement, so a silently skipped kind would read as "these records are
 * gone" and be tombstoned against.
 */
export const catalogRecordKinds = [
  'spell',
  'subclass',
  'weapon',
  'armor',
  'item',
  'class',
  'feat',
  'species',
  'background',
] as const;
export type CatalogRecordKind = (typeof catalogRecordKinds)[number];

export interface CatalogRecord {
  identityKey: string;
  versionKey: string;
  name: string;
  edition: RulesEdition;
  level: number;
  school: SpellSchool;
  castingTime: string | null;
  range: string | null;
  components: string | null;
  duration: string | null;
  concentration: boolean;
  ritual: boolean;
  attackModes: string[];
  saveAbilities: string[];
  effectReliabilityCategory: EffectReliabilityCategory;
  spellLists: string[];
  sourceBooks: string[];
  sourcePage: number | null;
  sourceSlug: string | null;
  tags: string[];
  healing: boolean;
  /** Defaults false for legacy documents; stored spell semantics retain it. */
  requiresModForEffect?: boolean;
  /**
   * THE UPCAST PROGRESSION — the owner's *"a list of levels that can upcast and
   * a text description"*, in SPELL SLOT LEVELS.
   *
   * THE LIST IS NOT A THRESHOLD, AND THE OWNER'S OWN EXAMPLE IS WHY: *"Some
   * spells can be upcast every spell slot level, others only upcast every other
   * spell slot level (ex. Spiritual weapon)"*. `[2, 4, 6, 8]` and `[2, 3, 4, 5,
   * 6, 7, 8, 9]` are both legal documents and they describe different spells; a
   * "from level N upwards" field could not tell them apart.
   *
   * BOTH ARE OPTIONAL AND DEFAULT TO ABSENT. Every catalog document already in
   * a user's hands omits them, and `stringList`'s `optional` limb exists for
   * exactly this reason on `tags`. An omitted upcast is not "this spell does not
   * upcast" — it is "this document does not say", which is what an empty list
   * means.
   */
  upcastLevels: number[];
  upcastSummary: string | null;
  /**
   * THE CANTRIP UPGRADE — the CHARACTER levels at which a cantrip's effect
   * changes, and a separate pair of fields because it is a separate mechanic.
   *
   * The SRD prints it as *"when you reach levels 5 …, 11 …, and 17"*. It is not
   * upcasting: no slot is spent and a cantrip has none to spend. Splitting it
   * out is what let `upcastLevels` narrow to 1..9 and this list keep 1..20 —
   * one field cannot carry two bounds, which is the whole reason the discarded
   * `upcastScale` discriminant existed.
   */
  cantripUpgradeLevels: number[];
  cantripUpgradeSummary: string | null;
}

/**
 * ONE PRINTED FEATURE OF AN IMPORTED SUBCLASS, PARSED.
 *
 * `effect` IS THE BOUNDED, COMPILE-CHECKED HALF AND IT IS THE SAME TYPE THE
 * DERIVATION CONSUMES. `ClassFeatureEffect` is `src/rules/class-feature-effects.ts`'s
 * own union, so the parser cannot mint an effect the sheet cannot read, and
 * adding a member to `classFeatureEffectKinds` is a compile error in BOTH files
 * rather than a silently unparsed kind here.
 *
 * `null` IS THE COMMON CASE AND NOT AN OMISSION. A feature with no effect is a
 * printed paragraph — the owner's "most things are just a text box", and 26 of
 * 33 rows on the species side D12 measured. D6b limb 2 is now represented by
 * the absence of a `subclass_feature_effects` child row: most features
 * genuinely move no number, so no nullable inline effect is needed.
 *
 * NO `sortOrder` FIELD. Printed order is the ARRAY's order and is derived from
 * the index, because an authored `sortOrder` beside an array is a second source
 * of truth for the same fact and the two can disagree.
 */
export interface CatalogSubclassFeature {
  classLevel: number;
  name: string;
  description: NonEmptySubclassFeatureDescription;
  effect: ClassFeatureEffect | null;
}

/**
 * A SUBCLASS, AS A TIER 1 DOCUMENT CARRIES IT.
 *
 * WHAT IS DELIBERATELY ABSENT, STATED RATHER THAN IMPLIED. A subclass can be a
 * spellcaster (`subclass_definitions.spellcasting_ability`, `caster_fraction`,
 * `caster_rounding`, `grant_rules`, and the whole of `subclass_progressions`),
 * and this format has no vocabulary for any of it. `grant_rules` in particular
 * is a JSON blob with an internal `rule_key` grammar minted only by
 * `src/rules/class-progression-lookup.ts`, and an import that could write one
 * could mint spell slots. That is a second increment; this one is the RECORD
 * KIND and its round trip. An imported subclass is therefore a NON-CASTER with
 * printed features, and the columns it does not fill stay NULL.
 *
 * A SOURCE BOOK AND A FLAVOUR PARAGRAPH ARE ABSENT FOR A BLUNTER REASON: there
 * is no column. Spells get `spell_version_publications`; `subclass_definitions`
 * has neither a publication table nor a description field. Fields naming them
 * are dropped like any other unknown field rather than silently half-stored.
 */
export interface CatalogSubclassRecord {
  kind: 'subclass';
  /**
   * The subclass's own content key, and it MUST be an imported key — three
   * parts with a dotted owner namespace in the middle. See
   * `importedContentKeyOwner`: this is what stops a document naming
   * `2024:subclass:ek` and rewriting a bundled row, and it is what
   * keeps the subclass identifiable as imported inside a backup and a share
   * link, neither of which carries any other field of it.
   */
  contentKey: string;
  /**
   * The parent class BY CONTENT KEY, never by display name.
   *
   * Every resolver in this application already works this way and
   * `upsertThirdCaster` says why at length: a user-authored class that happens
   * to be called "Fighter" must not be able to adopt EK, and the
   * same argument runs in reverse here — a document naming "Bard" would attach
   * a homebrew subclass to whichever row won the name, which is a different
   * class from the one the author meant.
   */
  parentClassKey: string;
  name: string;
  edition: RulesEdition;
  /** In printed order. `sort_order` is the index, one-based. */
  features: CatalogSubclassFeature[];
}

export interface CatalogWeaponRecord {
  readonly kind: 'weapon';
  readonly name: string;
  readonly edition: RulesEdition;
  readonly srdGroup: SrdWeaponGroup;
  readonly damage: WeaponDamage;
  readonly damageType: DamageType;
  readonly versatileDamage: VersatileWeaponDamage;
  readonly finesse: boolean;
  readonly heavy: boolean;
  readonly light: boolean;
  readonly loading: boolean;
  readonly reach: boolean;
  readonly thrown: boolean;
  readonly twoHanded: boolean;
  readonly ammunition: boolean;
  readonly ammunitionKind: string | null;
  readonly range: WritableWeaponRange;
  readonly masteryProperty: WeaponMasteryProperty;
  readonly otherProperties: string | null;
}

export interface CatalogArmorRecord {
  readonly kind: 'armor';
  readonly name: string;
  readonly edition: RulesEdition;
  readonly category: ArmorCategory;
  readonly armorClass: number;
  readonly dexBonus: ArmorDexBonus;
  readonly dexBonusMax: number | null;
  readonly strengthRequirement: number | null;
  readonly stealthDisadvantage: boolean;
}

export interface CatalogItemRecord {
  readonly kind: 'item';
  readonly name: string;
  readonly edition: RulesEdition;
  readonly description: string;
  readonly requiresAttunement: boolean;
  /** Ordered definition effects; array position becomes one-based sort_order. */
  readonly effects: readonly AuthoringCharacterEffect[];
}

export interface CatalogDescription {
  versionKey: string;
  description: string;
}

/**
 * A whole Tier 1 parse: the records, split by kind, and the kinds actually
 * DECLARED by the documents.
 *
 * `kinds` IS NOT DERIVABLE FROM THE TWO ARRAYS AND THAT IS THE POINT. An empty
 * `spells` can mean two different things — "a document declared spells and
 * listed none", which is the existing and tested way to empty the spell catalog,
 * or "no document mentioned spells at all", which must leave it alone. See
 * `CatalogImporter.import`, which is where the difference decides whether a
 * sweep runs.
 */
export interface CatalogDocumentRecords {
  spells: CatalogRecord[];
  subclasses: CatalogSubclassRecord[];
  weapons: CatalogWeaponRecord[];
  armors: CatalogArmorRecord[];
  items: CatalogItemRecord[];
  classes: CatalogClassRecord[];
  feats: CatalogFeatRecord[];
  species: CatalogSpeciesRecord[];
  backgrounds: CatalogBackgroundRecord[];
  kinds: ReadonlySet<CatalogRecordKind>;
}

export interface CatalogImportParams {
  documents: string[];
  textDocuments?: string[];
  dryRun?: boolean;
}

export interface ForkSpellParams {
  readonly sourceContentKey: string;
  readonly name?: string;
}

function parseJsonDocument(document: string, label: string): unknown {
  try {
    return JSON.parse(document) as unknown;
  } catch (error) {
    throw new TypeError(
      `Invalid ${label} JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function textLength(
  value: string,
  field: string,
  maximumLength: number | undefined,
): string {
  if (maximumLength !== undefined && value.length > maximumLength) {
    throw new TypeError(
      `Catalog field '${field}' must contain at most ${String(maximumLength)} characters.`,
    );
  }
  return value;
}

function nonEmptyString(
  value: unknown,
  field: string,
  maximumLength?: number,
): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(
      `Catalog field '${field}' must be a non-empty string.`,
    );
  }
  return textLength(value, field, maximumLength);
}

function spellLocator(value: string, field: string): string {
  return trimEqualCatalogLocator(value, field, (message) => {
    throw new TypeError(message);
  });
}

function spellIdentityName(value: unknown): string {
  const name = nonEmptyString(value, 'name');
  normalizeContentIdentityName(name);
  return name;
}

function nullableString(
  value: unknown,
  field: string,
  maximumLength?: number,
): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new TypeError(
      `Catalog field '${field}' must be a string or null.`,
    );
  }
  return textLength(value, field, maximumLength);
}

function requiredString(
  value: unknown,
  field: string,
  maximumLength?: number,
): string {
  if (typeof value !== 'string') {
    throw new TypeError(`Catalog field '${field}' must be a string.`);
  }
  return textLength(value, field, maximumLength);
}

function stringList(
  value: unknown,
  field: string,
  optional = false,
): string[] {
  if (optional && value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new TypeError(`Catalog field '${field}' must be a list.`);
  }
  for (const item of value) {
    if (typeof item !== 'string' || item.trim() === '') {
      throw new TypeError(
        `Catalog field '${field}' must contain non-empty strings.`,
      );
    }
  }
  return [...value] as string[];
}

function catalogRecord(value: unknown): CatalogRecord {
  if (!isRecord(value)) {
    throw new TypeError('Catalog document contains a non-object record.');
  }

  const level = value.level;
  if (
    !Number.isInteger(level) ||
    Number(level) < SPELL_LEVEL_MIN ||
    Number(level) > SPELL_LEVEL_MAX
  ) {
    throw new TypeError(
      "Catalog field 'level' must be an integer from 0 through 9.",
    );
  }
  for (const field of ['concentration', 'ritual'] as const) {
    if (typeof value[field] !== 'boolean') {
      throw new TypeError(`Catalog field '${field}' must be boolean.`);
    }
  }

  const edition = nonEmptyString(value.edition, 'edition');
  if (!rulesEditions.includes(edition as RulesEdition)) {
    throw new TypeError(
      `Catalog field 'edition' must be one of ${rulesEditions.join(', ')}.`,
    );
  }
  const reliability =
    value.effectReliabilityCategory === undefined
      ? 'fixed_effect'
      : nonEmptyString(
          value.effectReliabilityCategory,
          'effectReliabilityCategory',
        );
  if (
    !effectReliabilityCategories.includes(
      reliability as EffectReliabilityCategory,
    )
  ) {
    throw new TypeError(
      `Catalog field 'effectReliabilityCategory' must be one of ${effectReliabilityCategories.join(', ')}.`,
    );
  }
  const sourcePage = value.sourcePage;
  if (
    sourcePage !== undefined &&
    sourcePage !== null &&
    (!Number.isSafeInteger(sourcePage) || Number(sourcePage) < 0)
  ) {
    throw new TypeError(
      "Catalog field 'sourcePage' must be a non-negative integer or null.",
    );
  }
  if (value.healing !== undefined && typeof value.healing !== 'boolean') {
    throw new TypeError("Catalog field 'healing' must be boolean.");
  }
  if (
    value.requiresModForEffect !== undefined &&
    typeof value.requiresModForEffect !== 'boolean'
  ) {
    throw new TypeError("Catalog field 'requiresModForEffect' must be boolean.");
  }

  return {
    identityKey: spellLocator(
      nonEmptyString(value.identityKey, 'identityKey'),
      'identityKey',
    ),
    versionKey: spellLocator(
      nonEmptyString(value.versionKey, 'versionKey'),
      'versionKey',
    ),
    name: spellIdentityName(value.name),
    edition: edition as RulesEdition,
    level: Number(level),
    school: spellSchool(nonEmptyString(value.school, 'school')),
    castingTime: nullableString(value.castingTime, 'castingTime'),
    range: nullableString(value.range, 'range'),
    components: nullableString(value.components, 'components'),
    duration: nullableString(value.duration, 'duration'),
    concentration: value.concentration as boolean,
    ritual: value.ritual as boolean,
    attackModes: stringList(value.attackModes, 'attackModes'),
    saveAbilities: stringList(value.saveAbilities, 'saveAbilities'),
    effectReliabilityCategory:
      reliability as EffectReliabilityCategory,
    spellLists: stringList(value.spellLists, 'spellLists').map((entry) =>
      spellLocator(entry, 'spellLists')),
    sourceBooks: stringList(value.sourceBooks, 'sourceBooks'),
    sourcePage:
      sourcePage === undefined || sourcePage === null
        ? null
        : Number(sourcePage),
    sourceSlug: nullableString(value.sourceSlug, 'sourceSlug'),
    tags: stringList(value.tags, 'tags', true),
    healing: value.healing === true,
    requiresModForEffect: value.requiresModForEffect === true,
    ...upcast(value),
  };
}

/**
 * THE HIGHEST SLOT LEVEL THAT EXISTS. Spell slots run 1..9 and there is no
 * tenth; `spell_versions.level` is already bounded 0..9 by its own CHECK for
 * the same reason.
 */
/**
 * A LIST OF LEVELS: INTEGERS, IN RANGE, NO DUPLICATES, SORTED.
 *
 * ONE FUNCTION FOR BOTH LADDERS BECAUSE THE STRUCTURAL RULES ARE THE SAME AND
 * ONLY THE CEILING DIFFERS. That is the difference the two tables exist to
 * express, so it is a parameter here and a CHECK constraint there — the same
 * fact stated at both levels rather than one of them trusting the other (F11).
 *
 * Sorted here rather than by every reader: "a list of levels" has one
 * meaningful order and an author's file should not decide it.
 */
function levelList(
  raw: unknown,
  field: string,
  highest: number,
): number[] {
  if (raw === undefined || raw === null) {
    return [];
  }
  if (!Array.isArray(raw)) {
    throw new TypeError(`Catalog field '${field}' must be a list.`);
  }
  const levels: number[] = [];
  for (const level of raw as unknown[]) {
    if (
      !Number.isInteger(level) ||
      Number(level) < 1 ||
      Number(level) > highest
    ) {
      throw new TypeError(
        `Catalog field '${field}' must contain integers from 1 through ${String(highest)}.`,
      );
    }
    if (levels.includes(Number(level))) {
      throw new TypeError(
        `Catalog field '${field}' repeats level ${String(level)}.`,
      );
    }
    levels.push(Number(level));
  }
  return levels.sort((left, right) => left - right);
}

/**
 * READ THE FOUR PROGRESSION FIELDS, OR REFUSE THE DOCUMENT.
 *
 * TWO INDEPENDENT PAIRS, AND THE INDEPENDENCE IS THE RULING. `upcastLevels` is
 * SPELL SLOT LEVELS, 1..9. `cantripUpgradeLevels` is CHARACTER LEVELS, 1..20,
 * and describes the SRD's Cantrip Upgrade — a different mechanic that the owner
 * ruled gets its own table. Neither list needs the other and neither needs a
 * scale field, because the FIELD NAME now says which levels are meant. That is
 * what `upcastScale` was for and it is why it is gone.
 *
 * A LIST NEEDS NO SUMMARY AND A SUMMARY NEEDS NO LIST. The old format required
 * a scale and a list together because a list with no scale could not be read at
 * all. Nothing here has that problem: `upcastLevels: [2, 3, 4]` is complete on
 * its own, and `upcastSummary` with no list is a spell whose text describes a
 * progression the author did not enumerate.
 *
 * `upcastScale` IS REFUSED BY NAME RATHER THAN DROPPED. Unknown fields are
 * dropped silently everywhere else in this format, and doing that here would
 * read `{"upcastScale": "character_level", "upcastLevels": [5]}` — a cantrip
 * ladder — as SLOT level 5, storing a number that means something the document
 * did not say. That is the one thing this parser exists to refuse. The message
 * names both replacements, so this is not D12's "refuse what you cannot model":
 * both meanings ARE modelled, under names that say which is which. An explicit
 * `null` is still accepted and ignored, because every document the project's own
 * scraper has emitted writes `"upcastScale": null` and it asserts nothing.
 *
 * WHAT IS DELIBERATELY *NOT* CHECKED: that an upcast slot level exceeds the
 * spell's own level. It is a true rule about content and it is a REFUSAL that
 * would lose a whole document over one debatable row, which D11 part 2 says an
 * import must not do. The structural facts — integer, in range, no duplicates —
 * are the ones a document cannot legitimately violate.
 */
function upcast(value: Record<string, unknown>): {
  upcastLevels: number[];
  upcastSummary: string | null;
  cantripUpgradeLevels: number[];
  cantripUpgradeSummary: string | null;
} {
  if (value.upcastScale !== undefined && value.upcastScale !== null) {
    throw new TypeError(
      "Catalog field 'upcastScale' no longer exists: upcasting is measured in spell slot levels only, so 'upcastLevels' is 1 through 9, and a cantrip's character-level ladder is 'cantripUpgradeLevels', 1 through 20.",
    );
  }

  return {
    upcastLevels: levelList(
      value.upcastLevels,
      'upcastLevels',
      SPELL_UPCAST_LEVEL_MAX,
    ),
    upcastSummary: nullableString(value.upcastSummary, 'upcastSummary'),
    cantripUpgradeLevels: levelList(
      value.cantripUpgradeLevels,
      'cantripUpgradeLevels',
      SPELL_CANTRIP_UPGRADE_LEVEL_MAX,
    ),
    cantripUpgradeSummary: nullableString(
      value.cantripUpgradeSummary,
      'cantripUpgradeSummary',
    ),
  };
}

function boundedInteger(
  value: unknown,
  field: string,
  low: number,
  high: number,
): number {
  if (
    !Number.isInteger(value) ||
    Number(value) < low ||
    Number(value) > high
  ) {
    throw new TypeError(
      `Catalog field '${field}' must be an integer from ${low} through ${high}.`,
    );
  }
  return Number(value);
}

/**
 * A FEATURE'S MECHANICAL EFFECT, OR `null`.
 *
 * THE SWITCH IS EXHAUSTIVE OVER `classFeatureEffectKinds`, so a second kind is a
 * COMPILE ERROR here rather than a document field this build quietly ignores.
 *
 * `weaponScope` IS REQUIRED AND HAS NO DEFAULT, WHICH IS THE FORMAT DECISION
 * THIS FUNCTION EXISTS TO MAKE. `subclass_features_extra_attack_payload_check`
 * refuses a scope-less `extra_attack` row outright, and the column's own comment
 * says why the obvious repair is wrong: defaulting to `any_weapon` WIDENS a
 * one-weapon grant to every weapon the character holds, which is the specific
 * wrong answer D19 §3 describes. So the DOCUMENT states the scope; the importer
 * never invents one. (The D19-era fixture wrote `weaponScope: null` and this is
 * the field that had to change to make it importable.)
 */
function catalogFeatureEffect(
  value: unknown,
  label: string,
): ClassFeatureEffect | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!isRecord(value)) {
    throw new TypeError(
      `Catalog field '${label}.effect' must be an object or null.`,
    );
  }
  const kind = value.kind;
  if (!isEnumValue(classFeatureEffectKinds, kind)) {
    throw new TypeError(
      `Catalog field '${label}.effect.kind' must be one of ${classFeatureEffectKinds.join(', ')}.`,
    );
  }
  switch (kind) {
    case 'extra_attack': {
      const attackCount = value.attackCount;
      if (!Number.isInteger(attackCount) || Number(attackCount) < 2) {
        throw new TypeError(
          `Catalog field '${label}.effect.attackCount' must be an integer of 2 or more; it is the TOTAL attacks the Attack action gives, never an increment.`,
        );
      }
      const weaponScope = value.weaponScope;
      if (!isEnumValue(extraAttackWeaponScopes, weaponScope)) {
        throw new TypeError(
          `Catalog field '${label}.effect.weaponScope' must be one of ${extraAttackWeaponScopes.join(', ')}; it has no default, because defaulting it would widen a one-weapon grant to every weapon.`,
        );
      }
      return {
        kind,
        attack_count: Number(attackCount),
        weapon_scope: weaponScope,
      };
    }
    /* c8 ignore next 6 -- unreachable while the switch is exhaustive; kept so a
       new effect kind is a compile error here rather than a silently unparsed
       document field. */
    default: {
      const unreachable: never = kind;
      throw new Error(
        `Unhandled class feature effect kind ${String(unreachable)}.`,
      );
    }
  }
}

function catalogSubclassFeature(
  value: unknown,
  label: string,
): CatalogSubclassFeature {
  if (!isRecord(value)) {
    throw new TypeError(`Catalog field '${label}' must be an object.`);
  }
  return {
    // 1..20 is `subclass_features_class_level_check`, retyped rather than
    // imported: the level IN THE SUBCLASS'S OWN CLASS, never a character level.
    classLevel: boundedInteger(value.classLevel, `${label}.classLevel`, 1, 20),
    name: nonEmptyString(value.name, `${label}.name`),
    // NOT NULL in the table, and an empty one is a parse bug at the far end of
    // whatever produced the document.
    description: nonEmptySubclassFeatureDescription(
      nonEmptyString(value.description, `${label}.description`),
    ),
    effect: catalogFeatureEffect(value.effect, label),
  };
}

function catalogSubclassRecord(value: Record<string, unknown>): CatalogSubclassRecord {
  const contentKey = nonEmptyString(value.contentKey, 'contentKey');
  if (!isImportedContentKey(contentKey)) {
    throw new TypeError(
      `Catalog field 'contentKey' must be an imported content key of the form <edition>:<owner.namespace>:<name>; '${contentKey}' is not, and bundled keys such as '2024:subclass:ek' are refused by that shape on purpose.`,
    );
  }
  const edition = nonEmptyString(value.edition, 'edition');
  if (!isEnumValue(rulesEditions, edition)) {
    throw new TypeError(
      `Catalog field 'edition' must be one of ${rulesEditions.join(', ')}.`,
    );
  }
  const features = value.features;
  if (!Array.isArray(features) || features.length === 0) {
    throw new TypeError(
      `Catalog field 'features' must be a non-empty list for subclass '${contentKey}'.`,
    );
  }
  const parsed = features.map((feature, index) =>
    catalogSubclassFeature(feature, `features[${index}]`),
  );
  // `subclass_features_subclass_name_unique` would refuse the second row with
  // an opaque SQLITE_CONSTRAINT halfway through the transaction. Named here
  // instead, before anything is written.
  const names = new Set<string>();
  for (const feature of parsed) {
    if (names.has(feature.name)) {
      throw new TypeError(
        `Subclass '${contentKey}' lists the feature '${feature.name}' twice; feature names are unique within a subclass.`,
      );
    }
    names.add(feature.name);
  }
  return {
    kind: 'subclass',
    contentKey,
    parentClassKey: nonEmptyString(value.parentClassKey, 'parentClassKey'),
    name: nonEmptyString(value.name, 'name'),
    edition,
    features: parsed,
  };
}

function catalogEdition(value: unknown): RulesEdition {
  const edition = nonEmptyString(value, 'edition');
  if (!isEnumValue(rulesEditions, edition)) {
    throw new TypeError(
      `Catalog field 'edition' must be one of ${rulesEditions.join(', ')}.`,
    );
  }
  return edition;
}

function catalogBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`Catalog field '${field}' must be boolean.`);
  }
  return value;
}

function catalogNullableInteger(
  value: unknown,
  field: string,
  minimum = 0,
  maximum = Number.MAX_SAFE_INTEGER,
): number | null {
  if (value === null) return null;
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < minimum ||
    Number(value) > maximum
  ) {
    throw new TypeError(
      `Catalog field '${field}' must be null or an integer from ${String(minimum)} through ${String(maximum)}.`,
    );
  }
  return Number(value);
}

function catalogDamage(
  value: unknown,
  field: string,
  versatile: boolean,
): WeaponDamage | VersatileWeaponDamage {
  if (!isRecord(value)) {
    throw new TypeError(`Catalog field '${field}' must be an object.`);
  }
  switch (value.kind) {
    case 'dice':
      return {
        kind: 'dice',
        dice: nonEmptyString(
          value.dice,
          `${field}.dice`,
          versatile
            ? WEAPON_TEXT_LIMITS.versatile_damage_dice
            : WEAPON_TEXT_LIMITS.damage_dice,
        ),
      };
    case 'flat':
      return {
        kind: 'flat',
        amount: boundedInteger(value.amount, `${field}.amount`, 0, 100_000),
      };
    case 'custom':
      return {
        kind: 'custom',
        text: nonEmptyString(
          value.text,
          `${field}.text`,
          versatile
            ? WEAPON_TEXT_LIMITS.versatile_damage_custom
            : WEAPON_TEXT_LIMITS.damage_custom,
        ),
      };
    case 'not_recorded':
      if (!versatile) return { kind: 'not_recorded' };
      break;
    case 'not_applicable':
      if (versatile) return { kind: 'not_applicable' };
      break;
  }
  throw new TypeError(
    `Catalog field '${field}.kind' is not valid for this damage value.`,
  );
}

function catalogRange(value: unknown): WritableWeaponRange {
  if (!isRecord(value)) {
    throw new TypeError("Catalog field 'range' must be an object.");
  }
  if (value.kind === 'none') return { kind: 'none' };
  if (value.kind !== 'ranged') {
    throw new TypeError("Catalog field 'range.kind' must be none or ranged.");
  }
  const near = boundedInteger(
    value.nearFeet,
    'range.nearFeet',
    0,
    WEAPON_RANGE_MAX_FEET,
  );
  const far = catalogNullableInteger(
    value.farFeet,
    'range.farFeet',
    0,
    WEAPON_RANGE_MAX_FEET,
  );
  if (far !== null && far < near) {
    throw new TypeError("Catalog field 'range.farFeet' must not be less than nearFeet.");
  }
  return { kind: 'ranged', near_feet: near, far_feet: far };
}

function catalogItemEffect(
  value: unknown,
  index: number,
): AuthoringCharacterEffect {
  const field = `effects[${String(index)}]`;
  if (!isRecord(value)) {
    throw new TypeError(`Catalog field '${field}' must be an object.`);
  }
  if (!isEnumValue(characterEffectKinds, value.kind)) {
    throw new TypeError(
      `Catalog field '${field}.kind' must be one of ${characterEffectKinds.join(', ')}.`,
    );
  }
  const common = {
    sort_order: index + 1,
    label: nonEmptyString(
      value.label,
      `${field}.label`,
      ORIGIN_TEXT_LIMITS.trait_name,
    ),
    notes: nullableString(
      value.notes,
      `${field}.notes`,
      ORIGIN_TEXT_LIMITS.notes,
    ),
  };
  const integer = (
    key: string,
    minimum: number,
    maximum = ORIGIN_EFFECT_MAGNITUDE_MAX,
  ): number =>
    boundedInteger(value[key], `${field}.${key}`, minimum, maximum);
  const nonZeroInteger = (key: string): number => {
    const parsed = integer(key, -ORIGIN_EFFECT_MAGNITUDE_MAX);
    if (parsed === 0) {
      throw new TypeError(`Catalog field '${field}.${key}' must be non-zero.`);
    }
    return parsed;
  };
  const ability = (key: string) => {
    const parsed = nonEmptyString(value[key], `${field}.${key}`);
    if (!isEnumValue(abilities, parsed)) {
      throw new TypeError(`Catalog field '${field}.${key}' is not an ability.`);
    }
    return parsed;
  };
  const weaponScope = () => {
    const parsed = nonEmptyString(value.weaponScope, `${field}.weaponScope`);
    if (!isEnumValue(extraAttackWeaponScopes, parsed)) {
      throw new TypeError(`Catalog field '${field}.weaponScope' is invalid.`);
    }
    return parsed;
  };
  switch (value.kind) {
    case 'damage_resistance':
      return {
        ...common,
        kind: value.kind,
        damage_type: nonEmptyString(
          value.damageType,
          `${field}.damageType`,
          ORIGIN_TEXT_LIMITS.name,
        ) as DamageType,
      };
    case 'hp_modifier': {
      const hit_points_flat = catalogNullableInteger(
        value.hitPointsFlat,
        `${field}.hitPointsFlat`,
        -ORIGIN_EFFECT_MAGNITUDE_MAX,
        ORIGIN_EFFECT_MAGNITUDE_MAX,
      );
      const hit_points_per_level = catalogNullableInteger(
        value.hitPointsPerLevel,
        `${field}.hitPointsPerLevel`,
        -ORIGIN_EFFECT_MAGNITUDE_MAX,
        ORIGIN_EFFECT_MAGNITUDE_MAX,
      );
      if (hit_points_flat === null && hit_points_per_level === null) {
        throw new TypeError(`Catalog field '${field}' needs an HP modifier payload.`);
      }
      return { ...common, kind: value.kind, hit_points_flat, hit_points_per_level };
    }
    case 'speed':
      return {
        ...common,
        kind: value.kind,
        speed_bonus_feet: integer(
          'speedBonusFeet',
          -ORIGIN_EFFECT_MAGNITUDE_MAX,
        ),
      };
    case 'ability_increase':
      return {
        ...common,
        kind: value.kind,
        ability: ability('ability'),
        amount: nonZeroInteger('amount'),
        maximum: integer('maximum', 1, 30),
      };
    case 'ability_override':
      return {
        ...common,
        kind: value.kind,
        ability: ability('ability'),
        maximum: integer('maximum', 1, 30),
      };
    case 'armor_class_bonus':
      return { ...common, kind: value.kind, amount: nonZeroInteger('amount') };
    case 'armor_class_formula': {
      const second = value.ability2;
      let ability_2 = null;
      if (second !== null) ability_2 = ability('ability2');
      return {
        ...common,
        kind: value.kind,
        base: integer('base', 1),
        ability_1: ability('ability1'),
        ability_2,
        allows_shield: catalogBoolean(value.allowsShield, `${field}.allowsShield`),
      };
    }
    case 'attack_ability_override':
      return {
        ...common,
        kind: value.kind,
        ability: ability('ability'),
        weapon_scope: weaponScope(),
      };
    case 'weapon_attack_bonus':
    case 'weapon_damage_bonus':
      return {
        ...common,
        kind: value.kind,
        amount: nonZeroInteger('amount'),
        weapon_scope: weaponScope(),
      };
  }
}

function catalogWeaponRecord(value: Record<string, unknown>): CatalogWeaponRecord {
  const group = nonEmptyString(value.srdGroup, 'srdGroup');
  const mastery = nonEmptyString(
    value.masteryProperty,
    'masteryProperty',
    WEAPON_TEXT_LIMITS.mastery_property,
  );
  if (!isEnumValue(srdWeaponGroups, group)) {
    throw new TypeError("Catalog field 'srdGroup' is invalid.");
  }
  if (!isEnumValue(weaponMasteryProperties, mastery)) {
    throw new TypeError("Catalog field 'masteryProperty' is invalid.");
  }
  return {
    kind: 'weapon',
    name: nonEmptyString(value.name, 'name', WEAPON_TEXT_LIMITS.name),
    edition: catalogEdition(value.edition),
    srdGroup: group,
    damage: catalogDamage(value.damage, 'damage', false) as WeaponDamage,
    damageType: nonEmptyString(
      value.damageType,
      'damageType',
      WEAPON_TEXT_LIMITS.damage_type,
    ) as DamageType,
    versatileDamage: catalogDamage(
      value.versatileDamage,
      'versatileDamage',
      true,
    ) as VersatileWeaponDamage,
    finesse: catalogBoolean(value.finesse, 'finesse'),
    heavy: catalogBoolean(value.heavy, 'heavy'),
    light: catalogBoolean(value.light, 'light'),
    loading: catalogBoolean(value.loading, 'loading'),
    reach: catalogBoolean(value.reach, 'reach'),
    thrown: catalogBoolean(value.thrown, 'thrown'),
    twoHanded: catalogBoolean(value.twoHanded, 'twoHanded'),
    ammunition: catalogBoolean(value.ammunition, 'ammunition'),
    ammunitionKind: nullableString(
      value.ammunitionKind,
      'ammunitionKind',
      WEAPON_TEXT_LIMITS.ammunition_kind,
    ),
    range: catalogRange(value.range),
    masteryProperty: mastery,
    otherProperties: nullableString(
      value.otherProperties,
      'otherProperties',
      WEAPON_TEXT_LIMITS.other_properties,
    ),
  };
}

function catalogArmorRecord(value: Record<string, unknown>): CatalogArmorRecord {
  const category = nonEmptyString(value.category, 'category');
  const dexBonus = nonEmptyString(value.dexBonus, 'dexBonus');
  if (!isEnumValue(armorCategories, category)) {
    throw new TypeError("Catalog field 'category' is invalid.");
  }
  if (!isEnumValue(armorDexBonuses, dexBonus)) {
    throw new TypeError("Catalog field 'dexBonus' is invalid.");
  }
  const dexBonusMax = catalogNullableInteger(
    value.dexBonusMax,
    'dexBonusMax',
    SHEET_ARMOR_MIN.dex_bonus_max,
    SHEET_ARMOR_MAX.dex_bonus_max,
  );
  if ((dexBonus === 'capped') !== (dexBonusMax !== null)) {
    throw new TypeError("Catalog fields 'dexBonus' and 'dexBonusMax' disagree.");
  }
  if (category === 'shield' && dexBonus !== 'none') {
    throw new TypeError(
      "Catalog field 'dexBonus' must be 'none' when category is 'shield'.",
    );
  }
  return {
    kind: 'armor',
    name: nonEmptyString(value.name, 'name', SHEET_TEXT_LIMITS.armor_name),
    edition: catalogEdition(value.edition),
    category,
    armorClass: boundedInteger(
      value.armorClass,
      'armorClass',
      SHEET_ARMOR_MIN.armor_class,
      SHEET_ARMOR_MAX.armor_class,
    ),
    dexBonus,
    dexBonusMax,
    strengthRequirement: catalogNullableInteger(
      value.strengthRequirement,
      'strengthRequirement',
      SHEET_ARMOR_MIN.strength_requirement,
      SHEET_ARMOR_MAX.strength_requirement,
    ),
    stealthDisadvantage: catalogBoolean(
      value.stealthDisadvantage,
      'stealthDisadvantage',
    ),
  };
}

function catalogItemRecord(value: Record<string, unknown>): CatalogItemRecord {
  if (!Array.isArray(value.effects)) {
    throw new TypeError("Catalog field 'effects' must be a list.");
  }
  if (value.effects.length > EQUIPMENT_EFFECT_COUNT_MAX) {
    throw new TypeError(
      `Catalog field 'effects' must not contain more than ${String(EQUIPMENT_EFFECT_COUNT_MAX)} rows.`,
    );
  }
  return {
    kind: 'item',
    name: nonEmptyString(value.name, 'name', ORIGIN_TEXT_LIMITS.trait_name),
    edition: catalogEdition(value.edition),
    description: requiredString(
      value.description,
      'description',
      ORIGIN_TEXT_LIMITS.description,
    ),
    requiresAttunement: catalogBoolean(
      value.requiresAttunement,
      'requiresAttunement',
    ),
    effects: value.effects.map(catalogItemEffect),
  };
}

/**
 * Reads one element's `kind`, defaulting to `spell`. See `catalogRecordKinds`.
 *
 * ABSENT AND EXPLICITLY NULL ARE THE SAME ANSWER. Every other nullable field in
 * this file collapses the two — `nullableString`, `sourcePage`, and
 * `catalogFeatureEffect` all treat `undefined` and `null` identically — because
 * a JSON encoder that writes every key of a record it holds emits `null` where
 * a hand-written document simply omits the key, and neither says anything about
 * the record's kind. Refusing `null` here would have made the field the one
 * place in the format where "I have no value for this" aborts the whole
 * document set, which is the opposite of what `catalogRecordKinds` promises. A
 * kind that is present and UNRECOGNIZED is still refused, and that distinction
 * is the point: no value is a spell, a wrong value is a record this build
 * cannot store.
 */
function catalogRecordKind(value: unknown): CatalogRecordKind {
  if (!isRecord(value)) {
    throw new TypeError('Catalog document contains a non-object record.');
  }
  if (value.kind === undefined || value.kind === null) {
    return 'spell';
  }
  if (!isEnumValue(catalogRecordKinds, value.kind)) {
    throw new TypeError(
      `Catalog field 'kind' must be one of ${catalogRecordKinds.join(', ')} when present.`,
    );
  }
  return value.kind;
}

export function parseCatalogDocuments(
  documents: readonly string[],
): CatalogDocumentRecords {
  if (documents.length === 0) {
    throw new TypeError('At least one Tier 1 catalog document is required.');
  }
  const spells: CatalogRecord[] = [];
  const subclasses: CatalogSubclassRecord[] = [];
  const weapons: CatalogWeaponRecord[] = [];
  const armors: CatalogArmorRecord[] = [];
  const items: CatalogItemRecord[] = [];
  const classes: CatalogClassRecord[] = [];
  const feats: CatalogFeatRecord[] = [];
  const species: CatalogSpeciesRecord[] = [];
  const backgrounds: CatalogBackgroundRecord[] = [];
  const kinds = new Set<CatalogRecordKind>();
  documents.forEach((document, index) => {
    const decoded = parseJsonDocument(
      document,
      `Tier 1 catalog document ${index + 1}`,
    );
    if (!Array.isArray(decoded)) {
      throw new TypeError(
        `Tier 1 catalog document ${index + 1} must contain a JSON list.`,
      );
    }
    /**
     * AN EMPTY DOCUMENT DECLARES `spell`, AND IT DECLARES IT PER DOCUMENT.
     *
     * `[]` has exactly one historical meaning — "a spell document listing
     * nothing", the shipped way to empty the spell catalog — and it has that
     * meaning because the format had no kinds to declare when it was minted.
     * Reading that meaning off the WHOLE parse instead ("no records anywhere")
     * loses it the moment a second file is selected: `['[]', <subclasses>]`
     * would declare only `subclass` and skip the sweep, so the empty file the
     * user picked would do nothing and say nothing. `documents` is a union of
     * FILES and the multi-file picker makes that a normal selection, so the
     * declaration belongs to the document that carries it.
     */
    if (decoded.length === 0) {
      kinds.add('spell');
    }
    for (const value of decoded) {
      const kind = catalogRecordKind(value);
      kinds.add(kind);
      switch (kind) {
        case 'spell':
          spells.push(catalogRecord(value));
          break;
        case 'subclass':
          subclasses.push(
            catalogSubclassRecord(value as Record<string, unknown>),
          );
          break;
        case 'weapon':
          weapons.push(catalogWeaponRecord(value as Record<string, unknown>));
          break;
        case 'armor':
          armors.push(catalogArmorRecord(value as Record<string, unknown>));
          break;
        case 'item':
          items.push(catalogItemRecord(value as Record<string, unknown>));
          break;
        case 'class':
          classes.push(parseSourceCatalogRecord(kind, value as Record<string, unknown>));
          break;
        case 'feat':
          feats.push(parseSourceCatalogRecord(kind, value as Record<string, unknown>));
          break;
        case 'species':
          species.push(parseSourceCatalogRecord(kind, value as Record<string, unknown>));
          break;
        case 'background':
          backgrounds.push(parseSourceCatalogRecord(kind, value as Record<string, unknown>));
          break;
        /* c8 ignore next 6 -- unreachable while the switch is exhaustive; kept
           so a new record kind is a compile error here rather than a record
           this parser drops on the floor. */
        default: {
          const unreachable: never = kind;
          throw new Error(
            `Unhandled catalog record kind ${String(unreachable)}.`,
          );
        }
      }
    }
  });

  // Two documents in one call may not disagree about the same subclass. Spell
  // records MERGE on `versionKey` (`normalizeCatalogRecords`) because a spell is
  // split across source books by design; a subclass carries an ORDERED FEATURE
  // LIST, and there is no defensible merge of two orderings — one would silently
  // win. Named here rather than resolved.
  const seen = new Map<string, string>();
  for (const record of subclasses) {
    const encoded = JSON.stringify(record);
    const previous = seen.get(record.contentKey);
    if (previous !== undefined && previous !== encoded) {
      throw new TypeError(
        `Tier 1 carries two different subclasses under the key '${record.contentKey}'.`,
      );
    }
    seen.set(record.contentKey, encoded);
  }

  return {
    spells,
    subclasses: subclasses.filter(
      (record, index) =>
        subclasses.findIndex(
          (other) => other.contentKey === record.contentKey,
        ) === index,
    ),
    weapons,
    armors,
    items,
    classes,
    feats,
    species,
    backgrounds,
    kinds,
  };
}

export function parseDescriptionDocuments(
  documents: readonly string[] | undefined,
): CatalogDescription[] | null {
  if (documents === undefined || documents.length === 0) {
    return null;
  }

  const byVersion = new Map<string, string>();
  documents.forEach((document, index) => {
    const decoded = parseJsonDocument(
      document,
      `Tier 2 catalog document ${index + 1}`,
    );
    if (!Array.isArray(decoded)) {
      throw new TypeError(
        `Tier 2 catalog document ${index + 1} must contain a JSON list.`,
      );
    }
    for (const value of decoded) {
      if (!isRecord(value)) {
        throw new TypeError(
          `Tier 2 catalog document ${index + 1} contains a non-object record.`,
        );
      }
      const rawVersionKey = value.versionKey;
      if (typeof rawVersionKey !== 'string' || rawVersionKey.trim() === '') {
        throw new TypeError(
          `Tier 2 catalog document ${index + 1} contains an invalid versionKey.`,
        );
      }
      const versionKey = spellLocator(rawVersionKey, 'versionKey');
      const description = value._description;
      if (typeof description !== 'string' || description.trim() === '') {
        throw new TypeError(
          `Tier 2 description for ${versionKey} must be a non-empty string.`,
        );
      }
      const existing = byVersion.get(versionKey);
      if (existing !== undefined && existing !== description) {
        throw new TypeError(
          `Tier 2 has conflicting descriptions for ${versionKey}.`,
        );
      }
      byVersion.set(versionKey, description);
    }
  });

  return [...byVersion.entries()].map(([versionKey, description]) => ({
    versionKey,
    description,
  }));
}

export function isCatalogImportParams(
  params: unknown,
): params is CatalogImportParams {
  if (!isRecord(params)) {
    return false;
  }
  const keys = Object.keys(params);
  if (
    keys.some(
      (key) =>
        key !== 'documents' &&
        key !== 'textDocuments' &&
        key !== 'dryRun',
    ) ||
    !Array.isArray(params.documents) ||
    params.documents.length === 0 ||
    !Array.from(params.documents).every(
      (value) => typeof value === 'string',
    )
  ) {
    return false;
  }
  if (
    params.textDocuments !== undefined &&
    (!Array.isArray(params.textDocuments) ||
      !Array.from(params.textDocuments).every(
        (value) => typeof value === 'string',
      ))
  ) {
    return false;
  }
  return params.dryRun === undefined || typeof params.dryRun === 'boolean';
}

export interface CatalogImportPlanParams extends CatalogImportParams {
  readonly choices?: ContentImportChoices;
}

export interface CatalogImportCommitParams extends CatalogImportParams {
  readonly token: ContentImportPlanToken;
  readonly choices?: ContentImportChoices;
}

export function isContentImportChoices(value: unknown): value is ContentImportChoices {
  return isRecord(value) && Object.values(value).every((choice) =>
    isRecord(choice) &&
    Object.keys(choice).every((key) => key === 'decision' || key === 'cloneName') &&
    (choice.decision === 'match' || choice.decision === 'clone') &&
    (choice.cloneName === undefined || typeof choice.cloneName === 'string'),
  );
}

function catalogImportBase(value: Record<string, unknown>): CatalogImportParams {
  return {
    documents: value.documents as string[],
    ...(value.textDocuments === undefined
      ? {}
      : { textDocuments: value.textDocuments as string[] }),
    ...(value.dryRun === undefined ? {} : { dryRun: value.dryRun as boolean }),
  };
}

export function isCatalogImportPlanParams(
  params: unknown,
): params is CatalogImportPlanParams {
  if (!isRecord(params)) return false;
  const base = catalogImportBase(params);
  return isCatalogImportParams(base) &&
    Object.keys(params).every((key) =>
      ['documents', 'textDocuments', 'dryRun', 'choices'].includes(key),
    ) &&
    (params.choices === undefined || isContentImportChoices(params.choices));
}

export function isCatalogImportCommitParams(
  params: unknown,
): params is CatalogImportCommitParams {
  if (!isRecord(params)) return false;
  const base = catalogImportBase(params);
  return isCatalogImportParams(base) &&
    Object.keys(params).every((key) =>
      ['documents', 'textDocuments', 'dryRun', 'token', 'choices'].includes(key),
    ) &&
    typeof params.token === 'string' && /^[0-9a-f]{64}$/.test(params.token) &&
    (params.choices === undefined || isContentImportChoices(params.choices));
}

export function isForkSpellParams(
  params: unknown,
): params is ForkSpellParams {
  if (!isRecord(params)) {
    return false;
  }
  const keys = Object.keys(params);
  return (
    keys.every((key) => key === 'sourceContentKey' || key === 'name') &&
    typeof params.sourceContentKey === 'string' &&
    params.sourceContentKey.trim() !== '' &&
    (params.name === undefined ||
      (typeof params.name === 'string' && params.name.trim() !== ''))
  );
}
