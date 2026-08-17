import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import schema from '../../../src/db/schema.sql?raw';
import {
  BOOT_VERIFICATION_STAMP_VERSION,
  bootVerificationStamp,
  databaseImageDigest,
  parseBootVerificationStamp,
  planBootVerification,
  serializeBootVerificationStamp,
  storedDatabaseImageDigest,
  type BootVerificationBuildKey,
  type BootVerificationStampStore,
} from '../../../src/db/boot-verification-stamp';
import {
  DatabaseLifecycle,
  type DatabaseVerificationMode,
} from '../../../src/db/database-lifecycle';
import { opfsBootVerificationStampStore } from '../../../src/db/boot-verification-stamp-opfs';
import { getSqlite3, MemoryDatabaseStorage } from '../../helpers/open-db';

const BUILD: BootVerificationBuildKey = Object.freeze({
  schemaChecksum: 'schema-checksum-a',
  bundledContentDigest: 'corpus-digest-a',
  catalogDataMigrationsChecksum: 'data-migrations-a',
});

/**
 * An in-memory stand-in for the OPFS file. It counts reads and writes because
 * "the stamp was not written" and "the stamp was written with the same value"
 * are different claims, and only the counters can tell them apart.
 */
class RecordingStampStore implements BootVerificationStampStore {
  text: string | null = null;
  reads = 0;
  writes = 0;
  failRead = false;
  failWrite = false;

  async read(): Promise<string | null> {
    this.reads += 1;
    if (this.failRead) {
      throw new Error('Injected stamp read failure.');
    }
    return this.text;
  }

  async write(text: string): Promise<void> {
    this.writes += 1;
    if (this.failWrite) {
      throw new Error('Injected stamp write failure.');
    }
    this.text = text;
  }
}

function digestSource(...digests: readonly (string | null)[]) {
  const queue = [...digests];
  return async (): Promise<string | null> => queue.shift() ?? null;
}

