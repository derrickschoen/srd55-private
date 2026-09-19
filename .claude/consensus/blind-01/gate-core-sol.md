# BLIND-01 core landing gate (gpt-5.6-sol, candidate c0e2ef19)

tokens used
170,153
## Gate A — touched tests

Plan integrity:

```text
ba7238f58be13102a00c3c076ecb25cf9b7527fa1a94f8d805192c40d2cfdcb2
335 lines
```

Branch/commit: `claude/blind-01` at `c0e2ef198ae24c49123109fa5c732b0da751b9b0`.

Exact command:

```bash
/usr/bin/time -p npx vitest run --configLoader runner --maxWorkers=1 \
 tests/unit/combat/search-memory.test.ts \
 tests/unit/tools/ai-dm-arena.test.ts \
 tests/unit/tools/ai-dm-conversation.test.ts \
 tests/unit/tools/d569-second-family-manifest.test.ts \
 tests/unit/tools/engine-mcp-server.test.ts \
 tests/unit/vtt/actor-knowledge.test.ts \
 tests/unit/vtt/arena-basis-brutal-b.test.ts \
 tests/unit/vtt/blind-dm-contract.test.ts \
 tests/unit/vtt/blind-dodge-posture.test.ts \
 tests/unit/vtt/blind-intent-resolver.test.ts \
 tests/unit/vtt/challenge-feasibility-production.test.ts \
 tests/unit/vtt/composite-turn-proposals.test.ts \
 tests/unit/vtt/engine-opportunity-movement-intel.test.ts \
 tests/unit/vtt/engine-query-port.test.ts \
 tests/unit/vtt/engine-round-session.test.ts \
 tests/unit/vtt/offered-option-paths.test.ts \
 tests/unit/vtt/option-modeling.test.ts \
 tests/unit/vtt/option-outcome.test.ts \
 tests/unit/vtt/scripted-party-round.test.ts \
 tests/unit/vtt/snippets.test.ts \
 tests/unit/vtt/speculative-planning.test.ts \
 tests/unit/vtt/standard-offer-generator.test.ts \
 tests/unit/vtt/team-scorer.test.ts
```

Verbatim summary:

```text
 Test Files  1 failed | 22 passed (23)
      Tests  1 failed | 495 passed (496)
```

Skipped: 0.

The sole red was the permitted COHORT-owned legacy pin:

```text
D569 independent second-family manifest > pins the amended exact contiguous ranges and verbatim independent ledger evidence
```

It failed at `tests/unit/tools/d569-second-family-manifest.test.ts:104`, receiving the expected 40 regeneration-code entries instead of `[]`. No other red occurred.

Timing:

```text
Duration  1070.25s (transform 2.27s, setup 0ms, import 45.67s, tests 1023.12s, environment 0ms)
real 1070.81
user 1189.06
sys 272.52
```

The passing productivity witness was rerun with `--disableConsoleIntercept` to expose its suppressed output:

```text
PRODUCTIVITY hard 5117: blind=55 living=75 productive_blind=55
PRODUCTIVITY brutal 6203: blind=25 living=44 productive_blind=25
PRODUCTIVITY brutal-b 6206: blind=40 living=42 productive_blind=40
PRODUCTIVITY brutal-2 6207: blind=29 living=44 productive_blind=29
PRODUCTIVITY rejected/new 6209: blind=36 living=46 productive_blind=36
PRODUCTIVITY aggregate: blind=185 living=251 productive_blind=185
```

Command and timing:

```bash
/usr/bin/time -p npx vitest run --configLoader runner --maxWorkers=1 \
  --disableConsoleIntercept tests/unit/vtt/blind-dodge-posture.test.ts \
  -t 'measures every blind monster as productive across the five frozen categories'
```

```text
Duration 5.36s
real 5.79
user 5.97
sys 1.05
```

Thus the productive ratios are 55/55, 25/25, 40/40, 29/29, 36/36 for 6209, and 185/185 aggregate.

D583 is asserted by the frozen plan at [§8](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/.tmp-plans/2026-09-18-blind-01-plan.md:254) and again as a hard gate in [§9](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/.tmp-plans/2026-09-18-blind-01-plan.md:301). It is not hard-coded as `216` in the inventory unit test; that test pins the inherited component counts.

Exact reduced-manifest observation:

```bash
env VITEST=true STATIC_APP_CACHE_DIR=/tmp/blind-gen/vite-cache-d583-reduced \
  npx vite-node -c /tmp/blind-gen-post-vite.config.ts \
  /tmp/blind-d583-reduced.ts
```

```json
{"manifestPaths":53,"inventoryPaths":216,"sha256":"ee9e4cc5d27cb9e1312378e2e9cee521cff89ca44cbd2181009f30646ca08f4e"}
```

Timing: `real 6.25`, `user 6.80`, `sys 1.37`.

