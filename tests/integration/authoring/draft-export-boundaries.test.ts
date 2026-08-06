import type { Database } from '@sqlite.org/sqlite-wasm';
import { afterEach, describe, expect, it } from 'vitest';
import { exportCharacterBackup } from '../../../src/backup/character-backup';
import {
  exportDatabaseBackup,
  importDatabaseBackup,
} from '../../../src/backup/database-backup';
import {
  exportSelectedLibraryContent,
  exportWholeLibrary,
} from '../../../src/backup/library-export';
import type {
  HomebrewDraftUuid,
  SpeciesAuthoringDraft,
} from '../../../src/authoring/contracts';
import { CatalogAuthoringService } from '../../../src/authoring/draft-service';
import { DatabaseContext } from '../../../src/db/database';
import { DatabaseLifecycle } from '../../../src/db/database-lifecycle';
import schema from '../../../src/db/schema.sql?raw';
import type { ContentKey } from '../../../src/domain/ids';
import { CharacterCompletenessQueries } from '../../../src/queries/character-completeness';
import { CharacterSheetBuilder } from '../../../src/queries/character-sheet-builder';
import { CharacterWorkspaceBuilder } from '../../../src/queries/character-workspace-builder';
import { SavePointQueries } from '../../../src/queries/save-points';
import { exportCharacterShare } from '../../../src/sharing/character-share';
import {
  decodeShareFragment,
  encodeShareFragment,
} from '../../../src/sharing/codec';
import {
  agentReferenceJson,
  buildAgentReference,
} from '../../../src/ui/screens/planner/agent-reference';
import { sheetFacts } from '../../../src/ui/screens/sheet/sheet-view';
import {
  getSqlite3,
  MemoryDatabaseStorage,
  openTestDatabase,
} from '../../helpers/open-db';

const opened: Database[] = [];
const lifecycles: DatabaseLifecycle[] = [];

afterEach(() => {
  for (const lifecycle of lifecycles.splice(0)) lifecycle.close();
  for (const connection of opened.splice(0)) {
    if (connection.isOpen()) connection.close();
  }
});

async function database(): Promise<DatabaseContext> {
  const connection = await openTestDatabase();
  opened.push(connection);
  return new DatabaseContext(connection);
}

function character(db: DatabaseContext, name: string): number {
  return db.exec(
    'INSERT INTO characters (name, revision) VALUES (?, 0)',
    [name],
  ).lastInsertId;
}

function insertSentinelDraft(
  db: DatabaseContext,
  sentinel: string,
): {
  readonly draftUuid: HomebrewDraftUuid;
  readonly documentBytes: string;
} {
  let sequence = 0;
  const service = new CatalogAuthoringService(db, {
    randomUuid: () => `${sentinel}-uuid-${String(++sequence)}`,
    now: () => '2026-08-05T12:34:56.000Z',
  });
  const created = service.createDraft({ content_kind: 'species' });
  const document: SpeciesAuthoringDraft = {
    ...(created.document as SpeciesAuthoringDraft),
    name: `${sentinel}-NAME`,
    reference_text: `${sentinel}-PAYLOAD`,
  };
  const saved = service.saveDraft({
    draft_uuid: created.draft_uuid,
    expected_revision: created.revision,
    document,
  });
  return {
    draftUuid: saved.draft_uuid,
    documentBytes: String(db.scalar(
      'SELECT document_json FROM catalog_content_drafts WHERE draft_uuid = ?',
      [created.draft_uuid],
    )),
  };
}

function bytes(value: unknown): Uint8Array {
  return new TextEncoder().encode(
    typeof value === 'string' ? value : JSON.stringify(value),
  );
}

function containsBytes(haystack: Uint8Array, text: string): boolean {
  const needle = bytes(text);
  return haystack.some((_, start) =>
    start + needle.length <= haystack.length &&
    needle.every((value, offset) => haystack[start + offset] === value),
  );
}

