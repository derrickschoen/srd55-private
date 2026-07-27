import type { DatabaseContext } from '../db/database';
import type { SqlValue } from '@sqlite.org/sqlite-wasm';
import type {
  AddWeaponCommand as AddWeaponPayload,
  CharacterCommandPayload,
  RemoveWeaponCommand as RemoveWeaponPayload,
  SetWeaponMasteryCommand as SetWeaponMasteryPayload,
  UpdateWeaponCommand as UpdateWeaponPayload,
  WeaponFields,
} from '../domain/command-contracts';
import {
  damageType,
  isEnumValue,
  weaponMasteryProperties,
  weaponProficiencyCategories,
  type WeaponMasteryProperty,
  type WeaponProficiencyCategory,
} from '../domain/enums';
import { rowContractError } from '../domain/contracts/rows';
import type {
  VersatileWeaponDamage,
  WeaponDamage,
} from '../domain/weapon-damage';

/**
 * WEAPON COMMANDS.
 *
 * Four intents, four command types: add, update, remove, and set-mastery. The
 * last is separate from `update_weapon` because it is a different decision with
 * a different warning attached, and separating them keeps the change log
 * readable — "chose Vex on the Longsword" is not "corrected the Longsword's
 * damage die".
 *
 * THEIR INVERSES ARE EXPLICIT, NOT SNAPSHOTS. Every other mutating command in
 * this application inverts either by restoring a scalar or by restoring a whole
 * character snapshot. Weapons do neither: `character_weapons` is not a snapshot
 * table (see the note in `src/domain/contracts/tables.ts`), so each command
 * captures exactly what it displaced and hands back the command that puts it
 * back. That is strictly more precise than a snapshot — undoing a weapon edit
 * cannot disturb a spell selection made in between — and it is why
 * {@link ResolvesInverseAfterApply} exists.
 *
 * WHY THE INVERSE IS RESOLVED AFTER APPLY. `add_weapon`'s inverse must name the
 * row id SQLite assigned, which does not exist until the INSERT has run. The
 * executor's `prepareInverse` runs before the transaction opens, so these four
 * commands publish their inverse through {@link ResolvesInverseAfterApply} and
 * the executor prefers it. The other three could have been resolved earlier;
 * they use the same path so that all four read the same way.
 */

/**
 * A command whose inverse is only knowable once `apply()` has run.
 *
 * `inverse()` is the method `CommandImplementation` has always declared and
 * that nothing called: every existing command's inverse is built by the
 * executor's `prepareInverse`, from the payload and the pre-apply snapshot.
 * The FLAG is what distinguishes the two paths — checking for the method alone
 * would match every command in the codebase and silently reroute all of them.
 *
 * The executor tests for it structurally rather than by class, so a future
 * command can opt in without importing this module.
 */
export interface ResolvesInverseAfterApply {
  readonly invertsAfterApply: true;
  inverse(): CharacterCommandPayload;
}

export function resolvesInverseAfterApply(
  command: unknown,
): command is ResolvesInverseAfterApply {
  return (
    command !== null &&
    typeof command === 'object' &&
    (command as ResolvesInverseAfterApply).invertsAfterApply === true &&
    typeof (command as ResolvesInverseAfterApply).inverse === 'function'
  );
}

/** The columns a weapon's body occupies, in one place so the four writers agree. */
const WEAPON_COLUMNS = [
  'name',
  'proficiency_category',
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
  'range_normal_feet',
  'range_long_feet',
  'mastery_property',
  'other_properties',
  'notes',
] as const;

function nullableText(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  // An empty string here would be a null wearing a costume, and the two would
  // then read differently in the UI while meaning the same thing.
  return trimmed === '' ? null : trimmed;
}

