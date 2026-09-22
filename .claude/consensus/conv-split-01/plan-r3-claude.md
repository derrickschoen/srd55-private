# CONV-SPLIT-01 — partition `tests/unit/tools/ai-dm-conversation.test.ts` into four duration-balanced files

Revision 3 (2026-09-22; r2 findings tagged "(r2 …)"). Author: Claude Fable 5.1 (supervisor), by owner instruction ("you make the plan. i don't want to wait", D856), overriding the codex-authors default for this plan only. Authorization: D849. Inherits TEST-PERF-01 plan §1 (split-file inheritance and lifecycle protocol) and §8 (quiet-box protocol) with D849's one override: acceptance is measured on the FULL gate. Because Claude authored this plan, independent codex review (astra HIGH) of the plan **and** of the implementation diff is mandatory; Claude closes no round on its own work. Revision 2 addresses astra r1 (`.claude/consensus/conv-split-01/review-plan-astra-r1.md`): every P1/P2/P3 is tagged "(r1 Pn-k)" where it is closed; rejections are in §Rejected.

## Context

Verified on a quiet box (D850): the full Vitest gate takes 754 s and `ai-dm-conversation.test.ts` spans 5.2 s → 753.2 s inside it. The other long spans end much earlier: `ai-dm-arena` at 406.1 s and the last other file (`blind-turn-context`) at 561.1 s (r1 P1-5). Vitest schedules whole files, so for the last ≈190 s of every gate only one worker is busy, and for the last ≈340 s at most two. The file alone on one worker takes 657 s across 110 tests; the largest single test is 142 s, the next 52 s and 33 s. Any partition by whole test has a floor of 142 s per file; the total/4 lower bound is 163.2 s.

No hooks, no `vi.mock`, no `vi.resetModules`, no `process.chdir` (verified by grep). Module-level state in the prelude (lines 1–847): 27 declarations, of which two are runtime-mutable arrays (`LEGACY_BLOCK_ARGS` :791, `ALL_OPTIONS_TEST_RENDERER_ARGS` :795, `as const` only constrains the type; r1 P1-2) and two are frozen offer environments (`buildOfferEnvironment` freezes, `src/vtt/offers/build-offer-environment.ts:37`). Six prelude helpers call `expect` (lines 132, 516, 523, 829, 837, 842; r1 P1-2). One helper, `primaryCodexArgvBytes` (1368–1378), is declared inside the `describe` and used only at 1782.

## Partition (contiguous slices)

Durations: `.tmp/runs/test-perf/baseline-main/conversation-w1-durations.tsv` (110 rows, 652.666 s). Blocks: 85 `it(` + 10 `it.each(` = 95 top-level blocks. Contiguity is chosen over LPT packing (LPT max 163.2 s) because a four-range diff is reviewable and the predicted file span differs by ≈3 s (r1 P2-6 numbers adopted).

**Filename-consumer constraint (r1 P1-1):** `tests/unit/vtt/mutation-ledger.test.ts:132` reads the retained filename and requires `hidden_options_logged_once:` (:135); :111 reads it too and, joined with five other files, requires `mutation: implicit escalation default` (only in this file, at :1817). Both tests must stay in the retained file. The A/B boundary is therefore 2795/2796, not 2759/2760.

| Slice | Today's lines | Blocks / expanded tests | Single-worker s | Target file |
|---|---|---|---|---|
| A | 849–2795 | 48 / 59 | 166.650 | `tests/unit/tools/ai-dm-conversation.test.ts` (retained) |
| B | 2796–2911 | 5 / 5 | 165.662 | `tests/unit/tools/ai-dm-conversation-smoke.test.ts` |
| C | 2912–3720 | 23 / 26 | 162.982 | `tests/unit/tools/ai-dm-conversation-final-decisions.test.ts` |
| D | 3721–4314 | 19 / 20 | 157.372 | `tests/unit/tools/ai-dm-conversation-adjustments.test.ts` |

Boundaries fall on blank lines (2795, 2911, 3720 blank; 2796, 2912, 3721 open an `it(`). Total 95 / 110 / 652.666 s. Names describe dominant content; boundaries are set by duration and the consumer constraint.

Predicted full-gate wall after the split: an unvalidated estimate of roughly 410–560 s. The historical completions (arena span ending 406 s, last other file ending 561 s) are scheduling observations from the old schedule, not bounds under the new one (r2 P3). The commitments are in §Acceptance.

## Files

