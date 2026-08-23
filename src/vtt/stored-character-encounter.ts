import type { ControllerIdentity } from '../combat/controllers';
import type { TurnLegalActions } from '../combat/coordinator';
import {
  createEncounter,
  type EncounterState,
} from '../combat/encounter';
import type { EncounterCommand } from '../combat/events';
import type { GridCell } from '../combat/grid';
import { isCellInside } from '../combat/grid';
import type { CombatantId } from '../combat/values';
import {
  loadedPartyTurnLegalActions,
  type LoadedPartyMember,
} from './party-pack';
import { referenceEncounterSetup } from './reference-encounter';

export interface StoredCharacterEncounter {
  readonly state: EncounterState;
  readonly playerIds: readonly CombatantId[];
  readonly controllers: readonly ControllerIdentity[];
  readonly turnLegalActions: TurnLegalActions;
}

function position(state: EncounterState, id: CombatantId): GridCell {
  const token = state.tokens.find((candidate) => candidate.combatantId === id);
  if (token === undefined) throw new Error(`Combatant ${id} has no encounter token.`);
  return token.position;
}

function occupied(state: EncounterState, cell: GridCell): boolean {
  return state.tokens.some(
    (token) => token.position.column === cell.column && token.position.row === cell.row,
  );
}

function movementActions(state: EncounterState, actor: CombatantId): readonly EncounterCommand[] {
  const subject = state.combatants.find((candidate) => candidate.profile.id === actor);
  if (subject === undefined || subject.turn.movement.remaining < 5) return [];
  const current = position(state, actor);
  const commands: EncounterCommand[] = [];
  for (let columnDelta = -1; columnDelta <= 1; columnDelta += 1) {
    for (let rowDelta = -1; rowDelta <= 1; rowDelta += 1) {
      if (columnDelta === 0 && rowDelta === 0) continue;
      const destination = {
        column: current.column + columnDelta,
        row: current.row + rowDelta,
      };
      if (
        isCellInside(state.bounds, destination) &&
        !occupied(state, destination) &&
        !state.blockedCells.some(
          (cell) => cell.column === destination.column && cell.row === destination.row,
        )
      ) {
        commands.push({
          type: 'move',
          actor,
          path: [destination],
          cause: 'voluntary',
        });
      }
    }
  }
  return commands;
}

export function storedPartyControllerIdentities(
  combatants: EncounterState['combatants'],
): readonly ControllerIdentity[] {
  return combatants.map((subject): ControllerIdentity => ({
    combatantId: subject.profile.id,
    controllerId: `${subject.profile.id}:human:dm`,
    kind: 'human',
    generation: 0,
  })).sort((left, right) => left.combatantId.localeCompare(right.combatantId));
}

export function composeStoredCharacterEncounter(
  members: readonly LoadedPartyMember[],
  displayNames: ReadonlyMap<number, string> = new Map(),
): StoredCharacterEncounter {
  if (members.length < 3 || members.length > 5) {
    throw new RangeError('A stored-character encounter requires three to five selected characters.');
  }
  const referenceMonster = referenceEncounterSetup().combatants.find(
    (profile) => profile.kind === 'monster',
  );
  if (referenceMonster === undefined) throw new Error('Reference encounter monster is missing.');
  const playerProfiles = members.map((member) => ({
    ...member.profile,
    name: displayNames.get(member.profile.characterId) ?? member.profile.name,
  }));
  const combatants = [...playerProfiles, referenceMonster];
  const positions: readonly GridCell[] = [
    { column: 1, row: 1 },
    { column: 1, row: 3 },
    { column: 1, row: 5 },
    { column: 2, row: 2 },
    { column: 2, row: 4 },
    { column: 4, row: 3 },
  ];
  const state = createEncounter({
    bounds: { columns: 10, rows: 7 },
    combatants,
    tokens: combatants.map((profile, index) => ({
      id: profile.tokenId,
      combatantId: profile.id,
      position: positions[index] as GridCell,
    })),
    blockedCells: [{ column: 7, row: 2 }],
    foggedCells: [{ column: 8, row: 1 }, { column: 8, row: 2 }],
    dmNotes: ['Stored characters selected by the DM.'],
  });
  const memberActions = loadedPartyTurnLegalActions(members);
  const turnLegalActions: TurnLegalActions = (current, actor) => {
    const member = members.find((candidate) => candidate.profile.id === actor);
    const actions = [
      ...movementActions(current, actor),
      ...(member === undefined
        ? [{ type: 'end_turn' as const, actor }]
        : memberActions(current, actor).actions),
    ];
    const byCommand = new Map(actions.map((action) => [JSON.stringify(action), action]));
    return { actions: [...byCommand.values()] };
  };
  const playerIds = playerProfiles.map((profile) => profile.id);
  return {
    state,
    playerIds,
    controllers: storedPartyControllerIdentities(state.combatants),
    turnLegalActions,
  };
}
