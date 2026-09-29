import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { mulberry32 } from '../../../src/combat/random';
import { encounterBranchId, encounterSessionId } from '../../../src/combat/values';
import { IndexedDbBrowserSessionStore } from '../../../src/vtt/local-session-store';
import {
  buildSaveManagerViewModel,
  SaveManagerController,
  type SaveManagerEntry,
} from '../../../src/vtt/save-manager';
import { IndexedDbSessionLifecycle } from '../../../src/vtt/session-lifecycle';
import {
  decodeSavedSessionRevisions,
  EncounterSessionJournal,
  exportSavedSession,
  importSavedSession,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
  savedSessionSummary,
  type SessionLoadRefusal,
} from '../../../src/vtt/session-persistence';
import {
  A40,
  B40,
  BUILD_A,
  BUILD_B,
  bundle,
  e1,
  e10,
  LR_SQUEEZED_V12,
  lrCross,
  OVERHANG_V12,
  plainOf,
  recordS,
  rehashed,
  revisionBundleText,
  thrown,
  withFlippedFingerprint,
  type Plain,
} from '../../helpers/save-compat-fixtures';
import {
  folderHolding,
  openStore,
  putSnapshot,
  rawMetadata,
  rawTexts,
  seedStream,
} from '../../helpers/save-compat-storage';
import { declareTestInputs } from '../../helpers/test-inputs';

// SAVE-COMPAT C2 (owner D939; supervisor D944): every load surface survives a save it refuses. One refused or
// undecodable save is listed with its typed refusal beside the others, exports what its store holds as recorded, and
// never offers Load; the others load as before. Refused streams are SEEDED by raw IndexedDB writes, as an earlier
// build stored them. Builds: A = 'a' x 40 recorded, B = 'b' x 40 runs. Every expectation is by hand.

const inputs = declareTestInputs({ fixtures: [OVERHANG_V12, LR_SQUEEZED_V12] });
const s = (): Plain[] => recordS(BUILD_A, inputs.fixtures.readText(OVERHANG_V12)).plain;
const texts = (revisions: readonly Plain[]): string[] => revisions.map((revision) => canonicalJson(revision));
const lr = (): string => inputs.fixtures.readText(LR_SQUEEZED_V12);

/** The honest lr-squeezed save, migrated by the version bump (every revision is expressible in v13). */
function goodRevisions(): Plain[] {
  const recorder = new MemoryBrowserSessionStore(BUILD_A);
  return plainOf(recorder.revisions(importSavedSession(recorder, lr())));
}

/** Lx: lr-squeezed revisions 1-2, revision 2's events doubled, its v12 checksum NOT recomputed. */
const lxTexts = (): string[] => texts(lrCross(lr()));

function listed(store: IndexedDbBrowserSessionStore, storageId: string): any {
  return (store.savedSessions() as readonly Plain[]).find((save) => save.storageId === storageId);
}