describe('catalog drafts stay local to the authoring library', () => {
  it('whole-library-draft-leak-pin excludes DRAFT-LEAK-SENTINEL-whole-library', async () => {
    const db = await database();
    const sentinel = 'DRAFT-LEAK-SENTINEL-whole-library';
    insertSentinelDraft(db, sentinel);

    const document = exportWholeLibrary(db, '2026-08-05T12:59:00.000Z');

    expect(document.content).toEqual([]);
    expect(containsBytes(bytes(document), sentinel)).toBe(false);
  });

  it('selected-library-draft-refusal-pin refuses DRAFT-LEAK-SENTINEL-selected-library', async () => {
    const db = await database();
    const sentinel = 'DRAFT-LEAK-SENTINEL-selected-library';
    const draft = insertSentinelDraft(db, sentinel);

    expect(() => exportSelectedLibraryContent(
      db,
      [String(draft.draftUuid) as ContentKey],
      '2026-08-05T12:59:30.000Z',
    )).toThrow(`Selected library content '${String(draft.draftUuid)}' is not external content.`);
  });

  it('character-share-draft-leak-pin excludes DRAFT-LEAK-SENTINEL-character-share', async () => {
    const db = await database();
    const characterId = character(db, 'Share boundary character');
    const sentinel = 'DRAFT-LEAK-SENTINEL-character-share';
    insertSentinelDraft(db, sentinel);

    const document = exportCharacterShare(db, characterId);
    const fragment = await encodeShareFragment(document);
    const decodedDocumentBytes = bytes(await decodeShareFragment(fragment));

    expect(containsBytes(decodedDocumentBytes, sentinel)).toBe(false);
  });

  it('portable-backup-closure-draft-leak-pin excludes DRAFT-LEAK-SENTINEL-portable-backup-closure', async () => {
    const db = await database();
    const characterId = character(db, 'Portable backup boundary character');
    const sentinel = 'DRAFT-LEAK-SENTINEL-portable-backup-closure';
    insertSentinelDraft(db, sentinel);

    const backupBytes = bytes(exportCharacterBackup(
      db,
      characterId,
      '2026-08-05T13:00:00.000Z',
    ));

    expect(containsBytes(backupBytes, sentinel)).toBe(false);
  });

  it('save-point-snapshot-draft-leak-pin excludes DRAFT-LEAK-SENTINEL-save-point-snapshot', async () => {
    const db = await database();
    const characterId = character(db, 'Save-point boundary character');
    const sentinel = 'DRAFT-LEAK-SENTINEL-save-point-snapshot';
    insertSentinelDraft(db, sentinel);

    new SavePointQueries(
      db,
      undefined,
      () => '2026-08-05T13:01:00.000Z',
    ).create(characterId, 'Draft boundary');
    const storedSnapshotBytes = bytes(String(db.scalar(
      'SELECT snapshot FROM character_save_points WHERE character_id = ?',
      [characterId],
    )));

    expect(containsBytes(storedSnapshotBytes, sentinel)).toBe(false);
  });

  it('agent-json-draft-leak-pin excludes DRAFT-LEAK-SENTINEL-agent-json', async () => {
    const db = await database();
    const characterId = character(db, 'Agent JSON boundary character');
    const sentinel = 'DRAFT-LEAK-SENTINEL-agent-json';
    insertSentinelDraft(db, sentinel);

    const projection = buildAgentReference(
      new CharacterWorkspaceBuilder(db).build(characterId),
      new CharacterCompletenessQueries(db).build(characterId),
    );
    const referenceBytes = bytes(agentReferenceJson(projection.reference));

    expect(containsBytes(referenceBytes, sentinel)).toBe(false);
  });

  it('print-payload-draft-leak-pin excludes DRAFT-LEAK-SENTINEL-print-payload', async () => {
    const db = await database();
    const characterId = character(db, 'Print boundary character');
    const sentinel = 'DRAFT-LEAK-SENTINEL-print-payload';
    insertSentinelDraft(db, sentinel);

    const printPayloadBytes = bytes(sheetFacts(
      new CharacterSheetBuilder(db).build(characterId),
    ));

    expect(containsBytes(printPayloadBytes, sentinel)).toBe(false);
  });

  it('whole-database-backup-draft-retention-pin retains and byte-exactly restores DRAFT-LEAK-SENTINEL-whole-database-backup', async () => {
    const sqlite3 = await getSqlite3();
    const lifecycle = new DatabaseLifecycle(
      sqlite3,
      new MemoryDatabaseStorage(sqlite3),
      schema,
    );
    lifecycles.push(lifecycle);
    lifecycle.open();
    const sentinel = 'DRAFT-LEAK-SENTINEL-whole-database-backup';
    const { documentBytes: exactDocumentBytes } = insertSentinelDraft(
      lifecycle.database,
      sentinel,
    );

    const backup = await exportDatabaseBackup(
      lifecycle,
      '2026-08-05T13:02:00.000Z',
    );
    expect(containsBytes(backup.sqlite, sentinel)).toBe(true);

    lifecycle.database.exec('DELETE FROM catalog_content_drafts');
    await importDatabaseBackup(lifecycle, backup);

    expect(lifecycle.database.scalar(
      'SELECT document_json FROM catalog_content_drafts',
    )).toBe(exactDocumentBytes);
  });
});
