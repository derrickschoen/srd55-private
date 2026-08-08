import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import schema from '../src/db/schema.sql?raw';
import { applicationSeed } from '../src/db/bootstrap';
import { DatabaseContext, prepareConnection } from '../src/db/database';
import {
  bundledContentDigestMismatchesV1,
  bundledContentDigestPassV1,
} from '../src/catalog/bundled-content-digest-v1';
import {
  EXPECTED_BUNDLED_AGGREGATE_DIGESTS_V1,
  EXPECTED_BUNDLED_CONTENT_DIGEST_V1,
} from '../src/catalog/bundled-content-digest-v1.expected';
import { canonicalContentIdentityJson } from '../src/catalog/content-identity';
import { sha256 } from '../src/crypto/sha256';

const sqlite3 = await sqlite3InitModule();
const connection = new sqlite3.oo1.DB(':memory:', 'c');
try {
  prepareConnection(connection);
  connection.exec(schema);
  const db = new DatabaseContext(connection);
  applicationSeed(db);
  const pass = bundledContentDigestPassV1(db);

  if (process.argv.includes('--print')) {
    const entries = pass.aggregates.map((aggregate) => ({
      kind: aggregate.kind,
      contentKey: aggregate.contentKey,
      name: pass.names.get(`${aggregate.kind}\u0000${aggregate.contentKey}`) ??
        aggregate.contentKey,
      digest: sha256(canonicalContentIdentityJson(aggregate)),
    }));
    process.stdout.write(`${JSON.stringify({
      digest: pass.digest,
      entries,
    }, null, 2)}\n`);
  } else if (
    pass.digest !== EXPECTED_BUNDLED_CONTENT_DIGEST_V1 ||
    pass.aggregates.length !== EXPECTED_BUNDLED_AGGREGATE_DIGESTS_V1.length
  ) {
    const mismatches = bundledContentDigestMismatchesV1(pass);
    const named = mismatches.slice(0, 5).map((entry) =>
      `${entry.kind} '${entry.name}' (${entry.contentKey}, ${entry.reason})`
    ).join('; ');
    throw new Error(
      `Bundled content digest is stale: expected ` +
        `${EXPECTED_BUNDLED_CONTENT_DIGEST_V1}, got ${pass.digest}; ` +
        `${String(pass.aggregates.length)} aggregates. ` +
        `${named === '' ? '' : `Changed: ${named}. `}` +
        'Run `npx vite-node scripts/verify-bundled-content-digest.ts --print`, ' +
        'review the changed seed aggregates, and update the pinned artifact.',
    );
  } else {
    process.stdout.write(
      `bundled digest clean: ${String(pass.aggregates.length)} aggregates, ` +
        `${pass.digest}\n`,
    );
  }
} finally {
  connection.close();
}
