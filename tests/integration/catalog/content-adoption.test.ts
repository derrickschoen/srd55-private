import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  commitContentImport,
  contentFingerprintReferenceKey,
  planContentImport,
  projectionFingerprintReferences,
  type ContentImportChoices,
  type ContentImportNode,
  type ContentImportProjection,
} from '../../../src/catalog/content-adoption';
import { assertedExternalContentKey } from '../../../src/catalog/catalog-key';
import { canonicalJson } from '../../../src/commands/canonical-json';
import {
  deriveContentIdentityV1,
  type ContentFingerprintDigest,
} from '../../../src/catalog/content-identity';
import {
  registerBundledStableContentIdentity,
  registerContentAlias,
  registerContentFingerprint,
} from '../../../src/catalog/content-registry';
import { reconcileBundledContentRegistryV1 } from '../../../src/catalog/bundled-content-registry-v1';
import { projectStoredSpellContentV1 } from '../../../src/catalog/spell-content-projector-v1';
import { DatabaseContext } from '../../../src/db/database';
import type { ContentKey } from '../../../src/domain/ids';
import { openTestDatabase } from '../../helpers/open-db';
import { seedSpellContent } from '../../../src/rules/spells-srd';
import { applicationSeed } from '../../../src/db/bootstrap';
import { projectStoredContentV1 } from '../../../src/catalog/stored-content-projector-v1';

let connection: Database;
let db: DatabaseContext;

beforeEach(async () => {
  connection = await openTestDatabase();
  db = new DatabaseContext(connection);
});

afterEach(() => connection.close());

