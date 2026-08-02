import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { RepositoryPath } from '../../../../src/party/storage/contracts';
import { parseRepositoryPath } from '../../../../src/party/storage/repository-path';
import type { RecordedForgeFixture, RecordedForgeRequest } from '../types';

type FixtureEvidence = 'CAPTURED' | 'SYNTHETIC';
type FixtureAuthentication = 'authenticated' | 'anonymous' | 'invalid-credential';

export interface GitHubFixtureProvenance {
  readonly endpoint: string;
  readonly documentedSource: string;
  readonly readOn: '2026-08-02';
  readonly evidence: FixtureEvidence;
  readonly sourceFile: string;
  readonly authentication: FixtureAuthentication;
  readonly sanitizedFields: readonly string[];
}

export type GitHubRecordedFixture = RecordedForgeFixture & {
  readonly provenance: GitHubFixtureProvenance;
};

export const githubFixtureRepository = 'example-owner/party-fixture';
export const githubPrivateFixtureRepository =
  'example-owner/party-fixture-private';
export const githubInitialRevision =
  'd51252ae37ba29aba71b96d0ad3c3f5caa9cf920';
export const githubChangedRevision =
  '2f3ed4d1463b6ef8faadbbd4ec479ed0606cdb15';
export const githubLargeRevision =
  'ea3091772e94a4e4390a5372b3e898fc85e23a7a';
export const githubInitialBase64 =
  'ewogICJzY2hlbWEiOiAic3JkNTUtbGlicmFyeS12MSIsCiAgImtpbmQiOiAic3BlY2llcyIsCiAgIm5hbWUiOiAiTHVtaW5hcmkiLAogICJzcGVlZCI6IDMwLAogICJzaXplIjogIk1lZGl1bSIKfQ==';
export const githubChangedBase64 =
  'ewogICJzY2hlbWEiOiAic3JkNTUtbGlicmFyeS12MSIsCiAgImtpbmQiOiAic3BlY2llcyIsCiAgIm5hbWUiOiAiTHVtaW5hcmkiLAogICJzcGVlZCI6IDM1LAogICJzaXplIjogIk1lZGl1bSIKfQ==';

function checkedPath(value: string): RepositoryPath {
  const parsed = parseRepositoryPath(value);
  if (parsed.kind === 'invalid-path') {
    throw new Error(`Invalid GitHub fixture repository path: ${value}`);
  }
  return parsed.path;
}

export const githubLibraryPath = checkedPath('library/party-library.json');
export const githubMissingPath = checkedPath('library/missing--pub-404.json');
export const githubCharacterPath = checkedPath(
  'characters/aelfric-the-bold--pub-0002.json',
);
export const githubLargeCharacterPath = checkedPath(
  'characters/tharn-ironword--pub-0001.json',
);
export const githubLibraryRoot = checkedPath('library/');

const API_HEADERS = {
  accept: 'application/vnd.github+json',
  'x-github-api-version': '2022-11-28',
} as const;

function repositoryUrl(repository = githubFixtureRepository): string {
  return `https://api.github.com/repos/${repository}`;
}

function contentsUrl(
  path: RepositoryPath,
  repository = githubFixtureRepository,
): string {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return `${repositoryUrl(repository)}/contents/${encoded}?ref=main`;
}

function request(
  method: 'GET' | 'PUT' | 'DELETE',
  url: string,
  authentication: FixtureAuthentication,
  body: string | null = null,
): RecordedForgeRequest {
  return {
    method,
    url,
    body,
    // Credentials are capabilities applied by the adapter boundary. Frozen
    // fixture data records auth state, never a credential value.
    headers: body === null
      ? API_HEADERS
      : { ...API_HEADERS, 'content-type': 'application/json' },
    absentHeaders: authentication === 'anonymous' ? ['authorization'] : [],
  };
}

const libraryCreateBody = JSON.stringify({
  message: 'Publish party library document',
  content: githubInitialBase64,
  branch: 'main',
});
const libraryIdenticalBody = JSON.stringify({
  message: 'Publish party library document',
  content: githubInitialBase64,
  branch: 'main',
  sha: githubInitialRevision,
});
const libraryUpdateBody = JSON.stringify({
  message: 'Publish party library document',
  content: githubChangedBase64,
  branch: 'main',
  sha: githubInitialRevision,
});
const characterCreateBody = JSON.stringify({
  message: 'Publish party character document',
  content: githubInitialBase64,
  branch: 'main',
});
const characterDeleteBody = JSON.stringify({
  message: 'Publish party character document',
  sha: githubInitialRevision,
  branch: 'main',
});
const libraryDeleteBody = JSON.stringify({
  message: 'Publish party library document',
  sha: githubInitialRevision,
  branch: 'main',
});

