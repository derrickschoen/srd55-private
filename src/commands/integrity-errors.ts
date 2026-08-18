/** The build omitted the secret required to sign internal commands. */
export class CommandIntegrityKeyRequiredError extends Error {
  override readonly name = 'CommandIntegrityKeyRequiredError' as const;

  constructor() {
    super('APP_KEY is required to sign internal character commands.');
  }
}

/** An internal command was addressed with an invalid character identifier. */
export class CommandIntegrityCharacterIdError extends TypeError {
  override readonly name = 'CommandIntegrityCharacterIdError' as const;

  constructor(readonly character_id: number) {
    super('characterId must be an integer.');
  }
}

/** An internal command is forged, corrupted, or signed for another character. */
export class CharacterCommandIntegrityError extends TypeError {
  override readonly name = 'CharacterCommandIntegrityError' as const;

  constructor(readonly character_id: number) {
    super(
      'This internal character command is invalid or belongs to another character.',
    );
  }
}
