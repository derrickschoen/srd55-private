import {
  combatToken,
  monsterCombatantProfile,
  type CombatantProfile,
} from '../../src/combat/combatant';
import { createEncounter, reduceEncounter, type EncounterState } from '../../src/combat/encounter';
import { GOBLIN_WARRIOR } from '../../src/combat/statblocks/monsters';
import { referenceEncounterSetup } from '../../src/vtt/reference-encounter';

function withInitiative(
  profile: CombatantProfile,
  initiativeBonus: number,
): CombatantProfile {
  return {
    ...profile,
    rules: { ...profile.rules, initiativeBonus },
  };
}

/**
 * Builds the exact encounter exported and re-imported by the option-path browser spec.
 * Keeping this fixture typed prevents browser-side reflection from bypassing the current
 * creature-space construction boundary.
 */
export function createOptionPathFixtureEncounter(): EncounterState {
  const players = referenceEncounterSetup().combatants
    .filter((candidate) => candidate.kind === 'player_character')
    .slice(0, 2);
  const firstPlayer = players[0];
  const secondPlayer = players[1];
  if (firstPlayer === undefined || secondPlayer === undefined) {
    throw new Error('Two reference player profiles are required.');
  }

  const actor = withInitiative(monsterCombatantProfile(GOBLIN_WARRIOR, {
    combatantId: 'combatant:browser-path-goblin',
    tokenId: 'token:browser-path-goblin',
  }), 100);
  const reactor = withInitiative(firstPlayer, -100);
  const target = withInitiative(secondPlayer, -100);
  const initialState = createEncounter({
    bounds: { columns: 8, rows: 5 },
    blockedCells: [
      ...Array.from({ length: 8 }, (_, column) => ({ column, row: 1 })),
      ...Array.from({ length: 8 }, (_, column) => ({ column, row: 3 })),
    ],
    environment: {
      lightRegions: [],
      obscurementRegions: [],
      difficultTerrainRegions: [{ id: 'browser-path-mud', cells: [{ column: 3, row: 2 }] }],
      movementRegions: [],
      narrowOpeningRegions: [],
    },
    combatants: [actor, reactor, target],
    tokens: [
      combatToken(actor, { column: 1, row: 2 }),
      combatToken(reactor, { column: 0, row: 2 }),
      combatToken(target, { column: 7, row: 2 }),
    ],
  });
  return reduceEncounter(initialState, { type: 'roll_initiative' }, () => (10 - 0.5) / 20).state;
}
