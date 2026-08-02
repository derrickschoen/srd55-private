import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type {
  CredentialLease,
  RepositoryConfig,
  RepositoryPath,
  RepositoryRevision,
} from '../../../src/party/storage/contracts';
import {
  GitHubPartyStorage,
  type GitHubCommitMessage,
} from '../../../src/party/storage/github';
import {
  capturedGitHubFixtureNames,
  githubCapturedFixture,
  githubChangedBase64,
  githubChangedRevision,
  githubCharacterPath,
  githubFixtureRepository,
  githubInitialBase64,
  githubInitialRevision,
  githubLargeCharacterPath,
  githubLargeRevision,
  githubLibraryPath,
  githubLibraryRoot,
  githubMissingPath,
  githubNetworkFixture,
  githubPrivateFixtureRepository,
  githubSyntheticFixture,
  syntheticGitHubFixtureNames,
  type GitHubRecordedFixture,
} from '../../fixtures/party-storage/github/fixtures';
import { createRecordedFixtureFetch } from '../../fixtures/party-storage/mock-fetch';
import { installForgeNetworkGuard } from '../../fixtures/party-storage/network-guard';

installForgeNetworkGuard();

const SENTINEL = 'PARTY_SENTINEL_TOKEN_7f21';
const initialRevision = githubInitialRevision as RepositoryRevision;
const changedRevision = githubChangedRevision as RepositoryRevision;
const largeRevision = githubLargeRevision as RepositoryRevision;

const anonymousLease: CredentialLease = {
  kind: 'anonymous',
  applyAuthorization(request) {
    return request;
  },
};

const authenticatedLease: CredentialLease = {
  kind: 'authenticated',
  applyAuthorization(request) {
    const headers = new Headers(request.headers);
    headers.set('authorization', `Bearer ${SENTINEL}`);
    return new Request(request, { headers });
  },
};

function commitMessage(path: RepositoryPath): GitHubCommitMessage {
  return path.startsWith('library/')
    ? 'Publish party library document'
    : 'Publish party character document';
}

function coherentFixtureFetch(
  fixtures: readonly GitHubRecordedFixture[],
  testName: () => string,
): typeof fetch {
  const authenticationStates = new Set(
    fixtures.map((fixture) => fixture.provenance.authentication),
  );
  if (authenticationStates.size > 1) {
    throw new Error('A fixture replay must use one coherent authentication state');
  }
  const authentication = authenticationStates.values().next().value;
  const replay = createRecordedFixtureFetch(fixtures, testName);

  return async (input, init) => {
    const request = new Request(input, init);
    const hasAuthorization = request.headers.has('authorization');
    const expectsAuthorization = authentication !== undefined
      && authentication !== 'anonymous';
    if (hasAuthorization !== expectsAuthorization) {
      throw new Error(
        `Fixture authentication mismatch: expected ${authentication ?? 'no fixture'}`,
      );
    }
    return replay(request);
  };
}

function storage(
  fixtures: readonly GitHubRecordedFixture[],
  options: {
    readonly credential?: CredentialLease;
    readonly defaultBranch?: string | null;
    readonly fetch?: typeof fetch;
    readonly repository?: string;
    readonly testName?: string;
  } = {},
): GitHubPartyStorage {
  const config: RepositoryConfig = {
    forge: 'github',
    repository: options.repository ?? githubFixtureRepository,
    defaultBranch: options.defaultBranch === undefined
      ? 'main'
      : options.defaultBranch,
  };
  return new GitHubPartyStorage({
    config,
    credential: options.credential ?? authenticatedLease,
    commitMessageForPath: commitMessage,
    fetch: options.fetch ?? coherentFixtureFetch(
      fixtures,
      () => options.testName ?? 'GitHub adapter fixture',
    ),
  });
}

function bytesFromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function responseFromFixture(
  fixture: GitHubRecordedFixture,
): Extract<GitHubRecordedFixture['response'], { readonly kind: 'response' }> {
  const response = fixture.response;
  if (response.kind === 'network-error') {
    throw new Error(`Expected fixture ${fixture.name} to contain an HTTP response`);
  }
  return response;
}