export const capturedGitHubFixtureNames = [
  'get-repository',
  'put-create',
  'get-file',
  'put-identical',
  'put-update',
  'put-conflict',
  'list-directory',
  'get-not-found',
  'put-unicode',
  'delete-success',
  'delete-conflict',
  'anonymous-read',
  'anonymous-private-not-found',
  'large-roundtrip',
  'bad-token-401',
] as const;

export type CapturedGitHubFixtureName =
  (typeof capturedGitHubFixtureNames)[number];

const capturedRequests: Readonly<Record<
  CapturedGitHubFixtureName,
  RecordedForgeRequest
>> = {
  'get-repository': request(
    'GET',
    repositoryUrl(),
    'authenticated',
  ),
  'put-create': request(
    'PUT',
    contentsUrl(githubLibraryPath),
    'authenticated',
    libraryCreateBody,
  ),
  'get-file': request(
    'GET',
    contentsUrl(githubLibraryPath),
    'authenticated',
  ),
  'put-identical': request(
    'PUT',
    contentsUrl(githubLibraryPath),
    'authenticated',
    libraryIdenticalBody,
  ),
  'put-update': request(
    'PUT',
    contentsUrl(githubLibraryPath),
    'authenticated',
    libraryUpdateBody,
  ),
  'put-conflict': request(
    'PUT',
    contentsUrl(githubLibraryPath),
    'authenticated',
    libraryUpdateBody,
  ),
  'list-directory': request(
    'GET',
    contentsUrl(githubLibraryRoot),
    'authenticated',
  ),
  'get-not-found': request(
    'GET',
    contentsUrl(githubMissingPath),
    'authenticated',
  ),
  'put-unicode': request(
    'PUT',
    contentsUrl(githubCharacterPath),
    'authenticated',
    characterCreateBody,
  ),
  'delete-success': request(
    'DELETE',
    contentsUrl(githubCharacterPath),
    'authenticated',
    characterDeleteBody,
  ),
  'delete-conflict': request(
    'DELETE',
    contentsUrl(githubLibraryPath),
    'authenticated',
    libraryDeleteBody,
  ),
  'anonymous-read': request(
    'GET',
    contentsUrl(githubLibraryPath),
    'anonymous',
  ),
  'anonymous-private-not-found': request(
    'GET',
    contentsUrl(githubLibraryPath, githubPrivateFixtureRepository),
    'anonymous',
  ),
  'large-roundtrip': request(
    'GET',
    contentsUrl(githubLargeCharacterPath),
    'authenticated',
  ),
  'bad-token-401': request(
    'GET',
    contentsUrl(githubLibraryPath),
    'invalid-credential',
  ),
};

export const syntheticGitHubFixtureNames = [
  'synthetic-rate-limited',
  'synthetic-forbidden',
  'synthetic-too-large',
  'synthetic-write-null',
  'synthetic-invalid-list-path',
] as const;

export type SyntheticGitHubFixtureName =
  (typeof syntheticGitHubFixtureNames)[number];

function sequentialBytesBase64(): string {
  const bytes = new Uint8Array(257);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = index;
  return btoa(String.fromCharCode(...bytes));
}

const syntheticRequests: Readonly<Record<
  SyntheticGitHubFixtureName,
  RecordedForgeRequest
>> = {
  'synthetic-rate-limited': request(
    'GET',
    contentsUrl(githubLibraryRoot),
    'authenticated',
  ),
  'synthetic-forbidden': request(
    'GET',
    contentsUrl(githubLibraryPath),
    'authenticated',
  ),
  'synthetic-too-large': request(
    'PUT',
    contentsUrl(githubCharacterPath),
    'authenticated',
    JSON.stringify({
      message: 'Publish party character document',
      content: sequentialBytesBase64(),
      branch: 'main',
    }),
  ),
  'synthetic-write-null': request(
    'PUT',
    contentsUrl(githubLibraryPath),
    'authenticated',
    JSON.stringify({
      message: 'Publish party library document',
      content: 'e30K',
      branch: 'main',
    }),
  ),
  'synthetic-invalid-list-path': request(
    'GET',
    contentsUrl(githubLibraryRoot),
    'authenticated',
  ),
};

type ParsedFixtureFile = {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
  readonly provenance: Omit<GitHubFixtureProvenance, 'authentication'>;
};

