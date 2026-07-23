import { describe, expect, it } from 'vitest';
import { AbilityScore } from '../../../src/rules/ability-score';
import { AbilityScores } from '../../../src/rules/ability-scores';
import { AttackBonus } from '../../../src/rules/attack-bonus';
import {
  contributesToSharedSlots,
  maxPreparableLevel,
  sharedCasterLevels,
} from '../../../src/rules/progression-type';
import { SaveDC } from '../../../src/rules/save-dc';
import { SpellLevel } from '../../../src/rules/spell-level';

describe('rules value objects', () => {
  it.each([
    [1, -5],
    [2, -4],
    [9, -1],
    [10, 0],
    [11, 0],
    [18, 4],
    [30, 10],
  ])('maps ability score %i to modifier %i', (score, modifier) => {
    expect(new AbilityScore(score).modifier()).toBe(modifier);
  });

  it('bounds ability scores and spell levels', () => {
    expect(() => new AbilityScore(0)).toThrow(
      'Ability score must be between 1 and 30, got 0.',
    );
    expect(() => new AbilityScore(31)).toThrow();
    expect(() => new SpellLevel(-1)).toThrow(
      'Spell level must be between 0 and 9, got -1.',
    );
    expect(() => new SpellLevel(10)).toThrow();
    expect(new SpellLevel(0).isCantrip()).toBe(true);
    expect(new SpellLevel(9).value).toBe(9);
  });

  it('derives spell attack and save values', () => {
    const score = new AbilityScore(18);

    expect(score.spellAttackBonus(3)).toEqual(new AttackBonus(7));
    expect(score.spellSaveDC(3)).toEqual(new SaveDC(15));
    expect(() => score.spellAttackBonus(-1)).toThrow(
      'Proficiency bonus cannot be negative.',
    );
    expect(() => score.spellSaveDC(-1)).toThrow(
      'Proficiency bonus cannot be negative.',
    );
    expect(() => new SaveDC(0)).toThrow('Save DC must be positive, got 0.');
  });

  it('hydrates all six scores from integer and digit-string values', () => {
    const scores = AbilityScores.fromArray({
      strength: 8,
      dexterity: '10',
      constitution: 12,
      intelligence: '14',
      wisdom: 16,
      charisma: '18',
    });

    expect(scores.score('strength').value).toBe(8);
    expect(scores.score('dexterity').value).toBe(10);
    expect(scores.score('constitution').value).toBe(12);
    expect(scores.score('intelligence').value).toBe(14);
    expect(scores.score('wisdom').value).toBe(16);
    expect(scores.score('charisma').value).toBe(18);
  });

  it('rejects missing and non-digit score input at the named ability', () => {
    expect(() =>
      AbilityScores.fromArray({
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
      }),
    ).toThrow('Missing or invalid charisma ability score.');
    expect(() =>
      AbilityScores.fromArray({
        strength: 10,
        dexterity: '10.0',
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      }),
    ).toThrow('Missing or invalid dexterity ability score.');
  });

  it('puts shared contribution and preparation behavior on progression types', () => {
    expect(sharedCasterLevels('half_up', 1)).toBe(1);
    expect(sharedCasterLevels('half_down', 1)).toBe(0);
    expect(sharedCasterLevels('third_up', 4)).toBe(2);
    expect(sharedCasterLevels('third_down', 4)).toBe(1);
    expect(sharedCasterLevels('pact', 20)).toBe(0);
    expect(contributesToSharedSlots('pact')).toBe(false);
    expect(contributesToSharedSlots('none')).toBe(false);
    expect(contributesToSharedSlots('full')).toBe(true);
    expect(maxPreparableLevel('full', 5)).toBe(3);
  });
});
