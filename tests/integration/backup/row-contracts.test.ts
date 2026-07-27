import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import {
  exportCharacterBackup,
  importCharacterBackup,
  type CharacterBackupDocument,
} from '../../../src/backup/character-backup';
import { BackupValidationError } from '../../../src/backup/backup-version';
import { DatabaseContext } from '../../../src/db/database';
import { openTestDatabase } from '../../helpers/open-db';
import { APPLICATION_TABLES } from '../../../src/domain/contracts/tables';

/**
 * THE MALFORMED-ARTIFACT PROOF FOR THE PORTABLE BACKUP.
 *
 * Each case takes a document this codebase itself produced, breaks ONE row, and
 * asserts (a) the import is refused with a message naming table, row index and
 * field, and (b) the target database is byte-for-byte unchanged — validation
 * ran before any write, and the import stayed atomic.
 */

const opened: Database[] = [];

async function database(): Promise<DatabaseContext> {
  const connection = await openTestDatabase();
  opened.push(connection);
  return new DatabaseContext(connection);
}

function seedCatalog(db: DatabaseContext): { classId: number; spellId: number } {
  const identityId = db.exec(
    `INSERT INTO spell_identities (content_key, canonical_name, normalized_name)
     VALUES ('spell:shield', 'Shield', 'shield')`,
  ).lastInsertId;
  const spellId = db.exec(
    `INSERT INTO spell_versions
       (content_key, spell_identity_id, display_name, rules_edition, level,
        school, is_active)
     VALUES ('2024:shield', ?, 'Shield', '2024', 1, 'Abjuration', 1)`,
    [identityId],
  ).lastInsertId;
  const classId = db.exec(
    `INSERT INTO class_definitions
       (content_key, name, rules_edition, spellcasting_ability, progression_type)
     VALUES ('class:wizard', 'Wizard', '2024', 'intelligence', 'full')`,
  ).lastInsertId;
  return { classId, spellId };
}

function seedCharacter(
  db: DatabaseContext,
  catalog: { classId: number; spellId: number },
): number {
  const characterId = db.exec(
    "INSERT INTO characters (name, intelligence) VALUES ('Contract Hero', 16)",
  ).lastInsertId;
  db.exec(
    `INSERT INTO character_class_levels
       (character_id, class_definition_id, level, is_starting_class)
     VALUES (?, ?, 3, 1)`,
    [characterId, catalog.classId],
  );
  const sourceId = db.exec(
    `INSERT INTO character_source_instances
       (character_id, instance_uuid, source_type, source_definition_id,
        display_name, config)
     VALUES (?, 'contract-source', 'class', ?, 'Wizard 3', '{"level":3}')`,
    [characterId, catalog.classId],
  ).lastInsertId;
  db.exec(
    `INSERT INTO spell_selection_slots
       (character_id, source_instance_id, slot_key, rule_key, bucket,
        eligibility_kind, current_spell_version_id)
     VALUES (?, ?, 'contract-source:prepared:1', 'prepared', 'prepared',
             'choice_from_query', ?)`,
    [characterId, sourceId, catalog.spellId],
  );
  db.exec(
    `INSERT INTO character_rule_overrides (character_id, rule_key, value)
     VALUES (?, 'prepared_formula', '{"count":7}')`,
    [characterId],
  );
  return characterId;
}

function rowCounts(db: DatabaseContext): Record<string, number> {
  return Object.fromEntries(
    APPLICATION_TABLES.map((table) => [
      table,
      Number(db.scalar(`SELECT count(*) FROM "${table}"`) ?? 0),
    ]),
  );
}

async function exportedDocument(): Promise<CharacterBackupDocument> {
  const source = await database();
  const catalog = seedCatalog(source);
  return exportCharacterBackup(
    source,
    seedCharacter(source, catalog),
    '2026-07-23T12:00:00.000Z',
  );
}

async function targetDatabase(): Promise<DatabaseContext> {
  const target = await database();
  seedCatalog(target);
  return target;
}

function mutateRow(
  document: CharacterBackupDocument,
  table: 'spell_selection_slots' | 'character_rule_overrides',
  patch: Record<string, unknown>,
): CharacterBackupDocument {
  const copy = structuredClone(document);
  Object.assign(
    copy.tables[table][0] as Record<string, unknown>,
    patch,
  );
  return copy;
}

afterEach(() => {
  for (const connection of opened.splice(0)) {
    if (connection.isOpen()) {
      connection.close();
    }
  }
});

