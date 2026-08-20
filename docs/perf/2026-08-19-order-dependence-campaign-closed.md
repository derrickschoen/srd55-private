# Order-dependence campaign (D314.18): closed — the failures were a phantom

**Verdict: there is no test-order dependence on current main.** The queued
"31 files / 172 tests fail shuffled" campaign was chasing an invalid baseline.

## What the record said

The campaign entered the queue when a shuffled vitest run recorded 31 failing
files / 172 failing tests while the ordered run was green. D314.18 ruled the
repair a parallel background lane with the ordered gate staying official.

## What was actually wrong

Codex (lane-wt/shuffle, dispatched 2026-08-19) reproduced the history and found
every one of the 172 failures was one cascade: `skill-grants.ts` had been
changed without re-pinning its frozen catalog-data-migration checksum (the
D226 mechanism), so every test touching catalog migrations failed regardless
of order. The shuffle was coincidental, not causal — the same tree failed
those tests ordered too, once they ran after the drift.

## Proof (verified-vs-claimed kept distinct)

- Codex ran: the exact historical 31-file set at its recorded seed
  (1787135763409) plus seeds 1, 2, 3, and ordered — 31 files / 477 tests
  green on every run; plus a bounded wider sweep, 245 unit files / 3,186
  tests shuffled green at seed 1.
- Supervisor ran independently: fresh seed 7 over the historical failure
  directories (tests/unit/db, tests/integration/sharing,
  tests/unit/rules/srd-feats-extract.test.ts) — 28 files / 362 tests green.
- Zero test files, helpers, or assertions were changed. Nothing needed fixing.

## Consequences

- The D314.18 lane is closed with no code change; lane-wt/shuffle deleted.
- The real lesson is the existing one: a frozen-source drift breaks the suite
  in ways that masquerade as unrelated failures. The D226 pin discipline
  (recompute over merged sources, justify in the commit) is the guard.
- Any future "order-dependent failures" report must first check whether the
  baseline tree's checksums were clean before a shuffle campaign is queued.
