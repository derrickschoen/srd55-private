import type { Locator, Page } from '@playwright/test';
import {
  ACCEPTANCE_WIZARD_2_CHOICES,
} from './fixtures/level-up-characters';
import { readLevelUpSeam } from './fixtures/level-up-seam';
import { expect, test } from './fixtures/parallel-test';
import {
  announcedMessages,
  clearAnnouncements,
  installAnnouncementRecorder,
} from './fixtures/announcements';

interface CreatedCharacter {
  readonly id: number;
  readonly name: string;
  readonly revision: number;
}

interface StoredRow {
  readonly [key: string]: unknown;
}

async function ready(page: Page): Promise<void> {
  // The four-worker pool measured this file's slowest caller at 19.2s; 50s
  // gives this load-sensitive readiness wait at least 2.5x pool headroom.
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 50_000 },
  );
}

async function createFighter(page: Page, name: string): Promise<CreatedCharacter> {
  return createCharacter(page, name, 'Fighter');
}

async function createCharacter(
  page: Page,
  name: string,
  className: string,
): Promise<CreatedCharacter> {
  await page.goto('/');
  await ready(page);
  return page.evaluate(async ({ characterName, requestedClass }) => {
    await window.staticApp.reset();
    const classes = await window.appRpc.call<
      Record<string, never>,
      readonly {
        readonly content_key: string;
        readonly name: string;
        readonly hit_die: number | null;
      }[]
    >('queries.characters.guidedClassOptions', {});
    const selectedClass = classes.find(
      (candidate) => candidate.name === requestedClass,
    );
    if (selectedClass === undefined) {
      throw new Error(`Bundled ${requestedClass} was not found.`);
    }
    return window.appRpc.call<
      { readonly name: string; readonly class_content_key: string },
      CreatedCharacter
    >('queries.characters.createGuided', {
      name: characterName,
      class_content_key: selectedClass.content_key,
    });
  }, { characterName: name, requestedClass: className });
}

async function selectPlannedSpell(
  page: Page,
  accessibleName: string,
  index: number,
  spellName: string,
): Promise<void> {
  const input = page.getByRole('combobox', { name: accessibleName }).nth(index);
  const listOptions = input.locator('..').locator('[role="listbox"] [role="option"]');
  await input.focus();
  await expect.poll(() =>
    listOptions.allTextContents()
  ).not.toEqual([]);
  const initialSpellOptions = await listOptions.allTextContents();
  await page.keyboard.type(spellName);
  await expect.poll(() => listOptions.allTextContents())
    .not.toEqual(initialSpellOptions);
  const option = page.getByRole('option').filter({ hasText: spellName });
  // The four-worker pool measured the slowest caller at 17.4s; 45s gives this
  // worker-backed option wait at least 2.5x headroom under pool contention.
  await expect(option).toBeVisible({ timeout: 45_000 });
  await expect(option).toHaveAccessibleDescription(/SRD · bundled layer/u);
  const optionIndex = await listOptions.allTextContents()
    .then((options) => options.findIndex((optionText) => optionText.startsWith(spellName)));
  expect(optionIndex).toBeGreaterThanOrEqual(0);
  for (let optionNumber = 0; optionNumber < optionIndex; optionNumber += 1) {
    await page.keyboard.press('ArrowDown');
  }
  await page.keyboard.press('Enter');
  await expect(input).toHaveValue(spellName);
}

