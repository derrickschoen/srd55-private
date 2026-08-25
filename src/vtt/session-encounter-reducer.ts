import type { EncounterCommandReducer } from '../combat/encounter';
import { reduceVaneWarrenEncounter } from './vane-warren';

/**
 * The single pure reducer for persisted VTT commands. Live play and journal
 * replay must call this same function so encounter-specific mechanics cannot
 * exist only in the live coordinator path.
 */
export const reduceSessionEncounter: EncounterCommandReducer = (
  state,
  command,
  rng,
  options,
) => reduceVaneWarrenEncounter(state, command, rng, options);
