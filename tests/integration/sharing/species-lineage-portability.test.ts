import { afterEach, describe, expect, it } from 'vitest';
import { importLibraryDocument } from '../../../src/backup/library-export';
import { createApplicationLifecycle } from '../../../src/db/bootstrap';
import type { DatabaseLifecycle } from '../../../src/db/database-lifecycle';
import { RpcClient } from '../../../src/rpc/client';
import {
  assessImportCompatibility,
  commitCharacterShareImport,
  exportCharacterShare,
  importCharacterShare,
  previewCharacterShare,
} from '../../../src/sharing/character-share';
import { createShareClient } from '../../../src/sharing/client';
import {
  decodeShareFragment,
  shareDocumentToPositional,
  shareDocumentToReferencePositional,
} from '../../../src/sharing/codec';
import type { CharacterShareDocument } from '../../../src/sharing/schema';
import {
  CHOSEN_HIGH_ELF_CANTRIP_KEY,
  createLevelFiveHighElf,
  EXPECTED_LEVEL_FIVE_HIGH_ELF,
  importedSpeciesSemanticCensus,
  lineagePortabilityProjection,
  OVERSIZED_PORTABLE_ELF_KEY,
  portableElfLibraryDocument,
  PORTABLE_ELF_KEY,
} from '../../helpers/species-lineage-portability';
import { getSqlite3, MemoryDatabaseStorage } from '../../helpers/open-db';

const lifecycles: DatabaseLifecycle[] = [];

afterEach(() => {
  for (const lifecycle of lifecycles.splice(0)) lifecycle.close();
});

async function database() {
  const sqlite3 = await getSqlite3();
  const lifecycle = createApplicationLifecycle(
    sqlite3,
    new MemoryDatabaseStorage(sqlite3),
  );
  lifecycles.push(lifecycle);
  return lifecycle.open();
}

function clientFor(document: CharacterShareDocument) {
  const rpc = {
    call: async <TParams, TResult>(
      _method: string,
      _params: TParams,
    ): Promise<TResult> => document as TResult,
  } as RpcClient;
  return createShareClient(rpc);
}

function exactShareChoice(document: CharacterShareDocument) {
  return {
    source: document.sources.find((source) => source.type === 'species'),
    selections: document.selections,
  };
}

