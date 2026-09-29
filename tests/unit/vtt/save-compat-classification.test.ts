import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import {
  decodeSavedSessionRevisions,
  importSavedSession,
  MemoryBrowserSessionStore,
  verifySessionHistoryArchive,
  type SessionRevision,
} from '../../../src/vtt/session-persistence';
import {
  A40,
  B40,
  BUILD_A,
  BUILD_B,
  bundle,
  bundleNotRehashed,
  e1,
  e10,
  e11,
  e12,
  e2,
  e3,
  e4,
  e5,
  e6,
  e7,
  e8,
  e9,
  LR_SQUEEZED_V12,
  lrCross,
  OVERHANG_V12,
  reattributed,
  recordP,
  recordR,
  recordS,
  resumeUnder,
  revisionBundleText,
  thrown,
  UNRECORDED,
  withFlippedFingerprint,
  type Plain,
} from '../../helpers/save-compat-fixtures';
import { declareTestInputs } from '../../helpers/test-inputs';

// SAVE-COMPAT C1 (owner D939, D946; supervisor D943-D945): a save whose recorded turn does not play out under the
// build running now is refused TYPED. A derivation (the rules re-deriving a recorded result) that differs is the
// cross-build refusal when another build recorded that turn, naming both builds truthfully: either the rules changed
// or the save was altered, and this build cannot tell which. Under the build that recorded it, the same difference is
// an integrity fault, as is every recorded fact, hash, schema or sequence failure. Every expectation is by hand.
//
// Builds: A = 'a' x 40 records, B = 'b' x 40 runs, unless a case says otherwise. S's revision 2 moves the PC one cell
// (movement_completed spent 5, remaining 25: Speed 30, SRD 5.2.1 :780-782 "move a distance up to your Speed").

const inputs = declareTestInputs({ fixtures: [OVERHANG_V12, LR_SQUEEZED_V12] });
const overhang = (): string => inputs.fixtures.readText(OVERHANG_V12);
const s = (build = BUILD_A): Plain[] => recordS(build, overhang()).plain;

