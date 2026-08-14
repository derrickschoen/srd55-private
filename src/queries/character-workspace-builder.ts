import {
  sqlBoolean,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type RowCodec,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { bundledSourceContentKeys } from '../catalog/bundled-source-membership';
import {
  catalogLayerDisclosure,
  type CatalogLayerDisclosure,
} from '../catalog/catalog-disclosure';
import {
  abilities,
  type Ability,
  type DomainSourceType,
  type DuplicateCategory,
  type RulesEdition,
  type SelectionEligibility,
  type SlotBucket,
  type SlotState,
  type StandaloneSourceType,
} from '../domain/enums';
import type {
  CharacterClass,
  ClassEntryOption,
  ClassOption,
  RemovableSource,
  SourceDefinition,
  Workspace,
  WorkspaceBuildReport,
  WorkspaceSlot,
} from '../domain/read-models';
import type {
  CharacterClassLevelId,
  BackgroundDefinitionId,
  ClassDefinitionId,
  FeatDefinitionId,
  SlotId,
  SpellIdentityId,
  SpellVersionId,
  SourceInstanceId,
  SpeciesDefinitionId,
  StandaloneDefinitionIdFor,
  SubclassDefinitionId,
} from '../domain/ids';
import {
  BuildReportBuilder,
  type BuildReportResult,
} from '../reports/build-report-builder';
import { AbilityScores } from '../rules/ability-scores';
import { startingClass } from '../rules/sheet';
import { CharacterNotFoundError } from './character-crud';
import { orderSources } from './order-sources';
import { SavePointQueries } from './save-points';
import { WeaponQueries } from './weapons';
import { ItemQueries } from './items';
import { jsonRecord, type JsonRecord } from './source-config';
import {
  MulticlassPrimaryAbilityQueries,
  multiclassAssessmentForClass,
  type MulticlassPrimaryAbilityAssessment,
} from './multiclass-primary-ability';
import { selectableCatalogContentSql } from './selectable-catalog-content';
import { multiclassEntryAssessments } from '../rules/multiclass-prerequisite-gate';
import { characterSourceCatalogResolution } from '../catalog/recorded-source-provenance';
import {
  readMulticlassPrerequisiteHouseRule,
} from '../rules/multiclass-prerequisite-house-rule';
import { ACTIVE_SOURCE_INSTANCE_STATE } from '../domain/source-instance-state';

interface SlotWithOrder extends WorkspaceSlot {
  readonly sort_order: number;
}

/**
 * The character columns the workspace needs, decoded once.
 *
 * THE SIX ABILITY COLUMNS ARE DELIBERATELY GONE FROM THIS QUERY (B2). The
 * workspace used to build an `AbilityScores` from the raw row here — reader
 * four of the four raw-score readers plan §3.4 counts, and one of TWO sites
 * inside this builder — which is exactly how a contribution would have moved
 * the report's numbers while the slot grid kept computing save DCs from base.
 * Both sites now derive from `report.character.abilities`, the RESOLVED totals
 * the report already ran through the one resolver, so the two cannot disagree.
 */
interface WorkspaceCharacter {
  readonly revision: number;
  readonly allow_legacy: boolean;
  readonly alignment: string | null;
  readonly appearance: string | null;
  readonly backstory: string | null;
  readonly notes: string | null;
}

const workspaceCharacter: RowCodec<WorkspaceCharacter> = (row) => ({
  revision: sqlInteger(row, 'revision'),
  allow_legacy: sqlBoolean(row, 'allow_legacy'),
  alignment: sqlNullableString(row, 'alignment'),
  appearance: sqlNullableString(row, 'appearance'),
  backstory: sqlNullableString(row, 'backstory'),
  notes: sqlNullableString(row, 'notes'),
});

/**
 * One row of the slot query, decoded.
 *
 * `spell_version_id` COLLAPSES `fixed_spell_version_id` and
 * `current_spell_version_id` in the codec, in that order, because every caller
 * did the same `??` and the two columns are never both meaningful: a fixed grant
 * and a user selection are mutually exclusive by trigger
 * (`spell_slots_exclusive_assignment_check`).
 *
 * `ritual` and `concentration` are `boolean | null` and not `boolean`: NULL is
 * what the LEFT JOIN yields for an EMPTY slot, and that is a different fact from
 * a spell that is not a ritual. The caller turns it into `false` for display —
 * but it does so knowing which of the two it has.
 */
interface WorkspaceSlotRow {
  readonly id: SlotId;
  readonly slot_key: string;
  readonly label: string | null;
  readonly bucket: SlotBucket;
  readonly spell_level_min: number;
  readonly spell_level_max: number;
  readonly spell_version_id: SpellVersionId | null;
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
  readonly source_config: string | null;
  readonly spell_name: string | null;
  readonly spell_catalog_layer: CatalogLayerDisclosure | null;
  readonly spell_provenance: string | null;
  readonly spell_level: number | null;
  readonly spell_edition: RulesEdition | null;
  readonly spell_identity_id: SpellIdentityId | null;
  readonly ritual: boolean | null;
  readonly concentration: boolean | null;
}

const workspaceSlotRow: RowCodec<WorkspaceSlotRow> = (row) => ({
  id: sqlInteger(row, 'id') as SlotId,
  slot_key: sqlString(row, 'slot_key'),
  label: sqlNullableString(row, 'label'),
  bucket: sqlString(row, 'bucket') as SlotBucket,
  spell_level_min: sqlInteger(row, 'spell_level_min'),
  spell_level_max: sqlInteger(row, 'spell_level_max'),
  spell_version_id: (
    sqlNullableInteger(row, 'fixed_spell_version_id') ??
    sqlNullableInteger(row, 'current_spell_version_id')
  ) as SpellVersionId | null,
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
  source_config: sqlNullableString(row, 'source_config'),
  spell_name: sqlNullableString(row, 'spell_name'),
  spell_catalog_layer: catalogLayerDisclosure(
    sqlNullableString(row, 'spell_catalog_layer'),
  ),
  spell_provenance: sqlNullableString(row, 'spell_provenance'),
  spell_level: sqlNullableInteger(row, 'spell_level'),
  spell_edition: sqlNullableString(row, 'spell_edition') as RulesEdition | null,
  spell_identity_id: sqlNullableInteger(row, 'spell_identity_id') as SpellIdentityId | null,
  ritual: row.ritual === null ? null : sqlBoolean(row, 'ritual'),
  concentration:
    row.concentration === null ? null : sqlBoolean(row, 'concentration'),
});

function configuredAbility(sourceConfig: string | null): Ability | null {
  const ability = jsonRecord(sourceConfig).spellcasting_ability;
  if (ability === undefined || ability === null || ability === '') {
    return null;
  }
  const normalized = String(ability).toLowerCase();
  if (!abilities.includes(normalized as Ability)) {
    throw new Error(`Unknown spellcasting ability '${String(ability)}'.`);
  }
  return normalized as Ability;
}

function titleBucket(bucket: string): string {
  return bucket
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');
}

function configurationKind(
  contentKey: string,
  grantRulesJson: string | null,
): SourceDefinition<StandaloneSourceType>['configuration_kind'] {
  if (contentKey === '2024:feat:magic-initiate') {
    return 'magic_initiate';
  }
  const decoded: unknown =
    grantRulesJson === null || grantRulesJson === ''
      ? []
      : JSON.parse(grantRulesJson);
  if (
    Array.isArray(decoded) &&
    decoded.some(
      (rule) =>
        rule !== null &&
        !Array.isArray(rule) &&
        typeof rule === 'object' &&
        (rule as JsonRecord).kind === 'grant_source' &&
        (rule as JsonRecord).source_type === 'feat',
    )
  ) {
    return 'origin_feat_magic_initiate';
  }
  return 'none';
}

function mechanicVersionIds(
  db: DatabaseContext,
  table:
    | 'spell_version_attack_modes'
    | 'spell_version_save_abilities',
  ids: readonly number[],
): Set<number> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) {
    return new Set();
  }
  return new Set(
    db.all(
      `SELECT DISTINCT spell_version_id
       FROM ${table}
       WHERE spell_version_id IN (${unique.map(() => '?').join(', ')})`,
      unique,
      (row) => sqlInteger(row, 'spell_version_id'),
    ),
  );
}

