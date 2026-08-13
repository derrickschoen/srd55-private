import {
  CharacterState,
  type CharacterStateSnapshot,
} from '../character/character-state';
import { sqlInteger, sqlNullableString, sqlString } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type {
  ChooseSpeciesLineageCommand as ChooseSpeciesLineagePayload,
} from '../domain/command-contracts';
import { GUIDED_SPECIES_SOURCE_MARKER } from '../domain/source-markers';
import { assignSpellSelection } from '../eligibility/spell-selection-assignment';
import {
  ConfiguredChoiceRule,
  parseSourceGrantRules,
} from '../grants/configured-choice-rule';
import {
  replaceableSpellRuleKey,
} from '../grants/configured-choice-material-reader';
import { GrantRuleSlotGenerator } from '../grants/grant-rule-slot-generator';
import {
  configuredChoiceSlotGenerator,
} from '../grants/character-level-source-reconciliation';
import type { CharacterCommandIntegrity } from './integrity';
import type { StoredCharacterSnapshotInverse } from './stored-inverses';
import { ACTIVE_SOURCE_INSTANCE_STATE } from '../domain/source-instance-state';

export type SpeciesLineageRefusalReason =
  | 'guided_species_source_missing'
  | 'wrong_source_kind'
  | 'configured_choice_unavailable'
  | 'invalid_option'
  | 'invalid_spellcasting_ability'
  | 'invalid_replaceable_spell';

export class SpeciesLineageRefusal extends Error {
  constructor(
    readonly reason: SpeciesLineageRefusalReason,
    message: string,
  ) {
    super(message);
    this.name = 'SpeciesLineageRefusal';
  }
}

interface SpeciesChoiceSource {
  readonly id: number;
  readonly source_type: string;
  readonly config: string | null;
  readonly grant_rules: string | null;
}

type MutableConfig = Record<string, unknown>;

function configRecord(value: string | null): MutableConfig {
  if (value === null || value === '') return {};
  const decoded: unknown = JSON.parse(value);
  if (decoded === null || typeof decoded !== 'object' || Array.isArray(decoded)) {
    throw new TypeError('Species source configuration must be an object.');
  }
  return structuredClone(decoded) as MutableConfig;
}

function setAtPath(config: MutableConfig, path: string, value: unknown): void {
  const parts = path.split('.');
  const leaf = parts.pop();
  if (leaf === undefined) throw new TypeError('Config path must not be empty.');
  let current = config;
  for (const part of parts) {
    const nested = current[part];
    if (nested === undefined) {
      const created: MutableConfig = {};
      current[part] = created;
      current = created;
      continue;
    }
    if (nested === null || typeof nested !== 'object' || Array.isArray(nested)) {
      throw new TypeError(`Config path '${path}' crosses a non-object value.`);
    }
    current = nested as MutableConfig;
  }
  current[leaf] = value;
}

function deleteAtPath(config: MutableConfig, path: string): void {
  const parts = path.split('.');
  const leaf = parts.pop();
  if (leaf === undefined) return;
  let current: MutableConfig = config;
  for (const part of parts) {
    const nested = current[part];
    if (nested === null || typeof nested !== 'object' || Array.isArray(nested)) {
      return;
    }
    current = nested as MutableConfig;
  }
  delete current[leaf];
}

function configuredRules(source: SpeciesChoiceSource): ConfiguredChoiceRule[] {
  if (source.grant_rules === null) return [];
  const parsed: unknown = JSON.parse(source.grant_rules);
  return parseSourceGrantRules(parsed).filter(
    (rule): rule is ConfiguredChoiceRule => rule instanceof ConfiguredChoiceRule,
  );
}

export class ChooseSpeciesLineageCommand {
  readonly actionType = 'choose_species_lineage';

