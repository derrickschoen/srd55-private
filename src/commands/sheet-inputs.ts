import type { DatabaseContext } from '../db/database';
import type { SqlValue } from '@sqlite.org/sqlite-wasm';
import type {
  ArmorFields,
  SetArmorClassAdjustmentCommand as SetArmorClassAdjustmentPayload,
  SetArmorCommand as SetArmorPayload,
  SetHitPointRollCommand as SetHitPointRollPayload,
  SetSkillProficiencyCommand as SetSkillProficiencyPayload,
} from '../domain/command-contracts';
import {
  isEnumValue,
  armorCategories,
  armorDexBonuses,
  type ArmorCategory,
  type ArmorDexBonus,
} from '../domain/enums';
import { rowContractError } from '../domain/contracts/rows';
import { armorDexBonusPairError } from '../domain/contracts/row-rules';
import type { ResolvesInverseAfterApply } from './weapons';

/**
 * THE WRITERS FOR THE FOUR STORED SHEET INPUTS.
 *
 * ALL FOUR ARE `set_*` AND NONE IS `add`/`remove`, and that shape follows from
 * the tables rather than from taste. Each of the four is keyed by something the
 * user names — a slot, a (class, level) pair, a skill, the character — so there
 * is exactly one row to talk about and "set it to this" covers creating,
 * changing and clearing it. A weapon needed `add`/`remove` because a character
 * may own two identical daggers and only an id can tell them apart; none of
 * these four has that problem, and `add_armor` would have needed an id the user
 * has no way to mean.
 *
 * CLEARING IS SETTING TO NOTHING, AND IT DELETES THE ROW RATHER THAN BLANKING
 * IT. "No armour worn" has ONE representation — no row — so a character who
 * has never touched the sheet and a character who removed their armour are
 * indistinguishable, which is exactly what they should be. A `cleared` flag or
 * an all-null row would be a second spelling of the same fact that two readers
 * could disagree about. The adjustment follows the same rule: set back to 0
 * with no note and the row goes, so an imported pre-sheet payload and a
 * deliberately-zeroed character both produce literally nothing.
 *
 * THEIR INVERSES ARE EXPLICIT AND RESOLVED AFTER APPLY, following
 * `src/commands/weapons.ts`. Each captures the value it displaced during
 * `apply()` and hands back the command that puts it back — strictly more
 * precise than a whole-character snapshot, because undoing an armour change
 * cannot disturb a spell selection made in between. `prepareInverse` runs
 * before the transaction opens and cannot see the displaced row, which is what
 * {@link ResolvesInverseAfterApply} exists for.
 */

function nullableText(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  // An empty string here would be a null wearing a costume, and the two would
  // then read differently in the UI while meaning the same thing.
  return trimmed === '' ? null : trimmed;
}

/** The columns an armour row's body occupies, in one place so both writers agree. */
const ARMOR_COLUMNS = [
  'name',
  'category',
  'armor_class',
  'dex_bonus',
  'dex_bonus_max',
  'strength_requirement',
  'stealth_disadvantage',
  'notes',
] as const;

function armorValues(armor: ArmorFields): Record<string, SqlValue> {
  return {
    name: armor.name.trim(),
    category: armor.category,
    armor_class: armor.armor_class,
    dex_bonus: armor.dex_bonus,
    // NOT coerced to 0 when the bonus is not capped. The paired CHECK refuses a
    // stray cap, and silently dropping the user's number would hide the fact
    // that the payload was incoherent.
    dex_bonus_max: armor.dex_bonus_max,
    strength_requirement: armor.strength_requirement,
    stealth_disadvantage: armor.stealth_disadvantage ? 1 : 0,
    notes: nullableText(armor.notes),
  };
}

function fieldsFromRow(row: Record<string, unknown>): ArmorFields {
  const category = row.category;
  const dexBonus = row.dex_bonus;
  return {
    name: String(row.name),
    // A row that fails membership would mean the database holds a value its own
    // CHECK forbids. Falling back rather than throwing keeps UNDO possible on a
    // character whose image predates the constraint, rather than the undo stack
    // becoming unusable.
    //
    // WHILE SUCH A ROW IS STORED, THE SHEET SAYS SO: `#armor` in
    // `character-sheet-builder.ts` emits an `armor_value_out_of_vocabulary`
    // warning naming the column, the rejected value and the substitute, so the
    // Armor Class it prints is never a Light-armour number silently standing in
    // for something else. Re-writing the row through this path NORMALISES it —
    // the CHECK would refuse the original — and after that there is nothing left
    // to warn about, which is why the warning belongs on the read and not here.
    category: isEnumValue(armorCategories, category)
      ? (category as ArmorCategory)
      : 'light',
    armor_class: Number(row.armor_class),
    dex_bonus: isEnumValue(armorDexBonuses, dexBonus)
      ? (dexBonus as ArmorDexBonus)
      : 'none',
    dex_bonus_max:
      row.dex_bonus_max === null || row.dex_bonus_max === undefined
        ? null
        : Number(row.dex_bonus_max),
    strength_requirement:
      row.strength_requirement === null ||
      row.strength_requirement === undefined
        ? null
        : Number(row.strength_requirement),
    stealth_disadvantage: Number(row.stealth_disadvantage) === 1,
    notes: row.notes === null || row.notes === undefined
      ? null
      : String(row.notes),
  };
}

