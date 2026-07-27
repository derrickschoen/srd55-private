# D&D Multiclass Spell Planner — Codebase Guide

> Companion deep-reference files in `.ai/`: [DEEP_REF_*.md](../), [RECIPES.md](../RECIPES.md), [QUESTIONS.md](../QUESTIONS.md)

---

## Read this first: what this library is, and what it is NOT

**`.claude/decisions.md` is the binding record.** It answers *what was decided,
why, when, and by whom*. It is append-only and it wins every disagreement.

**`.ai/` is navigation and how-to.** It answers *where is it and how do I do
it*. It is rewritten freely.

If a sentence would fit in either, it belongs in `decisions.md`.

Three rules follow, and every file here obeys them:

1. **Cite, never restate.** A `.ai/` file may carry a ONE-LINE gloss of a
   decision and must then link it by id — `see D12`, `see F8`. Not the
   rationale, not the trade-offs, not the rejected alternatives. Rationale in
   two places is the collision this library exists to avoid.
2. **No copied measurements.** Never write "26 files import codecs". F8 wrote
   that; `grep -rl 'db/codecs' --include=*.ts src/ | wc -l` said 37 while this
   library was being written, and it will say something else by the time you
   read it. The `.ai/` genre for a number is **the command that produces it** —
   which is what [DEEP_REF_PROOF_TOOLKIT.md](../DEEP_REF_PROOF_TOOLKIT.md) is
   for.
3. **If a file here disagrees with `.claude/decisions.md`, decisions.md wins and
   this file is the bug.** That banner is repeated at the top of every
   `DEEP_REF_*.md`, so drift is a defect with a known owner rather than an
   ambiguity.

Rule 2 bans copied MEASUREMENTS. It does not ban line ANCHORS —
`src/db/codecs.ts`: `RowCodec` (`:31`)
is navigation, not a claim about the world, and stripping them would make this
library much harder to use. Anchors are held to their own standard instead:
`tests/unit/docs/ai-reference-anchors-resolve.test.ts` re-checks every one of
them against the tree on each run, and a `` `Symbol` (`:N`) `` anchor fails
unless line `N` really does name that symbol. So an anchor here is as trustworthy
as the last test run — prefer that form over a bare `file:line` when you add one,
because it is the form the guard can check strongly.

There is deliberately **no `~Lines` column** in the map below. The precedent
this format is borrowed from has a stale one in its own first row; it is the
single field with a proven drift record and no navigational value.

---

## Documentation Map

| File | What's Inside | Keywords |
|------|--------------|----------|
| **This file** | Genre rules, repo topography, command surface and its traps, parallel-track working agreement | Always read first |
| [DEEP_REF_DATA_LAYER.md](../DEEP_REF_DATA_LAYER.md) | The three layers (Drizzle / Zod contracts / codecs), the REQUIRED codec rule, the named raw path | codec, RowCodec, db.all, db.one, allRaw, oneRaw, SqlRow, drizzle at runtime, zod |
| [DEEP_REF_SCHEMA.md](../DEEP_REF_SCHEMA.md) | Tables authored in TypeScript, generated SQL, row contracts, triggers, the table-scope classification | schema, db/schema, schema.sql, migration, column facts, TABLE_SCOPES, trigger, CHECK |
| [DEEP_REF_TESTING.md](../DEEP_REF_TESTING.md) | Five tiers, commands, frozen fixtures, mutation, forbidden paths to green | test, vitest, playwright, fixture, parity, live, flake, port |
| [DEEP_REF_DOMAIN.md](../DEEP_REF_DOMAIN.md) | SRD sourcing and provenance, homebrew tolerance, why a closed enum is a data-loss bug | SRD, homebrew, enum, provenance, tolerance, catalog import, spell, class |
| [DEEP_REF_LICENSING.md](../DEEP_REF_LICENSING.md) | Thin pointer to `docs/srd/ATTRIBUTION.md` and the obligation test | licence, license, CC-BY, attribution, SRD 5.2, Wizards |
| [DEEP_REF_PROOF_TOOLKIT.md](../DEEP_REF_PROOF_TOOLKIT.md) | How to prove a claim here: type-level assertions, artifact guards, the compiler as oracle, mutation | proof, type test, guard, oracle, measure, tsc, evidence |
| [RECIPES.md](../RECIPES.md) | Numbered step-by-step how-tos for the things that keep being got wrong | add a table, add a column, add an enum, browser tests, SRD content, port |
| [QUESTIONS.md](../QUESTIONS.md) | INDEX of open questions — the questions themselves live in `.claude/pending-questions/` | question, open, TODO, unresolved |

