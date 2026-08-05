import { expect, test } from './fixtures/parallel-test';
import type { CharacterSheet } from '../../src/queries/character-sheet-builder';
import {
  reportFixtureImage,
  sheetSpellFixtureImage,
  type FixtureImage,
  type ReportFixtureIds,
  type SheetSpellFixtureIds,
} from './fixtures/php-parity';
import {
  databaseBytes,
  install,
  rows,
  rpc,
  type Row,
} from './fixtures/php-feature-parity-helpers';

let reportImage: FixtureImage<ReportFixtureIds>;
let sheetSpellImage: FixtureImage<SheetSpellFixtureIds>;

test.beforeAll(async () => {
  [reportImage, sheetSpellImage] =
    await Promise.all([
      reportFixtureImage(),
      sheetSpellFixtureImage(),
    ]);
});

test('builds the golden read-only report values and duplicate classifications', async ({
  page,
}) => {
  // The four-worker parallel pool measured 37.4s after the sheet projection;
  // 95s preserves at least 2.5x wall-clock headroom under pool contention.
  test.setTimeout(95_000);
  await install(page, reportImage);
  const before = await databaseBytes(page);
  const report = await rpc<any>(page, 'queries.reports.build', {
    character_id: reportImage.ids.character,
  });
  expect(report.character).toEqual({
    id: reportImage.ids.character,
    name: 'R40 Golden',
    character_level: 8,
    proficiency_bonus: 3,
    abilities: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 16,
      wisdom: 14,
      charisma: 18,
    },
    // B2's additive layer: base is addressable beside the resolved totals,
    // and with no ability_increase contributions in this fixture the two are
    // equal by construction.
    abilities_base: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 16,
      wisdom: 14,
      charisma: 18,
    },
  });
  expect(report.caster).toEqual({
    caster_level: 3,
    slots: [
      { level: 1, count: 4 },
      { level: 2, count: 2 },
    ],
    pact_magic: { count: 2, level: 3 },
  });
  expect(
    report.classes.map((entry: Row) => ({
      name: entry.name,
      subclass: entry.subclass,
      level: entry.class_level,
      ability: entry.spellcasting_ability,
      progression: entry.progression_type,
      prepared: entry.prepared_count,
      maximum: entry.max_preparable_level,
    })),
  ).toEqual([
    {
      name: 'Paladin',
      subclass: null,
      level: 1,
      ability: 'charisma',
      progression: 'half_up',
      prepared: 2,
      maximum: 1,
    },
    {
      name: 'Ranger',
      subclass: null,
      level: 1,
      ability: 'wisdom',
      progression: 'half_up',
      prepared: 2,
      maximum: 1,
    },
    {
      name: 'Warlock',
      subclass: null,
      level: 5,
      ability: 'charisma',
      progression: 'pact',
      prepared: 6,
      maximum: 3,
    },
    {
      name: 'Wizard',
      subclass: null,
      level: 1,
      ability: 'intelligence',
      progression: 'full',
      prepared: 4,
      maximum: 1,
    },
  ]);
  expect(report.preparation_callout).toBe(
    'This build possesses shared Spellcasting slots through 2nd level and Pact Magic slots at 3rd level. Either pool can cast an eligible prepared spell. Class-specific preparation limits reach 3rd-level spells; a slot from either pool does not unlock higher-level choices for another class.',
  );
  expect(
    report.access_routes
      .filter((route: any) => route.spell_name === 'Mage Hand')
      .map((route: any) => route.source_name),
  ).toEqual(['Magic Initiate: Wizard', 'Wizard 1']);
  expect(
    report.duplicate_assessments.find(
      (item: any) => item.spell_name === 'Mage Hand',
    ),
  ).toMatchObject({
    category: 'wasteful',
    selection_count: 2,
    sources: ['Magic Initiate: Wizard', 'Wizard 1'],
    acknowledgement: null,
  });
  expect(
    report.duplicate_assessments.find(
      (item: any) => item.spell_name === 'Shield',
    ),
  ).toMatchObject({
    category: 'conflicting_version',
    versions: [
      expect.objectContaining({ edition: '2014' }),
      expect.objectContaining({ edition: '2024' }),
    ],
    selection_count: 2,
    acknowledgement: null,
  });
  expect(
    report.duplicate_assessments.find(
      (item: Row) => item.spell_name === 'Magic Missile',
    ),
  ).toMatchObject({
    category: 'none',
    selection_count: 1,
  });
  expect(
    report.wizard.spellbook.map((entry: Row) => ({
      name: entry.spell_name,
      prepared: entry.prepared,
      active: entry.active,
    })),
  ).toEqual([
    { name: 'Detect Magic', prepared: false, active: true },
    { name: 'Mage Armor', prepared: true, active: true },
    { name: 'Magic Missile', prepared: true, active: true },
  ]);
  expect(report.wizard.prepared.map((entry: Row) => entry.spell_name)).toEqual([
    'Mage Armor',
    'Magic Missile',
    'Shield',
    'Shield',
  ]);
  expect(
    report.wizard.ritual_only.map((entry: Row) => entry.spell_name),
  ).toEqual(['Detect Magic']);
  expect(report.wizard.explanation).toContain(
    'consumes no preparation capacity',
  );
  expect(
    report.invalid_selections.map((slot: Row) => ({
      id: slot.id,
      state: slot.state,
      eligibility: slot.eligibility,
      reason: slot.invalid_reason ?? slot.orphan_reason,
    })),
  ).toEqual([
    {
      id: reportImage.ids.invalidSlots[0],
      state: 'orphaned',
      eligibility: 'unselected',
      reason: 'grant_rule_removed',
    },
    {
      id: reportImage.ids.invalidSlots[1],
      state: 'active',
      eligibility: 'invalid',
      reason: 'Selected spell is outside the slot level range.',
    },
    {
      id: reportImage.ids.invalidSlots[2],
      state: 'kept_override',
      eligibility: 'invalid',
      reason: 'Selected spell is outside the slot level range.',
    },
  ]);
  expect(
    (await rows(page, 'spell_selection_slots'))
      .filter((row) => reportImage.ids.invalidSlots.includes(row.id))
      .map((row) => row.state),
  ).toEqual(['active', 'orphaned', 'kept_override']);
  await page.goto(`/characters/${reportImage.ids.character}/report`);
  await expect(page.locator('[data-screen="build-report"]')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'R40 Golden',
  );
  await expect(page.getByTestId('preparation-callout')).toContainText(
    'shared Spellcasting slots through 2nd level and Pact Magic slots at 3rd level',
  );
  await expect(
    page.locator('.duplicate-card[data-category="conflicting_version"]'),
  ).toContainText('Shield (2014)');
  expect(await databaseBytes(page)).toEqual(before);
});

