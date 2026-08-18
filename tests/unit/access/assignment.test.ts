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
import {
  SpellSlotAssignmentReferenceConflictError,
} from '../../../src/access/spell-slot-assignment-errors';

function defect(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected a defect, but the call returned.');
}

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
    const conflict = defect(() =>
      SpellSlotAssignmentFactory.fromReferences(12, 34),
    );
    expect(conflict).toBeInstanceOf(
      SpellSlotAssignmentReferenceConflictError,
    );
    expect(conflict).toMatchObject({
      fixed_spell_version_id: 12,
      current_spell_version_id: 34,
    });
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
