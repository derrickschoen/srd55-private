export class ContentFingerprintSchemeUnsupportedError extends TypeError {
  override readonly name = 'ContentFingerprintSchemeUnsupportedError' as const;
  constructor(readonly scheme: string) {
    super(`Unsupported content fingerprint scheme '${scheme}'.`);
  }
}

export class ContentIdentityEnvelopeTypeError extends TypeError {
  override readonly name = 'ContentIdentityEnvelopeTypeError' as const;
  constructor() {
    super('A content-v1 envelope must be an object.');
  }
}

export class ContentIdentityAdjacentProjectionError extends TypeError {
  override readonly name = 'ContentIdentityAdjacentProjectionError' as const;
  constructor(
    readonly source_scheme: string,
    readonly target_scheme: string,
  ) {
    super(`Only ${source_scheme} can project adjacently to ${target_scheme}.`);
  }
}

export class ContentIdentityCanonicalValueError extends TypeError {
  override readonly name = 'ContentIdentityCanonicalValueError' as const;
  constructor(readonly value_tag: string) {
    super(`Value is not a canonical content identity value: ${value_tag}.`);
  }
}

export class ContentIdentityCircularReferenceError extends TypeError {
  override readonly name = 'ContentIdentityCircularReferenceError' as const;
  constructor() {
    super('Value is not a canonical content identity value: circular reference.');
  }
}

export class ContentIdentityNumberError extends TypeError {
  override readonly name = 'ContentIdentityNumberError' as const;
  constructor() {
    super('Canonical content identity numbers must be finite safe integers.');
  }
}

export class ContentIdentityNameEmptyError extends TypeError {
  override readonly name = 'ContentIdentityNameEmptyError' as const;
  constructor() {
    super('Content identity names must not be empty.');
  }
}

export class ContentIdentityEditionError extends TypeError {
  override readonly name = 'ContentIdentityEditionError' as const;
  constructor(readonly edition: string) {
    super(`Content identity edition '${edition}' must be a valid catalog key component.`);
  }
}

export class StoredContentIdentityDisagreementError extends TypeError {
  override readonly name = 'StoredContentIdentityDisagreementError' as const;
  constructor() {
    super('Stored content-v1 canonical bytes, digest, and derived key do not agree.');
  }
}
