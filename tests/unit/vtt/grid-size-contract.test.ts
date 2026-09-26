import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import { EncounterRuleError } from '../../../src/combat/encounter-rule-error';
import type { GridBounds } from '../../../src/combat/grid';
import { GridSizeError, MAX_GRID_CELLS } from '../../../src/combat/grid-size';
import { mulberry32 } from '../../../src/combat/random';
import { encounterBranchId, encounterSessionId } from '../../../src/combat/values';
import { sha256 } from '../../../src/crypto/sha256';
import { decodeEncounterStateV1 } from '../../../src/vtt/encounter-state-codec';
import type { RolloutInputCapture } from '../../../src/vtt/experiment-telemetry';
import { reconstructEncounterState } from '../../../src/vtt/regret';
import { replayBundle, ReplayDivergenceError, type ReplayBundle } from '../../../src/vtt/replay';
import { ROOM_GRID_DIMENSIONS } from '../../../src/vtt/room-generator';
import { recordScriptedReferenceSkirmish } from '../../../src/vtt/scripted-skirmish';
import {
  EncounterSessionJournal,
  importSavedSession,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
} from '../../../src/vtt/session-persistence';
import { declareTestInputs } from '../../helpers/test-inputs';
import { placedToken, playerProfile } from '../combat/fixtures';

// PERF-02 board3 fix 1: the engine grid-size contract (src/combat/grid-size.ts). Every dense
// per-cell structure is sized by columns x rows, so a grid enters the engine only through a check
// that it has at most MAX_GRID_CELLS cells: createEncounter and every decoder of stored or
// transmitted state. Witnesses sit exactly at the limit and one cell past it.

const inputs = declareTestInputs({ fixtures: ['tests/fixtures/arena-basis-brutal/seed-6203001.json'] });

/** 1,024 x 1,024: exactly MAX_GRID_CELLS. */
const AT_LIMIT: GridBounds = { columns: 1_024, rows: 1_024 };
/** 1,048,577 = 2^20 + 1 = 17 x 61,681: one cell past the limit, and no side longer than the square's. */
const PAST_LIMIT: GridBounds = { columns: 17, rows: 61_681 };
/** A one-row grid at the limit: the contract counts cells, not sides. */
const THIN_AT_LIMIT: GridBounds = { columns: 1_048_576, rows: 1 };

function overLimit(error: unknown): boolean {
  return error instanceof GridSizeError && error instanceof EncounterRuleError &&
    error.problem === 'over_max_cells' && error.refusalClass === 'validation' &&
    error.columns === PAST_LIMIT.columns && error.rows === PAST_LIMIT.rows;
}

function thrown(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  return undefined;
}

/** The value `action` returns, asserting that it does not throw (a refusal here is an assertion failure). */
function accepted<T>(action: () => T): T {
  let value: T | undefined;
  expect(() => { value = action(); }).not.toThrow();
  return value as T;
}

function oneCombatant(bounds: GridBounds): EncounterState {
  const player = playerProfile('grid-size-player');
  return createEncounter({ bounds, combatants: [player], tokens: [placedToken(player, 0)] });
}

