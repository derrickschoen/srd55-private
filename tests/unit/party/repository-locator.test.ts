import { describe, expect, it } from 'vitest';
import { parseRepositoryLocator } from '../../../src/party/storage/repository-locator';

describe('closed party repository locator parser', () => {
  it('normalizes exactly GitHub, GitLab, and Codeberg repository URLs without inventing a branch', () => {
    expect(parseRepositoryLocator('https://github.com/owl/table.git/')).toEqual({
      kind: 'success',
      config: {
        forge: 'github',
        repository: 'owl/table',
        defaultBranch: null,
      },
    });
    expect(
      parseRepositoryLocator('https://gitlab.com/owl/nested/table'),
    ).toEqual({
      kind: 'success',
      config: {
        forge: 'gitlab',
        repository: 'owl/nested/table',
        defaultBranch: null,
      },
    });
    expect(parseRepositoryLocator('https://codeberg.org/owl/table')).toEqual({
      kind: 'success',
      config: {
        forge: 'codeberg',
        repository: 'owl/table',
        defaultBranch: null,
      },
    });
  });

  it('PARTY-LOCATOR-CLOSED refuses unknown hosts and every ref-bearing URL as named data', () => {
    expect(parseRepositoryLocator('https://example.test/owl/table')).toEqual({
      kind: 'unsupported-host',
      host: 'example.test',
    });
    expect(
      parseRepositoryLocator('https://github.com/owl/table/tree/develop'),
    ).toEqual({ kind: 'unsupported-locator', feature: 'ref' });
    expect(
      parseRepositoryLocator('https://gitlab.com/owl/table/-/tree/develop'),
    ).toEqual({ kind: 'unsupported-locator', feature: 'ref' });
    expect(
      parseRepositoryLocator('https://gitlab.com/owl/table/tree/develop'),
    ).toEqual({ kind: 'unsupported-locator', feature: 'ref' });
    expect(
      parseRepositoryLocator('https://github.com/owl/table/tree/main/library'),
    ).toEqual({ kind: 'unsupported-locator', feature: 'subtree' });
    expect(
      parseRepositoryLocator('https://github.com/owl/table/blob/main/a.json'),
    ).toEqual({ kind: 'unsupported-locator', feature: 'blob' });
    expect(
      parseRepositoryLocator('https://codeberg.org/owl/table?ref=develop'),
    ).toEqual({ kind: 'unsupported-locator', feature: 'ref' });
    expect(
      parseRepositoryLocator(
        'https://codeberg.org/owl/table/src/branch/develop/library',
      ),
    ).toEqual({ kind: 'unsupported-locator', feature: 'subtree' });
  });

  it('returns distinct named refusals for malformed and ambiguous locators', () => {
    expect(parseRepositoryLocator('not a URL')).toEqual({ kind: 'invalid-url' });
    expect(parseRepositoryLocator('http://github.com/owl/table')).toEqual({
      kind: 'ambiguous-locator',
      reason: 'non-https',
    });
    expect(parseRepositoryLocator('https://github.com/owl')).toEqual({
      kind: 'ambiguous-locator',
      reason: 'missing-repository',
    });
    expect(parseRepositoryLocator('https://github.com/owl/table/extra')).toEqual({
      kind: 'ambiguous-locator',
      reason: 'extra-path',
    });
    expect(parseRepositoryLocator('https://github.com/owl//table')).toEqual({
      kind: 'ambiguous-locator',
      reason: 'invalid-path-segment',
    });
    expect(parseRepositoryLocator('https://github.com/owl/ta%3Fble')).toEqual({
      kind: 'ambiguous-locator',
      reason: 'invalid-path-segment',
    });
    expect(parseRepositoryLocator('https://github.com/owl/ta%20ble')).toEqual({
      kind: 'ambiguous-locator',
      reason: 'invalid-path-segment',
    });
    expect(parseRepositoryLocator('https://github.com/owl/table?q=one')).toEqual({
      kind: 'ambiguous-locator',
      reason: 'query',
    });
    expect(parseRepositoryLocator('https://github.com/owl/table#readme')).toEqual({
      kind: 'ambiguous-locator',
      reason: 'fragment',
    });
  });
});
