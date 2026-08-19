import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { abilities, type Ability } from '../../../src/domain/enums';
import {
  monsterStatblock,
  type DecodedField,
  type MonsterAction,
  type MonsterSourceDetailsInput,
} from '../../../src/combat/statblock';
import { STARTER_MONSTER_KB } from '../../../src/combat/statblocks/kb/entries';
import { STARTER_MONSTER_ROSTER } from '../../../src/combat/statblocks/roster';

const EXPECTED_VALUES = {
  'statblock:goblin-warrior': {
    armorClass: 15, hitPoints: { average: 10, dice: '3d6+0' }, speeds: ['walk:30'], scores: [8, 15, 10, 10, 8, 8], modifiers: [-1, 2, 0, 0, -1, -1],
    attackBonuses: { scimitar: 4, shortbow: 4 }, damageDice: { scimitar: ['5:1d6+2:Slashing:always', '2:1d4+0:Slashing:attack_roll_advantage'], shortbow: ['5:1d6+2:Piercing:always', '2:1d4+0:Piercing:attack_roll_advantage'] }, saveDcs: [], traits: [],
  },
  'statblock:hobgoblin-warrior': {
    armorClass: 18, hitPoints: { average: 11, dice: '2d8+2' }, speeds: ['walk:30'], scores: [13, 12, 12, 10, 10, 9], modifiers: [1, 1, 1, 0, 0, -1],
    attackBonuses: { longsword: 3, longbow: 3 }, damageDice: { longsword: ['12:2d10+1:Slashing:always'], longbow: ['5:1d8+1:Piercing:always', '7:3d4+0:Poison:always'] }, saveDcs: [],
    traits: [{ kind: 'pack_tactics', allyDistanceFeet: 5, blockedByCondition: 'Incapacitated', appliesTo: 'attack_rolls' }],
  },
  'statblock:bandit-captain': {
    armorClass: 15, hitPoints: { average: 52, dice: '8d8+16' }, speeds: ['walk:30'], scores: [15, 16, 14, 14, 11, 14], modifiers: [2, 3, 2, 2, 0, 2],
    attackBonuses: { scimitar: 5, pistol: 5 }, damageDice: { scimitar: ['6:1d6+3:Slashing:always'], pistol: ['8:1d10+3:Piercing:always'] }, saveDcs: [], traits: [],
  },
  'statblock:ogre': {
    armorClass: 11, hitPoints: { average: 68, dice: '8d10+24' }, speeds: ['walk:40'], scores: [19, 8, 16, 5, 7, 7], modifiers: [4, -1, 3, -3, -2, -2],
    attackBonuses: { greatclub: 6, javelin: 6 }, damageDice: { greatclub: ['13:2d8+4:Bludgeoning:always'], javelin: ['11:2d6+4:Piercing:always'] }, saveDcs: [], traits: [],
  },
  'statblock:priest-acolyte': {
    armorClass: 13, hitPoints: { average: 11, dice: '2d8+2' }, speeds: ['walk:30'], scores: [14, 10, 12, 10, 14, 11], modifiers: [2, 0, 1, 0, 2, 0],
    attackBonuses: { mace: 4, 'radiant-flame': 4 }, damageDice: { mace: ['5:1d6+2:Bludgeoning:always'], 'radiant-flame': ['7:2d6+0:Radiant:always'] }, saveDcs: [], traits: [],
  },
  'statblock:priest': {
    armorClass: 13, hitPoints: { average: 38, dice: '7d8+7' }, speeds: ['walk:30'], scores: [16, 10, 12, 13, 16, 13], modifiers: [3, 0, 1, 1, 3, 1],
    attackBonuses: { mace: 5, 'radiant-flame': 5 }, damageDice: { mace: ['6:1d6+3:Bludgeoning:always', '5:2d4+0:Radiant:always'], 'radiant-flame': ['11:2d10+0:Radiant:always'] }, saveDcs: [13, 13], traits: [],
  },
  'statblock:skeleton': {
    armorClass: 14, hitPoints: { average: 13, dice: '2d8+4' }, speeds: ['walk:30'], scores: [10, 16, 15, 6, 8, 5], modifiers: [0, 3, 2, -2, -1, -3],
    attackBonuses: { shortsword: 5, shortbow: 5 }, damageDice: { shortsword: ['6:1d6+3:Piercing:always'], shortbow: ['6:1d6+3:Piercing:always'] }, saveDcs: [], traits: [],
  },
  'statblock:zombie': {
    armorClass: 8, hitPoints: { average: 15, dice: '2d8+6' }, speeds: ['walk:20'], scores: [13, 6, 16, 3, 6, 5], modifiers: [1, -2, 3, -4, -2, -3],
    attackBonuses: { slam: 3 }, damageDice: { slam: ['5:1d8+1:Bludgeoning:always'] }, saveDcs: [],
    traits: [{ kind: 'undead_fortitude', saveAbility: 'constitution', dcBase: 5, addDamageTaken: true, excludedDamageType: 'Radiant', excludedCriticalHits: true, successHitPoints: 1 }],
  },
  'statblock:wolf': {
    armorClass: 12, hitPoints: { average: 11, dice: '2d8+2' }, speeds: ['walk:40'], scores: [14, 15, 12, 3, 12, 6], modifiers: [2, 2, 1, -4, 1, -2],
    attackBonuses: { bite: 4 }, damageDice: { bite: ['5:1d6+2:Piercing:always'] }, saveDcs: [],
    traits: [{ kind: 'pack_tactics', allyDistanceFeet: 5, blockedByCondition: 'Incapacitated', appliesTo: 'attack_rolls' }],
  },
} as const;

