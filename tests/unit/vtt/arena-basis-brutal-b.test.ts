import { describe, expect, it } from 'vitest';
import { createEncounter, combatantSpace, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import { spaceFitsBounds, spacesIntersect, spaceTouchesCellSet } from '../../../src/combat/creature-space';
import { mulberry32 } from '../../../src/combat/random';
import { encounterBranchId, encounterSessionId, type CombatantId } from '../../../src/combat/values';
import { UNICORN } from '../../../src/combat/statblocks/monsters';
import { BUNDLED_MONSTER_ROSTER } from '../../../src/combat/statblocks/roster';
import { sha256 } from '../../../src/crypto/sha256';
import { D466_GENERATED_ROOM_OVERRIDES } from '../../../src/vtt/d466-room-overrides';
import { EngineRoundSession, type AuthorizedEngineTurnProposal } from '../../../src/vtt/engine-round-session';
import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
import {
  availableEngineActorOptions,
  pureTurnProposalResolver,
  resolveEngineActorOption,
  type EngineTurnProposal,
} from '../../../src/vtt/intent-resolver';
import { actorOpportunityReport } from '../../../src/vtt/intel/opportunity-cost';
import { decodeArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import { freshMonsterPlanningState, projectFutureMonsterTurns } from '../../../src/vtt/monster-planning-state';
import type { ReactionOfferHostPolicy } from '../../../src/vtt/reaction-offer-host-policy';
import {
  applyRoomInitiativeProfile,
  BRUTAL_CHALLENGE_BUDGET_SCALE,
  BRUTAL_CHALLENGE_SPEND_FRACTION_BAND,
  BRUTAL_TERRAIN_FEATURE_COUNT_BAND,
  generateRoom,
  type GeneratedRoom,
} from '../../../src/vtt/room-generator';
import {
  createScriptedPartyPlan,
  DEFAULT_SCRIPTED_PARTY_DECISION_POLICY,
  materializeScriptedPartyTurn,
} from '../../../src/vtt/scripted-party-round';
import { BRUTAL_10_B_SEEDS, BRUTAL_10_SEEDS, R1_10_SEEDS } from '../../../tools/ai-dm-rerun-packet';
import { declareTestInputs } from '../../helpers/test-inputs';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const FIXTURE_PATHS = [
  'tests/fixtures/arena-basis-brutal-b/seed-6206001.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206002.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206003.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206004.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206005.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206006.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206007.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206008.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206009.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206010.json',
] as const;

const HARD_EXECUTION_FIXTURE_PATHS = [
  'tests/fixtures/arena-basis-hard/seed-5117001.json',
  'tests/fixtures/arena-basis-hard/seed-5117002.json',
  'tests/fixtures/arena-basis-hard/seed-5117003.json',
  'tests/fixtures/arena-basis-hard/seed-5117004.json',
  'tests/fixtures/arena-basis-hard/seed-5117005.json',
  'tests/fixtures/arena-basis-hard/seed-5117006.json',
  'tests/fixtures/arena-basis-hard/seed-5117007.json',
  'tests/fixtures/arena-basis-hard/seed-5117008.json',
  'tests/fixtures/arena-basis-hard/seed-5117009.json',
  'tests/fixtures/arena-basis-hard/seed-5117010.json',
  'tests/fixtures/arena-basis-hard/seed-5117011.json',
  'tests/fixtures/arena-basis-hard/seed-5117012.json',
  'tests/fixtures/arena-basis-hard/seed-5117013.json',
] as const;

const BRUTAL_EXECUTION_FIXTURE_PATHS = [
  'tests/fixtures/arena-basis-brutal/seed-6203001.json',
  'tests/fixtures/arena-basis-brutal/seed-6203002.json',
  'tests/fixtures/arena-basis-brutal/seed-6203003.json',
  'tests/fixtures/arena-basis-brutal/seed-6203004.json',
  'tests/fixtures/arena-basis-brutal/seed-6203005.json',
  'tests/fixtures/arena-basis-brutal/seed-6203006.json',
  'tests/fixtures/arena-basis-brutal/seed-6203007.json',
  'tests/fixtures/arena-basis-brutal/seed-6203008.json',
  'tests/fixtures/arena-basis-brutal/seed-6203009.json',
  'tests/fixtures/arena-basis-brutal/seed-6203010.json',
] as const;

const EXECUTION_FIXTURE_PATHS = [
  ...HARD_EXECUTION_FIXTURE_PATHS,
  ...BRUTAL_EXECUTION_FIXTURE_PATHS,
  ...FIXTURE_PATHS,
] as const;

const EXECUTION_FIXTURE_FAMILIES = [
  ['hard', HARD_EXECUTION_FIXTURE_PATHS],
  ['brutal', BRUTAL_EXECUTION_FIXTURE_PATHS],
  ['brutal-b', FIXTURE_PATHS],
] as const;

const FIXTURE_DIGESTS = {
  6_206_001: '7cc25c0ab9a0e380373a306874290d0f5247e74c0efb71e43ab593b58f0d9d3b',
  6_206_002: '3fdfe05812aeb6724789b4ff6f753ce68c523c13ff024d9ee275bd1060adbcaa',
  6_206_003: '36828c26a62a8af8c9cc32db7f3a13124d897a8aacf8ce4d4df2c11d2c742d3c',
  6_206_004: '35a5980497b2184a4d684e1849117bb70e4887cb40264ea33117e3e14322c60a',
  6_206_005: 'dc48b6cdd7d4e33dc3c9a0188586ebd1537deac4dec4284c7e9404cec652e2f1',
  6_206_006: 'd66fc0a9f29d84b5f1bc5a46b86483f91236d05b5cb1b951519cce7db98e2269',
  6_206_007: '1c4c337148afad9aff2a86143bb3156cc446ffabd2ccc8cc29eb004d83034bd9',
  6_206_008: '11a065b490f6e68effaddb0e919b9f9f9f7ae300f19a97f3359d3d4c86658a32',
  6_206_009: '19808aca9fb3ca7e4a77b6222cfae31c4f69a16b9b74ecc0706cb1eee58d4f5e',
  6_206_010: 'a9efe78460c66972d09c6efd1c7cc04409ba6fff5a0028657d2442a0ec2fbc83',
} as const satisfies Readonly<Record<(typeof BRUTAL_10_B_SEEDS)[number], string>>;

const inputs = declareTestInputs({ fixtures: EXECUTION_FIXTURE_PATHS });

type RoundExecutionResult =
  | { readonly seed: number; readonly outcome: 'executed'; readonly state: EncounterState }
  | {
      readonly seed: number;
      readonly outcome: 'execution_failed';
      readonly error: string;
      readonly state: EncounterState;
    };

function livingMonsterIds(state: EncounterState): readonly CombatantId[] {
  return state.combatants.flatMap((combatant) =>
    combatant.profile.kind === 'monster' && combatant.life === 'living'
      ? [combatant.profile.id]
      : []);
}

function maximalMonsterSegment(state: EncounterState): readonly CombatantId[] {
  if (state.activeInitiativeIndex === null) return [];
  const actors: CombatantId[] = [];
  for (let index = state.activeInitiativeIndex; index < state.initiative.length; index += 1) {
    const initiative = state.initiative[index];
    if (initiative === undefined) throw new Error('Execution invariant encountered a missing initiative entry.');
    const combatant = state.combatants.find((candidate) => candidate.profile.id === initiative.combatant);
    if (combatant === undefined) throw new Error(`Execution invariant cannot find ${initiative.combatant}.`);
    if (combatant.life === 'dead') continue;
    if (combatant.profile.kind === 'player_character') break;
    actors.push(combatant.profile.id);
  }
  return actors;
}

function dryRunMonsterPlan(state: EncounterState): ReadonlyMap<CombatantId, AuthorizedEngineTurnProposal> {
  const actorIds = [...livingMonsterIds(state)].sort((left, right) => left.localeCompare(right));
  const planningState = projectFutureMonsterTurns(state, actorIds);
  return new Map(actorIds.map((actorId) => {
    const report = actorOpportunityReport(
      planningState,
      actorId,
      canonicalEngineQueryPort,
      state.revision,
    );
    const primary = report.defaultOption;
    const fallback = availableEngineActorOptions(
      planningState,
      actorId,
      canonicalEngineQueryPort,
      state.revision,
    ).find((option) => option.optionId !== primary.optionId);
    if (fallback === undefined) throw new Error(`Dry-run plan has no independent fallback for ${actorId}.`);
    const proposal: EngineTurnProposal = {
      actorId,
      expectedRevision: state.revision,
      primaryOptionId: primary.optionId,
      fallbackOptionId: fallback.optionId,
      reason: 'Use the engine-ranked option to maximize immediate tactical value.',
      overrideJustification: null,
    };
    const resolution = pureTurnProposalResolver.resolve(planningState, proposal);
    if (!resolution.valid) {
      throw new Error(`Dry-run plan was refused for ${actorId}: ${resolution.refusals.map((entry) => entry.code).join(', ')}.`);
    }
    return [actorId, {
      proposal,
      option: resolution.option,
      primaryOption: resolution.primaryOption,
      fallbackOption: resolution.fallbackOption,
      mechanics: resolution.mechanics,
      selectedBranch: resolution.selectedBranch,
    }] as const;
  }));
}

function executeFrozenRound(
  room: GeneratedRoom,
  policy: ReactionOfferHostPolicy = { kind: 'unattended', askDefault: 'decline' },
): RoundExecutionResult {
  const seed = room.spec.seed;
  const session = new EngineRoundSession(
    applyRoomInitiativeProfile(decodeArenaFixture(room), 'derived_v1'),
    mulberry32(8_274_113),
    policy,
  );
  try {
    session.beginRoundWithoutSkipping({
      runId: encounterSessionId(`encounter:arena-execution-invariant:${String(seed)}`),
      branchId: encounterBranchId(`branch:arena-execution-invariant:${String(seed)}`),
      revision: 1,
      requestId: `request:arena-execution-invariant:${String(seed)}`,
      phase: 'initial',
      room: 1,
      historyKind: 'room_ready',
    }, null);
    const roundStart = session.currentState();
    const round = roundStart.round;
    const partyPlan = createScriptedPartyPlan(roundStart, {
      decisionPolicy: DEFAULT_SCRIPTED_PARTY_DECISION_POLICY,
    });
    const monsterPlan = dryRunMonsterPlan(roundStart);
    const acted = new Set<CombatantId>();
    for (let step = 0; step <= roundStart.initiative.length; step += 1) {
      const state = session.currentState();
      if (state.phase.kind === 'concluded' || state.round > round) {
        return { seed, outcome: 'executed', state };
      }
      if (state.activeCombatant === null) throw new Error('Round execution lost its active combatant.');
      if (acted.has(state.activeCombatant)) {
        throw new Error(state.pendingDecisions.length > 0
          ? 'Round execution reached an already-acted actor with unresolved pending decisions.'
          : 'Round execution stalled on an already-acted actor before advancing the round.');
      }
      const active = state.combatants.find((combatant) =>
        combatant.profile.id === state.activeCombatant);
      if (active === undefined) throw new Error(`Execution invariant cannot find ${state.activeCombatant}.`);
      if (active.profile.kind === 'player_character') {
        session.completeScriptedPcTurn(materializeScriptedPartyTurn({
          state,
          plan: partyPlan,
          actorId: active.profile.id,
        }), null);
        acted.add(active.profile.id);
        continue;
      }
      const segment = maximalMonsterSegment(state);
      const applications = segment.map((actorId) => {
        const application = monsterPlan.get(actorId);
        if (application === undefined) throw new Error(`Dry-run plan omitted ${actorId}.`);
        acted.add(actorId);
        return application;
      });
      session.applyConsecutiveMonsterSegment(applications, null);
    }
    throw new Error(`Round ${String(round)} did not complete within one initiative cycle.`);
  } catch (error) {
    return {
      seed,
      outcome: 'execution_failed',
      error: error instanceof Error ? error.message : String(error),
      state: session.currentState(),
    };
  }
}

function assertRoundsExecuted(results: readonly RoundExecutionResult[]): void {
  const failure = results.find((result) => result.outcome === 'execution_failed');
  if (failure !== undefined) {
    throw new Error(`Seed ${String(failure.seed)} failed round execution: ${failure.error}`);
  }
}

function cellIsInBounds(
  cell: { readonly column: number; readonly row: number },
  bounds: { readonly columns: number; readonly rows: number },
): boolean {
  return cell.column >= 0 && cell.column < bounds.columns &&
    cell.row >= 0 && cell.row < bounds.rows;
}

function assertBrutalMembership(
  room: GeneratedRoom,
  fixtureBytes: string,
  expectedDigest: string,
): void {
  const seed = room.spec.seed;
  const hard = generateRoom(seed, { difficulty: 'hard' });
  expect(room.spec.difficultyProfile, `seed ${String(seed)} difficulty`).toBe('brutal');
  expect(room.spec.challengeBudgetEighths, `seed ${String(seed)} scaled budget`).toBe(
    hard.spec.challengeBudgetEighths * BRUTAL_CHALLENGE_BUDGET_SCALE,
  );
  expect(room.spec.challengeSpentEighths, `seed ${String(seed)} minimum spend`).toBeGreaterThanOrEqual(
    room.spec.challengeBudgetEighths * BRUTAL_CHALLENGE_SPEND_FRACTION_BAND.minimum,
  );
  expect(room.spec.challengeSpentEighths, `seed ${String(seed)} maximum spend`).toBeLessThanOrEqual(
    room.spec.challengeBudgetEighths * BRUTAL_CHALLENGE_SPEND_FRACTION_BAND.maximum,
  );

  const roster = room.spec.monsterRoster.map((entry) => {
    const row = BUNDLED_MONSTER_ROSTER.find((candidate) => candidate.id === entry.statblockId);
    if (row === undefined) throw new Error(`Seed ${String(seed)} references unknown ${entry.statblockId}.`);
    return row;
  });
  expect(roster.some((row) => {
    const actions = row.statblock.sourceDetails.actions;
    return actions.kind === 'present' && actions.value.some((action) =>
      action.kind === 'spellcasting' && action.execution?.kind !== 'absent' &&
      action.spells.some((spell) => spell.manifestStatus === 'implemented'));
  }), `seed ${String(seed)} executable caster`).toBe(true);

  const terrainCounts = {
    difficult: room.spec.terrain.filter((feature) => feature.kind === 'difficult-terrain-patch').length,
    hazards: room.spec.terrain.filter((feature) => feature.kind === 'hazard-object').length,
    lights: room.spec.terrain.filter((feature) => feature.kind === 'light-source').length,
    obscurement: room.spec.terrain.filter((feature) => feature.kind === 'obscurement-patch').length,
  };
  expect(terrainCounts.difficult, `seed ${String(seed)} difficult terrain`).toBeGreaterThanOrEqual(3);
  expect(terrainCounts.hazards, `seed ${String(seed)} hazards`).toBeGreaterThanOrEqual(3);
  expect(terrainCounts.lights, `seed ${String(seed)} lights`).toBeGreaterThanOrEqual(2);
  expect(terrainCounts.obscurement, `seed ${String(seed)} obscurement`).toBeGreaterThanOrEqual(2);
  expect(room.spec.terrain.length, `seed ${String(seed)} terrain exceeds hard`).toBeGreaterThan(
    hard.spec.terrain.length,
  );
  expect(room.spec.terrain.length, `seed ${String(seed)} terrain minimum`).toBeGreaterThanOrEqual(
    BRUTAL_TERRAIN_FEATURE_COUNT_BAND.minimum,
  );
  expect(room.spec.terrain.length, `seed ${String(seed)} terrain maximum`).toBeLessThanOrEqual(
    BRUTAL_TERRAIN_FEATURE_COUNT_BAND.maximum,
  );

  const state = decodeArenaFixture(room);
  const regions = [
    ...state.environment.difficultTerrainRegions,
    ...state.environment.lightRegions,
    ...state.environment.obscurementRegions,
    ...(state.environment.movementRegions ?? []),
  ];
  for (const region of regions) {
    expect(region.id.trim(), `seed ${String(seed)} region id`).not.toBe('');
    expect(region.cells.length, `seed ${String(seed)} region cells`).toBeGreaterThan(0);
    expect(region.cells.every((cell) => cellIsInBounds(cell, state.bounds)),
      `seed ${String(seed)} region bounds`).toBe(true);
  }
  expect(state.worldObjects.every((object) =>
    object.footprint.length > 0 && object.footprint.every((cell) => cellIsInBounds(cell, state.bounds))),
  `seed ${String(seed)} world-object positions`).toBe(true);

  const spaces = state.combatants.map((combatant) => ({
    id: combatant.profile.id,
    space: combatantSpace(state, combatant.profile.id),
  }));
  for (const entry of spaces) {
    expect(spaceFitsBounds(entry.space, state.bounds), `${entry.id} position bounds`).toBe(true);
    expect(spaceTouchesCellSet(entry.space, state.blockedCells), `${entry.id} blocked overlap`).toBe(false);
  }
  for (let left = 0; left < spaces.length; left += 1) {
    for (let right = left + 1; right < spaces.length; right += 1) {
      expect(spacesIntersect(spaces[left]!.space, spaces[right]!.space),
        `${spaces[left]!.id}/${spaces[right]!.id} overlap`).toBe(false);
    }
  }

  const reduced = reduceEncounter(state, { type: 'roll_initiative' }, mulberry32(seed));
  expect(reduced.state.revision, `seed ${String(seed)} reducer load`).toBe(state.revision + 1);
  expect(reduced.state.initiative, `seed ${String(seed)} initiative load`).toHaveLength(state.combatants.length);

  const planningState = freshMonsterPlanningState(state);
  for (const monster of planningState.combatants.filter((combatant) =>
    combatant.profile.kind === 'monster')) {
    const productive = availableEngineActorOptions(planningState, monster.profile.id).some((option) => {
      const resolution = resolveEngineActorOption(planningState, option);
      return resolution.valid && (resolution.mechanics.movementCostFeet > 0 ||
        resolution.mechanics.actionSlots.some((slot) =>
          slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
          slot.kind === 'use_world_object'));
    });
    expect(productive, `${monster.profile.id} has no productive first-turn offer`).toBe(true);
  }

  // The byte pin lives with, and cannot pass instead of, the state-derived membership checks above.
  expect(sha256(fixtureBytes), `seed ${String(seed)} fixture bytes`).toBe(expectedDigest);
}

function fixtureAt(index: number): { readonly room: GeneratedRoom; readonly bytes: string } {
  const path = FIXTURE_PATHS[index];
  if (path === undefined) throw new RangeError(`No brutal-b fixture at index ${String(index)}.`);
  const bytes = inputs.fixtures.readText(path);
  return { room: JSON.parse(bytes) as GeneratedRoom, bytes };
}

function executionFixtureAt(path: (typeof EXECUTION_FIXTURE_PATHS)[number]): GeneratedRoom {
  return JSON.parse(inputs.fixtures.readText(path)) as GeneratedRoom;
}

describe('second brutal arena basis family', () => {
  it('uses one clean contiguous range disjoint from every existing seeded fixture family', () => {
    const existingSeeds = new Set([
      ...Array.from({ length: 12 }, (_unused, index) => 3_943_001 + index),
      ...R1_10_SEEDS,
      5_117_011, 5_117_012, 5_117_013,
      ...BRUTAL_10_SEEDS,
    ]);
    expect(BRUTAL_10_B_SEEDS.every((seed) => !existingSeeds.has(seed))).toBe(true);
    expect(BRUTAL_10_B_SEEDS).toEqual(Array.from({ length: 10 }, (_unused, index) => 6_206_001 + index));
    expect(BRUTAL_10_B_SEEDS.every((seed) =>
      !D466_GENERATED_ROOM_OVERRIDES.some((override) => Number(override.seed) === seed))).toBe(true);
    expect(D466_GENERATED_ROOM_OVERRIDES.map((override) => override.seed)).toEqual([
      6_204_004, 6_204_006, 6_204_009,
    ]);
  });

  it.each(BRUTAL_10_B_SEEDS)(
    'pins seed %s only after proving every brutal membership property from state',
    (seed) => {
      const index = seed - BRUTAL_10_B_SEEDS[0];
      const fixture = fixtureAt(index);
      expect(fixture.room.spec.seed).toBe(seed);
      assertBrutalMembership(fixture.room, fixture.bytes, FIXTURE_DIGESTS[seed]);
    },
  );

  describe.each(EXECUTION_FIXTURE_FAMILIES)('%s frozen-room execution membership', (_basis, paths) => {
    it.each(paths)('executes round 1 for %s under the unattended scripted-party policy', (path) => {
      const result = executeFrozenRound(executionFixtureAt(path));

      expect(result.outcome).toBe('executed');
      assertRoundsExecuted([result]);
    });
  });

  it('replays end_turn after draining the final unattended legendary-action window', () => {
    const activeMonster = monsterProfile('boundary-active-monster', { initiativeBonus: 100 });
    const legendaryBase = monsterCombatantProfile(UNICORN, {
      combatantId: 'combatant:boundary-legendary-monster',
      tokenId: 'token:boundary-legendary-monster',
    });
    const legendaryMonster = {
      ...legendaryBase,
      rules: { ...legendaryBase.rules, initiativeBonus: 50 },
    };
    const player = playerProfile('boundary-player', { initiativeBonus: 0 });
    const profiles = [activeMonster, legendaryMonster, player];
    const initial = createEncounter({
      bounds: { columns: 16, rows: 5 },
      combatants: profiles,
      tokens: [
        placedToken(activeMonster, 0, 1),
        placedToken(legendaryMonster, 5, 1),
        placedToken(player, 13, 1),
      ],
      config: { initiativeMode: 'per_combatant' },
    });
    const started = reduceEncounter(initial, { type: 'roll_initiative' }, mulberry32(62_060_009)).state;
    expect(started.activeCombatant).toBe(activeMonster.id);

    const queued = reduceEncounter(started, {
      type: 'end_turn', actor: activeMonster.id,
    }, mulberry32(62_060_010)).state;
    const [window] = queued.pendingDecisions;
    expect(window).toMatchObject({
      kind: 'legendary_action_window',
      combatant: legendaryMonster.id,
      boundary: { activeCombatant: activeMonster.id, round: 1 },
    });
    if (window === undefined || window.kind !== 'legendary_action_window') {
      throw new Error('Minimal boundary fixture did not queue its legendary-action window.');
    }
    const passedWithoutReplay = reduceEncounter(queued, {
      type: 'resolve_pending_decision', decisionId: window.id, optionId: 'pass',
    }, mulberry32(62_060_011)).state;
    expect(passedWithoutReplay.pendingDecisions).toEqual([]);
    expect(passedWithoutReplay.activeCombatant).toBe(activeMonster.id);
    expect(passedWithoutReplay.eventLog.some((event) =>
      event.type === 'turn_ended' && event.combatant === activeMonster.id)).toBe(false);

    const planningState = projectFutureMonsterTurns(started, [activeMonster.id]);
    const dodge = availableEngineActorOptions(planningState, activeMonster.id)
      .find((option) => option.actionSlots.some((slot) =>
        slot.slot === 'main' && slot.use.kind === 'dodge'));
    if (dodge === undefined) throw new Error('Minimal boundary fixture omitted Dodge.');
    const proposal: EngineTurnProposal = {
      actorId: activeMonster.id,
      expectedRevision: started.revision,
      primaryOptionId: dodge.optionId,
      fallbackOptionId: null,
      reason: 'Exercise the unattended legendary-window boundary.',
      overrideJustification: null,
    };
    const resolution = pureTurnProposalResolver.resolve(planningState, proposal);
    if (!resolution.valid) throw new Error('Minimal boundary fixture could not resolve Dodge.');
    const session = new EngineRoundSession(
      started,
      mulberry32(62_060_012),
      { kind: 'unattended', askDefault: 'decline' },
    );

    session.applyResolvedMechanics([{
      proposal,
      option: resolution.option,
      primaryOption: resolution.primaryOption,
      fallbackOption: resolution.fallbackOption,
      mechanics: resolution.mechanics,
      selectedBranch: resolution.selectedBranch,
    }], null);

    const advanced = session.currentState();
    expect(advanced.pendingDecisions).toEqual([]);
    expect(advanced.activeCombatant).toBe(legendaryMonster.id);
    expect(advanced.activeInitiativeIndex).toBe(1);
    expect(advanced.eventLog.some((event) =>
      event.type === 'turn_ended' && event.combatant === activeMonster.id)).toBe(true);
  });

  it('rejects rather than skips an execution_failed row from a seeded fixture', () => {
    const result = executeFrozenRound(
      executionFixtureAt('tests/fixtures/arena-basis-brutal-b/seed-6206009.json'),
      { kind: 'dm_attended' },
    );

    expect(result.outcome).toBe('execution_failed');
    expect(result.state.pendingDecisions.length).toBeGreaterThan(0);
    expect(() => assertRoundsExecuted([result])).toThrow('Seed 6206009 failed round execution');
  });

  it('fails structurally when a brutal-named fixture does not satisfy the membership predicates', () => {
    const fixture = fixtureAt(0);
    const structurallyInvalid: GeneratedRoom = {
      ...fixture.room,
      spec: { ...fixture.room.spec, terrain: [] },
    };
    expect(() => assertBrutalMembership(
      structurallyInvalid,
      fixture.bytes,
      FIXTURE_DIGESTS[BRUTAL_10_B_SEEDS[0]],
    )).toThrow();
  });
});