export class CharacterWorkspaceBuilder {
  readonly #reports: BuildReportBuilder;

  constructor(
    private readonly db: DatabaseContext,
    reports?: BuildReportBuilder,
  ) {
    this.#reports = reports ?? new BuildReportBuilder(db);
  }

  build(characterId: number): Workspace {
    const character = this.db.one(
      `SELECT revision, allow_legacy, alignment, appearance, backstory, notes
       FROM characters
       WHERE id = ?`,
      [characterId],
      workspaceCharacter,
    );
    if (character === null) {
      throw new CharacterNotFoundError(characterId);
    }

    const report = this.#reports.build(characterId);
    // The report's RESOLVED totals (base plus ability_increase contributions),
    // built once and used by both scoring sites in this builder — the slot
    // grid below and the weapons panel further down.
    const scores = AbilityScores.fromArray(report.character.abilities);
    const slots = this.slots(characterId, scores, report);
    const invalid = slots.filter(
      (slot) =>
        slot.eligibility === 'invalid' ||
        slot.state === 'orphaned' ||
        slot.state === 'kept_override',
    );
    const warningAssessments = report.duplicate_assessments.filter(
      (assessment) => assessment.category !== 'none',
    );
    const workspaceReport: WorkspaceBuildReport = {
      ...report,
      invalid_selections: invalid,
      summary: {
        unique_spells: new Set(
          report.access_routes.map((route) => route.spell_identity_id),
        ).size,
        access_routes: report.access_routes.length,
        warning_count: warningAssessments.length + invalid.length,
      },
    };
    const classes = this.classes(
      characterId,
      new MulticlassPrimaryAbilityQueries(this.db).build(characterId),
    );
    const startingClassResolution = startingClass(
      classes.map((entry) => ({
        class_level: entry,
        class_name: entry.name,
        is_starting_class: entry.is_starting_class,
      })),
    );

    return {
      revision: character.revision,
      report: workspaceReport,
      classes,
      starting_class_resolution: {
        class_level_id:
          startingClassResolution.chosen?.class_level.id ?? null,
        warnings: startingClassResolution.warnings,
      },
      available_classes: this.availableClassOptions(characterId),
      allow_legacy: character.allow_legacy,
      multiclass_prerequisite_house_rule:
        readMulticlassPrerequisiteHouseRule(this.db, characterId),
      flavor: {
        alignment: character.alignment,
        appearance: character.appearance,
        backstory: character.backstory,
        notes: character.notes,
      },
      configurable_sources: this.configurableSources(characterId),
      order_sources: orderSources(this.db, characterId),
      source_catalog: {
        feat: this.sourceDefinitions('feat'),
        species: this.sourceDefinitions('species'),
        background: this.sourceDefinitions('background'),
      },
      removable_sources: this.removableSources(characterId),
      spell_lists: this.db.all(
        `SELECT name
         FROM class_definitions
         WHERE name IN ('Cleric', 'Druid', 'Wizard')
         ORDER BY name`,
        undefined,
        (row) => sqlString(row, 'name'),
      ),
      slots: slots.map(({ sort_order: _sortOrder, ...slot }) => slot),
      placeholder_spells: this.db.all(
        `SELECT DISTINCT version.content_key, version.display_name
         FROM spell_versions AS version
         WHERE version.provenance = 'placeholder'
           AND version.id IN (
             SELECT current_spell_version_id
             FROM spell_selection_slots
             WHERE character_id = ?
             UNION
             SELECT spell_version_id FROM wizard_spellbook_entries
             WHERE character_id = ?
             UNION
             SELECT spell_version_id FROM character_spell_preferences
             WHERE character_id = ?
             UNION
             SELECT entry.spell_version_id
             FROM spell_loadout_entries AS entry
             INNER JOIN spell_loadouts AS loadout
               ON loadout.id = entry.spell_loadout_id
             WHERE loadout.character_id = ?
           )
         ORDER BY version.display_name, version.content_key`,
        [characterId, characterId, characterId, characterId],
        (row) => ({
          spellKey: sqlString(row, 'content_key'),
          name: sqlString(row, 'display_name'),
        }),
      ),
      // The report's own proficiency bonus and ability scores are reused rather
      // than re-derived, so a weapon attack bonus and a spell attack bonus on
      // the same screen cannot disagree about what level the character is —
      // and, since B2, about whether a contribution applies.
      weapons: new WeaponQueries(this.db).panel(characterId, {
        routes: report.access_routes,
        scores,
        proficiency_bonus: report.character.proficiency_bonus,
      }),
      items: new ItemQueries(this.db).panel(characterId),
      save_points: new SavePointQueries(this.db).list(characterId),
    };
  }

