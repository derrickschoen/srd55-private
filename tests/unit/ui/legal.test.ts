import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SRD_ATTRIBUTION_NOTICE } from '../../../src/rules/srd-attribution';
import { renderLegalPage } from '../../../src/ui/screens/legal/legal';
import { screen } from '../../../src/ui/screens/legal/screen';
import { parseRoute } from '../../../src/ui/router';

function documentedNotice(): string {
  const document = readFileSync(
    new URL('../../../docs/srd/ATTRIBUTION.md', import.meta.url),
    'utf8',
  );
  const quoted = document
    .split('\n')
    .filter((line) => line.startsWith('>'))
    .map((line) => line.replace(/^>\s?/, ''));
  if (quoted.length === 0) {
    throw new Error('docs/srd/ATTRIBUTION.md holds no quoted notice.');
  }
  return quoted.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * docs/srd/ATTRIBUTION.md bans the licensor's wordmarks outside the notice.
 * "D&D" is one of them, in both its literal and its HTML-escaped spelling.
 */
const FORBIDDEN_OUTSIDE_THE_NOTICE = [
  'D&D',
  'D&amp;D',
  'Wizards',
  'Dungeons',
  'official',
  'licensed by',
  'endorsed',
  'approved',
];

function shellMarkup(): string {
  return readFileSync(
    new URL('../../../index.html', import.meta.url),
    'utf8',
  );
}

function attributionText(markup: string): string {
  const match = markup.match(
    /<p[^>]*data-testid="srd-attribution"[^>]*>([\s\S]*?)<\/p>/,
  );
  if (match?.[1] === undefined) {
    throw new Error('Missing srd-attribution notice.');
  }
  return match[1]
    .replace(/<[^>]+>/g, '')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();
}

describe('SRD attribution in the running application', () => {
  it('ships the notice exactly as docs/srd/ATTRIBUTION.md requires it', () => {
    expect(SRD_ATTRIBUTION_NOTICE).toBe(documentedNotice());
  });

  it('renders the notice verbatim on the legal screen', () => {
    expect(attributionText(renderLegalPage())).toBe(SRD_ATTRIBUTION_NOTICE);
  });

  it('links the notice URLs without altering the notice text', () => {
    const markup = renderLegalPage();
    expect(markup).toContain(
      '<a href="https://www.dndbeyond.com/srd" rel="noreferrer">https://www.dndbeyond.com/srd</a>.',
    );
    expect(markup).toContain(
      '<a href="https://creativecommons.org/licenses/by/4.0/legalcode" rel="noreferrer">https://creativecommons.org/licenses/by/4.0/legalcode</a>.',
    );
  });

  it('attributes the licensor nowhere but inside the notice', () => {
    const outsideNotice = renderLegalPage().replace(
      /<p[^>]*data-testid="srd-attribution"[^>]*>[\s\S]*?<\/p>/,
      '',
    );
    for (const forbidden of FORBIDDEN_OUTSIDE_THE_NOTICE) {
      expect(outsideNotice).not.toContain(forbidden);
    }
  });

  it('keeps the licensor wordmarks out of the shipped shell', () => {
    const markup = shellMarkup();
    expect(markup).toContain('<title>SRD-55</title>');
    for (const forbidden of FORBIDDEN_OUTSIDE_THE_NOTICE) {
      expect(markup).not.toContain(forbidden);
    }
  });

  it('answers the /legal route only', () => {
    expect(screen.matches(parseRoute(new URL('https://x.test/legal')))).toBe(
      true,
    );
    expect(screen.matches(parseRoute(new URL('https://x.test/')))).toBe(false);
    expect(
      screen.matches(parseRoute(new URL('https://x.test/characters/1'))),
    ).toBe(false);
  });
});
