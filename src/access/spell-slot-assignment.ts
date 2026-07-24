import { SpellSlotAssignmentFactory } from './spell-slot-assignment-factory';

export abstract class SpellSlotAssignment {
  static fromReferences(
    fixedSpellVersionId: number | null,
    currentSpellVersionId: number | null,
  ): SpellSlotAssignment {
    return SpellSlotAssignmentFactory.fromReferences(
      fixedSpellVersionId,
      currentSpellVersionId,
    );
  }

  abstract spellVersionId(): number | null;
}

function positiveVersionId(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${label} must be positive.`);
  }
  return value;
}

export class FixedSpellGrant extends SpellSlotAssignment {
  readonly #spellVersionId: number;

  constructor(spellVersionId: number) {
    super();
    this.#spellVersionId = positiveVersionId(
      spellVersionId,
      'A fixed spell version ID',
    );
  }

  spellVersionId(): number {
    return this.#spellVersionId;
  }
}

export class UserSpellSelection extends SpellSlotAssignment {
  readonly #spellVersionId: number;

  constructor(spellVersionId: number) {
    super();
    this.#spellVersionId = positiveVersionId(
      spellVersionId,
      'A selected spell version ID',
    );
  }

  spellVersionId(): number {
    return this.#spellVersionId;
  }
}

export class UnassignedSpellSlot extends SpellSlotAssignment {
  spellVersionId(): null {
    return null;
  }
}
