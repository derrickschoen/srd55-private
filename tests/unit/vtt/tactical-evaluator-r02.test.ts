import { describe, expect, it } from 'vitest';
import { evaluateMonsterTacticalAttack, type EncounterState } from '../../../src/combat/encounter';
import type { MonsterAttackAction } from '../../../src/combat/statblock';
import { combatantId } from '../../../src/combat/values';
import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
import type { TacticalAllocationCandidate } from '../../../src/vtt/engine-query-port';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import { availableEngineActorOptions } from '../../../src/vtt/intent-resolver';
import type { EngineOfferableOption } from '../../../src/vtt/turn-proposal';
import { loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import { declareTestInputs } from '../../helpers/test-inputs';

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

async function frozenState(): Promise<EncounterState> {
  inputs.fixtures.readText('tests/fixtures/arena-basis-hard/seed-5117009.json');
  return loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');
}

describe('R02-like canonical tactical query', () => {
  it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
    const state = await frozenState();
    const rows = SCOUTS.map((scoutId) => {
      const action = canonicalEngineQueryPort.actions(state, scoutId)
        .find((candidate): candidate is MonsterAttackAction =>
          candidate.kind === 'attack' && candidate.id === 'longbow');
      if (action === undefined) throw new Error(`${scoutId} has no Longbow.`);
      const reach = canonicalEngineQueryPort.reach(state, {
        actorId: scoutId,
        targetId: FIGHTER,
        actionId: action.id,
      });
      const evaluation = canonicalEngineQueryPort.tacticalAttack(
        state,
        scoutId,
        FIGHTER,
        action.id,
      );
      if (evaluation === null) throw new Error(`${scoutId} tactical evaluation is absent.`);
      // The executor-side state adapter must produce the exact same canonical verdict.
      expect(evaluateMonsterTacticalAttack(state, action, scoutId, FIGHTER)).toEqual(evaluation);
      return {
        scoutId,
        minimumMovementFeet: reach.legal ? 0 : null,
        range: evaluation.range,
        rollMode: evaluation.rollMode,
        probabilities: evaluation.probabilities,
        damage: evaluation.damage,
        consequences: evaluation.consequences,
        policy: evaluation.policy,
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
      // +4 vs AC 18 hits on 14..20: 7/20, with 1/20 critical.
      expect(row.probabilities).toEqual({
        status: 'resolved', hit: 0.35, critical: 0.05, miss: 0.65,
      });
      // Longbow 1d8+2 averages 6.5; critical 2d8+2 averages 11.
      expect(row.damage).toEqual({
        status: 'resolved',
        normalHitAverage: 6.5,
        criticalHitAverage: 11,
        expectedDamage: 2.5,
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
      const option = availableEngineActorOptions(state, actorId).find(predicate);
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
    const comparison = canonicalEngineQueryPort.compareAllocations(state, FIGHTER, [
      candidate('no-bless', priestAttack),
      candidate('bless-scout-scout-priest', priestBless, scoutScoutPriest),
      candidate('bless-scout-scout-bandit', priestBless, scoutScoutBandit),
      candidate('no-priest-attacks', priestEnds),
      candidate('bless-only-priest-no-attacks', priestBlessOnly, scoutScoutBandit),
    ], initiativeOrder);

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
    // Independent hand convolution, capping at 3 failures after every shot:
    // Scout={13/20,6/20,1/20}, Bandit={14/20,5/20,1/20},
    // Priest={12/20,7/20,1/20}; Bless changes their noncrit rows to
    // Scout={21/40,17/40,2/40}, Bandit={23/40,15/40,2/40},
    // Priest={19/40,19/40,2/40}. These literals are the resulting state-3 mass.
    expect(probability('no-bless')).toBeCloseTo(4_103_381_091 / 6_400_000_000, 12);
    expect(probability('bless-scout-scout-priest')).toBeCloseTo(
      1_322_400_334_711 / 1_638_400_000_000, 12,
    );
    expect(probability('bless-scout-scout-bandit')).toBeCloseTo(
      320_104_650_259 / 409_600_000_000, 12,
    );
    expect(probability('no-priest-attacks')).toBeCloseTo(26_295_931 / 64_000_000, 12);
    expect(probability('bless-only-priest-no-attacks')).toBeCloseTo(
      1_220_131_427 / 2_048_000_000, 12,
    );

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
    const delayed = canonicalEngineQueryPort.compareAllocations(state, FIGHTER, [{
      allocationId: 'bless-after-first-scout',
      choices: [firstScoutOption, delayedBlessOption, secondScoutOption, firstBanditOption, secondBanditOption]
        .map((option) => ({ actorId: option.actorId, optionId: option.optionId })),
      modifierGrants: [{ sourceActorId: PRIEST, kind: 'bless', targetIds: scoutScoutPriest }],
    }], delayedOrder).allocations[0];
    if (delayed?.killProbability === null || delayed?.killProbability === undefined) {
      throw new Error('Delayed-Bless allocation is unresolved.');
    }
    // The first Scout's two shots remain {13/20,6/20,1/20}; only the Priest
    // and later Scout use their Blessed rows. Hand convolution yields this mass.
    expect(delayed.killProbability).toBeCloseTo(
      310_602_197_859 / 409_600_000_000, 12,
    );
  });
});
