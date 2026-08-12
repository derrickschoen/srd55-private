import { gunzipSync } from 'node:zlib';
import {
  LIBRARY_EXPORT_FORMAT,
  LIBRARY_EXPORT_VERSION,
  type LibraryExportDocument,
} from '../../src/backup/portable-content';
import type { SpeciesProjectorAggregateV2 } from '../../src/catalog/authored-content-projector-contract-v2';
import {
  CONTENT_FINGERPRINT_SCHEME_V2,
  deriveContentIdentityV2,
  type ContentFingerprintDigest,
  type ContentFingerprintScheme,
} from '../../src/catalog/content-identity';
import { projectSpeciesContentAggregateV2 } from '../../src/catalog/stored-authored-content-projector-v1';
import type { ContentKey } from '../../src/domain/ids';
import { expect, test } from './fixtures/parallel-test';

const OVERSIZED_PORTABLE_ELF_KEY =
  '2024:example.test.species:oversized-portable-elf' as ContentKey;
const PORTABLE_ELF_KEY =
  '2024:example.test.species:portable-elf' as ContentKey;
const HOSTILE_LIBRARY_SPECIES_NAME =
  '<img data-library-export-hostile src=x onerror=alert(1)> X1 Voyager';

interface RecipientFixture {
  readonly library: LibraryExportDocument;
  readonly collision: LibraryExportDocument;
  readonly legacy: LibraryExportDocument;
  readonly embedded: LibraryExportDocument;
}

function entropy(length: number): string {
  let seed = 0x51f15e;
  let output = '';
  for (let index = 0; index < length; index += 1) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    output += String.fromCharCode(33 + (Math.abs(seed) % 94));
  }
  return output;
}

function portableElfLibraryDocument(
  initialSpell: {
    readonly kind: 'spell';
    readonly scheme: ContentFingerprintScheme;
    readonly digest: ContentFingerprintDigest;
  },
  input: {
    readonly contentKey: ContentKey;
    readonly name: string;
    readonly oversized: boolean;
  },
): LibraryExportDocument {
  const aggregate = {
    kind: 'species',
    name: input.name,
    rules_edition: '2024',
    reference_text: input.oversized
      ? entropy(180_000)
      : 'A colliding portable configured-choice species.',
    repeatable: false,
    creature_type: 'Humanoid',
    primary_size: 'Medium',
    alternate_size: null,
    walking_speed_feet: 30,
    source_rules: [{
      kind: 'configured_choice',
      rule_key: 'elf-lineage',
      label: 'Elven Lineage',
      config_key: 'lineage.chosen_option',
      required: true,
      ability_choice: {
        config_key: 'spellcasting_ability',
        options: ['intelligence', 'wisdom', 'charisma'],
      },
      unknown_sheet_fields: ['darkvision_feet'],
      projected_trait_names: ['Darkvision'],
      options: [{
        value: 'High Elf',
        label: 'High Elf',
        sheet: { darkvision_feet: 60 },
        effects: [],
        grants: [],
        replaceable_spell_choice: {
          config_key: 'lineage.high_elf_cantrip',
          label: 'High Elf cantrip',
          required: true,
          spell_list: 'Wizard',
          spell_level: 0,
          initial_spell: initialSpell,
          display_on_sheet: true,
        },
      }],
    }],
    traits: [{
      sort_order: 1,
      name: 'Darkvision',
      description: 'High Elf choice supplies the exact range.',
      effects: [],
    }],
  } as SpeciesProjectorAggregateV2;
  const projected = projectSpeciesContentAggregateV2(aggregate);
  const identity = deriveContentIdentityV2({
    kind: 'species',
    edition: aggregate.rules_edition,
    name: aggregate.name,
    payload: projected.payload,
  });
  return {
    format: LIBRARY_EXPORT_FORMAT,
    version: LIBRARY_EXPORT_VERSION,
    exported_at: '2042-08-09T00:00:00.000Z',
    selection: 'selected',
    selected_content_keys: [input.contentKey],
    content: [{
      kind: 'species',
      content_key: input.contentKey,
      key_kind: 'asserted',
      fingerprint_scheme: CONTENT_FINGERPRINT_SCHEME_V2,
      fingerprint_digest: identity.digest,
      aggregate,
      provenance: {
        origin_kind: 'authored_here',
        received: false,
        local_derivation: false,
      },
    }],
    supersessions: [],
    lifecycle: [{
      content_kind: 'species',
      content_key: input.contentKey,
      archived_at: null,
    }],
  };
}

