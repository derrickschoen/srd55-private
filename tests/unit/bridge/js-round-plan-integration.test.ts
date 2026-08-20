import { describe, expect, it } from 'vitest';
import type { ControllerRequest } from '../../../src/combat/controllers';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { damageType, dieSides } from '../../../src/combat/values';
import {
  codexSessionId,
  encounterSessionId,
  type CombatantId,
} from '../../../src/combat/values';
import { projectDmBoard } from '../../../src/vtt/encounter-projections';
import { DmRoundPlanSession } from '../../../src/vtt/dm-bridge/decision-program';
import {
  DM_BRIDGE_PROTOCOL_VERSION,
  ROUND_PLAN_JS_REPLY_CONTRACT,
  type DmBridgeExchange,
  type DmBridgeRequest,
} from '../../../src/vtt/dm-bridge/contracts';
import {
  JS_TURN_PROGRAM_CANONICAL_EXAMPLE,
  JS_TURN_PROGRAM_GRAMMAR,
} from '../../../src/vtt/dm-bridge/js-turn-program';
import {
  ReplayTranscriptRecorder,
  decodeReplayBundle,
  emptyFleetTelemetry,
  exportReplayBundle,
  replayBundle,
  type ReplayBundle,
} from '../../../src/vtt/replay';
import { recordScriptedReferenceSkirmish } from '../../../src/vtt/scripted-skirmish';
import { TEST_APPROVED_FIRST_SKIRMISH_FIXTURE } from '../../../src/vtt/test-approved-first-skirmish';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const IDLE = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' as const },
  pause: null,
};

function fixture() {
  const monster = monsterProfile('js-integration-monster', { hitPoints: 30 });
  const player = playerProfile('js-integration-player');
  const base = createEncounter({
    bounds: { columns: 8, rows: 2 },
    combatants: [monster, player],
    tokens: [placedToken(monster, 0), placedToken(player, 2)],
  });
  const state: EncounterState = {
    ...base,
    revision: 4,
    round: 1,
    activeCombatant: monster.id,
  };
  return { monster, player, state };
}

function attack(actor: CombatantId, target: CombatantId): Extract<EncounterCommand, { readonly type: 'attack' }> {
  return {
    type: 'attack',
    actor,
    target,
    attackBonus: 5,
    criticalFloor: 20,
    rollMode: 'normal',
    attackerCanSeeTarget: true,
    targetCanSeeAttacker: true,
    damage: {
      terms: [{
        type: damageType('Slashing'),
        dice: { count: 1, sides: dieSides(6), modifier: 2 },
      }],
      critical: false,
      responses: [],
    },
  };
}

function context(state: EncounterState) {
  return {
    encounterId: encounterSessionId('encounter:js-integration'),
    codexSessionId: codexSessionId('codex:fake-js-exchange'),
    projection: projectDmBoard({ state, coordinator: IDLE, controllers: [], history: [] }),
    history: [],
    initiativeMode: state.config.initiativeMode,
  };
}

function controllerRequest(
  state: EncounterState,
  actor: CombatantId,
  actions: readonly EncounterCommand[],
): ControllerRequest {
  return {
    kind: 'turn',
    requestId: `turn:${state.revision}:${actor}`,
    encounterRevision: state.revision,
    actorId: actor,
    visibleState: context(state).projection.encounter,
    legalActions: { actions },
  };
}

function requestedMonsterIds(request: DmBridgeRequest): readonly CombatantId[] {
  return request.kind === 'round_plan_request'
    ? request.livingMonsterIds
    : request.kind === 'monster_reconsult_request'
      ? [request.monsterId]
      : request.requestedMonsterIds;
}

function jsReply(request: DmBridgeRequest, source: string): unknown {
  return {
    kind: 'js_round_plan',
    protocolVersion: DM_BRIDGE_PROTOCOL_VERSION,
    encounterId: request.encounterId,
    requestId: request.requestId,
    expectedRevision: request.expectedRevision,
    round: request.round,
    monsters: requestedMonsterIds(request).map((monsterId) => ({ monsterId, source })),
  };
}

class FakeJsExchange implements DmBridgeExchange {
  readonly requests: DmBridgeRequest[] = [];

  constructor(private readonly source: string) {}

  async exchange(request: DmBridgeRequest): Promise<unknown> {
    this.requests.push(request);
    return jsReply(request, this.source);
  }
}

