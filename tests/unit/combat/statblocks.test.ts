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
import { STARTER_MONSTER_ROSTER, type StarterMonsterFamily } from '../../../src/combat/statblocks/roster';
import { EXPECTED_STATBLOCK_VALUES } from './statblock-expectations';

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
  const allActions: readonly MonsterAction[] = [...actions, ...bonusActions.filter((action) => action.kind === 'spellcasting' || action.kind === 'saving_throw')];
  return {
    armorClass: row.statblock.armorClass,
    hitPoints: { average: row.statblock.hitPointMaximum, dice: diceText(required(details.hitPointDice, `${row.name} HP dice`)) },
    speeds: required(details.movement, `${row.name} movement`).map(({ kind, feet }) => `${kind}:${feet}`),
    scores: abilities.map((ability) => abilitiesByName[ability].score),
    modifiers: abilities.map((ability) => abilitiesByName[ability].modifier),
    attackBonuses: Object.fromEntries(attacks.map(({ id, attackBonus }) => [id, attackBonus])),
    damageDice: Object.fromEntries(attacks.map(({ id, damage }) => [id, damage.map((term) => `${term.average}:${diceText(term.dice)}:${term.type}:${triggerText(term.trigger)}`)])),
    saveDcs: allActions.flatMap((action) => action.kind === 'saving_throw' ? [action.savingThrow.dc] : action.kind === 'spellcasting' && action.saveDc.kind === 'present' ? [action.saveDc.value] : []),
    traits: details.traits.kind === 'present' ? details.traits.value : [],
  };
}

function diceText(dice: { readonly count: number; readonly sides: number; readonly modifier: number }): string {
  return `${dice.count}d${dice.sides}+${dice.modifier}`;
}

function triggerText(trigger: import('../../../src/combat/statblock').MonsterDamageTrigger): string {
  switch (trigger.kind) {
    case 'always': return 'always';
    case 'attack_roll_advantage': return 'attack_roll_advantage';
    case 'charge': return `charge:${trigger.minimumStraightFeet}:${trigger.maximumTargetSize}`;
  }
}

describe('bundled SRD starter monster statblocks', () => {
  for (const row of STARTER_MONSTER_ROSTER) {
    it(`pins ${row.name} source values independently`, () => {
      expect(pinnedValues(row)).toEqual(EXPECTED_STATBLOCK_VALUES[row.id]);
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

  it('ships four complete family ladders from low tier through CR 3', () => {
    const expected: Readonly<Record<StarterMonsterFamily, { readonly count: number; readonly includesQuarter: true; readonly includesThree: true }>> = {
      goblinoid_warband: { count: 8, includesQuarter: true, includesThree: true },
      undead_crypt: { count: 9, includesQuarter: true, includesThree: true },
      mercenary_company: { count: 10, includesQuarter: true, includesThree: true },
      wild_beasts: { count: 10, includesQuarter: true, includesThree: true },
    };
    for (const [family, familyExpected] of Object.entries(expected)) {
      const rows = STARTER_MONSTER_ROSTER.filter((row) => row.family === family);
      expect({ count: rows.length, includesQuarter: rows.some((row) => row.challengeRating === '1/4'), includesThree: rows.some((row) => row.challengeRating === 3) }).toEqual(familyExpected);
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
    expect(new Set(STARTER_MONSTER_KB.map(({ ruleId }) => ruleId)).size).toBe(STARTER_MONSTER_KB.length);
    expect(new Set(STARTER_MONSTER_ROSTER.map(({ id }) => id)).size).toBe(STARTER_MONSTER_ROSTER.length);
    expect(STARTER_MONSTER_KB.map(({ monsterId }) => monsterId).sort()).toEqual(STARTER_MONSTER_ROSTER.map(({ id }) => id).sort());
    for (const entry of STARTER_MONSTER_KB) {
      expect(entry.rulingGuidance).not.toContain('\n');
      expect(entry.srdLocator).toMatch(/^docs\/srd\/full\/srd-5\.2\.1\.txt:\d+-\d+$/);
    }
  });
});
