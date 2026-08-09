import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  portableContentImportNodes,
  validatePortableContent,
} from '../../../src/backup/portable-content';
import {
  commitContentImport,
  planContentImport,
} from '../../../src/catalog/content-adoption';
import {
  adjacentContentFingerprintCompatibilityRegistry,
  CONTENT_FINGERPRINT_SCHEME_V2,
  deriveContentIdentityV1,
  deriveContentIdentityV2,
} from '../../../src/catalog/content-identity';
import { registerContentFingerprint } from '../../../src/catalog/content-registry';
import {
  reconcileSpeciesLineageContentV2,
} from '../../../src/catalog/reconcile-species-lineage-content-v2';
import {
  projectSpeciesContentAggregateV2,
  projectStoredAuthoredContentV1,
} from '../../../src/catalog/stored-authored-content-projector-v1';
import { projectStoredPortableContentV2 } from '../../../src/catalog/stored-content-projector-v2';
import { createApplicationLifecycle } from '../../../src/db/bootstrap';
import type { DatabaseLifecycle } from '../../../src/db/database-lifecycle';
import type { ContentKey } from '../../../src/domain/ids';
import { getSqlite3, MemoryDatabaseStorage } from '../../helpers/open-db';

let lifecycle: DatabaseLifecycle;

beforeEach(async () => {
  const sqlite3 = await getSqlite3();
  lifecycle = createApplicationLifecycle(
    sqlite3,
    new MemoryDatabaseStorage(sqlite3),
  );
  lifecycle.open();
});

afterEach(() => lifecycle.close());

function elfProjection() {
  return projectStoredPortableContentV2(
    lifecycle.database,
    'species',
    '2024:species:elf' as ContentKey,
  );
}

function clonedElf() {
  return JSON.parse(JSON.stringify(elfProjection().aggregate));
}

function digestOf(aggregate: ReturnType<typeof clonedElf>): string {
  const projected = projectSpeciesContentAggregateV2(aggregate);
  return deriveContentIdentityV2({
    kind: 'species',
    edition: aggregate.rules_edition,
    name: aggregate.name,
    payload: projected.payload,
  }).digest;
}