describe('GitHub party storage fixture evidence', () => {
  it('binds every captured response to its named source, coherent request, and disclosed sanitization', () => {
    for (const name of capturedGitHubFixtureNames) {
      const fixture = githubCapturedFixture(name);
      expect(fixture.provenance.evidence).toBe('CAPTURED');
      expect(fixture.provenance.sourceFile).toMatch(/^spike\/\d/u);
      expect(fixture.provenance.endpoint).not.toBe('');
      expect(fixture.provenance.documentedSource).toMatch(
        /^https:\/\/docs\.github\.com\//u,
      );
      expect(fixture.provenance.sanitizedFields.length).toBeGreaterThan(0);
      expect(fixture.request.url).not.toContain('derrickschoen');
      expect(fixture.request.url).not.toContain('/library/species/');
      expect(fixture.request.url).not.toContain('/characters/derrick/');
      expect(Object.keys(fixture.request.headers)).not.toContain('authorization');
      expect(Object.values(fixture.request.headers).join('\n')).not.toContain(SENTINEL);
      expect(fixture.request.body ?? '').not.toContain(SENTINEL);

      const anonymous = fixture.provenance.authentication === 'anonymous';
      expect(fixture.request.absentHeaders.includes('authorization')).toBe(anonymous);
      const response = responseFromFixture(fixture);
      expect(() => JSON.parse(response.body)).not.toThrow();
      expect(response.body).not.toContain('derrickschoen');
      expect(response.body).not.toContain('/library/species/');
      expect(response.body).not.toContain('/characters/derrick/');
      expect(response.body).not.toContain(SENTINEL);
      const rateLimit = response.headers['x-ratelimit-limit']
        ?? response.headers['X-Ratelimit-Limit'];
      if (rateLimit !== undefined) {
        expect(rateLimit).toBe(anonymous ? '60' : '5000');
      }
    }
  });

  it('marks every uncaptured provider edge SYNTHETIC in both header provenance and registry', () => {
    for (const name of syntheticGitHubFixtureNames) {
      const fixture = githubSyntheticFixture(name);
      expect(fixture.provenance).toMatchObject({
        evidence: 'SYNTHETIC',
        sourceFile: expect.stringContaining('synthetic'),
      });
      expect(fixture.request.url).not.toContain('derrickschoen');
      expect(Object.keys(fixture.request.headers)).not.toContain('authorization');
    }
    expect(githubNetworkFixture().provenance.evidence).toBe('SYNTHETIC');
  });

  it('refuses fixture replay when captured auth state and boundary capability disagree', async () => {
    const result = await storage([githubCapturedFixture('get-file')], {
      credential: anonymousLease,
    }).read(githubLibraryPath);

    expect(result).toStrictEqual({
      kind: 'network-failed',
      writeState: 'not-applicable',
    });
  });

  it('pins every header name exposed by the anonymous public-read capture', () => {
    const fixture = githubCapturedFixture('anonymous-read');
    const response = responseFromFixture(fixture);
    expect(Object.keys(response.headers).sort()).toEqual([
      'accept-ranges',
      'access-control-allow-origin',
      'access-control-expose-headers',
      'cache-control',
      'content-length',
      'content-security-policy',
      'content-type',
      'date',
      'etag',
      'last-modified',
      'referrer-policy',
      'server',
      'strict-transport-security',
      'vary',
      'x-content-type-options',
      'x-frame-options',
      'x-github-api-version-selected',
      'x-github-edge-region',
      'x-github-media-type',
      'x-github-request-id',
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-reset',
      'x-ratelimit-resource',
      'x-ratelimit-used',
      'x-xss-protection',
    ]);
  });
});

