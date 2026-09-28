import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import {
  deriveSrdAbilityScoreGenerationArtifact,
} from '../src/rules/ability-score-generation-srd-reader';
import { parseSrdArmorTemplates } from '../src/rules/armor-srd-reader';
import {
  deriveSrdClassChoiceEntitlementArtifact,
} from '../src/rules/class-choice-entitlements-srd-reader';
import { parseSrdClassEquipment } from '../src/rules/class-equipment-srd-reader';
import {
  parseSrdClassLevelFeatures,
} from '../src/rules/class-level-features-srd-reader';
import {
  deriveSrdClassResourceArtifact,
} from '../src/rules/class-resources-srd-reader';
import {
  deriveSrdClassTraitsArtifact,
  parseSrdClassTraits,
} from '../src/rules/class-traits-srd-reader';
import { parseSrdDraconicResilience } from '../src/rules/draconic-resilience-srd-reader';
import { parseSrdNamedExtraAttackFeatures } from '../src/rules/extra-attack-srd-reader';
import { parseSrdFeatDefinitions } from '../src/rules/feats-srd-reader';
import { parseSrdMulticlassEntryGrants } from '../src/rules/multiclass-entry-srd-reader';
import { deriveSrdOriginsArtifact } from '../src/rules/origins-srd-reader';
import { deriveSrdSkillAbilitiesArtifact } from '../src/rules/skills-reader';
import {
  deriveSrdSpellCatalogArtifact,
  SRD_SPELL_LISTS,
  type SrdSpellList,
} from '../src/rules/spells-srd-reader';
import { deriveSrdSpeciesTablesArtifact } from '../src/rules/species-srd-tables-reader';
import { parseSrdSubclasses } from '../src/rules/srd-subclasses-reader';
import {
  parseSrdUnarmoredDefenseFeatures,
} from '../src/rules/unarmored-defense-srd-reader';
import {
  deriveSrdWeaponsArtifact,
  parseSrdWeaponTemplates,
} from '../src/rules/weapons-srd-reader';
import {
  deriveBundledCoverageSource,
} from '../src/simulation/coverage-source';

/**
 * THE SRD TEXT IS READ AT BUILD TIME, AND ONLY HERE (plus tests).
 *
 * Every rules module used to import its SRD corpus as a `?raw` string and parse
 * it at module evaluation: in every test process, every engine child, and the
 * shipped app chunks. The parsers now take the text as an argument, and this
 * module runs them once per corpus edit: `npm run srd:artifacts`
 * (scripts/generate-srd-artifacts.ts) writes each artifact below, and the
 * runtime modules read the committed artifacts. No module outside tests, this
 * generator and its readers reads a `docs/srd` corpus.
 *
 * AN ARTIFACT IS TYPED TS DATA, NEVER EDITED BY HAND (D916, D918). Its data is
 * one literal, `as const satisfies <DomainType>`: the literals keep their
 * literal types (a spell's key, a class level, a closed vocabulary member)
 * and tsc checks every generated value against the domain type the moment it
 * is written, without widening it to that type. A bare literal cannot carry a
 * brand, so a content key is recorded as text from a CLOSED set: the class and
 * feat keys from their vocabularies, and every other recorded key set (spells,
 * weapons, armour, species, backgrounds) from a literal union the generator
 * emits beside the literal (`keyUnions`), which the artifact's `satisfies`
 * type is instantiated with. The runtime module mints the `ContentKey` brand
 * by membership in that set (`src/domain/recorded-content-keys.ts`), never by
 * a cast.
 *
 * AN ARTIFACT IS FROZEN WHERE IT IS DEFINED. `as const` is only a type: the
 * module's last statement is `deepFreeze(<EXPORT>)`, so every object and array
 * in the literal is frozen when the module first evaluates. An artifact imports
 * nothing but `deepFreeze` and types, so its body finishes before any importer's
 * runs: no importer, whichever module loads first, can change a rule for the
 * next. It is a statement rather than a call around the literal because the
 * call would make the compiler infer `deepFreeze`'s type parameter from each
 * literal, about 10,000 more types for the app check (fix round 3, measured).
 *
 * EVERY BYTE OF EVERY SOURCE IS PINNED. The header records each source
 * corpus's sha256, so an edit the parse ignores (a preamble line, an
 * extraction note) still makes the committed artifact stale.
 * `assertSrdArtifactFresh` checks those fingerprints first, then re-derives
 * the artifact and fails on any byte difference.
 */

