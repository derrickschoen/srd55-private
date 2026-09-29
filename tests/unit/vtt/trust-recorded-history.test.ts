import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { reduceEncounter } from '../../../src/combat/encounter';
import { sha256 } from '../../../src/crypto/sha256';
import {
  decodeSavedSessionRevisions,
  EncounterSessionJournal,
  importSavedSession,
  MemoryBrowserSessionStore,
  TRUST_RECORDED_HISTORY_KEY_SHA256,
  type LoadedRelaxedStamp,
  type RelaxedSessionResume,
} from '../../../src/vtt/session-persistence';
import { composeStoredCharacterEncounter } from '../../../src/vtt/stored-character-encounter';
import {
  A40,
  BUILD_A,
  BUILD_B,
  bundle,
  bundleNotRehashed,
  e1,
  e3,
  e4,
  loadedParty,
  OVERHANG_V12,
  PC,
  recordP,
  recordS,
  recordS2,
  thrown,
} from '../../helpers/save-compat-fixtures';
import { declareTestInputs } from '../../helpers/test-inputs';
import { loadSaveTrustingRecordedHistory, TRUST_RECORDED_HISTORY_KEY } from '../../helpers/trust-recorded-history';

// SAVE-COMPAT C5 (owner D941; supervisor D944, D945 SQ1, D947 SQ7): a test may load a save by TRUSTING its recorded
// history. Integrity still holds (hashes, schema, sequence and every recorded fact); the nine rules-derived transition
// kinds are not re-derived; the resumed state is the last recorded one and new actions use the rules and build
// running now; and every value the relaxed journal returns is stamped "loaded relaxed" with the recording builds.
// Builds: A = 'a' x 40 recorded, B = 'b' x 40 runs. Every expectation is by hand.

const inputs = declareTestInputs({ fixtures: [OVERHANG_V12] });
const overhang = (): string => inputs.fixtures.readText(OVERHANG_V12);

/** E1 on S2 (S without its session_ended): the move's recorded event says 30 feet remain where the state says 25. */
function e1S2(): string {
  return bundle(e1(recordS2(BUILD_A, overhang()).plain));
}

const stampOf = (purpose: string, trustedRevisions: readonly number[]): LoadedRelaxedStamp => ({
  kind: 'loaded_relaxed', recordedBy: [BUILD_A], runningBuild: BUILD_B, trustedRevisions, purpose,
});

