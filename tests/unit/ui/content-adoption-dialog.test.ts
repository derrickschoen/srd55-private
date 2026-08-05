import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import type {
  ContentImportChoices,
  ContentImportPlan,
  ContentImportPlanToken,
} from '../../../src/catalog/content-adoption';
import {
  commitContentImport,
  planContentImport,
  type ContentImportNode,
} from '../../../src/catalog/content-adoption';
import type { ContentFingerprintDigest } from '../../../src/catalog/content-identity';
import { deriveContentIdentityV1 } from '../../../src/catalog/content-identity';
import {
  registerBundledStableContentIdentity,
  registerContentAlias,
  registerContentFingerprint,
} from '../../../src/catalog/content-registry';
import { assertedExternalContentKey } from '../../../src/catalog/catalog-key';
import { DatabaseContext } from '../../../src/db/database';
import type { ContentKey } from '../../../src/domain/ids';
import { createContentAdoptionDialog } from '../../../src/ui/content-adoption-dialog';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';
import { openTestDatabase } from '../../helpers/open-db';

const connections: Database[] = [];
afterEach(() => {
  for (const connection of connections.splice(0)) connection.close();
});

function plan(token: string): ContentImportPlan {
  return {
    token: token as ContentImportPlanToken,
    inputHash: 'input',
    graphHash: 'graph',
    targetHash: 'target',
    spellActivityChanges: [],
    reviews: [{
      id: 'subclass:road-mage',
      kind: 'subclass',
      incomingName: 'Road Mage',
      localName: 'Road Mage',
      targetContentKey: '2024:srd:road-mage' as ContentKey,
      incomingFingerprint: 'a'.repeat(64) as ContentFingerprintDigest,
      matchClass: 'srd-fallback',
      defaultChoice: 'match',
      selectedChoice: 'match',
      cloneName: 'Road Mage (Private copy)',
      dependencies: ['class:mage'],
      conflictDetails: [{
        field: 'Source book',
        incomingValue: 'Incoming Guide',
        localValue: 'Local Guide',
      }],
    }],
    outcomes: [{
      id: 'subclass:road-mage',
      kind: 'review',
      contentKey: '2024:srd:road-mage' as ContentKey,
      matchClass: 'srd-fallback',
    }],
  };
}

describe('the D82 content-adoption dialog', () => {
  it('lists every review with Match selected and replans before clone commit', async () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const replans: ContentImportChoices[] = [];
      const commits: ContentImportChoices[] = [];
      const initial = plan('initial');
      const refreshed: ContentImportPlan = {
        ...initial,
        token: 'refreshed' as ContentImportPlanToken,
        outcomes: [{
          id: 'subclass:road-mage',
          kind: 'create',
          contentKey: '2024:srd:road-mage-private-copy' as ContentKey,
        }],
      };
      const rendered = createContentAdoptionDialog({
        plan: initial,
        replan: async (choices) => {
          replans.push(choices);
          return refreshed;
        },
        commit: async (_plan, choices) => {
          commits.push(choices);
          return { kind: 'committed', outcomes: refreshed.outcomes };
        },
        onCommitted: () => undefined,
      });
      const dialog = interactiveElement(rendered.element);

      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(elementText(rendered.element)).toContain('SRD fingerprint fallback');
      expect(elementText(rendered.element)).toContain(
        'Source book — incoming: Incoming Guide; local: Local Guide',
      );
      expect(elementText(rendered.element)).toContain('Depends on: class:mage');
      const inputs = dialog.querySelectorAll('input');
      expect(inputs[0]?.getAttribute('value')).toBe('match');
      expect(inputs[0]?.getAttribute('checked')).toBe('');

      const cloneName = inputs[2];
      if (cloneName === undefined) throw new Error('Clone-name input missing.');
      cloneName.value = 'Road Mage (Private copy)';
      inputs[1]?.dispatchEvent(new Event('change'));
      await Promise.resolve();
      await Promise.resolve();

      expect(replans).toEqual([{
        'subclass:road-mage': {
          decision: 'clone',
          cloneName: 'Road Mage (Private copy)',
        },
      }]);
      const commitButton = dialog.querySelectorAll('button').find((button) =>
        button.textContent === 'Import with these choices',
      );
      if (commitButton === undefined) throw new Error('Commit button missing.');
      expect(commitButton.disabled).toBe(false);
      commitButton.click();
      await Promise.resolve();
      await Promise.resolve();
      expect(commits).toEqual(replans);
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('CI-REVIEW-DEFAULT commits untouched defaults through the real plan token', async () => {
    const connection = await openTestDatabase();
    connections.push(connection);
    const db = new DatabaseContext(connection);
    const target = '2024:item:default-target' as ContentKey;
    const alias = '2014:legacy:default-target' as ContentKey;
    const payload = { rule: 'same' };
    registerBundledStableContentIdentity(db, {
      kind: 'item', contentKey: target, normalizedName: 'defaulttarget',
    });
    db.exec(
      `INSERT INTO item_definitions (
         content_key, rules_edition, name, description, requires_attunement
       ) VALUES (?, '2024', 'Default Target', ?, 0)`,
      [target, JSON.stringify(payload)],
    );
    const identity = deriveContentIdentityV1({
      kind: 'item', edition: '2024', name: 'Default Target', payload,
    });
    registerContentFingerprint(db, {
      kind: 'item',
      contentKey: target,
      scheme: identity.envelope.scheme,
      digest: identity.digest,
      canonicalJson: identity.canonicalJson,
      role: 'current',
    });
    registerContentAlias(db, {
      kind: 'item', aliasKey: alias, contentKey: target,
      aliasKind: 'declared-legacy',
    });
    const node: ContentImportNode<'item'> = {
      id: 'item:default-target',
      dependencies: [],
      projection: {
        kind: 'item',
        edition: '2024',
        name: 'Default Target',
        assertedKey: assertedExternalContentKey('item', '2024', 'Default Target'),
        declaredAlias: alias,
        payload,
        projectStored: (database, contentKey) => {
          const row = database.oneRaw(
            `SELECT rules_edition, name, description FROM item_definitions
             WHERE content_key = ?`,
            [contentKey],
          );
          if (row === null) throw new TypeError('Missing dialog target.');
          return {
            kind: 'item',
            edition: String(row.rules_edition),
            name: String(row.name),
            payload: JSON.parse(String(row.description)) as unknown,
          };
        },
        install: () => {
          throw new Error('The default match must not install content.');
        },
      },
    };
    const initial = planContentImport(db, [node]);
    expect(initial.reviews).toHaveLength(1);

    const restoreDocument = installInteractiveDocument();
    try {
      let committed = false;
      const rendered = createContentAdoptionDialog({
        plan: initial,
        replan: async (choices) => planContentImport(db, [node], choices),
        commit: async (submitted, choices) => commitContentImport(db, {
          nodes: [node], token: submitted.token, choices,
        }),
        onCommitted: () => { committed = true; },
      });
      const dialog = interactiveElement(rendered.element);
      const commitButton = dialog.querySelectorAll('button').find((button) =>
        button.textContent === 'Import with these choices',
      );
      if (commitButton === undefined) throw new Error('Commit button missing.');
      commitButton.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      expect(committed).toBe(true);
      expect(db.scalar<number>('SELECT count(*) FROM item_definitions')).toBe(1);
      expect(db.scalar<number>(
        'SELECT count(*) FROM catalog_content_match_decisions',
      )).toBe(1);
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  });
});