async function buildRecipientFixture(
  page: import('@playwright/test').Page,
): Promise<RecipientFixture> {
  const initialSpell = await page.evaluate(async () => {
    const fingerprints = await window.staticApp.inspectRows(
      'catalog_content_fingerprints',
    );
    const fingerprint = fingerprints.find((row) =>
      row.content_kind === 'spell' && row.content_key === '2024:prestidigitation' &&
      row.fingerprint_role === 'current'
    );
    if (fingerprint === undefined) {
      throw new Error('Bundled Prestidigitation fingerprint missing.');
    }
    return {
      kind: 'spell' as const,
      scheme: String(fingerprint.fingerprint_scheme),
      digest: String(fingerprint.fingerprint_digest),
    };
  });
  const reference = {
    ...initialSpell,
    scheme: initialSpell.scheme as ContentFingerprintScheme,
    digest: initialSpell.digest as ContentFingerprintDigest,
  };
  const library = portableElfLibraryDocument(reference, {
    contentKey: OVERSIZED_PORTABLE_ELF_KEY,
    name: 'Oversized Portable Elf',
    oversized: true,
  });
  const collision = portableElfLibraryDocument(reference, {
    contentKey: OVERSIZED_PORTABLE_ELF_KEY,
    name: 'Oversized Portable Elf',
    oversized: false,
  });
  const embedded = portableElfLibraryDocument(reference, {
    contentKey: PORTABLE_ELF_KEY,
    name: 'Portable Elf',
    oversized: false,
  });
  const legacyContent = library.content.map(({ provenance: _provenance, ...entry }) => entry);
  const {
    supersessions: _supersessions,
    lifecycle: _lifecycle,
    content: _content,
    ...withoutSupersessions
  } = library;
  const legacy: LibraryExportDocument = {
    ...withoutSupersessions,
    version: 1,
    content: legacyContent,
  };
  return { library, collision, legacy, embedded };
}

async function ready(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 60_000 },
  );
}

async function homebrewReady(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.locator('.homebrew-status')).toHaveText(
    'Homebrew library loaded.',
    { timeout: 40_000 },
  );
  await expect(page.locator('#homebrew-tab-panel')).toHaveAttribute(
    'aria-busy',
    'false',
  );
}

