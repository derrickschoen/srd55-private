import { expect, test } from '@playwright/test';

async function persistedCharacter(
  page: import('@playwright/test').Page,
) {
  return page.evaluate(() =>
    window.staticApp.inspectRows('characters', { id: 1 }),
  );
}

test('planner editors, history, focus, keyboard, and responsive state persist', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
  await page.evaluate(async () => {
    await window.staticApp.reset();
    await window.staticApp.writeCharacter('Browser Planner');
  });
  await page.goto('/characters/1');
  await expect(page.locator('#planner-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
  await expect(
    page.getByRole('heading', { name: 'Browser Planner' }),
  ).toBeVisible();

  const wisdom = page.locator('[data-focus-key="ability-wisdom"]');
  await wisdom.fill('17');
  await wisdom.press('Enter');
  await expect
    .poll(persistedCharacter.bind(null, page))
    .toEqual([
      expect.objectContaining({ wisdom: 17, revision: 1 }),
    ]);
  await expect(wisdom).toBeFocused();

  const legacy = page.locator('[data-focus-key="allow-legacy"]');
  await legacy.click();
  await expect
    .poll(persistedCharacter.bind(null, page))
    .toEqual([
      expect.objectContaining({
        wisdom: 17,
        allow_legacy: 1,
        revision: 2,
      }),
    ]);
  await expect(legacy).toBeFocused();

  await page.getByRole('button', { name: '↶ Undo' }).click();
  await expect
    .poll(persistedCharacter.bind(null, page))
    .toEqual([
      expect.objectContaining({
        allow_legacy: 0,
        revision: 3,
      }),
    ]);
  await expect(page.getByText('Level 0 · revision 3')).toBeVisible();

  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('Control+Shift+Z');
  await expect
    .poll(persistedCharacter.bind(null, page))
    .toEqual([
      expect.objectContaining({
        allow_legacy: 1,
        revision: 4,
      }),
    ]);
  await expect(page.getByText('Level 0 · revision 4')).toBeVisible();

  await page
    .locator('[data-focus-key="save-point-label"]')
    .fill('Before browser experiment');
  await page.getByRole('button', { name: 'Save snapshot' }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.staticApp.inspectRows('character_save_points', {
          character_id: 1,
        }),
      ),
    )
    .toEqual([
      expect.objectContaining({ label: 'Before browser experiment' }),
    ]);

  await page.setViewportSize({ width: 375, height: 760 });
  await expect(page.locator('.planner-layout')).toHaveCSS(
    'grid-template-columns',
    '351px',
  );
  await expect(page.getByText('No slots match these filters')).toBeVisible();

  await page.reload();
  await expect(page.locator('#planner-status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
  await expect
    .poll(persistedCharacter.bind(null, page))
    .toEqual([
      expect.objectContaining({
        wisdom: 17,
        allow_legacy: 1,
        revision: 4,
      }),
    ]);
  await expect(
    page.getByText('Before browser experiment'),
  ).toBeVisible();
});
