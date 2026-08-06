import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  BackgroundContentAggregate,
  SpeciesContentAggregate,
} from '../../../src/authoring/contracts';
import {
  commitCharacterBackupImport,
  exportCharacterBackup,
  importCharacterBackup,
  planCharacterBackupImport,
} from '../../../src/backup/character-backup';
import {
  exportSelectedLibraryContent,
  exportWholeLibrary,
  importLibraryDocument,
} from '../../../src/backup/library-export';
import {
  PRE_FLAVOR_CHARACTER_BACKUP_VERSION,
  PREVIOUS_CHARACTER_BACKUP_VERSION,
} from '../../../src/backup/backup-version';
import { CatalogImporter } from '../../../src/catalog/catalog-importer';
import {
  CONTENT_FINGERPRINT_SCHEME_V1,
  type ContentFingerprintDigest,
} from '../../../src/catalog/content-identity';
import { createApplicationLifecycle } from '../../../src/db/bootstrap';
import { DatabaseContext } from '../../../src/db/database';
import { creatureSize, creatureType } from '../../../src/domain/enums';
import type { ContentKey } from '../../../src/domain/ids';
import { workspaceFixtureImage } from '../../browser/fixtures/php-parity';
import { featProjectorV1Vector } from '../../unit/catalog/fixtures/source-projector-v1-vectors';
import {
  getSqlite3,
  MemoryDatabaseStorage,
  openTestDatabase,
} from '../../helpers/open-db';

const opened: Database[] = [];
const exportedAt = '2042-03-05T00:00:00.000Z';

async function database(): Promise<DatabaseContext> {
  const connection = await openTestDatabase();
  opened.push(connection);
  return new DatabaseContext(connection);
}

afterEach(() => {
  for (const connection of opened.splice(0)) connection.close();
});

function catalogDocument(kind: string, aggregate: object): string {
  return JSON.stringify([{ kind, aggregate }]);
}

function fingerprint(db: DatabaseContext, contentKey: ContentKey) {
  const row = db.oneRaw(
    `SELECT fingerprint_scheme, fingerprint_digest
     FROM catalog_content_fingerprints
     WHERE content_key = ? AND fingerprint_role = 'current'`,
    [contentKey],
  );
  if (row === null) throw new Error(`Missing fixture fingerprint for ${contentKey}.`);
  return {
    scheme: CONTENT_FINGERPRINT_SCHEME_V1,
    digest: String(row.fingerprint_digest) as ContentFingerprintDigest,
  };
}

interface ClosureFixture {
  readonly featKey: ContentKey;
  readonly speciesKey: ContentKey;
  readonly backgroundKey: ContentKey;
  readonly unrelatedKey: ContentKey;
  readonly speciesId: number;
  readonly backgroundId: number;
}

