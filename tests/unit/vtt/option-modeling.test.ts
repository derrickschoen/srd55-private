import { describe, expect, expectTypeOf, it } from 'vitest';
import type { EncounterState } from '../../../src/combat/encounter';
import { statblockId } from '../../../src/combat/values';
import {
  classifyOptionModeling,
  type EngineHumanOptionId,
} from '../../../src/vtt/option-modeling';
import { generateRoom } from '../../../src/vtt/room-generator';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import { engineActorOptions } from '../../../src/vtt/turn-option-registry';
import type { EngineTurnProposal } from '../../../src/vtt/turn-proposal';

type Assert<Condition extends true> = Condition;
type HumanOnlyIdIsRejectedByProposal = Assert<
  EngineHumanOptionId extends EngineTurnProposal['primaryOptionId'] ? false : true
>;
const humanOnlyIdIsRejectedByProposal: HumanOnlyIdIsRejectedByProposal = true;
void humanOnlyIdIsRejectedByProposal;

function adjacentState(): {
  readonly state: EncounterState;
  readonly actorId: EncounterState['combatants'][number]['profile']['id'];
} {
  const generated = generateRoom(3_943_001).encounter.state;
  const actor = generated.combatants.find((combatant) => combatant.profile.kind === 'monster');
  const hostile = generated.combatants.find((combatant) => combatant.profile.kind === 'player_character');
  if (actor === undefined || hostile === undefined) throw new Error('Generated room lacks the required opposing combatants.');
  const state = freshMonsterPlanningState({
    ...generated,
    blockedCells: [],
    combatants: generated.combatants.map((combatant) => combatant.profile.id === hostile.profile.id
      ? { ...combatant, turn: { ...combatant.turn, reactionAvailable: true } }
      : combatant),
    tokens: generated.tokens.map((token) => token.combatantId === actor.profile.id
      ? { ...token, position: { column: 0, row: 0 } }
      : token.combatantId === hostile.profile.id
        ? { ...token, position: { column: 1, row: 0 } }
        : { ...token, position: { column: generated.bounds.columns - 1, row: generated.bounds.rows - 1 } }),
  });
  return { state, actorId: actor.profile.id };
}

describe('engine option modeling partition', () => {
  it('classifies stationary idle Disengage as human-only while Dodge and End Turn remain offerable', () => {
    const { state, actorId } = adjacentState();
    const partition = engineActorOptions(state, actorId);

    expect(partition.offerable.map((option) => option.label)).toContain('Dodge');
    expect(partition.offerable.map((option) => option.label)).toContain('End Turn');
    expect(partition.offerable.map((option) => option.label)).not.toContain('Disengage');
    expect(partition.humanOnly).toContainEqual(expect.objectContaining({
      label: 'Disengage',
      noModeledEffect: { kind: 'stationary_disengage', action: 'disengage' },
    }));
  });

  it('retains a moving Disengage when an adjacent hostile can make a modeled opportunity attack', () => {
    const { state, actorId } = adjacentState();
    const disposition = classifyOptionModeling(state, {
      kind: 'executable',
      actorId,
      movement: {
        preference: { willingness: 'freely', maximumFeet: 30, opportunityRisk: 'avoid' },
        engagement: { stance: 'withdraw', anchor: { kind: 'nearest_visible_enemy' } },
      },
      actionSlots: [{ slot: 'main', use: { kind: 'disengage' } }],
    });

    expect(disposition).toEqual({ kind: 'primary_effect_modeled' });
  });

  it('keeps unsupported utility spells as typed human-only candidates', () => {
    const fixture = adjacentState();
    const state: EncounterState = {
      ...fixture.state,
      combatants: fixture.state.combatants.map((combatant) =>
        combatant.profile.id === fixture.actorId && combatant.profile.kind === 'monster'
          ? { ...combatant, profile: { ...combatant.profile, statblockId: statblockId('statblock:doppelganger') } }
          : combatant),
    };
    const partition = engineActorOptions(state, fixture.actorId);
    const detectThoughts = partition.humanOnly.find((option) => option.label.startsWith('read-thoughts/detect-thoughts'));

    expect(detectThoughts).toEqual(expect.objectContaining({
      declaredOption: expect.objectContaining({ kind: 'spell', spellId: 'detect-thoughts' }),
      noModeledEffect: expect.objectContaining({
        kind: 'unsupported_spell_payload',
        limitation: 'utility_operation_unmodeled',
      }),
    }));
    expect(partition.offerable.some((option) => option.label.startsWith('read-thoughts/detect-thoughts'))).toBe(false);
  });

  it('keeps human-only IDs out of proposal ID types', () => {
    expectTypeOf<EngineHumanOptionId>().not.toMatchTypeOf<EngineTurnProposal['primaryOptionId']>();
  });
});
