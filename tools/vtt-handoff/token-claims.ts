import { closeSync, constants as fsConstants, fstatSync, lstatSync, openSync, readSync } from 'node:fs';
import { z } from 'zod';
import type { HandoffPrincipal } from '../../src/vtt/handoff/session-authorizer';

const MAX_TOKEN_FILE_BYTES = 65_536;

const tokenClaimSchema = z.strictObject({
  tokenSha256: z.string().regex(/^[0-9a-f]{64}$/u),
  role: z.enum(['dm', 'player']),
  playerId: z.string().min(1).optional(),
}).superRefine((claim, context) => {
  if (claim.role === 'player' && claim.playerId === undefined) {
    context.addIssue({ code: 'custom', message: 'A player token requires playerId.' });
  }
  if (claim.role === 'dm' && claim.playerId !== undefined) {
    context.addIssue({ code: 'custom', message: 'A DM token must omit playerId.' });
  }
});
const tokenClaimsSchema = z.array(tokenClaimSchema).min(1).max(1_024);

export interface TokenClaim {
  readonly tokenSha256: string;
  readonly principal: HandoffPrincipal;
}

export interface TokenFileHooks {
  readonly afterOpenInspection?: () => void;
  readonly afterBoundedRead?: () => void;
}

export function readTokenClaims(path: string, hooks?: TokenFileHooks): readonly TokenClaim[] {
  let descriptor: number;
  try {
    descriptor = openSync(
      path,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK,
    );
  } catch {
    throw new Error('VTT_RUNTIME_TOKENS_FILE must be an openable regular nonsymlink file.');
  }
  try {
    const opened = fstatSync(descriptor);
    if (!opened.isFile()) throw new Error('VTT_RUNTIME_TOKENS_FILE must be a regular nonsymlink file.');
    if ((opened.mode & 0o777) !== 0o600) throw new Error('VTT_RUNTIME_TOKENS_FILE must have mode 0600.');
    if (opened.size > MAX_TOKEN_FILE_BYTES) throw new Error('VTT_RUNTIME_TOKENS_FILE exceeds 65536 bytes.');
    hooks?.afterOpenInspection?.();
    const named = lstatSync(path);
    if (!named.isFile() || named.isSymbolicLink() || named.dev !== opened.dev || named.ino !== opened.ino) {
      throw new Error('VTT_RUNTIME_TOKENS_FILE changed while it was opened.');
    }

    const bytes = Buffer.alloc(MAX_TOKEN_FILE_BYTES + 1);
    let used = 0;
    while (used < bytes.byteLength) {
      const count = readSync(descriptor, bytes, used, bytes.byteLength - used, null);
      if (count === 0) break;
      used += count;
    }
    hooks?.afterBoundedRead?.();
    const after = fstatSync(descriptor);
    const namedAfter = lstatSync(path);
    if (!after.isFile() || after.dev !== opened.dev || after.ino !== opened.ino
      || !namedAfter.isFile() || namedAfter.isSymbolicLink()
      || namedAfter.dev !== opened.dev || namedAfter.ino !== opened.ino) {
      throw new Error('VTT_RUNTIME_TOKENS_FILE changed while it was read.');
    }
    if ((after.mode & 0o777) !== 0o600) throw new Error('VTT_RUNTIME_TOKENS_FILE must have mode 0600.');
    if (used > MAX_TOKEN_FILE_BYTES || after.size > MAX_TOKEN_FILE_BYTES) {
      throw new Error('VTT_RUNTIME_TOKENS_FILE exceeds 65536 bytes.');
    }
    let source: unknown;
    try { source = JSON.parse(bytes.subarray(0, used).toString('utf8')) as unknown; }
    catch { throw new Error('VTT_RUNTIME_TOKENS_FILE is not valid JSON.'); }
    const parsed = tokenClaimsSchema.safeParse(source);
    if (!parsed.success) throw new Error('VTT_RUNTIME_TOKENS_FILE has invalid claims.');
    const seen = new Set<string>();
    return parsed.data.map((claim): TokenClaim => {
      if (seen.has(claim.tokenSha256)) throw new Error('VTT_RUNTIME_TOKENS_FILE contains a duplicate token hash.');
      seen.add(claim.tokenSha256);
      return {
        tokenSha256: claim.tokenSha256,
        principal: claim.role === 'dm'
          ? { role: 'dm' }
          : (() => {
              if (claim.playerId === undefined) throw new Error('A validated player token is missing playerId.');
              return { role: 'player' as const, playerId: claim.playerId };
            })(),
      };
    });
  } finally {
    closeSync(descriptor);
  }
}