function damageValues(
  prefix: 'damage' | 'versatile_damage',
  damage: WeaponDamage | VersatileWeaponDamage,
): Record<string, SqlValue> {
  const values: Record<string, SqlValue> = {
    [`${prefix}_kind`]: damage.kind,
    [`${prefix}_dice`]: null,
    [`${prefix}_flat`]: null,
    [`${prefix}_custom`]: null,
  };
  switch (damage.kind) {
    case 'dice':
      values[`${prefix}_dice`] = damage.dice;
      return values;
    case 'flat':
      values[`${prefix}_flat`] = damage.amount;
      return values;
    case 'custom':
      values[`${prefix}_custom`] = damage.text;
      return values;
    case 'not_recorded':
    case 'not_applicable':
      return values;
  }
}

/** The row body as SQL values, with `''` normalised to NULL and booleans to 0/1. */
function weaponValues(weapon: WeaponFields): Record<string, SqlValue> {
  return {
    name: weapon.name.trim(),
    // NOT normalised through `nullableText`: it is a closed enum, never free
    // text, and `''` cannot reach here — the payload validator already refuses
    // anything that is neither null nor a member.
    proficiency_category: weapon.proficiency_category,
    ...damageValues('damage', weapon.damage),
    damage_type: nullableText(weapon.damage_type),
    ...damageValues('versatile_damage', weapon.versatile_damage),
    finesse: weapon.finesse ? 1 : 0,
    heavy: weapon.heavy ? 1 : 0,
    light: weapon.light ? 1 : 0,
    loading: weapon.loading ? 1 : 0,
    reach: weapon.reach ? 1 : 0,
    thrown: weapon.thrown ? 1 : 0,
    two_handed: weapon.two_handed ? 1 : 0,
    ammunition: weapon.ammunition ? 1 : 0,
    ammunition_kind: nullableText(weapon.ammunition_kind),
    range_normal_feet: weapon.range_normal_feet,
    range_long_feet: weapon.range_long_feet,
    mastery_property: weapon.mastery_property,
    other_properties: nullableText(weapon.other_properties),
    notes: nullableText(weapon.notes),
  };
}

interface WeaponRow extends Record<string, unknown> {
  readonly id: number;
  readonly mastery_selected: number;
}

function readWeapon(
  db: DatabaseContext,
  characterId: number,
  weaponId: number,
): WeaponRow {
  // RAW: `WEAPON_COLUMNS` is the column list this module writes, and
  // `fieldsFromRow` below reads the same row by the same names. The row is a
  // storage-shaped value passed straight back to `weaponValues` for the inverse
  // command, not a decoded domain value.
  const row = db.oneRaw(
    `SELECT ${['id', ...WEAPON_COLUMNS, 'mastery_selected'].join(', ')}
     FROM character_weapons
     WHERE character_id = ? AND id = ?`,
    [characterId, weaponId],
  );
  // Scoped by character_id, so this is also the cross-character guard: another
  // character's weapon id is indistinguishable from one that does not exist,
  // which is exactly what it should be.
  if (row === null) {
    throw new TypeError('Weapon does not belong to this character.');
  }
  return row as unknown as WeaponRow;
}

