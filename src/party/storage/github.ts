import type {
  CredentialLease,
  PartyStorage,
  RateLimitObservation,
  RepositoryConfig,
  RepositoryPath,
  RepositoryRevision,
  StorageResult,
  StoredObject,
  StoredObjectSummary,
  WriteCondition,
  WriteReceipt,
} from './contracts';
import { parseRepositoryPath } from './repository-path';

export type GitHubCommitMessage =
  | 'Publish party character document'
  | 'Publish party library document';

export type GitHubCommitMessageForPath = (
  path: RepositoryPath,
) => GitHubCommitMessage;

export interface GitHubPartyStorageOptions {
  readonly config: RepositoryConfig;
  readonly credential: CredentialLease;
  readonly commitMessageForPath: GitHubCommitMessageForPath;
  readonly fetch: typeof fetch;
}

const API_ORIGIN = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const ACCEPT = 'application/vnd.github+json';
const BASE64_CHUNK_SIZE = 0x8000;

type ResponseResult =
  | { readonly kind: 'response'; readonly response: Response }
  | {
      readonly kind: 'network-failed';
      readonly writeState: 'not-sent' | 'unknown' | 'not-applicable';
    };

type BranchResult =
  | { readonly kind: 'success'; readonly branch: string }
  | Exclude<StorageResult<never>, { readonly kind: 'success' }>;

type StorageFailure = Exclude<
  StorageResult<never>,
  { readonly kind: 'success' }
>;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function responseJson(response: Response): Promise<unknown> {
  try {
    const value: unknown = JSON.parse(await response.text());
    return value;
  } catch {
    return null;
  }
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : null;
}

function headerInteger(headers: Headers, name: string): number | null {
  const value = headers.get(name);
  if (value === null || !/^(?:0|[1-9]\d*)$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function rateObservation(response: Response): RateLimitObservation | undefined {
  const remaining = headerInteger(response.headers, 'x-ratelimit-remaining');
  const limit = headerInteger(response.headers, 'x-ratelimit-limit');
  return remaining === null || limit === null
    ? undefined
    : { remaining, limit };
}

function retryAt(response: Response): string | null {
  const resetSeconds = headerInteger(response.headers, 'x-ratelimit-reset');
  if (resetSeconds === null) return null;
  const date = new Date(resetSeconds * 1_000);
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}

function success<T>(value: T, response: Response): StorageResult<T> {
  const observation = rateObservation(response);
  return observation === undefined
    ? { kind: 'success', value }
    : { kind: 'success', value, rateObservation: observation };
}

function encodeSegments(value: string): string {
  return value.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_SIZE) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + BASE64_CHUNK_SIZE),
    );
  }
  return btoa(binary);
}

