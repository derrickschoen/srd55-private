import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { CreatureSizeRuleError } from '../../../src/combat/combat-rules';
import { combatToken } from '../../../src/combat/combatant';
import { EncounterRuleError } from '../../../src/combat/encounter-rule-error';
import { OffGridAnchorError, OffGridBodyError, type GridCell } from '../../../src/combat/grid';
import type { CombatToken } from '../../../src/combat/combatant';
import { mulberry32 } from '../../../src/combat/random';
import { combatantId, encounterBranchId, encounterSessionId, feet, type CombatantId } from '../../../src/combat/values';
import { sha256 } from '../../../src/crypto/sha256';
import { decodeArenaBasisEnvelopeV1 } from '../../../src/vtt/arena-fixture';
import { decodeEncounterStateV1, type EncounterStateDecodeMode } from '../../../src/vtt/encounter-state-codec';
import type { RolloutInputCapture } from '../../../src/vtt/experiment-telemetry';
import { reconstructEncounterState } from '../../../src/vtt/regret';
import { regretTurnLegalActions } from '../../../src/vtt/regret/legal-actions';
import {
  REFERENCE_FIGHTER_ID,
  REFERENCE_MONSTER_ID,
  referenceEncounterSetup,
  referenceTurnLegalActions,
} from '../../../src/vtt/reference-encounter';
import { decodeReplayBundle, exportReplayBundle, replayBundle, type ReplayBundle } from '../../../src/vtt/replay';
import { canonicalEncounterState, EngineRoundSession } from '../../../src/vtt/engine-round-session';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import { adjacentOpenCell, recordScriptedReferenceSkirmish } from '../../../src/vtt/scripted-skirmish';
import {
  loadExternalPartyPack,
  loadedPartyTurnLegalActions,
  type ExternalPartyPackV2,
  type LoadedPartyMember,
} from '../../../src/vtt/party-pack';
import { composeStoredCharacterEncounter } from '../../../src/vtt/stored-character-encounter';
import {
  EncounterSessionJournal,
  importSavedSession,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
} from '../../../src/vtt/session-persistence';
import { declareTestInputs } from '../../helpers/test-inputs';
import { onBoard } from '../../helpers/board-cell';
import { statedPlainMemberFields } from '../../helpers/party-pack-stated';
import { monsterProfile, playerProfile } from '../combat/fixtures';

// PERF-02 board3 fix 1 (codex r1 P1; owner D895: a malformed position is unconstructible through an
// in-bounds type checked at decode). Every decoder that turns stored or transmitted bytes into an
// EncounterState checks each board token's anchor with the boardCell bounds check and refuses an
// off-grid one with OffGridAnchorError, instead of loading an actor the movement callers would
// silently strand. An in-bounds anchor whose footprint reaches past the grid stays legal.
//
// Fix 2 (codex r2 P2): a token anchor is a BoardCell in the EncounterState type, board and absent
// tokens alike, and the decoders install the minted cells rather than casting the loaded ones. So
// this file builds an off-grid state only three ways: as JSON (what a decoder meets), by an explicit
// cast (a corrupted save the exporter itself must checksum), or by spreading a state onto a smaller
// grid (the one hole the brand leaves, since it does not name its grid; the callers re-check).

const BRUTAL = 'tests/fixtures/arena-basis-brutal/seed-6203001.json';
const HUGE_OVERHANG = 'tests/fixtures/arena-basis-brutal/seed-6203009.json';
const CHALLENGE = 'tests/fixtures/arena-basis-challenge/seed-5831001.json';
const inputs = declareTestInputs({ fixtures: [BRUTAL, HUGE_OVERHANG, CHALLENGE] });

type JsonState = Record<string, unknown> & { readonly tokens: readonly Record<string, unknown>[] };

function fixtureState(path: typeof BRUTAL | typeof HUGE_OVERHANG | typeof CHALLENGE): JsonState {
  return (JSON.parse(inputs.fixtures.readText(path)) as { readonly encounter: { readonly state: JsonState } }).encounter.state;
}

/** JSON `state` with token `index` moved to `position`; nothing else changes. Not for an EncounterState. */
function moved<State extends Readonly<Record<string, unknown>> & { readonly tokens: readonly object[] }>(
  state: State, index: number, position: GridCell,
): State {
  return { ...state, tokens: state.tokens.map((token, at) => at === index ? { ...token, position } : token) };
}

