import { describe, expect, it } from 'vitest';
import {
  exportCharacterBackup,
  importCharacterBackup,
  validateCharacterBackup,
  type CharacterBackupDocument,
} from '../../../src/backup/character-backup';
import {
  BackupValidationError,
  CHARACTER_BACKUP_FORMAT,
  CHARACTER_BACKUP_VERSION,
  PREVIOUS_CHARACTER_BACKUP_VERSION,
  DATABASE_BACKUP_FORMAT,
  DATABASE_BACKUP_VERSION,
} from '../../../src/backup/backup-version';
import {
  validateDatabaseBackup,
  type DatabaseBackup,
} from '../../../src/backup/database-backup';
import {
  PORTABLE_CONTENT_LIMITS,
  validatePortableContent,
} from '../../../src/backup/portable-content';
import { DatabaseContext } from '../../../src/db/database';
import { openTestDatabase } from '../../helpers/open-db';

function minimalCharacterBackup(): CharacterBackupDocument {
  return {
    format: CHARACTER_BACKUP_FORMAT,
    version: CHARACTER_BACKUP_VERSION,
    exported_at: '2026-07-23T12:00:00.000Z',
    source_character_id: 7,
    character: {
      id: 7,
      name: 'Portable Hero',
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      ability_allocation_method: null,
      proficiency_bonus_override: null,
      rules_edition_preference: '2024',
      allow_legacy: 0,
      revision: 0,
      alignment: null,
      appearance: null,
      backstory: null,
      notes: null,
      archived_at: null,
      created_at: null,
      updated_at: null,
    },
    tables: {
      character_class_levels: [],
      character_source_instances: [],
      spell_selection_slots: [],
      wizard_spellbook_entries: [],
      character_spell_preferences: [],
      character_rule_overrides: [],
      warning_acknowledgements: [],
      character_save_points: [],
      spell_loadouts: [],
      spell_loadout_entries: [],
      character_weapons: [],
      character_species: [],
      character_species_traits: [],
      character_background: [],
      character_armor: [],
      character_hit_point_rolls: [],
      character_skill_proficiencies: [],
      character_sheet_adjustments: [],
      character_effects: [],
      character_skill_grants: [],
      character_skill_expertise_grants: [],
      character_items: [],
      character_attunement_slots: [],
      character_level_feat_choices: [],
    },
    references: {
      class_definitions: [],
      subclass_definitions: [],
      feat_definitions: [],
      species_definitions: [],
      background_definitions: [],
      spell_versions: [],
    },
    content: [],
    supersessions: [],
  };
}

/**
 * WHY THESE FIXTURES CARRY EVERY COLUMN.
 *
 * A backup row is produced by `SELECT *` against a schema-signature-validated
 * database, so a real document's rows are always complete. The per-table row
 * contracts (`src/domain/contracts/rows.ts`) hold documents to that, which is
 * what stops a partial row from silently taking column defaults in place of the
 * user's data. These fixtures therefore describe whole rows.
 */
function sourceInstanceRow(): Record<string, unknown> {
  return {
    id: 11,
    character_id: 7,
    instance_uuid: 'source-original',
    parent_source_instance_id: null,
    source_type: 'class',
    source_definition_id: 31,
    display_name: 'Wizard 1',
    config: '{}',
    acquired_at_character_level: 1,
    state: 'active',
    notes: null,
    created_at: null,
    updated_at: null,
  };
}

function slotRow(): Record<string, unknown> {
  return {
    id: 12,
    character_id: 7,
    source_instance_id: 11,
    slot_key: 'source-original:prepared:1',
    rule_key: 'prepared',
    ordinal: 1,
    bucket: 'prepared',
    eligibility_kind: 'choice_from_query',
    fixed_spell_version_id: null,
    current_spell_version_id: 41,
    label: null,
    spell_level_min: 0,
    spell_level_max: 9,
    allowed_spell_lists: null,
    allowed_schools: null,
    allowed_tags: null,
    always_prepared: 0,
    with_slots: 1,
    free_cast: null,
    counts_against_limit: 1,
    required: 0,
    is_locked: 0,
    state: 'active',
    orphan_reason_code: null,
    orphaned_at: null,
    prior_config: null,
    override_note: null,
    sort_order: 1,
    notes: null,
    created_at: null,
    updated_at: null,
    selection_collection: null,
    selection_eligibility: 'valid',
    selection_invalid_reason: null,
  };
}

