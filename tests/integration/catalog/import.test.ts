import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CatalogImporter,
  type CatalogImportSummary,
} from '../../../src/catalog/catalog-importer';
import { DatabaseContext } from '../../../src/db/database';
import { SpellSelectionEligibility } from '../../../src/eligibility/spell-selection-eligibility';
import { handlers } from '../../../src/worker/handlers/catalog';
import { createRpcHarness, type RpcHarness } from '../../helpers/rpc-harness';
import { openTestDatabase } from '../../helpers/open-db';

function record(overrides: Record<string, unknown> = {}) {
  return {
    identityKey: 'test-spell',
    versionKey: '2024:test-spell',
    name: 'Test Spell',
    edition: '2024',
    level: 1,
    school: 'Evocation',
    castingTime: 'Action',
    range: '60 feet',
    components: 'V, S',
    duration: 'Instantaneous',
    concentration: false,
    ritual: false,
    attackModes: ['ranged_spell'],
    saveAbilities: [],
    effectReliabilityCategory: 'attack_roll',
    spellLists: ['Wizard'],
    sourceBooks: ['Test Book'],
    sourcePage: 42,
    sourceSlug: 'test-spell',
    ...overrides,
  };
}

function document(...records: unknown[]): string {
  return JSON.stringify(records);
}

async function database(): Promise<{
  connection: Database;
  db: DatabaseContext;
  importer: CatalogImporter;
}> {
  const connection = await openTestDatabase();
  const db = new DatabaseContext(connection);
  return { connection, db, importer: new CatalogImporter(db) };
}

function values(
  db: DatabaseContext,
  table: string,
  column: string,
  versionId: number,
): string[] {
  return db
    .allRaw(
      `SELECT ${column} FROM ${table}
       WHERE spell_version_id = ?
       ORDER BY ${column}`,
      [versionId],
    )
    .map((row) => String(row[column]));
}

let rpcHarness: RpcHarness | undefined;

afterEach(() => {
  rpcHarness?.close();
  rpcHarness = undefined;
});

