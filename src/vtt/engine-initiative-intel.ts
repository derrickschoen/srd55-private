import type { EncounterState } from '../combat/encounter';
import type { EngineInitiativeProjection } from './engine-state-capsule';
import type { SessionHistoryEntry } from './session-persistence';
import { projectEncounterTimeline } from './session-timeline';

export function projectEngineInitiativeIntel(
  state: EncounterState,
  history: readonly SessionHistoryEntry[],
): EngineInitiativeProjection {
  return {
    policy: 'initiative-intel-v1',
    timeline: projectEncounterTimeline(state, history),
  };
}
