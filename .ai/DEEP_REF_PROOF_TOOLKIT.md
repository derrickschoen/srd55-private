# Deep Reference: The Proof Toolkit

> Parent: [CODEBASE_GUIDE.md](guidelines/CODEBASE_GUIDE.md)
>
> If this file disagrees with `.claude/decisions.md`, decisions.md wins and this
> file is the bug.

---

`.claude/decisions.md` records that proofs were done. It does not teach how. This
file does — four techniques, each with a worked example in the tree and the
command that re-runs it.

Its other job is **rule 2** from the hub: the `.ai/` genre for a number is the
command that produces it, never the number. Everything below is a command.

---

## 1. A type-level proof, without `@ts-expect-error`

**Use when:** the claim is "this cannot compile". A runtime assertion cannot
prove it. `expect(db.all.length)` reads `Function.prototype.length`, which is
erased-at-runtime arity and says nothing about whether TypeScript would accept a
two-argument call. The only oracle for "does this compile" is the compiler.

**The obstacle:** `@ts-expect-error` is forbidden here, and rightly — a stray one
silences a real error just as happily as a fake one. So the usual negative-type-
test idiom is unavailable.

**The technique:** write a POSITIVE assertion about a NEGATIVE property.

```ts
type Assert<T extends true> = T;
type Exact<A, B> =
  (<G>() => G extends A ? 1 : 2) extends (<G>() => G extends B ? 1 : 2)
    ? true : false;

type P = Parameters<DatabaseContext['all']>;

type _ArityIsExactlyThree   = Assert<Exact<P['length'], 3>>;      // optional param widens to 2 | 3
type _CodecRejectsUndefined = Assert<undefined extends P[2] ? false : true>;
type _CodecIsARowCodec      = Assert<P[2] extends RowCodec<unknown> ? true : false>;
```

A claim that becomes false is `TS2344: Type 'false' does not satisfy the
constraint 'true'` — an ordinary compile error with no suppression comment
anywhere near it.

**Where it runs:** `tsconfig.node.json` includes `tests`, so `tsc -b` compiles
it. It rides `npm run typecheck` and `npm run build` for free. Name the file
`*.type-test.ts` so vitest's `tests/**/*.test.ts` glob does not collect a file
containing no tests.

**Worked example:** `tests/types/codec-required.type-test.ts`, fifteen
assertions.

**Three things that make it a proof rather than a decoration:**

- `Exact` uses invariant-position identity (the two-conditional trick), so it
  does not accept a merely-assignable near miss the way `extends` would.
- Arity and "rejects undefined" are BOTH asserted. Arity alone is not enough —
  `codec: RowCodec<T> | undefined` keeps the length at 3 while still admitting
  `db.all(sql, bind, undefined)`.
- It was **measured in both directions before being committed**, which is the
  part most such files skip.

### The re-measurement recipe

Mutate the signature the assertions are about, compile, restore. It does not
matter whether the work is committed, stashed, or in progress:

```sh
cd /path/to/worktree
cp src/db/database.ts src/db/query.ts /tmp/                # keep the required version
perl -pi -e 's/codec: RowCodec<T>,/codec?: RowCodec<T>,/' src/db/database.ts src/db/query.ts
rm -f /tmp/dnd-multiclass-spells-static-*.tsbuildinfo      # see §3: incremental info lies
npx tsc -p tsconfig.node.json --noEmit 2>&1 | grep tests/types
# expect: 8 × TS2344 "Type 'false' does not satisfy the constraint 'true'"

cp /tmp/database.ts /tmp/query.ts src/db/
npx tsc -p tsconfig.node.json --noEmit 2>&1 | grep tests/types
# expect: no output
```

**Do not reach for `git stash` here**, however natural it looks. Stashing
`src/db/*.ts` proves the assertions only while the change is *uncommitted* —
stash reverts to `HEAD`, so the moment the work lands, stash finds nothing to
save and the recipe silently measures the new code against itself. It fails
loudly rather than wrongly, but it stops being a proof. The `perl` edit above
names the property under test directly and keeps working forever.

