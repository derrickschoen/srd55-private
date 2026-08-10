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

interface RecipientFixture {
  readonly library: LibraryExportDocument;
  readonly collision: LibraryExportDocument;
  readonly legacy: LibraryExportDocument;
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
  oversized: boolean,
): LibraryExportDocument {
  const aggregate = {
    kind: 'species',
    name: 'Oversized Portable Elf',
    rules_edition: '2024',
    reference_text: oversized
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
    selected_content_keys: [OVERSIZED_PORTABLE_ELF_KEY],
    content: [{
      kind: 'species',
      content_key: OVERSIZED_PORTABLE_ELF_KEY,
      key_kind: 'asserted',
      fingerprint_scheme: CONTENT_FINGERPRINT_SCHEME_V2,
      fingerprint_digest: identity.digest,
      aggregate,
    }],
    supersessions: [],
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
  const library = portableElfLibraryDocument(reference, true);
  const collision = portableElfLibraryDocument(reference, false);
  const { supersessions: _supersessions, ...withoutSupersessions } = library;
  const legacy: LibraryExportDocument = {
    ...withoutSupersessions,
    version: 1,
  };
  return { library, collision, legacy };
}

async function ready(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 60_000 },
  );
}

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
    'Library imported: 1 published, 0 matched existing.',
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
  expect(positional[1]).toBe(17);

  const profile = await browser.newContext();
  try {
    const recipient = await profile.newPage();
    await recipient.goto(link);
    await ready(recipient);
    const required = `species '${OVERSIZED_PORTABLE_ELF_KEY}'`;
    const remedyText = `Import ${required}, then open the link again.`;
    const remedy = recipient.getByRole('link', { name: remedyText });
    await expect(recipient.locator('.share-status')).toContainText(required);
    await expect(remedy).toHaveAttribute('href', '/?import=library');
    await expect(
      recipient.getByRole('button', { name: 'Add to my characters' }),
    ).toBeHidden();

    await remedy.click();
    await expect(recipient).toHaveURL(/\/?\?import=library$/u);
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
      'Library imported: 1 published, 0 matched existing.',
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
      'Library imported: 0 published, 1 matched existing.',
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
      'Reference supplied no rules evidence',
    );
    await expect(shareReview).toContainText(
      'local: Oversized Portable Elf — Homebrew · external layer',
    );
    const shareCommit = shareReview.getByRole('button', {
      name: 'Import with these choices',
    });
    const shareMatch = shareReview.getByRole('radio', {
      name: /Match — Discards the incoming rules; existing characters keep the local entry\./,
    });
    await expect(shareMatch).not.toBeChecked();
    await expect(shareCommit).toBeDisabled();
    await shareMatch.check();
    await expect(shareCommit).toBeEnabled();
    await shareCommit.click();
    await expect(recipient.locator('.share-status')).toContainText(
      'Character added as #1.',
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
    'Library imported: 1 published, 0 matched existing.',
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
