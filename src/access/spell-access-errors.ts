/** A stored slot names a bucket outside the closed slot-bucket vocabulary. */
export class SpellAccessUnknownSelectionBucketError extends TypeError {
  override readonly name =
    'SpellAccessUnknownSelectionBucketError' as const;
  constructor(readonly bucket: string) {
    super(`Unknown spell selection bucket ${bucket}.`);
  }
}

/** Route construction observed a character whose class invariant disappeared. */
export class SpellAccessMissingCharacterClassError extends Error {
  override readonly name = 'SpellAccessMissingCharacterClassError' as const;
  constructor(readonly character_id: number) {
    super('Spell access routes require at least one character class.');
  }
}
