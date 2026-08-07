import {
  sqlBoolean,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type RowCodec,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  abilities,
  isEnumValue,
  type Ability,
  type DomainSourceType,
  type ProgressionType,
  type RulesEdition,
  type SelectionEligibility,
  type SlotBucket,
  type SlotState,
} from '../domain/enums';
import type {
  BuildReport,
  WorkspaceSlot,
} from '../domain/read-models';
import {
  DuplicateWarningDetector,
  type DuplicateWarningAssessment,
} from '../duplicates/duplicate-warning-detector';
import {
  SpellAccessBuilder,
  type SpellAccessRoute,
} from '../access/spell-access-builder';
import {
  resolveCharacterAbilities,
  resolvedTotals,
} from '../rules/ability-contributions';
import { AbilityScores } from '../rules/ability-scores';
import { CasterContribution } from '../rules/caster-contribution';
import { characterLevel } from '../rules/character-level';
import {
  casterLevel,
  maxPreparableLevelForClass,
  pactMagic,
  slotsForCasterLevel,
  type PactMagicSlots,
  type SpellSlotCounts,
} from '../rules/spell-slots';
import { proficiencyBonus } from '../rules/proficiency';
import {
  compareAccessRoutes,
  compareBuildClasses,
  compareDuplicateAssessments,
  compareInvalidSelections,
  compareRitualEntries,
  compareSpellEntries,
  compareWizardSpellbookEntries,
} from './build-report-ordering';
import {
  catalogLayerDisclosure,
  type CatalogLayerDisclosure,
} from '../catalog/catalog-disclosure';
import { characterCatalogDisclosures } from '../queries/character-catalog-disclosures';

interface Character {
  readonly id: number;
  readonly name: string;
  readonly strength: number;
  readonly dexterity: number;
  readonly constitution: number;
  readonly intelligence: number;
  readonly wisdom: number;
  readonly charisma: number;
  readonly proficiencyBonusOverride: number | null;
}

interface ClassRow {
  readonly classDefinitionId: number;
  readonly subclassDefinitionId: number | null;
  readonly className: string;
  readonly subclassName: string | null;
  readonly classLevel: number;
  readonly classAbility: Ability | null;
  readonly subclassAbility: Ability | null;
  readonly baseProgressionType: string;
  readonly subclassFraction: string | null;
  readonly subclassRounding: string | null;
  readonly classCatalogLayer: ReturnType<typeof catalogLayerDisclosure>;
  readonly subclassCatalogLayer: ReturnType<typeof catalogLayerDisclosure> | null;
}

interface ProgressionRow {
  readonly preparedCount: number;
  readonly slots: string | null;
  readonly maxSpellLevel?: number;
}

interface BuildClass {
  readonly name: string;
  readonly subclass: string | null;
  readonly class_level: number;
  readonly spellcasting_ability: Ability | null;
  readonly progression_type: ProgressionType;
  readonly prepared_count: number;
  readonly max_preparable_level: number;
  readonly class_catalog_layer: ReturnType<typeof catalogLayerDisclosure>;
  readonly subclass_catalog_layer: ReturnType<typeof catalogLayerDisclosure> | null;
}

interface WizardSpellbookEntry {
  readonly spellbook_entry_id: number;
  readonly spell_version_id: number;
  readonly spell_name: string;
  readonly spell_catalog_layer: CatalogLayerDisclosure;
  readonly level: number;
  readonly active: boolean;
  readonly prepared: boolean;
}

interface PreparedSpell {
  readonly spell_version_id: number;
  readonly spell_name: string;
  readonly spell_catalog_layer: CatalogLayerDisclosure;
  readonly level: number;
}

interface RitualOnlySpell {
  readonly spellbook_entry_id: number;
  readonly spell_version_id: number;
  readonly spell_name: string;
  readonly spell_catalog_layer: CatalogLayerDisclosure;
  readonly level: number;
}

interface WarningAcknowledgement {
  readonly id: number;
  readonly note: string;
  readonly created_at: string;
}