async function completeWizardLevelOneChoices(
  page: Page,
  characterId: number,
): Promise<void> {
  await page.evaluate(async (id) => {
    let skillIndex = 0;
    while (true) {
      const step = await window.appRpc.call<
        { readonly character_id: number },
        {
          readonly revision: number;
          readonly class_choices: readonly {
            readonly grant_id: number;
            readonly available: readonly string[];
          }[];
        }
      >('queries.characters.skillsStep', { character_id: id });
      const choice = step.class_choices[0];
      if (choice === undefined) break;
      const preferred = ['arcana', 'history'][skillIndex];
      const skill = preferred !== undefined && choice.available.includes(preferred)
        ? preferred
        : choice.available[0];
      if (skill === undefined) throw new Error('Wizard skill grant had no available skill.');
      await window.appRpc.call('queries.characters.fillSkillGrant', {
        character_id: id,
        grant_id: choice.grant_id,
        skill,
        operation_uuid: crypto.randomUUID(),
        expected_revision: step.revision,
      });
      skillIndex += 1;
    }

    while (true) {
      const step = await window.appRpc.call<
        { readonly character_id: number },
        {
          readonly revision: number;
          readonly choices: readonly {
            readonly kind: 'slot_selection' | 'spellbook_acquisition';
            readonly id: number;
          }[];
        }
      >('queries.characters.spellsStep', { character_id: id });
      const choice = step.choices[0];
      if (choice === undefined) break;
      const address = { kind: choice.kind, id: choice.id };
      const eligible = await window.appRpc.call<
        { readonly character_id: number; readonly address: typeof address; readonly query: string },
        readonly { readonly id: number; readonly name: string }[]
      >('queries.characters.guidedEligibleSpells', {
        character_id: id,
        address,
        query: '',
      });
      const reservedForLevelTwo = new Set([
        'Thunderwave',
        'Chromatic Orb',
        'Comprehend Languages',
      ]);
      const spell = eligible.find(
        (candidate) => !reservedForLevelTwo.has(candidate.name),
      );
      if (spell === undefined) throw new Error('Wizard spell choice had no eligible spell.');
      await window.appRpc.call('queries.characters.assignGuidedSpell', {
        character_id: id,
        address,
        spell_version_id: spell.id,
        operation_uuid: crypto.randomUUID(),
        expected_revision: step.revision,
      });
    }
  }, characterId);
}

async function advanceCharacterClassTo(
  page: Page,
  characterId: number,
  className: string,
  targetLevel: number,
): Promise<void> {
  await page.evaluate(async ({ id, requestedClass, target }) => {
    const classRows = await window.staticApp.inspectRows(
      'class_definitions',
      { name: requestedClass },
    );
    const classId = Number(classRows[0]?.['id']);
    if (!Number.isSafeInteger(classId)) {
      throw new Error(`No class definition named ${requestedClass}.`);
    }
    for (let level = 1; level < target; level += 1) {
      const characterRows = await window.staticApp.inspectRows(
        'characters',
        { id },
      );
      const revision = Number(characterRows[0]?.['revision']);
      if (!Number.isSafeInteger(revision)) {
        throw new Error(`Character ${String(id)} has no valid revision.`);
      }
      await window.appRpc.call('commands.execute', {
        character_id: id,
        operation_uuid: crypto.randomUUID(),
        expected_revision: revision,
        command: {
          type: 'level_up_class',
          class_definition_id: classId,
          target_level: level + 1,
        },
      });
    }
  }, { id: characterId, requestedClass: className, target: targetLevel });
}

async function pressTabUntilFocused(
  page: Page,
  target: Locator,
  maximumTabs: number,
): Promise<void> {
  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press('Tab');
    if (await target.evaluate((element) => document.activeElement === element)) {
      return;
    }
  }
  throw new Error(`Target was not reached after ${String(maximumTabs)} Tab presses.`);
}

