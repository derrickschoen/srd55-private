import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  registerAssertedContentIdentity,
  registerContentAlias,
} from '../../../src/catalog/content-registry';
import { spellProjectorV1Vectors } from '../../unit/catalog/fixtures/spell-projector-v1-vectors';
import { DatabaseContext } from '../../../src/db/database';
import { applicationSeed } from '../../../src/db/bootstrap';
import type { ContentKey } from '../../../src/domain/ids';
import {
  commitCharacterShareImport,
  importCharacterShare,
  previewCharacterShare,
} from '../../../src/sharing/character-share';
import {
  positionalToShareDocument,
  shareDocumentToPositional,
} from '../../../src/sharing/codec';
import type { CharacterShareDocument } from '../../../src/sharing/schema';
import { openTestDatabase } from '../../helpers/open-db';
import {
  FROZEN_V10_IDENTITY_REFERENCE_WIRE,
  FROZEN_V17_IDENTITY_REFERENCE_WIRE,
  IDENTITY_REFERENCE_KEYS,
} from '../../fixtures/character-share-identity-wires';

const AETHER_KEY = IDENTITY_REFERENCE_KEYS.asserted as ContentKey;

let connection: Database;
let db: DatabaseContext;

function installAetherLance(): void {
  const vector = spellProjectorV1Vectors[0]!;
  registerAssertedContentIdentity(db, {
    kind: 'spell',
    edition: vector.aggregate.rules_edition,
    name: vector.aggregate.name,
    payload: vector.payload,
    assertedKey: AETHER_KEY,
  });
  const identityId = db.exec(
    `INSERT INTO spell_identities (
       content_key, canonical_name, normalized_name
     ) VALUES ('aether-lance', 'Aether Lance', 'aether lance')`,
  ).lastInsertId;
  const versionId = db.exec(
    `INSERT INTO spell_versions (
       content_key, spell_identity_id, display_name, rules_edition, level,
       school, ritual, concentration, casting_time, action_type, range,
       range_kind, range_feet, area_shape, area_feet, duration, components,
       material_component_summary, material_cost_copper, material_cost_kind,
       healing, short_summary, upcast_summary, cantrip_upgrade_summary,
       requires_mod_for_effect, effect_reliability_category, provenance
     ) VALUES (?, ?, 'Aether Lance', 'expanded', 2, 'Chronomancy', 0, 1,
       '1 bonus action\r\n ', 'Bonus Action', 'Self (30-foot Cone)', 'self',
       NULL, 'cone', 30, 'Concentration, up to 1 minute',
       'V, S, M (a prism worth 25+ GP)', 'a prism worth 25+ GP', 2500,
       'minimum', 0, 'A line of force.  \r\n',
       'Slot 3–5: +2; slot 6+: +3.', NULL, 1, 'modifier_scaled', 'import')`,
    [AETHER_KEY, identityId],
  ).lastInsertId;
  for (const value of ['Wizard', 'Artificer']) {
    db.exec(
      'INSERT INTO spell_list_memberships (spell_version_id, spell_list_key) VALUES (?, ?)',
      [versionId, value],
    );
  }
  for (const value of ['force', 'concentration']) {
    db.exec(
      'INSERT INTO spell_version_tags (spell_version_id, tag) VALUES (?, ?)',
      [versionId, value],
    );
  }
  db.exec(
    "INSERT INTO spell_version_attack_modes (spell_version_id, attack_mode) VALUES (?, 'ranged_spell')",
    [versionId],
  );
  db.exec(
    "INSERT INTO spell_version_save_abilities (spell_version_id, save_ability) VALUES (?, 'Dexterity')",
    [versionId],
  );
  for (const level of [3, 6]) {
    db.exec(
      'INSERT INTO spell_version_upcast_levels (spell_version_id, level) VALUES (?, ?)',
      [versionId, level],
    );
  }
  registerContentAlias(db, {
    kind: 'spell',
    aliasKey: IDENTITY_REFERENCE_KEYS.legacyAlias as ContentKey,
    contentKey: AETHER_KEY,
    aliasKind: 'declared-legacy',
  });
}

function oneSpellDocument(key: string, name: string): CharacterShareDocument {
  const decoded = positionalToShareDocument(FROZEN_V17_IDENTITY_REFERENCE_WIRE);
  return Object.freeze({
    ...decoded,
    character: Object.freeze({ name }),
    spellbook: Object.freeze([{ spellKey: key }]),
  });
}

function importedSpellKey(characterId: number): string {
  return db.scalar<string>(
    `SELECT spell.content_key
     FROM wizard_spellbook_entries AS entry
     JOIN spell_versions AS spell ON spell.id = entry.spell_version_id
     WHERE entry.character_id = ?`,
    [characterId],
  ) ?? 'missing';
}

beforeEach(async () => {
  connection = await openTestDatabase();
  db = new DatabaseContext(connection);
  applicationSeed(db);
  installAetherLance();
});

afterEach(() => connection.close());

