import type { Brand } from '../domain/ids';

export type EncounterSeed = Brand<number, 'EncounterSeed'>;

export const MAX_ENCOUNTER_SEED = 0xffff_ffff;

export function encounterSeed(value: number): EncounterSeed {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_ENCOUNTER_SEED) {
    throw new RangeError(
      `Encounter seed must be an integer from 0 to ${String(MAX_ENCOUNTER_SEED)}.`,
    );
  }
  return value as EncounterSeed;
}

export const DEFAULT_ENCOUNTER_SEED = encounterSeed(0x315006);

export function parseOptionalEncounterSeed(value: string): EncounterSeed {
  const trimmed = value.trim();
  if (trimmed === '') return DEFAULT_ENCOUNTER_SEED;
  if (!/^\d+$/u.test(trimmed)) {
    throw new RangeError('Encounter seed must contain only decimal digits.');
  }
  return encounterSeed(Number(trimmed));
}
