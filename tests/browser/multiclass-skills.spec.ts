import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { DatabaseContext } from '../../src/db/database';
import { registerBrowserFixtureContentIdentity } from './fixtures/content-identity';
import { expect, test } from './fixtures/parallel-test';

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

/**
 * A hand-built image on the PER-GRANT model (skills-with-provenance §3.3):
 * the Fighter's two class choices are FILLED GRANTS under the Fighter's own
 * source — arcana and history, deliberately outside the Ranger fixture's
 * most useful keyboard choices — and the entered class's entry grant is an
 * UNFILLED grant under its own source. The flat
 * `character_skill_proficiencies` rows exist only as the derived projection
 * of the filled grants; nothing reads them for completeness.
 */
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
    const contentKey = `2024:class:${name.toLowerCase()}`;
    registerBrowserFixtureContentIdentity(db, {
      kind: 'class',
      contentKey,
      name,
      keyKind: 'bundled-stable',
    });
    const id = db.exec(
      `INSERT INTO class_definitions
         (content_key, name, rules_edition, progression_type)
       VALUES (?, ?, '2024', 'none')`,
      [contentKey, name],
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
    3,
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

  const addSource = (definitionId: number, displayName: string): number =>
    db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, state
       ) VALUES (?, ?, 'class', ?, ?, 'active')`,
      [characterId, crypto.randomUUID(), definitionId, displayName],
    ).lastInsertId;
  const fighterSource = addSource(fighterId, 'Fighter 1');
  const targetSource = addSource(targetId, `${options.target} 1`);

  const addGrant = (
    sourceId: number,
    grantKey: string,
    ordinal: number,
    skill: string | null,
  ): void => {
    db.exec(
      `INSERT INTO character_skill_grants (
         character_id, source_instance_id, grant_key, ordinal, skill, state
       ) VALUES (?, ?, ?, ?, ?, 'active')`,
      [characterId, sourceId, grantKey, ordinal, skill],
    );
  };
  // The Fighter's two initial choices are already made, as filled grants.
  addGrant(fighterSource, 'class_skill', 1, 'arcana');
  addGrant(fighterSource, 'class_skill', 2, 'history');
  // The entry grant(s), unfilled — the outstanding obligations under test.
  for (let ordinal = 1; ordinal <= (options.count ?? 1); ordinal += 1) {
    addGrant(targetSource, 'multiclass_skill', ordinal, null);
  }
  // The derived projection of the two filled grants.
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
  // The four-worker pool measured the slowest caller at 17.1s; 45s gives both
  // load-sensitive readiness waits at least 2.5x pool headroom.
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 45_000,
  });
  await page.evaluate(
    (bytes) => window.staticApp.replaceDatabase(Uint8Array.from(bytes)),
    image.bytes,
  );
  await page.goto(`/characters/${image.characterId}`);
  await expect(page.locator('#planner-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 45_000 },
  );
}

function skillRows(page: Page) {
  return page.evaluate(() =>
    window.staticApp.inspectRows('character_skill_proficiencies', {
      character_id: 1,
    }),
  );
}

function filledGrantSkills(page: Page) {
  return page.evaluate(async () => {
    const rows = await window.staticApp.inspectRows('character_skill_grants', {
      character_id: 1,
    });
    return rows
      .filter((row) => row['skill'] !== null)
      .map((row) => [row['grant_key'], row['skill']])
      .sort();
  });
}

test('the Ranger entry choice is keyboard-reachable, fills the ADDRESSED grant, and clears completeness', async ({
  page,
}) => {
  const image = await multiclassImage({ target: 'Ranger' });
  await install(page, image);

  const picker = page.getByRole('combobox', {
    name: 'Ranger 1 skill choice 1 of 1',
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
  const choose = page.getByRole('button', { name: 'Choose Ranger 1 skill 1' });
  await expect(choose).toBeFocused();
  await page.keyboard.press('Enter');

  // The write landed on the RANGER's grant — provenance, not just totals —
  // and the projection derived it.
  await expect.poll(() => filledGrantSkills(page)).toEqual([
    ['class_skill', 'arcana'],
    ['class_skill', 'history'],
    ['multiclass_skill', 'perception'],
  ]);
  await expect.poll(() => skillRows(page)).toEqual([
    expect.objectContaining({ skill: 'arcana' }),
    expect.objectContaining({ skill: 'history' }),
    expect.objectContaining({ skill: 'perception' }),
  ]);
  await expect(
    page.getByRole('heading', { name: /Ranger 1 — .* chosen/ }),
  ).toHaveCount(0);
});

test('the Bard entry offers all eighteen skills minus the held two, including Performance', async ({
  page,
}) => {
  const image = await multiclassImage({ target: 'Bard' });
  await install(page, image);
  const picker = page.getByRole('combobox', {
    name: 'Bard 1 skill choice 1 of 1',
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
  await page.getByRole('button', { name: 'Choose Bard 1 skill 1' }).click();
  await expect.poll(() => skillRows(page)).toEqual([
    expect.objectContaining({ skill: 'arcana' }),
    expect.objectContaining({ skill: 'history' }),
    expect.objectContaining({ skill: 'performance' }),
  ]);
  await expect(
    page.getByRole('heading', { name: /Bard 1 — .* chosen/ }),
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

test('an entry count above one stays outstanding until every grant is filled', async ({
  page,
}) => {
  // A homebrew class keeps the synthetic count above one intact when the
  // app's startup health check refreshes the bundled SRD Ranger back to its
  // sourced count of one — and each ordinal is its OWN addressed grant.
  const image = await multiclassImage({ target: 'Scout', count: 2 });
  await install(page, image);

  await page
    .getByRole('combobox', { name: 'Scout 1 skill choice 1 of 2' })
    .selectOption('perception');
  await page
    .getByRole('button', { name: 'Choose Scout 1 skill 1' })
    .click();
  await expect(
    page.getByRole('heading', {
      name: 'Scout 1 — 1 of 2 multiclass skill choices chosen',
    }),
  ).toBeVisible();

  const second = page.getByRole('combobox', {
    name: 'Scout 1 skill choice 2 of 2',
  });
  await expect
    .poll(() => second.locator('option').allTextContents())
    .not.toContain('Perception');
  await second.selectOption('stealth');
  await page
    .getByRole('button', { name: 'Choose Scout 1 skill 2' })
    .click();
  await expect(
    page.getByRole('heading', { name: /Scout 1 — .* chosen/ }),
  ).toHaveCount(0);
  await expect.poll(() => skillRows(page)).toHaveLength(4);
});
