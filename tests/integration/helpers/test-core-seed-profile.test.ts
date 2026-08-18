import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  bundledContentDigestPassV1,
  type CanonicalBundledAggregateV1,
} from '../../../src/catalog/bundled-content-digest-v1';
import { canonicalContentIdentityJson } from '../../../src/catalog/content-identity';
import { bundledContentManifestV1 } from '../../../src/catalog/bundled-content-registry-v1';
import { TEST_CORE_SPELL_CONTENT_KEYS } from '../../../src/db/test-core-spell-content-keys.generated';
import { DatabaseContext } from '../../../src/db/database';
import { openSeededTestDatabase } from '../../helpers/open-db';

const TESTS_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const GENERATION_COMMAND =
  'node scripts/generate-test-core-spell-keys.mjs';

function filesUnder(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return filesUnder(target);
      return entry.isFile() ? [target] : [];
    });
}

function referencedBundledSpellContentKeys(): readonly string[] {
  const testText = filesUnder(TESTS_ROOT)
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');
  return bundledContentManifestV1()
    .filter((entry) =>
      entry.kind === 'spell' && testText.includes(entry.contentKey)
    )
    .map((entry) => entry.contentKey);
}

function locator(aggregate: CanonicalBundledAggregateV1): string {
  return `${aggregate.kind}\u0000${aggregate.contentKey}`;
}

describe('the test-core application seed profile', () => {
  it('keeps a byte-identical strict aggregate subset of the full seed', async () => {
    const fullConnection = await openSeededTestDatabase();
    const testCoreConnection = await openSeededTestDatabase({
      profile: 'test-core',
    });
    try {
      const full = bundledContentDigestPassV1(
        new DatabaseContext(fullConnection),
      );
      const testCore = bundledContentDigestPassV1(
        new DatabaseContext(testCoreConnection),
      );
      const keptSpellKeys = new Set<string>(TEST_CORE_SPELL_CONTENT_KEYS);
      const expectedLocators = full.aggregates
        .filter((aggregate) =>
          aggregate.kind !== 'spell' ||
          keptSpellKeys.has(aggregate.contentKey)
        )
        .map(locator);
      const fullByLocator = new Map(
        full.aggregates.map((aggregate) => [locator(aggregate), aggregate]),
      );

      expect(testCore.aggregates.length).toBeLessThan(full.aggregates.length);
      expect(testCore.aggregates.map(locator)).toEqual(expectedLocators);
      for (const aggregate of testCore.aggregates) {
        const fullAggregate = fullByLocator.get(locator(aggregate));
        if (fullAggregate === undefined) {
          throw new Error(
            `test-core installed aggregate absent from full: ${locator(aggregate)}`,
          );
        }
        expect(canonicalContentIdentityJson(aggregate)).toBe(
          canonicalContentIdentityJson(fullAggregate),
        );
      }
    } finally {
      testCoreConnection.close();
      fullConnection.close();
    }
  }, 30_000);

  it('covers every bundled spell content key referenced under tests', () => {
    const kept = new Set<string>(TEST_CORE_SPELL_CONTENT_KEYS);
    const missing = referencedBundledSpellContentKeys().filter(
      (contentKey) => !kept.has(contentKey),
    );
    if (missing.length > 0) {
      throw new Error(
        'The test-core spell keep-list is missing referenced content key(s): ' +
        `${missing.join(', ')}. Run ${GENERATION_COMMAND}.`,
      );
    }
    expect(new Set(TEST_CORE_SPELL_CONTENT_KEYS).size).toBe(
      TEST_CORE_SPELL_CONTENT_KEYS.length,
    );
  });
});
