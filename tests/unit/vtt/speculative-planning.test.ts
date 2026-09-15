import { describe, expect, it } from 'vitest';
import type { EffectApplication } from '../../../src/combat/effects';
import type { PersistentArea } from '../../../src/combat/persistent-areas';
import { feetPoint } from '../../../src/combat/templates';
import {
  createEncounter,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import {
  combatantId,
  engineZoneId,
  effectStackingIdentity,
  encounterBranchId,
  encounterSessionId,
  feet,
  persistentAreaId,
} from '../../../src/combat/values';
import {
  createEngineStateCapsuleForEnvironment,
  engineStateHandle,
  FixedReadonlyStateCapsuleSource,
  projectEngineEncounterState,
} from '../../../src/vtt/engine-state-capsule';
import { projectEngineInitiativeIntel } from '../../../src/vtt/engine-initiative-intel';
import {
  engineActionRegistryForEnvironment,
  engineConcentrationActive,
  enginePlanningHitPointMaximum,
  enginePlanningHitPoints,
  enginePlanningConditions,
  enginePlanningSpeedFeet,
} from '../../../src/vtt/engine-query-port';
import {
  buildHostScenarioMenu,
  compileHostScenarios,
  complementScenarioFact,
  evaluateHostScenarios as evaluateHostScenariosWithEnvironment,
  evaluateScenarioFact as evaluateScenarioFactWithQueries,
  maximumInfluenceRadiusFeet,
  scenarioFactKey,
} from '../../../src/vtt/speculative-planning';
import { submitSpeculativeRoundPlan } from '../../../src/vtt/speculative-plan-submission';
import type {
  EngineSelectorRef,
  HostSplitCandidate,
  ScenarioFactAtom,
} from '../../../src/vtt/speculative-plan-types';
import { engineSchemaInternals, schemaViolations } from '../../../src/vtt/mcp/schemas';
import { generateRoom } from '../../../src/vtt/room-generator';
import { decodeArenaFixtureText } from '../../../src/vtt/mcp/entrypoint';
import { freshMonsterPlanningState, projectFutureMonsterTurns } from '../../../src/vtt/monster-planning-state';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
import { declareTestInputs } from '../../helpers/test-inputs';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

function evaluateScenarioFact(
  state: Parameters<typeof evaluateScenarioFactWithQueries>[0],
  fact: Parameters<typeof evaluateScenarioFactWithQueries>[1],
): ReturnType<typeof evaluateScenarioFactWithQueries> {
  return evaluateScenarioFactWithQueries(state, fact, OFFER_ENVIRONMENT.queries);
}

function evaluateHostScenarios(
  state: Parameters<typeof evaluateHostScenariosWithEnvironment>[0],
  scenarios: Parameters<typeof evaluateHostScenariosWithEnvironment>[1],
): ReturnType<typeof evaluateHostScenariosWithEnvironment> {
  return evaluateHostScenariosWithEnvironment(state, scenarios, OFFER_ENVIRONMENT.queries);
}

const HARD_BASIS_SEEDS = [
  5_117_001, 5_117_002, 5_117_003, 5_117_004, 5_117_005, 5_117_006,
  5_117_007, 5_117_008, 5_117_009, 5_117_010, 5_117_011, 5_117_012,
] as const;

const hardBasisInputs = declareTestInputs({
  fixtures: HARD_BASIS_SEEDS.map((seed): `tests/fixtures/arena-basis-hard/seed-${number}.json` =>
    `tests/fixtures/arena-basis-hard/seed-${seed}.json`),
});

function frozenHardState(seed: (typeof HARD_BASIS_SEEDS)[number]): EncounterState {
  const path: `tests/fixtures/arena-basis-hard/seed-${number}.json` =
    `tests/fixtures/arena-basis-hard/seed-${seed}.json`;
  return decodeArenaFixtureText(hardBasisInputs.fixtures.readText(path));
}

function direct(actorId: ReturnType<typeof combatantId>): EngineSelectorRef {
  return { actorId, selector: { kind: 'combatant', combatantId: actorId } };
}

function compactState(): {
  readonly state: EncounterState;
  readonly source: ReturnType<typeof playerProfile>;
  readonly target: ReturnType<typeof monsterProfile>;
} {
  const source = playerProfile('spec-source', {
    hitPoints: 20,
    initiativeBonus: 20,
    spellSlots: [{ level: 3, maximum: 2 }],
  });
  const target = monsterProfile('spec-target', { hitPoints: 40, initiativeBonus: 0 });
  const initial = createEncounter({
    bounds: { columns: 8, rows: 4 },
    combatants: [source, target],
    tokens: [placedToken(source, 1, 1), placedToken(target, 5, 1)],
  });
  return {
    state: reduceEncounter(initial, { type: 'roll_initiative' }, () => 0.5).state,
    source,
    target,
  };
}

function applyEffect(
  state: EncounterState,
  source: ReturnType<typeof playerProfile>,
  effect: EffectApplication,
): EncounterState {
  return reduceEncounter(
    state,
    { type: 'apply_effect', actor: source.id, effect, cost: 'none' },
    () => 0.5,
  ).state;
}

function candidate(
  rank: HostSplitCandidate['rank'],
  baseline: ScenarioFactAtom,
): HostSplitCandidate {
  return {
    candidateId: `candidate:${String(rank)}`,
    rank,
    factKey: scenarioFactKey(baseline),
    baseline,
    flipped: complementScenarioFact(baseline),
    referencedProposalCount: 1,
    influencingPlayerIds: [],
    summedMovementRadiusFeet: 30,
    volatilityScore: 30,
  };
}

describe('speculative host fact system', () => {
  it('uses one active HP lens and excludes temporary HP from exact integer bands', () => {
    const fixture = compactState();
    const targetId = fixture.target.id;
    const target = fixture.state.combatants.find((entry) => entry.profile.id === targetId);
    if (target === undefined) throw new Error('Target fixture is absent.');
    const state: EncounterState = {
      ...fixture.state,
      combatants: fixture.state.combatants.map((entry) => entry.profile.id === targetId
        ? { ...entry, hitPoints: 20, temporaryHitPoints: 100 }
        : entry),
    };
    const subject = direct(targetId);
    expect(enginePlanningHitPoints(state, targetId)).toBe(20);
    expect(enginePlanningHitPointMaximum(state, targetId)).toBe(40);
    expect(evaluateScenarioFact(state, {
      kind: 'hp_percent', subject, comparison: 'at_most', threshold: 50,
    })).toMatchObject({ matches: true, actual: true });
    expect(evaluateScenarioFact(state, {
      kind: 'hp_percent', subject, comparison: 'above', threshold: 50,
    })).toMatchObject({ matches: false, failure: 'FACT_FALSE' });

    const maximumModified = applyEffect(state, fixture.source, {
      targets: [targetId],
      duration: { kind: 'permanent' },
      concentration: false,
      stackingIdentity: effectStackingIdentity('spec-hp-maximum'),
      stacking: 'coexist',
      repeatedSave: null,
      payload: { kind: 'hit_point_maximum_modifier', amount: 10 },
    });
    expect(enginePlanningHitPointMaximum(maximumModified, targetId)).toBe(50);
    expect(evaluateScenarioFact(maximumModified, {
      kind: 'hp_percent', subject, comparison: 'above', threshold: 50,
    })).toMatchObject({ matches: false, failure: 'FACT_FALSE', actual: false });

    const dead: EncounterState = {
      ...state,
      combatants: state.combatants.map((entry) => entry.profile.id === targetId
        ? { ...entry, hitPoints: 0, life: 'dead' as const }
        : entry),
    };
    expect(evaluateScenarioFact(dead, {
      kind: 'hp_percent', subject, comparison: 'at_most', threshold: 25,
    })).toMatchObject({ matches: false, failure: 'SUBJECT_NOT_LIVING' });
  });

  it('uses canonical active speed modifiers for unacted-player influence', () => {
    const fixture = compactState();
    const slowed = applyEffect(fixture.state, fixture.source, {
      targets: [fixture.source.id],
      duration: { kind: 'permanent' },
      concentration: false,
      stackingIdentity: effectStackingIdentity('spec-speed'),
      stacking: 'coexist',
      repeatedSave: null,
      payload: { kind: 'movement_modifier', speedDeltaFeet: -10 },
    });
    expect(enginePlanningSpeedFeet(slowed, fixture.source.id)).toBe(20);
    expect(maximumInfluenceRadiusFeet(slowed, fixture.source.id)).toBe(40);
  });

  it('evaluates sourced conditions, exhaustion levels, resources, visibility, and concentration exactly', () => {
    const fixture = compactState();
    const charmed = applyEffect(fixture.state, fixture.source, {
      targets: [fixture.target.id],
      duration: { kind: 'permanent' },
      concentration: true,
      stackingIdentity: effectStackingIdentity('spec-charmed'),
      stacking: 'coexist',
      repeatedSave: null,
      payload: { kind: 'condition', condition: 'Charmed' },
    });
    const state = applyEffect(charmed, fixture.source, {
      targets: [fixture.target.id],
      duration: { kind: 'permanent' },
      concentration: false,
      stackingIdentity: effectStackingIdentity('spec-exhaustion'),
      stacking: 'coexist',
      repeatedSave: null,
      payload: { kind: 'exhaustion', level: 2 },
    });
    const targetRef = direct(fixture.target.id);
    const sourceRef = direct(fixture.source.id);
    expect(evaluateScenarioFact(state, {
      kind: 'condition_is', subject: targetRef,
      condition: { name: 'Charmed', source: fixture.source.id }, present: true,
    }).matches).toBe(true);
    expect(enginePlanningConditions(state, fixture.target.id)).toEqual(
      expect.arrayContaining([
        { name: 'Charmed', source: fixture.source.id },
        { name: 'Exhaustion', level: 2 },
      ]),
    );
    expect(evaluateScenarioFact(state, {
      kind: 'condition_is', subject: targetRef,
      condition: { name: 'Charmed', source: fixture.target.id }, present: true,
    })).toMatchObject({ matches: false, failure: 'FACT_FALSE' });
    expect(evaluateScenarioFact(state, {
      kind: 'condition_is', subject: targetRef,
      condition: { name: 'Exhaustion', level: 2 }, present: true,
    }).matches).toBe(true);
    expect(evaluateScenarioFact(state, {
      kind: 'condition_is', subject: targetRef,
      condition: { name: 'Exhaustion', level: 1 }, present: true,
    }).matches).toBe(false);
    expect(evaluateScenarioFact(state, {
      kind: 'resource_available_is', subject: sourceRef,
      resource: { kind: 'spell_slot', level: 3 }, available: true,
    }).matches).toBe(true);
    expect(evaluateScenarioFact(state, {
      kind: 'visibility_is', observer: sourceRef, subject: targetRef, value: true,
    }).matches).toBe(true);
    expect(engineConcentrationActive(state, fixture.source.id)).toBe(true);
    expect(evaluateScenarioFact(state, {
      kind: 'concentration_is', subject: sourceRef, active: true,
    }).matches).toBe(true);
  });

  it('evaluates life, adjacency, action reach, and persistent-zone occupancy with exact complements', () => {
    const hard = freshMonsterPlanningState(generateRoom(5_117_002, { difficulty: 'hard' }).encounter.state);
    const actor = hard.combatants.find((entry) =>
      entry.profile.kind === 'monster' && entry.life === 'living' &&
      engineActionRegistryForEnvironment(hard, OFFER_ENVIRONMENT).actionsFor(entry.profile.id).length > 0);
    const target = actor === undefined ? undefined : hard.combatants.find((entry) =>
      entry.profile.kind === 'player_character' && entry.life === 'living');
    const action = actor === undefined
      ? undefined
      : engineActionRegistryForEnvironment(hard, OFFER_ENVIRONMENT).actionsFor(actor.profile.id)[0];
    if (actor === undefined || target === undefined || action === undefined) {
      throw new Error('Hard-basis reach fixture is incomplete.');
    }
    const actorRef = direct(actor.profile.id);
    const targetRef = direct(target.profile.id);
    const life: ScenarioFactAtom = { kind: 'life_state_is', subject: targetRef, value: target.life };
    const adjacencyResult = evaluateScenarioFact(hard, {
      kind: 'adjacency_is', left: actorRef, right: targetRef, value: true,
    });
    const adjacency: ScenarioFactAtom = {
      kind: 'adjacency_is', left: actorRef, right: targetRef,
      value: adjacencyResult.matches,
    };
    const reachResult = evaluateScenarioFact(hard, {
      kind: 'within_action_reach_is', actor: actorRef, actionId: action.actionId,
      target: targetRef, value: true,
    });
    const reach: ScenarioFactAtom = {
      kind: 'within_action_reach_is', actor: actorRef, actionId: action.actionId,
      target: targetRef, value: reachResult.matches,
    };
    for (const atom of [life, adjacency, reach]) {
      expect(evaluateScenarioFact(hard, atom).matches).toBe(true);
      expect(evaluateScenarioFact(hard, atom.kind === 'life_state_is'
        ? complementScenarioFact(atom, atom.value === 'living' ? 'dead' : 'living')
        : complementScenarioFact(atom)).matches).toBe(false);
    }

    const area: PersistentArea = {
      id: persistentAreaId('persistent-area:spec-zone'),
      sequence: 1,
      owner: actor.profile.id,
      origin: { kind: 'fixed', point: feetPoint(0, 0) },
      shape: { kind: 'sphere', radius: feet(10) },
      duration: { kind: 'concentration', remaining: 10 },
      targetFilter: { kind: 'all' },
      difficultTerrain: false,
      hooks: [],
      movable: null,
      material: null,
      burningCells: [],
      burnedAwayCells: [],
      members: [target.profile.id],
      consumedTurnKeys: [],
    };
    const targetPosition = hard.tokens.find((token) => token.combatantId === target.profile.id)?.position;
    if (targetPosition === undefined) throw new Error('Hard-basis target token is absent.');
    const authoredZoneId = engineZoneId('authored:spec-zone');
    const zoned: EncounterState = {
      ...hard,
      persistentAreas: [area],
      environment: {
        ...hard.environment,
        movementRegions: [{
          id: String(authoredZoneId),
          source: actor.profile.id,
          entry: 'allowed',
          cells: [targetPosition],
          damage: null,
        }],
      },
    };
    const occupancy: ScenarioFactAtom = {
      kind: 'zone_occupancy_is', subject: targetRef,
      zoneId: engineZoneId(String(area.id)), value: 'inside',
    };
    expect(evaluateScenarioFact(zoned, occupancy).matches).toBe(true);
    expect(evaluateScenarioFact(zoned, complementScenarioFact(occupancy)).matches).toBe(false);
    expect(evaluateScenarioFact(zoned, {
      kind: 'zone_occupancy_is', subject: targetRef, zoneId: authoredZoneId, value: 'inside',
    }).matches).toBe(true);
    expect(engineConcentrationActive(zoned, actor.profile.id)).toBe(true);
    expect(projectEngineEncounterState(
      zoned,
      engineActionRegistryForEnvironment(zoned, OFFER_ENVIRONMENT),
      projectEngineInitiativeIntel(zoned, []),
      1,
    ).semanticZones)
      .toEqual([
        {
          id: authoredZoneId,
          kind: 'authored_encounter_zone',
          memberCombatantIds: [target.profile.id],
          active: true,
        },
        {
          id: engineZoneId(String(area.id)),
          kind: 'persistent_area',
          memberCombatantIds: [target.profile.id],
          active: true,
        },
      ]);
  });

  it('projects canonical planning conditions and resource pools without changing ordinary geometry', () => {
    const fixture = compactState();
    const target = fixture.state.combatants.find((entry) => entry.profile.id === fixture.target.id);
    if (target === undefined) throw new Error('Target fixture is absent.');
    const state: EncounterState = {
      ...fixture.state,
      combatants: fixture.state.combatants.map((entry) => entry.profile.id === fixture.target.id
        ? {
            ...entry,
            temporaryHitPoints: 9,
            legendary: {
              actionUsesMaximum: 3,
              actionUsesRemaining: 2,
              resistanceUsesMaximum: 3,
              resistanceUsesRemaining: 1,
            },
          }
        : entry),
    };
    const projection = projectEngineEncounterState(
      state,
      engineActionRegistryForEnvironment(state, OFFER_ENVIRONMENT),
      projectEngineInitiativeIntel(state, []),
      1,
    );
    expect(projection.combatants.find((entry) => entry.id === fixture.target.id)?.planning)
      .toMatchObject({
        temporaryHitPoints: 9,
        legendaryActionUsesRemaining: 2,
        legendaryResistanceUsesRemaining: 1,
        concentrating: false,
      });
    expect(projection.semanticZones).toEqual([]);
    const legendaryRef = direct(fixture.target.id);
    expect(evaluateScenarioFact(state, {
      kind: 'resource_available_is', subject: legendaryRef,
      resource: { kind: 'legendary_action' }, available: true,
    }).matches).toBe(true);
    expect(evaluateScenarioFact(state, {
      kind: 'resource_available_is', subject: legendaryRef,
      resource: { kind: 'legendary_resistance' }, available: true,
    }).matches).toBe(true);
  });

  it('compiles Hamming-0 then rank-ordered Hamming-1 disjoint vectors', () => {
    const fixture = compactState();
    const source = direct(fixture.source.id);
    const target = direct(fixture.target.id);
    const menu = [
      candidate(1, { kind: 'adjacency_is', left: source, right: target, value: false }),
      candidate(2, { kind: 'visibility_is', observer: source, subject: target, value: true }),
      candidate(3, { kind: 'resource_available_is', subject: source, resource: { kind: 'reaction' }, available: true }),
      candidate(4, { kind: 'concentration_is', subject: source, active: false }),
    ];
    const scenarios = compileHostScenarios(menu);
    expect(scenarios).toHaveLength(4);
    expect(scenarios.map((entry) => [entry.ordinal, entry.kind, entry.flippedCandidateId])).toEqual([
      [1, 'no_material_change', null],
      [2, 'single_candidate_flip', 'candidate:1'],
      [3, 'single_candidate_flip', 'candidate:2'],
      [4, 'single_candidate_flip', 'candidate:3'],
    ]);
    const baseline = scenarios[0];
    if (baseline === undefined) throw new Error('Default scenario is absent.');
    for (const scenario of scenarios.slice(1)) {
      expect(scenario.facts.filter((fact, index) =>
        JSON.stringify(fact) !== JSON.stringify(baseline.facts[index])).length).toBe(1);
    }
    expect(new Set(scenarios.map((entry) => JSON.stringify(entry.facts))).size).toBe(4);
  });

  it('returns explicit no-match for multi-flip reality and never approximates a branch', () => {
    const fixture = compactState();
    const source = direct(fixture.source.id);
    const target = direct(fixture.target.id);
    const state: EncounterState = {
      ...fixture.state,
      combatants: fixture.state.combatants.map((entry) =>
        entry.profile.id === fixture.source.id || entry.profile.id === fixture.target.id
          ? { ...entry, turn: { ...entry.turn, reactionAvailable: false } }
          : entry),
    };
    const scenarios = compileHostScenarios([
      candidate(1, { kind: 'resource_available_is', subject: source, resource: { kind: 'reaction' }, available: true }),
      candidate(2, { kind: 'resource_available_is', subject: target, resource: { kind: 'reaction' }, available: true }),
    ]);
    expect(evaluateHostScenarios(state, scenarios)).toMatchObject({
      kind: 'no_match', reason: 'NO_SCENARIO_MATCH',
    });
  });

  it.each(HARD_BASIS_SEEDS)(
    'selects exactly the default scenario over frozen hard-basis capsule %s',
    (seed) => {
      const state = frozenHardState(seed);
      const actors = state.combatants
        .filter((entry) => entry.profile.kind === 'monster' && entry.life === 'living')
        .slice(0, 2);
      if (actors.length < 2 || actors[0] === undefined || actors[1] === undefined) {
        throw new Error('Hard-basis actor pair is absent.');
      }
      const first = direct(actors[0].profile.id);
      const second = direct(actors[1].profile.id);
      const menu = [
        candidate(1, {
          kind: 'resource_available_is', subject: first, resource: { kind: 'reaction' },
          available: actors[0].turn.reactionAvailable,
        }),
        candidate(2, {
          kind: 'resource_available_is', subject: second, resource: { kind: 'reaction' },
          available: actors[1].turn.reactionAvailable,
        }),
      ];
      const scenarios = compileHostScenarios(menu);
      const capsule = createEngineStateCapsuleForEnvironment({
        runId: encounterSessionId(`encounter:hard-${String(seed)}`),
        branchId: encounterBranchId(`branch:hard-${String(seed)}`),
        revision: 1,
        generatedAt: '2026-08-29T12:00:00.000Z',
        request: {
          requestId: `request:hard-${String(seed)}`,
          phase: 'speculative',
          correctionNumber: 0,
          actors: actors.map((entry) => entry.profile.id),
          targetRoom: 1,
          targetMonsterRound: 1,
          refreshGeneration: 0,
          scenarioMenu: menu,
          scenarios,
        },
        projection: projectEngineEncounterState(
          state,
          engineActionRegistryForEnvironment(state, OFFER_ENVIRONMENT),
          projectEngineInitiativeIntel(state, []),
          1,
        ),
        offerEnvironment: OFFER_ENVIRONMENT.binding,
      });
      if (capsule.request?.phase !== 'speculative') throw new Error('Speculative capsule was not retained.');
      expect(evaluateHostScenarios(state, capsule.request.scenarios)).toMatchObject({
        kind: 'matched', scenario: { ordinal: 1, kind: 'no_material_change' },
      });
    },
  );

  it('forms a bounded volatility-ranked menu from baseline dependencies and canonical movement proofs', () => {
    const state = frozenHardState(5_117_001);
    const actors = state.combatants
      .filter((entry) => entry.profile.kind === 'monster' && entry.life === 'living')
      .map((entry) => entry.profile.id)
      .slice(0, 2);
    const players = state.combatants
      .filter((entry) => entry.profile.kind === 'player_character' && entry.life === 'living')
      .map((entry) => entry.profile.id);
    const result = buildHostScenarioMenu(state, actors, players, OFFER_ENVIRONMENT);
    expect(result.baselineProposals.map((entry) => entry.actorId)).toEqual(actors);
    expect(result.scenarioMenu.length).toBeGreaterThan(0);
    expect(result.scenarioMenu.length).toBeLessThanOrEqual(8);
    expect(result.scenarioMenu.map((entry) => entry.rank)).toEqual(
      result.scenarioMenu.map((_entry, index) => index + 1),
    );
    expect(result.scenarioMenu.every((entry) =>
      entry.volatilityScore === entry.referencedProposalCount * entry.summedMovementRadiusFeet &&
      entry.influencingPlayerIds.length > 0)).toBe(true);
    expect(result.scenarios.length).toBe(result.scenarioMenu.length === 0
      ? 0
      : Math.min(3, result.scenarioMenu.length) + 1);
  });

  it('queues strict scenario-id-only v2 prediction data with inert D401 guidance', () => {
    const fixture = compactState();
    const subject = direct(fixture.target.id);
    const menu = [candidate(1, {
      kind: 'resource_available_is', subject, resource: { kind: 'reaction' }, available: true,
    })];
    const scenarios = compileHostScenarios(menu);
    const planningState = projectFutureMonsterTurns(fixture.state, [fixture.target.id]);
    const capsule = createEngineStateCapsuleForEnvironment({
      runId: encounterSessionId('encounter:spec-submit'),
      branchId: encounterBranchId('branch:spec-submit'),
      revision: 7,
      generatedAt: '2026-08-29T12:00:00.000Z',
      request: {
        requestId: 'request:spec-submit',
        phase: 'speculative',
        correctionNumber: 0,
        actors: [fixture.target.id],
        targetRoom: 2,
        targetMonsterRound: 3,
        refreshGeneration: 1,
        scenarioMenu: menu,
        scenarios,
      },
      projection: projectEngineEncounterState(
        planningState,
        engineActionRegistryForEnvironment(planningState, OFFER_ENVIRONMENT),
        projectEngineInitiativeIntel(planningState, []),
        2,
      ),
      offerEnvironment: OFFER_ENVIRONMENT.binding,
    });
    const source = new FixedReadonlyStateCapsuleSource(capsule);
    const accepted: Array<ReturnType<typeof submitSpeculativeRoundPlan>> = [];
    const projectedActor = capsule.projection.combatants.find((combatant) => combatant.id === fixture.target.id);
    const offered = projectedActor?.options[0];
    if (offered === undefined) throw new Error('Speculative fixture omitted its actor option inventory.');
    const turnProposal = {
      actorId: fixture.target.id, expectedRevision: capsule.revision,
      primaryOptionId: offered.optionId, fallbackOptionId: null,
      reason: 'Exercise the speculative planning fixture.', overrideJustification: null,
    };
    const envelope = submitSpeculativeRoundPlan(source, {
      append: (entry) => { accepted.push(entry); },
    }, {
      kind: 'speculative_round_plan',
      schemaVersion: 2,
      runId: capsule.runId,
      encounterBranchId: capsule.branchId,
      requestId: 'request:spec-submit',
      sourceRevision: 7,
      sourceDigest: capsule.digest,
      stateHandle: engineStateHandle(capsule),
      targetRoom: 2,
      targetMonsterRound: 3,
      refreshGeneration: 1,
      branches: scenarios.map((scenario) => ({ scenarioId: scenario.scenarioId, proposals: [turnProposal] })),
      reactionGuidance: { sideWide: { opportunity_attack: 'decline' }, actors: [] },
      idempotencyKey: 'spec-submit-idempotency-0001',
    });
    expect(envelope).toMatchObject({
      status: 'QUEUED-SPECULATIVE',
      sourceRevision: 7,
      reactionGuidance: { sideWide: { opportunity_attack: 'decline' } },
    });
    expect(accepted).toHaveLength(1);
    expect(JSON.stringify(envelope)).not.toContain('resolutionDigest');
  });

  it('rejects coordinates, free-text guards, agent-authored guards, and unknown fields at schema entry', () => {
    const base = {
      state_ref: {
        run_id: 'encounter:strict',
        state_handle: `engine-state:${'a'.repeat(64)}`,
        expected_revision: 1,
      },
      request_id: 'request:strict',
      target_room: 1,
      target_monster_round: 2,
      refresh_generation: 0,
      branches: [{
        scenario_id: 'scenario:1',
        proposals: [{
          actor_id: 'combatant:monster',
          expected_revision: 1,
          primary_option_id: 'option:monster:dodge',
          fallback_option_id: null,
          reason: 'Exercise the speculative branch proposal.',
          override_justification: null,
        }],
      }],
      idempotency_key: 'strict-speculation-0001',
    };
    expect(schemaViolations(engineSchemaInternals.submitSpeculativeRoundPlanInput, base)).toEqual([]);
    for (const mutation of [
      { ...base, coordinate: { row: 1, column: 1 } },
      { ...base, guard: { kind: 'always', rationale: 'trust me' } },
      { ...base, branches: [{ ...base.branches[0], guards: [{ kind: 'custom', text: 'if hurt' }] }] },
    ]) {
      expect(schemaViolations(engineSchemaInternals.submitSpeculativeRoundPlanInput, mutation).length)
        .toBeGreaterThan(0);
    }
  });
});
