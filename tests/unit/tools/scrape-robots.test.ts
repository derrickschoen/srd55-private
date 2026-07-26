import { describe, expect, it } from 'vitest';
import {
  crawlDelayMs,
  groupFor,
  isAllowed,
  matchPattern,
  parseRobotsTxt,
} from '../../../tools/scrape/robots';
import { PRODUCT_TOKEN } from '../../../tools/scrape/fetcher';

const ORIGIN = 'http://example.invalid';
const url = (path: string): string => `${ORIGIN}${path}`;

describe('robots.txt parsing', () => {
  it('groups consecutive user-agent lines and separates groups on a rule', () => {
    const robots = parseRobotsTxt(
      [
        '# a comment',
        'User-agent: alpha',
        'User-agent: beta',
        'Disallow: /private/',
        '',
        'User-agent: *',
        'Disallow: /admin/',
        'Crawl-delay: 4',
        'Sitemap: http://example.invalid/sitemap.xml',
      ].join('\n'),
    );

    expect(robots.groups).toHaveLength(2);
    expect(robots.groups[0]?.agents).toEqual(['alpha', 'beta']);
    expect(robots.groups[1]?.agents).toEqual(['*']);
    expect(robots.sitemaps).toEqual(['http://example.invalid/sitemap.xml']);
    expect(crawlDelayMs(robots, 'anything-else')).toBe(4000);
  });

  it('matches the product token exactly, not as a substring', () => {
    // The real target's robots.txt disallows everything for exactly one named
    // agent and has no `*` group. Two ways to get this wrong: match our long UA
    // string as a substring and pick up someone else's ban, or match loosely and
    // let a renamed agent dodge one.
    const robots = parseRobotsTxt(['User-agent: voltron', 'Disallow: /'].join('\n'));

    expect(groupFor(robots, 'voltron')).not.toBe(null);
    expect(isAllowed(robots, 'voltron', url('/spell:anything')).allowed).toBe(false);

    expect(groupFor(robots, PRODUCT_TOKEN)).toBe(null);
    const ours = isAllowed(robots, PRODUCT_TOKEN, url('/spell:anything'));
    expect(ours.allowed).toBe(true);
    expect(ours.reason).toContain('no robots.txt group applies');

    // A name that merely CONTAINS the banned token is still a different agent…
    expect(groupFor(robots, 'voltron-mini')).toBe(null);
    // …and our own token is not dodged by casing.
    expect(isAllowed(robots, 'VOLTRON', url('/x')).allowed).toBe(false);
  });

  it('lets the most specific rule win, and Allow win an exact tie', () => {
    const robots = parseRobotsTxt(
      ['User-agent: *', 'Disallow: /', 'Allow: /spell:', 'Disallow: /spell:secret'].join(
        '\n',
      ),
    );

    // First-match-wins would read this as a total ban. It is not.
    expect(isAllowed(robots, PRODUCT_TOKEN, url('/spell:fine')).allowed).toBe(true);
    expect(isAllowed(robots, PRODUCT_TOKEN, url('/spell:secret')).allowed).toBe(false);
    expect(isAllowed(robots, PRODUCT_TOKEN, url('/feat:whatever')).allowed).toBe(false);

    const tie = parseRobotsTxt(
      ['User-agent: *', 'Disallow: /page', 'Allow: /page'].join('\n'),
    );
    expect(isAllowed(tie, PRODUCT_TOKEN, url('/page')).allowed).toBe(true);
  });

  it('prefers a group naming us over the wildcard group', () => {
    const robots = parseRobotsTxt(
      [
        'User-agent: *',
        'Disallow:',
        '',
        `User-agent: ${PRODUCT_TOKEN}`,
        'Disallow: /spell:',
      ].join('\n'),
    );
    expect(isAllowed(robots, PRODUCT_TOKEN, url('/spell:x')).allowed).toBe(false);
    expect(isAllowed(robots, 'someone-else', url('/spell:x')).allowed).toBe(true);
  });

  it('treats an empty Disallow as an opt-back-in, not as a ban', () => {
    const robots = parseRobotsTxt(['User-agent: *', 'Disallow:'].join('\n'));
    expect(isAllowed(robots, PRODUCT_TOKEN, url('/anything')).allowed).toBe(true);
  });

  it('honours * and $ in patterns', () => {
    expect(matchPattern('/a*b', '/axxb')).toBe(4);
    expect(matchPattern('/a*b', '/axxc')).toBe(null);
    expect(matchPattern('/exact$', '/exact')).toBe(7);
    expect(matchPattern('/exact$', '/exactly')).toBe(null);
    expect(matchPattern('/prefix', '/prefix-and-more')).toBe(7);

    const robots = parseRobotsTxt(
      ['User-agent: *', 'Disallow: /*.pdf$', 'Disallow: /tmp'].join('\n'),
    );
    expect(isAllowed(robots, PRODUCT_TOKEN, url('/docs/manual.pdf')).allowed).toBe(
      false,
    );
    expect(isAllowed(robots, PRODUCT_TOKEN, url('/docs/manual.pdf.html')).allowed).toBe(
      true,
    );
    expect(isAllowed(robots, PRODUCT_TOKEN, url('/tmpfile')).allowed).toBe(false);
  });

  it('names the deciding rule in the reason, so a skip can be reported', () => {
    const robots = parseRobotsTxt(['User-agent: *', 'Disallow: /spell:'].join('\n'));
    const decision = isAllowed(robots, PRODUCT_TOKEN, url('/spell:x'));
    expect(decision.allowed).toBe(false);
    expect(decision.rule).toEqual({ kind: 'disallow', pattern: '/spell:' });
    expect(decision.reason).toContain('Disallow: /spell:');
    expect(decision.reason).toContain('/spell:x');
  });
});
