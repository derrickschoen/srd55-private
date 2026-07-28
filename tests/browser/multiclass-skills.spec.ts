import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { DatabaseContext } from '../../src/db/database';

const schema = readFileSync(
  new URL('../../src/db/schema.sql', import.meta.url),
  'utf8',
);

const ALL_SKILL_LABELS = [
  'Acrobatics',
  'Animal Handling',
  'Arcana',
  'Athletics',
  'Deception',
  'History',
  'Insight',
  'Intimidation',
  'Investigation',
  'Medicine',
  'Nature',
  'Perception',
  'Performance',
  'Persuasion',
  'Religion',
  'Sleight of Hand',
  'Stealth',
  'Survival',
] as const;

const RANGER_SKILLS = [
  'animal_handling',
  'athletics',
  'insight',
  'investigation',
  'nature',
  'perception',
  'stealth',
  'survival',
] as const;

interface MulticlassImage {
  readonly bytes: number[];
  readonly characterId: number;
}

async function multiclassImage(options: {
  readonly target: 'Bard' | 'Ranger' | 'Scout';
  readonly count?: number;
}): Promise<MulticlassImage> {
  const sqlite3 = await sqlite3InitModule();
  const connection = new sqlite3.oo1.DB(':memory:', 'c');
  connection.exec(schema);
  const db = new DatabaseContext(connection);

  const defineClass = (
    name: string,
    skillCount: number,
    entryPool: 'none' | 'class_list' | 'any',
    entryCount: number,
  ): number => {
    const id = db.exec(
      `INSERT INTO class_definitions
         (content_key, name, rules_edition, progression_type)
       VALUES (?, ?, '2024', 'none')`,
      [`2024:class:${name.toLowerCase()}`, name],
    ).lastInsertId;
    db.exec(
      `INSERT INTO class_progressions (class_definition_id, class_level)
       VALUES (?, 1)`,
      [id],
    );
    db.exec(
      `INSERT INTO class_sheet_traits
         (class_definition_id, hit_die, skill_choice_count,
          skill_choice_from_any, multiclass_skill_choice_count,
          multiclass_skill_choice_pool)
       VALUES (?, 10, ?, 0, ?, ?)`,
      [id, skillCount, entryCount, entryPool],
    );
    return id;
  };

  const fighterId = defineClass('Fighter', 2, 'none', 0);
  const targetId = defineClass(
    options.target,
    options.target === 'Bard' ? 3 : 3,
    options.target === 'Bard' ? 'any' : 'class_list',
    options.count ?? 1,
  );
  if (options.target !== 'Bard') {
    for (const skill of RANGER_SKILLS) {
      db.exec(
        `INSERT INTO class_skill_options (class_definition_id, skill)
         VALUES (?, ?)`,
        [targetId, skill],
      );
    }
  }

  const characterId = db.exec(
    `INSERT INTO characters (name) VALUES ('Multiclass Picker')`,
  ).lastInsertId;
  db.exec(
    `INSERT INTO character_class_levels
       (character_id, class_definition_id, level, is_starting_class)
     VALUES (?, ?, 1, 1), (?, ?, 1, 0)`,
    [characterId, fighterId, characterId, targetId],
  );
  // The Fighter's two initial choices are already paid, leaving only the entry
  // grant outstanding. These are intentionally outside the Ranger fixture's
  // most useful keyboard choices.
  db.exec(
    `INSERT INTO character_skill_proficiencies (character_id, skill)
     VALUES (?, 'arcana'), (?, 'history')`,
    [characterId, characterId],
  );

  const bytes = Array.from(sqlite3.capi.sqlite3_js_db_export(connection));
  connection.close();
  return { bytes, characterId };
}

