import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CharacterCommandExecutor } from '../../../src/commands/character-command-executor';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { sqlString } from '../../../src/db/codecs';
import { DatabaseContext } from '../../../src/db/database';
import type {
  ArmorFields,
  CharacterCommandPayload,
} from '../../../src/domain/command-contracts';
import { SHEET_ADJUSTMENT_BOUNDS } from '../../../src/domain/sheet-limits';
import { openTestDatabase } from '../../helpers/open-db';

const key = 'S1-sheet-command-integrity-key';

let operationCounter = 0;
function operationUuid(): string {
  operationCounter += 1;
  return `00000000-0000-4000-9000-${String(operationCounter).padStart(12, '0')}`;
}

function armor(changes: Partial<ArmorFields> = {}): ArmorFields {
  return {
    name: 'Half Plate Armor',
    category: 'medium',
    armor_class: 15,
    dex_bonus: 'capped',
    dex_bonus_max: 2,
    strength_requirement: 15,
    stealth_disadvantage: true,
    notes: null,
    ...changes,
  };
}

/**
 * THE FOUR WRITERS FOR THE STORED SHEET INPUTS, AND THEIR INVERSES.
 *
 * ALL FOUR ARE `set_*`, so the interesting cases are the ones a `set` shape
 * makes possible and an `add`/`remove` pair does not: setting a slot twice,
 * setting it back to nothing, and undoing either. The inverse of every one of
 * them is resolved AFTER apply, because the value it must restore is the one
 * the command displaced and `prepareInverse` runs before the transaction opens.
 *
 * CLEARING DELETES THE ROW. "No armour worn" has ONE representation, so a
 * character who has never touched the sheet and a character who took their
 * armour off are indistinguishable — which is exactly what they should be, and
 * what makes an imported pre-sheet payload identical to a deliberately-emptied
 * one.
 */
