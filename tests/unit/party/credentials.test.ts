import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RepositoryConfig } from '../../../src/party/storage/contracts';
import {
  PartyCredentialLeaseInvalidatedError,
  PartyCredentialVault,
  classifyCredentialRejection,
  createForgetTokenControl,
  credentialStateGuidance,
  partySessionStorage,
  requestWithCredential,
  type PartyCredentialStorage,
} from '../../../src/party/credentials';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';

const SENTINEL = 'PARTY_CREDENTIAL_SENTINEL_7c0d5a';
const config: RepositoryConfig = {
  forge: 'github',
  repository: 'example-owner/party-fixture',
  defaultBranch: 'main',
};
const githubHeader = {
  name: 'authorization',
  prefix: 'Bearer ',
} as const;

class MemoryStorage implements PartyCredentialStorage {
  readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

let restoreDocument: (() => void) | undefined;
let windowDescriptor: PropertyDescriptor | undefined;

beforeEach(() => {
  restoreDocument = installInteractiveDocument();
  windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
});

afterEach(() => {
  restoreDocument?.();
  restoreDocument = undefined;
  if (windowDescriptor === undefined) {
    Reflect.deleteProperty(globalThis, 'window');
  } else {
    Object.defineProperty(globalThis, 'window', windowDescriptor);
  }
  vi.restoreAllMocks();
});

function authenticatedLease(vault: PartyCredentialVault) {
  const result = vault.lease(config, githubHeader);
  expect(result.kind).toBe('available');
  if (result.kind !== 'available') {
    throw new Error('Expected the credential lease to be available');
  }
  expect(result.state).toBe('authenticated');
  return result.lease;
}

describe('PartyCredentialVault', () => {
  it('PARTY-SESSION-NOT-DURABLE uses only window.sessionStorage', () => {
    const sessionStorage = new MemoryStorage();
    const localStorage = new MemoryStorage();
    const localGetter = vi.fn(() => localStorage);
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: Object.create(null, {
        sessionStorage: { get: () => sessionStorage },
        localStorage: { get: localGetter },
      }),
    });

    expect(partySessionStorage()).toBe(sessionStorage);
    expect(localGetter).not.toHaveBeenCalled();
  });

  it('names an unavailable session vault instead of falling back', () => {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: Object.create(null, {
        sessionStorage: {
          get: () => {
            throw new Error('blocked');
          },
        },
      }),
    });

    expect(partySessionStorage()).toBeNull();
    expect(new PartyCredentialVault(null).status(config)).toEqual({
      kind: 'vault-unavailable',
    });
  });

  it('PARTY-VAULT-SURVIVES-REMOUNT reloads the credential from the same session store', () => {
    const storage = new MemoryStorage();
    const first = new PartyCredentialVault(storage);

    expect(first.save(config, `  ${SENTINEL}\n`)).toEqual({ kind: 'saved' });
    expect(first.status(config)).toEqual({ kind: 'authenticated' });

    const remounted = new PartyCredentialVault(storage);
    const request = authenticatedLease(remounted).applyAuthorization(
      new Request('https://api.github.com/repos/example-owner/party-fixture'),
    );
    expect(request.headers.get('authorization')).toBe(`Bearer ${SENTINEL}`);
  });

  it('PARTY-ANONYMOUS-NO-HEADER represents absence without an empty authorization header', () => {
    const storage = new MemoryStorage();
    const vault = new PartyCredentialVault(storage);
    const result = vault.lease(config, githubHeader);
    expect(result.kind).toBe('available');
    if (result.kind !== 'available') return;

    expect(result.state).toBe('anonymous');
    expect(result.lease.kind).toBe('anonymous');
    const request = result.lease.applyAuthorization(
      new Request('https://api.github.com/repos/example-owner/party-fixture'),
    );
    expect(request.headers.has('authorization')).toBe(false);
    const headers: [string, string][] = [];
    request.headers.forEach((value, name) => headers.push([name, value]));
    expect(headers).toEqual([]);

    expect(vault.save(config, SENTINEL)).toEqual({ kind: 'saved' });
    const storedKey = [...storage.values.keys()][0];
    expect(storedKey).toBeDefined();
    if (storedKey === undefined) return;
    storage.values.set(storedKey, '');
    const emptyStoredToken = vault.lease(config, githubHeader);
    expect(emptyStoredToken.kind).toBe('available');
    if (emptyStoredToken.kind === 'available') {
      const emptyRequest = emptyStoredToken.lease.applyAuthorization(
        new Request('https://api.github.com/repos/example-owner/party-fixture'),
      );
      expect(emptyStoredToken.state).toBe('anonymous');
      expect(emptyRequest.headers.has('authorization')).toBe(false);
    }
  });

  it('PARTY-LEASE-NOT-SERIALIZABLE never serializes the captured secret', () => {
    const vault = new PartyCredentialVault(new MemoryStorage());
    expect(vault.save(config, SENTINEL)).toEqual({ kind: 'saved' });
    const lease = authenticatedLease(vault);

    expect(JSON.stringify(lease)).toBe('{"kind":"authenticated"}');
    expect(JSON.stringify(lease)).not.toContain(SENTINEL);
    expect(Object.keys(lease)).toEqual(['kind', 'applyAuthorization']);
  });

  it('PARTY-FORGET-TOKEN removes storage and invalidates every previously issued lease', () => {
    const storage = new MemoryStorage();
    const firstMount = new PartyCredentialVault(storage);
    expect(firstMount.save(config, SENTINEL)).toEqual({ kind: 'saved' });
    const lease = authenticatedLease(firstMount);

    const secondMount = new PartyCredentialVault(storage);
    expect(secondMount.forget(config)).toEqual({ kind: 'forgotten' });
    expect(storage.values.size).toBe(0);
    expect(secondMount.status(config)).toEqual({ kind: 'anonymous' });
    expect(() =>
      lease.applyAuthorization(
        new Request('https://api.github.com/repos/example-owner/party-fixture'),
      ),
    ).toThrow(PartyCredentialLeaseInvalidatedError);

    const anonymous = secondMount.lease(config, githubHeader);
    expect(anonymous.kind).toBe('available');
    if (anonymous.kind === 'available') {
      expect(anonymous.state).toBe('anonymous');
      expect(anonymous.lease.kind).toBe('anonymous');
    }
  });

  it('keeps one credential per forge and repository with no ref or path component', () => {
    const storage = new MemoryStorage();
    const vault = new PartyCredentialVault(storage);
    expect(vault.save(config, SENTINEL)).toEqual({ kind: 'saved' });
    const renamedDefaultBranch: RepositoryConfig = {
      ...config,
      defaultBranch: 'renamed-default-branch',
    };
    expect(vault.status(renamedDefaultBranch)).toEqual({
      kind: 'authenticated',
    });
    expect(storage.values.size).toBe(1);
    expect([...storage.values.keys()][0]).not.toContain('main');
    expect([...storage.values.keys()][0]).not.toContain('library');
    expect([...storage.values.keys()][0]).not.toContain('characters');
  });
});

