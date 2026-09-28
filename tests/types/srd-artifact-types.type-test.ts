/**
 * THE PROOF that the generated SRD artifacts carry their facts in their types
 * (D916, D918): each artifact is `as const satisfies <DomainType>`, so its
 * literals keep their literal types, and each domain type closes the set the
 * SRD closes.
 *
 * This file has no runtime. `tsconfig.node.json` includes `tests`, so `tsc -b`
 * compiles it; the `.type-test.ts` suffix keeps vitest away from it. Every
 * assertion is a POSITIVE claim (`Assert<…>` of `true`); a claim that is false
 * is a TS2344, with no suppression comment involved — the convention
 * `codec-required.type-test.ts` explains. The negative probes below are
 * positive claims that a wrong literal does NOT satisfy its domain type.
 *
 * The literal values asserted in the last section were read off the committed
 * extracts by eye (`docs/srd/source/class-level-tables.txt:15-34` for the Rages
 * column; the first spell and the first armour of their extracts), never taken
 * from the artifacts.
 */
import type {
  ClassResourceFormula,
  ClassResourceFormulaRecord,
  ClassResourceFormulaStep,
} from '../../src/domain/class-resources';
import type { Ability, CharacterLevel, Skill } from '../../src/domain/enums';
import type { ContentKey } from '../../src/domain/ids';
import type { PerCharacterLevel } from '../../src/domain/per-level';
import type { RecordedContentKey } from '../../src/domain/recorded-content-keys';
import type { SpellRange } from '../../src/domain/spell-range';
import type { BundledArmorContentKey } from '../../src/rules/armor-srd';
import type { SrdArmorContentKey } from '../../src/rules/armor-srd-reader';
import type {
  BundledBackgroundContentKey,
  BundledSpeciesContentKey,
} from '../../src/rules/origins-srd';
import type { SrdSkillAbilitiesArtifact } from '../../src/rules/skills-reader';
import type { BundledSpellContentKey } from '../../src/rules/spells-srd';
import type {
  SrdCastingOption,
  SrdSpellActionType,
  SrdSpellCatalogArtifact,
  SrdSpellComponents,
  SrdSpellContentKeyText,
  SrdSpellDuration,
  SrdSpellLevel,
} from '../../src/rules/spells-srd-reader';
import type { BundledClassContentKeyText, SrdClassName } from '../../src/rules/srd-class-names';
import type { BundledWeaponContentKey } from '../../src/rules/weapons-srd';
import type {
  BUNDLED_SRD_ARMOR_TEMPLATES,
  BundledSrdArmorContentKeyText,
} from '../../src/rules/generated/armor-srd';
import type { BUNDLED_SRD_CLASS_RESOURCES } from '../../src/rules/generated/class-resources-srd';
import type {
  BUNDLED_SRD_ORIGINS,
  BundledSrdBackgroundContentKeyText,
  BundledSrdSpeciesContentKeyText,
} from '../../src/rules/generated/origins-srd';
import type {
  BUNDLED_SRD_SPELL_CATALOG,
  BundledSrdSpellContentKeyText,
} from '../../src/rules/generated/spells-srd';
import type {
  BUNDLED_SRD_WEAPONS,
  BundledSrdWeaponContentKeyText,
} from '../../src/rules/generated/weapons-srd';

/** Compiles only when `T` is exactly `true`. `false` is a TS2344. */
type Assert<T extends true> = T;
/** `true` when `Candidate` does NOT satisfy `Domain`. */
type Refuses<Candidate, Domain> = [Candidate] extends [Domain] ? false : true;
/** `true` when `Candidate` satisfies `Domain`. */
type Accepts<Candidate, Domain> = [Candidate] extends [Domain] ? true : false;
type Exact<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends
  (<T>() => T extends Right ? 1 : 2)
    ? true
    : false;

type Twenty = readonly [
  number, number, number, number, number, number, number, number, number, number,
  number, number, number, number, number, number, number, number, number, number,
];
type Nineteen = readonly [
  number, number, number, number, number, number, number, number, number, number,
  number, number, number, number, number, number, number, number, number,
];

/* ---------- a class table is twenty rows, and a class level is 1..20 ------ */
type _PerLevelAcceptsTwenty = Assert<Accepts<Twenty, PerCharacterLevel<number>>>;
type _PerLevelRefusesNineteen = Assert<Refuses<Nineteen, PerCharacterLevel<number>>>;
type _PerLevelRefusesAnArray = Assert<Refuses<readonly number[], PerCharacterLevel<number>>>;
type _LevelRefusesTwentyOne = Assert<Refuses<21, CharacterLevel>>;
type _LevelRefusesZero = Assert<Refuses<0, CharacterLevel>>;
type _SpellLevelAcceptsCantrip = Assert<Accepts<0, SrdSpellLevel>>;
type _SpellLevelRefusesTen = Assert<Refuses<10, SrdSpellLevel>>;

