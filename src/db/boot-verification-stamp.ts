import type {
  DatabaseStorage,
  DatabaseVerificationMode,
} from './database-lifecycle';

/**
 * D283 — the cold-boot verification stamp.
 *
 * A cold boot spends roughly three seconds proving the stored image is
 * structurally sound (`PRAGMA quick_check`, `PRAGMA foreign_key_check`, the
 * trigger inventory) and another second proving the bundled catalog still
 * digests to this build's pin. Both proofs are about BYTES THAT DID NOT
 * CHANGE: the second boot of an untouched image re-derives, at full cost, a
 * conclusion the first boot already reached.
 *
 * The stamp records that conclusion. It is deliberately NOT a boolean —
 * "verified" with nothing bound to it would happily validate a different
 * corpus, a different schema, or a different image. The stamp IS the key:
 * every input whose change would change the verification verdict is written
 * into it, and a stamp is honoured only when the whole key is reproduced
 * exactly. There is no partial match and no field a mismatch can be forgiven
 * in, because the comparison is a single string equality over a canonical
 * encoding.
 *
 * Three things are bound:
 *
 *  - `schemaChecksum` — the migration registry's target schema checksum. A
 *    release that changes the schema changes it, so a stamp can never claim a
 *    structure check the current build's structure never passed.
 *  - `bundledContentDigest` — the pinned whole-corpus digest. This is the
 *    build-side constant the catalog pass compares against, so a re-pinned
 *    corpus invalidates every stamp in the wild without needing a version
 *    number anybody has to remember to bump.
 *  - `imageDigest` — SHA-256 over the stored image bytes. Any write to the
 *    database changes it, which is how invalidation stays LAZY: nothing has to
 *    be cleared at write time, the next boot simply fails to reproduce the key.
 *
 * Plus `catalogDataMigrationsChecksum`, which pins the product-data migration
 * registry — a new data migration must be allowed to run and be re-verified.
 *
 * What the stamp knowingly gives up (D283, accepted): an image that is
 * corrupted AFTER a verified boot without its bytes changing — which is to say
 * corrupted underneath us by something other than SQLite — boots stamped and
 * is caught later rather than at boot.
 */
export const BOOT_VERIFICATION_STAMP_VERSION = 1;

/**
 * The half of the key that comes from the BUILD rather than from the stored
 * bytes. Every field is a constant available before any verification work
 * starts, which is what makes the skip decision cheap.
 */
export interface BootVerificationBuildKey {
  readonly schemaChecksum: string;
  readonly bundledContentDigest: string;
  readonly catalogDataMigrationsChecksum: string;
}

export interface BootVerificationStamp extends BootVerificationBuildKey {
  readonly stampVersion: typeof BOOT_VERIFICATION_STAMP_VERSION;
  readonly imageDigest: string;
}

export function bootVerificationStamp(
  build: BootVerificationBuildKey,
  imageDigest: string,
): BootVerificationStamp {
  return {
    stampVersion: BOOT_VERIFICATION_STAMP_VERSION,
    schemaChecksum: build.schemaChecksum,
    bundledContentDigest: build.bundledContentDigest,
    catalogDataMigrationsChecksum: build.catalogDataMigrationsChecksum,
    imageDigest,
  };
}

/**
 * Positional framing, not an object literal: a JSON object's key order is a
 * property of how it was built, and two stamps that differ only in key order
 * must not compare unequal. An array has exactly one encoding.
 */
export function serializeBootVerificationStamp(
  stamp: BootVerificationStamp,
): string {
  return JSON.stringify([
    stamp.stampVersion,
    stamp.schemaChecksum,
    stamp.bundledContentDigest,
    stamp.catalogDataMigrationsChecksum,
    stamp.imageDigest,
  ]);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null;
}

/**
 * Reads a stamp back, or reports that there isn't one.
 *
 * EVERY malformed shape returns `null` rather than throwing: absent file,
 * truncated write, a future stamp version, a field that is not a string. A
 * stamp is a cache, and a cache that can fail a boot is worse than no cache.
 */
export function parseBootVerificationStamp(
  text: string | null,
): BootVerificationStamp | null {
  if (text === null) {
    return null;
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(text);
  } catch {
    return null;
  }
  if (!Array.isArray(decoded)) {
    return null;
  }
  const fields: readonly unknown[] = decoded;
  if (fields.length !== 5) {
    return null;
  }
  if (fields[0] !== BOOT_VERIFICATION_STAMP_VERSION) {
    return null;
  }
  const schemaChecksum = nonEmptyString(fields[1]);
  const bundledContentDigest = nonEmptyString(fields[2]);
  const catalogDataMigrationsChecksum = nonEmptyString(fields[3]);
  const imageDigest = nonEmptyString(fields[4]);
  if (
    schemaChecksum === null ||
    bundledContentDigest === null ||
    catalogDataMigrationsChecksum === null ||
    imageDigest === null
  ) {
    return null;
  }
  return {
    stampVersion: BOOT_VERIFICATION_STAMP_VERSION,
    schemaChecksum,
    bundledContentDigest,
    catalogDataMigrationsChecksum,
    imageDigest,
  };
}

