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
import { GrantRule } from './grant-rule';
import {
  decodeGrantJson,
  SourceRuleReader,
  sourceDefinitionTable,
  valueAtPath,
  type GrantSourceInstance,
} from './source-rule-reader';

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

function jsonList(value: unknown): string | null {
  return Array.isArray(value) ? JSON.stringify([...value]) : null;
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

  constructor(
    private readonly db: DatabaseContext,
    eligibility?: SpellSelectionEligibility,
    rules?: SourceRuleReader,
  ) {
    this.#eligibility =
      eligibility ?? new SpellSelectionEligibility(db);
    this.#rules = rules ?? new SourceRuleReader(db);
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
      const desiredChildMarkers: string[] = [];
      for (const rule of this.#rules.rulesForSource(source)) {
        this.assertDistinctConfiguration(source, rule);
        if (!this.#rules.ruleIsActiveForSource(source, rule)) {
          continue;
        }

        switch (rule.kind) {
          case GrantRule.FIXED_SPELL:
            this.materializeFixedSpell(source, rule);
            desiredSlotKeys.push(this.slotKey(source, rule, 1));
            break;
          case GrantRule.CHOICE_FROM_LIST:
            this.materializeListChoices(source, rule);
            this.appendDesiredSlotKeys(source, rule, desiredSlotKeys);
            break;
          case GrantRule.CHOICE_FROM_QUERY:
            this.materializeQueryChoices(source, rule);
            this.appendDesiredSlotKeys(source, rule, desiredSlotKeys);
            break;
          case GrantRule.GRANT_SOURCE:
            desiredChildMarkers.push(
              ...this.materializeGrantedSources(source, rule),
            );
            break;
          case GrantRule.SPELLBOOK_ACQUISITION:
            this.materializeSpellbookEntries(source, rule);
            break;
          case GrantRule.CAPABILITY:
            break;
        }
      }

      this.reconcileSlots(source, desiredSlotKeys);
      this.reconcileGrantedChildren(source, desiredChildMarkers);
    });
  }

  private appendDesiredSlotKeys(
    source: GrantSourceInstance,
    rule: GrantRule,
    desired: string[],
  ): void {
    for (let ordinal = 1; ordinal <= (rule.count ?? 0); ordinal += 1) {
      desired.push(this.slotKey(source, rule, ordinal));
    }
  }

  private materializeFixedSpell(
    source: GrantSourceInstance,
    rule: GrantRule,
  ): void {
    const data = ruleData(rule);
    let spellVersionId = data.spell_version_id;
    if (spellVersionId === null || spellVersionId === undefined) {
      spellVersionId = this.db.scalar<number>(
        'SELECT id FROM spell_versions WHERE content_key = ?',
        [String(data.spell_version_key ?? '')],
      );
    }
    const version =
      spellVersionId === null || spellVersionId === undefined
        ? null
        : this.db.one(
            'SELECT id, is_active FROM spell_versions WHERE id = ?',
            [Number(spellVersionId)],
            spellVersionActivity,
          );
    if (version === null) {
      throw new Error(
        `Grant rule '${rule.ruleKey}' references a spell version that does not exist.`,
      );
    }

    const key = this.slotKey(source, rule, 1);
    const existingReference = Number(
      this.db.scalar(
        `SELECT EXISTS (
           SELECT 1 FROM spell_selection_slots
           WHERE character_id = ? AND slot_key = ?
             AND fixed_spell_version_id = ?
         )`,
        [source.characterId, key, Number(spellVersionId)],
      ) ?? 0,
    ) === 1;
    if (!version.is_active && !existingReference) {
      throw new Error(
        `Grant rule '${rule.ruleKey}' references an inactive spell version.`,
      );
    }

    this.syncSlot(source, rule, 1, {
      fixed_spell_version_id: Number(spellVersionId),
      current_spell_version_id: null,
      spell_level_min: 0,
      spell_level_max: 9,
      allowed_spell_lists: null,
      allowed_schools: null,
      allowed_tags: null,
      selection_collection: null,
      counts_against_limit: data.counts_against_limit === true ? 1 : 0,
      required: 1,
      is_locked: 1,
    });
  }

  private materializeListChoices(
    source: GrantSourceInstance,
    rule: GrantRule,
  ): void {
    const data = ruleData(rule);
    let list = String(data.list ?? '');
    if (list.startsWith('$config.')) {
      list = String(
        valueAtPath(
          decodeGrantJson(source.config),
          list.slice('$config.'.length),
          '',
        ),
      );
    }
    if (list === '') {
      throw new TypeError(
        `Grant rule '${rule.ruleKey}' could not resolve its spell list.`,
      );
    }

    for (let ordinal = 1; ordinal <= (rule.count ?? 0); ordinal += 1) {
      this.syncSlot(source, rule, ordinal, {
        fixed_spell_version_id: null,
        spell_level_min: Number(data.level_min ?? 0),
        spell_level_max: Number(data.level_max ?? 9),
        allowed_spell_lists: JSON.stringify([list]),
        allowed_schools: null,
        allowed_tags: null,
        selection_collection: null,
        counts_against_limit:
          data.counts_against_limit === false ? 0 : 1,
        required: data.required === false ? 0 : 1,
        is_locked: 0,
      });
    }
  }

  private materializeQueryChoices(
    source: GrantSourceInstance,
    rule: GrantRule,
  ): void {
    const data = ruleData(rule);
    for (let ordinal = 1; ordinal <= (rule.count ?? 0); ordinal += 1) {
      this.syncSlot(source, rule, ordinal, {
        fixed_spell_version_id: null,
        spell_level_min: Number(data.level_min ?? 0),
        spell_level_max: Number(data.level_max ?? 9),
        allowed_spell_lists: null,
        allowed_schools: jsonList(data.schools),
        allowed_tags: jsonList(data.tags),
        selection_collection: null,
        counts_against_limit:
          data.counts_against_limit === false ? 0 : 1,
        required: data.required === false ? 0 : 1,
        is_locked: 0,
      });
    }
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

  private materializeSpellbookEntries(
    source: GrantSourceInstance,
    rule: GrantRule,
  ): void {
    const data = ruleData(rule);
    const config = decodeGrantJson(source.config);
    const configKey = String(data.acquisitions_config);
    const acquisitions = valueAtPath(config, configKey, []);
    if (!Array.isArray(acquisitions)) {
      throw new TypeError(
        `Spellbook rule '${rule.ruleKey}' config '${configKey}' must be a list.`,
      );
    }

    for (const [index, acquisition] of acquisitions.entries()) {
      if (!isRecord(acquisition)) {
        throw new TypeError(
          `Spellbook rule '${rule.ruleKey}' acquisition ${index} must be an object.`,
        );
      }
      const unsupported = Object.keys(acquisition).filter(
        (key) =>
          key !== 'spell_version_id' &&
          key !== 'spell_version_key',
      );
      if (unsupported.length > 0) {
        throw new TypeError(
          `Spellbook rule '${rule.ruleKey}' acquisition ${index} contains unsupported bookkeeping fields: ${unsupported.join(', ')}.`,
        );
      }

      let spellVersionId = acquisition.spell_version_id;
      if (
        (spellVersionId === null || spellVersionId === undefined) &&
        typeof acquisition.spell_version_key === 'string'
      ) {
        spellVersionId = this.db.scalar<number>(
          'SELECT id FROM spell_versions WHERE content_key = ?',
          [acquisition.spell_version_key],
        );
      }
      if (spellVersionId === null || spellVersionId === undefined) {
        throw new Error(
          `Spellbook rule '${rule.ruleKey}' acquisition ${index} could not resolve its spell.`,
        );
      }

      const version = this.db.one(
        'SELECT id, is_active FROM spell_versions WHERE id = ?',
        [Number(spellVersionId)],
        spellVersionActivity,
      );
      if (version === null) {
        throw new Error(
          `Spellbook rule '${rule.ruleKey}' acquisition ${index} could not resolve its spell.`,
        );
      }
      const existingEntry =
        Number(
          this.db.scalar(
            `SELECT EXISTS (
               SELECT 1 FROM wizard_spellbook_entries
               WHERE character_id = ? AND spell_version_id = ?
             )`,
            [source.characterId, Number(spellVersionId)],
          ) ?? 0,
        ) === 1;
      if (Number(version.is_active) !== 1 && !existingEntry) {
        throw new Error(
          `Spellbook rule '${rule.ruleKey}' acquisition ${index} references an inactive spell version.`,
        );
      }

      const list = String(data.list);
      const eligible =
        Number(
          this.db.scalar(
            `SELECT EXISTS (
               SELECT 1 FROM spell_list_memberships
               WHERE spell_version_id = ? AND spell_list_key = ?
             )`,
            [Number(spellVersionId), list],
          ) ?? 0,
        ) === 1;
      if (!eligible) {
        throw new TypeError(
          `Spellbook rule '${rule.ruleKey}' acquisition ${index} is not on the ${list} list.`,
        );
      }

      if (!existingEntry) {
        const timestamp = new Date().toISOString();
        this.db.exec(
          `INSERT INTO wizard_spellbook_entries (
             character_id, spell_version_id, created_at, updated_at
           ) VALUES (?, ?, ?, ?)`,
          [
            source.characterId,
            Number(spellVersionId),
            timestamp,
            timestamp,
          ],
        );
      }
    }
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
    table: 'character_source_instances' | 'spell_selection_slots',
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

    if (source.state !== 'tombstoned') {
      this.db.exec(
        `UPDATE character_source_instances
         SET state = 'tombstoned', updated_at = ?
         WHERE id = ?`,
        [new Date().toISOString(), sourceInstanceId],
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
         AND state = 'active'
         AND id != ?`,
      [
        source.characterId,
        source.sourceType,
        source.sourceDefinitionId,
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
