import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import { SpellAccessBuilder } from '../../../src/access/spell-access-builder';
import { CatalogImporter } from '../../../src/catalog/catalog-importer';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { UpdateClassCommand } from '../../../src/commands/update-class';
import { DatabaseContext } from '../../../src/db/database';
import { GrantRuleSlotGenerator } from '../../../src/grants/grant-rule-slot-generator';
import { CharacterWorkspaceBuilder } from '../../../src/queries/character-workspace-builder';
import { RpcClient, type RpcTransport } from '../../../src/rpc/client';
import type {
  RpcRequest,
  RpcResponse,
} from '../../../src/rpc/protocol';
import {
  ensureSharedSpell,
  exportCharacterShare,
  importCharacterShare,
  previewCharacterShare,
} from '../../../src/sharing/character-share';
import { createShareClient } from '../../../src/sharing/client';
import {
  decodeShareFragment,
  encodeShareFragment,
} from '../../../src/sharing/codec';
import {
  CHARACTER_SHARE_FORMAT,
  CHARACTER_SHARE_VERSION,
  ShareValidationError,
  type CharacterShareDocument,
} from '../../../src/sharing/schema';
import { handlers as sharingHandlers } from '../../../src/worker/handlers/sharing';
import type { HandlerContext } from '../../../src/worker/handler';
import { rpcRegistry } from '../../../src/worker/registry';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';
import { openTestDatabase } from '../../helpers/open-db';

const connections: Database[] = [];
const harnesses: RpcHarness[] = [];
const rpcClients: RpcClient[] = [];

afterEach(() => {
  for (const connection of connections.splice(0)) {
    connection.close();
  }
  for (const harness of harnesses.splice(0)) {
    harness.close();
  }
  for (const client of rpcClients.splice(0)) {
    client.close();
  }
});

class RegistryTransport implements RpcTransport {
  readonly #messages = new Set<
    (event: MessageEvent<RpcResponse>) => void
  >();
  readonly #errors = new Set<(event: ErrorEvent) => void>();

  constructor(private readonly context: HandlerContext) {}

  postMessage(message: RpcRequest): void {
    void rpcRegistry.dispatch(message, this.context).then(
      (response) => {
        const event = new MessageEvent<RpcResponse>('message', {
          data: response,
        });
        for (const listener of this.#messages) {
          listener(event);
        }
      },
      (error: unknown) => {
        const event = new ErrorEvent('error', {
          message: error instanceof Error ? error.message : String(error),
        });
        for (const listener of this.#errors) {
          listener(event);
        }
      },
    );
  }

  addEventListener(
    type: 'message',
    listener: (event: MessageEvent<RpcResponse>) => void,
  ): void;
  addEventListener(
    type: 'error',
    listener: (event: ErrorEvent) => void,
  ): void;
  addEventListener(
    type: 'message' | 'error',
    listener:
      | ((event: MessageEvent<RpcResponse>) => void)
      | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') {
      this.#messages.add(
        listener as (event: MessageEvent<RpcResponse>) => void,
      );
    } else {
      this.#errors.add(listener as (event: ErrorEvent) => void);
    }
  }

  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent<RpcResponse>) => void,
  ): void;
  removeEventListener(
    type: 'error',
    listener: (event: ErrorEvent) => void,
  ): void;
  removeEventListener(
    type: 'message' | 'error',
    listener:
      | ((event: MessageEvent<RpcResponse>) => void)
      | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') {
      this.#messages.delete(
        listener as (event: MessageEvent<RpcResponse>) => void,
      );
    } else {
      this.#errors.delete(listener as (event: ErrorEvent) => void);
    }
  }
}

async function database(): Promise<DatabaseContext> {
  const connection = await openTestDatabase();
  connections.push(connection);
  return new DatabaseContext(connection);
}

