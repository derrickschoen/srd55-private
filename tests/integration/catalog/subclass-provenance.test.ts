import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import {
  exportCharacterBackup,
  importCharacterBackup,
} from '../../../src/backup/character-backup';
import { CatalogImporter } from '../../../src/catalog/catalog-importer';
import { importedContentKeyOwner } from '../../../src/catalog/catalog-key';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { UpdateClassCommand } from '../../../src/commands/update-class';
import { DatabaseContext } from '../../../src/db/database';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import {
  assessImportCompatibility,
  exportCharacterShare,
  importCharacterShare,
} from '../../../src/sharing/character-share';
import { openTestDatabase } from '../../helpers/open-db';

const SUBCLASS = readFileSync(
  fileURLToPath(
    new URL(
      '../../fixtures/homebrew-catalog/college-of-the-long-road.subclass.tier1.json',
      import.meta.url,
    ),
  ),
  'utf8',
);
const SUBCLASS_KEY = '2024:longroad.homebrew:college-of-the-long-road';

const connections: Database[] = [];
afterEach(() => {
  for (const connection of connections.splice(0)) {
    connection.close();
  }
});

/** A database with the bundled class catalog and nothing else. */
async function database(): Promise<DatabaseContext> {
  const connection = await openTestDatabase();
  connections.push(connection);
  const db = new DatabaseContext(connection);
  seedClassProgressions(db);
  return db;
}

function importSubclass(db: DatabaseContext): number {
  new CatalogImporter(db).import({ documents: [SUBCLASS] });
  return Number(
    db.scalar('SELECT id FROM subclass_definitions WHERE content_key = ?', [
      SUBCLASS_KEY,
    ]),
  );
}

/** A Bard 6 who has taken the imported subclass, built through the command. */
function walker(db: DatabaseContext, subclassId: number): number {
  const characterId = db.exec(
    "INSERT INTO characters (name) VALUES ('Walker')",
  ).lastInsertId;
  new UpdateClassCommand(
    db,
    {
      type: 'update_class',
      class_definition_id: Number(
        db.scalar('SELECT id FROM class_definitions WHERE content_key = ?', [
          '2024:class:bard',
        ]),
      ),
      level: 6,
      subclass_definition_id: subclassId,
    },
    new CharacterCommandIntegrity('subclass-provenance-test-key'),
  ).apply(characterId);
  return characterId;
}

/**
 * AN IMPORTED SUBCLASS STAYS TELLABLE FROM A BUNDLED ONE — IN THE DATABASE, IN
 * A BACKUP, AND IN A SHARE LINK.
 *
 * `spell_versions` settles this with a `provenance` column. `subclass_definitions`
 * HAS NO SUCH COLUMN, and adding one would not have helped in two of the three
 * places anyway: `src/domain/contracts/tables.ts` marks the table
 * `backupReference: true`, which means a backup carries it AS A CONTENT KEY and
 * carries no other field of it, and `src/sharing/character-share.ts` carries
 * exactly one `subclassKey` per class. So the CONTENT KEY is the only field that
 * crosses all three boundaries, and the grammar in
 * `src/catalog/catalog-key.ts` is what makes it say where the row came from.
 *
 * This file follows one imported subclass across all three, rather than
 * asserting the grammar in isolation — a rule about keys is only worth
 * something if the keys are what actually travel.
 */
describe('an imported subclass stays distinguishable from a bundled one', () => {
  it('is distinguishable in the database, over the seed and the import together', async () => {
    const db = await database();
    importSubclass(db);

    expect(
      db
        .allRaw(
          'SELECT content_key FROM subclass_definitions ORDER BY content_key',
        )
        .map((row) => [
          String(row.content_key),
          importedContentKeyOwner(String(row.content_key)),
        ]),
    ).toEqual([
      [SUBCLASS_KEY, 'longroad.homebrew'],
      // The seeder's own two, whose middle segment is a record-kind literal.
      ['2024:subclass:at', null],
      ['2024:subclass:ek', null],
    ]);
  });

  it('travels through a character backup as its key, and resolves by it', async () => {
    const source = await database();
    const characterId = walker(source, importSubclass(source));
    const document = exportCharacterBackup(source, characterId);

    // The backup names the subclass by content key and by nothing else — no
    // name, no features, no parent class. That is `backupReference: true`, and
    // it is why the key has to carry the provenance.
    expect(document.references.subclass_definitions).toEqual([
      { id: expect.any(Number), content_key: SUBCLASS_KEY },
    ]);
    expect(
      importedContentKeyOwner(
        document.references.subclass_definitions[0]?.content_key ?? '',
      ),
    ).toBe('longroad.homebrew');
    // And no subclass FEATURE travels: `subclass_features` is
    // `backupReference: false`, so a recipient whose copy of the subclass has
    // been revised gets THEIR revision rather than a stale row.
    expect(JSON.stringify(document)).not.toContain('Marching Song');

    // A recipient who has imported the same document resolves it.
    const recipient = await database();
    importSubclass(recipient);
    const imported = importCharacterBackup(recipient, document);
    expect(
      recipient.scalar(
        `SELECT subclass.content_key AS key
         FROM character_class_levels AS level
         JOIN subclass_definitions AS subclass
           ON subclass.id = level.subclass_definition_id
         WHERE level.character_id = ?`,
        [imported.characterId],
      ),
    ).toBe(SUBCLASS_KEY);
  });

  it('refuses a backup whose subclass the recipient has not imported', async () => {
    const source = await database();
    const document = exportCharacterBackup(
      source,
      walker(source, importSubclass(source)),
    );

    // The bundled catalog alone is not enough, and the failure names the key
    // rather than resolving to some other subclass that happened to be there.
    const bare = await database();
    expect(() => importCharacterBackup(bare, document)).toThrow(SUBCLASS_KEY);
  });

  it('travels through a share link as subclassKey, and is missed by key', async () => {
    const source = await database();
    const shared = exportCharacterShare(
      source,
      walker(source, importSubclass(source)),
    );
    expect(shared.classes[0]?.subclassKey).toBe(SUBCLASS_KEY);

    // A recipient without it is TOLD, in terms of the key. `missingSubclassIssue`
    // is what the share screen prints, and this is the sentence that only means
    // something because the key says whose content it is.
    const bare = await database();
    expect(assessImportCompatibility(bare, shared)).toEqual([
      expect.objectContaining({
        code: 'missing_subclass',
        contentKeys: [SUBCLASS_KEY],
      }),
    ]);

    // A recipient WITH it resolves against their own copy, which is the
    // posture `src/sharing/character-share.ts` states: catalog tables are the
    // recipient's, resolved by content key, never rows that travel.
    const recipient = await database();
    const recipientSubclassId = importSubclass(recipient);
    expect(assessImportCompatibility(recipient, shared)).toEqual([]);
    const imported = importCharacterShare(recipient, shared);
    expect(
      recipient.scalar(
        `SELECT subclass_definition_id AS id FROM character_class_levels
         WHERE character_id = ?`,
        [imported.characterId],
      ),
    ).toBe(recipientSubclassId);
  });
});
