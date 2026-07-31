import { assignSpellSelection } from '../../eligibility/spell-selection-assignment';
import type { SlotRestoreState } from '../../domain/command-contracts';
import type { SpellSelectionEligibility } from '../../eligibility/spell-selection-eligibility';
import {
  SetSlotModeCommand,
  type SlotUpdates,
  type StoredSlot,
} from './shared';

export class SelectSlotCommand extends SetSlotModeCommand<'select'> {
  protected updates(
    slot: StoredSlot,
    _eligibility: SpellSelectionEligibility,
  ): SlotUpdates {
    return {
      current_spell_version_id: this.payload.spell_version_id,
      selection_eligibility: 'valid',
      selection_invalid_reason: null,
      state: slot.state === 'kept_override' ? 'active' : slot.state,
      override_note: null,
    };
  }

  protected persist(
    slot: StoredSlot,
    _next: SlotRestoreState,
    now: string,
    eligibility: SpellSelectionEligibility,
  ): void {
    assignSpellSelection(this.db, {
      address: { kind: 'slot_selection', id: slot.id },
      character_id: slot.character_id,
      spell_version_id: this.payload.spell_version_id,
      now,
      eligibility,
    });
  }
}
