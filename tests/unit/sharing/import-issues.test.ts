import { describe, expect, it } from 'vitest';
import {
  missingSubclassIssue,
  missingSourceIssue,
} from '../../../src/sharing/import-issues';

describe('reference-only missing-content remedies', () => {
  it('names known bundled homebrew and routes arbitrary content to the sender', () => {
    const veteranKey =
      '2024:content.subclass:veteran-bundled-revision-3';
    expect(missingSubclassIssue(veteranKey)).toEqual({
      code: 'missing_subclass',
      contentKeys: [veteranKey],
      contentName: 'Veteran (Bundled revision 3)',
      summary:
        'This character uses Veteran (Bundled revision 3), which is not in your library.',
      remedy: 'Import bundled homebrew, then retry this share.',
      remedyKind: 'bundled-homebrew',
    });

    expect(missingSourceIssue('species', 'expanded:someone:star-person'))
      .toEqual({
        code: 'missing_source',
        contentKeys: ['expanded:someone:star-person'],
        summary:
          'This character uses a species that is not in your library.',
        remedy:
          'Ask the sender for a library JSON containing this species, import it, then retry this share.',
        remedyKind: 'library-json',
      });
  });
});