A broader default branch-vs-`main` CLI inventory produced 224 because it does not use §8’s frozen reduced 53-path input. The binding calculation is the reproduced 216.

## Gate B — generation

Initial and final checks were empty:

```bash
git diff --stat -- tests/fixtures
git status --short tests/fixtures
git diff --stat b94dd732..c0e2ef19 -- tests/fixtures
```

Fixture inventory taken as the 43:

```text
tests/fixtures/arena-basis-hard/seed-5117001.json … seed-5117013.json       13
tests/fixtures/arena-basis-brutal/seed-6203001.json … seed-6203010.json    10
tests/fixtures/arena-basis-brutal-b/seed-6206001.json … seed-6206010.json  10
tests/fixtures/arena-basis-brutal-2/seed-6207001.json … seed-6207010.json  10
Total                                                                       43
```

Generator: `tools/generate-arena-basis.ts`.

The generator and Vite configuration were byte-identical between trees:

```text
generate-arena-basis.ts  6ae3c9f0aea93b37af25f3c0f0fc5976f160141b256c301b095a11c8ae6d7db0
vite.config.ts            01c03b93f8c3f8531b0a4b9515eabeedf50dd73631f420a22c09a4f890a97b76
```

The read-only checkout correctly rejected Vite’s default `.vite-temp` write with `EROFS`. Successful generation therefore used `/tmp` wrapper configs that import each repository’s real `vite.config.ts`.

Pre-change command, cwd `/home/vagrant/PhpstormProjects/dnd-wt-vis-field`:

```bash
/usr/bin/time -p sh -c '
STATIC_APP_CACHE_DIR=/tmp/blind-gen/vite-cache-pre npx vite-node -c /tmp/blind-gen-pre-vite.config.ts tools/generate-arena-basis.ts --difficulty hard --seed 5117001 --rooms 13 --out /tmp/blind-gen/pre/hard &&
STATIC_APP_CACHE_DIR=/tmp/blind-gen/vite-cache-pre npx vite-node -c /tmp/blind-gen-pre-vite.config.ts tools/generate-arena-basis.ts --difficulty brutal --seed 6203001 --rooms 10 --out /tmp/blind-gen/pre/brutal &&
STATIC_APP_CACHE_DIR=/tmp/blind-gen/vite-cache-pre npx vite-node -c /tmp/blind-gen-pre-vite.config.ts tools/generate-arena-basis.ts --difficulty brutal --seed 6206001 --rooms 10 --out /tmp/blind-gen/pre/brutal-b &&
STATIC_APP_CACHE_DIR=/tmp/blind-gen/vite-cache-pre npx vite-node -c /tmp/blind-gen-pre-vite.config.ts tools/generate-arena-basis.ts --difficulty brutal --seed 6207001 --rooms 10 --out /tmp/blind-gen/pre/brutal-2
'
```

Timing: `real 21.56`, `user 20.05`, `sys 6.72`.

Candidate command, cwd `/home/vagrant/PhpstormProjects/dnd-wt-blind-01`:

```bash
/usr/bin/time -p sh -c '
STATIC_APP_CACHE_DIR=/tmp/blind-gen/vite-cache-post npx vite-node -c /tmp/blind-gen-post-vite.config.ts tools/generate-arena-basis.ts --difficulty hard --seed 5117001 --rooms 13 --out /tmp/blind-gen/post/hard &&
STATIC_APP_CACHE_DIR=/tmp/blind-gen/vite-cache-post npx vite-node -c /tmp/blind-gen-post-vite.config.ts tools/generate-arena-basis.ts --difficulty brutal --seed 6203001 --rooms 10 --out /tmp/blind-gen/post/brutal &&
STATIC_APP_CACHE_DIR=/tmp/blind-gen/vite-cache-post npx vite-node -c /tmp/blind-gen-post-vite.config.ts tools/generate-arena-basis.ts --difficulty brutal --seed 6206001 --rooms 10 --out /tmp/blind-gen/post/brutal-b &&
STATIC_APP_CACHE_DIR=/tmp/blind-gen/vite-cache-post npx vite-node -c /tmp/blind-gen-post-vite.config.ts tools/generate-arena-basis.ts --difficulty brutal --seed 6207001 --rooms 10 --out /tmp/blind-gen/post/brutal-2
'
```

Timing: `real 21.43`, `user 19.77`, `sys 6.77`.

Results:

```text
PRE_COUNT=43
POST_COUNT=43
43/43 byte-identical
HASH_DIFF_BYTES=0
TRACKED_HASH_DIFF_BYTES=0
```

SHA-256 manifest digests:

```text
fresh pre   d79c88ed36a21d63815dabdab0d75732eb7ec9a7f04a565d0011bfb4906494dd
fresh post  d79c88ed36a21d63815dabdab0d75732eb7ec9a7f04a565d0011bfb4906494dd

tracked before  8af3520870b707048b32b9e490a535d3b341ef032c78fdb9530379b515f86e1b
tracked after   8af3520870b707048b32b9e490a535d3b341ef032c78fdb9530379b515f86e1b
```

