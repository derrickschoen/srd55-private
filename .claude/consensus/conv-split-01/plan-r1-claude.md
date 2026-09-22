# CONV-SPLIT-01 — partition `tests/unit/tools/ai-dm-conversation.test.ts` into four duration-balanced files

Author: Claude Fable 5.1 (supervisor), by owner instruction 2026-09-22 ("you make the plan. i don't want to wait"), overriding the codex-authors default for this plan only. Authorization: D849. Inherits TEST-PERF-01 plan §1 (split-file inheritance and lifecycle protocol) and §8 (quiet-box protocol) with D849's one override: acceptance is measured on the FULL gate. Because Claude authored this plan, an independent codex review (astra HIGH, or sol HIGH if astra is unavailable) of the plan **and** of the implementation diff is required before landing; Claude does not close its own round.

## Context

Verified on a quiet box (D850): the full Vitest gate takes 754 s, and `ai-dm-conversation.test.ts` runs from 5 s to 753 s inside it. Every other file is finished by 406 s. Vitest schedules whole files, so for the last ≈340 s of every gate seven of eight workers are idle. The file alone on one worker takes 657 s across 110 tests; the largest single test is 142 s, the next 52 s and 33 s. Any partition by whole test therefore has a floor of 142 s per file, and a four-way partition reaches ≈163 s per file. On today's numbers the gate would then be bound by the rest of the suite at ≈410 s, a saving of ≈340 s per gate, with no engine or tool code changed.

No hooks, no `vi.mock`, no `vi.resetModules`, no `process.chdir`, no module-level mutable state exist in the file (verified by grep). The prelude (lines 1–847) is imports plus 27 top-level declarations: one `declareTestInputs` call, constants, factory functions and adapter classes. One further helper, `primaryCodexArgvBytes` (lines 1368–1378), is declared inside the `describe` and used by one test (line 1782).

## Partition (contiguous slices, chosen over greedy bin-packing)

Measured single-worker durations per top-level block are in `.tmp/runs/test-perf/baseline-main/conversation-w1-durations.tsv` (110 rows, 652.7 s). The optimal contiguous four-way cut gives a maximum slice of 165.9 s versus 163.0 s for the best non-contiguous packing; the 3 s cost buys a diff that is four verbatim line ranges instead of 95 relocated blocks, so contiguous wins.

| Slice | Today's lines | Blocks / tests | Single-worker s | Target file |
|---|---|---|---|---|
| A | 849–2759 | 47 / 52 | 165.9 | `tests/unit/tools/ai-dm-conversation.test.ts` (retained name) |
| B | 2760–2911 | 6 / 6 | 165.7 | `tests/unit/tools/ai-dm-conversation-smoke.test.ts` |
| C | 2912–3720 | 23 / 26 | 163.0 | `tests/unit/tools/ai-dm-conversation-final-decisions.test.ts` |
| D | 3721–4314 | 19 / 20 | 157.4 | `tests/unit/tools/ai-dm-conversation-adjustments.test.ts` |

Boundaries fall on blank lines (2759, 2911, 3720 are blank; 2760, 2912, 3721 each open an `it(`). Slice B carries the 142 s three-room smoke plus the service-flap tests; C the trimmer, KB/skill injection, structured-final family, adapter/arg parsing, initiative fixtures and the three-round party program; D the D443 adjustment family and speculation. Names describe the dominant content; the boundaries are set by duration, not topic. Test count check: 52 + 6 + 26 + 20 = 104 matched rows plus the six ≈120 ms forensic-STOP `it.each` expansions at lines 1014–1078 (slice A) = 110.

Predicted in-pool span per split file ≈ 165 s × 1.14 (today's in-pool/solo ratio 748/657) ≈ 190 s, well under the ≈406 s bound set by `ai-dm-arena` and the rest of the suite. Predicted full-gate wall ≈ 410–450 s.

## Files

**New: `tests/unit/tools/ai-dm-conversation-fixtures.ts`** — today's lines 1–847 moved verbatim, minus the `kbInputs` declaration (lines 107–111) and minus the `describe/expect/it/vi` vitest import line, with `export` added to each of the 26 remaining top-level declarations. Nothing else changes. It exports only constants (`DEFAULT_KB_HASH`, `BOUND_OFFER_ENVIRONMENT`, `DIVERGENCE_OFFER_ENVIRONMENT`, `LEGACY_BLOCK_ARGS`, `ALL_OPTIONS_TEST_RENDERER_ARGS`), types, factory functions and adapter classes; it calls no `declareTestInputs`, installs no hooks, creates no fixture instances at module scope beyond the two `buildOfferEnvironment` constants that exist today, and holds no mutable state (§1 rule; sibling precedent `tests/unit/combat/fixtures.ts`). Under `isolate:false` this module is shared across the four files inside one worker exactly as the prelude is shared across tests today.

**Modified: `tests/unit/tools/ai-dm-conversation.test.ts`** — keeps lines 848–2759 and the closing `});` verbatim; prelude replaced by imports (vitest, node built-ins and `src/` symbols its tests use, plus named imports from the fixtures module). `primaryCodexArgvBytes` stays where it is.

**New: the three split files** — each is `describe('AI-DM engine MCP conversation runner', () => { …slice… });` with the slice's lines verbatim, preceded by its own import block. File C additionally declares `const kbInputs = declareTestInputs({ fixtures: [...] })` verbatim from lines 107–111 at its top level (its tests at today's lines 2966, 2967, 3035 are the only readers; verified by grep). Files A, B and D read no declared inputs and declare none. The identical `describe` title in every file keeps every test's describe ancestry and full title unchanged.

