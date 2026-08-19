import { describe, expect, it } from 'vitest';
import {
  characterCombatantProfile,
  combatToken,
} from '../../../src/combat/combatant';
import { monsterStatblock } from '../../../src/combat/statblock';
import { characterSheet } from './fixtures';

describe('combatant and statblock boundaries', () => {
  it('validates monster statblocks and defaults ordinary monsters away from death saves', () => {
    const statblock = monsterStatblock({
      id: 'statblock:wolf',
      name: 'Wolf',
      armorClass: 13,
      hitPointMaximum: 11,
      speedFeet: 40,
      initiativeBonus: 2,
      savingThrowBonuses: {
        strength: 1,
        dexterity: 2,
        constitution: 1,
        intelligence: -4,
        wisdom: 1,
        charisma: -2,
      },
    });

    expect(statblock).toMatchObject({
      id: 'statblock:wolf',
      armorClass: 13,
      hitPointMaximum: 11,
      speed: 40,
      attacksPerAction: 1,
      reach: 5,
      usesDeathSaves: false,
    });
    expect(() =>
      monsterStatblock({
        id: 'statblock:bad',
        name: 'Bad',
        armorClass: 0,
        hitPointMaximum: 1,
        speedFeet: 30,
        initiativeBonus: 0,
        savingThrowBonuses: {
          strength: 0,
          dexterity: 0,
          constitution: 0,
          intelligence: 0,
          wisdom: 0,
          charisma: 0,
        },
      }),
    ).toThrow('Armor Class must be positive');
  });

  it('projects known character-sheet facts into one combat rules profile and token identity', () => {
    const profile = characterCombatantProfile(
      characterSheet('Ada', {
        hitPoints: 27,
        initiativeBonus: 4,
        attacksPerAction: 2,
      }),
      { combatantId: 'combatant:ada', tokenId: 'token:ada' },
    );
    const token = combatToken(profile, { column: 2, row: 3 });

    expect(profile).toMatchObject({
      kind: 'player_character',
      id: 'combatant:ada',
      tokenId: 'token:ada',
      name: 'Ada',
      rules: {
        hitPointMaximum: 27,
        initiativeBonus: 4,
        attacksPerAction: 2,
        usesDeathSaves: true,
      },
    });
    expect(Object.keys(profile.rules.savingThrowBonuses)).toEqual([
      'strength',
      'dexterity',
      'constitution',
      'intelligence',
      'wisdom',
      'charisma',
    ]);
    expect(token).toEqual({
      id: 'token:ada',
      combatantId: 'combatant:ada',
      position: { column: 2, row: 3 },
    });
  });

  it('refuses a character sheet whose combat-critical values are unresolved', () => {
    const sheet = characterSheet('Unknown');
    expect(() =>
      characterCombatantProfile(
        {
          ...sheet,
          walking_speed: { kind: 'unknown', detail: 'No sourced speed.' },
        },
        { combatantId: 'combatant:unknown', tokenId: 'token:unknown' },
      ),
    ).toThrow('walking Speed must be known');
    expect(() =>
      characterCombatantProfile(
        {
          ...sheet,
          hit_point_maximum: { ...sheet.hit_point_maximum, value: null },
        },
        { combatantId: 'combatant:unknown', tokenId: 'token:unknown' },
      ),
    ).toThrow('Hit Point maximum must be known');
    expect(() =>
      characterCombatantProfile(
        {
          ...sheet,
          unchosen_damage_resistances: ['Unchosen draconic resistance'],
        },
        { combatantId: 'combatant:unknown', tokenId: 'token:unknown' },
      ),
    ).toThrow('damage resistance types must be known');
  });
});
