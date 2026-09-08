import {
  combatToken,
  monsterCombatantProfile,
  type CombatantProfile,
} from '../combat/combatant';
import { createEncounter } from '../combat/encounter';
import type { GridCell } from '../combat/grid';
import { lookupBundledMonster } from '../combat/statblocks/companions';
import { HOMEBREW_BEAST_ROSTER } from '../combat/statblocks/homebrew-beast-families';
import { armorClass, worldObjectId } from '../combat/values';
import type { CoverTier, WorldObject } from '../combat/world-objects';
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

export interface D365CoverPlacement {
  readonly id: string;
  readonly name: string;
  readonly obstacleCells: readonly GridCell[];
  readonly shelteredCells: readonly GridCell[];
  readonly tier: Exclude<CoverTier, 'none' | 'total'>;
}

export interface D365DungeonRoom {
  readonly room: AdventuringDayRoom;
  readonly name: string;
  readonly purpose: 'warmup_pack' | 'control_signatures' | 'ranged_mobile' | 'boss';
  readonly monsters: readonly D365DungeonMonster[];
  readonly blockedCells: readonly GridCell[];
  readonly coverPlacements: readonly D365CoverPlacement[];
  readonly designSignals: readonly string[];
  readonly recordedActionEconomyRatio: 0.2 | 0.4 | 0.6 | 0.8;
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
      coverPlacements: [
        {
          id: 'north-gate-pillar',
          name: 'Briar Gate North Pillar',
          obstacleCells: [{ column: 4, row: 1 }],
          shelteredCells: [{ column: 3, row: 1 }],
          tier: 'three_quarters',
        },
        {
          id: 'south-gate-pillar',
          name: 'Briar Gate South Pillar',
          obstacleCells: [{ column: 4, row: 5 }],
          shelteredCells: [{ column: 3, row: 5 }],
          tier: 'three_quarters',
        },
      ],
      designSignals: ['pack_tactics', 'distributed_targets'],
      recordedActionEconomyRatio: 0.8,
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
      coverPlacements: [
        {
          id: 'north-den-casks',
          name: 'Web-Bound North Casks',
          obstacleCells: [{ column: 5, row: 1 }],
          shelteredCells: [{ column: 4, row: 0 }],
          tier: 'half',
        },
        {
          id: 'south-den-casks',
          name: 'Web-Bound South Casks',
          obstacleCells: [{ column: 5, row: 5 }],
          shelteredCells: [{ column: 4, row: 6 }],
          tier: 'half',
        },
      ],
      designSignals: ['bear_hug', 'ongoing_squeeze', 'web', 'venom', 'spider_climb'],
      recordedActionEconomyRatio: 0.4,
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
      coverPlacements: [
        {
          id: 'north-gallery-pillar',
          name: 'Ridgewing North Gallery Pillar',
          obstacleCells: [{ column: 4, row: 2 }],
          shelteredCells: [{ column: 3, row: 2 }],
          tier: 'three_quarters',
        },
        {
          id: 'south-gallery-pillar',
          name: 'Ridgewing South Gallery Pillar',
          obstacleCells: [{ column: 4, row: 4 }],
          shelteredCells: [{ column: 3, row: 4 }],
          tier: 'three_quarters',
        },
      ],
      designSignals: ['longbow', 'fly_speed', 'raking_pass', 'talon_rake', 'nimble_escape'],
      recordedActionEconomyRatio: 0.6,
    },
    {
      room: 4,
      name: 'Ironweb Crown',
      purpose: 'boss',
      monsters: [
        { statblockId: 'statblock:homebrew-beast/ironweb-weaver', position: { column: 8, row: 3 } },
      ],
      blockedCells: [{ column: 5, row: 2 }, { column: 5, row: 4 }],
      coverPlacements: [
        {
          id: 'north-crown-rubble',
          name: 'Ironweb North Crown Rubble',
          obstacleCells: [{ column: 5, row: 2 }],
          shelteredCells: [{ column: 3, row: 1 }],
          tier: 'half',
        },
        {
          id: 'south-crown-rubble',
          name: 'Ironweb South Crown Rubble',
          obstacleCells: [{ column: 5, row: 4 }],
          shelteredCells: [{ column: 3, row: 5 }],
          tier: 'half',
        },
      ],
      designSignals: ['boss_web_control', 'venom', 'ambush_support'],
      recordedActionEconomyRatio: 0.2,
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

function coverWorldObjects(room: D365DungeonRoom): readonly WorldObject[] {
  return room.coverPlacements.map((placement) => {
    const position = placement.obstacleCells[0];
    if (position === undefined) throw new Error(`${placement.name} has no obstacle cell.`);
    return {
      id: worldObjectId(`world-object:d365-room-${String(room.room)}:${placement.id}`),
      name: placement.name,
      kind: 'cover',
      position,
      footprint: placement.obstacleCells,
      durability: { kind: 'indestructible' },
      armorClass: armorClass(15),
      damageResponses: [],
      blocking: { movement: false, lineOfSight: false, cover: placement.tier },
      createdRevision: 0,
    };
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
    { column: 2, row: 5 },
  ];
  const fresh = createEncounter({
    bounds: { columns: 10, rows: 7 },
    combatants: [...players, ...monsters],
    tokens: [
      ...players.map((profile, index) => combatToken(profile, playerPositions[index] as GridCell)),
      ...monsters.map((profile, index) => combatToken(
        profile,
        room.monsters[index]?.position ?? { column: 8, row: index + 1 },
      )),
    ],
    blockedCells: room.blockedCells,
    worldObjects: coverWorldObjects(room),
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
    useWizardTactics: true,
    useClericContingency: true,
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
