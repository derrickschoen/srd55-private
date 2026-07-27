import type { DatabaseContext } from '../db/database';
import { encodeBoolean, rowId } from '../db/codecs';
import type {
  UpdateCharacterRulesCommand as UpdateCharacterRulesPayload,
} from '../domain/command-contracts';
import { SpellSelectionEligibility } from '../eligibility/spell-selection-eligibility';

export class UpdateCharacterRulesCommand {
  readonly actionType = 'update_character_rules';

  readonly #eligibility: SpellSelectionEligibility;
  #previousAllowLegacy: boolean | undefined;

  constructor(
    private readonly db: DatabaseContext,
    private readonly payload: UpdateCharacterRulesPayload,
    eligibility?: SpellSelectionEligibility,
  ) {
    this.#eligibility =
      eligibility ?? new SpellSelectionEligibility(db);
  }

  apply(characterId: number): void {
    if (typeof this.payload.allow_legacy !== 'boolean') {
      throw new TypeError('allow_legacy must be a boolean.');
    }

    this.db.transaction(() => {
      const previous = this.db.scalar<number>(
        'SELECT allow_legacy FROM characters WHERE id = ?',
        [characterId],
      );
      if (previous === null) {
        throw new TypeError(`Character ${characterId} does not exist.`);
      }
      this.#previousAllowLegacy = previous === 1;

      this.db.exec(
        `UPDATE characters
         SET allow_legacy = ?, updated_at = ?
         WHERE id = ?`,
        [encodeBoolean(this.payload.allow_legacy), new Date().toISOString(), characterId],
      );

      // This was `all<{ id: number }>(…)` — the ONE unchecked primitive cast
      // in `src/`, asserting a column type nothing had checked, and then
      // re-coercing with `Number(slot.id)` two lines later because the assertion
      // was not trusted. `rowId` checks it once, for real.
      const slots = this.db.all(
        'SELECT id FROM spell_selection_slots WHERE character_id = ? ORDER BY id',
        [characterId],
        rowId,
      );
      for (const slotId of slots) {
        this.#eligibility.refresh(slotId);
      }
    });
  }

  inverse(): UpdateCharacterRulesPayload {
    if (this.#previousAllowLegacy === undefined) {
      throw new Error('Cannot create an inverse before applying the command.');
    }
    return {
      type: 'update_character_rules',
      allow_legacy: this.#previousAllowLegacy,
    };
  }
}
