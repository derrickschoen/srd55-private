<!-- trimmed 2026-09-18 (D683): full codex log (5587292 bytes) replaced by the lane's final message; session id 01a0afda-3b1b-7781-b95f-99ff662339bf; the full log is in the mirror history of commit 8889b450 -->

# Investigation result

Option A has a real, existing precedent—fresh namespace, fresh directory, frozen ledger evidence, two independent generations, semantic membership checks before hashes, then a versioned manifest—but it is not an automated “regenerate family” facility. The D569 second family was a new independent evaluation cohort, not a regenerated version of the first family.

A clean Option A should therefore create new cohorts and new manifest identities while preserving all existing fixture bytes, manifests, replay rows, and approved-main evidence. Because the current D569 second-family validator also detects the removed `foggedCells` field, a complete replacement needs 40 new fixtures, not merely the 30 brutal fixtures: ten new hard second-family fixtures are needed to make the v2 second-family manifest byte-regenerable without rewriting history.

## 1. Existing D569 regeneration and versioning machinery

### What the two regeneration codes mean

In [tools/d569-second-family-manifest.ts](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tools/d569-second-family-manifest.ts:464):

- `first_regeneration` means generation run 1 must equal the committed fixture bytes exactly.
- `independent_regeneration` means generation run 2 must equal both run 1 and the committed fixture bytes.
- Both runs call `generateRoom(seed, { difficulty })`, serialize with canonical JSON, and append one newline at lines 483–489.
- The `generation` argument is intentionally ignored by the canonical implementation; it exists so tests can prove that the validator really calls and compares a second execution.

Thus “independent regeneration” means a second deterministic build execution, not a later cohort version.

The second-family test explicitly kills a validator that fails to compare generation 2 at [tests/unit/tools/d569-second-family-manifest.test.ts:179](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/tools/d569-second-family-manifest.test.ts:179).

### What the second family actually was

The D569 second family was a fluke-guard evaluation cohort:

- Hard: `5118001–5118010`
- Brutal: `6207001–6207010`
- Directories: `arena-basis-hard-2` and `arena-basis-brutal-2`

The original proposal used `6204001–6204010`, but that was rejected because 6204 was already the D466 override/protocol namespace. Main’s decision record then selected 6207 and required any membership failure to stop generation, with no hand edits or override entries: [decisions.md:14690](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:14690).

That is the sanctioned precedent for a new family:

1. Predeclare unused seed ranges.
2. Record the namespace audit verbatim.
3. Generate into a new directory.
4. Prove structural and behavioral membership from decoded state.
5. Generate twice and compare bytes.
6. Pin hashes only after those proofs.
7. Nest the resulting manifest hash in the experiment manifest.

It is not a migration path for modifying the old family in place.

### What the ledger test compares

The ledger entry is frozen at [tools/d569-second-family-manifest.ts:24](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tools/d569-second-family-manifest.ts:24) and in [tests/fixtures/d569-second-family-manifest.json:8](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/d569-second-family-manifest.json:8). It states:

- `5118xxx` and `6207xxx` had no occurrence in decisions, fixtures, or tools as of 2026-09-07.
- `5117xxx`, `6203xxx`, `6204xxx`, `6206xxx`, and `6208xxx` were already used.

The validator checks:

- Exact ledger text, not the result of a fresh repository grep.
- Exact hard and brutal contiguous seed arrays.
- Exact cohort directories and paths.
- No overlap with every listed used namespace.
- No D466 per-seed override.
- Fixture SHA-256.
- Seed and state membership.
- Two byte-identical regenerations.

Those checks are at [tools/d569-second-family-manifest.ts:359](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tools/d569-second-family-manifest.ts:359) through line 476. The corresponding ledger test is [tests/unit/tools/d569-second-family-manifest.test.ts:77](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/tools/d569-second-family-manifest.test.ts:77).

A new version must therefore contain a new dated ledger statement. Reusing or editing the old sentence would falsify historical evidence.

### What `second_family_first_regeneration` validates

The outer experiment validator reads the nested second-family manifest, validates it, and prefixes every inner violation with `second_family_` at [tools/d569-blind-experiment.ts:602](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tools/d569-blind-experiment.ts:602). Consequently:

`second_family_first_regeneration`

means “the current generator’s first canonical rebuild differs from a fixture named by the nested second-family manifest.”

It does not mean “the first family was regenerated.”

The current 47 inner violations decompose as:

- 20 second-family fixtures × two byte-regeneration failures = 40. The historical bytes contain the now-removed `foggedCells` state field.
- Seven brutal-2 fixtures fail current `brutal_productivity` under the seam rule = 7.
- Total = 47.

