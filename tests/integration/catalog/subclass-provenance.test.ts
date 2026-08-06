import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import {
  commitCharacterBackupImport,
  exportCharacterBackup,
  importCharacterBackup,
  planCharacterBackupImport,
} from '../../../src/backup/character-backup';
import { CatalogImporter } from '../../../src/catalog/catalog-importer';
import { reconcileBundledContentRegistryV1 } from '../../../src/catalog/bundled-content-registry-v1';
import { importedContentKeyOwner } from '../../../src/catalog/catalog-key';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { UpdateClassCommand } from '../../../src/commands/update-class';
import { DatabaseContext } from '../../../src/db/database';
import { raiseClassLevelForTest } from '../../helpers/class-levels';
import { seedClassProgressions } from '../../../src/rules/class-progression-lookup';
import { ensureBundledSrdSubclassContent } from '../../../src/rules/srd-subclass-content';
import { seedSpellContent } from '../../../src/rules/spells-srd';
import {
  assessImportCompatibility,
  commitCharacterShareImport,
  exportCharacterShare,
  importCharacterShare,
  previewCharacterShare,
} from '../../../src/sharing/character-share';
import { assertContentImportPlan } from '../../helpers/content-import-plan';
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
const REVISED_MARCHING_SONG =
  "Your recipient's revised Marching Song rules apply instead of carried prose.";
const REVISED_SUBCLASS = SUBCLASS.replace(
  "You always have Roadmender's Cadence prepared, and it does not count against the number of spells you can prepare.",
  REVISED_MARCHING_SONG,
);

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
  ensureBundledSrdSubclassContent(db);
  seedSpellContent(db);
  reconcileBundledContentRegistryV1(db);
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

function importRevisedSubclass(db: DatabaseContext): number {
  new CatalogImporter(db).import({ documents: [REVISED_SUBCLASS] });
  return Number(
    db.scalar('SELECT id FROM subclass_definitions WHERE content_key = ?', [
      SUBCLASS_KEY,
    ]),
  );
}

/**
 * A Bard 6 who has taken the imported subclass, built through the command —
 * entry and subclass through `update_class` (which no longer carries a
 * level; level-up plan §3), then the fixture level raised directly, since
 * this file's subject is subclass provenance, not the levelling path.
 */
function walker(db: DatabaseContext, subclassId: number): number {
  const characterId = db.exec(
    "INSERT INTO characters (name) VALUES ('Walker')",
  ).lastInsertId;
  const bardId = Number(
    db.scalar('SELECT id FROM class_definitions WHERE content_key = ?', [
      '2024:class:bard',
    ]),
  );
  new UpdateClassCommand(
    db,
    {
      type: 'update_class',
      class_definition_id: bardId,
      subclass_definition_id: subclassId,
    },
    new CharacterCommandIntegrity('subclass-provenance-test-key'),
  ).apply(characterId);
  raiseClassLevelForTest(db, characterId, bardId, 6);
  return characterId;
}

