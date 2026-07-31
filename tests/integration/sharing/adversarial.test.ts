import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import {
  rowId,
  sqlNullableString,
  sqlString,
} from '../../../src/db/codecs';
import { DatabaseContext } from '../../../src/db/database';
import { GrantRuleSlotGenerator } from '../../../src/grants/grant-rule-slot-generator';
import {
  ensureSharedSpell,
  exportCharacterShare,
  importCharacterShare,
  previewCharacterShare,
} from '../../../src/sharing/character-share';
import {
  decodeShareFragment,
  encodeShareFragment,
  positionalToShareDocument,
  shareDocumentToPositional,
} from '../../../src/sharing/codec';
import {
  CHARACTER_SHARE_FORMAT,
  CHARACTER_SHARE_VERSION,
  SHARE_LIMITS,
  ShareValidationError,
  type CharacterShareDocument,
  validateShareDocument,
} from '../../../src/sharing/schema';
import { ShareImportCompatibilityError } from '../../../src/sharing/import-issues';
import { validateCharacterCommandPayload } from '../../../src/commands/payload-validator';
import { CHARACTER_TEXT_LIMITS } from '../../../src/domain/character-limits';
import {
  WEAPON_RANGE_MAX_FEET,
  WEAPON_TEXT_LIMITS,
} from '../../../src/domain/weapon-limits';
import { getSqlite3, openTestDatabase } from '../../helpers/open-db';

const connections: Database[] = [];

afterEach(() => {
  for (const connection of connections.splice(0)) {
    connection.close();
  }
});

async function database(): Promise<DatabaseContext> {
  const connection = await openTestDatabase();
  connections.push(connection);
  return new DatabaseContext(connection);
}

function minimalDocument(
  overrides: Partial<CharacterShareDocument> = {},
): CharacterShareDocument {
  return {
    format: CHARACTER_SHARE_FORMAT,
    version: CHARACTER_SHARE_VERSION,
    character: { name: 'Adversary' },
    classes: [],
    sources: [],
    selections: [],
    spellbook: [],
    preferences: [],
    overrides: [],
    ...overrides,
  };
}

describe('combined character level validation', () => {
  const classRow = (id: number, level: number) => ({
    id,
    classKey: `test:class:${String(id)}`,
    level,
    start: level,
  });

  it('permits no classes and total level 20, but refuses 21', () => {
    expect(
      validateShareDocument(minimalDocument({ classes: [] })).classes,
    ).toEqual([]);
    expect(
      validateShareDocument(
        minimalDocument({
          classes: [classRow(0, 12), classRow(1, 8)],
        }),
      ).classes.map((entry) => entry.level),
    ).toEqual([12, 8]);
    expect(() =>
      validateShareDocument(
        minimalDocument({
          classes: [classRow(0, 12), classRow(1, 9)],
        }),
      ),
    ).toThrow('combined class levels must not exceed 20.');
  });
});

async function throughShareLink(
  document: CharacterShareDocument,
): Promise<CharacterShareDocument> {
  return decodeShareFragment(await encodeShareFragment(document));
}

async function arbitraryFragment(value: unknown): Promise<string> {
  return fragmentFromBytes(
    new TextEncoder().encode(JSON.stringify(value)),
  );
}

async function fragmentFromBytes(bytes: Uint8Array): Promise<string> {
  const compressed = new Uint8Array(
    await new Response(
      new Blob([new Uint8Array(bytes).buffer])
        .stream()
        .pipeThrough(new CompressionStream('gzip')),
    ).arrayBuffer(),
  );
  let binary = '';
  for (const byte of compressed) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/g, '');
}

function spell(
  db: DatabaseContext,
  key: string,
  name: string,
  level = 1,
): number {
  const identityId = db.exec(
    `INSERT INTO spell_identities
       (content_key, canonical_name, normalized_name)
     VALUES (?, ?, ?)`,
    [`identity:${key}`, name, name.toLowerCase()],
  ).lastInsertId;
  return db.exec(
    `INSERT INTO spell_versions (
       content_key, spell_identity_id, display_name, rules_edition,
       level, school, is_active
     ) VALUES (?, ?, ?, '2024', ?, 'Abjuration', 1)`,
    [key, identityId, name, level],
  ).lastInsertId;
}

function definition(
  db: DatabaseContext,
  table:
    | 'feat_definitions'
    | 'species_definitions'
    | 'background_definitions',
  key: string,
  name: string,
  rules: readonly Record<string, unknown>[] = [],
  repeatable = false,
): number {
  return db.exec(
    `INSERT INTO ${table} (
       content_key, name, rules_edition, repeatable, grant_rules
     ) VALUES (?, ?, '2024', ?, ?)`,
    [key, name, repeatable ? 1 : 0, JSON.stringify(rules)],
  ).lastInsertId;
}

function classDefinition(
  db: DatabaseContext,
  key: string,
  name: string,
  rules: readonly Record<string, unknown>[] = [],
): number {
  const id = db.exec(
    `INSERT INTO class_definitions (
       content_key, name, rules_edition, spellcasting_ability,
       progression_type
     ) VALUES (?, ?, '2024', 'intelligence', 'full')`,
    [key, name],
  ).lastInsertId;
  db.exec(
    `INSERT INTO class_progressions (
       class_definition_id, class_level, grant_rules
     ) VALUES (?, 1, ?)`,
    [id, JSON.stringify(rules)],
  );
  return id;
}

function character(
  db: DatabaseContext,
  name = 'Adversarial Hero',
  scores: readonly number[] = [10, 10, 10, 10, 10, 10],
): number {
  return db.exec(
    `INSERT INTO characters (
       name, strength, dexterity, constitution, intelligence, wisdom,
       charisma
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [name, ...scores],
  ).lastInsertId;
}

function source(
  db: DatabaseContext,
  characterId: number,
  type: 'class' | 'subclass' | 'feat' | 'species' | 'background',
  definitionId: number,
  displayName: string,
  config: Record<string, unknown>,
  acquired: number,
): number {
  return db.exec(
    `INSERT INTO character_source_instances (
       character_id, instance_uuid, source_type, source_definition_id,
       display_name, config, acquired_at_character_level, state
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
    [
      characterId,
      crypto.randomUUID(),
      type,
      definitionId,
      displayName,
      JSON.stringify(config),
      acquired,
    ],
  ).lastInsertId;
}

function select(
  db: DatabaseContext,
  sourceId: number,
  ruleKey: string,
  ordinal: number,
  spellId: number,
  state: 'active' | 'kept_override' = 'active',
): void {
  db.exec(
    `UPDATE spell_selection_slots
     SET current_spell_version_id = ?, state = ?,
         selection_eligibility = 'valid'
     WHERE source_instance_id = ? AND rule_key = ? AND ordinal = ?`,
    [spellId, state, sourceId, ruleKey, ordinal],
  );
}

function selectedChoices(db: DatabaseContext, characterId: number) {
  return db.allRaw(
    `SELECT source.source_type, source.display_name, source.config,
            slot.rule_key, slot.ordinal, version.content_key, slot.state
     FROM spell_selection_slots AS slot
     INNER JOIN character_source_instances AS source
       ON source.id = slot.source_instance_id
     INNER JOIN spell_versions AS version
       ON version.id = slot.current_spell_version_id
     WHERE slot.character_id = ?
     ORDER BY source.source_type, source.display_name,
              slot.rule_key, slot.ordinal`,
    [characterId],
  );
}

function seedMagicInitiateCatalog(db: DatabaseContext, padding = false) {
  if (padding) {
    definition(
      db,
      'feat_definitions',
      '2024:feat:padding',
      'Padding',
    );
    spell(db, '2024:padding', 'Padding');
  }
  const spellIds = [
    spell(db, '2024:shield', 'Shield'),
    spell(db, '2024:guidance', 'Guidance', 0),
    spell(db, '2024:starry-wisp', 'Starry Wisp', 0),
  ];
  const featId = definition(
    db,
    'feat_definitions',
    '2024:feat:magic-initiate',
    'Magic Initiate',
    [
      {
        kind: 'choice_from_list',
        rule_key: 'magic-initiate-cantrips',
        count: 2,
        bucket: 'cantrip_known',
        list: '$config.chosen_list',
        level_min: 0,
        level_max: 0,
      },
      {
        kind: 'choice_from_list',
        rule_key: 'magic-initiate-level-one',
        count: 1,
        bucket: 'known',
        list: '$config.chosen_list',
        level_min: 1,
        level_max: 1,
      },
    ],
    true,
  );
  return { featId, spellIds };
}

function seedSemanticCatalog(db: DatabaseContext): void {
  const rule = (ruleKey: string) => [
    {
      kind: 'choice_from_query',
      rule_key: ruleKey,
      count: 1,
      bucket: 'prepared',
      level_min: 0,
      level_max: 9,
    },
  ];
  for (const [key, name] of [
    ['2024:shield', 'Shield'],
    ['2024:guidance', 'Guidance'],
    ['2024:misty-step', 'Misty Step'],
    ['2024:light', 'Light'],
  ] as const) {
    spell(db, key, name);
  }
  classDefinition(
    db,
    '2024:class:semantic-wizard',
    'Semantic Wizard',
    rule('wizard-choice'),
  );
  classDefinition(
    db,
    '2024:class:semantic-bard',
    'Semantic Bard',
    rule('bard-choice'),
  );
  definition(
    db,
    'feat_definitions',
    '2024:feat:semantic-feat',
    'Semantic Feat',
    rule('feat-choice'),
    true,
  );
  definition(
    db,
    'background_definitions',
    '2024:background:semantic-background',
    'Semantic Background',
    rule('background-choice'),
    true,
  );
}

function semanticDocument(): CharacterShareDocument {
  return {
    format: CHARACTER_SHARE_FORMAT,
    version: CHARACTER_SHARE_VERSION,
    character: {
      name: 'Semantic Hero',
      intelligence: 18,
      charisma: 16,
      allow_legacy: true,
    },
    classes: [
      {
        id: 0,
        classKey: '2024:class:semantic-wizard',
        level: 2,
        start: 1,
        ability: 'intelligence',
        config: { semantic: 'wizard' },
      },
      {
        id: 1,
        classKey: '2024:class:semantic-bard',
        level: 1,
        start: 3,
        ability: 'charisma',
        config: { semantic: 'bard' },
      },
    ],
    sources: [
      {
        id: 2,
        type: 'feat',
        key: '2024:feat:semantic-feat',
        name: 'Semantic Feat',
        config: { semantic: 'feat' },
        acquired: 2,
      },
      {
        id: 3,
        type: 'background',
        key: '2024:background:semantic-background',
        name: 'Semantic Background',
        config: { semantic: 'background' },
        acquired: 1,
      },
    ],
    selections: [
      {
        ref: 0,
        ruleKey: 'wizard-choice',
        ordinal: 1,
        spellKey: '2024:shield',
        spellName: 'Shield',
      },
      {
        ref: 1,
        ruleKey: 'bard-choice',
        ordinal: 1,
        spellKey: '2024:guidance',
        spellName: 'Guidance',
      },
      {
        ref: 2,
        ruleKey: 'feat-choice',
        ordinal: 1,
        spellKey: '2024:misty-step',
        spellName: 'Misty Step',
      },
      {
        ref: 3,
        ruleKey: 'background-choice',
        ordinal: 1,
        spellKey: '2024:light',
        spellName: 'Light',
        keep: true,
      },
    ],
    spellbook: [
      { spellKey: '2024:shield' },
      { spellKey: '2024:misty-step' },
    ],
    preferences: [
      { spellKey: '2024:shield', favourite: true },
      { spellKey: '2024:guidance', favourite: false },
    ],
    overrides: [
      { ruleKey: 'semantic-first', value: { count: 1 } },
      { ruleKey: 'semantic-second', value: ['x', false] },
    ],
    acknowledgements: [
      { warning: 'semantic-warning-a' },
      { warning: 'semantic-warning-b' },
    ],
    loadouts: [
      {
        name: 'Semantic loadout',
        entries: [
          { spellKey: '2024:shield', role: 'defense' },
          { spellKey: '2024:light', role: 'utility' },
        ],
      },
    ],
  };
}

function stableRows(rows: readonly Record<string, unknown>[]): string[] {
  return rows
    .map((row) =>
      JSON.stringify(
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            typeof value === 'string' &&
            (key === 'config' || key === 'value')
              ? JSON.parse(value)
              : value,
          ]),
        ),
      ),
    )
    .sort();
}

