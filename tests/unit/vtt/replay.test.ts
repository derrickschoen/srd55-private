import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { sha256 } from '../../../src/crypto/sha256';
import {
  authoritativeReplayHash,
  createReplayBundle,
  decodeReplayBundle,
  emptyFleetTelemetry,
  exportReplayBundle,
  exportReplayBundleV1ForMigrationTest,
  replayBundle,
  ReplayDivergenceError,
  type ReplayBundle,
} from '../../../src/vtt/replay';
import { encounterStateFromApprovedFixture } from '../../../src/vtt/generated-encounter-fixtures';
import { EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink } from '../../../src/vtt/session-persistence';
import { reduceEncounter } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { mulberry32 } from '../../../src/combat/random';
import { feetPoint } from '../../../src/combat/templates';
import { armorClass, codexSessionId, encounterBranchId, encounterSessionId, feet, worldObjectId } from '../../../src/combat/values';
import { recordScriptedReferenceSkirmish } from '../../../src/vtt/scripted-skirmish';
import { TEST_APPROVED_FIRST_SKIRMISH_FIXTURE } from '../../../src/vtt/test-approved-first-skirmish';
import { runVttReplayCommand } from '../../../tools/vtt-replay';

interface MutableReplayBundle {
  schemaVersion: number;
  encounterConfig: { initiativeMode: 'per_combatant' | 'shared_enemy' | 'side_alternating' };
  gapReports: Array<{
    packEntry: string;
    featurePath: string;
    requestedCapability: string;
    engineRefusalReason: string;
  }>;
  revisions: Array<{
    void: boolean;
    rng: { pre: { draws: number }; post: { draws: number } };
    projectionHashes: { dm: string; players: Array<{ combatantId: string; hash: string }> };
    revision: {
      transition: { kind: string; events?: Array<{ type: string }> };
    };
  }>;
  transcripts: Array<{
    kind: string;
    requestId: string | null;
    requestLink: { requestId: string; requestSequence: number } | null;
    fleet: {
      latencyMs: number | null;
      tokenCounts: { input: number; cachedInput: number; output: number; reasoning: number } | null;
      correctionAttempts: number | null;
    };
  }>;
}

function mutable(bundle: ReplayBundle): MutableReplayBundle {
  return structuredClone(bundle) as unknown as MutableReplayBundle;
}

function expectDivergence(
  action: () => unknown,
  source: ReplayDivergenceError['source'],
  recordIndex: number,
  field: string,
): void {
  try {
    action();
    throw new Error('Expected replay divergence.');
  } catch (error) {
    expect(error).toBeInstanceOf(ReplayDivergenceError);
    expect(error).toMatchObject({ source, recordIndex });
    expect((error as ReplayDivergenceError).field).toContain(field);
  }
}