Import lists: derive per file from use; `tsc` (strict, `verbatimModuleSyntax`, no `noUnusedLocals`) is the check. Type-only imports keep `type` per `verbatimModuleSyntax`.

**Modified: `tools/d583-contract-inventory.ts`** — `GROUPS['tests/unit/tools']` gains `ai-dm-conversation-adjustments,ai-dm-conversation-final-decisions,ai-dm-conversation-smoke`; the literal count at line 226 becomes 143; `D583_BASELINE_SHA256` (line 8) is normalized under the exception below.

**Modified: `tests/unit/tools/d583-contract-inventory.test.ts`** — line 42 count 140 → 143; line 35 count 148 → 151; `EMPTY_INVENTORY_SHA256` (line 20) normalized under the exception below. The existing empty-Git-diff control (`expectEmptyInventory`) is built from the spec lists, so it requires every new file automatically; the `existsSync` loop in the builder fails on any misspelled name.

Nothing under `src/`. No config, gate script or package change. `vitest.config.ts` include `tests/**/*.test.ts` discovers the new files; `tsconfig.node.json` includes `tests`.

## Pin discipline

The only pins that change are filename-set digests and counts: `D583_BASELINE_SHA256` / 140 and `EMPTY_INVENTORY_SHA256` / 148. TEST-PERF-01 §1 grants exactly this exception. Procedure, in order, with outputs kept:

1. Edit `GROUPS` only. Run the d583 test: it must fail with the count/digest mismatch and nothing else.
2. Reproduce the OLD digest independently: `printf '%s\n' <the 140 old paths, sorted> | sha256sum` must equal `60249dad…`. This proves the digest is sha256 of the newline-joined sorted list with trailing newline, from the explicit names, not from tool output.
3. Compute the NEW digest the same way from the explicit 143 names; likewise the 151-name union for `EMPTY_INVENTORY_SHA256` (reproduce the old `b0561dd5…` first from the old 148 names).
4. Set the four values. Run the d583 test: green.

Any other pin, seed, fixture byte, hash or oracle that changes means STOP and report; nothing else is normalized.

Search at implementation for any other consumer of the original filename or of the two digests (`grep -rn "ai-dm-conversation.test\|60249dad\|b0561dd5" --include=*.ts --include=*.mjs --include=*.sh --include=*.json --include=*.md .` excluding `.tmp`, `.claude`, `node_modules`). At authoring the only hits are the d583 tool/test and records; `tools/vtt-handoff/gate-inventory.ts` lists the d583 test file but not the conversation file, and no script passes `--baseline-sha` to the inventory CLI.

## Preservation proof

Before editing, from the base SHA, produce `before.json`: for every top-level `it(`/`it.each(` block, the title or template, the timeout argument, and the block's exact lines; plus the `describe`-level `primaryCodexArgvBytes` lines. After editing, produce `after.json` the same way from the four files concatenated. Required: identical multiset of (title, timeout, body bytes); identical counts of `expect(`, `throw `, `mulberry32(`, 64-hex literals and `timeout:` arguments; the fixtures module equals lines 1–847 minus the removed lines with only `export ` prefixes added (diff shown). Then run all four files with `--reporter=verbose`, strip the file-path prefix, and diff the sorted 110 full titles against the same extraction from `conversation-w1.log`: empty. The script lives in `.tmp/runs/conv-split-01/` and its outputs are retained.

## Mutants (each must fail the named check)

- `CONV_SPLIT_TEST_DROPPED`: delete one moved `it(` → title multiset diff non-empty, verbose count 109.
- `CONV_SPLIT_BODY_EDITED`: change one `toBe` literal in a moved test → body-bytes multiset diff non-empty (the test itself may still pass; the proof is the byte diff).
- `CONV_SPLIT_INPUT_UNDECLARED`: remove `kbInputs` declaration from file C → the KB tests throw `Undeclared fixtures test input`; with the recorder enabled (`VERDICT_FS_OBSERVATIONS_DIR`, `VERDICT_REPOSITORY_ROOT` set), the per-file record shows the undeclared read.
- `D583_SPLIT_FILE_NOT_INHERITED`: remove one new name from `GROUPS` → builder throws count/digest mismatch; d583 test red.
- `CONV_SPLIT_SHARED_STATE`: add `let counter = 0` mutated by a factory in the fixtures module → the shuffle-order runs below cannot be guaranteed to detect it; recorded as a known limit, mitigated by the module review (no `let`, no top-level `Map`/`Set`, no assignments) and the byte-diff requirement on the fixtures module.