/** Every SRD corpus a reader parses. Paths are repository-relative. */
export const SRD_CORPUS_PATHS = {
  fullSrd: 'docs/srd/full/srd-5.2.1.txt',
  spellDescriptions: 'docs/srd/source/spell-descriptions.txt',
  classLevelTables: 'docs/srd/source/class-level-tables.txt',
  abilityScoreGeneration: 'docs/srd/source/ability-score-generation.txt',
  armorTable: 'docs/srd/source/armor-table.txt',
  attackClassFeatures: 'docs/srd/source/attack-class-features.txt',
  backgrounds: 'docs/srd/source/backgrounds.txt',
  classCoreTraits: 'docs/srd/source/class-core-traits.txt',
  classExpertise: 'docs/srd/source/class-expertise.txt',
  classSpellReplacement: 'docs/srd/source/class-spell-replacement.txt',
  classStartingEquipment: 'docs/srd/source/class-starting-equipment.txt',
  draconicResilience: 'docs/srd/source/draconic-resilience.txt',
  extraAttackOtherSources: 'docs/srd/source/extra-attack-other-sources.txt',
  feats: 'docs/srd/source/feats.txt',
  multiclassEntryGrants: 'docs/srd/source/multiclass-entry-grants.txt',
  skillsTable: 'docs/srd/source/skills-table.txt',
  speciesDescriptions: 'docs/srd/source/species-descriptions.txt',
  subclasses: 'docs/srd/source/subclasses.txt',
  unarmoredDefense: 'docs/srd/source/unarmored-defense.txt',
  weaponMasteryProgression: 'docs/srd/source/weapon-mastery-progression.txt',
  weaponsTable: 'docs/srd/source/weapons-table.txt',
} as const;

export const SRD_SPELL_LIST_PATHS = {
  Bard: 'docs/srd/source/bard-spell-list.txt',
  Cleric: 'docs/srd/source/cleric-spell-list.txt',
  Druid: 'docs/srd/source/druid-spell-list.txt',
  Paladin: 'docs/srd/source/paladin-spell-list.txt',
  Ranger: 'docs/srd/source/ranger-spell-list.txt',
  Sorcerer: 'docs/srd/source/sorcerer-spell-list.txt',
  Warlock: 'docs/srd/source/warlock-spell-list.txt',
  Wizard: 'docs/srd/source/wizard-spell-list.txt',
} as const satisfies Record<SrdSpellList, string>;

/** Returns a corpus's text by its repository-relative path. */
export type SrdCorpusReader = (path: string) => string;

/** A reader over texts already in hand, as the drift tests hold them. */
export function srdCorpusTexts(
  texts: Readonly<Record<string, string>>,
): SrdCorpusReader {
  return (path) => {
    const text = texts[path];
    if (text === undefined) {
      throw new SrdArtifactError(`${path} was not supplied.`);
    }
    return text;
  };
}

export interface SrdArtifact {
  /** Repository-relative path of the generated module. */
  readonly path: string;
  /** The corpora it is derived from: the only paths its derivation may read. */
  readonly sources: readonly string[];
  /** The reader that derives it, for its header. */
  readonly reader: string;
  /** The drift test that re-derives it, for its header. */
  readonly driftTest: string;
  readonly exportName: string;
  /**
   * The domain type the literal must satisfy (`satisfies`, never an
   * annotation: an annotation would widen every literal to the type), the
   * names it imports, and the module they come from.
   */
  readonly type: {
    readonly satisfies: string;
    readonly names: readonly string[];
    readonly module: string;
  };
  /**
   * The closed key sets the artifact records, each emitted above the literal
   * as a literal union type that `type.satisfies` names. The artifact's own
   * contract then refuses a key the SRD text does not print, and the runtime
   * mints the `ContentKey` brand by membership in the same set.
   */
  readonly keyUnions?: readonly SrdArtifactKeyUnion[];
  derive(read: SrdCorpusReader): unknown;
}

/** One closed key set an artifact records (see {@link SrdArtifact.keyUnions}). */
export interface SrdArtifactKeyUnion {
  /** The exported literal union type's name. */
  readonly name: string;
  /** What one member is, for the type's doc comment. */
  readonly member: string;
  /**
   * The path from the derived value to an array of rows, each with a string
   * `content_key` (`[]` when the value itself is that array).
   */
  readonly rows: readonly string[];
}

