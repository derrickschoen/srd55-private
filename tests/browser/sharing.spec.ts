import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { DatabaseContext } from '../../src/db/database';
import { CatalogImporter } from '../../src/catalog/catalog-importer';
import { expect, test } from './fixtures/parallel-test';

const schema = readFileSync(
  new URL('../../src/db/schema.sql', import.meta.url),
  'utf8',
);

async function authoredShareImage(): Promise<readonly number[]> {
  const sqlite3 = await sqlite3InitModule();
  const connection = new sqlite3.oo1.DB(':memory:', 'c');
  connection.exec(schema);
  const db = new DatabaseContext(connection);
  const characterId = db.exec(
    `INSERT INTO characters (name) VALUES ('Oversized Hero')`,
  ).lastInsertId;
  let seed = 0x2f6e2b1;
  const noise = (length: number): string => {
    let result = '';
    for (let index = 0; index < length; index += 1) {
      seed ^= seed << 13;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      result += String.fromCharCode(33 + (Math.abs(seed) % 94));
    }
    return result;
  };
  for (let index = 0; index < 60; index += 1) {
    db.exec(
      `INSERT INTO character_weapons
       (character_id, name, other_properties, notes)
       VALUES (?, ?, ?, ?)`,
      [characterId, `Blade ${index}`, noise(500), noise(2_000)],
    );
  }
  const speciesDocument = (
    name: string,
    traits: readonly { readonly name: string; readonly description: string }[],
  ) => JSON.stringify([{ kind: 'species', aggregate: {
    kind: 'species',
    name,
    rules_edition: 'expanded',
    reference_text: `${name} reference.`,
    repeatable: false,
    creature_type: 'Chronal Being',
    primary_size: 'Medium',
    alternate_size: null,
    walking_speed_feet: 30,
    grants: [],
    traits: traits.map((trait, index) => ({
      ...trait,
      sort_order: index + 1,
      effects: [],
    })),
  } }]);
  const importer = new CatalogImporter(db);
  importer.import({
    documents: [speciesDocument('Portable Fit Species', [{
      name: 'Pocket Chronicle',
      description: 'This small authored aggregate fits in a share link.',
    }])],
  });
  importer.import({
    documents: [speciesDocument(
      'Oversized Portable Species',
      Array.from({ length: 100 }, (_, index) => ({
        name: `Chronicle ${String(index + 1)}`,
        description: noise(3_500),
      })),
    )],
  });
  const addSpeciesCharacter = (name: string, contentKey: string): void => {
    const speciesId = db.scalar<number>(
      'SELECT id FROM species_definitions WHERE content_key = ?',
      [contentKey],
    );
    if (speciesId === null) throw new Error(`Missing browser fixture ${contentKey}.`);
    const id = db.exec('INSERT INTO characters (name) VALUES (?)', [name])
      .lastInsertId;
    db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name, acquired_at_character_level
       ) VALUES (?, ?, 'species', ?, ?, 1)`,
      [id, `${name.toLowerCase().replaceAll(' ', '-')}-source`, speciesId,
        contentKey.includes('oversized')
          ? 'Oversized Portable Species'
          : 'Portable Fit Species'],
    );
  };
  addSpeciesCharacter(
    'Portable Fit Hero',
    'expanded:content.species:portable-fit-species',
  );
  addSpeciesCharacter(
    'Omitted Content Hero',
    'expanded:content.species:oversized-portable-species',
  );
  const bytes = Array.from(sqlite3.capi.sqlite3_js_db_export(connection));
  connection.close();
  return bytes;
}

async function ready(page: import('@playwright/test').Page): Promise<void> {
  // The four-worker pool measured this file's slowest caller at 23.7s; 60s
  // gives this load-sensitive readiness wait at least 2.5x pool headroom.
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 60_000 },
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
  // the box a user never touches has to produce that same link. The written
  // text box names everything its consent can expose.
  for (const label of [
    'Include warning acknowledgements',
    'Include loadouts',
    'Include my written text (alignment, appearance, backstory, notes)',
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
  // mints v15 by appending the Expertise-grant collection at the root. LU-1
  // mints v16 by appending durable class-level feat occurrences. D104 mints
  // v17 by appending alignment, appearance, and backstory to the character.
  // v18 appended portable authored content; v19 appends the sender's stable
  // document identity so a later delivery can be reviewed as an update.
  expect(positional[1]).toBe(19);
  expect((positional[2] as unknown[])[0]).toBe('Journey Hero 🧙');
  // FIFTEEN since v17, with notes and the allocation signal still in their
  // frozen positions, followed by three null flavor absences.
  expect(positional[2]).toHaveLength(15);
  expect((positional[2] as unknown[])[10]).toBeNull();
  expect((positional[2] as unknown[])[11]).toBeNull();
  expect((positional[2] as unknown[]).slice(12)).toEqual([null, null, null]);
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
  // Expertise grants as the twentieth root position. V16 appends level feat
  // choices as the twenty-first. Absent data is an
  // occupied null slot, never a shorter tuple.
  expect(positional).toHaveLength(23);
  expect(positional[15]).toBeNull();
  expect(positional[16]).toBeNull();
  expect(positional[17]).toBeNull();
  expect(positional[18]).toBeNull();
  expect(positional[19]).toBeNull();
  expect(positional[20]).toBeNull();
  expect(positional[21]).toBeNull();
  expect(positional[22]).toEqual({
    document_id: expect.any(String),
    revision: 0,
  });

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
    await expect(freshPage.getByText(
      'Update “Journey Hero 🧙” in place or keep both copies.',
      { exact: false },
    )).toBeVisible();
    await expect(freshPage.locator('.share-update-review')).toContainText(
      'Save points, party publication linkage, and private sections omitted from the link stay local.',
    );
    await expect(
      freshPage.getByRole('button', { name: 'Update existing character' }),
    ).toBeVisible();
    await expect(
      freshPage.getByRole('button', { name: 'Keep both characters' }),
    ).toBeVisible();
    expect(
      await freshPage.evaluate(() =>
        window.staticApp.inspectRows('characters'),
      ),
    ).toHaveLength(1);
    await freshPage.getByRole('button', { name: 'Keep both characters' }).click();
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

test('oversized share refusal exposes no link, copy, share, or QR output', async ({
  page,
}) => {
  const bytes = await authoredShareImage();
  await page.goto('/');
  await ready(page);
  await page.evaluate(
    (image) => window.staticApp.replaceDatabase(Uint8Array.from(image)),
    bytes,
  );
  await page.reload();
  await ready(page);

  await page
    .getByRole('button', { name: 'Share Oversized Hero by link' })
    .click();
  await page.getByRole('button', { name: 'Create share link' }).click();

  await expect(page.locator('.share-status')).toHaveText(
    'This character is too large to share as a link. Share links are limited to 131,072 encoded characters.',
  );
  const output = page.getByLabel('Generated character share link');
  await expect.soft(output).toBeHidden();
  await expect.soft(output).toHaveValue('');
  await expect.soft(page.getByRole('button', { name: 'Copy link' })).toBeHidden();
  await expect.soft(page.getByRole('button', { name: 'Share…' })).toBeHidden();
  await expect.soft(page.locator('.share-qr')).toBeHidden();
  await expect.soft(page.locator('.share-qr')).not.toHaveAttribute('src');
});

test('fits authored content into v19 and imports it with the dependent character', async ({
  browser,
  page,
}) => {
  const bytes = await authoredShareImage();
  await page.goto('/');
  await ready(page);
  await page.evaluate(
    (image) => window.staticApp.replaceDatabase(Uint8Array.from(image)),
    bytes,
  );
  await page.reload();
  await ready(page);

  await page.getByRole('button', { name: 'Share Portable Fit Hero by link' }).click();
  await page.getByRole('button', { name: 'Create share link' }).click();
  const output = page.getByLabel('Generated character share link');
  await expect(output).toBeVisible();
  await expect(page.locator('.share-status')).toHaveText(
    'Share link and QR code ready. Embedded external content: ' +
      'Portable Fit Species — species — Homebrew · external layer.',
  );
  const link = await output.inputValue();
  const positional = JSON.parse(gunzipSync(
    Buffer.from(new URL(link).hash.slice(1), 'base64url'),
  ).toString('utf8')) as unknown[];
  expect(positional[1]).toBe(19);
  expect(positional[21]).toMatchObject({
    content: [expect.objectContaining({
      kind: 'species',
      content_key: 'expanded:content.species:portable-fit-species',
    })],
    supersessions: [],
  });

  const freshProfile = await browser.newContext();
  try {
    const recipient = await freshProfile.newPage();
    await recipient.goto(link);
    await ready(recipient);
    await recipient.getByRole('button', { name: 'Add to my characters' }).click();
    await expect(recipient.locator('.share-status')).toContainText(
      'Character added as #1.',
    );
    expect(await recipient.evaluate(async () => ({
      characters: await window.staticApp.inspectRows('characters'),
      species: (await window.staticApp.inspectRows('species_definitions'))
        .filter((row) => row.content_key ===
          'expanded:content.species:portable-fit-species'),
    }))).toMatchObject({
      characters: [expect.objectContaining({ name: 'Portable Fit Hero' })],
      species: [expect.objectContaining({
        content_key: 'expanded:content.species:portable-fit-species',
      })],
    });
  } finally {
    await freshProfile.close();
  }
});

test('omits oversized content, preserves v19 identity, and the recipient refuses by name', async ({
  browser,
  page,
}) => {
  const bytes = await authoredShareImage();
  await page.goto('/');
  await ready(page);
  await page.evaluate(
    (image) => window.staticApp.replaceDatabase(Uint8Array.from(image)),
    bytes,
  );
  await page.reload();
  await ready(page);

  await page.getByRole('button', { name: 'Share Omitted Content Hero by link' }).click();
  await page.getByRole('button', { name: 'Create share link' }).click();
  const required = "species 'expanded:content.species:oversized-portable-species'";
  const warning = page.locator('.share-status');
  await expect(warning).toHaveText(
    `Share link ready without external content. The recipient must import ${required} before opening it.`,
  );
  const output = page.getByLabel('Generated character share link');
  await expect(output).toBeVisible();
  const link = await output.inputValue();
  const positional = JSON.parse(gunzipSync(
    Buffer.from(new URL(link).hash.slice(1), 'base64url'),
  ).toString('utf8')) as unknown[];
  expect(positional[1]).toBe(19);
  expect(positional).toHaveLength(23);
  expect(positional[21]).toBeNull();
  expect(positional[22]).toEqual({
    document_id: expect.any(String),
    revision: 0,
  });

  const freshProfile = await browser.newContext();
  try {
    const recipient = await freshProfile.newPage();
    await recipient.goto(link);
    await ready(recipient);
    await expect(recipient.locator('.share-status')).toContainText(required);
    await expect(recipient.locator('.share-status')).toContainText(
      `Import ${required}, then open the link again.`,
    );
    await expect(
      recipient.getByRole('button', { name: 'Add to my characters' }),
    ).toBeHidden();
    expect(await recipient.evaluate(() =>
      window.staticApp.inspectRows('characters')
    )).toEqual([]);
  } finally {
    await freshProfile.close();
  }
});