/* ---------- content keys are the closed set of printed keys --------------- */
type _ClassKeyAcceptsBard = Assert<Accepts<'2024:class:bard', BundledClassContentKeyText>>;
type _ClassKeyRefusesArtificer = Assert<Refuses<'2024:class:artificer', BundledClassContentKeyText>>;
type _ClassKeyRefusesCapitals = Assert<Refuses<'2024:class:Bard', BundledClassContentKeyText>>;
type _ArmorKeyRefusesWeaponKind = Assert<Refuses<'2024:weapon:club', SrdArmorContentKey>>;
type _ClassNameRefusesArtificer = Assert<Refuses<'Artificer', SrdClassName>>;

/* ---------- the spell vocabularies are closed; printed text is display ---- */
type _CastingRefusesADay = Assert<Refuses<
  { readonly unit: 'day'; readonly amount: 1; readonly mode: null },
  SrdCastingOption
>>;
type _CastingRefusesAnActionWithAnAmount = Assert<Refuses<
  { readonly unit: 'action'; readonly amount: 1; readonly mode: null },
  SrdCastingOption
>>;
type _ActionTypeRefusesFreeText = Assert<Refuses<'Free Action', SrdSpellActionType>>;
type _DurationRefusesPermanent = Assert<Refuses<{ readonly kind: 'permanent' }, SrdSpellDuration>>;
type _DurationRefusesAWeek = Assert<Refuses<
  {
    readonly kind: 'timed';
    readonly amount: 1;
    readonly unit: 'week';
    readonly concentration: false;
    readonly up_to: false;
  },
  SrdSpellDuration
>>;
type _RangeRefusesAMilesKind = Assert<Refuses<{ readonly kind: 'miles'; readonly area: null }, SpellRange>>;
type _ComponentsRequireTheFlags = Assert<Refuses<
  { readonly material: null; readonly cost: null },
  SrdSpellComponents
>>;
type _SkillsRefuseAMissingSkill = Assert<Refuses<
  Readonly<Omit<Record<Skill, Ability>, 'performance'>>,
  SrdSkillAbilitiesArtifact
>>;

/* ---------- the committed artifacts keep their literals ------------------- */
type Spells = (typeof BUNDLED_SRD_SPELL_CATALOG)['descriptions'];
type _FirstSpellKeyIsALiteral = Assert<Exact<Spells[0]['content_key'], '2024:acid-arrow'>>;
type _FirstArmorKeyIsALiteral = Assert<Exact<
  (typeof BUNDLED_SRD_ARMOR_TEMPLATES)[0]['content_key'],
  '2024:armor:padded-armor'
>>;
type BarbarianRages = (typeof BUNDLED_SRD_CLASS_RESOURCES)['manifest'][0]['ladders'][0]['maxima'];
type _BarbarianRagesAreTheTwentyPrintedCells = Assert<Exact<
  BarbarianRages,
  readonly [2, 2, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6]
>>;

/**
 * EVERY CLASS-LIST MEMBERSHIP NAMES A DESCRIBED SPELL, proved by the compiler
 * over the literal names: the runtime seeder's dangling-name refusal can no
 * longer be reached by the bundled catalog.
 */
type DescribedName = Spells[number]['name'];
type ListedName = (typeof BUNDLED_SRD_SPELL_CATALOG)['memberships'][number]['spell_name'];
type _EveryListedSpellIsDescribed = Assert<Accepts<ListedName, DescribedName>>;
type _AnUndescribedNameIsNotListed = Assert<Refuses<'Chronal Shift', DescribedName>>;

/**
 * A CLASS-RESOURCE FORMULA IS A DISCRIMINATED UNION, NOT STORAGE COLUMNS
 * (fix round 2, P1). Each arm carries exactly its payload, so none of these
 * contradictory or stringly states is a recorded formula.
 */
type _FormulaRefusesStepsAsJsonText = Assert<Refuses<
  {
    readonly kind: 'fixed_count_by_class_level';
    readonly steps: '[{"minimum_class_level":17,"count":2}]';
  },
  ClassResourceFormulaRecord
>>;
type _FormulaRefusesASteppedCountWithNoSteps = Assert<Refuses<
  { readonly kind: 'fixed_count_by_class_level'; readonly steps: readonly [] },
  ClassResourceFormulaRecord
>>;
/**
 * Two steps, so the only thing wrong is the level: with one step this probe
 * would also be refused for its length (fix round 3), and would no longer
 * witness that a level-21 step is refused.
 */