## Verification and acceptance

1. `npx tsc -p tsconfig.app.json --noEmit` and `npx tsc -p tsconfig.node.json --noEmit`.
2. Preservation proof above; d583 test green after the pin procedure.
3. Lifecycle diagnostic (§1): the four-file family with `--maxWorkers=1 --sequence.shuffle --sequence.seed <s>` for two seeds whose verbose order is reversed; both green. Recorder run (`VERDICT_FS_OBSERVATIONS_DIR`, `VERDICT_REPOSITORY_ROOT` set) is **informational and compared against the baseline**, not a pass/fail gate: verified 2026-09-22 19:2x, the unsplit file at 85df20a2 already fails the recorder audit (undeclared `directory:tests/fixtures/arena-basis`, `directory:tests/fixtures/arena-basis-brutal`, `file:.git/HEAD`, `file:.git/commondir`, `file:.git/refs/heads/main`, four `tests/fixtures/ai-dm-kb/*.md` files; log `scratchpad/rec-AfOu/run.log`), because the single `kbInputs` declaration makes the whole file audited while other tests read undeclared paths. After the split only file C carries a declaration and is audited; files A, B and D declare nothing and are not audited. Required: file C's undeclared set ⊆ the baseline's undeclared set (no new reads), and files A/B/D produce a record with no declaration. Codex's independent plan (`.tmp-plans/2026-09-21-conv-split-01-plan.md` §1) treated the recorder run as mandatory-green and declared the unit BLOCKED on this; the baseline evidence refutes the block. Fixing the declarations is a separate unit, out of scope here.
4. Permitted union `npx vitest run --configLoader runner tests/unit/vtt tests/unit/tools tests/integration/vtt`: discovered/pass counts recorded, zero failures beyond the known contention pattern under load (rerun red files singly).
5. **Acceptance on the full gate (D849 override; §8 protocol otherwise)**: quiet box (no Node/Vitest process, 1-min load < 1.5 on two checks a minute apart before every start), box lock, configured pool, fresh empty `STATIC_APP_CACHE_DIR` per arm prewarmed by one discarded run, `--reporter=json --outputFile` on. Baseline A/A within 3 % (wall and Duration; identical counts; preload within 10 %). Then three alternating pairs A/B, B/A, A/B. Compare medians; never select a pair. Commitments: candidate median wall ≤ 600 s (≥ 150 s saving from the 754 s baseline; predicted 410–450 s); test count 11 479 in every run; file count 646; candidate red set ⊆ baseline red set (baseline had 20 contention/docs reds, D850); each split file's in-pool span ≤ 300 s (informational). If any pair misses or flips sign, repeat the whole trial with fresh caches.
6. Landing gate `node tools/gate-vitest.mjs` at landing.

Box time for step 5: ≈ 2 × 12.5 + 3 × (12.5 + 7.5) ≈ 85 min.

## Risks

- **Branch conflicts.** Twelve worktree branches add tests to this file (three shelved by D847: `vis-field`, `blind-01`, `cohort-01`, each ≈ +200/−8 lines against main; nine from Sep 3–6 are 900–1,200 commits behind and probably dead). After the split, rebasing them conflicts in the moved regions. Recipe: take main's version, re-insert the branch's added tests into the file that now owns their neighbouring tests, then run the preservation script against the branch's own pre-rebase title set. Record this in the landing note.
- **Contention shift.** Four ≈190 s files in the pool change which files overlap; the contention red set may change shape. The subset rule in step 5 catches a real regression; a new contention red is classified by rerunning it alone at `--maxWorkers=1`.
- **Shared module state** under `isolate:false`: none today; the byte-diff on the fixtures module and the mutant above keep it that way.

## Out of scope (D849: whole tests only)

Splitting the 142 s smoke itself, `test.concurrent`, sharding, worker-count changes, and any edit to test bodies or engine code.

## Sequence (owner 2026-09-22: codex implements at reopen)

1. Copy this plan to `.tmp-plans/2026-09-22-conv-split-01-plan.md`; record the owner's rulings (Claude authored the plan; codex implements) in `.claude/decisions.md` (next id D856); retire the staged codex plan-authoring dispatch.
2. At codex reopen (17:42 EDT): astra HIGH reviews this plan (Claude-authored, so the review is mandatory); Claude fixes legitimate findings and records rejections; ≤ 3 rounds.
3. Codex (sol high, `--sandbox workspace-write`) implements on branch `claude/conv-split-01` in a fresh worktree from main with the plan copied into its `.tmp-plans`; allowed files are the five test/fixture files and the two d583 files; commits before any gate.
4. Supervisor harvest: verification steps 1–4 on the committed SHA, then the full-gate trial (step 5) from a detached checkout at that SHA; astra reviews the diff; land via the standard gate.
