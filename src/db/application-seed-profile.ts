import type { ContentKey } from '../domain/ids';
import type { DatabaseContext } from './database';
import { TEST_CORE_SPELL_CONTENT_KEYS } from './test-core-spell-content-keys.generated';

export type ApplicationSeedProfile = 'full' | 'test-core';

const TEST_CORE_SPELL_CONTENT_KEY_SET: ReadonlySet<ContentKey> =
  new Set(TEST_CORE_SPELL_CONTENT_KEYS);

export function applicationSeedSpellContentKeys(
  profile: ApplicationSeedProfile,
): ReadonlySet<ContentKey> | undefined {
  return profile === 'full' ? undefined : TEST_CORE_SPELL_CONTENT_KEY_SET;
}

function collectSpellReferences(
  value: unknown,
  references: Set<ContentKey>,
): void {
  if (Array.isArray(value)) {
    for (const entry of value) collectSpellReferences(entry, references);
    return;
  }
  if (value === null || typeof value !== 'object') return;
  for (const [key, entry] of Object.entries(value)) {
    if (
      (key === 'spell_version_key' || key === 'initial_spell_version_key') &&
      typeof entry === 'string'
    ) {
      references.add(entry as ContentKey);
    } else {
      collectSpellReferences(entry, references);
    }
  }
}

/**
 * Stored species/subclass projectors bind spell references by fingerprint.
 * A referenced spell outside the final test-core keep-list is installed only
 * while those non-spell aggregates are projected, then removed from the image.
 */
export function testCoreProjectionSpellContentKeys(
  db: DatabaseContext,
): ReadonlySet<ContentKey> {
  const references = new Set(TEST_CORE_SPELL_CONTENT_KEYS);
  for (const row of db.allRaw(
    `SELECT grant_rules FROM species_definitions
     UNION ALL
     SELECT grant_rules FROM subclass_definitions`,
  )) {
    const grantRules = row['grant_rules'];
    if (typeof grantRules === 'string') {
      collectSpellReferences(JSON.parse(grantRules), references);
    }
  }
  return references;
}