test('builds Mutt printable sources with complete facts and only the mechanically relevant number', async ({
  page,
}) => {
  // The four-worker parallel pool measured 38.0s; 95s preserves 2.5x
  // wall-clock headroom under parallel-pool contention.
  test.setTimeout(95_000);
  await install(page, sheetSpellImage);
  const before = await databaseBytes(page);
  const sheet = await rpc<CharacterSheet>(page, 'queries.characters.sheet', {
    character_id: sheetSpellImage.ids.character,
  });
  expect(
    sheet.spells.map((group) =>
      group.kind === 'class' ? group.class_name : group.source_name,
    ),
  ).toEqual([
    'Cleric',
    'Druid',
    'Wizard',
    'Gift 2',
    'Gift 10',
  ]);
  expect(
    sheet.spells.map((group) => ({
      source: group.kind === 'class' ? group.class_name : group.source_name,
      statistics: group.statistics,
    })),
  ).toEqual([
    {
      source: 'Cleric',
      statistics: [{
        status: 'computed',
        ability: 'wisdom',
        attack_bonus: 4,
        save_dc: 12,
      }],
    },
    {
      source: 'Druid',
      statistics: [{
        status: 'computed',
        ability: 'wisdom',
        attack_bonus: 4,
        save_dc: 12,
      }],
    },
    {
      source: 'Wizard',
      statistics: [{
        status: 'computed',
        ability: 'intelligence',
        attack_bonus: 5,
        save_dc: 13,
      }],
    },
    {
      source: 'Gift 2',
      statistics: [{
        status: 'computed',
        ability: 'charisma',
        attack_bonus: 6,
        save_dc: 14,
      }],
    },
    {
      source: 'Gift 10',
      statistics: [{
        status: 'computed',
        ability: 'charisma',
        attack_bonus: 6,
        save_dc: 14,
      }],
    },
  ]);
  const cleric = sheet.spells.find(
    (group) => group.kind === 'class' && group.class_name === 'Cleric',
  );
  const gift2 = sheet.spells.find(
    (group) => group.kind === 'other_source' && group.source_name === 'Gift 2',
  );
  const command = cleric?.spells.find(
    (spell) => spell.spell_version_id === sheetSpellImage.ids.command,
  );
  expect(command).toEqual({
    spell_version_id: sheetSpellImage.ids.command,
    name: 'Command',
    level: { status: 'known', value: 1 },
    marker: 'prepared',
    reference: {
      edition: '2024',
      school: 'Enchantment',
      casting_time: 'Action',
      action_type: 'Action',
      range: '60 feet',
      duration: '1 round',
      components: 'V',
      concentration: false,
      ritual: false,
      upcast_levels: [],
      upcast_summary: null,
      cantrip_upgrade_levels: [],
      cantrip_upgrade_summary: null,
      attack_modes: [],
      save_abilities: ['wisdom'],
      description: 'A one-word supernatural command.',
    },
  });
  const thornWhip = sheet.spells
    .flatMap((group) => group.spells)
    .find((spell) => spell.name === 'Thorn Whip');
  expect(thornWhip).toMatchObject({
    level: { status: 'known', value: 0 },
    marker: 'known',
    reference: {
      action_type: 'Bonus Action',
      attack_modes: ['melee_spell', 'ranged_spell'],
      save_abilities: [],
    },
  });
  const mistyStep = gift2?.spells.find(
    (spell) => spell.spell_version_id === sheetSpellImage.ids.mistyStep,
  );
  expect(mistyStep).toMatchObject({
    name: 'Misty Step',
    marker: 'known',
    level: { status: 'known', value: 2 },
  });
  expect(
    (await rows(page, 'spell_selection_slots')).find(
      (row) => row.id === sheetSpellImage.ids.mistyStepSlot,
    ),
  ).toMatchObject({
    fixed_spell_version_id: sheetSpellImage.ids.mistyStep,
    with_slots: 1,
    free_cast:
      '{"uses":1,"recovery":"long_rest","pool_scope":"per_spell"}',
  });
  expect(
    (await rows(page, 'spell_selection_slots')).find(
      (row) => row.id === sheetSpellImage.ids.faerieFireSlot,
    ),
  ).toMatchObject({
    with_slots: 0,
    free_cast: '{"uses":2,"recovery":"dawn","pool_scope":"shared"}',
  });
  await page.goto(`/characters/${sheetSpellImage.ids.character}/sheet`);
  const clericGroup = page.locator('[data-spell-group^="class:"]', {
    hasText: 'Cleric',
  });
  await expect(clericGroup.locator('.sheet-spell-statistic')).toHaveText(
    'Save DC 12 · Spell attack +4',
  );
  await expect(clericGroup.locator('.sheet-number', { hasText: 'Command' }))
    .toContainText('Level 1Prepared');
  const gift2Group = page.locator('[data-spell-group^="source:"]', {
    hasText: 'Gift 2',
  });
  await expect(gift2Group.locator('.sheet-spell-statistic')).toHaveText(
    'Save DC 14 · Spell attack +6',
  );
  await expect(gift2Group.locator('.sheet-number', { hasText: 'Misty Step' }))
    .toContainText('Level 2Known');
  await page.emulateMedia({ media: 'print' });
  const commandCards = page.locator(
    `[data-spell-appendix-card="${String(sheetSpellImage.ids.command)}"]`,
  );
  await expect(commandCards).toHaveCount(2);
  await expect(commandCards.first()).toContainText(
    'A one-word supernatural command.',
  );
  expect(await databaseBytes(page)).toEqual(before);
});
