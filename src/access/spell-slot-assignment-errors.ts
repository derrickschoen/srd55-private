/** A persisted slot carries both mutually exclusive assignment references. */
export class SpellSlotAssignmentReferenceConflictError extends TypeError {
  override readonly name =
    'SpellSlotAssignmentReferenceConflictError' as const;
  constructor(
    readonly fixed_spell_version_id: number,
    readonly current_spell_version_id: number,
  ) {
    super(
      'A spell slot cannot hold both a fixed grant and a user selection.',
    );
  }
}
