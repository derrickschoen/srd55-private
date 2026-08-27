import type { EncounterState } from '../combat/encounter';

export const ENCOUNTER_IR_VERSION = 1 as const;

export type EncounterSource = 'generated' | 'watabou' | 'imported';

export interface EncounterProvenance {
  readonly source: EncounterSource;
  readonly licenseTag: string;
  /** Typed absence: an imported encounter is not required to have a source seed. */
  readonly seed: number | null;
}

/**
 * The interchange layer deliberately contains the reducer's state instead of
 * restating combat, terrain, or resource concepts in a second arena schema.
 */
export interface EncounterIrV1 {
  readonly schemaVersion: typeof ENCOUNTER_IR_VERSION;
  readonly provenance: EncounterProvenance;
  readonly state: EncounterState;
}

export type EncounterIr = EncounterIrV1;

export function encounterIr(
  state: EncounterState,
  provenance: EncounterProvenance,
): EncounterIr {
  return {
    schemaVersion: ENCOUNTER_IR_VERSION,
    provenance: { ...provenance },
    state,
  };
}
