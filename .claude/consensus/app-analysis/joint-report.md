# APP-ANALYSIS-01 — joint report (Fable 5.1 supervisor + gpt-6-astra), consensus after 2 rounds

Scope: the whole application on main a6228ba3 (code identical to 45f0bc33). Proposals only; no code changed. Full material: astra-r1.md (11 findings), supervisor-pass-r1.md (10 findings, written blind), supervisor-critique-r1.md (per-finding verification), astra-r2.md (cross-critique + the 14 merged findings + waves).

## How the two analyses converged

Astra's 11 findings: 8 confirmed by the supervisor by reading the cited lines or executing the utility (A-F1, A-F2, A-F3, A-F4, A-F7, A-F8, A-F9, A-F11), 3 plausible and not independently probed (A-F5, A-F6, A-F10 consistent with the duration table). None refuted.

The supervisor's 10 findings, as measured by astra with AST walks: 1 confirmed (S-F5), 9 PARTIAL. The supervisor re-verified the refutations that change conclusions and accepts them:

- **S-F1 was over-read.** The 13 cycles / 198 files / 77-and-75-file components are real only when `import type` edges count. Excluding type-only declarations the supervisor's own recomputation gives **4 cycles over 18 files (7, 6, 3, 2)**; encounter.ts is in none of them. The ownership inversions astra named (A-F7) are the real defect; the "cannot be tested or bundled alone" claim is withdrawn.
- **S-F7's headline was wrong.** 778 is the count of all `throw new Error(`; uppercase-code literals in src are a few dozen (supervisor regex 36; astra AST 5 pure literals), and the two cited examples live in tools/vtt-handoff (astra 57 throws / 48 codes; supervisor grep 69 / 49). A bounded typed vocabulary for handoff tooling is kept (M-13); the sg-rule ban is withdrawn.
- **S-F2's "tests key on names" was wrong.** tools/d583-contract-inventory.ts:62 hashes file paths. The encounter.ts split is deferred to an identifiable seam after M-9, not scheduled.
- **S-F6 counted a repair as landed that is not on main.** The bundle-walker `isFile()` fix is on claude/quietstone-art (28f3bd1d), unmerged; main's tests/unit/tools/typescript-compiler-is-never-in-encounter-bundle.test.ts:63 still accepts a directory. Latent on main today; part of M-11.
- S-F3/S-F4: the cost concentration reproduces to the millisecond; "CPU" was the wrong word (summed file elapsed); "lanes never run the slow project" conflicts with the D583 cumulative inventory and is withdrawn; "×3 serial time" as a timeout policy is withdrawn.
- S-F8: regex cast counts replaced by astra's AST table (session-persistence.ts 127 non-const casts, 40 `as unknown`); the concrete seam is `decodeTransition` (session-persistence.ts:913) accepting malformed nested transitions at its typed return.
- S-F9 withdrawn in favour of A-F3; S-F10 folded into A-F11.

One finding against the supervisor's own prior verification is recorded at full length in the vtt-handoff ledger ("F1 FOLLOW-UP"): the landed history-cache repair still deep-clones the whole history on every non-append snapshot.

## The 14 merged findings (owner column = who would run it)

| id | merged from | one line | effort | owner |
|---|---|---|---|---|
| M-1 | A-F1 | Gate runners ignore child exit code/signal/spawn error and drop a global failure when a retry passes; both gates return 0 in the two counterexamples | M | new gate-integrity lane |
| M-2 | A-F2 | dist build cache omits 97 raw-imported inputs (67 drizzle, 30 docs) and the HEAD stamp | M | new build-cache lane (+ F88-b) |
| M-3 | A-F9 + S-F5 | Required-gate inventory is prose: placeholder command, two commands unrunnable without VTT_HANDOFF_ARTIFACT; make it executable | M | vtt-handoff residuals |
| M-4 | A-F4 | canonical-json drops a `__proto__` key (executed on both sides); fix construction, audit canonical-byte consumers | S+M | new canonical-data lane |
| M-5 | A-F3 + S-F9 | History projection never hits its cache on unchanged reads (fresh array + empty suffix ⇒ full clone); key on journal generation | M | vtt-handoff F1 follow-up |
| M-6 | A-F10 + S-F3 + S-F4 | Two tool specs = 36% of summed unit-gate time; scheduler tests run full arenas; d583 inventory rebuilt per test; cheaper seams, no exclusions | M | D613 cost-cutting lane |
| M-7 | A-F5 | MCP `execute(name: string, unknown)` erases profile constraints; profile-indexed internal types + wire adapter | M | new MCP follow-up lane (after offers 3C) |
| M-8 | A-F8 | Worker transport diverges from WebSocket/in-process on late replay and post-close reads; shared lifecycle + conformance on all three | M | vtt-handoff residuals (F81) |
| M-9 | A-F7 + S-F1 | combat→vtt and content→party-pack ownership inversions; extract three engine-owned contract modules; verify with forbidden-edge tests and separate runtime/type graph reports | L | new engine-contract lane |
| M-10 | A-F6 | Spell level is a bare number through storage/read models; establish known/placeholder at the read boundary | M–L | new read-model lane |
| M-11 | S-F6 | Four static graph resolvers, two accept directories on main; share candidate-file handling, keep the held-out Vite resolver | M | D613 graph-tooling slice |
| M-12 | S-F8 | `decodeTransition` returns unrefined nested types; repair specific decoders, audit adjacent casts by invariant | M | new persistence-decoder lane |
| M-13 | S-F7 | 48 string error codes in handoff tooling; type the externally interpreted subset | S–M | new bounded lane |
| M-14 | A-F11 + S-F10 | supervision.md names the wrong compile gate, BUILD-PLAN rows stale, ids.ts comment stale; fix facts first | S | new docs lane |

## Recommended waves (astra's sequence, accepted by the supervisor)

1. **M-1 alone** — repair gate verdict classification with fixtures for exit/report mismatch, signals, spawn failures, global-error-plus-failed-file, and a valid-retry positive control. Nothing else changes in this wave; every later landing depends on trusting the gate.
2. M-2, then M-3; M-14's factual corrections alongside.
3. M-4, M-5, M-11, then M-6's graph and arena seams.
4. M-7 and M-8; M-12 after persistence edits settle.
5. M-9 and M-10.
6. M-13; optional symbol tooling for M-14.

## Do not do (both analysts)
No second engine; no size-driven file splits; no library/framework swaps; no removal of snapshot freezing; no closing homebrew vocabularies; no blanket retries or timeout raises; no dropping browser journeys; no regenerated expectations; no Node pin; nothing D597/D598/D607/D616/D619 already constrain.

## Owner decision needed
Whether to authorize wave 1 (M-1) now. Everything else waits on it by design.
