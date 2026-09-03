import { describe, expect, it } from 'vitest';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import type { MonsterAction, MonsterStatblock } from '../../../src/combat/statblock';
import { WIGHT } from '../../../src/combat/statblocks/undead-crypt';
import { LION } from '../../../src/combat/statblocks/wild-beasts';
import { EngineRoundSession, type AuthorizedEngineTurnProposal } from '../../../src/vtt/engine-round-session';
import { availableEngineActorOptions, pureTurnProposalResolver } from '../../../src/vtt/intent-resolver';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import { legalMultiattackCombinations } from '../../../src/vtt/turn-option-registry';
import type { EngineOfferableOption, EngineTurnProposal } from '../../../src/vtt/turn-proposal';
import { placedToken, playerProfile } from '../combat/fixtures';

function actions(statblock: MonsterStatblock): readonly MonsterAction[] {
  return statblock.sourceDetails.actions.kind === 'present' ? statblock.sourceDetails.actions.value : [];
}

function identities(combinations: ReturnType<typeof legalMultiattackCombinations>): readonly string[] {
  return combinations.map((combination) => combination.map((component) =>
    `${component.kind}:${component.id}`).join('+'));
}

function encounter(statblock: MonsterStatblock, key: string): EncounterState {
  const actor = monsterCombatantProfile(statblock, {
    combatantId: `combatant:${key}`,
    tokenId: `token:${key}`,
  });
  const fastActor = { ...actor, rules: { ...actor.rules, initiativeBonus: 100 } };
  const target = playerProfile(`target-${key}`, { hitPoints: 500, initiativeBonus: -100 });
  return freshMonsterPlanningState(createEncounter({
    bounds: { columns: 20, rows: 10 },
    combatants: [fastActor, target],
    tokens: [placedToken(fastActor, 1, 1), placedToken(target, 2, 1)],
  }));
}

function mixedOption(state: EncounterState, expectedLabel: string): EngineOfferableOption {
  const actorId = state.combatants.find((candidate) => candidate.profile.kind === 'monster')?.profile.id;
  if (actorId === undefined) throw new Error('Mixed-kind fixture omitted its monster.');
  const option = availableEngineActorOptions(state, actorId).find((candidate) =>
    candidate.label.startsWith(expectedLabel));
  if (option === undefined) throw new Error(`Mixed-kind fixture omitted ${expectedLabel}.`);
  return option;
}

function authorize(state: EncounterState, option: EngineOfferableOption): AuthorizedEngineTurnProposal {
  const proposal: EngineTurnProposal = {
    actorId: option.actorId,
    expectedRevision: option.revision,
    primaryOptionId: option.optionId,
    fallbackOptionId: null,
    reason: 'Exercise the mixed-kind multiattack fixture.',
    overrideJustification: null,
  };
  const resolution = pureTurnProposalResolver.resolve(state, proposal);
  if (!resolution.valid) throw new Error(resolution.refusals.map((entry) => entry.code).join(', '));
  return {
    proposal,
    option: resolution.option,
    primaryOption: resolution.primaryOption,
    fallbackOption: resolution.fallbackOption,
    mechanics: resolution.mechanics,
    selectedBranch: resolution.selectedBranch,
  };
}

describe('mixed-kind monster multiattack', () => {
  it('preserves exact lion and wight combination sets and suppresses standalone weapon attacks', () => {
    const lionActions = actions(LION);
    const lionMultiattack = lionActions.find((action) => action.kind === 'multiattack');
    const wightActions = actions(WIGHT);
    const wightMultiattack = wightActions.find((action) => action.kind === 'multiattack');
    if (lionMultiattack?.kind !== 'multiattack' || wightMultiattack?.kind !== 'multiattack') {
      throw new Error('Mixed-kind statblocks omitted Multiattack.');
    }

    expect(identities(legalMultiattackCombinations(lionMultiattack, lionActions))).toEqual([
      'attack:rend+attack:rend',
      'attack:rend+saving_throw:roar',
    ]);
    expect(identities(legalMultiattackCombinations(wightMultiattack, wightActions))).toEqual([
      'attack:necrotic-sword+attack:necrotic-sword',
      'attack:necrotic-sword+attack:necrotic-bow',
      'attack:necrotic-bow+attack:necrotic-sword',
      'attack:necrotic-bow+attack:necrotic-bow',
      'attack:necrotic-sword+saving_throw:life-drain',
      'attack:necrotic-bow+saving_throw:life-drain',
    ]);

    for (const [statblock, forbidden] of [[LION, 'rend'], [WIGHT, 'necrotic-sword']] as const) {
      const state = encounter(statblock, String(statblock.id));
      const actorId = state.combatants.find((candidate) => candidate.profile.kind === 'monster')?.profile.id;
      if (actorId === undefined) throw new Error('Mixed-kind fixture omitted its actor.');
      const options = availableEngineActorOptions(state, actorId);
      expect(options.some((option) => option.actionSlots.some((slot) =>
        slot.use.kind === 'attack' && slot.use.actionId === forbidden))).toBe(false);
      expect(options.some((option) => option.actionSlots.some((slot) =>
        slot.use.kind === 'multiattack' && slot.use.components.some((component) =>
          component.kind === 'attack' && component.actionId === forbidden)))).toBe(true);
    }
  });

  it.each([
    { statblock: LION, label: 'Rend + Roar', order: ['attack:rend', 'saving_throw:roar'] },
    { statblock: WIGHT, label: 'Necrotic Sword + Life Drain', order: ['attack:necrotic-sword', 'saving_throw:life-drain'] },
  ])('resolves and executes $label children once each in declared order', ({ statblock, label, order }) => {
    const state = encounter(statblock, String(statblock.id));
    const option = mixedOption(state, label);
    const authorized = authorize(state, option);
    expect(authorized.mechanics.actionSlots.map((use) => `${use.kind}:${String(use.actionId)}`)).toEqual(order);

    const session = new EngineRoundSession(state, mulberry32(46_600_001), {
      kind: 'unattended', askDefault: 'decline',
    });
    session.applyResolvedMechanics([authorized], null);
    const events = session.currentState().eventLog.filter((event) =>
      (event.type === 'attack_resolved' && event.actor === option.actorId) ||
      (event.type === 'save_resolved' && event.source === option.actorId));
    expect(events.map((event) => event.type)).toEqual(['attack_resolved', 'save_resolved']);
  });
});
