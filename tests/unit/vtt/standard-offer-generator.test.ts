import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import { createEncounter } from '../../../src/combat/encounter';
import { SPY } from '../../../src/combat/statblocks/mercenary-company';
import { sha256 } from '../../../src/crypto/sha256';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
import { resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
import { evaluateOptionOutcome } from '../../../src/vtt/intel/option-outcome';
import { engineOfferableOption } from '../../../src/vtt/option-modeling';
import { ENGINE_OFFER_CAPABILITIES } from '../../../src/vtt/offers/offer-generator-registry';
import { standardOfferGenerator } from '../../../src/vtt/offers/standard-offer-generator';
import { placedToken, playerProfile } from '../combat/fixtures';

function standardFixture() {
  const actor = monsterCombatantProfile(SPY, {
    combatantId: 'combatant:standard-generator-spy',
    tokenId: 'token:standard-generator-spy',
  });
  const target = playerProfile('standard-generator-target', { hitPoints: 200 });
  const state = freshMonsterPlanningState(createEncounter({
    bounds: { columns: 20, rows: 5 },
    combatants: [actor, target],
    tokens: [placedToken(actor, 0, 2), placedToken(target, 10, 2)],
  }));
  return { actor, state };
}

describe('standard offer composition capability', () => {
  it('standard generator preserves every legacy option body and id', () => {
    const { actor, state } = standardFixture();
    const offers = standardOfferGenerator.generate({ state, actorId: actor.id, revision: 41 });
    expect(offers.length).toBeGreaterThan(0);

    for (const offer of offers) {
      const legacyBody = {
        actorId: offer.actorId,
        revision: offer.revision,
        label: offer.label,
        movement: offer.movement,
        actionSlots: offer.binding.actionSlots,
        resourceCostLabels: offer.resourceCostLabels,
        omittedRiders: offer.omittedRiders,
        ...(offer.activationChoice === null ? {} : { activationChoice: offer.activationChoice }),
      };
      expect(engineOfferableOption(offer)).toEqual({
        optionId: `option:41:${sha256(canonicalJson(legacyBody)).slice(0, 48)}`,
        ...legacyBody,
      });
    }

    expect(JSON.stringify(offers.map(engineOfferableOption))).not.toContain('"binding"');
  });

  it('standard generator capability remains standard', () => {
    expect(ENGINE_OFFER_CAPABILITIES).toHaveLength(1);
    expect(ENGINE_OFFER_CAPABILITIES[0]).toBe(standardOfferGenerator);
    expect(ENGINE_OFFER_CAPABILITIES.map((capability) => capability.kind)).toEqual(['standard']);
    expect(Object.keys(standardOfferGenerator).sort()).toEqual([
      'evaluate',
      'execute',
      'generate',
      'kind',
      'resolve',
    ]);
  });

  it('composes standard resolution execution and evaluation ports', () => {
    const { actor, state } = standardFixture();
    const offer = standardOfferGenerator.generate({ state, actorId: actor.id, revision: state.revision })
      .find((candidate) => candidate.label === 'End Turn');
    if (offer === undefined) throw new Error('Standard generator fixture omitted End Turn.');
    const resolved = standardOfferGenerator.resolve({
      resolveStandard: (option) => resolveEngineActorOption(state, option, canonicalEngineQueryPort),
    }, offer);
    if (!resolved.valid) throw new Error(`Standard End Turn refused: ${resolved.code}`);

    let executedOptionId: string | null = null;
    standardOfferGenerator.execute({
      executeStandard: (mechanics) => {
        executedOptionId = mechanics.optionId;
      },
    }, resolved.mechanics);
    const evaluation = standardOfferGenerator.evaluate({
      evaluateStandard: (option, mechanics) =>
        evaluateOptionOutcome(state, option, mechanics, canonicalEngineQueryPort),
    }, resolved.mechanics);

    expect(executedOptionId).toBe(resolved.mechanics.mechanics.optionId);
    expect(evaluation).toEqual(expect.objectContaining({ status: 'resolved', family: 'legacy' }));
  });
});
