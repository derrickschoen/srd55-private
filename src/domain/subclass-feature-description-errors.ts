/** The persisted prose state is neither heading-only nor non-empty prose. */
export class SubclassFeatureDescriptionEmptyError extends TypeError {
  override readonly name = 'SubclassFeatureDescriptionEmptyError' as const;

  constructor() {
    super('Subclass feature description must be non-empty.');
  }
}