describe('party credential rejection honesty', () => {
  it('PARTY-CREDENTIAL-STATE classifies only explicit signals and keeps the fallback honest', () => {
    expect(classifyCredentialRejection({ kind: 'explicit-expiry' })).toBe(
      'expired',
    );
    expect(classifyCredentialRejection({ kind: 'explicit-revocation' })).toBe(
      'revoked',
    );
    expect(classifyCredentialRejection({ kind: 'insufficient-scope' })).toBe(
      'insufficient-scope',
    );
    expect(classifyCredentialRejection({ kind: 'undifferentiated' })).toBe(
      'invalid-expired-or-revoked',
    );

    expect([
      credentialStateGuidance('missing'),
      credentialStateGuidance('expired'),
      credentialStateGuidance('revoked'),
      credentialStateGuidance('invalid-expired-or-revoked'),
      credentialStateGuidance('insufficient-scope'),
    ]).toEqual([
      'No token is saved. Continue read-only or paste a token.',
      'The token has expired. Paste a current token or continue read-only if this repository is public.',
      'The token was revoked. Paste a current token or continue read-only if this repository is public.',
      'The token is invalid, expired, or revoked. Paste a current token or continue read-only if this repository is public.',
      'The token lacks permission for this action. Paste a token with the narrow required repository scope or continue read-only.',
    ]);

    const source = readFileSync(
      fileURLToPath(new URL('../../../src/party/credentials.ts', import.meta.url)),
      'utf8',
    );
    const guidance = source.slice(
      source.indexOf('export function credentialStateGuidance'),
      source.indexOf('export function requestWithCredential'),
    );
    expect(guidance).not.toMatch(/\bdefault\s*:/u);
  });

  it('PARTY-CREDENTIAL-STATE keeps classifyCredentialRejection exhaustive without a default arm', () => {
    const source = readFileSync(
      fileURLToPath(new URL('../../../src/party/credentials.ts', import.meta.url)),
      'utf8',
    );
    const classifier = source.slice(
      source.indexOf('export function classifyCredentialRejection'),
      source.indexOf('export function credentialStateGuidance'),
    );

    expect(classifier).not.toMatch(/\bdefault\s*:/u);
  });
});

describe('Forget token control', () => {
  it('PARTY-FORGET-TOKEN is labelled, keyboard-operable, and announces anonymous state', () => {
    const storage = new MemoryStorage();
    const vault = new PartyCredentialVault(storage);
    expect(vault.save(config, SENTINEL)).toEqual({ kind: 'saved' });
    const lease = authenticatedLease(vault);
    const control = createForgetTokenControl(config, vault);
    const view = interactiveElement(control.element);
    const button = view.querySelector('[aria-label="Forget party token"]');
    const status = view.querySelector('[role="status"]');

    expect(control.element.getAttribute('aria-label')).toBe('Party credential');
    expect(elementText(control.element)).toContain(
      'github · example-owner/party-fixture',
    );
    expect(button?.tagName).toBe('button');
    expect(button?.getAttribute('type')).toBe('button');
    expect(status?.getAttribute('aria-live')).toBe('polite');

    button?.focus();
    expect(interactiveElement(document.activeElement!)).toBe(button);
    button?.click();

    expect(elementText(control.element)).toContain(
      'Token forgotten. Connection is anonymous.',
    );
    expect(storage.values.size).toBe(0);
    expect(() =>
      lease.applyAuthorization(new Request('https://api.github.com/')),
    ).toThrow(PartyCredentialLeaseInvalidatedError);
    control.cleanup();
  });
});

describe('credential request redaction', () => {
  it('PARTY-NO-CREDENTIAL-LOGGING propagates failure without logging request, response, or error', async () => {
    const storage = new MemoryStorage();
    const vault = new PartyCredentialVault(storage);
    expect(vault.save(config, SENTINEL)).toEqual({ kind: 'saved' });
    const lease = authenticatedLease(vault);
    const failure = new Error('synthetic transport refusal');
    const fetchImplementation: typeof fetch = vi.fn(() => Promise.reject(failure));
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(
      requestWithCredential(
        fetchImplementation,
        lease,
        new Request('https://api.github.com/repos/example-owner/party-fixture'),
      ),
    ).rejects.toBe(failure);
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
    expect(debug).not.toHaveBeenCalled();
    expect(info).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });
});
