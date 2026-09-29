import { sha256 as nobleSha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

/**
 * Synchronous SHA-256 (lowercase hex of the UTF-8 bytes) for browser-runtime
 * invariants checked before a synchronous database operation can proceed.
 * Browsers have no synchronous native digest, so they use @noble/hashes;
 * Node (tests and tools) uses node:crypto, which is about 5x faster. As in
 * src/db/query-log.ts, process.getBuiltinModule keeps node:crypto out of the
 * bundler's sight.
 */
export function browserSha256(value: string): string {
  return bytesToHex(nobleSha256(utf8ToBytes(value)));
}

const nodeCrypto = typeof process === 'object'
  ? (process.getBuiltinModule('node:crypto') as typeof import('node:crypto'))
  : undefined;

export const sha256: (value: string) => string = nodeCrypto === undefined
  ? browserSha256
  : (value) => nodeCrypto.createHash('sha256').update(value).digest('hex');
