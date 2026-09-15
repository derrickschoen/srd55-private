import { describe, expect, it } from 'vitest';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { ControllerRequest } from '../../../src/combat/controllers';
import type { EncounterCommand } from '../../../src/combat/events';
import { projectDmView } from '../../../src/combat/visibility';
import { damageType, dieSides, agentSessionId, encounterEffectId, encounterSessionId, type CombatantId } from '../../../src/combat/values';
import { projectDmBoard } from '../../../src/vtt/encounter-projections';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import { DmRoundPlanSession } from '../../../src/vtt/dm-bridge/decision-program';
import {
  DM_BRIDGE_PROTOCOL_VERSION,
  STEERING_REPLY_JSON_SCHEMA,
  decodeSteeringReply,
  type DmBridgeExchange,
  type DmBridgeRequest,
  type SteeringRoundRequest,
} from '../../../src/vtt/dm-bridge/contracts';
import {
  E06_TRIGGER_POLICY,
  applySteeringOverrides,
  steeringConsultReason,
  steeringTriggerEvents,
  type SteeringTelemetry,
  type SteeringTriggerEvents,
} from '../../../src/vtt/dm-bridge/steering';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const OFFER_ENVIRONMENT = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'legacy_standard',
});

const IDLE = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' as const },
  pause: null,
};

function fixture(round = 2) {
  const monsterA = monsterProfile('steering-a', { hitPoints: 40 });
  const monsterB = monsterProfile('steering-b', { hitPoints: 35 });
  const playerA = playerProfile('steering-player-a');
  const playerB = playerProfile('steering-player-b');
  const base = createEncounter({
    bounds: { columns: 12, rows: 4 },
    combatants: [monsterA, monsterB, playerA, playerB],
    tokens: [
      placedToken(monsterA, 0),
      placedToken(monsterB, 1),
      placedToken(playerA, 3),
      placedToken(playerB, 8),
    ],
  });
  const state: EncounterState = { ...base, revision: 9, round, activeCombatant: monsterA.id };
  return { monsterA, monsterB, playerA, playerB, state };
}

function board(state: EncounterState) {
  return projectDmBoard({
    view: projectDmView(state),
    coordinator: IDLE,
    controllers: [],
    history: [],
    offerEnvironment: OFFER_ENVIRONMENT,
  });
}

function context(state: EncounterState) {
  return {
    encounterId: encounterSessionId('encounter:steering'),
    agentSessionId: agentSessionId('codex:steering'),
    projection: board(state),
    history: [],
    initiativeMode: state.config.initiativeMode,
  };
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
      terms: [{ type: damageType('Slashing'), dice: { count: 1, sides: dieSides(6), modifier: 2 } }],
      critical: false,
      responses: [],
    },
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
    visibleState: board(state).encounter,
    legalActions: { actions },
  };
}

function steeringIdentity(request: SteeringRoundRequest) {
  return {
    protocolVersion: DM_BRIDGE_PROTOCOL_VERSION,
    encounterId: request.encounterId,
    requestId: request.requestId,
    expectedRevision: request.expectedRevision,
    round: request.round,
  };
}

class FakeSteeringExchange implements DmBridgeExchange {
  readonly requests: DmBridgeRequest[] = [];
  constructor(private readonly reply: (request: DmBridgeRequest) => unknown) {}
  async exchange(request: DmBridgeRequest): Promise<unknown> {
    this.requests.push(request);
    return this.reply(request);
  }
}