**Two different numbers, and the difference matters.** The eight above are the
codec-requiredness assertions alone. Reverting both files wholesale to the
pre-change `c162901` produced **12** — those same 8 plus 4 × TS2339, because
`allRaw`/`oneRaw` did not exist yet and `Parameters<DatabaseContext['allRaw']>`
had nothing to resolve. That 12 is a historical measurement against one specific
parent commit, not a property of the test; the 8 is reproducible from any
checkout. Quote the 8.

A type test that has never been observed failing is not known to be able to fail.

### Why NOT to use overloads on anything you intend to prove

`Parameters<F>` resolves to the **last** overload only. An overload pair would
give an assertion like the above a silent blind spot in exactly the guarantee it
exists to make unforgeable. `src/db/query.ts:41-51` records this as the reason
`all`/`one` take an explicit `undefined` for `bind` instead of an
`(sql, codec)` convenience overload.

---

## 2. An artifact guard — asking the thing, not the intention

**Use when:** the property is real but not expressible in a type. Types cannot
tell an identity function from a decoder, cannot see what is tracked in git, and
cannot see what ended up in a bundle.

**The technique:** ask the artifact.

| Guard | Asks | Because |
|---|---|---|
| `tests/unit/tools/scraped-output-is-never-committed.test.ts` | `git ls-files` | `git add -f` tracks a file DESPITE an ignore rule, and from that moment `git check-ignore` is the wrong question. Demonstrated in a throwaway repo before it was written |
| `tests/unit/db/codec-slot-is-never-an-identity.test.ts` | tracked source text | `(row) => row` satisfies every type assertion in §1 and decodes nothing |
| `tests/unit/db/drizzle-is-build-time-only.test.ts` | the literal plugin registrations in `vite.config.ts` | a devDependency is not an enforcement boundary |
| `tests/unit/tools/scraper-is-never-in-the-bundle.test.ts` | the built bundle | — |
| `tests/unit/docs/ai-reference-anchors-resolve.test.ts` | the docs in this directory, against the tree | `.ai/` cites the tree by absolute line number; one inserted line silently invalidates a whole table of them, and a confident wrong anchor is worse than no anchor |

**Two properties every one of them has:**

1. **A longhand allowlist, never a glob**, so adding an exemption is a diff a
   reviewer sees. `SENTINEL_ALLOWLIST` in the scraped-output guard; the `SELF`
   constant in the codec guard.
2. **It tests itself.** The codec guard's second `it` runs its patterns against
   decoy strings, so a regex that silently stopped matching cannot leave the main
   scan passing forever on an empty search. Its third `it` runs them against
   genuine codecs to pin down what it must NOT match.

**Verify a guard fires.** Introduce the violation, watch it go red, remove it:

```sh
# e.g. add `probe() { return this.all('SELECT 1', undefined, (row) => row); }`
npx vitest run --configLoader runner tests/unit/db/codec-slot-is-never-an-identity.test.ts
```

A guard whose failure has never been observed is a guard nobody has tested.

---

## 3. The compiler as a census

**Use when:** you need to know how many call sites something touches, or which
ones. Grep guesses; the compiler knows.

**The technique:** make the thing required, compile, count the diagnostic.

```sh
# 1. tighten the signature (make the parameter required, remove the default, …)
rm -f /tmp/dnd-multiclass-spells-static-*.tsbuildinfo   # incremental build info WILL lie to you
npx tsc -b 2>&1 | sort -u > /tmp/err.txt

wc -l < /tmp/err.txt                                    # total unique diagnostics
grep -c TS2554 /tmp/err.txt                             # the sites you actually have to touch
grep TS2554 /tmp/err.txt | sed 's/(.*//' | sort | uniq -c | sort -rn   # per file, worst first
```

**Three things to know before you trust the number:**

- **Delete the `.tsbuildinfo` files first.** `tsc -b` is incremental; a stale one
  will under-report.
- **`sort -u` is not optional.** `src/` is compiled by BOTH `tsconfig.app.json`
  and `tsconfig.node.json`, so every `src/` diagnostic appears twice.
- **Separate the driver from the cascade.** `TS2554` is the count of sites you
  must edit. `TS2345` / `TS2339` / `TS18046` / `TS18048` are the SAME sites'
  downstream consumers seeing the type collapse, and they vanish when the site is
  fixed. Reporting the total as the work item overstates it by roughly 2×.

