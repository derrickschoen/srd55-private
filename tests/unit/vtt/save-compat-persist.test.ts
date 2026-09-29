import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { encounterSessionId } from '../../../src/combat/values';
import { sha256 } from '../../../src/crypto/sha256';
import {
  EncounterSessionJournal,
  importSavedSession,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
} from '../../../src/vtt/session-persistence';
import {
  BUILD_A,
  BUILD_B,
  bundle,
  e1,
  LR_SQUEEZED_V12,
  lrPrime,
  OVERHANG_V12,
  recordS,
  rehashed,
  thrown,
  type Plain,
} from '../../helpers/save-compat-fixtures';
import {
  MemoryStorageLike,
  openStore,
  putSnapshot,
  rawMetadata,
  rawTexts,
  seedStream,
} from '../../helpers/save-compat-storage';
import { declareTestInputs } from '../../helpers/test-inputs';

// SAVE-COMPAT C3 (supervisor D944, D945 SQ2): nothing is persisted that a strict replay under the running build has
// not verified. A migration, an import, a restore or a legacy move whose revisions do not replay writes nothing and
// deletes nothing; the stored bytes stay exactly as an earlier build left them, listed refused. Builds: A records,
// B runs. Every expectation is by hand.

const inputs = declareTestInputs({ fixtures: [OVERHANG_V12, LR_SQUEEZED_V12] });
const s = (): { readonly sessionId: string; readonly plain: Plain[] } => {
  const recorded = recordS(BUILD_A, inputs.fixtures.readText(OVERHANG_V12));
  return { sessionId: recorded.sessionId, plain: recorded.plain };
};
const texts = (revisions: readonly Plain[]): string[] => revisions.map((revision) => canonicalJson(revision));
/** L': lr-squeezed revisions 1-2 (schema 12), revision 2's events doubled, its v12 checksum recomputed. */
const lPrime = (): Plain[] => lrPrime(inputs.fixtures.readText(LR_SQUEEZED_V12));

function listed(store: { savedSessions(): readonly unknown[] }, storageId: string): any {
  return (store.savedSessions() as readonly Plain[]).find((save) => save.storageId === storageId);
}