function spellbookRow(): Record<string, unknown> {
  return {
    id: 13,
    character_id: 7,
    spell_version_id: 41,
    created_at: null,
    updated_at: null,
  };
}

function snapshotJson(): string {
  return JSON.stringify({
    schema_version: 'a7-v1',
    character: {
      name: 'Portable Hero',
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
      proficiency_bonus_override: null,
      rules_edition_preference: '2024',
      allow_legacy: 0,
      notes: null,
    },
    character_class_levels: [],
    character_source_instances: [sourceInstanceRow()],
    spell_selection_slots: [slotRow()],
    wizard_spellbook_entries: [spellbookRow()],
    warning_acknowledgements: [],
  });
}

function richCharacterBackup(): CharacterBackupDocument {
  const document = minimalCharacterBackup();
  return {
    ...document,
    tables: {
      ...document.tables,
      character_source_instances: [sourceInstanceRow()],
      spell_selection_slots: [slotRow()],
      wizard_spellbook_entries: [spellbookRow()],
      character_save_points: [
        {
          id: 14,
          character_id: 7,
          label: 'Before experiment',
          schema_version: 'a7-v1',
          snapshot: snapshotJson(),
          created_at: null,
          updated_at: null,
        },
      ],
    },
    references: {
      ...document.references,
      class_definitions: [{ id: 31, content_key: 'class:wizard' }],
      spell_versions: [{ id: 41, content_key: '2024:shield' }],
    },
  };
}

/**
 * A BACKUP FILE AS IT WAS WRITTEN BEFORE WEAPONS TRAVELLED — FROZEN, BY HAND.
 *
 * Every byte below is typed out, not produced by any helper in this file and
 * certainly not by `exportCharacterBackup`. That is the whole point: a fixture
 * derived from current code follows the format wherever it goes and can never
 * fail, so it would prove nothing about a file somebody downloaded last month.
 * This one is a literal transcription of the shape that shipped — ten table
 * keys, no `character_weapons`, an `a7-v1` save point with five table keys —
 * and it must keep importing forever.
 *
 * If a future change makes this fail, the correct response is almost never to
 * edit it. It is evidence about the past.
 */
const FROZEN_V1_BACKUP_JSON = `{
  "format": "dnd-multiclass-spells/character",
  "version": 1,
  "exported_at": "2026-05-01T09:30:00.000Z",
  "source_character_id": 3,
  "character": {
    "id": 3,
    "name": "Archived Hero",
    "strength": 11,
    "dexterity": 16,
    "constitution": 12,
    "intelligence": 17,
    "wisdom": 9,
    "charisma": 13,
    "ability_allocation_method": null,
    "proficiency_bonus_override": null,
    "rules_edition_preference": "2024",
    "allow_legacy": 0,
    "notes": "written before weapons travelled",
    "revision": 4,
    "created_at": "2026-04-02 08:00:00",
    "updated_at": "2026-05-01 09:00:00"
  },
  "tables": {
    "character_class_levels": [],
    "character_source_instances": [],
    "spell_selection_slots": [],
    "wizard_spellbook_entries": [],
    "character_spell_preferences": [],
    "character_rule_overrides": [],
    "warning_acknowledgements": [],
    "character_save_points": [
      {
        "id": 21,
        "character_id": 3,
        "label": "Archived checkpoint",
        "schema_version": "a7-v1",
        "snapshot": "{\\"schema_version\\":\\"a7-v1\\",\\"character\\":{\\"name\\":\\"Archived Hero\\",\\"strength\\":11,\\"dexterity\\":16,\\"constitution\\":12,\\"intelligence\\":17,\\"wisdom\\":9,\\"charisma\\":13,\\"proficiency_bonus_override\\":null,\\"rules_edition_preference\\":\\"2024\\",\\"allow_legacy\\":0,\\"notes\\":\\"written before weapons travelled\\"},\\"character_class_levels\\":[],\\"character_source_instances\\":[],\\"spell_selection_slots\\":[],\\"wizard_spellbook_entries\\":[],\\"warning_acknowledgements\\":[]}",
        "created_at": "2026-04-10 12:00:00",
        "updated_at": "2026-04-10 12:00:00"
      }
    ],
    "spell_loadouts": [],
    "spell_loadout_entries": []
  },
  "references": {
    "class_definitions": [],
    "subclass_definitions": [],
    "feat_definitions": [],
    "species_definitions": [],
    "background_definitions": [],
    "spell_versions": []
  }
}`;

