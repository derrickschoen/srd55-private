import { canonicalJson } from './canonical-json';

type CommandRecord = Readonly<Record<string, unknown>>;

const invalidIntegrityMessage =
  'This internal character command is invalid or belongs to another character.';

function requireKey(key: unknown): asserts key is string {
  if (typeof key !== 'string' || key === '') {
    throw new Error(
      'APP_KEY is required to sign internal character commands.',
    );
  }
}

function commandWithoutIntegrity(command: object): CommandRecord {
  const { integrity: _integrity, ...unsigned } = command as CommandRecord;
  return unsigned;
}

function hexadecimal(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function bytesFromHex(value: string): Uint8Array {
  const result = new Uint8Array(value.length / 2);
  for (let index = 0; index < result.length; index += 1) {
    result[index] = Number.parseInt(
      value.slice(index * 2, index * 2 + 2),
      16,
    );
  }
  return result;
}

function assertCharacterId(characterId: number): void {
  if (!Number.isSafeInteger(characterId)) {
    throw new TypeError('characterId must be an integer.');
  }
}

export class CharacterCommandIntegrity {
  readonly #crypto: Crypto;
  readonly #key: Promise<CryptoKey>;

  constructor(key: string, crypto: Crypto = globalThis.crypto) {
    requireKey(key);
    this.#crypto = crypto;
    this.#key = crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(key),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    );
  }

  async signature(
    characterId: number,
    command: object,
  ): Promise<string> {
    assertCharacterId(characterId);
    const message = new TextEncoder().encode(
      `${characterId}\n${canonicalJson(commandWithoutIntegrity(command))}`,
    );
    return hexadecimal(
      await this.#crypto.subtle.sign('HMAC', await this.#key, message),
    );
  }

  async attach<T extends object>(
    characterId: number,
    command: T,
  ): Promise<T & { integrity: string }> {
    const integrity = await this.signature(characterId, command);
    return { ...command, integrity };
  }

  async isValid(
    characterId: number,
    command: object,
  ): Promise<boolean> {
    const provided = (command as CommandRecord).integrity;
    if (
      typeof provided !== 'string' ||
      !/^[a-f0-9]{64}$/.test(provided)
    ) {
      return false;
    }

    assertCharacterId(characterId);
    const message = new TextEncoder().encode(
      `${characterId}\n${canonicalJson(commandWithoutIntegrity(command))}`,
    );
    return this.#crypto.subtle.verify(
      'HMAC',
      await this.#key,
      bytesFromHex(provided),
      message,
    );
  }

  async assertValid(
    characterId: number,
    command: object,
  ): Promise<void> {
    if (!(await this.isValid(characterId, command))) {
      throw new TypeError(invalidIntegrityMessage);
    }
  }
}

export async function attachCommandIntegrity<T extends object>(
  characterId: number,
  command: T,
  key: string,
): Promise<T & { integrity: string }> {
  return new CharacterCommandIntegrity(key).attach(characterId, command);
}

export async function assertCommandIntegrity(
  characterId: number,
  command: object,
  key: string,
): Promise<void> {
  return new CharacterCommandIntegrity(key).assertValid(characterId, command);
}
