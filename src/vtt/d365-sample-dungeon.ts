import {
  monsterCombatantProfile,
  type CombatantProfile,
} from '../combat/combatant';
import { createEncounter } from '../combat/encounter';
import type { GridCell } from '../combat/grid';
import { lookupBundledMonster } from '../combat/statblocks/companions';
import { HOMEBREW_BEAST_ROSTER } from '../combat/statblocks/homebrew-beast-families';
import { loadedPartyTurnLegalActions, type LoadedPartyMember } from './party-pack';
import {
  preloadPartySessionState,
  type AdventuringDayRoom,
  type PartySessionState,
  type ShortRestHitDieSpend,
  type ShortRestResult,
} from './party-session-state';
import {
  storedPartyControllerIdentities,
  type StoredCharacterEncounter,
} from './stored-character-encounter';
import { regretTurnLegalActions } from './regret/legal-actions';

export const D365_SAMPLE_DUNGEON_ID = 'dungeon:d365-four-room-proof' as const;

export interface D365DungeonMonster {
  readonly statblockId: string;
  readonly position: GridCell;
}

export interface D365DungeonRoom {
  readonly room: AdventuringDayRoom;
  readonly name: string;
  readonly purpose: 'warmup_pack' | 'control_signatures' | 'ranged_mobile' | 'boss';
  readonly monsters: readonly D365DungeonMonster[];
  readonly blockedCells: readonly GridCell[];
  readonly designSignals: readonly string[];
  readonly recordedActionEconomyRatio: 0.25 | 0.5 | 0.75 | 1;
}

export interface D365DungeonManifest {
  readonly schemaVersion: 1;
  readonly dungeonId: typeof D365_SAMPLE_DUNGEON_ID;
  readonly rulesEdition: '2024';
  readonly rooms: readonly [D365DungeonRoom, D365DungeonRoom, D365DungeonRoom, D365DungeonRoom];
  readonly shortRestAfterRoom: AdventuringDayRoom;
}

export const D365_SAMPLE_DUNGEON: D365DungeonManifest = {
  schemaVersion: 1,
  dungeonId: D365_SAMPLE_DUNGEON_ID,
  rulesEdition: '2024',
  shortRestAfterRoom: 2,
  rooms: [
    {
      room: 1,
      name: 'Briar Gate Pack',
      purpose: 'warmup_pack',
      monsters: [
        { statblockId: 'statblock:goblin-warrior', position: { column: 7, row: 1 } },
        { statblockId: 'statblock:goblin-warrior', position: { column: 7, row: 5 } },
        { statblockId: 'statblock:wolf', position: { column: 8, row: 2 } },
        { statblockId: 'statblock:wolf', position: { column: 8, row: 4 } },
      ],
      blockedCells: [{ column: 5, row: 3 }],
      designSignals: ['pack_tactics', 'distributed_targets'],
      recordedActionEconomyRatio: 1,
    },
    {
      room: 2,
      name: 'Webbed Bear Den',
      purpose: 'control_signatures',
      monsters: [
        { statblockId: 'statblock:homebrew-beast/cave-bear', position: { column: 7, row: 2 } },
        { statblockId: 'statblock:homebrew-beast/ambush-weaver', position: { column: 7, row: 4 } },
      ],
      blockedCells: [{ column: 5, row: 1 }, { column: 5, row: 5 }],
      designSignals: ['bear_hug', 'ongoing_squeeze', 'web', 'venom', 'spider_climb'],
      recordedActionEconomyRatio: 0.5,
    },
    {
      room: 3,
      name: 'Ridgewing Gallery',
      purpose: 'ranged_mobile',
      monsters: [
        { statblockId: 'statblock:scout', position: { column: 8, row: 1 } },
        { statblockId: 'statblock:homebrew-beast/ridgewing-hunter', position: { column: 7, row: 2 } },
        { statblockId: 'statblock:homebrew-beast/storm-raptor', position: { column: 7, row: 4 } },
      ],
      blockedCells: [{ column: 4, row: 2 }, { column: 4, row: 4 }],
      designSignals: ['longbow', 'fly_speed', 'raking_pass', 'talon_rake', 'nimble_escape'],
      recordedActionEconomyRatio: 0.75,
    },
    {
      room: 4,
      name: 'Ironweb Crown',
      purpose: 'boss',
      monsters: [
        { statblockId: 'statblock:homebrew-beast/ironweb-weaver', position: { column: 8, row: 3 } },
      ],
      blockedCells: [{ column: 5, row: 2 }, { column: 5, row: 4 }],
      designSignals: ['boss_web_control', 'venom', 'ambush_support'],
      recordedActionEconomyRatio: 0.25,
    },
  ],
};

export type D365DungeonValidation =
  | { readonly status: 'loaded'; readonly manifest: D365DungeonManifest }
  | {
      readonly status: 'refused';
      readonly refusal: {
        readonly reason: 'edition_mismatch' | 'room_sequence_mismatch' | 'missing_monster_id';
        readonly field: string;
        readonly detail: string;
      };
    };

