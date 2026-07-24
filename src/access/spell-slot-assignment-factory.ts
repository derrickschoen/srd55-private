import {
  FixedSpellGrant,
  SpellSlotAssignment,
  UnassignedSpellSlot,
  UserSpellSelection,
} from './spell-slot-assignment';

export class SpellSlotAssignmentFactory {
  static fromReferences(
    fixedSpellVersionId: number | null,
    currentSpellVersionId: number | null,
  ): SpellSlotAssignment {
    if (
      fixedSpellVersionId !== null &&
      currentSpellVersionId !== null
    ) {
      throw new TypeError(
        'A spell slot cannot hold both a fixed grant and a user selection.',
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
