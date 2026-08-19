import {
  FixedSpellGrant,
  SpellSlotAssignment,
  UnassignedSpellSlot,
  UserSpellSelection,
} from './spell-slot-assignment';
import {
  SpellSlotAssignmentReferenceConflictError,
} from './spell-slot-assignment-errors';

export class SpellSlotAssignmentFactory {
  static fromReferences(
    fixedSpellVersionId: number | null,
    currentSpellVersionId: number | null,
  ): SpellSlotAssignment {
    if (
      fixedSpellVersionId !== null &&
      currentSpellVersionId !== null
    ) {
      throw new SpellSlotAssignmentReferenceConflictError(
        fixedSpellVersionId,
        currentSpellVersionId,
      );
    }

    if (fixedSpellVersionId !== null) {
      return new FixedSpellGrant(fixedSpellVersionId);
    }
    if (currentSpellVersionId !== null) {
      return new UserSpellSelection(currentSpellVersionId);
    }
    return new UnassignedSpellSlot();
  }
}

export function spellSlotAssignmentFromReferences(
  fixedSpellVersionId: number | null,
  currentSpellVersionId: number | null,
): SpellSlotAssignment {
  return SpellSlotAssignmentFactory.fromReferences(
    fixedSpellVersionId,
    currentSpellVersionId,
  );
}