describe('sheet input commands', () => {
  let connection: Database;
  let db: DatabaseContext;
  let executor: CharacterCommandExecutor;
  let characterId: number;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    executor = new CharacterCommandExecutor(
      db,
      new CharacterCommandIntegrity(key),
    );
    characterId = db.exec("INSERT INTO characters (name) VALUES ('Wearer')")
      .lastInsertId;
  });

  afterEach(() => connection.close());

  async function run(command: CharacterCommandPayload) {
    const revision = Number(
      db.scalar('SELECT revision FROM characters WHERE id = ?', [characterId]),
    );
    return executor.execute({
      character_id: characterId,
      operation_uuid: operationUuid(),
      expected_revision: revision,
      command,
    });
  }

  function armorRows() {
    return db.allRaw(
      `SELECT slot, name, category, armor_class, dex_bonus, dex_bonus_max,
              strength_requirement, stealth_disadvantage, notes
         FROM character_armor WHERE character_id = ? ORDER BY slot`,
      [characterId],
    );
  }

  async function inverseOf(command: CharacterCommandPayload) {
    const result = await run(command);
    return JSON.parse(
      String(
        db.scalar(
          `SELECT inverse_command FROM character_operations
            WHERE character_id = ? ORDER BY id DESC LIMIT 1`,
          [characterId],
        ),
      ),
    ) as CharacterCommandPayload;
  }

  it('sets a slot, replaces it, and undoes back to what was there', async () => {
    await run({ type: 'set_armor', slot: 'worn', armor: armor() });
    expect(armorRows()).toEqual([
      {
        slot: 'worn',
        name: 'Half Plate Armor',
        category: 'medium',
        armor_class: 15,
        dex_bonus: 'capped',
        dex_bonus_max: 2,
        strength_requirement: 15,
        stealth_disadvantage: 1,
        notes: null,
      },
    ]);

    const inverse = await inverseOf({
      type: 'set_armor',
      slot: 'worn',
      armor: armor({
        name: 'Chain Mail',
        category: 'heavy',
        armor_class: 16,
        dex_bonus: 'none',
        dex_bonus_max: null,
        strength_requirement: 13,
      }),
    });
    expect(db.scalar('SELECT name FROM character_armor WHERE character_id = ?', [
      characterId,
    ])).toBe('Chain Mail');
    // The inverse restores the DISPLACED value, not a snapshot of the whole
    // character — which is why undoing an armour change cannot disturb a spell
    // selection made in between.
    expect(inverse).toEqual({
      type: 'set_armor',
      slot: 'worn',
      armor: armor(),
    });

    await run(inverse);
    expect(
      db.scalar('SELECT name FROM character_armor WHERE character_id = ?', [
        characterId,
      ]),
    ).toBe('Half Plate Armor');
  });

  it('clears a slot by deleting the row, and undoes back to the armour', async () => {
    await run({ type: 'set_armor', slot: 'worn', armor: armor() });
    const inverse = await inverseOf({
      type: 'set_armor',
      slot: 'worn',
      armor: null,
    });
    // DELETED, not blanked. "No armour worn" has one representation.
    expect(armorRows()).toEqual([]);
    expect(inverse).toEqual({
      type: 'set_armor',
      slot: 'worn',
      armor: armor(),
    });
    await run(inverse);
    expect(armorRows()).toHaveLength(1);
  });

  it('inverts a first-time set to a clear, not to an empty row', async () => {
    const inverse = await inverseOf({
      type: 'set_armor',
      slot: 'shield',
      armor: armor({
        name: 'Shield',
        category: 'shield',
        armor_class: 2,
        dex_bonus: 'none',
        dex_bonus_max: null,
        strength_requirement: null,
        stealth_disadvantage: false,
      }),
    });
    expect(inverse).toEqual({
      type: 'set_armor',
      slot: 'shield',
      armor: null,
    });
    await run(inverse);
    expect(armorRows()).toEqual([]);
  });

  it('keeps the two slots independent', async () => {
    await run({ type: 'set_armor', slot: 'worn', armor: armor() });
    await run({
      type: 'set_armor',
      slot: 'shield',
      armor: armor({
        name: 'Shield',
        category: 'shield',
        armor_class: 2,
        dex_bonus: 'none',
        dex_bonus_max: null,
        strength_requirement: null,
        stealth_disadvantage: false,
      }),
    });
    expect(armorRows().map((row) => row.slot)).toEqual(['shield', 'worn']);
    await run({ type: 'set_armor', slot: 'shield', armor: null });
    expect(armorRows().map((row) => row.slot)).toEqual(['worn']);
  });

  it('accepts a shield recorded in the worn slot, because the sheet warns about it', async () => {
    // D11 part 2: a crossed pair is a state a share link can carry, and the
    // sheet counts the row by what it IS and says the slots are crossed.
    // Refusing it here would make the warning unreachable.
    await run({
      type: 'set_armor',
      slot: 'worn',
      armor: armor({
        name: 'Shield',
        category: 'shield',
        armor_class: 2,
        dex_bonus: 'none',
        dex_bonus_max: null,
        strength_requirement: null,
        stealth_disadvantage: false,
      }),
    });
    expect(armorRows()[0]).toMatchObject({ slot: 'worn', category: 'shield' });
  });

  it('refuses an armour body whose Dexterity pair disagrees', async () => {
    await expect(
      run({
        type: 'set_armor',
        slot: 'worn',
        armor: armor({ dex_bonus: 'full', dex_bonus_max: 2 }),
      }),
    ).rejects.toThrow('dex_bonus_max is present exactly when dex_bonus is capped');
    await expect(
      run({
        type: 'set_armor',
        slot: 'worn',
        armor: armor({ dex_bonus: 'capped', dex_bonus_max: null }),
      }),
    ).rejects.toThrow('dex_bonus_max is present exactly when dex_bonus is capped');
    // The write never happened, so a rejected payload leaves no half-row.
    expect(armorRows()).toEqual([]);
  });

  it('refuses a shield carrying a Dexterity term', async () => {
    await expect(
      run({
        type: 'set_armor',
        slot: 'shield',
        armor: armor({
          category: 'shield',
          armor_class: 2,
          dex_bonus: 'full',
          dex_bonus_max: null,
        }),
      }),
    ).rejects.toThrow('A shield carries no Dexterity bonus');
  });

  it('records a hit point roll per class and per level, and undoes to nothing', async () => {
    await run({
      type: 'set_hit_point_roll',
      class_name: 'Fighter',
      class_level: 2,
      rolled_value: 9,
    });
    const inverse = await inverseOf({
      type: 'set_hit_point_roll',
      class_name: 'Fighter',
      class_level: 2,
      rolled_value: 3,
    });
    expect(
      db.scalar(
        `SELECT rolled_value FROM character_hit_point_rolls
          WHERE character_id = ? AND class_name = 'Fighter' AND class_level = 2`,
        [characterId],
      ),
    ).toBe(3);
    expect(inverse).toEqual({
      type: 'set_hit_point_roll',
      class_name: 'Fighter',
      class_level: 2,
      rolled_value: 9,
    });

    // Clearing removes the row entirely: no roll means "use the printed fixed
    // value", which is a complete answer rather than a missing one.
    await run({
      type: 'set_hit_point_roll',
      class_name: 'Fighter',
      class_level: 2,
      rolled_value: null,
    });
    expect(
      db.scalar(
        'SELECT count(*) FROM character_hit_point_rolls WHERE character_id = ?',
        [characterId],
      ),
    ).toBe(0);
  });

  it('refuses a roll no die could have shown', async () => {
    // 12 is the largest hit die any class in the source uses, and the bound
    // lives in one module the schema and the share boundary read too.
    await expect(
      run({
        type: 'set_hit_point_roll',
        class_name: 'Barbarian',
        class_level: 2,
        rolled_value: 13,
      }),
    ).rejects.toThrow('rolled_value must be an integer from 1 to 12');
    await expect(
      run({
        type: 'set_hit_point_roll',
        class_name: 'Barbarian',
        class_level: 2,
        rolled_value: 0,
      }),
    ).rejects.toThrow('rolled_value must be an integer from 1 to 12');
  });

  it('toggles a skill proficiency, with presence as the value', async () => {
    const inverse = await inverseOf({
      type: 'set_skill_proficiency',
      skill: 'stealth',
      proficient: true,
    });
    expect(
      db.allRaw(
        'SELECT skill FROM character_skill_proficiencies WHERE character_id = ?',
        [characterId],
      ),
    ).toEqual([{ skill: 'stealth' }]);
    expect(inverse).toEqual({
      type: 'set_skill_proficiency',
      skill: 'stealth',
      proficient: false,
    });

    // Setting it again is a no-op rather than a unique-index violation, and its
    // inverse correctly says "put it back to proficient".
    const second = await inverseOf({
      type: 'set_skill_proficiency',
      skill: 'stealth',
      proficient: true,
    });
    expect(second).toEqual({
      type: 'set_skill_proficiency',
      skill: 'stealth',
      proficient: true,
    });

    await run({
      type: 'set_skill_proficiency',
      skill: 'stealth',
      proficient: false,
    });
    expect(
      db.scalar(
        'SELECT count(*) FROM character_skill_proficiencies WHERE character_id = ?',
        [characterId],
      ),
    ).toBe(0);
  });

  it('refuses a skill outside the eighteen', async () => {
    await expect(
      run({
        type: 'set_skill_proficiency',
        skill: 'lockpicking' as never,
        proficient: true,
      }),
    ).rejects.toThrow('Unknown skill');
  });

  it("choosing a Bard's multiclass skill does not modify character notes", async () => {
    db.exec(`UPDATE characters SET notes = 'Keep this note' WHERE id = ?`, [
      characterId,
    ]);
    const inverse = await inverseOf({
      type: 'choose_multiclass_skill',
      skill: 'performance',
    });
    expect(
      db.allRaw(
        'SELECT skill FROM character_skill_proficiencies WHERE character_id = ?',
        [characterId],
      ),
    ).toEqual([{ skill: 'performance' }]);
    expect(
      db.scalar('SELECT notes FROM characters WHERE id = ?', [characterId]),
    ).toBe('Keep this note');

    await run(inverse);
    expect(
      db.scalar(
        'SELECT count(*) FROM character_skill_proficiencies WHERE character_id = ?',
        [characterId],
      ),
    ).toBe(0);
    expect(
      db.scalar('SELECT notes FROM characters WHERE id = ?', [characterId]),
    ).toBe('Keep this note');
  });

  it('stores a signed Armor Class adjustment with its reason', async () => {
    const inverse = await inverseOf({
      type: 'set_armor_class_adjustment',
      value: -2,
      note: 'Cursed helm, house ruled.',
    });
    expect(
      db.oneRaw(
        `SELECT armor_class_adjustment, armor_class_adjustment_note
           FROM character_sheet_adjustments WHERE character_id = ?`,
        [characterId],
      ),
    ).toEqual({
      armor_class_adjustment: -2,
      armor_class_adjustment_note: 'Cursed helm, house ruled.',
    });
    // The inverse of a first-time set is the ZERO state, which is stored as no
    // row at all.
    expect(inverse).toEqual({
      type: 'set_armor_class_adjustment',
      value: 0,
      note: null,
    });
    await run(inverse);
    expect(
      db.scalar(
        'SELECT count(*) FROM character_sheet_adjustments WHERE character_id = ?',
        [characterId],
      ),
    ).toBe(0);
  });

  it('keeps a note even when the adjustment itself is zero', async () => {
    // Zero WITH a note is a real state — "I checked, and nothing applies" — and
    // only zero WITHOUT a note collapses to no row. Storing the first as
    // nothing would silently discard the sentence the user typed.
    await run({
      type: 'set_armor_class_adjustment',
      value: 0,
      note: 'Unarmored Defense does not apply; checked 2026-07-24.',
    });
    expect(
      db.scalar(
        'SELECT count(*) FROM character_sheet_adjustments WHERE character_id = ?',
        [characterId],
      ),
    ).toBe(1);
  });

  it('refuses an adjustment past the bound, in both directions', async () => {
    const magnitude = SHEET_ADJUSTMENT_BOUNDS.armorClassMagnitude;
    for (const value of [magnitude + 1, -magnitude - 1]) {
      await expect(
        run({ type: 'set_armor_class_adjustment', value, note: null }),
      ).rejects.toThrow('value must be an integer from -20 to 20');
    }
    // Both bounds themselves are accepted: a symmetric bound that refused its
    // own edge would be a rule nobody stated.
    await run({
      type: 'set_armor_class_adjustment',
      value: magnitude,
      note: null,
    });
    await run({
      type: 'set_armor_class_adjustment',
      value: -magnitude,
      note: null,
    });
    expect(
      db.scalar(
        `SELECT armor_class_adjustment FROM character_sheet_adjustments
          WHERE character_id = ?`,
        [characterId],
      ),
    ).toBe(-magnitude);
  });

  it('writes one change-log entry per affected row, under an accepted entity type', async () => {
    await run({ type: 'set_armor', slot: 'worn', armor: armor() });
    await run({
      type: 'set_skill_proficiency',
      skill: 'arcana',
      proficient: true,
    });
    // `CharacterState.diff` emits a change per row of every snapshot table, and
    // an entity type the diff can produce that the log will not accept is a
    // write that fails at runtime, mid-command. These four are in
    // `AUDIT_ENTITY_TYPES` for that reason.
    const types = db.all(
      'SELECT DISTINCT entity_type FROM change_log ORDER BY entity_type',
      undefined,
      (row) => sqlString(row, 'entity_type'),
    );
    expect(types).toContain('character_armor');
    expect(types).toContain('character_skill_proficiencies');
  });
});