describe('boot verification stamp key', () => {
  it('stamps a first verified boot with the digests it verified', async () => {
    const store = new RecordingStampStore();

    const plan = await planBootVerification({
      store,
      build: BUILD,
      imageDigest: digestSource('image-digest-a', 'image-digest-a'),
    });
    expect(plan.mode).toBe<DatabaseVerificationMode>('full');
    expect(store.writes).toBe(0);

    await plan.commit();

    expect(store.writes).toBe(1);
    expect(parseBootVerificationStamp(store.text)).toEqual({
      stampVersion: BOOT_VERIFICATION_STAMP_VERSION,
      schemaChecksum: 'schema-checksum-a',
      bundledContentDigest: 'corpus-digest-a',
      catalogDataMigrationsChecksum: 'data-migrations-a',
      imageDigest: 'image-digest-a',
    });
  });

  it('stamps the POST-boot image, not the image the boot started from', async () => {
    const store = new RecordingStampStore();

    const plan = await planBootVerification({
      store,
      build: BUILD,
      // The boot seeded, so the bytes moved between the decision and the
      // commit. Stamping the first digest would certify bytes that are gone.
      imageDigest: digestSource('before-seed', 'after-seed'),
    });
    await plan.commit();

    expect(parseBootVerificationStamp(store.text)?.imageDigest)
      .toBe('after-seed');
  });

  it('skips verification on a second boot with identical digests', async () => {
    const store = new RecordingStampStore();
    const first = await planBootVerification({
      store,
      build: BUILD,
      imageDigest: digestSource('image-digest-a', 'image-digest-a'),
    });
    await first.commit();

    const second = await planBootVerification({
      store,
      build: BUILD,
      imageDigest: digestSource('image-digest-a'),
    });

    expect(second.mode).toBe<DatabaseVerificationMode>('stamped');
  });

  it('does not re-stamp a boot that skipped verification', async () => {
    const store = new RecordingStampStore();
    const first = await planBootVerification({
      store,
      build: BUILD,
      imageDigest: digestSource('image-digest-a', 'image-digest-a'),
    });
    await first.commit();
    const writesAfterFirstBoot = store.writes;

    const second = await planBootVerification({
      store,
      build: BUILD,
      // Even though this boot's own writes moved the image, a boot that ran no
      // checks has nothing to certify: the next boot verifies in full.
      imageDigest: digestSource('image-digest-a', 'image-digest-b'),
    });
    await second.commit();

    expect(second.mode).toBe<DatabaseVerificationMode>('stamped');
    expect(store.writes).toBe(writesAfterFirstBoot);
  });

  const invalidations: readonly (readonly [string, () => Promise<string>])[] = [
    [
      'the image bytes change',
      async () => {
        const store = new RecordingStampStore();
        const first = await planBootVerification({
          store,
          build: BUILD,
          imageDigest: digestSource('image-digest-a', 'image-digest-a'),
        });
        await first.commit();
        const second = await planBootVerification({
          store,
          build: BUILD,
          imageDigest: digestSource('image-digest-b'),
        });
        return second.mode;
      },
    ],
    [
      'the bundled corpus digest is re-pinned',
      async () => {
        const store = new RecordingStampStore();
        const first = await planBootVerification({
          store,
          build: BUILD,
          imageDigest: digestSource('image-digest-a', 'image-digest-a'),
        });
        await first.commit();
        const second = await planBootVerification({
          store,
          build: { ...BUILD, bundledContentDigest: 'corpus-digest-b' },
          imageDigest: digestSource('image-digest-a'),
        });
        return second.mode;
      },
    ],
    [
      'the schema checksum moves',
      async () => {
        const store = new RecordingStampStore();
        const first = await planBootVerification({
          store,
          build: BUILD,
          imageDigest: digestSource('image-digest-a', 'image-digest-a'),
        });
        await first.commit();
        const second = await planBootVerification({
          store,
          build: { ...BUILD, schemaChecksum: 'schema-checksum-b' },
          imageDigest: digestSource('image-digest-a'),
        });
        return second.mode;
      },
    ],
    [
      'a catalog data migration is added',
      async () => {
        const store = new RecordingStampStore();
        const first = await planBootVerification({
          store,
          build: BUILD,
          imageDigest: digestSource('image-digest-a', 'image-digest-a'),
        });
        await first.commit();
        const second = await planBootVerification({
          store,
          build: { ...BUILD, catalogDataMigrationsChecksum: 'data-migrations-b' },
          imageDigest: digestSource('image-digest-a'),
        });
        return second.mode;
      },
    ],
  ];

  for (const [reason, run] of invalidations) {
    it(`re-verifies when ${reason}`, async () => {
      expect(await run()).toBe<DatabaseVerificationMode>('full');
    });
  }

  it('never stamps when there is no stored image to bind to', async () => {
    const store = new RecordingStampStore();

    const plan = await planBootVerification({
      store,
      build: BUILD,
      imageDigest: digestSource(null, null),
    });
    await plan.commit();

    expect(plan.mode).toBe<DatabaseVerificationMode>('full');
    expect(store.writes).toBe(0);
    expect(store.text).toBeNull();
  });

  it('is a key, not a flag: no field can be dropped and still match', () => {
    const stamp = bootVerificationStamp(BUILD, 'image-digest-a');
    const serialized = serializeBootVerificationStamp(stamp);

    for (const other of [
      bootVerificationStamp(BUILD, 'image-digest-b'),
      bootVerificationStamp({ ...BUILD, schemaChecksum: 'x' }, 'image-digest-a'),
      bootVerificationStamp(
        { ...BUILD, bundledContentDigest: 'x' },
        'image-digest-a',
      ),
      bootVerificationStamp(
        { ...BUILD, catalogDataMigrationsChecksum: 'x' },
        'image-digest-a',
      ),
    ]) {
      expect(serializeBootVerificationStamp(other)).not.toBe(serialized);
    }
  });
});

describe('corrupted or absent stamps', () => {
  const corruptions: readonly (readonly [string, string])[] = [
    ['empty text', ''],
    ['not JSON at all', 'this is not a stamp'],
    ['JSON of the wrong shape', '{"verified":true}'],
    ['a truncated field list', '[1,"schema-checksum-a","corpus-digest-a"]'],
    [
      'an extra field',
      '[1,"schema-checksum-a","corpus-digest-a","data-migrations-a","image-digest-a","surplus"]',
    ],
    [
      'a future stamp version',
      '[2,"schema-checksum-a","corpus-digest-a","data-migrations-a","image-digest-a"]',
    ],
    [
      'a non-string digest',
      '[1,"schema-checksum-a","corpus-digest-a","data-migrations-a",7]',
    ],
    [
      'an empty digest',
      '[1,"schema-checksum-a","corpus-digest-a","data-migrations-a",""]',
    ],
    ['a JSON null', 'null'],
  ];

  for (const [reason, text] of corruptions) {
    it(`parses ${reason} as no stamp rather than throwing`, () => {
      expect(parseBootVerificationStamp(text)).toBeNull();
    });

    it(`boots with full verification given ${reason}`, async () => {
      const store = new RecordingStampStore();
      store.text = text;

      const plan = await planBootVerification({
        store,
        build: BUILD,
        imageDigest: digestSource('image-digest-a', 'image-digest-a'),
      });

      expect(plan.mode).toBe<DatabaseVerificationMode>('full');
    });
  }

  it('treats an absent stamp as no stamp', () => {
    expect(parseBootVerificationStamp(null)).toBeNull();
  });

  it('boots with full verification when the store itself throws', async () => {
    const store = new RecordingStampStore();
    store.failRead = true;

    const plan = await planBootVerification({
      store,
      build: BUILD,
      imageDigest: digestSource('image-digest-a', 'image-digest-a'),
    });

    expect(plan.mode).toBe<DatabaseVerificationMode>('full');
    expect(store.reads).toBe(1);
  });

  it('survives a stamp that cannot be written', async () => {
    const store = new RecordingStampStore();
    store.failWrite = true;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const plan = await planBootVerification({
      store,
      build: BUILD,
      imageDigest: digestSource('image-digest-a', 'image-digest-a'),
    });
    await expect(plan.commit()).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalledOnce();
    expect(store.text).toBeNull();
    warn.mockRestore();
  });

  it('re-verifies after a corrupted stamp and replaces it', async () => {
    const store = new RecordingStampStore();
    store.text = '[1,"schema-checksum-a","corpus';

    const plan = await planBootVerification({
      store,
      build: BUILD,
      imageDigest: digestSource('image-digest-a', 'image-digest-a'),
    });
    await plan.commit();

    expect(plan.mode).toBe<DatabaseVerificationMode>('full');
    expect(parseBootVerificationStamp(store.text)?.imageDigest)
      .toBe('image-digest-a');
  });
});