describe('increment 10 deterministic replay and playable exit', () => {
  it('replays world-object creation byte-exactly', () => {
    const store = new MemoryBrowserSessionStore();
    const mirror = new MemoryMirrorSink();
    const sessionId = encounterSessionId('encounter:world-object-replay');
    const rng = mulberry32(0x330_139);
    const coordinatorState = {
      requestSequence: 1, pendingRequest: null, pendingCommand: null,
      continuation: { kind: 'idle' as const }, pause: null,
    };
    let state = encounterStateFromApprovedFixture(TEST_APPROVED_FIRST_SKIRMISH_FIXTURE);
    const occupied = new Set([
      ...state.tokens.map((token) => `${String(token.position.column)},${String(token.position.row)}`),
      ...state.blockedCells.map((cell) => `${String(cell.column)},${String(cell.row)}`),
    ]);
    const position = Array.from({ length: state.bounds.rows }, (_value, row) =>
      Array.from({ length: state.bounds.columns }, (_columnValue, column) => ({ column, row })))
      .flat()
      .find((cell) => !occupied.has(`${String(cell.column)},${String(cell.row)}`));
    if (position === undefined) throw new Error('Replay fixture has no free world-object cell.');
    const journal = EncounterSessionJournal.create({
      sessionId, branchId: encounterBranchId('branch:world-object-replay'), encounterState: state,
      coordinatorState, controllers: [], codexSessionId: codexSessionId('codex:world-object-replay'),
      rng, store, mirror,
    });
    const command: EncounterCommand = {
      type: 'world_operation', actor: null, cost: 'none',
      operation: {
        kind: 'create_object',
        object: {
          id: worldObjectId('object:replay-wall'), name: 'Homebrew Replay Wall', kind: 'barrier',
          position, footprint: [position], durability: { kind: 'indestructible' },
          armorClass: armorClass(15), damageResponses: [],
          blocking: { movement: true, lineOfSight: true, cover: 'total' },
        },
      },
    };
    const reduction = reduceEncounter(state, command, journal.rng());
    state = reduction.state;
    journal.record({
      transition: { kind: 'reducer_applied', command, events: reduction.events },
      encounterState: state, coordinatorState, controllers: [],
    });
    const bundle = createReplayBundle({
      fixture: TEST_APPROVED_FIRST_SKIRMISH_FIXTURE, revisions: store.revisions(sessionId), transcripts: [],
      build: { buildId: 'world-object-test', commit: 'test' }, protocolVersions: ['world-object:1'],
      licensingVersions: ['SRD-5.2.1-CC-BY-4.0'], gapReports: [],
    });
    const bytes = exportReplayBundle(bundle);
    const decoded = decodeReplayBundle(bytes);
    expect(exportReplayBundle(decoded)).toBe(bytes);
    expect(replayBundle(decoded, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE).finalStateHash).toBe(
      bundle.revisions.at(-1)?.stateHash,
    );
  });

  it('replays two overlapping persistent areas byte-exactly in stable creation order', () => {
    const store = new MemoryBrowserSessionStore();
    const mirror = new MemoryMirrorSink();
    const sessionId = encounterSessionId('encounter:persistent-area-replay');
    const rng = mulberry32(0x330_088);
    const coordinatorState = {
      requestSequence: 1,
      pendingRequest: null,
      pendingCommand: null,
      continuation: { kind: 'idle' as const },
      pause: null,
    };
    let state = encounterStateFromApprovedFixture(TEST_APPROVED_FIRST_SKIRMISH_FIXTURE);
    const journal = EncounterSessionJournal.create({
      sessionId, branchId: encounterBranchId('branch:persistent-area-replay'), encounterState: state,
      coordinatorState, controllers: [], codexSessionId: codexSessionId('codex:persistent-area-replay'),
      rng, store, mirror,
    });
    const record = (command: EncounterCommand): void => {
      const reduction = reduceEncounter(state, command, rng);
      state = reduction.state;
      journal.record({
        transition: { kind: 'reducer_applied', command, events: reduction.events },
        encounterState: state, coordinatorState, controllers: [],
      });
    };
    record({ type: 'roll_initiative' });
    const owner = state.activeCombatant;
    if (owner === null) throw new Error('Persistent-area replay fixture has no active combatant.');
    for (const x of [20, 25]) {
      record({
        type: 'create_persistent_area', actor: owner, cost: 'none',
        area: {
          owner, origin: { kind: 'fixed', point: feetPoint(x, 20) },
          shape: { kind: 'sphere', radius: feet(10) }, duration: { kind: 'rounds', remaining: 3 },
          targetFilter: { kind: 'all' }, difficultTerrain: false, hooks: [], movable: null,
        },
      });
    }
    const bundle = createReplayBundle({
      fixture: TEST_APPROVED_FIRST_SKIRMISH_FIXTURE, revisions: store.revisions(sessionId), transcripts: [],
      build: { buildId: 'persistent-area-test', commit: 'test' }, protocolVersions: ['persistent-area:1'],
      licensingVersions: ['SRD-5.2.1-CC-BY-4.0'], gapReports: [],
    });
    const decoded = decodeReplayBundle(exportReplayBundle(bundle));
    expect(canonicalJson(decoded)).toBe(canonicalJson(bundle));
    expect(replayBundle(decoded, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE).finalStateHash).toBe(
      bundle.revisions.at(-1)?.stateHash,
    );
    expect(state.persistentAreas.map((area) => area.sequence)).toEqual([1, 2]);
  });

  it('PLAYABLE-EXIT replays the four-round scripted skirmish offline byte-for-byte', () => {
    const gate = recordScriptedReferenceSkirmish();
    const replayed = replayBundle(gate.bundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE);
    const transitions = gate.bundle.revisions.map((entry) => entry.revision.transition.kind);
    const events = gate.bundle.revisions.flatMap((entry) =>
      entry.revision.transition.kind === 'reducer_applied'
        ? entry.revision.transition.events.map((event) => event.type)
        : [],
    );
    const transcriptKinds = new Set(gate.bundle.transcripts.map((entry) => entry.kind));

    expect(replayed).toEqual(gate.proof);
    expect(replayed.rounds).toBe(4);
    expect(replayed.revisionCount).toBeGreaterThan(100);
    expect(replayed.eventCount).toBeGreaterThan(50);
    expect(new Set(events)).toEqual(expect.objectContaining(new Set([
      'movement_completed',
      'attack_resolved',
      'spell_cast',
      'effect_applied',
      'save_resolved',
      'death_save_resolved',
      'adjudicated',
    ])));
    expect(events).toContain('resource_spent');
    expect(transitions).toContain('head_moved');
    expect(transitions).toContain('coordinator_resumed');
    expect(gate.bundle.revisions.some((entry) => entry.void)).toBe(true);
    expect(transcriptKinds).toEqual(expect.objectContaining(new Set([
      'controller_request', 'policy_result', 'prompt', 'response', 'round_plan',
      'invalidation', 'adjudication', 'narration', 'undo', 'void', 'resume',
    ])));
    expect(canonicalJson(decodeReplayBundle(exportReplayBundle(gate.bundle)))).toBe(
      canonicalJson(gate.bundle),
    );
    expect(replayed.finalProjectionHashes).toEqual(
      gate.bundle.revisions.at(-1)?.projectionHashes,
    );
  });

  it('M61-TELEMETRY-OMITS-RNG-TRANSITION identifies the first missing RNG post-state', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const index = candidate.revisions.findIndex((entry) => entry.rng.post.draws > entry.rng.pre.draws);
    expect(index).toBeGreaterThanOrEqual(0);
    candidate.revisions[index]!.rng.post.draws = candidate.revisions[index]!.rng.pre.draws;
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE),
      'rng',
      index,
      'rng.post.draws',
    );
  });

  it('mode_not_serialized refuses to reconstruct a shared_enemy bundle as per_combatant', () => {
    const gate = recordScriptedReferenceSkirmish(0x320_004, 'engine:hit-points', 'shared_enemy');
    expect(gate.bundle.encounterConfig).toEqual({ initiativeMode: 'shared_enemy' });
    const candidate = mutable(gate.bundle);
    candidate.encounterConfig = { initiativeMode: 'per_combatant' };
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE),
      'bundle',
      0,
      'encounterConfig.initiativeMode',
    );
  });

  it('gap_report_swallowed rejects a replay after a non-engine adjudication gap is dropped', () => {
    const gate = recordScriptedReferenceSkirmish(0x317010, 'external:unmapped-mechanic');
    expect(gate.bundle.gapReports).toContainEqual(expect.objectContaining({
      featurePath: 'adjudicated.subject',
      requestedCapability: 'adjudication:external-mechanic',
      engineRefusalReason: 'non_engine_adjudication_subject',
    }));
    const candidate = mutable(gate.bundle);
    candidate.gapReports = [];
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle),
      'gap_report',
      -1,
      'gapReports',
    );
  });

  it('M62-CONTROLLER-RESPONSE-MISATTRIBUTED rejects a valid response linked to the prior request', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const requests = gate.bundle.transcripts.filter((entry) => entry.kind === 'controller_request');
    const first = requests[0];
    const second = requests.find(
      (entry) => entry.controller.controllerId !== first?.controller.controllerId,
    );
    if (first?.requestId === null || first?.requestId === undefined || second?.requestId === null || second?.requestId === undefined) {
      throw new Error('Scripted transcript needs two requests.');
    }
    const responseIndex = candidate.transcripts.findIndex(
      (entry) => entry.kind === 'response' && entry.requestLink?.requestId === second.requestId,
    );
    expect(responseIndex).toBeGreaterThanOrEqual(0);
    candidate.transcripts[responseIndex]!.requestLink = {
      requestId: first.requestId,
      requestSequence: gate.bundle.transcripts.find((entry) => entry.requestId === first.requestId)!.sequence,
    };
    const changed = candidate.transcripts[responseIndex] as unknown as Readonly<Record<string, unknown>>;
    const { contentHash: _contentHash, fleet: _fleet, ...content } = changed;
    (candidate.transcripts[responseIndex] as unknown as { contentHash: string }).contentHash =
      sha256(canonicalJson(content));
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE),
      'transcript',
      responseIndex,
      'controller.controllerId',
    );
  });

  it('M63-LATENCY-CHANGES-REPLAY-HASH keeps clocks outside authoritative replay hashing', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const modeled = candidate.transcripts.find((entry) => entry.fleet.latencyMs !== null);
    if (modeled === undefined || modeled.fleet.latencyMs === null) throw new Error('Missing model telemetry.');
    modeled.fleet.latencyMs += 99_999;
    expect(authoritativeReplayHash(candidate as unknown as ReplayBundle)).toBe(
      authoritativeReplayHash(gate.bundle),
    );
    expect(replayBundle(candidate as unknown as ReplayBundle).finalStateHash).toBe(
      gate.proof.finalStateHash,
    );
  });

  it('M64-REPLAY-CALLS-LIVE-CONTROLLER exposes no controller or exchange capability', () => {
    const implementation = replayBundle.toString();
    expect(replayBundle.length).toBe(2);
    expect(implementation).not.toMatch(/\.choose\s*\(|\.exchange\s*\(/u);
    expect(() => replayBundle(recordScriptedReferenceSkirmish().bundle)).not.toThrow();
  });

  it('M65-VOID-BRANCH-REPLAYED-AS-LIVE refuses a void revision marked active', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const index = candidate.revisions.findIndex((entry) => entry.void);
    expect(index).toBeGreaterThanOrEqual(0);
    candidate.revisions[index]!.void = false;
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle),
      'bundle',
      index,
      'void',
    );
  });

  it('M66-PROJECTION-DIVERGENCE-IGNORED pinpoints the first bad player projection hash', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const index = candidate.revisions.findIndex((entry) => entry.projectionHashes.players.length > 0);
    candidate.revisions[index]!.projectionHashes.players[0]!.hash = '0'.repeat(64);
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle),
      'projection',
      index,
      'projectionHashes.players[0].hash',
    );
  });

  it('CORRUPTION-EVENT identifies the first bad event record and field', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const index = candidate.revisions.findIndex((entry) =>
      entry.revision.transition.kind === 'reducer_applied' &&
      (entry.revision.transition.events?.length ?? 0) > 0,
    );
    candidate.revisions[index]!.revision.transition.events![0]!.type = 'corrupted_event';
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle),
      'event',
      index,
      'transition.events[0].type',
    );
  });

  it('CORRUPTION-TRANSCRIPT identifies the first bad transcript content record', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const index = candidate.transcripts.findIndex((entry) => entry.kind === 'narration');
    candidate.transcripts[index]!.kind = 'resume';
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle),
      'transcript',
      index,
      'contentHash',
    );
  });

  it('OWN-TOKEN-COUNTS-CANNOT-INFLUENCE-REDUCER keeps usage out of state and view hashes', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const modeled = candidate.transcripts.find((entry) => entry.fleet.tokenCounts !== null);
    if (modeled?.fleet.tokenCounts === null || modeled === undefined) throw new Error('Missing token telemetry.');
    modeled.fleet.tokenCounts.output += 1_000_000;
    const proof = replayBundle(candidate as unknown as ReplayBundle);
    expect(proof.finalStateHash).toBe(gate.proof.finalStateHash);
    expect(proof.finalProjectionHashes).toEqual(gate.proof.finalProjectionHashes);
    expect(proof.authoritativeHash).toBe(gate.proof.authoritativeHash);
  });

  it('CORRECTION-ATTEMPTS are schema-validated telemetry and remain non-authoritative', () => {
    const gate = recordScriptedReferenceSkirmish();
    const candidate = mutable(gate.bundle);
    const modeled = candidate.transcripts.find((entry) => entry.fleet.correctionAttempts !== null);
    if (modeled === undefined) throw new Error('Missing correction telemetry.');
    modeled.fleet.correctionAttempts = 2;
    expect(replayBundle(candidate as unknown as ReplayBundle).authoritativeHash).toBe(
      gate.proof.authoritativeHash,
    );
    modeled.fleet.correctionAttempts = null;
    expectDivergence(
      () => replayBundle(candidate as unknown as ReplayBundle),
      'transcript',
      candidate.transcripts.indexOf(modeled),
      'fleet',
    );
  });

  it('OWN-BUNDLE-VERSION-OUTSIDE-WINDOW is refused while the adjacent migration remains exact', () => {
    const gate = recordScriptedReferenceSkirmish();
    expect(decodeReplayBundle(exportReplayBundleV1ForMigrationTest(gate.bundle))).toEqual(gate.bundle);
    for (const version of [0, 6]) {
      const candidate = mutable(gate.bundle);
      candidate.schemaVersion = version;
      expect(() => decodeReplayBundle(JSON.stringify(candidate))).toThrow('outside the migration window');
    }
  });

  it('HUMAN-FLEET-SCHEMA is empty but typed identically to model records', () => {
    expect(emptyFleetTelemetry()).toEqual({
      modelId: null,
      reasoningEffort: null,
      buildId: null,
      commit: null,
      loadLevelTag: null,
      latencyMs: null,
      tokenCounts: null,
      correctionAttempts: null,
    });
  });

  it('REPLAY-COMMAND reads only the recorded bundle and approved fixture', async () => {
    const gate = recordScriptedReferenceSkirmish();
    const requested: string[] = [];
    const proof = await runVttReplayCommand(
      ['recording.json', 'fixture.json'],
      async (path) => {
        requested.push(path);
        if (path === 'recording.json') return exportReplayBundle(gate.bundle);
        if (path === 'fixture.json') return canonicalJson(TEST_APPROVED_FIRST_SKIRMISH_FIXTURE);
        throw new Error(`Unexpected live dependency ${path}.`);
      },
    );
    expect(requested).toEqual(['recording.json', 'fixture.json']);
    expect(proof).toEqual(gate.proof);
  });
});
