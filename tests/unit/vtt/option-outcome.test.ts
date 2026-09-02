import { describe, expect, it } from 'vitest';
import { combatantId, difficultyClass } from '../../../src/combat/values';
import { savingThrowOutcomeWeights } from '../../../src/combat/resolution';
import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
import {
  evaluateOptionOutcome,
  evaluateHardControlProfile,
  wakeControlTrace,
  type HardControlOutcomeEvidence,
  type DamageOutcomeEvidence,
} from '../../../src/vtt/intel/option-outcome';
import { freshMonsterPlanningState, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';

const FIXTURE = 'tests/fixtures/arena-scenarios/hypnotic-pattern-cc.json';
const CASTER = combatantId('combatant:d432-incubus');

describe('D436 exact option outcome evaluator', () => {
  it('uses canonical normal, advantage, and disadvantage save-face weights', () => {
    expect(savingThrowOutcomeWeights({ bonus: -2, dc: difficultyClass(15), rollMode: 'normal' }))
      .toEqual({ failure: 16, success: 4, total: 20 });
    expect(savingThrowOutcomeWeights({ bonus: -2, dc: difficultyClass(15), rollMode: 'advantage' }))
      .toEqual({ failure: 256, success: 144, total: 400 });
    expect(savingThrowOutcomeWeights({ bonus: -2, dc: difficultyClass(15), rollMode: 'disadvantage' }))
      .toEqual({ failure: 384, success: 16, total: 400 });
  });

  it('lets a creature released in one round become a later-round waker', () => {
    expect(wakeControlTrace(3, 4, 0, 3)).toEqual([
      {
        round: 1,
        eligibility: {
          outsideEffect: 0,
          savedInitially: 1,
          releasedEarlier: 0,
          currentlyControlled: 3,
        },
        wakeActions: 1,
        disabledTurns: 2,
        controlledNextRound: 2,
      },
      {
        round: 2,
        eligibility: {
          outsideEffect: 0,
          savedInitially: 1,
          releasedEarlier: 1,
          currentlyControlled: 2,
        },
        wakeActions: 2,
        disabledTurns: 0,
        controlledNextRound: 0,
      },
      {
        round: 3,
        eligibility: {
          outsideEffect: 0,
          savedInitially: 1,
          releasedEarlier: 3,
          currentlyControlled: 0,
        },
        wakeActions: 0,
        disabledTurns: 0,
        controlledNextRound: 0,
      },
    ]);
  });

  it('matches the complete Hypnotic Pattern control oracle exactly', async () => {
    const state = freshMonsterPlanningState(await loadArenaFixture(FIXTURE));
    const option = availableEngineActorOptions(state, CASTER).find((candidate) =>
      candidate.actionSlots.some((slot) => slot.use.kind === 'cast_spell' && slot.use.spellId === 'hypnotic-pattern'));
    if (option === undefined) throw new Error('Hypnotic Pattern option is absent.');
    const resolution = resolveEngineActorOption(state, option);
    if (!resolution.valid) throw new Error(resolution.summary);

    const outcome = evaluateOptionOutcome(state, option, resolution.mechanics, canonicalEngineQueryPort);

    expect(outcome).toMatchObject({
      status: 'resolved',
      policy: 'option-outcome-v1',
      family: 'hard_turn_denial',
      ledger: {
        resourcePenalty: { numerator: 1, denominator: 2 },
        netActionEquivalents: { numerator: 178583, denominator: 31250 },
      },
    });
    if (outcome.status !== 'resolved' || outcome.evidence.kind !== 'hard_control') {
      throw new Error('Hypnotic Pattern did not resolve as hard control.');
    }
    const evidence: HardControlOutcomeEvidence = outcome.evidence;
    expect(evidence.hostileInitialCountDistribution).toEqual([
      { numerator: 1, denominator: 625 },
      { numerator: 16, denominator: 625 },
      { numerator: 96, denominator: 625 },
      { numerator: 256, denominator: 625 },
      { numerator: 256, denominator: 625 },
    ]);
    expect(evidence.expectedInitiallyAffected).toEqual({ numerator: 16, denominator: 5 });
    expect(evidence.expectedWakeActions).toEqual({ numerator: 4368, denominator: 3125 });
    expect(evidence.expectedDisabledTurns).toEqual({ numerator: 75264, denominator: 15625 });
    expect(evidence.expectedControlBurden).toEqual({ numerator: 97104, denominator: 15625 });
    expect(evidence.concentrationSurvival).toEqual({ numerator: 4, denominator: 5 });
    expect(evidence.wakeEligibility.map((entry) => entry.kind)).toEqual(expect.arrayContaining([
      'saved_initially', 'released_earlier', 'currently_controlled',
    ]));

    const oneRound = evaluateHardControlProfile(state, CASTER, {
      ...evidence.profile,
      durationRounds: 1,
    });
    const twoRounds = evaluateHardControlProfile(state, CASTER, {
      ...evidence.profile,
      durationRounds: 2,
    });
    expect(oneRound.status === 'resolved' && oneRound.evidence.kind === 'hard_control'
      ? oneRound.evidence.expectedControlBurden
      : null).toEqual({ numerator: 16, denominator: 5 });
    expect(twoRounds.status === 'resolved' && twoRounds.evidence.kind === 'hard_control'
      ? twoRounds.evidence.expectedControlBurden
      : null).toEqual({ numerator: 16144, denominator: 3125 });
  });

  it('uses the exact full-sequence damage distribution for Restless Touch pressure', async () => {
    const state = freshMonsterPlanningState(await loadArenaFixture(FIXTURE));
    const option = availableEngineActorOptions(state, CASTER).find((candidate) =>
      candidate.actionSlots.some((slot) => slot.use.kind === 'multiattack' &&
        slot.use.components.every((component) => component.actionId === 'restless-touch' &&
          component.target.kind === 'combatant' && component.target.combatantId === 'combatant:d432-wizard')));
    if (option === undefined) throw new Error('Restless Touch option is absent.');
    const resolution = resolveEngineActorOption(state, option);
    if (!resolution.valid) throw new Error(resolution.summary);

    const outcome = evaluateOptionOutcome(state, option, resolution.mechanics, canonicalEngineQueryPort);

    expect(outcome).toMatchObject({
      status: 'resolved',
      policy: 'option-outcome-v1',
      family: 'legacy',
      ledger: {
        netActionEquivalents: { numerator: 2310764334427, denominator: 6530347008000 },
      },
    });
    if (outcome.status !== 'resolved' || outcome.evidence.kind !== 'damage') {
      throw new Error('Restless Touch did not resolve as damage.');
    }
    const evidence: DamageOutcomeEvidence = outcome.evidence;
    expect(evidence.expectedDamage).toEqual({ numerator: 106, denominator: 5 });
    expect(evidence.killProbability).toEqual({ numerator: 14329861, denominator: 54419558400 });
  });
});