describe('image digest', () => {
  it('is SHA-256 over the exact bytes', async () => {
    // The empty-input SHA-256, quoted from FIPS 180-4's published test vector
    // rather than taken from this implementation's own output.
    expect(await databaseImageDigest(new Uint8Array(0))).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    // "abc", the other published vector.
    expect(
      await databaseImageDigest(new TextEncoder().encode('abc')),
    ).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('changes when a single byte of the image changes', async () => {
    const first = await databaseImageDigest(Uint8Array.of(1, 2, 3));
    const second = await databaseImageDigest(Uint8Array.of(1, 2, 4));
    expect(first).not.toBe(second);
  });

  it('reports no digest when there is no stored image', async () => {
    expect(
      await storedDatabaseImageDigest({
        exportFile: () => Promise.reject(new Error('no such file')),
      }),
    ).toBeNull();
    expect(
      await storedDatabaseImageDigest({
        exportFile: () => Promise.resolve(new Uint8Array(0)),
      }),
    ).toBeNull();
  });
});

describe('opfs stamp store', () => {
  class FakeSyncAccessHandle {
    bytes = new Uint8Array(0);
    closed = false;

    constructor(private readonly file: FakeFileHandle) {
      this.bytes = new Uint8Array(file.bytes);
    }

    getSize(): number {
      return this.bytes.byteLength;
    }

    read(buffer: Uint8Array, options: { readonly at: number }): number {
      const slice = this.bytes.subarray(
        options.at,
        options.at + buffer.byteLength,
      );
      buffer.set(slice);
      return slice.byteLength;
    }

    write(buffer: Uint8Array, options: { readonly at: number }): number {
      const next = new Uint8Array(options.at + buffer.byteLength);
      next.set(this.bytes.subarray(0, options.at));
      next.set(buffer, options.at);
      this.bytes = next;
      this.file.bytes = next;
      return buffer.byteLength;
    }

    truncate(newSize: number): void {
      this.bytes = new Uint8Array(this.bytes.subarray(0, newSize));
      this.file.bytes = this.bytes;
    }

    flush(): void {
      this.file.flushes += 1;
    }

    close(): void {
      this.closed = true;
    }
  }

  class FakeFileHandle {
    bytes = new Uint8Array(0);
    flushes = 0;
    handles: FakeSyncAccessHandle[] = [];

    async createSyncAccessHandle(): Promise<FakeSyncAccessHandle> {
      const handle = new FakeSyncAccessHandle(this);
      this.handles.push(handle);
      return handle;
    }
  }

  class FakeDirectory {
    readonly files = new Map<string, FakeFileHandle>();

    async getFileHandle(
      name: string,
      options?: { readonly create: boolean },
    ): Promise<FakeFileHandle> {
      const existing = this.files.get(name);
      if (existing !== undefined) {
        return existing;
      }
      if (options?.create !== true) {
        throw new Error(`No OPFS file named ${name}.`);
      }
      const created = new FakeFileHandle();
      this.files.set(name, created);
      return created;
    }
  }

  let directory: FakeDirectory;

  beforeEach(() => {
    directory = new FakeDirectory();
  });

  function store() {
    return opfsBootVerificationStampStore(
      { getDirectory: () => Promise.resolve(directory) },
      'stamp',
    );
  }

  it('round-trips a stamp through the file and closes every handle', async () => {
    const text = serializeBootVerificationStamp(
      bootVerificationStamp(BUILD, 'image-digest-a'),
    );
    await store().write(text);

    expect(await store().read()).toBe(text);
    const file = directory.files.get('stamp');
    expect(file?.flushes).toBe(1);
    expect(file?.handles.every((handle) => handle.closed)).toBe(true);
  });

  it('leaves no tail behind when a shorter stamp replaces a longer one', async () => {
    await store().write('[1,"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","b","c","d"]');
    await store().write('[1,"a","b","c","d"]');

    expect(await store().read()).toBe('[1,"a","b","c","d"]');
  });

  it('reports a read of an absent file to the caller, which treats it as no stamp',
    async () => {
      await expect(store().read()).rejects.toThrow('No OPFS file named stamp.');

      const plan = await planBootVerification({
        store: store(),
        build: BUILD,
        imageDigest: digestSource('image-digest-a', 'image-digest-a'),
      });
      expect(plan.mode).toBe<DatabaseVerificationMode>('full');
    });
});

describe('a stamped open against a real database', () => {
  let sqlite3: Sqlite3Static;

  beforeEach(async () => {
    sqlite3 = await getSqlite3();
  });

  /**
   * Produces bytes whose SCHEMA this build accepts but whose ROWS violate a
   * foreign key — the exact class of damage `PRAGMA foreign_key_check` exists
   * to find, and therefore the sharpest available proof of which checks a
   * stamped open really skips.
   */
  async function seedForeignKeyViolation(
    storage: MemoryDatabaseStorage,
  ): Promise<void> {
    const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);
    lifecycle.open();
    lifecycle.database.exec(
      `INSERT INTO characters (name) VALUES ('Orphan Parent');
       INSERT INTO character_background (character_id, name)
         VALUES (1, 'Acolyte');`,
    );
    lifecycle.database.exec('PRAGMA foreign_keys = OFF');
    lifecycle.database.exec('DELETE FROM characters WHERE id = 1');
    lifecycle.close();
  }

  it('a full open refuses the damaged image a stamped open accepts', async () => {
    const storage = new MemoryDatabaseStorage(sqlite3);
    await seedForeignKeyViolation(storage);

    const strict = new DatabaseLifecycle(sqlite3, storage, schema);
    expect(() => strict.open('full')).toThrow(/foreign-key check failed/);

    const stamped = new DatabaseLifecycle(sqlite3, storage, schema);
    try {
      expect(stamped.open('stamped').isOpen).toBe(true);
    } finally {
      stamped.close();
    }
  });

  it('still refuses a stamped open whose schema does not match the build', async () => {
    const storage = new MemoryDatabaseStorage(sqlite3);
    const seeded = new DatabaseLifecycle(sqlite3, storage, schema);
    seeded.open();
    seeded.database.exec('DROP INDEX `character_background_character_id_unique`');
    seeded.close();

    const stamped = new DatabaseLifecycle(sqlite3, storage, schema);
    expect(() => stamped.open('stamped')).toThrow(
      /schema does not match the application schema/,
    );
  });

  it('hands the verification mode to the seed, and forces full for a new image',
    async () => {
      const storage = new MemoryDatabaseStorage(sqlite3);
      const seen: DatabaseVerificationMode[] = [];
      const seed = (_db: unknown, verification: DatabaseVerificationMode) => {
        seen.push(verification);
      };

      const created = new DatabaseLifecycle(sqlite3, storage, schema, seed);
      // Nothing is stored yet, so this open CREATES the image. A stamp cannot
      // describe bytes that did not exist when it was written.
      created.open('stamped');
      created.close();

      const reopened = new DatabaseLifecycle(sqlite3, storage, schema, seed);
      reopened.open('stamped');
      reopened.close();

      const defaulted = new DatabaseLifecycle(sqlite3, storage, schema, seed);
      defaulted.open();
      defaulted.close();

      expect(seen).toEqual<DatabaseVerificationMode[]>([
        'full',
        'stamped',
        'full',
      ]);
    });

  it('digests the image a real storage holds, and notices when it changes',
    async () => {
      const storage = new MemoryDatabaseStorage(sqlite3);
      const lifecycle = new DatabaseLifecycle(sqlite3, storage, schema);
      lifecycle.open();
      lifecycle.close();

      const before = await storedDatabaseImageDigest(storage);
      expect(before).toMatch(/^[0-9a-f]{64}$/);

      const writing = new DatabaseLifecycle(sqlite3, storage, schema);
      writing.open();
      writing.database.exec(
        "INSERT INTO characters (name) VALUES ('Stamp Invalidator')",
      );
      writing.close();

      expect(await storedDatabaseImageDigest(storage)).not.toBe(before);
    });
});
