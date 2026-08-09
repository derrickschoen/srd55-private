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
import { characterLevel } from '../rules/character-level';
import {
  reconcileCharacterLevelDependentSources,
} from '../grants/character-level-source-reconciliation';
import {
  clearGeneratedFeatureEffects,
  syncAutomaticClassEffects,
  syncAutomaticSubclassEffects,
} from '../rules/generated-feature-effects';
import type {
  UpdateClassCommand as UpdateClassPayload,
} from '../domain/command-contracts';
import { GrantRuleSlotGenerator } from '../grants/grant-rule-slot-generator';
import type { CharacterCommandIntegrity } from './integrity';
import type { StoredCharacterSnapshotInverse } from './stored-inverses';

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

/**
 * The class-side source state, brought back in step with the stored level:
 * the class source instance is created or reactivated with its display name
 * and spellcasting config, its grants are regenerated at the stored level,
 * and the subclass sources are reconciled. Shared by `UpdateClassCommand`
 * (entry / subclass change) and `LevelUpClassCommand` (the one levelling
 * path) so the two cannot drift — extracting it is what keeps the level-up
 * command from becoming a second, slightly different copy of this logic.
 */
export function syncClassSourceState(
  db: DatabaseContext,
  generator: GrantRuleSlotGenerator,
  characterId: number,
  definition: { id: number; name: string; spellcasting_ability: string | null },
  subclassId: number | null,
  level: number,
  acquiredAtCharacterLevel: number,
): void {
  const classId = definition.id;
  const timestamp = new Date().toISOString();
  const source = db.one(
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
    sourceId = db.exec(
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
        acquiredAtCharacterLevel,
        timestamp,
        timestamp,
      ],
    ).lastInsertId;
  } else {
    sourceId = source.id;
    db.exec(
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

  generator.generateForSource(sourceId);
  syncAutomaticClassEffects(
    db,
    characterId,
    sourceId,
    classId,
    level,
  );
  syncSubclassSources(db, generator, characterId, classId, subclassId, level);
}

/**
 * Reconcile the subclass source instances of one class: tombstone every
 * subclass source that is not the chosen one, and create or reactivate the
 * chosen one's, regenerating grants either way.
 */
export function syncSubclassSources(
  db: DatabaseContext,
  generator: GrantRuleSlotGenerator,
  characterId: number,
  classId: number,
  subclassId: number | null,
  level: number,
): void {
  const sources = db.all(
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
    db.exec(
      `UPDATE character_source_instances
       SET state = 'tombstoned', updated_at = ?
       WHERE id = ?`,
      [timestamp, sourceId],
    );
    clearGeneratedFeatureEffects(db, characterId, sourceId);
    generator.generateForSource(sourceId);
  }
  if (subclassId === null) {
    return;
  }

  const definition = db.one(
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
    sourceId = db.exec(
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
    db.exec(
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
  generator.generateForSource(sourceId);
  syncAutomaticSubclassEffects(
    db,
    characterId,
    sourceId,
    subclassId,
    level,
  );
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
    _integrity: CharacterCommandIntegrity,
    state?: CharacterState,
    generator?: GrantRuleSlotGenerator,
  ) {
    this.#state = state ?? new CharacterState(db);
    this.#generator = generator ?? new GrantRuleSlotGenerator(db);
  }

  /**
   * ENTRY, SUBCLASS, REMOVAL — NEVER THE LEVEL (level-up plan §3).
   *
   * The payload no longer carries `level`. A class the character does not
   * have is created at level 1; a class they do have keeps its STORED level
   * untouched while the subclass is set or cleared. Any other caller that
   * wants to move a level goes through `level_up_class`, where the four
   * guards (L-STRAIGHT, L-SUBCLASS, L-ASI-LEVELS, L-ADJACENT) actually fire —
   * leaving level-moving power here would re-open §1's bug with no control
   * on the path.
   */
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

      if (this.payload.remove === true) {
        this.remove(characterId, classId);
        this.#before = before;
        this.#characterId = characterId;
        return;
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
      const existing = this.db.one(
        `SELECT id, level FROM character_class_levels
         WHERE character_id = ? AND class_definition_id = ?`,
        [characterId, classId],
        (row) => ({
          id: sqlInteger(row, 'id'),
          level: sqlInteger(row, 'level'),
        }),
      );
      const otherLevels = characterLevel(this.db, characterId, {
        excludingClassDefinitionId: classId,
      });
      let level: number;
      if (existing === null) {
        level = 1;
        if (otherLevels !== null && otherLevels + level > 20) {
          throw new TypeError('A character cannot exceed level 20.');
        }
        const firstClass = otherLevels === null;
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
        level = existing.level;
        this.db.exec(
          `UPDATE character_class_levels
           SET subclass_definition_id = ?, updated_at = ?
           WHERE id = ?`,
          [subclassId, timestamp, existing.id],
        );
      }

      syncClassSourceState(
        this.db,
        this.#generator,
        characterId,
        definition,
        subclassId,
        level,
        // A first class is acquired at character level 1; later classes
        // are acquired at the next level after the other-class total.
        otherLevels === null ? 1 : otherLevels + 1,
      );
      reconcileCharacterLevelDependentSources(
        this.db,
        characterId,
        this.#generator,
      );
      this.#before = before;
      this.#characterId = characterId;
    });
  }

  async inverse(): Promise<StoredCharacterSnapshotInverse> {
    if (this.#characterId === null || this.#before === null) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return {
      type: 'internal_snapshot_restore',
      snapshot: this.#before,
    };
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
    reconcileCharacterLevelDependentSources(
      this.db,
      characterId,
      this.#generator,
    );
  }
}