  readonly #state: CharacterState;
  readonly #generator: GrantRuleSlotGenerator;
  #characterId: number | null = null;
  #before: CharacterStateSnapshot | null = null;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: ChooseSpeciesLineagePayload,
    _integrity: CharacterCommandIntegrity,
    state?: CharacterState,
    generator?: GrantRuleSlotGenerator,
  ) {
    this.#state = state ?? new CharacterState(db);
    this.#generator = generator ?? configuredChoiceSlotGenerator(db);
  }

  apply(characterId: number): void {
    this.db.transaction(() => {
      const source = this.db.one(
        `SELECT source.id, source.source_type, source.config,
                definition.grant_rules
         FROM character_source_instances AS source
         LEFT JOIN species_definitions AS definition
           ON definition.id = source.source_definition_id
         WHERE source.character_id = ? AND source.notes = ?
           AND source.state = ?
         ORDER BY source.id`,
        [
          characterId,
          GUIDED_SPECIES_SOURCE_MARKER,
          ACTIVE_SOURCE_INSTANCE_STATE,
        ],
        (row): SpeciesChoiceSource => ({
          id: sqlInteger(row, 'id'),
          source_type: sqlString(row, 'source_type'),
          config: sqlNullableString(row, 'config'),
          grant_rules: sqlNullableString(row, 'grant_rules'),
        }),
      );
      if (source === null) {
        throw new SpeciesLineageRefusal(
          'guided_species_source_missing',
          'This character has no active guided species source.',
        );
      }
      if (source.source_type !== 'species') {
        throw new SpeciesLineageRefusal(
          'wrong_source_kind',
          'The guided species marker does not identify a species source.',
        );
      }
      const rules = configuredRules(source);
      if (rules.length !== 1) {
        throw new SpeciesLineageRefusal(
          'configured_choice_unavailable',
          'The guided species does not expose one resolvable configured choice.',
        );
      }
      const rule = rules.find(
        (candidate) => candidate instanceof ConfiguredChoiceRule,
      );
      if (rule === undefined) {
        throw new Error('The configured-choice rule disappeared.');
      }
      const option = rule.options.find(
        (candidate) => candidate.value === this.payload.chosen_option,
      );
      if (option === undefined) {
        throw new SpeciesLineageRefusal(
          'invalid_option',
          `Choose one of ${rule.options.map((candidate) => candidate.label).join(', ')}.`,
        );
      }
      if (
        rule.abilityChoice === null ||
        !rule.abilityChoice.options.includes(this.payload.spellcasting_ability)
      ) {
        throw new SpeciesLineageRefusal(
          'invalid_spellcasting_ability',
          'Choose one of the configured spellcasting abilities.',
        );
      }

      const before = this.#state.capture(characterId);
      const config = configRecord(source.config);
      delete config['class_level'];
      setAtPath(config, rule.configKey, option.value);
      setAtPath(
        config,
        rule.abilityChoice.configKey,
        this.payload.spellcasting_ability,
      );
      for (const candidate of rule.options) {
        const replaceable = candidate.replaceableSpellChoice;
        if (replaceable !== null && candidate !== option) {
          deleteAtPath(config, replaceable.configKey);
        }
      }
      const replaceable = option.replaceableSpellChoice;
      if (replaceable === null) {
        if (this.payload.replaceable_spell_version_key !== undefined) {
          throw new SpeciesLineageRefusal(
            'invalid_replaceable_spell',
            'This configured option has no replaceable spell choice.',
          );
        }
      } else {
        setAtPath(
          config,
          replaceable.configKey,
          this.payload.replaceable_spell_version_key ??
            replaceable.initialSpellVersionKey,
        );
      }

      this.db.exec(
        `UPDATE character_source_instances
         SET config = ?, updated_at = ?
         WHERE id = ?`,
        [JSON.stringify(config), new Date().toISOString(), source.id],
      );
      this.reconcileEffects(characterId, source.id, rule, option);
      this.#generator.generateForSource(source.id);
      if (replaceable !== null) {
        const selectedKey = this.payload.replaceable_spell_version_key ??
          replaceable.initialSpellVersionKey;
        const spellVersionId = this.db.scalar<number>(
          'SELECT id FROM spell_versions WHERE content_key = ? AND is_active = 1',
          [selectedKey],
        );
        const slotId = this.db.scalar<number>(
          `SELECT id FROM spell_selection_slots
           WHERE character_id = ? AND source_instance_id = ?
             AND rule_key = ? AND ordinal = 1 AND state = 'active'`,
          [characterId, source.id, replaceableSpellRuleKey(rule.ruleKey)],
        );
        if (spellVersionId === null || slotId === null) {
          throw new SpeciesLineageRefusal(
            'invalid_replaceable_spell',
            'The selected replaceable spell is unavailable.',
          );
        }
        try {
          assignSpellSelection(this.db, {
            character_id: characterId,
            spell_version_id: Number(spellVersionId),
            address: { kind: 'slot_selection', id: Number(slotId) },
          });
        } catch (error) {
          throw new SpeciesLineageRefusal(
            'invalid_replaceable_spell',
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      this.#before = before;
      this.#characterId = characterId;
    });
  }

  private reconcileEffects(
    characterId: number,
    sourceId: number,
    rule: ConfiguredChoiceRule,
    option: ConfiguredChoiceRule['options'][number],
  ): void {
    this.db.exec(
      `DELETE FROM character_effects
       WHERE character_id = ? AND source_instance_id = ?
         AND template_ref LIKE 'configured_choice:%'`,
      [characterId, sourceId],
    );
    let sortOrder = Number(
      this.db.scalar(
        'SELECT COALESCE(MAX(sort_order), 0) FROM character_effects WHERE character_id = ?',
        [characterId],
      ) ?? 0,
    );
    option.effects.forEach((effect, index) => {
      sortOrder += 1;
      this.db.exec(
        `INSERT INTO character_effects (
           character_id, sort_order, effect_kind, damage_type,
           speed_bonus_feet, source_instance_id, template_ref, label
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          characterId,
          sortOrder,
          effect.kind,
          effect.kind === 'damage_resistance' ? effect.damage_type : null,
          effect.kind === 'speed' ? effect.speed_bonus_feet : null,
          sourceId,
          `configured_choice:${rule.ruleKey}:${option.value}:${String(index)}`,
          effect.label,
        ],
      );
    });
  }

  async inverse(): Promise<StoredCharacterSnapshotInverse> {
    if (this.#characterId === null || this.#before === null) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return { type: 'internal_snapshot_restore', snapshot: this.#before };
  }
}
