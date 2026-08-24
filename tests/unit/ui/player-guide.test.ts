import { describe, expect, it } from 'vitest';
import { playerGuideBlocks } from '../../../src/ui/screens/player-guide/player-guide';

describe('player guide Markdown projection', () => {
  it('keeps headings, prose, and ordered affordance steps semantic', () => {
    expect(playerGuideBlocks([
      '# Build and share',
      '',
      'Open the public app.',
      '',
      '1. Choose "Create a character".',
      '2. Choose "Fighter".',
    ].join('\n'))).toEqual([
      { kind: 'heading', level: 1, text: 'Build and share' },
      { kind: 'paragraph', text: 'Open the public app.' },
      {
        kind: 'list',
        ordered: true,
        items: [
          'Choose "Create a character".',
          'Choose "Fighter".',
        ],
      },
    ]);
  });
});

