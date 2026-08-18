import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync(
  new URL('../../../src/ui/screens/character-list/styles.css', import.meta.url),
  'utf8',
);

describe('character list responsive contracts', () => {
  it('keeps mobile controls and checkbox labels at least 44 CSS pixels tall', () => {
    expect(styles).toMatch(
      /\.button-primary,[\s\S]*?\.transfer-panel button\s*\{[\s\S]*?min-height:\s*2\.75rem;/u,
    );
    expect(styles).toMatch(
      /\.share-option\s*\{[\s\S]*?min-height:\s*2\.75rem;/u,
    );
    expect(styles).toMatch(
      /\.transfer-panel summary\s*\{[\s\S]*?min-height:\s*2\.75rem;/u,
    );
  });

  it('keeps the character-list description rendered below 38rem', () => {
    expect(styles).toMatch(
      /@media \(max-width: 38rem\)[\s\S]*?\.header-title p\s*\{\s*display:\s*block;/u,
    );
  });
});
