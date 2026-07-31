import type { SpellSelectionEligibility } from '../../eligibility/spell-selection-eligibility';
import {
  SetSlotModeCommand,
  type SlotUpdates,
  type StoredSlot,
} from './shared';

export class ClearSlotCommand extends SetSlotModeCommand<'clear'> {
  protected updates(
    slot: StoredSlot,
    _eligibility: SpellSelectionEligibility,
  ): SlotUpdates {
    return {
      current_spell_version_id: null,
      selection_acquired_at_class_level: null,
      selection_eligibility: 'unselected',
      selection_invalid_reason: null,
      state:
        slot.orphan_reason_code === null ? 'active' : 'discarded',
      override_note: null,
    };
  }
}
