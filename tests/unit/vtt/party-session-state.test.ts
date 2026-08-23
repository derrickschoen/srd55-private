import { describe, expect, it } from 'vitest';
import { reduceEncounter } from '../../../src/combat/encounter';
import {
  codexSessionId,
  combatantId,
  effectStackingIdentity,
  encounterEffectId,
  encounterBranchId,
  encounterSessionId,
  itemId,
  limitedResourcePoolId,
} from '../../../src/combat/values';
import { mulberry32 } from '../../../src/combat/random';
import { AdventuringDaySession } from '../../../src/vtt/adventuring-day-session';
import {
  loadedPartySpellCastCommand,
  loadExternalPartyPack,
  type ExternalPartyPackV2,
  type LoadedPartyMember,
} from '../../../src/vtt/party-pack';
import {
  capturePartySessionState,
  createPartySessionState,
  decodePartySessionState,
  enterNextRoom,
  preloadPartySessionState,
  projectPlayerPartySession,
  takeShortRest,
  type PartySessionState,
} from '../../../src/vtt/party-session-state';
import { composeStoredCharacterEncounter } from '../../../src/vtt/stored-character-encounter';
import {
  EncounterSessionJournal,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
  exportSavedSession,
  importSavedSession,
} from '../../../src/vtt/session-persistence';

function member(
  index: number,
  classId: 'Wizard' | 'Warlock' | 'Fighter',
  constitution: number,
): ExternalPartyPackV2['members'][number] {
  const caster = classId === 'Wizard' || classId === 'Warlock';
  return {
    combatantId: `combatant:advday-${String(index)}`,
    tokenId: `token:advday-${String(index)}`,
    characterId: index,
    classes: [{ classId, level: 2 }],
    hitDice: [{ sides: classId === 'Wizard' ? 6 : classId === 'Warlock' ? 8 : 10, maximum: 2 }],
    abilities: {
      strength: 10,
      dexterity: 10,
      constitution,
      intelligence: classId === 'Wizard' ? 16 : 10,
      wisdom: 10,
      charisma: classId === 'Warlock' ? 16 : 10,
    },
    armorClass: 12,
    hitPointMaximum: 20,
    sizeCategory: 'Medium',
    walkingSpeedFeet: 30,
    initiativeBonus: classId === 'Wizard' ? 20 : 0,
    savingThrowBonuses: {
      strength: 0, dexterity: 0, constitution: 0,
      intelligence: 0, wisdom: 0, charisma: 0,
    },
    attacksPerAction: 1,
    attacks: [{
      attackId: `attack:advday-${String(index)}`,
      kind: 'melee',
      attackBonus: 4,
      criticalFloor: 20,
      reachFeet: 5,
      rangeFeet: 5,
      damage: [{ damageTypeId: 'Bludgeoning', count: 1, sides: 6, modifier: 2 }],
    }],
    startingConditions: [],
    ...(caster
      ? {
          spellcasting: [{
            ability: classId === 'Wizard' ? 'intelligence' as const : 'charisma' as const,
            spellSaveDc: 13,
            spellAttackBonus: 5,
            preparedSpellIds: ['magic-missile'],
            knownSpellIds: [],
          }],
          sharedSpellSlots: classId === 'Wizard'
            ? [{ level: 1 as const, count: 3, recharge: 'long_rest' as const }]
            : [],
          ...(classId === 'Warlock'
            ? { pactSpellSlots: [{ level: 1 as const, count: 2, recharge: 'short_rest' as const }] }
            : {}),
        }
      : {}),
  };
}

function loadedParty(): readonly LoadedPartyMember[] {
  const loaded = loadExternalPartyPack({
    schemaVersion: 2,
    partyId: 'party:adventuring-day-tests',
    allowPartial: false,
    members: [member(1, 'Wizard', 14), member(2, 'Warlock', 8), member(3, 'Fighter', 10)],
  });
  expect(loaded.status).toBe('loaded');
  if (loaded.status !== 'loaded') throw new Error(`Party refused: ${loaded.refusal.reason}.`);
  return loaded.party.members;
}

function character(state: PartySessionState, id: string) {
  const found = state.characters.find((candidate) => candidate.combatantId === id);
  if (found === undefined) throw new Error(`Missing party character ${id}.`);
  return found;
}