/** Hand-authored freeze of the complete v4 envelope immediately before v5. */
const FROZEN_V4_BACKUP = {
  format: 'dnd-multiclass-spells/character',
  version: 4,
  exported_at: '2026-08-05T12:00:00.000Z',
  source_character_id: 44,
  character: {
    id: 44,
    name: 'Frozen V4 Hero',
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    ability_allocation_method: null,
    proficiency_bonus_override: null,
    rules_edition_preference: '2024',
    allow_legacy: 0,
    revision: 0,
    alignment: null,
    appearance: null,
    backstory: null,
    notes: 'The last pre-manifest format.',
    archived_at: '2042-03-04T05:06:07.000Z',
    created_at: null,
    updated_at: null,
  },
  tables: {
    character_class_levels: [],
    character_source_instances: [],
    spell_selection_slots: [],
    wizard_spellbook_entries: [],
    character_spell_preferences: [],
    character_rule_overrides: [],
    warning_acknowledgements: [],
    character_save_points: [],
    spell_loadouts: [],
    spell_loadout_entries: [],
    character_weapons: [],
    character_species: [],
    character_species_traits: [],
    character_background: [],
    character_armor: [],
    character_hit_point_rolls: [],
    character_skill_proficiencies: [],
    character_sheet_adjustments: [],
    character_effects: [],
    character_skill_grants: [],
    character_skill_expertise_grants: [],
    character_items: [],
    character_attunement_slots: [],
    character_level_feat_choices: [],
  },
  references: {
    class_definitions: [],
    subclass_definitions: [],
    feat_definitions: [],
    species_definitions: [],
    background_definitions: [],
    spell_versions: [],
  },
  spell_definitions: {
    spell_identities: [],
    spell_identity_aliases: [],
    spell_versions: [],
    spell_version_publications: [],
    spell_list_memberships: [],
    spell_version_tags: [],
    spell_version_damage_types: [],
    spell_version_conditions: [],
    spell_version_attack_modes: [],
    spell_version_save_abilities: [],
    spell_version_upcast_levels: [],
    spell_version_cantrip_upgrade_levels: [],
  },
} as const;

describe('the frozen immediately previous character backup', () => {
  it('CI5-V4-FROZEN validates the hand-authored v4 envelope without a content manifest', () => {
    expect(PREVIOUS_CHARACTER_BACKUP_VERSION).toBe(4);
    expect(Object.hasOwn(FROZEN_V4_BACKUP, 'content')).toBe(false);
    expect(() => validateCharacterBackup(FROZEN_V4_BACKUP)).not.toThrow();
  });
});