  private classes(
    characterId: number,
    prerequisiteAssessments:
      readonly MulticlassPrimaryAbilityAssessment[],
  ): CharacterClass[] {
    return this.db.all(
      `SELECT level.id, level.class_definition_id,
              level.subclass_definition_id, level.level,
              level.is_starting_class,
              class.name, class_identity.catalog_layer,
              subclass.name AS subclass_name,
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
       WHERE level.character_id = ?
       ORDER BY level.is_starting_class DESC, level.id`,
      [characterId],
      (row): CharacterClass => {
        const classDefinitionId = sqlInteger(
          row,
          'class_definition_id',
        ) as ClassDefinitionId;
        return {
          id: sqlInteger(row, 'id') as CharacterClassLevelId,
          class_definition_id: classDefinitionId,
          subclass_definition_id: sqlNullableInteger(
            row,
            'subclass_definition_id',
          ) as SubclassDefinitionId | null,
          level: sqlInteger(row, 'level'),
          is_starting_class: sqlBoolean(row, 'is_starting_class'),
          name: sqlString(row, 'name'),
          catalog_layer: catalogLayerDisclosure(
            sqlNullableString(row, 'catalog_layer'),
          ),
          subclass_name: sqlNullableString(row, 'subclass_name'),
          subclass_catalog_layer:
            sqlNullableString(row, 'subclass_name') === null
              ? null
              : catalogLayerDisclosure(
                  sqlNullableString(row, 'subclass_catalog_layer'),
                ),
          subclasses: this.classOptions(classDefinitionId),
          multiclass_prerequisite_warning: multiclassAssessmentForClass(
            prerequisiteAssessments,
            classDefinitionId,
          ).warning,
        };
      },
    );
  }