function fieldsFromRow(row: WeaponRow): WeaponFields {
  const mastery = row.mastery_property;
  const category = row.proficiency_category;
  return {
    name: String(row.name),
    // An unrecognised stored category reads as NOT STATED, exactly as an
    // unrecognised `mastery_property` reads as none: this row is user-owned data
    // written through a validated command, so holding one means the image was
    // hand-edited, and inventing `simple` for it would assert a proficiency the
    // character may not have.
    proficiency_category: isEnumValue(weaponProficiencyCategories, category)
      ? (category as WeaponProficiencyCategory)
      : null,
    damage:
      row.damage_kind === 'dice'
        ? { kind: 'dice', dice: String(row.damage_dice) }
        : row.damage_kind === 'flat'
          ? { kind: 'flat', amount: Number(row.damage_flat) }
          : row.damage_kind === 'custom'
            ? { kind: 'custom', text: String(row.damage_custom) }
            : { kind: 'not_recorded' },
    damage_type:
      row.damage_type === null ? null : damageType(String(row.damage_type)),
    versatile_damage:
      row.versatile_damage_kind === 'dice'
        ? { kind: 'dice', dice: String(row.versatile_damage_dice) }
        : row.versatile_damage_kind === 'flat'
          ? { kind: 'flat', amount: Number(row.versatile_damage_flat) }
          : row.versatile_damage_kind === 'custom'
            ? {
                kind: 'custom',
                text: String(row.versatile_damage_custom),
              }
            : { kind: 'not_applicable' },
    finesse: Number(row.finesse) === 1,
    heavy: Number(row.heavy) === 1,
    light: Number(row.light) === 1,
    loading: Number(row.loading) === 1,
    reach: Number(row.reach) === 1,
    thrown: Number(row.thrown) === 1,
    two_handed: Number(row.two_handed) === 1,
    ammunition: Number(row.ammunition) === 1,
    ammunition_kind:
      row.ammunition_kind === null ? null : String(row.ammunition_kind),
    range_normal_feet:
      row.range_normal_feet === null ? null : Number(row.range_normal_feet),
    range_long_feet:
      row.range_long_feet === null ? null : Number(row.range_long_feet),
    mastery_property: isEnumValue(weaponMasteryProperties, mastery)
      ? (mastery as WeaponMasteryProperty)
      : null,
    other_properties:
      row.other_properties === null ? null : String(row.other_properties),
    notes: row.notes === null ? null : String(row.notes),
  };
}

/**
 * Checks the assembled row against the `character_weapons` contract before it
 * is written.
 *
 * The contract's nullability is DERIVED from the column facts, so this cannot
 * drift from the schema and cannot be stricter than it. It is a second net
 * behind the payload validator, and it is the one that would catch a bug in
 * this file rather than a bad payload.
 */
function assertWeaponRow(
  values: Record<string, SqlValue>,
  characterId: number,
  timestamp: string,
  masterySelected: boolean,
): void {
  const error = rowContractError(
    'character_weapons',
    {
      id: 1,
      character_id: characterId,
      ...values,
      mastery_selected: masterySelected ? 1 : 0,
      created_at: timestamp,
      updated_at: timestamp,
    },
    'Weapon',
  );
  if (error !== null) {
    throw new TypeError(error);
  }
}

export class AddWeaponCommand implements ResolvesInverseAfterApply {
  readonly actionType = 'add_weapon';
  readonly invertsAfterApply = true;

  #weaponId: number | undefined;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: AddWeaponPayload,
  ) {}

  apply(characterId: number): void {
    const timestamp = new Date().toISOString();
    const values = weaponValues(this.payload.weapon);
    const masterySelected = this.payload.mastery_selected === true;
    assertWeaponRow(values, characterId, timestamp, masterySelected);

    if (masterySelected && values.mastery_property === null) {
      throw new TypeError(
        'A weapon with no mastery property cannot have mastery selected.',
      );
    }

    // `weapon_id` is present only on the inverse of a removal, where restoring
    // the original id keeps every other inverse in the undo stack valid.
    const restoredId = this.payload.weapon_id;
    const columns = [
      'character_id',
      ...WEAPON_COLUMNS,
      'mastery_selected',
      'created_at',
      'updated_at',
    ];
    const bindings: SqlValue[] = [
      characterId,
      ...WEAPON_COLUMNS.map((column) => values[column] as SqlValue),
      masterySelected ? 1 : 0,
      timestamp,
      timestamp,
    ];
    if (restoredId !== undefined) {
      columns.unshift('id');
      bindings.unshift(restoredId);
    }

    this.db.exec(
      `INSERT INTO character_weapons (${columns.join(', ')})
       VALUES (${columns.map(() => '?').join(', ')})`,
      bindings,
    );
    this.#weaponId =
      restoredId ??
      Number(
        this.db.scalar<number>(
          'SELECT max(id) FROM character_weapons WHERE character_id = ?',
          [characterId],
        ),
      );
  }

  inverse(): RemoveWeaponPayload {
    if (this.#weaponId === undefined) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return { type: 'remove_weapon', weapon_id: this.#weaponId };
  }
}

