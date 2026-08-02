import type { Forge, RepositoryConfig } from './contracts';

export type RepositoryLocatorRefusal =
  | { readonly kind: 'invalid-url' }
  | { readonly kind: 'unsupported-host'; readonly host: string }
  | {
      readonly kind: 'unsupported-locator';
      readonly feature: 'ref' | 'subtree' | 'blob';
    }
  | {
      readonly kind: 'ambiguous-locator';
      readonly reason:
        | 'non-https'
        | 'credentials'
        | 'port'
        | 'query'
        | 'fragment'
        | 'missing-repository'
        | 'extra-path'
        | 'invalid-path-segment';
    };

export type RepositoryLocatorResult =
  | { readonly kind: 'success'; readonly config: RepositoryConfig }
  | RepositoryLocatorRefusal;

const HOST_FORGE = {
  'github.com': 'github',
  'gitlab.com': 'gitlab',
  'codeberg.org': 'codeberg',
} as const satisfies Readonly<Record<string, Forge>>;
const REPOSITORY_SEGMENT = /^[A-Za-z0-9._-]+$/u;

function forgeForHost(host: string): Forge | null {
  if (host === 'github.com') return HOST_FORGE['github.com'];
  if (host === 'gitlab.com') return HOST_FORGE['gitlab.com'];
  if (host === 'codeberg.org') return HOST_FORGE['codeberg.org'];
  return null;
}

function decodeSegments(pathname: string): readonly string[] | null {
  try {
    const rawSegments = pathname.split('/');
    const pathSegments = rawSegments.slice(
      1,
      rawSegments.at(-1) === '' ? -1 : undefined,
    );
    if (pathSegments.some((segment) => segment.length === 0)) return null;
    return pathSegments.map((segment) => decodeURIComponent(segment));
  } catch {
    return null;
  }
}

function containsInvalidSegment(segments: readonly string[]): boolean {
  return segments.some(
    (segment) =>
      segment.length === 0 ||
      segment === '.' ||
      segment === '..' ||
      segment.includes('/') ||
      segment.includes('\\') ||
      !REPOSITORY_SEGMENT.test(segment) ||
      /[\u0000-\u001f\u007f]/u.test(segment),
  );
}

function unsupportedPathFeature(
  forge: Forge,
  segments: readonly string[],
): 'ref' | 'subtree' | 'blob' | null {
  if (forge === 'github') {
    if (segments[2] === 'tree') {
      return segments.length > 4 ? 'subtree' : 'ref';
    }
    if (segments[2] === 'blob') return 'blob';
  }

  if (forge === 'gitlab') {
    const separator = segments.indexOf('-');
    if (separator >= 0 && segments[separator + 1] === 'tree') {
      return segments.length > separator + 3 ? 'subtree' : 'ref';
    }
    if (separator >= 0 && segments[separator + 1] === 'blob') return 'blob';
    const legacyTree = segments.indexOf('tree', 2);
    if (legacyTree >= 0 && segments[legacyTree + 1] !== undefined) {
      return segments.length > legacyTree + 2 ? 'subtree' : 'ref';
    }
    const legacyBlob = segments.indexOf('blob', 2);
    if (legacyBlob >= 0 && segments[legacyBlob + 1] !== undefined) return 'blob';
  }

  if (
    forge === 'codeberg' &&
    segments[2] === 'src' &&
    ['branch', 'tag', 'commit'].includes(segments[3] ?? '')
  ) {
    return segments.length > 5 ? 'subtree' : 'ref';
  }

  return null;
}

export function parseRepositoryLocator(input: string): RepositoryLocatorResult {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { kind: 'invalid-url' };
  }

  const forge = forgeForHost(url.hostname.toLowerCase());
  if (forge === null) {
    return { kind: 'unsupported-host', host: url.hostname.toLowerCase() };
  }
  if (url.protocol !== 'https:') {
    return { kind: 'ambiguous-locator', reason: 'non-https' };
  }
  if (url.username.length > 0 || url.password.length > 0) {
    return { kind: 'ambiguous-locator', reason: 'credentials' };
  }
  if (url.port.length > 0) {
    return { kind: 'ambiguous-locator', reason: 'port' };
  }
  if (url.searchParams.has('ref')) {
    return { kind: 'unsupported-locator', feature: 'ref' };
  }
  if (url.search.length > 0) {
    return { kind: 'ambiguous-locator', reason: 'query' };
  }
  if (url.hash.length > 0) {
    return { kind: 'ambiguous-locator', reason: 'fragment' };
  }

  const segments = decodeSegments(url.pathname);
  if (segments === null || containsInvalidSegment(segments)) {
    return { kind: 'ambiguous-locator', reason: 'invalid-path-segment' };
  }
  if (segments.length < 2) {
    return { kind: 'ambiguous-locator', reason: 'missing-repository' };
  }

  const unsupportedFeature = unsupportedPathFeature(forge, segments);
  if (unsupportedFeature !== null) {
    return { kind: 'unsupported-locator', feature: unsupportedFeature };
  }

  const projectSegments = [...segments];
  const lastIndex = projectSegments.length - 1;
  const lastSegment = projectSegments[lastIndex];
  if (lastSegment?.endsWith('.git')) {
    projectSegments[lastIndex] = lastSegment.slice(0, -4);
  }
  if (containsInvalidSegment(projectSegments)) {
    return { kind: 'ambiguous-locator', reason: 'invalid-path-segment' };
  }
  if (forge !== 'gitlab' && projectSegments.length !== 2) {
    return { kind: 'ambiguous-locator', reason: 'extra-path' };
  }
  if (forge === 'gitlab' && projectSegments.includes('-')) {
    return { kind: 'ambiguous-locator', reason: 'extra-path' };
  }

  return {
    kind: 'success',
    config: {
      forge,
      repository: projectSegments.join('/'),
      defaultBranch: null,
    },
  };
}