describe('JS round-plan protocol and replay integration', () => {
  it('derives the js_program prompt contract from the interpreter grammar module', () => {
    expect(ROUND_PLAN_JS_REPLY_CONTRACT).toEqual({
      surface: 'js_program',
      schemaVersion: 1,
      grammar: JS_TURN_PROGRAM_GRAMMAR,
      canonicalExample: JS_TURN_PROGRAM_CANONICAL_EXAMPLE,
      maximumCorrectionAttempts: 2,
    });
  });

  it('a js_program plan drives a fake-exchange table and replays source plus emitted DecisionProgram byte-for-byte', async () => {
    const f = fixture();
    const source = 'const target = nearestEnemy(); emit(priority(attack(target), endTurn()));';
    const exchange = new FakeJsExchange(source);
    const session = new DmRoundPlanSession(exchange, undefined, undefined, 'js_program');
    const legalAttack = attack(f.monster.id, f.player.id);

    const decision = await session.choose(
      controllerRequest(f.state, f.monster.id, [legalAttack, { type: 'end_turn', actor: f.monster.id }]),
      context(f.state),
      new AbortController().signal,
    );

    expect(decision.action).toEqual(legalAttack);
    expect(exchange.requests).toHaveLength(1);
    expect(exchange.requests[0]).toMatchObject({
      surface: 'js_program',
      replyContract: { surface: 'js_program', grammar: JS_TURN_PROGRAM_GRAMMAR },
    });
    const artifact = session.jsProgramArtifact(1, f.monster.id);
    if (artifact === null) throw new Error('JS integration requires its compiled artifact.');
    expect(artifact).toMatchObject({
      monsterId: f.monster.id,
      source,
      emittedDecisionProgram: {
        kind: 'priority',
        choices: [
          { kind: 'action', action: { kind: 'attack' } },
          { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
        ],
      },
    });

    const recorder = new ReplayTranscriptRecorder();
    const identity = { kind: 'agent' as const, controllerId: 'js-program:fake-exchange' };
    const requestRecord = recorder.record({
      kind: 'controller_request',
      encounterRevision: f.state.revision,
      controller: identity,
      requestId: exchange.requests[0]!.requestId,
      requestLink: null,
      payload: exchange.requests[0],
      fleet: emptyFleetTelemetry(),
    });
    recorder.record({
      kind: 'round_plan',
      encounterRevision: f.state.revision,
      controller: identity,
      requestId: null,
      requestLink: {
        requestId: exchange.requests[0]!.requestId,
        requestSequence: requestRecord.sequence,
      },
      payload: {
        surface: 'js_program',
        monsterId: artifact.monsterId,
        source: artifact.source,
        emittedDecisionProgram: artifact.emittedDecisionProgram,
      },
      fleet: emptyFleetTelemetry(),
    });
    const baseline = recordScriptedReferenceSkirmish().bundle;
    const bundle: ReplayBundle = { ...baseline, transcripts: recorder.records() };
    const bytes = exportReplayBundle(bundle);
    const decoded = decodeReplayBundle(bytes);

    expect(exportReplayBundle(decoded)).toBe(bytes);
    expect(decoded.transcripts[1]?.payload).toEqual({
      surface: 'js_program',
      monsterId: artifact.monsterId,
      source,
      emittedDecisionProgram: artifact.emittedDecisionProgram,
    });
    expect(replayBundle(decoded, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE)).toEqual(
      replayBundle(bundle, TEST_APPROVED_FIRST_SKIRMISH_FIXTURE),
    );
  });

  it('interpreter_bypasses_validation rejects an emitted action through DecisionProgram validation', async () => {
    const f = fixture();
    const exchange = new FakeJsExchange('emit(retreat(-1, 0));');
    const session = new DmRoundPlanSession(exchange, undefined, undefined, 'js_program');

    await expect(session.startRound(context(f.state), new AbortController().signal)).rejects.toThrow(
      'round plan.monsters[0].program.action.destination.column',
    );
    expect(exchange.requests.map((request) => request.correctionAttempt)).toEqual([0, 1, 2]);
  });

  it('js_source_missing_from_replay keeps both source and validated output in the authoritative transcript', async () => {
    const f = fixture();
    const source = 'emit(endTurn());';
    const session = new DmRoundPlanSession(new FakeJsExchange(source), undefined, undefined, 'js_program');
    await session.startRound(context(f.state), new AbortController().signal);
    const artifact = session.jsProgramArtifact(1, f.monster.id);
    expect(artifact).toMatchObject({
      source,
      emittedDecisionProgram: { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
    });
  });
});