function seedCatalog(db: DatabaseContext, padding = false) {
  if (padding) {
    db.exec(
      `INSERT INTO class_definitions
         (content_key, name, rules_edition)
       VALUES ('2024:class:padding', 'Padding', '2024')`,
    );
  }
  const identityId = db.exec(
    `INSERT INTO spell_identities
       (content_key, canonical_name, normalized_name)
     VALUES ('spell:shield', 'Shield', 'shield')`,
  ).lastInsertId;
  const spellId = db.exec(
    `INSERT INTO spell_versions (
       content_key, spell_identity_id, display_name, rules_edition,
       level, school, is_active
     ) VALUES ('2024:shield', ?, 'Shield', '2024', 1, 'Abjuration', 1)`,
    [identityId],
  ).lastInsertId;
  const classId = db.exec(
    `INSERT INTO class_definitions (
       content_key, name, rules_edition, spellcasting_ability,
       progression_type
     ) VALUES (
       '2024:class:wizard', 'Wizard', '2024', 'intelligence', 'full'
     )`,
  ).lastInsertId;
  db.exec(
    `INSERT INTO class_progressions (
       class_definition_id, class_level, prepared_count, grant_rules
     ) VALUES (?, 1, 1, ?)`,
    [
      classId,
      JSON.stringify([
        {
          kind: 'choice_from_query',
          rule_key: 'wizard-prepared',
          count: 1,
          bucket: 'prepared',
          level_min: 0,
          level_max: 9,
        },
      ]),
    ],
  );
  return { classId, spellId };
}