/**
 * AN IMPORTED SUBCLASS STAYS TELLABLE FROM A BUNDLED ONE — IN THE DATABASE, IN
 * A BACKUP, AND IN A SHARE LINK.
 *
 * `spell_versions` settles this with a `provenance` column. `subclass_definitions`
 * HAS NO SUCH COLUMN. CI-5 character backups now carry both a key reference and
 * a complete external-content manifest aggregate, while
 * `src/sharing/character-share.ts` still carries exactly one `subclassKey` per
 * class. The key is therefore the common provenance fact across all three
 * boundaries, and `catalog_content_identities.catalog_layer` independently
 * records imported/external rather than bundled after manifest installation.
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
      ['2024:subclass:at', null],
      ['2024:subclass:champion', null],
      ['2024:subclass:circle-of-the-land', null],
      ['2024:subclass:college-of-lore', null],
      ['2024:subclass:draconic-sorcery', null],
      ['2024:subclass:ek', null],
      ['2024:subclass:evoker', null],
      ['2024:subclass:fiend-patron', null],
      ['2024:subclass:hunter', null],
      ['2024:subclass:life-domain', null],
      ['2024:subclass:oath-of-devotion', null],
      ['2024:subclass:path-of-the-berserker', null],
      ['2024:subclass:thief', null],
      ['2024:subclass:warrior-of-the-open-hand', null],
    ]);
  });

  it('returns a typed refusal when an exact subclass key projects damaged live rules', async () => {
    const db = await database();
    importSubclass(db);
    db.exec(
      `UPDATE subclass_features SET description = description || ' Damaged.'
       WHERE subclass_definition_id = (
         SELECT id FROM subclass_definitions WHERE content_key = ?
       )`,
      [SUBCLASS_KEY],
    );

    const refusal = new CatalogImporter(db).import({
      documents: [SUBCLASS],
    });
    assertContentImportPlan(
      refusal,
      'Expected the damaged subclass import to return a plan.',
    );
    expect(refusal.outcomes).toEqual([
      expect.objectContaining({
        kind: 'refused',
        reason: 'target_integrity_refused',
      }),
    ]);
  });

  it('travels through a character backup with imported provenance and preserves a revised recipient copy through review', async () => {
    const source = await database();
    const characterId = walker(source, importSubclass(source));
    const document = exportCharacterBackup(source, characterId);

    // The reference still names the subclass by its portable key, whose owner
    // keeps imported content distinguishable from bundled content. CI-5 also
    // carries the complete external aggregate in the authenticated manifest.
    expect(document.references.subclass_definitions).toEqual([
      { id: expect.any(Number), content_key: SUBCLASS_KEY },
    ]);
    expect(
      importedContentKeyOwner(
        document.references.subclass_definitions[0]?.content_key ?? '',
      ),
    ).toBe('longroad.homebrew');
    expect(document.content).toEqual([
      expect.objectContaining({
        kind: 'subclass',
        content_key: SUBCLASS_KEY,
        aggregate: expect.objectContaining({
          features: expect.arrayContaining([
            expect.objectContaining({ name: 'Marching Song' }),
          ]),
        }),
      }),
    ]);

    // A recipient with a divergent, registry-current revision is not silently
    // overwritten by the carried aggregate. The direct seam refuses the
    // review-required collision; an explicit Match keeps the recipient's row
    // and resolves the imported character to that row.
    const recipient = await database();
    const recipientSubclassId = importRevisedSubclass(recipient);
    expect(() => importCharacterBackup(recipient, document)).toThrow(
      'requires adoption review',
    );
    expect(recipient.scalar<number>('SELECT count(*) FROM characters')).toBe(0);

    const plan = planCharacterBackupImport(recipient, document);
    expect(plan.reviews).toEqual([
      expect.objectContaining({
        kind: 'subclass',
        targetContentKey: SUBCLASS_KEY,
        matchClass: 'key-collision',
        defaultChoice: 'match',
      }),
    ]);
    const committed = commitCharacterBackupImport(
      recipient,
      document,
      plan.token,
      Object.fromEntries(plan.reviews.map((review) => [
        review.id,
        { decision: 'match' as const },
      ])),
    );
    expect(committed.kind).toBe('committed');
    if (committed.kind !== 'committed') throw new Error('Expected commit.');
    expect(
      recipient.oneRaw(
        `SELECT subclass.id, subclass.content_key AS key,
                feature.description
         FROM character_class_levels AS level
         JOIN subclass_definitions AS subclass
           ON subclass.id = level.subclass_definition_id
         JOIN subclass_features AS feature
           ON feature.subclass_definition_id = subclass.id
          AND feature.name = 'Marching Song'
         WHERE level.character_id = ?`,
        [committed.result.characterId],
      ),
    ).toEqual({
      id: recipientSubclassId,
      key: SUBCLASS_KEY,
      description: REVISED_MARCHING_SONG,
    });
  });

  it('auto-adopts a fingerprint-verified manifest subclass into a bare recipient before resolving the character', async () => {
    const source = await database();
    const document = exportCharacterBackup(
      source,
      walker(source, importSubclass(source)),
    );

    // A missing exact asserted key is the CI-4a create path: it needs no match
    // review, but still registers external provenance before installing the
    // aggregate and resolving the character's reference.
    const bare = await database();
    const plan = planCharacterBackupImport(bare, document);
    expect(plan.reviews).toEqual([]);
    expect(plan.outcomes).toEqual([
      expect.objectContaining({
        id: `portable:subclass:${SUBCLASS_KEY}`,
        kind: 'create',
        contentKey: SUBCLASS_KEY,
      }),
    ]);
    expect(plan.preview.new_by_kind.subclass).toBe(1);
    const imported = importCharacterBackup(bare, document);
    expect(
      bare.oneRaw(
        `SELECT identity.key_kind, identity.catalog_layer,
                subclass.id, subclass.content_key
         FROM catalog_content_identities AS identity
         JOIN subclass_definitions AS subclass
           ON subclass.content_key = identity.content_key
         WHERE identity.content_kind = 'subclass'
           AND identity.content_key = ?`,
        [SUBCLASS_KEY],
      ),
    ).toEqual({
      key_kind: 'asserted',
      catalog_layer: 'external',
      id: expect.any(Number),
      content_key: SUBCLASS_KEY,
    });
    expect(importedContentKeyOwner(SUBCLASS_KEY)).toBe('longroad.homebrew');
    expect(
      bare.scalar(
        `SELECT subclass.content_key
         FROM character_class_levels AS level
         JOIN subclass_definitions AS subclass
           ON subclass.id = level.subclass_definition_id
         WHERE level.character_id = ?`,
        [imported.characterId],
      ),
    ).toBe(SUBCLASS_KEY);
  });

  it('travels through a share link as subclassKey, and is missed by key', async () => {
    const source = await database();
    const shared = exportCharacterShare(
      source,
      walker(source, importSubclass(source)),
    );
    expect(shared.classes[0]?.subclassKey).toBe(SUBCLASS_KEY);
    const sourceCurrentFingerprint = source.scalar<string>(
      `SELECT fingerprint_digest FROM catalog_content_fingerprints
       WHERE content_kind = 'subclass' AND content_key = ?
         AND fingerprint_role = 'current'`,
      [SUBCLASS_KEY],
    );
    expect(sourceCurrentFingerprint).toMatch(/^[0-9a-f]{64}$/);

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

    // A recipient WITH it still needs to confirm that its independently
    // imported copy stands in: the share carries the same key but no rules
    // evidence, so even a matching current local fingerprint cannot prove
    // that the sender held the same rules. Match resolves to the recipient's
    // row; catalog rows never travel through the share.
    const recipient = await database();
    const recipientSubclassId = importSubclass(recipient);
    expect(assessImportCompatibility(recipient, shared)).toEqual([]);
    expect(() => importCharacterShare(recipient, shared)).toThrow(
      'requires review before import',
    );
    expect(recipient.scalar<number>('SELECT count(*) FROM characters')).toBe(0);

    const preview = previewCharacterShare(recipient, shared);
    expect(preview.adoptionPlan.reviews).toEqual([
      expect.objectContaining({
        kind: 'subclass',
        targetContentKey: SUBCLASS_KEY,
        incomingFingerprint: null,
        matchClass: 'key-collision',
        defaultChoice: 'match',
      }),
    ]);
    expect(recipient.scalar<string>(
      `SELECT fingerprint_digest FROM catalog_content_fingerprints
       WHERE content_kind = 'subclass' AND content_key = ?
         AND fingerprint_role = 'current'`,
      [SUBCLASS_KEY],
    )).toBe(sourceCurrentFingerprint);
    const choices = Object.fromEntries(preview.adoptionPlan.reviews.map((review) => [
      review.id,
      { decision: 'match' as const },
    ]));
    const committed = commitCharacterShareImport(
      recipient,
      shared,
      preview.adoptionPlan.token,
      choices,
    );
    expect(committed.kind).toBe('committed');
    if (committed.kind !== 'committed') throw new Error('Expected commit.');
    expect(
      recipient.scalar(
        `SELECT subclass_definition_id AS id FROM character_class_levels
         WHERE character_id = ?`,
        [committed.result.characterId],
      ),
    ).toBe(recipientSubclassId);
  });
});
