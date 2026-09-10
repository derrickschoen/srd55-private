import { describe, expect, it } from 'vitest';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import { createEncounter } from '../../../src/combat/encounter';
import { BANDIT, SPY } from '../../../src/combat/statblocks/mercenary-company';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
import { resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
import { evaluateOptionOutcome } from '../../../src/vtt/intel/option-outcome';
import { engineOfferableOption } from '../../../src/vtt/option-modeling';
import { ENGINE_OFFER_CAPABILITIES } from '../../../src/vtt/offers/offer-generator-registry';
import { standardOfferGenerator } from '../../../src/vtt/offers/standard-offer-generator';
import { placedToken, playerProfile } from '../combat/fixtures';

const PARENT_LEGACY_OPTION_COUNT = 6;
const PARENT_LEGACY_ORDERED_OPTION_IDS = [
  'option:41:54bc820030b0ca978335e4eaee4c3a7fe40cf02f20ab11d7',
  'option:41:c93d5934b840c50f12437a00fe29324a4678c99932e6cdd6',
  'option:41:51155a2bdb36fd6034ba73d92ae9da75fe9a819cc648c434',
  'option:41:928f5f43f161b7b31407dcba12cd603e7a74a469017719ea',
  'option:41:8026ca8a32f777ff915fee76e8cfd22407960121872d013c',
  'option:41:e1b9aed03111f06f1167f0d6aae4bbb800ac31ca5e187f34',
] as const;
const PARENT_LEGACY_OPTIONS = [
  {
    optionId: 'option:41:8026ca8a32f777ff915fee76e8cfd22407960121872d013c',
    actorId: 'combatant:standard-generator-bandit',
    revision: 41,
    label: 'Dash',
    movement: {
      preference: {
        willingness: 'freely',
        maximumFeet: 60,
        opportunityRisk: 'avoid',
      },
      engagement: {
        stance: 'close_to_melee',
        anchor: { kind: 'nearest_visible_enemy' },
      },
    },
    actionSlots: [{ slot: 'main', use: { kind: 'dash' } }],
    resourceCostLabels: [],
    omittedRiders: [],
  },
  {
    optionId: 'option:41:51155a2bdb36fd6034ba73d92ae9da75fe9a819cc648c434',
    actorId: 'combatant:standard-generator-bandit',
    revision: 41,
    label: 'Dodge',
    movement: {
      preference: {
        willingness: 'none',
        maximumFeet: 0,
        opportunityRisk: 'avoid',
      },
      engagement: { stance: 'hold_position' },
    },
    actionSlots: [{ slot: 'main', use: { kind: 'dodge' } }],
    resourceCostLabels: [],
    omittedRiders: [],
  },
  {
    optionId: 'option:41:928f5f43f161b7b31407dcba12cd603e7a74a469017719ea',
    actorId: 'combatant:standard-generator-bandit',
    revision: 41,
    label: 'Disengage',
    movement: {
      preference: {
        willingness: 'none',
        maximumFeet: 0,
        opportunityRisk: 'avoid',
      },
      engagement: { stance: 'hold_position' },
    },
    actionSlots: [{ slot: 'main', use: { kind: 'disengage' } }],
    resourceCostLabels: [],
    omittedRiders: [],
  },
  {
    optionId: 'option:41:e1b9aed03111f06f1167f0d6aae4bbb800ac31ca5e187f34',
    actorId: 'combatant:standard-generator-bandit',
    revision: 41,
    label: 'End Turn',
    movement: {
      preference: {
        willingness: 'none',
        maximumFeet: 0,
        opportunityRisk: 'avoid',
      },
      engagement: { stance: 'hold_position' },
    },
    actionSlots: [{ slot: 'main', use: { kind: 'end_turn' } }],
    resourceCostLabels: [],
    omittedRiders: [],
  },
  {
    optionId: 'option:41:c93d5934b840c50f12437a00fe29324a4678c99932e6cdd6',
    actorId: 'combatant:standard-generator-bandit',
    revision: 41,
    label: 'Light Crossbow -> combatant:standard-generator-target',
    movement: {
      preference: {
        willingness: 'only_if_required',
        maximumFeet: 30,
        opportunityRisk: 'avoid',
      },
      engagement: {
        stance: 'maintain_range',
        anchor: {
          kind: 'combatant',
          combatantId: 'combatant:standard-generator-target',
        },
      },
    },
    actionSlots: [{
      slot: 'main',
      use: {
        kind: 'attack',
        actionId: 'light-crossbow',
        target: {
          kind: 'combatant',
          combatantId: 'combatant:standard-generator-target',
        },
      },
    }],
    resourceCostLabels: [],
    omittedRiders: [],
  },
  {
    optionId: 'option:41:54bc820030b0ca978335e4eaee4c3a7fe40cf02f20ab11d7',
    actorId: 'combatant:standard-generator-bandit',
    revision: 41,
    label: 'Scimitar -> combatant:standard-generator-target',
    movement: {
      preference: {
        willingness: 'only_if_required',
        maximumFeet: 30,
        opportunityRisk: 'avoid',
      },
      engagement: {
        stance: 'close_to_melee',
        anchor: {
          kind: 'combatant',
          combatantId: 'combatant:standard-generator-target',
        },
      },
    },
    actionSlots: [{
      slot: 'main',
      use: {
        kind: 'attack',
        actionId: 'scimitar',
        target: {
          kind: 'combatant',
          combatantId: 'combatant:standard-generator-target',
        },
      },
    }],
    resourceCostLabels: [],
    omittedRiders: [],
  },
] as const;
const PARENT_LEGACY_OPTIONS_IN_GENERATION_ORDER = [
  PARENT_LEGACY_OPTIONS[5],
  PARENT_LEGACY_OPTIONS[4],
  PARENT_LEGACY_OPTIONS[1],
  PARENT_LEGACY_OPTIONS[2],
  PARENT_LEGACY_OPTIONS[0],
  PARENT_LEGACY_OPTIONS[3],
] as const;

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

function legacyOracleFixture() {
  const actor = monsterCombatantProfile(BANDIT, {
    combatantId: 'combatant:standard-generator-bandit',
    tokenId: 'token:standard-generator-bandit',
  });
  const target = playerProfile('standard-generator-target', { hitPoints: 200 });
  const state = freshMonsterPlanningState(createEncounter({
    bounds: { columns: 20, rows: 5 },
    combatants: [actor, target],
    tokens: [placedToken(actor, 0, 2), placedToken(target, 5, 2)],
  }));
  return { actor, state };
}

describe('standard offer composition capability', () => {
  it('standard generator preserves every legacy option body and id', () => {
    const { actor, state } = legacyOracleFixture();
    const offers = standardOfferGenerator.generate({ state, actorId: actor.id, revision: 41 });
    const actualOptions = offers.map(engineOfferableOption);

    expect(actualOptions).toHaveLength(PARENT_LEGACY_OPTION_COUNT);
    expect(actualOptions.map((option) => option.optionId)).toEqual(PARENT_LEGACY_ORDERED_OPTION_IDS);
    expect(actualOptions).toEqual(PARENT_LEGACY_OPTIONS_IN_GENERATION_ORDER);

    expect(JSON.stringify(actualOptions)).not.toContain('"binding"');
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