function semanticProjection(db: DatabaseContext, characterId: number) {
  const characterRow = db.oneRaw(
    `SELECT name, strength, dexterity, constitution, intelligence,
            wisdom, charisma, proficiency_bonus_override,
            rules_edition_preference, allow_legacy
     FROM characters WHERE id = ?`,
    [characterId],
  );
  if (characterRow === null) {
    throw new Error(`Character ${characterId} is missing.`);
  }
  const sources = db.allRaw(
    `SELECT source.source_type,
            COALESCE(class.content_key, subclass.content_key,
                     feat.content_key, species.content_key,
                     background.content_key) AS content_key,
            source.display_name, source.config,
            source.acquired_at_character_level
     FROM character_source_instances AS source
     LEFT JOIN class_definitions AS class
       ON source.source_type = 'class'
      AND class.id = source.source_definition_id
     LEFT JOIN subclass_definitions AS subclass
       ON source.source_type = 'subclass'
      AND subclass.id = source.source_definition_id
     LEFT JOIN feat_definitions AS feat
       ON source.source_type = 'feat'
      AND feat.id = source.source_definition_id
     LEFT JOIN species_definitions AS species
       ON source.source_type = 'species'
      AND species.id = source.source_definition_id
     LEFT JOIN background_definitions AS background
       ON source.source_type = 'background'
      AND background.id = source.source_definition_id
     WHERE source.character_id = ?`,
    [characterId],
  );
  const slots = db.allRaw(
    `SELECT source.source_type,
            COALESCE(class.content_key, subclass.content_key,
                     feat.content_key, species.content_key,
                     background.content_key) AS source_key,
            slot.rule_key, slot.ordinal, version.content_key AS spell_key,
            slot.state, slot.selection_eligibility
     FROM spell_selection_slots AS slot
     INNER JOIN character_source_instances AS source
       ON source.id = slot.source_instance_id
     LEFT JOIN class_definitions AS class
       ON source.source_type = 'class'
      AND class.id = source.source_definition_id
     LEFT JOIN subclass_definitions AS subclass
       ON source.source_type = 'subclass'
      AND subclass.id = source.source_definition_id
     LEFT JOIN feat_definitions AS feat
       ON source.source_type = 'feat'
      AND feat.id = source.source_definition_id
     LEFT JOIN species_definitions AS species
       ON source.source_type = 'species'
      AND species.id = source.source_definition_id
     LEFT JOIN background_definitions AS background
       ON source.source_type = 'background'
      AND background.id = source.source_definition_id
     INNER JOIN spell_versions AS version
       ON version.id = slot.current_spell_version_id
     WHERE slot.character_id = ?`,
    [characterId],
  );
  const spellbook = db.allRaw(
    `SELECT version.content_key
     FROM wizard_spellbook_entries AS entry
     INNER JOIN spell_versions AS version
       ON version.id = entry.spell_version_id
     WHERE entry.character_id = ?`,
    [characterId],
  );
  const preferences = db.allRaw(
    `SELECT version.content_key, preference.favourite
     FROM character_spell_preferences AS preference
     INNER JOIN spell_versions AS version
       ON version.id = preference.spell_version_id
     WHERE preference.character_id = ?`,
    [characterId],
  );
  const overrides = db.allRaw(
    `SELECT rule_key, value FROM character_rule_overrides
     WHERE character_id = ?`,
    [characterId],
  );
  const acknowledgements = db.allRaw(
    `SELECT warning_fingerprint FROM warning_acknowledgements
     WHERE character_id = ?`,
    [characterId],
  );
  const loadouts = db.allRaw(
    `SELECT loadout.name, version.content_key, entry.role
     FROM spell_loadouts AS loadout
     LEFT JOIN spell_loadout_entries AS entry
       ON entry.spell_loadout_id = loadout.id
     LEFT JOIN spell_versions AS version
       ON version.id = entry.spell_version_id
     WHERE loadout.character_id = ?`,
    [characterId],
  );
  return {
    character: characterRow,
    sources: stableRows(sources),
    slots: stableRows(slots),
    spellbook: stableRows(spellbook),
    preferences: stableRows(preferences),
    overrides: stableRows(overrides),
    acknowledgements: stableRows(acknowledgements),
    loadouts: stableRows(loadouts),
  };
}

function sourceIdentityRows(
  db: DatabaseContext,
  characterId: number,
): number[] {
  return db.all(
    `SELECT id FROM character_source_instances
     WHERE character_id = ? ORDER BY id`,
    [characterId],
    rowId,
  );
}

async function exportedDatabaseImage(
  db: DatabaseContext,
): Promise<Uint8Array> {
  const sqlite3 = await getSqlite3();
  return sqlite3.capi.sqlite3_js_db_export(db.connection).slice();
}

function dumpApplicationDatabase(db: DatabaseContext): void {
  const names = db.all(
    `SELECT name FROM sqlite_schema
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
     ORDER BY name`,
    undefined,
    (row) => sqlString(row, 'name'),
  );
  if (
    Number(
      db.scalar(
        `SELECT count(*) FROM sqlite_schema
         WHERE type = 'table' AND name = 'sqlite_sequence'`,
      ),
    ) === 1
  ) {
    names.push('sqlite_sequence');
  }
  for (const name of names) {
    const quoted = `"${name.replaceAll('"', '""')}"`;
    console.error(`${name}:`, db.allRaw(`SELECT * FROM ${quoted}`));
  }
}

async function expectImageUnchanged(
  db: DatabaseContext,
  action: () => unknown,
): Promise<void> {
  const before = await exportedDatabaseImage(db);
  expect(action).toThrow();
  const after = await exportedDatabaseImage(db);
  if (
    before.byteLength !== after.byteLength ||
    before.some((byte, index) => byte !== after[index])
  ) {
    dumpApplicationDatabase(db);
  }
  expect(Array.from(after)).toEqual(Array.from(before));
}

function expectDatabaseIntegrity(db: DatabaseContext): void {
  expect(db.scalar('PRAGMA quick_check')).toBe('ok');
  expect(db.allRaw('PRAGMA foreign_key_check')).toEqual([]);
}