/** The drift test every artifact without a dedicated one is checked by. */
const ARTIFACTS_DRIFT_TEST = 'tests/unit/tools/srd-artifacts-fresh.test.ts';

function spellListTexts(read: SrdCorpusReader): Record<SrdSpellList, string> {
  return Object.fromEntries(SRD_SPELL_LISTS.map((list) =>
    [list, read(SRD_SPELL_LIST_PATHS[list])],
  )) as Record<SrdSpellList, string>;
}

export const SRD_ARTIFACTS: readonly SrdArtifact[] = [
  {
    path: 'src/rules/generated/class-level-features-srd.ts',
    sources: [SRD_CORPUS_PATHS.classLevelTables],
    reader: 'src/rules/class-level-features-srd-reader.ts',
    driftTest: 'tests/unit/rules/class-level-features-srd-generation.test.ts',
    exportName: 'BUNDLED_SRD_CLASS_LEVEL_FEATURES',
    type: {
      satisfies: 'readonly SrdClassLevelFeatures[]',
      names: ['SrdClassLevelFeatures'],
      module: '../class-level-features-srd-reader',
    },
    derive: (read) => parseSrdClassLevelFeatures(
      read(SRD_CORPUS_PATHS.classLevelTables),
    ),
  },
  {
    path: 'src/rules/generated/class-resources-srd.ts',
    sources: [SRD_CORPUS_PATHS.classLevelTables, SRD_CORPUS_PATHS.fullSrd],
    reader: 'src/rules/class-resources-srd-reader.ts',
    driftTest: 'tests/unit/rules/class-resources-srd-generation.test.ts',
    exportName: 'BUNDLED_SRD_CLASS_RESOURCES',
    type: {
      satisfies: 'SrdClassResourceArtifact',
      names: ['SrdClassResourceArtifact'],
      module: '../class-resources-srd-reader',
    },
    derive: (read) => deriveSrdClassResourceArtifact(
      read(SRD_CORPUS_PATHS.fullSrd),
      read(SRD_CORPUS_PATHS.classLevelTables),
    ),
  },
  {
    path: 'src/rules/generated/spells-srd.ts',
    sources: [
      SRD_CORPUS_PATHS.spellDescriptions,
      ...SRD_SPELL_LISTS.map((list) => SRD_SPELL_LIST_PATHS[list]),
    ],
    reader: 'src/rules/spells-srd-reader.ts',
    driftTest: 'tests/unit/rules/spells-srd-generation.test.ts',
    exportName: 'BUNDLED_SRD_SPELL_CATALOG',
    type: {
      satisfies: 'SrdSpellCatalogArtifact<BundledSrdSpellContentKeyText>',
      names: ['SrdSpellCatalogArtifact'],
      module: '../spells-srd-reader',
    },
    keyUnions: [
      { name: 'BundledSrdSpellContentKeyText', member: 'spell version key', rows: ['descriptions'] },
    ],
    derive: (read) => deriveSrdSpellCatalogArtifact(
      read(SRD_CORPUS_PATHS.spellDescriptions),
      spellListTexts(read),
    ),
  },
  {
    path: 'src/simulation/generated/coverage-source.ts',
    sources: [SRD_CORPUS_PATHS.fullSrd, SRD_CORPUS_PATHS.spellDescriptions],
    reader: 'src/simulation/coverage-source.ts',
    driftTest: 'tests/unit/simulation/coverage-source-generation.test.ts',
    exportName: 'BUNDLED_COVERAGE_SOURCE',
    type: {
      satisfies: 'BundledCoverageSource',
      names: ['BundledCoverageSource'],
      module: '../coverage-source',
    },
    derive: (read) => deriveBundledCoverageSource(
      read(SRD_CORPUS_PATHS.fullSrd),
      read(SRD_CORPUS_PATHS.spellDescriptions),
    ),
  },
  {
    path: 'src/rules/generated/ability-score-generation-srd.ts',
    sources: [SRD_CORPUS_PATHS.abilityScoreGeneration],
    reader: 'src/rules/ability-score-generation-srd-reader.ts',
    driftTest: ARTIFACTS_DRIFT_TEST,
    exportName: 'BUNDLED_SRD_ABILITY_SCORE_GENERATION',
    type: {
      satisfies: 'SrdAbilityScoreGenerationArtifact',
      names: ['SrdAbilityScoreGenerationArtifact'],
      module: '../ability-score-generation-srd-reader',
    },
    derive: (read) => deriveSrdAbilityScoreGenerationArtifact(
      read(SRD_CORPUS_PATHS.abilityScoreGeneration),
    ),
  },
  {
    path: 'src/rules/generated/armor-srd.ts',
    sources: [SRD_CORPUS_PATHS.armorTable],
    reader: 'src/rules/armor-srd-reader.ts',
    driftTest: ARTIFACTS_DRIFT_TEST,
    exportName: 'BUNDLED_SRD_ARMOR_TEMPLATES',
    type: {
      satisfies: 'readonly SrdArmorTemplate<BundledSrdArmorContentKeyText>[]',
      names: ['SrdArmorTemplate'],
      module: '../armor-srd-reader',
    },
    keyUnions: [
      { name: 'BundledSrdArmorContentKeyText', member: 'armour template key', rows: [] },
    ],
    derive: (read) => parseSrdArmorTemplates(read(SRD_CORPUS_PATHS.armorTable)),
  },
  {
    path: 'src/rules/generated/class-choice-entitlements-srd.ts',
    sources: [
      SRD_CORPUS_PATHS.classExpertise,
      SRD_CORPUS_PATHS.classSpellReplacement,
      SRD_CORPUS_PATHS.classLevelTables,
    ],
    reader: 'src/rules/class-choice-entitlements-srd-reader.ts',
    driftTest: ARTIFACTS_DRIFT_TEST,
    exportName: 'BUNDLED_SRD_CLASS_CHOICE_ENTITLEMENTS',
    type: {
      satisfies: 'SrdClassChoiceEntitlementArtifact',
      names: ['SrdClassChoiceEntitlementArtifact'],
      module: '../class-choice-entitlements-srd-reader',
    },
    derive: (read) => deriveSrdClassChoiceEntitlementArtifact(
      read(SRD_CORPUS_PATHS.classExpertise),
      read(SRD_CORPUS_PATHS.classSpellReplacement),
      parseSrdClassLevelFeatures(read(SRD_CORPUS_PATHS.classLevelTables)),
    ),
  },
  {
    path: 'src/rules/generated/class-equipment-srd.ts',
    sources: [
      SRD_CORPUS_PATHS.classStartingEquipment,
      SRD_CORPUS_PATHS.weaponsTable,
      SRD_CORPUS_PATHS.armorTable,
    ],
    reader: 'src/rules/class-equipment-srd-reader.ts',
    driftTest: ARTIFACTS_DRIFT_TEST,
    exportName: 'BUNDLED_SRD_CLASS_EQUIPMENT',
    type: {
      satisfies: 'readonly SrdClassEquipment[]',
      names: ['SrdClassEquipment'],
      module: '../class-equipment-srd-reader',
    },
    derive: (read) => parseSrdClassEquipment(
      read(SRD_CORPUS_PATHS.classStartingEquipment),
      parseSrdWeaponTemplates(read(SRD_CORPUS_PATHS.weaponsTable)),
      parseSrdArmorTemplates(read(SRD_CORPUS_PATHS.armorTable)),
    ),
  },
  {
    path: 'src/rules/generated/class-traits-srd.ts',
    sources: [
      SRD_CORPUS_PATHS.classCoreTraits,
      SRD_CORPUS_PATHS.attackClassFeatures,
    ],
    reader: 'src/rules/class-traits-srd-reader.ts',
    driftTest: ARTIFACTS_DRIFT_TEST,
    exportName: 'BUNDLED_SRD_CLASS_TRAITS',
    type: {
      satisfies: 'SrdClassTraitsArtifact',
      names: ['SrdClassTraitsArtifact'],
      module: '../class-traits-srd-reader',
    },
    derive: (read) => deriveSrdClassTraitsArtifact(
      read(SRD_CORPUS_PATHS.classCoreTraits),
      read(SRD_CORPUS_PATHS.attackClassFeatures),
    ),
  },
  {
    path: 'src/rules/generated/draconic-resilience-srd.ts',
    sources: [SRD_CORPUS_PATHS.draconicResilience],
    reader: 'src/rules/draconic-resilience-srd-reader.ts',
    driftTest: ARTIFACTS_DRIFT_TEST,
    exportName: 'BUNDLED_SRD_DRACONIC_RESILIENCE',
    type: {
      satisfies: 'SrdDraconicResilienceFeature',
      names: ['SrdDraconicResilienceFeature'],
      module: '../draconic-resilience-srd-reader',
    },
    derive: (read) => parseSrdDraconicResilience(
      read(SRD_CORPUS_PATHS.draconicResilience),
    ),
  },
  {
    path: 'src/rules/generated/extra-attack-srd.ts',
    sources: [SRD_CORPUS_PATHS.extraAttackOtherSources],
    reader: 'src/rules/extra-attack-srd-reader.ts',
    driftTest: ARTIFACTS_DRIFT_TEST,
    exportName: 'BUNDLED_SRD_NAMED_EXTRA_ATTACK_FEATURES',
    type: {
      satisfies: 'readonly SrdNamedFeature[]',
      names: ['SrdNamedFeature'],
      module: '../extra-attack-srd-reader',
    },
    derive: (read) => parseSrdNamedExtraAttackFeatures(
      read(SRD_CORPUS_PATHS.extraAttackOtherSources),
    ),
  },
  {
    path: 'src/rules/generated/feats-srd.ts',
    sources: [SRD_CORPUS_PATHS.feats],
    reader: 'src/rules/feats-srd-reader.ts',
    driftTest: ARTIFACTS_DRIFT_TEST,
    exportName: 'BUNDLED_SRD_FEAT_DEFINITIONS',
    type: {
      satisfies: 'readonly SrdFeatDefinitionRecord[]',
      names: ['SrdFeatDefinitionRecord'],
      module: '../feats-srd-reader',
    },
    derive: (read) => parseSrdFeatDefinitions(read(SRD_CORPUS_PATHS.feats)),
  },
  {
    path: 'src/rules/generated/multiclass-entry-srd.ts',
    sources: [
      SRD_CORPUS_PATHS.multiclassEntryGrants,
      SRD_CORPUS_PATHS.classCoreTraits,
    ],
    reader: 'src/rules/multiclass-entry-srd-reader.ts',
    driftTest: ARTIFACTS_DRIFT_TEST,
    exportName: 'BUNDLED_SRD_MULTICLASS_ENTRY_GRANTS',
    type: {
      satisfies: 'readonly SrdMulticlassEntryGrant[]',
      names: ['SrdMulticlassEntryGrant'],
      module: '../multiclass-entry-srd-reader',
    },
    derive: (read) => parseSrdMulticlassEntryGrants(
      read(SRD_CORPUS_PATHS.multiclassEntryGrants),
      parseSrdClassTraits(read(SRD_CORPUS_PATHS.classCoreTraits)),
    ),
  },
  {
    path: 'src/rules/generated/origins-srd.ts',
    sources: [
      SRD_CORPUS_PATHS.speciesDescriptions,
      SRD_CORPUS_PATHS.backgrounds,
    ],
    reader: 'src/rules/origins-srd-reader.ts',
    driftTest: ARTIFACTS_DRIFT_TEST,
    exportName: 'BUNDLED_SRD_ORIGINS',
    type: {
      satisfies: 'SrdOriginsArtifact<BundledSrdSpeciesContentKeyText, BundledSrdBackgroundContentKeyText>',
      names: ['SrdOriginsArtifact'],
      module: '../origins-srd-reader',
    },
    keyUnions: [
      { name: 'BundledSrdSpeciesContentKeyText', member: 'species template key', rows: ['species'] },
      { name: 'BundledSrdBackgroundContentKeyText', member: 'background template key', rows: ['backgrounds'] },
    ],
    derive: (read) => deriveSrdOriginsArtifact(
      read(SRD_CORPUS_PATHS.speciesDescriptions),
      read(SRD_CORPUS_PATHS.backgrounds),
    ),
  },
  {
    path: 'src/rules/generated/skills.ts',
    sources: [SRD_CORPUS_PATHS.skillsTable],
    reader: 'src/rules/skills-reader.ts',
    driftTest: ARTIFACTS_DRIFT_TEST,
    exportName: 'BUNDLED_SRD_SKILL_ABILITIES',
    type: {
      satisfies: 'SrdSkillAbilitiesArtifact',
      names: ['SrdSkillAbilitiesArtifact'],
      module: '../skills-reader',
    },
    derive: (read) => deriveSrdSkillAbilitiesArtifact(
      read(SRD_CORPUS_PATHS.skillsTable),
    ),
  },
  {
    path: 'src/rules/generated/srd-subclasses.ts',
    sources: [SRD_CORPUS_PATHS.subclasses],
    reader: 'src/rules/srd-subclasses-reader.ts',
    driftTest: ARTIFACTS_DRIFT_TEST,
    exportName: 'BUNDLED_SRD_SUBCLASS_MANIFEST',
    type: {
      satisfies: 'SrdSubclassManifest',
      names: ['SrdSubclassManifest'],
      module: '../srd-subclasses-reader',
    },
    derive: (read) => parseSrdSubclasses(read(SRD_CORPUS_PATHS.subclasses)),
  },
  {
    path: 'src/rules/generated/unarmored-defense-srd.ts',
    sources: [SRD_CORPUS_PATHS.unarmoredDefense],
    reader: 'src/rules/unarmored-defense-srd-reader.ts',
    driftTest: ARTIFACTS_DRIFT_TEST,
    exportName: 'BUNDLED_SRD_UNARMORED_DEFENSE_FEATURES',
    type: {
      satisfies: 'readonly SrdUnarmoredDefenseFeature[]',
      names: ['SrdUnarmoredDefenseFeature'],
      module: '../unarmored-defense-srd-reader',
    },
    derive: (read) => parseSrdUnarmoredDefenseFeatures(
      read(SRD_CORPUS_PATHS.unarmoredDefense),
    ),
  },
  {
    path: 'src/rules/generated/weapons-srd.ts',
    sources: [
      SRD_CORPUS_PATHS.weaponsTable,
      SRD_CORPUS_PATHS.weaponMasteryProgression,
    ],
    reader: 'src/rules/weapons-srd-reader.ts',
    driftTest: ARTIFACTS_DRIFT_TEST,
    exportName: 'BUNDLED_SRD_WEAPONS',
    type: {
      satisfies: 'SrdWeaponsArtifact<BundledSrdWeaponContentKeyText>',
      names: ['SrdWeaponsArtifact'],
      module: '../weapons-srd-reader',
    },
    keyUnions: [
      { name: 'BundledSrdWeaponContentKeyText', member: 'weapon template key', rows: ['templates'] },
    ],
    derive: (read) => deriveSrdWeaponsArtifact(
      read(SRD_CORPUS_PATHS.weaponsTable),
      read(SRD_CORPUS_PATHS.weaponMasteryProgression),
    ),
  },
  // PC-EXPORT-TRUTH (D918): the Draconic Ancestors table and each species'
  // standing Darkvision. It joined this table at landing batch 2; it had its
  // own generator and header before.
  {
    path: 'src/rules/generated/species-srd-tables.ts',
    sources: [SRD_CORPUS_PATHS.speciesDescriptions],
    reader: 'src/rules/species-srd-tables-reader.ts',
    driftTest: 'tests/unit/rules/species-srd-tables-generation.test.ts',
    exportName: 'BUNDLED_SRD_SPECIES_TABLES',
    type: {
      satisfies: 'SpeciesSrdTablesArtifact',
      names: ['SpeciesSrdTablesArtifact'],
      module: '../species-srd-tables-reader',
    },
    derive: (read) => deriveSrdSpeciesTablesArtifact(
      read(SRD_CORPUS_PATHS.speciesDescriptions),
    ),
  },
];