function seedCharacter(
  db: DatabaseContext,
  catalog: ReturnType<typeof seedCatalog>,
): number {
  const now = '2026-07-24T12:00:00.000Z';
  const characterId = db.exec(
    `INSERT INTO characters (
       name, strength, dexterity, constitution, intelligence, wisdom,
       charisma, proficiency_bonus_override, allow_legacy
     ) VALUES ('Share Hero', 8, 14, 13, 18, 12, 10, 4, 1)`,
  ).lastInsertId;
  db.exec(
    `INSERT INTO character_class_levels (
       character_id, class_definition_id, level, is_starting_class,
       spellcasting_ability_override
     ) VALUES (?, ?, 4, 1, 'intelligence')`,
    [characterId, catalog.classId],
  );
  const sourceId = db.exec(
    `INSERT INTO character_source_instances (
       character_id, instance_uuid, source_type, source_definition_id,
       display_name, config, acquired_at_character_level, state
     ) VALUES (
       ?, 'share-wizard-source', 'class', ?, 'Wizard 4',
       '{"spellcasting_ability":"intelligence","custom_choice":"ward"}',
       1, 'active'
     )`,
    [characterId, catalog.classId],
  ).lastInsertId;
  new GrantRuleSlotGenerator(db).generateForSource(sourceId);
  db.exec(
    `UPDATE spell_selection_slots
     SET current_spell_version_id = ?, state = 'kept_override',
         override_note = 'source-only note', selection_eligibility = 'valid'
     WHERE character_id = ?`,
    [catalog.spellId, characterId],
  );
  db.exec(
    `INSERT INTO wizard_spellbook_entries
       (character_id, spell_version_id)
     VALUES (?, ?)`,
    [characterId, catalog.spellId],
  );
  db.exec(
    `INSERT INTO character_spell_preferences
       (character_id, spell_version_id, favourite, notes)
     VALUES (?, ?, 1, 'drop me')`,
    [characterId, catalog.spellId],
  );
  db.exec(
    `INSERT INTO character_rule_overrides
       (character_id, rule_key, value, note)
     VALUES (?, 'wizard-prepared', '{"count":7}', 'drop me')`,
    [characterId],
  );
  db.exec(
    `INSERT INTO warning_acknowledgements
       (character_id, warning_fingerprint, note)
     VALUES (?, 'warning:shield', 'drop me')`,
    [characterId],
  );
  const loadoutId = db.exec(
    `INSERT INTO spell_loadouts (character_id, name, notes)
     VALUES (?, 'Defense', 'drop me')`,
    [characterId],
  ).lastInsertId;
  db.exec(
    `INSERT INTO spell_loadout_entries (
       spell_loadout_id, spell_version_id, role, created_at, updated_at
     ) VALUES (?, ?, 'defense', ?, ?)`,
    [loadoutId, catalog.spellId, now, now],
  );
  return characterId;
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

function choices(db: DatabaseContext, characterId: number) {
  return {
    character: db.one(
      `SELECT name, strength, dexterity, constitution, intelligence,
              wisdom, charisma, proficiency_bonus_override,
              rules_edition_preference, allow_legacy
       FROM characters WHERE id = ?`,
      [characterId],
    ),
    classes: db.all(
      `SELECT definition.content_key, level.level,
              level.is_starting_class,
              level.spellcasting_ability_override
       FROM character_class_levels AS level
       INNER JOIN class_definitions AS definition
         ON definition.id = level.class_definition_id
       WHERE level.character_id = ?`,
      [characterId],
    ),
    sources: db.all(
      `SELECT source_type, display_name, config
       FROM character_source_instances
       WHERE character_id = ?
       ORDER BY source_type, display_name`,
      [characterId],
    ),
    selections: db.all(
      `SELECT slot.rule_key, slot.ordinal, version.content_key,
              slot.state
       FROM spell_selection_slots AS slot
       INNER JOIN spell_versions AS version
         ON version.id = slot.current_spell_version_id
       WHERE slot.character_id = ?`,
      [characterId],
    ),
    spellbook: db.all(
      `SELECT version.content_key
       FROM wizard_spellbook_entries AS entry
       INNER JOIN spell_versions AS version
         ON version.id = entry.spell_version_id
       WHERE entry.character_id = ?`,
      [characterId],
    ),
    preferences: db.all(
      `SELECT version.content_key, preference.favourite
       FROM character_spell_preferences AS preference
       INNER JOIN spell_versions AS version
         ON version.id = preference.spell_version_id
       WHERE preference.character_id = ?`,
      [characterId],
    ),
    overrides: db.all(
      `SELECT rule_key, value FROM character_rule_overrides
       WHERE character_id = ?`,
      [characterId],
    ),
    acknowledgements: db.all(
      `SELECT warning_fingerprint FROM warning_acknowledgements
       WHERE character_id = ?`,
      [characterId],
    ),
    loadouts: db.all(
      `SELECT loadout.name, version.content_key, entry.role
       FROM spell_loadouts AS loadout
       INNER JOIN spell_loadout_entries AS entry
         ON entry.spell_loadout_id = loadout.id
       INNER JOIN spell_versions AS version
         ON version.id = entry.spell_version_id
       WHERE loadout.character_id = ?`,
      [characterId],
    ),
  };
}

describe('minimal character sharing', () => {
  it('rebuilds derived slots and round-trips all opted-in choices in a second database', async () => {
    const source = await database();
    const sourceCatalog = seedCatalog(source);
    const sourceId = seedCharacter(source, sourceCatalog);
    const document = exportCharacterShare(source, sourceId, {
      acknowledgements: true,
      loadouts: true,
    });
    expect(JSON.stringify(document)).not.toContain('drop me');
    expect(document.classes[0]?.id).toBe(0);
    expect(document.selections[0]).toMatchObject({
      ref: 0,
      ruleKey: 'wizard-prepared',
      spellKey: '2024:shield',
      keep: true,
    });

    const target = await database();
    seedCatalog(target, true);
    const shared = await decodeShareFragment(
      await encodeShareFragment(document),
    );
    const imported = importCharacterShare(target, shared);
    expect(choices(target, imported.characterId)).toEqual(
      choices(source, sourceId),
    );
    expect(
      target.scalar(
        `SELECT count(*) FROM spell_selection_slots
         WHERE character_id = ?`,
        [imported.characterId],
      ),
    ).toBe(1);
  });

  it('applies byte-faithful subclass config before regenerating configured slots', async () => {
    const seedSubclass = (db: DatabaseContext, classId: number) =>
      db.exec(
        `INSERT INTO subclass_definitions (
           content_key, class_definition_id, name, rules_edition,
           spellcasting_ability, grant_rules
         ) VALUES (
           '2024:subclass:configured-path', ?, 'Configured Path',
           '2024', 'wisdom', ?
         )`,
        [
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
    const source = await database();
    const catalog = seedCatalog(source);
    const subclassId = seedSubclass(source, catalog.classId);
    const characterId = seedCharacter(source, catalog);
    source.exec(
      `UPDATE character_class_levels
       SET subclass_definition_id = ? WHERE character_id = ?`,
      [subclassId, characterId],
    );
    const config = {
      spellcasting_ability: 'wisdom',
      enabled: 'yes',
      path_choice: 'tab\tline\nemoji🧙',
    };
    const subclassSourceId = source.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, acquired_at_character_level, state
       ) VALUES (?, 'configured-subclass', 'subclass', ?,
                 'Configured Path', ?, 4, 'active')`,
      [characterId, subclassId, JSON.stringify(config)],
    ).lastInsertId;
    new GrantRuleSlotGenerator(source).generateForSource(subclassSourceId);
    source.exec(
      `UPDATE spell_selection_slots
       SET current_spell_version_id = ?, selection_eligibility = 'valid'
       WHERE source_instance_id = ? AND rule_key = 'configured-choice'`,
      [catalog.spellId, subclassSourceId],
    );

    const shared = await decodeShareFragment(
      await encodeShareFragment(exportCharacterShare(source, characterId)),
    );
    expect(shared.classes[0]?.subclassConfig).toEqual(config);
    const target = await database();
    const targetCatalog = seedCatalog(target);
    seedSubclass(target, targetCatalog.classId);
    const imported = importCharacterShare(target, shared);
    expect(
      target.one(
        `SELECT source.config, slot.rule_key, slot.ordinal,
                version.content_key
         FROM character_source_instances AS source
         INNER JOIN spell_selection_slots AS slot
           ON slot.source_instance_id = source.id
         INNER JOIN spell_versions AS version
           ON version.id = slot.current_spell_version_id
         WHERE source.character_id = ?
           AND source.source_type = 'subclass'`,
        [imported.characterId],
      ),
    ).toEqual({
      config: JSON.stringify(config),
      rule_key: 'configured-choice',
      ordinal: 1,
      content_key: '2024:shield',
    });
  });

  it('preserves tabs, newlines, and emoji in names and config strings', async () => {
    const source = await database();
    const catalog = seedCatalog(source);
    const characterId = seedCharacter(source, catalog);
    const exact = 'tab\tline\nemoji🧙';
    source.exec('UPDATE characters SET name = ? WHERE id = ?', [
      exact,
      characterId,
    ]);
    source.exec(
      `UPDATE character_source_instances
       SET config = ? WHERE character_id = ? AND source_type = 'class'`,
      [
        JSON.stringify({
          spellcasting_ability: 'intelligence',
          path_choice: exact,
        }),
        characterId,
      ],
    );
    const shared = await decodeShareFragment(
      await encodeShareFragment(exportCharacterShare(source, characterId)),
    );
    expect(shared.character.name).toBe(exact);
    expect(shared.classes[0]?.config?.path_choice).toBe(exact);

    const target = await database();
    seedCatalog(target);
    const imported = importCharacterShare(target, shared);
    expect(
      target.scalar('SELECT name FROM characters WHERE id = ?', [
        imported.characterId,
      ]),
    ).toBe(exact);
    expect(
      JSON.parse(
        String(
          target.scalar(
            `SELECT config FROM character_source_instances
             WHERE character_id = ? AND source_type = 'class'`,
            [imported.characterId],
          ),
        ),
      ),
    ).toMatchObject({ path_choice: exact });
  });

  it('does not advertise readiness when a transitive grant source is missing', async () => {
    const target = await database();
    target.exec(
      `INSERT INTO feat_definitions (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES (?, 'Granting Parent', '2024', 1, ?)`,
      [
        '2024:feat:granting-parent',
        JSON.stringify([
          {
            kind: 'grant_source',
            rule_key: 'missing-child',
            count: 1,
            source_type: 'feat',
            source_definition_key: '2024:feat:missing-child',
          },
        ]),
      ],
    );
    const document: CharacterShareDocument = {
      format: CHARACTER_SHARE_FORMAT,
      version: CHARACTER_SHARE_VERSION,
      character: { name: 'Missing Child' },
      classes: [],
      sources: [
        {
          id: 0,
          type: 'feat',
          key: '2024:feat:granting-parent',
          acquired: 1,
        },
      ],
      selections: [],
      spellbook: [],
      preferences: [],
      overrides: [],
    };
    expect(() => importCharacterShare(target, document)).toThrow(
      /could not resolve its definition/,
    );
    expect(() => previewCharacterShare(target, document)).toThrow(
      /could not resolve its definition/,
    );
  });

  it('preserves subclass acquisition timing across its descendant tree', async () => {
    const seedTimingCatalog = (db: DatabaseContext) => {
      const otherClassId = db.exec(
        `INSERT INTO class_definitions (
           content_key, name, rules_edition, spellcasting_ability,
           progression_type
         ) VALUES (
           '2024:class:timing-start', 'Timing Start', '2024',
           'wisdom', 'full'
         )`,
      ).lastInsertId;
      db.exec(
        `INSERT INTO class_progressions (
           class_definition_id, class_level, grant_rules
         ) VALUES (?, 1, '[]')`,
        [otherClassId],
      );
      const classId = db.exec(
        `INSERT INTO class_definitions (
           content_key, name, rules_edition, spellcasting_ability,
           progression_type
         ) VALUES (
           '2024:class:timing', 'Timing', '2024',
           'intelligence', 'full'
         )`,
      ).lastInsertId;
      db.exec(
        `INSERT INTO class_progressions (
           class_definition_id, class_level, grant_rules
         ) VALUES (?, 1, '[]')`,
        [classId],
      );
      db.exec(
        `INSERT INTO background_definitions (
           content_key, name, rules_edition, grant_rules
         ) VALUES (
           '2024:background:timing-grandchild',
           'Timing Grandchild', '2024', '[]'
         )`,
      );
      db.exec(
        `INSERT INTO feat_definitions (
           content_key, name, rules_edition, repeatable, grant_rules
         ) VALUES (?, 'Timing Child', '2024', 1, ?)`,
        [
          '2024:feat:timing-child',
          JSON.stringify([
            {
              kind: 'grant_source',
              rule_key: 'timing-grandchild',
              count: 1,
              source_type: 'background',
              source_definition_key:
                '2024:background:timing-grandchild',
            },
          ]),
        ],
      );
      const subclassId = db.exec(
        `INSERT INTO subclass_definitions (
           content_key, class_definition_id, name, rules_edition,
           spellcasting_ability, grant_rules
         ) VALUES (?, ?, 'Timing Path', '2024', 'intelligence', ?)`,
        [
          '2024:subclass:timing-path',
          classId,
          JSON.stringify([
            {
              kind: 'grant_source',
              rule_key: 'timing-child',
              count: 1,
              source_type: 'feat',
              source_definition_key: '2024:feat:timing-child',
            },
          ]),
        ],
      ).lastInsertId;
      return { otherClassId, classId, subclassId };
    };
    const source = await database();
    const catalog = seedTimingCatalog(source);
    const characterId = source.exec(
      "INSERT INTO characters (name) VALUES ('Timing Hero')",
    ).lastInsertId;
    const integrity = new CharacterCommandIntegrity(
      'sharing-timing-test-key',
    );
    new UpdateClassCommand(
      source,
      {
        type: 'update_class',
        class_definition_id: catalog.otherClassId,
        level: 2,
        subclass_definition_id: null,
      },
      integrity,
    ).apply(characterId);
    new UpdateClassCommand(
      source,
      {
        type: 'update_class',
        class_definition_id: catalog.classId,
        level: 5,
        subclass_definition_id: catalog.subclassId,
      },
      integrity,
    ).apply(characterId);

    const target = await database();
    seedTimingCatalog(target);
    const imported = importCharacterShare(
      target,
      await decodeShareFragment(
        await encodeShareFragment(
          exportCharacterShare(source, characterId),
        ),
      ),
    );
    const timing = (db: DatabaseContext, id: number) =>
      db.all(
        `SELECT source.source_type,
                COALESCE(
                  subclass.content_key,
                  feat.content_key,
                  background.content_key
                ) AS content_key,
                source.acquired_at_character_level
         FROM character_source_instances AS source
         LEFT JOIN subclass_definitions AS subclass
           ON source.source_type = 'subclass'
          AND subclass.id = source.source_definition_id
         LEFT JOIN feat_definitions AS feat
           ON source.source_type = 'feat'
          AND feat.id = source.source_definition_id
         LEFT JOIN background_definitions AS background
           ON source.source_type = 'background'
          AND background.id = source.source_definition_id
         WHERE source.character_id = ? AND source.source_type != 'class'
         ORDER BY source.source_type, content_key`,
        [id],
      );
    expect(timing(target, imported.characterId)).toEqual(
      timing(source, characterId),
    );
  });

  it('keeps unknown spells as safe placeholders and upgrades them in place on catalog import', async () => {
    const target = await database();
    seedCatalog(target);
    const source = await database();
    const sourceCatalog = seedCatalog(source);
    const sourceId = seedCharacter(source, sourceCatalog);
    const base = exportCharacterShare(source, sourceId, {
      loadouts: true,
    });
    const unknownKey = '2024:com.example.spells:starward-aegis';
    const document = {
      ...base,
      selections: base.selections.map((selection) => ({
        ...selection,
        spellKey: unknownKey,
        spellName: 'Starward Aegis',
      })),
      spellbook: [unknownKey],
      preferences: [{ spellKey: unknownKey, favourite: true }],
      loadouts: [
        {
          name: 'Unknown',
          entries: [{ spellKey: unknownKey, role: 'defense' }],
        },
      ],
    };
    const shared = await decodeShareFragment(
      await encodeShareFragment(document),
    );
    const imported = importCharacterShare(target, shared);
    const placeholder = target.one(
      `SELECT id, display_name, level, school, is_active, provenance,
              short_summary, casting_time, material_component_summary
       FROM spell_versions WHERE content_key = ?`,
      [unknownKey],
    );
    expect(placeholder).toMatchObject({
      display_name: 'Starward Aegis',
      level: -1,
      school: 'Unknown',
      is_active: 0,
      provenance: 'placeholder',
      short_summary: 'Not imported',
      casting_time: null,
      material_component_summary: null,
    });

    expect(
      new SpellAccessBuilder(target).buildForCharacter(
        imported.characterId,
      ),
    ).toEqual([]);
    const workspace = new CharacterWorkspaceBuilder(target).build(
      imported.characterId,
    );
    expect(workspace.slots[0]).toMatchObject({
      spell_name: 'Starward Aegis',
      placeholder: true,
      eligibility: 'invalid',
    });
    expect(workspace.placeholder_spells).toEqual([
      { spellKey: unknownKey, name: 'Starward Aegis' },
    ]);

    const placeholderId = Number(placeholder?.id);
    const summary = new CatalogImporter(target).import({
      documents: [
        JSON.stringify([
          {
            identityKey: 'spell:starward-aegis',
            versionKey: unknownKey,
            name: 'Starward Aegis',
            edition: '2024',
            level: 2,
            school: 'Abjuration',
            castingTime: '1 reaction',
            range: 'Self',
            components: 'V',
            duration: '1 round',
            concentration: false,
            ritual: false,
            attackModes: [],
            saveAbilities: [],
            effectReliabilityCategory: 'fixed_effect',
            spellLists: ['Wizard'],
            sourceBooks: ['Homebrew'],
            sourceSlug: 'starward-aegis',
          },
        ]),
      ],
    });
    expect(summary).toMatchObject({ updated: 1, created: 0 });
    expect(
      target.one(
        `SELECT id, display_name, level, school, is_active, provenance
         FROM spell_versions WHERE content_key = ?`,
        [unknownKey],
      ),
    ).toEqual({
      id: placeholderId,
      display_name: 'Starward Aegis',
      level: 2,
      school: 'Abjuration',
      is_active: 1,
      provenance: 'import',
    });
    expect(
      new SpellAccessBuilder(target).buildForCharacter(
        imported.characterId,
      ),
    ).toHaveLength(1);
  });

  it('keeps the shared name of a placeholder referenced only by a loadout', async () => {
    const source = await database();
    const characterId = source.exec(
      "INSERT INTO characters (name) VALUES ('Loadout Mage')",
    ).lastInsertId;
    const spellKey = '2024:org.example.spells:loadout-only';
    const spellName = 'Shared Loadout Name 🧪';
    const spellId = ensureSharedSpell(source, spellKey, spellName);
    const loadoutId = source.exec(
      `INSERT INTO spell_loadouts (character_id, name)
       VALUES (?, 'Unknown magic')`,
      [characterId],
    ).lastInsertId;
    source.exec(
      `INSERT INTO spell_loadout_entries (
         spell_loadout_id, spell_version_id, role
       ) VALUES (?, ?, 'utility')`,
      [loadoutId, spellId],
    );
    const shared = await decodeShareFragment(
      await encodeShareFragment(
        exportCharacterShare(source, characterId, { loadouts: true }),
      ),
    );
    expect(shared.placeholders).toEqual([{ spellKey, spellName }]);

    const target = await database();
    importCharacterShare(target, shared);
    expect(
      target.scalar(
        'SELECT display_name FROM spell_versions WHERE content_key = ?',
        [spellKey],
      ),
    ).toBe(spellName);
  });

  it('wraps every low-level malformed fragment as ShareValidationError', async () => {
    const invalidUtf8 = await fragmentFromBytes(
      new Uint8Array([0xff, 0xfe, 0xfd]),
    );
    const nonJson = await fragmentFromBytes(
      new TextEncoder().encode('not JSON'),
    );
    const cases = [
      () => decodeShareFragment('%%%'),
      () => decodeShareFragment('bm90IGd6aXA'),
      () => decodeShareFragment(invalidUtf8),
      () => decodeShareFragment(nonJson),
    ];
    for (const decode of cases) {
      await expect(decode()).rejects.toBeInstanceOf(ShareValidationError);
    }
  });

  it('exposes export, non-mutating preview, and explicit import through worker RPC', async () => {
    const harness = await createRpcHarness(sharingHandlers);
    harnesses.push(harness);
    const catalog = seedCatalog(harness.context.db);
    const characterId = seedCharacter(harness.context.db, catalog);
    const exported = await harness.call<
      {
        characterId: number;
        acknowledgements: boolean;
        loadouts: boolean;
      },
      ReturnType<typeof exportCharacterShare>
    >('share.exportCharacter', {
      characterId,
      acknowledgements: false,
      loadouts: true,
    });
    if (!exported.ok) {
      throw new Error(exported.error.message);
    }
    const fragment = await encodeShareFragment(exported.result);

    const previewed = await harness.call<
      { fragment: string },
      { name: string }
    >('share.preview', { fragment });
    expect(previewed).toMatchObject({
      ok: true,
      result: { name: 'Share Hero' },
    });
    expect(harness.context.db.scalar('SELECT count(*) FROM characters')).toBe(
      1,
    );

    const imported = await harness.call<
      { fragment: string },
      { characterId: number }
    >('share.importCharacter', { fragment });
    expect(imported).toMatchObject({
      ok: true,
      result: { characterId: 2 },
    });
    expect(harness.context.db.scalar('SELECT count(*) FROM characters')).toBe(
      2,
    );
  });

  it('wires createShareClient through production registry discovery and validates sharing params', async () => {
    const harness = await createRpcHarness([]);
    harnesses.push(harness);
    const catalog = seedCatalog(harness.context.db);
    const characterId = seedCharacter(harness.context.db, catalog);
    const rpc = new RpcClient(new RegistryTransport(harness.context));
    rpcClients.push(rpc);
    const client = createShareClient(rpc);

    expect(rpcRegistry.methods).toEqual(
      expect.arrayContaining([
        'share.exportCharacter',
        'share.preview',
        'share.importCharacter',
      ]),
    );

    const defaults = await client.exportDebug(characterId);
    expect(defaults.acknowledgements).toBeUndefined();
    expect(defaults.loadouts).toBeUndefined();
    const optedIn = await client.exportDebug(characterId, {
      acknowledgements: true,
      loadouts: true,
    });
    expect(optedIn.acknowledgements).toEqual([
      { warning: 'warning:shield' },
    ]);
    expect(optedIn.loadouts).toEqual([
      {
        name: 'Defense',
        entries: [{ spellKey: '2024:shield', role: 'defense' }],
      },
    ]);

    const fragment = await client.createFragment(characterId, {
      acknowledgements: true,
      loadouts: true,
    });
    await expect(decodeShareFragment(fragment)).resolves.toEqual(optedIn);
    await expect(client.preview(fragment)).resolves.toMatchObject({
      name: 'Share Hero',
      includesAcknowledgements: true,
      includesLoadouts: true,
    });
    expect(harness.context.db.scalar('SELECT count(*) FROM characters')).toBe(
      1,
    );
    await expect(client.importCharacter(fragment)).resolves.toEqual({
      characterId: 2,
    });

    const invalidRequests: readonly {
      method: string;
      params: unknown;
    }[] = [
      {
        method: 'share.exportCharacter',
        params: {
          characterId,
          acknowledgements: false,
        },
      },
      {
        method: 'share.exportCharacter',
        params: {
          characterId: 0,
          acknowledgements: false,
          loadouts: false,
        },
      },
      { method: 'share.preview', params: { fragment: 42 } },
      {
        method: 'share.preview',
        params: { fragment, extra: true },
      },
      { method: 'share.importCharacter', params: null },
      {
        method: 'share.importCharacter',
        params: { fragment, extra: true },
      },
    ];
    for (const [index, request] of invalidRequests.entries()) {
      await expect(
        rpcRegistry.dispatch(
          {
            id: 10_000 + index,
            method: request.method,
            params: request.params,
          },
          harness.context,
        ),
      ).resolves.toMatchObject({
        id: 10_000 + index,
        ok: false,
        error: { code: 'invalid_params' },
      });
    }
  });
});
