# DISPATCH CI-4a — D82 two-phase adoption review and runtime cutover (XL, expected MINT-FREE, PLAYWRIGHT_PORT=44580)

`.claude/decisions.md` is law and wins over every other guidance file,
including this brief and the design doc.

THE BINDING PLAN is `docs/design/2026-07-30-content-identity.md`. BOUND: the
section-11 row **CI-4a**, quoted verbatim:

> **CI-4a — XL: D82 two-phase adoption review and runtime cutover.** Common
> rollback plan/token/commit protocol, dependency-aware modal, match-default
> choices, derived renamed clones, atomic remembered decisions and stale-plan
> refusal. Cut catalog import and spell-fork publishing to the immutable
> installer only after this UI exists. CI-REVIEW/CLONE/DEPENDENT controls land
> here.

Also bound: the control definitions for **CI-REVIEW**, **CI-REVIEW-DEFAULT**,
**CI-REVIEW-REMEMBER**, **CI-CLONE-DERIVED** and **CI-DEPENDENT-REPLAN** in the
same document, each quoted with its "Must fail" clause. Every one of those five
is a NEGATIVE CONTROL you must land and must demonstrate failing under exactly
the mutation the doc names.

## What this unit is, in one sentence

Until now, an import that resolves to a review-required match has had nowhere to
go. CI-4a builds the two-phase protocol - plan, then commit against a token -
plus the UI that lets a person decide, and only then cuts catalog import and
spell-fork publishing over to the immutable installer.

## NOT YOURS

- **CI-4b** (semantic backfill, `content_identity_v1_backfill`, rekeying
  external aggregates, old-key aliases). You register NO backfill migration.
  If you find yourself wanting to rekey existing rows, you have crossed into
  CI-4b - stop and report instead.
- SC-*, FF-*, AR-*, SS-*, HA-* lanes, all in other worktrees.
- Any change to the nine projectors themselves. They exist and are merged; you
  consume them.

## Prerequisites, already merged - do not re-derive

All nine projectors exist. CI-3s (main 2f53d5a) registered every bundled
aggregate under its stable key with current/historical content-v1 fingerprints,
made exact key resolution precede fingerprint fallback, and routes a
bundled-historical fingerprint match to review with `reviewRequired: true`.
`catalog_content_match_decisions` exists from CI-2a. `resolveContentReference`
refuses damaged canonical bytes.

## Adjudications from the CI chain that BIND you

These were argued and settled during CI-3a/3b/3c/3s. Do not relitigate them:

1. **Identity is CONTENT-LOCAL.** Never fingerprint a neighbour row's state.
   Fingerprinting a sibling's membership breaks cross-store matching.
2. **Default-include canonicalization.** Canonicalize the complete parsed
   semantic object and document exclusions with runtime evidence. Allowlists
   collide fatally; over-splitting is safe.
3. **Shared authoritative constants by construction.** If a value must agree
   across two seams, it has ONE definition that both import. This repo has
   shipped a duplicated authoritative constant twice in one week.
4. **Typed refusals over partial identity**, and typed per-entry outcomes over
   an all-or-nothing throw: CI-3s learned the hard way that one bad row
   aborting a whole pass freezes the feature forever. If your plan/commit
   protocol can be defeated by a single unresolvable row, you have repeated it.
5. **Portable fingerprints, never raw ids or rowids**, in anything persisted or
   compared across stores.

## Exit criteria

1. A **plan** phase that returns a typed, inspectable plan: every
   review-required adoption listed, each with its match class, its default
   choice (`match`), and its dependency edges.
2. A **commit** phase that takes the plan's TOKEN and refuses a stale plan -
   defined as one computed against a graph that has since changed. Refusal is
   typed, not an exception string.
3. **Dependency-aware review**: cloning a parent forces its dependents'
   fingerprints to be recomputed and the plan refreshed BEFORE commit
   (CI-DEPENDENT-REPLAN).
4. **Derived renamed clones**: a clone's key is the production projector's
   digest of its renamed content - never a random salt, never an opaque key -
   its name changes, incoming references use the new key, and a remembered
   clone absorbs the Nth import without cloning again (CI-CLONE-DERIVED).
5. **Atomic remembered decisions**: the receipt in
   `catalog_content_match_decisions` is written inside the enclosing import
   commit. A second identical import produces no review rows and no new catalog
   rows; a forced later failure leaves NEITHER character NOR receipt
   (CI-REVIEW-REMEMBER).
6. **The cutover**: catalog import and spell-fork publishing use the immutable
   installer only, and only now that this UI exists. No silent adoption remains
   anywhere.
7. All five controls land and are demonstrated failing under the doc's named
   mutation.

## Mint status

Expected MINT-FREE: `catalog_content_match_decisions` already exists. AR-A has
consumed migration **0032** and character-backup **v4**, so if you genuinely
need a migration the next free number is **0033** - but the design row does not
call for one. If you conclude a mint IS required, STOP and report with the
reason rather than minting; that is a finding about the plan, not a failure.

## Scale warning

This row is marked XL by the design doc's own author, and the doc says so in its
own words about a sibling row: calling an XL unit small "would hide a new
persistence mechanism". If the work does not fit one dispatch, implement the
plan/commit protocol and its controls FIRST, report, and say precisely what
remains - a partial unit reported honestly is worth more than a complete one
claimed loosely.