async function openWizardPlannedReview(
  page: Page,
  character: CreatedCharacter,
): Promise<void> {
  await page.goto(`/characters/${String(character.id)}/level-up`);
  // The four-worker pool measured the caller at 17.4s; 45s gives both
  // load-sensitive review waits at least 2.5x pool headroom.
  await expect(
    page.getByRole('heading', { name: `Level up — ${character.name}` }),
  ).toBeFocused({ timeout: 45_000 });
  await page.locator('[data-level-up-next]').click();
  await expect(page.getByRole('heading', { name: 'Gains' })).toBeFocused();
  await page.locator('[data-level-up-next]').click();
  await expect(page.getByRole('heading', { name: 'Choose Expertise' })).toBeFocused();
  const expertise = page.locator('[data-level-up-expertise-choice]');
  await expect(expertise).toHaveAccessibleDescription(
    'Granted by Wizard — Scholar — SRD · bundled layer. Rule class_expertise_2, choice 1.',
  );
  await expertise.focus();
  await page.keyboard.type('Arcana');
  await page.locator('[data-level-up-next]').click();
  await expect(page.getByRole('heading', { name: 'Choose spells' })).toBeFocused();

  let acquisitionIndex = 0;
  for (const choice of ACCEPTANCE_WIZARD_2_CHOICES.spells) {
    if (choice.kind === 'slot_selection') {
      await selectPlannedSpell(
        page,
        'New spell choice — Required from Wizard',
        0,
        choice.spell_name,
      );
    } else {
      await selectPlannedSpell(
        page,
        'Spellbook acquisition — Required from Wizard',
        acquisitionIndex,
        choice.spell_name,
      );
      acquisitionIndex += 1;
    }
  }
  await page.locator('[data-level-up-next]').click();
  await expect(
    page.getByRole('heading', { name: 'Review', exact: true }),
  ).toBeFocused();
  await expect(page.locator('[data-level-up-confirm]')).toBeEnabled({
    timeout: 45_000,
  });
}

async function databaseDigest(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const bytes = await window.staticApp.exportDatabase();
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const digest = await crypto.subtle.digest('SHA-256', copy.buffer);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  });
}

async function openReadyReview(
  page: Page,
  character: CreatedCharacter,
): Promise<void> {
  await page.goto(`/characters/${String(character.id)}/level-up`);
  // The four-worker pool measured the slowest caller at 12.2s; 35s gives both
  // load-sensitive review waits at least 2.5x pool headroom.
  await expect(
    page.getByRole('heading', { name: `Level up — ${character.name}` }),
  ).toBeFocused({ timeout: 35_000 });
  await page.locator('[data-level-up-next]').click();
  await expect(page.getByRole('heading', { name: 'Gains' })).toBeFocused();
  await page.locator('[data-level-up-next]').click();
  await expect(
    page.getByRole('heading', { name: 'Review', exact: true }),
  ).toBeFocused();
  await expect(page.locator('[data-level-up-confirm]')).toBeEnabled({
    timeout: 35_000,
  });
}

async function rows(page: Page, table: string): Promise<readonly StoredRow[]> {
  return page.evaluate(
    (tableName) => window.staticApp.inspectRows(tableName),
    table,
  );
}

test('W-KEYBOARD Tab order, reverse travel, native choice keys, and moved focus complete a feat journey at an ASI level', async ({
  page,
}) => {
  const character = await createFighter(page, 'Keyboard Fighter');
  await advanceCharacterClassTo(page, character.id, 'Fighter', 3);
  const seam = await readLevelUpSeam(page, character.id);
  await page.goto(seam.path);

  const routeHeading = page.getByRole('heading', {
    name: `Level up — ${character.name}`,
  });
  // The four-worker pool measured this test at 12.9s; 35s gives this
  // load-sensitive route-focus wait at least 2.5x pool headroom.
  await expect(routeHeading).toBeFocused({ timeout: 35_000 });
  const classChoice = page.getByRole('radio', { name: /Fighter 3 → 4/ });
  const advancedPlanner = page.getByRole('link', {
    name: 'Advanced: open planner',
  });
  const cancel = page.getByRole('button', { name: 'Cancel' });
  const next = page.getByRole('button', { name: 'Next' });

  await page.keyboard.press('Tab');
  await expect(classChoice).toBeFocused();
  await expect(classChoice).toBeChecked();
  expect(await classChoice.evaluate((control) => {
    const style = window.getComputedStyle(control);
    return `${style.outlineStyle} ${style.outlineWidth}`;
  })).not.toMatch(/^none| 0px$/u);
  await page.keyboard.press('Tab');
  await expect(advancedPlanner).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(next).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(cancel).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Review level gains' })).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Back' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Next' })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByRole('heading', { name: 'Choose a feat' })).toBeFocused();

  const zeroPointFeat = page.getByRole('radio', {
    name: 'Alert: No ability increase',
  });
  await pressTabUntilFocused(page, zeroPointFeat, 10);
  await expect(zeroPointFeat).toHaveAccessibleDescription(/SRD · bundled layer/u);
  await page.keyboard.press('Space');
  await expect(zeroPointFeat).toBeChecked();
  const featNext = page.getByRole('button', { name: 'Next' });
  await pressTabUntilFocused(page, featNext, 80);
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Review', exact: true }),
  ).toBeFocused();
});

