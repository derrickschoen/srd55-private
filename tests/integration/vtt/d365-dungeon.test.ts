import { afterEach, describe, expect, it } from 'vitest';
import { mulberry32 } from '../../../src/combat/random';
import { RpcClient, type RpcTransport } from '../../../src/rpc/client';
import type { RpcRequest, RpcResponse } from '../../../src/rpc/protocol';
import { feetPoint } from '../../../src/combat/templates';
import {
  codexSessionId,
  encounterBranchId,
  encounterSessionId,
  feet,
  type CombatantId,
} from '../../../src/combat/values';
import { rpcRegistry } from '../../../src/worker/registry';
import { AdventuringDaySession } from '../../../src/vtt/adventuring-day-session';
import {
  D365_SAMPLE_DUNGEON,
  composeD365Room,
  d365HomebrewDesignSignals,
  takeD365ScheduledShortRest,
  validateD365Dungeon,
  type D365DungeonManifest,
} from '../../../src/vtt/d365-sample-dungeon';
import {
  D365_SAMPLE_PARTY_BUILDS,
  loadD365SampleParty,
} from '../../../src/vtt/d365-sample-party';
import { loadedPartySpellCastCommand } from '../../../src/vtt/party-pack';
import type {
  PartyCharacterSessionState,
  PartySessionState,
} from '../../../src/vtt/party-session-state';
import {
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
} from '../../../src/vtt/session-persistence';
import type { HandlerContext } from '../../../src/worker/handler';
import {
  createSeededRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';

class RegistryTransport implements RpcTransport {
  readonly #messages = new Set<(event: MessageEvent<RpcResponse>) => void>();
  readonly #errors = new Set<(event: ErrorEvent) => void>();

  constructor(private readonly context: HandlerContext) {}

  postMessage(message: RpcRequest): void {
    void rpcRegistry.dispatch(message, this.context).then((response) => {
      const event = new MessageEvent<RpcResponse>('message', { data: response });
      for (const listener of this.#messages) listener(event);
    }).catch((error: unknown) => {
      const event = new ErrorEvent('error', {
        message: error instanceof Error ? error.message : String(error),
      });
      for (const listener of this.#errors) listener(event);
    });
  }

  addEventListener(
    type: 'message' | 'error',
    listener: ((event: MessageEvent<RpcResponse>) => void) | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') {
      this.#messages.add(listener as (event: MessageEvent<RpcResponse>) => void);
    } else {
      this.#errors.add(listener as (event: ErrorEvent) => void);
    }
  }

  removeEventListener(
    type: 'message' | 'error',
    listener: ((event: MessageEvent<RpcResponse>) => void) | ((event: ErrorEvent) => void),
  ): void {
    if (type === 'message') {
      this.#messages.delete(listener as (event: MessageEvent<RpcResponse>) => void);
    } else {
      this.#errors.delete(listener as (event: ErrorEvent) => void);
    }
  }
}

function partyCharacter(
  state: PartySessionState,
  characterId: number,
): PartyCharacterSessionState {
  const found = state.characters.find((character) => character.characterId === characterId);
  if (found === undefined) throw new Error(`Missing D365 character ${String(characterId)}.`);
  return found;
}

function advanceToActor(session: AdventuringDaySession, actor: CombatantId): void {
  if (session.encounter().initiative.length === 0) {
    session.apply({ type: 'roll_initiative' });
  }
  let guard = session.encounter().initiative.length + 1;
  while (session.encounter().activeCombatant !== actor && guard > 0) {
    const active = session.encounter().activeCombatant;
    if (active === null) throw new Error('D365 encounter lost its active combatant.');
    session.apply({ type: 'end_turn', actor: active });
    guard -= 1;
  }
  if (session.encounter().activeCombatant !== actor) {
    throw new Error(`D365 could not advance to ${actor}.`);
  }
}

describe('D365 bundled dungeon acceptance', () => {
  let harness: RpcHarness | null = null;
  let rpc: RpcClient | null = null;

  afterEach(() => {
    rpc?.close();
    harness?.close();
    rpc = null;
    harness = null;
  });

  it('authors the representative level-5 party through the production RPC surface', async () => {
    harness = await createSeededRpcHarness([]);
    rpc = new RpcClient(new RegistryTransport(harness.context));
    const sample = await loadD365SampleParty(rpc);

    expect(sample.builds).toEqual(D365_SAMPLE_PARTY_BUILDS);
    expect(sample.party.members).toHaveLength(4);
    expect(sample.party.members.map((member) => ({
      name: sample.displayNames.get(member.profile.characterId),
      class: member.source.classes[0]?.classId,
      level: member.source.classes[0]?.level,
      attacksPerAction: member.profile.rules.attacksPerAction,
      spells: member.spells.map((spell) => spell.name),
    }))).toEqual([
      { name: 'Mirel Ash', class: 'Warlock', level: 5, attacksPerAction: 1, spells: expect.arrayContaining(['Eldritch Blast', 'Burning Hands']) },
      { name: 'Orin Reed', class: 'Druid', level: 5, attacksPerAction: 1, spells: expect.arrayContaining(['Cure Wounds']) },
      { name: 'Brann Vale', class: 'Fighter', level: 5, attacksPerAction: 2, spells: [] },
      { name: 'Sera Dawn', class: 'Cleric', level: 5, attacksPerAction: 1, spells: expect.arrayContaining(['Cure Wounds']) },
    ]);
  }, 20_000);

  it('dungeon_monster_unregistered: validates all four rooms against the registry and names a missing monster field', () => {
    expect(D365_SAMPLE_DUNGEON.shortRestAfterRoom).toBe(2);
    expect(validateD365Dungeon(D365_SAMPLE_DUNGEON)).toEqual({
      status: 'loaded',
      manifest: D365_SAMPLE_DUNGEON,
    });
    const first = D365_SAMPLE_DUNGEON.rooms[0];
    const firstMonster = first.monsters[0];
    if (firstMonster === undefined) throw new Error('D365 room 1 has no monsters.');
    const mutated: D365DungeonManifest = {
      ...D365_SAMPLE_DUNGEON,
      rooms: [
        {
          ...first,
          monsters: [
            { ...firstMonster, statblockId: 'statblock:not-registered' },
            ...first.monsters.slice(1),
          ],
        },
        D365_SAMPLE_DUNGEON.rooms[1],
        D365_SAMPLE_DUNGEON.rooms[2],
        D365_SAMPLE_DUNGEON.rooms[3],
      ],
    };
    expect(validateD365Dungeon(mutated)).toEqual({
      status: 'refused',
      refusal: {
        reason: 'missing_monster_id',
        field: 'rooms.0.monsters.0.statblockId',
        detail: 'Dungeon monster statblock:not-registered is not a registered static statblock.',
      },
    });

    const signatures = d365HomebrewDesignSignals();
    expect(signatures.get('statblock:homebrew-beast/cave-bear')).toEqual(
      expect.arrayContaining(['bear_hug', 'ongoing_squeeze']),
    );
    expect(signatures.get('statblock:homebrew-beast/ambush-weaver')).toEqual(
      expect.arrayContaining(['web', 'venom']),
    );
  });

  it('rooms_reset_party: rest_misplaced: carries deterministic HP, slots, and Hit Dice across all four rooms with the rest after room 2', async () => {
    harness = await createSeededRpcHarness([]);
    rpc = new RpcClient(new RegistryTransport(harness.context));
    const sample = await loadD365SampleParty(rpc);
    const byRole = new Map(sample.builds.map((build, index) => [
      build.role,
      sample.party.members[index],
    ] as const));
    const warlock = byRole.get('pact_caster');
    const druid = byRole.get('land_druid');
    const fighter = byRole.get('martial');
    const cleric = byRole.get('prepared_caster');
    if (warlock === undefined || druid === undefined || fighter === undefined || cleric === undefined) {
      throw new Error('D365 representative party roles are incomplete.');
    }
    const session = AdventuringDaySession.create({
      sessionId: encounterSessionId('session:d365-four-room-acceptance'),
      branchId: encounterBranchId('branch:d365-main'),
      codexSessionId: codexSessionId('codex:d365-scripted-acceptance'),
      members: sample.party.members,
      displayNames: sample.displayNames,
      rng: mulberry32(365_2024),
      store: new MemoryBrowserSessionStore(),
      mirror: new MemoryMirrorSink(),
      composeRoom: composeD365Room,
    });
    const initial = session.party();
    const warlockInitial = partyCharacter(initial, sample.characterIds.pact_caster);
    const druidInitial = partyCharacter(initial, sample.characterIds.land_druid);
    const fighterInitial = partyCharacter(initial, sample.characterIds.martial);
    const clericInitial = partyCharacter(initial, sample.characterIds.prepared_caster);

    expect(session.encounter().dmNotes[0]).toContain('room 1: Briar Gate Pack');
    session.apply({
      type: 'adjudicate',
      target: warlock.profile.id,
      subject: 'd365:room-1-pack-damage',
      reasoning: 'Deterministic warmup damage.',
      consequence: { kind: 'hit_point_delta', amount: -6 },
    });
    advanceToActor(session, warlock.profile.id);
    session.apply(loadedPartySpellCastCommand(warlock, 'burning-hands', {
      slotLevel: 3,
      slotRecharge: 'short_rest',
      castAsRitual: false,
      targets: [],
      area: {
        shape: 'cone',
        template: {
          origin: feetPoint(10, 10),
          direction: { x: 1, y: 0 },
          length: feet(15),
          includeOrigin: false,
        },
      },
      weaponAttack: null,
      selectedOption: null,
    }));
    const afterRoomOne = session.captureRoom();
    const warlockAfterOne = partyCharacter(afterRoomOne, sample.characterIds.pact_caster);
    expect(warlockAfterOne.currentHitPoints).toBe(warlockInitial.hitPointMaximum - 6);
    expect(warlockAfterOne.spellSlots.find((slot) => slot.pool === 'pact_magic')).toEqual(
      expect.objectContaining({ remaining: 1, maximum: 2 }),
    );
    expect(() => takeD365ScheduledShortRest(session, 1, [])).toThrow(
      'scheduled after room 2',
    );

    session.enterNextRoom(composeD365Room);
    expect(session.party()).toEqual({ ...afterRoomOne, room: 2 });
    expect(session.encounter().dmNotes[0]).toContain('room 2: Webbed Bear Den');
    session.apply({
      type: 'adjudicate',
      target: fighter.profile.id,
      subject: 'd365:room-2-control-damage',
      reasoning: 'Deterministic control-room damage.',
      consequence: { kind: 'hit_point_delta', amount: -7 },
    });
    advanceToActor(session, warlock.profile.id);
    session.apply(loadedPartySpellCastCommand(warlock, 'burning-hands', {
      slotLevel: 3,
      slotRecharge: 'short_rest',
      castAsRitual: false,
      targets: [],
      area: {
        shape: 'cone',
        template: {
          origin: feetPoint(10, 10),
          direction: { x: 1, y: 0 },
          length: feet(15),
          includeOrigin: false,
        },
      },
      weaponAttack: null,
      selectedOption: null,
    }));
    advanceToActor(session, druid.profile.id);
    session.apply(loadedPartySpellCastCommand(druid, 'cure-wounds', {
      slotLevel: 1,
      castAsRitual: false,
      targets: [druid.profile.id],
      area: null,
      weaponAttack: null,
      selectedOption: null,
    }));
    advanceToActor(session, cleric.profile.id);
    session.apply(loadedPartySpellCastCommand(cleric, 'cure-wounds', {
      slotLevel: 1,
      castAsRitual: false,
      targets: [cleric.profile.id],
      area: null,
      weaponAttack: null,
      selectedOption: null,
    }));
    const afterRoomTwo = session.captureRoom();
    const warlockAfterTwo = partyCharacter(afterRoomTwo, sample.characterIds.pact_caster);
    const druidAfterTwo = partyCharacter(afterRoomTwo, sample.characterIds.land_druid);
    const fighterAfterTwo = partyCharacter(afterRoomTwo, sample.characterIds.martial);
    const clericAfterTwo = partyCharacter(afterRoomTwo, sample.characterIds.prepared_caster);
    expect(warlockAfterTwo.spellSlots.find((slot) => slot.pool === 'pact_magic')?.remaining).toBe(0);
    expect(druidAfterTwo.spellSlots.find((slot) => slot.pool === 'shared' && slot.level === 1)?.remaining)
      .toBe((druidInitial.spellSlots.find((slot) => slot.pool === 'shared' && slot.level === 1)?.maximum ?? 0) - 1);
    expect(clericAfterTwo.spellSlots.find((slot) => slot.pool === 'shared' && slot.level === 1)?.remaining)
      .toBe((clericInitial.spellSlots.find((slot) => slot.pool === 'shared' && slot.level === 1)?.maximum ?? 0) - 1);
    expect(fighterAfterTwo.currentHitPoints).toBe(fighterInitial.hitPointMaximum - 7);

    const rested = takeD365ScheduledShortRest(session, 2, [
      { combatantId: warlock.profile.id, dice: [{ sides: 8, count: 1 }] },
      { combatantId: fighter.profile.id, dice: [{ sides: 10, count: 1 }] },
    ]);
    const warlockRested = partyCharacter(rested.state, sample.characterIds.pact_caster);
    const fighterRested = partyCharacter(rested.state, sample.characterIds.martial);
    const druidRested = partyCharacter(rested.state, sample.characterIds.land_druid);
    const clericRested = partyCharacter(rested.state, sample.characterIds.prepared_caster);
    const warlockRoll = rested.rolls.find((roll) => roll.combatantId === warlock.profile.id);
    const fighterRoll = rested.rolls.find((roll) => roll.combatantId === fighter.profile.id);
    if (warlockRoll === undefined || fighterRoll === undefined) {
      throw new Error('D365 deterministic Short Rest rolls are missing.');
    }
    expect(warlockRested.currentHitPoints).toBe(
      Math.min(warlockInitial.hitPointMaximum, warlockAfterTwo.currentHitPoints + warlockRoll.healing),
    );
    expect(fighterRested.currentHitPoints).toBe(
      Math.min(fighterInitial.hitPointMaximum, fighterAfterTwo.currentHitPoints + fighterRoll.healing),
    );
    expect(warlockRested.spellSlots.find((slot) => slot.pool === 'pact_magic')?.remaining).toBe(2);
    expect(druidRested.spellSlots).toEqual(druidAfterTwo.spellSlots);
    expect(clericRested.spellSlots).toEqual(clericAfterTwo.spellSlots);
    expect(warlockRested.hitDice.find((pool) => pool.sides === 8)?.remaining).toBe(4);
    expect(fighterRested.hitDice.find((pool) => pool.sides === 10)?.remaining).toBe(4);

    session.enterNextRoom(composeD365Room);
    expect(session.party()).toEqual({ ...rested.state, room: 3 });
    expect(session.encounter().dmNotes[0]).toContain('room 3: Ridgewing Gallery');
    session.apply({
      type: 'adjudicate',
      target: druid.profile.id,
      subject: 'd365:room-3-ranged-damage',
      reasoning: 'Deterministic ranged-room damage.',
      consequence: { kind: 'hit_point_delta', amount: -4 },
    });
    const afterRoomThree = session.captureRoom();
    expect(partyCharacter(afterRoomThree, sample.characterIds.land_druid).currentHitPoints)
      .toBe(druidInitial.hitPointMaximum - 4);

    session.enterNextRoom(composeD365Room);
    expect(session.party()).toEqual({ ...afterRoomThree, room: 4 });
    expect(session.encounter().dmNotes[0]).toContain('room 4: Ironweb Crown');
    session.apply({
      type: 'adjudicate',
      target: cleric.profile.id,
      subject: 'd365:room-4-boss-damage',
      reasoning: 'Deterministic boss-room damage.',
      consequence: { kind: 'hit_point_delta', amount: -5 },
    });
    const afterRoomFour = session.captureRoom();
    expect(partyCharacter(afterRoomFour, sample.characterIds.prepared_caster).currentHitPoints)
      .toBe(clericInitial.hitPointMaximum - 5);
    expect(afterRoomFour.room).toBe(4);
    expect(() => session.enterNextRoom(composeD365Room)).toThrow(
      'four-room adventuring day is complete',
    );
  }, 20_000);
});