describe('a backup file written before weapons travelled', () => {
  it('still imports, and reads as a character with no weapons', () => {
    const archived = JSON.parse(FROZEN_V1_BACKUP_JSON) as Record<
      string,
      unknown
    >;
    // The fixture really is missing the key — asserted rather than assumed, so
    // an accidental edit that adds it cannot make the rest pass vacuously.
    const tables = archived.tables as Record<string, unknown>;
    expect(Object.hasOwn(tables, 'character_weapons')).toBe(false);
    expect(Object.keys(tables)).toHaveLength(10);
    // ...and every table added since is missing too, including the four stored
    // sheet inputs. This is the assertion that fails on the day somebody makes
    // one of them mandatory and every downloaded file stops opening.
    for (const table of [
      'character_species',
      'character_species_traits',
      'character_background',
      'character_armor',
      'character_hit_point_rolls',
      'character_skill_proficiencies',
      'character_sheet_adjustments',
    ]) {
      expect(Object.hasOwn(tables, table), `${table} is absent`).toBe(false);
    }

    expect(() => validateCharacterBackup(archived)).not.toThrow();
  });

  it('accepts the current format alongside it, and still refuses an unknown table', () => {
    // The optional key does not open the document up: an unexpected table name
    // is still refused, so a typo cannot silently drop rows.
    const current = minimalCharacterBackup();
    expect(() => validateCharacterBackup(current)).not.toThrow();

    const stray = structuredClone(current) as unknown as {
      tables: Record<string, unknown>;
    };
    stray.tables.character_wepons = [];
    expect(() => validateCharacterBackup(stray)).toThrow(
      'Character backup tables must contain exactly',
    );

    // And a table that is NOT optional is still required.
    const truncated = structuredClone(current) as unknown as {
      tables: Record<string, unknown>;
    };
    delete truncated.tables.spell_loadouts;
    expect(() => validateCharacterBackup(truncated)).toThrow(
      'Character backup tables must contain exactly',
    );
  });

  it('refuses a save point whose column and snapshot disagree about the version', () => {
    const archived = JSON.parse(FROZEN_V1_BACKUP_JSON) as {
      tables: { character_save_points: Array<Record<string, unknown>> };
    };
    archived.tables.character_save_points[0]!.schema_version = 'a7-v2';
    expect(() => validateCharacterBackup(archived)).toThrow(
      'schema_version does not match its snapshot',
    );
  });

  it('refuses an a7-v1 snapshot that has grown an armour key it never had', () => {
    const archived = JSON.parse(FROZEN_V1_BACKUP_JSON) as {
      tables: { character_save_points: Array<Record<string, unknown>> };
    };
    const savePoint = archived.tables.character_save_points[0]!;
    const snapshot = JSON.parse(String(savePoint.snapshot)) as Record<
      string,
      unknown
    >;
    snapshot.character_armor = [];
    savePoint.snapshot = JSON.stringify(snapshot);
    // The same claim, carried forward to `a7-v4`: each version has ONE key set,
    // and a hybrid would mean the version identifier no longer says what the
    // snapshot carries — which is the entire job it has.
    expect(() => validateCharacterBackup(archived)).toThrow(
      'must contain exactly',
    );
  });

  it('refuses an a7-v1 snapshot that has grown a weapons key it never had', () => {
    const archived = JSON.parse(FROZEN_V1_BACKUP_JSON) as {
      tables: { character_save_points: Array<Record<string, unknown>> };
    };
    const savePoint = archived.tables.character_save_points[0]!;
    const snapshot = JSON.parse(String(savePoint.snapshot)) as Record<
      string,
      unknown
    >;
    snapshot.character_weapons = [];
    savePoint.snapshot = JSON.stringify(snapshot);
    // Each version has ONE key set. Accepting a hybrid would mean the version
    // no longer says what the snapshot contains, and the restore path decides
    // whether to delete a character's weapons on exactly that question.
    expect(() => validateCharacterBackup(archived)).toThrow(
      'must contain exactly',
    );
  });
});

/**
 * A JSON BOOLEAN IS NOT A SQLITE FLAG, AND THE ROW CONTRACT CANNOT TELL.
 *
 * `character_weapons.mastery_selected` is `base: 'degraded'` in the generated
 * column facts — it accepts any non-null value — so `true` passes the row
 * contract untouched, and the live table's CHECK never sees a row that is still
 * JSON. `weaponMasterySelectionError` accepts `true` beside `1` for exactly the
 * reason `character.allow_legacy` does: a document that has been through a
 * codec, or written by hand, may carry either spelling. That `true` arm is the
 * only thing between such a document and a raw SQLITE_CONSTRAINT_CHECK thrown
 * from inside the import transaction.
 */
