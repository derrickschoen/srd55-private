import { sqlNullableString, type RowCodec } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { CHARACTER_TEXT_LIMITS } from '../domain/character-limits';
import type {
  CharacterFlavorValues,
  UpdateCharacterFlavorCommand as UpdateCharacterFlavorPayload,
} from '../domain/command-contracts';

const flavorFields = [
  'alignment',
  'appearance',
  'backstory',
  'notes',
] as const;

const flavorValues: RowCodec<CharacterFlavorValues> = (row) => ({
  alignment: sqlNullableString(row, 'alignment'),
  appearance: sqlNullableString(row, 'appearance'),
  backstory: sqlNullableString(row, 'backstory'),
  notes: sqlNullableString(row, 'notes'),
});

function validateFlavor(payload: UpdateCharacterFlavorPayload): void {
  let changed = 0;
  for (const field of flavorFields) {
    if (!Object.hasOwn(payload, field)) continue;
    changed += 1;
    const value = payload[field];
    if (value !== null && typeof value !== 'string') {
      throw new TypeError(`${field} must be a string or null.`);
    }
    if (
      typeof value === 'string' &&
      value.includes('\0')
    ) {
      throw new TypeError(`${field} must not contain NUL.`);
    }
    if (
      typeof value === 'string' &&
      [...value].length > CHARACTER_TEXT_LIMITS[field]
    ) {
      throw new TypeError(
        `${field} must not exceed ${String(CHARACTER_TEXT_LIMITS[field])} characters.`,
      );
    }
  }
  if (changed === 0) {
    throw new TypeError('At least one character flavor field must be changed.');
  }
}

function storedText(value: string | null): string | null {
  return value !== null && value.trim() === '' ? null : value;
}

/** The sole interactive writer for all four character-root flavor fields. */
export class UpdateCharacterFlavorCommand {
  readonly actionType = 'update_character_flavor';

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: UpdateCharacterFlavorPayload,
  ) {
    // Validation belongs before the write transaction. The factory performs
    // the untrusted-payload check too; this keeps direct command use honest.
    validateFlavor(payload);
  }

  apply(characterId: number): void {
    this.db.transaction(() => {
      const previous = this.db.one(
        `SELECT alignment, appearance, backstory, notes
         FROM characters
         WHERE id = ?`,
        [characterId],
        flavorValues,
      );
      if (previous === null) {
        throw new TypeError(`Character ${String(characterId)} does not exist.`);
      }
      const valueFor = (
        field: (typeof flavorFields)[number],
      ): string | null => {
        if (!Object.hasOwn(this.payload, field)) {
          return previous[field];
        }
        const changed = this.payload[field];
        if (changed === undefined) {
          throw new TypeError(`${field} must be a string or null.`);
        }
        return storedText(changed);
      };
      const values: CharacterFlavorValues = {
        alignment: valueFor('alignment'),
        appearance: valueFor('appearance'),
        backstory: valueFor('backstory'),
        notes: valueFor('notes'),
      };
      this.db.exec(
        `UPDATE characters
         SET alignment = ?, appearance = ?, backstory = ?, notes = ?,
             updated_at = ?
         WHERE id = ?`,
        [
          values.alignment,
          values.appearance,
          values.backstory,
          values.notes,
          new Date().toISOString(),
          characterId,
        ],
      );
    });
  }

  inverse(): never {
    throw new Error(
      'The executor persists the character flavor inverse internally.',
    );
  }
}

export interface StoredCharacterFlavorInverse extends CharacterFlavorValues {
  readonly type: 'internal_flavor_restore';
}

/** Internal-only exact write used after an operation-history authorization. */
export function applyStoredCharacterFlavorInverse(
  db: DatabaseContext,
  characterId: number,
  inverse: StoredCharacterFlavorInverse,
  updatedAt: string,
): void {
  db.exec(
    `UPDATE characters
     SET alignment = ?, appearance = ?, backstory = ?, notes = ?,
         updated_at = ?
     WHERE id = ?`,
    [
      inverse.alignment,
      inverse.appearance,
      inverse.backstory,
      inverse.notes,
      updatedAt,
      characterId,
    ],
  );
}