export type BuildReportAssessment = DuplicateWarningAssessment & {
  readonly acknowledgement: WarningAcknowledgement | null;
};

interface InvalidSelection extends WorkspaceSlot {
  readonly sort_order: number;
}

export type BuildReportResult = Omit<
  BuildReport,
  'access_routes' | 'duplicate_assessments' | 'wizard'
> & {
  readonly access_routes: SpellAccessRoute[];
  readonly duplicate_assessments: BuildReportAssessment[];
  readonly wizard: {
    readonly spellbook: WizardSpellbookEntry[];
    readonly prepared: PreparedSpell[];
    readonly ritual_only: RitualOnlySpell[];
    readonly explanation: string;
  };
  /**
   * The PHP workspace appends this persisted-state callout to the base report.
   * R40 exposes it directly so every report consumer receives the same warning
   * data without a second, potentially differently ordered reconstruction.
   */
  readonly invalid_selections: WorkspaceSlot[];
};

const wizardExplanation =
  '“In my book” marks only the spells that Ritual Adept can expose; it does not constrain Wizard preparation and is not the same as labeling a spell known or prepared. Prepared spells are limited choices drawn from the whole Wizard spell list and can use spell slots. A spell can therefore appear both in the book and as prepared. An unprepared ritual-tagged spell in the book appears as ritual-only access; that route is not a selection, consumes no preparation capacity, and is ignored by duplicate-waste checks. Unprepared non-ritual book spells are not castable.';

function decodeAbility(value: string | null, label: string): Ability | null {
  if (value === null) {
    return null;
  }
  const normalized = value.toLowerCase();
  if (!isEnumValue(abilities, normalized)) {
    throw new Error(`Unknown ${label} '${value}'.`);
  }
  return normalized;
}

function decodeCharacter(row: SqlRow): Character {
  return {
    id: sqlInteger(row, 'id'),
    name: sqlString(row, 'name'),
    strength: sqlInteger(row, 'strength'),
    dexterity: sqlInteger(row, 'dexterity'),
    constitution: sqlInteger(row, 'constitution'),
    intelligence: sqlInteger(row, 'intelligence'),
    wisdom: sqlInteger(row, 'wisdom'),
    charisma: sqlInteger(row, 'charisma'),
    proficiencyBonusOverride: sqlNullableInteger(
      row,
      'proficiency_bonus_override',
    ),
  };
}

function decodeClassRow(row: SqlRow): ClassRow {
  return {
    classDefinitionId: sqlInteger(row, 'class_definition_id'),
    subclassDefinitionId: sqlNullableInteger(
      row,
      'subclass_definition_id',
    ),
    className: sqlString(row, 'class_name'),
    subclassName: sqlNullableString(row, 'subclass_name'),
    classLevel: sqlInteger(row, 'class_level'),
    classAbility: decodeAbility(
      sqlNullableString(row, 'class_spellcasting_ability'),
      'class spellcasting ability',
    ),
    subclassAbility: decodeAbility(
      sqlNullableString(row, 'subclass_spellcasting_ability'),
      'subclass spellcasting ability',
    ),
    baseProgressionType: sqlString(row, 'progression_type'),
    subclassFraction: sqlNullableString(row, 'subclass_caster_fraction'),
    subclassRounding: sqlNullableString(row, 'subclass_caster_rounding'),
    classCatalogLayer: catalogLayerDisclosure(
      sqlNullableString(row, 'class_catalog_layer'),
    ),
    subclassCatalogLayer:
      sqlNullableString(row, 'subclass_name') === null
        ? null
        : catalogLayerDisclosure(
            sqlNullableString(row, 'subclass_catalog_layer'),
          ),
  };
}

function decodeBaseProgression(row: SqlRow): ProgressionRow {
  return {
    preparedCount: sqlInteger(row, 'prepared_count'),
    slots: sqlNullableString(row, 'slots'),
  };
}

function decodeSubclassProgression(row: SqlRow): ProgressionRow {
  return {
    preparedCount: sqlInteger(row, 'prepared_count'),
    slots: sqlNullableString(row, 'slots'),
    maxSpellLevel: sqlInteger(row, 'max_spell_level'),
  };
}