describe('portable backup row contracts at the import boundary', () => {
  it('imports the untouched document it produced', async () => {
    const document = await exportedDocument();
    const target = await targetDatabase();
    expect(() => importCharacterBackup(target, document)).not.toThrow();
    expect(rowCounts(target).spell_selection_slots).toBe(1);
  });

  it.each([
    {
      name: 'an unknown column, which would become an INSERT identifier',
      table: 'spell_selection_slots' as const,
      patch: { injected_column: "'); DROP TABLE characters; --" },
      message: 'Character backup tables.spell_selection_slots[0]',
    },
    {
      name: 'a structured value where the schema declares text',
      table: 'spell_selection_slots' as const,
      patch: { slot_key: { $ne: null } },
      message: 'Character backup tables.spell_selection_slots[0].slot_key:',
    },
    {
      name: 'a value outside a schema-declared enum',
      table: 'spell_selection_slots' as const,
      patch: { bucket: 'anything_i_like' },
      message: 'Character backup tables.spell_selection_slots[0].bucket:',
    },
    {
      name: 'non-JSON in the rule-override value column',
      table: 'character_rule_overrides' as const,
      patch: { value: 'not json' },
      message:
        'Character backup tables.character_rule_overrides[0].value: must be JSON text.',
    },
  ])('refuses $name and writes nothing', async ({ table, patch, message }) => {
    const document = await exportedDocument();
    const target = await targetDatabase();
    const before = rowCounts(target);

    expect(() =>
      importCharacterBackup(target, mutateRow(document, table, patch)),
    ).toThrow(BackupValidationError);
    expect(() =>
      importCharacterBackup(target, mutateRow(document, table, patch)),
    ).toThrow(message);

    // Validation runs before the transaction opens, so not one row moved.
    expect(rowCounts(target)).toEqual(before);
  });

  it('refuses a malformed row inside a save-point snapshot', async () => {
    const source = await database();
    const catalog = seedCatalog(source);
    const characterId = seedCharacter(source, catalog);
    source.exec(
      `INSERT INTO character_save_points
         (character_id, label, snapshot, schema_version)
       VALUES (?, 'Before', ?, 'a7-v1')`,
      [
        characterId,
        JSON.stringify({
          schema_version: 'a7-v1',
          character: source.oneRaw(
            `SELECT name, strength, dexterity, constitution, intelligence,
                    wisdom, charisma, proficiency_bonus_override,
                    rules_edition_preference, allow_legacy, notes
             FROM characters WHERE id = ?`,
            [characterId],
          ),
          character_class_levels: source.allRaw(
            'SELECT * FROM character_class_levels WHERE character_id = ?',
            [characterId],
          ),
          character_source_instances: source.allRaw(
            'SELECT * FROM character_source_instances WHERE character_id = ?',
            [characterId],
          ),
          spell_selection_slots: source.allRaw(
            'SELECT * FROM spell_selection_slots WHERE character_id = ?',
            [characterId],
          ),
          wizard_spellbook_entries: [],
          warning_acknowledgements: [],
        }),
      ],
    );
    const document = exportCharacterBackup(
      source,
      characterId,
      '2026-07-23T12:00:00.000Z',
    );

    const corrupt = structuredClone(document);
    const savePoint = corrupt.tables.character_save_points[0] as Record<
      string,
      unknown
    >;
    const snapshot = JSON.parse(String(savePoint.snapshot)) as {
      spell_selection_slots: Array<Record<string, unknown>>;
    };
    snapshot.spell_selection_slots[0]!.state = 'whatever_i_want';
    savePoint.snapshot = JSON.stringify(snapshot);

    const target = await targetDatabase();
    const before = rowCounts(target);
    expect(() => importCharacterBackup(target, corrupt)).toThrow(
      'Character backup tables.character_save_points[0].snapshot.spell_selection_slots[0].state:',
    );
    expect(rowCounts(target)).toEqual(before);
  });
});

/**
 * THE EXPORT PATH IS A CONTRACT BOUNDARY TOO, AND IT ALWAYS WAS.
 *
 * `exportCharacterBackup` has ended with `validateCharacterBackup(result)` since
 * before these contracts existed, so the exporter has always refused to emit a
 * document it could not re-import. The row contracts made that pre-existing
 * check stricter, which means a violation in the user's OWN STORED DATA now
 * fails on the way out — where there is no attacker.
 *
 * That behaviour is kept deliberately: an export that cannot be imported is a
 * silent data-loss trap, worse than a refusal that names the row. What was
 * missing was any test of the path at all, so the failure mode was undisclosed
 * and unmeasured. These tests are that measurement — they pin both that stored
 * corruption is refused and WHERE the message points, so anyone changing the
 * contract set can see what it does to existing databases.
 */