describe('E06 steering split', () => {
  it('STEERING-APPROVE sends the full algorithm proposal and uses an empty approval', async () => {
    const f = fixture();
    const telemetry: SteeringTelemetry[] = [];
    const exchange = new FakeSteeringExchange((request) => {
      if (request.kind !== 'steering_round_request') throw new Error('Expected steering request.');
      return { kind: 'steering_approve', ...steeringIdentity(request) };
    });
    const session = new DmRoundPlanSession(
      exchange,
      undefined,
      undefined,
      'json_ast',
      {},
      { kind: 'algorithm_with_overrides' },
      (value) => telemetry.push(value),
    );
    const result = await session.choose(
      controllerRequest(f.state, f.monsterA.id, [
        attack(f.monsterA.id, f.playerB.id),
        attack(f.monsterA.id, f.playerA.id),
      ]),
      context(f.state),
      new AbortController().signal,
    );

    expect(result.action).toEqual(attack(f.monsterA.id, f.playerA.id));
    expect(exchange.requests[0]).toMatchObject({
      kind: 'steering_round_request',
      consultReason: 'every_round',
      proposal: { monsters: [{ monsterId: f.monsterA.id }, { monsterId: f.monsterB.id }] },
      projection: { audience: 'dm', encounter: { revision: 9 } },
    });
    expect(telemetry).toHaveLength(1);
    expect(telemetry[0]).toMatchObject({
      replyKind: 'approve',
      overrideCount: 0,
      consultReason: 'every_round',
    });
    expect(telemetry[0]?.proposalSize).toBeGreaterThan(0);
  });

  it('STEERING-OVERRIDE deterministically retargets the proposal through the normal program executor', async () => {
    const f = fixture();
    const exchange = new FakeSteeringExchange((request) => {
      if (request.kind !== 'steering_round_request') throw new Error('Expected steering request.');
      return {
        kind: 'steering_overrides',
        ...steeringIdentity(request),
        overrides: [{
          kind: 'retarget',
          monsterId: f.monsterA.id,
          target: { kind: 'combatant', combatantId: f.playerB.id },
        }],
      };
    });
    const session = new DmRoundPlanSession(
      exchange, undefined, undefined, 'json_ast', {}, { kind: 'algorithm_with_overrides' },
    );
    const result = await session.choose(
      controllerRequest(f.state, f.monsterA.id, [
        attack(f.monsterA.id, f.playerA.id),
        attack(f.monsterA.id, f.playerB.id),
      ]),
      context(f.state),
      new AbortController().signal,
    );
    expect(result.action).toEqual(attack(f.monsterA.id, f.playerB.id));
  });

  it('STEERING-REPLACE accepts the unbounded full replacement arm and validates it as a RoundPlan', async () => {
    const f = fixture();
    const exchange = new FakeSteeringExchange((request) => {
      if (request.kind !== 'steering_round_request') throw new Error('Expected steering request.');
      return {
        kind: 'steering_replacement',
        ...steeringIdentity(request),
        replacement: {
          ...request.proposal,
          monsters: request.proposal.monsters.map((entry) => ({
            monsterId: entry.monsterId,
            program: { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
          })),
        },
      };
    });
    const session = new DmRoundPlanSession(
      exchange, undefined, undefined, 'json_ast', {}, { kind: 'algorithm_with_overrides' },
    );
    await expect(session.choose(
      controllerRequest(f.state, f.monsterA.id, [{ type: 'end_turn', actor: f.monsterA.id }]),
      context(f.state),
      new AbortController().signal,
    )).resolves.toMatchObject({ action: { type: 'end_turn', actor: f.monsterA.id } });
  });

  it('TRIGGER-POLICY-MATRIX consults only for every-round or the five registered E06 reasons', () => {
    const quiet: SteeringTriggerEvents = {
      combatantDownOrDied: false,
      controlChanged: false,
      retreatThresholdCrossed: false,
    };
    const triggered = (events: Partial<SteeringTriggerEvents>, topActionGapPercent = 10, round = 2) =>
      steeringConsultReason({
        mode: { kind: 'algorithm_triggered', policy: E06_TRIGGER_POLICY },
        round,
        topActionGapPercent,
        events: { ...quiet, ...events },
      });
    expect(steeringConsultReason({
      mode: { kind: 'algorithm_with_overrides' }, round: 8, topActionGapPercent: 99, events: quiet,
    })).toBe('every_round');
    expect(triggered({}, 10, 1)).toBe('round_one');
    expect(triggered({}, 4.999)).toBe('near_tie_top_actions');
    expect(triggered({ combatantDownOrDied: true })).toBe('combatant_down_or_dead');
    expect(triggered({ controlChanged: true })).toBe('control_change');
    expect(triggered({ retreatThresholdCrossed: true })).toBe('retreat_threshold');
    expect(triggered({})).toBeNull();
  });

  it('TRIGGER-EVENT-DERIVATION detects down/death, control, and retreat-threshold crossings', () => {
    const f = fixture();
    const previous = board(f.state).encounter;
    const current = {
      ...previous,
      revision: previous.revision + 1,
      combatants: previous.combatants.map((combatant) =>
        combatant.id === f.monsterA.id
          ? { ...combatant, hitPoints: 10 }
          : combatant.id === f.playerA.id
            ? { ...combatant, hitPoints: 0, life: 'dead' as const }
            : combatant,
      ),
      recentEvents: [
        ...previous.recentEvents,
        {
          sequence: 1,
          type: 'effect_applied' as const,
          effectId: encounterEffectId('effect:control-change'),
          source: f.monsterA.id,
          targets: [f.playerB.id],
        },
      ],
    };
    expect(steeringTriggerEvents(previous, current, 25)).toEqual({
      combatantDownOrDied: true,
      controlChanged: true,
      retreatThresholdCrossed: true,
    });
  });

  it('trigger_policy_ignored does not call the fake exchange on a quiet later round', async () => {
    const f = fixture(3);
    const exchange = new FakeSteeringExchange(() => {
      throw new Error('Quiet trigger-only round must not consult.');
    });
    const telemetry: SteeringTelemetry[] = [];
    const session = new DmRoundPlanSession(
      exchange,
      undefined,
      undefined,
      'json_ast',
      {},
      {
        kind: 'algorithm_triggered',
        policy: { nearTiePercent: 0, retreatHitPointPercent: 25 },
      },
      (value) => telemetry.push(value),
    );
    await session.startRound(context(f.state), new AbortController().signal);
    expect(exchange.requests).toEqual([]);
    expect(telemetry).toHaveLength(1);
    expect(telemetry[0]).toMatchObject({
      replyKind: 'not_consulted',
      overrideCount: 0,
      consultReason: null,
    });
    expect(telemetry[0]?.proposalSize).toBeGreaterThan(0);
  });

  it('override_invents_action rejects an override that smuggles an action outside the typed set', () => {
    const f = fixture();
    const request: SteeringRoundRequest = {
      kind: 'steering_round_request',
      protocolVersion: DM_BRIDGE_PROTOCOL_VERSION,
      encounterId: encounterSessionId('encounter:steering'),
      requestId: 'request:strict-override',
      expectedRevision: f.state.revision,
      round: f.state.round,
      agentSessionId: agentSessionId('codex:steering'),
      model: { model: 'fake', reasoningEffort: 'low' },
      projection: board(f.state),
      history: [],
      proposal: {
        kind: 'round_plan',
        protocolVersion: DM_BRIDGE_PROTOCOL_VERSION,
        encounterId: encounterSessionId('encounter:steering'),
        requestId: 'request:strict-override',
        expectedRevision: f.state.revision,
        round: f.state.round,
        monsters: [{
          monsterId: f.monsterA.id,
          program: { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
        }],
      },
      consultReason: 'every_round',
      replyContract: { schemaVersion: 1, jsonSchema: STEERING_REPLY_JSON_SCHEMA },
      correctionAttempt: 0,
    };
    expect(() => decodeSteeringReply({
      kind: 'steering_overrides',
      ...steeringIdentity(request),
      overrides: [{
        kind: 'invoke_action',
        monsterId: f.monsterA.id,
        action: { kind: 'teleport_everyone' },
      }],
    }, request)).toThrow();
  });

  it('override_order_nondeterministic applies the typed override set identically in either wire order', async () => {
    const f = fixture();
    let captured: SteeringRoundRequest | null = null;
    const exchange = new FakeSteeringExchange((request) => {
      if (request.kind !== 'steering_round_request') throw new Error('Expected steering request.');
      captured = request;
      return { kind: 'steering_approve', ...steeringIdentity(request) };
    });
    await new DmRoundPlanSession(
      exchange, undefined, undefined, 'json_ast', {}, { kind: 'algorithm_with_overrides' },
    ).startRound(context(f.state), new AbortController().signal);
    if (captured === null) throw new Error('Missing steering request.');
    const request: SteeringRoundRequest = captured;
    const proposal = request.proposal.monsters.find((entry) => entry.monsterId === f.monsterA.id)?.program;
    if (proposal?.kind !== 'priority') throw new Error('Algorithm proposal must be a priority program.');
    const overrides = [
      {
        kind: 'retarget' as const,
        monsterId: f.monsterA.id,
        target: { kind: 'combatant' as const, combatantId: f.playerB.id },
      },
      {
        kind: 'priority_reorder' as const,
        monsterId: f.monsterA.id,
        order: proposal.choices.map((_choice, index) => proposal.choices.length - index - 1),
      },
      {
        kind: 'stance_change' as const,
        monsterId: f.monsterA.id,
        stance: 'defensive' as const,
      },
      {
        kind: 'special_ability_invocation' as const,
        monsterId: f.monsterA.id,
        ability: 'force_save' as const,
        target: { kind: 'nearest_enemy' as const },
      },
    ];
    expect(applySteeringOverrides(request.proposal, overrides, request)).toEqual(
      applySteeringOverrides(request.proposal, [...overrides].reverse(), request),
    );
  });
});
