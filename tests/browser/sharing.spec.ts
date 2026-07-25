import { gunzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

async function ready(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 30_000 },
  );
}

test('switching characters invalidates the previously generated share link', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const calls: ShareData[] = [];
    Object.defineProperty(window, '__nativeShareCalls', {
      configurable: true,
      value: calls,
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: (data: ShareData) => {
        calls.push(structuredClone(data));
        return Promise.resolve();
      },
    });
  });
  await page.goto('/');
  await ready(page);
  await page.evaluate(async () => {
    await window.staticApp.reset();
    await window.staticApp.writeCharacter('Character A');
    await window.staticApp.writeCharacter('Character B');
  });
  await page.reload();
  await ready(page);

  await page
    .getByRole('button', { name: 'Share Character A by link' })
    .click();
  await page.getByRole('button', { name: 'Create share link' }).click();
  const output = page.getByLabel('Generated character share link');
  await expect(output).toBeVisible();
  const characterALink = await output.inputValue();
  expect(characterALink).toContain('#');

  await page
    .getByRole('button', { name: 'Share Character B by link' })
    .click();
  const nativeShare = page.getByRole('button', { name: 'Share…' });
  if (await nativeShare.isVisible()) {
    await nativeShare.click();
  }
  const calls = await page.evaluate(
    () => Reflect.get(window, '__nativeShareCalls') as ShareData[],
  );

  await expect.soft(output).toHaveValue('');
  await expect.soft(nativeShare).toBeHidden();
  expect(calls).toEqual([]);
});

test('creates, independently verifies, previews, and explicitly imports a durable share link', async ({
  browser,
  page,
}) => {
  await page.goto('/');
  await ready(page);
  await page.evaluate(async () => {
    await window.staticApp.reset();
    await window.staticApp.writeCharacter('Journey Hero 🧙');
  });
  await page.reload();
  await ready(page);

  await page
    .getByRole('button', { name: 'Share Journey Hero 🧙 by link' })
    .click();
  await page.getByRole('button', { name: 'Create share link' }).click();
  const output = page.getByLabel('Generated character share link');
  await expect(output).toBeVisible();
  const link = await output.inputValue();
  const fragment = new URL(link).hash.slice(1);
  const positional = JSON.parse(
    gunzipSync(Buffer.from(fragment, 'base64url')).toString('utf8'),
  ) as unknown[];
  expect(positional[0]).toBe('dnd-multiclass-spells-character-share');
  expect(positional[1]).toBe(1);
  expect((positional[2] as unknown[])[0]).toBe('Journey Hero 🧙');
  expect(positional.slice(3, 9)).toEqual([[], [], [], [], [], []]);

  const freshProfile = await browser.newContext();
  try {
    const freshPage = await freshProfile.newPage();
    await freshPage.goto(link);
    await ready(freshPage);
    await expect(
      freshPage.getByRole('heading', { name: 'Journey Hero 🧙' }),
    ).toBeVisible();
    expect(
      await freshPage.evaluate(() =>
        window.staticApp.inspectRows('characters'),
      ),
    ).toEqual([]);

    await freshPage
      .getByRole('button', { name: 'Add to my characters' })
      .click();
    await expect(freshPage.locator('.share-status')).toContainText(
      'Character added as #1.',
    );
    expect(
      await freshPage.evaluate(() =>
        window.staticApp.inspectRows('characters'),
      ),
    ).toEqual([
      expect.objectContaining({ id: 1, name: 'Journey Hero 🧙' }),
    ]);

    await freshPage.reload();
    await ready(freshPage);
    await expect(
      freshPage.getByRole('button', { name: 'Add to my characters' }),
    ).toBeVisible();
    expect(
      await freshPage.evaluate(() =>
        window.staticApp.inspectRows('characters'),
      ),
    ).toHaveLength(1);
    await freshPage
      .getByRole('button', { name: 'Add to my characters' })
      .click();
    await expect(freshPage.locator('.share-status')).toContainText(
      'Character added as #2.',
    );
    expect(
      await freshPage.evaluate(() =>
        window.staticApp.inspectRows('characters'),
      ),
    ).toEqual([
      expect.objectContaining({ id: 1, name: 'Journey Hero 🧙' }),
      expect.objectContaining({ id: 2, name: 'Journey Hero 🧙' }),
    ]);

    await freshPage.goto('/');
    await ready(freshPage);
    expect(
      await freshPage.evaluate(() =>
        window.staticApp.inspectRows('characters'),
      ),
    ).toHaveLength(2);
    await expect(
      freshPage.getByRole('heading', { name: 'Journey Hero 🧙' }),
    ).toHaveCount(2);
  } finally {
    await freshProfile.close();
  }
});