describe('GitHub party storage captured operations', () => {
  it('resolves and pins the captured repository default branch before listing flat files', async () => {
    const metadata = githubCapturedFixture('get-repository');
    const list = githubCapturedFixture('list-directory');
    const replay = createRecordedFixtureFetch(
      [metadata, list],
      () => 'resolves and pins the captured repository default branch before listing flat files',
    );
    const calls: string[] = [];
    const countedFetch: typeof fetch = async (input, init) => {
      const outgoing = new Request(input, init);
      calls.push(outgoing.url);
      return replay(outgoing);
    };
    const adapter = storage([], {
      defaultBranch: null,
      fetch: countedFetch,
    });

    const expected = {
      kind: 'success',
      value: [{
        path: githubLibraryPath,
        revision: null,
        byteLength: 112,
      }],
      rateObservation: { remaining: 4951, limit: 5000 },
    } as const;
    await expect(adapter.list(githubLibraryRoot)).resolves.toStrictEqual(expected);
    await expect(adapter.list(githubLibraryRoot)).resolves.toStrictEqual(expected);
    expect(calls).toStrictEqual([
      metadata.request.url,
      list.request.url,
      list.request.url,
    ]);
  });

  it('surfaces the anonymous public-read budget and captured CORS evidence', async () => {
    const fixture = githubCapturedFixture('anonymous-read');
    const result = await storage(
      [fixture],
      { credential: anonymousLease },
    ).read(githubLibraryPath);
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') return;
    expect(result.rateObservation).toStrictEqual({ remaining: 59, limit: 60 });
    expect(result.value.revision).toBe(changedRevision);
    const response = responseFromFixture(fixture);
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['access-control-expose-headers']).toContain(
      'X-RateLimit-Remaining',
    );
  });

  it('keeps the captured anonymous private-repository 404 indistinguishable from absence', async () => {
    const fixture = githubCapturedFixture('anonymous-private-not-found');
    await expect(storage([fixture], {
      credential: anonymousLease,
      repository: githubPrivateFixtureRepository,
    }).read(githubLibraryPath)).resolves.toStrictEqual({
      kind: 'not-found',
      at: 'unknown',
    });
  });

  it('maps the captured authenticated missing-file 404 without existence invention', async () => {
    await expect(storage([
      githubCapturedFixture('get-not-found'),
    ]).read(githubMissingPath)).resolves.toStrictEqual({
      kind: 'not-found',
      at: 'unknown',
    });
  });

  it('PARTY-BYTES-EXACT decodes the 20,156-byte capture byte-for-byte', async () => {
    const result = await storage([
      githubCapturedFixture('large-roundtrip'),
    ]).read(githubLargeCharacterPath);
    expect(result.kind).toBe('success');
    if (result.kind !== 'success') return;
    expect(result.value.path).toBe(githubLargeCharacterPath);
    expect(result.value.revision).toBe(largeRevision);
    expect(result.value.bytes).toHaveLength(20_156);
    expect(createHash('sha256').update(result.value.bytes).digest('hex')).toBe(
      'b5438b9eb98f816f45158bf318a5f477349ae47cf2c76fcefa8b094df39e3d58',
    );
    expect(result.value.bytes.at(-2)).toBe(0x0a);
    expect(result.value.bytes.at(-1)).toBe(0x7d);
  });

  it('maps captured create 201 and sends no sha in the create-only body', async () => {
    const fixture = githubCapturedFixture('put-create');
    await expect(storage([fixture]).write(
      githubLibraryPath,
      bytesFromBase64(githubInitialBase64),
      { kind: 'create-only' },
    )).resolves.toStrictEqual({
      kind: 'success',
      value: { revision: initialRevision },
      rateObservation: { remaining: 4980, limit: 5000 },
    });
    expect(JSON.parse(fixture.request.body ?? 'null')).not.toHaveProperty('sha');
  });

  it('treats captured byte-identical 200 with the same blob sha as exact success', async () => {
    const fixture = githubCapturedFixture('put-identical');
    await expect(storage([fixture]).write(
      githubLibraryPath,
      bytesFromBase64(githubInitialBase64),
      { kind: 'replace', expected: initialRevision },
    )).resolves.toStrictEqual({
      kind: 'success',
      value: { revision: initialRevision },
      rateObservation: { remaining: 4979, limit: 5000 },
    });
  });

  it('PARTY-NO-UNCONDITIONAL-WRITE sends the expected sha and maps the changed blob sha', async () => {
    const fixture = githubCapturedFixture('put-update');
    await expect(storage([fixture]).write(
      githubLibraryPath,
      bytesFromBase64(githubChangedBase64),
      { kind: 'replace', expected: initialRevision },
    )).resolves.toStrictEqual({
      kind: 'success',
      value: { revision: changedRevision },
      rateObservation: { remaining: 4977, limit: 5000 },
    });
    expect(JSON.parse(fixture.request.body ?? 'null')).toMatchObject({
      sha: githubInitialRevision,
    });
  });

  it('PARTY-CONFLICT-NO-LWW refuses captured stale PUT without retrying or inventing actual', async () => {
    const conflict = githubCapturedFixture('put-conflict');
    const replay = createRecordedFixtureFetch(
      [conflict],
      () => 'PARTY-CONFLICT-NO-LWW refuses captured stale PUT without retrying or inventing actual',
    );
    const methods: string[] = [];
    const countedFetch: typeof fetch = async (input, init) => {
      const outgoing = new Request(input, init);
      methods.push(outgoing.method);
      return replay(outgoing);
    };
    await expect(storage([], { fetch: countedFetch }).write(
      githubLibraryPath,
      bytesFromBase64(githubChangedBase64),
      { kind: 'replace', expected: initialRevision },
    )).resolves.toStrictEqual({
      kind: 'conflict',
      expected: initialRevision,
      actual: null,
    });
    expect(methods).toStrictEqual(['PUT']);
  });

  it('deletes the captured flat publication path only with its expected sha', async () => {
    await expect(storage([
      githubCapturedFixture('delete-success'),
    ]).delete(githubCharacterPath, initialRevision)).resolves.toStrictEqual({
      kind: 'success',
      value: { deleted: true },
      rateObservation: { remaining: 4973, limit: 5000 },
    });
  });

  it('PARTY-CONFLICT-NO-LWW refuses captured stale DELETE without retrying or inventing actual', async () => {
    const conflict = githubCapturedFixture('delete-conflict');
    const replay = createRecordedFixtureFetch(
      [conflict],
      () => 'PARTY-CONFLICT-NO-LWW refuses captured stale DELETE without retrying or inventing actual',
    );
    const methods: string[] = [];
    const countedFetch: typeof fetch = async (input, init) => {
      const outgoing = new Request(input, init);
      methods.push(outgoing.method);
      return replay(outgoing);
    };
    await expect(storage([], { fetch: countedFetch }).delete(
      githubLibraryPath,
      initialRevision,
    )).resolves.toStrictEqual({
      kind: 'conflict',
      expected: initialRevision,
      actual: null,
    });
    expect(methods).toStrictEqual(['DELETE']);
  });

  it('uses the flat decoded publication path sanitized from the Unicode capture', async () => {
    const fixture = githubCapturedFixture('put-unicode');
    expect(fixture.request.url).toContain(
      '/characters/aelfric-the-bold--pub-0002.json?ref=main',
    );
    expect(fixture.provenance.sanitizedFields.join(' ')).toContain('request path');
    await expect(storage([fixture]).write(
      githubCharacterPath,
      bytesFromBase64(githubInitialBase64),
      { kind: 'create-only' },
    )).resolves.toStrictEqual({
      kind: 'success',
      value: { revision: initialRevision },
      rateObservation: { remaining: 4974, limit: 5000 },
    });
  });
});