describe('adversarial character-share fidelity', () => {
  it('keeps a placeholder name stable when conflicting selections are permuted', async () => {
    const key = '2024:org.example.spells:conflicting-name';
    const base = minimalDocument({
      classes: [
        {
          id: 0,
          classKey: '2024:class:name-conflict',
          level: 1,
          start: 1,
        },
      ],
      placeholders: [{ spellKey: key, spellName: 'Shared Name' }],
    });
    const selections = [
      {
        ref: 0,
        ruleKey: 'name-choice',
        ordinal: 1,
        spellKey: key,
        spellName: 'First Conflicting Name',
      },
      {
        ref: 0,
        ruleKey: 'name-choice',
        ordinal: 2,
        spellKey: key,
        spellName: 'Second Conflicting Name',
      },
    ] as const;
    const importedNames: string[] = [];
    for (const ordered of [selections, [...selections].reverse()]) {
      const target = await database();
      classDefinition(
        target,
        '2024:class:name-conflict',
        'Name Conflict',
        [
          {
            kind: 'choice_from_query',
            rule_key: 'name-choice',
            count: 2,
            bucket: 'prepared',
            level_min: 0,
          },
        ],
      );
      importCharacterShare(
        target,
        await throughShareLink({ ...base, selections: ordered }),
      );
      importedNames.push(
        String(
          target.scalar(
            'SELECT display_name FROM spell_versions WHERE content_key = ?',
            [key],
          ),
        ),
      );
    }
    expect(importedNames).toEqual(['Shared Name', 'Shared Name']);
  });

  it('resolves wizard acquisitions by content key across databases with different row ids', async () => {
    const rules = [
      {
        kind: 'spellbook_acquisition',
        rule_key: 'wizard-spellbook',
        count: 1,
        bucket: 'spellbook',
        list: 'Wizard',
      },
    ];
    const sourceDb = await database();
    const acquiredId = spell(
      sourceDb,
      '2024:portable-acquisition',
      'Portable Acquisition',
    );
    sourceDb.exec(
      `INSERT INTO spell_list_memberships (
         spell_version_id, spell_list_key
       ) VALUES (?, 'Wizard')`,
      [acquiredId],
    );
    const wizardId = classDefinition(
      sourceDb,
      '2024:class:portable-wizard',
      'Portable Wizard',
      rules,
    );
    const characterId = character(sourceDb, 'Portable Wizard');
    sourceDb.exec(
      `INSERT INTO character_class_levels (
         character_id, class_definition_id, level, is_starting_class
       ) VALUES (?, ?, 1, 1)`,
      [characterId, wizardId],
    );
    const wizardSourceId = source(
      sourceDb,
      characterId,
      'class',
      wizardId,
      'Portable Wizard 1',
      {
        spellcasting_ability: 'intelligence',
      },
      1,
    );
    new GrantRuleSlotGenerator(sourceDb).generateForSource(wizardSourceId);
    sourceDb.exec(
      `UPDATE wizard_spellbook_entries
       SET spell_version_id = ?, selection_eligibility = 'valid'
       WHERE source_instance_id = ? AND rule_key = 'wizard-spellbook'
         AND ordinal = 1`,
      [acquiredId, wizardSourceId],
    );
    const document = await throughShareLink(
      exportCharacterShare(sourceDb, characterId),
    );
    expect(
      document.classes[0]?.config?.wizard_spellbook_acquisitions,
    ).toBeUndefined();
    expect(document.spellbook).toEqual([{
      ref: 0,
      ruleKey: 'wizard-spellbook',
      ordinal: 1,
      acquiredAtClassLevel: 1,
      spellKey: '2024:portable-acquisition',
    }]);

    const targetDb = await database();
    const paddingId = spell(
      targetDb,
      '2024:target-padding',
      'Target Padding',
    );
    const targetAcquiredId = spell(
      targetDb,
      '2024:portable-acquisition',
      'Portable Acquisition',
    );
    targetDb.exec(
      `INSERT INTO spell_list_memberships (
         spell_version_id, spell_list_key
       ) VALUES (?, 'Wizard'), (?, 'Wizard')`,
      [paddingId, targetAcquiredId],
    );
    expect(
      targetDb.scalar(
        'SELECT content_key FROM spell_versions WHERE id = ?',
        [acquiredId],
      ),
    ).toBe('2024:target-padding');
    classDefinition(
      targetDb,
      '2024:class:portable-wizard',
      'Portable Wizard',
      rules,
    );
    const imported = importCharacterShare(targetDb, document);
    const spellbookKeys = (db: DatabaseContext, id: number) =>
      db.allRaw(
        `SELECT version.content_key
         FROM wizard_spellbook_entries AS entry
         INNER JOIN spell_versions AS version
           ON version.id = entry.spell_version_id
         WHERE entry.character_id = ?
         ORDER BY version.content_key`,
        [id],
      );
    expect(spellbookKeys(targetDb, imported.characterId)).toEqual(
      spellbookKeys(sourceDb, characterId),
    );

    const invalidTargetDb = await database();
    spell(
      invalidTargetDb,
      '2024:off-list-acquisition',
      'Off-list Acquisition',
    );
    classDefinition(
      invalidTargetDb,
      '2024:class:portable-wizard',
      'Portable Wizard',
      rules,
    );
    const importedInvalid = importCharacterShare(invalidTargetDb, {
      ...document,
      spellbook: [{
        ...document.spellbook[0]!,
        spellKey: '2024:off-list-acquisition',
      }],
    });
    expect(
      invalidTargetDb.oneRaw(
        `SELECT selection_eligibility, selection_invalid_reason
         FROM wizard_spellbook_entries
         WHERE character_id = ? AND spell_version_id IS NOT NULL`,
        [importedInvalid.characterId],
      ),
    ).toEqual({
      selection_eligibility: 'invalid',
      selection_invalid_reason:
        'Selected spell is not on an allowed spell list.',
    });
  });

  it('round-trips the three-way Magic Initiate collision without losing source ability or slot identity', async () => {
    const sourceDb = await database();
    const catalog = seedMagicInitiateCatalog(sourceDb);
    const characterId = character(
      sourceDb,
      'Three Initiates',
      [1, 30, 1, 30, 1, 30],
    );
    const configurations = [
      { chosen_list: 'Wizard', spellcasting_ability: 'intelligence' },
      { chosen_list: 'Druid', spellcasting_ability: 'wisdom' },
      { chosen_list: 'Cleric', spellcasting_ability: 'charisma' },
    ] as const;
    configurations.forEach((config, index) => {
      const sourceId = source(
        sourceDb,
        characterId,
        'feat',
        catalog.featId,
        `Magic Initiate: ${config.chosen_list}`,
        config,
        index + 1,
      );
      new GrantRuleSlotGenerator(sourceDb).generateForSource(sourceId);
      select(
        sourceDb,
        sourceId,
        'magic-initiate-cantrips',
        1,
        catalog.spellIds[index] as number,
      );
      select(
        sourceDb,
        sourceId,
        'magic-initiate-cantrips',
        2,
        catalog.spellIds[1] as number,
      );
      select(
        sourceDb,
        sourceId,
        'magic-initiate-level-one',
        1,
        catalog.spellIds[0] as number,
      );
    });

    const document = exportCharacterShare(sourceDb, characterId);
    expect(document.sources.map((row) => row.id)).toEqual([0, 1, 2]);
    expect(new Set(document.selections.map((row) => row.ref))).toEqual(
      new Set([0, 1, 2]),
    );
    expect(document.selections).toHaveLength(9);

    const targetDb = await database();
    seedMagicInitiateCatalog(targetDb, true);
    const shared = await throughShareLink(document);
    const imported = importCharacterShare(targetDb, shared);
    const sourceChoices = selectedChoices(sourceDb, characterId);
    const importedChoices = selectedChoices(targetDb, imported.characterId);
    expect(importedChoices).toEqual(sourceChoices);
    expect(
      importedChoices.map((row) =>
        String(
          (
            JSON.parse(String(row.config)) as {
              spellcasting_ability: unknown;
            }
          ).spellcasting_ability,
        ),
      ),
    ).toEqual(
      sourceChoices.map((row) =>
        String(
          (
            JSON.parse(String(row.config)) as {
              spellcasting_ability: unknown;
            }
          ).spellcasting_ability,
        ),
      ),
    );
  });

  it('round-trips a level-20 character with twenty ordered classes and boundary scores', async () => {
    const sourceDb = await database();
    const characterId = character(
      sourceDb,
      'Twenty Classes',
      [1, 30, 1, 30, 1, 30],
    );
    for (let index = 0; index < 20; index += 1) {
      const classId = classDefinition(
        sourceDb,
        `2024:class:adversary-${index}`,
        `Adversary ${index}`,
      );
      sourceDb.exec(
        `INSERT INTO character_class_levels (
           character_id, class_definition_id, level, is_starting_class
         ) VALUES (?, ?, 1, ?)`,
        [characterId, classId, index === 0 ? 1 : 0],
      );
      source(
        sourceDb,
        characterId,
        'class',
        classId,
        `Adversary ${index} 1`,
        { spellcasting_ability: 'intelligence', order: index },
        index + 1,
      );
    }
    const document = exportCharacterShare(sourceDb, characterId);
    expect(document.classes).toHaveLength(20);
    expect(document.classes.reduce((sum, row) => sum + row.level, 0)).toBe(
      20,
    );

    const targetDb = await database();
    classDefinition(targetDb, '2024:class:padding', 'Padding');
    for (let index = 19; index >= 0; index -= 1) {
      classDefinition(
        targetDb,
        `2024:class:adversary-${index}`,
        `Adversary ${index}`,
      );
    }
    const shared = await throughShareLink(document);
    const imported = importCharacterShare(targetDb, shared);
    expect(
      exportCharacterShare(targetDb, imported.characterId),
    ).toEqual(document);
  });

  it('round-trips empty and single-class characters without inventing optional state', async () => {
    const emptySource = await database();
    const emptyId = character(emptySource, 'Empty');
    const emptyDocument = exportCharacterShare(emptySource, emptyId);
    const emptyTarget = await database();
    const importedEmpty = importCharacterShare(emptyTarget, emptyDocument);
    expect(exportCharacterShare(emptyTarget, importedEmpty.characterId)).toEqual(
      emptyDocument,
    );

    const singleSource = await database();
    const classId = classDefinition(
      singleSource,
      '2024:class:solo',
      'Solo',
    );
    const singleId = character(singleSource, 'Solo');
    singleSource.exec(
      `INSERT INTO character_class_levels (
         character_id, class_definition_id, level, is_starting_class
       ) VALUES (?, ?, 20, 1)`,
      [singleId, classId],
    );
    source(
      singleSource,
      singleId,
      'class',
      classId,
      'Solo 20',
      { spellcasting_ability: 'intelligence' },
      1,
    );
    const singleDocument = exportCharacterShare(singleSource, singleId);
    const singleTarget = await database();
    classDefinition(singleTarget, '2024:class:solo', 'Solo');
    const sharedSingle = await throughShareLink(singleDocument);
    const importedSingle = importCharacterShare(
      singleTarget,
      sharedSingle,
    );
    expect(
      exportCharacterShare(singleTarget, importedSingle.characterId),
    ).toEqual(singleDocument);
  });

  it('preserves homebrew subclass config that controls regenerated slots', async () => {
    const seed = (db: DatabaseContext) => {
      const shieldId = spell(db, '2024:shield', 'Shield');
      const classId = classDefinition(
        db,
        '2024:class:homebrew-mage',
        'Homebrew Mage',
      );
      const subclassId = db.exec(
        `INSERT INTO subclass_definitions (
           content_key, class_definition_id, name, rules_edition,
           spellcasting_ability, grant_rules
         ) VALUES (?, ?, 'Configured Path', '2024', 'wisdom', ?)`,
        [
          '2024:subclass:configured-path',
          classId,
          JSON.stringify([
            {
              kind: 'choice_from_query',
              rule_key: 'configured-choice',
              count: 1,
              bucket: 'prepared',
              level_min: 1,
              level_max: 1,
              active_if_config: { key: 'enabled', equals: 'yes' },
            },
          ]),
        ],
      ).lastInsertId;
      return { shieldId, classId, subclassId };
    };
    const sourceDb = await database();
    const catalog = seed(sourceDb);
    const characterId = character(sourceDb, 'Subclass Config');
    sourceDb.exec(
      `INSERT INTO character_class_levels (
         character_id, class_definition_id, subclass_definition_id,
         level, is_starting_class
       ) VALUES (?, ?, ?, 7, 1)`,
      [characterId, catalog.classId, catalog.subclassId],
    );
    source(
      sourceDb,
      characterId,
      'class',
      catalog.classId,
      'Homebrew Mage 7',
      { spellcasting_ability: 'intelligence', class_choice: 'alpha' },
      1,
    );
    const subclassSourceId = source(
      sourceDb,
      characterId,
      'subclass',
      catalog.subclassId,
      'Configured Path',
      {
        spellcasting_ability: 'wisdom',
        enabled: 'yes',
        path_choice: 'tab\tline\nemoji🧙',
      },
      7,
    );
    new GrantRuleSlotGenerator(sourceDb).generateForSource(subclassSourceId);
    select(
      sourceDb,
      subclassSourceId,
      'configured-choice',
      1,
      catalog.shieldId,
    );

    const document = exportCharacterShare(sourceDb, characterId);
    const targetDb = await database();
    seed(targetDb);
    const shared = await throughShareLink(document);
    const imported = importCharacterShare(targetDb, shared);
    expect(selectedChoices(targetDb, imported.characterId)).toEqual(
      selectedChoices(sourceDb, characterId),
    );
    expect(
      JSON.parse(
        String(
          targetDb.scalar(
            `SELECT config FROM character_source_instances
             WHERE character_id = ? AND source_type = 'class'`,
            [imported.characterId],
          ),
        ),
      ),
    ).toMatchObject({ class_choice: 'alpha' });
  });

  it('preserves placeholders used in duplicate selections, spellbook, preference, and loadouts', async () => {
    const sourceDb = await database();
    const classId = classDefinition(
      sourceDb,
      '2024:class:placeholder-mage',
      'Placeholder Mage',
      [
        {
          kind: 'choice_from_query',
          rule_key: 'placeholder-choice',
          count: 2,
          bucket: 'prepared',
          level_min: 0,
          level_max: 9,
        },
      ],
    );
    const characterId = character(sourceDb, 'All Placeholders');
    sourceDb.exec(
      `INSERT INTO character_class_levels (
         character_id, class_definition_id, level, is_starting_class
       ) VALUES (?, ?, 1, 1)`,
      [characterId, classId],
    );
    const classSourceId = source(
      sourceDb,
      characterId,
      'class',
      classId,
      'Placeholder Mage 1',
      {
        spellcasting_ability: 'intelligence',
        placeholder_mode: 'retained',
      },
      1,
    );
    new GrantRuleSlotGenerator(sourceDb).generateForSource(classSourceId);
    const key = '2024:org.example.spells:2024-prefix-colon-mimic';
    const placeholderId = ensureSharedSpell(
      sourceDb,
      key,
      'אָב\\\"\t\n\r🧙 Placeholder',
    );
    select(
      sourceDb,
      classSourceId,
      'placeholder-choice',
      1,
      placeholderId,
    );
    select(
      sourceDb,
      classSourceId,
      'placeholder-choice',
      2,
      placeholderId,
      'kept_override',
    );
    sourceDb.exec(
      `INSERT INTO wizard_spellbook_entries
         (character_id, spell_version_id) VALUES (?, ?)`,
      [characterId, placeholderId],
    );
    sourceDb.exec(
      `INSERT INTO character_spell_preferences
         (character_id, spell_version_id, favourite) VALUES (?, ?, 1)`,
      [characterId, placeholderId],
    );
    const loadoutId = sourceDb.exec(
      `INSERT INTO spell_loadouts (character_id, name)
       VALUES (?, 'Placeholder\nLoadout')`,
      [characterId],
    ).lastInsertId;
    sourceDb.exec(
      `INSERT INTO spell_loadout_entries (
         spell_loadout_id, spell_version_id, role
       ) VALUES (?, ?, 'all\\roles')`,
      [loadoutId, placeholderId],
    );

    const document = exportCharacterShare(sourceDb, characterId, {
      loadouts: true,
    });
    const targetDb = await database();
    classDefinition(
      targetDb,
      '2024:class:placeholder-mage',
      'Placeholder Mage',
      [
        {
          kind: 'choice_from_query',
          rule_key: 'placeholder-choice',
          count: 2,
          bucket: 'prepared',
          level_min: 0,
          level_max: 9,
        },
      ],
    );
    const shared = await throughShareLink(document);
    const imported = importCharacterShare(targetDb, shared);
    expect(
      exportCharacterShare(targetDb, imported.characterId, {
        loadouts: true,
      }),
    ).toEqual(document);
  });

  it('preserves unselected placeholder names, false preferences, opt-ins, strings, and extreme overrides', async () => {
    const sourceDb = await database();
    const name = 'Tab\tLine\nCR\rSlash\\Quote" Emoji🧙 RTLאב';
    const characterId = character(sourceDb, name);
    const placeholderKey = '2024:org.example.spells:loadout-only';
    const placeholderId = ensureSharedSpell(
      sourceDb,
      placeholderKey,
      'Custom Loadout-Only Name 🧪',
    );
    sourceDb.exec(
      `INSERT INTO character_spell_preferences (
         character_id, spell_version_id, favourite
       ) VALUES (?, ?, 0)`,
      [characterId, placeholderId],
    );
    sourceDb.exec(
      `INSERT INTO character_rule_overrides (
         character_id, rule_key, value
       ) VALUES (?, ?, ?)`,
      [
        characterId,
        'odd\tkey\nאב',
        JSON.stringify({
          zero: 0,
          negative: -999_999,
          huge: 1e308,
          string: name,
          nested: { array: [false, null, '\\', '🧙'] },
        }),
      ],
    );
    sourceDb.exec(
      `INSERT INTO warning_acknowledgements (
         character_id, warning_fingerprint
       ) VALUES (?, ?)`,
      [characterId, `unknown-warning:${name}`],
    );
    const loadoutId = sourceDb.exec(
      `INSERT INTO spell_loadouts (character_id, name) VALUES (?, ?)`,
      [characterId, name],
    ).lastInsertId;
    sourceDb.exec(
      `INSERT INTO spell_loadout_entries (
         spell_loadout_id, spell_version_id, role
       ) VALUES (?, ?, ?)`,
      [loadoutId, placeholderId, name],
    );

    const document = exportCharacterShare(sourceDb, characterId, {
      acknowledgements: true,
      loadouts: true,
    });
    const targetDb = await database();
    const shared = await throughShareLink(document);
    const imported = importCharacterShare(targetDb, shared);
    expect(
      exportCharacterShare(targetDb, imported.characterId, {
        acknowledgements: true,
        loadouts: true,
      }),
    ).toEqual(document);
    expect(
      targetDb.oneRaw(
        `SELECT display_name FROM spell_versions WHERE content_key = ?`,
        [placeholderKey],
      ),
    ).toEqual({ display_name: 'Custom Loadout-Only Name 🧪' });
    expect(
      targetDb.oneRaw(
        `SELECT favourite FROM character_spell_preferences
         WHERE character_id = ?`,
        [imported.characterId],
      ),
    ).toEqual({ favourite: 0 });
  });

  it('distinguishes omitted defaults from explicit true and absent opt-ins from empty opt-ins', async () => {
    const omitted = minimalDocument();
    const explicit = minimalDocument({
      character: {
        name: 'Adversary',
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        rules_edition_preference: '2024',
        allow_legacy: true,
      },
      acknowledgements: [],
      loadouts: [],
    });
    const omittedWire = shareDocumentToPositional(omitted);
    expect(omittedWire[9]).toBeNull();
    expect(omittedWire[10]).toBeNull();
    const explicitWire = shareDocumentToPositional(explicit);
    expect(explicitWire[9]).toEqual([]);
    expect(explicitWire[10]).toEqual([]);
    await expect(
      decodeShareFragment(await encodeShareFragment(omitted)),
    ).resolves.toEqual(omitted);
    await expect(
      decodeShareFragment(await encodeShareFragment(explicit)),
    ).resolves.toEqual(explicit);

    const keep = minimalDocument({
      sources: [
        {
          id: 0,
          type: 'feat',
          key: '2024:feat:none',
          acquired: 1,
        },
      ],
      selections: [
        {
          ref: 0,
          ruleKey: 'choice',
          ordinal: 1,
          spellKey: '2024:shield',
        },
        {
          ref: 0,
          ruleKey: 'choice',
          ordinal: 2,
          spellKey: '2024:guidance',
          keep: true,
        },
      ],
    });
    const keepWire = shareDocumentToPositional(keep);
    expect((keepWire[5] as unknown[][]).map((row) => row[5])).toEqual([
      null,
      true,
    ]);
    expect(positionalToShareDocument(keepWire)).toEqual(keep);
  });

  it('documents that import retains known-ineligible selections with and without keep', async () => {
    const target = await database();
    const invalidSpellId = spell(
      target,
      '2024:too-high',
      'Too High',
      1,
    );
    classDefinition(
      target,
      '2024:class:ineligible',
      'Ineligible',
      [
        {
          kind: 'choice_from_query',
          rule_key: 'cantrip-only',
          count: 1,
          bucket: 'cantrip_known',
          level_min: 0,
          level_max: 0,
        },
      ],
    );
    const states: Record<string, unknown>[] = [];
    for (const keep of [false, true]) {
      const document = minimalDocument({
        character: { name: keep ? 'Kept Invalid' : 'Plain Invalid' },
        classes: [
          {
            id: 0,
            classKey: '2024:class:ineligible',
            level: 1,
            start: 1,
          },
        ],
        selections: [
          {
            ref: 0,
            ruleKey: 'cantrip-only',
            ordinal: 1,
            spellKey: '2024:too-high',
            ...(keep ? { keep: true as const } : {}),
          },
        ],
      });
      const imported = importCharacterShare(target, document);
      states.push(
        target.oneRaw(
          `SELECT current_spell_version_id, state,
                  selection_eligibility, selection_invalid_reason
           FROM spell_selection_slots WHERE character_id = ?`,
          [imported.characterId],
        ) as Record<string, unknown>,
      );
    }
    expect(states).toEqual([
      {
        current_spell_version_id: invalidSpellId,
        state: 'active',
        selection_eligibility: 'invalid',
        selection_invalid_reason:
          'Selected spell is outside the slot level range.',
      },
      {
        current_spell_version_id: invalidSpellId,
        state: 'kept_override',
        selection_eligibility: 'invalid',
        selection_invalid_reason:
          'Selected spell is outside the slot level range.',
      },
    ]);
  });

  it('treats share-local ids and collection order as semantically opaque', async () => {
    const target = await database();
    seedSemanticCatalog(target);
    const base = semanticDocument();
    const importedBase = importCharacterShare(target, base);
    const baseline = semanticProjection(target, importedBase.characterId);

    const idMap = new Map([
      [0, 3],
      [1, 1],
      [2, 0],
      [3, 2],
    ]);
    const permutedIds = validateShareDocument({
      ...base,
      classes: base.classes.map((row) => ({
        ...row,
        id: idMap.get(row.id),
      })),
      sources: base.sources.map((row) => ({
        ...row,
        id: idMap.get(row.id),
      })),
      selections: base.selections.map((row) => ({
        ...row,
        ref: idMap.get(row.ref),
      })),
    });
    const importedPermuted = importCharacterShare(target, permutedIds);
    expect(
      semanticProjection(target, importedPermuted.characterId),
    ).toEqual(baseline);

    const reordered = validateShareDocument({
      ...base,
      classes: [...base.classes].reverse(),
      sources: [...base.sources].reverse(),
      selections: [...base.selections].reverse(),
      preferences: [...base.preferences].reverse(),
      overrides: [...base.overrides].reverse(),
      acknowledgements: [...(base.acknowledgements ?? [])].reverse(),
    });
    const importedReordered = importCharacterShare(target, reordered);
    expect(
      semanticProjection(target, importedReordered.characterId),
    ).toEqual(baseline);

    const renamed = validateShareDocument({
      ...base,
      character: { ...base.character, name: 'Renamed Semantic Hero' },
    });
    const importedRenamed = importCharacterShare(target, renamed);
    const renamedProjection = semanticProjection(
      target,
      importedRenamed.characterId,
    );
    expect(renamedProjection.character.name).toBe(
      'Renamed Semantic Hero',
    );
    expect({
      ...renamedProjection,
      character: {
        ...renamedProjection.character,
        name: baseline.character.name,
      },
    }).toEqual(baseline);

    const withEmptyLoadout = validateShareDocument({
      ...base,
      loadouts: [
        ...(base.loadouts ?? []),
        { name: 'Unrelated empty loadout', entries: [] },
      ],
    });
    const importedWithEmpty = importCharacterShare(
      target,
      withEmptyLoadout,
    );
    const emptyProjection = semanticProjection(
      target,
      importedWithEmpty.characterId,
    );
    expect({
      sources: emptyProjection.sources,
      slots: emptyProjection.slots,
      spellbook: emptyProjection.spellbook,
      preferences: emptyProjection.preferences,
    }).toEqual({
      sources: baseline.sources,
      slots: baseline.slots,
      spellbook: baseline.spellbook,
      preferences: baseline.preferences,
    });

    const importedAgain = importCharacterShare(target, base);
    expect(
      semanticProjection(target, importedAgain.characterId),
    ).toEqual(baseline);
    expect(importedAgain.characterId).not.toBe(importedBase.characterId);
    expect(
      new Set([
        ...sourceIdentityRows(target, importedBase.characterId),
        ...sourceIdentityRows(target, importedAgain.characterId),
      ]).size,
    ).toBe(
      sourceIdentityRows(target, importedBase.characterId).length +
        sourceIdentityRows(target, importedAgain.characterId).length,
    );
    expectDatabaseIntegrity(target);
  });

  it('keeps preview and induced import failures byte-isolated and checks successful images', async () => {
    const target = await database();
    seedSemanticCatalog(target);
    const document = semanticDocument();

    const beforePreview = await exportedDatabaseImage(target);
    expect(previewCharacterShare(target, document)).toMatchObject({
      name: 'Semantic Hero',
      sourceCount: 2,
      selectionCount: 4,
    });
    const afterPreview = await exportedDatabaseImage(target);
    if (
      beforePreview.byteLength !== afterPreview.byteLength ||
      beforePreview.some((byte, index) => byte !== afterPreview[index])
    ) {
      dumpApplicationDatabase(target);
    }
    expect(Array.from(afterPreview)).toEqual(Array.from(beforePreview));

    await expectImageUnchanged(target, () =>
      importCharacterShare(target, {
        ...document,
        selections: [
          ...document.selections,
          {
            ref: 99,
            ruleKey: 'unknown-ref',
            ordinal: 1,
            spellKey: '2024:shield',
          },
        ],
      }),
    );
    await expectImageUnchanged(target, () =>
      importCharacterShare(
        target,
        validateShareDocument({
          ...document,
          classes: document.classes.map((row, index) =>
            index === 0
              ? { ...row, classKey: '2024:class:missing-late' }
              : row,
          ),
        }),
      ),
    );

    const placeholderKey = '2024:example.test:late-placeholder';
    const lateDocument = validateShareDocument({
      ...document,
      selections: document.selections.map((row, index) =>
        index === 0
          ? {
              ...row,
              spellKey: placeholderKey,
              spellName: 'Late Placeholder',
            }
          : row,
      ),
      preferences: [
        ...document.preferences,
        { spellKey: placeholderKey, favourite: true },
      ],
      placeholders: [
        { spellKey: placeholderKey, spellName: 'Late Placeholder' },
      ],
      loadouts: [
        {
          name: 'Late loadout',
          entries: [
            { spellKey: placeholderKey, role: 'late-stage' },
          ],
        },
      ],
    });
    target.exec(
      `CREATE TEMP TRIGGER abort_late_share_import
       BEFORE INSERT ON spell_loadout_entries
       BEGIN
         SELECT RAISE(ABORT, 'injected late share import failure');
       END`,
    );
    await expectImageUnchanged(target, () =>
      importCharacterShare(target, lateDocument),
    );
    target.exec('DROP TRIGGER abort_late_share_import');

    const imported = importCharacterShare(target, lateDocument);
    expect(
      semanticProjection(target, imported.characterId).character.name,
    ).toBe('Semantic Hero');
    expectDatabaseIntegrity(target);
  });
});

