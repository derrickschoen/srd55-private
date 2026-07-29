import {
  sqlBoolean,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type RowCodec,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
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
  ClassOption,
  RemovableSource,
  SourceDefinition,
  Workspace,
  WorkspaceBuildReport,
  WorkspaceSlot,
} from '../domain/read-models';
import {
  BuildReportBuilder,
  type BuildReportResult,
} from '../reports/build-report-builder';
import { AbilityScores } from '../rules/ability-scores';
import { CharacterNotFoundError } from './character-crud';
import { orderSources } from './order-sources';
import { SavePointQueries } from './save-points';
import { WeaponQueries } from './weapons';
import { jsonRecord, type JsonRecord } from './source-config';

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
}

const workspaceCharacter: RowCodec<WorkspaceCharacter> = (row) => ({
  revision: sqlInteger(row, 'revision'),
  allow_legacy: sqlBoolean(row, 'allow_legacy'),
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
  readonly source_config: string | null;
  readonly spell_name: string | null;
  readonly spell_provenance: string | null;
  readonly spell_level: number | null;
  readonly spell_edition: RulesEdition | null;
  readonly spell_identity_id: number | null;
  readonly ritual: boolean | null;
  readonly concentration: boolean | null;
}

const workspaceSlotRow: RowCodec<WorkspaceSlotRow> = (row) => ({
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
  source_config: sqlNullableString(row, 'source_config'),
  spell_name: sqlNullableString(row, 'spell_name'),
  spell_provenance: sqlNullableString(row, 'spell_provenance'),
  spell_level: sqlNullableInteger(row, 'spell_level'),
  spell_edition: sqlNullableString(row, 'spell_edition') as RulesEdition | null,
  spell_identity_id: sqlNullableInteger(row, 'spell_identity_id'),
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
): SourceDefinition['configuration_kind'] {
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
      `SELECT revision, allow_legacy
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
    const workspaceReport = {
      ...report,
      invalid_selections: invalid,
      summary: {
        unique_spells: new Set(
          report.access_routes.map((route) => route.spell_identity_id),
        ).size,
        access_routes: report.access_routes.length,
        warning_count: warningAssessments.length + invalid.length,
      },
    } as WorkspaceBuildReport;

    return {
      revision: character.revision,
      report: workspaceReport,
      classes: this.classes(characterId),
      available_classes: this.classOptions(),
      allow_legacy: character.allow_legacy,
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
      save_points: new SavePointQueries(this.db).list(characterId),
    };
  }

  private classes(characterId: number): CharacterClass[] {
    return this.db.all(
      `SELECT level.id, level.class_definition_id,
              level.subclass_definition_id, level.level,
              class.name, subclass.name AS subclass_name
       FROM character_class_levels AS level
       INNER JOIN class_definitions AS class
         ON class.id = level.class_definition_id
       LEFT JOIN subclass_definitions AS subclass
         ON subclass.id = level.subclass_definition_id
       WHERE level.character_id = ?
       ORDER BY class.name, level.id`,
      [characterId],
      (row): CharacterClass => {
        const classDefinitionId = sqlInteger(
          row,
          'class_definition_id',
        );
        return {
          id: sqlInteger(row, 'id'),
          class_definition_id: classDefinitionId,
          subclass_definition_id: sqlNullableInteger(
            row,
            'subclass_definition_id',
          ),
          level: sqlInteger(row, 'level'),
          name: sqlString(row, 'name'),
          subclass_name: sqlNullableString(row, 'subclass_name'),
          subclasses: this.classOptions(classDefinitionId),
        };
      },
    );
  }

  private classOptions(classDefinitionId?: number): ClassOption[] {
    return classDefinitionId === undefined
      ? this.db.all(
          `SELECT id, name
           FROM class_definitions
           ORDER BY name, id`,
          undefined,
          (row) => ({
            id: sqlInteger(row, 'id'),
            name: sqlString(row, 'name'),
          }),
        )
      : this.db.all(
          `SELECT id, name
           FROM subclass_definitions
           WHERE class_definition_id = ?
           ORDER BY name, id`,
          [classDefinitionId],
          (row) => ({
            id: sqlInteger(row, 'id'),
            name: sqlString(row, 'name'),
          }),
        );
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
         AND source.state = 'active'
         AND feat.content_key = '2024:feat:magic-initiate'
       ORDER BY source.id`,
      [characterId],
      (row) => {
        const config = jsonRecord(sqlNullableString(row, 'config'));
        return {
          id: sqlInteger(row, 'id'),
          display_name: sqlString(row, 'display_name'),
          chosen_list: String(config.chosen_list ?? ''),
          spellcasting_ability: String(
            config.spellcasting_ability ?? '',
          ) as Ability,
        };
      },
    );
  }

  private sourceDefinitions(
    sourceType: StandaloneSourceType,
  ): SourceDefinition[] {
    return this.db.all(
      `SELECT id, content_key, name, repeatable, grant_rules
       FROM ${sourceType}_definitions
       ORDER BY name, id`,
      undefined,
      (row): SourceDefinition => ({
        id: sqlInteger(row, 'id'),
        content_key: sqlString(row, 'content_key'),
        name: sqlString(row, 'name'),
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
         AND state = 'active'
       ORDER BY source_type, display_name, id`,
      [characterId],
      (row): RemovableSource => ({
        id: sqlInteger(row, 'id'),
        parent_source_instance_id: sqlNullableInteger(
          row,
          'parent_source_instance_id',
        ),
        source_type: sqlString(
          row,
          'source_type',
        ) as StandaloneSourceType,
        source_definition_id: sqlInteger(row, 'source_definition_id'),
        display_name: sqlString(row, 'display_name'),
      }),
    );
  }
}