Fresh output was compared only pre-to-post, never against historical fixtures.

Runtime instrumentation used ViteNode’s actual runtime `ModuleCacheMap`, filtering entries to `module.evaluated === true` after executing all four generation cohorts:

```bash
/usr/bin/time -p node /tmp/blind-gen-runtime-trace.mjs
```

```text
EVALUATED_MODULES=427
INSTRUMENTED_COUNT=43
real 5.18
user 4.71
sys 1.51
```

Positive controls:

```text
/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/room-generator.ts
/home/vagrant/PhpstormProjects/dnd-wt-blind-01/tools/generate-arena-basis.ts
```

Exact forbidden grep:

```bash
rg 'src/vtt/(offers/offer-declarations|intent-resolver|turn-proposal|option-modeling)\.ts' \
  /tmp/blind-gen/evaluated-modules.txt
```

Output:

```text
<empty>
```

No forbidden module was evaluated.

## Gate C — six mutants

All focused commands used:

```bash
/usr/bin/time -p npx vitest run --configLoader runner --maxWorkers=1 \
  tests/unit/vtt/blind-dodge-posture.test.ts \
  -t 'offers only typed blind Dodge at the origin and End Turn when the actor has no cue'

/usr/bin/time -p npx vitest run --configLoader runner --maxWorkers=1 \
  tests/unit/vtt/blind-dodge-posture.test.ts \
  -t 'moves by the injected path, then executes sight Search for the selected indication'

/usr/bin/time -p npx vitest run --configLoader runner --maxWorkers=1 \
  tests/unit/vtt/blind-dodge-posture.test.ts \
  -t 'hashes the hand-built typed blind body differently from ordinary Dodge'

/usr/bin/time -p npx vitest run --configLoader runner --maxWorkers=1 \
  tests/unit/vtt/blind-dodge-posture.test.ts \
  -t 'keeps opponent identity and coordinates out of blind bodies while pursuit retains its cue'

/usr/bin/time -p npx vitest run --configLoader runner --maxWorkers=1 \
  tests/unit/vtt/blind-dodge-posture.test.ts \
  -t 'is byte-identical across unknown unseen PC placements at three and ten'

/usr/bin/time -p npx vitest run --configLoader runner --maxWorkers=1 \
  tests/unit/combat/search-memory.test.ts \
  -t 'does not create a position cue when a never-observed target successfully Hides'
```

Results:

1. Disabled `blind_dodge` early branch — killed.

   ```text
   BLIND-01 typed blind Dodge and indication pursuit > offers only typed blind Dodge at the origin and End Turn when the actor has no cue
   ```

   `Duration 3.39s`, `real 3.81`.

2. Bypassed indication pursuit in favor of blind Dodge — killed.

   ```text
   BLIND-01 typed blind Dodge and indication pursuit > moves by the injected path, then executes sight Search for the selected indication
   ```

   Failure evidence: `Indication fixture omitted Search.`  
   `Duration 3.38s`, `real 3.80`.

3. Replaced blind stance/policy with `hold_position` — killed.

   ```text
   BLIND-01 typed blind Dodge and indication pursuit > hashes the hand-built typed blind body differently from ordinary Dodge
   ```

   `Duration 3.41s`, `real 3.84`.

4. Leaked the unseen PC ID and coordinate into the blind body — killed.

   ```text
   BLIND-01 typed blind Dodge and indication pursuit > keeps opponent identity and coordinates out of blind bodies while pursuit retains its cue
   ```

   Detected:

   ```text
   $.movement.engagement.targetId:opponent-id
   $.movement.engagement.position:coordinate
   ```

   `Duration 3.38s`, `real 3.81`.

5. Selected blind Dodge versus End Turn from the unseen PC’s true distance — killed.

   ```text
   BLIND-01 typed blind Dodge and indication pursuit > is byte-identical across unknown unseen PC placements at three and ten
   ```

   Failure evidence: `Equality fixture omitted Dodge.`  
   `Duration 3.36s`, `real 3.79`.

6. Restored the `hiddenNow` bypass and true-current-position fallback — killed.

   ```text
   D420 persistent monster-side search memory > does not create a position cue when a never-observed target successfully Hides
   ```

   The mutant improperly produced a `hiding` memory at `(2,0)`.  
   `Duration 2.80s`, `real 3.23`.

After every mutant:

```text
git diff --stat -- src tools
<empty>
```

Final audit:

```text
git diff --stat -- tests/fixtures
<empty>

git status --short tests/fixtures
<empty>

git diff --stat -- src tools
<empty>

git status --short
<empty>

git -C ../dnd-wt-vis-field status --short
<empty>
```

BLIND-01 CORE GATE DONE