test('W-INCOMPLETE classless cards explain the advanced door while held-class warnings repeat without blocking', async ({
  page,
}) => {
  await page.goto('/');
  await ready(page);
  const classlessId = await page.evaluate(async () => {
    await window.staticApp.reset();
    const row = await window.staticApp.writeCharacter('Classless Entry');
    return Number(row.id);
  });
  await page.reload();
  await ready(page);
  const classlessSeam = await readLevelUpSeam(page, classlessId);
  await page
    .locator('.character-card')
    .filter({ has: page.getByRole('heading', { name: 'Classless Entry' }) })
    .getByRole('link', { name: 'Level Up' })
    .click();
  await expect(page).toHaveURL(new URL(classlessSeam.path, page.url()).href);
  await expect(
    page.getByRole('heading', { name: 'This character has no held class' }),
  ).toBeVisible();
  await expect(page.getByRole('link', {
    name: 'Advanced: open planner',
  })).toHaveAttribute('href', `/characters/${String(classlessId)}`);
  await expect(page.locator('[data-level-up-confirm]')).toHaveCount(0);

  const held = await createFighter(page, 'Unfinished Fighter');
  const heldSeam = await readLevelUpSeam(page, held.id);
  await page.goto(heldSeam.path);
  // The four-worker pool measured this test at 19.2s; 50s gives both
  // load-sensitive held-class waits at least 2.5x pool headroom.
  await expect(
    page.getByRole('heading', { name: `Level up — ${held.name}` }),
  ).toBeFocused({ timeout: 50_000 });
  await expect(
    page.getByRole('heading', { name: 'Choose a held class' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'This character has no held class' }),
  ).toHaveCount(0);
  const classWarnings = await page
    .locator('[data-level-up-warning] strong')
    .allTextContents();
  expect(classWarnings.length).toBeGreaterThan(0);

  await page.locator('[data-level-up-next]').click();
  await page.locator('[data-level-up-next]').click();
  await expect(
    page.getByRole('heading', { name: 'Review', exact: true }),
  ).toBeFocused();
  await expect(page.locator('[data-level-up-confirm]')).toBeEnabled({
    timeout: 50_000,
  });
  expect(
    await page.locator('[data-level-up-warning] strong').allTextContents(),
  ).toEqual(expect.arrayContaining(classWarnings));
});

test('W-DOUBLE-CONFIRM two rapid activations create one level, revision, history operation, and UUID', async ({
  page,
}) => {
  // The four-worker parallel pool measured 12.2s; 35s preserves at least 2.5x
  // wall-clock headroom under parallel-pool contention.
  test.setTimeout(35_000);
  const character = await createFighter(page, 'Atomic Confirm Fighter');
  expect(character.revision).toBe(0);
  await openReadyReview(page, character);

  const confirm = page.locator('[data-level-up-confirm]');
  await confirm.evaluate((control) => {
    if (!(control instanceof HTMLButtonElement)) {
      throw new Error('Confirm control was not a button.');
    }
    control.click();
    control.click();
  });

  await expect(
    page.getByRole('heading', { name: 'Fighter level 2 complete' }),
  ).toBeFocused({ timeout: 35_000 });
  await expect(page.getByText('Open character sheet')).toBeVisible();
  await expect(page.getByText('Download a backup', { exact: false })).toHaveCount(0);

  const characters = await rows(page, 'characters');
  expect(characters).toEqual([
    expect.objectContaining({ id: character.id, revision: 1 }),
  ]);
  expect(await rows(page, 'character_class_levels')).toEqual([
    expect.objectContaining({
      character_id: character.id,
      level: 2,
    }),
  ]);
  const operations = await rows(page, 'character_operations');
  expect(operations).toHaveLength(1);
  expect(operations[0]).toEqual(expect.objectContaining({
    character_id: character.id,
    expected_revision: 0,
    resulting_revision: 1,
  }));
  expect(String(operations[0]?.['operation_uuid'])).toMatch(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu,
  );
  const history = await page.evaluate((characterId) =>
    window.appRpc.call<
      { readonly character_id: number },
      {
        readonly operations: readonly { readonly operation_uuid: string }[];
        readonly changes: readonly { readonly operation_uuid: string | null }[];
      }
    >('queries.history.read', { character_id: characterId }), character.id);
  expect(history.operations).toHaveLength(1);
  const historyOperation = history.operations[0];
  if (historyOperation === undefined) {
    throw new Error('Committed level up had no history operation.');
  }
  expect(new Set(
    history.changes.map((change) => change.operation_uuid).filter(
      (operationUuid): operationUuid is string => operationUuid !== null,
    ),
  )).toEqual(new Set([historyOperation.operation_uuid]));
});

