import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DatabaseContext } from '../../../src/db/database';
import {
  exportCharacterBackup,
  importCharacterBackup,
} from '../../../src/backup/character-backup';
import {
  exportCharacterShare,
  importCharacterShare,
} from '../../../src/sharing/character-share';
import {
  decodeShareFragment,
  encodeShareFragment,
} from '../../../src/sharing/codec';
import { CharacterState } from '../../../src/character/character-state';
import { seedOriginContent } from '../../../src/rules/origins-srd';
import { characterSpeciesTraits } from '../../../src/rules/origins';
import { speciesHitPoints } from '../../../src/rules/species-effects';
import { openTestDatabase } from '../../helpers/open-db';

/**
 * A CHARACTER'S ORIGIN SURVIVES BACKUP, A SHARE LINK AND A SAVE POINT.
 *
 * The three scope flags in `src/domain/contracts/tables.ts` are a compile gate,
 * not the work: turning them on forced the table names into
 * `BACKUP_DIRECT_TABLES`, `SHARE_TABLES` and `CHARACTER_STATE_TABLES`, but the
 * INSERT statements that carry the rows are hand-written and a hand-written
 * statement can name nine of ten columns. This is the test that would notice.
 *
 * The fixture deliberately holds one trait of EVERY mechanical kind plus a
 * free-text one, because a payload column dropped from a statement is invisible
 * in a row count and shows up only as an effect that quietly stops applying.
 *
 * THE VALUES ARE A CHARACTER'S OWN, NOT THE SRD'S, and are chosen to be
 * awkward rather than accurate. `Dwarven Toughness` carries BOTH hit point
 * halves here even though the seeded SRD trait carries only the per-level one
 * (`flat = 0`) — a user may edit their copy into either shape, and a fixture
 * that used the seeded values would leave the flat column untested at exactly
 * the place a dropped column hides. Nothing here asserts what the rule says;
 * `tests/unit/rules/origins-srd.test.ts` does that.
 */
