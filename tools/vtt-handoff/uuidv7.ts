import { randomBytes as systemRandomBytes } from 'node:crypto';

const MAX_TIMESTAMP = 0xffff_ffff_ffff;
const MAX_COUNTER = 0x0fff;

export interface UuidV7Dependencies {
  readonly now?: () => number;
  readonly randomBytes?: (size: number) => Uint8Array;
  readonly maximumClockReads?: number;
  readonly issued?: Set<string>;
}

function byte(bytes: Uint8Array, index: number): number {
  const value = bytes[index];
  if (value === undefined) throw new Error('UUIDV7_RANDOM_SOURCE_TOO_SHORT');
  return value;
}

function checkedTimestamp(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_TIMESTAMP) {
    throw new Error('UUIDV7_TIMESTAMP_OUT_OF_RANGE');
  }
  return value;
}

function randomBlock(source: (size: number) => Uint8Array): Uint8Array {
  const bytes = source(10);
  if (bytes.length !== 10) throw new Error('UUIDV7_RANDOM_SOURCE_LENGTH');
  return bytes;
}

function hexadecimal(bytes: Uint8Array): string {
  return [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
}

export interface UuidV7Generator {
  next(): string;
}

/** RFC 9562 UUIDv7 with a monotonic 12-bit rand_a field within each millisecond. */
export function createUuidV7Generator(dependencies: UuidV7Dependencies = {}): UuidV7Generator {
  const now = dependencies.now ?? Date.now;
  const randomness = dependencies.randomBytes ?? systemRandomBytes;
  const maximumClockReads = dependencies.maximumClockReads ?? 10_000;
  if (!Number.isSafeInteger(maximumClockReads) || maximumClockReads < 1) {
    throw new Error('UUIDV7_CLOCK_READ_LIMIT_INVALID');
  }
  let lastTimestamp: number | null = null;
  let counter = 0;
  const issued = dependencies.issued ?? new Set<string>();

  function readClock(): number {
    const timestamp = checkedTimestamp(now());
    if (lastTimestamp !== null && timestamp < lastTimestamp) throw new Error('UUIDV7_CLOCK_ROLLBACK');
    return timestamp;
  }

  function nextTimestampAndCounter(): readonly [number, Uint8Array] {
    let timestamp = readClock();
    let random = randomBlock(randomness);
    if (lastTimestamp === null || timestamp > lastTimestamp) {
      counter = ((byte(random, 0) << 8) | byte(random, 1)) & MAX_COUNTER;
      lastTimestamp = timestamp;
      return [timestamp, random];
    }
    if (counter < MAX_COUNTER) {
      counter += 1;
      return [timestamp, random];
    }
    for (let read = 0; read < maximumClockReads; read += 1) {
      timestamp = readClock();
      if (timestamp > lastTimestamp) {
        random = randomBlock(randomness);
        counter = ((byte(random, 0) << 8) | byte(random, 1)) & MAX_COUNTER;
        lastTimestamp = timestamp;
        return [timestamp, random];
      }
    }
    throw new Error('UUIDV7_COUNTER_EXHAUSTED');
  }

  return {
    next(): string {
      const [timestamp, random] = nextTimestampAndCounter();
      const bytes = new Uint8Array(16);
      let remaining = timestamp;
      for (let index = 5; index >= 0; index -= 1) {
        bytes[index] = remaining % 256;
        remaining = Math.floor(remaining / 256);
      }
      bytes[6] = 0x70 | (counter >>> 8);
      bytes[7] = counter & 0xff;
      bytes[8] = 0x80 | (byte(random, 2) & 0x3f);
      for (let index = 9; index < 16; index += 1) bytes[index] = byte(random, index - 6);
      const compact = hexadecimal(bytes);
      const uuid = `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
      if (issued.has(uuid)) throw new Error('UUIDV7_COLLISION');
      issued.add(uuid);
      return uuid;
    },
  };
}

const defaultGenerator = createUuidV7Generator();

export function uuidV7(): string {
  return defaultGenerator.next();
}