function fractionType(fraction: string, rounding: string | null): string {
  if (fraction === '1/2' && rounding === 'up') {
    return CasterContribution.HALF_UP;
  }
  if (fraction === '1/2' && rounding === 'down') {
    return CasterContribution.HALF_DOWN;
  }
  if (fraction === '1/3' && rounding === 'up') {
    return CasterContribution.THIRD_UP;
  }
  if (fraction === '1/3' && rounding === 'down') {
    return CasterContribution.THIRD_DOWN;
  }
  throw new Error(
    `Unsupported caster fraction ${fraction} rounded ${rounding ?? ''}.`,
  );
}

function decodeSlotTable(value: string | null): Record<number, number> {
  if (value === null || value === '') {
    return {};
  }
  const decoded: unknown = JSON.parse(value);
  if (decoded === null || Array.isArray(decoded) || typeof decoded !== 'object') {
    return {};
  }

  const slots: Record<number, number> = {};
  for (const [encodedLevel, encodedCount] of Object.entries(decoded)) {
    const level = Number(encodedLevel);
    const count = Number(encodedCount);
    if (Number.isSafeInteger(level) && Number.isSafeInteger(count)) {
      slots[level] = count;
    }
  }
  return slots;
}

function slotRows(slots: SpellSlotCounts): Array<{
  level: number;
  count: number;
}> {
  return Object.entries(slots)
    .map(([level, count]) => ({ level: Number(level), count }))
    .sort((left, right) => left.level - right.level);
}

function ordinal(number: number): string {
  const lastTwo = number % 100;
  if (lastTwo >= 11 && lastTwo <= 13) {
    return `${number}th`;
  }
  switch (number % 10) {
    case 1:
      return `${number}st`;
    case 2:
      return `${number}nd`;
    case 3:
      return `${number}rd`;
    default:
      return `${number}th`;
  }
}

function preparationCallout(
  sharedSlots: SpellSlotCounts,
  pact: PactMagicSlots | null,
  maxClassSpellLevel: number,
): string {
  const sharedLevels = Object.keys(sharedSlots).map(Number);
  const sharedLevel =
    sharedLevels.length === 0 ? null : Math.max(...sharedLevels);

  if (pact !== null && sharedLevel !== null) {
    return `This build possesses shared Spellcasting slots through ${ordinal(sharedLevel)} level and Pact Magic slots at ${ordinal(pact.level)} level. Either pool can cast an eligible prepared spell. Class-specific preparation limits reach ${ordinal(maxClassSpellLevel)}-level spells; a slot from either pool does not unlock higher-level choices for another class.`;
  }
  if (pact !== null) {
    return `This build possesses no shared Spellcasting slots and Pact Magic slots at ${ordinal(pact.level)} level. Pact Magic can cast eligible prepared spells. Class-specific preparation limits reach ${ordinal(maxClassSpellLevel)}-level spells; slot level does not unlock higher-level choices.`;
  }
  if (sharedLevel === null) {
    return 'This build possesses no Spellcasting or Pact Magic slots.';
  }
  return `This build possesses ${ordinal(sharedLevel)}-level slots, but every class can prepare only ${ordinal(maxClassSpellLevel)}-level spells. Higher-level slots can upcast those lower-level spells; they do not unlock higher-level choices.`;
}

/**
 * One row of the invalid-selection query, decoded.
 *
 * The twin of `workspaceSlotRow` in `src/queries/character-workspace-builder.ts`
 * — the two queries are the same join read for two screens, and they are
 * deliberately NOT sharing a codec: this one also selects
 * `source_definition_id`, and merging them would mean one of the two screens
 * silently selecting a column it does not use.
 *
 * `ritual`/`concentration` stay `boolean | null` because NULL here means the
 * LEFT JOIN found no spell — an EMPTY slot — which is a different fact from a
 * spell that is not a ritual.
 */
