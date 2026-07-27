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
  previewCharacterShare,
} from '../../../src/sharing/character-share';
import {
  decodeShareFragment,
  encodeShareFragment,
} from '../../../src/sharing/codec';
import { CharacterState } from '../../../src/character/character-state';
import { openTestDatabase } from '../../helpers/open-db';

/**
 * THE FOUR STORED SHEET INPUTS SURVIVE BACKUP, A SHARE LINK AND A SAVE POINT.
 *
 * THIS IS THE Q8 TEST, AND Q8 IS WHY IT IS WRITTEN BEFORE THE SCREEN THAT READS
 * THE DATA. `character_weapons` shipped with all four scope flags false: no
 * compile error anywhere, and the symptom was a user's weapons missing from
 * their own backup, missing from every link they sent, and untouched by a
 * save-point restore. Setting the flags is a compile gate, not the work — the
 * INSERT statements that carry these rows are hand-written in
 * `src/sharing/character-share.ts`, and a hand-written statement can name nine
 * of ten columns. This is the test that would notice.
 *
 * THE FIXTURE IS AWKWARD ON PURPOSE, not accurate. Both armour slots are
 * filled, the worn one is `capped` so the paired `dex_bonus_max` really
 * travels, the shield carries every optional field as NULL so an absence
 * survives as an absence, one hit point roll sits on a class the character does
 * not have, and the adjustment carries a note. A payload column dropped from a
 * statement is invisible in a row count and shows up only as a number that
 * quietly stops being right.
 */
