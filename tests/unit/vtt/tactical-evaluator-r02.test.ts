import { describe, expect, it } from 'vitest';
import { evaluateMonsterTacticalAttack, type EncounterState } from '../../../src/combat/encounter';
import { traceCombatantLine } from '../../../src/combat/cover';
import type { MonsterAttackAction } from '../../../src/combat/statblock';
import { combatantId } from '../../../src/combat/values';
import type { TacticalAllocationCandidate } from '../../../src/vtt/engine-query-port';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import { availableEngineActorOptions } from '../../../src/vtt/intent-resolver';
import type { EngineOfferableOption } from '../../../src/vtt/turn-proposal';
import { loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import { declareTestInputs } from '../../helpers/test-inputs';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

const inputs = declareTestInputs({
  fixtures: ['tests/fixtures/arena-basis-hard/seed-5117009.json'],
});

const FIGHTER = combatantId('combatant:fighter');
const SCOUTS = [
  combatantId('combatant:generated-5117009-monster-3'),
  combatantId('combatant:generated-5117009-monster-5'),
] as const;
const PRIEST = combatantId('combatant:generated-5117009-monster-1');
const BANDITS = [
  combatantId('combatant:generated-5117009-monster-4'),
  combatantId('combatant:generated-5117009-monster-6'),
] as const;

interface FailureWeights {
  readonly miss: number;
  readonly normalHit: number;
  readonly criticalHit: number;
  readonly denominator: number;
}

function repeated(weights: FailureWeights, count: number): readonly FailureWeights[] {
  return Array.from({ length: count }, () => weights);
}

/** Independent closed-form convolution over miss/+1/+2 death-save-failure outcomes. */
function deathSaveKillProbability(attacks: readonly FailureWeights[]): number {
  let states: readonly number[] = [1, 0, 0, 0];
  for (const attack of attacks) {
    const next = [0, 0, 0, 0];
    for (let failures = 0; failures <= 3; failures += 1) {
      const stateProbability = states[failures] ?? 0;
      next[failures] = (next[failures] ?? 0) + stateProbability * attack.miss / attack.denominator;
      const normalTotal = Math.min(3, failures + 1);
      next[normalTotal] = (next[normalTotal] ?? 0) + stateProbability * attack.normalHit / attack.denominator;
      const criticalTotal = Math.min(3, failures + 2);
      next[criticalTotal] = (next[criticalTotal] ?? 0) + stateProbability * attack.criticalHit / attack.denominator;
    }
    states = [next[0] ?? 0, next[1] ?? 0, next[2] ?? 0, next[3] ?? 0];
  }
  return states[3] ?? 0;
}

const BASE_FAILURE_WEIGHTS = {
  priest: { miss: 14, normalHit: 5, criticalHit: 1, denominator: 20 },
  firstScout: { miss: 15, normalHit: 4, criticalHit: 1, denominator: 20 },
  secondScout: { miss: 18, normalHit: 1, criticalHit: 1, denominator: 20 },
  firstBandit: { miss: 16, normalHit: 3, criticalHit: 1, denominator: 20 },
  secondBandit: { miss: 14, normalHit: 5, criticalHit: 1, denominator: 20 },
} as const satisfies Readonly<Record<string, FailureWeights>>;

const BLESSED_FAILURE_WEIGHTS = {
  priest: { miss: 23, normalHit: 15, criticalHit: 2, denominator: 40 },
  firstScout: { miss: 25, normalHit: 13, criticalHit: 2, denominator: 40 },
  secondScout: { miss: 31, normalHit: 7, criticalHit: 2, denominator: 40 },
  firstBandit: { miss: 27, normalHit: 11, criticalHit: 2, denominator: 40 },
} as const satisfies Readonly<Record<string, FailureWeights>>;

async function frozenState(): Promise<EncounterState> {
  inputs.fixtures.readText('tests/fixtures/arena-basis-hard/seed-5117009.json');
  return loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
}

describe('R02-like canonical tactical query', () => {
  it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
    const state = await frozenState();
    const handGeometry = [
      {
        scoutId: SCOUTS[0], position: { column: 19, row: 3 }, sourceCorner: { column: 19, row: 3 },
        lineTiers: ['total', 'total', 'none', 'none'], coverTier: 'half',
        probabilities: { status: 'resolved', hit: 5 / 20, critical: 1 / 20, miss: 15 / 20 },
        expectedDamage: (4 / 20) * 6.5 + (1 / 20) * 11,
      },
      {
        scoutId: SCOUTS[1], position: { column: 19, row: 5 }, sourceCorner: { column: 19, row: 5 },
        lineTiers: ['total', 'total', 'none', 'total'], coverTier: 'three_quarters',
        probabilities: { status: 'resolved', hit: 2 / 20, critical: 1 / 20, miss: 18 / 20 },
        expectedDamage: (1 / 20) * 6.5 + (1 / 20) * 11,
      },
    ] as const;
    const rows = handGeometry.map((geometry) => {
      const scoutId = geometry.scoutId;
      const action = OFFER_ENVIRONMENT.queries.actions(state, scoutId)
        .find((candidate): candidate is MonsterAttackAction =>
          candidate.kind === 'attack' && candidate.id === 'longbow');
      if (action === undefined) throw new Error(`${scoutId} has no Longbow.`);
      const reach = OFFER_ENVIRONMENT.queries.reach(state, {
        actorId: scoutId,
        targetId: FIGHTER,
        actionId: action.id,
      });
      const evaluation = OFFER_ENVIRONMENT.queries.tacticalAttack(
        state,
        scoutId,
        FIGHTER,
        action.id,
      );
      if (evaluation === null) throw new Error(`${scoutId} tactical evaluation is absent.`);
      // The executor-side state adapter must produce the exact same canonical verdict.
      expect(evaluateMonsterTacticalAttack(state, action, scoutId, FIGHTER)).toEqual(evaluation);
      const trace = traceCombatantLine(state, scoutId, FIGHTER);
      expect(state.tokens.find((token) => token.combatantId === scoutId)?.position).toEqual(geometry.position);
      expect({
        sourceCorner: trace.sourceCorner,
        lineTiers: trace.lines.map((line) => line.tier),
        coverTier: trace.tier,
      }).toEqual({
        sourceCorner: geometry.sourceCorner,
        lineTiers: geometry.lineTiers,
        coverTier: geometry.coverTier,
      });
      return {
        scoutId,
        minimumMovementFeet: reach.legal ? 0 : null,
        range: evaluation.range,
        rollMode: evaluation.rollMode,
        probabilities: evaluation.probabilities,
        damage: evaluation.damage,
        consequences: evaluation.consequences,
        policy: evaluation.policy,
        expectedProbabilities: geometry.probabilities,
        expectedDamage: geometry.expectedDamage,
      };
    });

    for (const row of rows) {
      // Fixture positions differ by 18 columns and at most 3 rows: Chebyshev 18 * 5 = 90 ft.
      expect(row.minimumMovementFeet).toBe(0);
      expect(row.range).toEqual({
        status: 'resolved', distanceFeet: 90, band: 'normal', legal: true,
      });
      expect(row.rollMode).toMatchObject({
        mode: 'normal',
        reasons: ['unconscious_advantage', 'prone_ranged_disadvantage'],
      });
      // +4 attacks the hand-counted Half/Three-Quarters adjusted AC above.
      expect(row.probabilities).toEqual(row.expectedProbabilities);
      // Longbow 1d8+2 averages 6.5; critical 2d8+2 averages 11.
      expect(row.damage).toEqual({
        status: 'resolved',
        normalHitAverage: 6.5,
        criticalHitAverage: 11,
        expectedDamage: row.expectedDamage,
      });
      expect(row.consequences).toEqual({
        deathFailureOnHit: true,
        failuresOnHit: 1,
        failuresOnCritical: 2,
        automaticCriticalOnHit: false,
        automaticCriticalMaximumDistanceFeet: 5,
      });
      expect(row.policy).toBe('tactical-evaluator-v3');
    }
  });

  it('compares ordered registry allocations with exact post-grant Bless conditioning', async () => {
    const state = freshMonsterPlanningState(await frozenState());
    const optionFor = (
      actorId: typeof PRIEST,
      predicate: (option: EngineOfferableOption) => boolean,
    ): EngineOfferableOption => {
      const option = availableEngineActorOptions(state, actorId, OFFER_ENVIRONMENT).find(predicate);
      if (option === undefined) throw new Error(`Required option is absent for ${actorId}.`);
      return option;
    };
    const attacks = (actorId: typeof PRIEST, actionId: string, count: number) =>
      optionFor(actorId, (option) => option.actionSlots.some((slot) =>
        slot.slot === 'main' && slot.use.kind === 'multiattack' &&
        slot.use.components.length === count && slot.use.components.every((component) =>
          component.actionId === actionId && component.target.kind === 'combatant' &&
          component.target.combatantId === FIGHTER)) && option.actionSlots.length === 1);
    const singleAttack = (actorId: typeof PRIEST, actionId: string) =>
      optionFor(actorId, (option) => option.actionSlots.length === 1 && option.actionSlots.some((slot) =>
        slot.slot === 'main' && slot.use.kind === 'attack' && slot.use.actionId === actionId &&
        slot.use.target.kind === 'combatant' && slot.use.target.combatantId === FIGHTER));
    const hasBless = (option: EngineOfferableOption) =>
      option.actionSlots.some((slot) => {
        return slot.slot === 'bonus' && slot.use.kind === 'cast_spell' && slot.use.spellId === 'bless';
      });
    const priestAttack = attacks(PRIEST, 'radiant-flame', 2);
    const priestBless = optionFor(PRIEST, (option) =>
      option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'multiattack' &&
        slot.use.components.length === 2 && slot.use.components.every((component) =>
          component.actionId === 'radiant-flame' && component.target.kind === 'combatant' &&
          component.target.combatantId === FIGHTER)) && hasBless(option));
    const priestEnds = optionFor(PRIEST, (option) =>
      option.actionSlots.length === 1 && option.actionSlots[0]?.use.kind === 'end_turn');
    const priestBlessOnly = optionFor(PRIEST, (option) =>
      option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'end_turn') &&
      hasBless(option));
    const scoutOptions = SCOUTS.map((actorId) => attacks(actorId, 'longbow', 2));
    const banditOptions = BANDITS.map((actorId) => singleAttack(actorId, 'light-crossbow'));
    const initiativeOrder = [PRIEST, ...SCOUTS, ...BANDITS] as const;
    const candidate = (
      allocationId: string,
      priestOption: EngineOfferableOption,
      blessTargetIds?: readonly typeof PRIEST[],
    ): TacticalAllocationCandidate => ({
      allocationId,
      choices: [priestOption, ...scoutOptions, ...banditOptions].map((option) => ({
        actorId: option.actorId,
        optionId: option.optionId,
      })),
      ...(blessTargetIds === undefined ? {} : {
        modifierGrants: [{ sourceActorId: PRIEST, kind: 'bless', targetIds: blessTargetIds }],
      }),
    });
    const scoutScoutPriest = [PRIEST, ...SCOUTS] as const;
    const scoutScoutBandit = [...SCOUTS, BANDITS[0]] as const;
    const comparison = OFFER_ENVIRONMENT.queries.compareAllocations(state, FIGHTER, [
      candidate('no-bless', priestAttack),
      candidate('bless-scout-scout-priest', priestBless, scoutScoutPriest),
      candidate('bless-scout-scout-bandit', priestBless, scoutScoutBandit),
      candidate('no-priest-attacks', priestEnds),
      candidate('bless-only-priest-no-attacks', priestBlessOnly, scoutScoutBandit),
    ], initiativeOrder, OFFER_ENVIRONMENT);

    expect(comparison.policy).toBe('tactical-evaluator-v3');
    const probability = (allocationId: string) => {
      const result = comparison.allocations.find((allocation) => allocation.allocationId === allocationId);
      if (result?.killProbability === null || result?.killProbability === undefined) {
        throw new Error(`${allocationId} kill probability is unresolved.`);
      }
      expect(result.expectedFailures).not.toBeNull();
      expect(result.expectedDamage).not.toBeNull();
      return result.killProbability;
    };
    // Hand corner counts give Half to Priest/Scout 1/Bandit 1, Three-Quarters
    // to Scout 2, and none to Bandit 2. The named fractions above follow from
    // attack bonus versus AC (natural 20 remains critical), independently of the engine fold.
    expect(probability('no-bless')).toBeCloseTo(deathSaveKillProbability([
      ...repeated(BASE_FAILURE_WEIGHTS.priest, 2),
      ...repeated(BASE_FAILURE_WEIGHTS.firstScout, 2),
      ...repeated(BASE_FAILURE_WEIGHTS.secondScout, 2),
      BASE_FAILURE_WEIGHTS.firstBandit,
      BASE_FAILURE_WEIGHTS.secondBandit,
    ]), 12);
    expect(probability('bless-scout-scout-priest')).toBeCloseTo(deathSaveKillProbability([
      ...repeated(BLESSED_FAILURE_WEIGHTS.priest, 2),
      ...repeated(BLESSED_FAILURE_WEIGHTS.firstScout, 2),
      ...repeated(BLESSED_FAILURE_WEIGHTS.secondScout, 2),
      BASE_FAILURE_WEIGHTS.firstBandit,
      BASE_FAILURE_WEIGHTS.secondBandit,
    ]), 12);
    expect(probability('bless-scout-scout-bandit')).toBeCloseTo(deathSaveKillProbability([
      ...repeated(BASE_FAILURE_WEIGHTS.priest, 2),
      ...repeated(BLESSED_FAILURE_WEIGHTS.firstScout, 2),
      ...repeated(BLESSED_FAILURE_WEIGHTS.secondScout, 2),
      BLESSED_FAILURE_WEIGHTS.firstBandit,
      BASE_FAILURE_WEIGHTS.secondBandit,
    ]), 12);
    expect(probability('no-priest-attacks')).toBeCloseTo(deathSaveKillProbability([
      ...repeated(BASE_FAILURE_WEIGHTS.firstScout, 2),
      ...repeated(BASE_FAILURE_WEIGHTS.secondScout, 2),
      BASE_FAILURE_WEIGHTS.firstBandit,
      BASE_FAILURE_WEIGHTS.secondBandit,
    ]), 12);
    expect(probability('bless-only-priest-no-attacks')).toBeCloseTo(deathSaveKillProbability([
      ...repeated(BLESSED_FAILURE_WEIGHTS.firstScout, 2),
      ...repeated(BLESSED_FAILURE_WEIGHTS.secondScout, 2),
      BLESSED_FAILURE_WEIGHTS.firstBandit,
      BASE_FAILURE_WEIGHTS.secondBandit,
    ]), 12);

    const delayedOrder = [SCOUTS[0], PRIEST, SCOUTS[1], ...BANDITS] as const;
    const delayedBlessOption = priestBless;
    const firstScoutOption = scoutOptions[0];
    const secondScoutOption = scoutOptions[1];
    const firstBanditOption = banditOptions[0];
    const secondBanditOption = banditOptions[1];
    if (
      firstScoutOption === undefined || secondScoutOption === undefined ||
      firstBanditOption === undefined || secondBanditOption === undefined
    ) throw new Error('Frozen R02 attack option cardinality changed.');
    const delayed = OFFER_ENVIRONMENT.queries.compareAllocations(state, FIGHTER, [{
      allocationId: 'bless-after-first-scout',
      choices: [firstScoutOption, delayedBlessOption, secondScoutOption, firstBanditOption, secondBanditOption]
        .map((option) => ({ actorId: option.actorId, optionId: option.optionId })),
      modifierGrants: [{ sourceActorId: PRIEST, kind: 'bless', targetIds: scoutScoutPriest }],
    }], delayedOrder, OFFER_ENVIRONMENT).allocations[0];
    if (delayed?.killProbability === null || delayed?.killProbability === undefined) {
      throw new Error('Delayed-Bless allocation is unresolved.');
    }
    // The first Scout acts before Bless; Priest and Scout 2 then use their blessed rows.
    expect(delayed.killProbability).toBeCloseTo(deathSaveKillProbability([
      ...repeated(BASE_FAILURE_WEIGHTS.firstScout, 2),
      ...repeated(BLESSED_FAILURE_WEIGHTS.priest, 2),
      ...repeated(BLESSED_FAILURE_WEIGHTS.secondScout, 2),
      BASE_FAILURE_WEIGHTS.firstBandit,
      BASE_FAILURE_WEIGHTS.secondBandit,
    ]), 12);
  });
});
