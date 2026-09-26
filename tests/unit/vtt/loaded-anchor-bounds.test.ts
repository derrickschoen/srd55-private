import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { combatantSpace, createEncounter, type EncounterState } from '../../../src/combat/encounter';
import { EncounterRuleError } from '../../../src/combat/encounter-rule-error';
import { OffGridAnchorError, type GridCell } from '../../../src/combat/grid';
import { mulberry32 } from '../../../src/combat/random';
import { combatantId, encounterBranchId, encounterSessionId, feet, type CombatantId } from '../../../src/combat/values';
import { sha256 } from '../../../src/crypto/sha256';
import { decodeArenaBasisEnvelopeV1 } from '../../../src/vtt/arena-fixture';
import { decodeEncounterStateV1, type EncounterStateDecodeMode } from '../../../src/vtt/encounter-state-codec';
import type { RolloutInputCapture } from '../../../src/vtt/experiment-telemetry';
import { reconstructEncounterState } from '../../../src/vtt/regret';
import { regretTurnLegalActions } from '../../../src/vtt/regret/legal-actions';
import { REFERENCE_FIGHTER_ID, referenceEncounterSetup, referenceTurnLegalActions } from '../../../src/vtt/reference-encounter';
import { replayBundle, type ReplayBundle } from '../../../src/vtt/replay';
import { recordScriptedReferenceSkirmish } from '../../../src/vtt/scripted-skirmish';
import {
  EncounterSessionJournal,
  importSavedSession,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
} from '../../../src/vtt/session-persistence';
import { declareTestInputs } from '../../helpers/test-inputs';

// PERF-02 board3 fix 1 (codex r1 P1; owner D895: a malformed position is unconstructible through an
// in-bounds type checked at decode). Every decoder that turns stored or transmitted bytes into an
// EncounterState checks each board token's anchor with the boardCell bounds check and refuses an
// off-grid one with OffGridAnchorError, instead of loading an actor the movement callers would
// silently strand. An in-bounds anchor whose footprint reaches past the grid stays legal.

const BRUTAL = 'tests/fixtures/arena-basis-brutal/seed-6203001.json';
const HUGE_OVERHANG = 'tests/fixtures/arena-basis-brutal/seed-6203009.json';
const CHALLENGE = 'tests/fixtures/arena-basis-challenge/seed-5831001.json';
const inputs = declareTestInputs({ fixtures: [BRUTAL, HUGE_OVERHANG, CHALLENGE] });

type JsonState = Record<string, unknown> & { readonly tokens: readonly Record<string, unknown>[] };

function fixtureState(path: typeof BRUTAL | typeof HUGE_OVERHANG | typeof CHALLENGE): JsonState {
  return (JSON.parse(inputs.fixtures.readText(path)) as { readonly encounter: { readonly state: JsonState } }).encounter.state;
}

/** `state` with token `index` moved to `position`; nothing else changes. */
function moved<State extends { readonly tokens: readonly object[] }>(state: State, index: number, position: GridCell): State {
  return { ...state, tokens: state.tokens.map((token, at) => at === index ? { ...token, position } : token) };
}

/** The value `action` returns, asserting that it does not throw (a refusal here is an assertion failure). */
function accepted<T>(action: () => T): T {
  let value: T | undefined;
  expect(() => { value = action(); }).not.toThrow();
  return value as T;
}

function thrown(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  return undefined;
}

/** The refusal names the anchor it refused and the grid it was checked against. */
function offGrid(error: unknown, label: string, position: GridCell, columns: number, rows: number): boolean {
  return error instanceof OffGridAnchorError && error instanceof EncounterRuleError && error.refusalClass === 'validation' &&
    error.label === label && canonicalJson(error.position) === canonicalJson(position) &&
    error.bounds.columns === columns && error.bounds.rows === rows;
}

function referenceWithFighter(position: GridCell): EncounterState {
  const created = createEncounter(referenceEncounterSetup());
  const index = created.tokens.findIndex((token) => token.combatantId === REFERENCE_FIGHTER_ID);
  return moved({
    ...created,
    combatants: created.combatants.map((combatant) => combatant.profile.id === REFERENCE_FIGHTER_ID
      ? { ...combatant, turn: { ...combatant.turn, movement: { ...combatant.turn.movement, remaining: feet(30) } } }
      : combatant),
  }, index, position);
}