Because [tests/unit/tools/d569-v5.test.ts:60](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/tools/d569-v5.test.ts:60) validates the manifest at module initialization, its first violation aborts test collection at file level.

### Experiment cardinalities

The active v5 manifest has eight core arms, three hint arms, two difficulties, ten fixtures per difficulty, and three repetitions:

- Core family: `8 × 2 × 10 × 3 = 480` cells.
- Hint addition: `3 × 2 × 10 × 3 = 180`.
- Primary total with hints: `660`.
- Second-family core: `480`.
- One brutal half: `8 × 10 × 3 = 240` core cells.
- Primary brutal half with hints: `240 + 90 = 330`.

These are pinned at [tests/unit/tools/d569-blind-experiment.test.ts:472](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/tools/d569-blind-experiment.test.ts:472), [line 634](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/tools/d569-blind-experiment.test.ts:634), and [line 643](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/tools/d569-blind-experiment.test.ts:643).

## 2. Frozen-family artifact inventory

### `brutal`: 6203001–6203010

Corpus:

- [tests/fixtures/arena-basis-brutal](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal)
- 10 files, 214,836 bytes.
- Current productivity failures: eight seeds; only 6203005 and 6203007 pass.

Cryptographic and semantic pins:

- Ten fixture hashes in the D569 v5 manifest: [d569-blind-experiment-manifest.json:148](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/d569-blind-experiment-manifest.json:148).
- The same ten frozen primary hashes in [d569-blind-experiment.test.ts:158](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/tools/d569-blind-experiment.test.ts:158).
- Three current-generation digests plus three historical fixture digests in [room-generator.test.ts:63](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/room-generator.test.ts:63).
- Ten productivity seeds at [room-generator.test.ts:78](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/room-generator.test.ts:78), exercised at line 588.
- Six D466 old/current replacement hash pairs and four unchanged hashes in [room-roster-preflight.test.ts:50](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/room-roster-preflight.test.ts:50).
- Frozen execution-family membership in [arena-basis-brutal-b.test.ts:73](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/arena-basis-brutal-b.test.ts:73).

Direct tools and reports:

- `tools/ai-dm-arena.ts`
- `tools/ai-dm-rerun-packet.ts`
- `tools/d569-blind-experiment.ts`
- `tools/ai-dm-board-snapshot-check.ts`
- `tools/ai-dm-blind-board-snapshot-check.ts`
- `tools/ai-dm-board-glyph-captures.ts`
- `tools/blind-context-fixture-report.ts`
- `tools/los-cover-era-audit.ts`
- `tools/prose-renderer-report.ts`
- `tools/renderer-calibration.ts`

Tests with literal bindings:

- `tests/browser/ai-dm-board-snapshot.spec.ts`
- `tests/unit/tools/ai-dm-arena.test.ts`
- `ai-dm-board-snapshot.test.ts`
- `ai-dm-conversation.test.ts`
- `ai-dm-rerun-packet-protocol.test.ts`
- `ai-dm-screenshot-probe.test.ts`
- `d569-blind-experiment.test.ts`
- `d569-v5.test.ts`
- `engine-mcp-handler.test.ts`
- `generate-arena-basis.test.ts`
- `tests/unit/vtt/accessible-board.test.ts`
- `arena-basis-brutal-b.test.ts`
- `challenge-room-fixtures.test.ts`
- `engine-context-integrations.test.ts`
- `engine-query-port.test.ts`
- `hidden-option-boundary.test.ts`
- `monster-feature-support.test.ts`
- `prose-renderer.test.ts`
- `reference-party-size.test.ts`
- `renderer-profile.test.ts`
- `room-generator.test.ts`
- `room-roster-preflight.test.ts`

Many of these are scenario or renderer fixtures rather than active cohort selectors. They should remain pointed at the historical files unless the test specifically claims to cover the active brutal evaluation cohort.

### `brutal-b`: 6206001–6206010

Corpus:

- [tests/fixtures/arena-basis-brutal-b](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-b)
- 10 files, 219,123 bytes.
- Current productivity failure: all ten seeds.

Pins:

- Ten exact fixture SHA-256 values at [arena-basis-brutal-b.test.ts:98](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/arena-basis-brutal-b.test.ts:98).
- State membership is demonstrated before the byte pin at lines 360–397.
- Exact contiguous range, no overlap, and absence from the three D466 overrides are checked at lines 410–425.
- The family is exported as `BRUTAL_10_B_SEEDS` at [tools/ai-dm-rerun-packet.ts:26](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tools/ai-dm-rerun-packet.ts:26), with replay protocol `brutal-10-b` at line 547.

