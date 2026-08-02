import type {
  ActualForgeRequest,
  FixtureMatch,
  RecordedForgeFixture,
} from './types';

export const FORGE_API_ORIGINS = [
  'https://api.github.com',
  'https://gitlab.com',
  'https://codeberg.org',
] as const;

function normalizedHeaders(
  headers: Headers | Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  const normalized: Record<string, string> = {};
  new Headers(headers).forEach((value, key) => {
    normalized[key.toLowerCase()] = value;
  });
  return normalized;
}

function fixtureMatches(
  fixture: RecordedForgeFixture,
  request: ActualForgeRequest,
): boolean {
  if (
    fixture.request.method !== request.method.toUpperCase() ||
    fixture.request.url !== request.url ||
    fixture.request.body !== (request.body === '' ? null : request.body)
  ) {
    return false;
  }

  const actualHeaders = normalizedHeaders(request.headers);
  const relevantHeaders = normalizedHeaders(fixture.request.headers);
  return (
    Object.entries(relevantHeaders).every(
      ([name, value]) => actualHeaders[name] === value,
    ) &&
    fixture.request.absentHeaders.every(
      (name) => actualHeaders[name.toLowerCase()] === undefined,
    )
  );
}

export function matchRecordedFixture(
  fixtures: readonly RecordedForgeFixture[],
  request: ActualForgeRequest,
): FixtureMatch {
  const matches = fixtures.filter((fixture) => fixtureMatches(fixture, request));
  if (matches.length === 0) return { kind: 'unmatched' };
  if (matches.length > 1) {
    return {
      kind: 'ambiguous',
      fixtureNames: matches.map((fixture) => fixture.name),
    };
  }
  const fixture = matches[0];
  if (fixture === undefined) return { kind: 'unmatched' };
  return { kind: 'matched', fixture };
}

export function isForgeApiUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return FORGE_API_ORIGINS.includes(
      parsed.origin as (typeof FORGE_API_ORIGINS)[number],
    );
  } catch {
    return false;
  }
}

export function fixtureRefusalMessage(
  request: Pick<ActualForgeRequest, 'url'>,
  testName: string,
  match: Exclude<FixtureMatch, { readonly kind: 'matched' }>,
): string {
  if (match.kind === 'ambiguous') {
    return `Ambiguous recorded forge request ${request.url} in test "${testName}"; matched fixtures: ${match.fixtureNames.join(', ')}`;
  }
  return `Unhandled forge request ${request.url} in test "${testName}"`;
}
