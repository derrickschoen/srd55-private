# QSFOG-SVG-01 Increment A implementation — gpt-5.6-sol report

Session 01a0a1f6-faca-7f73-a2a2-59cc14c597f8; log .tmp/runs/fanout/impl-qsfog-a.log.

Implemented Increment A in exactly the two allowed files:

- [qsfog-intervention-report.ts](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/qsfog-intervention-report.ts)
- [qsfog-intervention-report.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/unit/tools/qsfog-intervention-report.test.ts)

No assets, renderer, capture seam, probe, contract, `.claude/**`, or `docs/**` files were changed.

## RED

Command:

```bash
npx vitest run --configLoader runner \
  tests/unit/tools/qsfog-intervention-report.test.ts
```

Result before production code:

```text
FAIL tests/unit/tools/qsfog-intervention-report.test.ts
Error: Cannot find module '../../../tools/qsfog-intervention-report'

Test Files  1 failed (1)
Tests       no tests
exit 1
```

## Implementation summary

`tools/qsfog-intervention-report.ts`:

- Strict `identity-manifest` and `paired-report` CLI parsing.
- Strict supervisor-block, row, snapshot-manifest, and override-manifest schemas.
- Git HEAD/status/harness/test/input authentication.
- Seven-path repeat-only and ten-path final-block preflight.
- Exact derived-summary protection and exclusive output writes.
- Seeded state selection, state digest, canonical Q9 truth, terminal manifest, PNG SHA/IHDR, and source-image-set authentication.
- Byte-identical identity manifest producer.
- Whole-interval New York timestamp, ordering, date, two-hour, and interruption validation.
- Actual scorer-compatible Q9 deduplication and cross-class overlap.
- Eight exhaustive false-positive buckets and accounting identities.
- Exact rational spread, thresholds, fixed denominators, headroom, LOO, FN, stable-positive, and all seven promotion conditions.
- Canonical state/summary CSV and Markdown reports, including pooled and per-base rates.

`tests/unit/tools/qsfog-intervention-report.test.ts`:

- 54 passing tests.
- All 10 final-block and all 7 repeat-only output paths tested independently.
- Production builder→real `runScreenshotProbe` compatibility, with throwing snapshot `capture`/`close`.
- Every specified promotion and rational boundary.
- Fixed 5,331/348 denominators, scorer semantics, accounting, LOO, and both score/rate headroom.
- Rendered summary consistency.

Formatting:

```text
tools/qsfog-intervention-report.ts
  2639 lines
  maximum line length: 119
  lines over 120: 0

tests/unit/tools/qsfog-intervention-report.test.ts
  894 lines
  maximum line length: 119
  lines over 120: 0
```

## Mutants

Mutation procedure:

```bash
cp tools/qsfog-intervention-report.ts /tmp/qsfog-intervention-report.pristine.ts
perl -0pi -e '<mutation>' tools/qsfog-intervention-report.ts
sha256sum tools/qsfog-intervention-report.ts
npx vitest run --configLoader runner \
  tests/unit/tools/qsfog-intervention-report.test.ts
cp /tmp/qsfog-intervention-report.pristine.ts \
  tools/qsfog-intervention-report.ts
sha256sum tools/qsfog-intervention-report.ts
```

Every mutant exited 1. Every restoration returned:

```text
c141482c7300fedece6da9748394423d6eae888a49721eae845172030923f63a
```

| Mutant | Applied SHA-256 | Killing test |
|---|---|---|
| State completeness | `636a5544a0c2426b1b674e30944a403c69d9e7f8007a79224e011aa5c12571ea` | `authenticates truth and PNGs, copies exact bytes, and bypasses snapshot capture and close` |
| PNG authentication | `867c5dc7f85482dc7e72ac767f514126fe7376e0d3ac8f935e295236ec20b680` | `rejects canonical truth changes and PNG byte or IHDR changes` |
| Canonical truth | `0e1f62541956ad3e9c7285455b298614edb0ecef9cb4147d429b7400931b6089` | `rejects canonical truth changes and PNG byte or IHDR changes` |
| Stale freeze | `a8292576f2bf942b4a482eebfc5665ca20024b57ade67d865b76ff602275ad83` | `rejects stale block harness, HEAD, status, and pause authentication` |
| Stale HEAD | `35735cf66e980422de8272a0038275791e8b4d5b43acb55bbda1729780c19f00` | `authenticates truth and PNGs, copies exact bytes, and bypasses snapshot capture and close` |
| Planned-path preflight | `554e4018419da1aa8595631c7e576a80a34cca227a59056338293e27fc45e12e` | `rejects pre-existing final-block output identityManifest` |
| Derived summary | `28e2a1528c00cc9b96bd211ffdfef2b0ab0f259062a7b3a2a17932a70a0bda82` | `derives the probe summary overwrite path exactly` |
| Gap interruption | `95dcc9e8e45fcca7b3150da47df6bf40a47aaedaf0c9a915ee75262f52b053d8` | `rejects an outage only in the inter-arm gap` |
| Non-cancelling spread | `dc9d597e3f45245db9705de10d849f6171a60fcce15dd96f1559a6404cf50eee` | `uses mean absolute per-state differences instead of cancelling differences of means` |
| Ordinary denominator | `50a9b7873a392f9af8e90e2957bbc2e679cd333ddcbe80dfd121dc7034fc6a32` | `freezes schemas, denominators, bases, and the pre-change discovery digest` |
| Collision denominator | `b6c7a7a455372336883d8f79f717c3855de33c04a93aca2227e9d8d560a843e0` | Same frozen-contract test |
| Row outcome rejection | `21320fd706319d946a63d1c7682aa9bfb7f87374869f8f6454e2cd40e4ec1313` | `rejects missing, replacement, blocked, schema-rejected, non-answered, error, null-score, and null-answer rows` |
| Bucket partition | `b44428214c7db7509291ffe2e38d825c6e682b1e679cf663ca8be2824d4d791d` | `accounts for all eight false-positive buckets and proves the identities` |
| Prediction deduplication | `46fd41d86372eeed921a85d74c80c65501805ef3fba6fcd5ff059cbc7510d515` | `matches actual scorer semantics while retaining cross-class overlap and deduplicating repeats` |
| Leave-one-base-out | `7c61b4ca051424b2ee9a365af1148372933893f51f7b9d09ced74491c3a3e5cb` | `keeps pooled ordinary and collision denominators fixed at 5331 and 348` |
| Score headroom verdict | `7cdd81bd80e95b368257a5ac1219e72a8efa207acba9d7e65681c83418d020d3` | `returns INCONCLUSIVE_HEADROOM without relaxing score or rate thresholds` |
| Condition 1 exact threshold | `92837463030336d579792d878f04e420bcbbf2e5369123cd2ee87491aa76089d` | `condition 1 passes at exact T and fails one representable step below` |
| Condition 2 four bases | `02fded9f2221ace60a43a82c9f21b7b4db02b162ceafceb0ad616dd1430d6405` | `condition 2 passes at exactly four of five bases and fails at three of five` |
| Condition 3 positive LOO | `d739198e3613a2b8aad91f1719bf65e9c4eaa348bf495de22743a933bf1c3119` | `condition 3 fails when leave-one-out becomes zero only after removing 5763040` |
| Condition 4 stable positive | `ab329b422810aa885157940f110310344687e52f62c85405460d0c9394196ca3` | `condition 4 fails on one stable-positive loss` |
| Condition 5 fog FN | `67a8647e9297f06f86df9ab894bcf6edcea4dfea0dad1141956a9d4f15deeb10` | `condition 5 rejects fog false negatives separately at plus one` |
| Condition 5 obscurement FN | `3cd44e8b80323fbf8ffde80b96700289086c4bcb1289a1c74e779a36c30f03b4` | `condition 5 rejects obscurement false negatives separately at plus one` |
| Ordinary nonincrease | `6dae89a0e45876e04da130d4c4977a4cf66f0b9a2ab5bec671882ff5d12b0ac4` | `condition 6 rejects an ordinary regression` |
| Collision nonincrease | `795989d66ecb867b693cbb3568afe64fad58e55d8c8e938806d042880c9b174b` | `condition 6 rejects a collision regression` |
| Exact 25% | `5b4f83a8357a53b70f406614959d268d60c9205ce718b47f61d7dff8f680d8e8` | `condition 6 fails at 24.999 percent reduction and passes at exact 25 percent` |
| Strict spread | `53e22991ef52f3eb118f80fbb27dfe65c5545d115bda1d8c6c168ae4ec15445c` | `condition 6 fails at exactly twice spread and passes at the next rational step` |
| Ordinary-only existential | `454bf13806856bf5153b97419978a0eb28145ffaaa92d4853fcda5522962cdb4` | `condition 6 allows collision qualification while ordinary remains equal` |
| Collision-only existential | `3daadf8b717acb46524bcd219522a8f31dcd26d9ffb307d071397dcd4bbe70b1` | `condition 6 fails at 24.999 percent reduction and passes at exact 25 percent` |
| Zero-reference vacuity | `1daa0af5443d9bd9d7dcb097ec47695775e0b7f38bbee13d86c76429c06d61e5` | `condition 6 vacuously passes when both references and candidates are zero` |
| Zero-reference nonincrease | `237087d1353eececcf53b2cd95af60c3dc3a723546194ce860a51d7bb9fe701e` | `condition 6 rejects any candidate count over a zero reference` |
| Zero family credited | `bca3eeb9a0d090197adf9c5c3126d8f77c8260c5c5f9450080569ffc19b61b95` | `keeps pooled ordinary and collision denominators fixed at 5331 and 348` |
| Half-integer averaging | `af7512b87d5d9390d1a09e70d2bdb37cceea863e44de9bcc6e809f0ef3d4af37` | `condition 6 rejects an ordinary regression` |
| Condition 7 authentication | `b87f105e8361e4d5599a0fe2f3a27313fc0388eff09b4602eaaf7acfd0263583` | `condition 7 rejects false authentication and false eligibility independently` |
| Rate headroom | `afb83c35470dd528b7132530372b3fd06c2ae26af3f35ea8a3f8a7065d307b4f` | `returns INCONCLUSIVE_HEADROOM when nonzero rate headroom cannot clear its own spread` |

No survivors.

## Final green

```text
npx tsc -b --force
exit 0

sg scan
exit 0

npx vitest run --configLoader runner \
  tests/unit/tools/qsfog-intervention-report.test.ts \
  tests/unit/tools/ai-dm-board-snapshot.test.ts \
  tests/unit/tools/ai-dm-screenshot-probe.test.ts \
  tests/unit/vtt/encounter-board-projection.test.ts

Test Files  4 passed (4)
Tests       136 passed (136)
exit 0

git diff --check
exit 0
```

Skipped because it belongs to unimplemented Increment B and does not exist:

```text
tests/unit/tools/qsfog-capture-intervention.test.ts
```

Discovery proof:

```bash
npx vitest list --configLoader runner --filesOnly --json \
  > /tmp/qsfog-a-after.json
```

```text
exit 0
discovered objects: 600
projectName fields: 0
new qsfog paths: exactly tests/unit/tools/qsfog-intervention-report.test.ts
fixture paths: 0
after removing the one Increment A spec:
  count: 599
  SHA-256: 54a76a0a317bdfc610e94c49e15214ecd633caf69a7844e309bff1b1c1e023ec
```

Hashes:

```text
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
c141482c7300fedece6da9748394423d6eae888a49721eae845172030923f63a  tools/qsfog-intervention-report.ts
cc1bdad3f0a992ab5da7f8bef4a742c691b32c6a5e226ccb4085f4b86520d0d6  tests/unit/tools/qsfog-intervention-report.test.ts
```

Binding r3 plan hash verified before implementation:

```text
8525e8746c018845213c5f769db0354b59a076e3144945dc91b48abd8f795972
```

The parallel planning lane subsequently replaced the ignored plan file. Its final observed hash, without reading or modifying the new contents, was:

```text
c6206939cb51bf243683c2e3401df8ca76b93ca5af447e008bfdbec126369493
```

Final status:

```text
?? tests/unit/tools/qsfog-intervention-report.test.ts
?? tools/qsfog-intervention-report.ts
```

Exactly the two allowed files.

## Supervisor hand-back

Unused concrete block ID was checked and all repeatability paths were absent:

```text
20260914-qsfog-a-repeat-01
```

The supervisor first creates:

```text
.tmp/runs/quietstone/svg-fog/blocks/20260914-qsfog-a-repeat-01.json
```

using the strict `qsfog-supervisor-block-v1` schema, candidate path/hash null, seven-path preflight, and paused-lanes attestation.

Freeze checks:

```bash
git rev-parse HEAD
git status --short --untracked-files=all
sha256sum tools/ai-dm-screenshot-probe.ts \
  tests/unit/tools/ai-dm-screenshot-probe.test.ts \
  .tmp/runs/quietstone/probe-candidate.jsonl \
  .tmp/runs/quietstone/qsfog-diagnosis.json
```

Identity:

```bash
npx vite-node tools/qsfog-intervention-report.ts identity-manifest \
  --block-record .tmp/runs/quietstone/svg-fog/blocks/20260914-qsfog-a-repeat-01.json \
  --source-rows .tmp/runs/quietstone/probe-candidate.jsonl \
  --expected-source-rows-sha256 f614dd0298d3be2ba41440fdc18cde97ed5f1ffa8500725b820b47da6623adb9 \
  --source-images-root dnd-slim-runs/quietstone-probe-candidate-images \
  --source-revision 28f3bd1daa11f28c7a84f6431daaa51e25a2da47 \
  --states 24 --seed 20260910 --model gpt-5.6-sol:high --question Q9 \
  --out .tmp/runs/quietstone/svg-fog/20260914-qsfog-a-repeat-01/unchanged128
```

Populate and recheck `identityManifestSha256`, then run C1:

```bash
npx vite-node tools/ai-dm-screenshot-probe.ts \
  --models gpt-5.6-sol:high --states 24 --seed 20260910 --primer general \
  --board-glyphs none --capture-tile-px 128 --board-input png --questions Q9 \
  --generation quietstone-svg-fog-intervention-r2 \
  --image-override-manifest \
  .tmp/runs/quietstone/svg-fog/20260914-qsfog-a-repeat-01/unchanged128/manifest.json \
  --images-root \
  .tmp/runs/quietstone/svg-fog/20260914-qsfog-a-repeat-01/answers/c1-images \
  --out \
  .tmp/runs/quietstone/svg-fog/20260914-qsfog-a-repeat-01/answers/c1.jsonl
```

Then C2:

```bash
npx vite-node tools/ai-dm-screenshot-probe.ts \
  --models gpt-5.6-sol:high --states 24 --seed 20260910 --primer general \
  --board-glyphs none --capture-tile-px 128 --board-input png --questions Q9 \
  --generation quietstone-svg-fog-intervention-r2 \
  --image-override-manifest \
  .tmp/runs/quietstone/svg-fog/20260914-qsfog-a-repeat-01/unchanged128/manifest.json \
  --images-root \
  .tmp/runs/quietstone/svg-fog/20260914-qsfog-a-repeat-01/answers/c2-images \
  --out \
  .tmp/runs/quietstone/svg-fog/20260914-qsfog-a-repeat-01/answers/c2.jsonl
```

Close and attest the exact C1-start→C2-end whole interval, then produce the repeatability report:

```bash
npx vite-node tools/qsfog-intervention-report.ts paired-report \
  --block-record .tmp/runs/quietstone/svg-fog/blocks/20260914-qsfog-a-repeat-01.json \
  --control-c1 \
  .tmp/runs/quietstone/svg-fog/20260914-qsfog-a-repeat-01/answers/c1.jsonl \
  --control-c2 \
  .tmp/runs/quietstone/svg-fog/20260914-qsfog-a-repeat-01/answers/c2.jsonl \
  --source-rows .tmp/runs/quietstone/probe-candidate.jsonl \
  --diagnosis .tmp/runs/quietstone/qsfog-diagnosis.json \
  --out-prefix \
  .tmp/runs/quietstone/svg-fog/20260914-qsfog-a-repeat-01/reports/repeatability
```