The error's line and column point at the member access, so the census can also
drive a mechanical rewrite: read the identifier at `(line, col)`, transform it,
apply the edits per file in **reverse order** so earlier positions stay valid.

**This technique also retires a wrong number.** F7 recorded "122 of 122 call
sites already pass a codec" on 2026-07-26; run against `c162901` the compiler
said 138 sites, 43 with a codec, 95 without. Not a criticism of F7 — a
demonstration of why the `.ai/` genre for a number is the command.

---

## 4. Counting what exists, today

Never copy one of these forward. Run it.

```sh
# tables in the generated schema
grep -c '^CREATE TABLE' src/db/schema.sql

# files importing the codecs / the row contracts
grep -rl 'db/codecs' --include=*.ts src/ | wc -l
grep -rl 'domain/contracts/rows' --include=*.ts src/ tests/ | wc -l

# decoded vs raw reads (swap src/ for tests/ to see the other skew)
grep -rPno '(?<!Promise)\.(all|one)\(' --include=*.ts src/ | wc -l
grep -rono '\.allRaw(\|\.oneRaw(' --include=*.ts src/ | wc -l

# test and file counts, build, browser
npm test
npm run build ; echo "exit=$?"
PLAYWRIGHT_PORT=4195 npx playwright test
```

**The `(?<!Promise)` is load-bearing, and so is the `-P`.** `Promise.all(` is
not a database read; there are three in `src/`, so the naive `grep -rono
'\.all(\|\.one('` overstates the decoded count by three.

The obvious repair does not work, which is the more useful lesson:

```sh
grep -rono '\.all(\|\.one(' --include=*.ts src/ | grep -v 'Promise\.all' | wc -l
```

still returns the inflated count, because `-o` already threw the word away. In
`src/ui/screens/planner/screen.ts`, the `workspace` (`:387`) declaration is
initialized with `Promise.all`, but the line emitted by grep is only `.all(` and
`Promise` is not in it to
filter. A post-filter cannot recover context the first command discarded, so the
exclusion has to happen inside the match, as a lookbehind, which is why the
pattern needs `-P` rather than the default BRE. The same lookbehind appears in
`tests/unit/db/codec-slot-is-never-an-identity.test.ts` for the same reason —
that is where the false positive was first found.

This is the sharpest illustration of rule 2 available: a wrong number is one
wrong number, but a wrong command is wrong every time anyone runs it, and it
looks authoritative while doing so. Re-derive the command too, not just the
count.

---

## 5. Mutation — the only evidence that a test can fail

Passing is not evidence. Delete the behaviour the test protects and check it goes
red.

`decisions.md D20` is the case that made this policy: a test covering a real
defect could not fail — deleting the resolution left 1087 of 1087 passing,
because the case was written at a level where the expectation was true for
reasons unrelated to the behaviour. Rewritten one level down, four mutants died.

**For a degradation that does not change a number**, the D24 technique: pair the
degraded case with a twin that reaches the IDENTICAL total and warns about
nothing, so the arithmetic alone cannot distinguish them and the warning is
proved load-bearing.

---

## 6. Frozen fixtures — re-derive, never regenerate

An expectation recomputed from the artefact under test is a tautology. The rule
and its worked examples are in
[DEEP_REF_TESTING.md](DEEP_REF_TESTING.md) §3; the short form is:

- **Use an INDEPENDENT oracle.** `tests/unit/db/schema-signature.test.ts`
  compares against a hash produced by running the original Laravel migrations —
  not by re-reading the artefact under test.
- **Assert every link**, so a change to either side breaks something. That test
  asserts the old hash against the frozen fixture, the new hash against the
  fixture adjusted for tables dropped and added, and that against the generated
  schema.
- **Freeze the OLD format and COUNT it.** In
  `tests/unit/sharing/codec.test.ts`, `PRE_SHEET_WIRE` (`:2022`)
  asserts a pre-sheet-inputs wire tuple is thirteen elements. Regenerating that
  literal from current code would make it fourteen, and the count fails first.
