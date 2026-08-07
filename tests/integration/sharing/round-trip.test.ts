import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import { SpellAccessBuilder } from '../../../src/access/spell-access-builder';
import { CatalogImporter } from '../../../src/catalog/catalog-importer';
import {
  normalizeContentIdentityName,
  type ContentKind,
} from '../../../src/catalog/content-identity';
import {
  catalogContentKeyKinds,
  ensureBundledStableContentIdentity,
} from '../../../src/catalog/content-registry';
import { AddSourceCommand } from '../../../src/commands/add-source';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { RemoveSourceCommand } from '../../../src/commands/remove-source';
import { UpdateClassCommand } from '../../../src/commands/update-class';
import type { SqlRow } from '../../../src/db/codecs';
import { DatabaseContext } from '../../../src/db/database';
import { GrantRuleSlotGenerator } from '../../../src/grants/grant-rule-slot-generator';
import { CharacterWorkspaceBuilder } from '../../../src/queries/character-workspace-builder';
import { resolveCharacterAbilities } from '../../../src/rules/ability-contributions';
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
  validateShareDocument,
} from '../../../src/sharing/schema';
import { ShareWireRetirementError } from '../../../src/sharing/wire-schemas';
import { handlers as sharingHandlers } from '../../../src/worker/handlers/sharing';
import { buildAgentReference } from '../../../src/ui/screens/planner/agent-reference';
import type { HandlerContext } from '../../../src/worker/handler';
import { rpcRegistry } from '../../../src/worker/registry';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';
import { openTestDatabase } from '../../helpers/open-db';
import { raiseClassLevelForTest } from '../../helpers/class-levels';

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

function registerFixtureIdentity(
  db: DatabaseContext,
  kind: ContentKind,
  contentKey: string,
  name: string,
): void {
  ensureBundledStableContentIdentity(db, {
    kind,
    contentKey,
    normalizedName: normalizeContentIdentityName(name),
  });
}

