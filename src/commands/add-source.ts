import {
  CharacterState,
  type CharacterStateSnapshot,
} from '../character/character-state';
import type { CharacterCommandIntegrity } from './integrity';
import type { SqlRow } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { characterLevel } from '../rules/character-level';
import type {
  AddSourceCommand as AddSourcePayload,
} from '../domain/command-contracts';
import {
  definitionTableForSourceType,
  type AddableSourceType,
} from '../domain/enums';
import { GrantRuleSlotGenerator } from '../grants/grant-rule-slot-generator';
import type { StoredCharacterSnapshotInverse } from './stored-inverses';
import { assertMulticlassEntryEligible } from '../rules/multiclass-prerequisite-gate';

import {
  MAGIC_INITIATE_ABILITIES,
} from '../builder/background-choices';
import { MAGIC_INITIATE_LISTS } from '../domain/background-feat-name';
import { ACTIVE_SOURCE_INSTANCE_STATE } from '../domain/source-instance-state';
const SOURCE_TYPES = ['class', 'feat', 'species', 'background'] as const;

type MutableConfig = Record<string, unknown>;
/**
 * A catalog definition row, RAW.
 *
 * The table is chosen at runtime by `definitionTableForSourceType`, so there is
 * no fixed column set to write a codec against: a class definition, a feat and a
 * background share almost nothing but `id` and `content_key`. This is the case
 * `oneRaw` exists for. `SqlRow` rather than `Record<string, unknown>` because
 * SQLite cannot hand back anything but a `SqlValue`.
 */
type Definition = SqlRow;

interface OrderDefinition {
  readonly key: 'divine_order' | 'primal_order';
  readonly options: readonly string[];
  readonly bonus: string;
}

