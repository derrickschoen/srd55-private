import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import { characterLevel } from '../../../src/rules/character-level';
import { openTestDatabase } from '../../helpers/open-db';

describe('shared character level', () => {
  let connection: Database;
  let db: DatabaseContext;
  let characterId: number;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    characterId = db.exec(
      `INSERT INTO characters (name) VALUES ('Level Rule')`,
    ).lastInsertId;
  });

  afterEach(() => {
    connection.close();
  });

  function addClass(name: string, level: number): number {
    const classId = db.exec(
      `INSERT INTO class_definitions (
         content_key, name, rules_edition, progression_type
       ) VALUES (?, ?, '2024', 'none')`,
      [`test:class:${name.toLowerCase()}`, name],
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_class_levels (
         character_id, class_definition_id, level
       ) VALUES (?, ?, ?)`,
      [characterId, classId, level],
    );
    return classId;
  }

  it('returns null for no rows and the exact multiclass sum otherwise', () => {
    expect(characterLevel(db, characterId)).toBeNull();
    expect(characterLevel([])).toBeNull();

    addClass('Fighter', 3);
    const wizardId = addClass('Wizard', 2);

    expect(characterLevel(db, characterId)).toBe(5);
    expect(characterLevel([3, 2])).toBe(5);
    expect(
      characterLevel(db, characterId, {
        excludingClassDefinitionId: wizardId,
      }),
    ).toBe(3);
  });
});