/** A state whose token `index` stands on `position` of its own grid: the anchor is minted, so no cast. */
function anchoredAt(state: EncounterState, index: number, position: GridCell): EncounterState {
  return { ...state, tokens: state.tokens.map((token, at) => at === index ? { ...token, position: onBoard(state.bounds, position) } : token) };
}

/**
 * A corrupted state: token `index` forced to an off-grid `position`. The EncounterState type refuses
 * it, so only this cast can build it; the exporter checksums it like a real save.
 */
function forcedOffGrid(state: EncounterState, index: number, position: GridCell, key: 'tokens' | 'absentTokens' = 'tokens'): EncounterState {
  const tokens = (key === 'tokens' ? state.tokens : state.absentTokens ?? [])
    .map((token, at) => at === index ? { ...token, position: position as CombatToken['position'] } : token);
  return { ...state, [key]: tokens };
}

/** Canonical JSON of `state`, as a decoder receives it. */
function json(state: unknown): JsonState {
  return JSON.parse(canonicalJson(state)) as JsonState;
}

/** Every token anchor of `tokens` is a fresh frozen cell, not one of `loaded`'s objects. */
function mintedAnchors(tokens: readonly { readonly position: object }[], loaded: readonly unknown[]): boolean {
  const loadedPositions = new Set(loaded.map((token) => (token as { readonly position?: unknown }).position));
  return tokens.length === loaded.length && tokens.every((token) => Object.isFrozen(token.position) && !loadedPositions.has(token.position));
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

/** The refusal names the body it refused: the token, its anchor, its side and size, and the grid. */
function offGridBody(
  error: unknown, label: string, anchor: GridCell, side: number, size: string, columns: number, rows: number,
): boolean {
  return error instanceof OffGridBodyError && error instanceof EncounterRuleError && error.refusalClass === 'validation' &&
    error.label === label && canonicalJson(error.anchor) === canonicalJson(anchor) && error.side === side &&
    error.size === size && error.bounds.columns === columns && error.bounds.rows === rows;
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
  return anchoredAt({
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

  it('refuses a Huge creature whose in-bounds anchor would put its body past the grid (seed-6203009, D900)', () => {
    // FOOTPRINT C1 repaired the committed fixture (the Skyspear Hunter now starts at (14, 6)), so the overhang is
    // built as JSON: the Skyspear is moved back to its pre-repair anchor (17, 3) in the repaired raw fixture.
    const repaired = JSON.parse(inputs.fixtures.readText(HUGE_OVERHANG)) as { encounter: { state: JsonState } };
    const monster = combatantId('combatant:generated-6203009-monster-3');
    const skyspear = repaired.encounter.state.tokens.findIndex((token) => token['combatantId'] === monster);
    expect(repaired.encounter.state.tokens[skyspear]?.['position']).toEqual({ column: 14, row: 6 });
    const decodedRepaired = accepted(() => decodeArenaBasisEnvelopeV1(repaired, { mode: 'legacy_basis' })).encounter.state;
    expect(decodedRepaired.combatants.find((entry) => entry.profile.id === monster)?.profile.rules.sizeCategory).toBe('Huge');
    const raw: unknown = { ...repaired, encounter: { ...repaired.encounter, state: moved(repaired.encounter.state, skyspear, { column: 17, row: 3 }) } };
    // Huge is 3 x 3 (SRD 5.2.1 Creature Size table): columns 17-19, rows 3-5. Column 19 is off the 19-column grid.
    const overhang = thrown(() => decodeArenaBasisEnvelopeV1(raw, { mode: 'legacy_basis' }));
    expect(offGridBody(overhang, `state.tokens[${String(skyspear)}]`, { column: 17, row: 3 }, 3, 'Huge', 19, 20), String(overhang))
      .toBe(true);
    const index = skyspear;
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
    const edge = anchoredAt(created, 0, { column: 9, row: 6 });
    const imported = new MemoryBrowserSessionStore();
    const sessionId = accepted(() => importSavedSession(imported, exported(edge)));
    expect(imported.revisions(sessionId).at(-1)?.encounterState.tokens[0]?.position).toEqual({ column: 9, row: 6 });
    // Only a decoder can meet this state: createEncounter refuses it too (last test).
    const error = thrown(() => importSavedSession(new MemoryBrowserSessionStore(), exported(forcedOffGrid(created, 0, { column: 10, row: 6 }))));
    expect(offGrid(error, 'Persisted encounter tokens[0] anchor', { column: 10, row: 6 }, 10, 7), String(error)).toBe(true);
  });

  it('a rollout capture and a replay bundle with an off-grid anchor are refused', () => {
    const created = json(createEncounter(referenceEncounterSetup()));
    const capture = (state: JsonState): RolloutInputCapture => {
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

  it('a replay bundle checks the anchors of every revision: an off-grid anchor in its last revision is refused there', () => {
    const { bundle } = recordScriptedReferenceSkirmish();
    const candidate = structuredClone(bundle) as unknown as {
      revisions: Array<{ revision: { encounterState: JsonState & {
        bounds: { columns: number; rows: number }; config: { initiativeMode: string };
      } } }>;
    };
    const lastIndex = candidate.revisions.length - 1;
    expect(lastIndex).toBeGreaterThan(1);
    const last = candidate.revisions[lastIndex]!.revision.encounterState;
    const offBoard = { column: 0, row: last.bounds.rows };
    // Also break that revision's first replay check, so the refusal must come first; every earlier revision replays.
    candidate.revisions[lastIndex]!.revision.encounterState = {
      ...moved(last, 0, offBoard),
      config: { initiativeMode: bundle.encounterConfig.initiativeMode === 'shared_enemy' ? 'per_combatant' : 'shared_enemy' },
    };
    const refused = thrown(() => replayBundle(candidate as unknown as ReplayBundle));
    expect(offGrid(refused, `Replay revision ${String(lastIndex + 1)} tokens[0] anchor`, offBoard, last.bounds.columns, last.bounds.rows),
      String(refused)).toBe(true);
  });

  it('createEncounter and the movement callers refuse an off-grid actor loudly instead of listing no moves', () => {
    const setup = referenceEncounterSetup();
    const created = thrown(() => createEncounter({
      ...setup,
      tokens: setup.tokens.map((token) => token.combatantId === REFERENCE_FIGHTER_ID ? { ...token, position: { column: 10, row: 3 } } : token),
    }));
    expect(offGrid(created, 'Token token:fighter anchor', { column: 10, row: 3 }, 10, 7), String(created)).toBe(true);

    // In memory, a state can still be spread onto a smaller grid, leaving an anchor off it (the brand
    // does not name its grid); a caller must not answer that state with "no moves".
    const inside = referenceWithFighter({ column: 9, row: 3 });
    const outside: EncounterState = { ...inside, bounds: { columns: 9, rows: 7 } };
    const fighter: CombatantId = REFERENCE_FIGHTER_ID;
    expect(accepted(() => referenceTurnLegalActions(inside, fighter)).actions.filter((action) => action.type === 'move')).toHaveLength(5);
    const reference = thrown(() => referenceTurnLegalActions(outside, fighter));
    expect(offGrid(reference, 'Combatant combatant:fighter anchor', { column: 9, row: 3 }, 9, 7), String(reference)).toBe(true);
    const regret = thrown(() => regretTurnLegalActions(outside, fighter));
    expect(offGrid(regret, 'Combatant combatant:fighter anchor', { column: 9, row: 3 }, 9, 7), String(regret)).toBe(true);
  });
});

describe('a token anchor is an in-bounds cell in the EncounterState type', () => {
  it('createEncounter mints every anchor: a fresh frozen cell equal to the authored one, and a GridCell does not compile', () => {
    const setup = referenceEncounterSetup();
    const created = createEncounter(setup);
    expect(created.tokens.map((token) => token.position)).toEqual(setup.tokens.map((token) => token.position));
    expect(mintedAnchors(created.tokens, setup.tokens)).toBe(true);
    const unchecked = (): EncounterState => ({
      ...created,
      // @ts-expect-error a GridCell is not a token anchor: only createEncounter, a reducer's checked mint or a decoder makes one.
      tokens: created.tokens.map((token) => ({ ...token, position: { column: 10, row: 3 } })),
    });
    const uncheckedAbsent = (): EncounterState => ({
      ...created,
      // @ts-expect-error the same for an absent token, whose anchor is where it returns.
      absentTokens: [{ ...created.tokens[0], position: { column: -1, row: 0 } }],
    });
    expect([typeof unchecked, typeof uncheckedAbsent]).toEqual(['function', 'function']);
  });

  it('every decoder installs the minted anchors, never the loaded objects, board and absent tokens alike', () => {
    const created = createEncounter(referenceEncounterSetup());
    const withAbsent: EncounterState = { ...created, absentTokens: [anchoredAt(created, 3, { column: 9, row: 6 }).tokens[3] as CombatToken] };
    const loaded = json(withAbsent);
    const absentLoaded = loaded['absentTokens'] as readonly JsonState[];

    const decoded = accepted(() => decodeEncounterStateV1(loaded, 'session'));
    expect(json(decoded)).toEqual(loaded);
    expect(mintedAnchors(decoded.tokens, loaded.tokens)).toBe(true);
    expect(mintedAnchors(decoded.absentTokens ?? [], absentLoaded)).toBe(true);

    const store = new MemoryBrowserSessionStore();
    const sessionId = accepted(() => importSavedSession(store, EncounterSessionJournal.create({
      sessionId: encounterSessionId('session:loaded-anchor-mint'),
      branchId: encounterBranchId('branch:main'),
      encounterState: withAbsent,
      coordinatorState: { requestSequence: 1, pendingRequest: null, pendingCommand: null, continuation: { kind: 'idle' }, pause: null },
      controllers: [],
      rng: mulberry32(6_203_002),
      store: new MemoryBrowserSessionStore(),
      mirror: new MemoryMirrorSink(),
    }).export()));
    const imported = store.revisions(sessionId).at(-1)?.encounterState;
    expect(imported === undefined ? null : json(imported)).toEqual(loaded);
    expect(mintedAnchors(imported?.tokens ?? [], loaded.tokens)).toBe(true);
    expect(mintedAnchors(imported?.absentTokens ?? [], absentLoaded)).toBe(true);

    const serializedEncounterState = canonicalJson(loaded);
    const rebuilt = accepted(() => reconstructEncounterState({
      logicalCallId: 'loaded-anchor-mint:call:0', stateHash: sha256(serializedEncounterState),
      legalActionSetHash: sha256(canonicalJson(['loaded-anchor-mint'])), selectedAction: [], input: {},
      serializedEncounterState, candidateTurnK: 1, candidateTurns: [],
    }));
    expect(json(rebuilt)).toEqual(loaded);
    expect(mintedAnchors(rebuilt.tokens, loaded.tokens)).toBe(true);
    expect(mintedAnchors(rebuilt.absentTokens ?? [], absentLoaded)).toBe(true);

    const bytes = exportReplayBundle(recordScriptedReferenceSkirmish().bundle);
    const parsed = JSON.parse(bytes) as { readonly revisions: readonly { readonly revision: { readonly encounterState: JsonState } }[] };
    const replayed = accepted(() => decodeReplayBundle(bytes));
    expect(replayed.revisions).toHaveLength(parsed.revisions.length);
    expect(replayed.revisions.every((record, index) =>
      mintedAnchors(record.revision.encounterState.tokens, parsed.revisions[index]?.revision.encounterState.tokens ?? []))).toBe(true);
  });

  it('every decoder refuses an absent token whose return anchor is off the grid', () => {
    const created = createEncounter(referenceEncounterSetup());
    const absentAt = (position: GridCell): JsonState => ({ ...json(created), absentTokens: [{ ...json(created).tokens[3], position }] });
    const offBoard = { column: 10, row: 6 };
    expect(accepted(() => decodeEncounterStateV1(absentAt({ column: 9, row: 6 }), 'session')).absentTokens?.[0]?.position)
      .toEqual({ column: 9, row: 6 });
    const codec = thrown(() => decodeEncounterStateV1(absentAt(offBoard), 'session'));
    expect(offGrid(codec, 'state.absentTokens[0] anchor', offBoard, 10, 7), String(codec)).toBe(true);

    const withAbsent: EncounterState = { ...created, absentTokens: [created.tokens[3] as CombatToken] };
    const session = thrown(() => importSavedSession(new MemoryBrowserSessionStore(), EncounterSessionJournal.create({
      sessionId: encounterSessionId('session:loaded-anchor-absent'),
      branchId: encounterBranchId('branch:main'),
      encounterState: forcedOffGrid(withAbsent, 0, offBoard, 'absentTokens'),
      coordinatorState: { requestSequence: 1, pendingRequest: null, pendingCommand: null, continuation: { kind: 'idle' }, pause: null },
      controllers: [],
      rng: mulberry32(6_203_003),
      store: new MemoryBrowserSessionStore(),
      mirror: new MemoryMirrorSink(),
    }).export()));
    expect(offGrid(session, 'Persisted encounter absentTokens[0] anchor', offBoard, 10, 7), String(session)).toBe(true);

    const serializedEncounterState = canonicalJson(absentAt(offBoard));
    const rollout = thrown(() => reconstructEncounterState({
      logicalCallId: 'loaded-anchor-absent:call:0', stateHash: sha256(serializedEncounterState),
      legalActionSetHash: sha256(canonicalJson(['loaded-anchor-absent'])), selectedAction: [], input: {},
      serializedEncounterState, candidateTurnK: 1, candidateTurns: [],
    }));
    expect(offGrid(rollout, 'Rollout capture loaded-anchor-absent:call:0 absentTokens[0] anchor', offBoard, 10, 7), String(rollout))
      .toBe(true);

    const { bundle } = recordScriptedReferenceSkirmish();
    const candidate = structuredClone(bundle) as unknown as {
      revisions: Array<{ revision: { encounterState: JsonState & { bounds: { columns: number; rows: number } } } }>;
    };
    const first = candidate.revisions[0]!.revision.encounterState;
    const replayOffBoard = { column: first.bounds.columns, row: 0 };
    candidate.revisions[0]!.revision.encounterState = { ...first, absentTokens: [{ ...first.tokens[0], position: replayOffBoard }] };
    const replay = thrown(() => replayBundle(candidate as unknown as ReplayBundle));
    expect(offGrid(replay, 'Replay revision 1 absentTokens[0] anchor', replayOffBoard, first.bounds.columns, first.bounds.rows), String(replay))
      .toBe(true);
  });

  it('the engine round session re-mints anchors after its canonical JSON round trip, and refuses a state spread off its grid', () => {
    const created = createEncounter(referenceEncounterSetup());
    const withAbsent: EncounterState = { ...created, absentTokens: [anchoredAt(created, 3, { column: 9, row: 6 }).tokens[3] as CombatToken] };
    const canonical = canonicalEncounterState(withAbsent);
    const parsed = (JSON.parse(canonical.fixtureJson) as { readonly encounter: { readonly state: JsonState } }).encounter.state;
    expect(json(canonical.state)).toEqual(json(withAbsent));
    expect(mintedAnchors(canonical.state.tokens, parsed.tokens)).toBe(true);
    expect(mintedAnchors(canonical.state.absentTokens ?? [], parsed['absentTokens'] as readonly unknown[])).toBe(true);
    // The Training Brute stands at (3, 3); on a 3-column grid its anchor is not a cell.
    const spread: EncounterState = { ...created, bounds: { columns: 3, rows: 7 } };
    const session = new EngineRoundSession(spread, mulberry32(6_203_004), { kind: 'unattended', askDefault: 'decline' },
      buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' }));
    const error = thrown(() => session.snapshot({
      runId: encounterSessionId('encounter:loaded-anchor-remint'), branchId: encounterBranchId('branch:loaded-anchor-remint'),
      revision: spread.revision, requestId: 'request:loaded-anchor-remint', phase: 'initial', room: 1, historyKind: 'room_ready',
    }));
    expect(offGrid(error, 'Canonical engine state tokens[3] anchor', { column: 3, row: 3 }, 3, 7), String(error)).toBe(true);
  });
});

/** A level-2 Fighter pack member with one melee attack (the pack shape party-session-state.test.ts uses). */
function fighterMember(index: number): ExternalPartyPackV2['members'][number] {
  return {
    combatantId: `combatant:anchor-${String(index)}`,
    tokenId: `token:anchor-${String(index)}`,
    characterId: index,
    classes: [{ classId: 'Fighter', level: 2 }],
    hitDice: [{ sides: 10, maximum: 2 }],
    abilities: { strength: 14, dexterity: 10, constitution: 12, intelligence: 10, wisdom: 10, charisma: 10 },
    armorClass: 16,
    hitPointMaximum: 20,
    sizeCategory: 'Medium',
    walkingSpeedFeet: 30,
    initiativeBonus: 0,
    savingThrowBonuses: { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 },
    attacksPerAction: 1,
    attacks: [{
      attackId: `attack:anchor-${String(index)}`, kind: 'melee', attackBonus: 4, criticalFloor: 20, reachFeet: 5, rangeFeet: 5,
      damage: [{ damageTypeId: 'Slashing', count: 1, sides: 8, modifier: 2 }],
    }],
    startingConditions: [],
    ...statedPlainMemberFields(),
  };
}

function loadedFighters(): readonly LoadedPartyMember[] {
  const loaded = loadExternalPartyPack({
    schemaVersion: 2, partyId: 'party:loaded-anchor-callers', allowPartial: false,
    members: [fighterMember(1), fighterMember(2), fighterMember(3)],
  });
  if (loaded.status !== 'loaded') throw new Error(`Party refused: ${loaded.refusal.reason}.`);
  return loaded.party.members;
}

/** `state` with `actor` holding 30 feet of movement, so a caller reaches its anchor. */
function withMovement(state: EncounterState, actor: CombatantId): EncounterState {
  return {
    ...state,
    combatants: state.combatants.map((combatant) => combatant.profile.id === actor
      ? { ...combatant, turn: { ...combatant.turn, movement: { ...combatant.turn.movement, remaining: feet(30) } } }
      : combatant),
  };
}

const movePaths = (actions: readonly { readonly type: string; readonly path?: readonly GridCell[] }[]): readonly GridCell[] =>
  actions.flatMap((action) => action.type === 'move' ? action.path ?? [] : []);

describe('the movement callers refuse an off-grid actor loudly instead of listing no moves', () => {
  // The stored-character room (stored-character-encounter.ts): a 10 x 7 grid, the three Fighters at
  // (1, 1), (1, 3) and (1, 5), the Training Brute at (2, 2), a blocked cell at (7, 2). Each state
  // below is then spread onto a narrower grid that leaves the actor's anchor off it.

  it('the loaded party lists its steps on the grid and refuses an actor spread off it', () => {
    const members = loadedFighters();
    const composed = composeStoredCharacterEncounter(members);
    const actor = combatantId('combatant:anchor-1');
    const state = withMovement(composed.state, actor);
    expect(state.tokens.find((token) => token.combatantId === actor)?.position).toEqual({ column: 1, row: 1 });
    // Every neighbour of (1, 1) in row-major order but (2, 2), the hostile Brute's square.
    expect(movePaths(accepted(() => loadedPartyTurnLegalActions(members)(state, actor)).actions)).toEqual([
      { column: 0, row: 0 }, { column: 1, row: 0 }, { column: 2, row: 0 }, { column: 0, row: 1 },
      { column: 2, row: 1 }, { column: 0, row: 2 }, { column: 1, row: 2 },
    ]);
    const error = thrown(() => loadedPartyTurnLegalActions(members)({ ...state, bounds: { columns: 1, rows: 7 } }, actor));
    expect(offGrid(error, 'Combatant combatant:anchor-1 anchor', { column: 1, row: 1 }, 1, 7), String(error)).toBe(true);
  });

  it('the stored-character room lists the Brute\'s steps on the grid and refuses it spread off', () => {
    const composed = composeStoredCharacterEncounter(loadedFighters());
    const brute: CombatantId = REFERENCE_MONSTER_ID;
    const state = withMovement(composed.state, brute);
    expect(state.tokens.find((token) => token.combatantId === brute)?.position).toEqual({ column: 2, row: 2 });
    // Column step -1..1, then row step -1..1 (the caller's loop), without the Fighters' squares (1, 1) and (1, 3).
    expect(movePaths(accepted(() => composed.turnLegalActions(state, brute)).actions)).toEqual([
      { column: 1, row: 2 }, { column: 2, row: 1 }, { column: 2, row: 3 },
      { column: 3, row: 1 }, { column: 3, row: 2 }, { column: 3, row: 3 },
    ]);
    const error = thrown(() => composed.turnLegalActions({ ...state, bounds: { columns: 2, rows: 7 } }, brute));
    expect(offGrid(error, 'Combatant combatant:training-brute anchor', { column: 2, row: 2 }, 2, 7), String(error)).toBe(true);
  });

  it('the scripted skirmish finds its open neighbour on the grid and refuses an actor spread off it', () => {
    // The reference room: the Fighter at (2, 3), the Training Brute at (3, 3), the Cleric at (1, 4).
    const state = createEncounter(referenceEncounterSetup());
    const fighter: CombatantId = REFERENCE_FIGHTER_ID;
    // Right is the hostile Brute's square; down, (2, 4), is the first open one.
    expect(accepted(() => adjacentOpenCell(state, fighter))).toEqual({ column: 2, row: 4 });
    const error = thrown(() => adjacentOpenCell({ ...state, bounds: { columns: 2, rows: 7 } }, fighter));
    expect(offGrid(error, 'Combatant combatant:fighter anchor', { column: 2, row: 3 }, 2, 7), String(error)).toBe(true);
  });
});

// FOOTPRINT W3 (owner D900): an isolated 8 x 6 room, a Huge monster at (5, 3) (columns 5-7, rows 3-5: flush with
// both far edges) and a Medium PC at (0, 0), built by createEncounter and rolled into initiative. Every decoder
// accepts it; the same JSON with the Huge anchor moved one column (6, 3) or one row (5, 4) is refused with
// OffGridBodyError; a placement mode of another size is refused with placement_size_mismatch; an absent Huge
// token at (6, 3) is accepted, because an absent token's anchor is a return origin, not a placed body.
describe('FOOTPRINT W3: every decoder places whole bodies only', () => {
  const HUGE = combatantId('combatant:w3-huge');

  function isolated(): EncounterState {
    const base = monsterProfile('w3-huge');
    const huge = { ...base, rules: { ...base.rules, sizeCategory: 'Huge' as const } };
    const pc = playerProfile('w3-pc');
    const created = createEncounter({
      bounds: { columns: 8, rows: 6 },
      combatants: [huge, pc],
      tokens: [combatToken(huge, { column: 5, row: 3 }), combatToken(pc, { column: 0, row: 0 })],
    });
    return reduceEncounter(created, { type: 'roll_initiative' }, () => 0.5).state;
  }

  /** The isolated state's JSON with the Huge token changed by `change`. */
  function hugeEdited(change: (token: Readonly<Record<string, unknown>>) => Record<string, unknown>): JsonState {
    const loaded = json(isolated());
    return { ...loaded, tokens: loaded.tokens.map((token) => token['combatantId'] === HUGE ? change(token) : token) };
  }

  const refusals = [
    { name: 'one column past (6, 3)', edit: (token: Readonly<Record<string, unknown>>) => ({ ...token, position: { column: 6, row: 3 } }), body: { column: 6, row: 3 } },
    { name: 'one row past (5, 4)', edit: (token: Readonly<Record<string, unknown>>) => ({ ...token, position: { column: 5, row: 4 } }), body: { column: 5, row: 4 } },
    { name: 'a Large mode for the Huge', edit: (token: Readonly<Record<string, unknown>>) => ({ ...token, placementMode: { kind: 'normal', actual: 'Large' } }), body: null },
  ] as const;

  function refusedAs(error: unknown, label: string, body: GridCell | null): boolean {
    return body === null
      ? error instanceof CreatureSizeRuleError && error.code === 'placement_size_mismatch' && error.combatantId === HUGE
      : offGridBody(error, label, body, 3, 'Huge', 8, 6);
  }

  function sessionExport(state: EncounterState, id: string): string {
    return EncounterSessionJournal.create({
      sessionId: encounterSessionId(`session:w3-${id}`),
      branchId: encounterBranchId('branch:main'),
      encounterState: state,
      coordinatorState: { requestSequence: 1, pendingRequest: null, pendingCommand: null, continuation: { kind: 'idle' }, pause: null },
      controllers: [],
      rng: mulberry32(6_203_009),
      store: new MemoryBrowserSessionStore(),
      mirror: new MemoryMirrorSink(),
    }).export();
  }

  function rollout(state: JsonState): RolloutInputCapture {
    const serializedEncounterState = canonicalJson(state);
    return {
      logicalCallId: 'w3:call:0', stateHash: sha256(serializedEncounterState),
      legalActionSetHash: sha256(canonicalJson(['w3'])), selectedAction: [], input: {},
      serializedEncounterState, candidateTurnK: 1, candidateTurns: [],
    };
  }

  let recorded: ReplayBundle | null = null;
  /** The scripted skirmish bundle with revision 1's state replaced by `state` (its placement check comes first). */
  function replayWith(state: JsonState): ReplayBundle {
    recorded ??= recordScriptedReferenceSkirmish().bundle;
    const bundle = recorded;
    const candidate = structuredClone(bundle) as unknown as { revisions: Array<{ revision: { encounterState: unknown } }> };
    candidate.revisions[0]!.revision.encounterState = { ...state, config: bundle.encounterConfig };
    return candidate as unknown as ReplayBundle;
  }

  it('the codec (legacy_basis, session and challenge modes) accepts the flush Huge and refuses each edit', () => {
    const loaded = json(isolated());
    for (const mode of ['legacy_basis', 'session', 'challenge'] as const) {
      expect(accepted(() => decodeEncounterStateV1(loaded, mode)).tokens[0]).toMatchObject({ position: { column: 5, row: 3 } });
      for (const refusal of refusals) {
        const error = thrown(() => decodeEncounterStateV1(hugeEdited(refusal.edit), mode));
        expect(refusedAs(error, 'state.tokens[0]', refusal.body), `${mode} ${refusal.name}: ${String(error)}`).toBe(true);
      }
    }
    const absent = { ...loaded, absentTokens: [{ ...loaded.tokens[0], position: { column: 6, row: 3 } }] };
    expect(accepted(() => decodeEncounterStateV1(absent, 'session')).absentTokens?.[0]?.position).toEqual({ column: 6, row: 3 });
  });

  it('a saved session accepts the flush Huge and refuses each edit at import', () => {
    const state = isolated();
    const store = new MemoryBrowserSessionStore();
    const sessionId = accepted(() => importSavedSession(store, sessionExport(state, 'accepted')));
    expect(store.revisions(sessionId).at(-1)?.encounterState.tokens[0]?.position).toEqual({ column: 5, row: 3 });
    for (const refusal of refusals) {
      // The export checksums what it is given, so an edited save is built as a corrupted state (the only cast).
      const edited = hugeEdited(refusal.edit) as unknown as EncounterState;
      const error = thrown(() => importSavedSession(new MemoryBrowserSessionStore(), sessionExport(edited, refusal.name)));
      expect(refusedAs(error, 'Persisted encounter tokens[0]', refusal.body), `${refusal.name}: ${String(error)}`).toBe(true);
    }
    const absent = { ...state, absentTokens: [{ ...state.tokens[0]!, position: onBoard(state.bounds, { column: 6, row: 3 }) }] };
    const absentStore = new MemoryBrowserSessionStore();
    const absentId = accepted(() => importSavedSession(absentStore, sessionExport(absent, 'absent')));
    expect(absentStore.revisions(absentId).at(-1)?.encounterState.absentTokens?.[0]?.position).toEqual({ column: 6, row: 3 });
  });

  it('a rollout capture accepts the flush Huge and refuses each edit', () => {
    expect(accepted(() => reconstructEncounterState(rollout(json(isolated())))).tokens[0]?.position).toEqual({ column: 5, row: 3 });
    for (const refusal of refusals) {
      const error = thrown(() => reconstructEncounterState(rollout(hugeEdited(refusal.edit))));
      expect(refusedAs(error, 'Rollout capture w3:call:0 tokens[0]', refusal.body), `${refusal.name}: ${String(error)}`).toBe(true);
    }
  });

  it('a replay bundle passes the flush Huge to its next check and refuses each edit', () => {
    // The flush state is not the bundle's own, so replay goes on to refuse it at a later, non-placement check.
    const later = thrown(() => replayBundle(replayWith(json(isolated()))));
    expect(later instanceof OffGridBodyError || later instanceof OffGridAnchorError || later instanceof CreatureSizeRuleError, String(later))
      .toBe(false);
    expect(later).toBeInstanceOf(Error);
    for (const refusal of refusals) {
      const error = thrown(() => replayBundle(replayWith(hugeEdited(refusal.edit))));
      expect(refusedAs(error, 'Replay revision 1 tokens[0]', refusal.body), `${refusal.name}: ${String(error)}`).toBe(true);
    }
  });

  it('the engine round session re-mints the flush Huge and refuses a state whose Huge body leaves the grid', () => {
    const state = isolated();
    expect(accepted(() => canonicalEncounterState(state)).state.tokens[0]?.position).toEqual({ column: 5, row: 3 });
    for (const refusal of refusals) {
      const edited = hugeEdited(refusal.edit) as unknown as EncounterState;
      const error = thrown(() => canonicalEncounterState(edited));
      expect(refusedAs(error, 'Canonical engine state tokens[0]', refusal.body), `${refusal.name}: ${String(error)}`).toBe(true);
    }
  });
});