interface ReportSlotRow {
  readonly id: number;
  readonly slot_key: string;
  readonly label: string | null;
  readonly bucket: SlotBucket;
  readonly spell_level_min: number;
  readonly spell_level_max: number;
  readonly spell_version_id: number | null;
  readonly state: SlotState;
  readonly eligibility: SelectionEligibility;
  readonly invalid_reason: string | null;
  readonly orphan_reason: string | null;
  readonly override_note: string | null;
  readonly locked: boolean;
  readonly sort_order: number;
  readonly ordinal: number;
  readonly source_name: string;
  readonly source_type: DomainSourceType;
  readonly source_definition_id: number | null;
  readonly source_config: string | null;
  readonly spell_name: string | null;
  readonly spell_catalog_layer: CatalogLayerDisclosure | null;
  readonly spell_level: number | null;
  readonly spell_edition: RulesEdition | null;
  readonly spell_identity_id: number | null;
  readonly ritual: boolean | null;
  readonly concentration: boolean | null;
}

const reportSlotRow: RowCodec<ReportSlotRow> = (row) => ({
  id: sqlInteger(row, 'id'),
  slot_key: sqlString(row, 'slot_key'),
  label: sqlNullableString(row, 'label'),
  bucket: sqlString(row, 'bucket') as SlotBucket,
  spell_level_min: sqlInteger(row, 'spell_level_min'),
  spell_level_max: sqlInteger(row, 'spell_level_max'),
  spell_version_id:
    sqlNullableInteger(row, 'fixed_spell_version_id') ??
    sqlNullableInteger(row, 'current_spell_version_id'),
  state: sqlString(row, 'state') as SlotState,
  eligibility: sqlString(row, 'selection_eligibility') as SelectionEligibility,
  invalid_reason: sqlNullableString(row, 'selection_invalid_reason'),
  orphan_reason: sqlNullableString(row, 'orphan_reason_code'),
  override_note: sqlNullableString(row, 'override_note'),
  locked: sqlBoolean(row, 'is_locked'),
  sort_order: sqlInteger(row, 'sort_order'),
  ordinal: sqlInteger(row, 'ordinal'),
  source_name: sqlString(row, 'source_name'),
  source_type: sqlString(row, 'source_type') as DomainSourceType,
  source_definition_id: sqlNullableInteger(row, 'source_definition_id'),
  source_config: sqlNullableString(row, 'source_config'),
  spell_name: sqlNullableString(row, 'spell_name'),
  spell_catalog_layer: catalogLayerDisclosure(
    sqlNullableString(row, 'spell_catalog_layer'),
  ),
  spell_level: sqlNullableInteger(row, 'spell_level'),
  spell_edition: sqlNullableString(row, 'spell_edition') as RulesEdition | null,
  spell_identity_id: sqlNullableInteger(row, 'spell_identity_id'),
  ritual: row.ritual === null ? null : sqlBoolean(row, 'ritual'),
  concentration:
    row.concentration === null ? null : sqlBoolean(row, 'concentration'),
});

