import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

/**
 * THE `.ai/` LIBRARY IS DENSE WITH ABSOLUTE LINE ANCHORS, AND NOTHING WATCHED
 * THEM.
 *
 * `.ai/` cites the tree by `file:line` — `src/domain/contracts/tables.ts:165` —
 * and by bare line inside a file-scoped list: ``  `sqlBoolean` (`:67`)  ``.
 * Every one of them was exact when written. Inserting a single line near the
 * top of `codecs.ts` or `tables.ts` silently invalidates a whole table of them,
 * and a reference that confidently points at the wrong line is worse than one
 * that says nothing: it is believed.
 *
 * That accuracy was a snapshot. This test makes it a property.
 *
 * It is deliberately a check on the DOCS, not on the code — the code is free to
 * move, and when it does this test names the anchors that have to move with it.
 *
 * THREE CLASSES OF ANCHOR, checked as strongly as each admits:
 *
 *   1. `[text](path)` links          → the target exists.
 *   2. `path/to/file.ts:N` (or :N-M) → the file exists and has ≥ N lines.
 *   3. `` `Symbol` (`:N`) ``         → line N of the file that heads the list
 *                                      actually CONTAINS `Symbol`.
 *
 * Class 3 is the strong one, and it is the shape most of the volatile anchors
 * use. Class 2 can only bound the line number: a doc that says
 * `src/db/query.ts:41-51` names a comment, not a symbol, so there is nothing to
 * match against — an off-by-a-few there survives this test. Where an anchor
 * matters and can be written as class 3, prefer class 3.
 */

/**
 * `.ai/` ONLY, and `.claude/` deliberately NOT.
 *
 * The two directories make different promises. `.ai/` is a living reference: it
 * describes the tree as it is now, so an anchor that no longer resolves is a
 * defect. `.claude/decisions.md` and `.claude/assumptions/` are an append-only
 * CHRONOLOGICAL record — each entry states what was true at the moment it was
 * written, and a wave-3 finding citing `schema.test.ts:987` is a faithful record
 * of where that code was in wave 3. Rewriting those anchors to keep a test green
 * would be falsifying the log to satisfy a lint.
 *
 * So the rule is: the reference is held to the tree, the history is held to
 * itself. Scanning `.claude/` was tried and rejected for exactly this reason.
 */
const AI_DOCS = ['.ai'] as const;

