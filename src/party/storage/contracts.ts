import type { Brand } from '../../domain/ids';

export type Forge = 'github' | 'gitlab' | 'codeberg';
export type RepositoryRevision = Brand<string, 'RepositoryRevision'>;
export type RepositoryPath = Brand<string, 'RepositoryPath'>;
export type PartyPublicationId = Brand<string, 'PartyPublicationId'>;

/**
 * A normalized repository locator. The default branch is deliberately absent
 * until a forge metadata response establishes it; callers must never guess
 * `main`, `master`, or a branch pasted by a user.
 */
export interface RepositoryConfig {
  readonly forge: Forge;
  readonly repository: string;
  readonly defaultBranch: string | null;
}

export interface StoredObjectSummary {
  readonly path: RepositoryPath;
  readonly revision: RepositoryRevision | null;
  readonly byteLength: number | null;
}

export interface StoredObject {
  readonly path: RepositoryPath;
  readonly bytes: Uint8Array;
  readonly revision: RepositoryRevision;
}

export type WriteCondition =
  | { readonly kind: 'create-only' }
  | { readonly kind: 'replace'; readonly expected: RepositoryRevision };

export interface WriteReceipt {
  readonly revision: RepositoryRevision | null;
}

export type CredentialState =
  | 'missing'
  | 'expired'
  | 'revoked'
  | 'invalid-expired-or-revoked'
  | 'insufficient-scope';

export type StorageResult<T> =
  | { readonly kind: 'success'; readonly value: T }
  | {
      readonly kind: 'not-found';
      readonly at: 'repository' | 'object' | 'unknown';
    }
  | {
      readonly kind: 'conflict';
      readonly expected: RepositoryRevision | null;
      readonly actual: RepositoryRevision | null;
    }
  | {
      readonly kind: 'unauthorized';
      readonly credentialState: CredentialState;
    }
  | { readonly kind: 'rate-limited'; readonly retryAt: string | null }
  | {
      readonly kind: 'network-failed';
      readonly writeState: 'not-sent' | 'unknown' | 'not-applicable';
    }
  | {
      readonly kind: 'too-large';
      readonly observedBytes: number | null;
      readonly limitBytes: number | null;
    };

export interface PartyStorage {
  list(
    prefix: RepositoryPath,
  ): Promise<StorageResult<readonly StoredObjectSummary[]>>;
  read(path: RepositoryPath): Promise<StorageResult<StoredObject>>;
  write(
    path: RepositoryPath,
    bytes: Uint8Array,
    condition: WriteCondition,
  ): Promise<StorageResult<WriteReceipt>>;
  delete(
    path: RepositoryPath,
    expected: RepositoryRevision,
  ): Promise<StorageResult<{ readonly deleted: true }>>;
}

type ApplyAuthorization = (request: Request) => Request;

/**
 * A short-lived capability rather than a token value. Functions cannot be
 * structured-cloned, and neither arm exposes credential text or JSON output.
 */
export type CredentialLease =
  | {
      readonly kind: 'anonymous';
      readonly applyAuthorization: ApplyAuthorization;
    }
  | {
      readonly kind: 'authenticated';
      readonly applyAuthorization: ApplyAuthorization;
    };