describe('SAVE-COMPAT C3: nothing unverified is persisted', () => {
  it('W12: a stored v12 stream whose bumped history fails strict replay keeps its bytes and is listed refused', async () => {
    const indexedDb = new IDBFactory();
    const seeded = texts(lPrime());
    const sessionId = await seedStream(indexedDb, 'w12', seeded, 'v12 campaign', BUILD_B);
    (await openStore(indexedDb, 'w12', BUILD_B)).close();
    expect(await rawTexts(indexedDb, 'w12', sessionId)).toEqual(seeded);
    const reopened = await openStore(indexedDb, 'w12', BUILD_B);
    // The bumped revisions were recorded before revisions named their build: the relation is unrecorded.
    expect(listed(reopened, `session:${sessionId}`)).toMatchObject({
      migrationStatus: 'native',
      load: { kind: 'refused', refusal: { kind: 'recorded_by_other_build', refusal: { revision: 2, relation: { kind: 'unrecorded' } } } },
    });
    reopened.close();
    expect(await rawTexts(indexedDb, 'w12', sessionId)).toEqual(seeded);
  });

  it('W14: a legacy localStorage autosave another build recorded no longer blocks open; kept verbatim', async () => {
    const { sessionId, plain } = s();
    const bytes = bundle(e1(plain));
    const legacy = new MemoryStorageLike();
    const storageId = `per_round:${sessionId}:000000000003:round_boundary`;
    legacy.setItem(`srd55:vtt-autosave:${storageId}`, JSON.stringify({
      storageId, sessionId, trigger: 'round_boundary', pool: 'per_round', name: 'Round 1',
      updatedAt: '2026-09-20T10:00:00.000Z', bytes, retention: { kind: 'autosave', pool: 'per_round' },
    }));
    const indexedDb = new IDBFactory();
    const opened = await openStore(indexedDb, 'w14', BUILD_B, legacy).catch((error: unknown) => error);
    expect(opened).toHaveProperty('savedSessions');
    const store = opened as Awaited<ReturnType<typeof openStore>>;
    expect(store.revisions(encounterSessionId(sessionId))).toEqual([]);
    expect(listed(store, storageId)?.load).toMatchObject({ kind: 'refused', refusal: { kind: 'recorded_by_other_build' } });
    expect(store.exportedStored(storageId, encounterSessionId(sessionId))).toBe(bytes);
    expect(legacy.length).toBe(0);
    store.close();
    // No session metadata without revisions.
    expect(await rawMetadata(indexedDb, 'w14', sessionId)).toBeUndefined();
  });

  it('W35 (P1-4 direction 2): an own-save autosave another build recorded: restoring it replaces nothing', async () => {
    const indexedDb = new IDBFactory();
    const { sessionId, plain } = s();
    await seedStream(indexedDb, 'w35', texts(plain), 'campaign', BUILD_B);
    const storageId = `per_round:${sessionId}:000000000003:round_boundary`;
    await putSnapshot(indexedDb, 'w35', {
      sessionId, fingerprint: 'f'.repeat(64), revisionCount: 3, room: null, round: 1, initialSeed: 0, storageId,
      trigger: 'round_boundary', pool: 'per_round', name: 'Round 1', updatedAt: '2026-09-20T10:03:00.000Z',
      retention: { kind: 'named' }, restorePoint: { kind: 'own_save', text: bundle(e1(plain)) },
    });
    const store = await openStore(indexedDb, 'w35', BUILD_B);
    const id = encounterSessionId(sessionId);
    const live = store.revisions(id).map((revision) => revision.checksum);
    const restored = await store.restoreStored(storageId, id).then(() => 'resolved', (error: Error) => error.name);
    expect(restored).toBe('SessionRecordedByOtherBuildError');
    expect(store.revisions(id).map((revision) => revision.checksum)).toEqual(live);
    expect(listed(store, `session:${sessionId}`)?.load).toEqual({ kind: 'loadable' });
    expect(listed(store, storageId)?.load.kind).toBe('refused');
    store.close();
    expect(await rawTexts(indexedDb, 'w35', sessionId)).toEqual(texts(plain));
  });

  it('W36: restoring a live point whose prefix does not replay deletes no later revision', async () => {
    const indexedDb = new IDBFactory();
    const { sessionId, plain } = s();
    const refused = rehashed(e1(plain));
    await seedStream(indexedDb, 'w36', texts(refused), 'campaign', BUILD_B);
    const storageId = `per_round:${sessionId}:000000000002:round_boundary`;
    await putSnapshot(indexedDb, 'w36', {
      sessionId, fingerprint: 'f'.repeat(64), revisionCount: 2, room: null, round: 1, initialSeed: 0, storageId,
      trigger: 'round_boundary', pool: 'per_round', name: 'Round 1', updatedAt: '2026-09-20T10:02:00.000Z',
      retention: { kind: 'named' }, restorePoint: { kind: 'live', headChecksum: refused[1]!.checksum },
    });
    const store = await openStore(indexedDb, 'w36', BUILD_B);
    const id = encounterSessionId(sessionId);
    const restored = await store.restoreStored(storageId, id).then(() => 'resolved', (error: Error) => error.name);
    expect(restored).toBe('SessionRecordedByOtherBuildError');
    expect(store.revisions(id)).toHaveLength(3);
    store.close();
    expect(await rawTexts(indexedDb, 'w36', sessionId)).toEqual(texts(refused));
  });

  it('W37: a legacy localStorage session another build recorded is kept verbatim as its own save; no revision is written', async () => {
    const { sessionId, plain } = s();
    const bytes = bundle(e1(plain));
    const legacy = new MemoryStorageLike();
    legacy.setItem(`srd55:vtt-session:${sessionId}`, bytes);
    const indexedDb = new IDBFactory();
    const opened = await openStore(indexedDb, 'w37', BUILD_B, legacy).catch((error: unknown) => error);
    expect(opened).toHaveProperty('savedSessions');
    const store = opened as Awaited<ReturnType<typeof openStore>>;
    expect(store.revisions(encounterSessionId(sessionId))).toEqual([]);
    const keptId = `legacy_session:${sessionId}:${sha256(bytes)}`;
    const kept = (store.savedSessions() as readonly Plain[]).filter((save) => String(save.storageId).startsWith('legacy_session:'));
    expect(kept.map((save) => save.storageId)).toEqual([keptId]);
    expect(kept[0]?.load).toMatchObject({ kind: 'refused', refusal: { kind: 'recorded_by_other_build' } });
    expect(store.exportedStored(keptId, encounterSessionId(sessionId))).toBe(bytes);
    expect(legacy.length).toBe(0);
    store.close();
    expect(await rawTexts(indexedDb, 'w37', sessionId)).toEqual([]);
  });

  it('W49 (WR20): a refused stream whose migration is not persisted exports its stored source, never the migration output', async () => {
    const indexedDb = new IDBFactory();
    const seeded = texts(lPrime());
    const sessionId = await seedStream(indexedDb, 'w49', seeded, 'v12 campaign', BUILD_B);
    const store = await openStore(indexedDb, 'w49', BUILD_B);
    let bytes = '';
    expect(() => {
      bytes = store.exportedStored(`session:${sessionId}`, encounterSessionId(sessionId));
    }).not.toThrow();
    store.close();
    const exported = JSON.parse(bytes) as Plain;
    expect([exported.format, exported.schemaVersion]).toEqual(['vtt-session-revisions', 12]);
    expect((exported.revisions as Plain[]).map((revision) => canonicalJson(revision))).toEqual(seeded);
  });

  it('W50 (WR16a): importing a save another build recorded refuses before any write (memory store)', () => {
    const { sessionId, plain } = s();
    const store = new MemoryBrowserSessionStore(BUILD_B);
    expect(thrown(() => importSavedSession(store, bundle(e1(plain))))?.name).toBe('SessionRecordedByOtherBuildError');
    expect(store.revisions(encounterSessionId(sessionId))).toEqual([]);
  });

  it('W51 (WR16b): the IndexedDB import refuses the same save and durably stores nothing', async () => {
    const indexedDb = new IDBFactory();
    const { sessionId, plain } = s();
    const store = await openStore(indexedDb, 'w51', BUILD_B);
    const error = thrown(() => store.import(bundle(e1(plain))));
    await store.flush();
    store.close();
    expect(error?.name).toBe('SessionRecordedByOtherBuildError');
    expect(await rawTexts(indexedDb, 'w51', sessionId)).toEqual([]);
  });

  it('W54 CONTROL: restoring a live point into an unpersisted stream writes its verified prefix, which then takes turns', async () => {
    const indexedDb = new IDBFactory();
    const seeded = lPrime();
    const sessionId = await seedStream(indexedDb, 'w54', texts(seeded), 'v12 campaign', BUILD_B);
    const storageId = `per_round:${sessionId}:000000000001:encounter_start`;
    // An autosave stored before restore points existed (FOOTPRINT fix1): a live prefix bound by position only.
    await putSnapshot(indexedDb, 'w54', {
      sessionId, fingerprint: 'f'.repeat(64), revisionCount: 1, room: null, round: 0, initialSeed: 0, storageId,
      trigger: 'encounter_start', pool: 'per_round', name: 'Start', updatedAt: '2026-09-20T10:01:00.000Z',
      retention: { kind: 'named' },
    });
    const store = await openStore(indexedDb, 'w54', BUILD_B);
    const id = encounterSessionId(sessionId);
    await expect(store.restoreStored(storageId, id)).resolves.toBeUndefined();
    const raw = await rawTexts(indexedDb, 'w54', sessionId);
    expect(raw.map((text) => (JSON.parse(text) as Plain).schemaVersion)).toEqual([13]);
    const resumed = EncounterSessionJournal.resume(id, store, new MemoryMirrorSink());
    resumed.journal.endSession();
    await store.flush();
    store.close();
    const reopened = await openStore(indexedDb, 'w54', BUILD_B);
    expect(EncounterSessionJournal.resume(id, reopened, new MemoryMirrorSink()).journal.history()).toHaveLength(2);
    reopened.close();
  });
});