function seedClosureLibrary(db: DatabaseContext): ClosureFixture {
  const importer = new CatalogImporter(db);
  importer.import({
    documents: [catalogDocument('feat', {
      ...featProjectorV1Vector.aggregate,
      category: 'origin',
    })],
  });
  const featKey = 'expanded:content.feat:keen-memory' as ContentKey;

  const species: SpeciesContentAggregate = {
    kind: 'species',
    name: 'Closure Species',
    rules_edition: 'expanded',
    reference_text: 'Carries the transitive feat.',
    repeatable: false,
    creature_type: creatureType('Humanoid'),
    primary_size: creatureSize('Medium'),
    alternate_size: null,
    walking_speed_feet: 30,
    grants: [{
      kind: 'grant_source',
      rule_key: 'closure-species-feat',
      count: 1,
      source_type: 'feat',
      source_definition: { kind: 'feat', ...fingerprint(db, featKey) },
      active_from_class_level: null,
      active_if_config: null,
      distinct_config_by: null,
      always_prepared: false,
      with_slots: false,
      free_cast: null,
    }],
    traits: [],
  };
  importer.import({ documents: [catalogDocument('species', species)] });

  const background: BackgroundContentAggregate = {
    kind: 'background',
    name: 'Closure Background',
    rules_edition: 'expanded',
    reference_text: 'Also carries the transitive feat.',
    repeatable: false,
    grants: [],
    suggested_abilities: ['intelligence', 'wisdom', 'charisma'],
    default_origin_feat_content_key: featKey,
    default_origin_feat: { kind: 'feat', ...fingerprint(db, featKey) },
    default_origin_feat_display_name: 'Portable Origin Feat (Cleric)',
    skill_proficiencies: ['arcana', 'insight'],
    tool_reference_text: null,
    equipment_option_a_description: 'None.',
    equipment_option_b_description: 'None.',
    equipment_option_a: [],
    equipment_option_b: [],
    effects: [],
  };
  importer.import({ documents: [catalogDocument('background', background)] });
  importer.import({
    documents: [catalogDocument('feat', {
      ...featProjectorV1Vector.aggregate,
      name: 'Unreferenced Feat',
    })],
  });

  const speciesKey = 'expanded:content.species:closure-species' as ContentKey;
  const backgroundKey = 'expanded:content.background:closure-background' as ContentKey;
  const unrelatedKey = 'expanded:content.feat:unreferenced-feat' as ContentKey;
  const speciesId = db.scalar<number>(
    'SELECT id FROM species_definitions WHERE content_key = ?', [speciesKey],
  );
  const backgroundId = db.scalar<number>(
    'SELECT id FROM background_definitions WHERE content_key = ?', [backgroundKey],
  );
  if (speciesId === null || backgroundId === null) {
    throw new Error('Closure fixture roots did not install under their asserted keys.');
  }
  return { featKey, speciesKey, backgroundKey, unrelatedKey, speciesId, backgroundId };
}

function seedClosureCharacter(
  db: DatabaseContext,
  fixture: ClosureFixture,
): number {
  const characterId = db.exec(
    `INSERT INTO characters (name, archived_at)
     VALUES ('Closure Hero', '2042-03-04T05:06:07.000Z')`,
  ).lastInsertId;
  db.exec(
    `INSERT INTO character_source_instances (
       character_id, instance_uuid, source_type, source_definition_id,
       display_name
     ) VALUES
       (?, 'closure-species-source', 'species', ?, 'Closure Species'),
       (?, 'closure-background-source', 'background', ?, 'Closure Background')`,
    [characterId, fixture.speciesId, characterId, fixture.backgroundId],
  );
  return characterId;
}

function rekeyExternalContentAsDerived(
  db: DatabaseContext,
  kind: string,
  assertedKey: ContentKey,
): ContentKey {
  const derivedKey = `expanded:content.v1:${'a'.repeat(64)}` as ContentKey;
  const rootTable = kind === 'feat' ? 'feat_definitions' : null;
  if (rootTable === null) throw new Error(`Unsupported derived fixture ${kind}.`);
  db.transaction((transaction) => {
    transaction.exec('PRAGMA defer_foreign_keys = ON');
    transaction.exec(
      `UPDATE catalog_content_fingerprints SET content_key = ?
       WHERE content_kind = ? AND content_key = ?`,
      [derivedKey, kind, assertedKey],
    );
    transaction.exec(
      `UPDATE ${rootTable} SET content_key = ? WHERE content_key = ?`,
      [derivedKey, assertedKey],
    );
    transaction.exec(
      `UPDATE species_definitions
       SET grant_rules = replace(grant_rules, ?, ?)`,
      [assertedKey, derivedKey],
    );
    transaction.exec(
      `UPDATE background_templates
       SET default_origin_feat_content_key = ?
       WHERE default_origin_feat_content_key = ?`,
      [derivedKey, assertedKey],
    );
    transaction.exec(
      `UPDATE catalog_content_identities
       SET content_key = ?, key_kind = 'derived'
       WHERE content_kind = ? AND content_key = ?`,
      [derivedKey, kind, assertedKey],
    );
  });
  return derivedKey;
}

