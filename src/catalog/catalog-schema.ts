import {
  classFeatureEffectKinds,
  effectReliabilityCategories,
  extraAttackWeaponScopes,
  isEnumValue,
  rulesEditions,
  spellSchool,
  type EffectReliabilityCategory,
  type RulesEdition,
  type SpellSchool,
} from '../domain/enums';
import type { ClassFeatureEffect } from '../rules/class-feature-effects';
import { isRecord } from '../worker/handler';
import { isImportedContentKey } from './catalog-key';

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
export const catalogRecordKinds = ['spell', 'subclass'] as const;
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
  description: string;
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

function nonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(
      `Catalog field '${field}' must be a non-empty string.`,
    );
  }
  return value;
}

function nullableString(value: unknown, field: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new TypeError(
      `Catalog field '${field}' must be a string or null.`,
    );
  }
  return value;
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
  if (!Number.isInteger(level) || Number(level) < 0 || Number(level) > 9) {
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

  return {
    identityKey: nonEmptyString(value.identityKey, 'identityKey'),
    versionKey: nonEmptyString(value.versionKey, 'versionKey'),
    name: nonEmptyString(value.name, 'name'),
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
    spellLists: stringList(value.spellLists, 'spellLists'),
    sourceBooks: stringList(value.sourceBooks, 'sourceBooks'),
    sourcePage:
      sourcePage === undefined || sourcePage === null
        ? null
        : Number(sourcePage),
    sourceSlug: nullableString(value.sourceSlug, 'sourceSlug'),
    tags: stringList(value.tags, 'tags', true),
    healing: value.healing === true,
    ...upcast(value),
  };
}

/**
 * THE HIGHEST SLOT LEVEL THAT EXISTS. Spell slots run 1..9 and there is no
 * tenth; `spell_versions.level` is already bounded 0..9 by its own CHECK for
 * the same reason.
 */
const HIGHEST_SLOT_LEVEL = 9;
/** The highest character level, matching every other level bound in the schema. */
const HIGHEST_CHARACTER_LEVEL = 20;

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
      HIGHEST_SLOT_LEVEL,
    ),
    upcastSummary: nullableString(value.upcastSummary, 'upcastSummary'),
    cantripUpgradeLevels: levelList(
      value.cantripUpgradeLevels,
      'cantripUpgradeLevels',
      HIGHEST_CHARACTER_LEVEL,
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
    description: nonEmptyString(value.description, `${label}.description`),
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
      const versionKey = value.versionKey;
      if (typeof versionKey !== 'string' || versionKey.trim() === '') {
        throw new TypeError(
          `Tier 2 catalog document ${index + 1} contains an invalid versionKey.`,
        );
      }
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