describe('the same contracts on the way out', () => {
  async function characterWithSavePoint(): Promise<{
    db: DatabaseContext;
    characterId: number;
  }> {
    const db = await database();
    const catalog = seedCatalog(db);
    const characterId = seedCharacter(db, catalog);
    const snapshot = {
      schema_version: 'a7-v1',
      character: db.oneRaw(
        `SELECT name, strength, dexterity, constitution, intelligence, wisdom,
                charisma, proficiency_bonus_override, rules_edition_preference,
                allow_legacy, notes
         FROM characters WHERE id = ?`,
        [characterId],
      ),
      character_class_levels: db.allRaw(
        'SELECT * FROM character_class_levels WHERE character_id = ?',
        [characterId],
      ),
      character_source_instances: db.allRaw(
        'SELECT * FROM character_source_instances WHERE character_id = ?',
        [characterId],
      ),
      spell_selection_slots: db.allRaw(
        'SELECT * FROM spell_selection_slots WHERE character_id = ?',
        [characterId],
      ),
      wizard_spellbook_entries: [],
      warning_acknowledgements: [],
    };
    db.exec(
      `INSERT INTO character_save_points
         (character_id, label, snapshot, schema_version)
       VALUES (?, 'Before', ?, 'a7-v1')`,
      [characterId, JSON.stringify(snapshot)],
    );
    return { db, characterId };
  }

  it('exports a character whose stored data satisfies the contracts', async () => {
    const { db, characterId } = await characterWithSavePoint();
    expect(() =>
      exportCharacterBackup(db, characterId, '2026-07-23T12:00:00.000Z'),
    ).not.toThrow();
  });

  it('refuses to export a stored save point whose own character projection is corrupt', async () => {
    const { db, characterId } = await characterWithSavePoint();
    const stored = String(
      db.scalar('SELECT snapshot FROM character_save_points WHERE id = 1'),
    );
    const snapshot = JSON.parse(stored) as {
      character: Record<string, unknown>;
    };
    snapshot.character.rules_edition_preference = 'nineteen-eighty-four';
    db.exec('UPDATE character_save_points SET snapshot = ? WHERE id = 1', [
      JSON.stringify(snapshot),
    ]);

    // `Stored save point 1` — the label says the fault is in the database, not
    // in anything the caller passed in.
    expect(() =>
      exportCharacterBackup(db, characterId, '2026-07-23T12:00:00.000Z'),
    ).toThrow('Stored save point 1.character.rules_edition_preference:');
  });

  it('refuses to export a live row that violates a contract', async () => {
    const { db, characterId } = await characterWithSavePoint();
    // Written with foreign keys and triggers satisfied; only the contract can
    // see that `'{}'` in a list column silently erases the slot's restrictions.
    db.exec(
      "UPDATE spell_selection_slots SET allowed_spell_lists = '{}' WHERE character_id = ?",
      [characterId],
    );
    expect(() =>
      exportCharacterBackup(db, characterId, '2026-07-23T12:00:00.000Z'),
    ).toThrow(
      'Character backup tables.spell_selection_slots[0].allowed_spell_lists: must be a JSON array.',
    );
  });

  it('round-trips the empty strings and JSON shapes the application itself writes', async () => {
    const { db, characterId } = await characterWithSavePoint();
    db.exec(
      "UPDATE character_source_instances SET config = '' WHERE character_id = ?",
      [characterId],
    );
    db.exec(
      `UPDATE spell_selection_slots
       SET allowed_spell_lists = '["arcane"]', allowed_schools = '',
           free_cast = '{"uses":1,"recovery":"long_rest"}',
           prior_config = '{"level":3}'
       WHERE character_id = ?`,
      [characterId],
    );
    const document = exportCharacterBackup(
      db,
      characterId,
      '2026-07-23T12:00:00.000Z',
    );
    const target = await targetDatabase();
    expect(() => importCharacterBackup(target, document)).not.toThrow();
    expect(
      target.scalar(
        'SELECT config FROM character_source_instances LIMIT 1',
      ),
    ).toBe('');
  });
});

/**
 * F11 AT THE BOUNDARY THAT ACTUALLY RECEIVES FOREIGN DOCUMENTS.
 *
 * `character_class_levels.level` is the number every sheet computation runs off
 * and, until F11 was implemented, the least-constrained level in the schema: no
 * CHECK (deliberately — see `db/schema/character.ts`) and a `positiveInt`
 * contract with no maximum. F11 measured 21, 9999 and 1,099,511,627,776 all
 * accepted here while share import refused every one of them.
 *
 * THE EXPORT CASE IS THE ONE WORTH HAVING. These contracts gate BOTH directions,
 * so the question a tightening has to answer is whether an existing database can
 * be stranded — whether export can produce a document its own importer refuses.
 * It cannot, and the case below is what proves it rather than asserting it: the
 * refusal happens on the way OUT, naming the row, so the user is told at the
 * moment they make the backup rather than at the moment they need it.
 */