**New `tests/unit/tools/ai-dm-conversation-fixtures.ts`.** Lines 1–847 moved verbatim with these exact removals, each a complete declaration: the `kbInputs` declaration (107–111), `LEGACY_BLOCK_ARGS` (791–793) and `ALL_OPTIONS_TEST_RENDERER_ARGS` (795–809) (r1 P1-2; ranges corrected r2 P1-2; the transform operates on whole AST declarations, never on line numbers alone). The vitest import line 6 becomes `import { expect } from 'vitest';` because six helpers assert (r1 P1-2). `export ` is prefixed to each remaining top-level declaration; nothing else changes. Exports are types, constants that are frozen at construction (`DEFAULT_KB_HASH` string, the two offer environments), factory functions and the three adapter classes (instance state only, no statics). It calls no `declareTestInputs`, installs no hooks, holds no top-level mutable binding. Precedent: `tests/unit/combat/fixtures.ts`. Under `isolate:false` this module is shared across the four files inside one worker exactly as the prelude is shared across tests today.

**Retained `ai-dm-conversation.test.ts`.** Keeps lines 848–2795 and the closing `});` verbatim; `primaryCodexArgvBytes` stays. Prelude replaced by: vitest import, node built-ins and `src/` symbols its tests use, named imports from the fixtures module, and its own verbatim copies of `LEGACY_BLOCK_ARGS` (791–793) and `ALL_OPTIONS_TEST_RENDERER_ARGS` (795–809).

**New B, C, D.** Each is `describe('AI-DM engine MCP conversation runner', () => { …slice… });` with the slice's lines verbatim, preceded by its import block and its own verbatim copies of the two array constants it uses (B uses both; C both; D `ALL_OPTIONS_TEST_RENDERER_ARGS` only, per grep of lines 3721–4314). File C additionally declares `const kbInputs = declareTestInputs({ fixtures: [...] })` verbatim from 107–111 at top level (readers only at 2966, 2967, 3035). A, B, D declare nothing. The identical `describe` title keeps every test's ancestry and full title unchanged.

Import lists are derived per file; `tsc` (strict, `verbatimModuleSyntax`, no `noUnusedLocals`) is the check; type-only imports keep `type`.

**`tools/d583-contract-inventory.ts`.** `GROUPS['tests/unit/tools']` gains `ai-dm-conversation-adjustments,ai-dm-conversation-final-decisions,ai-dm-conversation-smoke`; literal 140 → 143 at :226; `D583_BASELINE_SHA256` (:8) normalized per §Pins.

**`tests/unit/tools/d583-contract-inventory.test.ts`.** :42 140 → 143; :35 148 → 151; `EMPTY_INVENTORY_SHA256` (:20) normalized per §Pins. Add one control (r1 P2-8): an all-success empty-Git seam (both diffs `''`, no untracked files, merge-base present) that must return exactly the 151-name union; the existing :89 case uses a missing merge-base and is not that control.

Nothing under `src/`; no config, gate script or package change. Discovery: `vitest.config.ts` include `tests/**/*.test.ts`; `tsconfig.node.json` includes `tests`.

## Pins (filename-set digests only; TEST-PERF-01 §1 exception)

1. Freeze the old explicit manifests: the 140 names from `GROUPS` and the 148-name empty union, as literal sorted lists in `.tmp/runs/conv-split-01/manifests/` (r1 P2-8).
2. Edit `GROUPS` only; run the d583 test: it fails with the count/digest mismatch and nothing else.
3. Reproduce both OLD digests from the literal lists: `printf '%s\n' <list> | sha256sum` = `60249dad…` and `b0561dd5…`.
4. Write the NEW literal lists; `diff` old→new must show exactly the three added names and nothing else (r1 P2-8); compute the new digests the same way. Astra independently computed `700a277d…` (143) and `ef991c2c…` (151) at r1; these are a cross-check, not the source: the implementer's own derivation is what is recorded.
5. Set the four values; d583 test green.

Any other pin, seed, fixture byte, hash or oracle that changes: STOP and report.

Consumers of the filename or digests, verified at authoring with `grep -rn "ai-dm-conversation.test\|60249dad\|b0561dd5" --include=*.ts --include=*.mjs --include=*.sh --include=*.json --include=*.md .` excluding `.tmp`, `.claude`, `node_modules`: the d583 tool/test, `tests/unit/vtt/mutation-ledger.test.ts:111,132` (handled by the boundary), and records. `tools/vtt-handoff/gate-inventory.ts` lists the d583 test, not this file. No script passes `--baseline-sha` to the inventory CLI. Re-run the grep at implementation and paste it.