describe('loaded token anchors are decoded against the grid', () => {
  it('the codec refuses an anchor one column or one row past the grid, in every mode, and keeps the last cell', () => {
    // seed-6203001 is a 19 x 17 legacy basis; token 0 is the Fighter at (1, 2).
    const legacy = fixtureState(BRUTAL);
    expect(legacy['bounds']).toEqual({ columns: 19, rows: 17 });
    const session = JSON.parse(canonicalJson(decodeEncounterStateV1(legacy, 'legacy_basis'))) as JsonState;
    // The challenge room is 15 x 12; its token 0, the Fighter, stands at (9, 5).
    const challenge = fixtureState(CHALLENGE);
    const cases: readonly (readonly [EncounterStateDecodeMode, JsonState, number, number])[] = [
      ['legacy_basis', legacy, 19, 17], ['session', session, 19, 17], ['challenge', challenge, 15, 12],
    ];
    for (const [mode, state, columns, rows] of cases) {
      for (const position of [{ column: columns, row: 0 }, { column: 0, row: rows }]) {
        const error = thrown(() => decodeEncounterStateV1(moved(state, 0, position), mode));
        expect(offGrid(error, 'state.tokens[0] anchor', position, columns, rows), `${mode} ${canonicalJson(position)}: ${String(error)}`)
          .toBe(true);
      }
    }
    const lastCell = { column: 18, row: 16 };
    expect(accepted(() => decodeEncounterStateV1(moved(legacy, 0, lastCell), 'legacy_basis')).tokens[0]?.position).toEqual(lastCell);
    expect(accepted(() => decodeEncounterStateV1(moved(session, 0, lastCell), 'session')).tokens[0]?.position).toEqual(lastCell);
  });

  it('keeps a Huge creature whose in-bounds anchor lets its footprint reach past the grid (seed-6203009)', () => {
    const raw = JSON.parse(inputs.fixtures.readText(HUGE_OVERHANG)) as unknown;
    const state = accepted(() => decodeArenaBasisEnvelopeV1(raw, { mode: 'legacy_basis' })).encounter.state;
    const monster = combatantId('combatant:generated-6203009-monster-3');
    expect(state.bounds).toEqual({ columns: 19, rows: 20 });
    expect(state.tokens.find((token) => token.combatantId === monster)?.position).toEqual({ column: 17, row: 3 });
    expect(state.combatants.find((entry) => entry.profile.id === monster)?.profile.rules.sizeCategory).toBe('Huge');
    // Huge is 3 x 3 (SRD 5.2.1 Creature Size table): columns 17-19, rows 3-5. Column 19 is off the grid.
    expect(combatantSpace(state, monster).cells.filter((cell) => cell.column === 19))
      .toEqual([{ column: 19, row: 3 }, { column: 19, row: 4 }, { column: 19, row: 5 }]);
    const index = (raw as { encounter: { state: JsonState } }).encounter.state.tokens
      .findIndex((token) => token['combatantId'] === monster);
    const shifted = thrown(() => decodeArenaBasisEnvelopeV1({
      ...(raw as Record<string, unknown>),
      encounter: { ...(raw as { encounter: object }).encounter, state: moved((raw as { encounter: { state: JsonState } }).encounter.state, index, { column: 19, row: 3 }) },
    }, { mode: 'legacy_basis' }));
    expect(offGrid(shifted, `state.tokens[${String(index)}] anchor`, { column: 19, row: 3 }, 19, 20), String(shifted)).toBe(true);
  });

  it('a saved session with an off-grid anchor is refused at import', () => {
    const exported = (state: EncounterState): string => EncounterSessionJournal.create({
      sessionId: encounterSessionId('session:loaded-anchor-bounds'),
      branchId: encounterBranchId('branch:main'),
      encounterState: state,
      coordinatorState: {
        requestSequence: 1, pendingRequest: null, pendingCommand: null, continuation: { kind: 'idle' }, pause: null,
      },
      controllers: [],
      rng: mulberry32(6_203_001),
      store: new MemoryBrowserSessionStore(),
      mirror: new MemoryMirrorSink(),
    }).export();
    const created = createEncounter(referenceEncounterSetup());
    const edge = moved(created, 0, { column: 9, row: 6 });
    const imported = new MemoryBrowserSessionStore();
    const sessionId = accepted(() => importSavedSession(imported, exported(edge)));
    expect(imported.revisions(sessionId).at(-1)?.encounterState.tokens[0]?.position).toEqual({ column: 9, row: 6 });
    // Only a decoder can meet this state: createEncounter refuses it too (last test).
    const error = thrown(() => importSavedSession(new MemoryBrowserSessionStore(), exported(moved(created, 0, { column: 10, row: 6 }))));
    expect(offGrid(error, 'Persisted encounter tokens[0] anchor', { column: 10, row: 6 }, 10, 7), String(error)).toBe(true);
  });

  it('a rollout capture and a replay bundle with an off-grid anchor are refused', () => {
    const created = createEncounter(referenceEncounterSetup());
    const capture = (state: EncounterState): RolloutInputCapture => {
      const serializedEncounterState = canonicalJson(state);
      return {
        logicalCallId: 'loaded-anchor-bounds:call:0',
        stateHash: sha256(serializedEncounterState),
        legalActionSetHash: sha256(canonicalJson(['loaded-anchor-bounds'])),
        selectedAction: [],
        input: {},
        serializedEncounterState,
        candidateTurnK: 1,
        candidateTurns: [],
      };
    };
    expect(accepted(() => reconstructEncounterState(capture(moved(created, 1, { column: 0, row: 6 })))).tokens[1]?.position)
      .toEqual({ column: 0, row: 6 });
    const rollout = thrown(() => reconstructEncounterState(capture(moved(created, 1, { column: 0, row: 7 }))));
    expect(offGrid(rollout, 'Rollout capture loaded-anchor-bounds:call:0 tokens[1] anchor', { column: 0, row: 7 }, 10, 7), String(rollout))
      .toBe(true);

    const { bundle } = recordScriptedReferenceSkirmish();
    const candidate = structuredClone(bundle) as unknown as {
      revisions: Array<{ revision: { encounterState: {
        bounds: { columns: number; rows: number }; tokens: object[]; config: { initiativeMode: string };
      } } }>;
    };
    const first = candidate.revisions[0]!.revision.encounterState;
    const offBoard = { column: first.bounds.columns, row: 0 };
    // Also break the first replay check (the bundle's configuration), so the refusal must come first.
    candidate.revisions[0]!.revision.encounterState = {
      ...moved(first, 0, offBoard),
      config: { initiativeMode: bundle.encounterConfig.initiativeMode === 'shared_enemy' ? 'per_combatant' : 'shared_enemy' },
    };
    const replay = thrown(() => replayBundle(candidate as unknown as ReplayBundle));
    expect(offGrid(replay, 'Replay revision 1 tokens[0] anchor', offBoard, first.bounds.columns, first.bounds.rows), String(replay))
      .toBe(true);
  });

  it('createEncounter and the movement callers refuse an off-grid actor loudly instead of listing no moves', () => {
    const setup = referenceEncounterSetup();
    const created = thrown(() => createEncounter({
      ...setup,
      tokens: setup.tokens.map((token) => token.combatantId === REFERENCE_FIGHTER_ID ? { ...token, position: { column: 10, row: 3 } } : token),
    }));
    expect(offGrid(created, 'Token token:fighter anchor', { column: 10, row: 3 }, 10, 7), String(created)).toBe(true);

    // In memory, a state can still be spread off the grid; a caller must not answer it with "no moves".
    const inside = referenceWithFighter({ column: 9, row: 3 });
    const outside = referenceWithFighter({ column: 10, row: 3 });
    const fighter: CombatantId = REFERENCE_FIGHTER_ID;
    expect(accepted(() => referenceTurnLegalActions(inside, fighter)).actions.filter((action) => action.type === 'move')).toHaveLength(5);
    const reference = thrown(() => referenceTurnLegalActions(outside, fighter));
    expect(offGrid(reference, 'Combatant combatant:fighter anchor', { column: 10, row: 3 }, 10, 7), String(reference)).toBe(true);
    const regret = thrown(() => regretTurnLegalActions(outside, fighter));
    expect(offGrid(regret, 'Combatant combatant:fighter anchor', { column: 10, row: 3 }, 10, 7), String(regret)).toBe(true);
  });
});
