/**
 * TRUST-RECORDED-HISTORY, the only mint (owner D941; supervisor D944, D945 SQ3; SAVE-COMPAT §6.8).
 *
 * A test may load a save whose recorded turns the running rules no longer reproduce by trusting its recorded
 * history: integrity (hashes, schema, sequence, every recorded fact) is still checked, the rules derivations are
 * not, and everything the load returns carries the typed stamp `loaded` naming the recording builds and "loaded
 * relaxed". Default off: the app, the tools and every pinned rule-output test cannot reach this file (R3 entries in
 * scripts/check-import-boundaries.mjs, ast-grep no-trust-mint-import-outside-tests), a grant cannot be written as a
 * literal (its key is a symbol no module exports), and session-persistence checks the key's sha256 before it
 * decodes anything. This file is the only one that holds the key.
 */
import type { EngineBuild } from '../../src/vtt/engine-build';
import {
  EncounterSessionJournal,
  MemoryMirrorSink,
  type MirrorSink,
  type RelaxedSessionResume,
  type TrustRecordedHistoryGrant,
} from '../../src/vtt/session-persistence';

export const TRUST_RECORDED_HISTORY_KEY = '1169e97809e1865d802f8cd5a2fa87236a7ed0deb68a2f807b0928f27ef60482';

/** A grant to trust recorded history, for `purpose` (which the stamp repeats). The only cast to the grant. */
export function trustRecordedHistory(purpose: string): TrustRecordedHistoryGrant {
  return { key: TRUST_RECORDED_HISTORY_KEY, purpose } as TrustRecordedHistoryGrant;
}

/** Loads `bytes` trusting its recorded history, into a private store recording `recordingEngine`. */
export function loadSaveTrustingRecordedHistory(
  bytes: string,
  recordingEngine: EngineBuild,
  purpose: string,
  mirror: MirrorSink = new MemoryMirrorSink(),
): RelaxedSessionResume {
  return EncounterSessionJournal.loadSaveTrustingRecordedHistory(bytes, recordingEngine, trustRecordedHistory(purpose), mirror);
}
