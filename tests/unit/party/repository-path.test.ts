import { describe, expect, it } from 'vitest';
import type { PartyPublicationId } from '../../../src/party/storage/contracts';
import {
  createPublicationPath,
  parseRepositoryPath,
  primaryLibraryPath,
  repositoryRootPath,
  sanitizeRepositorySlug,
} from '../../../src/party/storage/repository-path';

describe('party repository paths', () => {
  it('builds safe stable character and selected-library paths', () => {
    const id = '3f194ad0-1425-4b4f-a4cb-7f76313ad7a2' as PartyPublicationId;
    expect(createPublicationPath('characters', 'Élan the Ash', id)).toEqual({
      kind: 'success',
      path: `characters/elan-the-ash--${id}.json`,
    });
    expect(createPublicationPath('library', '<script>alert(1)</script>', id)).toEqual({
      kind: 'success',
      path: `library/script-alert-1-script--${id}.json`,
    });
    expect(primaryLibraryPath()).toBe('library/party-library.json');
    expect(repositoryRootPath('library')).toBe('library/');
    expect(repositoryRootPath('characters')).toBe('characters/');
  });

  it('PARTY-PATH-NO-ESCAPE rejects traversal, absolute paths, backslashes, controls, depth, and raw hostile syntax', () => {
    for (const path of [
      '../library/ash--pub-1.json',
      '/library/ash--pub-1.json',
      'library\\ash--pub-1.json',
      'library/ash\u0000--pub-1.json',
      'outside/ash--pub-1.json',
      'library/nested/ash--pub-1.json',
      'characters/<script>--pub-1.json',
    ]) {
      expect(parseRepositoryPath(path).kind).toBe('invalid-path');
    }
    expect(sanitizeRepositorySlug('../Ash')).toEqual({
      kind: 'invalid-path',
      reason: 'unsanitizable-name',
    });
    expect(sanitizeRepositorySlug('— 👁️ —')).toEqual({
      kind: 'invalid-path',
      reason: 'unsanitizable-name',
    });
  });

  it('validates only the two one-segment roots and their named JSON files', () => {
    expect(parseRepositoryPath('library/party-library.json').kind).toBe('success');
    expect(parseRepositoryPath('library/ash--pub-1.json').kind).toBe('success');
    expect(parseRepositoryPath('characters/ash--pub-1.json').kind).toBe('success');
    expect(parseRepositoryPath('characters/party-library.json')).toEqual({
      kind: 'invalid-path',
      reason: 'invalid-filename',
    });
    expect(
      createPublicationPath(
        'characters',
        'Ash',
        '../hostile' as PartyPublicationId,
      ),
    ).toEqual({ kind: 'invalid-path', reason: 'invalid-publication-id' });
  });
});
