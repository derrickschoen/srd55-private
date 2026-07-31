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
import { CHARACTER_SHARE_VERSION } from '../../../src/sharing/schema';
import { CharacterState } from '../../../src/character/character-state';
import { seedOriginContent } from '../../../src/rules/origins-srd';
import { seedWeaponContent } from '../../../src/rules/weapons-srd';
import { characterEffects } from '../../../src/rules/origins';
import {
  effectHitPoints,
  summariseEffects,
} from '../../../src/rules/species-effects';
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
 * The fixture deliberately holds one EFFECT of every mechanical kind plus
 * free-text traits that grant none, because a payload column dropped from a
 * statement is invisible in a row count and shows up only as an effect that
 * quietly stops applying.
 *
 * IT ALSO HOLDS TWO EFFECTS FROM ONE TRAIT, which is the shape the old model
 * could not represent at all and therefore the one most likely to be lost by a
 * portability path that still assumes one effect per trait.
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
      notes: 'copied from the template',
    },
    {
      sort_order: 2,
      name: 'Dwarven Toughness',
      description: 'Your Hit Point maximum increases by 1.',
      notes: null,
    },
    {
      sort_order: 3,
      name: 'Fleet of Foot',
      description: 'A trait this player wrote themselves.',
      notes: null,
    },
    {
      sort_order: 4,
      name: 'Fiendish Legacy',
      description: 'You gain the level 1 benefit of the chosen legacy.',
      notes: null,
    },
    // The free-text majority, and half-entered on purpose: no description at
    // all, which the column permits (D6b limb 3) and which must survive as an
    // absence rather than being completed with an empty string.
    { sort_order: 5, name: 'Stonecunning', description: null, notes: null },
  ];

  const effects = [
    {
      sort_order: 1,
      effect_kind: 'damage_resistance',
      damage_type: 'Poison',
      hit_points_flat: null,
      hit_points_per_level: null,
      speed_bonus_feet: null,
      label: 'Dwarven Resilience',
      notes: 'copied from the template',
    },
    {
      sort_order: 2,
      effect_kind: 'hp_modifier',
      damage_type: null,
      hit_points_flat: 1,
      hit_points_per_level: 1,
      speed_bonus_feet: null,
      label: 'Dwarven Toughness',
      notes: null,
    },
    {
      sort_order: 3,
      effect_kind: 'speed',
      damage_type: null,
      hit_points_flat: null,
      hit_points_per_level: null,
      speed_bonus_feet: 5,
      label: 'Fleet of Foot',
      notes: null,
    },
    // TWO EFFECTS FROM ONE TRAIT — the case the old model could not hold, and
    // therefore the one a portability path is most likely to lose. The
    // resistance is the Tiefling's, with its type unchosen.
    {
      sort_order: 4,
      effect_kind: 'damage_resistance',
      damage_type: null,
      hit_points_flat: null,
      hit_points_per_level: null,
      speed_bonus_feet: null,
      label: 'Fiendish Legacy',
      notes: null,
    },
    {
      sort_order: 5,
      effect_kind: 'hp_modifier',
      damage_type: null,
      hit_points_flat: 2,
      hit_points_per_level: null,
      speed_bonus_feet: null,
      label: 'Fiendish Legacy',
      notes: 'the second effect of one trait',
    },
  ];

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    // THE WEAPON CATALOG FIRST, AND IT IS A REAL PRECONDITION RATHER THAN
    // TIDINESS. `background_equipment_items` links a background's Spear to the
    // weapon catalog's Spear by content key, and `resolveTemplateId` throws by
    // name when the key is absent. `src/db/bootstrap.ts` orders the two seeds
    // for the same reason, and
    // `tests/integration/rules/background-equipment.test.ts` asserts the throw.
    seedWeaponContent(db);
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
           character_id, sort_order, name, description, notes
         ) VALUES (?, ?, ?, ?, ?)`,
        [
          characterId,
          trait.sort_order,
          trait.name,
          trait.description,
          trait.notes,
        ],
      );
    }
    for (const effect of effects) {
      db.exec(
        `INSERT INTO character_effects (
           character_id, sort_order, effect_kind, damage_type,
           hit_points_flat, hit_points_per_level, speed_bonus_feet,
           source_instance_id, label, notes
         ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
        [
          characterId,
          effect.sort_order,
          effect.effect_kind,
          effect.damage_type,
          effect.hit_points_flat,
          effect.hit_points_per_level,
          effect.speed_bonus_feet,
          effect.label,
          effect.notes,
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
      species: db.oneRaw(
        `SELECT name, creature_type, size, base_speed_feet, notes
           FROM character_species WHERE character_id = ?`,
        [id],
      ),
      traits: db.allRaw(
        `SELECT sort_order, name, description, notes
           FROM character_species_traits
          WHERE character_id = ? ORDER BY sort_order`,
        [id],
      ),
      effects: db.allRaw(
        `SELECT sort_order, effect_kind, damage_type, hit_points_flat,
                hit_points_per_level, speed_bonus_feet, source_instance_id,
                label, notes
           FROM character_effects
          WHERE character_id = ? ORDER BY sort_order`,
        [id],
      ),
      background: db.oneRaw(
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
    expect(document.tables.character_effects).toHaveLength(5);
    expect(document.tables.character_background).toHaveLength(1);

    const before = originOf(characterId);
    const imported = importCharacterBackup(db, document);
    expect(imported.characterId).not.toBe(characterId);
    expect(originOf(imported.characterId)).toEqual(before);
    // The derivation agrees on both, which is the point of carrying the payload
    // columns rather than only the prose. 1 + 1*5 from Dwarven Toughness, plus
    // the 2 from Fiendish Legacy's SECOND effect — the one the old model could
    // not have carried at all.
    expect(effectHitPoints(characterEffects(db, imported.characterId), 5)).toBe(
      8,
    );
  });

  it('round-trips through a share link, including the compressed fragment', async () => {
    const document = exportCharacterShare(db, characterId);
    expect(document.species).toMatchObject({
      name: 'Deep Dwarf',
      base_speed_feet: 25,
      notes: 'renamed at the table',
    });
    expect(document.speciesTraits).toHaveLength(5);
    expect(document.effects).toHaveLength(5);
    // The trait tuples this build writes carry NO payload — the five retired
    // wire slots are always null now — so a trait arrives as text alone.
    expect(document.speciesTraits?.[0]).not.toHaveProperty('effect_kind');
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
    expect(document).not.toHaveProperty('effects');
    const imported = importCharacterShare(db, document);
    expect(originOf(imported.characterId)).toEqual({
      species: null,
      traits: [],
      effects: [],
      background: null,
    });
  });

  it('restores a save point that recorded the origin', () => {
    const state = new CharacterState(db);
    const snapshot = state.capture(characterId);
    expect(snapshot.schema_version).toBe('a7-v15');
    expect(snapshot.character_species_traits).toHaveLength(5);
    expect(snapshot.character_effects).toHaveLength(5);

    db.exec('DELETE FROM character_species_traits WHERE character_id = ?', [
      characterId,
    ]);
    db.exec('DELETE FROM character_effects WHERE character_id = ?', [
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
    // 1 + 1*3 from Dwarven Toughness plus 2 from Fiendish Legacy's second
    // effect.
    expect(effectHitPoints(characterEffects(db, characterId), 3)).toBe(6);
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
    delete legacy.character_effects;

    state.restore(characterId, legacy);

    expect(originOf(characterId).traits).toHaveLength(5);
    // An `a7-v2` snapshot has no trait rows at all, so it makes no claim about
    // effects either — not even the implicit one a v3/v4 snapshot makes by
    // carrying the payload on its traits. Leaving the table alone is the only
    // honest reading.
    expect(originOf(characterId).effects).toHaveLength(5);
    expect(
      db.scalar('SELECT name FROM character_species WHERE character_id = ?', [
        characterId,
      ]),
    ).toBe('Deep Dwarf');
  });

  it('refuses a share document whose EFFECT payload contradicts its kind', () => {
    // The database's CHECKs, applied at the boundary, so a hostile document
    // gets a message naming the field instead of aborting the whole import with
    // a raw SQLITE_CONSTRAINT_CHECK.
    const document = exportCharacterShare(db, characterId);
    for (const [patch, message] of [
      [
        { kind: 'damage_resistance', label: 'Bad', hit_points_flat: 3 },
        /hit point payloads require kind hp_modifier/,
      ],
      [
        { kind: 'hp_modifier', label: 'Bad' },
        /kind hp_modifier requires a hit point value/,
      ],
      [
        { kind: 'ability_score_increase', label: 'Bad' },
        /kind is unsupported/,
      ],
      // THE RETIRED MEMBER, refused HERE and accepted on a legacy trait row —
      // and the difference is not an inconsistency. No link in the wild can
      // carry a `granted_spells` EFFECT, because this section did not exist
      // before the member was retired; every link in the wild CAN carry one on
      // a trait. Tolerating it here would be inventing compatibility for an
      // artifact that cannot exist.
      [{ kind: 'granted_spells', label: 'Bad' }, /kind is unsupported/],
      [
        { kind: 'hp_modifier', label: 'Bad', hit_points_flat: 1, damage_type: 'Fire' },
        /damage_type requires kind damage_resistance/,
      ],
      [{ kind: 'speed', label: 'Bad' }, /kind speed requires speed_bonus_feet/],
      [
        { kind: 'damage_resistance', label: '' },
        /effects\[0\]\.label/,
      ],
    ] as const) {
      expect(() =>
        importCharacterShare(db, { ...document, effects: [patch] }),
      ).toThrow(message);
    }
  });

  it('refuses a LEGACY trait payload that contradicts its kind', () => {
    // The same checks on the retired trait fields, which a link minted before
    // the inversion still carries. They are validated rather than ignored: a
    // legacy payload that is internally incoherent must not reach an INSERT.
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

  /**
   * A LOGICAL SHARE DOCUMENT FROM BEFORE THE EFFECT INVERSION, HAND-BUILT.
   *
   * Written as a literal and never obtained from `exportCharacterShare`, which
   * cannot produce one any more: this build writes `null` in the five retired
   * trait slots and puts the effects in their own section. This is the logical
   * object after wire-version migration: the payload remains where that build
   * put it, and there is NO `effects` key at all.
   */
  const PRE_INVERSION_SHARE = {
    format: 'dnd-multiclass-spells-character-share',
    version: CHARACTER_SHARE_VERSION,
    character: { name: 'Pre-Inversion Hero' },
    classes: [],
    sources: [],
    selections: [],
    spellbook: [],
    preferences: [],
    overrides: [],
    species: { name: 'Tiefling', creature_type: 'Humanoid', size: 'Medium' },
    speciesTraits: [
      {
        name: 'Fiendish Legacy',
        description: 'You gain the level 1 benefit of the chosen legacy.',
        effect_kind: 'granted_spells',
      },
      {
        name: 'Dwarven Toughness',
        description: 'Your Hit Point maximum increases by 1.',
        effect_kind: 'hp_modifier',
        effect_hit_points_flat: 0,
        effect_hit_points_per_level: 1,
      },
      {
        name: 'Ancestral Guard',
        description: 'You have Resistance to Poison damage.',
        effect_kind: 'damage_resistance',
        effect_damage_type: 'Poison',
      },
      { name: 'Stonecunning' },
    ],
  } as const;

  it('imports a pre-inversion share document, migrating its trait payload', () => {
    // Guards the fixture: if it were ever regenerated from current code it
    // would carry an `effects` key and no trait payload, and this fails rather
    // than the suite quietly testing the new format against itself.
    expect(Object.hasOwn(PRE_INVERSION_SHARE, 'effects')).toBe(false);
    expect(PRE_INVERSION_SHARE.speciesTraits[0].effect_kind).toBe(
      'granted_spells',
    );

    const imported = importCharacterShare(db, PRE_INVERSION_SHARE);
    const origin = originOf(imported.characterId);
    // All four traits arrive, as text.
    expect(origin.traits.map((row) => row.name)).toEqual([
      'Fiendish Legacy',
      'Dwarven Toughness',
      'Ancestral Guard',
      'Stonecunning',
    ]);
    // TWO effects from four traits. `Stonecunning` was always prose, and
    // `granted_spells` is retired — accepted on the way in so the link stays
    // readable, then dropped, which costs the character nothing because its
    // spells were never stored here in the first place.
    expect(origin.effects).toEqual([
      {
        sort_order: 1,
        effect_kind: 'hp_modifier',
        damage_type: null,
        hit_points_flat: 0,
        hit_points_per_level: 1,
        speed_bonus_feet: null,
        source_instance_id: null,
        label: 'Dwarven Toughness',
        notes: null,
      },
      {
        sort_order: 2,
        effect_kind: 'damage_resistance',
        damage_type: 'Poison',
        hit_points_flat: null,
        hit_points_per_level: null,
        speed_bonus_feet: null,
        source_instance_id: null,
        label: 'Ancestral Guard',
        notes: null,
      },
    ]);
    expect(effectHitPoints(characterEffects(db, imported.characterId), 5)).toBe(
      5,
    );
  });

  it('imports a pre-inversion BACKUP document, migrating its trait payload', () => {
    // The same proof for the second mechanism. The document is built from a
    // live export and then REGRESSED to the old shape by hand — dropping the
    // `character_effects` key entirely and writing the payload back onto the
    // trait rows — because no code path can produce one any more.
    const document = exportCharacterBackup(db, characterId) as unknown as {
      tables: Record<string, unknown[]>;
    };
    const legacyTraits = (
      document.tables.character_species_traits as Record<string, unknown>[]
    ).map((row, index) => ({
      ...row,
      effect_kind: index === 0 ? 'damage_resistance' : null,
      effect_damage_type: index === 0 ? 'Poison' : null,
      effect_hit_points_flat: null,
      effect_hit_points_per_level: null,
      effect_speed_bonus_feet: null,
    }));
    const legacyDocument = {
      ...document,
      tables: {
        ...document.tables,
        character_species_traits: legacyTraits,
      },
    } as unknown as Record<string, unknown>;
    delete (legacyDocument.tables as Record<string, unknown>).character_effects;

    const imported = importCharacterBackup(db, legacyDocument);
    // The five retired keys did NOT become column names in the generated
    // INSERT, and the payload became an effect row labelled with its trait.
    expect(originOf(imported.characterId).effects).toEqual([
      {
        sort_order: 1,
        effect_kind: 'damage_resistance',
        damage_type: 'Poison',
        hit_points_flat: null,
        hit_points_per_level: null,
        speed_bonus_feet: null,
        source_instance_id: null,
        label: 'Dwarven Resilience',
        notes: null,
      },
    ]);
  });
});