describe('the four stored sheet inputs survive every portability path', () => {
  let connection: Database;
  let db: DatabaseContext;
  let characterId: number;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    characterId = db.exec('INSERT INTO characters (name) VALUES (?)', [
      'Portable Sheet',
    ]).lastInsertId;
    db.exec(
      `INSERT INTO character_armor (
         character_id, slot, name, category, armor_class, dex_bonus,
         dex_bonus_max, strength_requirement, stealth_disadvantage, notes
       ) VALUES (?, 'worn', 'Half Plate Armor', 'medium', 15, 'capped', 2, 15,
         1, 'repainted after the barrow')`,
      [characterId],
    );
    db.exec(
      `INSERT INTO character_armor (
         character_id, slot, name, category, armor_class, dex_bonus
       ) VALUES (?, 'shield', 'Shield', 'shield', 2, 'none')`,
      [characterId],
    );
    for (const [className, level, value] of [
      ['Fighter', 2, 7],
      ['Fighter', 3, 10],
      // A roll on a class this character does not have. It travels, because a
      // die the player rolled is not this application's to discard, and the
      // completeness check reports it by name at the far end.
      ['Wizard', 2, 4],
    ] as const) {
      db.exec(
        `INSERT INTO character_hit_point_rolls (
           character_id, class_name, class_level, rolled_value
         ) VALUES (?, ?, ?, ?)`,
        [characterId, className, level, value],
      );
    }
    for (const skill of ['athletics', 'perception', 'sleight_of_hand']) {
      db.exec(
        `INSERT INTO character_skill_proficiencies (character_id, skill)
         VALUES (?, ?)`,
        [characterId, skill],
      );
    }
    db.exec(
      `INSERT INTO character_sheet_adjustments (
         character_id, armor_class_adjustment, armor_class_adjustment_note
       ) VALUES (?, -2, 'Cursed helm, house ruled.')`,
      [characterId],
    );
  });

  afterEach(() => connection.close());

  function sheetInputsOf(id: number) {
    return {
      armor: db.all(
        `SELECT slot, name, category, armor_class, dex_bonus, dex_bonus_max,
                strength_requirement, stealth_disadvantage, notes
           FROM character_armor WHERE character_id = ? ORDER BY slot`,
        [id],
      ),
      rolls: db.all(
        `SELECT class_name, class_level, rolled_value
           FROM character_hit_point_rolls
          WHERE character_id = ? ORDER BY class_name, class_level`,
        [id],
      ),
      skills: db.all(
        `SELECT skill FROM character_skill_proficiencies
          WHERE character_id = ? ORDER BY skill`,
        [id],
      ),
      adjustment: db.one(
        `SELECT armor_class_adjustment, armor_class_adjustment_note
           FROM character_sheet_adjustments WHERE character_id = ?`,
        [id],
      ),
    };
  }

  it('round-trips through the portable backup document, column for column', () => {
    const document = exportCharacterBackup(db, characterId);
    expect(document.tables.character_armor).toHaveLength(2);
    expect(document.tables.character_hit_point_rolls).toHaveLength(3);
    expect(document.tables.character_skill_proficiencies).toHaveLength(3);
    expect(document.tables.character_sheet_adjustments).toHaveLength(1);

    const before = sheetInputsOf(characterId);
    const imported = importCharacterBackup(db, document);
    expect(imported.characterId).not.toBe(characterId);
    expect(sheetInputsOf(imported.characterId)).toEqual(before);
  });

  it('round-trips through a share link, including the compressed fragment', async () => {
    const document = exportCharacterShare(db, characterId);
    // SLOT AND CATEGORY BOTH TRAVEL AND NEITHER IS DERIVED. They can disagree,
    // and the sheet says so rather than repairing it.
    expect(document.armor).toEqual([
      {
        slot: 'shield',
        name: 'Shield',
        category: 'shield',
        armor_class: 2,
        dex_bonus: 'none',
      },
      {
        slot: 'worn',
        name: 'Half Plate Armor',
        category: 'medium',
        armor_class: 15,
        dex_bonus: 'capped',
        dex_bonus_max: 2,
        strength_requirement: 15,
        stealth_disadvantage: true,
        notes: 'repainted after the barrow',
      },
    ]);
    expect(document.hitPointRolls).toEqual([
      { className: 'Fighter', classLevel: 2, value: 7 },
      { className: 'Fighter', classLevel: 3, value: 10 },
      { className: 'Wizard', classLevel: 2, value: 4 },
    ]);
    expect(document.skillProficiencies).toEqual([
      'athletics',
      'perception',
      'sleight_of_hand',
    ]);
    expect(document.sheetAdjustment).toEqual({
      value: -2,
      note: 'Cursed helm, house ruled.',
    });

    const fragment = await encodeShareFragment(document);
    const decoded = await decodeShareFragment(fragment);
    expect(decoded).toEqual(document);

    const before = sheetInputsOf(characterId);
    const imported = importCharacterShare(db, decoded);
    expect(imported.characterId).not.toBe(characterId);
    expect(sheetInputsOf(imported.characterId)).toEqual(before);
  });

  it('tells the recipient what a link is about to add, before it adds it', () => {
    const preview = previewCharacterShare(
      db,
      exportCharacterShare(db, characterId),
    );
    // A silently-arriving section is the failure the weapons gap was closed to
    // avoid; a silently-MISSING one is the same failure in the other direction.
    expect(preview.armorCount).toBe(2);
    expect(preview.hitPointRollCount).toBe(3);
    expect(preview.skillProficiencyCount).toBe(3);
    expect(preview.includesArmorClassAdjustment).toBe(true);
  });

  it('carries nothing at all when the character has recorded nothing', () => {
    const bare = db.exec('INSERT INTO characters (name) VALUES (?)', [
      'Nothing Recorded',
    ]).lastInsertId;
    const document = exportCharacterShare(db, bare);
    // ABSENT, NOT EMPTY. A link for a character who has recorded nothing is
    // exactly the shape it was before this change, which is what keeps the
    // added wire element from costing anything on the common case.
    expect(document).not.toHaveProperty('armor');
    expect(document).not.toHaveProperty('hitPointRolls');
    expect(document).not.toHaveProperty('skillProficiencies');
    expect(document).not.toHaveProperty('sheetAdjustment');
    const imported = importCharacterShare(db, document);
    expect(sheetInputsOf(imported.characterId)).toEqual({
      armor: [],
      rolls: [],
      skills: [],
      adjustment: null,
    });
  });

  it('restores a save point that recorded the sheet inputs', () => {
    const state = new CharacterState(db);
    const snapshot = state.capture(characterId);
    expect(snapshot.schema_version).toBe('a7-v5');
    expect(snapshot.character_armor).toHaveLength(2);

    db.exec('DELETE FROM character_armor WHERE character_id = ?', [
      characterId,
    ]);
    db.exec('DELETE FROM character_skill_proficiencies WHERE character_id = ?', [
      characterId,
    ]);
    db.exec(
      `UPDATE character_sheet_adjustments SET armor_class_adjustment = 7
       WHERE character_id = ?`,
      [characterId],
    );

    state.restore(characterId, snapshot);

    expect(sheetInputsOf(characterId).armor).toHaveLength(2);
    expect(sheetInputsOf(characterId).skills).toHaveLength(3);
    expect(sheetInputsOf(characterId).adjustment).toEqual({
      armor_class_adjustment: -2,
      armor_class_adjustment_note: 'Cursed helm, house ruled.',
    });
  });

  it('leaves the sheet inputs alone when the save point predates them', () => {
    // AN `a7-v3` SNAPSHOT DOES NOT SPEAK FOR THESE TABLES, so restoring one
    // must not delete armour it never recorded. Treating the absent key as an
    // empty list would assert "this character had no armour at that moment" — a
    // claim the snapshot never made, and one that silently deletes real data on
    // undo.
    //
    // The fixture is built by REMOVING the four keys from a live capture and
    // relabelling it, which is exactly the shape `a7-v3` had. Nothing in `src/`
    // can produce one any more, so it cannot be generated.
    const state = new CharacterState(db);
    const legacy = structuredClone(
      state.capture(characterId),
    ) as unknown as Record<string, unknown>;
    legacy.schema_version = 'a7-v3';
    delete legacy.character_armor;
    delete legacy.character_hit_point_rolls;
    delete legacy.character_skill_proficiencies;
    delete legacy.character_sheet_adjustments;

    db.exec(
      `INSERT INTO character_armor (
         character_id, slot, name, category, armor_class, dex_bonus
       ) VALUES (?, 'worn', 'Bought since', 'light', 11, 'full')`,
      [db.exec('INSERT INTO characters (name) VALUES (?)', ['Other']).lastInsertId],
    );
    db.exec(
      `UPDATE character_armor SET name = 'Bought since'
       WHERE character_id = ? AND slot = 'worn'`,
      [characterId],
    );

    state.restore(characterId, legacy);

    // Untouched: the snapshot said nothing about armour, so nothing about
    // armour changed — including the rename made after it was taken.
    expect(
      db.scalar(
        `SELECT name FROM character_armor
          WHERE character_id = ? AND slot = 'worn'`,
        [characterId],
      ),
    ).toBe('Bought since');
    expect(sheetInputsOf(characterId).skills).toHaveLength(3);
  });
});
