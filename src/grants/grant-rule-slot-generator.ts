import type { SqlValue } from '@sqlite.org/sqlite-wasm';
import {
  sqlBoolean,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  rowId,
  type RowCodec,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  SpellSelectionEligibility,
} from '../eligibility/spell-selection-eligibility';
import { storedSpellSelectionConstraint } from '../eligibility/spell-selection-constraint';
import type {
  ClassLevel,
  SourceInstanceId,
} from '../domain/ids';
import {
  isEnumValue,
  skills,
  type CharacterLevel,
  type Skill,
} from '../domain/enums';
import type { JsonObject } from '../domain/models';
import { GrantRule } from './grant-rule';
import {
  GrantRulePlanner,
  type PlannedSpellGrant,
} from './grant-rule-planner';
import {
  orphanSkillGrantsForSource,
  rebuildSkillProjection,
  syncClassSkillGrants,
  syncSpeciesSkillGrants,
  syncToolAlternativeSkillGrants,
} from './skill-grants';
import {
  orphanExpertiseGrantsForSource,
  reconcileCharacterSkillExpertise,
} from './skill-expertise-grants';
import {
  decodeGrantJson,
  SourceRuleReader,
  sourceDefinitionTable,
  valueAtPath,
  type GrantSourceInstance,
} from './source-rule-reader';
import { characterLevel } from '../rules/character-level';
import {
  ACTIVE_SOURCE_INSTANCE_STATE,
  TOMBSTONED_SOURCE_INSTANCE_STATE,
} from '../domain/source-instance-state';

type Attributes = Record<string, SqlValue>;
type JsonContainer = Record<string, unknown> | unknown[];

/**
 * The codecs this generator reads through.
 *
 * Two reads in this file DELIBERATELY stay raw (`oneRaw`): the ones feeding
 * `updateChangedRow`, which diffs a stored row against an attribute map whose
 * KEYS are decided at runtime. A codec there would have to fix the column set
 * that the diff exists to keep open.
 */

/** `is_active` is stored as SQLite 0/1; `sqlBoolean` refuses anything else. */
const spellVersionActivity: RowCodec<{
  readonly id: number;
  readonly is_active: boolean;
}> = (row) => ({
  id: sqlInteger(row, 'id'),
  is_active: sqlBoolean(row, 'is_active'),
});

const namedDefinition: RowCodec<{
  readonly id: number;
  readonly name: string;
}> = (row) => ({
  id: sqlInteger(row, 'id'),
  name: sqlString(row, 'name'),
});

const slotReferences: RowCodec<{
  readonly id: number;
  readonly slot_key: string;
  readonly fixed_spell_version_id: number | null;
  readonly current_spell_version_id: number | null;
}> = (row) => ({
  id: sqlInteger(row, 'id'),
  slot_key: sqlString(row, 'slot_key'),
  fixed_spell_version_id: sqlNullableInteger(row, 'fixed_spell_version_id'),
  current_spell_version_id: sqlNullableInteger(row, 'current_spell_version_id'),
});

const slotAssignment: RowCodec<{
  readonly id: number;
  readonly fixed_spell_version_id: number | null;
  readonly current_spell_version_id: number | null;
}> = (row) => ({
  id: sqlInteger(row, 'id'),
  fixed_spell_version_id: sqlNullableInteger(row, 'fixed_spell_version_id'),
  current_spell_version_id: sqlNullableInteger(row, 'current_spell_version_id'),
});

const rowName: RowCodec<string> = (row) => sqlString(row, 'name');
const nullableConfig: RowCodec<string | null> = (row) =>
  sqlNullableString(row, 'config');

const RULE_REMOVED_SELECTION_REASON =
  'Selection preserved because its grant rule is no longer active.';
const SOURCE_REMOVED_SELECTION_REASON =
  'Selection preserved because its source is no longer active.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function scalarString(value: unknown): string {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }
  return JSON.stringify(value);
}

function sameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => sameValue(value, right[index]))
    );
  }
  if (!isRecord(left) || !isRecord(right)) {
    return false;
  }
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] &&
        sameValue(left[key], right[key]),
    )
  );
}

function ruleData(rule: GrantRule): Record<string, unknown> {
  return rule.toObject() as Record<string, unknown>;
}

/**
 * Transactionally reconciles the durable structures implied by one source's
 * effective rules. Removed rows are retained as history and stable keys revive
 * those same rows if the rule later returns.
 */
export class GrantRuleSlotGenerator {
  readonly #eligibility: SpellSelectionEligibility;
  readonly #rules: SourceRuleReader;
  readonly #planner: GrantRulePlanner;

  constructor(
    private readonly db: DatabaseContext,
    eligibility?: SpellSelectionEligibility,
    rules?: SourceRuleReader,
    planner?: GrantRulePlanner,
  ) {
    this.#eligibility =
      eligibility ?? new SpellSelectionEligibility(db);
    this.#rules = rules ?? new SourceRuleReader(db);
    this.#planner = planner ?? new GrantRulePlanner();
  }

  activeRulesForSource(sourceInstanceId: number): GrantRule[] {
    return this.#rules.activeRulesForSource(sourceInstanceId);
  }

  generateForSource(sourceInstanceId: number): void {
    this.db.transaction(() => {
      const source = this.#rules.findSource(sourceInstanceId);
      if (source === null) {
        throw new TypeError(
          `Source instance ${sourceInstanceId} does not exist.`,
        );
      }
      if (source.state !== 'active') {
        this.deactivateSourceTree(sourceInstanceId);
        return;
      }

      const desiredSlotKeys: string[] = [];
      const desiredSpellbookAddresses: string[] = [];
      const desiredChildMarkers: string[] = [];
      const activeRules: GrantRule[] = [];
      for (const rule of this.#rules.rulesForSource(source)) {
        this.assertDistinctConfiguration(source, rule);
        if (!this.#rules.ruleIsActiveForSource(source, rule)) {
          continue;
        }
        activeRules.push(rule);
      }

      const decodedConfig = decodeGrantJson(source.config);
      const normalizedConfig =
        Array.isArray(decodedConfig) && decodedConfig.length === 0
          ? {}
          : decodedConfig;
      if (!isRecord(normalizedConfig)) {
        throw new TypeError(
          `Grant source ${source.id} config must be an object.`,
        );
      }
      const effectiveClassLevel = this.effectiveClassLevel(source);
      const plannedSpells = this.#planner.plan({
        source: {
          kind: 'existing_source',
          source_instance_id: source.id as SourceInstanceId,
        },
        configured_rules: activeRules.map((rule) => rule.toObject()),
        config: normalizedConfig as JsonObject,
        effective_class_level: effectiveClassLevel,
        effective_character_level: characterLevel(
          this.db,
          source.characterId,
        ) as CharacterLevel | null,
      });
      const ruleByKey = new Map(
        activeRules.map((rule) => [rule.ruleKey, rule]),
      );
      for (const planned of plannedSpells) {
        const rule = ruleByKey.get(planned.locator.rule_key);
        if (rule === undefined) {
          throw new Error(
            `Planned grant rule '${planned.locator.rule_key}' disappeared before generation.`,
          );
        }
        if (planned.kind === 'slot_selection') {
          this.materializePlannedSlot(source, rule, planned);
          desiredSlotKeys.push(
            this.slotKey(source, rule, planned.locator.ordinal),
          );
        } else {
          this.syncSpellbookAcquisition(source, rule, planned);
          desiredSpellbookAddresses.push(
            `${rule.ruleKey}:${planned.locator.ordinal}`,
          );
        }
      }

      for (const rule of activeRules) {
        switch (rule.kind) {
          case GrantRule.GRANT_SOURCE:
            desiredChildMarkers.push(
              ...this.materializeGrantedSources(source, rule),
            );
            break;
          case GrantRule.FIXED_SPELL:
          case GrantRule.CHOICE_FROM_LIST:
          case GrantRule.CHOICE_FROM_QUERY:
          case GrantRule.SPELLBOOK_ACQUISITION:
          case GrantRule.CAPABILITY:
          case GrantRule.FIGHTING_STYLE:
          case GrantRule.WEAPON_MASTERY:
          case GrantRule.SKILL_PROFICIENCY: {
            const data = ruleData(rule);
            if (data.allows_tool_instead !== true) {
              break;
            }
            const configured = normalizedConfig['selected_skills'] ?? [];
            if (
              !Array.isArray(configured) ||
              !configured.every(
                (skill): skill is Skill | null =>
                  skill === null || isEnumValue(skills, skill),
              )
            ) {
              throw new TypeError(
                `Grant rule '${rule.ruleKey}' config 'selected_skills' ` +
                  'must contain only known skills.',
              );
            }
            syncToolAlternativeSkillGrants(
              this.db,
              {
                id: source.id,
                characterId: source.characterId,
                sourceType: source.sourceType,
                sourceDefinitionId: source.sourceDefinitionId,
              },
              rule.ruleKey,
              rule.count ?? 0,
              configured,
            );
            break;
          }
        }
      }

      this.reconcileSlots(source, desiredSlotKeys);
      this.reconcileSpellbookAcquisitions(
        source,
        desiredSpellbookAddresses,
      );
      this.reconcileGrantedChildren(source, desiredChildMarkers);
      // THE SKILL-GRANT CLASS ARM (plan §3.8): sync/revive keyed on
      // (source_instance_id, grant_key, ordinal), mirroring syncSlot —
      // creation mints unfilled grants, reactivation revives orphaned rows
      // with their selection intact. The projection is reconciled on every
      // path that changes the active grant set, this one included.
      syncClassSkillGrants(this.db, {
        id: source.id,
        characterId: source.characterId,
        sourceType: source.sourceType,
        sourceDefinitionId: source.sourceDefinitionId,
      });
      // THE SPECIES ARM (S-B): same sync/revive, scoped to the two SPECIES
      // grant keys, desired set from the seam's literal plans (Elf Keen
      // Senses, Human Skillful). A separate arm rather than a widening of the
      // class arm's scope, so neither reconcile can orphan the other's grants
      // — or the background producer's, which no arm owns.
      syncSpeciesSkillGrants(this.db, {
        id: source.id,
        characterId: source.characterId,
        sourceType: source.sourceType,
        sourceDefinitionId: source.sourceDefinitionId,
      });
      rebuildSkillProjection(this.db, source.characterId);
      reconcileCharacterSkillExpertise(this.db, source.characterId);
    });
  }

  private effectiveClassLevel(
    source: GrantSourceInstance,
  ): ClassLevel | null {
    if (
      source.sourceType !== 'class' &&
      source.sourceType !== 'subclass'
    ) {
      const configured = valueAtPath(
        decodeGrantJson(source.config),
        'class_level',
      );
      return Number.isSafeInteger(configured) &&
        (configured as number) >= 1 &&
        (configured as number) <= 20
        ? (configured as ClassLevel)
        : null;
    }
    return this.#rules.classLevelForSource(source) as ClassLevel;
  }

  private materializePlannedSlot(
    source: GrantSourceInstance,
    rule: GrantRule,
    planned: Extract<PlannedSpellGrant, { kind: 'slot_selection' }>,
  ): void {
    let fixedSpellVersionId = planned.fixed_spell_version_id;
    if (
      fixedSpellVersionId === null &&
      planned.fixed_spell_version_key !== null
    ) {
      fixedSpellVersionId = this.db.scalar<number>(
        'SELECT id FROM spell_versions WHERE content_key = ?',
        [planned.fixed_spell_version_key],
      ) as typeof fixedSpellVersionId;
    }
    const version =
      fixedSpellVersionId === null
        ? null
        : this.db.one(
            'SELECT id, is_active FROM spell_versions WHERE id = ?',
            [fixedSpellVersionId],
            spellVersionActivity,
          );
    if (planned.locked && version === null) {
      throw new Error(
        `Grant rule '${rule.ruleKey}' references a spell version that does not exist.`,
      );
    }
    const key = this.slotKey(
      source,
      rule,
      planned.locator.ordinal,
    );
    const existingReference =
      fixedSpellVersionId !== null &&
      Number(
        this.db.scalar(
          `SELECT EXISTS (
             SELECT 1 FROM spell_selection_slots
             WHERE character_id = ? AND slot_key = ?
               AND fixed_spell_version_id = ?
           )`,
          [source.characterId, key, fixedSpellVersionId],
        ) ?? 0,
      ) === 1;
    if (
      version !== null &&
      !version.is_active &&
      !existingReference
    ) {
      throw new Error(
        `Grant rule '${rule.ruleKey}' references an inactive spell version.`,
      );
    }

    const data = ruleData(rule);
    this.syncSlot(source, rule, planned.locator.ordinal, {
      fixed_spell_version_id: fixedSpellVersionId,
      ...storedSpellSelectionConstraint(planned.constraint),
      counts_against_limit:
        data.counts_against_limit === false ? 0 : 1,
      required: planned.required ? 1 : 0,
      is_locked: planned.locked ? 1 : 0,
    });
  }

  private materializeGrantedSources(
    source: GrantSourceInstance,
    rule: GrantRule,
  ): string[] {
    const data = ruleData(rule);
    const sourceType = String(data.source_type);
    const definitionTable = sourceDefinitionTable(sourceType);
    const parentConfig = decodeGrantJson(source.config);

    let definitionId = data.source_definition_id;
    let definitionKey = data.source_definition_key;
    if (typeof data.definition_key_config === 'string') {
      definitionKey = valueAtPath(
        parentConfig,
        data.definition_key_config,
      );
    }
    if (
      (definitionId === null || definitionId === undefined) &&
      typeof definitionKey === 'string'
    ) {
      definitionId = this.db.scalar<number>(
        `SELECT id FROM ${definitionTable} WHERE content_key = ?`,
        [definitionKey],
      );
    }
    const definition =
      definitionId === null || definitionId === undefined
        ? null
        : this.db.one(
            `SELECT id, name FROM ${definitionTable} WHERE id = ?`,
            [Number(definitionId)],
            namedDefinition,
          );
    if (definition === null) {
      throw new Error(
        `Grant-source rule '${rule.ruleKey}' could not resolve its definition.`,
      );
    }

    let childConfig: unknown = data.child_config ?? {};
    if (typeof data.child_config_config === 'string') {
      childConfig = valueAtPath(
        parentConfig,
        data.child_config_config,
        {},
      );
    }
    if (
      childConfig === null ||
      typeof childConfig !== 'object'
    ) {
      throw new TypeError(
        `Grant-source rule '${rule.ruleKey}' child config must be an object.`,
      );
    }

    const markers: string[] = [];
    for (let ordinal = 1; ordinal <= (rule.count ?? 0); ordinal += 1) {
      const marker = `grant_rule:${rule.ruleKey}:${ordinal}`;
      markers.push(marker);
      // RAW on purpose: `child` is handed to `updateChangedRow`, which diffs it
      // against `attributes` whose keys are chosen at runtime. Decoding it here
      // would fix the column set that the diff is written to keep open.
      const child = this.db.oneRaw(
        `SELECT id, instance_uuid, character_id, parent_source_instance_id,
                source_type, source_definition_id, display_name, config,
                acquired_at_character_level, state, notes
         FROM character_source_instances
         WHERE parent_source_instance_id = ? AND notes = ?
         LIMIT 1`,
        [source.id, marker],
      );
      const childConfigJson = JSON.stringify(childConfig);
      const chosenList = valueAtPath(childConfig, 'chosen_list');
      const definitionName = definition.name;
      const displayName =
        typeof chosenList === 'string' && chosenList !== ''
          ? `${definitionName}: ${chosenList}`
          : definitionName;
      const attributes: Attributes = {
        character_id: source.characterId,
        parent_source_instance_id: source.id,
        source_type: sourceType,
        source_definition_id: definition.id,
        display_name: displayName,
        config: childConfigJson,
        acquired_at_character_level: source.acquiredAtCharacterLevel,
        state: 'active',
        notes: marker,
      };

      let childId: number;
      if (child === null) {
        const timestamp = new Date().toISOString();
        childId = this.db.exec(
          `INSERT INTO character_source_instances (
             character_id, instance_uuid, parent_source_instance_id,
             source_type, source_definition_id, display_name, config,
             acquired_at_character_level, state, notes, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            attributes.character_id,
            crypto.randomUUID(),
            attributes.parent_source_instance_id,
            attributes.source_type,
            attributes.source_definition_id,
            attributes.display_name,
            attributes.config,
            attributes.acquired_at_character_level,
            attributes.state,
            attributes.notes,
            timestamp,
            timestamp,
          ],
        ).lastInsertId;
      } else {
        childId = Number(child.id);
        this.updateChangedRow(
          'character_source_instances',
          childId,
          child,
          attributes,
        );
      }
      this.generateForSource(childId);
    }
    return markers;
  }

  private syncSpellbookAcquisition(
    source: GrantSourceInstance,
    rule: GrantRule,
    planned: Extract<
      PlannedSpellGrant,
      { kind: 'spellbook_acquisition' }
    >,
  ): void {
    const ordinal = planned.locator.ordinal;
    const existing = this.db.oneRaw(
      `SELECT * FROM wizard_spellbook_entries
       WHERE source_instance_id = ? AND rule_key = ? AND ordinal = ?`,
      [source.id, rule.ruleKey, ordinal],
    );
    const spellVersionId =
      existing === null || existing.spell_version_id === null
        ? null
        : Number(existing.spell_version_id);
    const evaluation =
      spellVersionId === null
        ? { status: 'unselected' as const, reason: null }
        : this.#eligibility.evaluateConstraint(
            source.characterId,
            planned.constraint,
            spellVersionId,
          );
    const attributes: Attributes = {
      character_id: source.characterId,
      source_instance_id: source.id,
      rule_key: rule.ruleKey,
      ordinal,
      acquired_at_class_level: planned.acquired_at_class_level,
      spell_level_min: planned.constraint.spell_level_min,
      spell_level_max: planned.constraint.spell_level_max,
      allowed_spell_lists:
        storedSpellSelectionConstraint(planned.constraint)
          .allowed_spell_lists,
      allowed_schools:
        storedSpellSelectionConstraint(planned.constraint)
          .allowed_schools,
      allowed_tags:
        storedSpellSelectionConstraint(planned.constraint).allowed_tags,
      state: 'active',
      orphan_reason_code: null,
      orphaned_at: null,
      selection_eligibility: evaluation.status,
      selection_invalid_reason: evaluation.reason,
    };
    if (existing === null) {
      const timestamp = new Date().toISOString();
      const columns = [
        ...Object.keys(attributes),
        'spell_version_id',
        'created_at',
        'updated_at',
      ];
      this.db.exec(
        `INSERT INTO wizard_spellbook_entries
           (${columns.join(', ')})
         VALUES (${columns.map(() => '?').join(', ')})`,
        [
          ...Object.values(attributes),
          null,
          timestamp,
          timestamp,
        ],
      );
      return;
    }
    this.updateChangedRow(
      'wizard_spellbook_entries',
      Number(existing.id),
      existing,
      attributes,
    );
  }

  private syncSlot(
    source: GrantSourceInstance,
    rule: GrantRule,
    ordinal: number,
    eligibility: Attributes,
  ): void {
    const data = ruleData(rule);
    const slotKey = this.slotKey(source, rule, ordinal);
    const attributes: Attributes = {
      source_instance_id: source.id,
      rule_key: rule.ruleKey,
      ordinal,
      bucket: rule.bucket,
      eligibility_kind: rule.kind,
      label:
        typeof data.label === 'string' ? data.label : null,
      always_prepared: rule.alwaysPrepared ? 1 : 0,
      with_slots: rule.withSlots ? 1 : 0,
      free_cast:
        rule.freeCast === null
          ? null
          : JSON.stringify(rule.freeCast.toObject()),
      state: 'active',
      orphan_reason_code: null,
      orphaned_at: null,
      sort_order: ordinal,
      ...eligibility,
    };
    // RAW on purpose, for the same reason as `child` above: `updateChangedRow`
    // compares this row column-by-column against a runtime-keyed attribute map.
    const existing = this.db.oneRaw(
      `SELECT * FROM spell_selection_slots
       WHERE character_id = ? AND slot_key = ?`,
      [source.characterId, slotKey],
    );
    if (existing === null) {
      const timestamp = new Date().toISOString();
      const columns = [
        'character_id',
        'slot_key',
        'current_spell_version_id',
        ...Object.keys(attributes),
        'created_at',
        'updated_at',
      ];
      const values: SqlValue[] = [
        source.characterId,
        slotKey,
        null,
        ...Object.values(attributes),
        timestamp,
        timestamp,
      ];
      const slotId = this.db.exec(
        `INSERT INTO spell_selection_slots
           (${columns.join(', ')})
         VALUES (${columns.map(() => '?').join(', ')})`,
        values,
      ).lastInsertId;
      this.#eligibility.refresh(slotId);
      return;
    }

    if (existing.state === 'kept_override') {
      attributes.state = 'kept_override';
    }
    const slotId = Number(existing.id);
    this.updateChangedRow(
      'spell_selection_slots',
      slotId,
      existing,
      attributes,
    );
    this.#eligibility.refresh(slotId);
  }

  private updateChangedRow(
    table:
      | 'character_source_instances'
      | 'spell_selection_slots'
      | 'wizard_spellbook_entries',
    id: number,
    existing: Readonly<Record<string, SqlValue>>,
    attributes: Attributes,
  ): void {
    const changes = Object.entries(attributes).filter(
      ([column, value]) => existing[column] !== value,
    );
    if (changes.length === 0) {
      return;
    }
    const timestamp = new Date().toISOString();
    this.db.exec(
      `UPDATE ${table}
       SET ${changes.map(([column]) => `${column} = ?`).join(', ')},
           updated_at = ?
       WHERE id = ?`,
      [...changes.map(([, value]) => value), timestamp, id],
    );
  }

  private slotKey(
    source: GrantSourceInstance,
    rule: GrantRule,
    ordinal: number,
  ): string {
    return `${source.instanceUuid}:${rule.ruleKey}:${ordinal}`;
  }

  private reconcileSlots(
    source: GrantSourceInstance,
    desiredSlotKeys: readonly string[],
  ): void {
    const desired = new Set(desiredSlotKeys);
    const existing = this.db.all(
      `SELECT id, slot_key, fixed_spell_version_id,
              current_spell_version_id
       FROM spell_selection_slots
       WHERE source_instance_id = ?
         AND state IN ('active', 'kept_override')`,
      [source.id],
      slotReferences,
    );
    for (const slot of existing) {
      if (desired.has(slot.slot_key)) {
        continue;
      }
      const hasReference =
        slot.fixed_spell_version_id !== null ||
        slot.current_spell_version_id !== null;
      const timestamp = new Date().toISOString();
      this.db.exec(
        `UPDATE spell_selection_slots
         SET state = 'orphaned',
             orphan_reason_code = 'rule_no_longer_active',
             orphaned_at = ?,
             prior_config = ?,
             selection_eligibility = ?,
             selection_invalid_reason = ?,
             updated_at = ?
         WHERE id = ?`,
        [
          timestamp,
          source.config,
          hasReference ? 'invalid' : 'unselected',
          hasReference ? RULE_REMOVED_SELECTION_REASON : null,
          timestamp,
          slot.id,
        ],
      );
    }
  }

  private reconcileSpellbookAcquisitions(
    source: GrantSourceInstance,
    desiredAddresses: readonly string[],
  ): void {
    const desired = new Set(desiredAddresses);
    const existing = this.db.all(
      `SELECT id, rule_key, ordinal, spell_version_id
       FROM wizard_spellbook_entries
       WHERE source_instance_id = ? AND state = 'active'`,
      [source.id],
      (row) => ({
        id: sqlInteger(row, 'id'),
        rule_key: sqlString(row, 'rule_key'),
        ordinal: sqlInteger(row, 'ordinal'),
        spell_version_id: sqlNullableInteger(row, 'spell_version_id'),
      }),
    );
    for (const acquisition of existing) {
      if (
        desired.has(
          `${acquisition.rule_key}:${acquisition.ordinal}`,
        )
      ) {
        continue;
      }
      const timestamp = new Date().toISOString();
      this.db.exec(
        `UPDATE wizard_spellbook_entries
         SET state = 'orphaned',
             orphan_reason_code = 'rule_no_longer_active',
             orphaned_at = ?,
             selection_eligibility = ?,
             selection_invalid_reason = ?,
             updated_at = ?
         WHERE id = ?`,
        [
          timestamp,
          acquisition.spell_version_id === null
            ? 'unselected'
            : 'invalid',
          acquisition.spell_version_id === null
            ? null
            : RULE_REMOVED_SELECTION_REASON,
          timestamp,
          acquisition.id,
        ],
      );
    }
  }

  private reconcileGrantedChildren(
    source: GrantSourceInstance,
    desiredChildMarkers: readonly string[],
  ): void {
    const desired = new Set(desiredChildMarkers);
    const children = this.db.all(
      `SELECT id, notes
       FROM character_source_instances
       WHERE parent_source_instance_id = ?
         AND notes LIKE 'grant_rule:%'`,
      [source.id],
      (row) => ({
        id: sqlInteger(row, 'id'),
        notes: sqlNullableString(row, 'notes'),
      }),
    );
    for (const child of children) {
      if (child.notes !== null && desired.has(child.notes)) {
        continue;
      }
      this.deactivateSourceTree(child.id);
    }
  }

  private deactivateSourceTree(sourceInstanceId: number): void {
    const source = this.#rules.findSource(sourceInstanceId);
    if (source === null) {
      return;
    }
    const children = this.db.all(
      `SELECT id FROM character_source_instances
       WHERE parent_source_instance_id = ?`,
      [sourceInstanceId],
      rowId,
    );
    for (const childId of children) {
      this.deactivateSourceTree(childId);
    }

    const slots = this.db.all(
      `SELECT id, fixed_spell_version_id, current_spell_version_id
       FROM spell_selection_slots
       WHERE source_instance_id = ?
         AND state IN ('active', 'kept_override')`,
      [sourceInstanceId],
      slotAssignment,
    );
    for (const slot of slots) {
      const hasReference =
        slot.fixed_spell_version_id !== null ||
        slot.current_spell_version_id !== null;
      const timestamp = new Date().toISOString();
      this.db.exec(
        `UPDATE spell_selection_slots
         SET state = 'orphaned',
             orphan_reason_code = 'parent_rule_removed',
             orphaned_at = ?,
             prior_config = ?,
             selection_eligibility = ?,
             selection_invalid_reason = ?,
             updated_at = ?
         WHERE id = ?`,
        [
          timestamp,
          source.config,
          hasReference ? 'invalid' : 'unselected',
          hasReference ? SOURCE_REMOVED_SELECTION_REASON : null,
          timestamp,
          Number(slot.id),
        ],
      );
    }

    const acquisitions = this.db.all(
      `SELECT id, spell_version_id
       FROM wizard_spellbook_entries
       WHERE source_instance_id = ? AND state = 'active'`,
      [sourceInstanceId],
      (row) => ({
        id: sqlInteger(row, 'id'),
        spell_version_id: sqlNullableInteger(
          row,
          'spell_version_id',
        ),
      }),
    );
    for (const acquisition of acquisitions) {
      const timestamp = new Date().toISOString();
      this.db.exec(
        `UPDATE wizard_spellbook_entries
         SET state = 'orphaned',
             orphan_reason_code = 'parent_rule_removed',
             orphaned_at = ?,
             selection_eligibility = ?,
             selection_invalid_reason = ?,
             updated_at = ?
         WHERE id = ?`,
        [
          timestamp,
          acquisition.spell_version_id === null
            ? 'unselected'
            : 'invalid',
          acquisition.spell_version_id === null
            ? null
            : SOURCE_REMOVED_SELECTION_REASON,
          timestamp,
          acquisition.id,
        ],
      );
    }

    // The tombstone path (§3.8): cascade never fires here, so the grants are
    // orphaned explicitly — every key, not only the class arm's, because
    // whatever minted a grant, its source is now gone. The projection is
    // reconciled in the same pass so a removed class's skills leave the sheet.
    orphanSkillGrantsForSource(this.db, sourceInstanceId);
    rebuildSkillProjection(this.db, source.characterId);
    orphanExpertiseGrantsForSource(this.db, sourceInstanceId);
    reconcileCharacterSkillExpertise(this.db, source.characterId);

    if (source.state !== 'tombstoned') {
      this.db.exec(
        `UPDATE character_source_instances
         SET state = ?, updated_at = ?
         WHERE id = ?`,
        [
          TOMBSTONED_SOURCE_INSTANCE_STATE,
          new Date().toISOString(),
          sourceInstanceId,
        ],
      );
    }
  }

  private assertDistinctConfiguration(
    source: GrantSourceInstance,
    rule: GrantRule,
  ): void {
    if (rule.distinctConfigBy === null) {
      return;
    }
    const value = valueAtPath(
      decodeGrantJson(source.config),
      rule.distinctConfigBy,
    );
    if (value === null) {
      throw new TypeError(
        `Grant rule '${rule.ruleKey}' requires config '${rule.distinctConfigBy}'.`,
      );
    }

    const others = this.db.all(
      `SELECT config
       FROM character_source_instances
       WHERE character_id = ?
         AND source_type = ?
         AND source_definition_id = ?
         AND state = ?
         AND id != ?`,
      [
        source.characterId,
        source.sourceType,
        source.sourceDefinitionId,
        ACTIVE_SOURCE_INSTANCE_STATE,
        source.id,
      ],
      nullableConfig,
    );
    for (const otherConfig of others) {
      const otherValue = valueAtPath(
        decodeGrantJson(otherConfig),
        rule.distinctConfigBy,
      );
      if (!sameValue(otherValue, value)) {
        continue;
      }

      const definition = this.db.one(
        `SELECT name FROM ${sourceDefinitionTable(source.sourceType)}
         WHERE id = ?`,
        [source.sourceDefinitionId ?? 0],
        rowName,
      );
      const name = definition ?? source.displayName;
      throw new TypeError(
        `${name} already uses ${rule.distinctConfigBy} '${scalarString(value)}' for this character.`,
      );
    }
  }
}