Consumers:

- `tools/ai-dm-arena.ts`
- `tools/ai-dm-rerun-packet.ts`
- `tools/blind-context-fixture-report.ts`
- `tools/los-cover-era-audit.ts`
- `tools/d583-contract-inventory.ts`
- `tests/unit/tools/ai-dm-arena.test.ts`
- `tests/unit/vtt/arena-basis-brutal-b.test.ts`
- `tests/unit/vtt/engine-query-port.test.ts`

### `brutal-2`: 6207001–6207010

Corpus:

- [tests/fixtures/arena-basis-brutal-2](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/arena-basis-brutal-2)
- 10 files, 214,567 bytes.
- Current productivity failures: seven of ten.

Pins and consumers:

- Ten hashes and paths at [d569-second-family-manifest.json:37](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/d569-second-family-manifest.json:37).
- The whole nested manifest is pinned as `83daa7ea…6026c8` in [d569-blind-experiment-manifest.json:161](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/d569-blind-experiment-manifest.json:161) and [d569-blind-experiment.test.ts:168](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/tools/d569-blind-experiment.test.ts:168).
- Exact fixture arrays occur in:
  - `tests/unit/tools/d569-second-family-manifest.test.ts`
  - `tests/unit/tools/d569-blind-experiment.test.ts`
- Indirect live consumers:
  - `tools/d569-second-family-manifest.ts`
  - `tools/d569-blind-experiment.ts`
  - `tests/unit/tools/d569-v5.test.ts`

It is not currently an `ai-dm-arena` or rerun-packet named basis.

### RL rows and documentation

There is exactly one tracked RL JSONL row:

- [tests/fixtures/rl/authorized-arena-row.SIMULATED.jsonl](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/fixtures/rl/authorized-arena-row.SIMULATED.jsonl)

It uses standard seed `3943001` and a synthetic `a…a` state digest. No tracked `tests/fixtures/rl/*.jsonl` row contains a 6203, 6206, or 6207 seed or one of their state hashes. `tools/rl/generate-data.ts` and `tools/rl/extract-sft.ts` are generic and carry no frozen brutal-family constants. Option A therefore requires no tracked RL-row rewrite.

No file under `docs/**` mentions these family names or seed ranges. The documentation is in:

- [main .claude/decisions.md](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:13375)
- [impl-land-04-sol.md](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-land-04-sol.md)

Historical evidence that must remain byte-frozen includes:

- `tests/fixtures/ai-dm-legacy/runner-oracle-main.json`
- `tests/fixtures/ai-dm-legacy/implicit-advice-v1.json`
- `tests/fixtures/d569-prepatch-primary-bytes.json`
- The three existing brutal directories.
- D569 v5 and second-family v1 manifests.
- Existing external model result rows, if any exist outside the tracked repository.

## 3. Concrete Option A batch

### Proposed fresh namespaces

These are provisional until the implementation preflight proves both absence and membership:

| Purpose | Proposed range | Directory |
|---|---:|---|
| Primary brutal v2 | 6209001–6209010 | `tests/fixtures/arena-basis-brutal-v2` |
| Brutal-b v2 | 6210001–6210010 | `tests/fixtures/arena-basis-brutal-b-v2` |
| D569 second brutal v2 | 6211001–6211010 | `tests/fixtures/arena-basis-brutal-2-v2` |
| D569 second hard v2 | 5120001–5120010 | `tests/fixtures/arena-basis-hard-3` |

An exact tracked-file grep found zero explicit uses of all four ranges. `5119xxx` is unsuitable: seed 5119001 already appears twice in `tests/unit/tools/ai-dm-arena.test.ts`.

The hard addition is necessary because all ten existing hard-2 fixtures fail both current byte-regeneration checks after the fog-field removal. Reusing them in v2 would leave 20 of the current 47 manifest violations.

### Generation

For each range, use the existing tool with no terrain override:

```sh
node_modules/.bin/vite-node tools/generate-arena-basis.ts -- \
  --difficulty brutal --seed 6209001 --rooms 10 \
  --out tests/fixtures/arena-basis-brutal-v2
```

Repeat for 6210001 and 6211001; use `--difficulty hard --seed 5120001` for the new hard cohort.

Before committing fixtures:

1. Generate each cohort into two different temporary directories.
2. `diff -rq` the two outputs.
3. Decode every room and run integrity plus difficulty membership checks.
4. For brutal rooms, prove every living monster has a productive, resolvable first-turn option under the current offer environment.
5. Confirm every relevant opposing ray considered “open” has both `tier === 'none'` and `blocksSight === false`; that predicate is now explicit at [src/vtt/room-generator.ts:1227](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/room-generator.ts:1227).
6. Reject the entire proposed range if any room fails; do not edit a room or add an override.

The D466 6204 mechanism is not a regeneration facility. Its three replacements—6204004, 6204006, and 6204009—are historical typed-roster corrections. The new manifest must retain the `d466GeneratedRoomOverride(seed) === null` guard. If a candidate needs a D466-style replacement, choose another fresh namespace.

### Versioning and pins

Create:

- `d569-second-family-manifest-v2.json`
  - New hard and brutal ranges.
  - New exact ledger evidence.
  - Version `d569-second-family-manifest-v2`.
  - Two independent regenerations.
- `d569-blind-experiment-manifest-v6.json`
  - Primary hard may remain 5117.
  - Primary brutal becomes 6209.
  - Nested second-family reference becomes v2 with its new hash.
  - Preserve v5 unchanged.

Update schemas and constants in:

- `tools/d569-second-family-manifest.ts`
- `tools/d569-blind-experiment.ts`

Split the runtime tests so v5 remains historical and v6 is the active executable manifest. In particular, do not silently make a file named `d569-v5.test.ts` execute v6.

New cryptographic pins:

- 10 primary brutal fixture hashes.
- 10 brutal-b fixture hashes.
- 10 second-family brutal hashes.
- 10 second-family hard hashes.
- One second-family manifest hash.
- One outer experiment manifest hash.
- Total: 42 distinct new SHA-256 values, though some are repeated in test tables.

D569 counts do not change:

- 480 core cells per family.
- 660 primary cells with hint arms.
- 240 core cells affected by each brutal half.
- 330 primary brutal cells when its hint arms are included.

All session keys, visual-source hashes, and state hashes must become v6 identities; v5 and v6 result rows must not be pooled as if they were the same experiment.

### Demonstrate, then normalize

Before inserting any hash:

- Demonstrate unused namespaces with a recorded exact grep.
- Demonstrate no D466 override.
- Demonstrate decoded integrity, budget, caster, terrain, and productivity properties.
- Demonstrate actual seam-clear sight for the productive offers.
- Demonstrate generation A equals generation B.
- Add negative witnesses:
  - a blocked-sight ray with physical tier `none` must fail the open-ray condition;
  - one deliberately nonproductive monster must fail membership;
  - changing only generation 2 must yield `independent_regeneration`;
  - a matching hash must not excuse failed state membership.

Only then compute fixture hashes independently, insert them into manifests, and pin the two manifest hashes. A test access shim that merely returns the committed fixture as its “regeneration” does not constitute this proof; at least one active v6 test must call the real generator.

### Active route changes versus historical consumers

Add versioned routes rather than retargeting historical names:

- `brutal-v2` and `brutal-b-v2` arena basis labels, or require an explicit `--basis-dir` for v2. The former is safer operationally because it prevents accidental fallback to the old default paths.
- Add `brutal-10-v2` and `brutal-10-b-v2` rerun protocols.
- Add new families to `los-cover-era-audit.ts` and active context reports.
- Keep `brutal-10`, `brutal-10-b`, and current arena basis defaults available for historical replay.

Renderer, snapshot, hidden-option, challenge, and conversation tests that use a particular old seed as a scene should remain on that seed. They are not active-cohort selectors.

### Estimated size

Minimal cohort and D569 work:

- 40 new room fixtures.
- 2 new manifests.
- Approximately 14 source/test modifications.
- About 56 touched or added paths.

Full active-route reconciliation, including arena/rerun/audit wiring and the three behavior tests:

- 40 fixture files.
- 2 manifest files.
- Approximately 20–24 source and test files.
- Approximately 62–66 paths total.

Existing family density implies about 865 KB of new fixture JSON, before manifest and test changes.

Principal risks:

- Choosing seeds because the generated output happens to pass and then using the same implementation to certify its own output.
- Allowing D466 overrides or hand edits to conceal a failed candidate.
- Replacing v5/v1 bytes rather than adding v6/v2.
- Mixing old and new experiment rows despite changed state hashes.
- Updating approved-main or legacy replay artifacts.
- Letting the `seed - 6203000` ordinal assumption in `d569-v5.test.ts` survive into v6.
- Repinning behavioral output without an independent geometry derivation or negative witness.