test('W-BROWSER-PLANNED-DRAFT carries planned_subchoices from UI through Review and Complete', async ({
  page,
}) => {
  // The four-worker parallel pool measured 17.4s including the post-commit
  // sheet; 45s preserves at least 2.5x headroom under pool contention.
  test.setTimeout(45_000);
  await installAnnouncementRecorder(page);
  const character = await createCharacter(page, 'Planned Wizard', 'Wizard');
  await completeWizardLevelOneChoices(page, character.id);
  await openWizardPlannedReview(page, character);

  for (const text of [
    'Thunderwave — Wizard — SRD · bundled layer',
    'Chromatic Orb — Wizard — SRD · bundled layer',
    'Comprehend Languages — Wizard — SRD · bundled layer',
    'Arcana — Wizard — Scholar',
    'Scholar',
  ]) {
    await expect(page.getByText(text, { exact: true })).toBeVisible();
  }
  await clearAnnouncements(page);
  await page.locator('[data-level-up-confirm]').focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => announcedMessages(page)).toContain(
    'Submitting this level-up operation…',
  );
  await expect(
    page.getByRole('heading', { name: 'Wizard level 2 complete' }),
  ).toBeFocused({ timeout: 45_000 });
  await expect(page.locator('.level-up-route')).toHaveAttribute('aria-busy', 'false');
  for (const name of ACCEPTANCE_WIZARD_2_CHOICES.spells.map(
    (choice) => choice.spell_name,
  )) {
    await expect(page.getByText(
      `Spell: ${name} — Wizard — SRD · bundled layer.`,
      { exact: true },
    )).toBeVisible();
  }

  expect(await rows(page, 'character_class_levels')).toEqual([
    expect.objectContaining({ character_id: character.id, level: 2 }),
  ]);
  const prepared = await rows(page, 'spell_selection_slots');
  expect(prepared).toContainEqual(expect.objectContaining({
    character_id: character.id,
    rule_key: 'wizard-prepared',
    ordinal: 5,
    current_spell_version_id: expect.any(Number),
  }));
  const spellbook = await rows(page, 'wizard_spellbook_entries');
  expect(spellbook).toEqual(expect.arrayContaining([
    expect.objectContaining({
      character_id: character.id,
      rule_key: 'wizard-spellbook',
      ordinal: 7,
      spell_version_id: expect.any(Number),
    }),
    expect.objectContaining({
      character_id: character.id,
      rule_key: 'wizard-spellbook',
      ordinal: 8,
      spell_version_id: expect.any(Number),
    }),
  ]));

  await page.goto(`/characters/${String(character.id)}/sheet`);
  const spellSection = page.getByRole('heading', {
    name: 'Spells',
    exact: true,
  }).locator('..');
  for (const choice of ACCEPTANCE_WIZARD_2_CHOICES.spells) {
    const bucket = choice.kind === 'spellbook_acquisition'
      ? spellSection.locator('[data-sheet-id^="spellbook:class:"]', {
          hasText: choice.spell_name,
        })
      : spellSection.locator('[data-sheet-id^="spell:class:"]', {
          hasText: choice.spell_name,
        });
    await expect(bucket).toContainText(
      `${choice.spell_name}Level 1${choice.kind === 'spellbook_acquisition' ? 'Spellbook' : 'Prepared'}`,
    );
  }
});