function commentValue(prelude: readonly string[], label: string): string | null {
  const prefix = `# ${label}: `;
  return prelude.find((line) => line.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function parseFixtureFile(name: string): ParsedFixtureFile {
  const source = readFileSync(
    fileURLToPath(new URL(`./${name}.http`, import.meta.url)),
    'utf8',
  ).replace(/\r\n/gu, '\n');
  const separator = source.indexOf('\n\n');
  if (separator < 0) throw new Error(`GitHub fixture ${name} has no body separator`);
  const prelude = source.slice(0, separator).split('\n');
  const endpoint = commentValue(prelude, 'Endpoint');
  const documentedSource = commentValue(prelude, 'Documented source');
  const sourceFile = commentValue(prelude, 'Source file');
  const evidence = commentValue(prelude, 'Evidence');
  const sanitized = commentValue(prelude, 'Sanitized fields');
  const statusLineIndex = prelude.findIndex((line) => line.startsWith('HTTP/'));
  const statusText = statusLineIndex < 0 ? null : prelude[statusLineIndex] ?? null;
  const statusMatch = statusText === null ? null : /^HTTP\/\S+\s+(\d{3})/u.exec(statusText);
  if (
    endpoint === null ||
    documentedSource === null ||
    sourceFile === null ||
    (evidence !== 'CAPTURED' && evidence !== 'SYNTHETIC') ||
    sanitized === null ||
    statusMatch?.[1] === undefined
  ) {
    throw new Error(`GitHub fixture ${name} has incomplete provenance/status`);
  }

  const headers: Record<string, string> = {};
  for (const line of prelude.slice(statusLineIndex + 1)) {
    const colon = line.indexOf(':');
    if (colon <= 0) throw new Error(`GitHub fixture ${name} has malformed header`);
    headers[line.slice(0, colon)] = line.slice(colon + 1).trimStart();
  }
  return {
    status: Number(statusMatch[1]),
    headers,
    body: source.slice(separator + 2).trimEnd(),
    provenance: {
      endpoint,
      documentedSource,
      readOn: '2026-08-02',
      evidence,
      sourceFile,
      sanitizedFields: sanitized === 'none' ? [] : sanitized.split('; '),
    },
  };
}

function authenticationFor(request: RecordedForgeRequest): FixtureAuthentication {
  return request.absentHeaders.includes('authorization')
    ? 'anonymous'
    : 'authenticated';
}

function fixtureFromFile(
  name: string,
  expectedEvidence: FixtureEvidence,
  fixtureRequest: RecordedForgeRequest,
  authentication: FixtureAuthentication,
): GitHubRecordedFixture {
  if ('authorization' in fixtureRequest.headers) {
    throw new Error(`GitHub fixture ${name} embeds an authorization credential`);
  }
  const parsed = parseFixtureFile(name);
  if (parsed.provenance.evidence !== expectedEvidence) {
    throw new Error(`GitHub fixture ${name} has the wrong evidence classification`);
  }
  return {
    name: `GitHub ${name}`,
    provenance: { ...parsed.provenance, authentication },
    request: fixtureRequest,
    response: {
      kind: 'response',
      status: parsed.status,
      headers: parsed.headers,
      body: parsed.body,
    },
  };
}

export function githubCapturedFixture(
  name: CapturedGitHubFixtureName,
): GitHubRecordedFixture {
  const fixtureRequest = capturedRequests[name];
  const authentication = name === 'bad-token-401'
    ? 'invalid-credential'
    : authenticationFor(fixtureRequest);
  return fixtureFromFile(name, 'CAPTURED', fixtureRequest, authentication);
}

export function githubSyntheticFixture(
  name: SyntheticGitHubFixtureName,
): GitHubRecordedFixture {
  const fixtureRequest = syntheticRequests[name];
  return fixtureFromFile(
    name,
    'SYNTHETIC',
    fixtureRequest,
    authenticationFor(fixtureRequest),
  );
}

export function githubNetworkFixture(): GitHubRecordedFixture {
  const fixtureRequest = request(
    'GET',
    contentsUrl(githubMissingPath),
    'authenticated',
  );
  return {
    name: 'GitHub synthetic-network-failure',
    provenance: {
      endpoint: 'GET /repos/{owner}/{repo}/contents/{path}',
      documentedSource: 'https://developer.mozilla.org/docs/Web/API/Window/fetch',
      readOn: '2026-08-02',
      evidence: 'SYNTHETIC',
      sourceFile: 'none (synthetic transport failure)',
      authentication: 'authenticated',
      sanitizedFields: [],
    },
    request: fixtureRequest,
    response: { kind: 'network-error', message: 'fixture transport offline' },
  };
}
