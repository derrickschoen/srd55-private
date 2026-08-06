# COMMON RULES — prepended to every dispatch (supervisor: `cat COMMON.md <unit>.md | codex exec --sandbox workspace-write -C <worktree> -`)

`.claude/decisions.md` is law and wins over every other guidance file. The
worktree you are in has been fast-forwarded to current main by the
supervisor — do NOT run any git merge/branch/checkout commands (worktree
metadata is outside your sandbox and git will fail with a read-only lock
error; if that happens you were dispatched wrong — STOP and report).

FLOORS: read `.claude/handover/lane-state.md` IN THIS WORKTREE for the
current vitest/Playwright/build floors and the frozen-artifact list
(migrations, wire versions, existing a7-v* snapshot assertions). Meet or
exceed every floor; every frozen artifact shows an EMPTY diff vs your merge
base. MINT units own exactly the next free registry numbers — verify each
registry's current tail before minting.

PROCESS RULES (all mandatory):
1. Spec TABLE for all Playwright spec files: Spec | Affected | Why — a bare
   list is a re-dispatch.
2. No Vite ?raw import reachable from any Playwright spec's node-side
   EXECUTABLE import graph (type-only imports are fine).
3. Run the FULL Playwright suite yourself on the PLAYWRIGHT_PORT given in
   the unit brief (env var is PLAYWRIGHT_PORT). Full vitest too. Paste real
   numbers. Other lanes run suites concurrently — contention is the norm;
   any test >1.5s alone gets a per-test timeout (20_000) with the measured
   alone-time in a comment. Never a config edit.
4. No any/@ts-ignore/@ts-expect-error/.skip/.todo, no config edits
   (vite/vitest/playwright/tsconfig/package.json), no weakened assertions,
   no deleting a test to pass (stated strict-superset replacement is the
   only legal removal), never regenerate an expectation from our own
   output — expectations are hand-reviewed values.
5. Name a negative-control mutation per load-bearing new assertion, with
   the exact test name that fails.
6. If the unit's scope seems to require touching a forbidden area (frozen
   artifact, config, another unit's files) or seems infeasible as
   specified, STOP and report the finding — that is a correct outcome.
7. The supervisor re-runs everything and merges. Do NOT commit.

REPORT: what you did; real numbers pasted; the spec table; files
created/modified; negative-control candidates with exact test names.

## Agent isolation (added 2026-08-03 after repeated violations)
Do NOT invoke any other agent or CLI — no `claude`, no nested `codex`, no
external reviewers. The supervisor runs all second-agent reviews. Repo
guidance suggesting codex/claude cross-review does not apply inside a
supervised dispatch.

## Freeze scope differs for mint and mint-free lanes (added 2026-08-04)

A MINT-FREE lane must not touch `src/db/schema.sql`, any existing migration,
or the wire schemas.

A MINT lane MUST change `src/db/schema.sql`, in lockstep with the migration it
adds. Fresh databases execute `schema.sql` directly and migrations apply only
to existing images (`database-lifecycle.ts`), while `scripts/verify-migrations.ts`
requires the migration chain to reproduce `schema.sql`'s exact signature. So a
new column added only by a migration is absent from fresh boots AND fails
signature verification. Precedent: the 0031 mint changed
`drizzle/0031_item_definitions.sql` and `src/db/schema.sql` in one commit.

What stays frozen for a mint lane: every ALREADY-EXISTING migration file, and
the wire schemas. "Frozen migrations 0000-00NN" means do not edit those files -
it never means do not add the next one.

This rule exists because a supervisor addendum once pasted the mint-free freeze
list onto a mint lane's brief and made the unit infeasible by construction.
Codex correctly stopped and said so rather than guessing.

## Second-agent CLIs are forbidden in dispatches (D207, 2026-08-05)

A codex dispatch never invokes another agent CLI (claude or otherwise) for critique,
review, or anything else. Internal self-review is welcome but carries no gate weight;
the supervisor runs all reviews. This line is standing; briefs need not repeat it but
may.

## The mint checklist (learned three times: 0032, 0033, 0034)

A MINT lane, in the same dispatch that adds migration 00NN:
- changes src/db/schema.sql in lockstep (and the trigger SOURCE + composer where
  they exist - four-way, composer idempotence proven);
- extends the hand-authored historical prefix inventory
  (tests/helpers/catalog-data-migration-prefixes.ts);
- extends the schema column/index inventories, row-contract fixtures, and .ai
  Symbol anchors its changes touch;
- updates migrations.ts checksums for 00NN only.
Every one of these was missed at least once and cost a fix round.
