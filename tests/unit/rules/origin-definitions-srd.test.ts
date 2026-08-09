import { describe, expect, it } from 'vitest';
import {
  ConfiguredChoiceRule,
  parseSourceGrantRules,
} from '../../../src/grants/configured-choice-rule';
import { GrantRule } from '../../../src/grants/grant-rule';
import { bundledSpeciesDefinitions } from '../../../src/rules/origin-definitions-srd';

function definition(name: string) {
  const found = bundledSpeciesDefinitions().find((entry) => entry.name === name);
  if (found === undefined) throw new Error(`Missing ${name} definition.`);
  return found;
}

function choice(name: string): ConfiguredChoiceRule {
  const found = parseSourceGrantRules(definition(name).grant_rules).find(
    (rule): rule is ConfiguredChoiceRule => rule instanceof ConfiguredChoiceRule,
  );
  if (found === undefined) throw new Error(`Missing ${name} choice.`);
  return found;
}

describe('bundled species configured-choice data', () => {
  it('pins every lineage option and its exact level-keyed spells', () => {
    const exact = (name: string) => choice(name).options.map((option) => ({
      value: option.value,
      grants: option.grants.map((grant) => ({
        key: grant.ruleKey,
        spell: grant.toObject().spell_version_key,
        level: grant.activeFromCharacterLevel ?? 1,
      })),
    }));

    expect(exact('Elf')).toEqual([
      { value: 'Drow', grants: [
        { key: 'elf-lineage-drow-dancing-lights', spell: '2024:dancing-lights', level: 1 },
        { key: 'elf-lineage-drow-faerie-fire', spell: '2024:faerie-fire', level: 3 },
        { key: 'elf-lineage-drow-darkness', spell: '2024:darkness', level: 5 },
      ] },
      { value: 'High Elf', grants: [
        { key: 'elf-lineage-high-elf-detect-magic', spell: '2024:detect-magic', level: 3 },
        { key: 'elf-lineage-high-elf-misty-step', spell: '2024:misty-step', level: 5 },
      ] },
      { value: 'Wood Elf', grants: [
        { key: 'elf-lineage-wood-elf-druidcraft', spell: '2024:druidcraft', level: 1 },
        { key: 'elf-lineage-wood-elf-longstrider', spell: '2024:longstrider', level: 3 },
        { key: 'elf-lineage-wood-elf-pass-without-trace', spell: '2024:pass-without-trace', level: 5 },
      ] },
    ]);
    expect(exact('Gnome')).toEqual([
      { value: 'Forest Gnome', grants: [
        { key: 'gnome-lineage-forest-gnome-minor-illusion', spell: '2024:minor-illusion', level: 1 },
        { key: 'gnome-lineage-forest-gnome-speak-with-animals', spell: '2024:speak-with-animals', level: 1 },
      ] },
      { value: 'Rock Gnome', grants: [
        { key: 'gnome-lineage-rock-gnome-mending', spell: '2024:mending', level: 1 },
        { key: 'gnome-lineage-rock-gnome-prestidigitation', spell: '2024:prestidigitation', level: 1 },
      ] },
    ]);
    expect(exact('Tiefling')).toEqual([
      { value: 'Abyssal', grants: [
        { key: 'tiefling-lineage-abyssal-poison-spray', spell: '2024:poison-spray', level: 1 },
        { key: 'tiefling-lineage-abyssal-ray-of-sickness', spell: '2024:ray-of-sickness', level: 3 },
        { key: 'tiefling-lineage-abyssal-hold-person', spell: '2024:hold-person', level: 5 },
      ] },
      { value: 'Chthonic', grants: [
        { key: 'tiefling-lineage-chthonic-chill-touch', spell: '2024:chill-touch', level: 1 },
        { key: 'tiefling-lineage-chthonic-false-life', spell: '2024:false-life', level: 3 },
        { key: 'tiefling-lineage-chthonic-ray-of-enfeeblement', spell: '2024:ray-of-enfeeblement', level: 5 },
      ] },
      { value: 'Infernal', grants: [
        { key: 'tiefling-lineage-infernal-fire-bolt', spell: '2024:fire-bolt', level: 1 },
        { key: 'tiefling-lineage-infernal-hellish-rebuke', spell: '2024:hellish-rebuke', level: 3 },
        { key: 'tiefling-lineage-infernal-darkness', spell: '2024:darkness', level: 5 },
      ] },
    ]);
  });

  it('pins projection/effects, ability sets, High Elf replacement, and Thaumaturgy', () => {
    const elf = choice('Elf');
    expect(elf.unknownSheetFields).toEqual([
      'walking_speed_feet',
      'darkvision_feet',
    ]);
    expect(elf.options.map((option) => [
      option.value,
      option.darkvisionFeet,
      option.effects,
    ])).toEqual([
      ['Drow', 120, []],
      ['High Elf', 60, []],
      ['Wood Elf', 60, [{
        kind: 'speed', label: 'Wood Elf Speed', speed_bonus_feet: 5,
      }]],
    ]);
    expect(elf.options[1]?.replaceableSpellChoice).toEqual({
      configKey: 'lineage.high_elf_cantrip',
      label: 'High Elf cantrip',
      required: true,
      spellList: 'Wizard',
      spellLevel: 0,
      initialSpellVersionKey: '2024:prestidigitation',
      displayOnSheet: true,
    });

    for (const speciesName of ['Elf', 'Gnome', 'Tiefling']) {
      expect(choice(speciesName).abilityChoice?.options).toEqual([
        'intelligence', 'wisdom', 'charisma',
      ]);
    }
    expect(choice('Tiefling').options.map((option) => option.effects)).toEqual([
      [{ kind: 'damage_resistance', label: 'Abyssal Legacy', damage_type: 'Poison' }],
      [{ kind: 'damage_resistance', label: 'Chthonic Legacy', damage_type: 'Necrotic' }],
      [{ kind: 'damage_resistance', label: 'Infernal Legacy', damage_type: 'Fire' }],
    ]);
    const root = parseSourceGrantRules(definition('Tiefling').grant_rules).find(
      (rule): rule is GrantRule => rule instanceof GrantRule,
    );
    expect(root?.ruleKey).toBe('tiefling-otherworldly-presence-thaumaturgy');
  });
});
