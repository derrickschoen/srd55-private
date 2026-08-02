import { expect, test, type Page } from '@playwright/test';
import {
  ACCEPTANCE_WIZARD_2_CHOICES,
} from './fixtures/level-up-characters';

interface CreatedCharacter {
  readonly id: number;
  readonly name: string;
  readonly revision: number;
}

interface StoredRow {
  readonly [key: string]: unknown;
}

async function ready(page: Page): Promise<void> {
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
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
  await input.fill(spellName);
  const option = page.getByRole('option').filter({ hasText: spellName });
  await expect(option).toBeVisible({ timeout: 10_000 });
  await option.click();
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

async function openWizardPlannedReview(
  page: Page,
  character: CreatedCharacter,
): Promise<void> {
  await page.goto(`/characters/${String(character.id)}/level-up`);
  await expect(
    page.getByRole('heading', { name: `Level up — ${character.name}` }),
  ).toBeFocused({ timeout: 30_000 });
  await page.locator('[data-level-up-next]').click();
  await expect(page.getByRole('heading', { name: 'Gains' })).toBeFocused();
  await page.locator('[data-level-up-next]').click();
  await expect(page.getByRole('heading', { name: 'Choose Expertise' })).toBeFocused();
  await page.locator('[data-level-up-expertise-choice]').selectOption('arcana');
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
    timeout: 30_000,
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
  await expect(
    page.getByRole('heading', { name: `Level up — ${character.name}` }),
  ).toBeFocused({ timeout: 30_000 });
  await page.locator('[data-level-up-next]').click();
  await expect(page.getByRole('heading', { name: 'Gains' })).toBeFocused();
  await page.locator('[data-level-up-next]').click();
  await expect(
    page.getByRole('heading', { name: 'Review', exact: true }),
  ).toBeFocused();
  await expect(page.locator('[data-level-up-confirm]')).toBeEnabled({
    timeout: 30_000,
  });
}

async function rows(page: Page, table: string): Promise<readonly StoredRow[]> {
  return page.evaluate(
    (tableName) => window.staticApp.inspectRows(tableName),
    table,
  );
}

test('W-DOUBLE-CONFIRM two rapid activations create one level, revision, history operation, and UUID', async ({
  page,
}) => {
  // Measured 9.0s in isolation on 2026-08-02.
  test.setTimeout(20_000);
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
  ).toBeFocused({ timeout: 30_000 });
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
  test.setTimeout(40_000);
  const character = await createCharacter(page, 'Planned Wizard', 'Wizard');
  await completeWizardLevelOneChoices(page, character.id);
  await openWizardPlannedReview(page, character);

  for (const text of [
    'Thunderwave — Wizard',
    'Chromatic Orb — Wizard',
    'Comprehend Languages — Wizard',
    'Arcana — Wizard — Scholar',
    'Scholar',
  ]) {
    await expect(page.getByText(text, { exact: true })).toBeVisible();
  }
  await page.locator('[data-level-up-confirm]').click();
  await expect(
    page.getByRole('heading', { name: 'Wizard level 2 complete' }),
  ).toBeFocused({ timeout: 30_000 });
  await expect(page.locator('.level-up-route')).toHaveAttribute('aria-busy', 'false');
  for (const name of ACCEPTANCE_WIZARD_2_CHOICES.spells.map(
    (choice) => choice.spell_name,
  )) {
    await expect(page.getByText(`Spell: ${name} — Wizard.`, { exact: true })).toBeVisible();
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
  // Measured 9.2s in isolation on 2026-08-02.
  test.setTimeout(20_000);
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
