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
  const createLink = page.getByRole('button', { name: 'Create share link' });
  await expect(createLink).toBeFocused();
  await createLink.click();
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

  // ALL THREE OPT-INS ARE PRESENT AND ALL THREE START OFF. The default is not
  // cosmetic: a link minted before any of them existed carries none of them, so
  // the box a user never touches has to produce that same link. The notes box
  // is the one this asserts hardest, because it is the only option guarding
  // text a person wrote about themselves.
  for (const label of [
    'Include warning acknowledgements',
    'Include loadouts',
    'Include my notes about this character',
  ]) {
    await expect(page.getByLabel(label)).not.toBeChecked();
  }

  await page.getByRole('button', { name: 'Create share link' }).click();
  const output = page.getByLabel('Generated character share link');
  await expect(output).toBeVisible();
  const link = await output.inputValue();
  const fragment = new URL(link).hash.slice(1);
  const positional = JSON.parse(
    gunzipSync(Buffer.from(fragment, 'base64url')).toString('utf8'),
  ) as unknown[];
  expect(positional[0]).toBe('dnd-multiclass-spells-character-share');
  // v14: B1 minted v3 (allocation signal), B2 minted v4 (contribution
  // effects), skills-with-provenance S-A minted v5 (skill grants, retiring
  // every pre-v5 document per D60), starting-equipment E-A minted v6 (the
  // weapon/armour `sourceRef` append), D69 minted v7 (that append dropped —
  // weapons carry no provenance), and AC-1 (D72) minted v8 (the
  // armor_class_formula/weapon-scope effect payload plus the new `items`
  // root element). AC-2b minted v9: the effect tuple appends `itemRef`,
  // `weaponRef`, and `template_ref` (arity 20), while the source tuple appends
  // `generated` (arity 7), encoding a generated-only species source exactly as
  // type `species`, key NULL, generated TRUE. AC-4 minted v10: the sheet tuple
  // drops the retired `sheetAdjustment` fourth field and has arity 3. D92
  // minted v11: item tuples drop `attuned` and have arity 4, while the root
  // appends a fixed three-position attunement tuple and has arity 19. D86
  // minted v12: item tuples append positive-integer quantity at arity 5. D83
  // minted v13 for the newly accepted ability_override kind without changing
  // every tuple arity. GF-1 minted v14: selection tuples append
  // acquiredAtClassLevel at arity 7, and root spellbook members become
  // six-field addressable acquisition tuples carrying ref, rule, ordinal,
  // acquisition level, nullable spell key, and nullable fallback name. GF-2
  // mints v15 by appending the Expertise-grant collection at the root.
  expect(positional[1]).toBe(15);
  expect((positional[2] as unknown[])[0]).toBe('Journey Hero 🧙');
  // TWELVE since v3, with the notes slot still NULL when nobody ticks the
  // notes box, and the appended ability_allocation_method NULL for a
  // character whose scores were never allocated — every earlier position
  // keeps its meaning; versions only append.
  expect(positional[2]).toHaveLength(12);
  expect((positional[2] as unknown[])[10]).toBeNull();
  expect((positional[2] as unknown[])[11]).toBeNull();
  expect(positional.slice(3, 9)).toEqual([[], [], [], [], [], []]);
  // V10 always writes the three-field sheet tuple. This blank character has no
  // armour, hit point rolls, or skill proficiencies, so all three are NULL.
  expect(positional[13]).toEqual([null, null, null]);
  // Placeholders keep their frozen sixteenth slot; v5 appends skillGrants as
  // the seventeenth, NULL for a character with no grants, and AC-1 appends
  // `items` as the eighteenth, NULL for a character with none. V9 grows the
  // nested effect and source tuples; v10 shrinks only the nested sheet tuple
  // from arity 4 to 3. V11 appends `attunementSlots` as the nineteenth root
  // position, NULL when all three fixed positions are empty. V15 appends
  // Expertise grants as the twentieth root position. Absent data is an
  // occupied null slot, never a shorter tuple.
  expect(positional).toHaveLength(20);
  expect(positional[15]).toBeNull();
  expect(positional[16]).toBeNull();
  expect(positional[17]).toBeNull();
  expect(positional[18]).toBeNull();
  expect(positional[19]).toBeNull();

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