describe('a hand-written backup that spells a flag as a JSON boolean', () => {
  const weaponRow = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    id: 1,
    character_id: 7,
    name: 'Impossible Blade',
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
    created_at: null,
    updated_at: null,
    ...overrides,
  });

  const withWeapon = (row: Record<string, unknown>): unknown => {
    const backup = structuredClone(minimalCharacterBackup()) as unknown as {
      tables: Record<string, unknown[]>;
    };
    backup.tables.character_weapons = [row];
    return backup;
  };

  it('refuses `mastery_selected: true` with no property, as it refuses `1`', () => {
    expect(() =>
      validateCharacterBackup(
        withWeapon(
          weaponRow({ mastery_selected: true, mastery_property: null }),
        ),
      ),
    ).toThrow('selects a weapon mastery without naming the property');

    // `1` is the same rule; asserted beside it so the boolean case cannot be
    // read as a special case of some other check.
    expect(() =>
      validateCharacterBackup(
        withWeapon(weaponRow({ mastery_selected: 1, mastery_property: null })),
      ),
    ).toThrow('selects a weapon mastery without naming the property');
  });

  it('accepts `mastery_selected: true` once the property is named', () => {
    // The boolean itself is not the offence — pairing it with no property is.
    expect(() =>
      validateCharacterBackup(
        withWeapon(
          weaponRow({ mastery_selected: true, mastery_property: 'Vex' }),
        ),
      ),
    ).not.toThrow();
    // And `false` selects nothing, so it needs no property.
    expect(() =>
      validateCharacterBackup(
        withWeapon(
          weaponRow({ mastery_selected: false, mastery_property: null }),
        ),
      ),
    ).not.toThrow();
  });
});

/**
 * AN EFFECT'S PAYLOAD BELONGS TO ITS KIND, AND A FILE IS HELD TO THAT TOO.
 *
 * `character_effects` declares five kind/payload CHECKs, and a per-column
 * contract cannot see any of them — each is about two columns together. Before
 * `effectPayloadKindError` the only thing that noticed was the INSERT, which
 * aborts the import with `SQLITE_CONSTRAINT_CHECK
 * character_effects_hit_points_kind_check`: a constraint name, inside a rolled
 * back transaction, naming neither the effect nor the file it came from. The
 * SHARE arm has always refused the same document with a sentence, so this is a
 * file and a link being held to one standard rather than two.
 *
 * BOTH DOORS ARE TESTED, because a file can carry the payload in two shapes: as
 * a `character_effects` row, and as the five retired `effect_*` columns on a
 * trait row written before the model was inverted — which
 * `splitLegacyTraitEffect` turns into exactly the same INSERT.
 */