describe('stored authored content-v2 projector', () => {
  it('promotes bundled Elf once and keeps v1 closed', () => {
    const current = lifecycle.database.allRaw(
      `SELECT fingerprint_scheme, fingerprint_role
       FROM catalog_content_fingerprints
       WHERE content_kind = 'species' AND content_key = '2024:species:elf'
       ORDER BY fingerprint_scheme`,
    );
    expect(current.filter((row) => row.fingerprint_role === 'current')).toEqual([
      { fingerprint_scheme: 'content-v2', fingerprint_role: 'current' },
    ]);
    expect(() => projectStoredAuthoredContentV1(lifecycle.database, {
      kind: 'species',
      contentKey: '2024:species:elf' as ContentKey,
      references: {
        spell: () => { throw new Error('v1 must reject before resolving'); },
        feat: () => { throw new Error('unused'); },
        class: () => { throw new Error('unused'); },
        weapon: () => { throw new Error('unused'); },
        armor: () => { throw new Error('unused'); },
        sourceDefinition: () => { throw new Error('unused'); },
      },
    })).toThrow("Unknown grant rule kind 'configured_choice'.");
  });

  it('makes nested spell, effect, range, and option data identity-bearing', () => {
    const baseline = clonedElf();
    const baselineDigest = digestOf(baseline);
    const mutations = [
      (aggregate: ReturnType<typeof clonedElf>) => {
        aggregate.source_rules[0].options[0].grants[0].spell.digest = '0'.repeat(64);
      },
      (aggregate: ReturnType<typeof clonedElf>) => {
        aggregate.source_rules[0].options[2].effects[0].speed_bonus_feet = 4;
      },
      (aggregate: ReturnType<typeof clonedElf>) => {
        aggregate.source_rules[0].options[0].sheet.darkvision_feet = 60;
      },
      (aggregate: ReturnType<typeof clonedElf>) => {
        aggregate.source_rules[0].options[0].value = 'Moon Elf';
      },
    ];
    for (const mutate of mutations) {
      const aggregate = clonedElf();
      mutate(aggregate);
      expect(digestOf(aggregate)).not.toBe(baselineDigest);
    }
    expect(JSON.stringify(baseline)).not.toContain('spell_version_id');
    expect(JSON.stringify(baseline)).not.toContain('spell_version_key');

    const dancingLightsId = lifecycle.database.scalar<number>(
      `SELECT id FROM spell_versions WHERE content_key = '2024:dancing-lights'`,
    );
    if (dancingLightsId === null) throw new Error('Dancing Lights is absent.');
    lifecycle.database.exec('PRAGMA foreign_keys = OFF');
    try {
      lifecycle.database.exec(
        `UPDATE spell_versions SET id = 900001 WHERE id = ?`,
        [dancingLightsId],
      );
      expect(digestOf(clonedElf())).toBe(baselineDigest);
    } finally {
      try {
        lifecycle.database.exec(
          `UPDATE spell_versions SET id = ? WHERE id = 900001`,
          [dancingLightsId],
        );
      } finally {
        lifecycle.database.exec('PRAGMA foreign_keys = ON');
      }
    }
  });

  it('refuses an unknown configured-choice field at the portable projector boundary', () => {
    const aggregate = clonedElf();
    aggregate.source_rules[0].future_default = 'Drow';
    expect(() => projectSpeciesContentAggregateV2(aggregate)).toThrow(
      'species source_rules[0] is invalid.',
    );
  });

  it('reconciles an existing v1 Elf twice without moving its stable source', () => {
    const contentKey = '2024:species:elf' as ContentKey;
    lifecycle.database.exec(
      `UPDATE catalog_content_fingerprints
       SET fingerprint_role = 'bundled-historical'
       WHERE content_key = ? AND fingerprint_role = 'current'`,
      [contentKey],
    );
    const oldIdentity = deriveContentIdentityV1({
      kind: 'species',
      edition: '2024',
      name: 'Elf',
      payload: { grants: [{ kind: 'fixed_spell', rule_key: 'old-lineage' }] },
    });
    registerContentFingerprint(lifecycle.database, {
      kind: 'species',
      contentKey,
      scheme: oldIdentity.envelope.scheme,
      digest: oldIdentity.digest,
      canonicalJson: oldIdentity.canonicalJson,
      role: 'current',
    });
    const characterId = lifecycle.database.exec(
      `INSERT INTO characters (name) VALUES ('Existing Elf')`,
    ).lastInsertId;
    const definitionId = lifecycle.database.scalar<number>(
      `SELECT id FROM species_definitions WHERE content_key = ?`,
      [contentKey],
    );
    if (definitionId === null) throw new Error('Elf definition is absent.');
    const sourceId = lifecycle.database.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, source_definition_id,
         display_name
       ) VALUES (?, 'existing-elf-source', 'species', ?, 'Elf')`,
      [characterId, definitionId],
    ).lastInsertId;

    reconcileSpeciesLineageContentV2(lifecycle.database);
    const afterFirst = {
      fingerprints: lifecycle.database.allRaw(
        `SELECT fingerprint_scheme, fingerprint_digest, canonical_json,
                fingerprint_role
         FROM catalog_content_fingerprints WHERE content_key = ?
         ORDER BY fingerprint_scheme, fingerprint_digest`,
        [contentKey],
      ),
      source: lifecycle.database.oneRaw(
        `SELECT id, character_id, source_definition_id, state
         FROM character_source_instances WHERE id = ?`,
        [sourceId],
      ),
    };
    expect(afterFirst.fingerprints).toContainEqual({
      fingerprint_scheme: 'content-v1',
      fingerprint_digest: oldIdentity.digest,
      canonical_json: oldIdentity.canonicalJson,
      fingerprint_role: 'bundled-historical',
    });
    expect(afterFirst.fingerprints.filter((row) =>
      row.fingerprint_role === 'current'
    )).toHaveLength(1);
    expect(afterFirst.fingerprints.find((row) =>
      row.fingerprint_role === 'current'
    )?.fingerprint_scheme).toBe('content-v2');

    reconcileSpeciesLineageContentV2(lifecycle.database);
    expect({
      fingerprints: lifecycle.database.allRaw(
        `SELECT fingerprint_scheme, fingerprint_digest, canonical_json,
                fingerprint_role
         FROM catalog_content_fingerprints WHERE content_key = ?
         ORDER BY fingerprint_scheme, fingerprint_digest`,
        [contentKey],
      ),
      source: lifecycle.database.oneRaw(
        `SELECT id, character_id, source_definition_id, state
         FROM character_source_instances WHERE id = ?`,
        [sourceId],
      ),
    }).toEqual(afterFirst);
  });

  it('round-trips a v2 Elf portable entry and pins v1 adjacency to no guessed choice', () => {
    const aggregate = clonedElf();
    aggregate.name = 'Portable Elf';
    const projected = projectSpeciesContentAggregateV2(aggregate);
    const identity = deriveContentIdentityV2({
      kind: 'species',
      edition: aggregate.rules_edition,
      name: aggregate.name,
      payload: projected.payload,
    });
    const input = [{
      kind: 'species',
      content_key: '2024:example.test:portable-elf',
      key_kind: 'asserted',
      fingerprint_scheme: CONTENT_FINGERPRINT_SCHEME_V2,
      fingerprint_digest: identity.digest,
      aggregate,
    }];
    expect(validatePortableContent(input)).toEqual(input);
    const nodes = portableContentImportNodes(lifecycle.database, input);
    const plan = planContentImport(lifecycle.database, nodes);
    expect(plan.outcomes).toEqual([{
      id: 'portable:species:2024:example.test:portable-elf',
      kind: 'create',
      contentKey: '2024:example.test:portable-elf',
    }]);
    expect(commitContentImport(lifecycle.database, {
      nodes,
      token: plan.token,
      precommitPlan: plan,
    })).toEqual({
      kind: 'committed',
      outcomes: plan.outcomes,
    });
    expect(projectStoredPortableContentV2(
      lifecycle.database,
      'species',
      '2024:example.test:portable-elf' as ContentKey,
    ).aggregate).toEqual(aggregate);
    expect(lifecycle.database.oneRaw(
      `SELECT fingerprint_scheme, fingerprint_digest
       FROM catalog_content_fingerprints
       WHERE content_key = ? AND fingerprint_role = 'current'`,
      ['2024:example.test:portable-elf'],
    )).toEqual({
      fingerprint_scheme: 'content-v2',
      fingerprint_digest: identity.digest,
    });

    const adjacent = adjacentContentFingerprintCompatibilityRegistry[
      'content-v2'
    ]?.({
      scheme: 'content-v1',
      kind: 'species',
      edition: '2024',
      normalizedName: 'elf',
      payload: { grants: [{ kind: 'fixed_spell', rule_key: 'old-rule' }] },
    }) as Readonly<Record<string, unknown>>;
    expect(adjacent).toEqual({
      scheme: 'content-v2',
      kind: 'species',
      edition: '2024',
      normalizedName: 'elf',
      payload: {
        source_rules: [{ kind: 'fixed_spell', rule_key: 'old-rule' }],
      },
    });
    expect(JSON.stringify(adjacent)).not.toContain('configured_choice');
  });
});