function itemProjection(
  name: string,
  payload: unknown,
  options: {
    readonly assertedKey?: ContentKey;
    readonly declaredAlias?: ContentKey;
  } = {},
): ContentImportProjection<'item'> {
  const assertedKey = options.assertedKey ??
    assertedExternalContentKey('item', '2024', name);
  return {
    kind: 'item',
    edition: '2024',
    name,
    assertedKey,
    payload,
    ...(options.declaredAlias === undefined
      ? {}
      : { declaredAlias: options.declaredAlias }),
    projectStored: (database, contentKey) => {
      const row = database.oneRaw(
        `SELECT rules_edition, name, description
         FROM item_definitions WHERE content_key = ?`,
        [contentKey],
      );
      if (row === null) throw new TypeError(`Missing stored item '${contentKey}'.`);
      return {
        kind: 'item',
        edition: String(row.rules_edition),
        name: String(row.name),
        payload: JSON.parse(String(row.description)) as unknown,
      };
    },
    install: (database, contentKey, installed) => {
      database.exec(
        `INSERT INTO item_definitions (
           content_key, rules_edition, name, description,
           requires_attunement, created_at, updated_at
         ) VALUES (?, '2024', ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [contentKey, installed.name, canonicalJson(installed.payload)],
      );
    },
  };
}

function node(
  id: string,
  name: string,
  payload: unknown,
  options: {
    readonly declaredAlias?: ContentKey;
    readonly dependencies?: readonly string[];
    readonly reproject?: ContentImportNode<'item'>['reproject'];
  } = {},
): ContentImportNode<'item'> {
  return {
    id,
    dependencies: options.dependencies ?? [],
    projection: itemProjection(name, payload, {
      ...(options.declaredAlias === undefined
        ? {}
        : { declaredAlias: options.declaredAlias }),
    }),
    ...(options.reproject === undefined
      ? {}
      : { reproject: options.reproject }),
  };
}

function bundledTarget(
  key: string,
  name: string,
  payload: unknown,
): ContentKey {
  const contentKey = key as ContentKey;
  registerBundledStableContentIdentity(db, {
    kind: 'item',
    contentKey,
    normalizedName: name.toLowerCase(),
  });
  db.exec(
    `INSERT INTO item_definitions (
       content_key, rules_edition, name, description,
       requires_attunement, created_at, updated_at
         ) VALUES (?, '2024', ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [contentKey, name, canonicalJson(payload)],
  );
  const identity = deriveContentIdentityV1({
    kind: 'item',
    edition: '2024',
    name,
    payload,
  });
  registerContentFingerprint(db, {
    kind: 'item',
    contentKey,
    scheme: identity.envelope.scheme,
    digest: identity.digest,
    canonicalJson: identity.canonicalJson,
    role: 'current',
  });
  return contentKey;
}

describe('D82 two-phase content adoption controls', () => {
  it('CI-SRD-FALLBACK-REVIEW exercises the spell path with an explicit choice and never overwrites bundled content', () => {
    seedSpellContent(db);
    reconcileBundledContentRegistryV1(db);
    const target = '2024:fireball' as ContentKey;
    const stored = projectStoredSpellContentV1(db, target);
    const incoming: ContentImportNode<'spell'> = {
      id: 'spell:fireball-fallback',
      dependencies: [],
      projection: {
        kind: 'spell',
        edition: stored.aggregate.rules_edition,
        name: stored.aggregate.name,
        assertedKey: assertedExternalContentKey('spell', '2024', stored.aggregate.name),
        payload: stored.payload,
        projectStored: (database, contentKey) => {
          const live = projectStoredSpellContentV1(database, contentKey);
          return {
            kind: live.kind,
            edition: live.aggregate.rules_edition,
            name: live.aggregate.name,
            payload: live.payload,
          };
        },
        install: () => {
          throw new Error('The explicit fallback match must not install a spell.');
        },
      },
    };

    const plan = planContentImport(db, [incoming]);
    expect(plan.reviews).toEqual([
      expect.objectContaining({
        id: 'spell:fireball-fallback',
        targetContentKey: target,
        matchClass: 'srd-fallback',
        defaultChoice: 'match',
        selectedChoice: 'match',
      }),
    ]);

    const choices: ContentImportChoices = {
      'spell:fireball-fallback': { decision: 'match' },
    };
    expect(commitContentImport(db, {
      nodes: [incoming],
      token: plan.token,
      choices,
    }).kind).toBe('committed');
    expect(db.oneRaw(
      `SELECT version.display_name, identity.catalog_layer
       FROM spell_versions AS version
       JOIN catalog_content_identities AS identity USING (content_key)
       WHERE version.content_key = ?`,
      [target],
    )).toEqual({ display_name: 'Fireball', catalog_layer: 'bundled' });
  });

  it('CI-REVIEW-DEFAULT lists every review adoption as match and omits trivial asserted self-matches', () => {
    const firstAlias = '2014:legacy:first' as ContentKey;
    const secondAlias = '2014:legacy:second' as ContentKey;
    for (const [alias, name] of [
      [firstAlias, 'First Relic'],
      [secondAlias, 'Second Relic'],
    ] as const) {
      const target = bundledTarget(`2024:item:${name.toLowerCase().replace(' ', '-')}`, name, { value: name });
      registerContentAlias(db, {
        kind: 'item', aliasKey: alias, contentKey: target,
        aliasKind: 'declared-legacy',
      });
    }
    const absent = node('absent', 'Absent Relic', { value: 0 });
    const absentPlan = planContentImport(db, [absent]);
    expect(commitContentImport(db, {
      nodes: [absent], token: absentPlan.token,
    }).kind).toBe('committed');

    const nodes = [
      node('first', 'First Relic', { value: 'First Relic' }, { declaredAlias: firstAlias }),
      node('second', 'Second Relic', { value: 'Second Relic' }, { declaredAlias: secondAlias }),
      absent,
    ];
    const plan = planContentImport(db, nodes);
    expect(plan.reviews.map((review) => [review.id, review.defaultChoice])).toEqual([
      ['first', 'match'],
      ['second', 'match'],
    ]);
    expect(plan.outcomes.find((outcome) => outcome.id === 'absent')?.kind).toBe('match');
    const before = db.scalar<number>('SELECT count(*) FROM item_definitions');
    expect(commitContentImport(db, { nodes, token: plan.token }).kind).toBe('committed');
    expect(db.scalar<number>('SELECT count(*) FROM item_definitions')).toBe(before);
  });

  it('CI-REVIEW-REMEMBER is atomic and suppresses the Nth review without creating rows', () => {
    const alias = '2014:legacy:remembered' as ContentKey;
    const target = bundledTarget('2024:item:remembered', 'Remembered Relic', { rule: true });
    registerContentAlias(db, {
      kind: 'item', aliasKey: alias, contentKey: target,
      aliasKind: 'declared-legacy',
    });
    const incoming = node('remembered', 'Remembered Relic', { rule: true }, {
      declaredAlias: alias,
    });
    const plan = planContentImport(db, [incoming]);

    expect(commitContentImport(db, {
      nodes: [incoming],
      token: plan.token,
      afterInstall: (database) => {
        database.exec("INSERT INTO characters (name) VALUES ('Must roll back')");
        throw new Error('forced later failure');
      },
    }).kind).toBe('refused');
    expect(db.scalar('SELECT count(*) FROM characters')).toBe(0);
    expect(db.scalar('SELECT count(*) FROM catalog_content_match_decisions')).toBe(0);

    expect(commitContentImport(db, {
      nodes: [incoming], token: plan.token,
    }).kind).toBe('committed');
    const catalogCount = db.scalar('SELECT count(*) FROM item_definitions');
    const repeated = planContentImport(db, [incoming]);
    expect(repeated.reviews).toEqual([]);
    expect(repeated.outcomes[0]).toEqual({
      id: 'remembered', kind: 'remembered-match', contentKey: target,
    });
    expect(db.scalar('SELECT count(*) FROM item_definitions')).toBe(catalogCount);
  });

  it('routes an asserted exact-key content collision to review with display names and conflict details', () => {
    const first = node('first-collision', 'Shared Relic', { rule: 'first' });
    const firstPlan = planContentImport(db, [first]);
    expect(commitContentImport(db, {
      nodes: [first],
      token: firstPlan.token,
    }).kind).toBe('committed');
    const firstSibling = node(
      'first-sibling-collision',
      'Sibling Relic',
      { rule: 'first' },
    );
    const firstSiblingPlan = planContentImport(db, [firstSibling]);
    expect(commitContentImport(db, {
      nodes: [firstSibling],
      token: firstSiblingPlan.token,
    }).kind).toBe('committed');

    const second = node('second-collision', 'Shared Relic', { rule: 'second' });
    const secondSibling = node(
      'second-sibling-collision',
      'Sibling Relic',
      { rule: 'second' },
    );
    const incoming = [second, secondSibling];
    const collision = planContentImport(db, incoming);
    expect(collision.reviews).toEqual([
      expect.objectContaining({
        id: 'second-collision',
        localName: 'Shared Relic',
        matchClass: 'key-collision',
        defaultChoice: null,
        selectedChoice: null,
        conflictDetails: [expect.objectContaining({ field: 'Rules identity' })],
      }),
      expect.objectContaining({
        id: 'second-sibling-collision',
        localName: 'Sibling Relic',
        matchClass: 'key-collision',
        defaultChoice: null,
        selectedChoice: null,
      }),
    ]);
    expect(collision.outcomes).toEqual([expect.objectContaining({
      kind: 'review',
      matchClass: 'key-collision',
    }), expect.objectContaining({
      kind: 'review',
      matchClass: 'key-collision',
    })]);
    expect(commitContentImport(db, {
      nodes: incoming,
      token: collision.token,
    })).toEqual(expect.objectContaining({
      kind: 'refused',
      reason: 'entry_refused',
    }));

    const partialChoices: ContentImportChoices = {
      'second-collision': { decision: 'match' },
    };
    const partiallyResolved = planContentImport(db, incoming, partialChoices);
    expect(partiallyResolved.token).toBe(collision.token);
    expect(commitContentImport(db, {
      nodes: incoming,
      token: collision.token,
      choices: partialChoices,
    })).toEqual(expect.objectContaining({
      kind: 'refused',
      reason: 'entry_refused',
    }));

    const clonePlan = planContentImport(db, incoming, {
      'second-collision': {
        decision: 'clone',
        cloneName: 'Shared Relic Copy',
      },
    });
    expect(clonePlan.token).not.toBe(collision.token);

    const choices: ContentImportChoices = {
      ...partialChoices,
      'second-sibling-collision': { decision: 'match' },
    };
    const resolved = planContentImport(db, incoming, choices);
    expect(resolved.reviews.map((review) => review.selectedChoice)).toEqual([
      'match',
      'match',
    ]);
    expect(resolved.token).toBe(collision.token);
    const committed = commitContentImport(db, {
      nodes: incoming,
      token: collision.token,
      choices,
    });
    expect(committed).toEqual(expect.objectContaining({
      kind: 'committed',
      outcomes: [
        expect.objectContaining({ id: 'second-collision', kind: 'review' }),
        expect.objectContaining({ id: 'second-sibling-collision', kind: 'review' }),
      ],
    }));
    expect(db.scalar<number>('SELECT count(*) FROM item_definitions')).toBe(2);
  });

  it('CI-CLONE-DERIVED uses the renamed stable slug and remembers the clone target', () => {
    const alias = '2014:legacy:clone' as ContentKey;
    const target = bundledTarget('2024:item:clone-source', 'Clone Source', { rule: 7 });
    registerContentAlias(db, {
      kind: 'item', aliasKey: alias, contentKey: target,
      aliasKind: 'declared-legacy',
    });
    const incoming = node('clone', 'Clone Source', { rule: 7 }, {
      declaredAlias: alias,
    });
    const incomingIdentity = deriveContentIdentityV1({
      kind: 'item', edition: '2024', name: 'Clone Source', payload: { rule: 7 },
    });
    const incomingReference = {
      kind: 'item' as const,
      scheme: incomingIdentity.envelope.scheme,
      digest: incomingIdentity.digest,
    };
    const dependent: ContentImportNode<'item'> = {
      id: 'clone-dependent',
      projection: itemProjection('Clone Dependent', { target: incomingReference }),
      reproject: ({ name, assertedKey, dependencies }) => {
        const target = dependencies.get(
          contentFingerprintReferenceKey(incomingReference),
        )!;
        const remapped = {
          kind: target.kind,
          scheme: target.scheme,
          digest: target.digest,
        };
        const projection = itemProjection(name, { target: remapped }, { assertedKey });
        return {
          ...projection,
          install: (database, contentKey, installed) => {
            database.exec(
              `INSERT INTO item_definitions (
                 content_key, rules_edition, name, description,
                 requires_attunement, created_at, updated_at
               ) VALUES (?, '2024', ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
              [contentKey, installed.name, canonicalJson({ target: remapped })],
            );
          },
        };
      },
    };
    const initial = planContentImport(db, [incoming]);
    expect(initial.reviews).toHaveLength(1);
    expect(planContentImport(db, [incoming], {
      clone: { decision: 'clone', cloneName: 'Clone Source' },
    }).outcomes[0]).toEqual({
      id: 'clone', kind: 'refused', reason: 'clone_name_unchanged',
    });
    const choices: ContentImportChoices = {
      clone: { decision: 'clone', cloneName: 'My Clone Source' },
    };
    const replanned = planContentImport(db, [dependent, incoming], choices);
    const cloneKey = '2024:content.item:my-clone-source' as ContentKey;
    expect(replanned.outcomes[0]).toEqual({
      id: 'clone', kind: 'create', contentKey: cloneKey,
    });
    expect(commitContentImport(db, {
      nodes: [dependent, incoming], token: replanned.token, choices,
    }).kind).toBe('committed');
    expect(db.oneRaw(
      `SELECT identity.key_kind, item.name
       FROM catalog_content_identities AS identity
       JOIN item_definitions AS item USING (content_key)
       WHERE identity.content_key = ?`,
      [cloneKey],
    )).toEqual({ key_kind: 'asserted', name: 'My Clone Source' });
    expect(db.scalar<string>(
      `SELECT description FROM item_definitions
       WHERE content_key = '2024:content.item:clone-dependent'`,
    )).toContain('"digest"');

    const repeated = planContentImport(db, [incoming]);
    expect(repeated.reviews).toEqual([]);
    expect(repeated.outcomes[0]).toEqual({
      id: 'clone', kind: 'remembered-clone', contentKey: cloneKey,
    });
    expect(db.scalar(
      'SELECT count(*) FROM item_definitions WHERE name = ?',
      ['My Clone Source'],
    )).toBe(1);
  });

  it('CI-DEPENDENT-REPLAN recomputes a dependent fingerprint before commit after a parent clone', () => {
    const parentAlias = '2014:legacy:parent' as ContentKey;
    const parentPayload = { rule: 'parent' };
    const parentTarget = bundledTarget('2024:item:parent', 'Parent Relic', parentPayload);
    registerContentAlias(db, {
      kind: 'item', aliasKey: parentAlias, contentKey: parentTarget,
      aliasKind: 'declared-legacy',
    });
    const parent = node('parent', 'Parent Relic', parentPayload, {
      declaredAlias: parentAlias,
    });
    const parentIdentity = deriveContentIdentityV1({
      kind: 'item', edition: '2024', name: 'Parent Relic', payload: parentPayload,
    });
    const childAlias = '2014:legacy:child' as ContentKey;
    const parentReference = {
      kind: 'item' as const,
      scheme: parentIdentity.envelope.scheme,
      digest: parentIdentity.digest,
    };
    const originalChildPayload = { parent: parentReference };
    const childTarget = bundledTarget('2024:item:child', 'Child Relic', originalChildPayload);
    registerContentAlias(db, {
      kind: 'item', aliasKey: childAlias, contentKey: childTarget,
      aliasKind: 'declared-legacy',
    });
    const child = node('child', 'Child Relic', originalChildPayload, {
      declaredAlias: childAlias,
      reproject: ({ name, assertedKey, dependencies }) => itemProjection(
        name,
        { parent: {
          kind: dependencies.get(contentFingerprintReferenceKey(parentReference))!.kind,
          scheme: dependencies.get(contentFingerprintReferenceKey(parentReference))!.scheme,
          digest: dependencies.get(contentFingerprintReferenceKey(parentReference))!.digest,
        } },
        { assertedKey, declaredAlias: childAlias },
      ),
    });
    const initial = planContentImport(db, [child, parent]);
    expect(initial.reviews.map((review) => review.id)).toEqual(['parent', 'child']);

    const choices: ContentImportChoices = {
      parent: { decision: 'clone', cloneName: 'Private Parent' },
    };
    const refreshed = planContentImport(db, [child, parent], choices);
    expect(refreshed.token).not.toBe(initial.token);
    const initialChild = initial.reviews.find((review) => review.id === 'child')!;
    const refreshedChild = refreshed.reviews.find((review) => review.id === 'child')!;
    expect(refreshedChild.incomingFingerprint).not.toBe(initialChild.incomingFingerprint);
    expect(refreshedChild.matchClass).toBe('key-collision');

    db.exec(
      `UPDATE catalog_content_aliases SET alias_kind = 'rekeyed-primary'
       WHERE content_kind = 'item' AND alias_key = ? AND content_key = ?`,
      [parentAlias, parentTarget],
    );
    const stale = commitContentImport(db, {
      nodes: [child, parent], token: refreshed.token, choices,
    });
    expect(stale.kind).toBe('stale-plan');
    if (stale.kind !== 'stale-plan') throw new Error('Expected a graph-stale plan.');
    const freshChild = stale.freshPlan.reviews.find((review) => review.id === 'child')!;
    expect(freshChild.incomingFingerprint).toBe(refreshedChild.incomingFingerprint);
    expect(freshChild.incomingFingerprint).not.toBe(initialChild.incomingFingerprint);
    expect(freshChild.matchClass).toBe('key-collision');
  });

  it('refuses a plan after a resolved target rules row changes without a registry write', () => {
    const alias = '2014:legacy:live-target' as ContentKey;
    const target = bundledTarget(
      '2024:item:live-target',
      'Live Target',
      { rule: 'planned' },
    );
    registerContentAlias(db, {
      kind: 'item', aliasKey: alias, contentKey: target,
      aliasKind: 'declared-legacy',
    });
    const incoming = node('live-target', 'Live Target', { rule: 'planned' }, {
      declaredAlias: alias,
    });
    const choices: ContentImportChoices = {
      'live-target': { decision: 'match' },
    };
    const plan = planContentImport(db, [incoming], choices);
    const registryHash = plan.graphHash;

    db.exec(
      `UPDATE item_definitions SET description = ? WHERE content_key = ?`,
      [canonicalJson({ rule: 'mutated after plan' }), target],
    );
    const result = commitContentImport(db, {
      nodes: [incoming], token: plan.token, choices,
    });

    expect(result.kind).toBe('stale-plan');
    if (result.kind !== 'stale-plan') throw new Error('Expected live-target staleness.');
    expect(result.freshPlan.graphHash).toBe(registryHash);
    expect(result.freshPlan.targetHash).not.toBe(plan.targetHash);
    expect(db.scalar<number>(
      'SELECT count(*) FROM catalog_content_match_decisions',
    )).toBe(0);
  });

  it('derives a background-to-feat edge from payload and goes stale after the feat rules row changes', () => {
    applicationSeed(db);
    const backgroundKey = db.scalar<string>(
      `SELECT content_key FROM background_definitions ORDER BY content_key LIMIT 1`,
    ) as ContentKey;
    const stored = projectStoredContentV1(db, 'background', backgroundKey);
    const featReference = projectionFingerprintReferences(stored.payload)
      .find((reference) => reference.kind === 'feat');
    if (featReference === undefined) {
      throw new Error('Bundled background fixture has no feat fingerprint reference.');
    }
    const featKey = db.scalar<string>(
      `SELECT content_key FROM catalog_content_fingerprints
       WHERE content_kind = 'feat' AND fingerprint_scheme = ?
         AND fingerprint_digest = ? AND fingerprint_role = 'current'`,
      [featReference.scheme, featReference.digest],
    ) as ContentKey;
    const incoming: ContentImportNode<'background'> = {
      id: 'background:derived-edge-probe',
      // Deliberately no caller-supplied dependency declaration.
      projection: {
        kind: 'background',
        edition: stored.edition,
        name: stored.name,
        payload: stored.payload,
        assertedKey: assertedExternalContentKey(
          'background',
          stored.edition,
          stored.name,
        ),
        projectStored: (database, contentKey) =>
          projectStoredContentV1(database, 'background', contentKey) as never,
        install: () => {
          throw new Error('The fallback match must not install a background.');
        },
      },
    };
    const plan = planContentImport(db, [incoming]);
    expect(plan.reviews[0]).toEqual(expect.objectContaining({
      dependencies: [`feat:${featKey}`],
    }));

    db.exec(
      `UPDATE feat_definitions SET notes = notes || ' post-plan edit'
       WHERE content_key = ?`,
      [featKey],
    );
    const committed = commitContentImport(db, {
      nodes: [incoming],
      token: plan.token,
      choices: { 'background:derived-edge-probe': { decision: 'match' } },
    });
    expect(committed.kind).toBe('stale-plan');
  });
});