describe('lineage-chosen character sharing', () => {
  // Measured alone at 2.1s; 2.1 × 1.5 = 3.15s. The 20s guard follows the
  // repository convention for boot-heavy integration tests over 1.5s.
  it('embeds content-v2 in v19 and restores the exact level-5 High Elf choice in both directions', async () => {
    const source = await database();
    importLibraryDocument(source, portableElfLibraryDocument(source));
    const sourceId = await createLevelFiveHighElf(source, PORTABLE_ELF_KEY);

    const exported = exportCharacterShare(source, sourceId);
    expect(shareDocumentToPositional(exported)[1]).toBe(19);
    expect(exported.portableContent?.content.map((entry) => ({
      kind: entry.kind,
      content_key: entry.content_key,
      fingerprint_scheme: entry.fingerprint_scheme,
    }))).toEqual([{
      kind: 'species',
      content_key: PORTABLE_ELF_KEY,
      fingerprint_scheme: 'content-v2',
    }]);
    expect(exactShareChoice(exported)).toEqual({
      source: expect.objectContaining({
        type: 'species',
        key: PORTABLE_ELF_KEY,
        config: EXPECTED_LEVEL_FIVE_HIGH_ELF.config,
      }),
      selections: [{
        ref: expect.any(Number),
        ruleKey: 'elf-lineage:replaceable_spell',
        ordinal: 1,
        spellKey: CHOSEN_HIGH_ELF_CANTRIP_KEY,
      }],
    });

    const encoded = await clientFor(exported).createFragmentResult(sourceId);
    expect(encoded).toEqual({
      kind: 'encoded',
      fragment: expect.any(String),
      embeddedContent: [{
        id: `portable:species:${PORTABLE_ELF_KEY}`,
        kind: 'species',
      name: 'Portable Elf',
      catalog_layer: 'external',
      provenance: {
        origin_kind: 'authored_here',
        received: true,
        local_derivation: false,
      },
    }],
    });
    if (encoded.kind !== 'encoded') throw new Error('Expected a v19 fragment.');
    const decoded = await decodeShareFragment(encoded.fragment);
    expect(shareDocumentToPositional(decoded)[1]).toBe(19);

    const target = await database();
    const preview = previewCharacterShare(target, decoded);
    expect(Object.keys(preview.adoptionPlan).sort()).toEqual([
      'graphHash',
      'incomingContent',
      'inputHash',
      'outcomes',
      'reviews',
      'spellActivityChanges',
      'targetHash',
      'token',
    ]);
    expect(preview.adoptionPlan.incomingContent).toEqual([{
      id: `portable:species:${PORTABLE_ELF_KEY}`,
      kind: 'species',
      name: 'Portable Elf',
      catalog_layer: 'external',
    }]);
    const imported = importCharacterShare(target, decoded);
    expect(importedSpeciesSemanticCensus(target, PORTABLE_ELF_KEY)).toBe(9);
    expect(lineagePortabilityProjection(target, imported.characterId)).toEqual(
      EXPECTED_LEVEL_FIVE_HIGH_ELF,
    );
    expect(exactShareChoice(
      exportCharacterShare(target, imported.characterId),
    )).toEqual(exactShareChoice(exported));
  }, 20_000);

  // Measured alone at 2.2s; 2.2 × 1.5 = 3.3s. The 20s guard follows the
  // repository convention for boot-heavy integration tests over 1.5s.
  it('falls back byte-frozen to v17 and restores the exact choice after the named library import', async () => {
    const source = await database();
    const library = portableElfLibraryDocument(source, {
      contentKey: OVERSIZED_PORTABLE_ELF_KEY,
      name: 'Oversized Portable Elf',
      oversized: true,
    });
    importLibraryDocument(source, library);
    const sourceId = await createLevelFiveHighElf(
      source,
      OVERSIZED_PORTABLE_ELF_KEY,
      'Reference-only High Elf',
    );
    const exported = exportCharacterShare(source, sourceId);

    const encoded = await clientFor(exported).createFragmentResult(sourceId);
    expect(encoded).toEqual({
      kind: 'encoded',
      fragment: expect.any(String),
      embeddedContent: [],
      omittedContent: [{
        kind: 'species',
        contentKey: OVERSIZED_PORTABLE_ELF_KEY,
      }],
    });
    if (encoded.kind !== 'encoded') throw new Error('Expected a v17 fallback.');
    const decoded = await decodeShareFragment(encoded.fragment);
    const positional = shareDocumentToReferencePositional(decoded);
    expect(positional[1]).toBe(17);
    expect(positional).toHaveLength(21);
    expect(decoded.portableContent).toBeUndefined();
    expect(exactShareChoice(decoded)).toEqual({
      source: expect.objectContaining({
        type: 'species',
        key: OVERSIZED_PORTABLE_ELF_KEY,
        config: {
          ...EXPECTED_LEVEL_FIVE_HIGH_ELF.config,
          source_content_key: OVERSIZED_PORTABLE_ELF_KEY,
        },
      }),
      selections: [{
        ref: expect.any(Number),
        ruleKey: 'elf-lineage:replaceable_spell',
        ordinal: 1,
        spellKey: CHOSEN_HIGH_ELF_CANTRIP_KEY,
      }],
    });

    const target = await database();
    expect(assessImportCompatibility(target, decoded)).toEqual([{
      code: 'missing_source',
      contentKeys: [OVERSIZED_PORTABLE_ELF_KEY],
      summary: 'This character uses a species that is not in your library.',
      remedy:
        'Ask the sender for a library JSON containing this species, import it, then retry this share.',
      remedyKind: 'library-json',
    }]);
    expect(() => importCharacterShare(target, decoded)).toThrow(
      'Cannot import this character: This character uses a species that is not in your library.',
    );
    importLibraryDocument(target, library);
    const preview = previewCharacterShare(target, decoded);
    expect(preview.adoptionPlan.reviews).toEqual([
      expect.objectContaining({
        kind: 'species',
        incomingFingerprint: null,
        matchClass: 'key-collision',
        targetContentKey: OVERSIZED_PORTABLE_ELF_KEY,
      }),
    ]);
    const reviewId = preview.adoptionPlan.reviews[0]?.id;
    if (reviewId === undefined) throw new Error('Expected a species review.');
    const committed = commitCharacterShareImport(
      target,
      decoded,
      preview.adoptionPlan.token,
      { [reviewId]: { decision: 'match' } },
    );
    expect(committed.kind).toBe('committed');
    if (committed.kind !== 'committed') {
      throw new Error('Reference-only lineage import did not commit.');
    }
    const imported = committed.result;
    expect(importedSpeciesSemanticCensus(target, OVERSIZED_PORTABLE_ELF_KEY))
      .toBe(9);
    expect(lineagePortabilityProjection(target, imported.characterId)).toEqual({
      ...EXPECTED_LEVEL_FIVE_HIGH_ELF,
      config: {
        ...EXPECTED_LEVEL_FIVE_HIGH_ELF.config,
        source_content_key: OVERSIZED_PORTABLE_ELF_KEY,
      },
    });
    expect(exactShareChoice(
      exportCharacterShare(target, imported.characterId),
    )).toEqual(exactShareChoice(decoded));
  }, 20_000);
});