describe('engine grid-size contract', () => {
  it('is 1,024 x 1,024 cells, at least 100 times the largest grid the room generator can draw', () => {
    expect(MAX_GRID_CELLS).toBe(1_048_576);
    expect(PAST_LIMIT.columns * PAST_LIMIT.rows).toBe(MAX_GRID_CELLS + 1);
    const largestRoom = Math.max(...ROOM_GRID_DIMENSIONS) ** 2;
    expect(largestRoom).toBe(576);
    expect(MAX_GRID_CELLS).toBeGreaterThanOrEqual(100 * largestRoom);
  });

  it('createEncounter accepts a grid of exactly MAX_GRID_CELLS, square or one row, and refuses one cell more', () => {
    expect(accepted(() => oneCombatant(AT_LIMIT)).bounds).toEqual(AT_LIMIT);
    expect(accepted(() => oneCombatant(THIN_AT_LIMIT)).bounds).toEqual(THIN_AT_LIMIT);
    expect(overLimit(thrown(() => oneCombatant(PAST_LIMIT)))).toBe(true);
    const fractional = thrown(() => oneCombatant({ columns: 2.5, rows: 2 }));
    expect(fractional instanceof GridSizeError && fractional.problem === 'not_positive_whole').toBe(true);
  });

  it('the encounter-state codec decodes a stored state at the limit and refuses one cell more', () => {
    const envelope = JSON.parse(inputs.fixtures.readText('tests/fixtures/arena-basis-brutal/seed-6203001.json')) as {
      readonly encounter: { readonly state: Record<string, unknown> };
    };
    const legacy = envelope.encounter.state;
    // A session snapshot is the complete state the legacy decoder normalizes the basis to.
    const session = JSON.parse(canonicalJson(decodeEncounterStateV1(legacy, 'legacy_basis'))) as Record<string, unknown>;
    for (const [mode, state] of [['legacy_basis', legacy], ['session', session]] as const) {
      expect(accepted(() => decodeEncounterStateV1({ ...state, bounds: AT_LIMIT }, mode)).bounds, mode).toEqual(AT_LIMIT);
      expect(overLimit(thrown(() => decodeEncounterStateV1({ ...state, bounds: PAST_LIMIT }, mode))), mode).toBe(true);
    }
  });

  it('a saved session imports at the limit and is refused one cell more', () => {
    const exported = (state: EncounterState): string => {
      const journal = EncounterSessionJournal.create({
        sessionId: encounterSessionId('session:grid-size-contract'),
        branchId: encounterBranchId('branch:main'),
        encounterState: state,
        coordinatorState: {
          requestSequence: 1, pendingRequest: null, pendingCommand: null, continuation: { kind: 'idle' }, pause: null,
        },
        controllers: [],
        rng: mulberry32(6_203_001),
        store: new MemoryBrowserSessionStore(),
        mirror: new MemoryMirrorSink(),
      });
      return journal.export();
    };
    // Both states are spread from a small encounter, so only the decoder is under test here.
    const small = oneCombatant({ columns: 6, rows: 2 });
    const atLimit = { ...small, bounds: AT_LIMIT };
    const imported = new MemoryBrowserSessionStore();
    const sessionId = accepted(() => importSavedSession(imported, exported(atLimit)));
    expect(imported.revisions(sessionId).at(-1)?.encounterState.bounds).toEqual(AT_LIMIT);
    const pastLimit = { ...small, bounds: PAST_LIMIT };
    expect(overLimit(thrown(() => importSavedSession(new MemoryBrowserSessionStore(), exported(pastLimit))))).toBe(true);
  });

  it('a rollout capture reconstructs at the limit and is refused one cell more', () => {
    const capture = (state: EncounterState): RolloutInputCapture => {
      const serializedEncounterState = canonicalJson(state);
      return {
        logicalCallId: 'grid-size-contract:call:0',
        stateHash: sha256(serializedEncounterState),
        legalActionSetHash: sha256(canonicalJson(['grid-size-contract'])),
        selectedAction: [],
        input: {},
        serializedEncounterState,
        candidateTurnK: 1,
        candidateTurns: [],
      };
    };
    const small = oneCombatant({ columns: 6, rows: 2 });
    expect(accepted(() => reconstructEncounterState(capture({ ...small, bounds: AT_LIMIT }))).bounds).toEqual(AT_LIMIT);
    expect(overLimit(thrown(() => reconstructEncounterState(capture({ ...small, bounds: PAST_LIMIT }))))).toBe(true);
  });

  it('a replay bundle whose first state is one cell past the limit is refused before any replay check', () => {
    const { bundle } = recordScriptedReferenceSkirmish();
    const candidate = structuredClone(bundle) as unknown as {
      revisions: Array<{ revision: { encounterState: { bounds: GridBounds; config: { initiativeMode: string } } } }>;
    };
    const first = candidate.revisions[0]!.revision.encounterState;
    first.bounds = PAST_LIMIT;
    // Also break the first replay check (the bundle's configuration), so the refusal must come first.
    first.config = { initiativeMode: bundle.encounterConfig.initiativeMode === 'shared_enemy' ? 'per_combatant' : 'shared_enemy' };
    expect(overLimit(thrown(() => replayBundle(candidate as unknown as ReplayBundle)))).toBe(true);
    first.bounds = AT_LIMIT;
    expect(thrown(() => replayBundle(candidate as unknown as ReplayBundle))).toBeInstanceOf(ReplayDivergenceError);
  });

  it('a replay bundle is checked at every revision: its last state one cell past the limit is refused before that revision replays', () => {
    const { bundle } = recordScriptedReferenceSkirmish();
    const candidate = structuredClone(bundle) as unknown as {
      revisions: Array<{ revision: { encounterState: { bounds: GridBounds; config: { initiativeMode: string } } } }>;
    };
    const lastIndex = candidate.revisions.length - 1;
    expect(lastIndex).toBeGreaterThan(1);
    const last = candidate.revisions[lastIndex]!.revision.encounterState;
    last.bounds = PAST_LIMIT;
    // Also break that revision's first replay check, so the refusal must come first; every earlier revision replays.
    last.config = { initiativeMode: bundle.encounterConfig.initiativeMode === 'shared_enemy' ? 'per_combatant' : 'shared_enemy' };
    expect(overLimit(thrown(() => replayBundle(candidate as unknown as ReplayBundle)))).toBe(true);
    last.bounds = AT_LIMIT;
    const diverged = thrown(() => replayBundle(candidate as unknown as ReplayBundle));
    expect(diverged instanceof ReplayDivergenceError && diverged.recordIndex === lastIndex && diverged.field === 'encounterConfig.initiativeMode',
      String(diverged)).toBe(true);
  });
});
