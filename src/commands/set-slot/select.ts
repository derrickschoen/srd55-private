import type { SpellSelectionEligibility } from '../../eligibility/spell-selection-eligibility';
import {
  SetSlotModeCommand,
  type SlotUpdates,
  type StoredSlot,
} from './shared';

export class SelectSlotCommand extends SetSlotModeCommand<'select'> {
  protected updates(
    slot: StoredSlot,
    eligibility: SpellSelectionEligibility,
  ): SlotUpdates {
    const result = eligibility.evaluate(
      slot,
      this.payload.spell_version_id,
    );
    if (result.status !== 'valid') {
      throw new Error(result.reason ?? 'Spell selection is not valid.');
    }

    return {
      current_spell_version_id: this.payload.spell_version_id,
      selection_eligibility: 'valid',
      selection_invalid_reason: null,
      state: slot.state === 'kept_override' ? 'active' : slot.state,
      override_note: null,
    };
  }
}
