import { describe, expect, it } from 'vitest';
import subclassExtract from '../../../docs/srd/source/subclasses.txt?raw';
import { parseSrdSubclassSections } from '../../../src/rules/subclasses-srd';

const REQUIRED_NOTICE = `This work includes material from the System Reference Document 5.2
("SRD 5.2") by Wizards of the Coast LLC, available at
https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative
Commons Attribution 4.0 International License, available at
https://creativecommons.org/licenses/by/4.0/legalcode.`;

// Hand-enumerated from the twelve subclass sections on printed pages 30, 35,
// 40, 46, 49, 52, 56-57, 61, 64, 69-70, 76 and 82 of SRD 5.2.1. These
// literals are the oracle; they are not generated from the extract or parser.
const EXPECTED_SUBCLASSES = [
  { className: 'Barbarian', subclassName: 'Path of the Berserker' },
  { className: 'Bard', subclassName: 'College of Lore' },
  { className: 'Cleric', subclassName: 'Life Domain' },
  { className: 'Druid', subclassName: 'Circle of the Land' },
  { className: 'Fighter', subclassName: 'Champion' },
  { className: 'Monk', subclassName: 'Warrior of the Open Hand' },
  { className: 'Paladin', subclassName: 'Oath of Devotion' },
  { className: 'Ranger', subclassName: 'Hunter' },
  { className: 'Rogue', subclassName: 'Thief' },
  { className: 'Sorcerer', subclassName: 'Draconic Sorcery' },
  { className: 'Warlock', subclassName: 'Fiend Patron' },
  { className: 'Wizard', subclassName: 'Evoker' },
] as const;