describe('adversarial character-share rejection', () => {
  it('rejects ordinal zero during contract validation', () => {
    expect(() =>
      validateShareDocument(
        minimalDocument({
          sources: [
            {
              id: 0,
              type: 'feat',
              key: '2024:feat:ordinal-zero',
              acquired: 1,
            },
          ],
          selections: [
            {
              ref: 0,
              ruleKey: 'choice',
              ordinal: 0,
              spellKey: '2024:shield',
            },
          ],
        }),
      ),
    ).toThrow(/ordinal must be an integer from 1 to 1000/);
  });

  it.each([
    ['feat', 'feat_definitions'],
    ['species', 'species_definitions'],
    ['background', 'background_definitions'],
  ] as const)(
    'rejects duplicate non-repeatable %s sources',
    async (type, table) => {
      const target = await database();
      definition(
        target,
        table,
        `2024:${type}:not-repeatable`,
        `Not Repeatable ${type}`,
      );
      const duplicated = minimalDocument({
        sources: [0, 1].map((id) => ({
          id,
          type,
          key: `2024:${type}:not-repeatable`,
          acquired: 1,
        })),
      });
      expect(() => importCharacterShare(target, duplicated)).toThrow(
        /not repeatable/i,
      );
    },
  );

  it('preserves an off-list Magic Initiate config instead of enforcing the official lists', async () => {
    // `validateSourceConfiguration` hardcodes Cleric/Druid/Wizard
    // (`add-source.ts:18`) and fires on the literal official content key. It
    // does NOT read the allowed lists from the recipient's definition, and
    // `feat_definitions` has no column that could express them. Enforcing it
    // on import would therefore reject a homebrew feat that keeps the official
    // key even when sender and recipient hold identical definitions, so import
    // deliberately does not run it. The authoring path still does.
    const target = await database();
    definition(
      target,
      'feat_definitions',
      '2024:feat:magic-initiate',
      'Magic Initiate',
      [],
      true,
    );
    const imported = importCharacterShare(
      target,
      minimalDocument({
        sources: [
          {
            id: 0,
            type: 'feat',
            key: '2024:feat:magic-initiate',
            acquired: 1,
            config: {
              chosen_list: 'Sorcerer',
              spellcasting_ability: 'intelligence',
            },
          },
        ],
      }),
    );
    expect(
      JSON.parse(
        String(
          target.one(
            `SELECT config FROM character_source_instances
             WHERE character_id = ?`,
            [imported.characterId],
            (row) => sqlNullableString(row, 'config'),
          ),
        ),
      ),
    ).toMatchObject({ chosen_list: 'Sorcerer' });
  });

  it('rejects garbage, truncated base64url, non-gzip, non-JSON, and invalid UTF-8 clearly', async () => {
    await expect(decodeShareFragment('%%%')).rejects.toThrow(
      ShareValidationError,
    );
    await expect(decodeShareFragment('a')).rejects.toThrow(
      /valid base64url/,
    );
    await expect(
      decodeShareFragment('bm90IGd6aXA'),
    ).rejects.toThrow(/not valid gzip data/);
    await expect(
      decodeShareFragment(
        await fragmentFromBytes(new TextEncoder().encode('not json')),
      ),
    ).rejects.toThrow(/not valid JSON/);
    await expect(
      decodeShareFragment(
        await fragmentFromBytes(new Uint8Array([0xff, 0xfe, 0xfd])),
      ),
    ).rejects.toThrow(ShareValidationError);
  });

  it('rejects wrong format/version, tuple arity errors, and extra or missing elements', async () => {
    const positional = shareDocumentToPositional(minimalDocument());
    const withEffect = shareDocumentToPositional(
      minimalDocument({
        effects: [{
          kind: 'armor_class_bonus',
          label: 'Tuple arity probe',
          amount: 1,
        }],
      }),
    );
    const shortEffect = structuredClone(withEffect);
    (shortEffect[14] as unknown[][])[0] =
      ((shortEffect[14] as unknown[][])[0] as unknown[]).slice(0, 19);
    const longEffect = structuredClone(withEffect);
    (longEffect[14] as unknown[][])[0] = [
      ...((longEffect[14] as unknown[][])[0] as unknown[]),
      null,
    ];
    const cases: Array<[unknown, RegExp]> = [
      [[...positional.slice(0, 10)], /tuple of length 21/],
      [[...positional, null], /tuple of length 21/],
      [
        ['wrong-format', ...positional.slice(1)],
        /format is unsupported/,
      ],
      [
        [positional[0], 999, ...positional.slice(2)],
        /version is unsupported/,
      ],
      [
        [positional[0], positional[1], ['short'], ...positional.slice(3)],
        /wire character must be a tuple of length 12/,
      ],
      [shortEffect, /wire effects\[0\] must be a tuple of length 20/],
      [longEffect, /wire effects\[0\] must be a tuple of length 20/],
    ];
    for (const [value, message] of cases) {
      await expect(
        decodeShareFragment(await arbitraryFragment(value)),
      ).rejects.toThrow(message);
    }
  });

  it('rejects every over-count collection before database mutation', async () => {
    const base = shareDocumentToPositional(minimalDocument());
    const classRecord = (
      shareDocumentToPositional(
        minimalDocument({
          classes: [{
            id: 0,
            classKey: '2024:class:x-0',
            level: 1,
            start: 1,
          }],
        }),
      )[3] as unknown[][]
    )[0] as unknown[];
    const sourceRecord = (
      shareDocumentToPositional(
        minimalDocument({
          sources: [{
            id: 0,
            type: 'feat',
            key: '2024:feat:x-0',
            acquired: 1,
          }],
        }),
      )[4] as unknown[][]
    )[0] as unknown[];
    const selectionRecord = (
      shareDocumentToPositional(
        minimalDocument({
          sources: [{
            id: 0,
            type: 'feat',
            key: '2024:feat:test',
            acquired: 1,
          }],
          selections: [{
            ref: 0,
            ruleKey: 'choice-0',
            ordinal: 1,
            spellKey: '2024:shield',
          }],
        }),
      )[5] as unknown[][]
    )[0] as unknown[];
    const weaponRecord = (
      shareDocumentToPositional(
        minimalDocument({
          weapons: [{
            name: 'Weapon 0',
            damage: { kind: 'not_recorded' },
            versatile_damage: { kind: 'not_applicable' },
            range: { kind: 'none' },
          }],
        }),
      )[11] as unknown[][]
    )[0] as unknown[];
    const cases: Array<[
      (wire: unknown[]) => void,
      RegExp,
    ]> = [
      [
        (wire) => {
          wire[3] = Array.from(
            { length: SHARE_LIMITS.classes + 1 },
            (_, id) => {
              const record = structuredClone(classRecord);
              record[0] = id;
              record[1] = `2024:class:x-${id}`;
              return record;
            },
          );
        },
        /wire classes exceeds/,
      ],
      [
        (wire) => {
          wire[4] = Array.from(
            { length: SHARE_LIMITS.sources + 1 },
            (_, id) => {
              const record = structuredClone(sourceRecord);
              record[0] = id;
              record[2] = `2024:feat:x-${id}`;
              return record;
            },
          );
        },
        /wire sources exceeds/,
      ],
      [
        (wire) => {
          wire[4] = [[0, 'feat', '2024:feat:test', null, 1, null]];
          wire[5] = Array.from(
            { length: SHARE_LIMITS.selections + 1 },
            (_, index) => {
              const record = structuredClone(selectionRecord);
              record[1] = `choice-${index}`;
              return record;
            },
          );
        },
        /wire selections exceeds/,
      ],
      [
        (wire) => {
          wire[6] = Array.from(
            { length: SHARE_LIMITS.spellbook + 1 },
            (_, index) => `2024:spell-${index}`,
          );
        },
        /wire spellbook exceeds/,
      ],
      [
        (wire) => {
          wire[7] = Array.from(
            { length: SHARE_LIMITS.preferences + 1 },
            (_, index) => [`2024:spell-${index}`, false],
          );
        },
        /wire preferences exceeds/,
      ],
      [
        (wire) => {
          wire[8] = Array.from(
            { length: SHARE_LIMITS.overrides + 1 },
            (_, index) => [`override-${index}`, index],
          );
        },
        /wire overrides exceeds/,
      ],
      [
        (wire) => {
          wire[9] = Array.from(
            { length: SHARE_LIMITS.acknowledgements + 1 },
            (_, index) => [`warning-${index}`],
          );
        },
        /wire acknowledgements exceeds/,
      ],
      [
        (wire) => {
          wire[10] = Array.from(
            { length: SHARE_LIMITS.loadouts + 1 },
            (_, index) => [`Loadout ${index}`, []],
          );
        },
        /wire loadouts exceeds/,
      ],
      [
        (wire) => {
          wire[15] = Array.from(
            { length: SHARE_LIMITS.placeholders + 1 },
            (_, index) => [
              `2024:org.example.spells:placeholder-${index}`,
              `Placeholder ${index}`,
            ],
          );
        },
        /wire placeholders exceeds/,
      ],
      [
        (wire) => {
          wire[10] = [
            [
              'First',
              Array.from(
                { length: SHARE_LIMITS.loadoutEntries },
                (_, index) => [`2024:spell-${index}`, 'prepared'],
              ),
            ],
            ['Second', [['2024:overflow', 'prepared']]],
          ];
        },
        /loadout entries exceed/,
      ],
      [
        (wire) => {
          wire[11] = Array.from(
            { length: SHARE_LIMITS.weapons + 1 },
            (_, index) => {
              const record = structuredClone(weaponRecord);
              record[0] = `Weapon ${index}`;
              return record;
            },
          );
        },
        /wire weapons exceeds/,
      ],
    ];
    for (const [mutate, message] of cases) {
      const hostile = structuredClone(base);
      mutate(hostile);
      await expect(
        decodeShareFragment(await arbitraryFragment(hostile)),
      ).rejects.toThrow(message);
    }
  });

  it('rejects unknown refs, negative/huge ordinals, duplicate ids, and duplicate slot identities', () => {
    const base = minimalDocument({
      sources: [
        {
          id: 0,
          type: 'feat',
          key: '2024:feat:test',
          acquired: 1,
        },
      ],
    });
    expect(() =>
      positionalToShareDocument(
        shareDocumentToPositional({
          ...base,
          selections: [
            {
              ref: 1,
              ruleKey: 'choice',
              ordinal: 1,
              spellKey: '2024:shield',
            },
          ],
        } as CharacterShareDocument),
      ),
    ).toThrow(/ref is unknown/);
    for (const ordinal of [-1, 1_001, Number.MAX_SAFE_INTEGER]) {
      expect(() =>
        positionalToShareDocument([
          ...shareDocumentToPositional(base).slice(0, 5),
          [[0, 'choice', ordinal, '2024:shield', null, null, null]],
          ...shareDocumentToPositional(base).slice(6),
        ]),
      ).toThrow(/ordinal must be an integer from 1 to 1000/);
    }
    expect(() =>
      positionalToShareDocument(
        shareDocumentToPositional({
          ...base,
          classes: [
            {
              id: 0,
              classKey: '2024:class:test',
              level: 1,
              start: 1,
            },
          ],
        } as CharacterShareDocument),
      ),
    ).toThrow(/ids must be unique/);
    expect(() =>
      positionalToShareDocument(
        shareDocumentToPositional({
          ...base,
          selections: [
            {
              ref: 0,
              ruleKey: 'choice',
              ordinal: 1,
              spellKey: '2024:shield',
            },
            {
              ref: 0,
              ruleKey: 'choice',
              ordinal: 1,
              spellKey: '2024:guidance',
            },
          ],
        } as CharacterShareDocument),
      ),
    ).toThrow(/selections contains duplicate records/);
  });

  it('rejects prototype keys, non-finite/bigint values, and malformed homebrew spell keys', async () => {
    const polluted = JSON.parse(
      `{"format":"dnd-multiclass-spells-character-share","version":${CHARACTER_SHARE_VERSION},` +
        '"character":{"name":"Safe"},"classes":[],"sources":[],' +
        '"selections":[],"spellbook":[],"preferences":[],' +
      '"overrides":[{"ruleKey":"pollution","value":{"__proto__":{"polluted":true},"prototype":{"x":1},"constructor":{"y":2}}}]}',
    ) as unknown;
    const targetDb = await database();
    expect(() =>
      importCharacterShare(targetDb, polluted),
    ).toThrow(/field name/);
    expect(
      (Object.prototype as Record<string, unknown>).polluted,
    ).toBeUndefined();
    for (const table of [
      'characters',
      'character_class_levels',
      'character_source_instances',
      'spell_selection_slots',
      'wizard_spellbook_entries',
      'character_spell_preferences',
      'character_rule_overrides',
      'warning_acknowledgements',
      'spell_loadouts',
      'spell_loadout_entries',
      'character_weapons',
    ]) {
      expect(targetDb.scalar(`SELECT count(*) FROM ${table}`)).toBe(0);
    }

    for (const value of [NaN, Infinity, -Infinity, 1n]) {
      expect(() =>
        encodeShareFragment(
          minimalDocument({
            overrides: [{ ruleKey: 'hostile', value }],
          }),
        ),
      ).toThrow(ShareValidationError);
    }
    for (const key of [
      '2024:org.example:slug:extra',
      '2024:__proto__:spell',
      '2024:prototype.pollution:spell',
      '2024:constructor:spell',
    ]) {
      expect(() =>
        encodeShareFragment(
          minimalDocument({ spellbook: [{ spellKey: key }] }),
        ),
      ).toThrow(/spell-key grammar/);
    }
  });

  it('bounds a tiny gzip decompression bomb and oversized encoded text', async () => {
    const bomb = new TextEncoder().encode(
      'x'.repeat(SHARE_LIMITS.decompressedBytes + 1),
    );
    const fragment = await fragmentFromBytes(bomb);
    expect(fragment.length).toBeLessThan(1_000);
    await expect(decodeShareFragment(fragment)).rejects.toThrow(
      /decompressed document exceeds/,
    );
    await expect(
      decodeShareFragment(
        'a'.repeat(SHARE_LIMITS.encodedCharacters + 1),
      ),
    ).rejects.toThrow(/fragment exceeds/);
  });

  it('rejects catalog drift atomically instead of dropping an unmatched selection', async () => {
    const sourceDb = await database();
    const spellId = spell(sourceDb, '2024:shield', 'Shield');
    const classId = classDefinition(
      sourceDb,
      '2024:class:drifting',
      'Drifting',
      [
        {
          kind: 'choice_from_query',
          rule_key: 'drifting-choice',
          count: 2,
          bucket: 'prepared',
          level_min: 1,
          level_max: 1,
        },
      ],
    );
    const characterId = character(sourceDb);
    sourceDb.exec(
      `INSERT INTO character_class_levels (
         character_id, class_definition_id, level, is_starting_class
       ) VALUES (?, ?, 1, 1)`,
      [characterId, classId],
    );
    const sourceId = source(
      sourceDb,
      characterId,
      'class',
      classId,
      'Drifting 1',
      { spellcasting_ability: 'intelligence' },
      1,
    );
    new GrantRuleSlotGenerator(sourceDb).generateForSource(sourceId);
    select(sourceDb, sourceId, 'drifting-choice', 2, spellId);
    const document = exportCharacterShare(sourceDb, characterId);

    const targetDb = await database();
    spell(targetDb, '2024:shield', 'Shield');
    classDefinition(
      targetDb,
      '2024:class:drifting',
      'Drifting',
      [
        {
          kind: 'choice_from_query',
          rule_key: 'drifting-choice',
          count: 1,
          bucket: 'prepared',
          level_min: 1,
          level_max: 1,
        },
      ],
    );
    // Atomicity is the load-bearing property and is unchanged. What changed is
    // the diagnostic: catalog drift is a COMPATIBILITY failure of a well-formed
    // document, not a malformed share, and it is reported as a structured issue
    // the UI can render rather than an internal-sounding string.
    let thrown: unknown;
    try {
      importCharacterShare(targetDb, document);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ShareImportCompatibilityError);
    expect(thrown).not.toBeInstanceOf(ShareValidationError);
    const issues = (thrown as ShareImportCompatibilityError).issues;
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe('selection_slot_missing');
    expect(issues[0]?.ruleKey).toBe('drifting-choice');
    expect(issues[0]?.remedy).toMatch(/Compare catalogs/);
    expect(targetDb.scalar('SELECT count(*) FROM characters')).toBe(0);
  });

  it('reports every independent catalog gap at once instead of one per import', async () => {
    const targetDb = await database();
    let thrown: unknown;
    try {
      importCharacterShare(
        targetDb,
        minimalDocument({
          classes: [
            { id: 0, classKey: '2024:class:absent-a', level: 1, start: 1 },
            { id: 1, classKey: '2024:class:absent-b', level: 1, start: 2 },
          ],
          sources: [
            { id: 2, type: 'feat', key: '2024:feat:absent-c', acquired: 1 },
          ],
        } as Partial<CharacterShareDocument>),
      );
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ShareImportCompatibilityError);
    const issues = (thrown as ShareImportCompatibilityError).issues;
    expect(issues.map((row) => row.code)).toEqual([
      'missing_class',
      'missing_class',
      'missing_source',
    ]);
    expect(issues.flatMap((row) => row.contentKeys)).toEqual([
      '2024:class:absent-a',
      '2024:class:absent-b',
      '2024:feat:absent-c',
    ]);
    // Every issue must name a real action; none may promise an in-app
    // operation that does not exist (there is no source-catalog importer).
    for (const issue of issues) {
      expect(issue.remedy.length).toBeGreaterThan(0);
      expect(issue.remedy).not.toMatch(/click|button|press/i);
    }
    expect(targetDb.scalar('SELECT count(*) FROM characters')).toBe(0);
  });
});

