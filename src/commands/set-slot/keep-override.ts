import type { SpellSelectionEligibility } from '../../eligibility/spell-selection-eligibility';
import {
  SetSlotModeCommand,
  type SlotUpdates,
  type StoredSlot,
} from './shared';

export class KeepOverrideSlotCommand extends SetSlotModeCommand<'keep_override'> {
  protected updates(
    slot: StoredSlot,
    _eligibility: SpellSelectionEligibility,
  ): SlotUpdates {
    if (slot.current_spell_version_id === null) {
      throw new Error('Choose a spell before keeping an override.');
    }
    const note = this.payload.note.trim();
    if (note === '') {
      throw new Error('An override note is required.');
    }

    return {
      state: 'kept_override',
      override_note: note,
    };
  }
}
