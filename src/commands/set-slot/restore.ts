import type { SpellSelectionEligibility } from '../../eligibility/spell-selection-eligibility';
import {
  SetSlotModeCommand,
  type SlotUpdates,
  type StoredSlot,
} from './shared';

const orphanReasons = {
  rule_no_longer_active:
    'Selection preserved because its grant rule is no longer active.',
  source_no_longer_active:
    'Selection preserved because its source is no longer active.',
} as const;

function orphanedSelectionReason(slot: StoredSlot): string {
  return (
    slot.selection_invalid_reason ??
    (slot.orphan_reason_code === 'rule_no_longer_active'
      ? orphanReasons.rule_no_longer_active
      : orphanReasons.source_no_longer_active)
  );
}

export class RestoreSlotCommand extends SetSlotModeCommand<'restore'> {
  protected updates(
    slot: StoredSlot,
    eligibility: SpellSelectionEligibility,
  ): SlotUpdates {
    const restored = this.payload.state;
    const spellVersionId = restored.current_spell_version_id;
    if (
      spellVersionId !== null &&
      Number(
        this.db.scalar(
          `SELECT EXISTS (
             SELECT 1 FROM spell_versions
             WHERE id = ? AND is_active = 1
           )`,
          [spellVersionId],
        ) ?? 0,
      ) !== 1
    ) {
      throw new Error(
        `Slot restore references inactive spell version ${spellVersionId}.`,
      );
    }

    if (
      restored.state !== 'active' &&
      restored.state !== 'kept_override'
    ) {
      return restored;
    }

    if (slot.state === 'orphaned') {
      return {
        ...restored,
        state: 'orphaned',
        selection_eligibility:
          spellVersionId === null ? 'unselected' : 'invalid',
        selection_invalid_reason:
          spellVersionId === null
            ? null
            : orphanedSelectionReason(slot),
      };
    }

    const result = eligibility.evaluate({
      ...slot,
      current_spell_version_id: spellVersionId,
    });
    return {
      ...restored,
      selection_eligibility: result.status,
      selection_invalid_reason: result.reason,
    };
  }
}
