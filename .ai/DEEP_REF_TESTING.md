# Deep Reference: Testing

> Parent: [CODEBASE_GUIDE.md](guidelines/CODEBASE_GUIDE.md)
>
> If this file disagrees with `.claude/decisions.md`, decisions.md wins and this
> file is the bug.

---

## 1. Five tiers

| Tier | Path | Runner | Runs by default |
|---|---|---|---|
| Unit | `tests/unit/**/*.test.ts` | vitest | yes |
| Integration | `tests/integration/**/*.test.ts` | vitest, real in-memory SQLite | yes |
| Parity | `tests/parity/*.test.ts` | vitest | yes |
| Browser | `tests/browser/*.spec.ts` | Playwright | `npm run test:browser` |
| Live | `tests/live/*.live-test.ts` | vitest | NO — `AI_BRIDGE_LIVE=1` only |

Plus a sixth thing that is not a tier: **`tests/types/*.type-test.ts`**, which
has no runner at all. It is compiled by `tsc -b` and its only failure mode is a
compile error. See [DEEP_REF_PROOF_TOOLKIT.md](DEEP_REF_PROOF_TOOLKIT.md) §1.

### The suffix conventions are load-bearing

`vitest.config.ts` includes `tests/**/*.test.ts`. Neither `.live-test.ts` nor
`.type-test.ts` matches that glob — `*` cannot span the `.` before `test.ts` when
the filename spells it `-test.ts`. So both are opt-in **by name as well as by
flag**, and vitest correctly ignores a types file that contains no tests.

Browser specs are `.spec.ts` and live under `tests/browser`, which is
`playwright.config.ts`'s `testDir`. The two runners cannot collect each other's
files.

### The live tier ADDS, it never subtracts

`vitest.config.ts:8-18` spells this out: setting `AI_BRIDGE_LIVE=1` adds a suite
and clearing it removes only that suite. Nothing in the default set is excluded,
skipped or relaxed by the switch. If you add a gated tier, keep that direction.

---

## 2. Commands, and the flags you must not drop

```sh
npm test                                  # unit + integration
npm run test:unit                         # unit only
npm run test:browser                      # Playwright — see the port trap
PLAYWRIGHT_PORT=4195 npx playwright test  # what to run in a worktree
npm run test:live                         # opt-in, costs money, needs a login
npm run build                             # tsc -b → vite build → assert-dist-clean
npm run test:all                          # test → build → test:browser
```

- **`--configLoader runner`** is on every vitest/vite script in `package.json`.
  Keep it if you invoke them by hand; `vite.config.ts:140-148` records why.
- **`tsc -b` covers `tests/`, `tools/`, `scripts/` and `db/`.** There is no
  "tests are exempt" escape hatch, and this is what lets a type-level proof ride
  CI for free. It also means `src/` is compiled twice (once per project), so raw
  `tsc -b` output reports each `src/` diagnostic twice.
- **`PLAYWRIGHT_PORT`** — every worktree defaulted to 4173 and
  `reuseExistingServer: false` turns a collision into a hard error rather than a
  silent reuse. That contention is the only condition under which the flake
  recorded as **F5** has ever reproduced (`playwright.config.ts:5-18`).
- The browser suite runs `fullyParallel: false`, `workers: 1`, and starts its own
  dev server with `AI_BRIDGE_FAKE=1` — a deterministic offline stand-in speaking
  the real stream-json shape, so the spawn, containment-assertion, parse, stream
  and kill paths are all exercised with no network and no paid call.

---

## 3. Frozen fixtures, and the rule about them

`tests/fixtures/`:

| Fixture | What it is |
|---|---|
| `homebrew-catalog/*.tier1.json`, `*.tier2.json` | Hand-written homebrew catalog documents. Its `README.md` is worth reading before touching them |
| `homebrew-subclass.ts` | Homebrew subclass fixture |
| `schema-pre-drizzle.sql` | The historical Laravel-derived schema artefact. Deliberately NOT pruned — being the historical artefact is its entire job |
| `scrape/synthetic-pages.ts` | Synthetic HTML for the scraper tests |

**THE RULE: re-derive from the frozen fixture, never regenerate from our own
output.** A test whose expectation is recomputed from the artefact under test is
a tautology.

`tests/unit/db/schema-signature.test.ts` is the worked example. Its oracle is a
SHA-256 over `PRAGMA table_info` metadata produced by running the ORIGINAL
LARAVEL MIGRATIONS — independent of anything this repository generates. It
asserts every link in the chain (the old hash still matches the frozen fixture;
the new hash matches that fixture adjusted for the tables since dropped and
added; that equals the generated schema), so a column type change breaks one link
and editing the fixture breaks another. Read the arithmetic in the test rather
than copying it from here — it moves every time a table does. `decisions.md`
`:107`, `:1188` and D9 are the record.

The same rule with the share format:
In `tests/unit/sharing/codec.test.ts`, the frozen pre-sheet-inputs wire tuple is
declared as `PRE_SHEET_WIRE` (`:1637`) and is THIRTEEN elements. Regenerating
that literal from current code would
make it fourteen, and this guard fails rather than letting the suite quietly
start testing the new format against itself. (There is an eleven-element suite
below it doing the same for an older format, and the round-trip test imports the
same frozen link.)

