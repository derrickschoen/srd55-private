import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/parallel-test';

interface CreatedCharacter {
  readonly id: number;
  readonly revision: number;
}

const REQUIREMENT_DETAIL =
  'Wizard requires Intelligence 13 to multiclass; its current score is Intelligence 10.';

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

test('an ineligible multiclass is refused by the level-up escape and command gate while an eligible one proceeds', async ({
  page,
}) => {
  // Measured at 11.9s on the required port-5010 run; 11.9 × 1.5 = 17.85s,
  // rounded up to the next 100ms.
  test.setTimeout(17_900);
  const character = await createCleric(page);
  await page.goto(`/characters/${String(character.id)}/level-up`);
  await expect(
    page.getByRole('heading', { name: 'Choose a held class' }),
  ).toBeVisible({ timeout: 45_000 });
  await page.getByRole('link', { name: 'Take a level in a new class' }).click();
  await expect(page.locator('#planner-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 45_000 },
  );

  const classSelect = page.getByRole('combobox', { name: 'Class to add' });
  const wizardOption = classSelect.locator('option').filter({ hasText: 'Wizard' });
  await expect(wizardOption).toBeDisabled();
  await expect(page.locator('.class-add-prerequisite-refusals')).toContainText(
    `Cannot add Wizard. ${REQUIREMENT_DETAIL}`,
  );
  const addClass = page.getByRole('button', { name: 'Add class', exact: true });
  await expect(addClass).toBeDisabled();

  const commandRefusal = await page.evaluate(async (characterId) => {
    const classes = await window.staticApp.inspectRows('class_definitions');
    const wizard = classes.find((entry) => entry['name'] === 'Wizard');
    const characterRows = await window.staticApp.inspectRows('characters', {
      id: characterId,
    });
    try {
      await window.appRpc.call('commands.execute', {
        character_id: characterId,
        operation_uuid: crypto.randomUUID(),
        expected_revision: Number(characterRows[0]?.['revision']),
        command: {
          type: 'update_class',
          class_definition_id: Number(wizard?.['id']),
          subclass_definition_id: null,
        },
      });
      return 'admitted';
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }, character.id);
  expect(commandRefusal).toContain(`Cannot add Wizard. ${REQUIREMENT_DETAIL}`);
  expect(
    (await page.evaluate(() =>
      window.staticApp.inspectRows('character_class_levels')
    )).filter((row) => Number(row['character_id']) === character.id),
  ).toHaveLength(1);

  const intelligence = page.locator('[data-focus-key="ability-intelligence"]');
  await intelligence.fill('13');
  await intelligence.blur();
  await expect(wizardOption).toBeEnabled();
  await classSelect.selectOption({ label: 'Wizard' });
  await expect(addClass).toBeEnabled();
  await addClass.click();
  await expect(page.getByLabel('Remove Wizard')).toBeEnabled();
  await expect.poll(async () =>
    (await page.evaluate(() =>
      window.staticApp.inspectRows('character_class_levels')
    )).filter((row) => Number(row['character_id']) === character.id).length
  ).toBe(2);
});