function titleBucket(bucket: string): string {
  return bucket
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

export class BuildReportBuilder {
  readonly #access: SpellAccessBuilder;
  readonly #duplicates: DuplicateWarningDetector;

  constructor(
    private readonly db: DatabaseContext,
    access?: SpellAccessBuilder,
    duplicates?: DuplicateWarningDetector,
  ) {
    this.#access = access ?? new SpellAccessBuilder(db);
    this.#duplicates = duplicates ?? new DuplicateWarningDetector();
  }

  build(characterId: number): BuildReportResult {
    const character = this.db.one(
      `SELECT id, name, strength, dexterity, constitution, intelligence,
              wisdom, charisma, proficiency_bonus_override
       FROM characters
       WHERE id = ?`,
      [characterId],
      decodeCharacter,
    );
    if (character === null) {
      throw new Error(`Character ${characterId} does not exist.`);
    }

    const { classes, contributions, singleClassSlotTables } =
      this.classesAndContributions(characterId);
    const level = characterLevel(this.db, characterId);
    const proficiency =
      level === null
        ? null
        : character.proficiencyBonusOverride ??
          proficiencyBonus(level);
    const sharedCasterLevel = casterLevel(contributions);
    const sharedSlots =
      singleClassSlotTables.length === 1
        ? singleClassSlotTables[0]!
        : slotsForCasterLevel(sharedCasterLevel);
    const pact = pactMagic(contributions);
    const routes = this.#access
      .buildForCharacter(characterId)
      .sort(compareAccessRoutes);
    const assessments = this.attachAcknowledgements(
      characterId,
      this.#duplicates.classify(routes),
    );
    const maxClassSpellLevel =
      classes.length === 0
        ? 0
        : Math.max(...classes.map((item) => item.max_preparable_level));

    // READER TWO OF THE FOUR (plan §3.4): the report's scores go through the
    // one resolver. The read model carries BOTH answers because its consumers
    // need different ones (§3.6): `abilities` is the RESOLVED TOTAL — casting
    // badges, slot math, dice, print, the machine block — and `abilities_base`
    // is what the planner's ability editor displays and edits, because
    // `update_ability` writes what was typed straight into base and an editor
    // fed totals would bake a contribution into base on the first edit.
    const baseAbilities = {
      strength: character.strength,
      dexterity: character.dexterity,
      constitution: character.constitution,
      intelligence: character.intelligence,
      wisdom: character.wisdom,
      charisma: character.charisma,
    };
    const abilityTotals = resolvedTotals(
      resolveCharacterAbilities(this.db, character.id, baseAbilities),
    );

    const reportCore = {
      character: {
        id: character.id,
        name: character.name,
        character_level: level,
        proficiency_bonus: proficiency,
        abilities: abilityTotals,
        abilities_base: baseAbilities,
      },
      caster: {
        caster_level: sharedCasterLevel,
        slots: slotRows(sharedSlots),
        pact_magic: pact,
      },
      classes,
      catalog_sources: characterCatalogDisclosures(this.db, characterId),
      preparation_callout: preparationCallout(
        sharedSlots,
        pact,
        maxClassSpellLevel,
      ),
      access_routes: routes,
      wizard: this.wizardSplit(characterId, routes),
      duplicate_assessments: assessments,
    };

    return {
      ...reportCore,
      invalid_selections: this.invalidSelections(
        character,
        proficiency,
        routes,
        assessments,
        AbilityScores.fromArray(abilityTotals),
      ),
    };
  }

  private classesAndContributions(characterId: number): {
    classes: BuildClass[];
    contributions: CasterContribution[];
    singleClassSlotTables: Record<number, number>[];
  } {
    const rows = this.db.all(
      `SELECT level.class_definition_id, level.subclass_definition_id,
              level.level AS class_level, class.name AS class_name,
              class.spellcasting_ability AS class_spellcasting_ability,
              class.progression_type, subclass.name AS subclass_name,
              subclass.spellcasting_ability AS subclass_spellcasting_ability,
              subclass.caster_fraction AS subclass_caster_fraction,
              subclass.caster_rounding AS subclass_caster_rounding,
              class_identity.catalog_layer AS class_catalog_layer,
              subclass_identity.catalog_layer AS subclass_catalog_layer
       FROM character_class_levels AS level
       INNER JOIN class_definitions AS class
         ON class.id = level.class_definition_id
       LEFT JOIN catalog_content_identities AS class_identity
         ON class_identity.content_kind = 'class'
        AND class_identity.content_key = class.content_key
       LEFT JOIN subclass_definitions AS subclass
         ON subclass.id = level.subclass_definition_id
       LEFT JOIN catalog_content_identities AS subclass_identity
         ON subclass_identity.content_kind = 'subclass'
        AND subclass_identity.content_key = subclass.content_key
       WHERE level.character_id = ?`,
      [characterId],
      decodeClassRow,
    );

    const classes: BuildClass[] = [];
    const contributions: CasterContribution[] = [];
    const singleClassSlotTables: Record<number, number>[] = [];
    for (const row of rows) {
      const progressionType =
        row.subclassFraction === null
          ? row.baseProgressionType
          : fractionType(row.subclassFraction, row.subclassRounding);
      const contribution = new CasterContribution(
        row.className,
        row.classLevel,
        progressionType,
      );
      contributions.push(contribution);

      const baseProgression = this.db.one(
        `SELECT prepared_count, slots
         FROM class_progressions
         WHERE class_definition_id = ? AND class_level = ?`,
        [row.classDefinitionId, row.classLevel],
        decodeBaseProgression,
      );
      const subclassProgression =
        row.subclassDefinitionId === null
          ? null
          : this.db.one(
              `SELECT prepared_count, max_spell_level, slots
               FROM subclass_progressions
               WHERE subclass_definition_id = ? AND class_level = ?`,
              [row.subclassDefinitionId, row.classLevel],
              decodeSubclassProgression,
            );
      const ownProgression = subclassProgression ?? baseProgression;
      const ownSlots = decodeSlotTable(ownProgression?.slots ?? null);
      if (
        Object.keys(ownSlots).length > 0 &&
        progressionType !== CasterContribution.PACT
      ) {
        singleClassSlotTables.push(ownSlots);
      }

      classes.push({
        name: row.className,
        subclass: row.subclassName,
        class_level: row.classLevel,
        spellcasting_ability: row.subclassAbility ?? row.classAbility,
        progression_type: contribution.progression,
        prepared_count:
          (subclassProgression ?? baseProgression)?.preparedCount ?? 0,
        max_preparable_level:
          subclassProgression?.maxSpellLevel ??
          maxPreparableLevelForClass(contribution),
        class_catalog_layer: row.classCatalogLayer,
        subclass_catalog_layer: row.subclassCatalogLayer,
      });
    }

    classes.sort(compareBuildClasses);
    return { classes, contributions, singleClassSlotTables };
  }

  private attachAcknowledgements(
    characterId: number,
    assessments: DuplicateWarningAssessment[],
  ): BuildReportAssessment[] {
    const acknowledgements = new Map<string, WarningAcknowledgement>();
    for (const row of this.db.all(
      `SELECT id, warning_fingerprint, note, created_at
       FROM warning_acknowledgements
       WHERE character_id = ? AND invalidated_at IS NULL
       ORDER BY id`,
      [characterId],
      (stored) => ({
        warning_fingerprint: sqlString(stored, 'warning_fingerprint'),
        acknowledgement: {
          id: sqlInteger(stored, 'id'),
          note: sqlNullableString(stored, 'note') ?? '',
          created_at: sqlNullableString(stored, 'created_at') ?? '',
        },
      }),
    )) {
      acknowledgements.set(row.warning_fingerprint, row.acknowledgement);
    }

    return assessments
      .map((assessment): BuildReportAssessment => ({
        ...assessment,
        acknowledgement:
          assessment.warning_fingerprint === null
            ? null
            : acknowledgements.get(assessment.warning_fingerprint) ?? null,
      }))
      .sort(compareDuplicateAssessments);
  }

  private wizardSplit(
    characterId: number,
    routes: readonly SpellAccessRoute[],
  ): BuildReportResult['wizard'] {
    const wizardSourceIds = new Set(
      this.db.all(
        `SELECT source.id
         FROM character_source_instances AS source
         INNER JOIN class_definitions AS class
           ON class.id = source.source_definition_id
         WHERE source.character_id = ?
           AND source.source_type = 'class'
           AND class.name = 'Wizard'
         ORDER BY source.id`,
        [characterId],
        (row) => sqlInteger(row, 'id'),
      ),
    );
    const preparedRoutes = routes.filter(
      (route) =>
        wizardSourceIds.has(route.source_instance_id) &&
        route.bucket === 'prepared' &&
        route.casting_mode === 'with_slots',
    );
    const preparedVersionIds = new Set(
      preparedRoutes.map((route) => route.spell_version_id),
    );
    const spellbook = this.db
      .all(
        `SELECT entry.id AS spellbook_entry_id, version.id AS spell_version_id,
                version.display_name AS spell_name, version.level,
                version.is_active, identity.catalog_layer
         FROM wizard_spellbook_entries AS entry
         INNER JOIN spell_versions AS version
           ON version.id = entry.spell_version_id
         LEFT JOIN catalog_content_identities AS identity
           ON identity.content_kind = 'spell'
          AND identity.content_key = version.content_key
         WHERE entry.character_id = ?`,
        [characterId],
        (row): WizardSpellbookEntry => ({
          spellbook_entry_id: sqlInteger(row, 'spellbook_entry_id'),
          spell_version_id: sqlInteger(row, 'spell_version_id'),
          spell_name: sqlString(row, 'spell_name'),
          spell_catalog_layer: catalogLayerDisclosure(
            sqlNullableString(row, 'catalog_layer'),
          ),
          level: sqlInteger(row, 'level'),
          active: sqlBoolean(row, 'is_active'),
          prepared: preparedVersionIds.has(
            sqlInteger(row, 'spell_version_id'),
          ),
        }),
      )
      .sort(compareWizardSpellbookEntries);
    const prepared = preparedRoutes
      .map(
        (route): PreparedSpell => ({
          spell_version_id: route.spell_version_id,
          spell_name: route.spell_name,
          spell_catalog_layer: route.spell_catalog_layer,
          level: route.spell_level,
        }),
      )
      .sort(compareSpellEntries);
    const ritualOnly = routes
      .filter((route) => route.casting_mode === 'ritual_only')
      .map((route): RitualOnlySpell => {
        if (route.spellbook_entry_id === undefined) {
          throw new Error(
            `Ritual-only route ${route.spell_version_id} has no spellbook entry.`,
          );
        }
        return {
          spellbook_entry_id: route.spellbook_entry_id,
          spell_version_id: route.spell_version_id,
          spell_name: route.spell_name,
          spell_catalog_layer: route.spell_catalog_layer,
          level: route.spell_level,
        };
      })
      .sort(compareRitualEntries);

    return {
      spellbook,
      prepared,
      ritual_only: ritualOnly,
      explanation: wizardExplanation,
    };
  }

  private invalidSelections(
    character: Character,
    proficiency: number | null,
    routes: readonly SpellAccessRoute[],
    assessments: readonly BuildReportAssessment[],
    // The RESOLVED scores `build()` already produced — passed in rather than
    // rebuilt from the raw row, so an invalid selection's attack bonus and
    // save DC cannot disagree with the rest of the report about what the
    // character's scores are.
    scores: AbilityScores,
  ): WorkspaceSlot[] {
    const routeBySlot = new Map(
      routes.flatMap((route) =>
        route.slot_id === null ? [] : [[route.slot_id, route] as const],
      ),
    );
    const duplicateByIdentity = new Map(
      assessments.map((assessment) => [
        assessment.spell_identity_id,
        assessment,
      ]),
    );

    const rows = this.db.all(
      `SELECT slot.id, slot.slot_key, slot.label, slot.bucket,
              slot.spell_level_min, slot.spell_level_max,
              slot.fixed_spell_version_id, slot.current_spell_version_id,
              slot.state, slot.selection_eligibility,
              slot.selection_invalid_reason, slot.orphan_reason_code,
              slot.override_note, slot.is_locked, slot.sort_order, slot.ordinal,
              source.display_name AS source_name, source.source_type,
              source.source_definition_id, source.config AS source_config,
              selected.display_name AS spell_name,
              selected_identity.catalog_layer AS spell_catalog_layer,
              selected.level AS spell_level,
              selected.rules_edition AS spell_edition,
              selected.spell_identity_id, selected.ritual,
              selected.concentration
       FROM spell_selection_slots AS slot
       INNER JOIN character_source_instances AS source
         ON source.id = slot.source_instance_id
       LEFT JOIN spell_versions AS selected
         ON selected.id = COALESCE(
           slot.fixed_spell_version_id,
           slot.current_spell_version_id
         )
       LEFT JOIN catalog_content_identities AS selected_identity
         ON selected_identity.content_kind = 'spell'
        AND selected_identity.content_key = selected.content_key
       WHERE slot.character_id = ?
         AND slot.state IN ('active', 'orphaned', 'kept_override')`,
      [character.id],
      reportSlotRow,
    );

    const invalid = rows.filter(
      (row) =>
        row.eligibility === 'invalid' ||
        row.state === 'orphaned' ||
        row.state === 'kept_override',
    );
    const versionIds = invalid.flatMap((row) =>
      row.spell_version_id === null ? [] : [row.spell_version_id],
    );
    const attackVersionIds = this.mechanicVersionIds(
      'spell_version_attack_modes',
      versionIds,
    );
    const saveVersionIds = this.mechanicVersionIds(
      'spell_version_save_abilities',
      versionIds,
    );

    return invalid
      .map((row): InvalidSelection => {
        const id = row.id;
        const route = routeBySlot.get(id);
        const spellIdentityId = row.spell_identity_id;
        const ability =
          route?.spellcasting_ability ?? this.sourceAbility(row.source_config);
        const versionId = row.spell_version_id;
        const score = ability === null ? null : scores.score(ability);
        const bucket = row.bucket;
        const persistedLabel = row.label;

        return {
          id,
          slot_key: row.slot_key,
          source: row.source_name,
          source_type: row.source_type,
          label:
            persistedLabel === null || persistedLabel === ''
              ? `${titleBucket(bucket)} ${String(row.ordinal)}`
              : persistedLabel,
          bucket,
          level_min: row.spell_level_min,
          level_max: row.spell_level_max,
          spell_id: versionId,
          spell_name: row.spell_name,
          spell_catalog_layer:
            row.spell_name === null ? null : row.spell_catalog_layer,
          spell_level: row.spell_level,
          spell_edition: row.spell_edition,
          ability,
          attack_bonus:
            score === null ||
            proficiency === null ||
            versionId === null ||
            !attackVersionIds.has(versionId)
              ? null
              : score.spellAttackBonus(proficiency).value,
          save_dc:
            score === null ||
            proficiency === null ||
            versionId === null ||
            !saveVersionIds.has(versionId)
              ? null
              : score.spellSaveDC(proficiency).value,
          ritual: row.ritual ?? false,
          concentration: row.concentration ?? false,
          duplicate_status:
            spellIdentityId === null
              ? 'none'
              : duplicateByIdentity.get(spellIdentityId)?.category ?? 'none',
          state: row.state,
          eligibility: row.eligibility,
          invalid_reason: row.invalid_reason,
          orphan_reason: row.orphan_reason,
          override_note: row.override_note,
          locked: row.locked,
          sort_order: row.sort_order,
        };
      })
      .sort(compareInvalidSelections)
      .map(({ sort_order: _sortOrder, ...selection }) => selection);
  }

  private sourceAbility(configJson: string | null): Ability | null {
    if (configJson !== null && configJson !== '') {
      const config: unknown = JSON.parse(configJson);
      if (
        config !== null &&
        !Array.isArray(config) &&
        typeof config === 'object'
      ) {
        const value = (config as Record<string, unknown>)
          .spellcasting_ability;
        if (typeof value === 'string' && value !== '') {
          return decodeAbility(value, 'configured spellcasting ability');
        }
      }
    }

    return null;
  }

  private mechanicVersionIds(
    table:
      | 'spell_version_attack_modes'
      | 'spell_version_save_abilities',
    versionIds: readonly number[],
  ): Set<number> {
    if (versionIds.length === 0) {
      return new Set();
    }
    const uniqueIds = [...new Set(versionIds)];
    const placeholders = uniqueIds.map(() => '?').join(', ');
    return new Set(
      this.db.all(
        `SELECT DISTINCT spell_version_id
         FROM ${table}
         WHERE spell_version_id IN (${placeholders})`,
        uniqueIds,
        (row) => sqlInteger(row, 'spell_version_id'),
      ),
    );
  }
}