QSFOG A DONE
diff --git a/tests/unit/tools/qsfog-intervention-report.test.ts b/tests/unit/tools/qsfog-intervention-report.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..6b07ffc97ef86da3df38c247b3ca617777d351ff
--- /dev/null
+++ b/tests/unit/tools/qsfog-intervention-report.test.ts
@@ -0,0 +1,894 @@
+import { createHash } from 'node:crypto';
+import { join, relative, resolve } from 'node:path';
+import { describe, expect, it } from 'vitest';
+import { encodePng } from '../../../src/assets/png';
+import { canonicalJson } from '../../../src/commands/canonical-json';
+import { createEncounter } from '../../../src/combat/encounter';
+import { boardChromeDimensions } from '../../../src/vtt/board-chrome-layout';
+import {
+  NORMALISER_VERSION,
+  PRIMER_VERSION,
+  deriveScreenshotFactSheet,
+  parseProbeAnswer,
+  runScreenshotProbe,
+  scoreProbeAnswer,
+  truthAnswer,
+  type ProbeAnswerRequest,
+} from '../../../tools/ai-dm-screenshot-probe';
+import {
+  QSFOG_BASELINE_DISCOVERY,
+  QSFOG_BASES,
+  QSFOG_COLLISION_DENOMINATORS,
+  QSFOG_ORDINARY_DENOMINATORS,
+  assertUnusedBlockPaths,
+  buildIdentityManifest,
+  calculatePromotion,
+  calculateRepeatability,
+  classifyQ9Accounting,
+  computeBlockFreezeSha256,
+  deriveProbeSummaryPath,
+  parseQsFogCliArgs,
+  parseSupervisorBlock,
+  renderSummaryCsv,
+  validateCompletedBlock,
+  validateCanonicalQ9Truth,
+  validateIdentityPng,
+  validateProbeRows,
+  type PromotionInput,
+  type Q9Answer,
+  type QsFogSupervisorBlock,
+} from '../../../tools/qsfog-intervention-report';
+import { mkdirSync } from '../../helpers/test-filesystem';
+import { mkdtemp, readFile, rm, writeFile } from '../../helpers/test-filesystem-promises';
+import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
+
+const SHA_A = 'a'.repeat(64);
+const SHA_B = 'b'.repeat(64);
+const REVISION = '1'.repeat(40);
+const SOURCE_REVISION = '2'.repeat(40);
+
+function fraction(numerator: number, denominator = 1): {
+  readonly numerator: number;
+  readonly denominator: number;
+} {
+  return { numerator, denominator };
+}
+
+function score(numerator: number, denominator = 1): {
+  readonly intersection: number;
+  readonly union: number;
+} {
+  return { intersection: numerator, union: denominator };
+}
+
+function promotionInput(): PromotionInput {
+  const states = QSFOG_BASES.flatMap((base) =>
+    [0, 1, 2, 3].map((index) => ({
+      stateId: `${base}-${String(index)}`,
+      base,
+      c1: score(3, 5),
+      c2: score(3, 5),
+      candidate: score(4, 5),
+    })),
+  );
+  return {
+    states,
+    stablePositiveLosses: 0,
+    fogFalseNegatives: { c1: 4, c2: 4, candidate: 4 },
+    obscurementFalseNegatives: { c1: 8, c2: 8, candidate: 8 },
+    families: {
+      ordinary: {
+        denominatorByBase: QSFOG_ORDINARY_DENOMINATORS,
+        c1ByBase: { '5763006': 8, '5763022': 8, '5763027': 8, '5763040': 8, '5763047': 8 },
+        c2ByBase: { '5763006': 8, '5763022': 8, '5763027': 8, '5763040': 8, '5763047': 8 },
+        candidateByBase: { '5763006': 6, '5763022': 6, '5763027': 6, '5763040': 6, '5763047': 6 },
+      },
+      collision: {
+        denominatorByBase: QSFOG_COLLISION_DENOMINATORS,
+        c1ByBase: { '5763006': 0, '5763022': 0, '5763027': 0, '5763040': 0, '5763047': 0 },
+        c2ByBase: { '5763006': 0, '5763022': 0, '5763027': 0, '5763040': 0, '5763047': 0 },
+        candidateByBase: { '5763006': 0, '5763022': 0, '5763027': 0, '5763040': 0, '5763047': 0 },
+      },
+    },
+    authenticated: true,
+    archivedControlEligible: true,
+  };
+}
+
+function baseBlock(candidate: boolean): QsFogSupervisorBlock {
+  const paths = {
+    identityManifest: '.tmp/qsfog/unchanged128',
+    candidateManifest: candidate ? '.tmp/qsfog/frame5/manifest.json' : null,
+    c1Jsonl: '.tmp/qsfog/answers/c1.jsonl',
+    c1ImagesRoot: '.tmp/qsfog/answers/c1-images',
+    c1Summary: '.tmp/qsfog/answers/c1-summary.md',
+    c2Jsonl: '.tmp/qsfog/answers/c2.jsonl',
+    c2ImagesRoot: '.tmp/qsfog/answers/c2-images',
+    c2Summary: '.tmp/qsfog/answers/c2-summary.md',
+    frameJsonl: '.tmp/qsfog/answers/frame5.jsonl',
+    frameImagesRoot: '.tmp/qsfog/answers/frame5-images',
+    frameSummary: '.tmp/qsfog/answers/frame5-summary.md',
+  };
+  const planned = [
+    paths.identityManifest,
+    paths.c1Jsonl,
+    paths.c1ImagesRoot,
+    paths.c1Summary,
+    paths.c2Jsonl,
+    paths.c2ImagesRoot,
+    paths.c2Summary,
+    ...(candidate ? [paths.frameJsonl, paths.frameImagesRoot, paths.frameSummary] : []),
+  ].sort();
+  const block: QsFogSupervisorBlock = {
+    version: 'qsfog-supervisor-block-v1',
+    blockId: '20260914-a',
+    timezone: 'America/New_York',
+    freezeSha256: SHA_A,
+    committedRevision: REVISION,
+    gitStatusShort: '',
+    allLanesPaused: { value: true, at: '2026-09-14T09:00:00-04:00', supervisor: 'owner' },
+    hashes: {
+      probeHarnessSha256: SHA_A,
+      probeTestSha256: SHA_B,
+      sourceRowsSha256: SHA_A,
+      diagnosisSha256: SHA_B,
+      sourceImageSetSha256: SHA_A,
+      identityManifestSha256: null,
+      candidateManifestSha256: candidate ? SHA_B : null,
+    },
+    invocationPolicy: {
+      model: 'gpt-5.6-sol',
+      effort: 'high',
+      states: 24,
+      seed: 20260910,
+      primer: 'general',
+      boardGlyphs: 'none',
+      captureTilePx: 128,
+      boardInput: 'png',
+      questions: ['Q9'],
+      generation: 'quietstone-svg-fog-intervention-r2',
+      rowVersion: 'd576-screenshot-comprehension-row-v10',
+      promptVersion: 'd576-screenshot-comprehension-v2',
+      primerVersion: 'd576-general-board-primer-v12',
+      normaliserVersion: 'd576-screenshot-vocabulary-normaliser-v4',
+      compare: null,
+      freshInvocationPerState: true,
+      order: ['C1', 'C2', 'frame5'],
+    },
+    paths,
+    unusedPathPreflight: {
+      checkedAt: '2026-09-14T09:00:00-04:00',
+      allAbsent: true,
+      paths: planned,
+    },
+    wholeBlockContinuity: {
+      fromArm: 'C1',
+      throughArm: candidate ? 'frame5' : 'C2',
+      startedAt: '2026-09-14T09:01:00-04:00',
+      endedAt: candidate ? '2026-09-14T09:40:00-04:00' : '2026-09-14T09:25:00-04:00',
+      uninterrupted: true,
+      interruptions: [],
+      attestedAt: candidate ? '2026-09-14T09:41:00-04:00' : '2026-09-14T09:26:00-04:00',
+      supervisor: 'owner',
+    },
+    arms: {
+      C1: {
+        startedAt: '2026-09-14T09:01:00-04:00',
+        endedAt: '2026-09-14T09:10:00-04:00',
+        serviceContinuity: 'continuous',
+        jsonlSha256: SHA_A,
+        imagesRootSha256: SHA_A,
+        manifestSha256: SHA_A,
+        rows: 24,
+        answered: 24,
+      },
+      C2: {
+        startedAt: '2026-09-14T09:15:00-04:00',
+        endedAt: '2026-09-14T09:25:00-04:00',
+        serviceContinuity: 'continuous',
+        jsonlSha256: SHA_A,
+        imagesRootSha256: SHA_A,
+        manifestSha256: SHA_A,
+        rows: 24,
+        answered: 24,
+      },
+      frame5: {
+        startedAt: candidate ? '2026-09-14T09:30:00-04:00' : null,
+        endedAt: candidate ? '2026-09-14T09:40:00-04:00' : null,
+        serviceContinuity: candidate ? 'continuous' : null,
+        jsonlSha256: candidate ? SHA_A : null,
+        imagesRootSha256: candidate ? SHA_A : null,
+        manifestSha256: candidate ? SHA_B : null,
+        rows: candidate ? 24 : null,
+        answered: candidate ? 24 : null,
+      },
+    },
+  };
+  block.freezeSha256 = computeBlockFreezeSha256(block);
+  return block;
+}
+
+describe('QSFOG Increment A frozen contract', () => {
+  it('freezes schemas, denominators, bases, and the pre-change discovery digest', () => {
+    expect(QSFOG_BASES).toEqual(['5763006', '5763022', '5763027', '5763040', '5763047']);
+    expect(Object.values(QSFOG_ORDINARY_DENOMINATORS).reduce((sum, value) => sum + value, 0)).toBe(5_331);
+    expect(Object.values(QSFOG_COLLISION_DENOMINATORS).reduce((sum, value) => sum + value, 0)).toBe(348);
+    expect(QSFOG_BASELINE_DISCOVERY).toEqual({
+      count: 599,
+      sha256: '54a76a0a317bdfc610e94c49e15214ecd633caf69a7844e309bff1b1c1e023ec',
+    });
+    expect(() => parseSupervisorBlock({ ...baseBlock(false), extra: true })).toThrow();
+  });
+
+  it('rejects stale block harness, HEAD, status, and pause authentication', () => {
+    const parsed = parseSupervisorBlock(baseBlock(false));
+    expect(() => computeBlockFreezeSha256({ ...parsed, committedRevision: '3'.repeat(40) })).not.toThrow();
+    expect(() => validateCompletedBlock({ ...parsed, freezeSha256: SHA_A }, false)).toThrow('stale');
+    expect(() => parseSupervisorBlock({ ...parsed, gitStatusShort: ' M tools/probe.ts' })).toThrow();
+    expect(() => parseSupervisorBlock({
+      ...parsed,
+      allLanesPaused: { ...parsed.allLanesPaused, value: false },
+    })).toThrow();
+  });
+
+  it('rejects canonical truth changes and PNG byte or IHDR changes', () => {
+    const truth: Q9Answer = {
+      version: 'd576-screenshot-comprehension-v2',
+      question: 'Q9',
+      foggedCells: [{ column: 1, row: 1 }],
+      obscuredCells: [{ column: 2, row: 2 }],
+    };
+    expect(() => validateCanonicalQ9Truth(
+      { ...truth, foggedCells: [{ column: 1, row: 2 }] },
+      truth,
+    )).toThrow('truth');
+    const png = Buffer.from(encodePng(2, 1, new Uint8Array(8)));
+    const expected = { sha256: createHash('sha256').update(png).digest('hex'), width: 2, height: 1 };
+    expect(() => validateIdentityPng(png, expected)).not.toThrow();
+    const flipped = Buffer.from(png);
+    flipped[flipped.length - 1] = (flipped[flipped.length - 1] ?? 0) ^ 1;
+    expect(() => validateIdentityPng(flipped, expected)).toThrow();
+    expect(() => validateIdentityPng(png, { ...expected, width: 3 })).toThrow('IHDR');
+  });
+
+  it('derives the probe summary overwrite path exactly', () => {
+    expect(deriveProbeSummaryPath('.tmp/run/c1.jsonl')).toBe('.tmp/run/c1-summary.md');
+    expect(() => deriveProbeSummaryPath('.tmp/run/c1.txt')).toThrow();
+  });
+
+  it('rejects traversal, absolute paths, duplicate flags, unknown flags, and missing values', () => {
+    expect(() => parseQsFogCliArgs(['identity-manifest', '--out', '../escape'])).toThrow();
+    expect(() => parseQsFogCliArgs(['identity-manifest', '--out', '/tmp/escape'])).toThrow();
+    expect(() => parseQsFogCliArgs(['paired-report', '--out-prefix', 'x', '--out-prefix', 'y'])).toThrow();
+    expect(() => parseQsFogCliArgs(['paired-report', '--wat', 'x'])).toThrow();
+    expect(() => parseQsFogCliArgs(['paired-report', '--out-prefix'])).toThrow();
+  });
+});
+
+const finalPaths = [
+  'identityManifest',
+  'c1Jsonl',
+  'c1ImagesRoot',
+  'c1Summary',
+  'c2Jsonl',
+  'c2ImagesRoot',
+  'c2Summary',
+  'frameJsonl',
+  'frameImagesRoot',
+  'frameSummary',
+] as const;
+
+for (const pathName of finalPaths) {
+  it(`rejects pre-existing final-block output ${pathName}`, async () => {
+    const directory = await mkdtemp(resolve('.tmp/qsfog-final-path-'));
+    try {
+      const block = baseBlock(true);
+      const target = resolve(directory, block.paths[pathName] ?? 'missing');
+      mkdirSync(target, { recursive: true });
+      await expect(assertUnusedBlockPaths(block, directory, true)).rejects.toThrow(pathName);
+    } finally {
+      await rm(directory, { recursive: true, force: true });
+    }
+  });
+}
+
+const repeatPaths = [
+  'identityManifest',
+  'c1Jsonl',
+  'c1ImagesRoot',
+  'c1Summary',
+  'c2Jsonl',
+  'c2ImagesRoot',
+  'c2Summary',
+] as const;
+
+for (const pathName of repeatPaths) {
+  it(`rejects pre-existing repeat-only output ${pathName}`, async () => {
+    const directory = await mkdtemp(resolve('.tmp/qsfog-repeat-path-'));
+    try {
+      const block = baseBlock(false);
+      const target = resolve(directory, block.paths[pathName]);
+      mkdirSync(target, { recursive: true });
+      await expect(assertUnusedBlockPaths(block, directory, false)).rejects.toThrow(pathName);
+    } finally {
+      await rm(directory, { recursive: true, force: true });
+    }
+  });
+}
+
+describe('QSFOG whole-interval authentication', () => {
+  it('accepts exact repeat-only C1-start through C2-end continuity', () => {
+    expect(() => validateCompletedBlock(baseBlock(false), false)).not.toThrow();
+  });
+
+  it('accepts exact final C1-start through frame5-end continuity', () => {
+    expect(() => validateCompletedBlock(baseBlock(true), true)).not.toThrow();
+  });
+
+  it('rejects an outage only in the inter-arm gap', () => {
+    const block = baseBlock(false);
+    const interrupted = {
+      ...block,
+      wholeBlockContinuity: {
+        ...block.wholeBlockContinuity,
+        interruptions: [{
+          startedAt: '2026-09-14T09:11:00-04:00',
+          endedAt: '2026-09-14T09:12:00-04:00',
+          reason: 'service outage',
+        }],
+      },
+    };
+    expect(() => validateCompletedBlock(interrupted, false)).toThrow('interruption');
+  });
+
+  it('rejects a non-New-York offset, date boundary, ordering error, and elapsed-time overflow', () => {
+    const wrongOffset = baseBlock(false);
+    wrongOffset.arms.C1.startedAt = '2026-09-14T09:01:00+00:00';
+    expect(() => validateCompletedBlock(wrongOffset, false)).toThrow('offset');
+    const wrongDate = baseBlock(false);
+    wrongDate.arms.C2.endedAt = '2026-09-15T00:01:00-04:00';
+    expect(() => validateCompletedBlock(wrongDate, false)).toThrow();
+    const wrongOrder = baseBlock(false);
+    wrongOrder.arms.C2.startedAt = '2026-09-14T09:05:00-04:00';
+    expect(() => validateCompletedBlock(wrongOrder, false)).toThrow('ordered');
+    const tooLong = baseBlock(false);
+    tooLong.arms.C2.endedAt = '2026-09-14T11:02:00-04:00';
+    expect(() => validateCompletedBlock(tooLong, false)).toThrow('two hours');
+  });
+});
+
+describe('QSFOG scoring and accounting', () => {
+  const truth: Q9Answer = {
+    version: 'd576-screenshot-comprehension-v2',
+    question: 'Q9',
+    foggedCells: [{ column: 0, row: 0 }, { column: 1, row: 0 }],
+    obscuredCells: [{ column: 1, row: 0 }, { column: 2, row: 0 }],
+  };
+  const diagnosis = [
+    { column: 0, row: 0, eligible: false, truthClass: 'fog-only' as const },
+    { column: 1, row: 0, eligible: false, truthClass: 'fog+obscured' as const },
+    { column: 2, row: 0, eligible: false, truthClass: 'obscured-only' as const },
+    { column: 3, row: 0, eligible: true, truthClass: 'neither' as const },
+    { column: 4, row: 0, eligible: false, truthClass: 'neither' as const },
+  ];
+
+  it('matches actual scorer semantics while retaining cross-class overlap and deduplicating repeats', () => {
+    const answer: Q9Answer = {
+      ...truth,
+      foggedCells: [{ column: 0, row: 0 }, { column: 0, row: 0 }, { column: 2, row: 0 }],
+      obscuredCells: [{ column: 0, row: 0 }, { column: 1, row: 0 }, { column: 1, row: 0 }],
+    };
+    const actual = scoreProbeAnswer(
+      parseProbeAnswer('Q9', canonicalJson(answer)),
+      parseProbeAnswer('Q9', canonicalJson(truth)),
+    );
+    const local = classifyQ9Accounting(answer, truth, { columns: 5, rows: 1 }, diagnosis);
+    expect(local.score).toBe(actual.score);
+    expect(local.hallucinations).toBe(actual.hallucinations);
+    expect(local.intersection).toBe(2);
+    expect(local.union).toBe(6);
+  });
+
+  it('accounts for all eight false-positive buckets and proves the identities', () => {
+    const answer: Q9Answer = {
+      ...truth,
+      foggedCells: [
+        { column: 0, row: 0 },
+        { column: 2, row: 0 },
+        { column: 3, row: 0 },
+        { column: 4, row: 0 },
+        { column: 5, row: 0 },
+      ],
+      obscuredCells: [
+        { column: 2, row: 0 },
+        { column: 0, row: 0 },
+        { column: 3, row: 0 },
+        { column: 4, row: 0 },
+        { column: 5, row: 0 },
+      ],
+    };
+    const result = classifyQ9Accounting(answer, truth, { columns: 5, rows: 1 }, diagnosis);
+    expect(result.buckets).toEqual({
+      fogEligibleOrdinary: 1,
+      fogObscuredOnly: 1,
+      fogExcludedNeither: 1,
+      fogOutOfBounds: 1,
+      obscuredEligibleOrdinary: 1,
+      obscuredFogOnly: 1,
+      obscuredExcludedNeither: 1,
+      obscuredOutOfBounds: 1,
+    });
+    expect(result.hallucinations).toBe(8);
+    expect(result.fogPredicted).toBe(result.fogTruePositives + 4);
+    expect(result.obscuredPredicted).toBe(result.obscuredTruePositives + 4);
+  });
+
+  it('rejects duplicate diagnosis records and an unpartitioned in-bounds prediction', () => {
+    expect(() => classifyQ9Accounting(truth, truth, { columns: 5, rows: 1 }, [...diagnosis, diagnosis[0]!])).toThrow();
+    expect(() => classifyQ9Accounting({ ...truth, foggedCells: [{ column: 4, row: 1 }] }, truth, {
+      columns: 5,
+      rows: 2,
+    }, diagnosis)).toThrow('diagnosis');
+  });
+
+  it(
+    'rejects missing, replacement, blocked, schema-rejected, non-answered, error, null-score, and null-answer rows',
+    () => {
+    const valid = {
+      stateId: 'state',
+      outcome: 'answered',
+      error: null,
+      score: 1,
+      answer: truth,
+      normalizedAnswer: truth,
+      resultKind: 'generated',
+    };
+    expect(() => validateProbeRows([], ['state'])).toThrow('missing');
+    expect(() => validateProbeRows([{ ...valid, resultKind: 'rescored' }], ['state'])).toThrow('replacement');
+    expect(() => validateProbeRows([{ ...valid, outcome: 'blocked' }], ['state'])).toThrow('answered');
+    expect(() => validateProbeRows([{ ...valid, outcome: 'schema_rejected' }], ['state'])).toThrow('answered');
+    expect(() => validateProbeRows([{ ...valid, outcome: 'other' }], ['state'])).toThrow('answered');
+    expect(() => validateProbeRows([{ ...valid, error: 'transport' }], ['state'])).toThrow('error');
+    expect(() => validateProbeRows([{ ...valid, score: null }], ['state'])).toThrow('score');
+    expect(() => validateProbeRows([{ ...valid, answer: null }], ['state'])).toThrow('answer');
+    },
+  );
+});
+
+describe('QSFOG repeatability, denominators, spread, headroom, and leave-one-out', () => {
+  it('uses mean absolute per-state differences instead of cancelling differences of means', () => {
+    const result = calculateRepeatability([
+      { stateId: 'a', base: '5763006', c1: score(1, 5), c2: score(2, 5) },
+      { stateId: 'b', base: '5763006', c1: score(2, 5), c2: score(1, 5) },
+    ]);
+    expect(result.byBase['5763006'].spread).toEqual(fraction(1, 5));
+    expect(result.byBase['5763006'].meanDifference).toEqual(fraction(0));
+  });
+
+  it('keeps pooled ordinary and collision denominators fixed at 5331 and 348', () => {
+    const result = calculatePromotion(promotionInput());
+    expect(result.families.ordinary.denominator).toBe(5_331);
+    expect(result.families.collision.denominator).toBe(348);
+    const changed = promotionInput();
+    changed.states = changed.states.slice(0, 19);
+    const changedResult = calculatePromotion(changed);
+    expect(changedResult.families.ordinary.denominator).toBe(5_331);
+    expect(changedResult.families.collision.denominator).toBe(348);
+  });
+
+  it('emits all five leave-one-base-out rows including 5763040', () => {
+    const result = calculatePromotion(promotionInput());
+    expect(Object.keys(result.leaveOneOut).sort()).toEqual([...QSFOG_BASES].sort());
+    expect(result.leaveOneOut['5763040'].comparison).toBe('positive');
+  });
+
+  it('returns INCONCLUSIVE_HEADROOM without relaxing score or rate thresholds', () => {
+    const input = promotionInput();
+    input.states = input.states.map((state, index) => ({
+      ...state,
+      c1: index % 2 === 0 ? score(1, 1) : score(0, 1),
+      c2: index % 2 === 0 ? score(0, 1) : score(1, 1),
+      candidate: score(1, 1),
+    }));
+    expect(calculatePromotion(input).verdict).toBe('INCONCLUSIVE_HEADROOM');
+  });
+
+  it('returns INCONCLUSIVE_HEADROOM when nonzero rate headroom cannot clear its own spread', () => {
+    const input = promotionInput();
+    for (const base of QSFOG_BASES) {
+      input.families.ordinary.c1ByBase[base] = 0;
+      input.families.ordinary.c2ByBase[base] = 2;
+      input.families.ordinary.candidateByBase[base] = 0;
+    }
+    expect(calculatePromotion(input).families.ordinary.headroom).toBe(false);
+    expect(calculatePromotion(input).verdict).toBe('INCONCLUSIVE_HEADROOM');
+  });
+
+  it('renders machine-consistent overall, five-base, five-LOO, and family summary rows', () => {
+    const input = promotionInput();
+    const csv = renderSummaryCsv(calculatePromotion(input), input);
+    const lines = csv.trimEnd().split('\n');
+    const columns = lines[0]!.split(',').length;
+    expect(lines).toHaveLength(24);
+    expect(lines.flatMap((line, index) =>
+      line.split(',').length === columns ? [] : [`${String(index)}:${line}`],
+    )).toEqual([]);
+    expect(lines[0]).toContain('condition_7');
+    expect(lines.filter((line) => line.startsWith('base,'))).toHaveLength(5);
+    expect(lines.filter((line) => line.startsWith('leave_one_out,'))).toHaveLength(5);
+    expect(lines.filter((line) => line.startsWith('family_base,'))).toHaveLength(10);
+  });
+});
+
+describe('QSFOG promotion boundaries', () => {
+  it('condition 1 passes at exact T and fails one representable step below', () => {
+    const exact = promotionInput();
+    exact.states = exact.states.map((state) => ({ ...state, candidate: score(13, 20) }));
+    expect(calculatePromotion(exact).conditions[0]).toBe(true);
+    const below = promotionInput();
+    below.states = below.states.map((state, index) => ({
+      ...state,
+      candidate: index === 0 ? score(12, 20) : score(13, 20),
+    }));
+    expect(calculatePromotion(below).conditions[0]).toBe(false);
+  });
+
+  it('condition 2 passes at exactly four of five bases and fails at three of five', () => {
+    const four = promotionInput();
+    four.states = four.states.map((state) => ({
+      ...state,
+      candidate: state.base === '5763047' ? score(3, 5) : score(4, 5),
+    }));
+    expect(calculatePromotion(four).conditions[1]).toBe(true);
+    const three = promotionInput();
+    three.states = three.states.map((state) => ({
+      ...state,
+      candidate: state.base === '5763047' || state.base === '5763040' ? score(3, 5) : score(4, 5),
+    }));
+    expect(calculatePromotion(three).conditions[1]).toBe(false);
+  });
+
+  it('condition 3 fails when leave-one-out becomes zero only after removing 5763040', () => {
+    const input = promotionInput();
+    input.states = input.states.map((state) => ({
+      ...state,
+      candidate: state.base === '5763040' ? score(1, 1) : score(3, 5),
+    }));
+    expect(calculatePromotion(input).leaveOneOut['5763040'].comparison).toBe('zero');
+    expect(calculatePromotion(input).conditions[2]).toBe(false);
+  });
+
+  it('condition 4 fails on one stable-positive loss', () => {
+    const input = promotionInput();
+    input.stablePositiveLosses = 1;
+    expect(calculatePromotion(input).conditions[3]).toBe(false);
+  });
+
+  it('condition 5 rejects fog false negatives separately at plus one', () => {
+    const input = promotionInput();
+    expect(calculatePromotion(input).conditions[4]).toBe(true);
+    input.fogFalseNegatives.candidate = 5;
+    expect(calculatePromotion(input).conditions[4]).toBe(false);
+  });
+
+  it('condition 5 rejects obscurement false negatives separately at plus one', () => {
+    const input = promotionInput();
+    input.obscurementFalseNegatives.candidate = 9;
+    expect(calculatePromotion(input).conditions[4]).toBe(false);
+  });
+
+  it('condition 6 rejects an ordinary regression', () => {
+    const input = promotionInput();
+    for (const base of QSFOG_BASES) {
+      input.families.ordinary.candidateByBase[base] = 8;
+      input.families.collision.c1ByBase[base] = 8;
+      input.families.collision.c2ByBase[base] = 8;
+      input.families.collision.candidateByBase[base] = 6;
+    }
+    input.families.ordinary.candidateByBase['5763006'] = 9;
+    expect(calculatePromotion(input).conditions[5]).toBe(false);
+  });
+
+  it('condition 6 rejects a collision regression', () => {
+    const input = promotionInput();
+    input.families.collision.c1ByBase['5763006'] = 2;
+    input.families.collision.c2ByBase['5763006'] = 2;
+    input.families.collision.candidateByBase['5763006'] = 3;
+    expect(calculatePromotion(input).conditions[5]).toBe(false);
+  });
+
+  it('condition 6 fails at 24.999 percent reduction and passes at exact 25 percent', () => {
+    const input = promotionInput();
+    for (const base of QSFOG_BASES) {
+      input.families.ordinary.c1ByBase[base] = 8_000;
+      input.families.ordinary.c2ByBase[base] = 8_000;
+      input.families.ordinary.candidateByBase[base] = 6_001;
+    }
+    expect(calculatePromotion(input).conditions[5]).toBe(false);
+    input.families.ordinary.candidateByBase['5763006'] = 6_000;
+    for (const base of QSFOG_BASES.slice(1)) {
+      input.families.ordinary.candidateByBase[base] = 6_000;
+    }
+    expect(calculatePromotion(input).conditions[5]).toBe(true);
+  });
+
+  it('condition 6 fails at exactly twice spread and passes at the next rational step', () => {
+    const input = promotionInput();
+    for (const base of QSFOG_BASES) {
+      input.families.ordinary.denominatorByBase[base] = 100;
+      input.families.ordinary.c1ByBase[base] = 10;
+      input.families.ordinary.c2ByBase[base] = 14;
+      input.families.ordinary.candidateByBase[base] = 4;
+    }
+    expect(calculatePromotion(input).conditions[5]).toBe(false);
+    input.families.ordinary.candidateByBase['5763006'] = 3;
+    expect(calculatePromotion(input).conditions[5]).toBe(true);
+  });
+
+  it('condition 6 allows ordinary qualification while collision remains equal', () => {
+    expect(calculatePromotion(promotionInput()).conditions[5]).toBe(true);
+  });
+
+  it('condition 6 allows collision qualification while ordinary remains equal', () => {
+    const input = promotionInput();
+    for (const base of QSFOG_BASES) {
+      input.families.ordinary.candidateByBase[base] = 8;
+      input.families.collision.c1ByBase[base] = 8;
+      input.families.collision.c2ByBase[base] = 8;
+      input.families.collision.candidateByBase[base] = 6;
+    }
+    expect(calculatePromotion(input).conditions[5]).toBe(true);
+  });
+
+  it('condition 6 keeps one zero reference at zero and does not credit it as qualifying', () => {
+    const input = promotionInput();
+    expect(calculatePromotion(input).families.collision.qualifies).toBe(false);
+    expect(calculatePromotion(input).families.ordinary.qualifies).toBe(true);
+  });
+
+  it('condition 6 vacuously passes when both references and candidates are zero', () => {
+    const input = promotionInput();
+    for (const family of Object.values(input.families)) {
+      for (const base of QSFOG_BASES) {
+        family.c1ByBase[base] = 0;
+        family.c2ByBase[base] = 0;
+        family.candidateByBase[base] = 0;
+      }
+    }
+    expect(calculatePromotion(input).conditions[5]).toBe(true);
+  });
+
+  it('condition 6 rejects any candidate count over a zero reference', () => {
+    const input = promotionInput();
+    for (const base of QSFOG_BASES) {
+      input.families.ordinary.c1ByBase[base] = 0;
+      input.families.ordinary.c2ByBase[base] = 0;
+      input.families.ordinary.candidateByBase[base] = 0;
+    }
+    input.families.collision.candidateByBase['5763006'] = 1;
+    expect(calculatePromotion(input).conditions[5]).toBe(false);
+  });
+
+  it('condition 6 preserves odd and even C1 plus C2 counts as exact half-integers', () => {
+    const input = promotionInput();
+    input.families.ordinary.c1ByBase['5763006'] = 7;
+    input.families.ordinary.c2ByBase['5763006'] = 8;
+    const result = calculatePromotion(input);
+    expect(result.families.ordinary.referenceCount).toEqual(fraction(79, 2));
+    input.families.ordinary.c1ByBase['5763006'] = 8;
+    expect(calculatePromotion(input).families.ordinary.referenceCount).toEqual(fraction(40));
+  });
+
+  it('condition 7 rejects false authentication and false eligibility independently', () => {
+    const unauthenticated = promotionInput();
+    unauthenticated.authenticated = false;
+    expect(calculatePromotion(unauthenticated).conditions[6]).toBe(false);
+    expect(calculatePromotion(unauthenticated).verdict).toBe('INVALID_INPUT');
+    const ineligible = promotionInput();
+    ineligible.archivedControlEligible = false;
+    expect(calculatePromotion(ineligible).conditions[6]).toBe(false);
+    expect(calculatePromotion(ineligible).verdict).toBe('INCOMPARABLE_FRESH_RECAPTURE_CONTROLS_REQUIRED');
+  });
+});
+
+describe('QSFOG identity producer to real probe consumer', () => {
+  it('authenticates truth and PNGs, copies exact bytes, and bypasses snapshot capture and close', async () => {
+    const repositoryRoot = resolve('.');
+    const directory = await mkdtemp(resolve('.tmp/qsfog-builder-'));
+    try {
+      const hero = playerProfile('qsfog-builder-hero');
+      const foe = monsterProfile('qsfog-builder-foe');
+      const state = createEncounter({
+        bounds: { columns: 6, rows: 4 },
+        combatants: [hero, foe],
+        tokens: [placedToken(hero, 1, 1), placedToken(foe, 2, 2)],
+        foggedCells: [{ column: 4, row: 3 }],
+        environment: {
+          difficultTerrainRegions: [],
+          obscurementRegions: [
+            { id: 'smoke', obscurement: 'heavy', cells: [{ column: 3, row: 1 }] },
+          ],
+          lightRegions: [],
+          movementRegions: [],
+          narrowOpeningRegions: [],
+        },
+      });
+      const candidate = { id: 'generated-los-cover-v1-5763006-half-v1', state };
+      const dimensions = boardChromeDimensions(candidate.state.bounds, undefined, 128);
+      const png = encodePng(dimensions.width, 1, new Uint8Array(dimensions.width * 4));
+      const pngSha256 = createHash('sha256').update(png).digest('hex');
+      const sourceRoot = join(directory, 'source-images');
+      const sourceRootRelative = relative(repositoryRoot, sourceRoot);
+      mkdirSync(join(sourceRoot, 'board-images'), { recursive: true });
+      mkdirSync(join(sourceRoot, 'manifests'), { recursive: true });
+      await writeFile(join(sourceRoot, 'board-images', `${pngSha256}.png`), png);
+      const sheet = deriveScreenshotFactSheet(candidate.state);
+      const truth = truthAnswer(sheet, 'Q9');
+      const stateDigest = createHash('sha256').update(canonicalJson(candidate.state)).digest('hex');
+      const sourceRow = {
+        version: 'd576-screenshot-comprehension-row-v10',
+        stateId: candidate.id,
+        stateDigest,
+        model: 'gpt-5.6-sol',
+        effort: 'high',
+        question: 'Q9',
+        promptVersion: 'd576-screenshot-comprehension-v2',
+        primerVersion: PRIMER_VERSION,
+        generation: 'quietstone-eval',
+        boardGlyphs: 'none',
+        captureTilePx: 128,
+        boardInput: 'png',
+        semanticPayloadSha256: SHA_A,
+        semanticPayloadBytes: 1,
+        semanticPayloadRelativePath: 'semantic-boards/a.json',
+        png: { sha256: pngSha256, relativePath: `board-images/${pngSha256}.png`, ...dimensions, height: 1 },
+        outcome: 'answered',
+        score: 1,
+        hallucinations: 0,
+        confusions: [],
+        wallMs: 1,
+        tokens: null,
+        truth,
+        answer: truth,
+        normalizedAnswer: truth,
+        rawAnswer: canonicalJson(truth),
+        error: null,
+        resultKind: 'generated',
+        sourceFileSha256: null,
+        normaliserVersion: NORMALISER_VERSION,
+      };
+      const sourceRowsPath = join(directory, 'source.jsonl');
+      const sourceRowsBytes = `${canonicalJson(sourceRow)}\n`;
+      await writeFile(sourceRowsPath, sourceRowsBytes);
+      const terminal = {
+        version: 'arena-board-snapshot-manifest-v1',
+        chromiumVersion: '149.0.7827.55',
+        playwrightVersion: '1.61.1',
+        executableSha256: SHA_A,
+        os: { platform: 'linux', release: 'test', architecture: 'x64' },
+        viewport: { width: 1280, height: 1280 },
+        deviceScaleFactor: 1,
+        tileSizeCssPx: 128,
+        maximumPngBytes: 1_000_000,
+        capturePolicy: 'encounter-board-element-settled-v1',
+        boardGlyphsOverride: 'none',
+        coldStartMs: 1,
+        artifacts: [{
+          version: 'arena-board-image-v1',
+          audience: 'dm',
+          mimeType: 'image/png',
+          relativePath: `board-images/${pngSha256}.png`,
+          sha256: pngSha256,
+          bytes: png.byteLength,
+          width: dimensions.width,
+          height: 1,
+          capturedAtUnixMs: 1,
+          captureMs: 1,
+          source: { revision: candidate.state.revision, room: 1, round: candidate.state.round, stateDigest },
+          chromiumVersion: '149.0.7827.55',
+          html: { relativePath: `board-html/${SHA_A}/board.html`, sha256: SHA_A, bytes: 1 },
+        }],
+      };
+      const terminalBytes = `${canonicalJson(terminal)}\n`;
+      const terminalSha256 = createHash('sha256').update(terminalBytes).digest('hex');
+      const terminalPath = join(sourceRoot, 'manifests', `${terminalSha256}.json`);
+      await writeFile(terminalPath, terminalBytes);
+      const sourceImageSet = [
+        `${relative(repositoryRoot, join(sourceRoot, 'board-images', `${pngSha256}.png`))}\t${pngSha256}\n`,
+        `${relative(repositoryRoot, terminalPath)}\t${terminalSha256}\n`,
+      ].sort().join('');
+      const sourceImageSetSha256 = createHash('sha256').update(sourceImageSet).digest('hex');
+      const block = baseBlock(false);
+      block.invocationPolicy.states = 1;
+      block.paths.identityManifest = relative(repositoryRoot, join(directory, 'identity'));
+      block.paths.c1Jsonl = relative(repositoryRoot, join(directory, 'c1.jsonl'));
+      block.paths.c1ImagesRoot = relative(repositoryRoot, join(directory, 'c1-images'));
+      block.paths.c1Summary = relative(repositoryRoot, join(directory, 'c1-summary.md'));
+      block.paths.c2Jsonl = relative(repositoryRoot, join(directory, 'c2.jsonl'));
+      block.paths.c2ImagesRoot = relative(repositoryRoot, join(directory, 'c2-images'));
+      block.paths.c2Summary = relative(repositoryRoot, join(directory, 'c2-summary.md'));
+      block.hashes.sourceRowsSha256 = createHash('sha256').update(sourceRowsBytes).digest('hex');
+      block.hashes.sourceImageSetSha256 = sourceImageSetSha256;
+      block.hashes.probeHarnessSha256 = createHash('sha256').update('harness').digest('hex');
+      block.hashes.probeTestSha256 = createHash('sha256').update('probe-test').digest('hex');
+      block.freezeSha256 = computeBlockFreezeSha256(block);
+      block.unusedPathPreflight.paths = [
+        block.paths.identityManifest,
+        block.paths.c1Jsonl,
+        block.paths.c1ImagesRoot,
+        block.paths.c1Summary,
+        block.paths.c2Jsonl,
+        block.paths.c2ImagesRoot,
+        block.paths.c2Summary,
+      ].sort();
+      const blockPath = join(directory, 'block.json');
+      await writeFile(blockPath, `${canonicalJson(block)}\n`);
+      const manifest = await buildIdentityManifest({
+        repositoryRoot,
+        blockRecordPath: blockPath,
+        sourceRowsPath,
+        expectedSourceRowsSha256: block.hashes.sourceRowsSha256,
+        sourceImagesRoot: sourceRootRelative,
+        sourceRevision: SOURCE_REVISION,
+        states: 1,
+        seed: 20260910,
+        model: 'gpt-5.6-sol:high',
+        question: 'Q9',
+        outDirectory: resolve(repositoryRoot, block.paths.identityManifest),
+      }, {
+        candidates: [candidate],
+        currentHead: REVISION,
+        gitStatusShort: '',
+        harnessBytes: Buffer.from('harness'),
+        committedHarnessBytes: Buffer.from('harness'),
+        committedProbeTestBytes: Buffer.from('probe-test'),
+        skipDiagnosisHash: true,
+        expectedHarnessSha256: createHash('sha256').update('harness').digest('hex'),
+        expectedProbeTestSha256: createHash('sha256').update('probe-test').digest('hex'),
+        allowSyntheticFixture: true,
+      });
+      const copiedPath = join(directory, 'identity', manifest.states[candidate.id]!.file);
+      expect(await readFile(copiedPath)).toEqual(Buffer.from(png));
+      let answerImage: Buffer | null = null;
+      const rows = await runScreenshotProbe({
+        models: [{ provider: 'codex', model: 'gpt-5.6-sol', effort: 'high' }],
+        stateCount: 1,
+        seed: 20260910,
+        imagesRoot: join(directory, 'probe-images'),
+        outPath: join(directory, 'probe.jsonl'),
+        summaryPath: join(directory, 'probe-summary.md'),
+        simulate: false,
+        primer: 'general',
+        generation: 'quietstone-intervention-test',
+        comparePath: null,
+        comparisonMode: 'acceptance',
+        boardGlyphs: 'none',
+        captureTilePx: 128,
+        boardInput: 'png',
+        imageOverrideManifestPath: join(directory, 'identity', 'manifest.json'),
+        imageOverrideSourceRoot: sourceRoot,
+        questions: ['Q9'],
+      }, {
+        candidates: [candidate],
+        snapshotService: {
+          capture: () => Promise.reject(new Error('snapshot capture touched')),
+          close: () => Promise.reject(new Error('snapshot close touched')),
+        },
+        answerer: {
+          async answer(request: ProbeAnswerRequest) {
+            if (request.imagePath === null) {
+              throw new Error('Probe did not provide the image path.');
+            }
+            answerImage = await readFile(request.imagePath);
+            return { rawAnswer: canonicalJson(request.truth), wallMs: 1, tokens: null, error: null };
+          },
+        },
+      });
+      expect(answerImage).toEqual(Buffer.from(png));
+      expect(rows[0]?.png.sha256).toBe(pngSha256);
+      expect(rows[0]?.imageOverride?.originalPngSha256).toBe(pngSha256);
+    } finally {
+      await rm(directory, { recursive: true, force: true });
+    }
+  });
+});
diff --git a/tools/qsfog-intervention-report.ts b/tools/qsfog-intervention-report.ts
new file mode 100644
index 0000000000000000000000000000000000000000..0e7f68512e36933f30a56ff77eb583c3b7499270
--- /dev/null
+++ b/tools/qsfog-intervention-report.ts
@@ -0,0 +1,2639 @@
+import { execFileSync } from 'node:child_process';
+import { createHash } from 'node:crypto';
+import { readdirSync, statSync } from 'node:fs';
+import {
+  lstat,
+  mkdir,
+  readFile,
+  readdir,
+  writeFile,
+} from 'node:fs/promises';
+import {
+  dirname,
+  isAbsolute,
+  join,
+  relative,
+  resolve,
+  sep,
+} from 'node:path';
+import { pathToFileURL } from 'node:url';
+import { z } from 'zod';
+import { canonicalJson } from '../src/commands/canonical-json';
+import {
+  NORMALISER_VERSION,
+  PRIMER_VERSION,
+  defaultProbeStateCandidates,
+  deriveScreenshotFactSheet,
+  parseProbeAnswer,
+  scoreProbeAnswer,
+  truthAnswer,
+  type ProbeStateCandidate,
+} from './ai-dm-screenshot-probe';
+import { boardStateDigest } from './ai-dm-board-snapshot';
+
+const repositoryRoot = resolve(new URL('../', import.meta.url).pathname);
+const SHA256_PATTERN = /^[0-9a-f]{64}$/u;
+const REVISION_PATTERN = /^[0-9a-f]{40}$/u;
+const ISO_OFFSET_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?[+-]\d{2}:\d{2}$/u;
+const TWO_HOURS_MS = 7_200_000;
+const SCORE_FLOOR = rational(1, 20);
+const FROZEN_SOURCE_ROWS_SHA256 = 'f614dd0298d3be2ba41440fdc18cde97ed5f1ffa8500725b820b47da6623adb9';
+const FROZEN_SOURCE_REVISION = '28f3bd1daa11f28c7a84f6431daaa51e25a2da47';
+
+export const QSFOG_BASES = [
+  '5763006',
+  '5763022',
+  '5763027',
+  '5763040',
+  '5763047',
+] as const;
+
+export type QsFogBase = (typeof QSFOG_BASES)[number];
+
+export const QSFOG_ORDINARY_DENOMINATORS: Record<QsFogBase, number> = {
+  '5763006': 1_090,
+  '5763022': 1_190,
+  '5763027': 689,
+  '5763040': 1_040,
+  '5763047': 1_322,
+};
+
+export const QSFOG_COLLISION_DENOMINATORS: Record<QsFogBase, number> = {
+  '5763006': 95,
+  '5763022': 103,
+  '5763027': 35,
+  '5763040': 60,
+  '5763047': 55,
+};
+
+export const QSFOG_BASELINE_DISCOVERY = {
+  count: 599,
+  sha256: '54a76a0a317bdfc610e94c49e15214ecd633caf69a7844e309bff1b1c1e023ec',
+} as const;
+
+export interface Q9Cell {
+  column: number;
+  row: number;
+}
+
+export interface Q9Answer {
+  version: 'd576-screenshot-comprehension-v2';
+  question: 'Q9';
+  foggedCells: readonly Q9Cell[];
+  obscuredCells: readonly Q9Cell[];
+}
+
+export interface QsFogArmRecord {
+  startedAt: string | null;
+  endedAt: string | null;
+  serviceContinuity: 'continuous' | 'interrupted' | null;
+  jsonlSha256: string | null;
+  imagesRootSha256: string | null;
+  manifestSha256: string | null;
+  rows: number | null;
+  answered: number | null;
+}
+
+export interface QsFogSupervisorBlock {
+  version: 'qsfog-supervisor-block-v1';
+  blockId: string;
+  timezone: 'America/New_York';
+  freezeSha256: string;
+  committedRevision: string;
+  gitStatusShort: '';
+  allLanesPaused: { value: true; at: string; supervisor: string };
+  hashes: {
+    probeHarnessSha256: string;
+    probeTestSha256: string;
+    sourceRowsSha256: string;
+    diagnosisSha256: string;
+    sourceImageSetSha256: string;
+    identityManifestSha256: string | null;
+    candidateManifestSha256: string | null;
+  };
+  invocationPolicy: {
+    model: 'gpt-5.6-sol';
+    effort: 'high';
+    states: number;
+    seed: 20260910;
+    primer: 'general';
+    boardGlyphs: 'none';
+    captureTilePx: 128;
+    boardInput: 'png';
+    questions: ['Q9'];
+    generation: string;
+    rowVersion: 'd576-screenshot-comprehension-row-v10';
+    promptVersion: 'd576-screenshot-comprehension-v2';
+    primerVersion: 'd576-general-board-primer-v12';
+    normaliserVersion: 'd576-screenshot-vocabulary-normaliser-v4';
+    compare: null;
+    freshInvocationPerState: true;
+    order: ['C1', 'C2', 'frame5'];
+  };
+  paths: {
+    identityManifest: string;
+    candidateManifest: string | null;
+    c1Jsonl: string;
+    c1ImagesRoot: string;
+    c1Summary: string;
+    c2Jsonl: string;
+    c2ImagesRoot: string;
+    c2Summary: string;
+    frameJsonl: string;
+    frameImagesRoot: string;
+    frameSummary: string;
+  };
+  unusedPathPreflight: {
+    checkedAt: string;
+    allAbsent: true;
+    paths: string[];
+  };
+  wholeBlockContinuity: {
+    fromArm: 'C1';
+    throughArm: 'C2' | 'frame5';
+    startedAt: string | null;
+    endedAt: string | null;
+    uninterrupted: true | null;
+    interruptions: Array<{ startedAt: string; endedAt: string; reason: string }>;
+    attestedAt: string | null;
+    supervisor: string;
+  };
+  arms: Record<'C1' | 'C2' | 'frame5', QsFogArmRecord>;
+}
+
+const sha256Schema = z.string().regex(SHA256_PATTERN);
+const revisionSchema = z.string().regex(REVISION_PATTERN);
+const repositoryPathSchema = z.string().min(1).superRefine((value, context) => {
+  if (isAbsolute(value)) {
+    context.addIssue({ code: 'custom', message: 'path must be repository-relative' });
+  }
+  if (value.split(/[\\/]/u).includes('..')) {
+    context.addIssue({ code: 'custom', message: 'path traversal is forbidden' });
+  }
+});
+const nullableRepositoryPathSchema = repositoryPathSchema.nullable();
+const armSchema = z.object({
+  startedAt: z.string().nullable(),
+  endedAt: z.string().nullable(),
+  serviceContinuity: z.enum(['continuous', 'interrupted']).nullable(),
+  jsonlSha256: sha256Schema.nullable(),
+  imagesRootSha256: sha256Schema.nullable(),
+  manifestSha256: sha256Schema.nullable(),
+  rows: z.number().int().nonnegative().nullable(),
+  answered: z.number().int().nonnegative().nullable(),
+}).strict();
+const pathsSchema = z.object({
+  identityManifest: repositoryPathSchema,
+  candidateManifest: nullableRepositoryPathSchema,
+  c1Jsonl: repositoryPathSchema,
+  c1ImagesRoot: repositoryPathSchema,
+  c1Summary: repositoryPathSchema,
+  c2Jsonl: repositoryPathSchema,
+  c2ImagesRoot: repositoryPathSchema,
+  c2Summary: repositoryPathSchema,
+  frameJsonl: repositoryPathSchema,
+  frameImagesRoot: repositoryPathSchema,
+  frameSummary: repositoryPathSchema,
+}).strict();
+const supervisorBlockSchema = z.object({
+  version: z.literal('qsfog-supervisor-block-v1'),
+  blockId: z.string().min(1),
+  timezone: z.literal('America/New_York'),
+  freezeSha256: sha256Schema,
+  committedRevision: revisionSchema,
+  gitStatusShort: z.literal(''),
+  allLanesPaused: z.object({
+    value: z.literal(true),
+    at: z.string().min(1),
+    supervisor: z.string().min(1),
+  }).strict(),
+  hashes: z.object({
+    probeHarnessSha256: sha256Schema,
+    probeTestSha256: sha256Schema,
+    sourceRowsSha256: sha256Schema,
+    diagnosisSha256: sha256Schema,
+    sourceImageSetSha256: sha256Schema,
+    identityManifestSha256: sha256Schema.nullable(),
+    candidateManifestSha256: sha256Schema.nullable(),
+  }).strict(),
+  invocationPolicy: z.object({
+    model: z.literal('gpt-5.6-sol'),
+    effort: z.literal('high'),
+    states: z.number().int().positive(),
+    seed: z.literal(20260910),
+    primer: z.literal('general'),
+    boardGlyphs: z.literal('none'),
+    captureTilePx: z.literal(128),
+    boardInput: z.literal('png'),
+    questions: z.tuple([z.literal('Q9')]),
+    generation: z.string().min(1),
+    rowVersion: z.literal('d576-screenshot-comprehension-row-v10'),
+    promptVersion: z.literal('d576-screenshot-comprehension-v2'),
+    primerVersion: z.literal('d576-general-board-primer-v12'),
+    normaliserVersion: z.literal('d576-screenshot-vocabulary-normaliser-v4'),
+    compare: z.null(),
+    freshInvocationPerState: z.literal(true),
+    order: z.tuple([z.literal('C1'), z.literal('C2'), z.literal('frame5')]),
+  }).strict(),
+  paths: pathsSchema,
+  unusedPathPreflight: z.object({
+    checkedAt: z.string().min(1),
+    allAbsent: z.literal(true),
+    paths: z.array(repositoryPathSchema),
+  }).strict(),
+  wholeBlockContinuity: z.object({
+    fromArm: z.literal('C1'),
+    throughArm: z.enum(['C2', 'frame5']),
+    startedAt: z.string().nullable(),
+    endedAt: z.string().nullable(),
+    uninterrupted: z.literal(true).nullable(),
+    interruptions: z.array(z.object({
+      startedAt: z.string().min(1),
+      endedAt: z.string().min(1),
+      reason: z.string().min(1),
+    }).strict()),
+    attestedAt: z.string().nullable(),
+    supervisor: z.string().min(1),
+  }).strict(),
+  arms: z.object({ C1: armSchema, C2: armSchema, frame5: armSchema }).strict(),
+}).strict();
+
+const q9CellSchema = z.object({
+  column: z.number().int().nonnegative(),
+  row: z.number().int().nonnegative(),
+}).strict();
+const q9AnswerSchema = z.object({
+  version: z.literal('d576-screenshot-comprehension-v2'),
+  question: z.literal('Q9'),
+  foggedCells: z.array(q9CellSchema),
+  obscuredCells: z.array(q9CellSchema),
+}).strict();
+const pngSchema = z.object({
+  sha256: sha256Schema,
+  relativePath: repositoryPathSchema,
+  width: z.number().int().positive(),
+  height: z.number().int().positive(),
+}).strict();
+const sourceQ9RowSchema = z.object({
+  version: z.literal('d576-screenshot-comprehension-row-v10'),
+  stateId: z.string().min(1),
+  stateDigest: sha256Schema,
+  model: z.literal('gpt-5.6-sol'),
+  effort: z.literal('high'),
+  question: z.literal('Q9'),
+  promptVersion: z.literal('d576-screenshot-comprehension-v2'),
+  primerVersion: z.literal('d576-general-board-primer-v12'),
+  generation: z.literal('quietstone-eval'),
+  boardGlyphs: z.literal('none'),
+  captureTilePx: z.literal(128),
+  boardInput: z.literal('png'),
+  semanticPayloadSha256: sha256Schema,
+  semanticPayloadBytes: z.number().int().positive(),
+  semanticPayloadRelativePath: repositoryPathSchema,
+  png: pngSchema,
+  outcome: z.literal('answered'),
+  score: z.number().min(0).max(1),
+  hallucinations: z.number().int().nonnegative(),
+  confusions: z.array(z.string()),
+  wallMs: z.number().nonnegative(),
+  tokens: z.object({
+    input: z.number().int().nonnegative(),
+    cachedInput: z.number().int().nonnegative(),
+    output: z.number().int().nonnegative(),
+    reasoning: z.number().int().nonnegative(),
+  }).strict().nullable(),
+  truth: q9AnswerSchema,
+  answer: q9AnswerSchema,
+  normalizedAnswer: q9AnswerSchema,
+  rawAnswer: z.string(),
+  error: z.null(),
+  resultKind: z.literal('generated'),
+  sourceFileSha256: z.null(),
+  normaliserVersion: z.literal('d576-screenshot-vocabulary-normaliser-v4'),
+}).strict();
+const imageOverrideSchema = z.object({
+  manifestPath: repositoryPathSchema,
+  manifestSha256: sha256Schema,
+  kind: z.string().min(1),
+  version: z.literal('qsfog-image-override-manifest-v2'),
+  sourceRevision: revisionSchema,
+  sourceRevisionSource: z.literal('recomposition-manifest'),
+  sourceImagesRoot: repositoryPathSchema,
+  originalPngSha256: sha256Schema,
+}).strict();
+const armQ9RowSchema = sourceQ9RowSchema.extend({
+  generation: z.string().min(1),
+  imageOverride: imageOverrideSchema,
+}).strict();
+const imageManifestEntrySchema = z.object({
+  file: repositoryPathSchema,
+  sha256: sha256Schema,
+  width: z.number().int().positive(),
+  height: z.number().int().positive(),
+  sourcePng: z.object({
+    sha256: sha256Schema,
+    width: z.number().int().positive(),
+    height: z.number().int().positive(),
+  }).strict(),
+}).strict();
+const imageOverrideManifestSchema = z.object({
+  kind: z.string().min(1),
+  version: z.literal('qsfog-image-override-manifest-v2'),
+  sourceRevision: revisionSchema,
+  sourceImagesRoot: repositoryPathSchema,
+  states: z.record(z.string().min(1), imageManifestEntrySchema),
+  manipulationValidation: z.unknown(),
+}).strict();
+const snapshotArtifactSchema = z.object({
+  version: z.literal('arena-board-image-v1'),
+  audience: z.literal('dm'),
+  mimeType: z.literal('image/png'),
+  relativePath: repositoryPathSchema,
+  sha256: sha256Schema,
+  bytes: z.number().int().positive(),
+  width: z.number().int().positive(),
+  height: z.number().int().positive(),
+  capturedAtUnixMs: z.number().nonnegative(),
+  captureMs: z.number().nonnegative(),
+  source: z.object({
+    revision: z.number().int().nonnegative(),
+    room: z.number().int().positive(),
+    round: z.number().int().nonnegative(),
+    stateDigest: sha256Schema,
+  }).strict(),
+  chromiumVersion: z.string().min(1),
+  html: z.object({
+    relativePath: repositoryPathSchema,
+    sha256: sha256Schema,
+    bytes: z.number().int().positive(),
+  }).strict(),
+}).strict();
+const snapshotManifestSchema = z.object({
+  version: z.literal('arena-board-snapshot-manifest-v1'),
+  chromiumVersion: z.string().min(1),
+  playwrightVersion: z.string().min(1),
+  executableSha256: sha256Schema,
+  os: z.object({
+    platform: z.string().min(1),
+    release: z.string().min(1),
+    architecture: z.string().min(1),
+  }).strict(),
+  viewport: z.object({ width: z.literal(1280), height: z.literal(1280) }).strict(),
+  deviceScaleFactor: z.literal(1),
+  tileSizeCssPx: z.literal(128),
+  maximumPngBytes: z.literal(1_000_000),
+  capturePolicy: z.literal('encounter-board-element-settled-v1'),
+  boardGlyphsOverride: z.literal('none'),
+  coldStartMs: z.number().nonnegative(),
+  artifacts: z.array(snapshotArtifactSchema),
+}).strict();
+
+export function parseSupervisorBlock(value: unknown): QsFogSupervisorBlock {
+  const block = supervisorBlockSchema.parse(value);
+  if ((block.paths.candidateManifest === null)
+    !== (block.hashes.candidateManifestSha256 === null)) {
+    throw new Error('Candidate manifest path and SHA-256 must both be null or both be present.');
+  }
+  if (new Set(block.unusedPathPreflight.paths).size !== block.unusedPathPreflight.paths.length) {
+    throw new Error('unusedPathPreflight.paths contains a duplicate path.');
+  }
+  validateZonedTimestamp(block.allLanesPaused.at, 'all-lanes-paused attestation');
+  validateZonedTimestamp(block.unusedPathPreflight.checkedAt, 'unused-path preflight');
+  return block;
+}
+
+function sha256(bytes: Uint8Array | string): string {
+  return createHash('sha256').update(bytes).digest('hex');
+}
+
+function parseJson(bytes: Uint8Array, description: string): unknown {
+  try {
+    return JSON.parse(Buffer.from(bytes).toString('utf8')) as unknown;
+  } catch (error) {
+    throw new TypeError(`${description} is not valid JSON.`, { cause: error });
+  }
+}
+
+function parseJsonLines(bytes: Uint8Array, description: string): readonly unknown[] {
+  const text = Buffer.from(bytes).toString('utf8');
+  if (!text.endsWith('\n')) {
+    throw new TypeError(`${description} must end with a newline.`);
+  }
+  return text.slice(0, -1).split('\n').map((line, index) => {
+    try {
+      return JSON.parse(line) as unknown;
+    } catch (error) {
+      throw new TypeError(`${description} line ${String(index + 1)} is not valid JSON.`, { cause: error });
+    }
+  });
+}
+
+function record(value: unknown): Record<string, unknown> | null {
+  return typeof value === 'object' && value !== null && !Array.isArray(value)
+    ? value as Record<string, unknown>
+    : null;
+}
+
+function resolveRepositoryPath(root: string, value: string, label: string): string {
+  if (isAbsolute(value) || value.split(/[\\/]/u).includes('..')) {
+    throw new RangeError(`${label} must be a non-traversing repository-relative path.`);
+  }
+  const resolved = resolve(root, value);
+  if (resolved !== root && !resolved.startsWith(`${root}${sep}`)) {
+    throw new RangeError(`${label} resolves outside the repository.`);
+  }
+  return resolved;
+}
+
+export function deriveProbeSummaryPath(jsonlPath: string): string {
+  if (!jsonlPath.endsWith('.jsonl')) {
+    throw new RangeError('Probe JSONL path must end in .jsonl.');
+  }
+  return `${jsonlPath.slice(0, -'.jsonl'.length)}-summary.md`;
+}
+
+function plannedPathEntries(
+  block: QsFogSupervisorBlock,
+  includeCandidate: boolean,
+): readonly [keyof QsFogSupervisorBlock['paths'], string][] {
+  const common: Array<[keyof QsFogSupervisorBlock['paths'], string]> = [
+    ['identityManifest', block.paths.identityManifest],
+    ['c1Jsonl', block.paths.c1Jsonl],
+    ['c1ImagesRoot', block.paths.c1ImagesRoot],
+    ['c1Summary', block.paths.c1Summary],
+    ['c2Jsonl', block.paths.c2Jsonl],
+    ['c2ImagesRoot', block.paths.c2ImagesRoot],
+    ['c2Summary', block.paths.c2Summary],
+  ];
+  if (!includeCandidate) {
+    return common;
+  }
+  return [
+    ...common,
+    ['frameJsonl', block.paths.frameJsonl],
+    ['frameImagesRoot', block.paths.frameImagesRoot],
+    ['frameSummary', block.paths.frameSummary],
+  ];
+}
+
+function validatePlannedPathContract(block: QsFogSupervisorBlock, includeCandidate: boolean): void {
+  if (block.paths.c1Summary !== deriveProbeSummaryPath(block.paths.c1Jsonl)) {
+    throw new Error('c1Summary does not match the derived probe summary path.');
+  }
+  if (block.paths.c2Summary !== deriveProbeSummaryPath(block.paths.c2Jsonl)) {
+    throw new Error('c2Summary does not match the derived probe summary path.');
+  }
+  if (block.paths.frameSummary !== deriveProbeSummaryPath(block.paths.frameJsonl)) {
+    throw new Error('frameSummary does not match the derived probe summary path.');
+  }
+  const planned = plannedPathEntries(block, includeCandidate).map((entry) => entry[1]).sort();
+  const recorded = [...block.unusedPathPreflight.paths].sort();
+  if (canonicalJson(planned) !== canonicalJson(recorded)) {
+    throw new Error('unusedPathPreflight.paths differs from the exact planned output set.');
+  }
+}
+
+export async function assertUnusedBlockPaths(
+  blockInput: QsFogSupervisorBlock,
+  root: string,
+  includeCandidate: boolean,
+): Promise<void> {
+  const block = parseSupervisorBlock(blockInput);
+  validatePlannedPathContract(block, includeCandidate);
+  for (const [name, path] of plannedPathEntries(block, includeCandidate)) {
+    const resolved = resolveRepositoryPath(root, path, String(name));
+    try {
+      await lstat(resolved);
+    } catch (error) {
+      const code = error instanceof Error && 'code' in error ? error.code : undefined;
+      if (code === 'ENOENT') {
+        continue;
+      }
+      throw error;
+    }
+    throw new Error(`${String(name)} already exists.`);
+  }
+}
+
+export function computeBlockFreezeSha256(block: QsFogSupervisorBlock): string {
+  return sha256(canonicalJson({
+    version: block.version,
+    blockId: block.blockId,
+    timezone: block.timezone,
+    committedRevision: block.committedRevision,
+    gitStatusShort: block.gitStatusShort,
+    allLanesPaused: block.allLanesPaused,
+    hashes: {
+      probeHarnessSha256: block.hashes.probeHarnessSha256,
+      probeTestSha256: block.hashes.probeTestSha256,
+      sourceRowsSha256: block.hashes.sourceRowsSha256,
+      diagnosisSha256: block.hashes.diagnosisSha256,
+      sourceImageSetSha256: block.hashes.sourceImageSetSha256,
+      candidateManifestSha256: block.hashes.candidateManifestSha256,
+    },
+    invocationPolicy: block.invocationPolicy,
+    paths: block.paths,
+  }));
+}
+
+function offsetForInstant(instant: Date): string {
+  const formatter = new Intl.DateTimeFormat('en-US', {
+    timeZone: 'America/New_York',
+    timeZoneName: 'longOffset',
+  });
+  const zone = formatter.formatToParts(instant).find((part) => part.type === 'timeZoneName')?.value;
+  if (zone === undefined || !zone.startsWith('GMT')) {
+    throw new Error('Could not derive the America/New_York UTC offset.');
+  }
+  return zone.slice(3);
+}
+
+function validateZonedTimestamp(value: string, label: string): number {
+  if (!ISO_OFFSET_PATTERN.test(value)) {
+    throw new TypeError(`${label} must be ISO-8601 with an explicit UTC offset.`);
+  }
+  const milliseconds = Date.parse(value);
+  if (!Number.isFinite(milliseconds)) {
+    throw new TypeError(`${label} is not a valid instant.`);
+  }
+  const suppliedOffset = value.slice(-6);
+  if (suppliedOffset !== offsetForInstant(new Date(milliseconds))) {
+    throw new TypeError(`${label} offset is not America/New_York for that instant.`);
+  }
+  return milliseconds;
+}
+
+function localDate(value: string): string {
+  return value.slice(0, 10);
+}
+
+export function validateCompletedBlock(blockInput: QsFogSupervisorBlock, includeCandidate: boolean): void {
+  const block = parseSupervisorBlock(blockInput);
+  if (block.freezeSha256 !== computeBlockFreezeSha256(block)) {
+    throw new Error('Block freeze SHA-256 is stale.');
+  }
+  const included = includeCandidate ? ['C1', 'C2', 'frame5'] as const : ['C1', 'C2'] as const;
+  const times: Array<{ label: string; value: string; milliseconds: number }> = [];
+  for (const armName of included) {
+    const arm = block.arms[armName];
+    if (arm.serviceContinuity !== 'continuous') {
+      throw new Error(`${armName} service continuity is not continuous.`);
+    }
+    if (arm.startedAt === null || arm.endedAt === null) {
+      throw new Error(`${armName} is missing start or end time.`);
+    }
+    if (arm.rows !== block.invocationPolicy.states || arm.answered !== block.invocationPolicy.states) {
+      throw new Error(`${armName} row accounting differs from the invocation policy.`);
+    }
+    times.push({
+      label: `${armName} start`,
+      value: arm.startedAt,
+      milliseconds: validateZonedTimestamp(arm.startedAt, `${armName} start`),
+    });
+    times.push({
+      label: `${armName} end`,
+      value: arm.endedAt,
+      milliseconds: validateZonedTimestamp(arm.endedAt, `${armName} end`),
+    });
+  }
+  for (let index = 1; index < times.length; index += 1) {
+    if (times[index]!.milliseconds < times[index - 1]!.milliseconds) {
+      throw new Error('Arm timestamps are not ordered C1 then C2 then frame5.');
+    }
+  }
+  if (new Set(times.map((entry) => localDate(entry.value))).size !== 1) {
+    throw new Error('Included arm timestamps cross a New York local date boundary.');
+  }
+  if (times.at(-1)!.milliseconds - times[0]!.milliseconds > TWO_HOURS_MS) {
+    throw new Error('Whole block exceeds two hours of elapsed time.');
+  }
+  const continuity = block.wholeBlockContinuity;
+  const finalArm = includeCandidate ? 'frame5' : 'C2';
+  if (continuity.fromArm !== 'C1' || continuity.throughArm !== finalArm) {
+    throw new Error('Whole-block continuity names the wrong interval.');
+  }
+  if (continuity.startedAt !== block.arms.C1.startedAt) {
+    throw new Error('Whole-block continuity does not reproduce the C1 start.');
+  }
+  if (continuity.endedAt !== block.arms[finalArm].endedAt) {
+    throw new Error('Whole-block continuity does not reproduce the final arm end.');
+  }
+  if (continuity.uninterrupted !== true || continuity.interruptions.length !== 0) {
+    throw new Error('Whole-block continuity records an interruption.');
+  }
+  if (continuity.attestedAt === null || continuity.endedAt === null) {
+    throw new Error('Whole-block continuity lacks its final attestation.');
+  }
+  const attested = validateZonedTimestamp(continuity.attestedAt, 'continuity attestation');
+  const ended = validateZonedTimestamp(continuity.endedAt, 'continuity end');
+  if (attested < ended) {
+    throw new Error('Whole-block continuity was attested before the block ended.');
+  }
+}
+
+interface InternalRational {
+  numerator: bigint;
+  denominator: bigint;
+}
+
+export interface RationalValue {
+  numerator: number;
+  denominator: number;
+}
+
+function gcd(left: bigint, right: bigint): bigint {
+  let a = left < 0n ? -left : left;
+  let b = right < 0n ? -right : right;
+  while (b !== 0n) {
+    const next = a % b;
+    a = b;
+    b = next;
+  }
+  return a === 0n ? 1n : a;
+}
+
+function rational(numerator: number | bigint, denominator: number | bigint = 1): InternalRational {
+  let top = typeof numerator === 'bigint' ? numerator : BigInt(numerator);
+  let bottom = typeof denominator === 'bigint' ? denominator : BigInt(denominator);
+  if (bottom === 0n) {
+    throw new RangeError('Rational denominator must be nonzero.');
+  }
+  if (bottom < 0n) {
+    top = -top;
+    bottom = -bottom;
+  }
+  const divisor = gcd(top, bottom);
+  return { numerator: top / divisor, denominator: bottom / divisor };
+}
+
+function add(left: InternalRational, right: InternalRational): InternalRational {
+  return rational(
+    left.numerator * right.denominator + right.numerator * left.denominator,
+    left.denominator * right.denominator,
+  );
+}
+
+function subtract(left: InternalRational, right: InternalRational): InternalRational {
+  return add(left, rational(-right.numerator, right.denominator));
+}
+
+function multiply(left: InternalRational, right: InternalRational): InternalRational {
+  return rational(left.numerator * right.numerator, left.denominator * right.denominator);
+}
+
+function divide(left: InternalRational, right: InternalRational): InternalRational {
+  return rational(left.numerator * right.denominator, left.denominator * right.numerator);
+}
+
+function absolute(value: InternalRational): InternalRational {
+  return rational(value.numerator < 0n ? -value.numerator : value.numerator, value.denominator);
+}
+
+function compare(left: InternalRational, right: InternalRational): number {
+  const difference = left.numerator * right.denominator - right.numerator * left.denominator;
+  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
+}
+
+function maximum(left: InternalRational, right: InternalRational): InternalRational {
+  return compare(left, right) >= 0 ? left : right;
+}
+
+function mean(values: readonly InternalRational[]): InternalRational {
+  if (values.length === 0) {
+    throw new RangeError('Cannot average an empty rational list.');
+  }
+  return divide(values.reduce(add, rational(0)), rational(values.length));
+}
+
+function external(value: InternalRational): RationalValue {
+  const numerator = Number(value.numerator);
+  const denominator = Number(value.denominator);
+  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
+    throw new RangeError('Rational result exceeds safe integer presentation.');
+  }
+  return { numerator, denominator };
+}
+
+function decimal(value: InternalRational): number {
+  return Number(value.numerator) / Number(value.denominator);
+}
+
+export interface ScoreCounts {
+  intersection: number;
+  union: number;
+}
+
+function scoreFraction(value: ScoreCounts): InternalRational {
+  if (!Number.isSafeInteger(value.intersection) || value.intersection < 0) {
+    throw new RangeError('Score intersection must be a nonnegative safe integer.');
+  }
+  if (!Number.isSafeInteger(value.union) || value.union < 0) {
+    throw new RangeError('Score union must be a nonnegative safe integer.');
+  }
+  if (value.intersection > value.union) {
+    throw new RangeError('Score intersection cannot exceed union.');
+  }
+  return value.union === 0 ? rational(1) : rational(value.intersection, value.union);
+}
+
+export interface RepeatabilityState {
+  stateId: string;
+  base: QsFogBase;
+  c1: ScoreCounts;
+  c2: ScoreCounts;
+}
+
+export function calculateRepeatability(states: readonly RepeatabilityState[]): {
+  byBase: Record<QsFogBase, {
+    spread: RationalValue;
+    meanDifference: RationalValue;
+    threshold: RationalValue;
+  }>;
+  spread: RationalValue;
+  threshold: RationalValue;
+} {
+  const internalByBase = {} as Record<QsFogBase, {
+    spread: InternalRational;
+    meanDifference: InternalRational;
+    threshold: InternalRational;
+  }>;
+  for (const base of QSFOG_BASES) {
+    const group = states.filter((state) => state.base === base);
+    const c1 = group.map((state) => scoreFraction(state.c1));
+    const c2 = group.map((state) => scoreFraction(state.c2));
+    const spread = group.length === 0
+      ? rational(0)
+      : mean(group.map((state) => absolute(subtract(scoreFraction(state.c1), scoreFraction(state.c2)))));
+    const meanDifference = group.length === 0 ? rational(0) : absolute(subtract(mean(c1), mean(c2)));
+    internalByBase[base] = {
+      spread,
+      meanDifference,
+      threshold: maximum(SCORE_FLOOR, multiply(rational(2), spread)),
+    };
+  }
+  const spread = QSFOG_BASES.map((base) => internalByBase[base].spread).reduce(maximum, rational(0));
+  return {
+    byBase: Object.fromEntries(QSFOG_BASES.map((base) => [base, {
+      spread: external(internalByBase[base].spread),
+      meanDifference: external(internalByBase[base].meanDifference),
+      threshold: external(internalByBase[base].threshold),
+    }])) as Record<QsFogBase, {
+      spread: RationalValue;
+      meanDifference: RationalValue;
+      threshold: RationalValue;
+    }>,
+    spread: external(spread),
+    threshold: external(maximum(SCORE_FLOOR, multiply(rational(2), spread))),
+  };
+}
+
+export interface FamilyCounts {
+  denominatorByBase: Record<QsFogBase, number>;
+  c1ByBase: Record<QsFogBase, number>;
+  c2ByBase: Record<QsFogBase, number>;
+  candidateByBase: Record<QsFogBase, number>;
+}
+
+export interface PromotionInput {
+  states: Array<RepeatabilityState & { candidate: ScoreCounts }>;
+  stablePositiveLosses: number;
+  fogFalseNegatives: { c1: number; c2: number; candidate: number };
+  obscurementFalseNegatives: { c1: number; c2: number; candidate: number };
+  families: { ordinary: FamilyCounts; collision: FamilyCounts };
+  authenticated: boolean;
+  archivedControlEligible: boolean;
+}
+
+interface FamilyResultInternal {
+  denominator: number;
+  referenceCount: InternalRational;
+  candidateCount: number;
+  referenceRate: InternalRational;
+  candidateRate: InternalRational;
+  reduction: InternalRational;
+  relativeReduction: InternalRational | null;
+  spread: InternalRational;
+  nonincrease: boolean;
+  qualifies: boolean;
+  headroom: boolean;
+}
+
+function sumCounts(values: Record<QsFogBase, number>): number {
+  return QSFOG_BASES.reduce((sum, base) => {
+    const value = values[base];
+    if (!Number.isSafeInteger(value) || value < 0) {
+      throw new RangeError(`Family count for ${base} must be a nonnegative safe integer.`);
+    }
+    return sum + value;
+  }, 0);
+}
+
+function familyResult(family: FamilyCounts): FamilyResultInternal {
+  const denominator = sumCounts(family.denominatorByBase);
+  const c1 = sumCounts(family.c1ByBase);
+  const c2 = sumCounts(family.c2ByBase);
+  const candidate = sumCounts(family.candidateByBase);
+  const referenceCount = rational(c1 + c2, 2);
+  const referenceRate = divide(referenceCount, rational(denominator));
+  const candidateRate = rational(candidate, denominator);
+  const reduction = subtract(referenceRate, candidateRate);
+  const relativeReduction = referenceCount.numerator === 0n
+    ? null
+    : divide(reduction, referenceRate);
+  const spread = QSFOG_BASES.map((base) => absolute(subtract(
+    rational(family.c1ByBase[base], family.denominatorByBase[base]),
+    rational(family.c2ByBase[base], family.denominatorByBase[base]),
+  ))).reduce(maximum, rational(0));
+  const nonincrease = compare(candidateRate, referenceRate) <= 0;
+  const qualifies = relativeReduction !== null
+    && compare(relativeReduction, rational(1, 4)) >= 0
+    && compare(reduction, multiply(rational(2), spread)) > 0;
+  return {
+    denominator,
+    referenceCount,
+    candidateCount: candidate,
+    referenceRate,
+    candidateRate,
+    reduction,
+    relativeReduction,
+    spread,
+    nonincrease,
+    qualifies,
+    headroom: referenceCount.numerator !== 0n
+      && compare(referenceRate, multiply(rational(2), spread)) > 0,
+  };
+}
+
+function comparison(value: InternalRational): 'negative' | 'zero' | 'positive' {
+  return value.numerator < 0n ? 'negative' : value.numerator === 0n ? 'zero' : 'positive';
+}
+
+export function calculatePromotion(input: PromotionInput): {
+  conditions: [boolean, boolean, boolean, boolean, boolean, boolean, boolean];
+  overallDelta: RationalValue;
+  threshold: RationalValue;
+  byBase: Record<QsFogBase, { delta: RationalValue; threshold: RationalValue; passes: boolean }>;
+  leaveOneOut: Record<QsFogBase, { delta: RationalValue; comparison: 'negative' | 'zero' | 'positive' }>;
+  families: Record<'ordinary' | 'collision', {
+    denominator: number;
+    referenceCount: RationalValue;
+    candidateCount: number;
+    referenceRate: RationalValue;
+    candidateRate: RationalValue;
+    reduction: RationalValue;
+    relativeReduction: RationalValue | null;
+    spread: RationalValue;
+    nonincrease: boolean;
+    qualifies: boolean;
+    headroom: boolean;
+  }>;
+  verdict:
+    | 'POSITIVE'
+    | 'INCONCLUSIVE'
+    | 'INCONCLUSIVE_HEADROOM'
+    | 'INCOMPARABLE_FRESH_RECAPTURE_CONTROLS_REQUIRED'
+    | 'INVALID_INPUT';
+} {
+  const repeatability = calculateRepeatability(input.states);
+  const stateDeltas = input.states.map((state) => subtract(
+    scoreFraction(state.candidate),
+    divide(add(scoreFraction(state.c1), scoreFraction(state.c2)), rational(2)),
+  ));
+  const overallDelta = mean(stateDeltas);
+  const byBaseInternal = {} as Record<QsFogBase, {
+    delta: InternalRational;
+    threshold: InternalRational;
+    passes: boolean;
+    headroom: boolean;
+  }>;
+  for (const base of QSFOG_BASES) {
+    const indexes = input.states.flatMap((state, index) => state.base === base ? [index] : []);
+    const delta = indexes.length === 0 ? rational(0) : mean(indexes.map((index) => stateDeltas[index]!));
+    const thresholdValue = rational(
+      repeatability.byBase[base].threshold.numerator,
+      repeatability.byBase[base].threshold.denominator,
+    );
+    const referenceMean = indexes.length === 0
+      ? rational(1)
+      : mean(indexes.map((index) => {
+        const state = input.states[index]!;
+        return divide(add(scoreFraction(state.c1), scoreFraction(state.c2)), rational(2));
+      }));
+    byBaseInternal[base] = {
+      delta,
+      threshold: thresholdValue,
+      passes: compare(delta, thresholdValue) >= 0,
+      headroom: compare(subtract(rational(1), referenceMean), thresholdValue) >= 0,
+    };
+  }
+  const leaveOneOutInternal = {} as Record<QsFogBase, InternalRational>;
+  for (const omitted of QSFOG_BASES) {
+    const retained = input.states.flatMap((state, index) => state.base === omitted ? [] : [stateDeltas[index]!]);
+    leaveOneOutInternal[omitted] = mean(retained);
+  }
+  const ordinary = familyResult(input.families.ordinary);
+  const collision = familyResult(input.families.collision);
+  const condition1 = compare(overallDelta, rational(
+    repeatability.threshold.numerator,
+    repeatability.threshold.denominator,
+  )) >= 0;
+  const condition2 = QSFOG_BASES.filter((base) => byBaseInternal[base].passes).length >= 4;
+  const condition3 = QSFOG_BASES.every((base) => leaveOneOutInternal[base].numerator > 0n);
+  const condition4 = input.stablePositiveLosses === 0;
+  const condition5 = input.fogFalseNegatives.candidate * 2
+      <= input.fogFalseNegatives.c1 + input.fogFalseNegatives.c2
+    && input.obscurementFalseNegatives.candidate * 2
+      <= input.obscurementFalseNegatives.c1 + input.obscurementFalseNegatives.c2;
+  const nonzeroFamilies = [ordinary, collision].filter((family) => family.referenceCount.numerator !== 0n);
+  const condition6 = ordinary.nonincrease
+    && collision.nonincrease
+    && (nonzeroFamilies.length === 0 || nonzeroFamilies.some((family) => family.qualifies));
+  const condition7 = input.authenticated && input.archivedControlEligible;
+  const conditions: [boolean, boolean, boolean, boolean, boolean, boolean, boolean] = [
+    condition1,
+    condition2,
+    condition3,
+    condition4,
+    condition5,
+    condition6,
+    condition7,
+  ];
+  const referenceMean = mean(input.states.map((state) => divide(
+    add(scoreFraction(state.c1), scoreFraction(state.c2)),
+    rational(2),
+  )));
+  const scoreHeadroom = compare(
+    subtract(rational(1), referenceMean),
+    rational(repeatability.threshold.numerator, repeatability.threshold.denominator),
+  ) >= 0;
+  const baseHeadroom = QSFOG_BASES.filter((base) => byBaseInternal[base].headroom).length >= 4;
+  const familyHeadroom = nonzeroFamilies.length === 0 || nonzeroFamilies.some((family) => family.headroom);
+  const headroom = scoreHeadroom && baseHeadroom && familyHeadroom;
+  const verdict = !input.authenticated
+    ? 'INVALID_INPUT'
+    : !input.archivedControlEligible
+      ? 'INCOMPARABLE_FRESH_RECAPTURE_CONTROLS_REQUIRED'
+      : !headroom
+        ? 'INCONCLUSIVE_HEADROOM'
+        : conditions.every(Boolean)
+          ? 'POSITIVE'
+          : 'INCONCLUSIVE';
+  const publicFamily = (family: FamilyResultInternal) => ({
+    denominator: family.denominator,
+    referenceCount: external(family.referenceCount),
+    candidateCount: family.candidateCount,
+    referenceRate: external(family.referenceRate),
+    candidateRate: external(family.candidateRate),
+    reduction: external(family.reduction),
+    relativeReduction: family.relativeReduction === null ? null : external(family.relativeReduction),
+    spread: external(family.spread),
+    nonincrease: family.nonincrease,
+    qualifies: family.qualifies,
+    headroom: family.headroom,
+  });
+  return {
+    conditions,
+    overallDelta: external(overallDelta),
+    threshold: repeatability.threshold,
+    byBase: Object.fromEntries(QSFOG_BASES.map((base) => [base, {
+      delta: external(byBaseInternal[base].delta),
+      threshold: external(byBaseInternal[base].threshold),
+      passes: byBaseInternal[base].passes,
+    }])) as Record<QsFogBase, { delta: RationalValue; threshold: RationalValue; passes: boolean }>,
+    leaveOneOut: Object.fromEntries(QSFOG_BASES.map((base) => [base, {
+      delta: external(leaveOneOutInternal[base]),
+      comparison: comparison(leaveOneOutInternal[base]),
+    }])) as Record<QsFogBase, {
+      delta: RationalValue;
+      comparison: 'negative' | 'zero' | 'positive';
+    }>,
+    families: { ordinary: publicFamily(ordinary), collision: publicFamily(collision) },
+    verdict,
+  };
+}
+
+export interface DiagnosisCell {
+  column: number;
+  row: number;
+  eligible: boolean;
+  truthClass: 'neither' | 'obscured-only' | 'fog-only' | 'fog+obscured';
+}
+
+export interface Q9Accounting {
+  score: number;
+  intersection: number;
+  union: number;
+  hallucinations: number;
+  fogPredicted: number;
+  obscuredPredicted: number;
+  fogTruePositives: number;
+  obscuredTruePositives: number;
+  fogFalseNegatives: number;
+  obscuredFalseNegatives: number;
+  buckets: {
+    fogEligibleOrdinary: number;
+    fogObscuredOnly: number;
+    fogExcludedNeither: number;
+    fogOutOfBounds: number;
+    obscuredEligibleOrdinary: number;
+    obscuredFogOnly: number;
+    obscuredExcludedNeither: number;
+    obscuredOutOfBounds: number;
+  };
+}
+
+function cellKey(cell: Q9Cell): string {
+  return `${String(cell.column)},${String(cell.row)}`;
+}
+
+function uniqueCells(cells: readonly Q9Cell[]): Map<string, Q9Cell> {
+  return new Map(cells.map((cell) => [cellKey(cell), cell]));
+}
+
+export function classifyQ9Accounting(
+  answerInput: Q9Answer,
+  truthInput: Q9Answer,
+  bounds: { columns: number; rows: number },
+  diagnosis: readonly DiagnosisCell[],
+): Q9Accounting {
+  const answer = q9AnswerSchema.parse(answerInput);
+  const truth = q9AnswerSchema.parse(truthInput);
+  const diagnosisByCell = new Map<string, DiagnosisCell>();
+  for (const entry of diagnosis) {
+    const key = cellKey(entry);
+    if (diagnosisByCell.has(key)) {
+      throw new Error(`Duplicate diagnosis record for ${key}.`);
+    }
+    diagnosisByCell.set(key, entry);
+  }
+  const answerFog = uniqueCells(answer.foggedCells);
+  const answerObscured = uniqueCells(answer.obscuredCells);
+  const truthFog = uniqueCells(truth.foggedCells);
+  const truthObscured = uniqueCells(truth.obscuredCells);
+  const buckets = {
+    fogEligibleOrdinary: 0,
+    fogObscuredOnly: 0,
+    fogExcludedNeither: 0,
+    fogOutOfBounds: 0,
+    obscuredEligibleOrdinary: 0,
+    obscuredFogOnly: 0,
+    obscuredExcludedNeither: 0,
+    obscuredOutOfBounds: 0,
+  };
+  const inBounds = (cell: Q9Cell): boolean => cell.column >= 0
+    && cell.row >= 0
+    && cell.column < bounds.columns
+    && cell.row < bounds.rows;
+  for (const [key, cell] of answerFog) {
+    if (truthFog.has(key)) {
+      continue;
+    }
+    if (!inBounds(cell)) {
+      buckets.fogOutOfBounds += 1;
+      continue;
+    }
+    const entry = diagnosisByCell.get(key);
+    if (entry === undefined) {
+      throw new Error(`No diagnosis partition exists for in-bounds fog prediction ${key}.`);
+    }
+    if (entry.truthClass === 'obscured-only') {
+      buckets.fogObscuredOnly += 1;
+    } else if (entry.truthClass === 'neither' && entry.eligible) {
+      buckets.fogEligibleOrdinary += 1;
+    } else if (entry.truthClass === 'neither') {
+      buckets.fogExcludedNeither += 1;
+    } else {
+      throw new Error(`Fog prediction ${key} cannot be assigned to exactly one false-positive bucket.`);
+    }
+  }
+  for (const [key, cell] of answerObscured) {
+    if (truthObscured.has(key)) {
+      continue;
+    }
+    if (!inBounds(cell)) {
+      buckets.obscuredOutOfBounds += 1;
+      continue;
+    }
+    const entry = diagnosisByCell.get(key);
+    if (entry === undefined) {
+      throw new Error(`No diagnosis partition exists for in-bounds obscurement prediction ${key}.`);
+    }
+    if (entry.truthClass === 'fog-only') {
+      buckets.obscuredFogOnly += 1;
+    } else if (entry.truthClass === 'neither' && entry.eligible) {
+      buckets.obscuredEligibleOrdinary += 1;
+    } else if (entry.truthClass === 'neither') {
+      buckets.obscuredExcludedNeither += 1;
+    } else {
+      throw new Error(`Obscurement prediction ${key} cannot be assigned to exactly one false-positive bucket.`);
+    }
+  }
+  const answerFacts = new Set([
+    ...[...answerFog.keys()].map((key) => `fog:${key}`),
+    ...[...answerObscured.keys()].map((key) => `obscured:${key}`),
+  ]);
+  const truthFacts = new Set([
+    ...[...truthFog.keys()].map((key) => `fog:${key}`),
+    ...[...truthObscured.keys()].map((key) => `obscured:${key}`),
+  ]);
+  const intersection = [...answerFacts].filter((key) => truthFacts.has(key)).length;
+  const union = new Set([...answerFacts, ...truthFacts]).size;
+  const hallucinations = Object.values(buckets).reduce((sum, value) => sum + value, 0);
+  const scorer = scoreProbeAnswer(
+    parseProbeAnswer('Q9', canonicalJson(answer)),
+    parseProbeAnswer('Q9', canonicalJson(truth)),
+  );
+  const score = union === 0 ? 1 : intersection / union;
+  if (score !== scorer.score || hallucinations !== scorer.hallucinations) {
+    throw new Error('Local Q9 accounting differs from actual scorer semantics.');
+  }
+  const fogTruePositives = [...answerFog.keys()].filter((key) => truthFog.has(key)).length;
+  const obscuredTruePositives = [...answerObscured.keys()].filter((key) => truthObscured.has(key)).length;
+  if (answerFog.size !== fogTruePositives
+    + buckets.fogEligibleOrdinary
+    + buckets.fogObscuredOnly
+    + buckets.fogExcludedNeither
+    + buckets.fogOutOfBounds) {
+    throw new Error('Fog accounting identity failed.');
+  }
+  if (answerObscured.size !== obscuredTruePositives
+    + buckets.obscuredEligibleOrdinary
+    + buckets.obscuredFogOnly
+    + buckets.obscuredExcludedNeither
+    + buckets.obscuredOutOfBounds) {
+    throw new Error('Obscurement accounting identity failed.');
+  }
+  return {
+    score,
+    intersection,
+    union,
+    hallucinations,
+    fogPredicted: answerFog.size,
+    obscuredPredicted: answerObscured.size,
+    fogTruePositives,
+    obscuredTruePositives,
+    fogFalseNegatives: truthFog.size - fogTruePositives,
+    obscuredFalseNegatives: truthObscured.size - obscuredTruePositives,
+    buckets,
+  };
+}
+
+export function validateProbeRows(rowsInput: readonly unknown[], expectedStates: readonly string[]): void {
+  if (rowsInput.length !== expectedStates.length) {
+    throw new Error('Probe rows are missing or duplicated.');
+  }
+  const rows = rowsInput.map((value) => record(value));
+  if (rows.some((row) => row === null)) {
+    throw new TypeError('Probe row must be an object.');
+  }
+  const states = new Set<string>();
+  for (const possibleRow of rows) {
+    const row = possibleRow!;
+    if (row['resultKind'] !== 'generated') {
+      throw new Error('Probe replacement or rescored row is forbidden.');
+    }
+    if (row['outcome'] !== 'answered') {
+      throw new Error('Every probe row must be answered.');
+    }
+    if (row['error'] !== null) {
+      throw new Error('Every probe row must carry a null error.');
+    }
+    if (typeof row['score'] !== 'number') {
+      throw new Error('Every probe row must carry a non-null score.');
+    }
+    if (row['answer'] === null || row['answer'] === undefined) {
+      throw new Error('Every probe row must carry a non-null answer.');
+    }
+    if (typeof row['stateId'] !== 'string' || states.has(row['stateId'])) {
+      throw new Error('Probe state assignment is missing or duplicated.');
+    }
+    states.add(row['stateId']);
+  }
+  if (expectedStates.some((state) => !states.has(state))) {
+    throw new Error('Probe rows are missing an expected state.');
+  }
+}
+
+function pngCrc32(bytes: Uint8Array): number {
+  let crc = 0xffffffff;
+  for (const byte of bytes) {
+    crc ^= byte;
+    for (let bit = 0; bit < 8; bit += 1) {
+      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
+    }
+  }
+  return (crc ^ 0xffffffff) >>> 0;
+}
+
+function validatedPngDimensions(bytes: Buffer): { width: number; height: number } {
+  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
+  if (bytes.length < 45 || !bytes.subarray(0, 8).equals(signature)) {
+    throw new TypeError('PNG signature or required chunks are missing.');
+  }
+  if (bytes.readUInt32BE(8) !== 13 || bytes.subarray(12, 16).toString('ascii') !== 'IHDR') {
+    throw new TypeError('PNG must begin with a 13-byte IHDR chunk.');
+  }
+  if (bytes.readUInt32BE(29) !== pngCrc32(bytes.subarray(12, 29))) {
+    throw new TypeError('PNG IHDR CRC is invalid.');
+  }
+  let offset = 8;
+  let foundIend = false;
+  while (offset + 12 <= bytes.length) {
+    const length = bytes.readUInt32BE(offset);
+    const end = offset + 12 + length;
+    if (end > bytes.length) {
+      throw new TypeError('PNG chunk is truncated.');
+    }
+    const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
+    if (type === 'IEND') {
+      foundIend = length === 0
+        && end === bytes.length
+        && bytes.readUInt32BE(offset + 8) === pngCrc32(bytes.subarray(offset + 4, offset + 8));
+      break;
+    }
+    offset = end;
+  }
+  if (!foundIend) {
+    throw new TypeError('PNG IEND chunk is missing or malformed.');
+  }
+  const width = bytes.readUInt32BE(16);
+  const height = bytes.readUInt32BE(20);
+  if (width === 0 || height === 0) {
+    throw new TypeError('PNG dimensions must be positive.');
+  }
+  return { width, height };
+}
+
+export function validateIdentityPng(
+  bytes: Buffer,
+  expected: { sha256: string; width: number; height: number },
+): void {
+  const dimensions = validatedPngDimensions(bytes);
+  if (sha256(bytes) !== expected.sha256
+    || dimensions.width !== expected.width
+    || dimensions.height !== expected.height) {
+    throw new Error('Authenticated identity PNG differs from its SHA-256 or IHDR dimensions.');
+  }
+}
+
+export function validateCanonicalQ9Truth(actual: Q9Answer, expected: Q9Answer): void {
+  const parsedActual = q9AnswerSchema.parse(actual);
+  const parsedExpected = q9AnswerSchema.parse(expected);
+  if (canonicalJson(parsedActual) !== canonicalJson(parsedExpected)) {
+    throw new Error('Canonical Q9 truth differs from the derived candidate truth.');
+  }
+}
+
+function shuffledCandidates(candidates: readonly ProbeStateCandidate[], seed: number): readonly ProbeStateCandidate[] {
+  const shuffled = [...candidates];
+  let state = seed >>> 0;
+  const next = (): number => {
+    state = (state + 0x6d2b79f5) >>> 0;
+    let value = state;
+    value = Math.imul(value ^ (value >>> 15), value | 1);
+    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
+    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
+  };
+  for (let index = shuffled.length - 1; index > 0; index -= 1) {
+    const swap = Math.floor(next() * (index + 1));
+    [shuffled[index], shuffled[swap]] = [shuffled[swap]!, shuffled[index]!];
+  }
+  return shuffled;
+}
+
+function command(root: string, args: readonly string[]): string {
+  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trimEnd();
+}
+
+export interface IdentityBuildOptions {
+  repositoryRoot: string;
+  blockRecordPath: string;
+  sourceRowsPath: string;
+  expectedSourceRowsSha256: string;
+  sourceImagesRoot: string;
+  sourceRevision: string;
+  states: number;
+  seed: number;
+  model: string;
+  question: string;
+  outDirectory: string;
+}
+
+export interface IdentityBuildDependencies {
+  candidates?: readonly ProbeStateCandidate[];
+  currentHead?: string;
+  gitStatusShort?: string;
+  harnessBytes?: Buffer;
+  committedHarnessBytes?: Buffer;
+  committedProbeTestBytes?: Buffer;
+  expectedHarnessSha256?: string;
+  expectedProbeTestSha256?: string;
+  skipDiagnosisHash?: boolean;
+  allowSyntheticFixture?: boolean;
+}
+
+export interface IdentityManifest {
+  kind: 'qsfog-unchanged-quietstone-identity';
+  version: 'qsfog-image-override-manifest-v2';
+  sourceRevision: string;
+  sourceImagesRoot: string;
+  states: Record<string, z.infer<typeof imageManifestEntrySchema>>;
+  manipulationValidation: {
+    version: 'qsfog-identity-validation-v1';
+    operation: 'identity';
+    blockId: string;
+    blockFreezeSha256: string;
+    probeHarnessSha256: string;
+    sourceRows: { path: string; sha256: string; rows: number };
+    sourceImageSetSha256: string;
+    selection: {
+      states: number;
+      seed: number;
+      model: string;
+      effort: string;
+      question: string;
+      glyphs: string;
+      tilePx: number;
+      boardInput: string;
+    };
+    identity: { sourceEqualsFileForAllStates: true; validatedStates: number };
+    terminalSnapshotManifest: { path: string; sha256: string };
+  };
+}
+
+async function terminalSnapshotManifest(
+  sourceRoot: string,
+  states: number,
+): Promise<{ path: string; bytes: Buffer; manifest: z.infer<typeof snapshotManifestSchema> }> {
+  const manifestsRoot = join(sourceRoot, 'manifests');
+  const candidates: Array<{ path: string; bytes: Buffer; manifest: z.infer<typeof snapshotManifestSchema> }> = [];
+  for (const name of (await readdir(manifestsRoot)).sort()) {
+    const path = join(manifestsRoot, name);
+    const bytes = await readFile(path);
+    const parsed = snapshotManifestSchema.safeParse(parseJson(bytes, `Snapshot manifest ${name}`));
+    if (parsed.success && parsed.data.artifacts.length === states) {
+      candidates.push({ path, bytes, manifest: parsed.data });
+    }
+  }
+  if (candidates.length !== 1) {
+    throw new Error(`Expected exactly one terminal ${String(states)}-artifact snapshot manifest.`);
+  }
+  return candidates[0]!;
+}
+
+async function sourceImageSetDigest(
+  root: string,
+  pngPaths: readonly string[],
+  terminalPath: string,
+): Promise<string> {
+  const allPaths = [...new Set([...pngPaths, terminalPath])];
+  const lines = await Promise.all(allPaths.map(async (path) => {
+    const bytes = await readFile(path);
+    return `${relative(root, path)}\t${sha256(bytes)}\n`;
+  }));
+  return sha256(lines.sort().join(''));
+}
+
+async function readBlock(path: string): Promise<QsFogSupervisorBlock> {
+  return parseSupervisorBlock(parseJson(await readFile(path), 'Supervisor block record'));
+}
+
+async function authenticateFreeze(
+  options: IdentityBuildOptions,
+  block: QsFogSupervisorBlock,
+  dependencies: IdentityBuildDependencies,
+): Promise<void> {
+  if (block.freezeSha256 !== computeBlockFreezeSha256(block)) {
+    throw new Error('Block freeze SHA-256 is stale.');
+  }
+  const root = options.repositoryRoot;
+  const currentHead = dependencies.currentHead ?? command(root, ['rev-parse', 'HEAD']);
+  const status = dependencies.gitStatusShort ?? command(root, ['status', '--short', '--untracked-files=all']);
+  const harnessPath = join(root, 'tools/ai-dm-screenshot-probe.ts');
+  const probeTestPath = join(root, 'tests/unit/tools/ai-dm-screenshot-probe.test.ts');
+  const harnessBytes = dependencies.harnessBytes ?? await readFile(harnessPath);
+  const committedHarnessBytes = dependencies.committedHarnessBytes
+    ?? Buffer.from(execFileSync('git', ['show', 'HEAD:tools/ai-dm-screenshot-probe.ts'], { cwd: root }));
+  const committedProbeTestBytes = dependencies.committedProbeTestBytes
+    ?? Buffer.from(execFileSync(
+      'git',
+      ['show', 'HEAD:tests/unit/tools/ai-dm-screenshot-probe.test.ts'],
+      { cwd: root },
+    ));
+  const harnessHash = dependencies.expectedHarnessSha256 ?? block.hashes.probeHarnessSha256;
+  const probeTestHash = dependencies.expectedProbeTestSha256 ?? block.hashes.probeTestSha256;
+  if (currentHead !== block.committedRevision) {
+    throw new Error('Current HEAD differs from the committed block revision.');
+  }
+  if (status !== '' || block.gitStatusShort !== '') {
+    throw new Error('Tracked or untracked git status is not clean.');
+  }
+  if (sha256(harnessBytes) !== harnessHash
+    || sha256(committedHarnessBytes) !== harnessHash
+    || block.hashes.probeHarnessSha256 !== harnessHash) {
+    throw new Error('Probe harness authentication failed.');
+  }
+  if (sha256(committedProbeTestBytes) !== probeTestHash || block.hashes.probeTestSha256 !== probeTestHash) {
+    throw new Error('Committed probe test authentication failed.');
+  }
+  if (!dependencies.skipDiagnosisHash) {
+    const diagnosisPath = join(root, '.tmp/runs/quietstone/qsfog-diagnosis.json');
+    if (sha256(await readFile(diagnosisPath)) !== block.hashes.diagnosisSha256) {
+      throw new Error('Diagnosis authentication failed.');
+    }
+  }
+}
+
+export async function buildIdentityManifest(
+  options: IdentityBuildOptions,
+  dependencies: IdentityBuildDependencies = {},
+): Promise<IdentityManifest> {
+  const synthetic = dependencies.allowSyntheticFixture === true;
+  if (options.model !== 'gpt-5.6-sol:high'
+    || options.question !== 'Q9'
+    || options.seed !== 20260910
+    || (synthetic ? options.states < 1 : options.states !== 24)) {
+    throw new TypeError('Identity selection differs from the frozen model/question/seed contract.');
+  }
+  if (!REVISION_PATTERN.test(options.sourceRevision)) {
+    throw new TypeError('Identity source revision must be 40 lowercase hexadecimal characters.');
+  }
+  if (!synthetic && options.sourceRevision !== FROZEN_SOURCE_REVISION) {
+    throw new Error('Identity source revision differs from the frozen source revision.');
+  }
+  if (!synthetic && options.expectedSourceRowsSha256 !== FROZEN_SOURCE_ROWS_SHA256) {
+    throw new Error('Expected source rows SHA-256 differs from the frozen digest.');
+  }
+  const block = await readBlock(options.blockRecordPath);
+  if (block.invocationPolicy.states !== options.states) {
+    throw new Error('Identity state count differs from the supervisor block.');
+  }
+  if (resolve(options.repositoryRoot, block.paths.identityManifest) !== resolve(options.outDirectory)) {
+    throw new Error('Identity output differs from the supervisor block path.');
+  }
+  await authenticateFreeze(options, block, dependencies);
+  await assertUnusedBlockPaths(block, options.repositoryRoot, block.paths.candidateManifest !== null);
+  const sourceRowsBytes = await readFile(options.sourceRowsPath);
+  const sourceRowsSha256 = sha256(sourceRowsBytes);
+  if (sourceRowsSha256 !== options.expectedSourceRowsSha256
+    || sourceRowsSha256 !== block.hashes.sourceRowsSha256) {
+    throw new Error('Source rows SHA-256 differs from the frozen value.');
+  }
+  const decodedRows = parseJsonLines(sourceRowsBytes, 'Source rows');
+  if (!synthetic && decodedRows.length !== 1_008) {
+    throw new Error('Frozen source JSONL must contain exactly 1008 rows.');
+  }
+  const selectedRows = decodedRows.flatMap((value) => {
+    const possible = record(value);
+    return possible?.['model'] === 'gpt-5.6-sol'
+      && possible['effort'] === 'high'
+      && possible['question'] === 'Q9'
+      ? [sourceQ9RowSchema.parse(value)]
+      : [];
+  });
+  if (selectedRows.length !== options.states) {
+    throw new Error(`Expected exactly ${String(options.states)} answered frozen Q9 rows.`);
+  }
+  const candidates = dependencies.candidates ?? await defaultProbeStateCandidates();
+  const selectedCandidates = shuffledCandidates(candidates, options.seed).slice(0, options.states);
+  const expectedIds = selectedCandidates.map((candidate) => candidate.id);
+  const actualIds = selectedRows.map((row) => row.stateId);
+  if (canonicalJson(actualIds) !== canonicalJson(expectedIds)) {
+    throw new Error('Frozen row state ordering differs from seed-20260910 Mulberry32 ordering.');
+  }
+  const sourceRoot = resolveRepositoryPath(options.repositoryRoot, options.sourceImagesRoot, '--source-images-root');
+  const terminal = await terminalSnapshotManifest(sourceRoot, options.states);
+  if (!synthetic
+    && (terminal.manifest.chromiumVersion !== '149.0.7827.55'
+      || terminal.manifest.playwrightVersion !== '1.61.1')) {
+    throw new Error('Terminal snapshot browser provenance differs from the frozen versions.');
+  }
+  const artifacts = new Map(terminal.manifest.artifacts.map((artifact) => [artifact.source.stateDigest, artifact]));
+  const pngPaths: string[] = [];
+  const manifestStates: Record<string, z.infer<typeof imageManifestEntrySchema>> = {};
+  for (let index = 0; index < selectedRows.length; index += 1) {
+    const row = selectedRows[index]!;
+    const candidate = selectedCandidates[index]!;
+    const stateDigest = boardStateDigest(candidate.state);
+    if (stateDigest !== row.stateDigest) {
+      throw new Error(`State digest differs for ${row.stateId}.`);
+    }
+    const expectedTruth = q9AnswerSchema.parse(truthAnswer(
+      deriveScreenshotFactSheet(candidate.state, candidate.desiredLineTier),
+      'Q9',
+    ));
+    validateCanonicalQ9Truth(row.truth, expectedTruth);
+    const artifact = artifacts.get(stateDigest);
+    if (artifact === undefined
+      || artifact.source.room !== index + 1
+      || artifact.source.round !== candidate.state.round
+      || artifact.source.revision !== candidate.state.revision
+      || artifact.sha256 !== row.png.sha256
+      || artifact.relativePath !== row.png.relativePath
+      || artifact.width !== row.png.width
+      || artifact.height !== row.png.height) {
+      throw new Error(`Terminal snapshot artifact differs for ${row.stateId}.`);
+    }
+    const sourcePngPath = resolveRepositoryPath(sourceRoot, row.png.relativePath, `Source PNG ${row.stateId}`);
+    const sourceBytes = await readFile(sourcePngPath);
+    validateIdentityPng(sourceBytes, row.png);
+    if (sourceBytes.byteLength !== artifact.bytes) {
+      throw new Error(`Authenticated source PNG differs for ${row.stateId}.`);
+    }
+    pngPaths.push(sourcePngPath);
+    const file = `board-images/${row.png.sha256}.png`;
+    manifestStates[row.stateId] = {
+      file,
+      sha256: row.png.sha256,
+      width: row.png.width,
+      height: row.png.height,
+      sourcePng: {
+        sha256: row.png.sha256,
+        width: row.png.width,
+        height: row.png.height,
+      },
+    };
+  }
+  const imageSetSha256 = await sourceImageSetDigest(
+    options.repositoryRoot,
+    pngPaths,
+    terminal.path,
+  );
+  if (imageSetSha256 !== block.hashes.sourceImageSetSha256) {
+    throw new Error('Authenticated source image set differs from the supervisor block.');
+  }
+  await mkdir(join(options.outDirectory, 'board-images'), { recursive: true });
+  for (const row of selectedRows) {
+    const sourcePath = resolveRepositoryPath(sourceRoot, row.png.relativePath, `Source PNG ${row.stateId}`);
+    const sourceBytes = await readFile(sourcePath);
+    const destination = join(options.outDirectory, 'board-images', `${row.png.sha256}.png`);
+    await writeFile(destination, sourceBytes, { flag: 'wx' });
+    if (!Buffer.from(await readFile(destination)).equals(sourceBytes)) {
+      throw new Error(`Exclusive identity copy differs for ${row.stateId}.`);
+    }
+  }
+  const manifest: IdentityManifest = {
+    kind: 'qsfog-unchanged-quietstone-identity',
+    version: 'qsfog-image-override-manifest-v2',
+    sourceRevision: options.sourceRevision,
+    sourceImagesRoot: options.sourceImagesRoot,
+    states: manifestStates,
+    manipulationValidation: {
+      version: 'qsfog-identity-validation-v1',
+      operation: 'identity',
+      blockId: block.blockId,
+      blockFreezeSha256: block.freezeSha256,
+      probeHarnessSha256: block.hashes.probeHarnessSha256,
+      sourceRows: {
+        path: relative(options.repositoryRoot, options.sourceRowsPath),
+        sha256: sourceRowsSha256,
+        rows: decodedRows.length,
+      },
+      sourceImageSetSha256: imageSetSha256,
+      selection: {
+        states: options.states,
+        seed: options.seed,
+        model: 'gpt-5.6-sol',
+        effort: 'high',
+        question: options.question,
+        glyphs: 'none',
+        tilePx: 128,
+        boardInput: 'png',
+      },
+      identity: { sourceEqualsFileForAllStates: true, validatedStates: options.states },
+      terminalSnapshotManifest: {
+        path: relative(options.repositoryRoot, terminal.path),
+        sha256: sha256(terminal.bytes),
+      },
+    },
+  };
+  imageOverrideManifestSchema.parse(manifest);
+  const manifestPath = join(options.outDirectory, 'manifest.json');
+  await writeFile(manifestPath, `${canonicalJson(manifest)}\n`, { encoding: 'utf8', flag: 'wx' });
+  imageOverrideManifestSchema.parse(parseJson(await readFile(manifestPath), 'Written identity manifest'));
+  return manifest;
+}
+
+type CliSubcommand = 'identity-manifest' | 'paired-report';
+
+export interface ParsedCliArgs {
+  subcommand: CliSubcommand;
+  values: ReadonlyMap<string, string[]>;
+}
+
+const CLI_FLAGS: Record<CliSubcommand, ReadonlySet<string>> = {
+  'identity-manifest': new Set([
+    '--block-record',
+    '--source-rows',
+    '--expected-source-rows-sha256',
+    '--source-images-root',
+    '--source-revision',
+    '--states',
+    '--seed',
+    '--model',
+    '--question',
+    '--out',
+  ]),
+  'paired-report': new Set([
+    '--block-record',
+    '--control-c1',
+    '--control-c2',
+    '--candidate',
+    '--source-rows',
+    '--diagnosis',
+    '--out-prefix',
+  ]),
+};
+
+export function parseQsFogCliArgs(argv: readonly string[]): ParsedCliArgs {
+  const subcommand = argv[0];
+  if (subcommand !== 'identity-manifest' && subcommand !== 'paired-report') {
+    throw new TypeError('Expected exactly identity-manifest or paired-report subcommand.');
+  }
+  const allowed = CLI_FLAGS[subcommand];
+  const values = new Map<string, string[]>();
+  for (let index = 1; index < argv.length; index += 2) {
+    const flag = argv[index];
+    const value = argv[index + 1];
+    if (flag === undefined || !allowed.has(flag)) {
+      throw new TypeError(`Unknown ${String(flag)} flag for ${subcommand}.`);
+    }
+    if (value === undefined || value.startsWith('--')) {
+      throw new TypeError(`${flag} is missing its value.`);
+    }
+    if (flag !== '--candidate' && values.has(flag)) {
+      throw new TypeError(`Duplicate ${flag} flag.`);
+    }
+    if (flag !== '--candidate' && flag !== '--model' && flag !== '--question'
+      && flag !== '--states' && flag !== '--seed' && flag !== '--expected-source-rows-sha256') {
+      repositoryPathSchema.parse(flag === '--candidate' ? value.split('=', 2)[1] : value);
+    }
+    values.set(flag, [...(values.get(flag) ?? []), value]);
+  }
+  return { subcommand, values };
+}
+
+function requireFlag(args: ParsedCliArgs, flag: string): string {
+  const value = args.values.get(flag)?.[0];
+  if (value === undefined) {
+    throw new TypeError(`${flag} is required.`);
+  }
+  return value;
+}
+
+function relativeCliPath(value: string, label: string): string {
+  repositoryPathSchema.parse(value);
+  return resolveRepositoryPath(repositoryRoot, value, label);
+}
+
+function listRegularFiles(root: string): readonly string[] {
+  const files: string[] = [];
+  const visit = (directory: string): void => {
+    for (const entry of readdirSync(directory, { withFileTypes: true })) {
+      const path = join(directory, entry.name);
+      if (entry.isDirectory()) {
+        visit(path);
+      } else if (entry.isFile()) {
+        files.push(path);
+      } else {
+        throw new Error(`Non-regular image-root entry is forbidden: ${relative(root, path)}.`);
+      }
+    }
+  };
+  visit(root);
+  return files.sort();
+}
+
+async function treeDigest(root: string, repository: string): Promise<string> {
+  const lines = await Promise.all(listRegularFiles(root).map(async (path) => {
+    return `${relative(repository, path)}\t${sha256(await readFile(path))}\n`;
+  }));
+  return sha256(lines.sort().join(''));
+}
+
+function baseFromStateId(stateId: string): QsFogBase {
+  const base = QSFOG_BASES.find((value) => stateId.includes(value));
+  if (base === undefined) {
+    throw new Error(`State ${stateId} does not name a frozen base.`);
+  }
+  return base;
+}
+
+function parseDiagnosis(value: unknown): Map<string, DiagnosisCell[]> {
+  const root = z.object({
+    version: z.literal('qsfog-increment-1-diagnosis-v1'),
+    cells: z.array(z.object({
+      state_id: z.string().min(1),
+      column: z.number().int().nonnegative(),
+      row: z.number().int().nonnegative(),
+      eligible: z.boolean(),
+      truth_class: z.enum(['neither', 'obscured-only', 'fog-only', 'fog+obscured']),
+    }).passthrough()),
+  }).passthrough().parse(value);
+  const result = new Map<string, DiagnosisCell[]>();
+  for (const cell of root.cells) {
+    const group = result.get(cell.state_id) ?? [];
+    group.push({
+      column: cell.column,
+      row: cell.row,
+      eligible: cell.eligible,
+      truthClass: cell.truth_class,
+    });
+    result.set(cell.state_id, group);
+  }
+  return result;
+}
+
+function validateDiagnosisDenominators(diagnosis: ReadonlyMap<string, readonly DiagnosisCell[]>): void {
+  let totalFog = 0;
+  let totalObscured = 0;
+  for (const base of QSFOG_BASES) {
+    const cells = [...diagnosis.entries()]
+      .filter(([stateId]) => baseFromStateId(stateId) === base)
+      .flatMap(([, entries]) => entries);
+    const ordinary = cells.filter((cell) => cell.truthClass === 'neither' && cell.eligible).length;
+    const collision = cells.filter((cell) => cell.truthClass === 'obscured-only').length;
+    if (ordinary !== QSFOG_ORDINARY_DENOMINATORS[base]
+      || collision !== QSFOG_COLLISION_DENOMINATORS[base]) {
+      throw new Error(`Diagnosis fixed denominators differ for base ${base}.`);
+    }
+    totalFog += cells.filter((cell) =>
+      cell.truthClass === 'fog-only' || cell.truthClass === 'fog+obscured').length;
+    totalObscured += cells.filter((cell) =>
+      cell.truthClass === 'obscured-only' || cell.truthClass === 'fog+obscured').length;
+  }
+  if (totalFog !== 24 || totalObscured !== 352) {
+    throw new Error('Diagnosis canonical fog/obscurement truth totals differ from 24/352.');
+  }
+}
+
+function candidateEligibility(
+  manifest: z.infer<typeof imageOverrideManifestSchema>,
+  states: readonly string[],
+): boolean {
+  const manipulation = record(manifest.manipulationValidation);
+  if (manipulation === null) {
+    throw new Error('Candidate manipulationValidation must be an object.');
+  }
+  const stateEvidence = record(manipulation['states']);
+  if (stateEvidence === null) {
+    throw new Error('Candidate manipulationValidation lacks state eligibility evidence.');
+  }
+  return states.every((state) => record(stateEvidence[state])?.['archivedControlEligible'] === true);
+}
+
+export interface PairedStateRow {
+  arm: string;
+  stateId: string;
+  base: QsFogBase;
+  stateDigest: string;
+  truthSha256: string;
+  pngSha256: string;
+  originalPngSha256: string;
+  manifestSha256: string;
+  score: number;
+  accounting: Q9Accounting;
+  ordinaryDenominator: number;
+  collisionDenominator: number;
+  truthOverlap: number;
+  predictedOverlap: number;
+  candidateDelta: number | null;
+  stablePositiveLoss: number;
+  identityStatus: 'identity' | 'candidate-authenticated';
+}
+
+function csvCell(value: string | number | boolean): string {
+  const text = String(value);
+  return /[",\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
+}
+
+export function renderStatesCsv(rows: readonly PairedStateRow[]): string {
+  const headings = [
+    'arm',
+    'state_id',
+    'base',
+    'state_digest',
+    'truth_sha256',
+    'png_sha256',
+    'original_png_sha256',
+    'manifest_sha256',
+    'score',
+    'intersection',
+    'union',
+    'hallucinations',
+    'fog_tp',
+    'fog_fn',
+    'obscured_tp',
+    'obscured_fn',
+    ...Object.keys(rows[0]?.accounting.buckets ?? {}),
+    'ordinary_denominator',
+    'ordinary_rate',
+    'collision_denominator',
+    'collision_rate',
+    'truth_overlap',
+    'predicted_overlap',
+    'candidate_delta',
+    'stable_positive_loss',
+    'identity_status',
+  ];
+  const lines = rows.map((row) => [
+    row.arm,
+    row.stateId,
+    row.base,
+    row.stateDigest,
+    row.truthSha256,
+    row.pngSha256,
+    row.originalPngSha256,
+    row.manifestSha256,
+    row.score.toFixed(12),
+    row.accounting.intersection,
+    row.accounting.union,
+    row.accounting.hallucinations,
+    row.accounting.fogTruePositives,
+    row.accounting.fogFalseNegatives,
+    row.accounting.obscuredTruePositives,
+    row.accounting.obscuredFalseNegatives,
+    ...Object.values(row.accounting.buckets),
+    row.ordinaryDenominator,
+    (row.accounting.buckets.fogEligibleOrdinary / row.ordinaryDenominator).toFixed(12),
+    row.collisionDenominator,
+    (row.accounting.buckets.fogObscuredOnly / row.collisionDenominator).toFixed(12),
+    row.truthOverlap,
+    row.predictedOverlap,
+    row.candidateDelta === null ? '' : row.candidateDelta.toFixed(12),
+    row.stablePositiveLoss,
+    row.identityStatus,
+  ].map(csvCell).join(','));
+  return `${headings.join(',')}\n${lines.join('\n')}\n`;
+}
+
+function rationalText(value: RationalValue): string {
+  return `${String(value.numerator)}/${String(value.denominator)}`;
+}
+
+export function renderSummaryCsv(
+  result: ReturnType<typeof calculatePromotion>,
+  input: PromotionInput,
+): string {
+  const headings = [
+    'scope',
+    'key',
+    'delta_or_reduction',
+    'threshold',
+    'control_spread',
+    'control_c1_mean',
+    'control_c2_mean',
+    'reference_mean',
+    'score_headroom',
+    'reference_count',
+    'candidate_count',
+    'reference_rate',
+    'candidate_rate',
+    'relative_reduction',
+    'quarter_bit',
+    'strict_spread_bit',
+    'fog_fn_c1',
+    'fog_fn_c2',
+    'fog_fn_candidate',
+    'obscured_fn_c1',
+    'obscured_fn_c2',
+    'obscured_fn_candidate',
+    'condition_1',
+    'condition_2',
+    'condition_3',
+    'condition_4',
+    'condition_5',
+    'condition_6',
+    'condition_7',
+    'passes',
+    'verdict',
+  ];
+  const conditionColumns = result.conditions.map(String);
+  const scoreSummary = (states: readonly PromotionInput['states'][number][]) => {
+    const c1Mean = mean(states.map((state) => scoreFraction(state.c1)));
+    const c2Mean = mean(states.map((state) => scoreFraction(state.c2)));
+    const referenceMean = divide(add(c1Mean, c2Mean), rational(2));
+    return {
+      c1Mean,
+      c2Mean,
+      referenceMean,
+      headroom: subtract(rational(1), referenceMean),
+    };
+  };
+  const overallScores = scoreSummary(input.states);
+  const overallRepeatability = calculateRepeatability(input.states);
+  const emptyFamilyColumns = ['', '', '', '', '', '', ''];
+  const emptyFnColumns = ['', '', '', '', '', ''];
+  const lines = [headings.join(',')];
+  lines.push([
+    'overall',
+    'all',
+    rationalText(result.overallDelta),
+    rationalText(result.threshold),
+    rationalText(overallRepeatability.spread),
+    rationalText(external(overallScores.c1Mean)),
+    rationalText(external(overallScores.c2Mean)),
+    rationalText(external(overallScores.referenceMean)),
+    rationalText(external(overallScores.headroom)),
+    ...emptyFamilyColumns,
+    input.fogFalseNegatives.c1,
+    input.fogFalseNegatives.c2,
+    input.fogFalseNegatives.candidate,
+    input.obscurementFalseNegatives.c1,
+    input.obscurementFalseNegatives.c2,
+    input.obscurementFalseNegatives.candidate,
+    ...conditionColumns,
+    result.conditions[0],
+    result.verdict,
+  ].map(csvCell).join(','));
+  for (const base of QSFOG_BASES) {
+    const row = result.byBase[base];
+    const scores = scoreSummary(input.states.filter((state) => state.base === base));
+    lines.push([
+      'base',
+      base,
+      rationalText(row.delta),
+      rationalText(row.threshold),
+      rationalText(overallRepeatability.byBase[base].spread),
+      rationalText(external(scores.c1Mean)),
+      rationalText(external(scores.c2Mean)),
+      rationalText(external(scores.referenceMean)),
+      rationalText(external(scores.headroom)),
+      ...emptyFamilyColumns,
+      ...emptyFnColumns,
+      ...conditionColumns,
+      row.passes,
+      result.verdict,
+    ].map(csvCell).join(','));
+  }
+  for (const base of QSFOG_BASES) {
+    const row = result.leaveOneOut[base];
+    const scores = scoreSummary(input.states.filter((state) => state.base !== base));
+    const retainedRepeatability = calculateRepeatability(
+      input.states.filter((state) => state.base !== base),
+    );
+    lines.push([
+      'leave_one_out',
+      base,
+      rationalText(row.delta),
+      '',
+      rationalText(retainedRepeatability.spread),
+      rationalText(external(scores.c1Mean)),
+      rationalText(external(scores.c2Mean)),
+      rationalText(external(scores.referenceMean)),
+      rationalText(external(scores.headroom)),
+      ...emptyFamilyColumns,
+      ...emptyFnColumns,
+      ...conditionColumns,
+      row.comparison,
+      result.verdict,
+    ].map(csvCell).join(','));
+  }
+  for (const name of ['ordinary', 'collision'] as const) {
+    const family = result.families[name];
+    const familyInput = input.families[name];
+    const quarterBit = family.relativeReduction !== null
+      && compare(
+        rational(family.relativeReduction.numerator, family.relativeReduction.denominator),
+        rational(1, 4),
+      ) >= 0;
+    const strictSpreadBit = compare(
+      rational(family.reduction.numerator, family.reduction.denominator),
+      multiply(rational(2), rational(family.spread.numerator, family.spread.denominator)),
+    ) > 0;
+    lines.push([
+      'family',
+      name,
+      rationalText(family.reduction),
+      '',
+      rationalText(family.spread),
+      '',
+      '',
+      '',
+      '',
+      rationalText(family.referenceCount),
+      family.candidateCount,
+      rationalText(family.referenceRate),
+      rationalText(family.candidateRate),
+      family.relativeReduction === null ? '' : rationalText(family.relativeReduction),
+      quarterBit,
+      strictSpreadBit,
+      ...emptyFnColumns,
+      ...conditionColumns,
+      family.qualifies,
+      result.verdict,
+    ].map(csvCell).join(','));
+    for (const base of QSFOG_BASES) {
+      const denominator = familyInput.denominatorByBase[base];
+      const referenceCount = rational(
+        familyInput.c1ByBase[base] + familyInput.c2ByBase[base],
+        2,
+      );
+      const referenceRate = divide(referenceCount, rational(denominator));
+      const candidateRate = rational(familyInput.candidateByBase[base], denominator);
+      const reduction = subtract(referenceRate, candidateRate);
+      const spread = absolute(subtract(
+        rational(familyInput.c1ByBase[base], denominator),
+        rational(familyInput.c2ByBase[base], denominator),
+      ));
+      const relativeReduction = referenceCount.numerator === 0n
+        ? null
+        : divide(reduction, referenceRate);
+      lines.push([
+        'family_base',
+        `${name}:${base}`,
+        rationalText(external(reduction)),
+        '',
+        rationalText(external(spread)),
+        '',
+        '',
+        '',
+        '',
+        rationalText(external(referenceCount)),
+        familyInput.candidateByBase[base],
+        rationalText(external(referenceRate)),
+        rationalText(external(candidateRate)),
+        relativeReduction === null ? '' : rationalText(external(relativeReduction)),
+        relativeReduction !== null && compare(relativeReduction, rational(1, 4)) >= 0,
+        compare(reduction, multiply(rational(2), spread)) > 0,
+        ...emptyFnColumns,
+        ...conditionColumns,
+        compare(candidateRate, referenceRate) <= 0,
+        result.verdict,
+      ].map(csvCell).join(','));
+    }
+  }
+  return `${lines.join('\n')}\n`;
+}
+
+export function renderReportMarkdown(
+  block: QsFogSupervisorBlock,
+  result: ReturnType<typeof calculatePromotion>,
+  states: readonly PairedStateRow[],
+  stablePositiveLosses: number,
+  disputedPositiveFacts: number,
+): string {
+  const lines = [
+    '# QSFOG intervention report',
+    '',
+    `- Block: ${block.blockId}`,
+    `- Freeze SHA-256: ${block.freezeSha256}`,
+    `- Whole interval: ${block.wholeBlockContinuity.startedAt} through ${block.wholeBlockContinuity.endedAt}`,
+    `- Authenticated arm/state rows: ${String(states.length)}`,
+    `- Repeatability threshold: ${rationalText(result.threshold)}`,
+    `- Overall candidate delta: ${rationalText(result.overallDelta)}`,
+    `- Ordinary denominator: ${String(result.families.ordinary.denominator)}`,
+    `- Collision denominator: ${String(result.families.collision.denominator)}`,
+    `- Stable-positive losses: ${String(stablePositiveLosses)}`,
+    `- Control-disputed positive facts: ${String(disputedPositiveFacts)}`,
+    `- Conditions 1-7: ${result.conditions.map((value) => value ? 'PASS' : 'FAIL').join(', ')}`,
+    '',
+    '## Base thresholds',
+    '',
+  ];
+  for (const base of QSFOG_BASES) {
+    const row = result.byBase[base];
+    lines.push(
+      `- ${base}: delta ${rationalText(row.delta)}, threshold ${rationalText(row.threshold)}, `
+        + `${row.passes ? 'PASS' : 'FAIL'}`,
+    );
+  }
+  lines.push('', '## Leave-one-base-out', '');
+  for (const base of QSFOG_BASES) {
+    const row = result.leaveOneOut[base];
+    lines.push(`- Remove ${base}: ${rationalText(row.delta)} (${row.comparison})`);
+  }
+  lines.push(
+    '',
+    '## Fixed-denominator error families',
+    '',
+    `- Ordinary: reference ${rationalText(result.families.ordinary.referenceRate)}, `
+      + `candidate ${rationalText(result.families.ordinary.candidateRate)}, `
+      + `spread ${rationalText(result.families.ordinary.spread)}, `
+      + `qualifies ${String(result.families.ordinary.qualifies)}.`,
+    `- Collision: reference ${rationalText(result.families.collision.referenceRate)}, `
+      + `candidate ${rationalText(result.families.collision.candidateRate)}, `
+      + `spread ${rationalText(result.families.collision.spread)}, `
+      + `qualifies ${String(result.families.collision.qualifies)}.`,
+    '',
+    `## Verdict: ${result.verdict}`,
+    '',
+  );
+  return lines.join('\n');
+}
+
+export function renderRepeatabilitySummaryCsv(
+  result: ReturnType<typeof calculateRepeatability>,
+): string {
+  const lines = ['scope,key,spread,mean_difference,threshold'];
+  lines.push([
+    'overall',
+    'all',
+    rationalText(result.spread),
+    '',
+    rationalText(result.threshold),
+  ].map(csvCell).join(','));
+  for (const base of QSFOG_BASES) {
+    const row = result.byBase[base];
+    lines.push([
+      'base',
+      base,
+      rationalText(row.spread),
+      rationalText(row.meanDifference),
+      rationalText(row.threshold),
+    ].map(csvCell).join(','));
+  }
+  return `${lines.join('\n')}\n`;
+}
+
+export function renderRepeatabilityMarkdown(
+  block: QsFogSupervisorBlock,
+  result: ReturnType<typeof calculateRepeatability>,
+  states: readonly PairedStateRow[],
+): string {
+  return [
+    '# QSFOG repeatability report',
+    '',
+    `- Block: ${block.blockId}`,
+    `- Freeze SHA-256: ${block.freezeSha256}`,
+    `- Whole interval: ${block.wholeBlockContinuity.startedAt} through ${block.wholeBlockContinuity.endedAt}`,
+    `- Authenticated arm/state rows: ${String(states.length)}`,
+    `- Conservative spread: ${rationalText(result.spread)}`,
+    `- Frozen threshold: ${rationalText(result.threshold)}`,
+    '',
+    '## Verdict: REPEATABILITY_AUTHENTICATED',
+    '',
+  ].join('\n');
+}
+
+async function writeExclusiveReports(
+  outPrefix: string,
+  statesCsv: string,
+  summaryCsv: string,
+  markdown: string,
+): Promise<void> {
+  const outputPaths = [
+    `${outPrefix}-states.csv`,
+    `${outPrefix}-summary.csv`,
+    `${outPrefix}-report.md`,
+  ];
+  for (const output of outputPaths) {
+    if (statSync(dirname(output), { throwIfNoEntry: false })?.isFile()) {
+      throw new Error('Report output parent is a file.');
+    }
+  }
+  await mkdir(dirname(outPrefix), { recursive: true });
+  await writeFile(outputPaths[0]!, statesCsv, { encoding: 'utf8', flag: 'wx' });
+  await writeFile(outputPaths[1]!, summaryCsv, { encoding: 'utf8', flag: 'wx' });
+  await writeFile(outputPaths[2]!, markdown, { encoding: 'utf8', flag: 'wx' });
+}
+
+export async function runPairedReport(args: ParsedCliArgs): Promise<string> {
+  const blockPath = relativeCliPath(requireFlag(args, '--block-record'), '--block-record');
+  const sourceRowsPath = relativeCliPath(requireFlag(args, '--source-rows'), '--source-rows');
+  const diagnosisPath = relativeCliPath(requireFlag(args, '--diagnosis'), '--diagnosis');
+  const c1Path = relativeCliPath(requireFlag(args, '--control-c1'), '--control-c1');
+  const c2Path = relativeCliPath(requireFlag(args, '--control-c2'), '--control-c2');
+  const outPrefix = relativeCliPath(requireFlag(args, '--out-prefix'), '--out-prefix');
+  const candidates = args.values.get('--candidate') ?? [];
+  if (candidates.length > 1) {
+    throw new TypeError('Increment A accepts at most one --candidate arm.');
+  }
+  const candidateSpec = candidates[0];
+  const includeCandidate = candidateSpec !== undefined;
+  let candidateName: string | null = null;
+  let candidatePath: string | null = null;
+  if (candidateSpec !== undefined) {
+    const equals = candidateSpec.indexOf('=');
+    if (equals <= 0 || equals === candidateSpec.length - 1) {
+      throw new TypeError('--candidate must be name=repository-relative-path.');
+    }
+    candidateName = candidateSpec.slice(0, equals);
+    candidatePath = relativeCliPath(candidateSpec.slice(equals + 1), '--candidate');
+  }
+  const block = await readBlock(blockPath);
+  validateCompletedBlock(block, includeCandidate);
+  if (resolve(repositoryRoot, block.paths.c1Jsonl) !== c1Path
+    || resolve(repositoryRoot, block.paths.c2Jsonl) !== c2Path
+    || (includeCandidate && resolve(repositoryRoot, block.paths.frameJsonl) !== candidatePath)) {
+    throw new Error('Report arm paths differ from the supervisor block.');
+  }
+  await authenticateFreeze({
+    repositoryRoot,
+    blockRecordPath: blockPath,
+    sourceRowsPath,
+    expectedSourceRowsSha256: block.hashes.sourceRowsSha256,
+    sourceImagesRoot: '',
+    sourceRevision: block.committedRevision,
+    states: block.invocationPolicy.states,
+    seed: block.invocationPolicy.seed,
+    model: `${block.invocationPolicy.model}:${block.invocationPolicy.effort}`,
+    question: 'Q9',
+    outDirectory: resolve(repositoryRoot, block.paths.identityManifest),
+  }, block, {});
+  const sourceRowsBytes = await readFile(sourceRowsPath);
+  const diagnosisBytes = await readFile(diagnosisPath);
+  if (sha256(sourceRowsBytes) !== block.hashes.sourceRowsSha256
+    || sha256(diagnosisBytes) !== block.hashes.diagnosisSha256) {
+    throw new Error('Report source rows or diagnosis SHA-256 differs from the block.');
+  }
+  const sourceRows = parseJsonLines(sourceRowsBytes, 'Source rows').flatMap((value) => {
+    const possible = record(value);
+    return possible?.['model'] === 'gpt-5.6-sol'
+      && possible['effort'] === 'high'
+      && possible['question'] === 'Q9'
+      ? [sourceQ9RowSchema.parse(value)]
+      : [];
+  });
+  const expectedStates = sourceRows.map((row) => row.stateId);
+  if (expectedStates.length !== block.invocationPolicy.states
+    || new Set(expectedStates).size !== expectedStates.length) {
+    throw new Error('Source rows do not contain the exact frozen state set.');
+  }
+  const identityPath = join(resolve(repositoryRoot, block.paths.identityManifest), 'manifest.json');
+  const identityBytes = await readFile(identityPath);
+  if (block.hashes.identityManifestSha256 === null
+    || sha256(identityBytes) !== block.hashes.identityManifestSha256) {
+    throw new Error('Identity manifest SHA-256 is absent or stale.');
+  }
+  const identity = imageOverrideManifestSchema.parse(parseJson(identityBytes, 'Identity manifest'));
+  const identityValidation = record(identity.manipulationValidation);
+  if (identityValidation?.['probeHarnessSha256'] !== block.hashes.probeHarnessSha256
+    || identityValidation['blockFreezeSha256'] !== block.freezeSha256) {
+    throw new Error('Identity manipulation authentication differs from the block.');
+  }
+  const selectedCandidates = shuffledCandidates(
+    await defaultProbeStateCandidates(),
+    block.invocationPolicy.seed,
+  ).slice(0, block.invocationPolicy.states);
+  if (canonicalJson(selectedCandidates.map((candidate) => candidate.id)) !== canonicalJson(expectedStates)) {
+    throw new Error('Source row order differs from the frozen candidate ordering.');
+  }
+  const candidateByState = new Map(selectedCandidates.map((candidate) => [candidate.id, candidate]));
+  for (const source of sourceRows) {
+    const selected = candidateByState.get(source.stateId);
+    const identityEntry = identity.states[source.stateId];
+    if (selected === undefined || identityEntry === undefined) {
+      throw new Error(`Identity manifest lacks frozen state ${source.stateId}.`);
+    }
+    const derivedTruth = q9AnswerSchema.parse(truthAnswer(
+      deriveScreenshotFactSheet(selected.state, selected.desiredLineTier),
+      'Q9',
+    ));
+    if (boardStateDigest(selected.state) !== source.stateDigest
+      || canonicalJson(derivedTruth) !== canonicalJson(source.truth)
+      || identityEntry.sha256 !== source.png.sha256
+      || identityEntry.sourcePng.sha256 !== source.png.sha256
+      || identityEntry.width !== source.png.width
+      || identityEntry.height !== source.png.height
+      || canonicalJson(identityEntry.sourcePng) !== canonicalJson({
+        sha256: source.png.sha256,
+        width: source.png.width,
+        height: source.png.height,
+      })) {
+      throw new Error(`Identity/source/state authentication failed for ${source.stateId}.`);
+    }
+  }
+  const terminalEvidence = record(identityValidation['terminalSnapshotManifest']);
+  if (terminalEvidence === null
+    || typeof terminalEvidence['path'] !== 'string'
+    || typeof terminalEvidence['sha256'] !== 'string') {
+    throw new Error('Identity manifest lacks terminal snapshot authentication.');
+  }
+  const sourceImagesRoot = resolveRepositoryPath(
+    repositoryRoot,
+    identity.sourceImagesRoot,
+    'identity sourceImagesRoot',
+  );
+  const terminalPath = resolveRepositoryPath(
+    repositoryRoot,
+    terminalEvidence['path'],
+    'terminal snapshot manifest',
+  );
+  if (sha256(await readFile(terminalPath)) !== terminalEvidence['sha256']) {
+    throw new Error('Terminal snapshot manifest SHA-256 differs from identity evidence.');
+  }
+  const imageSetSha256 = await sourceImageSetDigest(
+    repositoryRoot,
+    sourceRows.map((row) => resolveRepositoryPath(
+      sourceImagesRoot,
+      row.png.relativePath,
+      `Source PNG ${row.stateId}`,
+    )),
+    terminalPath,
+  );
+  if (imageSetSha256 !== block.hashes.sourceImageSetSha256
+    || identityValidation['sourceImageSetSha256'] !== imageSetSha256) {
+    throw new Error('Current source image set differs from the authenticated identity.');
+  }
+  let candidateManifest: z.infer<typeof imageOverrideManifestSchema> | null = null;
+  let eligible = true;
+  if (includeCandidate) {
+    if (block.paths.candidateManifest === null || block.hashes.candidateManifestSha256 === null) {
+      throw new Error('Candidate block path/hash is absent.');
+    }
+    const manifestPath = resolveRepositoryPath(repositoryRoot, block.paths.candidateManifest, 'candidateManifest');
+    const bytes = await readFile(manifestPath);
+    if (sha256(bytes) !== block.hashes.candidateManifestSha256) {
+      throw new Error('Candidate manifest SHA-256 differs from the block.');
+    }
+    candidateManifest = imageOverrideManifestSchema.parse(parseJson(bytes, 'Candidate manifest'));
+    eligible = candidateEligibility(candidateManifest, expectedStates);
+  }
+  const armDefinitions = [
+    { name: 'C1', path: c1Path, manifest: identity, blockArm: block.arms.C1 },
+    { name: 'C2', path: c2Path, manifest: identity, blockArm: block.arms.C2 },
+    ...(includeCandidate && candidatePath !== null && candidateManifest !== null
+      ? [{ name: candidateName!, path: candidatePath, manifest: candidateManifest, blockArm: block.arms.frame5 }]
+      : []),
+  ];
+  if (block.arms.C1.manifestSha256 !== block.hashes.identityManifestSha256
+    || block.arms.C2.manifestSha256 !== block.hashes.identityManifestSha256
+    || (includeCandidate && block.arms.frame5.manifestSha256 !== block.hashes.candidateManifestSha256)) {
+    throw new Error('Arm manifest hashes differ from the authenticated block manifests.');
+  }
+  const diagnosis = parseDiagnosis(parseJson(diagnosisBytes, 'Diagnosis'));
+  if (diagnosis.size !== expectedStates.length) {
+    throw new Error('Diagnosis state partition differs from the frozen state set.');
+  }
+  validateDiagnosisDenominators(diagnosis);
+  const sourceByState = new Map(sourceRows.map((row) => [row.stateId, row]));
+  const rowsByArm = new Map<string, Array<z.infer<typeof armQ9RowSchema>>>();
+  const stateRows: PairedStateRow[] = [];
+  for (const arm of armDefinitions) {
+    const bytes = await readFile(arm.path);
+    if (sha256(bytes) !== arm.blockArm.jsonlSha256) {
+      throw new Error(`${arm.name} JSONL SHA-256 differs from the block.`);
+    }
+    const decoded = parseJsonLines(bytes, `${arm.name} rows`);
+    validateProbeRows(decoded, expectedStates);
+    const rows = decoded.map((value) => armQ9RowSchema.parse(value));
+    rowsByArm.set(arm.name, rows);
+    const imagesRootPath = resolveRepositoryPath(
+      repositoryRoot,
+      arm.name === 'C1'
+        ? block.paths.c1ImagesRoot
+        : arm.name === 'C2'
+          ? block.paths.c2ImagesRoot
+          : block.paths.frameImagesRoot,
+      `${arm.name} images root`,
+    );
+    if (await treeDigest(imagesRootPath, repositoryRoot) !== arm.blockArm.imagesRootSha256) {
+      throw new Error(`${arm.name} images-root SHA-256 differs from the block.`);
+    }
+    for (const row of rows) {
+      const source = sourceByState.get(row.stateId);
+      const entry = arm.manifest.states[row.stateId];
+      if (source === undefined || entry === undefined) {
+        throw new Error(`${arm.name}/${row.stateId} lacks source or manifest evidence.`);
+      }
+      if (row.stateDigest !== source.stateDigest
+        || canonicalJson(row.truth) !== canonicalJson(source.truth)
+        || row.generation !== block.invocationPolicy.generation
+        || row.imageOverride.manifestSha256 !== arm.blockArm.manifestSha256
+        || row.imageOverride.originalPngSha256 !== source.png.sha256
+        || row.png.sha256 !== entry.sha256
+        || row.png.width !== entry.width
+        || row.png.height !== entry.height
+        || entry.sourcePng.sha256 !== source.png.sha256
+        || entry.sourcePng.width !== source.png.width
+        || entry.sourcePng.height !== source.png.height) {
+        throw new Error(`${arm.name}/${row.stateId} provenance differs from the frozen evidence.`);
+      }
+      const expectedManifestPath = arm.name === 'C1' || arm.name === 'C2'
+        ? relative(repositoryRoot, identityPath)
+        : block.paths.candidateManifest;
+      if (row.imageOverride.manifestPath !== expectedManifestPath) {
+        throw new Error(`${arm.name}/${row.stateId} manifest path differs from the block.`);
+      }
+      const armPngPath = resolveRepositoryPath(
+        imagesRootPath,
+        row.png.relativePath,
+        `${arm.name}/${row.stateId} output PNG`,
+      );
+      const armPng = await readFile(armPngPath);
+      const armDimensions = validatedPngDimensions(armPng);
+      if (sha256(armPng) !== row.png.sha256
+        || armDimensions.width !== row.png.width
+        || armDimensions.height !== row.png.height) {
+        throw new Error(`${arm.name}/${row.stateId} output PNG authentication failed.`);
+      }
+      const stateDiagnosis = diagnosis.get(row.stateId);
+      if (stateDiagnosis === undefined) {
+        throw new Error(`Diagnosis lacks state ${row.stateId}.`);
+      }
+      const bounds = stateDiagnosis.reduce((current, cell) => ({
+        columns: Math.max(current.columns, cell.column + 1),
+        rows: Math.max(current.rows, cell.row + 1),
+      }), { columns: 0, rows: 0 });
+      const accounting = classifyQ9Accounting(row.answer, row.truth, bounds, stateDiagnosis);
+      if (accounting.score !== row.score || accounting.hallucinations !== row.hallucinations) {
+        throw new Error(`${arm.name}/${row.stateId} stored score differs from local scorer semantics.`);
+      }
+      const base = baseFromStateId(row.stateId);
+      const truthFog = uniqueCells(row.truth.foggedCells);
+      const truthObscured = uniqueCells(row.truth.obscuredCells);
+      const predictedFog = uniqueCells(row.answer.foggedCells);
+      const predictedObscured = uniqueCells(row.answer.obscuredCells);
+      stateRows.push({
+        arm: arm.name,
+        stateId: row.stateId,
+        base,
+        stateDigest: row.stateDigest,
+        truthSha256: sha256(canonicalJson(row.truth)),
+        pngSha256: row.png.sha256,
+        originalPngSha256: row.imageOverride.originalPngSha256,
+        manifestSha256: row.imageOverride.manifestSha256,
+        score: row.score,
+        accounting,
+        ordinaryDenominator: QSFOG_ORDINARY_DENOMINATORS[base],
+        collisionDenominator: QSFOG_COLLISION_DENOMINATORS[base],
+        truthOverlap: [...truthFog.keys()].filter((key) => truthObscured.has(key)).length,
+        predictedOverlap: [...predictedFog.keys()].filter((key) => predictedObscured.has(key)).length,
+        candidateDelta: null,
+        stablePositiveLoss: 0,
+        identityStatus: arm.name === 'C1' || arm.name === 'C2'
+          ? 'identity'
+          : 'candidate-authenticated',
+      });
+    }
+  }
+  if (!includeCandidate) {
+    const c1Rows = new Map(stateRows.filter((row) => row.arm === 'C1').map((row) => [row.stateId, row]));
+    const c2Rows = new Map(stateRows.filter((row) => row.arm === 'C2').map((row) => [row.stateId, row]));
+    const repeatability = calculateRepeatability(expectedStates.map((stateId) => ({
+      stateId,
+      base: baseFromStateId(stateId),
+      c1: {
+        intersection: c1Rows.get(stateId)!.accounting.intersection,
+        union: c1Rows.get(stateId)!.accounting.union,
+      },
+      c2: {
+        intersection: c2Rows.get(stateId)!.accounting.intersection,
+        union: c2Rows.get(stateId)!.accounting.union,
+      },
+    })));
+    await writeExclusiveReports(
+      outPrefix,
+      renderStatesCsv(stateRows),
+      renderRepeatabilitySummaryCsv(repeatability),
+      renderRepeatabilityMarkdown(block, repeatability, stateRows),
+    );
+    return 'REPEATABILITY_AUTHENTICATED';
+  }
+  const c1 = new Map(rowsByArm.get('C1')!.map((row) => [row.stateId, row]));
+  const c2 = new Map(rowsByArm.get('C2')!.map((row) => [row.stateId, row]));
+  const candidateRows = new Map(rowsByArm.get(candidateName!)!.map((row) => [row.stateId, row]));
+  const stateMetric = (arm: string, stateId: string): PairedStateRow => {
+    const row = stateRows.find((entry) => entry.arm === arm && entry.stateId === stateId);
+    if (row === undefined) {
+      throw new Error(`Missing calculated ${arm}/${stateId} state metric.`);
+    }
+    return row;
+  };
+  let stablePositiveLosses = 0;
+  let disputedPositiveFacts = 0;
+  for (const stateId of expectedStates) {
+    const truth = c1.get(stateId)!.truth;
+    const c1Fog = uniqueCells(c1.get(stateId)!.answer.foggedCells);
+    const c2Fog = uniqueCells(c2.get(stateId)!.answer.foggedCells);
+    const candidateFog = uniqueCells(candidateRows.get(stateId)!.answer.foggedCells);
+    let stateLosses = 0;
+    for (const key of uniqueCells(truth.foggedCells).keys()) {
+      if (c1Fog.has(key) && c2Fog.has(key) && !candidateFog.has(key)) {
+        stablePositiveLosses += 1;
+        stateLosses += 1;
+      }
+      if (c1Fog.has(key) !== c2Fog.has(key)) {
+        disputedPositiveFacts += 1;
+      }
+    }
+    const candidateMetric = stateMetric(candidateName!, stateId);
+    candidateMetric.stablePositiveLoss = stateLosses;
+    candidateMetric.candidateDelta = candidateMetric.score
+      - (stateMetric('C1', stateId).score + stateMetric('C2', stateId).score) / 2;
+  }
+  const counts = (arm: string, field: keyof Q9Accounting): number => stateRows
+    .filter((row) => row.arm === arm)
+    .reduce((sum, row) => sum + Number(row.accounting[field]), 0);
+  const familyCounts = (
+    bucket: 'fogEligibleOrdinary' | 'fogObscuredOnly',
+  ): Record<'c1' | 'c2' | 'candidate', Record<QsFogBase, number>> => {
+    const result = {
+      c1: Object.fromEntries(QSFOG_BASES.map((base) => [base, 0])) as Record<QsFogBase, number>,
+      c2: Object.fromEntries(QSFOG_BASES.map((base) => [base, 0])) as Record<QsFogBase, number>,
+      candidate: Object.fromEntries(QSFOG_BASES.map((base) => [base, 0])) as Record<QsFogBase, number>,
+    };
+    for (const row of stateRows) {
+      const target = row.arm === 'C1' ? result.c1 : row.arm === 'C2' ? result.c2 : result.candidate;
+      target[row.base] += row.accounting.buckets[bucket];
+    }
+    return result;
+  };
+  const ordinary = familyCounts('fogEligibleOrdinary');
+  const collision = familyCounts('fogObscuredOnly');
+  const promotionInput: PromotionInput = {
+    states: expectedStates.map((stateId) => ({
+      stateId,
+      base: baseFromStateId(stateId),
+      c1: {
+        intersection: stateMetric('C1', stateId).accounting.intersection,
+        union: stateMetric('C1', stateId).accounting.union,
+      },
+      c2: {
+        intersection: stateMetric('C2', stateId).accounting.intersection,
+        union: stateMetric('C2', stateId).accounting.union,
+      },
+      candidate: {
+        intersection: stateMetric(candidateName!, stateId).accounting.intersection,
+        union: stateMetric(candidateName!, stateId).accounting.union,
+      },
+    })),
+    stablePositiveLosses,
+    fogFalseNegatives: {
+      c1: counts('C1', 'fogFalseNegatives'),
+      c2: counts('C2', 'fogFalseNegatives'),
+      candidate: counts(candidateName!, 'fogFalseNegatives'),
+    },
+    obscurementFalseNegatives: {
+      c1: counts('C1', 'obscuredFalseNegatives'),
+      c2: counts('C2', 'obscuredFalseNegatives'),
+      candidate: counts(candidateName!, 'obscuredFalseNegatives'),
+    },
+    families: {
+      ordinary: {
+        denominatorByBase: QSFOG_ORDINARY_DENOMINATORS,
+        c1ByBase: ordinary.c1,
+        c2ByBase: ordinary.c2,
+        candidateByBase: ordinary.candidate,
+      },
+      collision: {
+        denominatorByBase: QSFOG_COLLISION_DENOMINATORS,
+        c1ByBase: collision.c1,
+        c2ByBase: collision.c2,
+        candidateByBase: collision.candidate,
+      },
+    },
+    authenticated: true,
+    archivedControlEligible: eligible,
+  };
+  const promotion = calculatePromotion(promotionInput);
+  await writeExclusiveReports(
+    outPrefix,
+    renderStatesCsv(stateRows),
+    renderSummaryCsv(promotion, promotionInput),
+    renderReportMarkdown(
+      block,
+      promotion,
+      stateRows,
+      stablePositiveLosses,
+      disputedPositiveFacts,
+    ),
+  );
+  return promotion.verdict;
+}
+
+async function main(): Promise<void> {
+  const scriptIndex = process.argv.findIndex((argument) =>
+    argument.endsWith('/qsfog-intervention-report.ts')
+    || argument.endsWith('\\qsfog-intervention-report.ts'));
+  const argv = scriptIndex < 0 ? process.argv.slice(2) : process.argv.slice(scriptIndex + 1);
+  const parsed = parseQsFogCliArgs(argv);
+  if (parsed.subcommand === 'identity-manifest') {
+    const states = Number(requireFlag(parsed, '--states'));
+    const seed = Number(requireFlag(parsed, '--seed'));
+    const manifest = await buildIdentityManifest({
+      repositoryRoot,
+      blockRecordPath: relativeCliPath(requireFlag(parsed, '--block-record'), '--block-record'),
+      sourceRowsPath: relativeCliPath(requireFlag(parsed, '--source-rows'), '--source-rows'),
+      expectedSourceRowsSha256: requireFlag(parsed, '--expected-source-rows-sha256'),
+      sourceImagesRoot: requireFlag(parsed, '--source-images-root'),
+      sourceRevision: requireFlag(parsed, '--source-revision'),
+      states,
+      seed,
+      model: requireFlag(parsed, '--model'),
+      question: requireFlag(parsed, '--question'),
+      outDirectory: relativeCliPath(requireFlag(parsed, '--out'), '--out'),
+    });
+    process.stdout.write(`${sha256(`${canonicalJson(manifest)}\n`)}  manifest.json\n`);
+    return;
+  }
+  process.stdout.write(`${await runPairedReport(parsed)}\n`);
+}
+
+const invokedPath = process.argv[1];
+if (process.env['VITEST'] !== 'true'
+  && invokedPath !== undefined
+  && (import.meta.url === pathToFileURL(invokedPath).href
+    || ((invokedPath.endsWith('/vite-node')
+      || invokedPath.endsWith('\\vite-node')
+      || invokedPath.endsWith('/vite-node.mjs')
+      || invokedPath.endsWith('\\vite-node.mjs'))
+      && (process.argv.includes('identity-manifest') || process.argv.includes('paired-report'))))) {
+  try {
+    await main();
+  } catch (error) {
+    process.stderr.write(`INVALID_INPUT: ${error instanceof Error ? error.message : String(error)}\n`);
+    process.exitCode = 1;
+  }
+}