/**
 * Where a stamp lives. It is deliberately NOT the database — a stamp written
 * inside the image would change the bytes it certifies — and deliberately not
 * typed to OPFS here, so the decision logic can be tested without a browser.
 */
export interface BootVerificationStampStore {
  read(): Promise<string | null>;
  write(text: string): Promise<void>;
}

const HEX = '0123456789abcdef';

function toHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) {
    hex += HEX[byte >> 4] ?? '';
    hex += HEX[byte & 0x0f] ?? '';
  }
  return hex;
}

/**
 * SHA-256 over the image via WebCrypto, NOT via `src/crypto/sha256.ts`.
 *
 * The in-repo implementation hashes a string a byte at a time in JavaScript;
 * over a multi-megabyte image that would cost more than the verification the
 * stamp exists to skip. The native digest is a few tens of milliseconds
 * against the ~4s saved, which is the only reason this trade is worth making.
 */
export async function databaseImageDigest(
  bytes: Uint8Array,
  subtle: Pick<SubtleCrypto, 'digest'> = crypto.subtle,
): Promise<string> {
  // Copied into a view over a plain ArrayBuffer because an image read out of
  // the VFS may be backed by SharedArrayBuffer, which `digest` will not take.
  const digest = await subtle.digest('SHA-256', new Uint8Array(bytes));
  return toHex(new Uint8Array(digest));
}

/**
 * The digest of the CURRENTLY STORED image, or `null` when there is nothing
 * stored yet — the first-ever boot, where `exportFile` has no file to read.
 * An unreadable image is not an error here; it simply means nothing can be
 * skipped.
 */
export async function storedDatabaseImageDigest(
  storage: Pick<DatabaseStorage, 'exportFile'>,
): Promise<string | null> {
  try {
    const bytes = await storage.exportFile();
    return bytes.byteLength === 0 ? null : await databaseImageDigest(bytes);
  } catch {
    return null;
  }
}

export interface BootVerificationPlan {
  /** What the lifecycle should do: verify everything, or trust the stamp. */
  readonly mode: DatabaseVerificationMode;
  /**
   * Persists the stamp for the NEXT boot. Call after a successful boot, off
   * the critical path. It re-reads the image digest because seeding and the
   * data migrations may legitimately have written during this boot; stamping
   * the pre-boot digest would certify bytes that no longer exist.
   */
  commit(): Promise<void>;
}

export interface BootVerificationPlanOptions {
  readonly store: BootVerificationStampStore;
  readonly build: BootVerificationBuildKey;
  readonly imageDigest: () => Promise<string | null>;
}

async function readStampText(
  store: BootVerificationStampStore,
): Promise<string | null> {
  try {
    return await store.read();
  } catch {
    return null;
  }
}

/**
 * Decides, before the database is opened, whether this boot may skip
 * verification.
 *
 * A stamped boot NEVER re-stamps. It did not run the checks, so it has nothing
 * new to certify; if this boot writes to the image, the stamp it inherited
 * stops matching and the next boot verifies in full and re-stamps. That makes
 * the scheme self-healing rather than self-confirming — a stamp can only ever
 * be created by a boot that actually did the work.
 */
export async function planBootVerification(
  options: BootVerificationPlanOptions,
): Promise<BootVerificationPlan> {
  const stored = parseBootVerificationStamp(await readStampText(options.store));
  const digest = await options.imageDigest();
  const mode: DatabaseVerificationMode =
    stored !== null &&
    digest !== null &&
    serializeBootVerificationStamp(stored) ===
      serializeBootVerificationStamp(
        bootVerificationStamp(options.build, digest),
      )
      ? 'stamped'
      : 'full';
  return {
    mode,
    commit: async () => {
      if (mode === 'stamped') {
        return;
      }
      const verifiedDigest = await options.imageDigest();
      if (verifiedDigest === null) {
        return;
      }
      try {
        await options.store.write(
          serializeBootVerificationStamp(
            bootVerificationStamp(options.build, verifiedDigest),
          ),
        );
      } catch (error) {
        // A stamp that cannot be written costs the next boot its fast start
        // and nothing else. It is not a boot failure.
        console.warn('Boot verification stamp could not be written.', error);
      }
    },
  };
}