/**
 * THE ONE FIELD A SHARER CHOOSES TO SEND, VALIDATED LIKE EVERY OTHER (Q12).
 *
 * `character.notes` is optional free text on the character root, and the whole
 * risk of a NEW optional string on an attacker-controlled document is that the
 * validator treats it more loosely than its siblings because it arrived later.
 * These cases are the sibling cases, asked of it.
 */
describe('a hostile or over-long character note', () => {
  const withNote = (notes: unknown) =>
    minimalDocument({
      character: { name: 'Adversary', notes },
    } as unknown as Partial<CharacterShareDocument>);

  it('names the field rather than reporting a byte-limit overflow', () => {
    expect(() =>
      validateShareDocument(
        withNote('x'.repeat(CHARACTER_TEXT_LIMITS.notes + 1)),
      ),
    ).toThrow(/character\.notes must be a string of 1-2000/);
    // Thrown synchronously, before any compression happens, exactly as the
    // weapon fields are: the message a user sees names the field.
    expect(() =>
      encodeShareFragment(
        withNote('x'.repeat(CHARACTER_TEXT_LIMITS.notes + 1)),
      ),
    ).toThrow(ShareValidationError);
    // Exactly at the cap is fine — the boundary is inclusive, so a cap set to
    // reject legitimate data would show up here rather than in the field.
    expect(() =>
      validateShareDocument(withNote('x'.repeat(CHARACTER_TEXT_LIMITS.notes))),
    ).not.toThrow();
  });

  it('refuses a non-string, an empty string, and an unknown neighbour', () => {
    for (const value of [42, true, null, [], { note: 'x' }, '']) {
      expect(() => validateShareDocument(withNote(value))).toThrow(
        ShareValidationError,
      );
    }
    expect(() =>
      validateShareDocument(
        minimalDocument({
          character: { name: 'Adversary', note: 'singular' },
        } as unknown as Partial<CharacterShareDocument>),
      ),
    ).toThrow(/character contains unknown field note/);
  });

  it('preserves an adversarial note through the wire without interpreting it', async () => {
    // A note is free text a stranger wrote. It must arrive as bytes, not as
    // markup, a path, or a prototype key.
    // The NUL is written as `\u0000` rather than as a literal byte: F14,
    // and a note is exactly the kind of user text that can contain one.
    const hostile =
      '__proto__ </script>\\n\t"; DROP TABLE characters; --\u0000\u202e\u{1f3b2}';
    const decoded = await throughShareLink(withNote(hostile));
    expect(decoded.character.notes).toBe(hostile);
    expect(Object.getPrototypeOf(decoded.character)).toBe(Object.prototype);
  });
});

