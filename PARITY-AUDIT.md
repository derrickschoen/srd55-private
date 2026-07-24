# Final parity and durability audit

Date: 2026-07-23

Chunk: S90

Result: **PASS**

This is the final serial audit for BUILD-PLAN increment 25. It changed no
production, test, RPC, Worker, bootstrap, build, or Playwright file. No defect
required routing to a prior owner.

## Oracle and evidence inventory

The audit rechecked the immutable inputs named by S90:

- 10 Laravel migrations, 56 files under `app/Domain`, and all 24 PHP test
  support/test files.
- The 11 selected Vue/TypeScript presentation oracles: application shell,
  character list/workspace, build report, print, spell combobox, dice,
  character store, and dice tests.
- `BUILD-PLAN.md`, all 23 prior progress shards, the 57-case Unit map, and the
  fixed 28-workflow feature map.

All six PHP Unit files contain exactly 57 top-level Pest cases. The Unit parity
map contains 57 numbered, covered rows. The browser parity spec contains
exactly 28 tests matching its 28 numbered rows: 26 selected PHP workflows plus
the whole/portable backup and fresh-profile static workflows. The 56 domain
files are represented by the catalog, character/query/command, grant,
report, rule, eligibility/access, and duplicate-detection owner shards. The
selected presentation files are represented by U70, U71, and U72.

`BUILD-PLAN.md` is an immutable planning input, so its original status cells
were not rewritten. Completion evidence is instead established by the
checkpoint-to-owner table in `PARALLEL-PLAN.md`, the 23 immutable progress
shards, and `BUILD-PROGRESS.md`.

## Final serial verification

| Gate | Result |
|---|---|
| `npm test` | 41 files, 314 tests passed |
| Focused schema metadata/persistence | 1 file, 4 tests passed |
| `npm run typecheck` | Passed |
| `npm run build` | Passed; 35 modules transformed and production assets emitted |
| `npm run test:browser` | 39 Chromium tests passed with one worker in 3.6 minutes |
| PHP Unit parity subset | 57/57 mapped cases; 2 cross-slice parity tests green |
| Fixed feature parity subset | 28/28 browser workflows green |

The complete browser count is the 28-workflow parity manifest plus 11
supplemental browser tests for OPFS persistence, database lifecycle, backup,
catalog import, command RPC, character UI, planner, reports, and print.
Production `dist/` output was removed after verification; it is reproducible
with `npm run build`.

## Schema metadata parity

The focused schema run compared the final static schema to the
Laravel-migration-derived expectations:

- exact 38-table inventory and ordered columns;
- declared type, nullability, default, primary-key, and column-order metadata
  hash `fa0e4e9f2af9531e8b66b296660b5db7e28a5c6c2ceda00859c904fe6a4d1b11`;
- all 59 named indexes, unique groups, migrated defaults, and foreign-key
  shapes/actions;
- the assignment CHECK and both exact exclusive-assignment triggers; and
- persisted `CASCADE`, `SET NULL`, and duplicate-operation rejection behavior.

The browser storage probe also reported SQLite 3.53.0, `foreign_keys=1`, the
SAH-pool VFS, and the expected durable database filename.

## Durability and persisted-state audit

The full browser suite used one Playwright worker and a new browser context for
each test. It proved database replacement/recovery, OPFS reload, command
revision/replay behavior, catalog tombstones, both backup formats, portable
reference remapping, and read-only report/print behavior against stored SQLite
rows or complete exported images.

Workflow 28 began from a fresh profile, imported a catalog spell, created a
character, added a Wizard source, searched and selected the spell, asserted the
stored valid slot, exported both character and database formats, reloaded,
reasserted character revision 2 and the stored selection, imported the
portable character, and found the remapped selection on the clone.

## Accessibility and presentation smoke

The green browser suite exercised semantic headings, form labels, named
buttons/links/options, alert/status regions, focus retention after commands,
Enter submission, `Control+Shift+Z` redo, a 375-pixel responsive planner,
and reload restoration. Report warnings expose alert semantics. Print smoke
verified a labeled variant control, visible Print action, print-only hidden
controls, one-column full output, and page-break avoidance. The inspected
planner CSS also retains the reduced-motion override.

## Sensitivity and aggregate evidence

Every one of the 23 prior shards contains verification results, persisted
SQLite/state evidence, intentional behavior reversions, restored green
results, and self-critique. Every shard is referenced by the integrated
evidence. `BUILD-PROGRESS.md` contains Wave 0's two B00 checkpoints and review,
then complete review/test/sensitivity gates for Waves 1–8.

The 57-case Unit sensitivity matrix attributes every case to an owner
transition and directly repeats assignment hydration and half-up rounding at
the persisted cross-slice boundary. The 28-workflow browser matrix attributes
every workflow to persisted owner transitions and directly proves command
bypass and report misrouting. Integrated Wave 8 additionally records:

- green → mutated the exact six-class report name → intended persisted report
  assertion red → restored → filtered green; and
- green → mutated workflow 18's stored Wizard list expectation to Cleric →
  intended `allowed_spell_lists` assertion red → restored → filtered Chromium
  green.

The final 314-test and 39-browser-test runs are the restored green endpoints.
S90 added no executable test, so it introduced no unproven test. No material
parity, durability, schema, coverage, accessibility, persistence, ownership,
or sensitivity gap remains.
