import {
  sqlBoolean,
  sqlInteger,
  sqlNullableInteger,
  sqlNullableString,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type { CharacterRow } from '../domain/models';
import {
  abilityAllocationMethods,
  isEnumValue,
  type KnownAbilityAllocationMethod,
  type RulesEdition,
} from '../domain/enums';

export interface CreateCharacterInput {
  readonly name: string;
}

export interface DeleteCharacterResult {
  readonly id: number;
  readonly deleted: boolean;
}

export class CharacterNotFoundError extends Error {
  readonly status = 404;

  constructor(characterId: number) {
    super(`Character ${characterId} does not exist.`);
    this.name = 'CharacterNotFoundError';
  }
}

/**
 * The CHECK constraint closes this vocabulary, so an unknown value here is
 * stored corruption — thrown rather than passed through, because a method the
 * step's warnings cannot key on would be silently treated as chosen.
 */
function sqlAllocationMethod(
  row: SqlRow,
  column: string,
): KnownAbilityAllocationMethod | null {
  const value = sqlNullableString(row, column);
  if (value === null) {
    return null;
  }
  if (!isEnumValue(abilityAllocationMethods, value)) {
    throw new Error(
      `Character column ${column} holds unknown allocation method ${JSON.stringify(value)}.`,
    );
  }
  return value;
}

function decodeCharacter(row: SqlRow): CharacterRow {
  return {
    id: sqlInteger(row, 'id'),
    name: sqlString(row, 'name'),
    strength: sqlInteger(row, 'strength'),
    dexterity: sqlInteger(row, 'dexterity'),
    constitution: sqlInteger(row, 'constitution'),
    intelligence: sqlInteger(row, 'intelligence'),
    wisdom: sqlInteger(row, 'wisdom'),
    charisma: sqlInteger(row, 'charisma'),
    ability_allocation_method: sqlAllocationMethod(
      row,
      'ability_allocation_method',
    ),
    proficiency_bonus_override: sqlNullableInteger(
      row,
      'proficiency_bonus_override',
    ),
    rules_edition_preference: sqlString(
      row,
      'rules_edition_preference',
    ) as RulesEdition,
    allow_legacy: sqlBoolean(row, 'allow_legacy'),
    revision: sqlInteger(row, 'revision'),
    alignment: sqlNullableString(row, 'alignment'),
    appearance: sqlNullableString(row, 'appearance'),
    backstory: sqlNullableString(row, 'backstory'),
    notes: sqlNullableString(row, 'notes'),
    created_at: sqlNullableString(row, 'created_at'),
    updated_at: sqlNullableString(row, 'updated_at'),
  };
}

function validatedName(name: string): string {
  if (name.trim() === '') {
    throw new TypeError('Character name is required.');
  }
  if ([...name].length > 120) {
    throw new TypeError('Character name must not exceed 120 characters.');
  }
  return name;
}

export class CharacterCrud {
  constructor(
    private readonly db: DatabaseContext,
    private readonly clock: () => string = () => new Date().toISOString(),
  ) {}

  create(input: CreateCharacterInput): CharacterRow {
    return this.db.transaction(() => {
      const timestamp = this.clock();
      const id = this.db.exec(
        `INSERT INTO characters (name, created_at, updated_at)
         VALUES (?, ?, ?)`,
        [validatedName(input.name), timestamp, timestamp],
      ).lastInsertId;
      return this.get(id);
    });
  }

  get(characterId: number): CharacterRow {
    const character = this.db.one(
      `SELECT *
       FROM characters
       WHERE id = ?`,
      [characterId],
      decodeCharacter,
    );
    if (character === null) {
      throw new CharacterNotFoundError(characterId);
    }
    return character;
  }

  delete(characterId: number): DeleteCharacterResult {
    return this.db.transaction(() => {
      const deleted = this.db.exec(
        'DELETE FROM characters WHERE id = ?',
        [characterId],
      ).changes === 1;
      return { id: characterId, deleted };
    });
  }
}