## 4. Three hard-family behavior pins

### Composite turn proposals: hand-derived re-pin

[composite-turn-proposals.test.ts:153](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/composite-turn-proposals.test.ts:153) can be re-pinned without changing its scene.

The scout is at `(13,3)`. The three targets are fighter `(1,2)`, cleric `(2,4)`, and wizard `(1,6)`. Under the seam rule:

- Fighter and cleric have physically non-total rays, but those rays are optically blocked along paired blocking-cell edges.
- Wizard is physically total.
- The legal projected labels are therefore `Dodge` and `End Turn`, not the three Longbow targets.

That is hand-derivable from the four corner rays and remains faithful to the test’s real subject: projection of fresh legal options. The new expectation should include the exact defensive labels and a negative assertion that no Longbow label is exposed.

### Room-8 movement: hand-derived re-pin

[engine-opportunity-movement-intel.test.ts:71](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/engine-opportunity-movement-intel.test.ts:71) also needs no scene change.

The exact new proposal outcomes are derivable from the frozen positions and legal option inventory:

- Monster 1 at `(22,1)`: zero-foot Dodge.
- Monster 2 at `(21,1)`: zero-foot Dodge.
- Monster 4 at `(21,3)`: zero-foot Dodge.
- Monster 5 at `(22,5)`: retains the existing 55-foot Dash to `(12,6)`.

The test still proves its named invariant: the old four-actor zero-foot Dash plan is not repeated. Its current comment claiming all four Dashes are productive must be replaced.

### Speculative planning: scene change required

[speculative-planning.test.ts:543](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/speculative-planning.test.ts:543) cannot legitimately be normalized to an empty menu.

For seed 5117001, monster 1 retains productive choices, but monster 2 has only `Dodge` and `End Turn`; the resulting scenario menu is empty. Changing the expectation to zero would remove the test’s subject—forming and ranking a nonempty bounded volatility menu.

Use a small hand-authored scene with:

- Two baseline monster proposals.
- Explicit canonical movement radii.
- At least one player dependency influencing a proposal.
- Independently calculated `volatilityScore = referencedProposalCount × summedMovementRadiusFeet`.
- Exact rank order and the eight-entry cap.
- A seam-blocking mutation that removes the relevant dependency and changes or empties the menu.

Selecting the first generated hard seed that happens to yield a nonempty menu would be another self-generated expectation and should be avoided.

## 5. Alternatives

### Option B: amend the productivity contract

This would relax or replace `everyMonsterProductive` in `brutalRoomMembershipViolations`, the 6203 generator test, the brutal-b membership suite, and the D569 second-family validator. It is roughly a 6–10 file change with no new brutal fixtures, but it does not by itself cure the 40 current regeneration failures caused by the removed fog field; the historical regeneration comparison would still need a version-aware projection or manifest change. It also leaves the speculative-planning scene invalid and weakens the reason these cohorts were selected: brutal-b currently has 41 of 42 monsters without attack offers under the seam-era measurement. Any amended threshold would need to be preregistered and mutation-tested rather than chosen to fit the current failures.

### Option C: revisit the seam rule

This would change the line tracer so a corner ray running along an edge shared by two blocking cells is not optically blocked. The causal probe says this restores all three hard-family behavioral tests and substantially restores offer counts: hard + original brutal + brutal-b rise from 214 to 451 offers when the seam behavior is disabled; brutal-2 rises from 58 to 96. It avoids the 30 new brutal fixtures, but still does not repair the 40 D569 byte-regeneration violations caused by the fog-field removal. It also reverses D635’s optical ruling and requires a wider revalidation of cover, sight, visibility fields, offer/execution agreement, and browser projections—likely 10–20 affected source/test files plus the full landing gates. Its semantic blast radius is greater than Option A’s versioned data cost.

Investigation commands included:

```sh
git status --short --branch
git rev-parse HEAD
find tests/fixtures/arena-basis-brutal* -maxdepth 1 -type f -printf '%s\n'
git grep -I -E '620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010'
git grep -I -E '512000[1-9]|5120010'
git ls-files 'tests/fixtures/rl/*.jsonl'
git ls-files 'docs/**' | xargs -r rg 'arena-basis-brutal|620300|620600|620700|D569'
```

The checkout remained clean and detached at `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`. Candidate generation was not executed: the read-only environment prevented the TypeScript runners from creating their temporary IPC/cache files, so the proposed ranges remain provisional until the implementation preflight performs the semantic checks above.

OPTION-A COSTING DONE