export function validateD365Dungeon(manifest: D365DungeonManifest): D365DungeonValidation {
  if (manifest.rulesEdition !== '2024') {
    return {
      status: 'refused',
      refusal: {
        reason: 'edition_mismatch',
        field: 'rulesEdition',
        detail: 'The bundled dungeon is locked to the 2024 rules edition.',
      },
    };
  }
  for (const [roomIndex, room] of manifest.rooms.entries()) {
    if (room.room !== roomIndex + 1) {
      return {
        status: 'refused',
        refusal: {
          reason: 'room_sequence_mismatch',
          field: `rooms.${String(roomIndex)}.room`,
          detail: 'Dungeon rooms must be numbered one through four in order.',
        },
      };
    }
    for (const [monsterIndex, monster] of room.monsters.entries()) {
      const lookup = lookupBundledMonster(monster.statblockId);
      if (lookup.status === 'refused' || lookup.entry.kind !== 'static') {
        return {
          status: 'refused',
          refusal: {
            reason: 'missing_monster_id',
            field: `rooms.${String(roomIndex)}.monsters.${String(monsterIndex)}.statblockId`,
            detail: `Dungeon monster ${monster.statblockId} is not a registered static statblock.`,
          },
        };
      }
    }
  }
  return { status: 'loaded', manifest };
}

export function takeD365ScheduledShortRest(
  session: { shortRest(spends: readonly ShortRestHitDieSpend[]): ShortRestResult },
  completedRoom: AdventuringDayRoom,
  spends: readonly ShortRestHitDieSpend[],
): ShortRestResult {
  if (completedRoom !== D365_SAMPLE_DUNGEON.shortRestAfterRoom) {
    throw new Error(
      `The D365 Short Rest is scheduled after room ${String(D365_SAMPLE_DUNGEON.shortRestAfterRoom)}.`,
    );
  }
  return session.shortRest(spends);
}

function roomAt(room: AdventuringDayRoom): D365DungeonRoom {
  const validated = validateD365Dungeon(D365_SAMPLE_DUNGEON);
  if (validated.status === 'refused') {
    throw new Error(`${validated.refusal.field}: ${validated.refusal.detail}`);
  }
  const found = validated.manifest.rooms[room - 1];
  if (found === undefined || found.room !== room) {
    throw new Error(`D365 room ${String(room)} is missing.`);
  }
  return found;
}

function monsterProfiles(room: D365DungeonRoom): readonly CombatantProfile[] {
  return room.monsters.map((monster, index) => {
    const lookup = lookupBundledMonster(monster.statblockId);
    if (lookup.status === 'refused' || lookup.entry.kind !== 'static') {
      throw new Error(`Unregistered D365 monster ${monster.statblockId}.`);
    }
    return monsterCombatantProfile(lookup.entry.statblock, {
      combatantId: `combatant:d365-room-${String(room.room)}-monster-${String(index + 1)}`,
      tokenId: `token:d365-room-${String(room.room)}-monster-${String(index + 1)}`,
    });
  });
}

export function composeD365Room(
  members: readonly LoadedPartyMember[],
  displayNames: ReadonlyMap<number, string>,
  partyState: PartySessionState,
  policy?: Parameters<typeof loadedPartyTurnLegalActions>[1],
): StoredCharacterEncounter {
  const room = roomAt(partyState.room);
  const players = members.map((member) => ({
    ...member.profile,
    name: displayNames.get(member.profile.characterId) ?? member.profile.name,
  }));
  const monsters = monsterProfiles(room);
  const playerPositions: readonly GridCell[] = [
    { column: 1, row: 1 },
    { column: 1, row: 3 },
    { column: 1, row: 5 },
    { column: 2, row: 3 },
  ];
  const fresh = createEncounter({
    bounds: { columns: 10, rows: 7 },
    combatants: [...players, ...monsters],
    tokens: [
      ...players.map((profile, index) => ({
        id: profile.tokenId,
        combatantId: profile.id,
        position: playerPositions[index] as GridCell,
      })),
      ...monsters.map((profile, index) => ({
        id: profile.tokenId,
        combatantId: profile.id,
        position: room.monsters[index]?.position ?? { column: 8, row: index + 1 },
      })),
    ],
    blockedCells: room.blockedCells,
    foggedCells: [],
    dmNotes: [
      `${D365_SAMPLE_DUNGEON_ID} room ${String(room.room)}: ${room.name}.`,
      ...room.designSignals,
    ],
  });
  const state = preloadPartySessionState(fresh, partyState);
  const partyActions = loadedPartyTurnLegalActions(members, policy ?? {
    useHealingPotions: true,
    openWithBless: true,
    reserveClericSlotsForBless: true,
  });
  return {
    rulesEdition: '2024',
    partyState,
    members,
    displayNames,
    state,
    playerIds: players.map((profile) => profile.id),
    controllers: storedPartyControllerIdentities(state.combatants),
    composeNextRoom: composeD365Room,
    turnLegalActions: (current, actor) => {
      const member = members.find((candidate) => candidate.profile.id === actor);
      return member === undefined
        ? regretTurnLegalActions(current, actor)
        : partyActions(current, actor);
    },
  };
}

export function d365HomebrewDesignSignals(): ReadonlyMap<string, readonly string[]> {
  return new Map(HOMEBREW_BEAST_ROSTER.map((row) => [
    row.id,
    row.design.signatures.map((signature) => signature.mechanic),
  ]));
}