describe('hostile and over-long weapon sections', () => {
  const weaponDocument = (weapon: Record<string, unknown>) =>
    minimalDocument({
      weapons: [
        {
          damage: { kind: 'not_recorded' },
          versatile_damage: { kind: 'not_applicable' },
          range: { kind: 'none' },
          ...weapon,
        },
      ],
    } as unknown as Partial<CharacterShareDocument>);

  it('names the offending field rather than reporting a byte-limit overflow', async () => {
    // WHY THE PER-FIELD CAPS EXIST. `other_properties` and `notes` are
    // unbounded TEXT and are the longest free prose a share payload carries
    // (`loadouts[].name` is user text too, but one short line). Without a
    // per-field cap the only thing that stops a hostile document is the
    // compressed-byte guard, which fires far away from the cause and says
    // nothing a reader could act on.
    for (const field of ['notes', 'other_properties'] as const) {
      const overlong = weaponDocument({
        name: 'Verbose Blade',
        [field]: 'x'.repeat(WEAPON_TEXT_LIMITS[field] + 1),
      });
      expect(() => validateShareDocument(overlong)).toThrow(
        new RegExp(`weapons\\[0\\]\\.${field} must be a string of 1-`),
      );
      // Thrown synchronously, before any compression happens: the encoder
      // validates first, so the specific message is what the user actually
      // sees rather than a byte-limit complaint from deep in the pipeline.
      expect(() => encodeShareFragment(overlong)).toThrow(ShareValidationError);
      // Exactly at the cap is fine: the boundary is inclusive, so a cap set to
      // reject legitimate data would show up here rather than in the field.
      expect(() =>
        validateShareDocument(
          weaponDocument({
            name: 'Verbose Blade',
            [field]: 'x'.repeat(WEAPON_TEXT_LIMITS[field]),
          }),
        ),
      ).not.toThrow();
    }
  });

  /**
   * THE ORACLE THE PREVIOUS TEST IS NOT.
   *
   * Asserting that exactly-the-cap is accepted cannot notice a cap set BELOW
   * what the app itself writes: it just measures the share boundary against
   * itself. This measures it against the OTHER boundary. Every value below is
   * first proved acceptable to `validateCharacterCommandPayload` — so a user
   * really can build this weapon and it really can be sitting in the table —
   * and only then handed to the share boundary.
   *
   * This is the test that was missing when `notes` was writable at 2000 and
   * shareable at 1000, and when a range was writable without bound and
   * shareable only to 100,000: both made a legitimately built character refuse
   * to export, with no remedy but deleting text the user meant to keep.
   */
  it('shares every weapon the write boundary is willing to store', async () => {
    const maximal = {
      name: 'N'.repeat(WEAPON_TEXT_LIMITS.name),
      // D27. `martial` rather than null, so this test covers the case where the
      // value has to SURVIVE the link rather than the case where its absence is
      // tolerated — the second is covered by the pre-D27 arity tests.
      proficiency_category: 'martial' as const,
      // D46: the command stores this, but the v2 share document deliberately
      // omits it. The share boundary is still required to accept the weapon.
      attack_kind: 'melee' as const,
      damage: {
        kind: 'dice' as const,
        dice: 'd'.repeat(WEAPON_TEXT_LIMITS.damage_dice),
      },
      damage_type: 't'.repeat(WEAPON_TEXT_LIMITS.damage_type),
      versatile_damage: {
        kind: 'dice' as const,
        dice: 'v'.repeat(WEAPON_TEXT_LIMITS.versatile_damage_dice),
      },
      finesse: true,
      heavy: true,
      light: true,
      loading: true,
      reach: true,
      thrown: true,
      two_handed: true,
      ammunition: true,
      ammunition_kind: 'a'.repeat(WEAPON_TEXT_LIMITS.ammunition_kind),
      range: {
        kind: 'ranged' as const,
        near_feet: WEAPON_RANGE_MAX_FEET,
        far_feet: WEAPON_RANGE_MAX_FEET,
      },
      mastery_property: 'Vex',
      other_properties: 'o'.repeat(WEAPON_TEXT_LIMITS.other_properties),
      notes: 'n'.repeat(WEAPON_TEXT_LIMITS.notes),
    };
    // The write boundary accepts it, so the table can hold it.
    expect(() =>
      validateCharacterCommandPayload({
        type: 'add_weapon',
        weapon: maximal,
      }),
    ).not.toThrow();

    // …and every v2 share field must cross a real link. D46 deliberately omits
    // attack_kind from this channel, so remove that one character-copy field
    // before constructing the frozen wire document.
    const { attack_kind: _attackKind, ...shareWeapon } = maximal;
    const shared = await throughShareLink(
      weaponDocument({
        ...shareWeapon,
        mastery_selected: true,
      }),
    );
    const weapon = shared.weapons?.[0];
    expect(weapon?.notes).toBe(maximal.notes);
    expect(weapon?.other_properties).toBe(maximal.other_properties);
    expect(weapon?.range).toEqual({
      kind: 'ranged',
      near_feet: WEAPON_RANGE_MAX_FEET,
      far_feet: WEAPON_RANGE_MAX_FEET,
    });
    expect(weapon?.name).toBe(maximal.name);
  });

  it('reports the aggregate overflow as a byte limit, which is what it is', async () => {
    // HONEST ABOUT WHAT THE CAPS DO NOT BUY. A per-field cap names a field; a
    // count cap names a section. Neither promises that 100 permitted weapons
    // fit in a URL, and they do not: maximum-length high-entropy prose does not
    // compress, so this legitimately reports the byte limit rather than
    // pretending some single field is at fault.
    let seed = 0x2f6e2b1;
    const noise = (length: number): string => {
      let out = '';
      for (let index = 0; index < length; index += 1) {
        // xorshift32 — enough entropy that gzip cannot erase the text, unlike a
        // short-cycle generator whose output compresses to nothing.
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        out += String.fromCharCode(33 + (Math.abs(seed) % 94));
      }
      return out;
    };
    const heavy = minimalDocument({
      weapons: Array.from({ length: SHARE_LIMITS.weapons }, (_, index) => ({
        name: `Blade ${index}`,
        damage: { kind: 'not_recorded' as const },
        versatile_damage: { kind: 'not_applicable' as const },
        range: { kind: 'none' as const },
        notes: noise(WEAPON_TEXT_LIMITS.notes),
        other_properties: noise(WEAPON_TEXT_LIMITS.other_properties),
      })),
    } as unknown as Partial<CharacterShareDocument>);

    // Every weapon is inside every cap: nothing here is a validation failure.
    expect(() => validateShareDocument(heavy)).not.toThrow();
    await expect(encodeShareFragment(heavy)).rejects.toThrow(
      `compressed document exceeds the ${SHARE_LIMITS.compressedBytes}-byte limit.`,
    );
  });

  it('refuses a mastery selection with no property, before any row is written', async () => {
    // The database's own CHECK. Reaching the INSERT with this pair aborts the
    // whole import transaction with a raw SQLITE_CONSTRAINT_CHECK that names
    // neither the weapon nor the field.
    const hostile = weaponDocument({
      name: 'Impossible Blade',
      mastery_selected: true,
    });
    expect(() => validateShareDocument(hostile)).toThrow(
      /selects a weapon mastery without naming the property/,
    );

    const targetDb = await database();
    expect(() => importCharacterShare(targetDb, hostile)).toThrow(
      ShareValidationError,
    );
    expect(targetDb.scalar('SELECT count(*) FROM character_weapons')).toBe(0);
    expect(targetDb.scalar('SELECT count(*) FROM characters')).toBe(0);
  });

  it('refuses an unknown mastery property, an unknown field, and a non-true flag', () => {
    expect(() =>
      validateShareDocument(
        weaponDocument({
          name: 'Blade',
          mastery_property: 'Obliterate',
          mastery_selected: true,
        }),
      ),
    ).toThrow(/weapons\[0\]\.mastery_property is unsupported/);

    expect(() =>
      validateShareDocument(
        weaponDocument({ name: 'Blade', weapon_template_id: 4 }),
      ),
    ).toThrow(/weapons\[0\] contains unknown field weapon_template_id/);

    // `false` is not the same as absent, and accepting it would give the wire
    // two encodings of one state.
    expect(() =>
      validateShareDocument(weaponDocument({ name: 'Blade', finesse: false })),
    ).toThrow(/weapons\[0\]\.finesse must be true when present/);

    expect(() => validateShareDocument(weaponDocument({}))).toThrow(
      /weapons\[0\] is missing name/,
    );
  });

  it('refuses a negative or absurd weapon range', () => {
    for (const value of [-1, 100_001, 1.5]) {
      expect(() =>
        validateShareDocument(
          weaponDocument({
            name: 'Blade',
            range: { kind: 'ranged', near_feet: value, far_feet: null },
          }),
        ),
      ).toThrow(/weapons\[0\]\.range\.near_feet must be an integer/);
    }
  });

  it('keeps duplicate weapons, which are a normal thing to own', async () => {
    // Deliberately NOT deduplicated, unlike every other section. Two identical
    // daggers are two daggers; each is its own row with its own mastery flag.
    const twoDaggers = minimalDocument({
      weapons: [
        {
          name: 'Dagger',
          damage: { kind: 'not_recorded' },
          versatile_damage: { kind: 'not_applicable' },
          range: { kind: 'none' },
        },
        {
          name: 'Dagger',
          damage: { kind: 'not_recorded' },
          versatile_damage: { kind: 'not_applicable' },
          range: { kind: 'none' },
        },
      ],
    } as unknown as Partial<CharacterShareDocument>);
    const shared = await throughShareLink(twoDaggers);
    expect(shared.weapons).toHaveLength(2);

    const targetDb = await database();
    const { characterId } = importCharacterShare(targetDb, shared);
    expect(
      targetDb.allRaw(
        'SELECT name FROM character_weapons WHERE character_id = ? ORDER BY id',
        [characterId],
      ),
    ).toEqual([{ name: 'Dagger' }, { name: 'Dagger' }]);
  });
});