describe('catalog import persistence', () => {
  it('persists merged identities, editions, publications, and pivots idempotently', async () => {
    const test = await database();
    const documents = [
      document(
        record({
          versionKey: '2014:test-spell',
          name: 'Legacy Spell',
          edition: '2014',
          attackModes: [],
          sourceBooks: ['Legacy Book'],
        }),
        // The modern version is a ritual AND a concentration spell, and it says
        // so in the two fields that decide it. It used to say so only in its
        // prose — `castingTime: 'Action or R'`, `duration: 'C, up to 1 minute'`
        // — and get the tags from a regex over that text while DECLARING both
        // booleans false. F13 retired that inference, so the declaration now
        // carries the intent the assertions below already had.
        record({
          castingTime: 'Action or Ritual',
          duration: 'Concentration, up to 1 minute',
          concentration: true,
          ritual: true,
          tags: ['alpha'],
          sourceBooks: ['Modern A'],
        }),
      ),
      document(
        record({
          castingTime: 'Action or Ritual',
          duration: 'Concentration, up to 1 minute',
          concentration: true,
          ritual: true,
          tags: ['beta'],
          sourceBooks: ['Modern B'],
          sourcePage: 77,
          spellLists: ['Cleric', 'Wizard'],
          attackModes: ['melee_spell'],
          saveAbilities: ['wisdom'],
        }),
      ),
    ];

    const first = test.importer.import({ documents });
    const modernId = Number(
      test.db.scalar(
        "SELECT id FROM spell_versions WHERE content_key = '2024:test-spell'",
      ),
    );
    expect(first).toEqual({
      created: 2,
      updated: 0,
      tombstoned: 0,
      identities_created: 1,
      identities_updated: 0,
      publications_created: 3,
      memberships_created: 3,
      tags_created: 4,
      attack_modes_created: 2,
      save_abilities_created: 1,
      // A spell-only document touches the subclass arm not at all.
      subclasses_created: 0,
      subclasses_updated: 0,
      subclass_features_created: 0,
      text_available: false,
      descriptions_loaded: 0,
    });
    expect(
      test.db.oneRaw(
        `SELECT canonical_name, normalized_name
         FROM spell_identities`,
      ),
    ).toEqual({
      canonical_name: 'Test Spell',
      normalized_name: 'test spell',
    });
    expect(
      test.db.allRaw(
        `SELECT content_key, rules_edition, spell_identity_id
         FROM spell_versions ORDER BY content_key`,
      ),
    ).toEqual([
      {
        content_key: '2014:test-spell',
        rules_edition: '2014',
        spell_identity_id: 1,
      },
      {
        content_key: '2024:test-spell',
        rules_edition: '2024',
        spell_identity_id: 1,
      },
    ]);
    expect(
      test.db.allRaw(
        `SELECT source_book, source_page
         FROM spell_version_publications
         WHERE spell_version_id = ?
         ORDER BY source_book`,
        [modernId],
      ),
    ).toEqual([
      { source_book: 'Modern A', source_page: 42 },
      { source_book: 'Modern B', source_page: 77 },
    ]);
    expect(
      values(
        test.db,
        'spell_list_memberships',
        'spell_list_key',
        modernId,
      ),
    ).toEqual(['Cleric', 'Wizard']);
    expect(
      values(test.db, 'spell_version_tags', 'tag', modernId),
    ).toEqual(['alpha', 'beta', 'concentration', 'ritual']);
    expect(
      values(
        test.db,
        'spell_version_attack_modes',
        'attack_mode',
        modernId,
      ),
    ).toEqual(['melee_spell', 'ranged_spell']);
    expect(
      values(
        test.db,
        'spell_version_save_abilities',
        'save_ability',
        modernId,
      ),
    ).toEqual(['wisdom']);

    expect(test.importer.import({ documents })).toMatchObject({
      created: 0,
      updated: 0,
      tombstoned: 0,
      publications_created: 0,
      memberships_created: 0,
      tags_created: 0,
      attack_modes_created: 0,
      save_abilities_created: 0,
    });
    expect(
      test.db.allRaw(
        'SELECT id, content_key FROM spell_versions ORDER BY id',
      ),
    ).toEqual([
      { id: 1, content_key: '2014:test-spell' },
      { id: 2, content_key: '2024:test-spell' },
    ]);
    test.connection.close();
  });

  /**
   * THE DECLARED BOOLEAN IS THE WHOLE ANSWER, IN BOTH DIRECTIONS.
   *
   * F13: the importer used to OR the booleans with a regex over the casting
   * time and duration text. Because `catalogRecord` makes both booleans
   * required (`tests/unit/catalog/schema.test.ts` pins the omission cases), that
   * regex could never fill an absence — it could only overrule an author who had
   * written `false`, and only for the abbreviated spelling. The four records
   * below are the two halves of that:
   *
   * - two declare `false` beside prose shaped exactly like the retired patterns
   *   (`'Concentration, up to 1 minute'` matched neither regex; `'C, up to 1
   *   minute'` and `'Action or R'` matched both), and get NO tag;
   * - one declares `true` beside prose that mentions neither word, and gets both.
   */
  it('tags ritual and concentration from the declared booleans and never from the prose', async () => {
    const test = await database();
    const spell = (
      key: string,
      overrides: Record<string, unknown>,
    ) =>
      record({
        identityKey: key,
        versionKey: `2024:${key}`,
        name: key,
        sourceSlug: key,
        tags: ['base'],
        ...overrides,
      });
    const summary = test.importer.import({
      documents: [
        document(
          spell('declared-false-spelled-out', {
            castingTime: 'Action or Ritual',
            duration: 'Concentration, up to 1 minute',
            concentration: false,
            ritual: false,
          }),
          spell('declared-false-abbreviated', {
            castingTime: 'Action or R',
            duration: 'C, up to 1 minute',
            concentration: false,
            ritual: false,
          }),
          spell('declared-true-silent-prose', {
            castingTime: 'Action',
            duration: 'Instantaneous',
            concentration: true,
            ritual: true,
          }),
        ),
      ],
    });

    const tagsOf = (key: string): string[] =>
      values(
        test.db,
        'spell_version_tags',
        'tag',
        Number(
          test.db.scalar(
            'SELECT id FROM spell_versions WHERE content_key = ?',
            [`2024:${key}`],
          ),
        ),
      );
    expect(tagsOf('declared-false-spelled-out')).toEqual(['base']);
    expect(tagsOf('declared-false-abbreviated')).toEqual(['base']);
    expect(tagsOf('declared-true-silent-prose')).toEqual([
      'base',
      'concentration',
      'ritual',
    ]);
    // Three `base` tags plus the two the third record earns.
    expect(summary.tags_created).toBe(5);
    test.connection.close();
  });

  it('preserves referenced metadata and text while tombstones refresh retained selections', async () => {
    const test = await database();
    test.importer.import({ documents: [document(record())] });
    const versionId = Number(
      test.db.scalar('SELECT id FROM spell_versions'),
    );
    const characterId = test.db.exec(
      "INSERT INTO characters (name) VALUES ('Catalog Reference')",
    ).lastInsertId;
    const sourceId = test.db.exec(
      `INSERT INTO character_source_instances
         (character_id, instance_uuid, source_type, display_name)
       VALUES (?, 'catalog-reference', 'feat', 'Catalog Reference')`,
      [characterId],
    ).lastInsertId;
    const slotId = test.db.exec(
      `INSERT INTO spell_selection_slots (
         character_id, source_instance_id, slot_key, rule_key, bucket,
         eligibility_kind, fixed_spell_version_id
       ) VALUES (?, ?, 'catalog-reference', 'catalog-reference',
                 'automatic', 'fixed_spell', ?)`,
      [characterId, sourceId, versionId],
    ).lastInsertId;
    test.db.exec(
      `INSERT INTO wizard_spellbook_entries
         (character_id, spell_version_id)
       VALUES (?, ?)`,
      [characterId, versionId],
    );
    new SpellSelectionEligibility(test.db).refresh(slotId);

    const withText = test.importer.import({
      documents: [
        document(
          record({
            name: 'Renamed Spell',
            school: 'Illusion',
            spellLists: ['Bard'],
            attackModes: ['melee_spell'],
          }),
        ),
      ],
      textDocuments: [
        JSON.stringify([
          {
            versionKey: '2024:test-spell',
            _description: 'Complete local spell text.',
          },
        ]),
      ],
    });
    expect(withText).toMatchObject({
      updated: 1,
      identities_updated: 1,
      text_available: true,
      descriptions_loaded: 1,
    });
    expect(
      test.db.oneRaw(
        `SELECT display_name, school, short_summary, is_active
         FROM spell_versions WHERE id = ?`,
        [versionId],
      ),
    ).toEqual({
      display_name: 'Test Spell',
      school: 'Evocation',
      short_summary: 'Complete local spell text.',
      is_active: 1,
    });
    expect(
      values(
        test.db,
        'spell_list_memberships',
        'spell_list_key',
        versionId,
      ),
    ).toEqual(['Wizard']);
    expect(
      test.db.allRaw(
        'SELECT alias, normalized_alias FROM spell_identity_aliases',
      ),
    ).toEqual([
      { alias: 'Test Spell', normalized_alias: 'test spell' },
    ]);

    expect(
      test.importer.import({
        documents: [document(record({ name: 'Renamed Spell' }))],
      }).updated,
    ).toBe(0);
    expect(
      test.db.scalar(
        'SELECT short_summary FROM spell_versions WHERE id = ?',
        [versionId],
      ),
    ).toBe('Complete local spell text.');

    expect(test.importer.import({ documents: ['[]'] }).tombstoned).toBe(1);
    expect(
      test.db.oneRaw(
        `SELECT fixed_spell_version_id, selection_eligibility,
                selection_invalid_reason
         FROM spell_selection_slots WHERE id = ?`,
        [slotId],
      ),
    ).toEqual({
      fixed_spell_version_id: versionId,
      selection_eligibility: 'invalid',
      selection_invalid_reason:
        'Selected spell version is not active in the catalog.',
    });
    expect(
      test.db.oneRaw(
        `SELECT spell_version_id
         FROM wizard_spellbook_entries
         WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual({ spell_version_id: versionId });

    expect(
      test.importer.import({
        documents: [document(record({ name: 'Renamed Spell' }))],
      }).updated,
    ).toBe(1);
    expect(
      test.db.oneRaw(
        `SELECT is_active FROM spell_versions WHERE id = ?`,
        [versionId],
      ),
    ).toEqual({ is_active: 1 });
    expect(
      test.db.oneRaw(
        `SELECT fixed_spell_version_id, selection_eligibility,
                selection_invalid_reason
         FROM spell_selection_slots WHERE id = ?`,
        [slotId],
      ),
    ).toEqual({
      fixed_spell_version_id: versionId,
      selection_eligibility: 'valid',
      selection_invalid_reason: null,
    });
    test.connection.close();
  });

  /**
   * THE EXEMPTIONS FROM THE FREEZE THAT ARE A FILL RATHER THAN A CHANGE.
   *
   * A referenced version is frozen so a spell cannot change under a character
   * who already chose it. Both progressions are NET-NEW — no document written
   * before they existed carries either — so every version that predates them
   * has both facts ABSENT, and a version is referenced exactly when a character
   * uses it, which is exactly when the printable card renders it. Frozen
   * unconditionally, the only spells that can ever print a progression are the
   * ones nobody plays.
   *
   * THREE CLAIMS, AND THE SECOND AND THIRD ARE THE ONES THAT MATTER. The fill
   * is all-or-nothing within a fact, so a stored summary can never end up
   * describing a document's levels; and the two facts are gated SEPARATELY, so
   * a version frozen on its slot-level upcasting can still be given the Cantrip
   * Upgrade it has never had.
   */
  it('fills a referenced version’s ABSENT upcast progression, and refuses to change one it has', async () => {
    const test = await database();
    test.importer.import({ documents: [document(record())] });
    const versionId = Number(test.db.scalar('SELECT id FROM spell_versions'));
    const characterId = test.db.exec(
      "INSERT INTO characters (name) VALUES ('Upcast Reference')",
    ).lastInsertId;
    test.db.exec(
      `INSERT INTO wizard_spellbook_entries (character_id, spell_version_id)
       VALUES (?, ?)`,
      [characterId, versionId],
    );

    const upcast = {
      upcastLevels: [2, 3],
      upcastSummary: 'One additional creature per slot level above 1.',
    };
    // A referenced version: the rules stay frozen (the rename is refused) and
    // the absent upcast progression is supplied.
    const filled = test.importer.import({
      documents: [document(record({ name: 'Renamed Spell', ...upcast }))],
    });
    expect(filled.updated).toBe(1);
    expect(
      test.db.oneRaw(
        `SELECT display_name, upcast_summary
         FROM spell_versions WHERE id = ?`,
        [versionId],
      ),
    ).toEqual({
      display_name: 'Test Spell',
      upcast_summary: 'One additional creature per slot level above 1.',
    });
    expect(
      values(test.db, 'spell_version_upcast_levels', 'level', versionId),
    ).toEqual(['2', '3']);

    // Re-importing the same progression changes nothing.
    expect(
      test.importer.import({ documents: [document(record(upcast))] }).updated,
    ).toBe(0);

    // A DIFFERENT progression on the now-non-absent version is REFUSED WHOLE.
    // Filling column by column would leave the stored summary — which says
    // "per slot level above 1" — describing the levels `4, 6, 8`.
    expect(
      test.importer.import({
        documents: [
          document(
            record({
              upcastLevels: [4, 6, 8],
              upcastSummary: 'Every other slot level.',
            }),
          ),
        ],
      }).updated,
    ).toBe(0);
    expect(
      test.db.oneRaw(
        'SELECT upcast_summary FROM spell_versions WHERE id = ?',
        [versionId],
      ),
    ).toEqual({
      upcast_summary: 'One additional creature per slot level above 1.',
    });
    expect(
      values(test.db, 'spell_version_upcast_levels', 'level', versionId),
    ).toEqual(['2', '3']);

    // AND THE CANTRIP UPGRADE IS STILL FILLABLE, because it is a different
    // fact. One gate for both would have frozen a progression nobody stored.
    expect(
      test.importer.import({
        documents: [
          document(
            record({
              ...upcast,
              cantripUpgradeLevels: [5, 11, 17],
              cantripUpgradeSummary: 'The cantrip ladder.',
            }),
          ),
        ],
      }).updated,
    ).toBe(1);
    expect(
      test.db.oneRaw(
        `SELECT upcast_summary, cantrip_upgrade_summary
         FROM spell_versions WHERE id = ?`,
        [versionId],
      ),
    ).toEqual({
      upcast_summary: 'One additional creature per slot level above 1.',
      cantrip_upgrade_summary: 'The cantrip ladder.',
    });
    expect(
      values(
        test.db,
        'spell_version_cantrip_upgrade_levels',
        'level',
        versionId,
      ),
    ).toEqual(['5', '11', '17']);
    // The slot ladder is untouched by the cantrip fill.
    expect(
      values(test.db, 'spell_version_upcast_levels', 'level', versionId),
    ).toEqual(['2', '3']);
    test.connection.close();
  });

  it('returns an accurate dry-run diff while rolling back every persisted change', async () => {
    const test = await database();
    test.importer.import({ documents: [document(record())] });
    const userIdentityId = test.db.exec(
      `INSERT INTO spell_identities
         (content_key, canonical_name, normalized_name)
       VALUES ('user-spell', 'User Spell', 'user spell')`,
    ).lastInsertId;
    test.db.exec(
      `INSERT INTO spell_versions (
         content_key, spell_identity_id, display_name, rules_edition,
         level, school, provenance
       ) VALUES ('user:spell', ?, 'User Spell', 'expanded', 1,
                 'Evocation', 'user')`,
      [userIdentityId],
    );

    expect(
      test.importer.import({ documents: ['[]'], dryRun: true }),
    ).toMatchObject({ tombstoned: 1 });
    expect(
      test.db.allRaw(
        `SELECT content_key, is_active, provenance
         FROM spell_versions ORDER BY content_key`,
      ),
    ).toEqual([
      {
        content_key: '2024:test-spell',
        is_active: 1,
        provenance: 'import',
      },
      {
        content_key: 'user:spell',
        is_active: 1,
        provenance: 'user',
      },
    ]);

    test.importer.import({ documents: ['[]'] });
    expect(
      test.importer.import({
        documents: [document(record())],
        dryRun: true,
      }),
    ).toMatchObject({ updated: 1 });
    expect(
      test.db.allRaw(
        `SELECT content_key, is_active
         FROM spell_versions ORDER BY content_key`,
      ),
    ).toEqual([
      { content_key: '2024:test-spell', is_active: 0 },
      { content_key: 'user:spell', is_active: 1 },
    ]);
    test.connection.close();
  });

  it('rolls back database errors and exposes the typed self-registering RPC handler', async () => {
    const test = await database();
    const conflicting = document(
      record({
        identityKey: 'same-identity',
        versionKey: '2024:first',
        name: 'First',
      }),
      record({
        identityKey: 'same-identity',
        versionKey: '2024:second',
        name: 'Second',
      }),
    );

    expect(() =>
      test.importer.import({ documents: [conflicting] }),
    ).toThrow();
    expect(
      test.db.oneRaw(
        `SELECT
           (SELECT count(*) FROM spell_identities) AS identities,
           (SELECT count(*) FROM spell_versions) AS versions`,
      ),
    ).toEqual({ identities: 0, versions: 0 });
    test.connection.close();

    rpcHarness = await createRpcHarness(handlers);
    const response = await rpcHarness.call<
      { documents: string[] },
      CatalogImportSummary
    >('catalog.import', { documents: [document(record())] });
    expect(response).toMatchObject({
      ok: true,
      result: { created: 1, identities_created: 1 },
    });
    expect(
      rpcHarness.context.db.oneRaw(
        `SELECT content_key, display_name, is_active
         FROM spell_versions`,
      ),
    ).toEqual({
      content_key: '2024:test-spell',
      display_name: 'Test Spell',
      is_active: 1,
    });

    await expect(
      rpcHarness.call('catalog.import', {
        documents: [document(record())],
        extra: true,
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'invalid_params' },
    });
  });
});
