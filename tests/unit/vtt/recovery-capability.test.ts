import { describe, expect, it } from 'vitest';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { combatToken } from '../../../src/combat/combatant';
import { projectEncounterTimeline, type TimelineBoundary } from '../../../src/vtt/session-timeline';
import {
  loadExternalPartyPack,
  type LoadedPartyMember,
} from '../../../src/vtt/party-pack';
import {
  recoveryCapabilityBeforeBoundary,
  RECOVERY_CAPABILITY_POLICY,
} from '../../../src/vtt/intel/recovery-capability';

function loadedParty(spells: readonly string[]): readonly LoadedPartyMember[] {
  const loaded = loadExternalPartyPack({
    schemaVersion: 2,
    partyId: 'party:recovery-capability',
    allowPartial: false,
    members: [
      {
        combatantId: 'combatant:recovery-healer',
        tokenId: 'token:recovery-healer',
        characterId: 1,
        classes: [{ classId: 'Cleric', level: 5 }],
        abilities: { strength: 10, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 16, charisma: 10 },
        armorClass: 16,
        hitPointMaximum: 35,
        sizeCategory: 'Medium',
        walkingSpeedFeet: 30,
        initiativeBonus: 10,
        savingThrowBonuses: { strength: 0, dexterity: 0, constitution: 2, intelligence: 0, wisdom: 5, charisma: 0 },
        attacksPerAction: 1,
        attacks: [{
          attackId: 'attack:recovery-healer', kind: 'melee', attackBonus: 5, criticalFloor: 20,
          reachFeet: 5, rangeFeet: 5,
          damage: [{ damageTypeId: 'Bludgeoning', count: 1, sides: 6, modifier: 2 }],
        }],
        startingConditions: [],
        spellcasting: [{
          ability: 'wisdom', spellSaveDc: 13, spellAttackBonus: 5,
          preparedSpellIds: spells,
          knownSpellIds: [],
        }],
        sharedSpellSlots: [
          { level: 1, count: 2, recharge: 'long_rest' },
          { level: 3, count: 1, recharge: 'long_rest' },
        ],
      },
      {
        combatantId: 'combatant:recovery-target',
        tokenId: 'token:recovery-target',
        characterId: 2,
        classes: [{ classId: 'Fighter', level: 5 }],
        abilities: { strength: 16, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 10, charisma: 10 },
        armorClass: 16,
        hitPointMaximum: 44,
        sizeCategory: 'Medium',
        walkingSpeedFeet: 30,
        initiativeBonus: 0,
        savingThrowBonuses: { strength: 5, dexterity: 0, constitution: 2, intelligence: 0, wisdom: 0, charisma: 0 },
        attacksPerAction: 2,
        attacks: [{
          attackId: 'attack:recovery-target', kind: 'melee', attackBonus: 5, criticalFloor: 20,
          reachFeet: 5, rangeFeet: 5,
          damage: [{ damageTypeId: 'Slashing', count: 1, sides: 8, modifier: 3 }],
        }],
        startingConditions: [],
      },
      {
        combatantId: 'combatant:recovery-observer',
        tokenId: 'token:recovery-observer',
        characterId: 3,
        classes: [{ classId: 'Rogue', level: 5 }],
        abilities: { strength: 10, dexterity: 16, constitution: 12, intelligence: 10, wisdom: 10, charisma: 10 },
        armorClass: 14,
        hitPointMaximum: 32,
        sizeCategory: 'Medium',
        walkingSpeedFeet: 30,
        initiativeBonus: -1,
        savingThrowBonuses: { strength: 0, dexterity: 5, constitution: 1, intelligence: 0, wisdom: 0, charisma: 0 },
        attacksPerAction: 1,
        attacks: [{
          attackId: 'attack:recovery-observer', kind: 'melee', attackBonus: 5, criticalFloor: 20,
          reachFeet: 5, rangeFeet: 5,
          damage: [{ damageTypeId: 'Piercing', count: 1, sides: 6, modifier: 3 }],
        }],
        startingConditions: [],
      },
    ],
  });
  expect(loaded.status).toBe('loaded');
  if (loaded.status !== 'loaded') throw new Error(`Party refused: ${loaded.refusal.reason}`);
  return loaded.party.members;
}

