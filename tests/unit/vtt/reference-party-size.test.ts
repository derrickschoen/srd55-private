import { describe, expect, it } from 'vitest';
import { combatToken, monsterCombatantProfile } from '../../../src/combat/combatant';
import { createEncounter, reduceEncounter } from '../../../src/combat/encounter';
import { monsterAttackCommand } from '../../../src/combat/monster-commands';
import { mulberry32 } from '../../../src/combat/random';
import { WOLF } from '../../../src/combat/statblocks/monsters';
import { combatantId, tokenId } from '../../../src/combat/values';
import { applyRoomInitiativeProfile, generateRoom } from '../../../src/vtt/room-generator';

describe('bundled reference party size', () => {
  it('types every bundled PC as Medium and permits size-gated monster on-hit eligibility', () => {
    const profiled = applyRoomInitiativeProfile(
      generateRoom(6_203_001, { difficulty: 'brutal' }).encounter.state,
      'derived_v1',
    );
    const players = profiled.combatants.filter((combatant) =>
      combatant.profile.kind === 'player_character');
    expect(players.map((player) => player.profile.rules.sizeCategory)).toEqual([
      'Medium', 'Medium', 'Medium',
    ]);
    const wolfBase = monsterCombatantProfile(WOLF, {
      combatantId: combatantId('combatant:size-check-wolf'),
      tokenId: tokenId('token:size-check-wolf'),
    });
    const wolf = {
      ...wolfBase,
      rules: { ...wolfBase.rules, initiativeBonus: 1_000 },
    };
    const actions = WOLF.sourceDetails.actions;
    if (actions.kind !== 'present') throw new Error('Wolf fixture has no decoded actions.');
    const bite = actions.value.find((action) =>
      action.kind === 'attack' && action.id === 'bite');
    if (bite?.kind !== 'attack') throw new Error('Wolf fixture has no Bite attack.');

    for (const player of players) {
      const encounter = createEncounter({
        bounds: { columns: 4, rows: 3 },
        combatants: [wolf, player.profile],
        tokens: [
          combatToken(wolf, { column: 1, row: 1 }),
          combatToken(player.profile, { column: 2, row: 1 }),
        ],
      });
      const started = reduceEncounter(encounter, { type: 'roll_initiative' }, mulberry32(46_600_005)).state;

      expect(() => reduceEncounter(
        started,
        monsterAttackCommand(bite, wolf.id, player.profile.id),
        () => 0.99,
      )).not.toThrow();
    }
  });
});
