import { expect, test } from './fixtures/parallel-test';
import {
  encodeShareFragment,
  tryEncodeReferenceOnlyShareFragment,
} from '../../src/sharing/codec';
import {
  CHARACTER_SHARE_FORMAT,
  CHARACTER_SHARE_VERSION,
  type CharacterShareDocument,
} from '../../src/sharing/schema';
import {
  CONTENT_FINGERPRINT_SCHEME_V1,
  type ContentFingerprintDigest,
} from '../../src/catalog/content-identity';
import { featProjectorV1Vector } from '../unit/catalog/fixtures/source-projector-v1-vectors';
import { contentLicenseLabel } from '../../src/domain/enums';

const HOSTILE_CHARACTER =
  '<img data-s6-character src=x onerror=alert(1)> Recipient Hero';
const HOSTILE_AUTHOR =
  '<img data-s6-author src=x onerror=alert(1)> Original Author';
const VETERAN_V3_KEY = '2024:content.subclass:veteran-bundled-revision-3';

function baseDocument(name: string): CharacterShareDocument {
  return {
    format: CHARACTER_SHARE_FORMAT,
    version: CHARACTER_SHARE_VERSION,
    character: { name },
    classes: [],
    sources: [],
    selections: [],
    spellbook: [],
    preferences: [],
    overrides: [],
  };
}

async function ready(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.locator('#status')).toHaveAttribute(
    'data-ready',
    'true',
    { timeout: 20_000 },
  );
}

test('S6 recipient surfaces use provenance, inert names, and a direct sheet action', async ({
  page,
}) => {
  test.setTimeout(20_000);
  const document: CharacterShareDocument = {
    ...baseDocument(HOSTILE_CHARACTER),
    portableContent: {
      content: [{
        kind: 'feat',
        content_key: 'expanded:content.feat:keen-memory',
        key_kind: 'asserted',
        fingerprint_scheme: CONTENT_FINGERPRINT_SCHEME_V1,
        fingerprint_digest:
          featProjectorV1Vector.sha256 as ContentFingerprintDigest,
        aggregate: featProjectorV1Vector.aggregate,
        provenance: {
          origin_kind: 'authored_here',
          received: false,
          local_derivation: false,
          author_label: HOSTILE_AUTHOR,
          source_label: 'Sender campaign',
          license_label: contentLicenseLabel('Shared with attribution'),
          attribution_text: 'Original author retained.',
        },
      }],
      supersessions: [],
    },
  };
  const fragment = await encodeShareFragment(document);

  await page.goto(`/#${fragment}`);
  await ready(page);
  const disclosure = page.getByRole('region', {
    name: 'Embedded external content',
  });
  await expect(disclosure.locator('.share-embedded-content-provenance')).toHaveText(
    `Keen Memory — feat — Homebrew by ${HOSTILE_AUTHOR} — ` +
      'a local copy will be added to your library',
  );
  await expect(disclosure.getByRole('listitem')).toContainText('1 version');
  await expect(disclosure).toContainText('Attribution details');
  await expect(disclosure).toContainText(`Original author: ${HOSTILE_AUTHOR}`);
  await expect(page.locator('.share-preview')).not.toContainText('external layer');
  await expect(page.locator('.share-preview')).not.toContainText('bundled layer');
  await expect(page.locator('[data-s6-character], [data-s6-author]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Add to my characters' }).click();
  const status = page.locator('.share-status');
  await expect(status).toContainText(`${HOSTILE_CHARACTER} was added.`);
  await expect(status.getByRole('link', { name: 'Open character' }))
    .toHaveAttribute('href', '/characters/1');
  await expect(page.locator('[data-s6-character], [data-s6-author]')).toHaveCount(0);
  expect(await page.evaluate(async () => (
    await window.staticApp.inspectRows('catalog_content_provenance')
  ).find((row) => row.content_key === 'expanded:content.feat:keen-memory')))
    .toEqual(expect.objectContaining({
      origin_kind: 'authored_here',
      received: 1,
      local_derivation: 0,
      author_label: HOSTILE_AUTHOR,
      source_label: 'Sender campaign',
      license_label: 'Shared with attribution',
      attribution_text: 'Original author retained.',
    }));
});

test('S6 old known references retain the share while opening their installer', async ({
  page,
}) => {
  test.setTimeout(20_000);
  const document: CharacterShareDocument = {
    ...baseDocument('Recipient Veteran v3'),
    classes: [{
      id: 0,
      classKey: '2024:class:rogue',
      subclassKey: VETERAN_V3_KEY,
      level: 3,
      start: 1,
    }],
  };
  const encoded = await tryEncodeReferenceOnlyShareFragment(document);
  if (encoded.kind !== 'encoded') throw new Error('Reference fixture exceeded limits.');

  await page.goto(`/#${encoded.fragment}`);
  await ready(page);
  await expect(page.locator('.share-status')).toContainText(
    'This character uses Veteran (Bundled revision 3), which is not in your library.',
  );
  const remedy = page.getByRole('link', {
    name: 'Import bundled homebrew, then retry this share.',
  });
  await expect(remedy).toHaveAttribute(
    'href',
    `/?import=bundled-homebrew#${encoded.fragment}`,
  );
  await expect(page.getByText('Technical details')).toBeVisible();
  await expect(page.locator('.share-issue-list code')).toHaveText(
    `Internal content key: ${VETERAN_V3_KEY}`,
  );

  await remedy.click();
  await ready(page);
  expect(new URL(page.url()).hash).toBe(`#${encoded.fragment}`);
  await expect(page.getByRole('button', { name: 'Import bundled homebrew' }))
    .toBeFocused();
});