describe('GitHub party storage synthetic port edges', () => {
  it('returns a null revision for a SYNTHETIC accepted response with no content object', async () => {
    const fixture = githubSyntheticFixture('synthetic-write-null');
    await expect(storage([fixture]).write(
      githubLibraryPath,
      new Uint8Array([123, 125, 10]),
      { kind: 'create-only' },
    )).resolves.toStrictEqual({ kind: 'success', value: { revision: null } });
    expect(fixture.provenance.evidence).toBe('SYNTHETIC');
  });

  it('maps a SYNTHETIC rate refusal only to the port rate-limited arm', async () => {
    const fixture = githubSyntheticFixture('synthetic-rate-limited');
    await expect(storage([fixture]).list(githubLibraryRoot)).resolves.toStrictEqual({
      kind: 'rate-limited',
      retryAt: null,
    });
    expect(fixture.provenance.evidence).toBe('SYNTHETIC');
  });

  it('maps a SYNTHETIC non-rate 403 only to the port unauthorized arm', async () => {
    const fixture = githubSyntheticFixture('synthetic-forbidden');
    await expect(storage([fixture]).read(githubLibraryPath)).resolves.toStrictEqual({
      kind: 'unauthorized',
      credentialState: 'invalid-expired-or-revoked',
    });
    expect(fixture.provenance.evidence).toBe('SYNTHETIC');
  });

  it('PARTY-NO-TRUNCATION sends every byte before mapping the SYNTHETIC 413 port refusal', async () => {
    const fixture = githubSyntheticFixture('synthetic-too-large');
    const bytes = new Uint8Array(257);
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = index;
    await expect(storage([fixture]).write(
      githubCharacterPath,
      bytes,
      { kind: 'create-only' },
    )).resolves.toStrictEqual({
      kind: 'too-large',
      observedBytes: null,
      limitBytes: null,
    });
    const body: unknown = JSON.parse(fixture.request.body ?? 'null');
    expect(body).toMatchObject({
      content: btoa(String.fromCharCode(...bytes)),
    });
    expect(fixture.provenance.evidence).toBe('SYNTHETIC');
  });

  it('surfaces a SYNTHETIC non-conformant remote list path as a typed network refusal', async () => {
    const fixture = githubSyntheticFixture('synthetic-invalid-list-path');
    await expect(storage([fixture]).list(githubLibraryRoot)).resolves.toStrictEqual({
      kind: 'network-failed',
      writeState: 'not-applicable',
    });
  });

  it('maps a SYNTHETIC transport failure to the exact network-failed arm', async () => {
    await expect(storage([
      githubNetworkFixture(),
    ]).read(githubMissingPath)).resolves.toStrictEqual({
      kind: 'network-failed',
      writeState: 'not-applicable',
    });
  });
});

