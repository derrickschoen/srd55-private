import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { sha256 } from '../../../src/crypto/sha256';
import { returnedImportRefusal } from '../../../src/vtt/session-lifecycle';
import {
  rewriteRevisionsToCurrent,
  sessionLoadRefusalOf,
  VTT_SESSION_MIGRATION_CHAIN,
  type RevisionContent,
  type RevisionRewriteStep,
  type SessionLoadRefusal,
} from '../../../src/vtt/session-persistence';
import {
  A40,
  B40,
  BUILD_A,
  BUILD_B,
  OVERHANG_V12,
  recordS,
  thrown,
  type Plain,
} from '../../helpers/save-compat-fixtures';
import { stepGoldenFaults } from '../../helpers/session-migration-goldens';
import { testAssertions } from '../../helpers/srd-rule-evidence';
import { existsSync, readFileSync } from '../../helpers/test-filesystem';
import { declareTestInputs } from '../../helpers/test-inputs';

// SAVE-COMPAT C4 (owner D940; D945 Q-W; D947 OQ10; plan §6.7): the typed session migration chain. A revision-rewrite
// step is a pure function of one recorded revision's content, and the chain driver owns everything around it: the
// revision's own checksum is verified first, the build that RECORDED the revision is kept, the next schema version
// and a new checksum are attached, a step's `not_migratable` outcome becomes the typed refusal naming both builds,
// and a step that moves the branch RNG-state fingerprint is a typed program error. Synthetic 13 -> 14 steps stand in
// for the first real step (MOVE-COST's key 13). Every expectation is by hand.

const inputs = declareTestInputs({ fixtures: [OVERHANG_V12] });
/** S recorded by A: revision 1 the migrated root, 2 the move, 3 the end (session schema 13). */
const s = (): Plain[] => recordS(BUILD_A, inputs.fixtures.readText(OVERHANG_V12)).plain;

const NO_GOLDEN = { input: 'tests/fixtures/none.json', output: 'tests/fixtures/none.json' } as const;

/** A 13 -> 14 step that rewrites every revision with `edit` and refuses nothing. */
function rewriting(edit: (content: RevisionContent) => RevisionContent): RevisionRewriteStep<13, never> {
  return {
    kind: 'revision_rewrite', id: 'vtt_session_v13_to_v14', reasons: {}, golden: NO_GOLDEN, notMigratableGoldens: {},
    rewrite: (content) => ({ kind: 'rewritten', content: edit(content) }),
  };
}

const identity = rewriting((content) => content);

/** What the driver must make of a revision a step returns unchanged: schema 14, the recording build kept, rehashed. */
function carried(revision: Plain): Plain {
  const { checksum: _checksum, ...body } = revision;
  const next = { ...body, schemaVersion: 14 };
  return { ...next, checksum: sha256(canonicalJson(next)) };
}