  private classOptions(): ClassOption<ClassDefinitionId>[];
  private classOptions(
    classDefinitionId: ClassDefinitionId,
  ): ClassOption<SubclassDefinitionId>[];
  private classOptions(
    classDefinitionId?: ClassDefinitionId,
  ): Array<ClassOption<ClassDefinitionId | SubclassDefinitionId>> {
    return classDefinitionId === undefined
      ? this.db.all(
          `SELECT definition.id, definition.content_key, definition.name,
                  identity.catalog_layer
           FROM class_definitions AS definition
           LEFT JOIN catalog_content_identities AS identity
             ON identity.content_kind = 'class'
            AND identity.content_key = definition.content_key
           -- D133: planner class authoring/selection remains bundled-only.
           WHERE ${selectableCatalogContentSql('class', 'definition.content_key')}
           ORDER BY definition.name, definition.id`,
          undefined,
          (row) => ({
            id: sqlInteger(row, 'id') as ClassDefinitionId,
            content_key: sqlString(row, 'content_key'),
            name: sqlString(row, 'name'),
            catalog_layer: catalogLayerDisclosure(
              sqlNullableString(row, 'catalog_layer'),
            ),
          }),
        )
          .filter((definition) =>
            bundledSourceContentKeys('class').includes(definition.content_key)
          )
          .map(({ id, name, catalog_layer }) => ({
            id,
            name,
            catalog_layer,
          }))
      : this.db.all(
          `SELECT subclass.id, subclass.name, identity.catalog_layer
           FROM subclass_definitions AS subclass
           LEFT JOIN catalog_content_identities AS identity
             ON identity.content_kind = 'subclass'
            AND identity.content_key = subclass.content_key
           WHERE subclass.class_definition_id = ?
             AND ${selectableCatalogContentSql('subclass', 'subclass.content_key')}
           ORDER BY subclass.name, subclass.id`,
          [classDefinitionId],
          (row) => ({
            id: sqlInteger(row, 'id') as SubclassDefinitionId,
            name: sqlString(row, 'name'),
            catalog_layer: catalogLayerDisclosure(
              sqlNullableString(row, 'catalog_layer'),
            ),
          }),
        );
  }