describe('a hand-edited backup whose effect payload contradicts its kind', () => {
  const effectRow = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    id: 1,
    character_id: 7,
    sort_order: 1,
    effect_kind: 'damage_resistance',
    damage_type: 'Poison',
    hit_points_flat: null,
    hit_points_per_level: null,
    speed_bonus_feet: null,
    source_instance_id: null,
    label: 'Dwarven Resilience',
    notes: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  });

  const legacyTraitRow = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    id: 1,
    character_id: 7,
    sort_order: 1,
    name: 'Dwarven Resilience',
    description: null,
    notes: null,
    effect_kind: 'damage_resistance',
    effect_damage_type: 'Poison',
    effect_hit_points_flat: null,
    effect_hit_points_per_level: null,
    effect_speed_bonus_feet: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  });

  const withRows = (
    table: 'character_effects' | 'character_species_traits',
    rows: readonly Record<string, unknown>[],
  ): unknown => {
    const backup = structuredClone(minimalCharacterBackup()) as unknown as {
      tables: Record<string, unknown[]>;
    };
    backup.tables[table] = [...rows];
    return backup;
  };

  it('names the offending effect instead of a CHECK constraint', () => {
    expect(() =>
      validateCharacterBackup(
        withRows('character_effects', [effectRow({ hit_points_flat: 5 })]),
      ),
    ).toThrow('carries hit points without effect_kind hp_modifier');
    expect(() =>
      validateCharacterBackup(
        withRows('character_effects', [
          effectRow({ effect_kind: 'hp_modifier', damage_type: null }),
        ]),
      ),
    ).toThrow('has effect_kind hp_modifier and no hit point value');
    expect(() =>
      validateCharacterBackup(
        withRows('character_effects', [
          effectRow({ effect_kind: 'speed', damage_type: null }),
        ]),
      ),
    ).toThrow('has effect_kind speed and no speed bonus');
    expect(() =>
      validateCharacterBackup(
        withRows('character_effects', [effectRow({ speed_bonus_feet: 5 })]),
      ),
    ).toThrow('carries a speed bonus without effect_kind speed');
    expect(() =>
      validateCharacterBackup(
        withRows('character_effects', [
          effectRow({ effect_kind: 'speed', speed_bonus_feet: 5 }),
        ]),
      ),
    ).toThrow('carries a damage type without effect_kind damage_resistance');
  });

  it('applies the same rule to the payload a legacy trait row still carries', () => {
    // The trait's own columns are stripped before the contract sees them, so
    // without this nothing in this file would look at the payload at all.
    expect(() =>
      validateCharacterBackup(
        withRows('character_species_traits', [
          legacyTraitRow({ effect_hit_points_flat: 5 }),
        ]),
      ),
    ).toThrow('carries hit points without effect_kind hp_modifier');
    expect(() =>
      validateCharacterBackup(
        withRows('character_species_traits', [
          legacyTraitRow({ effect_kind: 'speed', effect_damage_type: null }),
        ]),
      ),
    ).toThrow('has effect_kind speed and no speed bonus');
  });

  it('accepts every coherent shape, including the ones a kind may omit', () => {
    // A resistance with NO damage type is the Tiefling's unchosen legacy and is
    // legal: the CHECK ties a payload to its kind, it does not demand one.
    expect(() =>
      validateCharacterBackup(
        withRows('character_effects', [
          effectRow(),
          effectRow({ id: 2, sort_order: 2, damage_type: null }),
          effectRow({
            id: 3,
            sort_order: 3,
            effect_kind: 'hp_modifier',
            damage_type: null,
            hit_points_per_level: 1,
          }),
          effectRow({
            id: 4,
            sort_order: 4,
            effect_kind: 'speed',
            damage_type: null,
            speed_bonus_feet: 5,
          }),
        ]),
      ),
    ).not.toThrow();
    // And the legacy shapes that migrate cleanly, including the two that yield
    // no effect at all and therefore have no payload to contradict: the retired
    // `granted_spells`, and the null kind 26 of the 33 printed traits carry.
    expect(() =>
      validateCharacterBackup(
        withRows('character_species_traits', [
          legacyTraitRow(),
          legacyTraitRow({
            id: 2,
            sort_order: 2,
            effect_kind: 'granted_spells',
            effect_damage_type: null,
          }),
          legacyTraitRow({
            id: 3,
            sort_order: 3,
            effect_kind: null,
            effect_damage_type: null,
          }),
        ]),
      ),
    ).not.toThrow();
  });
});

describe('database backup validation', () => {
  it('accepts the current typed envelope and rejects version or byte corruption', () => {
    const backup: DatabaseBackup = {
      format: DATABASE_BACKUP_FORMAT,
      version: DATABASE_BACKUP_VERSION,
      exported_at: '2026-07-23T12:00:00.000Z',
      sqlite: new Uint8Array([83, 81, 76]),
    };
    expect(() => validateDatabaseBackup(backup)).not.toThrow();

    expect(() =>
      validateDatabaseBackup({ ...backup, version: 2 }),
    ).toThrow('Unsupported database backup version 2.');
    expect(() =>
      validateDatabaseBackup({ ...backup, sqlite: [] }),
    ).toThrow('Database backup sqlite must be a Uint8Array.');
  });
});

