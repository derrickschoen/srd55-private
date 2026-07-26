/**
 * An RFC 9309 robots.txt parser and matcher.
 *
 * Deliberately has no override. The caller can choose a user-agent and can slow
 * itself down; it cannot ask this module to return `allowed` for a path a
 * matching group disallows. That is the whole point — a `--ignore-robots` flag
 * is the kind of thing that gets added "just for a test run" and then stays.
 *
 * Two behaviours here are easy to get subtly wrong, so both are spelled out:
 *
 * 1. GROUP SELECTION IS NOT SUBSTRING MATCHING. RFC 9309 §2.2.1 matches the
 *    crawler's PRODUCT TOKEN — the bare name, case-insensitively — not the full
 *    User-Agent header. A robots.txt that disallows `voltron` must not be
 *    dodged by calling ourselves `voltron-friendly`, and equally must not
 *    accidentally capture us because our long UA string happens to contain some
 *    other agent's name. We compare product tokens, and only the most specific
 *    matching group applies: a group naming us wins over `*`, and if neither
 *    exists there is no applicable group and nothing is restricted.
 *
 * 2. THE MOST SPECIFIC RULE WINS, NOT THE FIRST. §2.2.2: the longest matching
 *    path pattern decides, and `Allow` beats `Disallow` on an exact tie. An
 *    implementation that returns on first match reads `Disallow: /` followed by
 *    `Allow: /public/` as a total ban, which is wrong.
 */

export type RobotsRuleKind = 'allow' | 'disallow';

export interface RobotsRule {
  readonly kind: RobotsRuleKind;
  /** The raw pattern as written, `*` and `$` included. */
  readonly pattern: string;
}

export interface RobotsGroup {
  /** Lowercased product tokens this group applies to. */
  readonly agents: readonly string[];
  readonly rules: readonly RobotsRule[];
  readonly crawlDelaySeconds: number | null;
}

export interface RobotsTxt {
  readonly groups: readonly RobotsGroup[];
  readonly sitemaps: readonly string[];
}

export interface RobotsDecision {
  readonly allowed: boolean;
  /** The rule that decided, or null when no group applied. */
  readonly rule: RobotsRule | null;
  /** Human-readable reason, used verbatim in the skip log. */
  readonly reason: string;
}

/**
 * The empty robots.txt: no groups, so no restrictions. Used when the file is
 * absent (HTTP 404), which RFC 9309 §2.3.1.3 says means unrestricted access.
 */
export const UNRESTRICTED: RobotsTxt = Object.freeze({
  groups: Object.freeze([]),
  sitemaps: Object.freeze([]),
});

function splitDirective(line: string): { field: string; value: string } | null {
  const withoutComment = line.replace(/#.*$/u, '');
  const colon = withoutComment.indexOf(':');
  if (colon < 0) {
    return null;
  }
  const field = withoutComment.slice(0, colon).trim().toLowerCase();
  const value = withoutComment.slice(colon + 1).trim();
  if (field === '') {
    return null;
  }
  return { field, value };
}

export function parseRobotsTxt(source: string): RobotsTxt {
  const groups: RobotsGroup[] = [];
  const sitemaps: string[] = [];

  let agents: string[] = [];
  let rules: RobotsRule[] = [];
  let crawlDelaySeconds: number | null = null;
  // A `User-agent` line directly after a rule line starts a NEW group; one
  // directly after another `User-agent` line extends the current group's agent
  // list. This flag is the only way to tell those apart.
  let collectingAgents = false;

  const flush = (): void => {
    if (agents.length > 0) {
      groups.push({ agents, rules, crawlDelaySeconds });
    }
    agents = [];
    rules = [];
    crawlDelaySeconds = null;
  };

  for (const line of source.split(/\r?\n/u)) {
    const directive = splitDirective(line);
    if (directive === null) {
      continue;
    }
    const { field, value } = directive;

    if (field === 'sitemap') {
      if (value !== '') {
        sitemaps.push(value);
      }
      continue;
    }

    if (field === 'user-agent') {
      if (!collectingAgents) {
        flush();
        collectingAgents = true;
      }
      if (value !== '') {
        agents.push(value.toLowerCase());
      }
      continue;
    }

    collectingAgents = false;

    if (field === 'allow' || field === 'disallow') {
      // `Disallow:` with an empty value is an explicit ALLOW-ALL and must be
      // kept as a zero-length pattern, not dropped: it is how a group opts back
      // in under a broader ban.
      rules.push({ kind: field, pattern: value });
      continue;
    }
    if (field === 'crawl-delay') {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds >= 0) {
        crawlDelaySeconds = seconds;
      }
    }
  }
  flush();

  return { groups, sitemaps };
}