describe('CI-SHARE-REFERENCE', () => {
  it('keeps hand-frozen v10 and v17 captures reference-only', () => {
    const v10 = positionalToShareDocument(FROZEN_V10_IDENTITY_REFERENCE_WIRE);
    const v17 = positionalToShareDocument(FROZEN_V17_IDENTITY_REFERENCE_WIRE);
    expect(FROZEN_V10_IDENTITY_REFERENCE_WIRE[1]).toBe(10);
    expect(FROZEN_V17_IDENTITY_REFERENCE_WIRE[1]).toBe(17);
    expect(v10.spellbook.map((row) => row.spellKey)).toEqual(
      Object.values(IDENTITY_REFERENCE_KEYS),
    );
    expect(v17.spellbook.map((row) => row.spellKey)).toEqual(
      Object.values(IDENTITY_REFERENCE_KEYS),
    );
    expect(Object.hasOwn(v10, 'content')).toBe(false);
    expect(Object.hasOwn(v17, 'content')).toBe(false);
    expect(JSON.stringify(shareDocumentToPositional(v17))).not.toContain(
      'canonical_json',
    );
  });

  it('resolves stable and asserted keys silently, but reviews aliases and fingerprint fallback', () => {
    const stable = previewCharacterShare(
      db,
      oneSpellDocument(IDENTITY_REFERENCE_KEYS.stable, 'Stable'),
    );
    const asserted = previewCharacterShare(
      db,
      oneSpellDocument(IDENTITY_REFERENCE_KEYS.asserted, 'Asserted'),
    );
    const alias = previewCharacterShare(
      db,
      oneSpellDocument(IDENTITY_REFERENCE_KEYS.legacyAlias, 'Alias'),
    );
    const fallback = previewCharacterShare(
      db,
      oneSpellDocument(
        IDENTITY_REFERENCE_KEYS.fingerprintFallback,
        'Fallback',
      ),
    );

    expect(stable).toMatchObject({ placeholderCount: 0, adoptionPlan: { reviews: [] } });
    expect(asserted).toMatchObject({ placeholderCount: 0, adoptionPlan: { reviews: [] } });
    expect(alias.adoptionPlan.reviews).toEqual([
      expect.objectContaining({ matchClass: 'alias', targetContentKey: AETHER_KEY }),
    ]);
    expect(fallback.adoptionPlan.reviews).toEqual([
      expect.objectContaining({
        matchClass: 'compatible-fingerprint',
        targetContentKey: AETHER_KEY,
      }),
    ]);
  });

  it('remembers a reviewed fallback match and routes both imports to the local candidate', () => {
    const document = oneSpellDocument(
      IDENTITY_REFERENCE_KEYS.fingerprintFallback,
      'Remember fallback',
    );
    const preview = previewCharacterShare(db, document);
    const id = preview.adoptionPlan.reviews[0]!.id;
    const choices = { [id]: { decision: 'match' as const } };
    const committed = commitCharacterShareImport(
      db,
      document,
      preview.adoptionPlan.token,
      choices,
    );
    expect(committed.kind).toBe('committed');
    if (committed.kind !== 'committed') return;
    expect(importedSpellKey(committed.result.characterId)).toBe(AETHER_KEY);

    const repeated = previewCharacterShare(db, document);
    expect(repeated.adoptionPlan.reviews).toEqual([]);
    expect(repeated.adoptionPlan.outcomes).toEqual([
      expect.objectContaining({ kind: 'remembered-match', contentKey: AETHER_KEY }),
    ]);
  });

  it('clones the local fallback candidate, remembers it, and leaves the candidate unchanged', () => {
    const document = oneSpellDocument(
      IDENTITY_REFERENCE_KEYS.fingerprintFallback,
      'Clone fallback',
    );
    const preview = previewCharacterShare(db, document);
    const id = preview.adoptionPlan.reviews[0]!.id;
    const choices = {
      [id]: { decision: 'clone' as const, cloneName: 'Aether Lance Private' },
    };
    const replanned = previewCharacterShare(db, document, choices);
    const committed = commitCharacterShareImport(
      db,
      document,
      replanned.adoptionPlan.token,
      choices,
    );
    expect(committed.kind).toBe('committed');
    if (committed.kind !== 'committed') return;
    const cloneKey = importedSpellKey(committed.result.characterId);
    expect(cloneKey).toBe('expanded:content.spell:aether-lance-private');
    expect(db.scalar<string>(
      'SELECT display_name FROM spell_versions WHERE content_key = ?',
      [AETHER_KEY],
    )).toBe('Aether Lance');

    const repeated = previewCharacterShare(db, document);
    expect(repeated.adoptionPlan.reviews).toEqual([]);
    expect(repeated.adoptionPlan.outcomes).toEqual([
      expect.objectContaining({ kind: 'remembered-clone', contentKey: cloneKey }),
    ]);
  });

  it('keeps missing spell references as placeholders', () => {
    const missingKey = '2024:content.spell:not-installed';
    const document = oneSpellDocument(missingKey, 'Missing');
    expect(previewCharacterShare(db, document)).toMatchObject({
      placeholderCount: 1,
      adoptionPlan: { reviews: [] },
    });
    const imported = importCharacterShare(db, document);
    expect(importedSpellKey(imported.characterId)).toBe(missingKey);
    expect(db.scalar<string>(
      'SELECT provenance FROM spell_versions WHERE content_key = ?',
      [missingKey],
    )).toBe('placeholder');
  });

  it('refuses an alias candidate that cannot supply the local clone projection', () => {
    db.exec(
      `DELETE FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?`,
      [AETHER_KEY],
    );
    expect(() => previewCharacterShare(
      db,
      oneSpellDocument(IDENTITY_REFERENCE_KEYS.legacyAlias, 'Damaged alias'),
    )).toThrow(/cannot be reviewed safely/);
    expect(db.scalar<number>(
      `SELECT count(*) FROM characters WHERE name = 'Damaged alias'`,
    )).toBe(0);
  });
});