type _FormulaRefusesAStepAtLevelTwentyOne = Assert<Refuses<
  {
    readonly kind: 'fixed_count_by_class_level';
    readonly steps: readonly [
      { readonly minimum_class_level: 9; readonly count: 1 },
      { readonly minimum_class_level: 21; readonly count: 2 },
    ];
  },
  ClassResourceFormulaRecord
>>;
type _FormulaAcceptsTheSameStepsBelowTwentyOne = Assert<Accepts<
  {
    readonly kind: 'fixed_count_by_class_level';
    readonly steps: readonly [
      { readonly minimum_class_level: 9; readonly count: 1 },
      { readonly minimum_class_level: 20; readonly count: 2 },
    ];
  },
  ClassResourceFormulaRecord
>>;

/**
 * A STEPPED COUNT HAS AT LEAST TWO STEPS (fix round 3, P2). A one-step stepped
 * count cannot be stored (its later steps would be `[]`, which the decoder and
 * the table's CHECK refuse), so it is not a value of either instantiation. The
 * two-step acceptances show the refusal is the length, not the shape.
 */
type _RecordRefusesASteppedCountWithOneStep = Assert<Refuses<
  {
    readonly kind: 'fixed_count_by_class_level';
    readonly steps: readonly [{ readonly minimum_class_level: 9; readonly count: 1 }];
  },
  ClassResourceFormulaRecord
>>;
type _RecordAcceptsASteppedCountWithTwoSteps = Assert<Accepts<
  {
    readonly kind: 'fixed_count_by_class_level';
    readonly steps: readonly [
      { readonly minimum_class_level: 9; readonly count: 1 },
      { readonly minimum_class_level: 13; readonly count: 2 },
    ];
  },
  ClassResourceFormulaRecord
>>;
type _RuntimeRefusesASteppedCountWithOneStep = Assert<Refuses<
  {
    readonly kind: 'fixed_count_by_class_level';
    readonly steps: readonly [ClassResourceFormulaStep];
  },
  ClassResourceFormula
>>;
type _RuntimeAcceptsASteppedCountWithTwoSteps = Assert<Accepts<
  {
    readonly kind: 'fixed_count_by_class_level';
    readonly steps: readonly [ClassResourceFormulaStep, ClassResourceFormulaStep];
  },
  ClassResourceFormula
>>;
type _FormulaRefusesAFixedCountWithAnAbilityForItsCount = Assert<Refuses<
  { readonly kind: 'fixed_count'; readonly minimum_class_level: 2; readonly ability: 'wisdom' },
  ClassResourceFormulaRecord
>>;
type _FormulaRefusesAMultipleWithoutItsMultiplier = Assert<Refuses<
  { readonly kind: 'class_level_multiple'; readonly minimum_class_level: 1 },
  ClassResourceFormulaRecord
>>;
type _FormulaRefusesTheStorageColumns = Assert<Refuses<
  {
    readonly formula_kind: 'fixed_count';
    readonly minimum_class_level: 2;
    readonly fixed_count: 1;
    readonly ability: null;
    readonly multiplier: null;
    readonly later_fixed_count_steps: null;
  },
  ClassResourceFormulaRecord
>>;
type _ARuntimeFormulaIsMintedNotWritten = Assert<Refuses<
  { readonly kind: 'fixed_count'; readonly minimum_class_level: 2; readonly count: 1 },
  ClassResourceFormula
>>;

type RecordedFormulas =
  (typeof BUNDLED_SRD_CLASS_RESOURCES)['formula_manifest']['formulas'][number];
type RecordedFormula<Kind extends string> =
  Extract<RecordedFormulas, { readonly resource_kind: Kind }>['formula'];
type _NoRecordedFormulaCarriesAStorageColumn = Assert<Exact<
  Extract<RecordedFormulas['formula'], { readonly later_fixed_count_steps: unknown }>,
  never
>>;
/** Read off `class-level-tables.txt`: 127 (one use at 9), 131 (two at 13), 135 (three at 17). */
type _IndomitableIsTheThreePrintedSteps = Assert<Exact<
  RecordedFormula<'indomitable'>,
  {
    readonly kind: 'fixed_count_by_class_level';
    readonly steps: readonly [
      { readonly minimum_class_level: 9; readonly count: 1 },
      { readonly minimum_class_level: 13; readonly count: 2 },
      { readonly minimum_class_level: 17; readonly count: 3 },
    ];
  }
