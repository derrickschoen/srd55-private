# HMR verdict experiment

## Verdict

Generic HMR-style module swapping is **not a trustworthy test-verdict engine in
this repository**. A narrowly sound configuration exists for the seeded-image
witness, but only after both import paths are given explicit accept contracts
and the process-global image gets an explicit dispose hook. That is a manually
proved lifecycle contract for this dependency, not a general property of Vite
invalidation.

## Setup

Run the complete experiment with one npm-free command from the repository root:

```text
node tools/experiments/hmr-verdicts/run.mjs
```

The recorded environment was Node v24.13.0, Vite 7.3.6, and
`@sqlite.org/sqlite-wasm` 3.53.0-build1. The harness uses Vite's `createServer`
in middleware mode (it binds no port) and `createServerModuleRunner`. Every
configuration runs in its own process.

The real entry is
`tools/experiments/hmr-verdicts/probe.ts`, which imports
`tests/helpers/open-db.ts` and opens its real `test-core` seeded database. A
temporary copy of `src/db/bootstrap.ts` is overlaid by a Vite load hook. The
overlay adds an `hmr_verdict_markers` table and one
`application-seed-overlay` row at the end of `applicationSeed`; the repository
file is never rewritten. Each case proves that the overlay hash differs,
measures the live registry, runs the same assertion in a cold child process,
removes the overlay, and proves the real source hash is unchanged. The test
assertion is “the marker is absent”: it passes before the mutation, and the cold
negative control must fail with the marker present.

The listener count is a lifecycle canary registered by the probe. A rise from
one to two proves that reverse-cone re-execution repeated an undisposed side
effect. `process-seed-cache` reports the real
`process.__dndSeededDatabaseImagePromises` state owned by
`tests/helpers/open-db.ts`.

## Scenario A — bootstrap only

```text
CONFIG A-leaf-only
  warm: marker=absent verdict=PASS listeners=1 process-seed-cache=present
  apply: source=87562a41054c overlay=73c69317e562 marker-in-overlay=yes
  swap: invalidated=bootstrap only
  live: marker=absent verdict=PASS listeners=1 process-seed-cache=present
  cold: marker=present verdict=FAIL listeners=1 process-seed-cache=present
  revert: source=87562a41054c restored=87562a41054c equal=yes
  comparison: FALSE-GREEN
```

This is the predicted witness. Invalidating and evaluating only bootstrap does
not replace the `applicationSeed` captured by the already evaluated
`open-db.ts`, and the already memoized image independently survives on
`process`. The live registry therefore reports green while the cold run fails.

## Scenario B — complete reverse cone

```text
CONFIG B-full-reverse-cone
  warm: marker=absent verdict=PASS listeners=1 process-seed-cache=present
  apply: source=87562a41054c overlay=73c69317e562 marker-in-overlay=yes
  swap: reverse-cone=4 open-db=true probe=true
  live: marker=absent verdict=PASS listeners=2 process-seed-cache=present
  cold: marker=present verdict=FAIL listeners=1 process-seed-cache=present
  revert: source=87562a41054c restored=87562a41054c equal=yes
  comparison: FALSE-GREEN
```

The four evaluated modules in the reverse cone were invalidated, including
`open-db.ts` and the probe. That refreshed captured module bindings, but it did
not clear the seeded-image promise stored on `process`, so the verdict remained
false-green. Re-executing the probe also raised the listener count to two:
module invalidation has no automatic way to dispose registered listeners.
Globals survive the cone, listeners can accumulate, and any capture outside a
selected cone remains old.

## Scenario C — attempts without full-cone re-execution

The first attempt clears the known global but invalidates only bootstrap:

```text
CONFIG C1-leaf-plus-global-reset
  warm: marker=absent verdict=PASS listeners=1 process-seed-cache=present
  apply: source=87562a41054c overlay=73c69317e562 marker-in-overlay=yes
  swap: invalidated=bootstrap only reset=process seed cache
  live: marker=absent verdict=PASS listeners=1 process-seed-cache=present
  cold: marker=present verdict=FAIL listeners=1 process-seed-cache=present
  revert: source=87562a41054c restored=87562a41054c equal=yes
  comparison: FALSE-GREEN
```

That reset forces image regeneration, but regeneration still calls the old
`applicationSeed` captured by `open-db.ts`, so it builds an unmarked image and
lies green.

The second attempt installs temporary HMR contracts. Both direct importers of
bootstrap accept it: `open-db.ts` rebinds `applicationSeed`, and
`seeded-database-image-cache.ts` rebinds both bootstrap exports it captures.
Bootstrap's dispose hook clears the process-global image before the updated
module is accepted. No reverse-cone importer is re-executed.

```text
CONFIG C2-accept-dispose-contracts
  warm: marker=absent verdict=PASS listeners=1 process-seed-cache=present
  apply: source=87562a41054c overlay=73c69317e562 marker-in-overlay=yes
  swap: accepted-by=/tests/helpers/open-db.ts,/tests/helpers/seeded-database-image-cache.ts dispose=process seed cache
  live: marker=present verdict=FAIL listeners=1 process-seed-cache=present
  cold: marker=present verdict=FAIL listeners=1 process-seed-cache=present
  revert: source=87562a41054c restored=87562a41054c equal=yes
  comparison: CORRECT
```

## Verdict table

| Configuration | Verdict | Witness and decisive property |
|---|---|---|
| A: bootstrap-only invalidation | **Unsound** | Live PASS versus cold FAIL. Both the process-global image and `open-db.ts`'s captured bootstrap namespace remain old. |
| B: full reverse-cone invalidation | **Unsound** | Live PASS versus cold FAIL. Bindings refresh, but the image promise is outside the module registry; listener count 1 → 2 also proves undisposed side effects accumulate. |
| C1: bootstrap-only plus global reset | **Unsound** | Live PASS versus cold FAIL. The image is rebuilt through the out-of-cone old `applicationSeed` capture. |
| C2: two accept boundaries plus bootstrap dispose | **Sound for Scenario A** | Live FAIL equals cold FAIL, with listener count staying 1. Every bootstrap capture on the seed path is rebound and the only non-module seed state is reset before reuse. It is not evidence of repo-wide soundness without equivalent contracts for every affected state channel. |

## Conclusion

A is unsound because leaf replacement preserves both old importer captures and
the global image; B is unsound because even a complete module reverse cone does
not own process globals or dispose side effects; C1 is unsound because resetting
the global does not update an out-of-cone lexical import; C2 is sound for this
witness because its accept boundaries enumerate both bootstrap import paths,
rebind every captured export, and its dispose hook clears the sole external
seed state before the next read. C2 buys one concrete thing over
`scripts/test-affected.mjs`: it keeps the probe, `open-db.ts`, and seeded-cache
module instances live and reloads only bootstrap while still reaching the cold
verdict. That saving requires bespoke, exhaustive lifecycle contracts, and the
experiment's global/listener/capture witnesses show why Vite cannot infer those
contracts. Therefore C2 is useful as a targeted optimization prototype, while
`test-affected.mjs`'s from-scratch affected-test execution remains the
trustworthy general mechanism.