describe('GitHub party storage credential and network boundary', () => {
  it('PARTY-CREDENTIAL-STATE maps the real bad-token 401 capture honestly', async () => {
    const fixture = githubCapturedFixture('bad-token-401');
    expect(fixture.provenance).toMatchObject({
      evidence: 'CAPTURED',
      sourceFile: 'spike/20-bad-token-401.txt',
      authentication: 'invalid-credential',
    });
    const response = responseFromFixture(fixture);
    expect(JSON.parse(response.body)).toMatchObject({
      message: 'Bad credentials',
    });
    await expect(storage([fixture]).read(githubLibraryPath)).resolves.toStrictEqual({
      kind: 'unauthorized',
      credentialState: 'invalid-expired-or-revoked',
    });
  });

  it('PARTY-TOKEN-NEVER-TRAVELS keeps the credential only in the outgoing authorization header', async () => {
    const fixture = githubCapturedFixture('get-file');
    const replay = createRecordedFixtureFetch(
      [fixture],
      () => 'PARTY-TOKEN-NEVER-TRAVELS keeps the credential only in the outgoing authorization header',
    );
    const captured: Request[] = [];
    const capturingFetch: typeof fetch = async (input, init) => {
      const outgoing = new Request(input, init);
      captured.push(outgoing);
      return replay(outgoing);
    };
    await storage([], { fetch: capturingFetch }).read(githubLibraryPath);
    expect(captured).toHaveLength(1);
    const outgoing = captured[0];
    if (outgoing === undefined) return;
    expect(outgoing.headers.get('authorization')).toBe(`Bearer ${SENTINEL}`);
    expect(outgoing.url).not.toContain(SENTINEL);
    expect(await outgoing.clone().text()).not.toContain(SENTINEL);

    const allFixtures = [
      ...capturedGitHubFixtureNames.map(githubCapturedFixture),
      ...syntheticGitHubFixtureNames.map(githubSyntheticFixture),
      githubNetworkFixture(),
    ];
    for (const registered of allFixtures) {
      expect(Object.keys(registered.request.headers)).not.toContain('authorization');
      expect(Object.values(registered.request.headers).join('\n')).not.toContain(SENTINEL);
      expect(registered.request.body ?? '').not.toContain(SENTINEL);
    }

    const source = readFileSync(
      fileURLToPath(new URL('../../../src/party/storage/github.ts', import.meta.url)),
      'utf8',
    );
    expect(source).not.toMatch(/console\.|Authorization\s*:\s*[`'"]/u);
  });

  it('PARTY-NO-LIVE-NETWORK seals ambient fetch with the GitHub suite guard', async () => {
    const url = 'https://api.github.com/unhandled-github-suite-request';
    await expect(fetch(url)).rejects.toThrow(
      expect.objectContaining({ message: expect.stringContaining(url) }),
    );
  });

  it('requires injected fetch and contains no ambient globalThis.fetch fallback', () => {
    const source = readFileSync(
      fileURLToPath(new URL('../../../src/party/storage/github.ts', import.meta.url)),
      'utf8',
    );
    expect(source).toContain('readonly fetch: typeof fetch');
    expect(source).not.toContain('globalThis.fetch');
    expect(source).not.toMatch(/options\.fetch\s*\?\?/u);
  });

  it('PARTY-FORGE-EXHAUSTIVE has no default arm and narrows unknown response bodies', () => {
    const source = readFileSync(
      fileURLToPath(new URL('../../../src/party/storage/github.ts', import.meta.url)),
      'utf8',
    );
    expect(source).not.toMatch(/\bdefault\s*:/u);
    expect(source).toContain('const value: unknown = JSON.parse');
    expect(source).not.toMatch(/JSON\.parse\([^)]*\)\s+as\s+/u);
  });
});