/**
 * Checks an assembled row against its contract AND its cross-column rules
 * before it is written.
 *
 * The contract's nullability is DERIVED from the column facts, so this cannot
 * drift from the schema and cannot be stricter than it. It is a second net
 * behind the payload validator, and it is the one that would catch a bug in
 * THIS file rather than a bad payload.
 */
function assertSheetRow(
  table: 'character_armor' | 'character_hit_point_rolls'
    | 'character_skill_proficiencies' | 'character_sheet_adjustments',
  values: Record<string, SqlValue>,
  characterId: number,
  timestamp: string,
  label: string,
): void {
  const row = {
    id: 1,
    character_id: characterId,
    ...values,
    created_at: timestamp,
    updated_at: timestamp,
  };
  const error = rowContractError(table, row, label);
  if (error !== null) {
    throw new TypeError(error);
  }
  if (table === 'character_armor') {
    const pairing = armorDexBonusPairError(row, label);
    if (pairing !== null) {
      throw new TypeError(pairing);
    }
  }
}

export class SetArmorCommand implements ResolvesInverseAfterApply {
  readonly actionType = 'set_armor';
  readonly invertsAfterApply = true;

  #previous: ArmorFields | null | undefined;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: SetArmorPayload,
  ) {}

  apply(characterId: number): void {
    const existing = this.db.one(
      `SELECT ${ARMOR_COLUMNS.join(', ')}
       FROM character_armor
       WHERE character_id = ? AND slot = ?`,
      [characterId, this.payload.slot],
    );
    this.#previous =
      existing === null
        ? null
        : fieldsFromRow(existing as Record<string, unknown>);

    // DELETE THEN INSERT rather than UPSERT, because "set to nothing" and "set
    // to this" then travel the same path and there is one place where the
    // slot's uniqueness is honoured.
    this.db.exec(
      'DELETE FROM character_armor WHERE character_id = ? AND slot = ?',
      [characterId, this.payload.slot],
    );
    const armor = this.payload.armor;
    if (armor === null) {
      return;
    }
    const timestamp = new Date().toISOString();
    const values: Record<string, SqlValue> = {
      slot: this.payload.slot,
      ...armorValues(armor),
    };
    assertSheetRow('character_armor', values, characterId, timestamp, 'Armor');
    const columns = ['character_id', 'slot', ...ARMOR_COLUMNS];
    this.db.exec(
      `INSERT INTO character_armor (${[
        ...columns,
        'created_at',
        'updated_at',
      ].join(', ')})
       VALUES (${[...columns, 'created_at', 'updated_at']
         .map(() => '?')
         .join(', ')})`,
      [
        characterId,
        this.payload.slot,
        ...ARMOR_COLUMNS.map((column) => values[column] as SqlValue),
        timestamp,
        timestamp,
      ],
    );
  }

  inverse(): SetArmorPayload {
    if (this.#previous === undefined) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return {
      type: 'set_armor',
      slot: this.payload.slot,
      armor: this.#previous,
    };
  }
}

export class SetHitPointRollCommand implements ResolvesInverseAfterApply {
  readonly actionType = 'set_hit_point_roll';
  readonly invertsAfterApply = true;

