<!-- trimmed 2026-09-18 (D683): full codex log (1052476 bytes) replaced by the lane's final message; session id 01a0a642-35a1-7082-aba2-eda56ea291c1; the full log is in the mirror history of commit 8889b450 -->

## LAND4-F1 — P3: retain an oversized semantic-block regression test

The updated assertion at [ai-dm-arena.test.ts:1166](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/tools/ai-dm-arena.test.ts:1166) proves this fixture fits the cap; it does not prove enforcement. I found no committed test exercising the oversized **blind semantic** rejection at `blind-turn-context.ts:1304`.

**Own probe:** reproduced **10,399 semantic bytes**, then supplied a schema-valid oversized block using a 40,000-character creature name. Production rejected it at **32,768 bytes**. Disabling that guard made my probe fail.

**Fix:** retain such an oversized-block test. This is a nonblocking coverage improvement; enforcement works, and LAND-04 changes no production code.

## Normalization and digest verification

The D635.48 normalizations are narrow and supported by independent historical anchors:

- `room-generator.test.ts:286` removes only `encounter.state.foggedCells`; existing creature-space transformations remain unchanged.
- The `6203001` special case at `:514–518` removes that same key.
- Frozen fixture hashes remain asserted at `:523–525`.
- No fixture bytes changed.

My in-memory derivation reproduced:

- **12 basis + 12 hard + M576:** the prior expected representation differs from generated output only by `encounter.state.foggedCells: []`.
- **Three brutal projections:** restoring only that key reproduces the parent commit’s old hashes; removing it reproduces the new hashes.
- **Ten 6204 projections:** the same old/new hash check passes.

Total: **28 pin cases and 13 digest pairs verified**. Old constants were extracted with `git show 9a220fce:tests/unit/vtt/room-generator.test.ts`, not trusted from the new comments.

Three independently reproduced new hashes:

| Seed | SHA-256 |
|---|---|
| 6203001 | `dee4cc931af96a3276308cdd37a7c169b3cb250d5fa24896b97356b868f4f0c2` |
| 6203002 | `b190349ee0bfa1b40ef9f6d76fa46f15e985e9442a70295f4b23b604ecd99fd3` |
| 6203003 | `f5db8767bbbef7376423bc0b1eeb307e39fc41d54fda879292fde90bcf0cf3db` |

These are demonstrated representation changes, not fresh expectations accepted solely because current output produced them.

### Normalizer mutant discrepancy explained

Keeping the key in `expectedCreatureSpaceFixture` caused **26 failures, two passes** among the 28 selected pin tests:

- 12 basis + 12 hard + M576 + brutal `6203001` fail.
- Brutal `6203002/3` do not use that helper for their generated-output comparison; their separate digest checks pass.

Adding the eight baseline productivity failures explains the supervisor’s **34**, rather than predicted 36.

## Legacy-invariance derivation

The reconstruction at `ai-dm-legacy-invariance.test.ts:1338–1348` is sound.

I decoded the committed approved-main oracle’s base64 JSONL. **Both primary and correction rows** record:

```text
34287ad8ff3dad719ee984f2f5ae1690cf71d8760bcb842dbeca08bccdaa6263
```

That equals the independently reconstructed pre-B2 state’s hash. The current state hashes to:

```text
4757f909c6fe5c9dec585232c8d8b9aead3b1b6f9d9376993682fc8a92b66be9
```

The added approval at `:1400` specifies an exact expected/actual pair for `row[0].startingRoomDigest`. `expectExactJsonWithDifferences` (`:417–429`) still compares the complete recursive difference list against the approved list. Every other parsed value remains checked under the existing timing/identity exceptions; this is not a blanket omission of digest fields.

## Cap and seam consequences

The four arena cases share the explicit **32,768-byte** configured-cap assertion at `ai-dm-arena.test.ts:399–403`. The semantic case remains bounded both below and above: **0 < 10,399 ≤ 32,768**. The screenshot-only case still asserts **zero semantic bytes** at `:1154`. These assertions are not vacuous; enforcement coverage is the separate P3 above.

Nothing in this diff normalizes a seam consequence:

- Room-generator run: **58 passed, exactly eight productivity failures**, seeds `6203001–4`, `6203006`, `6203008–10`.
- The three targeted behavior tests still fail with the documented Longbow, Dash→Dodge, and empty-menu differences.
- D569 tests, fixtures, and production dependencies are untouched. I did not rerun the D569 suites in this turn.

## Commands and results — my runs

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit
git diff --check 9a220fce 807d2e3c
git diff --numstat 9a220fce 807d2e3c -- tests/fixtures
git status --short
git rev-parse --short HEAD
```

Both TypeScript checks and diff check exited **0**. Fixture diff and status were empty; HEAD is `807d2e3c`. Scope is **three test files, 58+/16−**, with **zero added lines over 120 columns**.

Vitest ran through `node --input-type=module` using programmatic `startVitest`, configuration bundling disabled, one thread worker, `cache:false`, and in-memory transforms:

| Run | Result |
|---|---:|
| Room generator | **58 passed / 8 expected failures** |
| Legacy invariance | Collection blocked by `/tmp` EROFS |
| Arena | Collection blocked by read-only filesystem |
| Independent normalization/hash probe | **1/1 passed** |
| Recorded legacy-row digest probe | **1/1 passed** |
| Cap-enforcement probe | **1/1 passed** |
| Three retained behavior witnesses | **3 expected failures** |
| Keep-fog-key mutant | **26 failed / 2 passed** |
| Disable-cap-guard mutant | **1 failed** |

Thus I do not claim the supervisor’s **68/68** legacy/arena result as my own.

Production hashes printed before and after were unchanged:

```text
room-generator.ts    8d85ae64b1350a15010176da96931ed89058f4516697e76d475f32e492295d7b
blind-turn-context.ts b714e30c02d7fcf33fd753b86e7e1b096f489b41f0672cd738f69d5e9f4f8fab
```

VERDICT: ACCEPT
REVIEW DONE.
