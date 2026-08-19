# tsgo as a fast dev pre-check

`@typescript/native-preview` (binary name `tsgo`) is the Go port of the
TypeScript compiler that will ship as TypeScript 7. It is pinned exactly, as a
devDependency, and wired to one script:

```
npm run typecheck:fast
```

which is `tsgo -p tsconfig.app.json --noEmit && tsgo -p tsconfig.node.json --noEmit`.

`npm run typecheck` — `tsc -b` — is untouched.

## Why: it is several times faster

Measured on this branch, on a **contended** box (other lanes were compiling at
the same time; load average went from 5.4 to 11.2 across the measurement). Both
compilers were run as `-p <config> --noEmit`, which neither reads nor writes
`tsBuildInfoFile`, so every number below is a full non-incremental check of the
whole program. Two runs each:

| config             | tsgo run 1 | tsgo run 2 | tsc run 1 | tsc run 2 | speedup (run 2) |
| ------------------ | ---------: | ---------: | --------: | --------: | --------------: |
| `tsconfig.app.json`  |     3.54s |     1.44s |    7.19s |    8.71s |           6.0x |
| `tsconfig.node.json` |     4.83s |     2.44s |   11.03s |   10.38s |           4.3x |

Read run 2 as the honest steady-state figure: run 1 pays for a cold binary and
a cold page cache, and it is tsgo — the newly installed one — that pays most of
that. The tsc column is *inflated* by the contention, not deflated; on a quiet
box tsc checks the app config in about 5.6s, against tsgo's 1.4s. The 4x
headline holds either way, and the absolute number that matters for the dev
loop is that a full app-config check lands under two seconds.

## Why not just make it the gate

Because it is a preview compiler, and this repo's whole strategy is to make the
type system authoritative — see AGENTS.md on describing the rules engine in
types so that a wrong program fails to compile. A gate that is authoritative
must be the implementation everyone else's tooling agrees with. `tsc` is that.

## The precedent: a divergence here was a real bug

This is not hypothetical. Before this doc existed, tsgo reported a diagnostic on
this tree that `tsc` did not, on `portableElfLibraryDocument`. It was not a
false positive and it was not a preview-compiler quirk. It was a **type lie** —
the function's declared return type did not describe what it returned — and it
was fixed on this branch's base (`d5ef2802`) rather than worked around. tsc had
been silently accepting it.

So the first thing tsgo did in this repo was find a defect the authoritative
gate missed. That single data point sets the policy below.

## Policy

1. **`tsc` remains the gate.** `npm run typecheck` / `tsc -b` is what CI and the
   merge bar mean by "it typechecks". Nothing about tsgo's result blocks or
   unblocks a merge.
2. **`tsgo` is the dev loop.** Run `npm run typecheck:fast` while working, for
   the sub-two-second answer. Confirm with `npm run typecheck` before you call
   something done.
3. **Any divergence is investigated as a potential latent bug — never
   suppressed.** If tsgo reports something tsc does not, the null hypothesis is
   that tsgo is right and tsc is missing it, because that is exactly what
   happened the first time. Do not add a `@ts-expect-error`, do not narrow the
   `include`, do not drop the script. Read the diagnostic, decide whether the
   code is actually wrong, and fix the code if it is. Only after that
   investigation is a divergence allowed to be recorded as a compiler
   difference — and then it gets written down here, with the reasoning, not
   silently tolerated.
4. Divergence in the other direction (tsc reports something tsgo does not) is
   the same investigation with the same conclusion: the gate wins, fix the code.

## Parity as of this commit

All four combinations exit 0 with zero diagnostics:

| config | tsgo | tsc |
| --- | --- | --- |
| `tsconfig.app.json` | exit 0, no diagnostics | exit 0, no diagnostics |
| `tsconfig.node.json` | exit 0, no diagnostics | exit 0, no diagnostics |

There is no known divergence to document. That is the state this doc is
describing, and it is a state worth re-establishing rather than assuming.

## Revisit trigger

**When TypeScript 7 reaches a stable release.** At that point tsgo stops being a
preview and the question changes from "may we use it alongside tsc" to "does it
replace tsc as the gate" — which means re-running the parity check, deciding
whether `typecheck` and `typecheck:fast` should collapse into one script, and
retiring this document or rewriting it as a migration note. Until then the pin
stays exact and the split stays.