async function downloadBytes(
  download: import('@playwright/test').Download,
): Promise<Buffer> {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

test('v20 names embedded Portable Elf before direct commit and omits the line for SRD-only shares', async ({
  browser,
  page,
}) => {
  // Measured alone on PLAYWRIGHT_PORT=5060 at 25.6s. The required x1.5 is
  // 38.4s, already aligned to the next 100ms boundary.
  test.setTimeout(38_400);
  await page.goto('/?import=library');
  await ready(page);
  const fixture = await buildRecipientFixture(page);
  await page.getByLabel('Library JSON').setInputFiles({
    name: 'portable-elf-library-v2.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture.embedded)),
  });
  await page.getByRole('button', { name: 'Import library' }).click();
  await expect(page.locator('.transfer-status')).toHaveText(
    'Library imported: 1 added to your library, 0 matched existing.',
  );

  // Every character row and configured lineage choice is authored through the
  // production guided writers; no browser fixture writes character tables.
  await page.getByRole('link', { name: 'Create a character' }).click();
  await page.getByRole('button', { name: /^Wizard\b/u }).click();
  await page.getByLabel('Character name').fill('Portable Elf Share');
  await page.getByRole('button', { name: 'Create character' }).click();
  await page.getByRole('button', { name: 'Set ability scores' }).click();
  await page.getByRole('button', { name: 'Choose Portable Elf' }).click();
  const portableCharacterId = Number((
    await page.evaluate(() => window.staticApp.inspectRows('characters'))
  ).find((row) => row.name === 'Portable Elf Share')?.id);
  expect(Number.isSafeInteger(portableCharacterId)).toBe(true);
  await page.goto(
    `/characters/${String(portableCharacterId)}/build/levels/1`,
  );
  await page.getByRole('link', { name: 'Species', exact: true }).click();
  await page.getByRole('radio', { name: 'High Elf', exact: true }).check();
  await page.getByLabel('Elven Lineage spellcasting ability')
    .selectOption('intelligence');
  const cantrip = page.getByRole('combobox', { name: 'High Elf cantrip' });
  await cantrip.fill('Mage Hand');
  await page.getByRole('option', { name: /^Mage Hand\b/u }).click();
  await page.getByRole('button', { name: 'Save Elven Lineage' }).click();
  await page.goto('/');
  await ready(page);

  await page.getByRole('button', {
    name: 'Share Portable Elf Share by link',
  }).click();
  await page.getByRole('button', { name: 'Create share link' }).click();
  await expect(page.locator('.share-status')).toHaveText(
    'Share link and QR code ready. Embedded external content: ' +
      'Portable Elf — species — Received homebrew — original author not recorded; ' +
      'a local copy will be added to your library.',
  );
  const portableLink = await page.getByLabel('Generated character share link')
    .inputValue();
  const portableWire = JSON.parse(gunzipSync(
    Buffer.from(new URL(portableLink).hash.slice(1), 'base64url'),
  ).toString('utf8')) as unknown[];
  expect(portableWire[1]).toBe(20);

  await page.getByRole('link', { name: 'Create a character' }).click();
  await page.getByRole('button', { name: /^Wizard\b/u }).click();
  await page.getByLabel('Character name').fill('SRD Only Share');
  await page.getByRole('button', { name: 'Create character' }).click();
  await page.goto('/');
  await ready(page);
  await page.getByRole('button', {
    name: 'Share SRD Only Share by link',
  }).click();
  await page.getByRole('button', { name: 'Create share link' }).click();
  await expect(page.locator('.share-status')).toHaveText(
    'Share link and QR code ready.',
  );
  const srdLink = await page.getByLabel('Generated character share link')
    .inputValue();

  const profile = await browser.newContext();
  try {
    const recipient = await profile.newPage();
    await recipient.goto(portableLink);
    await ready(recipient);
    await expect(recipient.getByRole('heading', {
      name: 'Portable Elf Share',
    })).toBeVisible();
    const disclosure = recipient.getByRole('region', {
      name: 'Embedded external content',
    });
    await expect(disclosure).toContainText(
      'This external content will be installed with the character:',
    );
    await expect(disclosure.getByRole('listitem')).toHaveText(
      'Portable Elf — species — Received homebrew — original author not recorded; ' +
        'a local copy will be added to your library',
    );
    expect(await recipient.evaluate(async (portableElfKey) => ({
      characters: await window.staticApp.inspectRows('characters'),
      species: (await window.staticApp.inspectRows('species_definitions'))
        .filter((row) => row.content_key === portableElfKey),
    }), PORTABLE_ELF_KEY)).toEqual({ characters: [], species: [] });
    await expect(recipient.locator(
      '[data-testid="content-adoption-modal"]',
    )).toHaveCount(0);

    await recipient.getByRole('button', {
      name: 'Add to my characters',
    }).click();
    await expect(recipient.locator('.share-status')).toHaveText(
      'Portable Elf Share was added. Open character.',
    );
    const installed = await recipient.evaluate(async () => {
      const characters = await window.staticApp.inspectRows('characters');
      const species = await window.staticApp.inspectRows('species_definitions');
      const sources = await window.staticApp.inspectRows(
        'character_source_instances',
      );
      return {
        characterNames: characters.map((row) => row.name),
        speciesNames: species.filter((row) =>
          row.content_key === '2024:example.test.species:portable-elf'
        ).map((row) => row.name),
        source: sources.find((row) => row.display_name === 'Portable Elf') ===
            undefined
          ? undefined
          : {
              ...sources.find((row) => row.display_name === 'Portable Elf'),
              config: JSON.parse(String(sources.find((row) =>
                row.display_name === 'Portable Elf'
              )?.config)),
            },
      };
    });
    expect(installed.characterNames).toEqual(['Portable Elf Share']);
    expect(installed.speciesNames).toEqual(['Portable Elf']);
    expect(installed.source).toEqual(expect.objectContaining({
      display_name: 'Portable Elf',
      config: {
        source_content_key: PORTABLE_ELF_KEY,
        lineage: {
          chosen_option: 'High Elf',
          high_elf_cantrip: '2024:mage-hand',
        },
        spellcasting_ability: 'intelligence',
      },
    }));

    await recipient.goto(srdLink);
    await ready(recipient);
    await expect(recipient.getByRole('region', {
      name: 'Embedded external content',
    })).toBeHidden();
    await expect(recipient.locator('.share-preview')).not.toContainText(
      'will be installed with the character',
    );
  } finally {
    await profile.close();
  }
});

test('v17 refusal links through library adoption to the exact restored choice', async ({
  browser,
  page,
}) => {
  // Measured alone at 27.1s on 2026-08-10 after adding the two required
  // explicit collision choices. 27.1 x 1.5 = 40.65s, rounded up to 100ms.
  test.setTimeout(40_700);
  await page.goto('/?import=library');
  await ready(page);
  const fixture = await buildRecipientFixture(page);
  await page.getByLabel('Library JSON').setInputFiles({
    name: 'source-portable-elf-library-v2.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture.library)),
  });
  await page.getByRole('button', { name: 'Import library' }).click();
  await expect(page.locator('.transfer-status')).toHaveText(
    'Library imported: 1 added to your library, 0 matched existing.',
  );

  // Production guided writers create the exact configured choice that the
  // reference-only link must later restore.
  await page.getByRole('link', { name: 'Create a character' }).click();
  await page.getByRole('button', { name: /^Wizard\b/u }).click();
  await page.getByLabel('Character name').fill('Reference-only High Elf');
  await page.getByRole('button', { name: 'Create character' }).click();
  await page.getByRole('button', { name: 'Set ability scores' }).click();
  await page.getByRole('button', {
    name: 'Choose Oversized Portable Elf',
  }).click();
  const character = (
    await page.evaluate(() => window.staticApp.inspectRows('characters'))
  ).find((row) => row.name === 'Reference-only High Elf');
  const characterId = Number(character?.id);
  expect(Number.isSafeInteger(characterId)).toBe(true);
  await page.goto(`/characters/${String(characterId)}/build/levels/1`);
  await page.getByRole('link', { name: 'Species', exact: true }).click();
  await page.getByRole('radio', { name: 'High Elf', exact: true }).check();
  await page.getByLabel('Elven Lineage spellcasting ability')
    .selectOption('intelligence');
  const cantrip = page.getByRole('combobox', { name: 'High Elf cantrip' });
  await cantrip.fill('Mage Hand');
  await page.getByRole('option', { name: /^Mage Hand\b/u }).click();
  await page.getByRole('button', { name: 'Save Elven Lineage' }).click();
  await page.goto('/');
  await ready(page);

  await page.getByRole('button', {
    name: 'Share Reference-only High Elf by link',
  }).click();
  await page.getByRole('button', { name: 'Create share link' }).click();
  const output = page.getByLabel('Generated character share link');
  await expect(output).toBeVisible();
  const link = await output.inputValue();
  const positional = JSON.parse(gunzipSync(
    Buffer.from(new URL(link).hash.slice(1), 'base64url'),
  ).toString('utf8')) as unknown[];
  expect(positional[1]).toBe(20);

  const profile = await browser.newContext();
  try {
    const recipient = await profile.newPage();
    await recipient.goto(link);
    await ready(recipient);
    const required = 'This character uses Oversized Portable Elf, which is not in your library.';
    const remedyText =
      'Ask the sender for a library JSON containing Oversized Portable Elf, import it, then retry this share.';
    const remedy = recipient.getByRole('link', { name: remedyText });
    await expect(recipient.locator('.share-status')).toContainText(required);
    await expect(remedy).toHaveAttribute('href', `/?import=library#${new URL(link).hash.slice(1)}`);
    await expect(
      recipient.getByRole('button', { name: 'Add to my characters' }),
    ).toBeHidden();

    await remedy.click();
    await expect(recipient).toHaveURL(/\/?\?import=library#/u);
    await ready(recipient);
    const libraryInput = recipient.getByLabel('Library JSON');
    await expect(recipient.locator('details.transfer-panel')).toHaveAttribute(
      'open',
      '',
    );
    await expect(libraryInput).toBeFocused();
    await libraryInput.setInputFiles({
      name: 'portable-elf-library-v2.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(fixture.library)),
    });
    await recipient.getByRole('button', { name: 'Import library' }).click();
    await expect(recipient.locator('.transfer-status')).toHaveText(
      'Library imported: 1 added to your library, 0 matched existing. Retry share.',
    );

    // A second document at the same key still goes through the common adoption
    // review. Matching keeps the installed external-layer rules unchanged.
    await libraryInput.setInputFiles({
      name: 'portable-elf-collision.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(fixture.collision)),
    });
    await recipient.getByRole('button', { name: 'Import library' }).click();
    const libraryReview = recipient.locator(
      '[data-testid="content-adoption-modal"]',
    );
    await expect(libraryReview).toBeVisible();
    await expect(libraryReview).toContainText('Oversized Portable Elf');
    await expect(libraryReview).toContainText(
      'local: Oversized Portable Elf — Homebrew · external layer',
    );
    const libraryCommit = libraryReview.getByRole('button', {
      name: 'Import with these choices',
    });
    const libraryMatch = libraryReview.getByRole('radio', {
      name: /Match — Discards the incoming rules; existing characters keep the local entry\./,
    });
    await expect(libraryMatch).not.toBeChecked();
    await expect(libraryCommit).toBeDisabled();
    await libraryMatch.check();
    await expect(libraryCommit).toBeEnabled();
    await libraryCommit.click();
    await expect(recipient.locator('.transfer-status')).toHaveText(
      'Library imported: 0 added to your library, 1 matched existing. Retry share.',
    );

    // Reopening the original link is the documented retry. Its reference-only
    // match is reviewed separately from the library document's aggregate.
    await recipient.goto(link);
    await ready(recipient);
    await recipient.getByRole('button', {
      name: 'Add to my characters',
    }).click();
    const shareReview = recipient.locator(
      '[data-testid="content-adoption-modal"]',
    );
    await expect(shareReview).toContainText(
      'Shared reference has no rules to compare',
    );
    await expect(shareReview).toContainText(
      'local: Oversized Portable Elf — Homebrew · external layer',
    );
    const shareCommit = shareReview.getByRole('button', {
      name: 'Import with these choices',
    });
    const shareMatch = shareReview.getByRole('radio', {
      name: /Use this local Oversized Portable Elf for the imported character\./,
    });
    await expect(shareMatch).not.toBeChecked();
    await expect(shareCommit).toBeDisabled();
    await shareMatch.check();
    await expect(shareCommit).toBeEnabled();
    await shareCommit.click();
    await expect(recipient.locator('.share-status')).toContainText(
      'Reference-only High Elf was added. Open character.',
    );

    const restored = await recipient.evaluate(async () => {
      const character = (await window.staticApp.inspectRows('characters'))[0];
      if (character === undefined) throw new Error('Imported character missing.');
      const characterId = character.id;
      if (typeof characterId !== 'number') throw new Error('Character ID missing.');
      const sources = await window.staticApp.inspectRows(
        'character_source_instances',
        { character_id: characterId },
      );
      const species = sources.find((row) => row.source_type === 'species');
      if (species === undefined) throw new Error('Imported species source missing.');
      const speciesId = species.id;
      if (typeof speciesId !== 'number') throw new Error('Species source ID missing.');
      const slots = (await window.staticApp.inspectRows('spell_selection_slots'))
        .filter((row) => row.source_instance_id === speciesId);
      const versions = await window.staticApp.inspectRows('spell_versions');
      return {
        character,
        config: JSON.parse(String(species.config)),
        slots: slots.map((slot) => {
          const versionId = slot.current_spell_version_id ??
            slot.fixed_spell_version_id;
          return {
            rule_key: slot.rule_key,
            ordinal: slot.ordinal,
            bucket: slot.bucket,
            state: slot.state,
            assignment: slot.current_spell_version_id === null
              ? 'fixed'
              : 'chosen',
            spell_name: versions.find((version) => version.id === versionId)
              ?.display_name,
          };
        }).sort((left, right) =>
          String(left.rule_key).localeCompare(String(right.rule_key))
        ),
      };
    });
    expect(restored).toEqual({
      character: expect.objectContaining({
        id: 1,
        name: 'Reference-only High Elf',
      }),
      config: {
        source_content_key: OVERSIZED_PORTABLE_ELF_KEY,
        lineage: {
          chosen_option: 'High Elf',
          high_elf_cantrip: '2024:mage-hand',
        },
        spellcasting_ability: 'intelligence',
      },
      slots: [
        {
          rule_key: 'elf-lineage:replaceable_spell',
          ordinal: 1,
          bucket: 'cantrip_known',
          state: 'active',
          assignment: 'chosen',
          spell_name: 'Mage Hand',
        },
      ],
    });
  } finally {
    await profile.close();
  }
});

test('the library control accepts v1 and both JSON controls reject the other kind', async ({
  page,
}) => {
  // Measured alone at 6.9s on Chromium; 20s exceeds the 10.35s x1.5 budget.
  test.setTimeout(20_000);
  await page.goto('/?import=library');
  await ready(page);
  const fixture = await buildRecipientFixture(page);
  const libraryInput = page.getByLabel('Library JSON');
  await libraryInput.setInputFiles({
    name: 'portable-elf-library-v1.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture.legacy)),
  });
  await page.getByRole('button', { name: 'Import library' }).click();
  await expect(page.locator('.transfer-status')).toHaveText(
    'Library imported: 1 added to your library, 0 matched existing. ' +
    'This older export did not record archive state; carried entries were restored live.',
  );

  await page.getByLabel('Catalog JSON').setInputFiles({
    name: 'wrong-library.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fixture.library)),
  });
  await page.getByRole('button', { name: 'Import catalog' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'This file is a library export. Use the Library JSON importer.',
  );

  await libraryInput.setInputFiles({
    name: 'wrong-catalog.json',
    mimeType: 'application/json',
    buffer: Buffer.from('[]'),
  });
  await page.getByRole('button', { name: 'Import library' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'This file is a catalog document. Use the Catalog JSON importer.',
  );
});

test('whole-library download restores authored and imported content into a fresh profile', async ({
  page,
}) => {
  // Measured alone with one worker on PLAYWRIGHT_PORT=5030: Playwright logged
  // `1 passed (30.1s)`. 30.1s × 1.5 = 45.15s, rounded up to 45.2s.
  test.setTimeout(45_200);
  await page.goto('/');
  await ready(page);
  await page.evaluate(() => window.staticApp.reset());
  await page.reload();
  await ready(page);

  await page.getByText('Import and backups', { exact: true }).click();
  const [emptyDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download library JSON' }).click(),
  ]);
  expect(emptyDownload.suggestedFilename()).toMatch(
    /^srd-55-library-\d{4}-\d{2}-\d{2}\.json$/u,
  );
  const emptyDocument = JSON.parse(
    (await downloadBytes(emptyDownload)).toString('utf8'),
  ) as LibraryExportDocument;
  expect(emptyDocument).toEqual({
    format: 'dnd-multiclass-spells/library',
    version: 3,
    exported_at: expect.any(String),
    selection: 'all',
    selected_content_keys: [],
    content: [],
    supersessions: [],
    lifecycle: [],
  });

  await page.goto('/homebrew');
  await homebrewReady(page);
  await page.getByRole('button', { name: 'New species', exact: true }).click();
  await page.getByLabel('Name', { exact: true }).fill(HOSTILE_LIBRARY_SPECIES_NAME);
  await page.getByLabel('Rules edition', { exact: true }).selectOption('expanded');
  await page.getByLabel('Creature type', { exact: true }).fill('Astral');
  await page.getByLabel('Primary size', { exact: true }).fill('Medium');
  await page.getByLabel('Walking speed (feet)', { exact: true }).fill('35');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.getByRole('button', { name: 'Preview publish', exact: true }).click();
  await page.getByRole('button', { name: 'Publish species', exact: true }).click();
  const publishedSpecies = page.getByRole('region', { name: 'Species published' });
  await expect(publishedSpecies).toBeVisible();
  await expect(publishedSpecies.getByText(
    HOSTILE_LIBRARY_SPECIES_NAME,
    { exact: true },
  )).toBeVisible();
  await expect(page.locator('[data-library-export-hostile]')).toHaveCount(0);

  await page.goto('/');
  await ready(page);
  await page.getByText('Import and backups', { exact: true }).click();
  await page.getByRole('button', {
    name: 'Import bundled homebrew',
    exact: true,
  }).click();
  const bundledReview = page.getByRole('dialog', {
    name: 'Review content import',
    exact: true,
  });
  await expect(bundledReview).toBeVisible();
  await bundledReview.getByRole('button', {
    name: 'Import with these choices',
    exact: true,
  }).click();
  await expect(page.locator('.transfer-status')).toHaveText(
    'Bundled homebrew imported: 3 added to your library, 0 matched existing.',
  );

  const expectedManifest = [
    { kind: 'species', name: HOSTILE_LIBRARY_SPECIES_NAME },
    { kind: 'subclass', name: 'Spell Student' },
    { kind: 'subclass', name: 'Spell Student (Bundled revision 2)' },
    { kind: 'subclass', name: 'Veteran' },
    { kind: 'subclass', name: 'Veteran (Bundled revision 2)' },
    { kind: 'subclass', name: 'Veteran (Bundled revision 3)' },
    { kind: 'subclass', name: 'Warrior of the Barbed Court' },
    {
      kind: 'subclass',
      name: 'Warrior of the Barbed Court (Bundled revision 2)',
    },
    {
      kind: 'subclass',
      name: 'Warrior of the Barbed Court (Bundled revision 3)',
    },
  ];
  const sourceCatalog = await page.evaluate(async () => {
    const [identityRows, speciesRows, subclassRows, supersessionRows] =
      await Promise.all([
        window.staticApp.inspectRows('catalog_content_identities'),
        window.staticApp.inspectRows('species_definitions'),
        window.staticApp.inspectRows('subclass_definitions'),
        window.staticApp.inspectRows('catalog_content_supersessions'),
      ]);
    const names = new Map([...speciesRows, ...subclassRows].map((row) => [
      String(row.content_key),
      String(row.name),
    ]));
    return {
      identities: identityRows.filter((row) => row.catalog_layer === 'external')
        .map((row) => {
          const contentKey = String(row.content_key);
          const name = names.get(contentKey);
          if (name === undefined) {
            throw new Error(`External content '${contentKey}' has no definition name.`);
          }
          return {
            content_key: contentKey,
            kind: String(row.content_kind),
            layer: String(row.catalog_layer),
            name,
          };
        }).sort((left, right) =>
          left.kind.localeCompare(right.kind) || left.name.localeCompare(right.name)
        ),
      supersessions: supersessionRows.map((row) => ({
        content_kind: String(row.content_kind),
        superseded_content_key: String(row.superseded_content_key),
        successor_content_key: String(row.successor_content_key),
        recorded_at: String(row.recorded_at),
      })).sort((left, right) =>
        left.content_kind.localeCompare(right.content_kind) ||
        left.superseded_content_key.localeCompare(right.superseded_content_key) ||
        left.successor_content_key.localeCompare(right.successor_content_key)
      ),
    };
  });
  expect(sourceCatalog.identities.map(({ content_key: _contentKey, ...facts }) =>
    facts
  )).toEqual(expectedManifest.map((entry) => ({ ...entry, layer: 'external' })));
  expect(sourceCatalog.supersessions).toEqual([
    {
      content_kind: 'subclass',
      superseded_content_key: '2024:content.subclass:spell-student',
      successor_content_key:
        '2024:content.subclass:spell-student-bundled-revision-2',
      recorded_at: expect.any(String),
    },
    {
      content_kind: 'subclass',
      superseded_content_key: '2024:content.subclass:veteran',
      successor_content_key:
        '2024:content.subclass:veteran-bundled-revision-2',
      recorded_at: expect.any(String),
    },
    {
      content_kind: 'subclass',
      superseded_content_key:
        '2024:content.subclass:veteran-bundled-revision-2',
      successor_content_key:
        '2024:content.subclass:veteran-bundled-revision-3',
      recorded_at: expect.any(String),
    },
    {
      content_kind: 'subclass',
      superseded_content_key:
        '2024:content.subclass:warrior-of-the-barbed-court',
      successor_content_key:
        '2024:content.subclass:warrior-of-the-barbed-court-bundled-revision-2',
      recorded_at: expect.any(String),
    },
    {
      content_kind: 'subclass',
      superseded_content_key:
        '2024:content.subclass:warrior-of-the-barbed-court-bundled-revision-2',
      successor_content_key:
        '2024:content.subclass:warrior-of-the-barbed-court-bundled-revision-3',
      recorded_at: expect.any(String),
    },
  ]);

  const [libraryDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download library JSON' }).click(),
  ]);
  const libraryBytes = await downloadBytes(libraryDownload);
  const libraryDocument = JSON.parse(
    libraryBytes.toString('utf8'),
  ) as LibraryExportDocument;
  if (libraryDocument.version !== 3) {
    throw new Error('The production library download was not a v3 document.');
  }
  expect(libraryDocument.selection).toBe('all');
  expect(libraryDocument.selected_content_keys).toEqual(
    sourceCatalog.identities.map((entry) => entry.content_key).sort(),
  );
  expect(Object.keys(libraryDocument.supersessions[0] ?? {}).sort()).toEqual([
    'content_kind',
    'recorded_at',
    'successor_content_key',
    'superseded_content_key',
  ]);
  expect(libraryDocument.supersessions[0]?.recorded_at).toMatch(
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/u,
  );
  expect(libraryDocument.supersessions).toEqual(sourceCatalog.supersessions);
  expect(libraryDocument.content.map((entry) => ({
    kind: entry.kind,
    name: String(entry.aggregate.name),
  })).sort((left, right) =>
    left.kind.localeCompare(right.kind) || left.name.localeCompare(right.name)
  )).toEqual(expectedManifest);

  await page.evaluate(() => window.staticApp.reset());
  await page.reload();
  await ready(page);
  await page.getByText('Import and backups', { exact: true }).click();
  await page.getByLabel('Library JSON').setInputFiles({
    name: 'srd-55-library.json',
    mimeType: 'application/json',
    buffer: libraryBytes,
  });
  await page.getByRole('button', { name: 'Import library' }).click();
  await expect(page.locator('.transfer-status')).toHaveText(
    'Library imported: 9 added to your library, 0 matched existing.',
  );

  const restored = await page.evaluate((speciesName) => {
    const identities = window.staticApp.inspectRows('catalog_content_identities');
    const species = window.staticApp.inspectRows('species_definitions');
    const speciesTemplates = window.staticApp.inspectRows('species_templates');
    const subclasses = window.staticApp.inspectRows('subclass_definitions');
    const supersessions = window.staticApp.inspectRows('catalog_content_supersessions');
    return Promise.all([
      identities,
      species,
      speciesTemplates,
      subclasses,
      supersessions,
    ]).then(([
      identityRows,
      speciesRows,
      templateRows,
      subclassRows,
      supersessionRows,
    ]) => {
      const names = new Map([...speciesRows, ...subclassRows].map((row) => [
        String(row.content_key),
        String(row.name),
      ]));
      return {
        identities: identityRows.filter((row) => row.catalog_layer === 'external')
          .map((row) => {
            const contentKey = String(row.content_key);
            const name = names.get(contentKey);
            if (name === undefined) {
              throw new Error(`Restored content '${contentKey}' has no definition name.`);
            }
            return {
              content_key: contentKey,
              kind: String(row.content_kind),
              layer: String(row.catalog_layer),
              name,
            };
          }).sort((left, right) =>
            left.kind.localeCompare(right.kind) || left.name.localeCompare(right.name)
          ),
      species: speciesRows.filter((row) => row.name === speciesName).map((row) => {
        const template = templateRows.find(
          (candidate) => candidate.content_key === row.content_key,
        );
        if (template === undefined) {
          throw new Error(`Restored species '${speciesName}' has no template.`);
        }
        return {
          name: String(row.name),
          rules_edition: String(row.rules_edition),
          creature_type: String(template.creature_type),
          size: String(template.size),
          base_speed_feet: Number(template.base_speed_feet),
        };
      }),
      subclasses: subclassRows.filter((row) => [
        'Spell Student',
        'Spell Student (Bundled revision 2)',
        'Veteran',
        'Veteran (Bundled revision 2)',
        'Veteran (Bundled revision 3)',
        'Warrior of the Barbed Court',
        'Warrior of the Barbed Court (Bundled revision 2)',
        'Warrior of the Barbed Court (Bundled revision 3)',
      ].includes(String(row.name))).map((row) => String(row.name)).sort(),
      supersessions: supersessionRows.map((row) => ({
        content_kind: String(row.content_kind),
        superseded_content_key: String(row.superseded_content_key),
        successor_content_key: String(row.successor_content_key),
        recorded_at: String(row.recorded_at),
      })).sort((left, right) =>
        left.content_kind.localeCompare(right.content_kind) ||
        left.superseded_content_key.localeCompare(right.superseded_content_key) ||
        left.successor_content_key.localeCompare(right.successor_content_key)
      ),
      };
    });
  }, HOSTILE_LIBRARY_SPECIES_NAME);
  expect(restored.identities).toEqual(sourceCatalog.identities);
  expect(restored.supersessions).toEqual(sourceCatalog.supersessions);
  expect(restored.species).toEqual([{
    name: HOSTILE_LIBRARY_SPECIES_NAME,
    rules_edition: 'expanded',
    creature_type: 'Astral',
    size: 'Medium',
    base_speed_feet: 35,
  }]);
  expect(restored.subclasses).toEqual([
    'Spell Student',
    'Spell Student (Bundled revision 2)',
    'Veteran',
    'Veteran (Bundled revision 2)',
    'Veteran (Bundled revision 3)',
    'Warrior of the Barbed Court',
    'Warrior of the Barbed Court (Bundled revision 2)',
    'Warrior of the Barbed Court (Bundled revision 3)',
  ]);

  await page.goto('/homebrew');
  await homebrewReady(page);
  await expect(page.getByRole('heading', {
    name: HOSTILE_LIBRARY_SPECIES_NAME,
    exact: true,
  })).toBeVisible();
  await expect(page.locator('[data-library-export-hostile]')).toHaveCount(0);
  const restoredSpeciesCard = page.locator('.homebrew-card').filter({
    has: page.getByRole('heading', {
      name: HOSTILE_LIBRARY_SPECIES_NAME,
      exact: true,
    }),
  });
  await expect(restoredSpeciesCard.getByText('Homebrew', { exact: true })).toBeVisible();
  await expect(restoredSpeciesCard).toContainText(
    'Species · Received homebrew — origin author not recorded; this is your local copy',
  );
});