---

## What this application is

A browser-only D&D spell planner. **No server, no backend, no account.** The
database is SQLite compiled to WebAssembly (`@sqlite.org/sqlite-wasm`) running in
a Web Worker against OPFS, and the built site is static files.

Two consequences that surprise people:

- **There is no migration runner.** The schema is one generated `.sql` artifact
  applied to a fresh database; an existing database is validated, not migrated.
  See [DEEP_REF_SCHEMA.md](../DEEP_REF_SCHEMA.md).
- **Everything the user owns is in their browser.** That is why backup, share
  links and undo/redo snapshots are first-class and why a change to storage has
  to be carried through all of them — the lesson recorded as Q8 and applied in
  D24, with [RECIPES.md](../RECIPES.md) §3 as the checklist.

It is a **spell planner, not a character model** (F4) — with the sheet core added
since (D17, D20, D24). What it does not hold, it says so rather than showing a
blank: `SHEET_GAPS` in `src/queries/character-sheet-builder.ts`.

---

## Repository topography

### `src/` — the application (17 directories)

| Directory | What lives there |
|---|---|
| `src/access/` | Which routes give a character access to which spell (`spell-access-builder.ts`) |
| `src/backup/` | The portable-character document: export, import, validation (`character-backup.ts`) |
| `src/catalog/` | Catalog import — spells, classes, subclasses (`catalog-importer.ts`, `subclass-importer.ts`) |
| `src/character/` | Undo/redo snapshots and the diff that feeds the audit log (`character-state.ts`) |
| `src/commands/` | Every write. One class per command, each with its inverse |
| `src/db/` | Connection, `DatabaseContext`, codecs, generated `schema.sql`, lifecycle, bootstrap |
| `src/domain/` | Enums, ids, models, read-models, and `contracts/` — row contracts and the table inventory |
| `src/duplicates/` | Duplicate-spell warning detection |
| `src/eligibility/` | Whether a spell may go in a slot |
| `src/grants/` | Grant rules: what a source gives a character, and the slots it generates |
| `src/queries/` | Read models — workspace, character sheet, completeness, CRUD |
| `src/reports/` | Build report and the printable spell list |
| `src/rpc/` | The worker RPC contract |
| `src/rules/` | The derived numbers: sheet maths, multiclass slots, attacks, species effects |
| `src/sharing/` | Share links: the compressed URL fragment, export and import |
| `src/ui/` | Screens and rendering. No business logic |
| `src/worker/` | Worker-side RPC handlers |
| `src/main.ts`, `src/vite-env.d.ts` | Entry point and ambient types |

### `db/schema/` — the schema, authored in TypeScript

`catalog-classes.ts`, `catalog-sources.ts`, `catalog-spells.ts`, `character.ts`,
`columns.ts`, `index.ts`, `origins.ts`, `relations.ts`, `sheet-inputs.ts`,
`sheet.ts`, `triggers.sql`, `weapons.ts`.

`src/db/schema.sql` is **generated from these and must never be hand-edited.**
See [RECIPES.md](../RECIPES.md) §1.

### `docs/` — the human-facing record

`BACKUP-FORMATS.md`, `CATALOG-IMPORT.md`, `RPC-CONTRACT.md`,
`sharing/SCHEMA.md` (+ `format-comparison.md`, `minimal-share-notes.md`,
`measure-formats.mjs`, `minimal-share-example.json`), `srd/ATTRIBUTION.md`,
`srd/SOURCE.md`, and 13 verbatim extracts under `srd/source/*.txt`.

### `.claude/` — the binding record (tracked in git)

`decisions.md`, `loop-log.md`, `assumptions/`, `pending-questions/`, `plans/`.

### Root planning documents

`BUILD-PLAN.md`, `BUILD-PROGRESS.md`, `PARALLEL-PLAN.md`, `PARITY-AUDIT.md`,
`DEPLOY.md`, `LOCAL-DEV.md`, `SPIKE-NOTES.md`, and `progress/*.md`.

---

## The command surface

Every script, from `package.json`:

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server. The dev-only AI bridge plugin is registered here and NOWHERE else |
| `npm run build` | `tsc -b` → `vite build` → `node tools/assert-dist-clean.mjs`. Three stages; all three must pass |
| `npm run typecheck` | `tsc -b` alone |
| `npm test` | vitest, everything under `tests/**/*.test.ts` — unit AND integration |
| `npm run test:unit` | vitest, `tests/unit` only |
| `npm run test:live` | `AI_BRIDGE_LIVE=1` — probes the REAL `claude` CLI. Costs money, needs a login and the network. Opt-in |
| `npm run test:browser` | Playwright. See the port trap below |
| `npm run test:all` | `test` → `build` → `test:browser` |
| `npm run db:schema` | Regenerates `src/db/schema.sql` from `db/schema/*.ts` |
| `npm run db:contracts` | Regenerates `src/domain/contracts/generated/column-facts.ts` |
| `npm run scrape` | The scraper CLI. Its output must never be committed — guarded |