describe('SAVE-COMPAT C5: trust-recorded-history', () => {
  it('W23: a relaxed load resumes from the recorded state and is stamped with the recording build', () => {
    const plain = e1(recordS2(BUILD_A, overhang()).plain);
    // A strict load refuses this save (W1); trusting its recorded history loads it.
    let loaded: RelaxedSessionResume | undefined;
    expect(() => {
      loaded = loadSaveTrustingRecordedHistory(bundle(plain), BUILD_B, 'W23');
    }).not.toThrow();
    const resume = loaded!;
    expect(canonicalJson(resume.encounterState)).toBe(canonicalJson(plain[1]!.encounterState));
    // Revision 2 (reducer_applied) is the one derived kind: trusted, not re-derived.
    expect(resume.loaded).toEqual(stampOf('W23', [2]));
    expect(resume.journal.loaded).toEqual(resume.loaded);
  });

  it('W24: a relaxed load still refuses what integrity refuses', () => {
    const plain = recordS(BUILD_A, overhang()).plain;
    const recordedFact = thrown(() => loadSaveTrustingRecordedHistory(bundle(e3(plain)), BUILD_B, 'W24'));
    expect(recordedFact?.name).toBe('SessionIntegrityError');
    expect(recordedFact.fault).toEqual({
      kind: 'recorded_fact_disagreement', revision: 3, transition: 'session_ended', check: 'ended-session RNG state',
    });
    const hash = thrown(() => loadSaveTrustingRecordedHistory(bundleNotRehashed(e4(plain)), BUILD_B, 'W24'));
    expect(hash?.name).toBe('SessionIntegrityError');
    expect(hash.fault).toMatchObject({ kind: 'hash_mismatch', subject: 'branch_rng_fingerprint', revision: 2 });
  });

  it('W25 (D941): new actions use the rules and the build running now', () => {
    const resume = loadSaveTrustingRecordedHistory(e1S2(), BUILD_B, 'W25');
    const command = { type: 'move', actor: PC, path: [{ column: 2, row: 0 }], cause: 'voluntary' } as const;
    const reduction = reduceEncounter(resume.encounterState, command, resume.rng);
    // Hand: Speed 30; the recorded state holds 25 feet left after (0,0) -> (1,0) (SRD 5.2.1 :780-782, :855-856);
    // (1,0) -> (2,0) costs 5 more.
    expect(reduction.events.find((event) => event.type === 'movement_completed')).toMatchObject({
      type: 'movement_completed', spent: 5, remaining: 20,
    });
    resume.journal.record({
      transition: { kind: 'reducer_applied', command, events: reduction.events },
      encounterState: reduction.state, coordinatorState: resume.coordinatorState, controllers: resume.controllers,
    });
    const revisions = decodeSavedSessionRevisions(resume.journal.export().value, BUILD_B);
    expect(revisions.map((revision) => revision.recordedBy)).toEqual([BUILD_A, BUILD_A, BUILD_B]);
  });

  it('W25b (D947 SQ7): every value the relaxed journal returns carries the load\'s stamp', () => {
    const combat = loadSaveTrustingRecordedHistory(e1S2(), BUILD_B, 'W25b');
    const combatStamp = combat.loaded;
    const skipped = combat.journal.skipTurn();
    expect(skipped.loaded).toEqual(combatStamp);
    expect(skipped.journal).toBe(combat.journal);
    for (const result of [combat.journal.history(), combat.journal.partyState(), combat.journal.export()]) {
      expect(result.loaded).toEqual(combatStamp);
    }

    const partyBytes = bundle(recordP(BUILD_A).plain);
    const party = (purpose: string) => loadSaveTrustingRecordedHistory(partyBytes, BUILD_B, purpose);
    // P: 2 reaction_preference_changed, 3 short_rest_completed, 4 room_composed are derived kinds.
    const partyStamp = stampOf('W25b-party', [2, 3, 4]);
    expect(party('W25b-party').loaded).toEqual(partyStamp);
    expect(party('W25b-party').journal.capturePartyState().loaded).toEqual(partyStamp);
    expect(party('W25b-party').journal.takeShortRest([]).loaded).toEqual(partyStamp);
    const composing = party('W25b-party');
    const current = composing.journal.partyState();
    expect(current.loaded).toEqual(partyStamp);
    const next = composeStoredCharacterEncounter(loadedParty(), new Map(), { ...current.value!, room: current.value!.room + 1 } as NonNullable<typeof current.value>);
    expect(composing.journal.composeNextRoom({
      encounterState: next.state, coordinatorState: composing.coordinatorState, controllers: next.controllers,
    }).loaded).toEqual(partyStamp);
    for (const result of [composing.journal.history(), composing.journal.export()]) expect(result.loaded).toEqual(partyStamp);

    // Through a returned resume, too: its journal is the relaxed one.
    const chained = party('W25b-party');
    const initiative = { type: 'roll_initiative' } as const;
    const rolled = reduceEncounter(chained.encounterState, initiative, chained.rng);
    chained.journal.record({
      transition: { kind: 'reducer_applied', command: initiative, events: rolled.events },
      encounterState: rolled.state, coordinatorState: chained.coordinatorState, controllers: chained.controllers,
    });
    expect(chained.journal.skipTurn().journal.capturePartyState().loaded).toEqual(partyStamp);
  });

  it('W26: a relaxed export is as recorded, and a strict import still refuses it (no laundering)', () => {
    const resume = loadSaveTrustingRecordedHistory(e1S2(), BUILD_B, 'W26');
    resume.journal.endSession();
    // The relaxed export is the history as recorded: it is written without a strict replay...
    let exported: unknown;
    expect(() => {
      exported = resume.journal.export().value;
    }).not.toThrow();
    expect(typeof exported).toBe('string');
    // ...and a strict import still refuses it.
    const error = thrown(() => importSavedSession(new MemoryBrowserSessionStore(BUILD_B), String(exported)));
    expect(error?.name).toBe('SessionRecordedByOtherBuildError');
    expect(error.refusal).toMatchObject({ revision: 2, relation: { kind: 'other_commit', recorded: A40 } });
  });

  it('W38 (D941): the grant is checked at run time, before anything is decoded', () => {
    const refusedGrants: readonly unknown[] = [JSON.parse('{}'), { key: 'not-the-key', purpose: 'x' }, null];
    for (const grant of refusedGrants) {
      const error = thrown(() => EncounterSessionJournal.loadSaveTrustingRecordedHistory('not json', BUILD_B, grant as never));
      expect(error?.name).toBe('TrustRecordedHistoryRefusedError');
    }
  });

  it('W39 (D945 SQ3): the key is in exactly one tracked file, and the source holds only its digest', () => {
    const tracked = spawnSync('git', ['grep', '-l', '--fixed-strings', TRUST_RECORDED_HISTORY_KEY], { encoding: 'utf8' });
    expect(tracked.stdout.trim().split('\n')).toEqual(['tests/helpers/trust-recorded-history.ts']);
    expect(sha256(TRUST_RECORDED_HISTORY_KEY)).toBe(TRUST_RECORDED_HISTORY_KEY_SHA256);
  });
});

