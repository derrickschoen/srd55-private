import { describe, expect, it } from 'vitest';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import { createEncounter } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import { BANDIT } from '../../../src/combat/statblocks/mercenary-company';
import { encounterBranchId, encounterSessionId } from '../../../src/combat/values';
import { EngineRoundSession } from '../../../src/vtt/engine-round-session';
import {
  availableEngineActorOptions,
  createPureTurnProposalResolver,
  resolveEngineActorOption,
} from '../../../src/vtt/intent-resolver';
import { scoreTeamPlans } from '../../../src/vtt/intel/team-scorer';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import { ENGINE_OFFER_FAMILY_POLICY_FORMAT } from '../../../src/vtt/offers/offer-codec-primitives';
import { createEngineOfferFamilyPolicy } from '../../../src/vtt/offers/offer-environment';
import { createUnrepresentedPartyThreatCatalog } from '../../../src/vtt/offers/party-threat-catalog';
import {
  OfferedOptionEnvironmentMismatchError,
  offeredOptionActorsForState,
  offeredOptionPaths,
} from '../../../src/vtt/offered-option-paths';
import { engineOptionId } from '../../../src/vtt/turn-proposal';
import { placedToken, playerProfile } from '../combat/fixtures';

function fixture() {
  const actor = monsterCombatantProfile(BANDIT, {
    combatantId: 'combatant:offers-s3a-bandit',
    tokenId: 'token:offers-s3a-bandit',
  });
  const target = playerProfile('offers-s3a-target', { hitPoints: 80 });
  const state = freshMonsterPlanningState(createEncounter({
    bounds: { columns: 12, rows: 3 },
    combatants: [actor, target],
    tokens: [placedToken(actor, 0, 1), placedToken(target, 5, 1)],
  }));
  return { actor, state };
}

function revisionBoundEnvironment(helpAttack: 'disabled' | 'enabled' = 'disabled') {
  return buildOfferEnvironment({
    kind: 'configuration',
    mode: 'revision_bound',
    familyPolicy: createEngineOfferFamilyPolicy({
      format: ENGINE_OFFER_FAMILY_POLICY_FORMAT,
      helpAttack,
      readyAttack: 'disabled',
      unarmedControl: 'disabled',
      reposition: 'disabled',
    }),
    partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
  });
}

describe('Slice 3A bound offer environments', () => {
  it('resolver fallback accepts an equal binding while a different digest is refused', () => {
    const { actor, state } = fixture();
    const environment = revisionBoundEnvironment();
    const equalBindingEnvironment = buildOfferEnvironment({
      kind: 'binding',
      binding: environment.binding,
    });
    const differentPolicyEnvironment = revisionBoundEnvironment('enabled');
    const options = availableEngineActorOptions(state, actor.id, environment);
    const fallback = options.find((option) =>
      option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'dodge'));
    if (fallback === undefined) throw new Error('Dodge fallback fixture is absent.');
    const result = createPureTurnProposalResolver(equalBindingEnvironment).resolve(state, {
      actorId: actor.id,
      expectedRevision: state.revision,
      primaryOptionId: engineOptionId('option:not-offered'),
      fallbackOptionId: fallback.optionId,
      reason: 'Use the bound fallback.',
      overrideJustification: null,
    });

    expect(equalBindingEnvironment).not.toBe(environment);
    expect(equalBindingEnvironment.binding).toEqual(environment.binding);
    expect(result).toMatchObject({ valid: true, selectedBranch: 'fallback' });
    expect(resolveEngineActorOption(state, fallback, differentPolicyEnvironment)).toMatchObject({
      valid: false,
      code: 'OFFER_ENVIRONMENT_MISMATCH',
    });
  });

  it('board path and round execution share environment digest', () => {
    const { actor, state } = fixture();
    const environment = revisionBoundEnvironment();
    const differentPolicyEnvironment = revisionBoundEnvironment('enabled');
    const actors = offeredOptionActorsForState(state, [actor.id], environment);

    expect(offeredOptionPaths(state, actors, environment).length).toBeGreaterThan(0);
    expect(() => offeredOptionPaths(state, actors, differentPolicyEnvironment))
      .toThrowError(OfferedOptionEnvironmentMismatchError);

    const capsule = new EngineRoundSession(
      state,
      mulberry32(3_000_001),
      { kind: 'unattended', askDefault: 'decline' },
      environment,
    ).authorizationCapsule({
      runId: encounterSessionId('encounter:offers-s3a'),
      branchId: encounterBranchId('branch:offers-s3a'),
      revision: 1,
      requestId: 'request:offers-s3a',
      phase: 'initial',
      room: 1,
      historyKind: 'offers_s3a_environment_identity',
    });
    expect(capsule.offerEnvironment.digest).toBe(environment.digest);
  });

  it('all offer API consumers use their bound environment', () => {
    const { actor, state } = fixture();
    const environment = revisionBoundEnvironment();
    const primary = availableEngineActorOptions(state, actor.id, environment)
      .find((option) => option.actionSlots.some((slot) =>
        slot.slot === 'main' && slot.use.kind === 'attack'));
    if (primary === undefined) throw new Error('Attack option fixture is absent.');
    const report = scoreTeamPlans(state, [{
      candidateId: 'candidate:offers-s3a',
      label: 'Bound attack',
      proposals: [{
        actorId: actor.id,
        expectedRevision: state.revision,
        primaryOptionId: primary.optionId,
        fallbackOptionId: null,
        reason: 'Use the bound attack.',
        overrideJustification: null,
      }],
    }], environment);
    const evaluation = report.evaluations[0];

    expect(evaluation).toBeDefined();
    if (evaluation?.status === 'unresolved') {
      expect(evaluation.reasons).not.toContain('option_illegal');
    }
  });
});
