import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import {
  BUNDLED_HOMEBREW_CATALOG,
  type BundledHomebrewCatalogEntry,
} from '../../../src/authoring/bundled-homebrew-catalog';
import {
  commitBundledHomebrewInstall,
  planBundledHomebrewInstall,
} from '../../../src/authoring/bundled-homebrew-installer';
import type { SubclassAuthoringDraft } from '../../../src/authoring/contracts';
import type { ContentKey } from '../../../src/domain/ids';
import { applicationSeed } from '../../../src/db/bootstrap';
import { DatabaseContext } from '../../../src/db/database';
import { openTestDatabase } from '../../helpers/open-db';
import {
  exportCharacterBackup,
  importCharacterBackup,
} from '../../../src/backup/character-backup';

const connections: Database[] = [];

afterEach(() => {
  for (const connection of connections.splice(0)) connection.close();
});

async function database(): Promise<DatabaseContext> {
  const connection = await openTestDatabase();
  connections.push(connection);
  const db = new DatabaseContext(connection);
  applicationSeed(db);
  return db;
}

function spellStudent(): SubclassAuthoringDraft {
  const document = BUNDLED_HOMEBREW_CATALOG.find((entry) =>
    entry.catalog_key === 'spell-student')?.revisions[0];
  if (document?.kind !== 'subclass') throw new Error('Spell Student fixture is missing.');
  return document;
}