export function srdArtifact(path: string): SrdArtifact {
  const artifact = SRD_ARTIFACTS.find((candidate) => candidate.path === path);
  if (artifact === undefined) {
    throw new Error(`${path} is not a generated SRD artifact.`);
  }
  return artifact;
}

export class SrdArtifactError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SrdArtifactError';
  }
}

/**
 * Refuses a value JSON would change on the way to the artifact: an `undefined`
 * property (dropped), a non-finite number or -0 (rewritten), a Map, Set or
 * class instance (flattened to `{}`). The artifact must read back as exactly
 * what the reader derived.
 */
function assertJsonFaithful(value: unknown, at: string): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new SrdArtifactError(`${at} is ${String(value)}, which JSON cannot carry.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      assertJsonFaithful(entry, `${at}[${String(index)}]`);
    });
    return;
  }
  if (typeof value === 'object') {
    const prototype: unknown = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new SrdArtifactError(`${at} is not a plain object.`);
    }
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') {
        throw new SrdArtifactError(`${at} has a symbol key.`);
      }
      assertJsonFaithful(
        (value as Record<string, unknown>)[key],
        `${at}.${key}`,
      );
    }
    return;
  }
  throw new SrdArtifactError(`${at} is a ${typeof value}, which JSON cannot carry.`);
}

/** The recorded keys at `union.rows`, checked: an array of rows, each with a distinct string key. */
function recordedKeys(
  artifact: SrdArtifact,
  union: SrdArtifactKeyUnion,
  value: unknown,
): readonly string[] {
  const at = [artifact.exportName, ...union.rows].join('.');
  let rows: unknown = value;
  for (const field of union.rows) {
    if (typeof rows !== 'object' || rows === null || !Object.hasOwn(rows, field)) {
      throw new SrdArtifactError(`${at} is not in the derived value.`);
    }
    rows = Reflect.get(rows, field);
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new SrdArtifactError(`${at} is not a non-empty array of rows.`);
  }
  const keys = rows.map((row: unknown, index): string => {
    const key: unknown = typeof row === 'object' && row !== null
      ? Reflect.get(row, 'content_key')
      : undefined;
    if (typeof key !== 'string') {
      throw new SrdArtifactError(`${at}[${String(index)}] has no string content_key.`);
    }
    return key;
  });
  if (new Set(keys).size !== keys.length) {
    throw new SrdArtifactError(`${at} records a content_key twice.`);
  }
  return keys;
}

/** The literal union type of one recorded key set, one member per line. */
function keyUnionLines(
  artifact: SrdArtifact,
  union: SrdArtifactKeyUnion,
  value: unknown,
): readonly string[] {
  if (!artifact.type.satisfies.includes(union.name)) {
    throw new SrdArtifactError(
      `${artifact.path} emits ${union.name}, which its satisfies type does not name.`,
    );
  }
  const keys = recordedKeys(artifact, union, value);
  return [
    `/** Every ${union.member} this artifact records: the closed set the runtime mints \`ContentKey\` from. */`,
    `export type ${union.name} =`,
    ...keys.map((key, index) =>
      `  | ${JSON.stringify(key)}${index === keys.length - 1 ? ';' : ''}`,
    ),
    '',
  ];
}

/**
 * A corpus's whole-text fingerprint: the sha256 of its UTF-8 bytes. The text
 * must not hold U+FFFD, the one character a decoder substitutes for bytes it
 * could not read: with it excluded, decoding is one-to-one, so this digest is
 * the digest of the file's bytes and any byte edit changes it.
 */
export function srdCorpusFingerprint(path: string, text: string): string {
  if (text.includes('�')) {
    throw new SrdArtifactError(
      `${path} holds U+FFFD, so its text no longer determines its bytes; fix its encoding.`,
    );
  }
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** The header line that pins one source corpus. */
function fingerprintLine(path: string, text: string): string {
  return `//   ${path} sha256=${srdCorpusFingerprint(path, text)}`;
}