describe('SAVE-COMPAT C2: the load surfaces survive a save they refuse', () => {
  it('W11: one refused save does not hide the others; each entry carries its own loadability', async () => {
    const indexedDb = new IDBFactory();
    const goodId = await seedStream(indexedDb, 'w11', texts(goodRevisions()), 'good campaign', BUILD_B);
    const refusedId = await seedStream(indexedDb, 'w11', texts(rehashed(e1(s()))), 'refused campaign', BUILD_B);
    const store = await openStore(indexedDb, 'w11', BUILD_B);
    expect(() => store.savedSessions()).not.toThrow();
    const good = listed(store, `session:${goodId}`);
    const refused = listed(store, `session:${refusedId}`);
    expect(good.load).toEqual({ kind: 'loadable' });
    expect(refused).toMatchObject({
      contents: 'decoded',
      load: {
        kind: 'refused',
        refusal: {
          kind: 'recorded_by_other_build',
          refusal: { revision: 2, relation: { kind: 'other_commit', recorded: A40, running: B40 } },
        },
      },
    });
    // S: 3 revisions (the migrated root, the move, the end), in combat round 1.
    expect([refused.revisionCount, refused.round]).toEqual([3, 1]);
    for (const row of [good, refused]) {
      expect(row.fingerprint).toBe(savedSessionSummary(store.exportedStored(row.storageId, row.sessionId), BUILD_B).fingerprint);
    }
    expect(thrown(() => EncounterSessionJournal.resume(encounterSessionId(refusedId), store, new MemoryMirrorSink()))?.name)
      .toBe('SessionRecordedByOtherBuildError');
    store.close();
  });

  it('W13: a refused save exports as recorded, revision for revision', async () => {
    const indexedDb = new IDBFactory();
    const refusedRevisions = rehashed(e1(s()));
    const sessionId = await seedStream(indexedDb, 'w13', texts(refusedRevisions), 'refused campaign', BUILD_B);
    const store = await openStore(indexedDb, 'w13', BUILD_B);
    let bytes = '';
    expect(() => {
      bytes = store.exportedStored(`session:${sessionId}`, encounterSessionId(sessionId));
    }).not.toThrow();
    expect(decodeSavedSessionRevisions(bytes, BUILD_B).map((revision) => revision.checksum))
      .toEqual(refusedRevisions.map((revision) => revision.checksum));
    store.close();
  });

  it('W13b CONTROL: a loadable session row exports exactly the bytes the strict export gives the same revisions', async () => {
    const indexedDb = new IDBFactory();
    const good = goodRevisions();
    const sessionId = await seedStream(indexedDb, 'w13b', texts(good), 'good campaign', BUILD_B);
    const store = await openStore(indexedDb, 'w13b', BUILD_B);
    const reference = new MemoryBrowserSessionStore(BUILD_B);
    importSavedSession(reference, bundle(good));
    expect(store.exportedStored(`session:${sessionId}`, encounterSessionId(sessionId)))
      .toBe(exportSavedSession(reference, encounterSessionId(sessionId)));
    store.close();
  });

  it('W15: a lifecycle import of a save another build recorded returns the typed refusal and stores nothing', async () => {
    const indexedDb = new IDBFactory();
    const store = await openStore(indexedDb, 'w15', BUILD_B);
    const lifecycle = new IndexedDbSessionLifecycle(store, { sessionId: () => null, close: () => undefined });
    const plain = s();
    const outcome = await lifecycle.dispatch({ kind: 'import', bytes: bundle(e1(plain)) })
      .then((result) => result, (error: unknown) => ({ rejected: String(error) }));
    expect(outcome).toMatchObject({
      kind: 'refused',
      refusal: { kind: 'recorded_by_other_build', refusal: { revision: 2, transition: 'reducer_applied' } },
    });
    await store.flush();
    store.close();
    expect(await rawTexts(indexedDb, 'w15', String(plain[0]!.sessionId))).toEqual([]);
  });

  it('W16: the save folder lists a refused file refused and the others loadable', async () => {
    const plain = s();
    const folder = await folderHolding(new Map([['good.vtt.json', bundle(plain)], ['refused.vtt.json', bundle(e1(plain))]]));
    const entries = await folder.list(BUILD_B).then((listing) => listing as readonly Plain[], () => []);
    expect(entries).toHaveLength(2);
    expect(entries.find((entry) => entry.name === 'good')?.load).toEqual({ kind: 'loadable' });
    expect(entries.find((entry) => entry.name === 'refused')?.load).toMatchObject({
      kind: 'refused', refusal: { kind: 'recorded_by_other_build', refusal: { revision: 2 } },
    });
  });

  it('W17: a refused row offers rename, delete and export, never load, and shows its refusal', () => {
    const refusals: readonly SessionLoadRefusal[] = [
      {
        kind: 'recorded_by_other_build',
        refusal: {
          revision: 2, transition: 'reducer_applied', relation: { kind: 'unrecorded', recorded: BUILD_A, running: BUILD_B },
          failure: { kind: 'derivation_differs', check: 'reducer events' },
        },
        message: 'Save refused: cross-build.',
      },
      { kind: 'integrity', fault: { kind: 'schema_violation', detail: 'Malformed.' }, message: 'Save refused: integrity.' },
      { kind: 'load_failed', errorName: 'Error', message: 'Save could not be loaded: Error: boom' },
    ];
    const base = {
      source: 'browser', updatedAt: '2026-09-20T10:00:00.000Z', sessionId: encounterSessionId('session:x'),
      retention: { kind: 'named' },
    } as const;
    const decoded = (index: number, load: Plain) => ({
      ...base, id: `browser:session:x${String(index)}`, storageId: `session:x${String(index)}`, name: `x${String(index)}`,
      contents: 'decoded', fingerprint: 'f'.repeat(64), revisionCount: 3, room: null, round: 1, load,
    });
    const entries = [
      ...refusals.map((refusal, index) => decoded(index, { kind: 'refused', refusal })),
      decoded(9, { kind: 'loadable' }),
      { ...base, id: 'browser:session:u', storageId: 'session:u', name: 'u', contents: 'undecodable', load: { kind: 'refused', refusal: refusals[1] } },
    ] as unknown as readonly SaveManagerEntry[];
    const rows = buildSaveManagerViewModel({ browser: entries, folder: [], mode: { kind: 'fallback', reason: 'not_selected' } })
      .rows as readonly Plain[];
    const row = (name: string): Plain => rows.find((candidate) => candidate.name === name)!;
    refusals.forEach((refusal, index) => {
      expect(row(`x${String(index)}`).actions).toEqual(['rename', 'delete', 'export_copy']);
      expect(row(`x${String(index)}`).refusalMessage).toBe(refusal.message);
    });
    expect(row('x9').actions).toEqual(['load', 'rename', 'delete', 'export_copy']);
    expect(row('x9').refusalMessage).toBeUndefined();
    expect(row('u')).toMatchObject({ actions: ['rename', 'delete', 'export_copy'], summary: 'Unreadable save', refusalMessage: 'Save refused: integrity.' });
  });

  it('W17b: a load intent on a refused row is refused by type and never calls load', async () => {
    const refusal: SessionLoadRefusal = { kind: 'load_failed', errorName: 'Error', message: 'Save could not be loaded: Error: boom' };
    const entry = {
      id: 'browser:session:x', storageId: 'session:x', source: 'browser', name: 'x', updatedAt: '2026-09-20T10:00:00.000Z',
      sessionId: encounterSessionId('session:x'), fingerprint: 'f'.repeat(64), revisionCount: 3, room: null, round: 1,
      retention: { kind: 'named' }, contents: 'decoded', load: { kind: 'refused', refusal },
    } as unknown as SaveManagerEntry;
    const loads: unknown[] = [];
    const controller = new SaveManagerController(new Map([[entry.id, entry]]), {
      load: (save) => {
        loads.push(save);
      },
      rename: () => undefined, delete: () => undefined, exportCopy: () => undefined, saveNow: () => undefined,
      chooseFolder: () => undefined, uploadFile: () => undefined,
    });
    const outcome = await controller.dispatch({ kind: 'load', saveId: entry.id })
      .then(() => ({ name: 'resolved', message: '' }), (error: Error) => ({ name: error.name, message: error.message }));
    expect([outcome, loads.length]).toEqual([{ name: 'SaveLoadRefusedError', message: refusal.message }, 0]);
  });

  it('W34 (P1-4): a refused session with an earlier live autosave: the session is refused, the autosave loadable', async () => {
    const indexedDb = new IDBFactory();
    const refusedRevisions = rehashed(e1(s()));
    const sessionId = await seedStream(indexedDb, 'w34', texts(refusedRevisions), 'campaign', BUILD_B);
    const root = refusedRevisions[0]!;
    const storageId = `per_round:${sessionId}:000000000001:round_boundary`;
    await putSnapshot(indexedDb, 'w34', {
      sessionId, fingerprint: 'f'.repeat(64), revisionCount: 1, room: null, round: root.encounterState.round,
      initialSeed: root.rngState.initialSeed, storageId, trigger: 'round_boundary', pool: 'per_round',
      name: 'Round 1', updatedAt: '2026-09-20T10:01:00.000Z', retention: { kind: 'named' },
      restorePoint: { kind: 'live', headChecksum: root.checksum },
    });
    const store = await openStore(indexedDb, 'w34', BUILD_B);
    expect(() => store.savedSessions()).not.toThrow();
    expect(listed(store, `session:${sessionId}`)?.load.kind).toBe('refused');
    expect(listed(store, storageId)?.load).toEqual({ kind: 'loadable' });
    store.close();
  });

  it('W34b: an autosave whose live point no longer resolves is listed load_failed and hides nothing', async () => {
    // A live point bound to a checksum the session's revision 2 does not have (the stream it pointed into was
    // replaced): listing it cannot resolve it, so it is refused with the store's own typed reason.
    const indexedDb = new IDBFactory();
    const sessionId = await seedStream(indexedDb, 'w34b', texts(s()), 'campaign', BUILD_B);
    const storageId = `per_round:${sessionId}:000000000002:round_boundary`;
    await putSnapshot(indexedDb, 'w34b', {
      sessionId, fingerprint: 'f'.repeat(64), revisionCount: 2, room: null, round: 1, initialSeed: 0, storageId,
      trigger: 'round_boundary', pool: 'per_round', name: 'Round 1', updatedAt: '2026-09-20T10:02:00.000Z',
      retention: { kind: 'named' }, restorePoint: { kind: 'live', headChecksum: 'e'.repeat(64) },
    });
    const store = await openStore(indexedDb, 'w34b', BUILD_B);
    expect(() => store.savedSessions()).not.toThrow();
    expect(listed(store, `session:${sessionId}`)?.load).toEqual({ kind: 'loadable' });
    expect(listed(store, storageId)?.load).toEqual({
      kind: 'refused',
      refusal: {
        kind: 'load_failed',
        errorName: 'RestorePointUnavailableError',
        message: `Save could not be loaded: RestorePointUnavailableError: Browser autosave ${storageId} points at a `
          + 'revision this session no longer holds.',
      },
    });
    store.close();
  });

  it('W45 (WR17): a stored v12 stream with a wrong v12 checksum no longer blocks open; listed undecodable; kept', async () => {
    const indexedDb = new IDBFactory();
    // The good session is S (lr-squeezed is Lx's own session id).
    const goodId = await seedStream(indexedDb, 'w45', texts(s()), 'good campaign', BUILD_B);
    const stored = lxTexts();
    const lxId = await seedStream(indexedDb, 'w45', stored, 'damaged campaign', BUILD_B);
    const opened = await openStore(indexedDb, 'w45', BUILD_B).catch((error: unknown) => error);
    expect(opened).toBeInstanceOf(IndexedDbBrowserSessionStore);
    const store = opened as IndexedDbBrowserSessionStore;
    expect(listed(store, `session:${goodId}`)?.load).toEqual({ kind: 'loadable' });
    expect(listed(store, `session:${lxId}`)).toMatchObject({
      contents: 'undecodable',
      sessionId: lxId,
      load: {
        kind: 'refused',
        refusal: { kind: 'integrity', fault: { kind: 'hash_mismatch', subject: 'legacy_revision_checksum', revision: 2 } },
      },
    });
    expect(await rawTexts(indexedDb, 'w45', lxId)).toEqual(stored);
    const exported = JSON.parse(store.exportedStored(`session:${lxId}`, encounterSessionId(lxId))) as Plain;
    expect([exported.format, exported.schemaVersion]).toEqual(['vtt-session-revisions', 12]);
    expect((exported.revisions as Plain[]).map((revision) => canonicalJson(revision))).toEqual(stored);
    await store.removeStored(`session:${lxId}`, encounterSessionId(lxId));
    store.close();
    expect(await rawTexts(indexedDb, 'w45', lxId)).toEqual([]);
    expect(await rawMetadata(indexedDb, 'w45', lxId)).toBeUndefined();
    expect((await rawTexts(indexedDb, 'w45', goodId)).length).toBeGreaterThan(0);
  });

  it('W46 (WR18): a stored v13 revision without controllers no longer blocks open; listed undecodable', async () => {
    const indexedDb = new IDBFactory();
    const sessionId = await seedStream(indexedDb, 'w46', texts(rehashed(e10(s()))), 'malformed campaign', BUILD_B);
    const opened = await openStore(indexedDb, 'w46', BUILD_B).catch((error: unknown) => error);
    expect(opened).toBeInstanceOf(IndexedDbBrowserSessionStore);
    const store = opened as IndexedDbBrowserSessionStore;
    expect(listed(store, `session:${sessionId}`)).toMatchObject({
      contents: 'undecodable',
      load: {
        kind: 'refused',
        refusal: { kind: 'integrity', fault: { kind: 'schema_violation', detail: 'Malformed VTT session revision.' } },
      },
    });
    store.close();
  });

  it('W47 (WR19): a folder file with a flipped fingerprint is listed undecodable beside the others', async () => {
    const plain = s();
    const folder = await folderHolding(new Map([
      ['good.vtt.json', bundle(plain)], ['flipped.vtt.json', withFlippedFingerprint(bundle(plain))],
    ]));
    const entries = await folder.list(BUILD_B).then((listing) => listing as readonly Plain[], () => []);
    expect(entries).toHaveLength(2);
    expect(entries.find((entry) => entry.name === 'good')?.load).toEqual({ kind: 'loadable' });
    expect(entries.find((entry) => entry.name === 'flipped')).toMatchObject({
      contents: 'undecodable',
      load: { kind: 'refused', refusal: { kind: 'integrity', fault: { kind: 'hash_mismatch', subject: 'bundle_fingerprint' } } },
    });
  });

  it('W48: a lifecycle import of a save with a wrong v12 checksum rejects typed and stores nothing', async () => {
    const indexedDb = new IDBFactory();
    const store = await openStore(indexedDb, 'w48', BUILD_B);
    const lifecycle = new IndexedDbSessionLifecycle(store, { sessionId: () => null, close: () => undefined });
    const lx = lrCross(lr());
    const outcome = await lifecycle.dispatch({ kind: 'import', bytes: revisionBundleText(12, lx) })
      .then(() => ({ resolved: true }), (error: any) => ({ name: error?.name, fault: error?.fault }));
    expect(outcome).toEqual({
      name: 'SessionIntegrityError',
      fault: {
        kind: 'hash_mismatch', subject: 'legacy_revision_checksum', revision: 2,
        detail: 'VTT session v12 revision checksum mismatch.',
      },
    });
    await store.flush();
    store.close();
    expect(await rawTexts(indexedDb, 'w48', String(lx[0]!.sessionId))).toEqual([]);
  });

  it('W57: a stored stream that does not decode is never written over by a new journal', async () => {
    const indexedDb = new IDBFactory();
    const stored = lxTexts();
    const lxId = await seedStream(indexedDb, 'w57', stored, 'damaged campaign', BUILD_B);
    const opened = await openStore(indexedDb, 'w57', BUILD_B).catch((error: unknown) => error);
    expect(opened).toBeInstanceOf(IndexedDbBrowserSessionStore);
    const store = opened as IndexedDbBrowserSessionStore;
    expect(thrown(() => store.revisions(encounterSessionId(lxId)))?.name).toBe('SessionIntegrityError');
    const [template] = decodeSavedSessionRevisions(bundle(s()), BUILD_B);
    const created = thrown(() => EncounterSessionJournal.create({
      sessionId: encounterSessionId(lxId), branchId: encounterBranchId('branch:w57'), encounterState: template!.encounterState,
      coordinatorState: template!.coordinatorState, controllers: template!.controllers, rng: mulberry32(57), store,
      mirror: new MemoryMirrorSink(),
    }));
    expect(created?.name).toBe('SessionIntegrityError');
    await store.flush();
    store.close();
    expect(await rawTexts(indexedDb, 'w57', lxId)).toEqual(stored);
  });
});
