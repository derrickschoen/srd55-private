import { execFileSync } from 'node:child_process';
import { readFileSync } from '../../helpers/test-filesystem';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

/**
 * THE HOLE THE TYPE SYSTEM CANNOT CLOSE.
 *
 * `tests/types/codec-required.type-test.ts` proves that `db.all` / `db.one`
 * cannot be called without a codec. It cannot prove the codec DOES anything:
 * `db.all(sql, bind, (row) => row)` satisfies every one of those assertions and
 * decodes nothing. Types cannot tell an identity function from a decoder,
 * because there is nothing in the type to tell them apart — `RowCodec<SqlRow>`
 * is a perfectly well-formed instantiation.
 *
 * So this is a guard, not a type test, and it asks the ARTIFACT rather than the
 * intention — the same shape as
 * `tests/unit/tools/scraped-output-is-never-committed.test.ts`, which asks
 * `git ls-files` rather than trusting `.gitignore`. Here the artifact is the
 * tracked source text.
 *
 * WHY THIS IS NOT JUST STYLE POLICING. A passthrough codec is a specific
 * defect: it makes a read look decoded in review while returning exactly what
 * the codec-less version returned. There is a legitimate answer for "I want the
 * raw row" and it has a NAME — `allRaw` / `oneRaw` — so a passthrough in the
 * codec slot is never the shortest honest way to say anything.
 *
 * A codec that reads ONE column and returns it (`(row) => sqlString(row, 'x')`)
 * is not a passthrough and is not matched: it decodes.
 *
 * WHAT THIS GUARD CATCHES, AND WHAT IT DOES NOT.
 *
 * The honest contract, because a guard that overstates its reach is worse than
 * one that states a narrow reach accurately. Within a single tracked `.ts`
 * file it catches, in a codec slot:
 *
 *   1. an inline passthrough arrow — identity, `row as …` cast, or an object
 *      literal spreading the row (`{ ...row, extra: 1 }` included: every column
 *      still arrives undecoded, and the decoy key is the point);
 *   2. a passthrough arrow hoisted to a `const`/`let` in the SAME file and then
 *      named in the slot — the shape `DEEP_REF_DATA_LAYER.md` actively asks for
 *      ("where a codec is used more than once, hoist and name it");
 *   3. a passthrough arrow annotated `RowCodec<…>` anywhere in the file, used
 *      or not, because the annotation already declares the intent.
 *
 * It does NOT catch an UNANNOTATED passthrough imported from another module
 * (an annotated one is still caught by 3, wherever it lives, because the scan
 * covers every tracked file), nor one built by a factory (`makeCodec()`), nor
 * an old-style `<T>row` cast. Those need type information this guard does not
 * have. Nor does it read a parameter type annotation longer than
 * {@link MAX_ANNOTATION_CHARS} characters: that bound is what keeps the scan
 * linear, and a test below pins exactly where it falls. Each of these was
 * measured, not assumed. It is a net with a known mesh size, not
 * a proof — the proof of REQUIREDNESS is the type test; this is the proof that
 * the required argument is not trivially satisfied in the ways people actually
 * reach for.
 */

