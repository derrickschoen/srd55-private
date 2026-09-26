import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from '../../helpers/test-filesystem';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

/**
 * LUNA6 (plan r5 §4.3 T4; D887, D890): gpt-6-luna replaced gpt-5.6-luna. The old literal may stay only where it
 * records history. This guard fails on any other occurrence in tools/ or src/, so a route cannot silently fall back
 * to the retired model.
 *
 * The literal is written out here because tests/ is not scanned. Code that needs the old name for history imports
 * HISTORICAL_LUNA_MODEL from tools/model-routes.ts; a live route uses LUNA_MODEL.
 */
const HISTORICAL_LUNA_LITERAL = 'gpt-5.6-luna';
const SCANNED_ROOTS = ['src/', 'tools/'] as const;

/**
 * The exact historical allowlist: occurrences per file, typed by hand from the plan r5 §1.1 census
 * (`git grep -F -o 'gpt-5.6-luna' -- src tools`), adjusted by the LUNA6 diffs this batch builds on (§4.1). It is
 * never counted at test time. A file above its count fails, and so does a file below it: a stale allowance would
 * let the literal back.
 *
 * - tools/ai-dm-rerun-packet.ts 2: the D575 registry (§1.4, byte-frozen).
 * - tools/d569-blind-experiment.ts 23: the D569 v5 player models, arms and comparisons (§1.4, 22 lines).
 * - tools/d569-v5/analyze-primary-pair.ts 4 and tools/d569-v5/validate-first-arm.ts 1: v5 analysis (§1.4).
 * - tools/model-routes.ts 1: HISTORICAL_LUNA_MODEL, added by B1 (§4.1: B1 +1).
 * - tools/rl/generate-data.ts 4: NOT history. It is the RL corpus route that B2 moves to gpt-6-luna low (§1.2);
 *   §4.1 removes these 4 with B2. B2 was not on this batch's base, so the entry stays until B2 lands, and the
 *   landing that combines B2 with this guard deletes the line (the stale-allowance check then fails until it does).
 */
const HISTORICAL_LUNA_ALLOWLIST: Readonly<Record<string, number>> = Object.freeze({
  'tools/ai-dm-rerun-packet.ts': 2,
  'tools/d569-blind-experiment.ts': 23,
  'tools/d569-v5/analyze-primary-pair.ts': 4,
  'tools/d569-v5/validate-first-arm.ts': 1,
  'tools/model-routes.ts': 1,
  'tools/rl/generate-data.ts': 4,
});

interface HistoricalLunaLiteralReport {
  /** Occurrences per scanned file that holds the literal, keyed by repository path. */
  readonly counts: Readonly<Record<string, number>>;
  /** One line per file whose count differs from its allowance, in path order. */
  readonly violations: readonly string[];
}

/** The 1-based line of every occurrence of the literal, one entry per occurrence (two on one line give two). */
function occurrenceLines(text: string): number[] {
  const lines: number[] = [];
  let line = 1;
  let scanned = 0;
  for (let at = text.indexOf(HISTORICAL_LUNA_LITERAL); at !== -1;
    at = text.indexOf(HISTORICAL_LUNA_LITERAL, at + HISTORICAL_LUNA_LITERAL.length)) {
    for (; scanned < at; scanned += 1) if (text.charCodeAt(scanned) === 0x0a) line += 1;
    lines.push(line);
  }
  return lines;
}

/**
 * The guard. It reads only the file map it is given, so a planted map exercises exactly the code the repository
 * scan runs. Paths outside tools/ and src/ are ignored.
 */
function scanForHistoricalLunaLiteral(
  files: ReadonlyMap<string, string>,
  allowlist: Readonly<Record<string, number>>,
): HistoricalLunaLiteralReport {
  const lines = new Map<string, number[]>();
  for (const [path, text] of files) {
    if (!SCANNED_ROOTS.some((root) => path.startsWith(root))) continue;
    const found = occurrenceLines(text);
    if (found.length > 0) lines.set(path, found);
  }
  const paths = [...new Set([...lines.keys(), ...Object.keys(allowlist)])].sort();
  const counts: Record<string, number> = {};
  const violations: string[] = [];
  for (const path of paths) {
    const at = lines.get(path) ?? [];
    const allowed = allowlist[path] ?? 0;
    if (at.length > 0) counts[path] = at.length;
    if (at.length > allowed) {
      violations.push(`${path}: ${HISTORICAL_LUNA_LITERAL} found ${at.length}, allowed ${allowed}, ` +
        `at lines ${at.join(', ')}`);
    } else if (at.length < allowed) {
      violations.push(`${path}: ${HISTORICAL_LUNA_LITERAL} found ${at.length}, allowed ${allowed} ` +
        '(a stale allowance: lower or remove the entry)');
    }
  }
  return { counts, violations };
}

/**
 * Every file under the scanned roots that `git add -A` would commit: tracked files plus untracked files that are
 * not ignored. Ignored scratch (for example a mutation backup under .tmp-*) is not code and is not scanned.
 */
