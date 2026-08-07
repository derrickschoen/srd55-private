import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import { CatalogImporter } from '../../../src/catalog/catalog-importer';
import { reconcileBundledContentRegistryV1 } from '../../../src/catalog/bundled-content-registry-v1';
import { exportCharacterBackup } from '../../../src/backup/character-backup';
import {
  FORK_NAME_REQUIRED_MESSAGE,
  type ForkSpellCommitResult,
  forkSrdSpell,
  type ForkSpellImportResult,
  type ForkSpellResult,
  planSrdSpellFork,
} from '../../../src/catalog/spell-fork';
import {
  ContentIdentityCollision,
  ContentIdentityKeyRefusal,
} from '../../../src/catalog/content-registry';
import {
  assertImportedSpellKeyWritable,
  assertSpellVersionCommandAllowed,
} from '../../../src/commands/srd-spell-policy';
import { DatabaseContext } from '../../../src/db/database';
import { seedSpellContent } from '../../../src/rules/spells-srd';
import { projectStoredSpellContentV1 } from '../../../src/catalog/spell-content-projector-v1';
import type { ContentImportPlan } from '../../../src/catalog/content-adoption';
import type { CatalogImportCommitResult } from '../../../src/catalog/catalog-importer';
import {
  exportCharacterShare,
  importCharacterShare,
  previewCharacterShare,
} from '../../../src/sharing/character-share';
import {
  decodeShareFragment,
  encodeShareFragment,
  positionalToShareDocument,
  shareDocumentToReferencePositional,
} from '../../../src/sharing/codec';
import { handlers } from '../../../src/worker/handlers/catalog';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';
import { openTestDatabase } from '../../helpers/open-db';

const connections: Database[] = [];
let harness: RpcHarness | undefined;

afterEach(() => {
  for (const connection of connections.splice(0)) {
    connection.close();
  }
  harness?.close();
  harness = undefined;
});

async function seededDatabase(): Promise<DatabaseContext> {
  const connection = await openTestDatabase();
  connections.push(connection);
  const db = new DatabaseContext(connection);
  seedSpellContent(db);
  return db;
}

function importedRecord(versionKey: string, name: string): string {
  return JSON.stringify([
    {
      identityKey: `identity-${name.toLowerCase().replaceAll(' ', '-')}`,
      versionKey,
      name,
      edition: '2024',
      level: 1,
      school: 'Evocation',
      castingTime: 'Action',
      range: '60 feet',
      components: 'V, S',
      duration: 'Instantaneous',
      concentration: false,
      ritual: false,
      attackModes: [],
      saveAbilities: [],
      effectReliabilityCategory: 'fixed_effect',
      spellLists: ['Wizard'],
      sourceBooks: ['Fixture'],
      sourcePage: 1,
      sourceSlug: name.toLowerCase().replaceAll(' ', '-'),
    },
  ]);
}

