import type {
  CredentialLease,
  CredentialState,
  Forge,
  RepositoryConfig,
} from './storage/contracts';
import { element, listen, type Cleanup } from '../ui/dom';

const STORAGE_PREFIX = 'srd55:party-credential:v1';

export interface PartyCredentialStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface CredentialHeaderFormat {
  /** Supplied by the fixture-pinned adapter; P2 does not infer forge dialects. */
  readonly name: string;
  readonly prefix: string;
}

export type PartyCredentialVaultState =
  | { readonly kind: 'anonymous' }
  | { readonly kind: 'authenticated' }
  | { readonly kind: 'vault-unavailable' };

export type PartyCredentialSaveResult =
  | { readonly kind: 'saved' }
  | { readonly kind: 'empty-token' }
  | { readonly kind: 'vault-unavailable' };

export type PartyCredentialForgetResult =
  | { readonly kind: 'forgotten' }
  | { readonly kind: 'vault-unavailable' };

export type PartyCredentialLeaseResult =
  | {
      readonly kind: 'available';
      readonly state: 'anonymous' | 'authenticated';
      readonly lease: CredentialLease;
    }
  | { readonly kind: 'vault-unavailable' };

export type CredentialRejectionSignal =
  | { readonly kind: 'explicit-expiry' }
  | { readonly kind: 'explicit-revocation' }
  | { readonly kind: 'insufficient-scope' }
  | { readonly kind: 'undifferentiated' };

export interface ForgetTokenControl {
  readonly element: HTMLElement;
  readonly cleanup: Cleanup;
}

export class PartyCredentialLeaseInvalidatedError extends Error {
  constructor() {
    super('This party credential lease is no longer valid.');
    this.name = 'PartyCredentialLeaseInvalidatedError';
  }
}

/**
 * Generation numbers contain no credential material. Sharing them by storage
 * object makes Forget invalidate leases issued by an earlier screen mount.
 */
const storageGenerations = new WeakMap<
  PartyCredentialStorage,
  Map<string, number>
>();

function credentialKey(
  config: Pick<RepositoryConfig, 'forge' | 'repository'>,
): string {
  return [
    STORAGE_PREFIX,
    encodeURIComponent(config.forge),
    encodeURIComponent(config.repository),
  ].join(':');
}

function generations(storage: PartyCredentialStorage): Map<string, number> {
  const existing = storageGenerations.get(storage);
  if (existing !== undefined) return existing;
  const created = new Map<string, number>();
  storageGenerations.set(storage, created);
  return created;
}

function generation(storage: PartyCredentialStorage, key: string): number {
  return generations(storage).get(key) ?? 0;
}

function invalidate(storage: PartyCredentialStorage, key: string): void {
  generations(storage).set(key, generation(storage, key) + 1);
}

/** The real vault accessor. D146 permits sessionStorage and no fallback. */
export function partySessionStorage(): PartyCredentialStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function anonymousLease(): CredentialLease {
  return Object.freeze({
    kind: 'anonymous' as const,
    applyAuthorization(request: Request): Request {
      return request;
    },
  });
}

export class PartyCredentialVault {
  constructor(private readonly storage: PartyCredentialStorage | null) {}

  status(
    config: Pick<RepositoryConfig, 'forge' | 'repository'>,
  ): PartyCredentialVaultState {
    if (this.storage === null) return { kind: 'vault-unavailable' };
    try {
      const stored = this.storage.getItem(credentialKey(config));
      return stored === null || stored.trim().length === 0
        ? { kind: 'anonymous' }
        : { kind: 'authenticated' };
    } catch {
      return { kind: 'vault-unavailable' };
    }
  }

  save(
    config: Pick<RepositoryConfig, 'forge' | 'repository'>,
    pastedToken: string,
  ): PartyCredentialSaveResult {
    if (this.storage === null) return { kind: 'vault-unavailable' };
    const token = pastedToken.trim();
    if (token.length === 0) return { kind: 'empty-token' };
    const key = credentialKey(config);
    try {
      this.storage.setItem(key, token);
      invalidate(this.storage, key);
      return { kind: 'saved' };
    } catch {
      return { kind: 'vault-unavailable' };
    }
  }

