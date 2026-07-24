import { describe, expect, it } from 'vitest';
import {
  FixedSpellGrant,
  SpellSlotAssignment,
  UnassignedSpellSlot,
  UserSpellSelection,
} from '../../../src/access/spell-slot-assignment';
import {
  SpellSlotAssignmentFactory,
  spellSlotAssignmentFromReferences,
} from '../../../src/access/spell-slot-assignment-factory';

describe('spell-slot assignment hydration', () => {
  it('hydrates exactly one fixed, selected, or empty assignment state', () => {
    const empty = SpellSlotAssignment.fromReferences(null, null);
    const fixed = SpellSlotAssignment.fromReferences(12, null);
    const selected = spellSlotAssignmentFromReferences(null, 34);

    expect(empty).toBeInstanceOf(UnassignedSpellSlot);
    expect(empty.spellVersionId()).toBeNull();
    expect(fixed).toBeInstanceOf(FixedSpellGrant);
    expect(fixed.spellVersionId()).toBe(12);
    expect(selected).toBeInstanceOf(UserSpellSelection);
    expect(selected.spellVersionId()).toBe(34);
  });

  it('rejects ambiguous references and non-positive persisted IDs', () => {
    expect(() =>
      SpellSlotAssignmentFactory.fromReferences(12, 34),
    ).toThrow(
      'A spell slot cannot hold both a fixed grant and a user selection.',
    );
    expect(() => new FixedSpellGrant(0)).toThrow(
      'A fixed spell version ID must be positive.',
    );
    expect(() => new UserSpellSelection(-1)).toThrow(
      'A selected spell version ID must be positive.',
    );
    expect(() => new UserSpellSelection(1.5)).toThrow(
      'A selected spell version ID must be positive.',
    );
  });
});