## Preservation proof (executable; r1 P1-4)

`.tmp/runs/conv-split-01/preserve.mjs`, using the `typescript` package already in `node_modules`, parses a test file and walks the `describe` callback body. It fails closed: every statement must be a call to `it`/`it.each(...)` or the `primaryCodexArgvBytes` function declaration, else exit 2. For each block it records `{title-or-template, callText}` where `callText` is the complete call source (callee, parameter table, options object including `timeout`, callback), plus the describe title and the ordered import specifiers. `before.json` from the base SHA (one file); `after.json` from the four files. Required: identical multiset of `callText` (95 entries), identical describe title in all files, `primaryCodexArgvBytes` byte-identical in A, and the fixtures module byte-equal to lines 1–847 minus the specified removals with `export ` prefixes and the one import change (a generated diff that must be empty). Local declarations outside `callText` are checked by byte equality against the base (r2 P1-4): every per-file copy of `LEGACY_BLOCK_ARGS` equals base 791–793, every copy of `ALL_OPTIONS_TEST_RENDERER_ARGS` equals base 795–809, and C's `kbInputs` declaration equals base 107–111. Binding check (r2 P1-4): the checker builds the base import table (local name → source module) and, for each of the four files, requires every imported local name to resolve to the same source module as in the base, except names imported from the fixtures module, which must be exactly the set of 24 relocated declarations; any other binding change fails. Then run the four files with `--reporter=verbose`, strip the file path, and diff the sorted 110 titles against the same extraction from `conversation-w1.log`: empty. Counts recorded over the five files (fixtures module counted once plus the four test files; r2 P1-4): `expect(` 443, `throw ` 83, `mulberry32(` 1, 64-hex literals 1, `timeout:` 48, each equal to the base file.

## Mutants (proposed controls; kills are observed at implementation)

- `CONV_SPLIT_TEST_DROPPED`: delete one ordinary one-case `it(` in D → `callText` multiset diff non-empty; verbose count 109.
- `CONV_SPLIT_BODY_EDITED`: change one literal inside a moved test → `callText` diff non-empty.
- `CONV_SPLIT_INPUT_UNDECLARED` (r1 P1-4 corrected): remove one fixture path from C's declaration, binding retained → the reader throws `Undeclared fixtures test input`. Separate control: deleting C's declaration entirely fails the declaration-presence check (grep for `declareTestInputs(` in C).
- `D583_SPLIT_FILE_NOT_INHERITED`: remove each new name from `GROUPS` in turn (three runs) → builder throws; d583 red each time.
- `CONV_SPLIT_SHARED_STATE`: add `let counter = 0` mutated by a factory in the fixtures module → killed deterministically by the fixtures byte-diff (r1 P1-4), not by shuffling.

## Recorder diagnostic (informational; r1 P1-3)

The unsplit file already fails the recorder audit: verified 2026-09-22 at 85df20a2 with `-t "three-room three-round|injects the root and tactics pair"` (two tests run, 108 skipped; audit listed 2 directories, 3 `.git` files, 7 KB files, 6 arena fixture files, 12 `path:` observations, 4 external inputs; `scratchpad/rec-AfOu/run.log`). Cause: the single `kbInputs` declaration makes the whole file audited while other tests read undeclared paths (`verdict-fs-recorder-setup.mjs:322-344`). Fixing declarations is a separate unit.

Family-wide comparison, both arms, all 110 tests (r2 P1-3): on throwaway detached checkouts of base and candidate, keep every declaration and reader intact and apply one diagnostic patch to `tests/helpers/test-inputs.ts:223` only, replacing `recorder.current.declaredInputs = declared;` with a no-op, so no file is audited and every file writes its full observation record. Run each arm with the recorder on, `--maxWorkers=1`; require all 110 tests to pass in both arms and exactly one base record and four candidate records. Normalization is frozen here, not in the script (r2 P2): (a) the checkout root is replaced by `<ROOT>`; (b) a `/proc/<digits>/` path component becomes `/proc/<PID>/`; (c) each file's own snapshot probe `path:<dir>/__snapshots__/<file>.snap` (the one `verdict-fs-recorder-setup.mjs:73` exempts) becomes `path:<SELF_SNAPSHOT>`, so the base contributes one such token and the candidate four, and the comparison requires every candidate file to contribute exactly one; (d) nothing else is rewritten: operation kind and all remaining path components are kept, temporary paths are not collapsed, external observations are kept. Required: the candidate family's union of normalized observations (declared, undeclared and external) equals the base file's; any unexplained difference fails the diagnostic. Separately, with the patch absent and C's declaration in place, C's audit-error list must be ⊆ the base file's audit-error list from an unpatched full-file run. Plus the shuffle diagnostic: the family with `--maxWorkers=1 --sequence.shuffle --sequence.seed <s>` for two seeds whose verbose order is reversed; both green.