export class UpdateWeaponCommand implements ResolvesInverseAfterApply {
  readonly actionType = 'update_weapon';
  readonly invertsAfterApply = true;

  #previous: WeaponFields | undefined;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: UpdateWeaponPayload,
  ) {}

  apply(characterId: number): void {
    const existing = readWeapon(this.db, characterId, this.payload.weapon_id);
    const timestamp = new Date().toISOString();
    const values = weaponValues(this.payload.weapon);
    // The row the UPDATE will produce, mastery flag included — the flag is not
    // touched by this command, so the CURRENT value is the one being asserted.
    assertWeaponRow(
      values,
      characterId,
      timestamp,
      Number(existing.mastery_selected) === 1,
    );

    // The database CHECK would refuse this anyway; refusing it here names the
    // problem in the user's terms instead of surfacing a constraint string.
    // Silently clearing the selection was the alternative and was rejected: it
    // would discard a decision the user made without saying so.
    if (
      Number(existing.mastery_selected) === 1 &&
      values.mastery_property === null
    ) {
      throw new TypeError(
        'Deselect this weapon’s mastery before removing its mastery property.',
      );
    }

    this.#previous = fieldsFromRow(existing);
    this.db.exec(
      `UPDATE character_weapons
       SET ${WEAPON_COLUMNS.map((column) => `${column} = ?`).join(', ')},
           updated_at = ?
       WHERE character_id = ? AND id = ?`,
      [
        ...WEAPON_COLUMNS.map((column) => values[column] as SqlValue),
        timestamp,
        characterId,
        this.payload.weapon_id,
      ],
    );
  }

  inverse(): UpdateWeaponPayload {
    if (this.#previous === undefined) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return {
      type: 'update_weapon',
      weapon_id: this.payload.weapon_id,
      weapon: this.#previous,
    };
  }
}

export class RemoveWeaponCommand implements ResolvesInverseAfterApply {
  readonly actionType = 'remove_weapon';
  readonly invertsAfterApply = true;

  #removed: AddWeaponPayload | undefined;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: RemoveWeaponPayload,
  ) {}

  apply(characterId: number): void {
    const existing = readWeapon(this.db, characterId, this.payload.weapon_id);
    this.#removed = {
      type: 'add_weapon',
      weapon: fieldsFromRow(existing),
      weapon_id: Number(existing.id),
      mastery_selected: Number(existing.mastery_selected) === 1,
    };
    this.db.exec(
      'DELETE FROM character_weapons WHERE character_id = ? AND id = ?',
      [characterId, this.payload.weapon_id],
    );
  }

  inverse(): AddWeaponPayload {
    if (this.#removed === undefined) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return this.#removed;
  }
}

export class SetWeaponMasteryCommand implements ResolvesInverseAfterApply {
  readonly actionType = 'set_weapon_mastery';
  readonly invertsAfterApply = true;

  #previous: boolean | undefined;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: SetWeaponMasteryPayload,
  ) {}

  apply(characterId: number): void {
    const existing = readWeapon(this.db, characterId, this.payload.weapon_id);
    if (this.payload.selected && existing.mastery_property === null) {
      throw new TypeError(
        'This weapon has no mastery property to select.',
      );
    }
    this.#previous = Number(existing.mastery_selected) === 1;
    // NOT compared against the allowance. Over-selecting produces a WARNING in
    // the planner and never a refusal: a warning can only be computed when the
    // allowance is `known` and single-class, and blocking would require the
    // application to be certain in cases where it is not.
    this.db.exec(
      `UPDATE character_weapons
       SET mastery_selected = ?, updated_at = ?
       WHERE character_id = ? AND id = ?`,
      [
        this.payload.selected ? 1 : 0,
        new Date().toISOString(),
        characterId,
        this.payload.weapon_id,
      ],
    );
  }

  inverse(): SetWeaponMasteryPayload {
    if (this.#previous === undefined) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return {
      type: 'set_weapon_mastery',
      weapon_id: this.payload.weapon_id,
      selected: this.#previous,
    };
  }
}