const SRD_ATTRIBUTION = [
  'This work includes material from the System Reference Document 5.2.1',
  '("SRD 5.2.1") by Wizards of the Coast LLC, available at',
  'https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative',
  'Commons Attribution 4.0 International License, available at',
  'https://creativecommons.org/licenses/by/4.0/legalcode.',
] as const;

/** Where every artifact imports `deepFreeze` from: the domain's, the one implementation. */
const DEEP_FREEZE_MODULE = 'src/domain/deep-freeze';

/** The `deepFreeze` import specifier, relative to the artifact's own path. */
function deepFreezeSpecifier(artifactPath: string): string {
  const relative = posix.relative(posix.dirname(artifactPath), DEEP_FREEZE_MODULE);
  return relative.startsWith('.') ? relative : `./${relative}`;
}

/** The artifact's complete source text, derived from the corpora `read` returns. */
export function composeSrdArtifact(
  artifact: SrdArtifact,
  read: SrdCorpusReader,
): string {
  const value = artifact.derive((path) => {
    if (!artifact.sources.includes(path)) {
      throw new SrdArtifactError(
        `${artifact.path} read ${path}, which is not one of its declared sources.`,
      );
    }
    return read(path);
  });
  assertJsonFaithful(value, artifact.exportName);
  return [
    '// GENERATED FILE — DO NOT EDIT BY HAND.',
    `// Source of truth, read by ${artifact.reader}, each source pinned by its sha256:`,
    ...artifact.sources.map((source) => fingerprintLine(source, read(source))),
    '// Regenerate with `npm run srd:artifacts`.',
    `// ${artifact.driftTest} fails if it drifts, or if any byte of a source changes.`,
    '/**',
    ...SRD_ATTRIBUTION.map((line) => ` * ${line}`),
    ' */',
    `import { deepFreeze } from '${deepFreezeSpecifier(artifact.path)}';`,
    `import type { ${artifact.type.names.join(', ')} } from '${artifact.type.module}';`,
    '',
    ...(artifact.keyUnions ?? []).flatMap((union) => keyUnionLines(artifact, union, value)),
    `export const ${artifact.exportName} = ${JSON.stringify(value, null, 2)} as const satisfies ${artifact.type.satisfies};`,
    `deepFreeze(${artifact.exportName});`,
    '',
  ].join('\n');
}