## Verification and acceptance

1. `npx tsc -p tsconfig.app.json --noEmit`; `npx tsc -p tsconfig.node.json --noEmit`.
2. Preservation proof; pin procedure; five mutants with observed kills.
3. Recorder and shuffle diagnostics.
4. Permitted union `npx vitest run --configLoader runner tests/unit/vtt tests/unit/tools tests/integration/vtt`: counts recorded; red files rerun singly to classify.
5. **Full-gate acceptance (D849 override; §8 protocol otherwise; r1 P1-5).** Quiet box (no Node/Vitest process; 1-min load < 1.5 on two checks a minute apart before every start), box lock, configured pool, JSON reporter on. Caches (r2 P1-5): the baseline A/A runs on a disposable cache (fresh, one discarded prewarm, then the two A/A runs); then the baseline arm and the candidate arm each get a fresh empty `STATIC_APP_CACHE_DIR`, each prewarmed by exactly one discarded run, so both enter the pairs with one prior run. Baseline A/A within 3 % (wall and Duration; identical counts; preload within 10 %). Then three alternating pairs A/B, B/A, A/B; saving = median baseline wall − median candidate wall (§8 formula); never select a pair. Commitments: candidate median wall ≤ 600 s **and** saving ≥ 150 s; tests 11 479 in every baseline run and 11 480 in every candidate run, the exact title delta being the one added d583 all-success seam control (r2 P1-5); files 643 baseline / 646 candidate; 110 family tests in every run; candidate red set ⊆ baseline red set (a new red is disqualifying even if it passes alone; a solo rerun only diagnoses, and a repeat never erases a new red). Conflict rule: if any pair misses the minimum or flips sign, repeat the complete A/A + three-pair trial exactly once with fresh caches; both trial medians must pass or the unit is rejected. Informational: each split file's in-pool span.
6. Landing gate `node tools/gate-vitest.mjs` at landing.

Box time for step 5 (r1 P3-9; r2 P1-5 sequence): 1 prewarm + 2 A/A + 2 prewarms + 6 paired runs = 11 runs ≈ 11 × 8–13 min ≈ 1.5–2.4 h, plus quiet waits and diagnostics; a conflict repeat doubles it.

## Risks

- **Branch conflicts (r1 P2-7).** The three shelved worktrees (`vis-field`, `blind-01`, `cohort-01`) carry +200/−8, +200/−8, +202/−10 against this file with no new titles: they modify five existing blocks (e.g. `vis-field` line 2744 changes fixture preparation inside an existing test) and add helpers/imports. Recipe when they are reopened: a three-way transplant of each branch's merge-base delta (imports, helpers, modified blocks) into the file that now owns each block, then compare relocated bodies and helpers against the intended merged result, not titles. Not applied in this unit. Nine branches from Sep 3–6 (900–1,200 commits behind) are likely dead; same recipe if revived.
- **Contention shift.** Four ≈165 s files change which files overlap; the subset rule catches a regression.
- **Shared module state** under `isolate:false`: none after the array constants are made per-file; the fixtures byte-diff keeps it so.

## Rejected (from the competing codex plan and r1)

- Non-contiguous LPT packing and `-part-b/c/d` names: ≈3 s better predicted span, far worse reviewability; contiguity kept.
- Mandatory-green recorder prerequisite unit before the split: the audit failure is pre-existing (evidence above); astra r1 accepted the refutation.
- Splitting the 142 s smoke, `test.concurrent`, sharding, worker-count changes, editing test bodies: out of scope by D849.

## Sequence (owner 2026-09-22: codex implements)

1. Record; retire nothing further (the stray plan dispatch is recorded in D856).
2. Astra HIGH r2 review of this revision with the r1 dispositions; ≤ 3 rounds.
3. Codex (sol high, `--sandbox workspace-write`) implements on `claude/conv-split-01` in a fresh worktree from main with the plan copied into its `.tmp-plans`; allowed files: the five test/fixture files, the two d583 files, `.tmp/runs/conv-split-01/preserve.mjs` and manifests; commits before any gate.
4. Supervisor harvest: steps 1–4 on the committed SHA; full-gate trial (step 5) from a detached checkout at that SHA; astra reviews the diff; land via the standard gate.