function base64ToBytes(content: string): Uint8Array | null {
  try {
    const binary = atob(content);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

function responseFailure(
  response: Response,
  _body: unknown,
  writeState: 'unknown' | 'not-applicable',
): StorageFailure | null {
  if (response.status === 401) {
    return {
      kind: 'unauthorized',
      credentialState: 'invalid-expired-or-revoked',
    };
  }
  if (response.status === 404) return { kind: 'not-found', at: 'unknown' };
  if (
    response.status === 429 ||
    (response.status === 403 &&
      headerInteger(response.headers, 'x-ratelimit-remaining') === 0)
  ) {
    return { kind: 'rate-limited', retryAt: retryAt(response) };
  }
  if (response.status === 403) {
    return {
      kind: 'unauthorized',
      // No live 403 credential capture exists. Do not infer a finer provider
      // diagnosis from synthetic message text.
      credentialState: 'invalid-expired-or-revoked',
    };
  }
  if (response.status === 413) {
    // GitHub did not report either size fact in the pinned response shape.
    return { kind: 'too-large', observedBytes: null, limitBytes: null };
  }
  if (response.status >= 200 && response.status < 300) return null;
  return { kind: 'network-failed', writeState };
}

function branchFailure<T>(result: BranchResult): StorageResult<T> {
  switch (result.kind) {
    case 'success':
      throw new Error('A successful branch result is not a failure');
    case 'not-found':
      return result;
    case 'conflict':
      return result;
    case 'unauthorized':
      return result;
    case 'rate-limited':
      return result;
    case 'network-failed':
      return result;
    case 'too-large':
      return result;
  }
}

export class GitHubPartyStorage implements PartyStorage {
  private readonly config: RepositoryConfig;
  private readonly credential: CredentialLease;
  private readonly commitMessageForPath: GitHubCommitMessageForPath;
  private readonly fetchImplementation: typeof fetch;
  private resolvedBranch: string | null;

  public constructor(options: GitHubPartyStorageOptions) {
    this.config = options.config;
    this.credential = options.credential;
    this.commitMessageForPath = options.commitMessageForPath;
    this.fetchImplementation = options.fetch;
    this.resolvedBranch = options.config.defaultBranch;
  }

  private repositoryUrl(): string {
    return `${API_ORIGIN}/repos/${encodeSegments(this.config.repository)}`;
  }

  private contentsUrl(path: RepositoryPath, branch: string): string {
    const url = new URL(
      `${this.repositoryUrl()}/contents/${encodeSegments(path)}`,
    );
    url.searchParams.set('ref', branch);
    return url.toString();
  }

  private request(url: string, method: 'GET' | 'PUT' | 'DELETE', body?: string): Request {
    const headers = new Headers({
      accept: ACCEPT,
      'x-github-api-version': API_VERSION,
    });
    if (body !== undefined) headers.set('content-type', 'application/json');
    const init: RequestInit = body === undefined
      ? { method, headers }
      : { method, headers, body };
    return this.credential.applyAuthorization(new Request(url, init));
  }

  private async send(
    request: Request,
    writeState: 'unknown' | 'not-applicable',
  ): Promise<ResponseResult> {
    try {
      return {
        kind: 'response',
        response: await this.fetchImplementation(request),
      };
    } catch {
      return { kind: 'network-failed', writeState };
    }
  }

  private async branch(): Promise<BranchResult> {
    if (this.resolvedBranch !== null && this.resolvedBranch.length > 0) {
      return { kind: 'success', branch: this.resolvedBranch };
    }

    const sent = await this.send(
      this.request(this.repositoryUrl(), 'GET'),
      'not-applicable',
    );
    if (sent.kind === 'network-failed') return sent;
    const body = await responseJson(sent.response);
    const failure = responseFailure(
      sent.response,
      body,
      'not-applicable',
    );
    if (failure !== null) return failure;
    const branch = isRecord(body) ? nonEmptyString(body['default_branch']) : null;
    if (branch === null) {
      return { kind: 'network-failed', writeState: 'not-applicable' };
    }
    this.resolvedBranch = branch;
    return { kind: 'success', branch };
  }

  public async list(
    prefix: RepositoryPath,
  ): Promise<StorageResult<readonly StoredObjectSummary[]>> {
    const branch = await this.branch();
    if (branch.kind !== 'success') return branchFailure(branch);
    const sent = await this.send(
      this.request(this.contentsUrl(prefix, branch.branch), 'GET'),
      'not-applicable',
    );
    if (sent.kind === 'network-failed') return sent;
    const body = await responseJson(sent.response);
    const failure = responseFailure(
      sent.response,
      body,
      'not-applicable',
    );
    if (failure !== null) return failure;
    if (!Array.isArray(body)) {
      return { kind: 'network-failed', writeState: 'not-applicable' };
    }

    const summaries: StoredObjectSummary[] = [];
    for (const entry of body) {
      if (!isRecord(entry) || entry['type'] !== 'file') continue;
      const remotePath = nonEmptyString(entry['path']);
      if (remotePath === null) {
        return { kind: 'network-failed', writeState: 'not-applicable' };
      }
      const parsedPath = parseRepositoryPath(remotePath);
      if (parsedPath.kind === 'invalid-path') {
        // The port has no invalid-provider-payload arm. Surface the unusable
        // listing as its typed read refusal; never silently drop or brand it.
        return { kind: 'network-failed', writeState: 'not-applicable' };
      }
      summaries.push({
        path: parsedPath.path,
        // Publishing still requires the token from an exact read (section 5).
        revision: null,
        byteLength: nonNegativeInteger(entry['size']),
      });
    }
    return success(summaries, sent.response);
  }

  public async read(path: RepositoryPath): Promise<StorageResult<StoredObject>> {
    const branch = await this.branch();
    if (branch.kind !== 'success') return branchFailure(branch);
    const sent = await this.send(
      this.request(this.contentsUrl(path, branch.branch), 'GET'),
      'not-applicable',
    );
    if (sent.kind === 'network-failed') return sent;
    const body = await responseJson(sent.response);
    const failure = responseFailure(
      sent.response,
      body,
      'not-applicable',
    );
    if (failure !== null) return failure;
    if (!isRecord(body) || body['encoding'] !== 'base64') {
      return { kind: 'network-failed', writeState: 'not-applicable' };
    }
    const responsePath = nonEmptyString(body['path']);
    const sha = nonEmptyString(body['sha']);
    const content = nonEmptyString(body['content']);
    const bytes = content === null ? null : base64ToBytes(content);
    if (responsePath !== path || sha === null || bytes === null) {
      return { kind: 'network-failed', writeState: 'not-applicable' };
    }
    return success(
      { path, bytes, revision: sha as RepositoryRevision },
      sent.response,
    );
  }

  public async write(
    path: RepositoryPath,
    bytes: Uint8Array,
    condition: WriteCondition,
  ): Promise<StorageResult<WriteReceipt>> {
    const branch = await this.branch();
    if (branch.kind !== 'success') {
      const failure = branchFailure<WriteReceipt>(branch);
      return failure.kind === 'network-failed'
        ? { kind: 'network-failed', writeState: 'not-sent' }
        : failure;
    }

    const requestBody: {
      message: GitHubCommitMessage;
      content: string;
      branch: string;
      sha?: RepositoryRevision;
    } = {
      message: this.commitMessageForPath(path),
      content: bytesToBase64(bytes),
      branch: branch.branch,
    };
    let expected: RepositoryRevision | null;
    switch (condition.kind) {
      case 'create-only':
        expected = null;
        break;
      case 'replace':
        requestBody.sha = condition.expected;
        expected = condition.expected;
        break;
    }

    const sent = await this.send(
      this.request(
        this.contentsUrl(path, branch.branch),
        'PUT',
        JSON.stringify(requestBody),
      ),
      'unknown',
    );
    if (sent.kind === 'network-failed') return sent;
    const body = await responseJson(sent.response);
    if (sent.response.status === 409) {
      // The captured 409 proves the expected token is stale but exposes no
      // current blob sha. Refuse without a retry or an invented `actual`.
      return { kind: 'conflict', expected, actual: null };
    }
    const failure = responseFailure(
      sent.response,
      body,
      'unknown',
    );
    if (failure !== null) return failure;

    const content = isRecord(body) && isRecord(body['content'])
      ? body['content']
      : null;
    const revision = content === null ? null : nonEmptyString(content['sha']);
    return success(
      { revision: revision === null ? null : revision as RepositoryRevision },
      sent.response,
    );
  }

  public async delete(
    path: RepositoryPath,
    expected: RepositoryRevision,
  ): Promise<StorageResult<{ readonly deleted: true }>> {
    const branch = await this.branch();
    if (branch.kind !== 'success') {
      const failure = branchFailure<{ readonly deleted: true }>(branch);
      return failure.kind === 'network-failed'
        ? { kind: 'network-failed', writeState: 'not-sent' }
        : failure;
    }
    const bodyText = JSON.stringify({
      message: this.commitMessageForPath(path),
      sha: expected,
      branch: branch.branch,
    });
    const sent = await this.send(
      this.request(this.contentsUrl(path, branch.branch), 'DELETE', bodyText),
      'unknown',
    );
    if (sent.kind === 'network-failed') return sent;
    const body = await responseJson(sent.response);
    if (sent.response.status === 409) {
      return { kind: 'conflict', expected, actual: null };
    }
    const failure = responseFailure(
      sent.response,
      body,
      'unknown',
    );
    return failure ?? success({ deleted: true }, sent.response);
  }
}

export function createGitHubPartyStorage(
  options: GitHubPartyStorageOptions,
): PartyStorage {
  return new GitHubPartyStorage(options);
}
