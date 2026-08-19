/** A value has a runtime shape that canonical JSON cannot represent. */
export class CanonicalJsonUnsupportedValueError extends TypeError {
  override readonly name = 'CanonicalJsonUnsupportedValueError' as const;

  constructor(readonly value_tag: string) {
    super(`Value is not JSON serializable: ${value_tag}.`);
  }
}

/** A value refers to one of its ancestors and therefore cannot be JSON. */
export class CanonicalJsonCircularReferenceError extends TypeError {
  override readonly name = 'CanonicalJsonCircularReferenceError' as const;

  constructor() {
    super('Value is not JSON serializable: circular reference.');
  }
}