describe('SAVE-COMPAT C1: a recorded turn that does not play out is refused typed', () => {
  it('W1 (D939, D946): E1 recorded by A, loaded under B: the cross-build refusal naming both builds, truthfully', () => {
    const error = resumeUnder(BUILD_B, bundle(e1(s())));
    expect(error?.name).toBe('SessionRecordedByOtherBuildError');
    expect(error.refusal).toEqual({
      revision: 2,
      transition: 'reducer_applied',
      relation: { kind: 'other_commit', recorded: A40, running: B40 },
      failure: { kind: 'derivation_differs', check: 'reducer events' },
    });
    expect(error.message).toContain(`was recorded by engine build ${A40}`);
    expect(error.message).toContain(`cannot be verified by engine build ${B40}, the build running now`);
    expect(error.message).toContain(
      'Either the rules changed between these builds or the save was altered after it was recorded; this build cannot tell which.',
    );
    expect(error.message).toContain('tools/session-archive-replay.ts --save');
    expect(error.message).not.toMatch(/tamper|corrupt|checksum/iu);
  });

  it('W2 (D939): E2, a recorded move the running rules refuse: the same refusal, carrying the rules error', () => {
    // Hand: Speed 30 feet is 6 cells; the path's seventh cell, step 6 at (7,0), is over budget.
    const error = resumeUnder(BUILD_B, bundle(e2(s())));
    expect(error?.name).toBe('SessionRecordedByOtherBuildError');
    expect(error.refusal).toMatchObject({
      revision: 2,
      transition: 'reducer_applied',
      failure: {
        kind: 'rules_refused_recorded_input',
        check: 'reducer state',
        error: 'EncounterRuleError: Illegal movement for combatant:w21-pc: over_budget at step 6 (7,0).',
      },
    });
  });

  it('W3 (D943): E1 under A, the build that recorded it: an integrity fault, never the cross-build refusal', () => {
    const error = resumeUnder(BUILD_A, bundle(e1(s())));
    expect(error?.name).toBe('SessionIntegrityError');
    expect(error.fault).toEqual({
      kind: 'same_build_rederivation',
      revision: 2,
      transition: 'reducer_applied',
      check: 'reducer events',
      failure: { kind: 'derivation_differs', check: 'reducer events' },
      build: A40,
    });
    expect(error.message).toContain(`under engine build ${A40}, the build that recorded it`);
  });

  it('W4 (D943): E3, a recorded fact no rule derives, under B: an integrity fault', () => {
    const error = resumeUnder(BUILD_B, bundle(e3(s())));
    expect(error?.name).toBe('SessionIntegrityError');
    expect(error.fault).toEqual({
      kind: 'recorded_fact_disagreement', revision: 3, transition: 'session_ended', check: 'ended-session RNG state',
    });
  });

  it('W5 CONTROL: an edit left unhashed fails at decode (the branch fingerprint), never the cross-build refusal', () => {
    const error = resumeUnder(BUILD_B, bundleNotRehashed(e4(s())));
    expect(String(error?.message)).toContain('Persisted VTT branch RNG state fingerprint mismatch.');
    expect(error?.name).not.toBe('SessionRecordedByOtherBuildError');
  });

  it('W6: the failing revision\'s own build decides (revision 2 by A fails; revision 3 is by B)', () => {
    const text = bundle(e5(s(), BUILD_B));
    const underB = resumeUnder(BUILD_B, text);
    expect(underB?.name).toBe('SessionRecordedByOtherBuildError');
    expect(underB.refusal.relation).toEqual({ kind: 'other_commit', recorded: A40, running: B40 });
    expect(resumeUnder(BUILD_A, text)?.name).toBe('SessionIntegrityError');
  });

  it('W7 (D945 SQ5): a build that names no commit, on either side, relates as unrecorded and is named as such', () => {
    const byUnrecorded = resumeUnder(BUILD_B, bundle(e1(reattributed(s(), UNRECORDED))));
    expect(byUnrecorded?.name).toBe('SessionRecordedByOtherBuildError');
    expect(byUnrecorded.refusal.relation).toEqual({ kind: 'unrecorded', recorded: UNRECORDED, running: BUILD_B });
    expect(byUnrecorded.message).toContain(
      'was recorded by an unrecorded engine build (a development, test or uncommitted build, which records no commit)',
    );
    expect(byUnrecorded.message).toContain('The recording build names no commit');
    const underUnrecorded = resumeUnder(UNRECORDED, bundle(e1(s())));
    expect(underUnrecorded?.name).toBe('SessionRecordedByOtherBuildError');
    expect(underUnrecorded.refusal.relation).toEqual({ kind: 'unrecorded', recorded: BUILD_A, running: UNRECORDED });
  });

  it('W8 CONTROL: the honest S recorded by A loads under B', () => {
    expect(resumeUnder(BUILD_B, bundle(s()))).toBeUndefined();
  });

  it('W10 (WR10): a migrated root that does not follow from its archive: cross-build under B, an archive error under A', () => {
    const recorder = new MemoryBrowserSessionStore(BUILD_A);
    const sessionId = importSavedSession(recorder, overhang());
    const [root] = JSON.parse(canonicalJson(recorder.revisions(sessionId))) as Plain[];
    root!.transition.placementRepair[0].to = { column: 15, row: 2 };
    const editedStore = new MemoryBrowserSessionStore(BUILD_A);
    const edited = editedStore.revisions(importSavedSession(editedStore, bundle([root!])))[0];
    if (edited === undefined) throw new Error('The edited root did not import.');
    const verify = verifySessionHistoryArchive as (root: SessionRevision, running?: unknown) => unknown;
    const underB = thrown(() => verify(edited, BUILD_B));
    expect(underB?.name).toBe('SessionRecordedByOtherBuildError');
    expect(underB.refusal).toEqual({
      revision: 1,
      transition: 'session_migrated',
      relation: { kind: 'other_commit', recorded: A40, running: B40 },
      failure: { kind: 'derivation_differs', check: 'migrated root' },
    });
    const underA = thrown(() => verify(edited, BUILD_A));
    expect(underA?.name).toBe('SessionHistoryArchiveError');
    expect(underA.message).toBe('The migrated root does not follow from its archived history.');
  });

  it('W31 CONTROL (P1-2): a rules call that throws a plain Error stays that Error, never the cross-build refusal', () => {
    const error = resumeUnder(BUILD_B, bundle(e6(recordP(BUILD_A).plain)));
    expect(error?.name).toBe('Error');
    expect(error?.message).toBe('Short Rest names non-party character combatant:nobody.');
  });

  it('W32: room_composed is a derivation: an edited advanced party state is cross-build under B, integrity under A', () => {
    const edited = e7(recordP(BUILD_A).plain);
    const underB = resumeUnder(BUILD_B, bundle(edited));
    expect(underB?.name).toBe('SessionRecordedByOtherBuildError');
    // P: 1 session_started, 2 reaction_preference_changed, 3 short_rest_completed, 4 room_composed.
    expect(underB.refusal).toMatchObject({
      revision: 4,
      transition: 'room_composed',
      failure: { kind: 'derivation_differs', check: 'advanced room party state' },
    });
    expect(resumeUnder(BUILD_A, bundle(edited))?.name).toBe('SessionIntegrityError');
  });

  it('W33: reaction_preference_changed is a derivation: an edited policy is cross-build under B, integrity under A', () => {
    const edited = e8(recordP(BUILD_A).plain);
    const underB = resumeUnder(BUILD_B, bundle(edited));
    expect(underB?.name).toBe('SessionRecordedByOtherBuildError');
    expect(underB.refusal).toMatchObject({
      revision: 2,
      transition: 'reaction_preference_changed',
      failure: { kind: 'derivation_differs', check: 'reaction preference party state' },
    });
    expect(resumeUnder(BUILD_A, bundle(edited))?.name).toBe('SessionIntegrityError');
  });

  it('W41 (WR11): refusal_handling_changed is replayed: its edited RNG state is an integrity fault under A and B', () => {
    const plain = recordR(BUILD_A).plain;
    expect(plain.map((revision) => revision.transition.kind)).toEqual(['session_started', 'refusal_handling_changed']);
    const edited = e9(plain);
    for (const running of [BUILD_A, BUILD_B]) {
      const error = resumeUnder(running, bundle(edited));
      expect(error?.name).toBe('SessionIntegrityError');
      expect(error.fault).toEqual({
        kind: 'recorded_fact_disagreement', revision: 2, transition: 'refusal_handling_changed',
        check: 'refusal-handling RNG state',
      });
    }
  });

  it('W42 (WR21): every hash failure at decode is SessionIntegrityError hash_mismatch naming its subject', () => {
    const plain = s();
    const imported = (text: string) => thrown(() => importSavedSession(new MemoryBrowserSessionStore(BUILD_B), text));
    const cases = {
      bundle: imported(withFlippedFingerprint(bundle(plain))),
      revision: imported(bundleNotRehashed(e1(plain))),
      branch: imported(bundleNotRehashed(e4(plain))),
      legacy: imported(revisionBundleText(12, lrCross(inputs.fixtures.readText(LR_SQUEEZED_V12)))),
    };
    const typed = (error: any) => ({ name: error?.name, fault: error?.fault });
    expect(Object.fromEntries(Object.entries(cases).map(([key, error]) => [key, typed(error)]))).toEqual({
      bundle: { name: 'SessionIntegrityError', fault: {
        kind: 'hash_mismatch', subject: 'bundle_fingerprint', revision: null, detail: 'Saved VTT session fingerprint mismatch.',
      } },
      revision: { name: 'SessionIntegrityError', fault: {
        kind: 'hash_mismatch', subject: 'revision_checksum', revision: 2, detail: 'VTT session revision checksum mismatch.',
      } },
      branch: { name: 'SessionIntegrityError', fault: {
        kind: 'hash_mismatch', subject: 'branch_rng_fingerprint', revision: 2,
        detail: 'Persisted VTT branch RNG state fingerprint mismatch.',
      } },
      legacy: { name: 'SessionIntegrityError', fault: {
        kind: 'hash_mismatch', subject: 'legacy_revision_checksum', revision: 2, detail: 'VTT session v12 revision checksum mismatch.',
      } },
    });
    expect(cases.revision.message).toBe(
      'Save refused: VTT session revision checksum mismatch. The save was altered or damaged after it was written.',
    );
  });

  it('W43 (WR21): schema and sequence failures at decode are typed with their original detail', () => {
    const plain = s();
    const imported = (edited: Plain[]) => thrown(() => importSavedSession(new MemoryBrowserSessionStore(BUILD_B), bundle(edited)));
    const typed = (error: any) => ({ name: error?.name, fault: error?.fault });
    expect([typed(imported(e10(plain))), typed(imported(e11(plain))), typed(imported(e12(plain)))]).toEqual([
      { name: 'SessionIntegrityError', fault: { kind: 'schema_violation', detail: 'Malformed VTT session revision.' } },
      { name: 'SessionIntegrityError', fault: {
        kind: 'schema_violation', detail: 'Unknown VTT session transition kind transition_from_the_future.',
      } },
      { name: 'SessionIntegrityError', fault: {
        kind: 'sequence_violation', detail: 'Session revision parent is outside the preceding stream.',
      } },
    ]);
  });

  it('CONTROL: E1 rehashed still decodes under B (the refusal is at replay, not at decode)', () => {
    expect(decodeSavedSessionRevisions(bundle(e1(s())), BUILD_B)).toHaveLength(3);
  });
});