**The homebrew fixtures have one narrow exception, stated rather than glossed.**
They may reuse a game-mechanic NAME where the fixture cannot do its job without
it ("Bard", "Extra Attack", the spell schools). They may never reuse a
SENTENCE — review once found SRD prose sitting verbatim in a file that claimed to
be wholly invented, and
`tests/integration/homebrew/homebrew-catalog-fixture.test.ts` now fails if any
fixture sentence reappears in `docs/srd/source/`.

---

## 4. What a test should assert ON

**A storage assertion belongs on `db.allRaw` / `db.oneRaw`.** Reading a row back
through the same codec the production path uses would make the assertion agree
with the decoder rather than with the database — which is the one thing a storage
assertion exists to rule out. The named raw path is the honest answer, and it is
visible in review.

Use a codec in a test only when you need a VALUE rather than a row to assert on —
an id to pass along, a name to compare to a string. `tests/helpers/row-codecs.ts`
holds the shared ones and opens by saying most tests should not use it.

What NOT to do is what 30 test sites used to do: `db.all<{ id: number }>(…)`, a
type parameter asserting a column's type without checking a single one, then
re-coerced with `Number(row.id)` at the point of use because the assertion was
not trusted.

Other helpers: `tests/helpers/open-db.ts` (a real in-memory SQLite with the
schema applied), `tests/helpers/schema-sources.ts`,
`tests/helpers/rpc-harness.ts`.

---

## 5. Guard tests — asking the artifact, not the intention

A recurring and deliberate shape here. Not a test of behaviour; a test that some
property of the repository still holds, asked of the thing itself:

| Guard | Asks |
|---|---|
| `tests/unit/tools/scraped-output-is-never-committed.test.ts` | `git ls-files` — because `git add -f` tracks a file DESPITE an ignore rule, and from that moment `git check-ignore` is the wrong question |
| `tests/unit/tools/scraper-is-never-in-the-bundle.test.ts` | the built bundle |
| `tests/unit/db/drizzle-is-build-time-only.test.ts` | the literal text of both plugin registrations in `vite.config.ts` |
| `tests/unit/db/codec-slot-is-never-an-identity.test.ts` | tracked source text, for `(row) => row` in a codec slot |
| `tests/unit/schema-modules.test.ts` | that the `db/schema/*.ts` file set equals the `index.ts` export set |
| `tests/unit/schema-generation.test.ts` | that `src/db/schema.sql` still matches what the composer would produce |
| `tests/unit/contracts/column-facts-generation.test.ts` | the same, for the generated column facts |
| `tests/unit/contracts/table-scopes.test.ts` | the table classification |

Two properties every guard here has, and yours should too:

1. **It has an allowlist written LONGHAND, not a glob**, so adding an exemption
   is a diff a reviewer sees. `SENTINEL_ALLOWLIST` and the `SELF` constant in the
   codec guard are the two examples.
2. **It tests itself.** The codec guard's second `it` runs its patterns against
   decoy strings, so a regex that silently stopped matching cannot leave the scan
   passing forever on an empty search.

---

## 6. Mutation is the coverage oracle

Passing is not evidence. `decisions.md D20` records a test that covered a real
defect and **could not fail**: deleting the resolution left 1087 of 1087 passing,
because the case was written at a level where the expectation was true for
reasons unrelated to the behaviour. Rewritten one level down, four mutants died.

When a test protects something that matters, delete the behaviour and check the
test goes red. If it does not, the test is decoration.

Related discipline from D24, worth copying: to test a **degradation that does not
change a number**, pair the degraded case with a twin that reaches the IDENTICAL
total and warns about nothing — so the arithmetic alone cannot distinguish them
and the warning is proved load-bearing.

---

## 7. Forbidden paths to green

Not negotiable, and they are the standing brief on every track:

- no `any`
- no `@ts-ignore`, no `@ts-expect-error`
- no `.skip`, no `.todo`
- no weakened assertions
- no masking a flake

The last one has a worked example: **F5** was a real Playwright flake —
`tests/browser/attribution.spec.ts:36`, `expect(loads).toBe(1)` receiving `2`, a
genuine second page load. F5's own title is *"measured, unattributed, NOT
masked"*: three hypotheses were tested and killed, the whole experimental record
was written down, and no verdict was invented. Port contention between worktrees
is the only condition under which it has since reproduced
(`playwright.config.ts:5-18`), and the mitigation is `PLAYWRIGHT_PORT` — with the
DEFAULT left unchanged so the flake stays reproducible on demand. No retry, no
skip, no loosened assertion.

The `@ts-expect-error` ban has a specific consequence: the usual
negative-type-test idiom is unavailable, so a "this must not compile" claim is
written as a POSITIVE assertion about a NEGATIVE property.
[DEEP_REF_PROOF_TOOLKIT.md](DEEP_REF_PROOF_TOOLKIT.md) §1.

---

## 8. Recording evidence

When a track merges, `decisions.md` gets measured counts — vitest tests + files,
build exit code, Playwright count, table count — **verified by the merger, not
taken from a subagent's report**. D24 and D8 are the pattern. Do not copy an old
count forward; run the commands.