test('W-BROWSER-LU2-ROLLBACK a UI draft refused at its locator restores every database byte', async ({
  page,
}) => {
  test.setTimeout(40_000);
  const character = await createCharacter(page, 'Rollback Wizard', 'Wizard');
  await completeWizardLevelOneChoices(page, character.id);
  await openWizardPlannedReview(page, character);
  const before = await databaseDigest(page);
  const operationCountBefore = (await rows(page, 'character_operations')).length;

  await page.evaluate(() => {
    const rpc = window.appRpc;
    const originalCall = rpc.call.bind(rpc);
    rpc.call = ((method: string, params: unknown) => {
      if (
        method !== 'commands.execute' ||
        params === null ||
        typeof params !== 'object'
      ) {
        return originalCall(method, params);
      }
      const request = structuredClone(params) as {
        command?: {
          planned_subchoices?: {
            spells?: { locator?: { rule_key?: string } }[];
          };
        };
      };
      const lateSpell = request.command?.planned_subchoices?.spells?.at(-1);
      if (lateSpell?.locator !== undefined) {
        lateSpell.locator.rule_key = 'ui-induced-missing-rule';
      }
      return originalCall(method, request);
    }) as typeof rpc.call;
  });
  await page.locator('[data-level-up-confirm]').click();

  const alert = page.getByRole('alert');
  await expect(alert).toContainText('subchoice_kind: spell');
  await expect(alert).toContainText('index: 2');
  await expect(alert).toContainText('issue: locator_not_found');
  await expect(alert).toContainText(
    'locator: source=selected_class, rule_key=ui-induced-missing-rule, ordinal=8',
  );
  await expect(page.locator('.level-up-route')).toHaveAttribute('aria-busy', 'false');
  expect(await databaseDigest(page)).toBe(before);
  expect(await rows(page, 'character_operations')).toHaveLength(operationCountBefore);
  expect(await rows(page, 'character_class_levels')).toEqual([
    expect.objectContaining({ character_id: character.id, level: 1 }),
  ]);
});

test('W-STALE external edit after Preview keeps the draft and requires explicit reload without levelling', async ({
  page,
}) => {
  // The four-worker parallel pool measured 12.0s; 30s preserves 2.5x
  // wall-clock headroom under parallel-pool contention.
  test.setTimeout(30_000);
  const character = await createFighter(page, 'Stale Review Fighter');
  await openReadyReview(page, character);
  const externalOperation = '40404040-4040-4040-8040-404040404040';

  await page.evaluate(async ({ characterId, operationUuid }) => {
    await window.appRpc.call('commands.execute', {
      character_id: characterId,
      operation_uuid: operationUuid,
      expected_revision: 0,
      command: {
        type: 'update_ability',
        ability: 'wisdom',
        score: 11,
        reason: 'W-STALE external edit',
      },
    });
  }, { characterId: character.id, operationUuid: externalOperation });

  await page.locator('[data-level-up-confirm]').click();
  await expect(page.getByRole('alert')).toContainText('changed elsewhere');
  await expect(page.locator('[data-level-up-confirm]')).toHaveCount(0);
  const reload = page.getByRole('button', { name: 'Reload level-up state' });
  await expect(reload).toBeVisible();

  expect(await rows(page, 'character_class_levels')).toEqual([
    expect.objectContaining({ character_id: character.id, level: 1 }),
  ]);
  expect(await rows(page, 'characters')).toEqual([
    expect.objectContaining({
      id: character.id,
      wisdom: 11,
      revision: 1,
    }),
  ]);
  expect(await rows(page, 'character_operations')).toEqual([
    expect.objectContaining({ operation_uuid: externalOperation }),
  ]);

  await reload.click();
  await expect(
    page.getByRole('heading', { name: `Level up — ${character.name}` }),
  ).toBeFocused({ timeout: 30_000 });
  expect(await rows(page, 'character_class_levels')).toEqual([
    expect.objectContaining({ character_id: character.id, level: 1 }),
  ]);
  expect(await rows(page, 'character_operations')).toHaveLength(1);
});