/**
 * The first half of the drift check: each source's fingerprint line must be in
 * the committed header, so an edit anywhere in a corpus fails here and names
 * the corpus, even where no parse reads the edited bytes. It derives nothing.
 */
export function assertSrdArtifactSourcesPinned(
  artifact: SrdArtifact,
  read: SrdCorpusReader,
  committed: string,
): void {
  const committedLines = committed.split('\n');
  for (const source of artifact.sources) {
    const expected = fingerprintLine(source, read(source));
    if (!committedLines.includes(expected)) {
      const pinned = committedLines.find((line) =>
        line.startsWith(`//   ${source} sha256=`),
      );
      throw new SrdArtifactError(
        `${artifact.path} is stale: ${source} is not the corpus it was generated from ` +
          `(pinned ${pinned === undefined ? 'nothing' : pinned.slice(pinned.indexOf('sha256='))}, ` +
          `the corpus is now ${expected.slice(expected.indexOf('sha256='))}). ` +
          'Run `npm run srd:artifacts`; never edit it by hand.',
      );
    }
  }
}

/**
 * The drift check every artifact's test runs. FIRST THE SOURCES
 * ({@link assertSrdArtifactSourcesPinned}); THEN THE BYTES: the committed text
 * must be exactly what the readers derive from the SRD text now.
 */
