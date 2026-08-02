import type {
  PartyPublicationId,
  RepositoryPath,
} from './contracts';

export type RepositoryRoot = 'library' | 'characters';

export type RepositoryPathRefusal = {
  readonly kind: 'invalid-path';
  readonly reason:
    | 'escape'
    | 'wrong-root'
    | 'wrong-depth'
    | 'invalid-filename'
    | 'invalid-publication-id'
    | 'unsanitizable-name';
};

export type RepositoryPathResult =
  | { readonly kind: 'success'; readonly path: RepositoryPath }
  | RepositoryPathRefusal;

export type RepositorySlugResult =
  | { readonly kind: 'success'; readonly slug: string }
  | {
      readonly kind: 'invalid-path';
      readonly reason: 'unsanitizable-name';
    };

const PUBLICATION_ID = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u;
const PUBLICATION_FILENAME = /^([a-z0-9]+(?:-[a-z0-9]+)*)--([a-z0-9](?:[a-z0-9-]*[a-z0-9])?)\.json$/u;

function hasEscapeSyntax(value: string): boolean {
  return (
    value.startsWith('/') ||
    value.includes('\\') ||
    value.includes('..') ||
    /[\u0000-\u001f\u007f]/u.test(value)
  );
}

export function sanitizeRepositorySlug(name: string): RepositorySlugResult {
  if (hasEscapeSyntax(name)) {
    return { kind: 'invalid-path', reason: 'unsanitizable-name' };
  }

  const slug = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '');

  if (slug.length === 0) {
    return { kind: 'invalid-path', reason: 'unsanitizable-name' };
  }
  return { kind: 'success', slug };
}

export function repositoryRootPath(root: RepositoryRoot): RepositoryPath {
  return `${root}/` as RepositoryPath;
}

export function primaryLibraryPath(): RepositoryPath {
  return 'library/party-library.json' as RepositoryPath;
}

export function createPublicationPath(
  root: RepositoryRoot,
  displayName: string,
  publicationId: PartyPublicationId,
): RepositoryPathResult {
  const slugResult = sanitizeRepositorySlug(displayName);
  if (slugResult.kind === 'invalid-path') return slugResult;
  if (!PUBLICATION_ID.test(publicationId)) {
    return { kind: 'invalid-path', reason: 'invalid-publication-id' };
  }
  return {
    kind: 'success',
    path: `${root}/${slugResult.slug}--${publicationId}.json` as RepositoryPath,
  };
}

export function parseRepositoryPath(input: string): RepositoryPathResult {
  if (hasEscapeSyntax(input)) {
    return { kind: 'invalid-path', reason: 'escape' };
  }
  if (input === 'library/' || input === 'characters/') {
    return { kind: 'success', path: input as RepositoryPath };
  }

  const segments = input.split('/');
  if (segments.length !== 2 || segments.some((segment) => segment.length === 0)) {
    return { kind: 'invalid-path', reason: 'wrong-depth' };
  }
  const root = segments[0];
  const filename = segments[1];
  if (root !== 'library' && root !== 'characters') {
    return { kind: 'invalid-path', reason: 'wrong-root' };
  }
  if (root === 'library' && filename === 'party-library.json') {
    return { kind: 'success', path: input as RepositoryPath };
  }

  const match = PUBLICATION_FILENAME.exec(filename ?? '');
  if (match === null) {
    return { kind: 'invalid-path', reason: 'invalid-filename' };
  }
  const publicationId = match[2];
  if (publicationId === undefined || !PUBLICATION_ID.test(publicationId)) {
    return { kind: 'invalid-path', reason: 'invalid-publication-id' };
  }
  return { kind: 'success', path: input as RepositoryPath };
}