function isRecord(value: unknown): value is MutableConfig {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function timestamp(): string {
  return new Date().toISOString();
}

export function assertSourceRepeatable(
  db: DatabaseContext,
  characterId: number,
  sourceType: AddableSourceType,
  definition: Definition,
): void {
  const activeDuplicate = Number(
    db.scalar(
      `SELECT EXISTS (
         SELECT 1 FROM character_source_instances
         WHERE character_id = ? AND source_type = ?
           AND source_definition_id = ? AND state = ?
       )`,
      [
        characterId,
        sourceType,
        Number(definition.id),
        ACTIVE_SOURCE_INSTANCE_STATE,
      ],
    ) ?? 0,
  ) === 1;
  if (
    activeDuplicate &&
    (sourceType === 'class' || Number(definition.repeatable) !== 1)
  ) {
    throw new TypeError(`${String(definition.name)} is not repeatable.`);
  }
}

function validateMagicInitiate(config: MutableConfig): void {
  const list = config.chosen_list;
  if (
    typeof list !== 'string' ||
    !(MAGIC_INITIATE_LISTS as readonly string[]).includes(list)
  ) {
    throw new TypeError(
      'Magic Initiate must use the Cleric, Druid, or Wizard spell list.',
    );
  }
  const ability = config.spellcasting_ability;
  if (
    typeof ability !== 'string' ||
    !(MAGIC_INITIATE_ABILITIES as readonly string[]).includes(ability)
  ) {
    throw new TypeError(
      'Magic Initiate must use Intelligence, Wisdom, or Charisma.',
    );
  }
}

export function validateSourceConfiguration(
  contentKey: string,
  config: MutableConfig,
): void {
  if (contentKey === '2024:feat:magic-initiate') {
    validateMagicInitiate(config);
    return;
  }
  if (config.origin_feat_key === '2024:feat:magic-initiate') {
    if (!isRecord(config.origin_feat_config)) {
      throw new TypeError(
        'Magic Initiate origin feat config must be an object.',
      );
    }
    validateMagicInitiate(config.origin_feat_config);
  }
}

export class AddSourceCommand {
  readonly actionType = 'add_source';

  readonly #state: CharacterState;
  readonly #generator: GrantRuleSlotGenerator;
  #characterId: number | undefined;
  #before: CharacterStateSnapshot | undefined;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: AddSourcePayload,
    _integrity: CharacterCommandIntegrity,
    state?: CharacterState,
    generator?: GrantRuleSlotGenerator,
  ) {
    this.#state = state ?? new CharacterState(db);
    this.#generator = generator ?? new GrantRuleSlotGenerator(db);
  }

  apply(characterId: number): void {
    this.db.transaction(() => {
      const sourceType = this.sourceType();
      const definitionId = this.payload.source_definition_id;
      const table = definitionTableForSourceType(sourceType);
      const definition = this.db.oneRaw(
        `SELECT * FROM ${table} WHERE id = ?`,
        [definitionId],
      );
      if (definition === null) {
        throw new TypeError(
          'Unknown source definition for the selected source type.',
        );
      }

      assertSourceRepeatable(
        this.db,
        characterId,
        sourceType,
        definition,
      );

      const config: unknown = this.payload.config;
      if (!isRecord(config)) {
        throw new TypeError('Source config must be an object.');
      }
      this.#characterId = characterId;
      if (sourceType === 'class') {
        this.addClass(characterId, definition, config);
        return;
      }

      validateSourceConfiguration(String(definition.content_key), config);
      this.#before = this.#state.capture(characterId);
      const totalLevel = characterLevel(this.db, characterId);
      const now = timestamp();
      const sourceId = this.db.exec(
        `INSERT INTO character_source_instances (
           character_id, instance_uuid, source_type, source_definition_id,
           display_name, config, acquired_at_character_level, state,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          characterId,
          crypto.randomUUID(),
          sourceType,
          Number(definition.id),
          this.displayName(definition, config),
          JSON.stringify(config),
          // The column is nullable, so a source added before the class
          // precondition is satisfied records the absence instead of level 1.
          totalLevel,
          ACTIVE_SOURCE_INSTANCE_STATE,
          now,
          now,
        ],
      ).lastInsertId;
      this.#generator.generateForSource(sourceId);
    });
  }

  private sourceType(): AddableSourceType {
    const sourceType: unknown = this.payload.source_type;
    if (
      typeof sourceType !== 'string' ||
      !(SOURCE_TYPES as readonly string[]).includes(sourceType)
    ) {
      throw new TypeError('Unknown source type.');
    }
    return sourceType as AddableSourceType;
  }

  private addClass(
    characterId: number,
    definition: Definition,
    config: MutableConfig,
  ): void {
    const level = config.level;
    if (!Number.isSafeInteger(level) || (level as number) < 1 || (level as number) > 20) {
      throw new TypeError('Class source level must be between 1 and 20.');
    }
    const classId = Number(definition.id);
    const duplicateLevel = Number(
      this.db.scalar(
        `SELECT EXISTS (
           SELECT 1 FROM character_class_levels
           WHERE character_id = ? AND class_definition_id = ?
         )`,
        [characterId, classId],
      ) ?? 0,
    ) === 1;
    if (duplicateLevel) {
      throw new TypeError(`${String(definition.name)} is not repeatable.`);
    }

    const otherLevels = characterLevel(this.db, characterId);
    const resultingLevel =
      otherLevels === null
        ? (level as number)
        : otherLevels + (level as number);
    if (resultingLevel > 20) {
      throw new TypeError('A character cannot exceed level 20.');
    }
    if (otherLevels !== null) {
      assertMulticlassEntryEligible(this.db, characterId, classId);
    }

    const acquisitions = config.wizard_spellbook_acquisitions;
    if (acquisitions !== undefined && String(definition.name) !== 'Wizard') {
      throw new TypeError(
        'Only a Wizard class source can configure a spellbook.',
      );
    }
    if (acquisitions !== undefined && !Array.isArray(acquisitions)) {
      throw new TypeError(
        'Wizard spellbook acquisitions must be a list.',
      );
    }
    const order = this.validatedOrderConfig(String(definition.name), config);

    this.#before = this.#state.capture(characterId);
    const now = timestamp();
    this.db.exec(
      `INSERT INTO character_class_levels (
         character_id, class_definition_id, level, is_starting_class,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        characterId,
        classId,
        level as number,
        otherLevels === null ? 1 : 0,
        now,
        now,
      ],
    );

    const sourceConfig: MutableConfig = {
      spellcasting_ability: definition.spellcasting_ability ?? null,
    };
    if (acquisitions !== undefined) {
      sourceConfig.wizard_spellbook_acquisitions = acquisitions;
    }
    if (order !== null) {
      sourceConfig[order.key] = order.value;
    }
    const sourceId = this.db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, acquired_at_character_level, state,
         created_at, updated_at
       ) VALUES (?, ?, 'class', ?, ?, ?, ?, ?, ?, ?)`,
      [
        characterId,
        crypto.randomUUID(),
        classId,
        `${String(definition.name)} ${String(level)}`,
        JSON.stringify(sourceConfig),
        // A first class is acquired at character level 1; later classes are
        // acquired at the next level after the already-recorded total.
        otherLevels === null ? 1 : otherLevels + 1,
        ACTIVE_SOURCE_INSTANCE_STATE,
        now,
        now,
      ],
    ).lastInsertId;
    this.#generator.generateForSource(sourceId);
  }

  private validatedOrderConfig(
    className: string,
    config: MutableConfig,
  ): { key: string; value: MutableConfig } | null {
    if (hasOwn(config, 'divine_order') && className !== 'Cleric') {
      throw new TypeError(
        'Only a Cleric class source can configure Divine Order.',
      );
    }
    if (hasOwn(config, 'primal_order') && className !== 'Druid') {
      throw new TypeError(
        'Only a Druid class source can configure Primal Order.',
      );
    }
    const definition: OrderDefinition | null =
      className === 'Cleric'
        ? {
            key: 'divine_order',
            options: ['Protector', 'Thaumaturge'],
            bonus: 'Thaumaturge',
          }
        : className === 'Druid'
          ? {
              key: 'primal_order',
              options: ['Warden', 'Magician'],
              bonus: 'Magician',
            }
          : null;
    if (definition === null) {
      return null;
    }

    const value = config[definition.key];
    if (value === undefined || value === null) {
      return null;
    }
    if (!isRecord(value)) {
      throw new TypeError(
        `${className} ${definition.key} config must be an object.`,
      );
    }
    const chosenOption = value.chosen_option;
    if (
      typeof chosenOption !== 'string' ||
      !definition.options.includes(chosenOption)
    ) {
      throw new TypeError(
        `${className} ${definition.key} has an invalid chosen option.`,
      );
    }
    const chosenList = value.chosen_list;
    if (chosenOption === definition.bonus && chosenList !== className) {
      throw new TypeError(
        `${className} ${chosenOption} must use the ${className} spell list.`,
      );
    }
    if (
      chosenOption !== definition.bonus &&
      chosenList !== undefined &&
      chosenList !== null
    ) {
      throw new TypeError(
        `${className} ${chosenOption} must not configure a spell list.`,
      );
    }

    const normalized: MutableConfig = { chosen_option: chosenOption };
    if (typeof chosenList === 'string') {
      normalized.chosen_list = chosenList;
    }
    return { key: definition.key, value: normalized };
  }

  private displayName(
    definition: Definition,
    config: MutableConfig,
  ): string {
    const name = String(definition.name);
    const list = config.chosen_list;
    return typeof list === 'string' && list !== ''
      ? `${name}: ${list}`
      : name;
  }

  async inverse(): Promise<StoredCharacterSnapshotInverse> {
    if (this.#characterId === undefined || this.#before === undefined) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return {
      type: 'internal_snapshot_restore',
      snapshot: this.#before,
    };
  }
}
