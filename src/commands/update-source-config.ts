import {
  CharacterState,
  type CharacterStateSnapshot,
} from '../character/character-state';
import type { CharacterCommandIntegrity } from './integrity';
import {
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type RowCodec,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type {
  UpdateSourceConfigCommand as UpdateSourceConfigPayload,
} from '../domain/command-contracts';
import { MAGIC_INITIATE_LISTS } from '../domain/background-feat-name';
import { GrantRuleSlotGenerator } from '../grants/grant-rule-slot-generator';
import type { StoredCharacterSnapshotInverse } from './stored-inverses';
import { ACTIVE_SOURCE_INSTANCE_STATE } from '../domain/source-instance-state';

/**
 * The configurable source instance, decoded once at the read.
 *
 * `parent_source_instance_id` and `config` are nullable and stay nullable: a
 * top-level source has no parent, and a source with no configuration stores
 * NULL rather than `'{}'`. `decodeConfig` already treats NULL and `''` as "no
 * configuration", so the codec does not have to invent one.
 */
interface ConfigurableSource {
  readonly id: number;
  readonly parent_source_instance_id: number | null;
  readonly source_type: string;
  readonly source_definition_id: number | null;
  readonly config: string | null;
}

const configurableSource: RowCodec<ConfigurableSource> = (row) => ({
  id: sqlInteger(row, 'id'),
  parent_source_instance_id: sqlNullableInteger(
    row,
    'parent_source_instance_id',
  ),
  source_type: sqlString(row, 'source_type'),
  source_definition_id: sqlNullableInteger(row, 'source_definition_id'),
  config: sqlNullableString(row, 'config'),
});

const contentKey: RowCodec<string> = (row) => sqlString(row, 'content_key');
const configText: RowCodec<string | null> = (row) =>
  sqlNullableString(row, 'config');

const ORDER_DEFINITIONS = {
  Cleric: {
    key: 'divine_order',
    options: ['Protector', 'Thaumaturge'],
    bonus: 'Thaumaturge',
  },
  Druid: {
    key: 'primal_order',
    options: ['Warden', 'Magician'],
    bonus: 'Magician',
  },
} as const;

type MutableConfig = Record<string, unknown>;

function isRecord(value: unknown): value is MutableConfig {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function decodeConfig(value: unknown): MutableConfig {
  if (value === null || value === '') {
    return {};
  }
  if (typeof value !== 'string') {
    throw new TypeError('Source configuration must be an object.');
  }
  const decoded: unknown = JSON.parse(value);
  if (!isRecord(decoded)) {
    throw new TypeError('Source configuration must be an object.');
  }
  return decoded;
}

export class UpdateSourceConfigCommand {
  readonly actionType = 'update_source_config';

  readonly #state: CharacterState;
  readonly #generator: GrantRuleSlotGenerator;
  #characterId: number | undefined;
  #previousState: CharacterStateSnapshot | undefined;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: UpdateSourceConfigPayload,
    _integrity: CharacterCommandIntegrity,
    state?: CharacterState,
    generator?: GrantRuleSlotGenerator,
  ) {
    this.#state = state ?? new CharacterState(db);
    this.#generator = generator ?? new GrantRuleSlotGenerator(db);
  }

  apply(characterId: number): void {
    this.db.transaction(() => {
      const source = this.db.one(
        `SELECT id, parent_source_instance_id, source_type,
                source_definition_id, config
         FROM character_source_instances
         WHERE character_id = ? AND id = ? AND state = ?`,
        [
          characterId,
          this.payload.source_instance_id,
          ACTIVE_SOURCE_INSTANCE_STATE,
        ],
        configurableSource,
      );
      if (source === null) {
        throw new TypeError(
          'Configurable source does not belong to this character.',
        );
      }

      const config = decodeConfig(source.config);
      this.#characterId = characterId;
      if (source.source_type === 'class') {
        this.updateClassOrder(characterId, source, config);
        return;
      }

      const definition =
        source.source_type === 'feat'
          ? this.db.one(
              'SELECT content_key FROM feat_definitions WHERE id = ?',
              [source.source_definition_id ?? 0],
              contentKey,
            )
          : null;
      if (definition !== '2024:feat:magic-initiate') {
        throw new TypeError(
          'Only Magic Initiate list configuration is editable here.',
        );
      }
      this.updateMagicInitiate(characterId, source, config);
    });
  }

  private updateMagicInitiate(
    characterId: number,
    source: ConfigurableSource,
    config: MutableConfig,
  ): void {
    const chosenList =
      'chosen_list' in this.payload
        ? this.payload.chosen_list.trim()
        : '';
    if (
      !MAGIC_INITIATE_LISTS.includes(
        chosenList as (typeof MAGIC_INITIATE_LISTS)[number],
      )
    ) {
      throw new TypeError(
        'Magic Initiate must use the Cleric, Druid, or Wizard spell list.',
      );
    }

    const ability = this.db.scalar<string>(
      'SELECT spellcasting_ability FROM class_definitions WHERE name = ?',
      [chosenList],
    );
    if (typeof ability !== 'string' || ability === '') {
      throw new TypeError(
        'Choose a spell list with a defined spellcasting ability.',
      );
    }

    this.#previousState = this.#state.capture(characterId);
    config.chosen_list = chosenList;
    config.spellcasting_ability = ability.toLowerCase();
    const timestamp = new Date().toISOString();
    const sourceId = source.id;
    this.db.exec(
      `UPDATE character_source_instances
       SET display_name = ?, config = ?, updated_at = ?
       WHERE id = ?`,
      [
        `Magic Initiate: ${chosenList}`,
        JSON.stringify(config),
        timestamp,
        sourceId,
      ],
    );

    if (source.parent_source_instance_id !== null) {
      const parentId = source.parent_source_instance_id;
      const parent = this.db.one(
        'SELECT config FROM character_source_instances WHERE id = ?',
        [parentId],
        configText,
      );
      let parentConfig: MutableConfig | null = null;
      if (parent !== null && parent !== undefined) {
        const decoded: unknown = JSON.parse(parent);
        parentConfig = isRecord(decoded) ? decoded : null;
      }
      if (
        parentConfig === null ||
        !isRecord(parentConfig.origin_feat_config)
      ) {
        throw new TypeError(
          'Magic Initiate parent configuration is missing origin_feat_config.',
        );
      }
      parentConfig.origin_feat_config = config;
      this.db.exec(
        `UPDATE character_source_instances
         SET config = ?, updated_at = ?
         WHERE id = ?`,
        [JSON.stringify(parentConfig), timestamp, parentId],
      );
      this.#generator.generateForSource(parentId);
      return;
    }

    this.#generator.generateForSource(sourceId);
  }

  private updateClassOrder(
    characterId: number,
    source: ConfigurableSource,
    config: MutableConfig,
  ): void {
    const className =
      this.db.scalar<string>(
        'SELECT name FROM class_definitions WHERE id = ?',
        [source.source_definition_id ?? 0],
      ) ?? '';
    if (className !== 'Cleric' && className !== 'Druid') {
      throw new TypeError(
        'Only Cleric or Druid class sources can configure an Order.',
      );
    }
    const definition = ORDER_DEFINITIONS[className];
    const chosenOption =
      'chosen_option' in this.payload
        ? this.payload.chosen_option.trim()
        : '';
    if (!(definition.options as readonly string[]).includes(chosenOption)) {
      throw new TypeError(
        `${className} ${definition.key} has an invalid chosen option.`,
      );
    }

    this.#previousState = this.#state.capture(characterId);
    const value: MutableConfig = { chosen_option: chosenOption };
    if (chosenOption === definition.bonus) {
      value.chosen_list = className;
    }
    config[definition.key] = value;
    this.db.exec(
      `UPDATE character_source_instances
       SET config = ?, updated_at = ?
       WHERE id = ?`,
      [JSON.stringify(config), new Date().toISOString(), source.id],
    );
    this.#generator.generateForSource(source.id);
  }

  async inverse(): Promise<StoredCharacterSnapshotInverse> {
    if (
      this.#characterId === undefined ||
      this.#previousState === undefined
    ) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return {
      type: 'internal_snapshot_restore',
      snapshot: this.#previousState,
    };
  }
}
