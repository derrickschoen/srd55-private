import { describe, expect, it } from 'vitest';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { guidedPendingReactionResolution } from '../../../src/vtt/reaction-guidance';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

function pendingReaction(): EncounterState {
  const mover = playerProfile('guidance-mover', { hitPoints: 100, initiativeBonus: 20 });
  const reactor = monsterProfile('guidance-reactor', { hitPoints: 100, initiativeBonus: -20 });
  const started = reduceEncounter(createEncounter({
    bounds: { columns: 5, rows: 2 }, combatants: [mover, reactor],
    tokens: [placedToken(mover, 1), placedToken(reactor, 0)],
  }), { type: 'roll_initiative' }, () => 0.5).state;
  return reduceEncounter(started, {
    type: 'move', actor: mover.id, path: [{ column: 2, row: 0 }], cause: 'voluntary',
  }, () => 0.5).state;
}

describe('D401 reaction guidance', () => {
  it('leaves the DM-attended tray path unchanged even when sticky guidance says take', () => {
    const state = pendingReaction();
    const decision = state.pendingDecisions.find((entry) => entry.kind === 'reaction_offer');
    if (decision?.kind !== 'reaction_offer') throw new Error('Expected a pending Reaction offer.');

    expect(guidedPendingReactionResolution(
      state, decision, 'agent', { kind: 'dm_attended' },
      { sideWide: { opportunity_attack: 'take' }, actors: [] },
    )).toBeNull();
  });
});
