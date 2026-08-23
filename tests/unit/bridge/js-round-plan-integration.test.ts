import { describe, expect, it } from 'vitest';
import type { ControllerRequest } from '../../../src/combat/controllers';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EncounterCommand } from '../../../src/combat/events';
import { damageType, dieSides, feet } from '../../../src/combat/values';
import {
  codexSessionId,
  encounterSessionId,
  type CombatantId,
} from '../../../src/combat/values';
import { projectDmBoard } from '../../../src/vtt/encounter-projections';
import {
  DmRoundPlanSession,
  RoundPlanDryError,
} from '../../../src/vtt/dm-bridge/decision-program';
import {
  DM_BRIDGE_PROTOCOL_VERSION,
  JS_ROUND_PLAN_WORKED_EXAMPLES,
  ROUND_PLAN_JS_REPLY_CONTRACT,
  decodeRoundPlanReply,
  observeTypeCheckUniqueCatch,
  type DmBridgeExchange,
  type DmBridgeRequest,
  type RoundPlanRequest,
} from '../../../src/vtt/dm-bridge/contracts';
import {
  JS_TURN_PROGRAM_GRAMMAR,
} from '../../../src/vtt/dm-bridge/js-turn-program';
import {
  JsTurnProgramTypeError,
  MAX_TURN_PROGRAM_MOVEMENT_FEET,
  TurnProgramMovementDomainError,
  generateTurnProgramDeclarations,
  typeCheckJsTurnProgram,
  type TurnProgramTypeCheckTelemetry,
} from '../../../src/vtt/dm-bridge/turn-program-types';
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
    combatants: base.combatants.map((combatant) => combatant.profile.id === monster.id
      ? {
          ...combatant,
          turn: {
            ...combatant.turn,
            movement: { speed: feet(30), spent: feet(0), remaining: feet(30) },
          },
        }
      : combatant),
    revision: 4,
    round: 1,
    activeCombatant: monster.id,
  };
  return { monster, player, state };
}