describe('bundled spell forks', () => {
  it('plans and commits an external Fireball fallback with a receipt through public catalog RPC', async () => {
    harness = await createRpcHarness(handlers);
    seedSpellContent(harness.context.db);
    reconcileBundledContentRegistryV1(harness.context.db);
    const stored = projectStoredSpellContentV1(
      harness.context.db,
      '2024:fireball' as import('../../../src/domain/ids').ContentKey,
    ).aggregate;
    const values = <T>(members: readonly ({ readonly value: T } | T)[]): T[] =>
      members.map((member) => typeof member === 'object' && member !== null && 'value' in member
        ? member.value
        : member as T);
    const tier1 = JSON.stringify([{
      identityKey: stored.spell_identity_key,
      versionKey: stored.spell_version_key,
      name: stored.name,
      edition: stored.rules_edition,
      level: stored.level,
      school: stored.school,
      castingTime: stored.casting_time,
      range: stored.range,
      components: stored.components,
      duration: stored.duration,
      concentration: stored.concentration,
      ritual: stored.ritual,
      attackModes: values(stored.attack_modes),
      saveAbilities: values(stored.save_abilities),
      effectReliabilityCategory: stored.effect_reliability_category,
      spellLists: values(stored.spell_lists),
      sourceBooks: [],
      sourcePage: null,
      sourceSlug: null,
      tags: values(stored.tags),
      healing: stored.healing,
      requiresModForEffect: stored.requires_mod_for_effect,
      upcastLevels: values(stored.upcast_levels),
      upcastSummary: stored.upcast_summary,
      cantripUpgradeLevels: values(stored.cantrip_upgrade_levels),
      cantripUpgradeSummary: stored.cantrip_upgrade_summary,
    }]);
    const params = {
      documents: [tier1],
      ...(stored.short_summary === null
        ? {}
        : { textDocuments: [JSON.stringify([{
            versionKey: stored.spell_version_key,
            _description: stored.short_summary,
          }])] }),
    };

    const planned = await harness.call<typeof params, ContentImportPlan>(
      'catalog.import',
      params,
    );
    expect(planned.ok).toBe(true);
    if (!planned.ok) throw new Error(planned.error.message);
    expect(planned.result.reviews).toEqual([
      expect.objectContaining({
        id: 'spell:2024:fireball',
        targetContentKey: '2024:fireball',
        matchClass: 'srd-fallback',
        defaultChoice: 'match',
      }),
    ]);

    const committed = await harness.call<
      typeof params & { token: ContentImportPlan['token']; choices: Record<string, { decision: 'match' }> },
      CatalogImportCommitResult
    >('catalog.commitImport', {
      ...params,
      token: planned.result.token,
      choices: { 'spell:2024:fireball': { decision: 'match' } },
    });
    expect(committed).toMatchObject({
      ok: true,
      result: { kind: 'committed' },
    });
    expect(harness.context.db.oneRaw(
      `SELECT decision, target_content_key
       FROM catalog_content_match_decisions
       WHERE content_kind = 'spell'`,
    )).toEqual({ decision: 'match', target_content_key: '2024:fireball' });

    const receipts = await harness.call<Record<string, never>, readonly {
      readonly kind: string;
      readonly scheme: 'content-v1';
      readonly digest: string;
    }[]>('catalog.matchDecisions', {});
    expect(receipts.ok).toBe(true);
    if (!receipts.ok) throw new Error(receipts.error.message);
    expect(receipts.result).toHaveLength(1);

    const receipt = receipts.result[0]!;
    const forgotten = await harness.call<
      { readonly kind: string; readonly scheme: 'content-v1'; readonly digest: string },
      { readonly forgotten: boolean }
    >('catalog.forgetMatchDecision', {
      kind: receipt.kind,
      scheme: receipt.scheme,
      digest: receipt.digest,
    });
    expect(forgotten).toMatchObject({
      ok: true,
      result: { forgotten: true },
    });
    expect(harness.context.db.scalar<number>(
      'SELECT count(*) FROM catalog_content_match_decisions',
    )).toBe(0);
  });

  it('dispatches an editable user-owned copy with ancestry and enumerated memberships', async () => {
    harness = await createRpcHarness(handlers);
    seedSpellContent(harness.context.db);
    const db = harness.context.db;

    const response = await harness.call<
      { sourceContentKey: string },
      ForkSpellResult
    >('catalog.forkSpell', { sourceContentKey: '2024:fireball' });
    expect(response.ok).toBe(true);
    if (!response.ok) {
      throw new Error(response.error.message);
    }

    expect(
      db.oneRaw(
        `SELECT content_key, display_name, forked_from_content_key,
                provenance, is_active
         FROM spell_versions WHERE id = ?`,
        [response.result.spellVersionId],
      ),
    ).toEqual({
      content_key: response.result.contentKey,
      display_name: 'Fireball (Copy)',
      forked_from_content_key: '2024:fireball',
      provenance: 'user',
      is_active: 1,
    });
    expect(response.result.contentKey).toMatch(
      /^2024:local\.dnd-wt:[a-z0-9-]+$/,
    );
    expect(
      db
        .allRaw(
          `SELECT spell_list_key
           FROM spell_list_memberships
           WHERE spell_version_id = ?
           ORDER BY spell_list_key`,
          [response.result.spellVersionId],
        )
        .map((row) => String(row.spell_list_key)),
    ).toEqual(['Sorcerer', 'Wizard']);
    expect(() =>
      assertSpellVersionCommandAllowed(
        db,
        response.result.spellVersionId,
        'edit',
      ),
    ).not.toThrow();
    expect(() =>
      assertSpellVersionCommandAllowed(
        db,
        response.result.spellVersionId,
        'delete',
      ),
    ).not.toThrow();
  });

  it('refuses only the source name and allows another spell name', async () => {
    const db = await seededDatabase();

    expect(() =>
      forkSrdSpell(db, {
        sourceContentKey: '2024:fireball',
        name: 'Fireball',
      }),
    ).toThrow(FORK_NAME_REQUIRED_MESSAGE);

    const fork = forkSrdSpell(db, {
      sourceContentKey: '2024:fireball',
      name: 'Acid Arrow',
    });
    expect(
      db.oneRaw(
        `SELECT display_name, forked_from_content_key, provenance
         FROM spell_versions WHERE id = ?`,
        [fork.spellVersionId],
      ),
    ).toEqual({
      display_name: 'Acid Arrow',
      forked_from_content_key: '2024:fireball',
      provenance: 'user',
    });
  });

  it('routes two different source spells under the same asserted name to review', async () => {
    const db = await seededDatabase();
    const first = forkSrdSpell(db, {
      sourceContentKey: '2024:fireball',
      name: 'Homebrew Spell',
    });

    const review = forkSrdSpell(db, {
      sourceContentKey: '2024:acid-arrow',
      name: 'Homebrew Spell',
    }) as ForkSpellImportResult;
    expect('reviews' in review && review.reviews).toEqual([
      expect.objectContaining({ matchClass: 'key-collision' }),
    ]);
    expect(db.oneRaw(
      `SELECT id, forked_from_content_key FROM spell_versions
       WHERE content_key = ?`,
      [first.contentKey],
    )).toEqual({
      id: first.spellVersionId,
      forked_from_content_key: '2024:fireball',
    });
    expect(db.scalar<number>(
      `SELECT count(*) FROM spell_versions WHERE display_name = 'Homebrew Spell'`,
    )).toBe(1);
  });

  it('CI7-SPELL-SELF-MATCH silently reuses one byte-identical fork through the common lifecycle', async () => {
    const db = await seededDatabase();
    const params = {
      sourceContentKey: '2024:fireball',
      name: 'Ember Sphere',
    };

    const first = forkSrdSpell(db, params);
    const repeatedPlan = planSrdSpellFork(db, params);
    expect(repeatedPlan.reviews).toEqual([]);
    expect(repeatedPlan.outcomes).toEqual([
      {
        id: `spell-fork:${first.contentKey}`,
        kind: 'match',
        contentKey: first.contentKey,
      },
    ]);

    const repeated = forkSrdSpell(db, params);
    expect(repeated).toEqual(first);
    expect(db.scalar<number>(
      'SELECT count(*) FROM spell_versions WHERE content_key = ?',
      [first.contentKey],
    )).toBe(1);
    expect(db.scalar<number>(
      'SELECT count(*) FROM catalog_content_match_decisions',
    )).toBe(0);
  });

  it('commits an explicit clone choice for a fork collision through public catalog RPC', async () => {
    harness = await createRpcHarness(handlers);
    seedSpellContent(harness.context.db);

    const first = await harness.call<
      { readonly sourceContentKey: string; readonly name: string },
      ForkSpellImportResult
    >('catalog.forkSpell', {
      sourceContentKey: '2024:fireball',
      name: 'Homebrew Spell',
    });
    expect(first.ok).toBe(true);

    const params = {
      sourceContentKey: '2024:acid-arrow',
      name: 'Homebrew Spell',
    };
    const planned = await harness.call<typeof params, ForkSpellImportResult>(
      'catalog.forkSpell',
      params,
    );
    expect(planned.ok).toBe(true);
    if (!planned.ok || !('reviews' in planned.result)) {
      throw new Error('Expected a review-bearing fork plan.');
    }
    expect(planned.result.reviews).toEqual([
      expect.objectContaining({
        id: 'spell-fork:2024:local.dnd-wt:homebrew-spell',
        matchClass: 'key-collision',
      }),
    ]);

    const choices = {
      'spell-fork:2024:local.dnd-wt:homebrew-spell': {
        decision: 'clone' as const,
        cloneName: 'Homebrew Spell II',
      },
    };
    const replanned = await harness.call<
      typeof params & { readonly choices: typeof choices },
      ContentImportPlan
    >('catalog.planForkSpell', { ...params, choices });
    expect(replanned.ok).toBe(true);
    if (!replanned.ok) throw new Error(replanned.error.message);
    const committed = await harness.call<
      typeof params & {
        readonly token: ContentImportPlan['token'];
        readonly choices: typeof choices;
      },
      ForkSpellCommitResult
    >('catalog.commitForkSpell', {
      ...params,
      token: replanned.result.token,
      choices,
    });
    expect(committed).toMatchObject({
      ok: true,
      result: {
        kind: 'committed',
        spell: {
          contentKey: '2024:local.dnd-wt:homebrew-spell-ii',
          displayName: 'Homebrew Spell II',
          forkedFromContentKey: '2024:acid-arrow',
        },
      },
    });
  });

  it('returns a typed integrity refusal for damaged canonical bytes on an exact spell key', async () => {
    const db = await seededDatabase();
    reconcileBundledContentRegistryV1(db);
    db.exec(
      `UPDATE catalog_content_fingerprints SET canonical_json = 'damaged'
       WHERE content_kind = 'spell' AND content_key = '2024:fireball'
         AND fingerprint_role = 'current'`,
    );

    expect(() =>
      assertImportedSpellKeyWritable(db, '2024:fireball')
    ).toThrow(ContentIdentityCollision);
  });

  it('survives import tombstoning and SRD re-seeding while the import control is tombstoned', async () => {
    const db = await seededDatabase();
    const fork = forkSrdSpell(db, {
      sourceContentKey: '2024:fireball',
    });
    const importer = new CatalogImporter(db);
    importer.import({
      documents: [
        importedRecord('2024:user.test:discarded-control', 'Discarded Control'),
      ],
    });

    const summary = importer.import({
      documents: [
        importedRecord('2024:user.test:retained-control', 'Retained Control'),
      ],
    });
    expect(summary.tombstoned).toBe(1);
    expect(
      db.allRaw(
        `SELECT content_key, provenance, is_active
         FROM spell_versions
         WHERE id = ?
            OR content_key IN (
              '2024:user.test:discarded-control',
              '2024:user.test:retained-control'
            )
         ORDER BY content_key`,
        [fork.spellVersionId],
      ),
    ).toEqual([
      {
        content_key: fork.contentKey,
        provenance: 'user',
        is_active: 1,
      },
      {
        content_key: '2024:user.test:discarded-control',
        provenance: 'import',
        is_active: 0,
      },
      {
        content_key: '2024:user.test:retained-control',
        provenance: 'import',
        is_active: 1,
      },
    ]);

    seedSpellContent(db);
    expect(
      db.oneRaw(
        `SELECT content_key, display_name, forked_from_content_key,
                provenance, is_active
         FROM spell_versions WHERE id = ?`,
        [fork.spellVersionId],
      ),
    ).toEqual({
      content_key: fork.contentKey,
      display_name: 'Fireball (Copy)',
      forked_from_content_key: '2024:fireball',
      provenance: 'user',
      is_active: 1,
    });
  });

  it('carries forks and imported homebrew in v18 while v17 stays reference-only', async () => {
    const sender = await seededDatabase();
    const fork = forkSrdSpell(sender, {
      sourceContentKey: '2024:fireball',
    });
    const importedKey = '2024:user.test:shared-homebrew';
    new CatalogImporter(sender).import({
      documents: [importedRecord(importedKey, 'Shared Homebrew')],
    });
    const importedId = Number(
      sender.scalar(
        'SELECT id FROM spell_versions WHERE content_key = ?',
        [importedKey],
      ),
    );
    const characterId = sender.exec(
      `INSERT INTO characters (name) VALUES ('Fork Sharer')`,
    ).lastInsertId;
    for (const spellVersionId of [fork.spellVersionId, importedId]) {
      sender.exec(
        `INSERT INTO wizard_spellbook_entries (
           character_id, spell_version_id
         ) VALUES (?, ?)`,
        [characterId, spellVersionId],
      );
    }

    const shared = await decodeShareFragment(
      await encodeShareFragment(
        exportCharacterShare(sender, characterId),
      ),
    );
    expect(shared.spellbook).toEqual([
      { spellKey: fork.contentKey },
      { spellKey: importedKey },
    ]);
    expect(Object.hasOwn(shared, 'forks')).toBe(false);
    expect(JSON.stringify(shared)).not.toContain(
      'forked_from_content_key',
    );
    const forkFingerprint = sender.scalar<string>(
      `SELECT fingerprint_digest FROM catalog_content_fingerprints
       WHERE content_kind = 'spell' AND content_key = ?
         AND fingerprint_role = 'current'`,
      [fork.contentKey],
    );
    expect(shared.portableContent?.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'spell',
          content_key: fork.contentKey,
          fingerprint_scheme: 'content-v1',
          fingerprint_digest: forkFingerprint,
        }),
        expect.objectContaining({
          kind: 'spell',
          content_key: importedKey,
          fingerprint_scheme: 'content-v1',
          fingerprint_digest: expect.stringMatching(/^[0-9a-f]{64}$/),
        }),
      ]),
    );
    expect(JSON.stringify(shared.portableContent)).toContain(
      'material_component_summary',
    );

    const referenceOnly = positionalToShareDocument(
      shareDocumentToReferencePositional(shared),
    );
    expect(referenceOnly.version).toBe(18);
    expect(referenceOnly.spellbook).toEqual(shared.spellbook);
    expect(referenceOnly.portableContent).toBeUndefined();
    expect(JSON.stringify(referenceOnly)).not.toContain(
      'material_component_summary',
    );

    const backup = exportCharacterBackup(sender, characterId);
    expect(
      backup.references.spell_versions.map((reference) => ({
        keys: Object.keys(reference).sort(),
        contentKey: reference.content_key,
      })),
    ).toEqual([
      { keys: ['content_key', 'id'], contentKey: fork.contentKey },
      { keys: ['content_key', 'id'], contentKey: importedKey },
    ]);

    const recipient = await seededDatabase();
    expect(previewCharacterShare(recipient, shared).placeholderCount).toBe(0);
    const imported = importCharacterShare(recipient, shared);
    expect(
      recipient
        .allRaw(
          `SELECT version.content_key, version.provenance,
                  version.forked_from_content_key
           FROM wizard_spellbook_entries AS entry
           INNER JOIN spell_versions AS version
             ON version.id = entry.spell_version_id
           WHERE entry.character_id = ?
           ORDER BY version.content_key`,
          [imported.characterId],
        )
    ).toEqual([
      {
        content_key: fork.contentKey,
        provenance: 'import',
        forked_from_content_key: null,
      },
      {
        content_key: importedKey,
        provenance: 'import',
        forked_from_content_key: null,
      },
    ]);

    const fallbackRecipient = await seededDatabase();
    expect(
      previewCharacterShare(fallbackRecipient, referenceOnly).placeholderCount,
    ).toBe(2);
    const fallbackImported = importCharacterShare(
      fallbackRecipient,
      referenceOnly,
    );
    expect(
      fallbackRecipient
        .allRaw(
          `SELECT version.content_key, version.provenance,
                  version.forked_from_content_key
           FROM wizard_spellbook_entries AS entry
           INNER JOIN spell_versions AS version
             ON version.id = entry.spell_version_id
           WHERE entry.character_id = ?
           ORDER BY version.content_key`,
          [fallbackImported.characterId],
        ),
    ).toEqual([
      {
        content_key: fork.contentKey,
        provenance: 'placeholder',
        forked_from_content_key: null,
      },
      {
        content_key: importedKey,
        provenance: 'placeholder',
        forked_from_content_key: null,
      },
    ]);
  });
});