async function install(page: Page, image: MulticlassImage): Promise<void> {
  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 30_000,
  });
  await page.evaluate(
    (bytes) => window.staticApp.replaceDatabase(Uint8Array.from(bytes)),
    image.bytes,
  );
  await page.goto(`/characters/${image.characterId}`);
  await expect(page.locator('#planner-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
}

function skillRows(page: Page) {
  return page.evaluate(() =>
    window.staticApp.inspectRows('character_skill_proficiencies', {
      character_id: 1,
    }),
  );
}

test('the Ranger entry choice is keyboard-reachable, persists, and clears completeness', async ({
  page,
}) => {
  const image = await multiclassImage({ target: 'Ranger' });
  await install(page, image);

  const picker = page.getByRole('combobox', {
    name: 'Ranger multiclass skill (1 granted)',
  });
  await expect(picker.locator('option')).toHaveText([
    'Choose a skill',
    'Animal Handling',
    'Athletics',
    'Insight',
    'Investigation',
    'Nature',
    'Perception',
    'Stealth',
    'Survival',
  ]);
  await picker.focus();
  await expect(picker).toBeFocused();
  await picker.press('p');
  await expect(picker).toHaveValue('perception');
  await picker.press('Tab');
  const choose = page.getByRole('button', { name: 'Choose Ranger skill' });
  await expect(choose).toBeFocused();
  await page.keyboard.press('Enter');

  await expect.poll(() => skillRows(page)).toEqual([
    expect.objectContaining({ skill: 'arcana' }),
    expect.objectContaining({ skill: 'history' }),
    expect.objectContaining({ skill: 'perception' }),
  ]);
  await expect(
    page.getByRole('heading', {
      name: 'A skill from multiclassing has not been chosen',
    }),
  ).toHaveCount(0);
});

test('the Bard entry offers all eighteen skills, including Performance', async ({
  page,
}) => {
  const image = await multiclassImage({ target: 'Bard' });
  await install(page, image);
  const picker = page.getByRole('combobox', {
    name: 'Bard multiclass skill (1 granted)',
  });
  const options = await picker.locator('option').allTextContents();
  expect(options).toEqual([
    'Choose a skill',
    ...ALL_SKILL_LABELS.filter(
      (skill) => skill !== 'Arcana' && skill !== 'History',
    ),
  ]);
  expect(options).toContain('Performance');
  await expect(
    page.getByText(
      'This also grants one musical instrument of your choice; the app does not track it.',
    ),
  ).toBeVisible();

  await picker.selectOption('performance');
  await page.getByRole('button', { name: 'Choose Bard skill' }).click();
  await expect.poll(() => skillRows(page)).toEqual([
    expect.objectContaining({ skill: 'arcana' }),
    expect.objectContaining({ skill: 'history' }),
    expect.objectContaining({ skill: 'performance' }),
  ]);
  await expect(
    page.getByRole('heading', {
      name: 'A skill from multiclassing has not been chosen',
    }),
  ).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.staticApp.inspectRows('characters', { id: 1 }),
      ),
    )
    .toEqual([
      expect.objectContaining({
        notes: null,
      }),
    ]);
});

test('an entry count above one stays outstanding until every choice is made', async ({
  page,
}) => {
  // A homebrew class keeps the synthetic count above one intact when the app's
  // startup health check refreshes the bundled SRD Ranger back to its sourced
  // count of one.
  const image = await multiclassImage({ target: 'Scout', count: 2 });
  await install(page, image);

  let picker = page.getByRole('combobox', {
    name: 'Scout multiclass skill (2 granted)',
  });
  await picker.selectOption('perception');
  await page.getByRole('button', { name: 'Choose Scout skill' }).click();
  await expect(
    page.getByRole('heading', {
      name: 'A skill from multiclassing has not been chosen',
    }),
  ).toBeVisible();

  picker = page.getByRole('combobox', {
    name: 'Scout multiclass skill (2 granted)',
  });
  await expect
    .poll(() => picker.locator('option').allTextContents())
    .not.toContain('Perception');
  await picker.selectOption('stealth');
  await page.getByRole('button', { name: 'Choose Scout skill' }).click();
  await expect(
    page.getByRole('heading', {
      name: 'A skill from multiclassing has not been chosen',
    }),
  ).toHaveCount(0);
  await expect.poll(() => skillRows(page)).toHaveLength(4);
});
