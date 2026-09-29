/**
 * SAVE-COMPAT C1 (plan §6.2): the replay's check labels are two closed, disjoint sets, and a hash failure names one
 * closed subject. Compiled by `tsc -b` (tsconfig.node.json includes tests): each @ts-expect-error is a program that
 * must not compile; if a type stopped biting, the directive would be unused and tsc fails with TS2578.
 */
import type {
  DerivationCheck,
  RecordedFactCheck,
  SessionHashSubject,
  SessionIntegrityFault,
} from '../../src/vtt/session-persistence';

// @ts-expect-error 'reducer events' is a derivation (the reducer re-derives it), never a recorded fact.
export const recordedEvents: RecordedFactCheck = 'reducer events';
// @ts-expect-error 'ended-session RNG state' is a recorded fact, never a derivation.
export const derivedRng: DerivationCheck = 'ended-session RNG state';
// @ts-expect-error a hash failure names a closed subject; 'checksum' is none of them.
export const vagueSubject: SessionHashSubject = 'checksum';
// @ts-expect-error a recorded-fact disagreement names a recorded-fact check.
export const misfiledFault: SessionIntegrityFault = { kind: 'recorded_fact_disagreement', revision: 2, transition: 'reducer_applied', check: 'reducer state' };

// Controls: the labels the witnesses use are in their sets.
export const recordedRng: RecordedFactCheck = 'ended-session RNG state';
export const derivedEvents: DerivationCheck = 'reducer events';
export const bundleSubject: SessionHashSubject = 'bundle_fingerprint';