  forget(
    config: Pick<RepositoryConfig, 'forge' | 'repository'>,
  ): PartyCredentialForgetResult {
    if (this.storage === null) return { kind: 'vault-unavailable' };
    const key = credentialKey(config);
    invalidate(this.storage, key);
    try {
      this.storage.removeItem(key);
      return { kind: 'forgotten' };
    } catch {
      return { kind: 'vault-unavailable' };
    }
  }

  lease(
    config: Pick<RepositoryConfig, 'forge' | 'repository'>,
    header: CredentialHeaderFormat,
  ): PartyCredentialLeaseResult {
    if (this.storage === null) return { kind: 'vault-unavailable' };
    const key = credentialKey(config);
    let storedToken: string | null;
    try {
      storedToken = this.storage.getItem(key);
    } catch {
      return { kind: 'vault-unavailable' };
    }
    if (storedToken === null || storedToken.trim().length === 0) {
      return {
        kind: 'available',
        state: 'anonymous',
        lease: anonymousLease(),
      };
    }

    const token = storedToken.trim();
    const issuedAtGeneration = generation(this.storage, key);
    const storage = this.storage;
    const lease: CredentialLease = Object.freeze({
      kind: 'authenticated' as const,
      applyAuthorization(request: Request): Request {
        let currentToken: string | null;
        try {
          currentToken = storage.getItem(key);
        } catch {
          throw new PartyCredentialLeaseInvalidatedError();
        }
        if (
          generation(storage, key) !== issuedAtGeneration ||
          currentToken !== storedToken
        ) {
          throw new PartyCredentialLeaseInvalidatedError();
        }
        const headers = new Headers(request.headers);
        headers.set(header.name, `${header.prefix}${token}`);
        return new Request(request, { headers });
      },
    });
    return { kind: 'available', state: 'authenticated', lease };
  }
}

export function classifyCredentialRejection(
  signal: CredentialRejectionSignal,
): CredentialState {
  switch (signal.kind) {
    case 'explicit-expiry':
      return 'expired';
    case 'explicit-revocation':
      return 'revoked';
    case 'insufficient-scope':
      return 'insufficient-scope';
    case 'undifferentiated':
      return 'invalid-expired-or-revoked';
  }
}

export function credentialStateGuidance(state: CredentialState): string {
  switch (state) {
    case 'missing':
      return 'No token is saved. Continue read-only or paste a token.';
    case 'expired':
      return 'The token has expired. Paste a current token or continue read-only if this repository is public.';
    case 'revoked':
      return 'The token was revoked. Paste a current token or continue read-only if this repository is public.';
    case 'invalid-expired-or-revoked':
      return 'The token is invalid, expired, or revoked. Paste a current token or continue read-only if this repository is public.';
    case 'insufficient-scope':
      return 'The token lacks permission for this action. Paste a token with the narrow required repository scope or continue read-only.';
  }
}

export function requestWithCredential(
  fetchImplementation: typeof fetch,
  lease: CredentialLease,
  request: Request,
): Promise<Response> {
  return fetchImplementation(lease.applyAuthorization(request));
}

export function createForgetTokenControl(
  config: Pick<RepositoryConfig, 'forge' | 'repository'>,
  vault: PartyCredentialVault,
): ForgetTokenControl {
  const status = element('p', {
    className: 'party-credential-status',
    attributes: { role: 'status', 'aria-live': 'polite' },
  });
  const forget = element('button', {
    className: 'party-forget-token',
    text: 'Forget token',
    attributes: {
      type: 'button',
      'aria-label': 'Forget party token',
    },
  });
  const root = element(
    'section',
    {
      className: 'party-credential-control',
      attributes: { 'aria-label': 'Party credential' },
    },
    [
      element('p', {
        text: `${forgeLabel(config.forge)} · ${config.repository}`,
      }),
      forget,
      status,
    ],
  );
  const cleanup = listen(forget, 'click', () => {
    const result = vault.forget(config);
    if (result.kind === 'forgotten') {
      status.textContent = 'Token forgotten. Connection is anonymous.';
      return;
    }
    status.setAttribute('role', 'alert');
    status.textContent = 'The session credential vault is unavailable.';
  });
  return { element: root, cleanup };
}

function forgeLabel(forge: Forge): string {
  switch (forge) {
    case 'github':
      return 'github';
    case 'gitlab':
      return 'gitlab';
    case 'codeberg':
      return 'codeberg';
  }
}