  private availableClassOptions(characterId: number): ClassEntryOption[] {
    const options = this.classOptions();
    const assessments = multiclassEntryAssessments(
      this.db,
      characterId,
      options.map((option) => option.id),
    );
    return options.map((option) => {
      const assessment = assessments.get(option.id);
      if (assessment === undefined) {
        throw new TypeError(`Class ${String(option.id)} was not assessed.`);
      }
      switch (assessment.status) {
        case 'not_applicable':
        case 'eligible':
          return {
            ...option,
            multiclass_entry: {
              status: assessment.status,
              refusal: null,
            },
          };
        case 'waived':
          return {
            ...option,
            multiclass_entry: {
              status: assessment.status,
              refusal: null,
              explanation: assessment.explanation,
            },
          };
        case 'blocked':
          return {
            ...option,
            multiclass_entry: {
              status: assessment.status,
              refusal: assessment.refusal,
            },
          };
      }
    });
  }

  private slots(
    characterId: number,
    scores: AbilityScores,
    report: BuildReportResult,
  ): SlotWithOrder[] {
    const rows = this.db.all(
      `SELECT slot.id, slot.slot_key, slot.label, slot.bucket,
              slot.spell_level_min, slot.spell_level_max,
              slot.fixed_spell_version_id, slot.current_spell_version_id,
              slot.state, slot.selection_eligibility,
              slot.selection_invalid_reason, slot.orphan_reason_code,
              slot.override_note, slot.is_locked, slot.sort_order,
              slot.ordinal, source.display_name AS source_name,
              source.source_type, source.config AS source_config,
              selected.display_name AS spell_name,
              selected_identity.catalog_layer AS spell_catalog_layer,
              selected.provenance AS spell_provenance,
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
         AND slot.state IN ('active', 'orphaned', 'kept_override')
       ORDER BY source.display_name, slot.sort_order, slot.id`,
      [characterId],
      workspaceSlotRow,
    );
    const selectedVersionIds = rows.flatMap((row) =>
      row.spell_version_id === null ? [] : [row.spell_version_id],
    );
    const attackIds = mechanicVersionIds(
      this.db,
      'spell_version_attack_modes',
      selectedVersionIds,
    );
    const saveIds = mechanicVersionIds(
      this.db,
      'spell_version_save_abilities',
      selectedVersionIds,
    );
    const routeBySlot = new Map(
      report.access_routes.flatMap((route) =>
        route.slot_id === null ? [] : [[route.slot_id, route] as const],
      ),
    );
    const duplicateByIdentity = new Map(
      report.duplicate_assessments.map((assessment) => [
        assessment.spell_identity_id,
        assessment.category,
      ]),
    );
    const proficiency = report.character.proficiency_bonus;

    return rows.map((row): SlotWithOrder => {
      const versionId = row.spell_version_id;
      const ability =
        routeBySlot.get(row.id)?.spellcasting_ability ??
        configuredAbility(row.source_config);
      const score = ability === null ? null : scores.score(ability);
      const identityId = row.spell_identity_id;

      return {
        id: row.id,
        slot_key: row.slot_key,
        source: row.source_name,
        source_type: row.source_type,
        label:
          row.label === null || row.label === ''
            ? `${titleBucket(row.bucket)} ${String(row.ordinal)}`
            : row.label,
        bucket: row.bucket,
        level_min: row.spell_level_min,
        level_max: row.spell_level_max,
        spell_id: versionId,
        spell_name: row.spell_name,
        spell_catalog_layer:
          row.spell_name === null ? null : row.spell_catalog_layer,
        placeholder: row.spell_provenance === 'placeholder',
        spell_level: row.spell_level,
        spell_edition: row.spell_edition,
        ability,
        attack_bonus:
          score === null ||
          proficiency === null ||
          versionId === null ||
          !attackIds.has(versionId)
            ? null
            : score.spellAttackBonus(proficiency).value,
        save_dc:
          score === null ||
          proficiency === null ||
          versionId === null ||
          !saveIds.has(versionId)
            ? null
            : score.spellSaveDC(proficiency).value,
        ritual: row.ritual ?? false,
        concentration: row.concentration ?? false,
        duplicate_status:
          identityId === null
            ? 'none'
            : (duplicateByIdentity.get(identityId) ??
              'none') as DuplicateCategory,
        state: row.state,
        eligibility: row.eligibility,
        invalid_reason: row.invalid_reason,
        orphan_reason: row.orphan_reason,
        override_note: row.override_note,
        locked: row.locked,
        sort_order: row.sort_order,
      };
    });
  }

