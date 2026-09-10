import { describe, expect, it } from 'vitest';
import { createUuidV7Generator } from '../../../tools/vtt-handoff/uuidv7';

function fixedRandom(value: number): (size: number) => Uint8Array {
  return (size) => new Uint8Array(size).fill(value);
}

describe('RFC 9562 UUIDv7 generator', () => {
  it('round-trips the 48-bit millisecond timestamp and sets version and variant bits', () => {
    const timestamp = 1_725_984_123_456;
    const uuid = createUuidV7Generator({ now: () => timestamp, randomBytes: fixedRandom(0xab) }).next();
    expect(Number.parseInt(uuid.replaceAll('-', '').slice(0, 12), 16)).toBe(timestamp);
    expect(uuid[14]).toBe('7');
    expect(uuid[19]).toBe('a');
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
  });

  it('uses deterministic injected randomness for rand_a seed and all 62 rand_b bits', () => {
    const generator = createUuidV7Generator({ now: () => 1, randomBytes: fixedRandom(0x12) });
    expect(generator.next()).toBe('00000000-0001-7212-9212-121212121212');
  });

  it('orders same-millisecond ids lexically by its monotonic 12-bit counter', () => {
    const generator = createUuidV7Generator({ now: () => 100, randomBytes: fixedRandom(0) });
    const ids = Array.from({ length: 100 }, () => generator.next());
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(100);
  });

  it('refuses a rollback clock', () => {
    const times = [100, 99];
    const generator = createUuidV7Generator({ now: () => times.shift() ?? 99, randomBytes: fixedRandom(0) });
    generator.next();
    expect(() => generator.next()).toThrow('UUIDV7_CLOCK_ROLLBACK');
  });

  it('waits for a later millisecond on counter exhaustion and never wraps', () => {
    const times = [100, 100, 100, 101];
    const generator = createUuidV7Generator({
      now: () => times.shift() ?? 101,
      randomBytes: fixedRandom(0xff),
      maximumClockReads: 3,
    });
    const first = generator.next();
    const second = generator.next();
    expect(first.slice(0, 13)).not.toBe(second.slice(0, 13));
    expect(Number.parseInt(second.replaceAll('-', '').slice(0, 12), 16)).toBe(101);

    const stalled = createUuidV7Generator({ now: () => 100, randomBytes: fixedRandom(0xff), maximumClockReads: 2 });
    stalled.next();
    expect(() => stalled.next()).toThrow('UUIDV7_COUNTER_EXHAUSTED');
  });

  it('refuses an exact collision reported by the shared issuance ledger', () => {
    const issued = new Set<string>();
    const dependencies = { now: () => 7, randomBytes: fixedRandom(0x22), issued };
    createUuidV7Generator(dependencies).next();
    expect(() => createUuidV7Generator(dependencies).next()).toThrow('UUIDV7_COLLISION');
  });
});
