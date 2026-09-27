import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from '../../helpers/test-filesystem';

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
 */
const HISTORICAL_LUNA_ALLOWLIST: Readonly<Record<string, number>> = Object.freeze({
  'tools/ai-dm-rerun-packet.ts': 2,
  'tools/d569-blind-experiment.ts': 23,
  'tools/d569-v5/analyze-primary-pair.ts': 4,
  'tools/d569-v5/validate-first-arm.ts': 1,
  'tools/model-routes.ts': 1,
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
 * Every file under the scanned roots that `git add -A` would commit in the repository at `root`: tracked files plus
 * untracked files that are not ignored. Ignored scratch (for example a mutation backup under .tmp-*) is not code and
 * is not scanned. A listing that fails, or that holds no file, throws: a guard that scans nothing proves nothing.
 */
function scannedRepositoryFiles(root: string, env: NodeJS.ProcessEnv = process.env): Map<string, string> {
  const listing = spawnSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...SCANNED_ROOTS],
    { cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  if (listing.error !== undefined || listing.status !== 0) {
    const reason = listing.error?.message ?? `git ls-files exited ${listing.status}: ${listing.stderr.trim()}`;
    throw new Error(`the Luna guard could not list the files of ${root}: ${reason}`);
  }
  const paths = listing.stdout.split('\0').filter((entry) => entry !== '');
  if (paths.length === 0) {
    throw new Error(`the Luna guard found no file under ${SCANNED_ROOTS.join(' or ')} in ${root}: ` +
      'a scan of nothing proves nothing');
  }
  const files = new Map<string, string>();
  for (const path of paths) {
    const absolute = join(root, path);
    // A tracked file deleted in the working tree has no bytes that could hold the literal.
    if (!existsSync(absolute)) continue;
    files.set(path, readFileSync(absolute, 'utf8'));
  }
  return files;
}

/** git cut off from this machine's configuration and ignore files, and from any repository that encloses `scratch`. */
function isolatedGitEnvironment(scratch: string): NodeJS.ProcessEnv {
  const inherited = Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'));
  return {
    ...Object.fromEntries(inherited),
    GIT_CEILING_DIRECTORIES: scratch,
    GIT_CONFIG_GLOBAL: join(scratch, 'no-global-gitconfig'),
    GIT_CONFIG_NOSYSTEM: '1',
    XDG_CONFIG_HOME: join(scratch, 'no-xdg-config'),
  };
}

/** Writes each file under `root`, each holding the text `// <path>: 'gpt-5.6-luna'`, so a read names its source. */
function writeLiteralFiles(root: string, paths: readonly string[]): void {
  for (const path of paths) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), `// ${path}: '${HISTORICAL_LUNA_LITERAL}'`);
  }
}

describe('LUNA6 historical Luna literal guard', () => {
  it('forbids gpt-5.6-luna in tools/ and src/ outside the exact historical allowlist', () => {
    const files = scannedRepositoryFiles(repoRoot);
    const report = scanForHistoricalLunaLiteral(files, HISTORICAL_LUNA_ALLOWLIST);
    expect({
      // Vacuity guard: the enumerator refuses an empty listing; a partial one would match an empty report while
      // proving nothing.
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

  it('lists the files git add -A would commit under src/ and tools/ and refuses an empty or failed listing', () => {
    // Throwaway repositories hold one file of each kind the listing must tell apart. Every expectation below is typed
    // by hand from the paths written here and from git's own messages; none is read back from a scan.
    const scratch = mkdtempSync(join(tmpdir(), 'dnd-luna6-guard-'));
    try {
      const env = isolatedGitEnvironment(scratch);
      const git = (cwd: string, args: readonly string[]): void => {
        execFileSync('git', args, { cwd, env, stdio: 'pipe' });
      };
      const mixed = join(scratch, 'mixed');
      writeLiteralFiles(mixed, [
        'src/tracked.ts',
        'tools/untracked.ts',
        'tools/.tmp-mutation/ignored.ts',
        'tools/deleted-from-the-working-tree.ts',
        'docs/tracked-outside-the-roots.md',
      ]);
      writeFileSync(join(mixed, '.gitignore'), '.tmp-*\n');
      git(mixed, ['init', '-q']);
      git(mixed, ['add', '--', 'src/tracked.ts', 'tools/deleted-from-the-working-tree.ts',
        'docs/tracked-outside-the-roots.md']);
      rmSync(join(mixed, 'tools/deleted-from-the-working-tree.ts'));
      const nothingUnderTheRoots = join(scratch, 'nothing-under-the-roots');
      writeLiteralFiles(nothingUnderTheRoots, ['docs/untracked-outside-the-roots.md']);
      git(nothingUnderTheRoots, ['init', '-q']);
      const notARepository = join(scratch, 'not-a-repository');
      writeLiteralFiles(notARepository, ['src/plain.ts']);
      const scan = (root: string) => {
        try {
          return { ok: Object.fromEntries(scannedRepositoryFiles(root, env)) };
        } catch (error) {
          return { error: (error instanceof Error ? error.message : String(error)).replaceAll(scratch, '<scratch>') };
        }
      };
      expect({
        trackedUntrackedAndIgnored: scan(mixed),
        nothingUnderTheRoots: scan(nothingUnderTheRoots),
        notARepository: scan(notARepository),
        missingDirectory: scan(join(scratch, 'missing')),
      }).toEqual({
        trackedUntrackedAndIgnored: {
          ok: {
            'src/tracked.ts': "// src/tracked.ts: 'gpt-5.6-luna'",
            'tools/untracked.ts': "// tools/untracked.ts: 'gpt-5.6-luna'",
          },
        },
        nothingUnderTheRoots: {
          error: 'the Luna guard found no file under src/ or tools/ in <scratch>/nothing-under-the-roots: ' +
            'a scan of nothing proves nothing',
        },
        notARepository: {
          error: 'the Luna guard could not list the files of <scratch>/not-a-repository: git ls-files exited 128: ' +
            'fatal: not a git repository (or any of the parent directories): .git',
        },
        missingDirectory: {
          error: 'the Luna guard could not list the files of <scratch>/missing: spawnSync git ENOENT',
        },
      });
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
});
