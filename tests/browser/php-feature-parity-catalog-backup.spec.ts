import { expect, test } from './fixtures/parallel-test';
import {
  catalogRecord,
  workspaceFixtureImage,
  catalogBaseFixtureImage,
  type FixtureImage,
  type WorkspaceFixtureIds,
  type SourceCatalogIds,
} from './fixtures/php-parity';
import {
  databaseBytes,
  execute,
  forCharacter,
  install,
  portableTableCounts,
  ready,
  rejectedRpc,
  rows,
  rpc,
  type Row,
} from './fixtures/php-feature-parity-helpers';

let workspaceImage: FixtureImage<WorkspaceFixtureIds>;
let catalogImage: FixtureImage<SourceCatalogIds>;

test.beforeAll(async () => {
  [workspaceImage, catalogImage] =
    await Promise.all([
      workspaceFixtureImage(),
      catalogBaseFixtureImage(),
    ]);
});

test('imports the real index into identities versions publications and normalized pivots idempotently', async ({
  page,
}) => {
  // Measured at 16.7s alone on Chromium; allow for concurrent-suite contention.
  test.setTimeout(60_000);
  await install(page, catalogImage);
  const legacy = catalogRecord({
    versionKey: '2014:php-parity-spell',
    edition: '2014',
    name: 'PHP Parity Spell',
    sourceBooks: ['Legacy Book'],
    attackModes: ['ranged_spell'],
    spellLists: ['Wizard'],
  });
  const modernA = catalogRecord({
    sourceBooks: ['Modern A'],
    sourcePage: 81,
  });
  const modernB = catalogRecord({
    sourceBooks: ['Modern B'],
    sourcePage: 82,
    spellLists: ['Cleric', 'Wizard'],
    attackModes: ['melee_spell', 'ranged_spell'],
    tags: ['beta', 'parity'],
  });
  const documents = [
    JSON.stringify([legacy, modernA]),
    JSON.stringify([modernB]),
  ];
  const first = await rpc<any>(page, 'catalog.import', { documents });
  expect(first).toMatchObject({
    created: 2,
    identities_created: 1,
    publications_created: 3,
    memberships_created: 3,
    attack_modes_created: 3,
    save_abilities_created: 2,
  });
  const versions = (await rows(page, 'spell_versions')).filter(
    (row) => row.provenance === 'import',
  );
  const importedVersionIds = new Set(
    versions.map((version) => Number(version.id)),
  );
  const importedMemberships = (
    await Promise.all(
      [...importedVersionIds].map((spellVersionId) =>
        page.evaluate(
          (id) =>
            window.staticApp.inspectRows('spell_list_memberships', {
              spell_version_id: id,
            }),
          spellVersionId,
        ),
      ),
    )
  ).flat();
  const importedIdentity = (await rows(page, 'spell_identities')).find(
    (row) => row.content_key === 'php-parity-spell',
  )!;
  expect(
    versions.map((row) => ({
      content_key: row.content_key,
      rules_edition: row.rules_edition,
      spell_identity_id: row.spell_identity_id,
    })),
  ).toEqual([
    {
      content_key: '2014:php-parity-spell',
      rules_edition: '2014',
      spell_identity_id: importedIdentity.id,
    },
    {
      content_key: '2024:php-parity-spell',
      rules_edition: '2024',
      spell_identity_id: importedIdentity.id,
    },
  ]);
  expect(
    (await rows(page, 'spell_version_publications')).map(
      (row) => ({
        version: versions.find((version) => version.id === row.spell_version_id)!
          .content_key,
        book: row.source_book,
        page: row.source_page,
      }),
    ),
  ).toEqual([
    { version: '2014:php-parity-spell', book: 'Legacy Book', page: 81 },
    { version: '2024:php-parity-spell', book: 'Modern A', page: 81 },
    { version: '2024:php-parity-spell', book: 'Modern B', page: 82 },
  ]);
  expect(
    importedMemberships
      .filter((row) =>
        importedVersionIds.has(Number(row.spell_version_id)),
      )
      .map((row) => ({
        version: versions.find(
          (version) => version.id === row.spell_version_id,
        )!.content_key,
        list: row.spell_list_key,
      })),
  ).toEqual([
    { version: '2014:php-parity-spell', list: 'Wizard' },
    { version: '2024:php-parity-spell', list: 'Cleric' },
    { version: '2024:php-parity-spell', list: 'Wizard' },
  ]);
  expect(
    (await rows(page, 'spell_version_attack_modes')).map((row) => ({
      version: versions.find((version) => version.id === row.spell_version_id)!
        .content_key,
      mode: row.attack_mode,
    })),
  ).toEqual([
    { version: '2014:php-parity-spell', mode: 'ranged_spell' },
    { version: '2024:php-parity-spell', mode: 'melee_spell' },
    { version: '2024:php-parity-spell', mode: 'ranged_spell' },
  ]);
  expect(
    (await rows(page, 'spell_version_save_abilities')).map((row) => ({
      version: versions.find((version) => version.id === row.spell_version_id)!
        .content_key,
      ability: row.save_ability,
    })),
  ).toEqual([
    { version: '2014:php-parity-spell', ability: 'wisdom' },
    { version: '2024:php-parity-spell', ability: 'wisdom' },
  ]);
  expect(
    new Set(
      (await rows(page, 'spell_version_tags'))
        .filter(
          (row) =>
            versions.find((version) => version.id === row.spell_version_id)!
              .content_key === '2024:php-parity-spell',
        )
        .map((row) => row.tag),
    ),
  ).toEqual(new Set(['beta', 'concentration', 'parity', 'ritual']));
  const ids = versions.map((row) => ({
    id: row.id,
    content_key: row.content_key,
  }));
  expect(
    await rpc<any>(page, 'catalog.import', { documents }),
  ).toMatchObject({
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
    (await rows(page, 'spell_versions'))
      .filter((row) => row.provenance === 'import')
      .map((row) => ({
        id: row.id,
        content_key: row.content_key,
      })),
  ).toEqual(ids);
  await page.reload();
  await ready(page);
  expect(
    (await rows(page, 'spell_versions')).filter(
      (row) => row.provenance === 'import',
    ),
  ).toHaveLength(2);
});

test('whole-database and portable-character export/import round-trip, corrupt-version rollback, and reload', async ({
  page,
}) => {
  // The four-worker parallel pool measured 39.4s; 100s preserves at least
  // 2.5x wall-clock headroom under parallel-pool contention.
  test.setTimeout(100_000);
  await install(page, workspaceImage);
  const initialRows = await rows(page, 'characters');
  const exported = await page.evaluate(async (characterId) => {
    const character = await window.appRpc.call<
      { characterId: number },
      any
    >('backup.exportCharacter', { characterId });
    const database = await window.appRpc.call<
      Record<string, never>,
      any
    >('backup.exportDatabase', {});
    return { character, database };
  }, workspaceImage.ids.character);
  expect(exported.character).toMatchObject({
    format: 'dnd-multiclass-spells/character',
    version: 4,
    source_character_id: workspaceImage.ids.character,
  });
  expect(exported.database).toMatchObject({
    format: 'dnd-multiclass-spells/database',
    version: 1,
  });

  await rpc(page, 'queries.characters.create', { name: 'Discarded' });
  await rpc(page, 'backup.importDatabase', {
    backup: exported.database,
  });
  expect(await rows(page, 'characters')).toEqual(initialRows);

  const imported = await rpc<any>(page, 'backup.importCharacter', {
    document: exported.character,
  });
  expect(imported.characterId).not.toBe(workspaceImage.ids.character);
  expect((await rows(page, 'characters')).map((row) => row.name)).toEqual([
    'R40 Golden',
    'R40 Golden',
  ]);
  expect(
    forCharacter(
      await rows(page, 'spell_selection_slots'),
      imported.characterId,
    ).length,
  ).toBe(
    forCharacter(
      await rows(page, 'spell_selection_slots'),
      workspaceImage.ids.character,
    ).length,
  );
  expect(await portableTableCounts(page, imported.characterId)).toEqual(
    Object.fromEntries(
      Object.entries(exported.character.tables).map(([table, tableRows]) => [
        table,
        (tableRows as Row[]).length,
      ]),
    ),
  );

  const countBeforeCorruption = (await rows(page, 'characters')).length;
  const beforeCorruption = await databaseBytes(page);
  const corruptCharacter = structuredClone(exported.character);
  corruptCharacter.version = 99;
  expect(
    (
      await rejectedRpc(page, 'backup.importCharacter', {
        document: corruptCharacter,
      })
    ).message,
  ).toBe('Unsupported character backup version 99.');
  const corruptDatabase = structuredClone(exported.database);
  corruptDatabase.version = 99;
  expect(
    (
      await rejectedRpc(page, 'backup.importDatabase', {
        backup: corruptDatabase,
      })
    ).message,
  ).toBe('Unsupported database backup version 99.');
  expect(await databaseBytes(page)).toEqual(beforeCorruption);
  expect(await rows(page, 'characters')).toHaveLength(countBeforeCorruption);
  await page.reload();
  await ready(page);
  expect(await rows(page, 'characters')).toHaveLength(2);
  expect(
    forCharacter(
      await rows(page, 'spell_selection_slots'),
      imported.characterId,
    ).length,
  ).toBeGreaterThan(0);
});

test('fresh-profile catalog import → create/use → export → reload durability journey', async ({
  page,
}) => {
  // Measured at 16.4s alone on Chromium; allow for concurrent-suite contention.
  test.setTimeout(60_000);
  await install(page, catalogImage);
  const imported = await rpc<any>(page, 'catalog.import', {
    documents: [
      JSON.stringify([
        catalogRecord({
          identityKey: 'journey-spell',
          versionKey: '2024:journey-spell',
          name: 'Journey Spell',
          level: 0,
          concentration: false,
          ritual: false,
          tags: [],
          saveAbilities: [],
          sourceBooks: ['Journey Book'],
          sourceSlug: 'journey-spell',
        }),
      ]),
    ],
  });
  expect(imported.created).toBe(1);
  const spell = (await rows(page, 'spell_versions')).find(
    (row) => row.content_key === '2024:journey-spell',
  )!;
  const character = await rpc<any>(page, 'queries.characters.create', {
    name: 'Fresh Journey',
  });
  const wizardClass = (await rows(page, 'class_definitions')).find(
    (row) => row.name === 'Wizard',
  )!;
  await execute(
    page,
    character.id,
    0,
    {
      type: 'add_source',
      source_type: 'class',
      source_definition_id: wizardClass.id,
      config: { level: 1 },
    },
    28,
  );
  const slot = forCharacter(
    await rows(page, 'spell_selection_slots'),
    character.id,
  ).find(
    (row) =>
      row.rule_key === 'wizard-cantrips' && row.ordinal === 1,
  )!;
  expect(
    await rpc<any[]>(page, 'queries.eligibleSpells.search', {
      character_id: character.id,
      slot_id: slot.id,
      query: 'Journey Spell',
    }),
  ).toEqual([
    {
      id: spell.id,
      name: 'Journey Spell',
      level: 0,
      school: 'Evocation',
      ritual: false,
      concentration: false,
      edition: '2024',
    },
  ]);
  await execute(
    page,
    character.id,
    1,
    {
      type: 'set_slot',
      slot_id: slot.id,
      mode: 'select',
      spell_version_id: spell.id,
    },
    280,
  );
  const backups = await page.evaluate(async (characterId) => ({
    character: await window.appRpc.call('backup.exportCharacter', {
      characterId,
    }),
    database: await window.appRpc.call('backup.exportDatabase', {}),
  }), character.id);
  expect(backups.character).toMatchObject({
    format: 'dnd-multiclass-spells/character',
    source_character_id: character.id,
  });
  expect(backups.database).toMatchObject({
    format: 'dnd-multiclass-spells/database',
    version: 1,
  });
  expect(
    (await rows(page, 'spell_selection_slots')).find(
      (row) => row.id === slot.id,
    ),
  ).toMatchObject({
    current_spell_version_id: spell.id,
    selection_eligibility: 'valid',
  });

  await page.reload();
  await ready(page);
  expect(
    (await rows(page, 'characters')).find(
      (row) => row.id === character.id,
    ),
  ).toMatchObject({ name: 'Fresh Journey', revision: 2 });
  expect(
    (await rows(page, 'spell_selection_slots')).find(
      (row) => row.id === slot.id,
    ),
  ).toMatchObject({ current_spell_version_id: spell.id });
  const clone = await rpc<any>(page, 'backup.importCharacter', {
    document: backups.character,
  });
  expect(await rows(page, 'characters')).toHaveLength(2);
  expect(
    forCharacter(
      await rows(page, 'spell_selection_slots'),
      clone.characterId,
    ).some((row) => row.current_spell_version_id === spell.id),
  ).toBe(true);
});