describe('a character’s origin survives every portability path', () => {
  let connection: Database;
  let db: DatabaseContext;
  let characterId: number;

  const traits = [
    {
      sort_order: 1,
      name: 'Dwarven Resilience',
      description: 'You have Resistance to Poison damage.',
      effect_kind: 'damage_resistance',
      effect_damage_type: 'Poison',
      effect_hit_points_flat: null,
      effect_hit_points_per_level: null,
      effect_speed_bonus_feet: null,
      notes: 'copied from the template',
    },
    {
      sort_order: 2,
      name: 'Dwarven Toughness',
      description: 'Your Hit Point maximum increases by 1.',
      effect_kind: 'hp_modifier',
      effect_damage_type: null,
      effect_hit_points_flat: 1,
      effect_hit_points_per_level: 1,
      effect_speed_bonus_feet: null,
      notes: null,
    },
    {
      sort_order: 3,
      name: 'Fleet of Foot',
      description: 'A trait this player wrote themselves.',
      effect_kind: 'speed',
      effect_damage_type: null,
      effect_hit_points_flat: null,
      effect_hit_points_per_level: null,
      effect_speed_bonus_feet: 5,
      notes: null,
    },
    {
      sort_order: 4,
      name: 'Elven Lineage',
      description: null,
      effect_kind: 'granted_spells',
      effect_damage_type: null,
      effect_hit_points_flat: null,
      effect_hit_points_per_level: null,
      effect_speed_bonus_feet: null,
      notes: null,
    },
    // The free-text majority, and half-entered on purpose: no description at
    // all, which the column permits (D6b limb 3) and which must survive as an
    // absence rather than being completed with an empty string.
    { sort_order: 5, name: 'Stonecunning', description: null, effect_kind: null,
      effect_damage_type: null, effect_hit_points_flat: null,
      effect_hit_points_per_level: null, effect_speed_bonus_feet: null,
      notes: null },
  ];

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    seedOriginContent(db);
    characterId = db.exec('INSERT INTO characters (name) VALUES (?)', [
      'Portable Origin',
    ]).lastInsertId;
    db.exec(
      `INSERT INTO character_species (
         character_id, name, creature_type, size, base_speed_feet, notes
       ) VALUES (?, 'Deep Dwarf', 'Humanoid', 'Medium', 25, 'renamed at the table')`,
      [characterId],
    );
    for (const trait of traits) {
      db.exec(
        `INSERT INTO character_species_traits (
           character_id, sort_order, name, description, effect_kind,
           effect_damage_type, effect_hit_points_flat,
           effect_hit_points_per_level, effect_speed_bonus_feet, notes
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          characterId,
          trait.sort_order,
          trait.name,
          trait.description,
          trait.effect_kind,
          trait.effect_damage_type,
          trait.effect_hit_points_flat,
          trait.effect_hit_points_per_level,
          trait.effect_speed_bonus_feet,
          trait.notes,
        ],
      );
    }
    db.exec(
      `INSERT INTO character_background (
         character_id, name, ability_score_1, ability_score_2, ability_score_3,
         feat_name, skill_proficiency_1, skill_proficiency_2, tool_proficiency,
         equipment_option_a, equipment_option_b, notes
       ) VALUES (?, 'Soldier', 'Strength', 'Dexterity', 'Constitution',
         'Savage Attacker', 'Athletics', 'Intimidation',
         'Choose one kind of Gaming Set', 'Spear, Shortbow, 14 GP', '50 GP',
         'retired from the watch')`,
      [characterId],
    );
  });

  afterEach(() => connection.close());

  function originOf(id: number) {
    return {
      species: db.one(
        `SELECT name, creature_type, size, base_speed_feet, notes
           FROM character_species WHERE character_id = ?`,
        [id],
      ),
      traits: db.all(
        `SELECT sort_order, name, description, effect_kind, effect_damage_type,
                effect_hit_points_flat, effect_hit_points_per_level,
                effect_speed_bonus_feet, notes
           FROM character_species_traits
          WHERE character_id = ? ORDER BY sort_order`,
        [id],
      ),
      background: db.one(
        `SELECT name, ability_score_1, ability_score_2, ability_score_3,
                feat_name, skill_proficiency_1, skill_proficiency_2,
                tool_proficiency, equipment_option_a, equipment_option_b, notes
           FROM character_background WHERE character_id = ?`,
        [id],
      ),
    };
  }

  it('round-trips through the portable backup document, column for column', () => {
    const document = exportCharacterBackup(db, characterId);
    expect(document.tables.character_species).toHaveLength(1);
    expect(document.tables.character_species_traits).toHaveLength(5);
    expect(document.tables.character_background).toHaveLength(1);

    const before = originOf(characterId);
    const imported = importCharacterBackup(db, document);
    expect(imported.characterId).not.toBe(characterId);
    expect(originOf(imported.characterId)).toEqual(before);
    // The derivation agrees on both, which is the point of carrying the payload
    // columns rather than only the prose.
    expect(
      speciesHitPoints(characterSpeciesTraits(db, imported.characterId), 5),
    ).toBe(6);
  });

  it('round-trips through a share link, including the compressed fragment', async () => {
    const document = exportCharacterShare(db, characterId);
    expect(document.species).toMatchObject({
      name: 'Deep Dwarf',
      base_speed_feet: 25,
      notes: 'renamed at the table',
    });
    expect(document.speciesTraits).toHaveLength(5);
    expect(document.background).toMatchObject({ name: 'Soldier' });
    // A trait with no description must arrive with the key ABSENT, not with an
    // empty string — the column is nullable and half-entered is a real state.
    expect(document.speciesTraits?.[4]).toEqual({ name: 'Stonecunning' });

    const fragment = await encodeShareFragment(document);
    const decoded = await decodeShareFragment(fragment);
    expect(decoded).toEqual(document);

    const before = originOf(characterId);
    const imported = importCharacterShare(db, decoded);
    expect(imported.characterId).not.toBe(characterId);
    expect(originOf(imported.characterId)).toEqual(before);
  });

  it('carries no species at all when the character has none', () => {
    const bare = db.exec('INSERT INTO characters (name) VALUES (?)', [
      'No Origin',
    ]).lastInsertId;
    const document = exportCharacterShare(db, bare);
    // Absent, not empty: a link for a character with no origin is exactly the
    // shape it was before origins travelled.
    expect(document).not.toHaveProperty('species');
    expect(document).not.toHaveProperty('speciesTraits');
    expect(document).not.toHaveProperty('background');
    const imported = importCharacterShare(db, document);
    expect(originOf(imported.characterId)).toEqual({
      species: null,
      traits: [],
      background: null,
    });
  });

  it('restores a save point that recorded the origin', () => {
    const state = new CharacterState(db);
    const snapshot = state.capture(characterId);
    expect(snapshot.schema_version).toBe('a7-v4');
    expect(snapshot.character_species_traits).toHaveLength(5);

    db.exec('DELETE FROM character_species_traits WHERE character_id = ?', [
      characterId,
    ]);
    db.exec(
      `UPDATE character_species SET name = 'Regretted' WHERE character_id = ?`,
      [characterId],
    );
    state.restore(characterId, snapshot);

    expect(
      db.scalar('SELECT name FROM character_species WHERE character_id = ?', [
        characterId,
      ]),
    ).toBe('Deep Dwarf');
    expect(speciesHitPoints(characterSpeciesTraits(db, characterId), 3)).toBe(4);
  });

  it('leaves the origin alone when the save point predates it', () => {
    // An `a7-v2` snapshot does not speak for the origin tables, so restoring
    // one must not delete a species it never recorded. The fixture is built by
    // REMOVING the keys from a live capture, which is exactly the shape `a7-v2`
    // had — never by asking current code for one, because nothing can produce
    // one any more.
    const state = new CharacterState(db);
    const snapshot = state.capture(characterId) as unknown as Record<
      string,
      unknown
    >;
    const legacy: Record<string, unknown> = {
      ...snapshot,
      schema_version: 'a7-v2',
    };
    delete legacy.character_species;
    delete legacy.character_species_traits;
    delete legacy.character_background;

    state.restore(characterId, legacy);

    expect(originOf(characterId).traits).toHaveLength(5);
    expect(
      db.scalar('SELECT name FROM character_species WHERE character_id = ?', [
        characterId,
      ]),
    ).toBe('Deep Dwarf');
  });

  it('refuses a share document whose trait payload contradicts its kind', () => {
    // The database's CHECK, applied at the boundary, so a hostile document gets
    // a message naming the field instead of aborting the whole import with a
    // raw SQLITE_CONSTRAINT_CHECK.
    const document = exportCharacterShare(db, characterId);
    for (const [patch, message] of [
      [
        { name: 'Bad', effect_hit_points_flat: 3 },
        /hit point effects require effect_kind hp_modifier/,
      ],
      [
        { name: 'Bad', effect_kind: 'hp_modifier' },
        /effect_kind hp_modifier requires a hit point value/,
      ],
      [
        { name: 'Bad', effect_kind: 'ability_score_increase' },
        /effect_kind is unsupported/,
      ],
      [
        { name: 'Bad', effect_damage_type: 'Fire' },
        /effect_damage_type requires effect_kind damage_resistance/,
      ],
      [
        { name: 'Bad', effect_kind: 'speed' },
        /effect_kind speed requires effect_speed_bonus_feet/,
      ],
    ] as const) {
      expect(() =>
        importCharacterShare(db, { ...document, speciesTraits: [patch] }),
      ).toThrow(message);
    }
  });
});