  #previous: number | null | undefined;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: SetHitPointRollPayload,
  ) {}

  apply(characterId: number): void {
    const key: SqlValue[] = [
      characterId,
      this.payload.class_name,
      this.payload.class_level,
    ];
    const existing = this.db.one(
      `SELECT rolled_value FROM character_hit_point_rolls
       WHERE character_id = ? AND class_name = ? AND class_level = ?`,
      key,
    );
    this.#previous =
      existing === null
        ? null
        : Number((existing as Record<string, unknown>).rolled_value);

    this.db.exec(
      `DELETE FROM character_hit_point_rolls
       WHERE character_id = ? AND class_name = ? AND class_level = ?`,
      key,
    );
    const value = this.payload.rolled_value;
    if (value === null) {
      // An ABSENT ROW, not a stored zero: no roll means "use the printed fixed
      // value", which `fixedHitPointsPerLevel` supplies live.
      return;
    }
    const timestamp = new Date().toISOString();
    const values: Record<string, SqlValue> = {
      class_name: this.payload.class_name,
      class_level: this.payload.class_level,
      rolled_value: value,
    };
    assertSheetRow(
      'character_hit_point_rolls',
      values,
      characterId,
      timestamp,
      'Hit point roll',
    );
    this.db.exec(
      `INSERT INTO character_hit_point_rolls (
         character_id, class_name, class_level, rolled_value,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
      [...key, value, timestamp, timestamp],
    );
  }

  inverse(): SetHitPointRollPayload {
    if (this.#previous === undefined) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return {
      type: 'set_hit_point_roll',
      class_name: this.payload.class_name,
      class_level: this.payload.class_level,
      rolled_value: this.#previous,
    };
  }
}

export class SetSkillProficiencyCommand implements ResolvesInverseAfterApply {
  readonly actionType = 'set_skill_proficiency';
  readonly invertsAfterApply = true;

  #previous: boolean | undefined;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: SetSkillProficiencyPayload,
  ) {}

  apply(characterId: number): void {
    const key: SqlValue[] = [characterId, this.payload.skill];
    this.#previous =
      this.db.one(
        `SELECT id FROM character_skill_proficiencies
         WHERE character_id = ? AND skill = ?`,
        key,
      ) !== null;

    if (!this.payload.proficient) {
      this.db.exec(
        `DELETE FROM character_skill_proficiencies
         WHERE character_id = ? AND skill = ?`,
        key,
      );
      return;
    }
    if (this.#previous) {
      // Already proficient. Re-inserting would violate the unique index, and
      // the inverse below correctly says "put it back to proficient" — a no-op
      // undo for a no-op command.
      return;
    }
    const timestamp = new Date().toISOString();
    assertSheetRow(
      'character_skill_proficiencies',
      { skill: this.payload.skill },
      characterId,
      timestamp,
      'Skill proficiency',
    );
    this.db.exec(
      `INSERT INTO character_skill_proficiencies (
         character_id, skill, created_at, updated_at
       ) VALUES (?, ?, ?, ?)`,
      [...key, timestamp, timestamp],
    );
  }

  inverse(): SetSkillProficiencyPayload {
    if (this.#previous === undefined) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return {
      type: 'set_skill_proficiency',
      skill: this.payload.skill,
      proficient: this.#previous,
    };
  }
}

export class SetArmorClassAdjustmentCommand
  implements ResolvesInverseAfterApply
{
  readonly actionType = 'set_armor_class_adjustment';
  readonly invertsAfterApply = true;

  #previous: { value: number; note: string | null } | undefined;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: SetArmorClassAdjustmentPayload,
  ) {}

  apply(characterId: number): void {
    const existing = this.db.one(
      `SELECT armor_class_adjustment, armor_class_adjustment_note
       FROM character_sheet_adjustments
       WHERE character_id = ?`,
      [characterId],
    ) as Record<string, unknown> | null;
    this.#previous =
      existing === null
        ? { value: 0, note: null }
        : {
            value: Number(existing.armor_class_adjustment),
            note:
              existing.armor_class_adjustment_note === null ||
              existing.armor_class_adjustment_note === undefined
                ? null
                : String(existing.armor_class_adjustment_note),
          };

    this.db.exec(
      'DELETE FROM character_sheet_adjustments WHERE character_id = ?',
      [characterId],
    );
    const note = nullableText(this.payload.note);
    if (this.payload.value === 0 && note === null) {
      // ZERO WITH NO NOTE IS NOTHING RECORDED, and it is stored as nothing so
      // that "never touched" and "set back to zero" have one representation.
      return;
    }
    const timestamp = new Date().toISOString();
    const values: Record<string, SqlValue> = {
      armor_class_adjustment: this.payload.value,
      armor_class_adjustment_note: note,
    };
    assertSheetRow(
      'character_sheet_adjustments',
      values,
      characterId,
      timestamp,
      'Armor Class adjustment',
    );
    this.db.exec(
      `INSERT INTO character_sheet_adjustments (
         character_id, armor_class_adjustment, armor_class_adjustment_note,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?)`,
      [characterId, this.payload.value, note, timestamp, timestamp],
    );
  }

  inverse(): SetArmorClassAdjustmentPayload {
    if (this.#previous === undefined) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return {
      type: 'set_armor_class_adjustment',
      value: this.#previous.value,
      note: this.#previous.note,
    };
  }
}