function encounter(
  members: readonly LoadedPartyMember[],
  targetColumn: number,
  life: 'dying' | 'dead' = 'dying',
): EncounterState {
  const healer = members[0];
  const target = members[1];
  if (healer === undefined || target === undefined) throw new Error('Fixture party is incomplete.');
  const started = reduceEncounter(createEncounter({
    bounds: { columns: 20, rows: 2 },
    combatants: [healer.profile, target.profile],
    tokens: [
      combatToken(healer.profile, { column: 0, row: 0 }),
      combatToken(target.profile, { column: targetColumn, row: 0 }),
    ],
  }), { type: 'roll_initiative' }, () => 0.5).state;
  return {
    ...started,
    combatants: started.combatants.map((combatant) =>
      combatant.profile.id !== target.profile.id
        ? combatant
        : {
            ...combatant,
            hitPoints: 0,
            life,
            deathSaves: life === 'dying' ? { successes: 0, failures: 1 } : null,
            deathAt: life === 'dead' ? { round: 1, initiativeIndex: 1 } : null,
          }),
  };
}

function targetStart(state: EncounterState, target: LoadedPartyMember): TimelineBoundary {
  return { round: 1, combatant: target.profile.id, boundary: 'start' };
}

describe('recovery-capability-v1', () => {
  it('proves an in-range loaded healer with a remaining slot before the dying target turn', () => {
    const members = loadedParty(['healing-word']);
    const target = members[1];
    if (target === undefined) throw new Error('Target fixture member is missing.');
    const state = encounter(members, 6);
    const result = recoveryCapabilityBeforeBoundary(
      state, projectEncounterTimeline(state, []), members, target.profile.id, targetStart(state, target),
    );

    expect(result).toMatchObject({ policy: RECOVERY_CAPABILITY_POLICY, status: 'resolved' });
    if (result.status !== 'resolved') throw new Error('Expected recovery capability to resolve.');
    expect(result.known_recovery_before_boundary.options).toEqual([{
      rescuer: members[0]?.profile.id,
      spellId: 'healing-word',
      kind: 'healing',
      slotLevel: 1,
      castingTime: 'bonus_action',
      turnRound: 1,
      reach: 'in_range',
      movementFeet: 0,
      knowledge: 'dm_omniscient_party_resources',
      source: 'encounter_state_and_loaded_party',
    }]);
  });

  it('qualifies Cure Wounds by available movement when it starts out of range', () => {
    const members = loadedParty(['cure-wounds']);
    const target = members[1];
    if (target === undefined) throw new Error('Target fixture member is missing.');
    const state = encounter(members, 7);
    const result = recoveryCapabilityBeforeBoundary(
      state, projectEncounterTimeline(state, []), members, target.profile.id, targetStart(state, target),
    );

    if (result.status !== 'resolved') throw new Error('Expected recovery capability to resolve.');
    expect(result.known_recovery_before_boundary.options).toHaveLength(1);
    expect(result.known_recovery_before_boundary.options[0]).toMatchObject({
      spellId: 'cure-wounds', reach: 'movement_qualified', movementFeet: 30, castingTime: 'action',
    });
  });

  it('does not treat healing as revival for a dead target', () => {
    const healingOnlyMembers = loadedParty(['healing-word']);
    const healingOnlyTarget = healingOnlyMembers[1];
    if (healingOnlyTarget === undefined) throw new Error('Target fixture member is missing.');
    const healingOnlyState = encounter(healingOnlyMembers, 1, 'dead');
    const healingOnly = recoveryCapabilityBeforeBoundary(
      healingOnlyState,
      projectEncounterTimeline(healingOnlyState, []),
      healingOnlyMembers,
      healingOnlyTarget.profile.id,
      targetStart(healingOnlyState, healingOnlyTarget),
    );
    if (healingOnly.status !== 'resolved') throw new Error('Expected recovery capability to resolve.');
    expect(healingOnly.known_recovery_before_boundary.options).toEqual([]);

    const revivalMembers = loadedParty(['healing-word', 'revivify']);
    const revivalTarget = revivalMembers[1];
    if (revivalTarget === undefined) throw new Error('Target fixture member is missing.');
    const revivalState = encounter(revivalMembers, 1, 'dead');
    const revival = recoveryCapabilityBeforeBoundary(
      revivalState, projectEncounterTimeline(revivalState, []), revivalMembers,
      revivalTarget.profile.id, targetStart(revivalState, revivalTarget),
    );
    if (revival.status !== 'resolved') throw new Error('Expected recovery capability to resolve.');
    expect(revival.known_recovery_before_boundary.options).toMatchObject([{
      spellId: 'revivify', kind: 'revival', slotLevel: 3,
    }]);
  });

  it('returns a typed unresolved result when the loaded party is unavailable', () => {
    const members = loadedParty(['healing-word']);
    const target = members[1];
    if (target === undefined) throw new Error('Target fixture member is missing.');
    const state = encounter(members, 1);

    expect(recoveryCapabilityBeforeBoundary(
      state, projectEncounterTimeline(state, []), null, target.profile.id, targetStart(state, target),
    )).toEqual({
      policy: RECOVERY_CAPABILITY_POLICY,
      status: 'unresolved',
      reason: 'party_data_unavailable',
    });
  });
});