### Five traps in that surface

1. **`--configLoader runner` is on every vite/vitest invocation**, and it is not
   decoration. `vite.config.ts` branches on `command === 'serve'` to add the AI
   bridge plugin; the runner loader closes its module runner before the exported
   function is called, so a dynamic `import()` inside that branch fails outright
   (`vite.config.ts:140-148`). If you invoke vite or vitest by hand, keep the
   flag.

2. **`tsc -b` typechecks `tests/`, `tools/`, `scripts/` and `db/` too.** The
   project is split: `tsconfig.app.json` includes only `src`;
   `tsconfig.node.json` includes `vite.config.ts`, `vitest.config.ts`,
   `playwright.config.ts`, `src/vite-env.d.ts`, `db`, `scripts`, `tests`,
   `tools`. There is no "tests are exempt" escape — and it is what lets a
   type-level proof under `tests/types/` ride CI for free.

3. **`src/` is compiled TWICE.** It is in `tsconfig.app.json` and reached from
   `tsconfig.node.json` through the tests. Raw `tsc -b` output therefore reports
   each `src/` diagnostic twice. Deduplicate before counting anything.

4. **Playwright port contention.** Every worktree defaulted to 4173 and
   `reuseExistingServer: false` turns a collision into a hard error. Set
   `PLAYWRIGHT_PORT` per checkout: `PLAYWRIGHT_PORT=4195 npx playwright test`.
   That contention is the only condition under which the flake recorded as F5
   has ever reproduced (`playwright.config.ts:5-18`).

5. **The browser suite runs `fullyParallel: false`, `workers: 1`**, and spawns
   its own dev server with `AI_BRIDGE_FAKE=1` — a deterministic offline
   stand-in that speaks the real stream-json shape. No network, no login, no
   paid call.

---

## Working agreement: parallel tracks

Several tracks run against this repository at once, in separate git worktrees.
The plan lives in `PARALLEL-PLAN.md`; the rule that makes it work is **file
ownership**.

- A track OWNS a set of files and does not edit outside it. D8 records both
  tracks merging with no conflict because they were genuinely disjoint;
  `decisions.md D20` records the opposite outcome when a split was badly scoped
  ("cost an hour of seam repair", against D18).
- When two tracks want the same file, the second one **records the change and
  implements it as the next increment** rather than editing underneath the
  first (`decisions.md D19`).
- Each worktree needs its own `PLAYWRIGHT_PORT` (trap 4 above).
- Merge evidence is recorded in `decisions.md` as measured counts — vitest
  tests + files, build exit code, Playwright count, table count — and verified
  by the merger rather than taken from a subagent's report.

---

## Where to go next

- Reading or writing a query → [DEEP_REF_DATA_LAYER.md](../DEEP_REF_DATA_LAYER.md)
- Changing storage → [DEEP_REF_SCHEMA.md](../DEEP_REF_SCHEMA.md), then [RECIPES.md](../RECIPES.md) §1–§3
- Adding content from a book → [DEEP_REF_DOMAIN.md](../DEEP_REF_DOMAIN.md) and [DEEP_REF_LICENSING.md](../DEEP_REF_LICENSING.md)
- Making a claim stick → [DEEP_REF_PROOF_TOOLKIT.md](../DEEP_REF_PROOF_TOOLKIT.md)
- Wondering whether something was already decided → `.claude/decisions.md`. It is
  chronological and append-only, and `grep` is the way in. Three id series run
  through it: `D` for decisions (with lettered amendments — `D1b`, `D6b`, `D6c`,
  `D6d`), `F` for findings, and `Q` for questions, each closed inside the
  decision that answers it. Per rule 2, ask the file how far each series has got
  rather than trusting a number written here:

  ```sh
  wc -l < .claude/decisions.md
  grep -oE '\b(D[0-9]+[a-z]?|F[0-9]+|Q[0-9]+)\b' .claude/decisions.md | sort -uV | tr '\n' ' '
  ```

  This bullet used to name an exact line count and an exact highest `F` id.
  Both were measured and correct when written, and both were stale before the
  branch merged — decisions.md gained 251 lines, `F9` and `F10` in between.
  Rule 2 failing inside its own document, kept here as the worked example.
