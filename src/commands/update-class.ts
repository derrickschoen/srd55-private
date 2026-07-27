import {
  CharacterState,
  type CharacterStateSnapshot,
} from '../character/character-state';
import {
  rowId,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type RowCodec,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type {
  RestoreSnapshotCommand as RestoreSnapshotPayload,
  UpdateClassCommand as UpdateClassPayload,
} from '../domain/command-contracts';
import { GrantRuleSlotGenerator } from '../grants/grant-rule-slot-generator';
import type { CharacterCommandIntegrity } from './integrity';

/**
 * Both rows below were declared with `unknown` fields: honest about the column
 * NAMES and silent about the values, so every reader re-coerced with
 * `String(…)` / `Number(…)` at the point of use. The codecs say it once.
 *
 * `spellcasting_ability` and `config` stay NULLABLE, because they genuinely are:
 * a Fighter has no spellcasting ability, and a source instance can be stored
 * before it has any config. `configWithAbility` is written to accept both.
 */
interface DefinitionRow {
  readonly id: number;
  readonly name: string;
  readonly spellcasting_ability: string | null;
}

const definitionRow: RowCodec<DefinitionRow> = (row) => ({
  id: sqlInteger(row, 'id'),
  name: sqlString(row, 'name'),
  spellcasting_ability: sqlNullableString(row, 'spellcasting_ability'),
});

interface SourceRow {
  readonly id: number;
  readonly source_definition_id: number | null;
  readonly config: string | null;
}

const sourceRow: RowCodec<SourceRow> = (row) => ({
  id: sqlInteger(row, 'id'),
  source_definition_id: sqlNullableInteger(row, 'source_definition_id'),
  config: sqlNullableString(row, 'config'),
});

function configWithAbility(
  configJson: unknown,
  ability: unknown,
): string {
  const decoded: unknown =
    configJson === null || configJson === undefined
      ? {}
      : JSON.parse(String(configJson));
  if (decoded === null || typeof decoded !== 'object') {
    throw new TypeError('Source configuration must be an object.');
  }
  return JSON.stringify({
    ...decoded,
    spellcasting_ability: ability ?? null,
  });
}

export class UpdateClassCommand {
  readonly actionType = 'update_class';

  readonly #state: CharacterState;
  readonly #generator: GrantRuleSlotGenerator;
  #characterId: number | null = null;
  #before: CharacterStateSnapshot | null = null;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: UpdateClassPayload,
    private readonly integrity: CharacterCommandIntegrity,
    state?: CharacterState,
    generator?: GrantRuleSlotGenerator,
  ) {
    this.#state = state ?? new CharacterState(db);
    this.#generator = generator ?? new GrantRuleSlotGenerator(db);
  }

  apply(characterId: number): void {
    this.db.transaction(() => {
      const before = this.#state.capture(characterId);
      const classId = this.payload.class_definition_id;
      const definition = this.db.one(
        'SELECT id, name, spellcasting_ability FROM class_definitions WHERE id = ?',
        [classId],
        definitionRow,
      );
      if (definition === null) {
        throw new TypeError('Unknown class.');
      }

      if (this.payload.level === null) {
        this.remove(characterId, classId);
        this.#before = before;
        this.#characterId = characterId;
        return;
      }

      const level = this.payload.level;
      if (level < 1 || level > 20) {
        throw new TypeError('Class level must be between 1 and 20.');
      }
      const otherLevels = Number(
        this.db.scalar(
          `SELECT COALESCE(SUM(level), 0)
           FROM character_class_levels
           WHERE character_id = ? AND class_definition_id != ?`,
          [characterId, classId],
        ) ?? 0,
      );
      if (otherLevels + level > 20) {
        throw new TypeError('A character cannot exceed level 20.');
      }

      const subclassId = this.payload.subclass_definition_id ?? null;
      if (
        subclassId !== null &&
        Number(
          this.db.scalar(
            `SELECT EXISTS (
               SELECT 1 FROM subclass_definitions
               WHERE id = ? AND class_definition_id = ?
             )`,
            [subclassId, classId],
          ) ?? 0,
        ) !== 1
      ) {
        throw new TypeError(
          'That subclass does not belong to the selected class.',
        );
      }

      const timestamp = new Date().toISOString();
      const existingLevelId = this.db.scalar<number>(
        `SELECT id FROM character_class_levels
         WHERE character_id = ? AND class_definition_id = ?`,
        [characterId, classId],
      );
      if (existingLevelId === null) {
        const firstClass =
          Number(
            this.db.scalar(
              `SELECT EXISTS (
                 SELECT 1 FROM character_class_levels
                 WHERE character_id = ?
               )`,
              [characterId],
            ) ?? 0,
          ) === 0;
        this.db.exec(
          `INSERT INTO character_class_levels (
             character_id, class_definition_id, subclass_definition_id,
             level, is_starting_class, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            characterId,
            classId,
            subclassId,
            level,
            firstClass ? 1 : 0,
            timestamp,
            timestamp,
          ],
        );
      } else {
        this.db.exec(
          `UPDATE character_class_levels
           SET subclass_definition_id = ?, level = ?, updated_at = ?
           WHERE id = ?`,
          [subclassId, level, timestamp, existingLevelId],
        );
      }

      const source = this.db.one(
        `SELECT id, source_definition_id, config
         FROM character_source_instances
         WHERE character_id = ? AND source_type = 'class'
           AND source_definition_id = ?
         LIMIT 1`,
        [characterId, classId],
        sourceRow,
      );
      const config = configWithAbility(
        source?.config,
        definition.spellcasting_ability,
      );
      let sourceId: number;
      if (source === null) {
        sourceId = this.db.exec(
          `INSERT INTO character_source_instances (
             character_id, instance_uuid, source_type,
             source_definition_id, display_name, config,
             acquired_at_character_level, state, created_at, updated_at
           ) VALUES (?, ?, 'class', ?, ?, ?, ?, 'active', ?, ?)`,
          [
            characterId,
            crypto.randomUUID(),
            classId,
            `${definition.name} ${level}`,
            config,
            Math.max(1, otherLevels + 1),
            timestamp,
            timestamp,
          ],
        ).lastInsertId;
      } else {
        sourceId = source.id;
        this.db.exec(
          `UPDATE character_source_instances
           SET display_name = ?, config = ?, state = 'active',
               updated_at = ?
           WHERE id = ?`,
          [
            `${definition.name} ${level}`,
            config,
            timestamp,
            sourceId,
          ],
        );
      }

      this.#generator.generateForSource(sourceId);
      this.syncSubclass(
        characterId,
        classId,
        subclassId,
        level,
      );
      this.#before = before;
      this.#characterId = characterId;
    });
  }

  async inverse(): Promise<RestoreSnapshotPayload> {
    if (this.#characterId === null || this.#before === null) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return this.integrity.attach(this.#characterId, {
      type: 'restore_snapshot',
      snapshot: this.#before,
    }) as unknown as Promise<RestoreSnapshotPayload>;
  }

  private syncSubclass(
    characterId: number,
    classId: number,
    subclassId: number | null,
    level: number,
  ): void {
    const sources = this.db.all(
      `SELECT source.id AS id,
              source.source_definition_id AS source_definition_id,
              source.config AS config
       FROM character_source_instances AS source
       INNER JOIN subclass_definitions AS subclass
         ON subclass.id = source.source_definition_id
       WHERE source.character_id = ?
         AND source.source_type = 'subclass'
         AND subclass.class_definition_id = ?`,
      [characterId, classId],
      sourceRow,
    );
    const timestamp = new Date().toISOString();
    for (const source of sources) {
      if (
        subclassId !== null &&
        source.source_definition_id === subclassId
      ) {
        continue;
      }
      const sourceId = source.id;
      this.db.exec(
        `UPDATE character_source_instances
         SET state = 'tombstoned', updated_at = ?
         WHERE id = ?`,
        [timestamp, sourceId],
      );
      this.#generator.generateForSource(sourceId);
    }
    if (subclassId === null) {
      return;
    }

    const definition = this.db.one(
      'SELECT id, name, spellcasting_ability FROM subclass_definitions WHERE id = ?',
      [subclassId],
      definitionRow,
    );
    if (definition === null) {
      throw new TypeError(
        'That subclass does not belong to the selected class.',
      );
    }
    const source =
      sources.find(
        (candidate) =>
          candidate.source_definition_id === subclassId,
      ) ?? null;
    const config = configWithAbility(
      source?.config,
      definition.spellcasting_ability,
    );
    let sourceId: number;
    if (source === null) {
      sourceId = this.db.exec(
        `INSERT INTO character_source_instances (
           character_id, instance_uuid, source_type,
           source_definition_id, display_name, config,
           acquired_at_character_level, state, created_at, updated_at
         ) VALUES (?, ?, 'subclass', ?, ?, ?, ?, 'active', ?, ?)`,
        [
          characterId,
          crypto.randomUUID(),
          subclassId,
          definition.name,
          config,
          level,
          timestamp,
          timestamp,
        ],
      ).lastInsertId;
    } else {
      sourceId = source.id;
      this.db.exec(
        `UPDATE character_source_instances
         SET display_name = ?, config = ?, state = 'active',
             updated_at = ?
         WHERE id = ?`,
        [
          definition.name,
          config,
          timestamp,
          sourceId,
        ],
      );
    }
    this.#generator.generateForSource(sourceId);
  }

  private remove(characterId: number, classId: number): void {
    const sourceIds = this.db.all(
      `SELECT id
       FROM character_source_instances
       WHERE character_id = ?
         AND (
           (source_type = 'class' AND source_definition_id = ?)
           OR (
             source_type = 'subclass'
             AND source_definition_id IN (
               SELECT id FROM subclass_definitions
               WHERE class_definition_id = ?
             )
           )
         )`,
      [characterId, classId, classId],
      rowId,
    );
    const timestamp = new Date().toISOString();
    for (const sourceId of sourceIds) {
      this.db.exec(
        `UPDATE character_source_instances
         SET state = 'tombstoned', updated_at = ?
         WHERE id = ?`,
        [timestamp, sourceId],
      );
      this.#generator.generateForSource(sourceId);
    }
    this.db.exec(
      `DELETE FROM character_class_levels
       WHERE character_id = ? AND class_definition_id = ?`,
      [characterId, classId],
    );
  }
}
