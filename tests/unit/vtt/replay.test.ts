import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { sha256 } from '../../../src/crypto/sha256';
import {
  authoritativeReplayHash,
  decodeReplayBundle,
  emptyFleetTelemetry,
  exportReplayBundle,
  exportReplayBundleV1ForMigrationTest,
  replayBundle,
  ReplayDivergenceError,
  type ReplayBundle,
} from '../../../src/vtt/replay';
import { recordScriptedReferenceSkirmish } from '../../../src/vtt/scripted-skirmish';
import { TEST_APPROVED_FIRST_SKIRMISH_FIXTURE } from '../../../src/vtt/test-approved-first-skirmish';
import { runVttReplayCommand } from '../../../tools/vtt-replay';

interface MutableReplayBundle {
  schemaVersion: number;
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
      projections: {
        dm: { revision: number };
        players: Array<{ combatantId: string; projection: { revision: number } }>;
      };
    };
  }>;
  transcripts: Array<{
    kind: string;
    requestId: string | null;
    requestLink: { requestId: string; requestSequence: number } | null;
    fleet: {
      latencyMs: number | null;
      tokenCounts: { input: number; cachedInput: number; output: number; reasoning: number } | null;
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
    const requests = candidate.transcripts.filter((entry) => entry.kind === 'controller_request');
    const second = requests[1];
    const first = requests[0];
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

  it('OWN-TOKEN-COUNTS-CANNOT-INFLUENCE-REDUCER keeps usage out of state and projections', () => {
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

  it('OWN-BUNDLE-VERSION-OUTSIDE-WINDOW is refused while the adjacent migration remains exact', () => {
    const gate = recordScriptedReferenceSkirmish();
    expect(decodeReplayBundle(exportReplayBundleV1ForMigrationTest(gate.bundle))).toEqual(gate.bundle);
    for (const version of [0, 4]) {
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