function manifestEnumeration(document: {
  readonly content: readonly { readonly kind: string; readonly content_key: string }[];
}): readonly string[] {
  return document.content.map((entry) => `${entry.kind}:${entry.content_key}`);
}

function emptyHistoricalSpellDefinitions() {
  return {
    spell_identities: [], spell_identity_aliases: [], spell_versions: [],
    spell_version_publications: [], spell_list_memberships: [],
    spell_version_tags: [], spell_version_damage_types: [],
    spell_version_conditions: [], spell_version_attack_modes: [],
    spell_version_save_abilities: [], spell_version_upcast_levels: [],
    spell_version_cantrip_upgrade_levels: [],
  };
}

describe('portable content manifests', () => {
  it('CI5-PW-R40-FINGERPRINT finalizes parity fixture spells before portable export', async () => {
    const fixture = await workspaceFixtureImage();
    const sqlite3 = await getSqlite3();
    const storage = new MemoryDatabaseStorage(sqlite3);
    await storage.replaceFile(Uint8Array.from(fixture.bytes));
    const lifecycle = createApplicationLifecycle(sqlite3, storage);
    lifecycle.open();
    try {
      const document = exportCharacterBackup(
        lifecycle.database,
        fixture.ids.character,
        exportedAt,
      );
      expect(document.content.some((entry) =>
        entry.kind === 'spell' &&
        entry.content_key.startsWith('2024:content.spell:'),
      )).toBe(true);
    } finally {
      lifecycle.close();
    }
  });

  it('CI5-CLOSURE-EXACT enumerates exactly two referenced creations plus their transitive external reference', async () => {
    const source = await database();
    const fixture = seedClosureLibrary(source);
    const document = exportCharacterBackup(
      source,
      seedClosureCharacter(source, fixture),
      exportedAt,
    );

    expect(manifestEnumeration(document)).toEqual([
      'feat:expanded:content.feat:keen-memory',
      'species:expanded:content.species:closure-species',
      'background:expanded:content.background:closure-background',
    ]);
    expect(manifestEnumeration(document)).not.toContain(
      'feat:expanded:content.feat:unreferenced-feat',
    );
    expect(document.character.archived_at).toBe('2042-03-04T05:06:07.000Z');
  });

  it('CI5-D198-PORTABLE-KEY reprojects surviving derived content under an asserted name key', async () => {
    const source = await database();
    const fixture = seedClosureLibrary(source);
    const derivedKey = rekeyExternalContentAsDerived(
      source,
      'feat',
      fixture.featKey,
    );
    const document = exportCharacterBackup(
      source,
      seedClosureCharacter(source, fixture),
      exportedAt,
    );

    expect(manifestEnumeration(document)).toContain(
      'feat:expanded:content.feat:keen-memory',
    );
    expect(JSON.stringify(document)).not.toContain(derivedKey);

    const target = await database();
    importCharacterBackup(target, document);
    expect(target.oneRaw(
      `SELECT key_kind, content_key FROM catalog_content_identities
       WHERE content_kind = 'feat'`,
    )).toEqual({
      key_kind: 'asserted',
      content_key: fixture.featKey,
    });
  });

  it.each([
    ['wrong slug', 'expanded:content.species:not-closure-species'],
    ['wrong kind segment', 'expanded:content.background:closure-species'],
    ['wrong edition segment', '2024:content.species:closure-species'],
  ])('refuses a portable asserted key with a %s', async (_label, assertedKey) => {
    const source = await database();
    const fixture = seedClosureLibrary(source);
    const document = structuredClone(exportCharacterBackup(
      source,
      seedClosureCharacter(source, fixture),
      exportedAt,
    ));
    const species = document.content.find((entry) => entry.kind === 'species');
    if (species === undefined) throw new Error('Species fixture is missing.');
    (species as { content_key: string }).content_key = assertedKey;

    const target = await database();
    expect(() => importCharacterBackup(target, document)).toThrow(
      /content_key does not match its aggregate kind, edition, and name/,
    );
  });

  it('CI5-CROSS-IMPORT-CONVERGENCE imports DB-A export into DB-B twice without duplicate content', async () => {
    const source = await database();
    const fixture = seedClosureLibrary(source);
    const document = exportCharacterBackup(
      source,
      seedClosureCharacter(source, fixture),
      exportedAt,
    );
    const target = await database();

    importCharacterBackup(target, document);
    const afterFirst = target.allRaw(
      `SELECT content_kind, content_key FROM catalog_content_identities
       ORDER BY content_kind, content_key`,
    );
    importCharacterBackup(target, document);

    expect(target.allRaw(
      `SELECT content_kind, content_key FROM catalog_content_identities
       ORDER BY content_kind, content_key`,
    )).toEqual(afterFirst);
    expect(afterFirst).toEqual([
      { content_kind: 'background', content_key: fixture.backgroundKey },
      { content_kind: 'feat', content_key: fixture.featKey },
      { content_kind: 'species', content_key: fixture.speciesKey },
    ]);
    expect(target.scalar<number>('SELECT count(*) FROM feat_definitions')).toBe(1);
    expect(target.scalar<number>('SELECT count(*) FROM species_definitions')).toBe(1);
    expect(target.scalar<number>('SELECT count(*) FROM background_definitions')).toBe(1);
    expect(target.scalar<number>('SELECT count(*) FROM characters')).toBe(2);
  });

  it('CI5-LIBRARY-SELECTED-SUBSET round-trips only the selected creation closure', async () => {
    const source = await database();
    const fixture = seedClosureLibrary(source);
    const document = exportSelectedLibraryContent(
      source,
      [fixture.speciesKey],
      exportedAt,
    );
    expect(document.selected_content_keys).toEqual([fixture.speciesKey]);
    expect(manifestEnumeration(document)).toEqual([
      'feat:expanded:content.feat:keen-memory',
      'species:expanded:content.species:closure-species',
    ]);

    const target = await database();
    importLibraryDocument(target, document);
    expect(exportSelectedLibraryContent(
      target,
      [fixture.speciesKey],
      exportedAt,
    )).toEqual(document);
    expect(target.scalar<number>('SELECT count(*) FROM background_definitions')).toBe(0);
    expect(target.scalar<number>(
      'SELECT count(*) FROM feat_definitions WHERE content_key = ?',
      [fixture.unrelatedKey],
    )).toBe(0);
  });

  it('CI5-LIBRARY-WHOLE exports every installed external creation as a library document', async () => {
    const source = await database();
    seedClosureLibrary(source);
    const document = exportWholeLibrary(source, exportedAt);

    expect(document.format).toBe('dnd-multiclass-spells/library');
    expect(document.version).toBe(1);
    expect(document.selection).toBe('all');
    expect(manifestEnumeration(document)).toEqual([
      'feat:expanded:content.feat:keen-memory',
      'feat:expanded:content.feat:unreferenced-feat',
      'species:expanded:content.species:closure-species',
      'background:expanded:content.background:closure-background',
    ]);
  });

  it('CI5-ITEM-DEFINITION round-trips attunement and the complete ability-override definition effect', async () => {
    const source = await database();
    new CatalogImporter(source).import({
      documents: [JSON.stringify([{
        kind: 'item',
        name: 'Giant Belt',
        edition: 'expanded',
        description: 'Raises strength while worn.',
        requiresAttunement: true,
        effects: [{
          kind: 'ability_override',
          ability: 'strength',
          maximum: 23,
          label: 'Giant strength',
          notes: 'Applies while worn.',
        }],
      }])],
    });
    const itemKey = 'expanded:content.item:giant-belt' as ContentKey;
    const document = exportSelectedLibraryContent(source, [itemKey], exportedAt);
    expect(manifestEnumeration(document)).toEqual([
      'item:expanded:content.item:giant-belt',
    ]);

    const target = await database();
    importLibraryDocument(target, document);
    expect(target.oneRaw(
      `SELECT name, description, requires_attunement
       FROM item_definitions WHERE content_key = ?`,
      [itemKey],
    )).toEqual({
      name: 'Giant Belt',
      description: 'Raises strength while worn.',
      requires_attunement: 1,
    });
    expect(target.allRaw(
      `SELECT sort_order, effect_kind, ability, maximum, label, notes
       FROM item_definition_effects
       WHERE item_definition_id = (
         SELECT id FROM item_definitions WHERE content_key = ?
       )`,
      [itemKey],
    )).toEqual([{
      sort_order: 1,
      effect_kind: 'ability_override',
      ability: 'strength',
      maximum: 23,
      label: 'Giant strength',
      notes: 'Applies while worn.',
    }]);
  });

  it('CI5-CHARACTER-ITEM-STATE remaps quantities, attunement slots, and ability overrides', async () => {
    const source = await database();
    const characterId = source.exec(
      "INSERT INTO characters (name) VALUES ('Equipped Hero')",
    ).lastInsertId;
    const firstItemId = source.exec(
      `INSERT INTO character_items (character_id, name, quantity)
       VALUES (?, 'Potion', 3)`,
      [characterId],
    ).lastInsertId;
    const secondItemId = source.exec(
      `INSERT INTO character_items (character_id, name, quantity)
       VALUES (?, 'Giant Belt', 1)`,
      [characterId],
    ).lastInsertId;
    source.exec(
      `INSERT INTO character_attunement_slots (
         character_id, slot_1_item_id, slot_2_item_id
       ) VALUES (?, ?, ?)`,
      [characterId, secondItemId, firstItemId],
    );
    source.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, ability, maximum, label
       ) VALUES (?, 1, 'ability_override', 'strength', 23, 'Giant strength')`,
      [characterId],
    );

    const target = await database();
    const imported = importCharacterBackup(
      target,
      exportCharacterBackup(source, characterId, exportedAt),
    );
    const items = target.allRaw(
      `SELECT id, name, quantity FROM character_items
       WHERE character_id = ? ORDER BY id`,
      [imported.characterId],
    );
    expect(items.map(({ name, quantity }) => ({ name, quantity }))).toEqual([
      { name: 'Potion', quantity: 3 },
      { name: 'Giant Belt', quantity: 1 },
    ]);
    expect(target.oneRaw(
      `SELECT slot_1_item_id, slot_2_item_id, slot_3_item_id
       FROM character_attunement_slots WHERE character_id = ?`,
      [imported.characterId],
    )).toEqual({
      slot_1_item_id: items[1]!.id,
      slot_2_item_id: items[0]!.id,
      slot_3_item_id: null,
    });
    expect(target.oneRaw(
      `SELECT effect_kind, ability, maximum, label FROM character_effects
       WHERE character_id = ?`,
      [imported.characterId],
    )).toEqual({
      effect_kind: 'ability_override',
      ability: 'strength',
      maximum: 23,
      label: 'Giant strength',
    });
  });

  it('CI5-V2-ABSENT-NOT-INVENTED imports carried v2 content without synthesizing a closure', async () => {
    const source = await database();
    const sourceCharacterId = source.exec(
      "INSERT INTO characters (name) VALUES ('Historical Hero')",
    ).lastInsertId;
    const historical = structuredClone(
      exportCharacterBackup(source, sourceCharacterId, exportedAt),
    ) as unknown as Record<string, unknown>;
    historical.version = PRE_FLAVOR_CHARACTER_BACKUP_VERSION;
    historical.spell_definitions = emptyHistoricalSpellDefinitions();
    delete historical.content;
    const character = historical.character as Record<string, unknown>;
    delete character.alignment;
    delete character.appearance;
    delete character.backstory;
    delete character.archived_at;

    const target = await database();
    seedClosureLibrary(target);
    const before = target.allRaw(
      `SELECT content_kind, content_key FROM catalog_content_identities
       ORDER BY content_kind, content_key`,
    );
    const imported = importCharacterBackup(target, historical);

    expect(target.allRaw(
      `SELECT content_kind, content_key FROM catalog_content_identities
       ORDER BY content_kind, content_key`,
    )).toEqual(before);
    expect(target.oneRaw(
      'SELECT name, archived_at FROM characters WHERE id = ?',
      [imported.characterId],
    )).toEqual({ name: 'Historical Hero', archived_at: null });
  });

  it('CI5-V4-FROZEN imports the immediately previous archived character shape through its adapter', async () => {
    const source = await database();
    const characterId = source.exec(
      `INSERT INTO characters (name, archived_at)
       VALUES ('V4 Hero', '2042-03-04T05:06:07.000Z')`,
    ).lastInsertId;
    const previous = structuredClone(
      exportCharacterBackup(source, characterId, exportedAt),
    ) as unknown as Record<string, unknown>;
    previous.version = PREVIOUS_CHARACTER_BACKUP_VERSION;
    previous.spell_definitions = emptyHistoricalSpellDefinitions();
    delete previous.content;

    const target = await database();
    const imported = importCharacterBackup(target, previous);
    expect(PREVIOUS_CHARACTER_BACKUP_VERSION).toBe(4);
    expect(target.oneRaw(
      'SELECT name, archived_at FROM characters WHERE id = ?',
      [imported.characterId],
    )).toEqual({
      name: 'V4 Hero',
      archived_at: '2042-03-04T05:06:07.000Z',
    });
  });

  it('binds a character import plan token to the complete character payload', async () => {
    const source = await database();
    const fixture = seedClosureLibrary(source);
    const first = exportCharacterBackup(
      source,
      seedClosureCharacter(source, fixture),
      exportedAt,
    );
    const swapped = structuredClone(first);
    (swapped.character as { name: string }).name = 'Swapped Character';

    const target = await database();
    const plan = planCharacterBackupImport(target, first);
    const committed = commitCharacterBackupImport(target, swapped, plan.token);

    expect(committed).toEqual(expect.objectContaining({ kind: 'stale-plan' }));
    expect(target.scalar<number>('SELECT count(*) FROM characters')).toBe(0);
    expect(target.scalar<number>('SELECT count(*) FROM catalog_content_identities')).toBe(0);
  });

  it('CI5-ATOMIC refuses an unavailable character reference during planning without writes', async () => {
    const source = await database();
    const fixture = seedClosureLibrary(source);
    const document = structuredClone(exportCharacterBackup(
      source,
      seedClosureCharacter(source, fixture),
      exportedAt,
    ));
    const speciesReferences = document.references.species_definitions as unknown as Array<{
      id: number;
      content_key: string;
    }>;
    speciesReferences[0] = {
      ...speciesReferences[0]!,
      content_key: 'expanded:content.species:unavailable',
    };

    const target = await database();
    expect(() => planCharacterBackupImport(target, document)).toThrow(
      'Character backup requires unavailable active species_definitions content_key "expanded:content.species:unavailable".',
    );
    expect(target.scalar<number>('SELECT count(*) FROM catalog_content_identities')).toBe(0);
    expect(target.scalar<number>('SELECT count(*) FROM catalog_content_fingerprints')).toBe(0);
    expect(target.scalar<number>('SELECT count(*) FROM characters')).toBe(0);
    expect(target.scalar<number>('SELECT count(*) FROM catalog_content_match_decisions')).toBe(0);
  });
});
