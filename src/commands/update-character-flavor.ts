import { sqlNullableString, type RowCodec } from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { CHARACTER_TEXT_LIMITS } from '../domain/character-limits';
import type {
  UpdateCharacterFlavorCommand as UpdateCharacterFlavorPayload,
} from '../domain/command-contracts';

type FlavorValues = Omit<UpdateCharacterFlavorPayload, 'type' | 'reason'>;

const flavorValues: RowCodec<FlavorValues> = (row) => ({
  alignment: sqlNullableString(row, 'alignment'),
  appearance: sqlNullableString(row, 'appearance'),
  backstory: sqlNullableString(row, 'backstory'),
  notes: sqlNullableString(row, 'notes'),
});

function validateFlavor(payload: UpdateCharacterFlavorPayload): void {
  for (const field of [
    'alignment',
    'appearance',
    'backstory',
    'notes',
  ] as const) {
    const value = payload[field];
    if (value !== null && typeof value !== 'string') {
      throw new TypeError(`${field} must be a string or null.`);
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
}

function storedText(value: string | null): string | null {
  return value !== null && value.trim() === '' ? null : value;
}

/** The sole interactive writer for all four character-root flavor fields. */
export class UpdateCharacterFlavorCommand {
  readonly actionType = 'update_character_flavor';

  readonly #values: FlavorValues;
  #previous: FlavorValues | undefined;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: UpdateCharacterFlavorPayload,
  ) {
    // Validation belongs before the write transaction. The factory performs
    // the untrusted-payload check too; this keeps direct command use honest.
    validateFlavor(payload);
    this.#values = {
      alignment: storedText(payload.alignment),
      appearance: storedText(payload.appearance),
      backstory: storedText(payload.backstory),
      notes: storedText(payload.notes),
    };
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
      this.#previous = previous;
      this.db.exec(
        `UPDATE characters
         SET alignment = ?, appearance = ?, backstory = ?, notes = ?,
             updated_at = ?
         WHERE id = ?`,
        [
          this.#values.alignment,
          this.#values.appearance,
          this.#values.backstory,
          this.#values.notes,
          new Date().toISOString(),
          characterId,
        ],
      );
    });
  }

  inverse(): UpdateCharacterFlavorPayload {
    if (this.#previous === undefined) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return { type: 'update_character_flavor', ...this.#previous };
  }
}