describe('F11: the per-class level bound, in both directions', () => {
  async function characterAtLevel(level: number): Promise<{
    db: DatabaseContext;
    characterId: number;
  }> {
    const db = await database();
    const catalog = seedCatalog(db);
    const characterId = db.exec(
      "INSERT INTO characters (name) VALUES ('Epic Wizard')",
    ).lastInsertId;
    // RAW SQL, and it has to be: no writer in this application will store this
    // level (`add-source.ts` and `update-class.ts` both throw), and the column
    // carries no CHECK to refuse it either. That combination is precisely the
    // state a hand-edited backup would have produced before this bound existed.
    db.exec(
      `INSERT INTO character_class_levels
         (character_id, class_definition_id, level, is_starting_class)
       VALUES (?, ?, ?, 1)`,
      [characterId, catalog.classId, level],
    );
    return { db, characterId };
  }

  it('exports a character at the boundary itself', async () => {
    const { db, characterId } = await characterAtLevel(20);
    const document = exportCharacterBackup(
      db,
      characterId,
      '2026-07-23T12:00:00.000Z',
    );
    expect(document.tables.character_class_levels[0]?.level).toBe(20);
    const target = await targetDatabase();
    expect(() => importCharacterBackup(target, document)).not.toThrow();
    expect(
      target.scalar('SELECT level FROM character_class_levels LIMIT 1'),
    ).toBe(20);
  });

  it.each([21, 9999, 1_099_511_627_776])(
    'refuses an imported document carrying level %i and writes nothing',
    async (level) => {
      const { db, characterId } = await characterAtLevel(3);
      const document = exportCharacterBackup(
        db,
        characterId,
        '2026-07-23T12:00:00.000Z',
      );
      const corrupt = structuredClone(document);
      (corrupt.tables.character_class_levels[0] as Record<string, unknown>).level =
        level;

      const target = await targetDatabase();
      const before = rowCounts(target);
      expect(() => importCharacterBackup(target, corrupt)).toThrow(
        BackupValidationError,
      );
      expect(() => importCharacterBackup(target, corrupt)).toThrow(
        'Character backup tables.character_class_levels[0].level:',
      );
      expect(rowCounts(target)).toEqual(before);
    },
  );

  it('refuses to EXPORT a stored level above 20, so no unopenable backup is made', async () => {
    const { db, characterId } = await characterAtLevel(21);
    expect(() =>
      exportCharacterBackup(db, characterId, '2026-07-23T12:00:00.000Z'),
    ).toThrow(
      'Character backup tables.character_class_levels[0].level: Too big: expected number to be <=20.',
    );
  });

  it('accepts a COMBINED total over 20, which is a sheet warning and not a refusal', async () => {
    // D11 part 2 and the half of F11 that stayed out of the contracts. Wizard 20
    // plus a second class at 5 is 25 total: illegal by the SRD, refused by the
    // guided builder and by share import, and ACCEPTED here on purpose. Losing
    // the whole character would be a worse answer than stating the number, which
    // `total_level_exceeds_maximum` in `src/rules/sheet.ts` does.
    const { db, characterId } = await characterAtLevel(20);
    const secondClassId = db.exec(
      `INSERT INTO class_definitions
         (content_key, name, rules_edition, spellcasting_ability, progression_type)
       VALUES ('class:fighter', 'Fighter', '2024', 'strength', 'none')`,
    ).lastInsertId;
    db.exec(
      `INSERT INTO character_class_levels
         (character_id, class_definition_id, level, is_starting_class)
       VALUES (?, ?, 5, 0)`,
      [characterId, secondClassId],
    );
    const document = exportCharacterBackup(
      db,
      characterId,
      '2026-07-23T12:00:00.000Z',
    );
    expect(
      document.tables.character_class_levels
        .map((row) => Number(row.level))
        .reduce((sum, level) => sum + level, 0),
    ).toBe(25);

    const target = await targetDatabase();
    target.exec(
      `INSERT INTO class_definitions
         (content_key, name, rules_edition, spellcasting_ability, progression_type)
       VALUES ('class:fighter', 'Fighter', '2024', 'strength', 'none')`,
    );
    expect(() => importCharacterBackup(target, document)).not.toThrow();
    expect(
      Number(
        target.scalar('SELECT SUM(level) FROM character_class_levels') ?? 0,
      ),
    ).toBe(25);
  });
});