/**
 * Selects the group that applies to `productToken`, per RFC 9309 §2.2.1:
 * an exact case-insensitive product-token match wins; `*` is the fallback;
 * neither means no group applies.
 */
export function groupFor(
  robots: RobotsTxt,
  productToken: string,
): RobotsGroup | null {
  const token = productToken.toLowerCase();
  const exact = robots.groups.filter((group) => group.agents.includes(token));
  if (exact.length > 0) {
    return mergeGroups(exact);
  }
  const wildcard = robots.groups.filter((group) => group.agents.includes('*'));
  return wildcard.length > 0 ? mergeGroups(wildcard) : null;
}

function mergeGroups(groups: readonly RobotsGroup[]): RobotsGroup {
  if (groups.length === 1) {
    return groups[0] as RobotsGroup;
  }
  const delays = groups
    .map((group) => group.crawlDelaySeconds)
    .filter((delay): delay is number => delay !== null);
  return {
    agents: groups.flatMap((group) => group.agents),
    rules: groups.flatMap((group) => group.rules),
    // Merging duplicate groups takes the SLOWEST stated delay. Taking the
    // fastest would let a stray duplicate group speed us up.
    crawlDelaySeconds: delays.length > 0 ? Math.max(...delays) : null,
  };
}

/**
 * Matches a robots path pattern against a request path.
 *
 * `*` matches any run of characters, `$` at the end anchors. Everything else is
 * a literal prefix match. Returns the number of pattern characters that had to
 * match — the specificity score §2.2.2 ranks on — or null for no match.
 */
export function matchPattern(pattern: string, path: string): number | null {
  if (pattern === '') {
    // An empty `Disallow:` matches nothing (it is the allow-all idiom) but must
    // still lose every specificity contest, which a null naturally does.
    return null;
  }
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const segments = body.split('*');

  let cursor = 0;
  for (const [index, segment] of segments.entries()) {
    if (segment === '') {
      continue;
    }
    if (index === 0) {
      if (!path.startsWith(segment)) {
        return null;
      }
      cursor = segment.length;
      continue;
    }
    const found = path.indexOf(segment, cursor);
    if (found < 0) {
      return null;
    }
    cursor = found + segment.length;
  }

  if (anchored) {
    const tail = segments[segments.length - 1] as string;
    if (segments.length === 1) {
      if (path !== body) {
        return null;
      }
    } else if (!path.endsWith(tail) || path.length < cursor) {
      return null;
    }
  }
  return pattern.length;
}

/**
 * The decision. `allowed: false` means the caller MUST skip the URL; there is
 * no argument that flips it.
 */
export function isAllowed(
  robots: RobotsTxt,
  productToken: string,
  url: string,
): RobotsDecision {
  const group = groupFor(robots, productToken);
  if (group === null) {
    return {
      allowed: true,
      rule: null,
      reason: `no robots.txt group applies to "${productToken}"`,
    };
  }

  const parsed = new URL(url);
  const path = `${parsed.pathname}${parsed.search}`;

  let best: { rule: RobotsRule; score: number } | null = null;
  for (const rule of group.rules) {
    const score = matchPattern(rule.pattern, path);
    if (score === null) {
      continue;
    }
    if (
      best === null ||
      score > best.score ||
      // Exact tie: Allow wins (§2.2.2).
      (score === best.score && rule.kind === 'allow')
    ) {
      best = { rule, score };
    }
  }

  if (best === null) {
    return {
      allowed: true,
      rule: null,
      reason: `no rule in the "${group.agents.join(', ')}" group matches ${path}`,
    };
  }
  const verb = best.rule.kind === 'allow' ? 'Allow' : 'Disallow';
  return {
    allowed: best.rule.kind === 'allow',
    rule: best.rule,
    reason: `${verb}: ${best.rule.pattern} (group "${group.agents.join(', ')}") matches ${path}`,
  };
}

/** The crawl delay this robots.txt asks of us, in ms, or null if it is silent. */
export function crawlDelayMs(
  robots: RobotsTxt,
  productToken: string,
): number | null {
  const group = groupFor(robots, productToken);
  if (group === null || group.crawlDelaySeconds === null) {
    return null;
  }
  return Math.ceil(group.crawlDelaySeconds * 1000);
}
