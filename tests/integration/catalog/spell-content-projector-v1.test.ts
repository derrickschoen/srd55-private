import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registerBundledStableContentIdentity } from '../../../src/catalog/content-registry';
import {
  SpellContentProjectionError,
  projectStoredSpellContentV1,
} from '../../../src/catalog/spell-content-projector-v1';
import { deriveContentIdentityV1 } from '../../../src/catalog/content-identity';
import { DatabaseContext } from '../../../src/db/database';
import type { ContentKey } from '../../../src/domain/ids';
import { openTestDatabase } from '../../helpers/open-db';
import { spellProjectorV1Vectors } from '../../unit/catalog/fixtures/spell-projector-v1-vectors';

const CONTENT_KEY = 'expanded:ci3s-pre-aether-lance' as ContentKey;

describe('stored spell content-v1 projection', () => {
  let connection: Database;
  let db: DatabaseContext;

  beforeEach(async () => {
    connection = await openTestDatabase();
    db = new DatabaseContext(connection);
    registerBundledStableContentIdentity(db, {
      kind: 'spell',
      contentKey: CONTENT_KEY,
      normalizedName: 'aetherlance',
    });
    const identityId = db.exec(
      `INSERT INTO spell_identities (
         content_key, canonical_name, normalized_name
       ) VALUES ('ci3s-pre-aether-lance', 'Aether Lance', 'aether lance')`,
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
      [CONTENT_KEY, identityId],
    ).lastInsertId;
    for (const value of ['Wizard', 'Artificer']) {
      db.exec('INSERT INTO spell_list_memberships (spell_version_id, spell_list_key) VALUES (?, ?)', [versionId, value]);
    }
    for (const value of ['force', 'concentration']) {
      db.exec('INSERT INTO spell_version_tags (spell_version_id, tag) VALUES (?, ?)', [versionId, value]);
    }
    db.exec("INSERT INTO spell_version_attack_modes (spell_version_id, attack_mode) VALUES (?, 'ranged_spell')", [versionId]);
    db.exec("INSERT INTO spell_version_save_abilities (spell_version_id, save_ability) VALUES (?, 'Dexterity')", [versionId]);
    for (const level of [3, 6]) {
      db.exec('INSERT INTO spell_version_upcast_levels (spell_version_id, level) VALUES (?, ?)', [versionId, level]);
    }
  });

  afterEach(() => connection.close());

  it('reproduces the hand-pinned D173 spell vector byte-for-byte from stored rows', () => {
    const vector = spellProjectorV1Vectors[0]!;
    const projection = projectStoredSpellContentV1(db, CONTENT_KEY);
    const identity = deriveContentIdentityV1({
      kind: 'spell',
      edition: projection.aggregate.rules_edition,
      name: projection.aggregate.name,
      payload: projection.payload,
    });
    expect(identity.canonicalJson).toBe(vector.canonicalJson);
    expect(identity.digest).toBe(vector.sha256);
    expect(identity.derivedKey).toBe(vector.derivedKey);
  });

  it('default-includes a future spell root column instead of collapsing identity', () => {
    const before = projectStoredSpellContentV1(db, CONTENT_KEY);
    db.exec('ALTER TABLE spell_versions ADD COLUMN future_mechanic INTEGER');
    db.exec('UPDATE spell_versions SET future_mechanic = 7 WHERE content_key = ?', [CONTENT_KEY]);
    const after = projectStoredSpellContentV1(db, CONTENT_KEY);
    expect(after.payload).toMatchObject({ stored_fields: { future_mechanic: 7 } });
    expect(deriveContentIdentityV1({ kind: 'spell', edition: 'expanded', name: 'Aether Lance', payload: after.payload }).derivedKey)
      .not.toBe(deriveContentIdentityV1({ kind: 'spell', edition: 'expanded', name: 'Aether Lance', payload: before.payload }).derivedKey);
  });

  it('default-includes a future spell child column instead of collapsing identity', () => {
    const before = projectStoredSpellContentV1(db, CONTENT_KEY);
    db.exec('ALTER TABLE spell_version_tags ADD COLUMN future_tag_mechanic INTEGER');
    db.exec("UPDATE spell_version_tags SET future_tag_mechanic = 9 WHERE tag = 'force'");
    const after = projectStoredSpellContentV1(db, CONTENT_KEY);
    expect(after.payload.tags.values).toContainEqual({
      value: 'force', stored_fields: { future_tag_mechanic: 9 },
    });
    expect(deriveContentIdentityV1({ kind: 'spell', edition: 'expanded', name: 'Aether Lance', payload: after.payload }).derivedKey)
      .not.toBe(deriveContentIdentityV1({ kind: 'spell', edition: 'expanded', name: 'Aether Lance', payload: before.payload }).derivedKey);
  });

  it('refuses placeholder rows instead of projecting partial spell identity', () => {
    db.exec("UPDATE spell_versions SET provenance = 'placeholder', level = -1 WHERE content_key = ?", [CONTENT_KEY]);
    expect(() => projectStoredSpellContentV1(db, CONTENT_KEY))
      .toThrowError(new SpellContentProjectionError(`spell '${CONTENT_KEY}' is a placeholder.`));
  });

  it('refuses a whitespace-padded stored spell-list locator', () => {
    const versionId = Number(db.scalar('SELECT id FROM spell_versions WHERE content_key = ?', [CONTENT_KEY]));
    db.exec('DELETE FROM spell_list_memberships WHERE spell_version_id = ?', [versionId]);
    db.exec("INSERT INTO spell_list_memberships (spell_version_id, spell_list_key) VALUES (?, ' Wizard')", [versionId]);
    expect(() => projectStoredSpellContentV1(db, CONTENT_KEY)).toThrow(SpellContentProjectionError);
  });

  it('refuses structured spell columns that disagree with their runtime source text', () => {
    db.exec("UPDATE spell_versions SET area_feet = 31 WHERE content_key = ?", [CONTENT_KEY]);
    expect(() => projectStoredSpellContentV1(db, CONTENT_KEY)).toThrow(SpellContentProjectionError);
  });
});
