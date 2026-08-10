import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CatalogAuthoringService,
} from '../../../src/authoring/draft-service';
import type {
  SpeciesAuthoringDraft,
  StoredHomebrewDraft,
} from '../../../src/authoring/contracts';
import { listGuidedOriginOptions } from '../../../src/builder/guided-creation';
import { DatabaseContext } from '../../../src/db/database';
import type { ContentKey } from '../../../src/domain/ids';
import { selectableCatalogContentSql } from '../../../src/queries/selectable-catalog-content';
import { openTestDatabase } from '../../helpers/open-db';

const connections: Database[] = [];
let uuidSequence = 0;

afterEach(() => {
  for (const connection of connections.splice(0)) connection.close();
  uuidSequence = 0;
});

async function database(): Promise<DatabaseContext> {
  const connection = await openTestDatabase();
  connections.push(connection);
  return new DatabaseContext(connection);
}

function service(db: DatabaseContext): CatalogAuthoringService {
  return new CatalogAuthoringService(db, {
    randomUuid: () => `fresh-selection-${String(++uuidSequence)}`,
    now: () => '2044-05-06T07:08:09.000Z',
  });
}

function speciesDocument(
  draft: StoredHomebrewDraft,
  name: string,
  walkingSpeedFeet: number,
): SpeciesAuthoringDraft {
  if (draft.document.kind !== 'species') {
    throw new TypeError('Fresh-selection fixture is not a species draft.');
  }
  return {
    ...draft.document,
    name,
    rules_edition: 'expanded',
    reference_text: 'A production-authored supersession fixture.',
    creature_type: 'Humanoid',
    primary_size: 'Medium',
    alternate_size: null,
    walking_speed_feet: walkingSpeedFeet,
    traits: [],
    grants: [],
  };
}

function saveSpecies(
  authoring: CatalogAuthoringService,
  draft: StoredHomebrewDraft,
  document: SpeciesAuthoringDraft,
): StoredHomebrewDraft {
  return authoring.saveDraft({
    draft_uuid: draft.draft_uuid,
    expected_revision: draft.revision,
    document,
  });
}

function publishSpecies(
  authoring: CatalogAuthoringService,
  draft: StoredHomebrewDraft,
): ContentKey {
  const preview = authoring.previewPublish({
    draft_uuid: draft.draft_uuid,
    expected_revision: draft.revision,
  });
  return authoring.commitPublish({
    token: preview.token,
    decisions: [],
  }).content_key;
}

describe('fresh catalog selection', () => {
  it('hides the superseded revision while historical resolution keeps both versions', async () => {
    const db = await database();
    const authoring = service(db);
    const originalDraft = authoring.createDraft({ content_kind: 'species' });
    const originalKey = publishSpecies(authoring, saveSpecies(
      authoring,
      originalDraft,
      speciesDocument(originalDraft, 'First Fresh Species', 30),
    ));

    const successorDraft = authoring.createDraft({
      content_kind: 'species',
      base_content_key: originalKey,
    });
    const successorKey = publishSpecies(authoring, saveSpecies(
      authoring,
      successorDraft,
      speciesDocument(successorDraft, 'Second Fresh Species', 35),
    ));

    expect(listGuidedOriginOptions(db, 'species').map((option) => ({
      content_key: option.content_key,
      name: option.name,
      catalog_layer: option.catalog_layer,
    }))).toEqual([{
      content_key: successorKey,
      name: 'Second Fresh Species',
      catalog_layer: 'external',
    }]);

    expect(db.allRaw(
      `SELECT definition.content_key, definition.name
       FROM species_definitions AS definition
       ORDER BY definition.name`,
    )).toEqual([
      { content_key: originalKey, name: 'First Fresh Species' },
      { content_key: successorKey, name: 'Second Fresh Species' },
    ]);

    expect(db.allRaw(
      `SELECT definition.content_key
       FROM species_definitions AS definition
       WHERE ${selectableCatalogContentSql('species', 'definition.content_key')}
       ORDER BY definition.content_key`,
    )).toEqual([{ content_key: successorKey }]);
    expect(db.oneRaw(
      `SELECT superseded_content_key, successor_content_key
       FROM catalog_content_supersessions
       WHERE content_kind = 'species'`,
    )).toEqual({
      superseded_content_key: originalKey,
      successor_content_key: successorKey,
    });
  });
});