function castSpell(
  actor: CombatantId,
  target: CombatantId,
  spellId = 'frost-spark',
): Extract<EncounterCommand, { readonly type: 'cast_spell' }> {
  return {
    type: 'cast_spell', actor, spellId, slotLevel: 1, castAsRitual: false,
    casterLevel: 3, attackBonus: 5, saveDc: 13, spellcastingModifier: 3,
    targets: [target], area: null, weaponAttack: null, selectedOption: null,
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

function decisionProjection(
  state: EncounterState,
  actor: CombatantId,
  actions: readonly EncounterCommand[],
) {
  const pendingRequest = controllerRequest(state, actor, actions);
  return projectDmBoard({
    state,
    coordinator: { ...IDLE, pendingRequest },
    controllers: [],
    history: [],
  });
}

function requestedMonsterIds(request: DmBridgeRequest): readonly CombatantId[] {
  return request.kind === 'round_plan_request'
    ? request.livingMonsterIds
    : request.kind === 'monster_reconsult_request'
      ? [request.monsterId]
      : request.kind === 'round_plan_correction_request'
        ? request.requestedMonsterIds
        : request.proposal.monsters.map((entry) => entry.monsterId);
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

function batchFixture() {
  const monsters = Array.from({ length: 4 }, (_value, index) =>
    monsterProfile(`normalization-monster-${String(index + 1)}`, { hitPoints: 20 }));
  const player = playerProfile('normalization-player');
  const base = createEncounter({
    bounds: { columns: 10, rows: 2 },
    combatants: [...monsters, player],
    tokens: [...monsters.map((monster, index) => placedToken(monster, index)), placedToken(player, 8)],
  });
  const state: EncounterState = { ...base, revision: 4, round: 1 };
  return { monsters, player, state };
}

function jsRequest(state: EncounterState, livingMonsterIds: readonly CombatantId[]): RoundPlanRequest {
  const requestContext = context(state);
  return {
    kind: 'round_plan_request',
    protocolVersion: DM_BRIDGE_PROTOCOL_VERSION,
    encounterId: requestContext.encounterId,
    requestId: 'request:envelope-normalization',
    expectedRevision: state.revision,
    round: state.round,
    codexSessionId: requestContext.codexSessionId,
    model: { model: 'gpt-5.6-terra', reasoningEffort: 'medium' },
    projection: requestContext.projection,
    history: [],
    livingMonsterIds,
    surface: 'js_program',
    replyContract: ROUND_PLAN_JS_REPLY_CONTRACT,
    correctionAttempt: 0,
  };
}

function canonicalJsEnvelope(request: RoundPlanRequest): Readonly<Record<string, unknown>> {
  return {
    kind: 'js_round_plan',
    protocolVersion: request.protocolVersion,
    encounterId: request.encounterId,
    requestId: request.requestId,
    expectedRevision: request.expectedRevision,
    round: request.round,
    monsters: request.livingMonsterIds.map((monsterId) => ({ monsterId, source: 'emit(endTurn());' })),
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
  it.each([
    ['program', 'round_plan'],
    ['source', 'js_program'],
    ['code', 'round_plan'],
    ['sourceCode', 'js_program'],
    ['plan', 'decision_program'],
  ] as const)(
    'normalizes the measured bare %s single-program shape through the real decoder',
    (field, kind) => {
      const f = fixture();
      const request = jsRequest(f.state, [f.monster.id]);
      const decoded = decodeRoundPlanReply({ kind, [field]: 'emit(endTurn());' }, request, {
        typeCheckMode: 'untyped',
      });

      expect(decoded.envelopeNormalizationRule).toBe('single_program');
      expect(decoded.jsPrograms).toMatchObject([{ monsterId: f.monster.id, source: 'emit(endTurn());' }]);
      expect(decoded.plan.monsters).toHaveLength(1);
    },
  );

  it.each([
    ['programs', 'programs_collection'],
    ['plans', 'plans_collection'],
  ] as const)('normalizes the measured %s collection alias with per-entry aliases', (field, rule) => {
    const f = batchFixture();
    const ids = f.monsters.map((monster) => monster.id);
    const request = jsRequest(f.state, ids);
    const entries = ids.map((monsterId, index) => index % 2 === 0
      ? { combatantId: monsterId, program: 'emit(endTurn());' }
      : { actorId: monsterId, source: 'emit(endTurn());' });
    const decoded = decodeRoundPlanReply({ kind: 'round_plan', [field]: entries }, request, {
      typeCheckMode: 'untyped',
    });

    expect(decoded.envelopeNormalizationRule).toBe(rule);
    expect(decoded.jsPrograms.map((entry) => entry.monsterId)).toEqual(ids);
  });

  it.each(['source', 'program', 'code', 'sourceCode'] as const)(
    'normalizes the measured per-entry %s program field inside monsters',
    (field) => {
      const f = fixture();
      const request = jsRequest(f.state, [f.monster.id]);
      const decoded = decodeRoundPlanReply({
        monsters: [{ combatantId: f.monster.id, [field]: 'emit(endTurn());' }],
      }, request, { typeCheckMode: 'untyped' });

      expect(decoded.envelopeNormalizationRule).toBe('monster_entry_aliases');
      expect(decoded.jsPrograms[0]).toMatchObject({ monsterId: f.monster.id, source: 'emit(endTurn());' });
    },
  );

  it('normalizes measured object maps both at the body and collection levels', () => {
    const f = batchFixture();
    const ids = f.monsters.map((monster) => monster.id);
    const request = jsRequest(f.state, ids);
    const keyed = Object.fromEntries(ids.map((monsterId) => [monsterId, 'emit(endTurn());']));

    const body = decodeRoundPlanReply(keyed, request, { typeCheckMode: 'untyped' });
    const plans = decodeRoundPlanReply({ plans: keyed }, request, { typeCheckMode: 'untyped' });

    expect(body.envelopeNormalizationRule).toBe('combatant_keyed_object');
    expect(plans.envelopeNormalizationRule).toBe('plans_collection');
    expect(body.jsPrograms.map((entry) => entry.monsterId)).toEqual(ids);
    expect(plans.jsPrograms.map((entry) => entry.monsterId)).toEqual(ids);
  });

  it('fills only absent envelope identity fields and reports that rule', () => {
    const f = fixture();
    const request = jsRequest(f.state, [f.monster.id]);
    const decoded = decodeRoundPlanReply({
      monsters: [{ monsterId: f.monster.id, source: 'emit(endTurn());' }],
    }, request, { typeCheckMode: 'untyped' });

    expect(decoded.envelopeNormalizationRule).toBe('missing_envelope_fields');
    expect(decoded.plan).toMatchObject({
      encounterId: request.encounterId,
      requestId: request.requestId,
      expectedRevision: request.expectedRevision,
      round: request.round,
    });
  });

  it('single_program_accepted_for_batch: refuses a bare program for a batch and names every missing association', async () => {
    const f = batchFixture();
    const ids = f.monsters.map((monster) => monster.id);
    const exchange = new class implements DmBridgeExchange {
      readonly requests: DmBridgeRequest[] = [];

      async exchange(request: DmBridgeRequest): Promise<unknown> {
        this.requests.push(request);
        if (this.requests.length === 1) return { program: 'emit(endTurn());' };
        return jsReply(request, 'emit(endTurn());');
      }
    }();
    const session = new DmRoundPlanSession(exchange, undefined, undefined, 'js_program', {
      typeCheckMode: 'untyped',
    });

    await expect(session.startRound(context(f.state), new AbortController().signal)).resolves.toMatchObject({
      monsters: expect.arrayContaining(ids.map((monsterId) => expect.objectContaining({ monsterId }))),
    });
    expect(exchange.requests[1]).toMatchObject({
      validatorError: `Bare single-program reply cannot be associated with multiple requested monsters; programs were required for ${ids.join(', ')}.`,
      requestedMonsterIds: ids,
    });
  });

  it.each([
    ['protocolVersion', 1],
    ['encounterId', 'encounter:wrong'],
    ['requestId', 'request:wrong'],
    ['expectedRevision', 999],
    ['round', 999],
  ] as const)('wrong_identity_filled: refuses present-but-wrong %s instead of replacing it', (field, wrong) => {
    const f = fixture();
    const request = jsRequest(f.state, [f.monster.id]);
    const reply = { ...canonicalJsEnvelope(request), [field]: wrong };

    expect(() => decodeRoundPlanReply(reply, request, { typeCheckMode: 'untyped' })).toThrow();
  });

  it('refuses an incomplete combatant-keyed batch instead of guessing missing programs', () => {
    const f = batchFixture();
    const ids = f.monsters.map((monster) => monster.id);
    const request = jsRequest(f.state, ids);
    expect(() => decodeRoundPlanReply({ [String(ids[0])]: 'emit(endTurn());' }, request, {
      typeCheckMode: 'untyped',
    })).toThrow('exactly one source program for each requested monster');
  });

  it('refuses the unmeasured per-entry plan alias while retaining the measured root plan alias', () => {
    const f = fixture();
    const request = jsRequest(f.state, [f.monster.id]);
    expect(() => decodeRoundPlanReply({
      monsters: [{ monsterId: f.monster.id, plan: 'emit(endTurn());' }],
    }, request, { typeCheckMode: 'untyped' })).toThrow('unexpected field plan');
  });

  it('dts_widens_to_string is killed by actor-visible literal unions and unavailable combatant diagnostics', () => {
    const f = fixture();
    const projection = decisionProjection(f.state, f.monster.id, [
      { ...attack(f.monster.id, f.player.id), attackId: 'claw' },
      { type: 'end_turn', actor: f.monster.id },
    ]);
    const declaration = generateTurnProgramDeclarations(projection, f.monster.id);
    const result = typeCheckJsTurnProgram("emit(attack('combatant:not-present'));", declaration.source);

    expect(declaration.source).toContain(
      `type CombatantId = "${String(f.monster.id)}" | "${String(f.player.id)}";`,
    );
    expect(declaration.source).not.toContain('type CombatantId = string');
    expect(result.passed).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 2345, line: 1 }));
  });

  it('a spell absent from reducer-enumerated legal casts fails with a compiler diagnostic', () => {
    const f = fixture();
    const projection = decisionProjection(f.state, f.monster.id, [
      castSpell(f.monster.id, f.player.id),
      { type: 'end_turn', actor: f.monster.id },
    ]);
    const declaration = generateTurnProgramDeclarations(projection, f.monster.id);
    const result = typeCheckJsTurnProgram(
      `emit(castSpell('unprepared-spell', '${String(f.player.id)}'));`,
      declaration.source,
    );

    expect(declaration.spellIds).toEqual(['frost-spark']);
    expect(result.passed).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 2345 }));
  });

  it('movement above the branded decision-time budget fails to compile', () => {
    const f = fixture();
    const projection = decisionProjection(f.state, f.monster.id, [
      { type: 'end_turn', actor: f.monster.id },
    ]);
    const declaration = generateTurnProgramDeclarations(projection, f.monster.id);
    const result = typeCheckJsTurnProgram(
      `emit(move('${String(f.player.id)}', 31));`,
      declaration.source,
    );

    expect(declaration.movementBudgetFeet).toBe(30);
    expect(declaration.source).toContain('type MovementBudgetFeet = 30;');
    expect(result.passed).toBe(false);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 2345 }));
  });

  it('numberUnion defensive boundary emits the cap and throws a typed error one foot over', () => {
    const f = fixture();
    const projection = decisionProjection(f.state, f.monster.id, [{ type: 'end_turn', actor: f.monster.id }]);
    const mutable = projection as unknown as {
      encounter: { combatants: Array<{ id: CombatantId; turn: { movement: { remaining: number } } }> };
    };
    const actor = mutable.encounter.combatants.find((combatant) => combatant.id === f.monster.id);
    if (actor === undefined) throw new Error('Typed declaration actor is missing.');
    actor.turn.movement.remaining = MAX_TURN_PROGRAM_MOVEMENT_FEET;
    const atCap = generateTurnProgramDeclarations(projection, f.monster.id);
    expect(atCap.source).toContain(`type MovementBudgetFeet = ${String(MAX_TURN_PROGRAM_MOVEMENT_FEET)};`);
    expect(atCap.source).toContain(` | ${String(MAX_TURN_PROGRAM_MOVEMENT_FEET)}) &`);

    actor.turn.movement.remaining = MAX_TURN_PROGRAM_MOVEMENT_FEET + 1;
    expect(() => generateTurnProgramDeclarations(projection, f.monster.id)).toThrowError(
      new TurnProgramMovementDomainError(MAX_TURN_PROGRAM_MOVEMENT_FEET + 1),
    );
  });

  it('dts_ordering_nondeterministic is killed by byte-identical declarations with stable unions', () => {
    const f = fixture();
    const actions = [
      castSpell(f.monster.id, f.player.id, 'zeta-spell'),
      castSpell(f.monster.id, f.player.id, 'alpha-spell'),
      { ...attack(f.monster.id, f.player.id), attackId: 'zeta-attack' },
      { ...attack(f.monster.id, f.player.id), attackId: 'alpha-attack' },
    ] satisfies readonly EncounterCommand[];
    const projection = decisionProjection(f.state, f.monster.id, actions);
    const first = generateTurnProgramDeclarations(projection, f.monster.id);
    const second = generateTurnProgramDeclarations(structuredClone(projection), f.monster.id);

    expect(second.source).toBe(first.source);
    expect(first.spellIds).toEqual(['alpha-spell', 'zeta-spell']);
    expect(first.attackIds).toEqual(['alpha-attack', 'zeta-attack']);
  });

  it('reuses the compiler host/library snapshot within the turn-loop latency budget', () => {
    const f = fixture();
    const projection = decisionProjection(f.state, f.monster.id, [
      { ...attack(f.monster.id, f.player.id), attackId: 'claw' },
      { type: 'end_turn', actor: f.monster.id },
    ]);
    const declaration = generateTurnProgramDeclarations(projection, f.monster.id);
    const source = `emit(attack('claw', '${String(f.player.id)}'));`;
    typeCheckJsTurnProgram(source, declaration.source);
    const durations = Array.from({ length: 21 }, () =>
      typeCheckJsTurnProgram(source, declaration.source).durationMs).sort((left, right) => left - right);
    const median = durations[10];

    if (median === undefined) throw new Error('Synthetic type-check sample is empty.');
    console.info(`[typed-js] synthetic warm median type-check ${median.toFixed(2)}ms`);
    expect(median).toBeLessThan(25);
  });

  it('typecheck_result_ignored is killed by refusal before interpretation with verbatim correction diagnostics and telemetry', async () => {
    const f = fixture();
    const telemetry: TurnProgramTypeCheckTelemetry[] = [];
    const exchange = new FakeJsExchange(`emit(move('${String(f.player.id)}', 31));`);
    const session = new DmRoundPlanSession(
      exchange,
      undefined,
      undefined,
      'js_program',
      { now: () => 7, onTypeCheckTelemetry: (entry) => telemetry.push(entry) },
    );
    let caught: unknown;
    try {
      await session.startRound(context(f.state), new AbortController().signal);
    } catch (error: unknown) {
      caught = error;
    }
    const cause = caught instanceof Error ? caught.cause : undefined;

    expect(cause).toBeInstanceOf(JsTurnProgramTypeError);
    if (!(cause instanceof JsTurnProgramTypeError)) throw new Error('Expected typed refusal cause.');
    expect(cause.diagnostics).toContainEqual(expect.objectContaining({ code: 2345, line: 1 }));
    expect(cause.message).toContain('TS2345 at 1:');
    expect(exchange.requests[1]).toMatchObject({ validatorError: cause.message });
    expect(telemetry).toHaveLength(3);
    expect(telemetry.every((entry) =>
      !entry.passed && entry.diagnosticCodes.includes(2345) && entry.durationMs === 0)).toBe(true);
    expect(session.typeCheckTelemetry()).toEqual(telemetry);
    expect(session.jsProgramArtifact(1, f.monster.id)).toBeNull();
  });

  it('arms_share_typecheck: untyped JS bypasses compilation while preserving byte-identical model requests', async () => {
    const f = fixture();
    const source = 'emit(move(nearestEnemy(), 31));';
    const typedExchange = new FakeJsExchange(source);
    const untypedExchange = new FakeJsExchange(source);
    const typed = new DmRoundPlanSession(
      typedExchange,
      undefined,
      undefined,
      'js_program',
      { typeCheckMode: 'typed' },
    );
    const untyped = new DmRoundPlanSession(
      untypedExchange,
      undefined,
      undefined,
      'js_program',
      { typeCheckMode: 'untyped' },
    );

    await expect(typed.startRound(context(f.state), new AbortController().signal)).rejects.toThrow(
      /JS turn-program type check failed/u,
    );
    await expect(untyped.startRound(context(f.state), new AbortController().signal)).resolves.toMatchObject({
      monsters: [{ program: { kind: 'action', action: { kind: 'move_toward', maximumFeet: 31 } } }],
    });

    expect(typedExchange.requests[0]).toEqual(untypedExchange.requests[0]);
    expect(typedExchange.requests[0]).not.toHaveProperty('ambientDeclarations');
    expect(typed.typeCheckTelemetry()).toHaveLength(3);
    expect(untyped.typeCheckTelemetry()).toEqual([]);
    expect(untyped.jsProgramArtifact(1, f.monster.id)).toMatchObject({
      ambientDeclarations: null,
      typeCheck: null,
    });
  });

  it('shadow_run_leaks: classifies on a disposable state without adding model exchanges or touching encounter state', () => {
    const f = fixture();
    const before = structuredClone(f.state);
    const projection = context(f.state).projection.encounter;
    const projectionBefore = structuredClone(projection);
    const observation = observeTypeCheckUniqueCatch(
      'emit(endTurn());',
      projection,
      f.monster.id,
      [2345],
      {},
      (source, shadowState) => {
        Object.defineProperty(shadowState, 'round', { value: 99, configurable: true });
        return {
          source,
          emittedDecisionProgram: { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
          steps: 1,
        };
      },
    );
    const caughtByBoth = observeTypeCheckUniqueCatch(
      'emit(attack());',
      projection,
      f.monster.id,
      [2554],
    );

    expect(observation).toMatchObject({ outcome: 'caughtOnlyByTypeCheck', runtimeError: null });
    expect(caughtByBoth).toMatchObject({ outcome: 'caughtByBoth' });
    expect(f.state).toEqual(before);
    expect(projection).toEqual(projectionBefore);
  });

  it('derives the js_program prompt contract from the interpreter grammar module', () => {
    expect(ROUND_PLAN_JS_REPLY_CONTRACT).toEqual({
      surface: 'js_program',
      schemaVersion: 1,
      grammar: JS_TURN_PROGRAM_GRAMMAR,
      workedExamples: JS_ROUND_PLAN_WORKED_EXAMPLES,
      maximumCorrectionAttempts: 2,
    });
    expect(ROUND_PLAN_JS_REPLY_CONTRACT.workedExamples).toHaveLength(3);
    expect(ROUND_PLAN_JS_REPLY_CONTRACT.workedExamples[0]?.monsters).toHaveLength(2);
  });

  it('a js_program plan drives a fake-exchange table and replays source plus emitted DecisionProgram byte-for-byte', async () => {
    const f = fixture();
    const source = 'const target = nearestEnemy(); emit(focusFire(target));';
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
          { kind: 'action', action: { kind: 'move_toward' } },
          { kind: 'action', action: { kind: 'use_action', action: 'end_turn' } },
        ],
      },
      typeCheck: { passed: true, diagnosticCodes: [] },
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

  it('rider_searched_independently never considers a fixed rider follow-up when the attached attack is illegal', async () => {
    const f = fixture();
    const source = 'const target = nearestEnemy(); emit(attack(target, riderOnCrit(endTurn())));';
    const exchange = new FakeJsExchange(source);
    const session = new DmRoundPlanSession(exchange, undefined, undefined, 'js_program');

    await expect(session.choose(
      controllerRequest(f.state, f.monster.id, [{ type: 'end_turn', actor: f.monster.id }]),
      context(f.state),
      new AbortController().signal,
    )).rejects.toThrowError(RoundPlanDryError);
    expect(exchange.requests).toHaveLength(2);
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
