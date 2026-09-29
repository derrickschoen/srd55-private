import type { EngineBuild } from '../../src/vtt/engine-build';
import { EncounterSessionJournal } from '../../src/vtt/session-persistence';

export function loadSaveTrustingRecordedHistory(bytes: string, runningBuild: EngineBuild, purpose: string) {
  const { session, recordedBy } = EncounterSessionJournal.loadSaveTrustingRecordedHistory(bytes, runningBuild);
  return { session, loaded: { kind: 'loaded_relaxed' as const, recordedBy, runningBuild, purpose } };
}