function required<T>(field: DecodedField<T>, label: string): T {
  if (field.kind === 'absent') throw new Error(`${label} unexpectedly absent: ${field.note}`);
  return field.value;
}

function pinnedValues(row: (typeof STARTER_MONSTER_ROSTER)[number]) {
  const details = row.statblock.sourceDetails;
  const abilitiesByName = required(details.abilities, `${row.name} abilities`);
  const actions = required(details.actions, `${row.name} actions`);
  const attacks = actions.filter((action) => action.kind === 'attack');
  const bonusActions = details.bonusActions.kind === 'present' ? details.bonusActions.value : [];
  const allActions: readonly MonsterAction[] = [...actions, ...bonusActions.filter((action) => action.kind === 'spellcasting')];
  return {
    armorClass: row.statblock.armorClass,
    hitPoints: { average: row.statblock.hitPointMaximum, dice: diceText(required(details.hitPointDice, `${row.name} HP dice`)) },
    speeds: required(details.movement, `${row.name} movement`).map(({ kind, feet }) => `${kind}:${feet}`),
    scores: abilities.map((ability) => abilitiesByName[ability].score),
    modifiers: abilities.map((ability) => abilitiesByName[ability].modifier),
    attackBonuses: Object.fromEntries(attacks.map(({ id, attackBonus }) => [id, attackBonus])),
    damageDice: Object.fromEntries(attacks.map(({ id, damage }) => [id, damage.map((term) => `${term.average}:${diceText(term.dice)}:${term.type}:${term.trigger}`)])),
    saveDcs: allActions.flatMap((action) => action.kind === 'spellcasting' && action.saveDc.kind === 'present' ? [action.saveDc.value] : []),
    traits: details.traits.kind === 'present' ? details.traits.value : [],
  };
}

function diceText(dice: { readonly count: number; readonly sides: number; readonly modifier: number }): string {
  return `${dice.count}d${dice.sides}+${dice.modifier}`;
}

describe('bundled SRD starter monster statblocks', () => {
  for (const row of STARTER_MONSTER_ROSTER) {
    it(`pins ${row.name} source values independently`, () => {
      expect(pinnedValues(row)).toEqual(EXPECTED_VALUES[row.id]);
    });
  }

  it('decodes every roster entry through monsterStatblock validation', () => {
    for (const row of STARTER_MONSTER_ROSTER) {
      const details = row.statblock.sourceDetails;
      const sourceDetails: MonsterSourceDetailsInput = {
        source: required(details.source, `${row.name} source`),
        classification: required(details.classification, `${row.name} classification`),
        challenge: required(details.challenge, `${row.name} challenge`),
        hitPointDice: required(details.hitPointDice, `${row.name} HP dice`),
        movement: required(details.movement, `${row.name} movement`),
        abilities: required(details.abilities, `${row.name} abilities`),
        skills: details.skills, gear: details.gear, senses: details.senses,
        passivePerception: required(details.passivePerception, `${row.name} passive Perception`),
        languages: details.languages, damageResponses: details.damageResponses,
        conditionImmunities: details.conditionImmunities, traits: details.traits,
        actions: required(details.actions, `${row.name} actions`), bonusActions: details.bonusActions, reactions: details.reactions,
      };
      expect(() => monsterStatblock({
        id: row.id, name: row.name, armorClass: row.statblock.armorClass, hitPointMaximum: row.statblock.hitPointMaximum,
        speedFeet: row.statblock.speed, initiativeBonus: row.statblock.initiativeBonus,
        savingThrowBonuses: row.statblock.savingThrowBonuses, attacksPerAction: row.statblock.attacksPerAction,
        reachFeet: row.statblock.reach, damageResponses: row.statblock.damageResponses,
        conditionImmunities: row.statblock.conditionImmunities, usesDeathSaves: row.statblock.usesDeathSaves, sourceDetails,
      })).not.toThrow();
    }
  });

  it('keeps roster metadata equal to each validated statblock and cites bundled SRD lines', () => {
    for (const row of STARTER_MONSTER_ROSTER) {
      const details = row.statblock.sourceDetails;
      expect({ id: row.statblock.id, name: row.statblock.name, challengeRating: required(details.challenge, 'challenge').rating, source: required(details.source, 'source'), usesDeathSaves: row.statblock.usesDeathSaves }).toEqual({
        id: row.id, name: row.name, challengeRating: row.challengeRating, source: row.source, usesDeathSaves: false,
      });
    }
  });

  it('locates every roster name and Challenge Rating inside its cited bundled SRD spans', () => {
    const sourceLines = readFileSync('docs/srd/full/srd-5.2.1.txt', 'utf8').split('\n');
    for (const row of STARTER_MONSTER_ROSTER) {
      const citedText = row.source.map(({ lineStart, lineEnd }) => sourceLines.slice(lineStart - 1, lineEnd).join(' ')).join(' ');
      expect(citedText).toContain(row.name);
      expect(citedText).toContain(`CR ${row.challengeRating}`);
    }
  });

  it('has exactly one KB entry for every roster row', () => {
    expect(STARTER_MONSTER_KB).toHaveLength(STARTER_MONSTER_ROSTER.length);
    expect(STARTER_MONSTER_KB.map(({ monsterId }) => monsterId).sort()).toEqual(STARTER_MONSTER_ROSTER.map(({ id }) => id).sort());
    for (const entry of STARTER_MONSTER_KB) {
      expect(entry.rulingGuidance).not.toContain('\n');
      expect(entry.srdLocator).toMatch(/^docs\/srd\/full\/srd-5\.2\.1\.txt:\d+-\d+$/);
    }
  });
});