function trackedFiles(): string[] {
  return execFileSync('git', ['ls-files', '-z'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
    .split('\0')
    .filter((path) => path !== '');
}

function markdownUnder(directory: string, files: string[]): string[] {
  return files.filter(
    (file) => file.startsWith(`${directory}/`) && file.endsWith('.md'),
  );
}

/**
 * Resolve a path as written in prose to a real tracked file.
 *
 * Docs cite both full paths (`src/db/codecs.ts`) and suffixes
 * (`db/schema/catalog-spells.ts`, `decisions.md`). A suffix is accepted only
 * when it identifies exactly ONE tracked file — an ambiguous citation is a
 * documentation bug in its own right, so it fails rather than guessing.
 */
function resolvePath(cited: string, files: string[]): string | null {
  if (files.includes(cited)) {
    return cited;
  }
  const matches = files.filter(
    (file) => file === cited || file.endsWith(`/${cited}`),
  );
  return matches.length === 1 ? matches[0]! : null;
}

function lineCount(file: string): number {
  return readFileSync(join(repoRoot, file), 'utf8').split('\n').length;
}

interface Anchor {
  readonly doc: string;
  readonly docLine: number;
  readonly raw: string;
  readonly detail: string;
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

describe('.ai reference anchors resolve', () => {
  const files = trackedFiles();
  const docs = AI_DOCS.flatMap((directory) => markdownUnder(directory, files));

  it('has documents to check', () => {
    // Guards against the whole suite silently passing on an empty file list —
    // a renamed directory would otherwise make every assertion below vacuous.
    expect(docs.length).toBeGreaterThan(5);
    expect(docs).toContain('.ai/guidelines/CODEBASE_GUIDE.md');
  });

  it('resolves every relative markdown link', () => {
    const broken: Anchor[] = [];
    for (const doc of docs) {
      const source = readFileSync(join(repoRoot, doc), 'utf8');
      const link = /\[[^\]]*\]\(([^)#\s]+)(?:#[^)\s]*)?\)/gu;
      let match = link.exec(source);
      while (match !== null) {
        const target = match[1]!;
        if (!/^(?:https?:|mailto:)/u.test(target)) {
          const resolved = join(repoRoot, doc, '..', target);
          if (!existsSync(resolved)) {
            broken.push({
              doc,
              docLine: lineOf(source, match.index),
              raw: target,
              detail: 'link target does not exist',
            });
          }
        }
        match = link.exec(source);
      }
    }
    expect(broken).toEqual([]);
  });

  it('points every file:line anchor at a line that exists', () => {
    const broken: Anchor[] = [];
    for (const doc of docs) {
      const source = readFileSync(join(repoRoot, doc), 'utf8');
      const anchor =
        /(?<![\w/.-])([A-Za-z0-9_][A-Za-z0-9_./-]*\.(?:ts|tsx|md|sql|json|css|html)):(\d+)(?:-(\d+))?/gu;
      let match = anchor.exec(source);
      while (match !== null) {
        const cited = match[1]!;
        const last = Number(match[3] ?? match[2]!);
        const resolved = resolvePath(cited, files);
        if (resolved === null) {
          broken.push({
            doc,
            docLine: lineOf(source, match.index),
            raw: match[0]!,
            detail: 'no unique tracked file matches that path',
          });
        } else if (last > lineCount(resolved)) {
          broken.push({
            doc,
            docLine: lineOf(source, match.index),
            raw: match[0]!,
            detail: `${resolved} has only ${lineCount(resolved)} lines`,
          });
        }
        match = anchor.exec(source);
      }
    }
    expect(broken).toEqual([]);
  });

  it('lands every `Symbol` (`:N`) anchor on a line naming that symbol', () => {
    const broken: Anchor[] = [];
    for (const doc of docs) {
      const source = readFileSync(join(repoRoot, doc), 'utf8');
      // A bare `:N` binds to the most recent fully-qualified file mentioned in
      // the document — the way these lists are actually written:
      //   `src/db/codecs.ts`:
      //   - `SqlRow` (`:4`) — …
      const token =
        /`([A-Za-z0-9_./-]+\.(?:ts|tsx|sql))`|`([A-Za-z_$][\w$]*)`\s*\(`:(\d+)`\)/gu;
      let context: string | null = null;
      let match = token.exec(source);
      while (match !== null) {
        if (match[1] !== undefined) {
          const resolved = resolvePath(match[1], files);
          if (resolved !== null) {
            context = resolved;
          }
        } else {
          const symbol = match[2]!;
          const line = Number(match[3]!);
          const docLine = lineOf(source, match.index);
          if (context === null) {
            broken.push({
              doc,
              docLine,
              raw: match[0]!,
              detail: 'bare line anchor with no file named before it',
            });
          } else {
            const lines = readFileSync(join(repoRoot, context), 'utf8').split(
              '\n',
            );
            const text = lines[line - 1];
            if (text === undefined || !text.includes(symbol)) {
              broken.push({
                doc,
                docLine,
                raw: `${context}:${line} should name \`${symbol}\``,
                detail:
                  text === undefined
                    ? 'line does not exist'
                    : `line reads: ${text.trim().slice(0, 80)}`,
              });
            }
          }
        }
        match = token.exec(source);
      }
    }
    expect(broken).toEqual([]);
  });

  it('catches an anchor that has drifted', () => {
    // The guard's own test: prove the class-3 check can fail, using a symbol
    // that really is on a known line and a line number that really is wrong.
    const codecs = readFileSync(join(repoRoot, 'src/db/codecs.ts'), 'utf8')
      .split('\n')
      .findIndex((line) => line.includes('export type RowCodec'));
    expect(codecs, 'RowCodec must be findable in codecs.ts').toBeGreaterThan(-1);

    const truthful = `\`src/db/codecs.ts\`:\n- \`RowCodec\` (\`:${codecs + 1}\`)`;
    const drifted = `\`src/db/codecs.ts\`:\n- \`RowCodec\` (\`:${codecs + 9}\`)`;
    const check = (markdown: string): boolean => {
      const lines = readFileSync(
        join(repoRoot, 'src/db/codecs.ts'),
        'utf8',
      ).split('\n');
      const found = /`([A-Za-z_$][\w$]*)`\s*\(`:(\d+)`\)/u.exec(markdown)!;
      return (lines[Number(found[2]!) - 1] ?? '').includes(found[1]!);
    };
    expect(check(truthful), 'the true anchor must verify').toBe(true);
    expect(check(drifted), 'the drifted anchor must not').toBe(false);
  });
});