describe('portable character validation', () => {
  it('CI5-MANIFEST-LIMIT refuses an entry count above the portable ceiling before decoding entries', () => {
    expect(() => validatePortableContent(
      Array.from({ length: PORTABLE_CONTENT_LIMITS.entries + 1 }, () => null),
    )).toThrow(
      `Portable content must contain at most ${String(PORTABLE_CONTENT_LIMITS.entries)} entries.`,
    );
  });

  it('CI5-MANIFEST-CYCLE refuses a non-JSON object graph before semantic projection', () => {
    const cyclic: unknown[] = [];
    cyclic.push(cyclic);
    expect(() => validatePortableContent(cyclic)).toThrow(
      'Portable content must not contain cycles.',
    );
  });

  it('accepts the current format and rejects incompatible headers', () => {
    const document = minimalCharacterBackup();
    expect(() => validateCharacterBackup(document)).not.toThrow();

    expect(() =>
      validateCharacterBackup({ ...document, format: 'other/character' }),
    ).toThrow('Unsupported character backup format "other/character".');
    expect(() =>
      validateCharacterBackup({ ...document, version: 0 }),
    ).toThrow('Unsupported character backup version 0.');
  });

  it('requires and bounds current flavor root fields', () => {
    const document = minimalCharacterBackup();
    const hostile = structuredClone(document);
    Object.assign(hostile.character as Record<string, unknown>, {
      alignment: 'x'.repeat(120),
      appearance: 'line one\nline two',
      backstory: '🧙'.repeat(20_000),
    });
    expect(() => validateCharacterBackup(hostile)).not.toThrow();

    const overlong = structuredClone(hostile);
    Object.assign(overlong.character as Record<string, unknown>, {
      backstory: '🧙'.repeat(20_001),
    });
    expect(() => validateCharacterBackup(overlong)).toThrow(
      'Character backup character.backstory must be null or text from 1 through 20000 characters.',
    );

    const missing = structuredClone(document);
    delete (missing.character as Record<string, unknown>).appearance;
    expect(() => validateCharacterBackup(missing)).toThrow(
      'Character backup character must contain exactly:',
    );
  });

  it('requires current archive lifecycle and accepts both stored timestamp spellings', () => {
    const iso = minimalCharacterBackup();
    (iso.character as Record<string, unknown>).archived_at =
      '2042-03-04T05:06:07.000Z';
    expect(() => validateCharacterBackup(iso)).not.toThrow();

    const sqlite = structuredClone(iso);
    (sqlite.character as Record<string, unknown>).archived_at =
      '2042-03-04 05:06:07';
    expect(() => validateCharacterBackup(sqlite)).not.toThrow();

    const missing = structuredClone(iso);
    delete (missing.character as Record<string, unknown>).archived_at;
    expect(() => validateCharacterBackup(missing)).toThrow(
      'Character backup character must contain exactly:',
    );

    const wrongType = structuredClone(iso);
    (wrongType.character as Record<string, unknown>).archived_at = 20420304;
    expect(() => validateCharacterBackup(wrongType)).toThrow(
      'Character backup character.archived_at',
    );
  });

  it('portable backup round-trips grandfathered notes above the 20,000-code-point new-write cap', async () => {
    const grandfatheredNotes = '🧙'.repeat(25_000);
    expect([...grandfatheredNotes]).toHaveLength(25_000);

    const sourceConnection = await openTestDatabase();
    const targetConnection = await openTestDatabase();
    try {
      const source = new DatabaseContext(sourceConnection);
      const sourceCharacterId = source.exec(
        'INSERT INTO characters (name, notes) VALUES (?, ?)',
        ['Grandfathered Notes', grandfatheredNotes],
      ).lastInsertId;
      const exported = exportCharacterBackup(source, sourceCharacterId);

      const target = new DatabaseContext(targetConnection);
      const { characterId } = importCharacterBackup(target, exported);
      const reexported = exportCharacterBackup(target, characterId);
      const restoredNotes = reexported.character.notes;

      expect(restoredNotes).toBe(grandfatheredNotes);
      if (typeof restoredNotes !== 'string') {
        throw new TypeError('Re-exported grandfathered notes must be text.');
      }
      expect([...restoredNotes]).toHaveLength(25_000);
    } finally {
      sourceConnection.close();
      targetConnection.close();
    }
  });

  it('rejects direct cross-character rows before import', () => {
    const document = richCharacterBackup();
    const changed = structuredClone(document);
    (
      changed.tables.spell_selection_slots[0] as Record<string, unknown>
    ).character_id = 99;

    expect(() => validateCharacterBackup(changed)).toThrow(
      'Character backup tables.spell_selection_slots[0] belongs to another character.',
    );
  });

  it('rejects cross-character references and unknown catalog ids', () => {
    const document = richCharacterBackup();
    const changed = structuredClone(document);
    (
      changed.tables.spell_selection_slots[0] as Record<string, unknown>
    ).source_instance_id = 999;
    expect(() => validateCharacterBackup(changed)).toThrow(
      'references a source from another character.',
    );

    (
      changed.tables.spell_selection_slots[0] as Record<string, unknown>
    ).source_instance_id = 11;
    (
      changed.tables.spell_selection_slots[0] as Record<string, unknown>
    ).current_spell_version_id = 999;
    expect(() => validateCharacterBackup(changed)).toThrow(
      'has no spell_versions content-key reference for id 999.',
    );
  });

  it('rejects corrupt or cross-character save-point JSON', () => {
    const corrupt = richCharacterBackup();
    (
      corrupt.tables.character_save_points[0] as Record<string, unknown>
    ).snapshot = '{bad json';
    // The row contract reaches this before `parseSnapshot` does, and names the
    // table, the row index and the field rather than just the field.
    expect(() => validateCharacterBackup(corrupt)).toThrow(
      'Character backup tables.character_save_points[0].snapshot: must be a JSON object.',
    );

    // Well-formed JSON of the WRONG SHAPE, which a syntax-only check accepted.
    // The column's contract knows its readers require an object — both
    // `parseSnapshot` and `SavePointReader.restoreCommand` refuse anything else
    // — so the shape is stated in the same message as the table and the row.
    const notAnObject = richCharacterBackup();
    (
      notAnObject.tables.character_save_points[0] as Record<string, unknown>
    ).snapshot = '"a bare string"';
    expect(() => validateCharacterBackup(notAnObject)).toThrow(
      'Character backup tables.character_save_points[0].snapshot: must be a JSON object.',
    );

    const crossed = richCharacterBackup();
    const savePoint = crossed.tables.character_save_points[0] as Record<
      string,
      unknown
    >;
    const snapshot = JSON.parse(String(savePoint.snapshot)) as {
      wizard_spellbook_entries: Array<Record<string, unknown>>;
    };
    snapshot.wizard_spellbook_entries[0]!.character_id = 8;
    savePoint.snapshot = JSON.stringify(snapshot);
    expect(() => validateCharacterBackup(crossed)).toThrow(
      'snapshot.wizard_spellbook_entries[0] belongs to another character.',
    );

    const cyclic = richCharacterBackup();
    const cyclicSavePoint =
      cyclic.tables.character_save_points[0] as Record<string, unknown>;
    const cyclicSnapshot = JSON.parse(String(cyclicSavePoint.snapshot)) as {
      character_source_instances: Array<Record<string, unknown>>;
    };
    cyclicSnapshot.character_source_instances[0]!.parent_source_instance_id = 11;
    cyclicSavePoint.snapshot = JSON.stringify(cyclicSnapshot);
    expect(() => validateCharacterBackup(cyclic)).toThrow(
      'Character backup source parent graph contains a cycle.',
    );
  });

  it('uses a distinct validation error type for product-facing failures', () => {
    expect(() => validateCharacterBackup(null)).toThrow(
      BackupValidationError,
    );
  });
});
