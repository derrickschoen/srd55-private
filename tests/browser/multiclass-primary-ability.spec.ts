import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/parallel-test';

interface CreatedCharacter {
  readonly id: number;
  readonly revision: number;
}

const WARNING_DETAIL =
  'Wizard requires Intelligence 13 to multiclass; its current score is Intelligence 10.';
const WARNING_REMEDY =
  'Multiclassing remains allowed. Raise the named score to clear this permanent warning.';

async function ready(page: Page): Promise<void> {
  await expect(page.locator('#status')).toHaveAttribute('data-ready', 'true', {
    timeout: 45_000,
  });
}

async function createCleric(page: Page): Promise<CreatedCharacter> {
  await page.goto('/');
  await ready(page);
  return page.evaluate(async () => {
    await window.staticApp.reset();
    const classes = await window.appRpc.call<
      Record<string, never>,
      readonly { readonly content_key: string; readonly name: string }[]
    >('queries.characters.guidedClassOptions', {});
    const cleric = classes.find((candidate) => candidate.name === 'Cleric');
    if (cleric === undefined) throw new Error('Bundled Cleric was not found.');
    const created = await window.appRpc.call<
      { readonly name: string; readonly class_content_key: string },
      CreatedCharacter
    >('queries.characters.createGuided', {
      name: 'D96 browser character',
      class_content_key: cleric.content_key,
    });
    await window.appRpc.call('queries.characters.allocateAbilities', {
      character_id: created.id,
      method: 'manual',
      scores: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 13,
        charisma: 10,
      },
      operation_uuid: crypto.randomUUID(),
      expected_revision: created.revision,
    });
    return window.appRpc.call<
      { readonly character_id: number },
      CreatedCharacter
    >('queries.characters.get', { character_id: created.id });
  });
}

test('D96 warns without blocking on planner, level-up, and sheet, then clears at 13', async ({
  page,
}) => {
  // Measured at 20.5s alone on the required port-4970 run; 30.8s is x1.5,
  // rounded up to the next 100ms.
  test.setTimeout(30_800);
  const character = await createCleric(page);
  await page.goto(`/characters/${String(character.id)}`);
  await expect(page.locator('#planner-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 45_000 },
  );

  await expect(
    page.locator('[data-warning-kind="multiclass_primary_ability_unmet"]'),
  ).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Class to add' }).selectOption({
    label: 'Wizard',
  });
  const addClass = page.getByRole('button', { name: 'Add class', exact: true });
  await expect(addClass).toBeEnabled();
  await addClass.click();

  const plannerWarning = page.locator(
    '[data-warning-kind="multiclass_primary_ability_unmet"]',
  );
  await expect(plannerWarning).toHaveCount(1);
  await expect(plannerWarning).toContainText(WARNING_DETAIL);
  await expect(plannerWarning).toContainText(WARNING_REMEDY);
  await expect(page.getByLabel('Remove Wizard')).toBeEnabled();

  await page.goto(`/characters/${String(character.id)}/level-up`);
  await expect(
    page.getByRole('heading', { name: 'Choose a held class' }),
  ).toBeVisible({ timeout: 45_000 });
  const wizardRadio = page.getByRole('radio', { name: /Wizard 1 → 2/u });
  const clericRadio = page.getByRole('radio', { name: /Cleric 1 → 2/u });
  const wizardCard = wizardRadio.locator('..');
  const clericCard = clericRadio.locator('..');
  await expect(
    wizardCard.locator(
      '[data-level-up-warning="multiclass_primary_ability_unmet"]',
    ),
  ).toContainText(WARNING_DETAIL);
  await expect(
    clericCard.locator(
      '[data-level-up-warning="multiclass_primary_ability_unmet"]',
    ),
  ).toHaveCount(0);
  await expect(wizardRadio).toBeEnabled();

  await page.goto(`/characters/${String(character.id)}/sheet`);
  const sheetWarning = page.locator(
    '[data-warning-code="multiclass_primary_ability_unmet"]',
  );
  await expect(sheetWarning).toContainText(WARNING_DETAIL, { timeout: 45_000 });
  await expect(sheetWarning).toContainText(WARNING_REMEDY);

  await page.goto(`/characters/${String(character.id)}`);
  await expect(page.locator('#planner-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 45_000 },
  );
  const intelligence = page.locator('[data-focus-key="ability-intelligence"]');
  await intelligence.fill('13');
  await intelligence.blur();
  await expect(plannerWarning).toHaveCount(0);

  await page.goto(`/characters/${String(character.id)}/level-up`);
  await expect(
    page.getByRole('heading', { name: 'Choose a held class' }),
  ).toBeVisible({ timeout: 45_000 });
  await expect(
    page.locator(
      '[data-level-up-warning="multiclass_primary_ability_unmet"]',
    ),
  ).toHaveCount(0);

  await page.goto(`/characters/${String(character.id)}/sheet`);
  await expect(
    page.locator('[data-warning-code="multiclass_primary_ability_unmet"]'),
  ).toHaveCount(0, { timeout: 45_000 });
});
