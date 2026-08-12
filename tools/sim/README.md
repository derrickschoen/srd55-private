# tools/sim — DPR Monte Carlo simulation

A dice-accurate Monte Carlo simulator with two boards:

- the original four-round SRD 5.2.1 comparison board at levels 3/6/11/17,
  including Warrior of the Barbed Court, Veteran, and Oath of Domination; and
- a separate three-round homebrew-validation board at levels 5/11/17 with the
  design document's fixed 60% normal-hit / 5% critical / 35% miss distribution.

The original board reports damage dealt and damage prevented. The validation
board reports every stated claim beside the measured value, delta, and 95%
confidence interval; it does not tune mechanics to make claims match.

## What's here

| File | Purpose |
|---|---|
| `sim.ts` | The library. Every build is a pure function `(rng, level, combats) => { dealt, prevented }`, taking an injectable `Rng = () => number` so callers (and tests) can pin the dice. |
| `homebrew.ts` | Pure three-round builds for the eight numbered homebrew entries (nine wrappers because the shared Ambush Primitive has Ranger and Rogue versions), plus the declared Ranger stack. |
| `homebrew-board.ts` | Claimed-vs-measured rows and explicit diagnostics for the four-attack Anchor aside, Ranger stack, and Cutting Chorus headline values. |
| `run.ts` | CLI harness. Prints the three summary tables (dealt / prevented / dealt+prevented) with 95% confidence intervals. |
| `test-helpers.ts` | Shared test utilities: deterministic `Rng` builders and a seeded-sampling statistics helper. Not a test file itself. |
| `*.test.ts` | The test suite (see below). |
| `vitest.config.ts`, `tsconfig.json` | Standalone config — this folder runs on its own, with no dependency on the repo's `src/` or `tests/`. |
| `package.json` | Declares `"type": "module"` (load-bearing: the `.ts` sources are ESM) and two convenience scripts, `npm test` and `npm run board`. |

**Basis, rules provenance, and every declared assumption or simplification
are documented in `sim.ts`'s own header comment** — read that first if you're
auditing a specific number or checking whether a build reflects a rule
correctly. It also carries the fix log from the 2026-08-10 consensus review
(two independent reviewers, "opus" and "sol") that produced this file's
current behavior.

## Running the board

```sh
npx vite-node run.ts            # default N=2000 trials/cell
npx vite-node run.ts 20000       # more trials, tighter confidence intervals
```

The homebrew section is appended after the existing board. Its feature rows
measure marginal damage only, except Circle of the Broken Tooth, whose design
claim is total Wild Shape DPR. Cutting Chorus's claimed "net" is underspecified
because no foregone ally attack is defined; the board labels its chosen proxy:
the displaced die is valued on an identical 65%-hit, `1d8+3` ally attack.

## Running the tests

From inside this directory:

```sh
npx vitest run
```

Or standalone, from anywhere, without `cd`-ing in first:

```sh
npx vitest run --root path/to/tools/sim
```

The current suite is verified to pass (155 tests, 8 files) under vitest 3.2.7;
nothing in the suite is version-specific. The first run may create a small
`node_modules/` holding vitest's own transform cache — harmless, gitignore it.

`package.json` also wires up `npm test` (the suite) and `npm run board` (the
CLI), which are the same two commands as above.

## Test suite design

The suite leans on **injected `Rng` stubs**, not just a fixed seed, because a
seed alone can't cheaply target one specific branch (a crit, a Concentration
save failing on a particular attack, a resource pool running dry) — it can
only be searched for one. Four kinds of test, by increasing reliance on
randomness:

1. **Deterministic** (`deterministic.test.ts`) — an `Rng` stub that always
   returns the same value (`ALWAYS_MIN`, `constRng`) or an exact,
   hand-crafted sequence (`scriptedRng`) that walks a build down one
   specific path (a Concentration save failing, then a re-manifest; Mirror
   Image diverting; a Shield cast staying up for the rest of a round). Every
   expected number here was derived independently from the source (dice
   sizes, DCs, resource costs) before being checked against the code, never
   copied from the sim's own output.
2. **Resource-accounting** (`resources.test.ts`) — the class of bug the
   consensus review actually found: a Long-Rest-scoped pool (spell slots, a
   smite queue, the monk's Shield/Mirror Image charges) that silently
   refreshed every combat instead of being shared across a whole day. Each
   test proves the pool is *finite across the day* by comparing day-mode
   output against what 4 independent fresh-pool combats would produce.
3. **Identity** (`identity.test.ts`) — structural invariants: `monk(...,
   initManifest)` must be byte-identical to `monk(...)` below level 17 (the
   flag is documented as inert there); `champion` and `championRanged` share
   an internal core but must diverge; the same seed run twice must produce
   the same result (purity — no hidden shared mutable state).
4. **Statistical** (`statistical.test.ts`) — tolerance-based checks against
   independently-derivable quantities: a textbook d20-vs-AC hit probability,
   and directional invariants (the SRD Devotion Paladin out-damages a
   smite-hoarding Domination Paladin; a Paladin's day-mode
   output never exceeds burst; short-rest-only builds track burst and day
   almost exactly, since a Short Rest sits between every combat). No exact
   board number is ever asserted as a golden value — only bounds and
   directions that follow from the rules regardless of the RNG.

5. **Regression guards** (`gaps.test.ts`) — one test per confirmed defect from
   the consensus review that the four categories above did *not* cover. The
   list was not guessed: every fixed defect was mechanically re-introduced
   into a copy of `sim.ts`/`run.ts` and the suite re-run, and this file exists
   to kill the mutants that survived (the items ladder on ranged and pact
   weapons, the ranged Veteran's TWF/Archery gating, the Vex and Studied
   Attacks carries, Heroic Warrior, Innate Sorcery's 2-combat limit,
   crit-doubled dice, the Reaction budgets on *Shield* and Veteran Reflexes,
   the Rebuking Shield upgrade, and the board's CI/common-random-numbers
   reporting). Two of its tests assert a *draw count* rather than a damage
   total, which is the only detector that works for "a flag was dropped at a
   round boundary": advantage costs a second d20 draw, so losing a carried
   flag consumes fewer draws while leaving an all-miss damage total unchanged.

`rng.test.ts` tests `mulberry32` itself (pinned output for a known seed,
cross-checked against an independent transcription of the algorithm; range
and uniformity checks). `run.test.ts` drives the CLI harness's `N`
validation via dynamic import, since `run.ts` is a script with no exported
entry point.

## Provenance

Consolidated during a 2026-08-10 session from several prior sim iterations
(`sim4.py`'s post-audit builds, the equal-items overlay, `sim5.py`'s Oath of
Domination, the monk-17 initiative-manifest variant), then corrected by a
dual-reviewer consensus pass. The original Python prototype (`dprsim.py`)
that predates this TypeScript port is **not** part of this deliverable — it
exists only in that session's transcript, kept there for lineage, not
committed alongside this code. `sim.ts` is canonical and intentionally
diverges from it; see `sim.ts`'s header for the itemized fix list.

This test suite was authored and verified in a follow-up session
(2026-08-11) against the post-consensus `sim.ts`/`run.ts`, structured so a
small follow-up fix to the sim only needs a matching small edit here (each
deterministic test documents exactly which branch and draw count it depends
on, and each resource/statistical test states the invariant it's protecting
rather than a specific number).