function trackedTypeScriptFiles(): string[] {
  const stdout = execFileSync('git', ['ls-files', '-z', '--', '*.ts'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout
    .split('\0')
    .filter((path) => path !== '');
}

/**
 * Where a passthrough arrow's body ends: an argument separator, a close paren,
 * or a statement end. Deliberately NOT a newline — `(row) => row` followed by a
 * newline and `.map(…)` is a method chain on a decoded value, not a passthrough,
 * and treating end-of-line as a terminator would flag it.
 */
const ENDS = String.raw`(?=\s*[,);]|\s*$)`;

/**
 * The longest parameter type annotation the patterns read, in characters: the
 * text between the parameter's `:` and the `)` that closes its list.
 *
 * WHY THERE IS A BOUND. Unbounded (`[^)]*`), a pattern that meets a name
 * followed by `:` reads forward to the next `)`, and it does that again at the
 * next such name. On text with thousands of names-with-colons and hardly a
 * parenthesis, that is quadratic. Generated data is exactly that text:
 * `src/rules/srd/generated/rule-index.ts` is one 406 KB initialiser with about
 * 11,000 `…txt:NNN` spans and 3 parentheses, and when it joined the tree this
 * scan went from 2.4 s to 20.8 s, 18.6 s of it on that one initialiser
 * (D937). Bounded, every name-with-colon costs at most this many characters,
 * so the scan is linear in the text.
 *
 * WHY THIS NUMBER. Measured on the tree, not assumed: the longest typed
 * parameter list without a nested parenthesis in any tracked `.ts` file is 410
 * characters (an inline object type in `src/vtt/mcp/engine-server.ts`); the
 * 99th percentile is 138. A codec's parameter is `row` or `row: SqlRow`. An
 * annotation longer than this is a blind spot the "reads a parameter
 * annotation of up to 1,024 characters…" test pins, not a silent one.
 */
const MAX_ANNOTATION_CHARS = 1024;
const ANNOTATION = String.raw`[^)]{0,${MAX_ANNOTATION_CHARS}}`;

/**
 * The parameter is a WHOLE name: not preceded by a name character.
 *
 * The cast and spread patterns may start without a `(`, so without this they
 * start again at every tail of every name (`txt`, `xt`, `t`), which multiplies
 * the cost by the name's length, and they match `(subRow) => Row as T`, which
 * hands back an outer `Row`, not its parameter. A name that IS the parameter
 * always starts a name, so no passthrough is lost. The bare-arrow pattern has
 * carried this lookbehind (with `)` added) since the guard was written.
 */
const WHOLE_NAME = String.raw`(?<![\w$])`;

/**
 * An arrow that hands back what it was given.
 *
 * Written longhand over the spellings that actually occur rather than as one
 * clever pattern, because a reader has to be able to see what is and is not
 * caught. Each is anchored with {@link ENDS}.
 */
const PASSTHROUGH_ARROWS: readonly RegExp[] = [
  // (row) => row      /  ( row ) => row
  new RegExp(String.raw`\(\s*([A-Za-z_$][\w$]*)\s*\)\s*=>\s*\1\s*` + ENDS, 'u'),
  // row => row
  new RegExp(
    String.raw`(?<![\w$)])([A-Za-z_$][\w$]*)\s*=>\s*\1\s*` + ENDS,
    'u',
  ),
  // (row: SqlRow) => row
  new RegExp(
    String.raw`\(\s*([A-Za-z_$][\w$]*)\s*:` +
      ANNOTATION +
      String.raw`\)\s*=>\s*\1\s*` +
      ENDS,
    'u',
  ),
  // (row) => row as unknown as Whatever   /  (row) => row as Whatever
  // The unchecked cast is the worst of the family: it launders an undecoded row
  // into a named type, which is the exact defect class `DEEP_REF_DATA_LAYER.md`
  // §3 says the codec requirement exists to remove.
  new RegExp(
    String.raw`\(?\s*` +
      WHOLE_NAME +
      String.raw`([A-Za-z_$][\w$]*)\s*(?::` +
      ANNOTATION +
      String.raw`)?\)?\s*=>\s*\1\s+as\s`,
    'u',
  ),
  // (row) => ({ ...row })  /  (row) => ({ ...row, extra: 1 })
  // Any object literal that spreads the parameter: the added keys are a decoy,
  // every original column still arrives exactly as SQLite returned it.
  new RegExp(
    String.raw`\(?\s*` +
      WHOLE_NAME +
      String.raw`([A-Za-z_$][\w$]*)\s*(?::` +
      ANNOTATION +
      String.raw`)?\)?\s*=>\s*\(?\s*\{\s*\.\.\.\1\b`,
    'u',
  ),
];

function isPassthrough(text: string): boolean {
  return PASSTHROUGH_ARROWS.some((pattern) => pattern.test(text));
}

interface Offence {
  readonly file: string;
  readonly line: number;
  readonly text: string;
}

/**
 * The ONE file exempt from the scan, spelled out longhand: this one.
 *
 * It has to contain passthrough codecs — the decoy cases below are how the
 * patterns above are proved to still match anything at all. A glob would let a
 * second file join it invisibly; written as one literal string, adding another
 * is a diff a reviewer sees. This is the `SENTINEL_ALLOWLIST` shape from
 * `tests/unit/tools/scraped-output-is-never-committed.test.ts`.
 */
const SELF = 'tests/unit/db/codec-slot-is-never-an-identity.test.ts';

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split('\n').length;
}

/**
 * The slice of a decoded-read call that could hold a codec.
 *
 * Deliberately crude — it takes the text from the call's opening parenthesis to
 * its matching close, and asks what appears anywhere in it. A false positive
 * would be a passthrough arrow passed as a BIND value, which is not a thing
 * (`QueryBindings` holds no functions), and the price of crudeness is that it
 * also reads nested calls, which can only over-report.
 *
 * Both spellings of the decoded read are covered: the `DatabaseContext` methods
 * `.all` / `.one`, and the exported free functions `queryAll` / `queryOne` they
 * delegate to. `DatabaseContext` is their only caller today, but the free
 * functions are exported, so the guard does not assume that stays true.
 */
function callArgumentSlices(source: string): { start: number; text: string }[] {
  const slices: { start: number; text: string }[] = [];
  // `(?<!Promise)` because `Promise.all([...])` is not a database read and its
  // argument list is full of arrows. Verified against this tree: without the
  // lookbehind the scan reports `src/ui/screens/planner/screen.ts`.
  const opener =
    /(?<!Promise)\.(?:all|one)\s*(?:<[^(]*>)?\s*\(|\bquery(?:All|One)\s*(?:<[^(]*>)?\s*\(/gu;
  let match = opener.exec(source);
  while (match !== null) {
    let depth = 0;
    let index = match.index + match[0].length - 1;
    const start = index;
    for (; index < source.length; index += 1) {
      const character = source[index];
      if (character === '(') {
        depth += 1;
      } else if (character === ')') {
        depth -= 1;
        if (depth === 0) {
          break;
        }
      }
    }
    slices.push({ start, text: source.slice(start, index + 1) });
    match = opener.exec(source);
  }
  return slices;
}

interface Binding {
  readonly name: string;
  readonly line: number;
  readonly annotated: boolean;
  readonly text: string;
}

/**
 * Names bound to a passthrough arrow in this file, and whether the binding is
 * annotated `RowCodec<…>`.
 *
 * An annotated one is an offence on sight — the annotation says "this is a
 * codec" and the body says "it decodes nothing". An unannotated one is only an
 * offence once the name turns up in a codec slot, because `const same = (x) =>
 * x;` is a legitimate thing to write for any number of non-database reasons.
 */
function passthroughBindings(source: string): Binding[] {
  const found: Binding[] = [];
  const declaration = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(:[^=;]*)?=/gu;
  let match = declaration.exec(source);
  while (match !== null) {
    const afterEquals = match.index + match[0].length;
    const semicolon = source.indexOf(';', afterEquals);
    const initialiser = source.slice(
      afterEquals,
      semicolon === -1 ? source.length : semicolon + 1,
    );
    if (isPassthrough(initialiser)) {
      found.push({
        name: match[1]!,
        line: lineOf(source, match.index),
        annotated: /RowCodec\s*</u.test(match[2] ?? ''),
        text: initialiser.replaceAll(/\s+/gu, ' ').slice(0, 120),
      });
    }
    match = declaration.exec(source);
  }
  return found;
}

function scan(file: string, source: string): Offence[] {
  const offences: Offence[] = [];
  const slices = callArgumentSlices(source);
  for (const slice of slices) {
    if (isPassthrough(slice.text)) {
      offences.push({
        file,
        line: lineOf(source, slice.start),
        text: slice.text.replaceAll(/\s+/gu, ' ').slice(0, 120),
      });
    }
  }
  for (const binding of passthroughBindings(source)) {
    const namedInASlot = slices.some((slice) =>
      new RegExp(String.raw`(?<![\w$.])${binding.name}(?![\w$])`, 'u').test(
        slice.text,
      ),
    );
    if (binding.annotated || namedInASlot) {
      offences.push({ file, line: binding.line, text: binding.text });
    }
  }
  return offences;
}

describe('the codec slot never holds a passthrough', () => {
  it('finds no passthrough codec in any decoded read, anywhere in the tree', () => {
    const offences: Offence[] = [];
    const files = trackedTypeScriptFiles();
    // Fail loudly if the exemption stops naming a real tracked file, rather than
    // exempting nothing and looking green.
    expect(files, 'the self-exemption must name a tracked file').toContain(SELF);
    for (const file of files) {
      if (file === SELF) {
        continue;
      }
      const source = readFileSync(join(repoRoot, file), 'utf8');
      if (
        !source.includes('.all') &&
        !source.includes('.one') &&
        !source.includes('RowCodec') &&
        !source.includes('query')
      ) {
        continue;
      }
      offences.push(...scan(file, source));
    }
    expect(offences).toEqual([]);
  });

  it('catches every spelling it claims to catch', () => {
    // The guard's own test. Without this, a regex that silently stopped matching
    // would leave the check above passing forever on an empty search. Every
    // entry here is a variant that was PROVED to slip past an earlier version of
    // this guard by injecting it into `src/db/database.ts` and watching the scan
    // stay green.
    const decoys = [
      'db.all(sql, bind, (row) => row);',
      'db.one(sql, bind, row => row);',
      'db.all(sql, undefined, (row: SqlRow) => row);',
      'db.all(sql, bind, (row) => ({ ...row }));',
      'db.one<SqlRow>(sql, bind, (r) => r);',
      // the cast launderer
      'db.all(sql, undefined, (row) => row as unknown as { id: number });',
      'db.one(sql, undefined, (row) => row as CharacterRow);',
      // the spread with a decoy key
      'db.all(sql, undefined, (row) => ({ ...row, extra: 1 }));',
      // the free functions, not just the methods
      'queryAll(db, sql, undefined, (row) => row);',
      'queryOne(db, sql, undefined, (row) => row);',
    ];
    for (const decoy of decoys) {
      const slices = callArgumentSlices(decoy);
      expect(slices, decoy).toHaveLength(1);
      expect(isPassthrough(slices[0]!.text), decoy).toBe(true);
    }
  });

  it('catches a passthrough hoisted out of the call', () => {
    // The evasion that defeated the first version of this guard entirely:
    // move the identity one line up and the argument-slice scan never sees it.
    const hoisted = [
      "const passthrough: RowCodec<SqlRow> = (row) => row;\ndb.all('SELECT 1', undefined, passthrough);",
      "const passthrough = (row) => row;\ndb.all('SELECT 1', undefined, passthrough);",
      'const launder = (row) => row as unknown as { id: number };\nqueryAll(db, sql, undefined, launder);',
      // annotated is an offence even with no call site at all
      'const unused: RowCodec<SqlRow> = (row) => row;',
    ];
    for (const source of hoisted) {
      expect(scan('probe.ts', source), source).not.toEqual([]);
    }
  });

  it('leaves a real codec alone', () => {
    const genuine = [
      "db.all(sql, bind, (row) => sqlString(row, 'name'));",
      'db.all(sql, bind, rowId);',
      "db.one(sql, bind, (row) => ({ id: sqlInteger(row, 'id') }));",
      // A `.map` that IS an identity is not a codec and is not this guard's
      // business — it is outside the argument list.
      'db.all(sql, bind, rowId).map((row) => row);',
      // A method chain off a decoded value: `=> row` is followed by a newline
      // and a `.`, which is not a terminator.
      'db.all(sql, bind, (row) => row\n  .toString());',
      // An unannotated identity that never reaches a codec slot is not this
      // guard's business either.
      'const same = (x) => x;\nconst y = [1].map(same);',
      // A codec that spreads something OTHER than the row is decoding.
      'db.all(sql, bind, (row) => ({ ...defaults, id: sqlInteger(row, "id") }));',
    ];
    for (const source of genuine) {
      expect(scan('probe.ts', source), source).toEqual([]);
    }
  });

  it('reads a parameter annotation of up to 1,024 characters, and not one character further', () => {
    // The bound's own test: where the mesh falls, pinned on all three spellings
    // that take an annotated parameter. A short annotation and one of exactly
    // 1,024 characters are caught; 1,025 is the stated blind spot. The lengths
    // are written out rather than read from MAX_ANNOTATION_CHARS, so moving
    // the bound is a diff to this test too: a lower bound fails the second
    // case, a higher or removed one the third.
    const annotationOf = (length: number): string =>
      ' Readonly<Record<string, unknown>>'.padEnd(length, ' ');
    expect(annotationOf(1024)).toHaveLength(1024);
    expect(annotationOf(1025)).toHaveLength(1025);
    const spellings = [
      (annotation: string) => `db.all(sql, bind, (row:${annotation}) => row);`,
      (annotation: string) =>
        `db.one(sql, bind, (row:${annotation}) => row as CharacterRow);`,
      (annotation: string) =>
        `db.all(sql, bind, (row:${annotation}) => ({ ...row, extra: 1 }));`,
    ];
    for (const spelling of spellings) {
      const short = spelling(' SqlRow');
      const atTheBound = spelling(annotationOf(1024));
      const overTheBound = spelling(annotationOf(1025));
      expect(scan('probe.ts', short), short).toHaveLength(1);
      expect(scan('probe.ts', atTheBound), 'at the bound').toHaveLength(1);
      expect(scan('probe.ts', overTheBound), 'one over the bound').toEqual([]);
    }
  });

  it('takes the parameter as a whole name, never the tail of a longer one', () => {
    // `Row` is the tail of `subRow`, but these arrows hand back an outer `Row`,
    // not their parameter. See WHOLE_NAME.
    const tails = [
      'db.all(sql, bind, (subRow) => Row as CharacterRow);',
      'db.all(sql, bind, (subRow: SqlRow) => ({ ...Row }));',
    ];
    for (const source of tails) {
      expect(scan('probe.ts', source), source).toEqual([]);
    }
  });

  it('reads a generated-artifact-sized initialiser to its end', () => {
    // The shape that made the unbounded patterns quadratic (D937): one
    // initialiser of hundreds of KB with thousands of names-with-colons and no
    // `)`, like `src/rules/srd/generated/rule-index.ts`. Kept here so the shape
    // stays under test whatever the tree's artifacts become. The passthrough
    // planted at its very end must still be found, so the cost was not cut by
    // truncating the initialiser or skipping large text. It is a spread on
    // purpose: only the last pattern matches it, so the cast and spread
    // patterns (the two that were quadratic) both read the whole initialiser
    // first. Cost itself is not asserted (a timing assertion is
    // load-dependent); a return of the quadratic shows up as this test's
    // timeout. The size is set for that: 4,000 entries took 4.0 s solo with
    // the bound removed, under the timeout; 8,000 is about four times that.
    const entries = Array.from(
      { length: 8000 },
      (_, index) =>
        `  "rule.${index}": { "kind": "rule_section", "spans": ["docs/srd/full/srd-5.2.1.txt:${index}-${index}@left"] },`,
    );
    const source = [
      'export const INDEX = {',
      ...entries,
      '  codec: (row) => ({ ...row }),',
      '} as const;',
      'db.all(sql, undefined, INDEX.codec);',
    ].join('\n');
    expect(source.length).toBeGreaterThan(600_000);
    const offences = scan('probe.ts', source);
    expect(offences).toHaveLength(1);
    expect(offences[0]).toMatchObject({ file: 'probe.ts', line: 1 });
  });
});