  private configurableSources(
    characterId: number,
  ): Workspace['configurable_sources'] {
    return this.db.all(
      `SELECT source.id, source.display_name, source.config
       FROM character_source_instances AS source
       INNER JOIN feat_definitions AS feat
         ON feat.id = source.source_definition_id
       WHERE source.character_id = ?
         AND source.source_type = 'feat'
         AND source.state = ?
         AND feat.content_key = '2024:feat:magic-initiate'
       ORDER BY source.id`,
      [characterId, ACTIVE_SOURCE_INSTANCE_STATE],
      (row) => {
        const id = sqlInteger(row, 'id') as SourceInstanceId;
        const config = jsonRecord(sqlNullableString(row, 'config'));
        return {
          id,
          display_name: sqlString(row, 'display_name'),
          catalog_layer: characterSourceCatalogResolution(this.db, id)
            .catalog_layer,
          chosen_list: String(config.chosen_list ?? ''),
          spellcasting_ability: String(
            config.spellcasting_ability ?? '',
          ) as Ability,
        };
      },
    );
  }

  private sourceDefinitions<Type extends StandaloneSourceType>(
    sourceType: Type,
  ): SourceDefinition<Type>[] {
    return this.db.all(
      `SELECT definition.id, definition.content_key, definition.name,
              definition.repeatable, definition.grant_rules,
              identity.catalog_layer
       FROM ${sourceType}_definitions AS definition
       LEFT JOIN catalog_content_identities AS identity
         ON identity.content_kind = '${sourceType}'
        AND identity.content_key = definition.content_key
       WHERE ${selectableCatalogContentSql(sourceType, 'definition.content_key')}
       ORDER BY definition.name, definition.id`,
      undefined,
      (row): SourceDefinition<Type> => ({
        id: sqlInteger(row, 'id') as StandaloneDefinitionIdFor<Type>,
        content_key: sqlString(row, 'content_key'),
        name: sqlString(row, 'name'),
        catalog_layer: catalogLayerDisclosure(
          sqlNullableString(row, 'catalog_layer'),
        ),
        repeatable: sqlBoolean(row, 'repeatable'),
        configuration_kind: configurationKind(
          sqlString(row, 'content_key'),
          sqlNullableString(row, 'grant_rules'),
        ),
      }),
    );
  }

  private removableSources(characterId: number): RemovableSource[] {
    return this.db.all(
      `SELECT id, parent_source_instance_id, source_type,
              source_definition_id, display_name
       FROM character_source_instances
       WHERE character_id = ?
         AND source_type IN ('feat', 'species', 'background')
         AND state = ?
       ORDER BY source_type, display_name, id`,
      [characterId, ACTIVE_SOURCE_INSTANCE_STATE],
      (row): RemovableSource => {
        const id = sqlInteger(row, 'id') as SourceInstanceId;
        const common = {
          id,
          parent_source_instance_id: sqlNullableInteger(
            row,
            'parent_source_instance_id',
          ) as SourceInstanceId | null,
          display_name: sqlString(row, 'display_name'),
          catalog_layer: characterSourceCatalogResolution(this.db, id)
            .catalog_layer,
        };
        const sourceType = sqlString(row, 'source_type');
        const sourceDefinitionId = sqlNullableInteger(
          row,
          'source_definition_id',
        );
        switch (sourceType) {
          case 'feat':
            return {
              ...common,
              source_type: sourceType,
              source_definition_id:
                sourceDefinitionId as FeatDefinitionId | null,
            };
          case 'species':
            return {
              ...common,
              source_type: sourceType,
              source_definition_id:
                sourceDefinitionId as SpeciesDefinitionId | null,
            };
          case 'background':
            return {
              ...common,
              source_type: sourceType,
              source_definition_id:
                sourceDefinitionId as BackgroundDefinitionId | null,
            };
        }
        throw new TypeError(`Unknown standalone source type '${sourceType}'.`);
      },
    );
  }
}
