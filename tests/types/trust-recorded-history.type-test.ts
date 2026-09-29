/**
 * SAVE-COMPAT C5 W27 (owner D941; D947 SQ7): trust-recorded-history is reachable only through a minted grant, and a
 * relaxed journal is a different type from the strict one whose every result is stamped. Compiled by `tsc -b`; each
 * @ts-expect-error is a program that must not compile (TS2578 if it did).
 */
import type { CoordinatorPersistence } from '../../src/combat/coordinator';
import type {
  EncounterSessionJournal,
  LoadedRelaxedStamp,
  RelaxedJournalSurface,
  RelaxedSessionResume,
  SessionResume,
  TrustRecordedHistoryGrant,
} from '../../src/vtt/session-persistence';
import type { PartySessionState } from '../../src/vtt/party-session-state';

declare const relaxed: RelaxedSessionResume;

// @ts-expect-error (a) a grant cannot be written: its key is a symbol no module exports.
export const literalGrant: TrustRecordedHistoryGrant = { key: 'any key', purpose: 'a literal' };

// @ts-expect-error (b) a relaxed journal is not the strict one (it lacks the strict class's private members).
export const asStrict: EncounterSessionJournal = relaxed.journal;

// @ts-expect-error (c) a relaxed result is not a strict SessionResume (its journal is the relaxed one).
export const asStrictResume: SessionResume = relaxed.journal.skipTurn();

// (d) the surface is over every public method of the strict journal, and every value it returns is stamped.
interface UnstampedCompose extends Omit<RelaxedJournalSurface, 'composeNextRoom'> {}
declare class UnstampedCompose implements RelaxedJournalSurface {
  // @ts-expect-error a relaxed composeNextRoom returning the plain party state.
  composeNextRoom(...args: Parameters<EncounterSessionJournal['composeNextRoom']>): PartySessionState;
}
interface MissingHistory extends Omit<RelaxedJournalSurface, 'history'> {}
// @ts-expect-error a relaxed journal without history().
declare class MissingHistory implements RelaxedJournalSurface {}

// (e) controls: a resume returned by the relaxed journal is stamped; its record still drives a coordinator.
export const stamped: LoadedRelaxedStamp = relaxed.journal.skipTurn().loaded;
export const record: CoordinatorPersistence['record'] = relaxed.journal.record.bind(relaxed.journal);
export const surface: RelaxedJournalSurface = relaxed.journal;
