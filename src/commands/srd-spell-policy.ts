import type { DatabaseContext } from '../db/database';
import { assertContentFingerprintIntegrity } from '../catalog/content-registry';
import type { ContentKey } from '../domain/ids';

export const SRD_SPELL_READ_ONLY_MESSAGE =
  'Bundled SRD spells are read-only. Copy the spell to customise it.';

export type SpellCatalogMutation = 'edit' | 'delete';

export class SrdSpellPolicyRefusal extends Error {
  constructor(readonly reason: 'bundled_read_only') {
    super(SRD_SPELL_READ_ONLY_MESSAGE);
    this.name = 'SrdSpellPolicyRefusal';
  }
}

/**
 * The command-layer boundary for catalogue mutations.
 *
 * SQLite cannot express "users may not UPDATE or DELETE this row" as a CHECK,
 * and triggers would also block the trusted bundled seeder. Commands therefore
 * resolve the target first and refuse an SRD row explicitly. Both actions use
 * one message because the remedy is the same: a later fork command will copy
 * the bundled spell into user-owned content before edits are allowed.
 */
export function assertSpellVersionCommandAllowed(
  db: DatabaseContext,
  versionId: number,
  _action: SpellCatalogMutation,
): void {
  const provenance = db.scalar(
    'SELECT provenance FROM spell_versions WHERE id = ?',
    [versionId],
  );
  if (provenance === 'srd') {
    throw new SrdSpellPolicyRefusal('bundled_read_only');
  }
}

/**
 * Import is the currently shipped catalogue-edit command. Check its target key
 * before identity resolution so a rejected collision cannot mutate even the
 * identity half of an SRD spell.
 */
export function assertImportedSpellKeyWritable(
  db: DatabaseContext,
  contentKey: string,
): void {
  if (db.scalar<number>(
    `SELECT 1 FROM catalog_content_identities
     WHERE content_kind = 'spell' AND content_key = ?`,
    [contentKey],
  ) === 1) {
    assertContentFingerprintIntegrity(db, {
      kind: 'spell',
      contentKey: contentKey as ContentKey,
    });
  }
  const versionId = db.scalar(
    `SELECT id FROM spell_versions
     WHERE content_key = ? AND provenance = 'srd'`,
    [contentKey],
  );
  if (versionId !== null) {
    assertSpellVersionCommandAllowed(db, Number(versionId), 'edit');
  }
}

/**
 * Identity resolution is also a write surface: the importer can find an
 * identity by key, normalized name, or alias and then rename it. Refuse that
 * rename when the identity owns an SRD version, even if the imported VERSION
 * key itself is different and therefore passed the key check above.
 */
export function assertImportedSpellIdentityWritable(
  db: DatabaseContext,
  identityKey: string,
  canonicalName: string,
  normalizedName: string,
): void {
  const identity = db.oneRaw(
    `SELECT identity.id, identity.content_key, identity.canonical_name
     FROM spell_identities AS identity
     WHERE identity.content_key = ?
        OR identity.normalized_name = ?
        OR identity.id = (
          SELECT alias.spell_identity_id
          FROM spell_identity_aliases AS alias
          WHERE alias.normalized_alias = ?
          LIMIT 1
        )
     ORDER BY
       CASE WHEN identity.content_key = ? THEN 0
            WHEN identity.normalized_name = ? THEN 1
            ELSE 2 END,
       identity.id
     LIMIT 1`,
    [
      identityKey,
      normalizedName,
      normalizedName,
      identityKey,
      normalizedName,
    ],
  );
  if (
    identity === null ||
    (identity.canonical_name === canonicalName &&
      !String(identity.content_key).startsWith('placeholder:'))
  ) {
    return;
  }
  const srdVersionId = db.scalar(
    `SELECT id FROM spell_versions
     WHERE spell_identity_id = ? AND provenance = 'srd'
     LIMIT 1`,
    [Number(identity.id)],
  );
  if (srdVersionId !== null) {
    assertSpellVersionCommandAllowed(db, Number(srdVersionId), 'edit');
  }
}