describe('adventuring-day party session state', () => {
  it('resources_reset_between_rooms: captures damage and an actual spell spend, then preloads both into room 2', () => {
    const members = loadedParty();
    const wizard = members[0]!;
    const roomOne = composeStoredCharacterEncounter(members);
    if (roomOne.partyState === null) throw new Error('Sourced party did not create session state.');
    let encounter = reduceEncounter(roomOne.state, { type: 'roll_initiative' }, () => 0.5).state;
    expect(encounter.activeCombatant).toBe(wizard.profile.id);
    const monster = encounter.combatants.find((subject) => subject.profile.kind === 'monster');
    if (monster === undefined) throw new Error('Room monster is missing.');
    encounter = reduceEncounter(encounter, loadedPartySpellCastCommand(
      wizard,
      'magic-missile',
      {
        slotLevel: 1,
        castAsRitual: false,
        targets: [monster.profile.id, monster.profile.id, monster.profile.id],
        area: null,
        weaponAttack: null,
        selectedOption: null,
      },
    ), () => 0).state;
    encounter = reduceEncounter(encounter, {
      type: 'adjudicate',
      target: wizard.profile.id,
      subject: 'test:room-one-damage',
      reasoning: 'Room one trap damage.',
      consequence: { kind: 'hit_point_delta', amount: -7 },
    }, () => 0.5).state;

    const captured = capturePartySessionState(roomOne.partyState, encounter);
    const roomTwoParty = enterNextRoom(captured);
    const roomTwo = composeStoredCharacterEncounter(members, new Map(), roomTwoParty);
    const spawnedWizard = roomTwo.state.combatants.find(
      (subject) => subject.profile.id === wizard.profile.id,
    );
    expect(spawnedWizard?.hitPoints).toBe(13);
    expect(spawnedWizard?.spellSlots).toContainEqual({ level: 1, maximum: 3, remaining: 2 });
    expect(roomTwo.rulesEdition).toBe('2024');
    expect(roomTwo.partyState?.room).toBe(2);
  });

  it('short_rest_restores_long_slots and hit_die_ignores_con: distinguishes Wizard/Warlock recovery and hits both die boundaries', () => {
    const initial = createPartySessionState(loadedParty());
    const depleted: PartySessionState = {
      ...initial,
      characters: initial.characters.map((entry) => ({
        ...entry,
        currentHitPoints: 5,
        spellSlots: entry.spellSlots.map((slot) => ({ ...slot, remaining: 0 })),
        limitedResources: entry.combatantId === combatantId('combatant:advday-1')
          ? [
              { id: limitedResourcePoolId('resource:short-feature'), maximum: 2, remaining: 0, recharge: 'short_rest' },
              { id: limitedResourcePoolId('resource:long-feature'), maximum: 2, remaining: 0, recharge: 'long_rest' },
            ]
          : entry.limitedResources,
        hitDice: entry.combatantId === combatantId('combatant:advday-3')
          ? entry.hitDice.map((pool) => ({ ...pool, remaining: 0 }))
          : entry.hitDice,
      })),
    };
    const rested = takeShortRest(depleted, [
      { combatantId: combatantId('combatant:advday-1'), dice: [{ sides: 6, count: 2 }] },
      { combatantId: combatantId('combatant:advday-2'), dice: [{ sides: 8, count: 2 }] },
      { combatantId: combatantId('combatant:advday-3'), dice: [{ sides: 10, count: 0 }] },
    ], () => 0.5);

    const wizard = character(rested.state, 'combatant:advday-1');
    const warlock = character(rested.state, 'combatant:advday-2');
    const fighter = character(rested.state, 'combatant:advday-3');
    expect(wizard.currentHitPoints).toBe(17); // two (d6 face 4 + Con 2)
    expect(warlock.currentHitPoints).toBe(13); // two (d8 face 5 + Con -1)
    expect(wizard.spellSlots).toEqual([expect.objectContaining({ pool: 'shared', remaining: 0 })]);
    expect(warlock.spellSlots).toEqual([expect.objectContaining({
      pool: 'pact_magic', remaining: 2, maximum: 2,
    })]);
    expect(wizard.limitedResources).toEqual([
      expect.objectContaining({ id: 'resource:short-feature', remaining: 2 }),
      expect.objectContaining({ id: 'resource:long-feature', remaining: 0 }),
    ]);
    expect(wizard.hitDice[0]?.remaining).toBe(0);
    expect(warlock.hitDice[0]?.remaining).toBe(0);
    expect(fighter.hitDice[0]?.remaining).toBe(0);
    expect(rested.rolls.map((roll) => roll.healing)).toEqual([6, 6, 4, 4]);
  });

  it('hit_die_minimum_dropped: a natural 1 with a negative Constitution modifier heals exactly 1 HP', () => {
    const initial = createPartySessionState(loadedParty());
    const damaged: PartySessionState = {
      ...initial,
      characters: initial.characters.map((entry) => entry.combatantId === combatantId('combatant:advday-2')
        ? { ...entry, currentHitPoints: 5 }
        : entry),
    };
    const before = character(damaged, 'combatant:advday-2').currentHitPoints;
    const rested = takeShortRest(damaged, [{
      combatantId: combatantId('combatant:advday-2'),
      dice: [{ sides: 8, count: 1 }],
    }], () => 0);
    const after = character(rested.state, 'combatant:advday-2').currentHitPoints;

    expect(rested.rolls).toEqual([{
      combatantId: combatantId('combatant:advday-2'),
      sides: 8,
      face: 1,
      constitutionModifier: -1,
      healing: 1,
    }]);
    expect(after).toBe(before + 1);
    expect(after).toBeGreaterThan(before);
  });

  it('dead_walks: stabilized-at-zero and dead states both survive the next-room preload without resurrection', () => {
    const members = loadedParty();
    const initial = createPartySessionState(members);
    const statusParty: PartySessionState = {
      ...enterNextRoom(initial),
      characters: initial.characters.map((entry, index) => index === 0
        ? { ...entry, currentHitPoints: 0, life: 'stable', deathSaves: null }
        : index === 1
          ? { ...entry, currentHitPoints: 0, life: 'dead', deathSaves: null }
          : { ...entry, currentHitPoints: 0, life: 'dying', deathSaves: { successes: 0, failures: 0 } }),
    };
    const afterRest = takeShortRest(statusParty, [
      { combatantId: combatantId('combatant:advday-1'), dice: [{ sides: 6, count: 0 }] },
      { combatantId: combatantId('combatant:advday-2'), dice: [{ sides: 8, count: 0 }] },
    ], () => 0.5).state;
    const room = composeStoredCharacterEncounter(members, new Map(), afterRest);
    expect(room.state.combatants.find((entry) => entry.profile.id === combatantId('combatant:advday-1')))
      .toMatchObject({ hitPoints: 0, life: 'stable', deathSaves: null });
    expect(room.state.combatants.find((entry) => entry.profile.id === combatantId('combatant:advday-2')))
      .toMatchObject({ hitPoints: 0, life: 'dead', deathSaves: null });
    expect(room.state.combatants.find((entry) => entry.profile.id === combatantId('combatant:advday-3')))
      .toMatchObject({ hitPoints: 0, life: 'dying', deathSaves: { successes: 0, failures: 0 } });
  });

  it('party_state_leaks: another PC spent-slot detail is absent from a non-owning PlayerView', () => {
    const initial = createPartySessionState(loadedParty());
    const state: PartySessionState = {
      ...initial,
      characters: initial.characters.map((entry) => ({
        ...entry,
        spellSlots: entry.spellSlots.map((slot) => ({ ...slot, remaining: 0 })),
      })),
    };
    const wizardView = projectPlayerPartySession(state, [combatantId('combatant:advday-1')]);
    expect(wizardView.ownedCharacters).toHaveLength(1);
    expect(wizardView.ownedCharacters[0]?.combatantId).toBe(combatantId('combatant:advday-1'));
    expect(wizardView.ownedCharacters[0]?.hitDice).toEqual([
      { sides: 6, maximum: 2, remaining: 2 },
    ]);
    expect(JSON.stringify(wizardView)).not.toContain('pact_magic');
    expect(wizardView.characters.find(
      (entry) => entry.combatantId === combatantId('combatant:advday-2'),
    )).toEqual({ combatantId: combatantId('combatant:advday-2'), life: 'living' });
  });

  it('closed decode rejects an unknown party-state field instead of accepting future state partially', () => {
    const state = structuredClone(createPartySessionState(loadedParty())) as PartySessionState & {
      futureResource?: number;
    };
    state.futureResource = 1;
    expect(() => decodePartySessionState(state)).toThrow('Party session state is malformed.');
  });

  it('preload rejects a room that omits a party member', () => {
    const members = loadedParty();
    const state = createPartySessionState(members);
    const encounter = composeStoredCharacterEncounter(members).state;
    expect(() => preloadPartySessionState({
      ...encounter,
      combatants: encounter.combatants.filter(
        (entry) => entry.profile.id !== combatantId('combatant:advday-3'),
      ),
    }, state)).toThrow('complete party');
  });

  it('carries changed equipment and an exhausted consumable into the next room', () => {
    const members = loadedParty();
    const roomOne = composeStoredCharacterEncounter(members);
    if (roomOne.partyState === null) throw new Error('Sourced party did not create session state.');
    const wizardId = combatantId('combatant:advday-1');
    const captured = capturePartySessionState(roomOne.partyState, {
      ...roomOne.state,
      equipment: [{
        combatant: wizardId,
        hands: { kind: 'one_handed', items: [itemId('item:carried-wand')] },
        worn: [],
        carried: [],
      }],
      effects: [{
        id: encounterEffectId('effect:captured-goodberries'),
        source: wizardId,
        targets: [wizardId],
        createdRevision: roomOne.state.revision,
        duration: { kind: 'permanent' },
        concentrationOwner: null,
        stackingIdentity: effectStackingIdentity('spell:goodberry'),
        stacking: 'coexist',
        repeatedSave: null,
        damageBreak: null,
        payload: {
          kind: 'consumable_healing_pool',
          remainingUses: 0,
          healingPerUse: 1,
          activation: 'bonus_action',
          encounterExpiry: 'not_tracked_24_hours',
        },
      }],
    });
    const roomTwo = composeStoredCharacterEncounter(members, new Map(), enterNextRoom(captured));

    expect(roomTwo.state.equipment?.find((entry) => entry.combatant === wizardId))
      .toEqual(character(captured, wizardId).equipment);
    expect(roomTwo.state.effects).toContainEqual(expect.objectContaining({
      source: wizardId,
      payload: expect.objectContaining({ kind: 'consumable_healing_pool', remainingUses: 0 }),
    }));
    expect(roomTwo.state.nextEffectSequence).toBe(2);
  });

  it('session crash probe round-trips party state and advances the same depleted party through all four rooms', () => {
    const sessionId = encounterSessionId('session:adventuring-day-crash-probe');
    const store = new MemoryBrowserSessionStore();
    const session = AdventuringDaySession.create({
      sessionId,
      branchId: encounterBranchId('branch:adventuring-day-main'),
      codexSessionId: codexSessionId('codex:adventuring-day-test'),
      members: loadedParty(),
      rng: mulberry32(3611),
      store,
      mirror: new MemoryMirrorSink(),
    });
    session.apply({
      type: 'adjudicate',
      target: combatantId('combatant:advday-1'),
      subject: 'test:crash-probe-damage',
      reasoning: 'Damage before persistence crash probe.',
      consequence: { kind: 'hit_point_delta', amount: -8 },
    });
    session.captureRoom();
    session.shortRest([{
      combatantId: combatantId('combatant:advday-1'),
      dice: [{ sides: 6, count: 1 }],
    }]);
    session.enterNextRoom();
    session.captureRoom();
    session.enterNextRoom();
    session.captureRoom();
    session.enterNextRoom();
    expect(session.party().room).toBe(4);
    const expectedParty = session.party();
    expect(character(expectedParty, 'combatant:advday-1').currentHitPoints).toBeGreaterThan(12);
    expect(() => session.enterNextRoom()).toThrow('four-room adventuring day is complete');

    const exported = exportSavedSession(store, sessionId);
    const reloaded = new MemoryBrowserSessionStore();
    importSavedSession(reloaded, exported);
    const resumed = EncounterSessionJournal.resume(sessionId, reloaded, new MemoryMirrorSink());
    expect(resumed.partyState).toEqual(expectedParty);
    expect(resumed.partyState?.rulesEdition).toBe('2024');
    expect(resumed.encounterState.combatants.find(
      (entry) => entry.profile.id === combatantId('combatant:advday-1'),
    )?.hitPoints).toBe(character(expectedParty, 'combatant:advday-1').currentHitPoints);
  });
});