describe('SAVE-COMPAT C4: the typed migration chain', () => {
  it('W20: a rewrite keeps the build that recorded each revision, while another build runs the migration', () => {
    const plain = s();
    const rewritten = rewriteRevisionsToCurrent(plain, BUILD_B, { 13: identity }, 14) as readonly Plain[];
    expect(rewritten.map((revision) => revision.recordedBy)).toEqual([BUILD_A, BUILD_A, BUILD_A]);
    expect(rewritten).toEqual(plain.map(carried));
  });

  it('W21: the golden harness holds a step to its golden output byte for byte (a key-order difference fails)', () => {
    const [root] = s();
    const input = `${canonicalJson(root)}\n`;
    const exact = `${canonicalJson(carried(root!))}\n`;
    const reordered = `${JSON.stringify(Object.fromEntries(Object.entries(JSON.parse(exact) as Plain).reverse()))}\n`;
    expect(JSON.parse(reordered)).toEqual(JSON.parse(exact));
    const step = (output: string): RevisionRewriteStep<13, never> => ({
      ...identity, golden: { input: 'tests/fixtures/golden.in.json', output },
    });
    const files = new Map([['tests/fixtures/golden.in.json', input], ['exact', exact], ['reordered', reordered]]);
    const read = (path: string): string => files.get(path) ?? '';
    expect(stepGoldenFaults(step('exact'), 13, read, BUILD_B)).toEqual([]);
    expect(stepGoldenFaults(step('reordered'), 13, read, BUILD_B)).toEqual([
      'reordered is not, byte for byte, tests/fixtures/golden.in.json rewritten by vtt_session_v13_to_v14',
    ]);
  });

  it('W22: every legacy bundle step names tests that exist and run', () => {
    const legacy = Object.values(VTT_SESSION_MIGRATION_CHAIN).flatMap((step) => step.kind === 'legacy_bundle' ? [step] : []);
    expect(legacy.map((step) => step.from)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    for (const step of legacy) {
      for (const reference of step.witnessedBy) {
        const [file, title] = reference.split('::') as [string, string];
        expect(existsSync(file), reference).toBe(true);
        const found = testAssertions(readFileSync(file, 'utf8'), title);
        expect({ reference, found: found.found, runs: found.runs }).toEqual({ reference, found: true, runs: true });
      }
    }
  });

  it('W55 (D945 Q-W, D939): a step that cannot carry a turn refuses the save typed, naming both builds', () => {
    const reasonText = 'this synthetic effect has no schema-14 form';
    const step: RevisionRewriteStep<13, 'synthetic_unresolvable'> = {
      kind: 'revision_rewrite', id: 'vtt_session_v13_to_v14', golden: NO_GOLDEN,
      reasons: { synthetic_unresolvable: reasonText },
      notMigratableGoldens: {
        synthetic_unresolvable: { input: 'tests/fixtures/none.json', reason: 'synthetic_unresolvable', path: 'encounterState.effects[0]' },
      },
      rewrite: (content) => content.revision === 2
        ? { kind: 'not_migratable', reason: 'synthetic_unresolvable', path: 'encounterState.effects[0]' }
        : { kind: 'rewritten', content },
    };
    const error = thrown(() => rewriteRevisionsToCurrent(s(), BUILD_B, { 13: step }, 14));
    expect(error?.name).toBe('SessionNotMigratableError');
    const refusal = {
      revision: 2, fromSchemaVersion: 13, toSchemaVersion: 14, step: 'vtt_session_v13_to_v14', reason: 'synthetic_unresolvable',
      reasonText, path: 'encounterState.effects[0]', recordedBy: BUILD_A, running: BUILD_B,
    };
    expect(error.refusal).toEqual(refusal);
    // [FS-a] Both builds, always, and the frozen fragments.
    expect(error.message).toContain(`was recorded by engine build ${A40}`);
    expect(error.message).toContain(`engine build ${B40}, the build running now, cannot carry it to schema 14`);
    expect(error.message).toContain(reasonText);
    expect(error.message).toContain('The save is not changed.');
    expect(error.message).not.toMatch(/tamper|corrupt|checksum/iu);
    expect(sessionLoadRefusalOf(error)).toEqual({ kind: 'not_migratable', refusal, message: error.message });
  });

  it('W56 (D947 SQ6): a lifecycle import returns the cross-build and not-migratable refusals and rethrows the others', () => {
    const refusals: readonly SessionLoadRefusal[] = [
      {
        kind: 'recorded_by_other_build', message: 'cross-build',
        refusal: {
          revision: 2, transition: 'reducer_applied', relation: { kind: 'unrecorded', recorded: BUILD_A, running: BUILD_B },
          failure: { kind: 'derivation_differs', check: 'reducer events' },
        },
      },
      {
        kind: 'not_migratable', message: 'not migratable',
        refusal: {
          revision: 2, fromSchemaVersion: 13, toSchemaVersion: 14, step: 'vtt_session_v13_to_v14', reason: 'r', reasonText: 't',
          path: 'p', recordedBy: BUILD_A, running: BUILD_B,
        },
      },
      { kind: 'integrity', fault: { kind: 'schema_violation', detail: 'd' }, message: 'integrity' },
      { kind: 'load_failed', errorName: 'Error', message: 'load failed' },
    ];
    expect(refusals.map((refusal) => returnedImportRefusal(refusal))).toEqual([refusals[0], refusals[1], null, null]);
  });

  it('W58 [FS-b] (MOVE-COST S12, D947 OQ10): a step that moves the branch RNG-state fingerprint is a typed program error', () => {
    const plain = s();
    const stored = String(plain[0]!.branchRngStateFingerprint);
    // (a) A fingerprinted field of the mechanical state (the round): the stored field is untouched, so the rewritten
    // state no longer recomputes to it. Revision 1 is rewritten first.
    const recomputed = thrown(() => rewriteRevisionsToCurrent(plain, BUILD_B, {
      13: rewriting((content) => ({ ...content, encounterState: { ...(content.encounterState as Plain), round: (content.encounterState as Plain).round + 1 } })),
    }, 14));
    expect(recomputed?.name).toBe('RevisionRewriteStepError');
    expect(recomputed.violation).toMatchObject({
      kind: 'branch_rng_fingerprint_changed', step: 'vtt_session_v13_to_v14', revision: 1, subject: 'recomputed', expected: stored,
    });
    expect(recomputed.violation.actual).toMatch(/^[0-9a-f]{64}$/u);
    expect(recomputed.violation.actual).not.toBe(stored);
    // It is a defect of the step, not of the save: every load surface shows it as load_failed, under its own name.
    expect(sessionLoadRefusalOf(recomputed)).toEqual({
      kind: 'load_failed', errorName: 'RevisionRewriteStepError', message: `Save could not be loaded: RevisionRewriteStepError: ${String(recomputed.message)}`,
    });
    // (b) The stored field itself rewritten, the state left alone.
    const storedField = thrown(() => rewriteRevisionsToCurrent(plain, BUILD_B, {
      13: rewriting((content) => ({ ...content, branchRngStateFingerprint: 'f'.repeat(64) })),
    }, 14));
    expect(storedField?.name).toBe('RevisionRewriteStepError');
    expect(storedField.violation).toEqual({
      kind: 'branch_rng_fingerprint_changed', step: 'vtt_session_v13_to_v14', revision: 1, subject: 'stored_field',
      expected: stored, actual: 'f'.repeat(64),
    });
    // (c) CONTROL: a field the mechanical state leaves out (roll visibility) changes nothing the fingerprint reads.
    const toggled = (content: RevisionContent): RevisionContent => {
      const state = content.encounterState as Plain;
      return { ...content, encounterState: { ...state, hiddenRolls: (state.hiddenRolls as string[]).length === 0 ? ['death_saves'] : [] } };
    };
    const rewritten = rewriteRevisionsToCurrent(plain, BUILD_B, { 13: rewriting(toggled) }, 14) as readonly Plain[];
    expect(rewritten.map((revision) => revision.branchRngStateFingerprint)).toEqual(plain.map((revision) => revision.branchRngStateFingerprint));
    expect(rewritten.map((revision) => revision.encounterState.hiddenRolls)).not.toEqual(plain.map((revision) => revision.encounterState.hiddenRolls));
  });
});