describe('bundled authored-kind installer', () => {
  it('publishes all three entries atomically through drafts and is an exact-fingerprint no-op on repeat', async () => {
    // Measured alone at 3.58s; 20s retains contention headroom.
    const db = await database();
    const beforeRoots = db.scalar<number>(
      "SELECT count(*) FROM catalog_content_identities WHERE catalog_layer = 'external'",
    );
    const firstPlan = planBundledHomebrewInstall(db);

    expect(firstPlan.entries.map((entry) => [entry.name, entry.outcome, entry.error])).toEqual([
      ['Veteran', 'create', null],
      ['Warrior of the Barbed Court', 'create', null],
      ['Spell Student', 'create', null],
    ]);
    expect(commitBundledHomebrewInstall(db, firstPlan.token)).toMatchObject({
      kind: 'committed',
      outcomes: [{ kind: 'create' }, { kind: 'create' }, { kind: 'create' }],
    });
    expect(db.scalar<number>("SELECT count(*) FROM catalog_content_identities WHERE catalog_layer = 'external'"))
      .toBe((beforeRoots ?? 0) + 3);
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_drafts')).toBe(0);

    const rootsAfterFirst = db.scalar<number>('SELECT count(*) FROM catalog_content_identities');
    const secondPlan = planBundledHomebrewInstall(db);
    expect(secondPlan.entries.map((entry) => entry.outcome)).toEqual([
      'matched_existing', 'matched_existing', 'matched_existing',
    ]);
    expect(commitBundledHomebrewInstall(db, secondPlan.token)).toMatchObject({
      kind: 'committed',
      outcomes: [{ kind: 'match' }, { kind: 'match' }, { kind: 'match' }],
    });
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_identities')).toBe(rootsAfterFirst);
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_supersessions')).toBe(0);
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_drafts')).toBe(0);
  }, 20_000);

  it('publishes registered changed bytes as a CI-7 successor and leaves the previous root in place', async () => {
    // Measured alone at 2.02s; 20s retains contention headroom.
    const db = await database();
    const first = spellStudent();
    const revised: SubclassAuthoringDraft = {
      ...first,
      reference_text: `${first.reference_text} The lessons are carefully recorded.`,
    };
    const v1 = Object.freeze([Object.freeze({
      catalog_key: 'spell-student',
      revisions: Object.freeze([first] as const),
    })] as const satisfies readonly BundledHomebrewCatalogEntry[]);
    const v2 = Object.freeze([Object.freeze({
      catalog_key: 'spell-student',
      revisions: Object.freeze([first, revised] as const),
    })] as const satisfies readonly BundledHomebrewCatalogEntry[]);
    const initial = planBundledHomebrewInstall(db, v1);
    const initialCommit = commitBundledHomebrewInstall(db, initial.token, v1);
    if (initialCommit.kind !== 'committed') throw new Error('Initial catalog install failed.');
    const oldKey = initialCommit.outcomes[0];
    if (oldKey?.kind !== 'create') throw new Error('Initial catalog root was not created.');

    const successorPlan = planBundledHomebrewInstall(db, v2);
    expect(successorPlan.entries).toEqual([
      expect.objectContaining({ catalog_key: 'spell-student', outcome: 'successor' }),
    ]);
    const successor = commitBundledHomebrewInstall(db, successorPlan.token, v2);
    if (successor.kind !== 'committed') throw new Error('Successor catalog install failed.');
    const newKey = successor.outcomes[0];
    if (newKey?.kind !== 'create') throw new Error('Successor catalog root was not created.');

    expect(newKey.contentKey).not.toBe(oldKey.contentKey);
    expect(db.oneRaw(
      `SELECT superseded_content_key, successor_content_key
       FROM catalog_content_supersessions WHERE content_kind = 'subclass'`,
    )).toEqual({
      superseded_content_key: oldKey.contentKey,
      successor_content_key: newKey.contentKey,
    });
    expect(db.scalar<number>(
      `SELECT count(*) FROM subclass_definitions WHERE name LIKE 'Spell Student%'`,
    )).toBe(2);
    const repeated = planBundledHomebrewInstall(db, v2);
    expect(repeated.entries[0]?.outcome).toBe('matched_existing');
    expect(commitBundledHomebrewInstall(db, repeated.token, v2)).toMatchObject({
      kind: 'committed', outcomes: [{ kind: 'match', contentKey: newKey.contentKey }],
    });
  }, 20_000);

  it('rolls an earlier valid entry back when a later entry refuses, preserving captured IDs', async () => {
    const db = await database();
    const capturedIdentityIds = db.allRaw(
      'SELECT rowid FROM catalog_content_identities ORDER BY rowid',
    ).map((row) => Number(row.rowid));
    const capturedDraftIds = db.allRaw(
      'SELECT rowid FROM catalog_content_drafts ORDER BY rowid',
    ).map((row) => Number(row.rowid));
    const broken: SubclassAuthoringDraft = {
      ...spellStudent(),
      parent_class_content_key: '2024:class:missing-bundled-parent' as ContentKey,
    };
    const catalog = Object.freeze([
      BUNDLED_HOMEBREW_CATALOG[0],
      Object.freeze({
        catalog_key: 'broken-spell-student',
        revisions: Object.freeze([broken] as const),
      }),
    ] as const satisfies readonly BundledHomebrewCatalogEntry[]);

    const plan = planBundledHomebrewInstall(db, catalog);
    expect(plan.outcomes).toEqual([{
      id: 'subclass:bundled:broken-spell-student',
      kind: 'refused',
      reason: 'install_refused',
    }]);
    expect(plan.entries).toEqual([{
      catalog_key: 'broken-spell-student',
      kind: 'subclass',
      name: 'Spell Student',
      outcome: 'refused',
      error: 'Subclass draft semantic validation failed. [{"path":["parent_class_content_key"],"code":"unresolved_reference","message":"Parent class must resolve to one bundled class fingerprint."}]',
    }]);
    expect(commitBundledHomebrewInstall(db, plan.token, catalog)).toEqual({
      kind: 'refused',
      reason: 'entry_refused',
      outcomes: plan.outcomes,
    });
    expect(db.allRaw(
      'SELECT rowid FROM catalog_content_identities ORDER BY rowid',
    ).map((row) => Number(row.rowid))).toEqual(capturedIdentityIds);
    expect(db.allRaw(
      'SELECT rowid FROM catalog_content_drafts ORDER BY rowid',
    ).map((row) => Number(row.rowid))).toEqual(capturedDraftIds);
  }, 20_000);

  it('refuses an unregistered same-key root without leaving any staged draft or partial catalog write', async () => {
    const db = await database();
    const first = spellStudent();
    const unrelated: SubclassAuthoringDraft = {
      ...first,
      reference_text: 'Unrelated user-authored bytes under the same asserted key.',
    };
    const unrelatedCatalog = Object.freeze([Object.freeze({
      catalog_key: 'unrelated',
      revisions: Object.freeze([unrelated] as const),
    })] as const satisfies readonly BundledHomebrewCatalogEntry[]);
    const unrelatedPlan = planBundledHomebrewInstall(db, unrelatedCatalog);
    expect(commitBundledHomebrewInstall(db, unrelatedPlan.token, unrelatedCatalog).kind).toBe('committed');
    const roots = db.scalar<number>('SELECT count(*) FROM catalog_content_identities');

    const refused = planBundledHomebrewInstall(db, [Object.freeze({
      catalog_key: 'spell-student',
      revisions: Object.freeze([first] as const),
    })]);
    expect(refused.outcomes).toEqual([
      expect.objectContaining({ kind: 'refused', reason: 'install_refused' }),
    ]);
    expect(refused.entries).toEqual([{
      catalog_key: 'spell-student',
      kind: 'subclass',
      name: 'Spell Student',
      outcome: 'refused',
      error: 'Installed content at "2024:content.subclass:spell-student" is not a registered revision of bundled entry "spell-student".',
    }]);
    expect(commitBundledHomebrewInstall(db, refused.token, [Object.freeze({
      catalog_key: 'spell-student',
      revisions: Object.freeze([first] as const),
    })])).toMatchObject({ kind: 'refused', reason: 'entry_refused' });
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_identities')).toBe(roots);
    expect(db.scalar<number>('SELECT count(*) FROM catalog_content_drafts')).toBe(0);
  }, 20_000);

  it('carries an installed non-SRD subclass through full character export and import', async () => {
    // Measured alone at 2.56s; 20s retains contention headroom.
    const source = await database();
    const plan = planBundledHomebrewInstall(source);
    const installed = commitBundledHomebrewInstall(source, plan.token);
    if (installed.kind !== 'committed') throw new Error('Bundled catalog install failed.');
    const spellStudent = installed.outcomes.find((outcome) =>
      outcome.id === 'subclass:bundled:spell-student');
    if (spellStudent === undefined || spellStudent.kind === 'refused' || spellStudent.kind === 'review') {
      throw new Error('Spell Student install outcome is missing.');
    }
    const definition = source.oneRaw(
      `SELECT id, class_definition_id FROM subclass_definitions WHERE content_key = ?`,
      [spellStudent.contentKey],
    );
    if (definition === null) throw new Error('Spell Student definition is missing.');
    const characterId = source.exec(
      "INSERT INTO characters (name) VALUES ('Portable Spell Student')",
    ).lastInsertId;
    source.exec(
      `INSERT INTO character_class_levels (
         character_id, class_definition_id, subclass_definition_id, level,
         is_starting_class
       ) VALUES (?, ?, ?, 9, 1)`,
      [characterId, Number(definition.class_definition_id), Number(definition.id)],
    );

    const backup = exportCharacterBackup(
      source,
      characterId,
      '2042-08-07T12:00:00.000Z',
    );
    expect(backup.content).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'subclass',
        content_key: spellStudent.contentKey,
        aggregate: expect.objectContaining({ name: 'Spell Student' }),
      }),
    ]));

    const target = await database();
    const imported = importCharacterBackup(target, backup);
    expect(target.oneRaw(
      `SELECT subclass.name, identity.catalog_layer
       FROM character_class_levels AS level
       JOIN subclass_definitions AS subclass ON subclass.id = level.subclass_definition_id
       JOIN catalog_content_identities AS identity
         ON identity.content_kind = 'subclass' AND identity.content_key = subclass.content_key
       WHERE level.character_id = ?`,
      [imported.characterId],
    )).toEqual({ name: 'Spell Student', catalog_layer: 'external' });
  }, 20_000);
});