describe('SRD subclasses extract', () => {
  it('the subclass extract carries exactly the twelve SRD subclass sections', () => {
    expect(parseSrdSubclassSections(subclassExtract)).toEqual(
      EXPECTED_SUBCLASSES,
    );

    const removeChampion = subclassExtract.replace(
      /\f     Fighter Subclass: Champion[\s\S]*?(?= Monk Subclass:)/u,
      '',
    );
    expect(() => parseSrdSubclassSections(removeChampion)).toThrow();

    const duplicateThief = subclassExtract.replace(
      'Fighter Subclass: Champion',
      'Rogue Subclass: Thief',
    );
    expect(() => parseSrdSubclassSections(duplicateThief)).toThrow();

    const truncateWrappedHeading = subclassExtract.replace(
      '   Path of the Berserker\n',
      '',
    );
    expect(() => parseSrdSubclassSections(truncateWrappedHeading)).toThrow();
  });

  it('the subclass extract carries headings and spell tables only', () => {
    expect(() => parseSrdSubclassSections(subclassExtract)).not.toThrow();

    const injectFeatureParagraph = subclassExtract.replace(
      '   Level 3: Frenzy\n',
      '   Level 3: Frenzy\n   Reckless Attack deals extra damage.\n',
    );
    expect(() => parseSrdSubclassSections(injectFeatureParagraph)).toThrow();

    const reinstateColumnBleed = subclassExtract.replace(
      ' Monk Subclass: Warrior of the\n',
      ' Patient Defense. When you expend a Focus Point Monk Subclass: Warrior of the\n',
    );
    expect(() => parseSrdSubclassSections(reinstateColumnBleed)).toThrow();

    const malformedFeatureHeading = subclassExtract.replace(
      '   Level 3: Frenzy',
      '   Level Three: Frenzy',
    );
    expect(() => parseSrdSubclassSections(malformedFeatureHeading)).toThrow();

    const malformedSubclassHeading = subclassExtract.replace(
      'Barbarian Subclass:',
      'Barbarian Subclass Path of the Berserker:',
    );
    expect(() => parseSrdSubclassSections(malformedSubclassHeading)).toThrow();
  });

  it('the subclass extract rejects a feature level outside 1-20', () => {
    const levelZero = subclassExtract.replace('Level 3: Frenzy', 'Level 0: Frenzy');
    expect(() => parseSrdSubclassSections(levelZero)).toThrow(/outside 1-20/u);

    const levelTwentyOne = subclassExtract.replace(
      'Level 3: Frenzy',
      'Level 21: Frenzy',
    );
    expect(() => parseSrdSubclassSections(levelTwentyOne)).toThrow(/outside 1-20/u);
  });

  it('the duplicate-feature mutation fails', () => {
    expect(() => parseSrdSubclassSections(subclassExtract)).not.toThrow();

    const duplicateFeature = subclassExtract.replace(
      '   Level 3: Frenzy\n',
      '   Level 3: Frenzy\n   Level 3: Frenzy\n',
    );
    expect(() => parseSrdSubclassSections(duplicateFeature)).toThrow(
      /duplicate feature name Frenzy in Barbarian/u,
    );
  });

  it('the duplicate-feature-name-at-another-level mutation fails', () => {
    const duplicateFeatureName = subclassExtract.replace(
      'Level 6: Mindless Rage',
      'Level 6: Frenzy',
    );
    expect(() => parseSrdSubclassSections(duplicateFeatureName)).toThrow(
      'SRD subclasses: duplicate feature name Frenzy in Barbarian.',
    );
  });

  it('the subclass extract rejects an unknown or duplicated class', () => {
    const unknownClass = subclassExtract.replace(
      'Barbarian Subclass:',
      'Artificer Subclass:',
    );
    expect(() => parseSrdSubclassSections(unknownClass)).toThrow(/unknown base class/u);

    const duplicateClass = subclassExtract.replace(
      'Ranger Subclass: Hunter',
      'Fighter Subclass: Hunter',
    );
    expect(() => parseSrdSubclassSections(duplicateClass)).toThrow(/duplicate base class/u);
  });

  it('the subclass extract carries the five printed subclass spell tables', () => {
    for (const heading of [
      'Level 3: Life Domain Spells',
      'Level 3: Circle of the Land Spells',
      'Level 3: Oath of Devotion Spells',
      'Level 3: Draconic Spells',
      'Level 3: Fiend Spells',
    ]) {
      expect(subclassExtract).toContain(heading);
    }

    const dropLifeDomainTable = subclassExtract.replace(
      /(   Life Domain Spells\n   Cleric        Prepared Spells\n   Level\n)[\s\S]*?(?=   Level 3: Preserve Life)/u,
      '$1',
    );
    expect(() => parseSrdSubclassSections(dropLifeDomainTable)).toThrow(
      /Life Domain Spells table has no spell rows/u,
    );
  });

  it('the missing-spell-row-continuation mutation fails', () => {
    const missingContinuation = subclassExtract.replace(
      '                    Shield of Faith\n',
      '',
    );
    expect(() => parseSrdSubclassSections(missingContinuation)).toThrow(
      'SRD subclasses: Oath of Devotion Spells table row ending in a comma is missing its continuation.',
    );
  });

  it('the duplicate-level-in-one-physical-table mutation fails', () => {
    const duplicateLevel = subclassExtract.replace(
      '         5       Mass Healing Word, Revivify',
      '         3       Mass Healing Word, Revivify',
    );
    expect(() => parseSrdSubclassSections(duplicateLevel)).toThrow(
      'SRD subclasses: duplicate level 3 in Life Domain Spells table.',
    );
  });

  it('the foreign-table-header mutation fails', () => {
    const foreignHeader = subclassExtract.replace(
      'Cleric        Prepared Spells',
      'Sorcerer',
    );
    expect(() => parseSrdSubclassSections(foreignHeader)).toThrow(
      'SRD subclasses: table header "Sorcerer" does not match Life Domain Spells.',
    );
  });

  it('the missing-table-header mutation fails with the required-header error', () => {
    const missingHeader = subclassExtract.replace('   Level\n', '');
    expect(() => parseSrdSubclassSections(missingHeader)).toThrow(
      'SRD subclasses: Life Domain Spells table is missing required header "Level".',
    );
  });

  it('the duplicate-table-header mutation fails with the unique-header error', () => {
    const duplicateHeader = subclassExtract.replace(
      '   Level\n',
      '   Level\n   Level\n',
    );
    expect(() => parseSrdSubclassSections(duplicateHeader)).toThrow(
      'SRD subclasses: duplicate table header "Level" in Life Domain Spells.',
    );
  });

  it('the table-header-after-first-row mutation fails with the ordering error', () => {
    const lateHeader = subclassExtract
      .replace('   Cleric        Prepared Spells\n', '')
      .replace(
        '                 Lesser Restoration\n',
        '                 Lesser Restoration\n   Cleric        Prepared Spells\n',
      );
    expect(() => parseSrdSubclassSections(lateHeader)).toThrow(
      'SRD subclasses: table header "Cleric Prepared Spells" appears after the first spell row in Life Domain Spells.',
    );
  });

  it('the missing-three-druid-land-tables mutation fails', () => {
    const missingLandTables = subclassExtract.replace(
      /     Polar Land[\s\S]*?(?=  Level 3: Land’s Aid)/u,
      '',
    );
    expect(() => parseSrdSubclassSections(missingLandTables)).toThrow(
      'SRD subclasses: missing Polar Land table.',
    );
  });

  it('the duplicate-physical-table-title mutation fails', () => {
    const duplicateTableTitle = subclassExtract.replace('Polar Land', 'Arid Land');
    expect(() => parseSrdSubclassSections(duplicateTableTitle)).toThrow(
      'SRD subclasses: duplicate physical table title Arid Land.',
    );
  });

  it('the subclass extract carries the required notice verbatim', () => {
    expect(subclassExtract.startsWith(`${REQUIRED_NOTICE}\n\n`)).toBe(true);
  });

  it('the inserted-header-prose mutation fails', () => {
    expect(() => parseSrdSubclassSections(subclassExtract)).not.toThrow();

    const insertedHeaderProse = subclassExtract.replace(
      `${REQUIRED_NOTICE}\n\n`,
      `${REQUIRED_NOTICE}\n\nForeign prose does not belong in the header.\n\n`,
    );
    expect(() => parseSrdSubclassSections(insertedHeaderProse)).toThrow(
      /header must contain exactly the required notice and provenance lines/u,
    );
  });
});
