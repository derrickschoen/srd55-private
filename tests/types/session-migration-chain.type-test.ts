/**
 * SAVE-COMPAT C4 (owner D940; plan §6.7): the session migration chain is a keyed record checked against every schema
 * version it must carry, and a revision-rewrite step states its goldens and the text of every reason it can refuse
 * with. Compiled by `tsc -b` (tsconfig.node.json includes tests): each @ts-expect-error is a program that must not
 * compile; if a type stopped biting, the directive would be unused and tsc fails with TS2578.
 */
import {
  VTT_SESSION_MIGRATION_CHAIN,
  type RevisionContent,
  type RevisionRewriteStep,
  type VttSessionMigrationChainShape,
} from '../../src/vtt/session-persistence';

const { 12: _bumpOrArchive, ...withoutTwelve } = VTT_SESSION_MIGRATION_CHAIN;
// @ts-expect-error W18: a chain without the step from schema 12 does not carry every save to the current schema.
export const missingTwelve: VttSessionMigrationChainShape = withoutTwelve;
export const complete: VttSessionMigrationChainShape = VTT_SESSION_MIGRATION_CHAIN;

const golden = { input: 'tests/fixtures/in.json', output: 'tests/fixtures/out.json' } as const;
const same = (content: RevisionContent) => ({ kind: 'rewritten', content }) as const;

// @ts-expect-error W19: a rewrite step without its golden pair.
export const noGolden: RevisionRewriteStep<13, never> = {
  kind: 'revision_rewrite', id: 'vtt_session_v13_to_v14', reasons: {}, notMigratableGoldens: {}, rewrite: same,
};

export const reasonWithoutText: RevisionRewriteStep<13, 'x'> = {
  kind: 'revision_rewrite', id: 'vtt_session_v13_to_v14', golden,
  // @ts-expect-error W19b: a reason the step can refuse with, without its refusal text.
  reasons: {},
  notMigratableGoldens: { x: { input: 'tests/fixtures/x.json', reason: 'x', path: 'encounterState' } },
  rewrite: same,
};

export const reasonWithoutGolden: RevisionRewriteStep<13, 'x'> = {
  kind: 'revision_rewrite', id: 'vtt_session_v13_to_v14', golden, reasons: { x: 'The x cannot be carried.' },
  // @ts-expect-error W19b: a reason the step can refuse with, without its not-migratable golden.
  notMigratableGoldens: {},
  rewrite: same,
};

export const goldenOfAnotherReason: RevisionRewriteStep<13, 'x' | 'y'> = {
  kind: 'revision_rewrite', id: 'vtt_session_v13_to_v14', golden, reasons: { x: 'x', y: 'y' },
  notMigratableGoldens: {
    x: { input: 'tests/fixtures/x.json', reason: 'x', path: 'encounterState' },
    // @ts-expect-error W19b: each golden is refused with its own reason.
    y: { input: 'tests/fixtures/y.json', reason: 'x', path: 'encounterState' },
  },
  rewrite: same,
};

// Control: a complete step compiles.
export const completeStep: RevisionRewriteStep<13, 'x'> = {
  kind: 'revision_rewrite', id: 'vtt_session_v13_to_v14', golden, reasons: { x: 'The x cannot be carried.' },
  notMigratableGoldens: { x: { input: 'tests/fixtures/x.json', reason: 'x', path: 'encounterState' } },
  rewrite: (content) => (content.x === undefined ? same(content) : { kind: 'not_migratable', reason: 'x', path: 'x' }),
};