function scannedRepositoryFiles(): Map<string, string> {
  const listing = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...SCANNED_ROOTS],
    { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  const files = new Map<string, string>();
  for (const path of listing.split('\0').filter((entry) => entry !== '')) {
    const absolute = join(repoRoot, path);
    // A tracked file deleted in the working tree has no bytes that could hold the literal.
    if (!existsSync(absolute)) continue;
    files.set(path, readFileSync(absolute, 'utf8'));
  }
  return files;
}

describe('LUNA6 historical Luna literal guard', () => {
  it('forbids gpt-5.6-luna in tools/ and src/ outside the exact historical allowlist', () => {
    const files = scannedRepositoryFiles();
    const report = scanForHistoricalLunaLiteral(files, HISTORICAL_LUNA_ALLOWLIST);
    expect({
      // Vacuity guard: an empty or partial listing would match an empty report while proving nothing.
      scansMoreThan500Files: files.size > 500,
      scansBothRoots: files.has('tools/d569-blind-experiment.ts') && files.has('src/vtt/agent-adapters/codex.ts'),
      counts: report.counts,
      violations: report.violations,
    }, 'history imports HISTORICAL_LUNA_MODEL (tools/model-routes.ts); a live route uses LUNA_MODEL').toEqual({
      scansMoreThan500Files: true,
      scansBothRoots: true,
      counts: HISTORICAL_LUNA_ALLOWLIST,
      violations: [],
    });
  });

  it('reports a planted occurrence from an in-memory file map', () => {
    // Every expectation below is counted by hand from the literal texts in this test.
    const allowlist = { 'tools/history.ts': 2 };
    const history = "export const A = 'gpt-5.6-luna';\nexport const B = 'gpt-5.6-luna-blind';\n";
    const cases: Record<string, ReadonlyMap<string, string>> = {
      atItsAllowance: new Map([
        ['tools/history.ts', history],
        ['tools/live.ts', "export const ROUTE = 'gpt-6-luna';\n"],
      ]),
      plantedInASrcComment: new Map([
        ['tools/history.ts', history],
        ['src/vtt/agent-adapters/codex.ts', "const argv = ['-m', model];\n\n// e.g. gpt-5.6-luna\n"],
      ]),
      oneAboveTheAllowance: new Map([
        ['tools/history.ts', `${history}export const C = { model: 'gpt-5.6-luna' };\n`],
      ]),
      twoOnOneLine: new Map([
        ['tools/history.ts', history],
        ['tools/rl/new-route.ts', "run('--model', 'gpt-5.6-luna', '--arm', 'gpt-5.6-luna-low');\n"],
      ]),
      belowTheAllowance: new Map([
        ['tools/history.ts', "export const A = 'gpt-5.6-luna';\n"],
      ]),
      allowlistedFileMissing: new Map([
        ['tools/live.ts', "export const ROUTE = 'gpt-6-luna';\n"],
      ]),
      outsideTheScannedRoots: new Map([
        ['tools/history.ts', history],
        ['tests/unit/tools/route.test.ts', "expect(model).toBe('gpt-5.6-luna');\n"],
        ['docs/notes.md', 'gpt-5.6-luna\n'],
        ['scripts/run.mjs', "'gpt-5.6-luna'\n"],
        ['toolsx/route.ts', "'gpt-5.6-luna'\n"],
        ['srcx/route.ts', "'gpt-5.6-luna'\n"],
      ]),
    };
    const reports = Object.fromEntries(Object.entries(cases).map(([name, files]) =>
      [name, scanForHistoricalLunaLiteral(files, allowlist)]));
    expect(reports).toEqual({
      atItsAllowance: { counts: { 'tools/history.ts': 2 }, violations: [] },
      plantedInASrcComment: {
        counts: { 'src/vtt/agent-adapters/codex.ts': 1, 'tools/history.ts': 2 },
        violations: ['src/vtt/agent-adapters/codex.ts: gpt-5.6-luna found 1, allowed 0, at lines 3'],
      },
      oneAboveTheAllowance: {
        counts: { 'tools/history.ts': 3 },
        violations: ['tools/history.ts: gpt-5.6-luna found 3, allowed 2, at lines 1, 2, 3'],
      },
      twoOnOneLine: {
        counts: { 'tools/history.ts': 2, 'tools/rl/new-route.ts': 2 },
        violations: ['tools/rl/new-route.ts: gpt-5.6-luna found 2, allowed 0, at lines 1, 1'],
      },
      belowTheAllowance: {
        counts: { 'tools/history.ts': 1 },
        violations: ['tools/history.ts: gpt-5.6-luna found 1, allowed 2 (a stale allowance: lower or remove the entry)'],
      },
      allowlistedFileMissing: {
        counts: {},
        violations: ['tools/history.ts: gpt-5.6-luna found 0, allowed 2 (a stale allowance: lower or remove the entry)'],
      },
      outsideTheScannedRoots: { counts: { 'tools/history.ts': 2 }, violations: [] },
    });
  });
});