function seedCatalog(db: DatabaseContext, padding = false) {
  if (padding) {
    registerFixtureIdentity(db, 'class', '2024:class:padding', 'Padding');
    db.exec(
      `INSERT INTO class_definitions
         (content_key, name, rules_edition)
       VALUES ('2024:class:padding', 'Padding', '2024')`,
    );
  }
  const identityId = db.exec(
    `INSERT INTO spell_identities
       (content_key, canonical_name, normalized_name)
     VALUES ('spell:fixture-shield', 'Fixture Shield', 'fixture shield')`,
  ).lastInsertId;
  registerFixtureIdentity(db, 'spell', '2024:fixture-shield', 'Fixture Shield');
  const spellId = db.exec(
    `INSERT INTO spell_versions (
       content_key, spell_identity_id, display_name, rules_edition,
       level, school, is_active
     ) VALUES (
       '2024:fixture-shield', ?, 'Fixture Shield', '2024',
       1, 'Abjuration', 1
     )`,
    [identityId],
  ).lastInsertId;
  // `2024:class:wizard` is bundled content, so on a real application database
  // (the RPC harness) the SRD Wizard is already there, while on a bare
  // `database()` nothing is. The upsert below writes EVERY column of the
  // definition and of the level-1 progression, so both rows are byte-for-byte
  // the fixture's own either way and no bundled value can leak into an
  // assertion.
  //
  // What it does NOT equalise: on a seeded database the bundled Wizard levels
  // 2-20 survive alongside the pinned level 1, and `seedCharacter` builds a
  // level-4 Wizard, so the harness-backed tests generate the bundled level 2-4
  // grant rules that the bare-database tests do not. Nothing here asserts the
  // generated slot set, so that difference is inert — but it is a difference,
  // and any future assertion on slot counts must seed its own levels rather
  // than trust this fixture to be identical on both paths.
  registerFixtureIdentity(db, 'class', '2024:class:wizard', 'Wizard');
  db.exec(
    `INSERT INTO class_definitions (
       content_key, name, rules_edition, spellcasting_ability,
       progression_type, caster_fraction, caster_rounding, prepares_or_knows,
       supports_ritual_casting, ritual_casting_mode,
       primary_ability_expression, notes, created_at, updated_at
     ) VALUES (
       '2024:class:wizard', 'Wizard', '2024', 'intelligence', 'full',
       NULL, NULL, NULL, 0, NULL, NULL, NULL, NULL, NULL
     )
     ON CONFLICT(content_key) DO UPDATE SET
       name = excluded.name,
       rules_edition = excluded.rules_edition,
       spellcasting_ability = excluded.spellcasting_ability,
       progression_type = excluded.progression_type,
       caster_fraction = excluded.caster_fraction,
       caster_rounding = excluded.caster_rounding,
       prepares_or_knows = excluded.prepares_or_knows,
       supports_ritual_casting = excluded.supports_ritual_casting,
       ritual_casting_mode = excluded.ritual_casting_mode,
       primary_ability_expression = excluded.primary_ability_expression,
       notes = excluded.notes,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at`,
  );
  const classId = Number(
    db.scalar<number>(
      "SELECT id FROM class_definitions WHERE content_key = '2024:class:wizard'",
    ),
  );
  db.exec(
    `INSERT INTO class_progressions (
       class_definition_id, class_level, cantrips_known, prepared_count,
       slots, pact_slots, grant_rules, created_at, updated_at
     ) VALUES (?, 1, 0, 1, NULL, NULL, ?, NULL, NULL)
     ON CONFLICT(class_definition_id, class_level) DO UPDATE SET
       cantrips_known = excluded.cantrips_known,
       prepared_count = excluded.prepared_count,
       slots = excluded.slots,
       pact_slots = excluded.pact_slots,
       grant_rules = excluded.grant_rules,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at`,
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

/**
 * THE SENDER'S OWN NOTE ABOUT THEIR CHARACTER — `characters.notes`, Q12.
 *
 * Deliberately the shape of something a person would not want sent by accident,
 * and deliberately full of the characters a transport gets wrong: a newline, a
 * tab, an emoji, a double quote and a backslash. A note that round-trips is a
 * claim about bytes, not about strings that happen to be ASCII.
 */
const SENDER_NOTE =
  '[notes sentinel] Table politics 🎲\tdo NOT share:\nAsked "why?" about Rhea\'s arc \\ unresolved.';
const SENDER_ALIGNMENT = '[alignment sentinel] Chaotic Good';
const SENDER_APPEARANCE =
  '[appearance sentinel] Copper scales 🎲\nBlue cloak.';
const SENDER_BACKSTORY =
  '[backstory sentinel] Left Waterdeep after the watch asked "why?" \\ twice.';

function seedCharacter(
  db: DatabaseContext,
  catalog: ReturnType<typeof seedCatalog>,
): number {
  const now = '2026-07-24T12:00:00.000Z';
  const characterId = db.exec(
    `INSERT INTO characters (
       name, strength, dexterity, constitution, intelligence, wisdom,
       charisma, proficiency_bonus_override, allow_legacy, alignment,
       appearance, backstory, notes
     ) VALUES ('Share Hero', 8, 14, 13, 18, 12, 10, 4, 1, ?, ?, ?, ?)`,
    [SENDER_ALIGNMENT, SENDER_APPEARANCE, SENDER_BACKSTORY, SENDER_NOTE],
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
  // A described weapon and a half-entered one. The second exists to prove the
  // link does not fill in what the user has not typed: `character_weapons`
  // treats a name-only row as a legitimate state, so the share must too (D6b).
  db.exec(
    `INSERT INTO character_weapons (
       character_id, name, damage_kind, damage_dice, damage_type,
       versatile_damage_kind, versatile_damage_dice,
       finesse, thrown, ammunition, ammunition_kind, range_kind,
       range_near_feet, range_far_feet, mastery_property, mastery_selected,
       other_properties,
       notes, created_at, updated_at
     ) VALUES (
       ?, 'Heirloom Longsword', 'dice', '1d8', 'Slashing', 'dice', '1d10',
       0, 1, 1, 'bolt',
       'ranged', 20, 60, 'Sap', 1, 'Notched near the hilt', 'from the barrow', ?, ?
     )`,
    [characterId, now, now],
  );
  db.exec(
    `INSERT INTO character_weapons (character_id, name, created_at, updated_at)
     VALUES (?, 'Half-entered club', ?, ?)`,
    [characterId, now, now],
  );
  return characterId;
}

/** The weapon columns a share is supposed to carry, in a stable order. */
const PORTABLE_WEAPON_COLUMNS = [
  'name',
  'damage_kind',
  'damage_dice',
  'damage_flat',
  'damage_custom',
  'damage_type',
  'versatile_damage_kind',
  'versatile_damage_dice',
  'versatile_damage_flat',
  'versatile_damage_custom',
  'finesse',
  'heavy',
  'light',
  'loading',
  'reach',
  'thrown',
  'two_handed',
  'ammunition',
  'ammunition_kind',
  'range_kind',
  'range_near_feet',
  'range_far_feet',
  'mastery_property',
  'mastery_selected',
  'other_properties',
  'notes',
] as const;

function portableWeapons(
  db: DatabaseContext,
  characterId: number,
): SqlRow[] {
  // RAW, deliberately: this is a column-for-column comparison of what the share
  // round trip put back into storage, over a column list held in
  // `PORTABLE_WEAPON_COLUMNS`. Reading it through a codec would compare the
  // decoder to itself.
  return db.allRaw(
    `SELECT ${PORTABLE_WEAPON_COLUMNS.join(', ')}
     FROM character_weapons WHERE character_id = ? ORDER BY id`,
    [characterId],
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

function choices(db: DatabaseContext, characterId: number) {
  return {
    character: db.oneRaw(
      `SELECT name, strength, dexterity, constitution, intelligence,
              wisdom, charisma, proficiency_bonus_override,
              rules_edition_preference, allow_legacy
       FROM characters WHERE id = ?`,
      [characterId],
    ),
    classes: db.allRaw(
      `SELECT definition.content_key, level.level,
              level.is_starting_class,
              level.spellcasting_ability_override
       FROM character_class_levels AS level
       INNER JOIN class_definitions AS definition
         ON definition.id = level.class_definition_id
       WHERE level.character_id = ?`,
      [characterId],
    ),
    sources: db.allRaw(
      `SELECT source_type, display_name, config
       FROM character_source_instances
       WHERE character_id = ?
       ORDER BY source_type, display_name`,
      [characterId],
    ),
    selections: db.allRaw(
      `SELECT slot.rule_key, slot.ordinal, version.content_key,
              slot.state
       FROM spell_selection_slots AS slot
       INNER JOIN spell_versions AS version
         ON version.id = slot.current_spell_version_id
       WHERE slot.character_id = ?`,
      [characterId],
    ),
    spellbook: db.allRaw(
      `SELECT version.content_key
       FROM wizard_spellbook_entries AS entry
       INNER JOIN spell_versions AS version
         ON version.id = entry.spell_version_id
       WHERE entry.character_id = ?`,
      [characterId],
    ),
    preferences: db.allRaw(
      `SELECT version.content_key, preference.favourite
       FROM character_spell_preferences AS preference
       INNER JOIN spell_versions AS version
         ON version.id = preference.spell_version_id
       WHERE preference.character_id = ?`,
      [characterId],
    ),
    overrides: db.allRaw(
      `SELECT rule_key, value FROM character_rule_overrides
       WHERE character_id = ?`,
      [characterId],
    ),
    acknowledgements: db.allRaw(
      `SELECT warning_fingerprint FROM warning_acknowledgements
       WHERE character_id = ?`,
      [characterId],
    ),
    loadouts: db.allRaw(
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
      spellKey: '2024:fixture-shield',
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

    // WEAPONS SURVIVE THE LINK, COLUMN FOR COLUMN.
    //
    // Compared as whole rows against the sender's own, so a field silently
    // dropped, defaulted or coerced on the way through fails here. `id`,
    // `character_id` and the timestamps are excluded because a share carries
    // none of them by design — they belong to the recipient's database.
    expect(portableWeapons(target, imported.characterId)).toEqual(
      portableWeapons(source, sourceId),
    );
    expect(portableWeapons(target, imported.characterId)).toEqual([
      {
        name: 'Heirloom Longsword',
        damage_kind: 'dice',
        damage_dice: '1d8',
        damage_flat: null,
        damage_custom: null,
        damage_type: 'Slashing',
        versatile_damage_kind: 'dice',
        versatile_damage_dice: '1d10',
        versatile_damage_flat: null,
        versatile_damage_custom: null,
        finesse: 0,
        heavy: 0,
        light: 0,
        loading: 0,
        reach: 0,
        thrown: 1,
        two_handed: 0,
        ammunition: 1,
        ammunition_kind: 'bolt',
        range_kind: 'ranged',
        range_near_feet: 20,
        range_far_feet: 60,
        mastery_property: 'Sap',
        mastery_selected: 1,
        other_properties: 'Notched near the hilt',
        notes: 'from the barrow',
      },
      {
        name: 'Half-entered club',
        damage_kind: 'not_recorded',
        damage_dice: null,
        damage_flat: null,
        damage_custom: null,
        damage_type: null,
        versatile_damage_kind: 'not_applicable',
        versatile_damage_dice: null,
        versatile_damage_flat: null,
        versatile_damage_custom: null,
        finesse: 0,
        heavy: 0,
        light: 0,
        loading: 0,
        reach: 0,
        thrown: 0,
        two_handed: 0,
        ammunition: 0,
        ammunition_kind: null,
        range_kind: 'none',
        range_near_feet: null,
        range_far_feet: null,
        mastery_property: null,
        mastery_selected: 0,
        other_properties: null,
        notes: null,
      },
    ]);
    // Not opt-in, unlike acknowledgements and loadouts: the document carries
    // weapons whether or not the exporter asked for anything.
    expect(document.weapons).toHaveLength(2);
    expect(previewCharacterShare(target, shared).weaponCount).toBe(2);
  });

  it('round-trips every weapon range boundary through storage without reclassifying it', async () => {
    const source = await database();
    const characterId = source.exec(
      "INSERT INTO characters (name) VALUES ('Range boundaries')",
    ).lastInsertId;
    source.exec(
      `INSERT INTO character_weapons
         (character_id, name, range_kind, range_near_feet, range_far_feet)
       VALUES
         (?, 'Equal', 'ranged', 20, 20),
         (?, 'Smallest inverted', 'legacy', 20, 19),
         (?, 'Near zero', 'ranged', 0, 60),
         (?, 'Far zero', 'legacy', NULL, 0),
         (?, 'Near ceiling', 'ranged', 100000, NULL),
         (?, 'Far ceiling', 'ranged', 20, 100000)`,
      Array.from({ length: 6 }, () => characterId),
    );

    const document = exportCharacterShare(source, characterId);
    expect(document.weapons?.map((weapon) => weapon.range)).toEqual([
      { kind: 'ranged', near_feet: 20, far_feet: 20 },
      { kind: 'legacy', near_feet: 20, far_feet: 19 },
      { kind: 'ranged', near_feet: 0, far_feet: 60 },
      { kind: 'legacy', near_feet: null, far_feet: 0 },
      { kind: 'ranged', near_feet: 100_000, far_feet: null },
      { kind: 'ranged', near_feet: 20, far_feet: 100_000 },
    ]);

    // A migrated document may carry legacy values into storage even though a
    // fresh v2 link cannot mint them.
    const target = await database();
    const imported = importCharacterShare(target, document);
    expect(
      target.allRaw(
        `SELECT name, range_kind, range_near_feet, range_far_feet
         FROM character_weapons WHERE character_id = ? ORDER BY id`,
        [imported.characterId],
      ),
    ).toEqual([
      {
        name: 'Equal',
        range_kind: 'ranged',
        range_near_feet: 20,
        range_far_feet: 20,
      },
      {
        name: 'Smallest inverted',
        range_kind: 'legacy',
        range_near_feet: 20,
        range_far_feet: 19,
      },
      {
        name: 'Near zero',
        range_kind: 'ranged',
        range_near_feet: 0,
        range_far_feet: 60,
      },
      {
        name: 'Far zero',
        range_kind: 'legacy',
        range_near_feet: null,
        range_far_feet: 0,
      },
      {
        name: 'Near ceiling',
        range_kind: 'ranged',
        range_near_feet: 100_000,
        range_far_feet: null,
      },
      {
        name: 'Far ceiling',
        range_kind: 'ranged',
        range_near_feet: 20,
        range_far_feet: 100_000,
      },
    ]);
  });

  it('exposes stored exceptional pairs as decode-only ranges that cannot be freshly encoded', async () => {
    const source = await database();
    const characterId = source.exec(
      "INSERT INTO characters (name) VALUES ('Legacy ranges')",
    ).lastInsertId;
    source.exec(
      `INSERT INTO character_weapons
         (character_id, name, range_kind, range_near_feet, range_far_feet)
       VALUES
         (?, 'Long only', 'legacy', NULL, 60),
         (?, 'Inverted', 'legacy', 60, 20)`,
      [characterId, characterId],
    );

    const document = exportCharacterShare(source, characterId);
    expect(document.weapons).toMatchObject([
      {
        name: 'Long only',
        range: { kind: 'legacy', near_feet: null, far_feet: 60 },
      },
      {
        name: 'Inverted',
        range: { kind: 'legacy', near_feet: 60, far_feet: 20 },
      },
    ]);
    expect(() => encodeShareFragment(document)).toThrow(
      /decode-only legacy range/,
    );
  });

  it('leaves the weapons section out entirely for a character with none', async () => {
    const source = await database();
    const catalog = seedCatalog(source);
    const characterId = seedCharacter(source, catalog);
    source.exec('DELETE FROM character_weapons WHERE character_id = ?', [
      characterId,
    ]);

    const document = exportCharacterShare(source, characterId);
    // Absent rather than `[]`, so a weaponless character's link stays the shape
    // it had before weapons travelled — and the preview says nothing about a
    // section that is not there.
    expect(Object.hasOwn(document, 'weapons')).toBe(false);

    const target = await database();
    seedCatalog(target, true);
    const shared = await decodeShareFragment(
      await encodeShareFragment(document),
    );
    expect(Object.hasOwn(shared, 'weapons')).toBe(false);
    expect(previewCharacterShare(target, shared).weaponCount).toBe(0);
    const imported = importCharacterShare(target, shared);
    expect(portableWeapons(target, imported.characterId)).toEqual([]);
  });

  it('applies byte-faithful subclass config before regenerating configured slots', async () => {
    const seedSubclass = (db: DatabaseContext, classId: number) => {
      registerFixtureIdentity(
        db,
        'subclass',
        '2024:subclass:configured-path',
        'Configured Path',
      );
      return db.exec(
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
    };
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
      target.oneRaw(
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
      content_key: '2024:fixture-shield',
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
    registerFixtureIdentity(
      target,
      'feat',
      '2024:feat:granting-parent',
      'Granting Parent',
    );
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
      registerFixtureIdentity(
        db,
        'class',
        '2024:class:timing-start',
        'Timing Start',
      );
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
      registerFixtureIdentity(db, 'class', '2024:class:timing', 'Timing');
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
      registerFixtureIdentity(
        db,
        'background',
        '2024:background:timing-grandchild',
        'Timing Grandchild',
      );
      db.exec(
        `INSERT INTO background_definitions (
           content_key, name, rules_edition, grant_rules
         ) VALUES (
           '2024:background:timing-grandchild',
           'Timing Grandchild', '2024', '[]'
         )`,
      );
      registerFixtureIdentity(
        db,
        'feat',
        '2024:feat:timing-child',
        'Timing Child',
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
      registerFixtureIdentity(
        db,
        'subclass',
        '2024:subclass:timing-path',
        'Timing Path',
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
    // `update_class` no longer carries a level (level-up plan §3): entry is
    // at 1, and the fixture levels are direct writes — this file's subject
    // is share transport, not the guarded levelling path.
    new UpdateClassCommand(
      source,
      {
        type: 'update_class',
        class_definition_id: catalog.otherClassId,
        subclass_definition_id: null,
      },
      integrity,
    ).apply(characterId);
    raiseClassLevelForTest(source, characterId, catalog.otherClassId, 2);
    new UpdateClassCommand(
      source,
      {
        type: 'update_class',
        class_definition_id: catalog.classId,
        subclass_definition_id: null,
      },
      integrity,
    ).apply(characterId);
    raiseClassLevelForTest(source, characterId, catalog.classId, 5);
    // The subclass is taken AT level 5 — a second `update_class` once the
    // level stands, so its source's acquisition timing (5) is the same fact
    // the import re-derives from the class row on the other side.
    new UpdateClassCommand(
      source,
      {
        type: 'update_class',
        class_definition_id: catalog.classId,
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
      db.allRaw(
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
      spellbook: [{ spellKey: unknownKey, spellName: 'Starward Aegis' }],
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
    const placeholder = target.oneRaw(
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
    expect(target.oneRaw(
      `SELECT key_kind, catalog_layer, normalized_name
       FROM catalog_content_identities
       WHERE content_kind = 'spell' AND content_key = ?`,
      [unknownKey],
    )).toEqual({
      key_kind: 'asserted',
      catalog_layer: 'external',
      normalized_name: 'starwardaegis',
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
    // Reproduce the persisted image written by the split-normalizer defect.
    target.exec(
      `UPDATE catalog_content_identities SET normalized_name = 'starward aegis'
       WHERE content_kind = 'spell' AND content_key = ?`,
      [unknownKey],
    );
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
      target.oneRaw(
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
    expect(target.allRaw(
      `SELECT content_key, key_kind, catalog_layer, normalized_name
       FROM catalog_content_identities
       WHERE content_kind = 'spell' AND content_key = ?`,
      [unknownKey],
    )).toEqual([{
      content_key: unknownKey,
      key_kind: 'asserted',
      catalog_layer: 'external',
      normalized_name: 'starwardaegis',
    }]);
    expect(
      new SpellAccessBuilder(target).buildForCharacter(
        imported.characterId,
      ),
    ).toHaveLength(1);
  });

  it('CI4A-H1 imports an unavailable shared spell under its asserted key without minting legacy-opaque', async () => {
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
    expect(
      target.oneRaw(
        `SELECT key_kind, catalog_layer, normalized_name
         FROM catalog_content_identities
         WHERE content_kind = 'spell' AND content_key = ?`,
        [spellKey],
      ),
    ).toEqual({
      key_kind: 'asserted',
      catalog_layer: 'external',
      normalized_name: 'sharedloadoutname',
    });
    expect(
      target.scalar(
        `SELECT count(*) FROM catalog_content_identities
         WHERE key_kind = 'legacy-opaque'`,
      ),
    ).toBe(0);
    expect(catalogContentKeyKinds).toEqual([
      'derived',
      'asserted',
      'bundled-stable',
    ]);
    expect(target.scalar<number>(
      `SELECT count(*) FROM sqlite_schema
       WHERE sql LIKE '%legacy-opaque%'`,
    )).toBe(0);
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
        writtenText: boolean;
      },
      ReturnType<typeof exportCharacterShare>
    >('share.exportCharacter', {
      characterId,
      acknowledgements: false,
      loadouts: true,
      writtenText: false,
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
    // All THREE opt-ins are off when the caller passes nothing — the client
    // sends `false` for each rather than omitting the key, which is what makes
    // the handler's strict key count a contract rather than an obstacle.
    expect(defaults.character.notes).toBeUndefined();
    const optedIn = await client.exportDebug(characterId, {
      acknowledgements: true,
      loadouts: true,
      writtenText: true,
    });
    expect(optedIn.character.notes).toBe(SENDER_NOTE);
    expect(optedIn.acknowledgements).toEqual([
      { warning: 'warning:shield' },
    ]);
    expect(optedIn.loadouts).toEqual([
      {
        name: 'Defense',
        entries: [{ spellKey: '2024:fixture-shield', role: 'defense' }],
      },
    ]);

    const fragment = await client.createFragment(characterId, {
      acknowledgements: true,
      loadouts: true,
      writtenText: true,
    });
    await expect(decodeShareFragment(fragment)).resolves.toEqual(optedIn);
    const planned = await client.preview(fragment);
    expect(planned).toMatchObject({
      name: 'Share Hero',
      includesAcknowledgements: true,
      includesLoadouts: true,
      includesWrittenText: true,
    });
    expect(harness.context.db.scalar('SELECT count(*) FROM characters')).toBe(
      1,
    );
    await expect(client.importCharacter(fragment)).resolves.toEqual({
      characterId: 2,
    });
    await expect(client.commitCharacter(
      fragment,
      planned.adoptionPlan.token,
      {},
    )).resolves.toMatchObject({
      kind: 'committed',
      result: { characterId: 3 },
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
          writtenText: false,
        },
      },
      // THE THIRD FLAG IS REQUIRED, NOT DEFAULTED. A caller that omits it is
      // refused rather than silently treated as opting out — which is the same
      // strictness the other two have always had, and the reason is that a
      // params shape this handler merely tolerates is one nobody can reason
      // about later.
      {
        method: 'share.exportCharacter',
        params: {
          characterId,
          acknowledgements: false,
          loadouts: false,
        },
      },
      {
        method: 'share.exportCharacter',
        params: {
          characterId,
          acknowledgements: false,
          loadouts: false,
          writtenText: 'yes',
        },
      },
      { method: 'share.preview', params: { fragment: 42 } },
      {
        method: 'share.preview',
        params: { fragment, extra: true },
      },
      {
        method: 'share.preview',
        params: { fragment, token: 'a'.repeat(64) },
      },
      { method: 'share.importCharacter', params: null },
      {
        method: 'share.importCharacter',
        params: { fragment, extra: true },
      },
      {
        method: 'share.importCharacter',
        params: { fragment, choices: {} },
      },
      {
        method: 'share.importCharacter',
        params: { fragment, token: 'a'.repeat(64) },
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

/**
 * A SHARE LINK SOMEBODY IS STILL HOLDING — AND WHY IT NO LONGER IMPORTS.
 *
 * The same hand-frozen eleven-element link the codec suite pins. It was
 * minted once and pasted here as a literal; nothing regenerates it, so no
 * change to the encoder can quietly move it to the current format and make
 * this pass for the wrong reason.
 *
 * D60/plan §3.2: pre-v5 links are RETIRED, not migrated — a v1 document's
 * `skillProficiencies` is a bare string list with no source, grant key or
 * ordinal, and inventing that attribution would corrupt the character. So
 * `decodeShareFragment` now refuses this exact fragment BY NAME, and the two
 * tests below start with that refusal.
 *
 * What each test actually existed to prove — that an ABSENT optional wire
 * section (weapons; the character's note) imports as a character with NONE
 * of that section, rather than an error or a fabricated value — is still
 * real, unretired import-pipeline behaviour. It is re-expressed against a
 * hand-authored v5 `CharacterShareDocument` carrying the identical content
 * this link carried, MINUS the sections it never had — never produced by
 * `shareDocumentToPositional`/`exportCharacterShare`, so the fixture cannot
 * quietly track the encoder.
 */
const LEGACY_FRAGMENT =
  'H4sIAAAAAAACA12NwQrCMBBEf6XseQNNFQ_5Ag-CHxByWJqVBtcqm5SCXy-1QWovwzDMm_EQ' +
  'x2gek5TUC-Vs8otFsukHUuoLq8kDKQNa9HCV2FzSeG_OrE_AcRLZiD3tk38J6H2L0LXd0X2_' +
  '3JzepLEOHdDugYWwCDemAhVcvCNhLRXrftWAfu3kIbFEWKOw2fsAKTM71e0AAAA';

const LEGACY_STYLE_DOCUMENT: CharacterShareDocument = validateShareDocument({
  format: CHARACTER_SHARE_FORMAT,
  version: CHARACTER_SHARE_VERSION,
  character: { name: 'Old Link Hero', intelligence: 16 },
  classes: [{ id: 0, classKey: '2024:class:wizard', level: 3, start: 1 }],
  sources: [{ id: 1, type: 'feat', key: '2024:feat:alert', acquired: 2 }],
  selections: [],
  spellbook: [{ spellKey: '2024:shield' }],
  preferences: [],
  overrides: [],
});

describe('a share link that predates weapons', () => {
  it('imports into a build that carries weapons, as a character with none', async () => {
    // (a) D60: the frozen pre-v5 link is refused, by name.
    await expect(decodeShareFragment(LEGACY_FRAGMENT)).rejects.toThrow(
      ShareWireRetirementError,
    );

    // (b) The claim this fixture pins — a document with no weapons section
    // imports as a character with none, not an error — re-expressed at v5.
    const target = await database();
    seedCatalog(target);
    // The link names a feat the catalog must hold, or the import is refused for
    // a reason that has nothing to do with weapons.
    registerFixtureIdentity(target, 'feat', '2024:feat:alert', 'Alert');
    target.exec(
      `INSERT INTO feat_definitions (content_key, name, rules_edition)
       VALUES ('2024:feat:alert', 'Alert', '2024')`,
    );

    const shared = LEGACY_STYLE_DOCUMENT;
    expect(Object.hasOwn(shared, 'weapons')).toBe(false);
    expect(previewCharacterShare(target, shared)).toMatchObject({
      name: 'Old Link Hero',
      weaponCount: 0,
    });

    const imported = importCharacterShare(target, shared);
    expect(
      target.oneRaw('SELECT name, intelligence FROM characters WHERE id = ?', [
        imported.characterId,
      ]),
    ).toEqual({ name: 'Old Link Hero', intelligence: 16 });
    // No weapons, and no error. Absence of a section is not corruption.
    expect(portableWeapons(target, imported.characterId)).toEqual([]);
  });

  it('imports into a build that carries notes, as a character with none', async () => {
    // (a) D60: the frozen pre-v5 link is refused, by name.
    await expect(decodeShareFragment(LEGACY_FRAGMENT)).rejects.toThrow(
      ShareWireRetirementError,
    );

    // (b) THE SAME QUESTION FOR Q12, and it is the one that matters most
    // here: a document whose character never carried a note imports as a
    // character with none, re-expressed at v5 since a v1-tagged document can
    // no longer reach this far.
    const target = await database();
    seedCatalog(target);
    registerFixtureIdentity(target, 'feat', '2024:feat:alert', 'Alert');
    target.exec(
      `INSERT INTO feat_definitions (content_key, name, rules_edition)
       VALUES ('2024:feat:alert', 'Alert', '2024')`,
    );

    const shared = LEGACY_STYLE_DOCUMENT;
    expect(Object.hasOwn(shared.character, 'notes')).toBe(false);
    expect(previewCharacterShare(target, shared)).toMatchObject({
      name: 'Old Link Hero',
      includesWrittenText: false,
    });

    const imported = importCharacterShare(target, shared);
    // NULL, not an empty string. The recipient's column is left at exactly what
    // it holds for every character created any other way.
    expect(
      target.scalar('SELECT notes FROM characters WHERE id = ?', [
        imported.characterId,
      ]),
    ).toBeNull();
  });
});

/**
 * A CHARACTER'S OWN NOTES, GOVERNED BY D124'S WRITTEN-TEXT CONSENT.
 *
 * The owner's ruling was "opt-in, like loadouts", and these are the two halves
 * that ruling has to mean: with the option off — which is the default, and what
 * every link minted before this change already does — the note stays in the
 * sender's database and reaches the recipient's nowhere; with it on, the note
 * arrives byte for byte.
 *
 * Both halves go THROUGH THE FRAGMENT into a SECOND DATABASE, because a value
 * dropped by the encoder and a value dropped by the INSERT are equally lost and
 * only the recipient's table can tell you which happened.
 */
describe('written-text consent governs a character note', () => {
  async function recipient(): Promise<DatabaseContext> {
    const db = await database();
    seedCatalog(db);
    return db;
  }

  async function through(
    source: DatabaseContext,
    characterId: number,
    options?: Parameters<typeof exportCharacterShare>[2],
  ): Promise<{
    readonly document: CharacterShareDocument;
    readonly stored: unknown;
  }> {
    const document = await decodeShareFragment(
      await encodeShareFragment(
        options === undefined
          ? exportCharacterShare(source, characterId)
          : exportCharacterShare(source, characterId, options),
      ),
    );
    const target = await recipient();
    const imported = importCharacterShare(target, document);
    return {
      document,
      stored: target.scalar('SELECT notes FROM characters WHERE id = ?', [
        imported.characterId,
      ]),
    };
  }

  it('written-text consent gates all four flavor fields', async () => {
    const source = await database();
    const catalog = seedCatalog(source);
    const characterId = seedCharacter(source, catalog);
    const fields = ['alignment', 'appearance', 'backstory', 'notes'] as const;

    const without = await decodeShareFragment(await encodeShareFragment(
      exportCharacterShare(source, characterId),
    ));
    for (const field of fields) {
      expect(Object.hasOwn(without.character, field)).toBe(false);
    }

    const withText = await decodeShareFragment(await encodeShareFragment(
      exportCharacterShare(source, characterId, { writtenText: true }),
    ));
    expect(withText.character).toMatchObject({
      alignment: SENDER_ALIGNMENT,
      appearance: SENDER_APPEARANCE,
      backstory: SENDER_BACKSTORY,
      notes: SENDER_NOTE,
    });
    const target = await recipient();
    const imported = importCharacterShare(target, withText);
    expect(target.oneRaw(
      `SELECT alignment, appearance, backstory, notes
       FROM characters WHERE id = ?`,
      [imported.characterId],
    )).toEqual({
      alignment: SENDER_ALIGNMENT,
      appearance: SENDER_APPEARANCE,
      backstory: SENDER_BACKSTORY,
      notes: SENDER_NOTE,
    });
    expect(
      buildAgentReference(
        new CharacterWorkspaceBuilder(target).build(imported.characterId),
        null,
      ).free_text.filter((entry) => entry.field.startsWith('character.')),
    ).toEqual([
      {
        field: 'character.name',
        value: withText.character.name,
        origin: 'unverified-origin',
      },
      {
        field: 'character.alignment',
        value: SENDER_ALIGNMENT,
        origin: 'unverified-origin',
      },
      {
        field: 'character.appearance',
        value: SENDER_APPEARANCE,
        origin: 'unverified-origin',
      },
      {
        field: 'character.backstory',
        value: SENDER_BACKSTORY,
        origin: 'unverified-origin',
      },
      {
        field: 'character.notes',
        value: SENDER_NOTE,
        origin: 'unverified-origin',
      },
    ]);
  });

  it('carries nothing when nobody asks, and the sender still has the note', async () => {
    const source = await database();
    const catalog = seedCatalog(source);
    const characterId = seedCharacter(source, catalog);
    // The premise, checked rather than assumed: there IS a note to lose.
    expect(
      source.scalar('SELECT notes FROM characters WHERE id = ?', [characterId]),
    ).toBe(SENDER_NOTE);

    const { document, stored } = await through(source, characterId);
    expect(Object.hasOwn(document.character, 'notes')).toBe(false);
    expect(stored).toBeNull();
    // Sharing is not moving. The sender keeps what they wrote.
    expect(
      source.scalar('SELECT notes FROM characters WHERE id = ?', [characterId]),
    ).toBe(SENDER_NOTE);
  });

  it('carries nothing when the option is explicitly false or the other two are on', async () => {
    const source = await database();
    const catalog = seedCatalog(source);
    const characterId = seedCharacter(source, catalog);

    for (const options of [
      { writtenText: false },
      { acknowledgements: true, loadouts: true },
    ] as const) {
      const { document, stored } = await through(source, characterId, options);
      expect(Object.hasOwn(document.character, 'notes')).toBe(false);
      expect(stored).toBeNull();
    }
  });

  it('round-trips the note byte for byte when the sharer asks', async () => {
    const source = await database();
    const catalog = seedCatalog(source);
    const characterId = seedCharacter(source, catalog);

    const { document, stored } = await through(source, characterId, {
      writtenText: true,
    });
    expect(document.character.notes).toBe(SENDER_NOTE);
    expect(stored).toBe(SENDER_NOTE);
    // Byte for byte, not merely equal-looking: the newline, tab, emoji, quote
    // and backslash all have to survive gzip, base64url and JSON escaping.
    expect(stored).toContain('\n');
    expect(stored).toContain('\t');
    expect(stored).toContain('🎲');
    expect(stored).toContain('"');
    expect(stored).toContain('\\');
  });

  it('tells the recipient which links carry one, before anything is written', async () => {
    const source = await database();
    const catalog = seedCatalog(source);
    const characterId = seedCharacter(source, catalog);
    const target = await recipient();

    for (const [options, expected] of [
      [undefined, false],
      [{ writtenText: true }, true],
    ] as const) {
      const document = await decodeShareFragment(
        await encodeShareFragment(
          options === undefined
            ? exportCharacterShare(source, characterId)
            : exportCharacterShare(source, characterId, options),
        ),
      );
      expect(previewCharacterShare(target, document)).toMatchObject({
        includesWrittenText: expected,
      });
    }
    // Preview writes nothing, here as everywhere else.
    expect(target.scalar('SELECT count(*) FROM characters')).toBe(0);
  });

  it('sends nothing for a character whose note is empty or absent', async () => {
    // `''` and NULL are ONE STATE on the wire, because the recipient's column
    // cannot show the difference — and because `text()` refuses a zero-length
    // string, so an exported `''` would refuse to build the link at all over a
    // note nobody wrote.
    const source = await database();
    const catalog = seedCatalog(source);
    const characterId = seedCharacter(source, catalog);

    for (const value of ['', null]) {
      source.exec('UPDATE characters SET notes = ? WHERE id = ?', [
        value,
        characterId,
      ]);
      const { document, stored } = await through(source, characterId, {
        writtenText: true,
      });
      expect(Object.hasOwn(document.character, 'notes')).toBe(false);
      expect(stored).toBeNull();
    }
  });
});

/**
 * WHICH SOURCE AN EFFECT CAME FROM, THROUGH A LINK.
 *
 * `character_effects.source_instance_id` is the audit answer D22 kept when it
 * inverted the model: the sheet asks what resistances a character has, and this
 * asks where one came from. A share document carries a REFERENCE rather than
 * the id, because the id belongs to a database the recipient does not have.
 *
 * The four cases below are the four things that reference can mean, and three
 * of them were wrong or absent before this test existed:
 *
 *  1. a CLASS's own effect — the ordinary case;
 *  2. a SUBCLASS's — and a class entry mints TWO source instances from ONE ref,
 *     so without a flag saying which, the effect arrives on the class. That is
 *     a real row and the wrong one, which is worse than no provenance at all;
 *  3. an effect whose grantor was DEACTIVATED but whose root is still there —
 *     the shape `GrantRuleSlotGenerator.deactivateSourceTree` makes every time
 *     a grant stops applying. It keeps its provenance, coarsened to the root
 *     exactly as an active non-root's is;
 *  4. an effect whose grantor was REMOVED OUTRIGHT. This one CANNOT keep it: a
 *     share document carries the build as it stands, a removed feat is not in
 *     it, and a ref naming nothing would be worse than none. The effect still
 *     travels — that is the part that must not regress.
 */
describe('an effect knows which source granted it, across a link', () => {
  const seedProvenanceCatalog = (db: DatabaseContext) => {
    registerFixtureIdentity(
      db,
      'class',
      '2024:class:provenance',
      'Provenance',
    );
    const classId = db.exec(
      `INSERT INTO class_definitions (
         content_key, name, rules_edition, spellcasting_ability,
         progression_type
       ) VALUES (
         '2024:class:provenance', 'Provenance', '2024', 'intelligence', 'full'
       )`,
    ).lastInsertId;
    db.exec(
      `INSERT INTO class_progressions (
         class_definition_id, class_level, grant_rules
       ) VALUES (?, 1, '[]')`,
      [classId],
    );
    registerFixtureIdentity(
      db,
      'feat',
      '2024:feat:provenance-grant',
      'Granted Feat',
    );
    db.exec(
      `INSERT INTO feat_definitions (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES ('2024:feat:provenance-grant', 'Granted Feat', '2024', 1, '[]')`,
    );
    // THE GRANT LIVES AT LEVEL 5 ONLY, which is what makes case 3 reachable
    // through the real code path: dropping the class to 3 makes the rule stop
    // applying, and the generator tombstones the source it minted.
    db.exec(
      `INSERT INTO class_progressions (
         class_definition_id, class_level, grant_rules
       ) VALUES (?, 5, ?)`,
      [
        classId,
        JSON.stringify([
          {
            kind: 'grant_source',
            rule_key: 'provenance-grant',
            count: 1,
            source_type: 'feat',
            source_definition_key: '2024:feat:provenance-grant',
          },
        ]),
      ],
    );
    registerFixtureIdentity(
      db,
      'subclass',
      '2024:subclass:provenance-path',
      'Provenance Path',
    );
    const subclassId = db.exec(
      `INSERT INTO subclass_definitions (
         content_key, class_definition_id, name, rules_edition,
         spellcasting_ability, grant_rules
       ) VALUES (
         '2024:subclass:provenance-path', ?, 'Provenance Path', '2024',
         'intelligence', '[]'
       )`,
      [classId],
    ).lastInsertId;
    registerFixtureIdentity(
      db,
      'feat',
      '2024:feat:provenance-taken',
      'Taken Feat',
    );
    const featId = db.exec(
      `INSERT INTO feat_definitions (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES ('2024:feat:provenance-taken', 'Taken Feat', '2024', 1, '[]')`,
    ).lastInsertId;
    return { classId, subclassId, featId };
  };

  const provenance = (db: DatabaseContext, characterId: number) =>
    db.allRaw(
      `SELECT effect.label, effect.effect_kind, effect.damage_type,
              effect.hit_points_per_level, effect.speed_bonus_feet,
              source.source_type,
              COALESCE(
                class.content_key,
                subclass.content_key,
                feat.content_key
              ) AS source_key
       FROM character_effects AS effect
       LEFT JOIN character_source_instances AS source
         ON source.id = effect.source_instance_id
       LEFT JOIN class_definitions AS class
         ON source.source_type = 'class'
        AND class.id = source.source_definition_id
       LEFT JOIN subclass_definitions AS subclass
         ON source.source_type = 'subclass'
        AND subclass.id = source.source_definition_id
       LEFT JOIN feat_definitions AS feat
         ON source.source_type = 'feat'
        AND feat.id = source.source_definition_id
       WHERE effect.character_id = ?
       ORDER BY effect.sort_order`,
      [characterId],
    );

  it('keeps a subclass effect on the subclass, and a faded grant on its root', async () => {
    const origin = await database();
    const catalog = seedProvenanceCatalog(origin);
    const characterId = origin.exec(
      "INSERT INTO characters (name) VALUES ('Provenance Hero')",
    ).lastInsertId;
    const integrity = new CharacterCommandIntegrity('sharing-provenance-key');
    new UpdateClassCommand(
      origin,
      {
        type: 'update_class',
        class_definition_id: catalog.classId,
        subclass_definition_id: catalog.subclassId,
      },
      integrity,
    ).apply(characterId);
    raiseClassLevelForTest(origin, characterId, catalog.classId, 5);
    new AddSourceCommand(
      origin,
      {
        type: 'add_source',
        source_type: 'feat',
        source_definition_id: catalog.featId,
        config: {},
      },
      integrity,
    ).apply(characterId);

    const sourceId = (type: string, definitionId: number): number =>
      Number(
        origin.scalar(
          `SELECT id FROM character_source_instances
           WHERE character_id = ? AND source_type = ?
             AND source_definition_id = ?`,
          [characterId, type, definitionId],
        ),
      );
    // Written by hand because nothing in `src/` writes an effect yet — the
    // picker that will is not built. Every column an INSERT could drop is a
    // different value, so a dropped one shows up as a changed effect rather
    // than as a matching pair of nulls.
    const attach = (
      order: number,
      label: string,
      instanceId: number | null,
      payload: readonly [string, string | null, number | null, number | null],
    ) => {
      origin.exec(
        `INSERT INTO character_effects (
           character_id, sort_order, effect_kind, damage_type,
           hit_points_flat, hit_points_per_level, speed_bonus_feet,
           source_instance_id, label, notes
         ) VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, NULL)`,
        [
          characterId,
          order,
          payload[0],
          payload[1],
          payload[2],
          payload[3],
          instanceId,
          label,
        ],
      );
    };
    attach(1, 'Class Feature', sourceId('class', catalog.classId), [
      'speed',
      null,
      null,
      10,
    ]);
    attach(2, 'Subclass Feature', sourceId('subclass', catalog.subclassId), [
      'hp_modifier',
      null,
      1,
      null,
    ]);
    attach(
      3,
      'Faded Grant',
      sourceId('feat', Number(origin.scalar(
        "SELECT id FROM feat_definitions WHERE content_key = '2024:feat:provenance-grant'",
      ))),
      ['damage_resistance', 'Fire', null, null],
    );
    const takenFeatSource = sourceId('feat', catalog.featId);
    attach(4, 'Removed Feat', takenFeatSource, [
      'damage_resistance',
      'Cold',
      null,
      null,
    ]);

    // Case 3: the grant stops applying, through the generator rather than by
    // hand. Its source is tombstoned; the class it hangs from is not. The
    // level drop is a fixture write — levelling DOWN has no command at all
    // (level-up plan §10) — and the raise helper re-runs the same generator.
    raiseClassLevelForTest(origin, characterId, catalog.classId, 3);
    // Case 4: the feat is removed outright, so nothing in the document can name
    // it.
    new RemoveSourceCommand(
      origin,
      { type: 'remove_source', source_instance_id: takenFeatSource },
      integrity,
    ).apply(characterId);
    expect(
      origin.scalar(
        'SELECT state FROM character_source_instances WHERE id = ?',
        [takenFeatSource],
      ),
    ).toBe('tombstoned');

    const document = exportCharacterShare(origin, characterId);
    expect(document.effects).toEqual([
      { kind: 'speed', label: 'Class Feature', speed_bonus_feet: 10, sourceRef: 0 },
      {
        kind: 'hp_modifier',
        label: 'Subclass Feature',
        hit_points_per_level: 1,
        sourceRef: 0,
        // THE FLAG. Same ref as the line above it, different root.
        sourceSubclass: true,
      },
      {
        kind: 'damage_resistance',
        label: 'Faded Grant',
        damage_type: 'Fire',
        // Coarsened to the root that still exists, NOT dropped.
        sourceRef: 0,
      },
      {
        kind: 'damage_resistance',
        label: 'Removed Feat',
        damage_type: 'Cold',
      },
    ]);

    const target = await database();
    seedProvenanceCatalog(target);
    const imported = importCharacterShare(
      target,
      await decodeShareFragment(await encodeShareFragment(document)),
    );
    expect(provenance(target, imported.characterId)).toEqual([
      {
        label: 'Class Feature',
        effect_kind: 'speed',
        damage_type: null,
        hit_points_per_level: null,
        speed_bonus_feet: 10,
        source_type: 'class',
        source_key: '2024:class:provenance',
      },
      {
        label: 'Subclass Feature',
        effect_kind: 'hp_modifier',
        damage_type: null,
        hit_points_per_level: 1,
        speed_bonus_feet: null,
        source_type: 'subclass',
        source_key: '2024:subclass:provenance-path',
      },
      {
        label: 'Faded Grant',
        effect_kind: 'damage_resistance',
        damage_type: 'Fire',
        hit_points_per_level: null,
        speed_bonus_feet: null,
        source_type: 'class',
        source_key: '2024:class:provenance',
      },
      // The effect survived; only the pointer did not, and it arrives NULL
      // rather than naming somebody else's row.
      {
        label: 'Removed Feat',
        effect_kind: 'damage_resistance',
        damage_type: 'Cold',
        hit_points_per_level: null,
        speed_bonus_feet: null,
        source_type: null,
        source_key: null,
      },
    ]);
  });

  it('refuses a subclass flag that names a class carrying no subclass', async () => {
    const origin = await database();
    const catalog = seedProvenanceCatalog(origin);
    const characterId = origin.exec(
      "INSERT INTO characters (name) VALUES ('No Subclass')",
    ).lastInsertId;
    new UpdateClassCommand(
      origin,
      {
        type: 'update_class',
        class_definition_id: catalog.classId,
        subclass_definition_id: null,
      },
      new CharacterCommandIntegrity('sharing-provenance-key'),
    ).apply(characterId);
    raiseClassLevelForTest(origin, characterId, catalog.classId, 3);
    const document = exportCharacterShare(origin, characterId);
    // Hand-written, because the exporter cannot produce it: the flag is set
    // from the row's own source instance. A pasted link can carry anything, and
    // resolving this one would read the second root of a ref that has one — an
    // effect silently written with no provenance at all.
    const forged: CharacterShareDocument = {
      ...document,
      effects: [
        {
          kind: 'speed',
          label: 'Impossible',
          speed_bonus_feet: 5,
          sourceRef: 0,
          sourceSubclass: true,
        },
      ],
    };
    expect(() => importCharacterShare(origin, forged)).toThrow(
      /effects\[0\]\.sourceSubclass names a ref with no subclass/,
    );
    expect(() =>
      importCharacterShare(origin, {
        ...document,
        effects: [
          {
            kind: 'speed',
            label: 'Impossible',
            speed_bonus_feet: 5,
            sourceSubclass: true,
          },
        ],
      }),
    ).toThrow(/effects\[0\]\.sourceSubclass requires a sourceRef/);
  });
});

describe('B2 contribution sharing', () => {
  function seedBackground(db: DatabaseContext): number {
    registerFixtureIdentity(
      db,
      'background',
      '2024:background:ability-guard',
      'Ability Guard',
    );
    return db.exec(
      `INSERT INTO background_definitions (
         content_key, name, rules_edition, repeatable, grant_rules
       ) VALUES (
         '2024:background:ability-guard',
         'Ability Guard', '2024', 0, '[]'
       )`,
    ).lastInsertId;
  }

  it('B2-SHARE and B2-PROVENANCE preserve every capped payload field and its background owner', async () => {
    const source = await database();
    const backgroundId = seedBackground(source);
    const characterId = source.exec(
      `INSERT INTO characters (name, strength)
       VALUES ('Shared Contribution', 19)`,
    ).lastInsertId;
    source.exec(
      `INSERT INTO character_background (character_id, name)
       VALUES (?, 'Ability Guard')`,
      [characterId],
    );
    const sourceId = source.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, config, acquired_at_character_level, state
       ) VALUES (
         ?, 'share-source:ability-guard', 'background', ?,
         'Ability Guard', '{}', 1, 'active'
       )`,
      [characterId, backgroundId],
    ).lastInsertId;
    source.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, ability, amount, maximum,
         source_instance_id, label
       ) VALUES (
         ?, 1, 'ability_increase', 'strength', 2, 20, ?,
         'Guard training'
       )`,
      [characterId, sourceId],
    );

    const document = exportCharacterShare(source, characterId);
    expect(document.sources).toContainEqual({
      id: 0,
      type: 'background',
      key: '2024:background:ability-guard',
      acquired: 1,
    });
    expect(document.effects?.[0]?.sourceRef).toBe(0);

    const decoded = await decodeShareFragment(
      await encodeShareFragment(document),
    );
    // Three independent wire assertions: dropping any one tuple slot must
    // fail its own line, rather than hiding behind one object comparison.
    expect(decoded.effects?.[0]?.ability).toBe('strength');
    expect(decoded.effects?.[0]?.amount).toBe(2);
    expect(decoded.effects?.[0]?.maximum).toBe(20);

    const target = await database();
    seedBackground(target);
    const imported = importCharacterShare(target, decoded);
    const stored = target.oneRaw(
      `SELECT effect.ability, effect.amount, effect.maximum,
              source.source_type, background.content_key AS source_key
       FROM character_effects AS effect
       INNER JOIN character_source_instances AS source
         ON source.id = effect.source_instance_id
       INNER JOIN background_definitions AS background
         ON source.source_type = 'background'
        AND background.id = source.source_definition_id
       WHERE effect.character_id = ?`,
      [imported.characterId],
    );
    expect(stored).toEqual({
      ability: 'strength',
      amount: 2,
      maximum: 20,
      source_type: 'background',
      source_key: '2024:background:ability-guard',
    });

    const resolved = resolveCharacterAbilities(
      target,
      imported.characterId,
      {
        strength: 19,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      },
    );
    // The maximum is load-bearing: uncapped +2 would produce 21, not 20.
    expect(resolved.strength.total).toBe(20);
  });
});

describe('D83 ability override sharing', () => {
  it('round-trips source- and item-owned SET payloads through wire v15', async () => {
    const source = await database();
    const characterId = source.exec(
      `INSERT INTO characters (name, strength)
       VALUES ('Shared Giant Strength', 20)`,
    ).lastInsertId;
    registerFixtureIdentity(
      source,
      'feat',
      '2024:feat:giant-boon',
      'Giant Boon',
    );
    const featId = source.exec(
      `INSERT INTO feat_definitions (content_key, name, rules_edition)
       VALUES ('2024:feat:giant-boon', 'Giant Boon', '2024')`,
    ).lastInsertId;
    const sourceId = source.exec(
       `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, acquired_at_character_level, state
       ) VALUES (
         ?, 'share-source:giant-boon', 'feat', ?, 'Giant Boon', 1, 'active'
       )`,
      [characterId, featId],
    ).lastInsertId;
    const itemId = source.exec(
      `INSERT INTO character_items (
         character_id, name, requires_attunement
       ) VALUES (?, 'Belt of Fire Giant Strength', 0)`,
      [characterId],
    ).lastInsertId;
    source.exec(
      `INSERT INTO character_effects (
         character_id, sort_order, effect_kind, ability, maximum,
         source_instance_id, character_item_id, label
       ) VALUES
         (?, 1, 'ability_override', 'strength', 21, ?, NULL,
          'Giant Boon'),
         (?, 2, 'ability_override', 'strength', 24, NULL, ?,
          'Belt of Fire Giant Strength')`,
      [characterId, sourceId, characterId, itemId],
    );

    const decoded = await decodeShareFragment(
      await encodeShareFragment(exportCharacterShare(source, characterId)),
    );
    expect(decoded.version).toBe(17);
    expect(decoded.effects).toMatchObject([
      {
        kind: 'ability_override',
        ability: 'strength',
        maximum: 21,
        sourceRef: 0,
      },
      {
        kind: 'ability_override',
        ability: 'strength',
        maximum: 24,
        itemRef: 0,
      },
    ]);

    const target = await database();
    registerFixtureIdentity(
      target,
      'feat',
      '2024:feat:giant-boon',
      'Giant Boon',
    );
    target.exec(
      `INSERT INTO feat_definitions (content_key, name, rules_edition)
       VALUES ('2024:feat:giant-boon', 'Giant Boon', '2024')`,
    );
    const imported = importCharacterShare(target, decoded);
    expect(
      target.allRaw(
        `SELECT effect_kind, ability, amount, maximum, source_instance_id,
                character_item_id, label
         FROM character_effects
         WHERE character_id = ?
         ORDER BY sort_order`,
        [imported.characterId],
      ),
    ).toEqual([
      {
        effect_kind: 'ability_override',
        ability: 'strength',
        amount: null,
        maximum: 21,
        source_instance_id: expect.any(Number),
        character_item_id: null,
        label: 'Giant Boon',
      },
      {
        effect_kind: 'ability_override',
        ability: 'strength',
        amount: null,
        maximum: 24,
        source_instance_id: null,
        character_item_id: expect.any(Number),
        label: 'Belt of Fire Giant Strength',
      },
    ]);
    expect(
      resolveCharacterAbilities(
        target,
        imported.characterId,
        {
          strength: 20,
          dexterity: 10,
          constitution: 10,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        },
      ).strength.total,
    ).toBe(24);
  });
});

/**
 * S-SHARE (plan §6, skills-with-provenance): A V5 ROUND TRIP PRESERVES GRANT
 * PROVENANCE — not merely the final distinct skill list.
 *
 * §5's second trap, made executable for share the same way it is for the
 * guided step: an implementation that fills whichever grant is REACHABLE
 * rather than the one the `ref` actually names produces the right skill
 * list, the right count, and a faithful round trip of the WRONG provenance.
 * A test that only checked `skills` (or `skillProficiencies`) would pass
 * under that bug. This one instead confirms, after a full export→import round
 * trip into a SECOND database, that the filled grant's `source_instance_id`
 * resolves (by joining back to `character_source_instances`) to the class it
 * was actually granted from.
 *
 * THE CHARACTER ALSO CARRIES A REMOVED CLASS with an orphaned, filled grant
 * (Fighter/`athletics`) — `exportCharacterShare`'s own rule is ACTIVE grants
 * only ("an orphaned grant's source is not in the document to be named"), so
 * this proves the orphaned grant is correctly left off the wire and does not
 * corrupt the two ACTIVE grants that do travel.
 *
 * TWO ACTIVE, DIFFERENTLY-SOURCED GRANTS ARE THE POINT: a single-grant
 * fixture cannot distinguish "the right ref" from "whichever ref came up
 * first" — the exact shape of bug this control exists to catch.
 */
describe('a v5 round trip preserves skill grant provenance (S-SHARE)', () => {
  function seedProvenanceClasses(db: DatabaseContext): {
    readonly wizardId: number;
    readonly fighterId: number;
    readonly featId: number;
  } {
    const wizardId = seedCatalog(db).classId;
    registerFixtureIdentity(db, 'class', '2024:class:fighter', 'Fighter');
    const fighterId = db.exec(
      `INSERT INTO class_definitions (content_key, name, rules_edition)
       VALUES ('2024:class:fighter', 'Fighter', '2024')
       ON CONFLICT(content_key) DO UPDATE SET name = excluded.name`,
    ).lastInsertId;
    registerFixtureIdentity(db, 'feat', '2024:feat:alert', 'Alert');
    const featId = db.exec(
      `INSERT INTO feat_definitions (content_key, name, rules_edition)
       VALUES ('2024:feat:alert', 'Alert', '2024')
       ON CONFLICT(content_key) DO UPDATE SET name = excluded.name`,
    ).lastInsertId;
    return { wizardId, fighterId, featId };
  }

  it('assigns the filled row to the RIGHT source, not merely the right skill', async () => {
    const source = await database();
    const catalog = seedProvenanceClasses(source);
    const characterId = source.exec(
      `INSERT INTO characters (name, intelligence)
       VALUES ('Provenance Share Hero', 16)`,
    ).lastInsertId;

    // Wizard: KEPT, active, one filled class-skill grant (`arcana`) — ref
    // should resolve to `classes[0]`.
    source.exec(
      `INSERT INTO character_class_levels
         (character_id, class_definition_id, level, is_starting_class)
       VALUES (?, ?, 4, 1)`,
      [characterId, catalog.wizardId],
    );
    const wizardSourceId = source.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, acquired_at_character_level, state
       ) VALUES (?, 'provenance-wizard', 'class', ?, 'Wizard 4', 1, 'active')`,
      [characterId, catalog.wizardId],
    ).lastInsertId;
    source.exec(
      `INSERT INTO character_skill_grants (
         character_id, source_instance_id, grant_key, ordinal, skill, state
       ) VALUES (?, ?, 'class_skill', 1, 'arcana', 'active')`,
      [characterId, wizardSourceId],
    );

    // Alert (a feat): KEPT, active, one filled grant (`religion`) — ref should
    // resolve to `sources[0]`, a DIFFERENT ref than Wizard's. Two active,
    // differently-sourced grants are what makes a wrong-ref bug observable.
    const featSourceId = source.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, acquired_at_character_level, state
       ) VALUES (?, 'provenance-feat', 'feat', ?, 'Alert', 1, 'active')`,
      [characterId, catalog.featId],
    ).lastInsertId;
    source.exec(
      `INSERT INTO character_skill_grants (
         character_id, source_instance_id, grant_key, ordinal, skill, state
       ) VALUES (?, ?, 'background_skill', 1, 'religion', 'active')`,
      [characterId, featSourceId],
    );

    // Fighter: REMOVED (tombstoned; its class-level row deleted, exactly as
    // `UpdateClassCommand.remove` leaves it), with an ORPHANED filled grant
    // (`athletics`) that must NOT travel.
    const fighterSourceId = source.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, acquired_at_character_level, state
       ) VALUES (?, 'provenance-fighter', 'class', ?, 'Fighter 1', 1, 'tombstoned')`,
      [characterId, catalog.fighterId],
    ).lastInsertId;
    source.exec(
      `INSERT INTO character_skill_grants (
         character_id, source_instance_id, grant_key, ordinal, skill, state,
         orphan_reason_code
       ) VALUES (?, ?, 'class_skill', 1, 'athletics', 'orphaned', 'parent_rule_removed')`,
      [characterId, fighterSourceId],
    );

    const document = exportCharacterShare(source, characterId);

    // The orphaned Fighter grant does not reach the wire.
    expect(document.classes).toHaveLength(1);
    expect(document.classes[0]?.classKey).toBe('2024:class:wizard');
    expect(document.skillGrants).toEqual([
      { ref: 0, grantKey: 'class_skill', ordinal: 1, skill: 'arcana' },
      { ref: 1, grantKey: 'background_skill', ordinal: 1, skill: 'religion' },
    ]);

    const target = await database();
    seedProvenanceClasses(target);
    const imported = importCharacterShare(target, document);

    // NOT MERELY THE SKILL TOTALS: each filled grant's `source_instance_id`
    // must resolve, in the TARGET database, to the class/feat it actually
    // came from.
    const arcanaSource = target.oneRaw(
      `SELECT source.source_type AS source_type,
              source.source_definition_id AS source_definition_id
       FROM character_skill_grants AS grant
       INNER JOIN character_source_instances AS source
         ON source.id = grant.source_instance_id
       WHERE grant.character_id = ? AND grant.skill = 'arcana'`,
      [imported.characterId],
    );
    expect(arcanaSource).toEqual({
      source_type: 'class',
      source_definition_id: catalog.wizardId,
    });

    const religionSource = target.oneRaw(
      `SELECT source.source_type AS source_type,
              source.source_definition_id AS source_definition_id
       FROM character_skill_grants AS grant
       INNER JOIN character_source_instances AS source
         ON source.id = grant.source_instance_id
       WHERE grant.character_id = ? AND grant.skill = 'religion'`,
      [imported.characterId],
    );
    expect(religionSource).toEqual({
      source_type: 'feat',
      source_definition_id: catalog.featId,
    });

    // The removed class's skill never arrives at all.
    expect(
      target.scalar(
        `SELECT count(*) FROM character_skill_grants
         WHERE character_id = ? AND skill = 'athletics'`,
        [imported.characterId],
      ),
    ).toBe(0);
  });
});