>>;
/** Read off `class-level-tables.txt`: 120 (one use at 2), 135 (two uses at 17). */
type _ActionSurgeIsTheTwoPrintedSteps = Assert<Exact<
  RecordedFormula<'action_surge'>,
  {
    readonly kind: 'fixed_count_by_class_level';
    readonly steps: readonly [
      { readonly minimum_class_level: 2; readonly count: 1 },
      { readonly minimum_class_level: 17; readonly count: 2 },
    ];
  }
>>;

/**
 * A BUNDLED KEY IS A RECORDED LITERAL THAT EARNED THE BRAND (fix round 2, P2).
 * Each artifact's key union is exactly the keys it records; the runtime key is
 * that union branded, so unbranded text, a bare `ContentKey`, and a key the
 * SRD does not print are all refused. The refused names were checked absent
 * from their extracts by hand: Aasimar (`species-descriptions.txt` header),
 * a fifth background (`backgrounds.txt` header: four), Katana and "Splint
 * Mail" (the armour table prints `Splint Armor`, line 24).
 */
type _TheParseTimeSpellKeyIsOpen = Assert<Accepts<'2024:chronal-shift', SrdSpellContentKeyText>>;
type _SpellKeyUnionIsExactlyTheRecordedKeys = Assert<Exact<
  BundledSrdSpellContentKeyText,
  Spells[number]['content_key']
>>;
type _SpellKeyIsTheRecordedUnionBranded = Assert<Exact<
  BundledSpellContentKey,
  RecordedContentKey<BundledSrdSpellContentKeyText>
>>;
type _SpellKeyAcceptsARecordedBrandedKey = Assert<Accepts<'2024:acid-arrow' & ContentKey, BundledSpellContentKey>>;
type _SpellKeyRefusesAnUnrecordedKey = Assert<Refuses<'2024:chronal-shift' & ContentKey, BundledSpellContentKey>>;
type _SpellKeyRefusesUnbrandedText = Assert<Refuses<'2024:acid-arrow', BundledSpellContentKey>>;
type _SpellKeyRefusesABareContentKey = Assert<Refuses<ContentKey, BundledSpellContentKey>>;
type SpellContractRow =
  SrdSpellCatalogArtifact<BundledSrdSpellContentKeyText>['descriptions'][number];
type _SpellContractAcceptsARecordedRow = Assert<Accepts<Spells[0], SpellContractRow>>;
type _SpellContractRefusesAnUnrecordedKey = Assert<Refuses<
  Omit<Spells[0], 'content_key'> & { readonly content_key: '2024:chronal-shift' },
  SpellContractRow
>>;

type _WeaponKeyUnionIsExactlyTheRecordedKeys = Assert<Exact<
  BundledSrdWeaponContentKeyText,
  (typeof BUNDLED_SRD_WEAPONS)['templates'][number]['content_key']
>>;
type _WeaponKeyAcceptsLongsword = Assert<Accepts<'2024:weapon:longsword' & ContentKey, BundledWeaponContentKey>>;
type _WeaponKeyRefusesKatana = Assert<Refuses<'2024:weapon:katana' & ContentKey, BundledWeaponContentKey>>;

type _ArmorKeyUnionIsExactlyTheRecordedKeys = Assert<Exact<
  BundledSrdArmorContentKeyText,
  (typeof BUNDLED_SRD_ARMOR_TEMPLATES)[number]['content_key']
>>;
type _ArmorKeyAcceptsSplintArmor = Assert<Accepts<'2024:armor:splint-armor' & ContentKey, BundledArmorContentKey>>;
type _ArmorKeyRefusesSplintMail = Assert<Refuses<'2024:armor:splint-mail' & ContentKey, BundledArmorContentKey>>;

type _SpeciesKeyUnionIsExactlyTheRecordedKeys = Assert<Exact<
  BundledSrdSpeciesContentKeyText,
  (typeof BUNDLED_SRD_ORIGINS)['species'][number]['content_key']
>>;
type _SpeciesKeyAcceptsTiefling = Assert<Accepts<'2024:species:tiefling' & ContentKey, BundledSpeciesContentKey>>;
type _SpeciesKeyRefusesAasimar = Assert<Refuses<'2024:species:aasimar' & ContentKey, BundledSpeciesContentKey>>;

type _BackgroundKeyUnionIsExactlyTheRecordedKeys = Assert<Exact<
  BundledSrdBackgroundContentKeyText,
  (typeof BUNDLED_SRD_ORIGINS)['backgrounds'][number]['content_key']
>>;
type _BackgroundKeyAcceptsSage = Assert<Accepts<'2024:background:sage' & ContentKey, BundledBackgroundContentKey>>;
type _BackgroundKeyRefusesNoble = Assert<Refuses<'2024:background:noble' & ContentKey, BundledBackgroundContentKey>>;
