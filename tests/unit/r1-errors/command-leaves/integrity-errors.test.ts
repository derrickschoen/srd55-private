import { describe, expect, it } from 'vitest';
import { CharacterCommandIntegrity } from '../../../../src/commands/integrity';
import {
  CharacterCommandIntegrityError,
  CommandIntegrityCharacterIdError,
  CommandIntegrityKeyRequiredError,
} from '../../../../src/commands/integrity-errors';

async function rejected(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected command integrity to reject the input.');
}

describe('command integrity tagged error formatters', () => {
  it('formats a missing signing key', () => {
    const error = new CommandIntegrityKeyRequiredError();

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(TypeError);
    expect(error).toMatchObject({
      name: 'CommandIntegrityKeyRequiredError',
      message: 'APP_KEY is required to sign internal character commands.',
    });
  });

  it('formats an invalid character identifier', () => {
    const error = new CommandIntegrityCharacterIdError(1.5);

    expect(error).toBeInstanceOf(TypeError);
    expect(error).toMatchObject({
      name: 'CommandIntegrityCharacterIdError',
      character_id: 1.5,
      message: 'characterId must be an integer.',
    });
  });

  it('formats invalid internal command integrity', () => {
    const error = new CharacterCommandIntegrityError(42);

    expect(error).toBeInstanceOf(TypeError);
    expect(error).toMatchObject({
      name: 'CharacterCommandIntegrityError',
      character_id: 42,
      message:
        'This internal character command is invalid or belongs to another character.',
    });
  });
});

describe('command integrity defect guards', () => {
  it('reports an invalid character identifier as structured data', async () => {
    const integrity = new CharacterCommandIntegrity('test-signing-key');
    const error = await rejected(() => integrity.signature(1.5, {}));

    expect(error).toBeInstanceOf(CommandIntegrityCharacterIdError);
    expect(error).toMatchObject({ character_id: 1.5 });
  });
});