export function assertSrdArtifactFresh(
  artifact: SrdArtifact,
  read: SrdCorpusReader,
  committed: string,
): void {
  assertSrdArtifactSourcesPinned(artifact, read, committed);
  const composed = composeSrdArtifact(artifact, read);
  if (composed === committed) {
    return;
  }
  const committedLines = committed.split('\n');
  const composedLines = composed.split('\n');
  const line = composedLines.findIndex(
    (text, index) => text !== committedLines[index],
  );
  const at = line < 0 ? committedLines.length : line;
  throw new SrdArtifactError(
    `${artifact.path} is stale at line ${String(at + 1)}: the SRD text derives ` +
      `${JSON.stringify(composedLines[at] ?? '<end of file>')}, the committed file has ` +
      `${JSON.stringify(committedLines[at] ?? '<end of file>')}. Run \`npm run srd:artifacts\`; never edit it by hand.`,
  );
}

export interface SrdArtifactFiles {
  read(path: string): string;
  write(path: string, text: string): void;
}

/**
 * Writes every artifact freshly composed from the corpora `files` reads. An
 * artifact already on disk is never consulted: a stale one is overwritten.
 * Returns the paths written, in table order.
 */
export function writeSrdArtifacts(
  files: SrdArtifactFiles,
  artifacts: readonly SrdArtifact[] = SRD_ARTIFACTS,
): readonly string[] {
  const composed = artifacts.map((artifact) => ({
    path: artifact.path,
    text: composeSrdArtifact(artifact, (path) => files.read(path)),
  }));
  for (const { path, text } of composed) {
    files.write(path, text);
  }
  return composed.map(({ path }) => path);
}
