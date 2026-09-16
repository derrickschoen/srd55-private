# QSFOG-SVG-01 Increment A fix round 2 — gpt-5.6-sol report

Session 01a0a1f6-faca-7f73-a2a2-59cc14c597f8; log .tmp/runs/fanout/impl-qsfog-a-fix-r2.log.

Implemented IA2-F1 and IA2-F2 within the two authorized files.

### RED

```text
npx vitest run --configLoader runner tests/unit/tools/qsfog-intervention-report.test.ts
exit 1

Test Files  1 failed (1)
Tests       6 failed | 65 passed (71)
```

Failing tests:

- `rejects a valid-CRC PNG whose IDAT chunks are separated by a tEXt chunk`
- `rejects a complete no-op capture before considering archived-control eligibility`
- `rejects complete evidence whose post-intervention visual DOM is unchanged`
- `rejects a zero changed-pixel count paired with a nonzero fraction`
- `rejects changed-region bounds outside the authenticated fog-cell extent`
- `rejects per-fog-cell evidence that disagrees with the authenticated state`

### Changes

- [qsfog-intervention-report.ts](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/qsfog-intervention-report.ts)
  - Requires typed bounds and per-fog-cell evidence.
  - Authenticates the exact fog-cell set for every state.
  - Requires nonzero changes for fog-bearing states.
  - Requires changed pixels, fraction, per-cell totals, bounds, and frozen 128×128 tile geometry to agree.
  - Uses the real board-bitmap grid origin: 4 px border + 48 px gutter = 52 px.
  - Rejects identical A1/B PNG, RGBA, or visual-DOM evidence.
  - Performs validation before returning either eligibility boolean, including the false eligibility path.
  - Enforces exact zero-fog A1/B equality.
  - Rejects an IDAT chunk after the consecutive IDAT run has ended.

- [qsfog-intervention-report.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/unit/tools/qsfog-intervention-report.test.ts)
  - Adds five isolated, complete-evidence IA2-F1 regressions.
  - Tests no-op rejection in both eligible and authenticated-false cases.
  - Builds a valid-CRC `IHDR → IDAT → tEXt → IDAT → IEND` PNG and verifies rejection.

### Mutants

Command:

```text
bash /tmp/qsfog-run-mutants.sh
exit 0
```

Results:

```text
mutants=45
exit[1]=45
survivors=0
restore mismatches=0
pristine/restored SHA=4a4e76372da97d62afd2429cc5567757a07bb5ef89f1392f2607b1987538affc
```

All entries exited 1 and named the expected killing test.

| Mutant | Applied SHA-256 | Killing test |
|---|---|---|
| STATE_COMPLETENESS | `e01a36022bde65b5bbfd07918eaf5984679382641be5c1e6d7a0ec6a24444540` | authenticates truth and PNGs, copies exact bytes, and bypasses snapshot capture and close |
| PNG_AUTHENTICATION | `179c682bbb5d5ba6c51f427e77c951495183f0713b2bebbdc50f58a25623c7e6` | rejects canonical truth changes and PNG byte or IHDR changes |
| CANONICAL_TRUTH | `6e5f2427b1065a52c48ec761b15b67be08e1aaa9927eccc792a310a86d3d4da7` | rejects canonical truth changes and PNG byte or IHDR changes |
| STALE_FREEZE | `a7901611b36107402124c0a768140cc98f142c8f06d332cf3a5a4b16c01fbb7f` | rejects stale block harness, HEAD, status, and pause authentication |
| STALE_HEAD | `cdef274299bfe21b3d1703d82cae1ccdb52ae976076f75ba2e101cb855228763` | authenticates truth and PNGs, copies exact bytes, and bypasses snapshot capture and close |
| PLANNED_PATH_PREFLIGHT | `e1279100361a9f5ba09172f90662c5ecb4426dafe943f4159d0620183d91a174` | rejects pre-existing final-block output identityManifest |
| DERIVED_SUMMARY | `faa879885bffd377c4ae75297d3a76fa37074396477a3eb78a031bc9ba36fc3a` | derives the probe summary overwrite path exactly |
| GAP_INTERRUPTION | `eb016af9a374973b1fa0d47da63772af40026487dfa95bf607c5debed434f9b2` | rejects an outage only in the inter-arm gap |
| NON_CANCELLING_SPREAD | `97f86511705a24bcc5627fd305a7a94787676620c683524d8251d48ceb9d0b6f` | uses mean absolute per-state differences instead of cancelling differences of means |
| ORDINARY_DENOMINATOR | `7b23b132c9771639f13b5d95ab22bab6bfcc63c2955b4860b1636f95d962bdb1` | freezes schemas, denominators, bases, and the pre-change discovery digest |
| COLLISION_DENOMINATOR | `5969d89ef62dc986263867257722df73dd48564856d782c279d8a76839105400` | freezes schemas, denominators, bases, and the pre-change discovery digest |
| ROW_OUTCOME_REJECTION | `ef1a1a687873fb94c265e31b2d9d2246dfce21b664c1a854629b4dac19a000c2` | rejects missing, replacement, blocked, schema-rejected, non-answered, error, null-score, and null-answer rows |
| BUCKET_PARTITION | `77a3b7ceccdf35bebf595c2c7ea94ed1fb7a35277cc6eb696e6bcb8e0d02aba9` | accounts for all eight false-positive buckets and proves the identities |
| PREDICTION_DEDUPLICATION | `5c239186409f85af5a3ca05e9a6826db4ada68e27686baa1078613c33aa922e7` | matches actual scorer semantics while retaining cross-class overlap and deduplicating repeats |
| LEAVE_ONE_BASE_OUT | `d21523ae9470082ae1cc03c98dcce2a60dc36718e1213a32a77623ae83ae1e3e` | emits all five leave-one-base-out rows including 5763040 |
| SCORE_HEADROOM_VERDICT | `ca0c96bedcc07ca3bdf736ae73c74ddfefcc9805883d61676e8de51e9249ce36` | returns INCONCLUSIVE_HEADROOM without relaxing score or rate thresholds |
| CONDITION_1_EXACT_THRESHOLD | `769a020889b7120289fd584d6a008f26621b4d2d50401e7e85a46ea66309f3d7` | condition 1 passes at exact T and fails one representable step below |
| CONDITION_2_FOUR_BASES | `d2f3e618181e7d65fc3c6c786224ad7dd47002dd137513409984cb908bea215c` | condition 2 passes at exactly four of five bases and fails at three of five |
| CONDITION_3_POSITIVE_LOO | `32c9fc70e0c5c116c370e672b08b6e720fc80bdeaa293e34bedeef19cec08756` | condition 3 fails when leave-one-out becomes zero only after removing 5763040 |
| CONDITION_4_STABLE_POSITIVE | `8159203c4b5898f095091fe7a46d1cf50aa377185e9f7cd5af2b559cf3ee2185` | condition 4 fails on one stable-positive loss |
| CONDITION_5_FOG_FN | `73e7ef36b872ed6ce652a17890aff76dda95f33b75a1669e38cc92f98a36f699` | condition 5 rejects fog false negatives separately at plus one |
| CONDITION_5_OBSCUREMENT_FN | `3991a3b6fa0b9b2a82d4314d056daec43dc263c5b18b8bd8a1b3830a949d1da9` | condition 5 rejects obscurement false negatives separately at plus one |
| ORDINARY_NONINCREASE | `ce0ff1c8cdf9b8cbe450842bf6f90aec7636001f47b9f2fea37f820f13d23265` | condition 6 rejects an ordinary regression |
| COLLISION_NONINCREASE | `e6acdbbb018f9ef0ff908cc6b262e13f8669b54712c7a97f66ef6d27d5fc75db` | condition 6 rejects a collision regression |
| EXACT_25_PERCENT | `6d534a8d91e54cb0c4889912754bab0a61c22ba6cc2ce5ee3c1566fc9b2ef8aa` | condition 6 fails at 24.999 percent reduction and passes at exact 25 percent |
| STRICT_SPREAD | `b066242d5f404618bdf59b82a3e537f375718a5b62bc91e7a0970c1fa89eb780` | condition 6 fails at exactly twice spread and passes at the next rational step |
| ORDINARY_ONLY_EXISTENTIAL | `b99100ab548b0a34b53ae8f0c81153be29ceb899c3a3cd1e4bd505fcf5eb5b86` | condition 6 allows collision qualification while ordinary remains equal |
| COLLISION_ONLY_EXISTENTIAL | `402b8f88b10da9e1d87e0007b4f1923c4833aae849fd6a267ef704c82b553c2e` | condition 6 allows ordinary qualification while collision remains equal |
| ZERO_REFERENCE_VACUITY | `5cd2ed70462f1ffae1ac5cc5fdc292340a090b729766fc5e133e346403ead93c` | condition 6 vacuously passes when both references and candidates are zero |
| ZERO_REFERENCE_NONINCREASE | `1f67588c5c8ea363f02cf5db702fa3bda39301cd95d92b630fa808b97417e65d` | condition 6 rejects any candidate count over a zero reference |
| ZERO_FAMILY_CREDITED | `ebb5b650b86c732fe6620e508e38b2421df851e2c6d3bd0280cb6a00dad1afc2` | condition 6 keeps one zero reference at zero and does not credit it as qualifying |
| HALF_INTEGER_AVERAGING | `992c63f9acb2821f3be407e24b7131072d2e0b69f66cbe7dff42c504bdcdb4e7` | condition 6 preserves odd and even C1 plus C2 counts as exact half-integers |
| CONDITION_7_AUTHENTICATION | `213418f4b21dc9978c292390b2327454fe7f5f31062faf5f2d096d65db9563c8` | condition 7 rejects false authentication and false eligibility independently |
| RATE_HEADROOM | `5a992c11b89ae5ad98d9dda8583c048e2496cb38e3784568ca7567cab6b3d0a5` | returns INCONCLUSIVE_HEADROOM when nonzero rate headroom cannot clear its own spread |
| ODD_REFERENCE_RATE_ROUNDED | `9b944f73ae029cc1865f8165c04d91b04ff5c3d2b9c6ec45cab9e94677ee76ff` | condition 6 preserves odd and even C1 plus C2 counts as exact half-integers |
| WEAK_24_99_PERCENT | `e6ba19712c53df729790d81c55b9d28ca106b2f45ed0cbecd8282226b9818147` | condition 6 fails at 24.999 percent reduction and passes at exact 25 percent |
| PATH_ALIAS_ACCEPTED | `29aa826783a184ea62af35e2780ed770897af90d8a9973a620ad3a2eaf2a0885` | rejects canonical aliases between C1 and C2 outputs before identity creation |
| ATTESTATION_AFTER_C1 | `7fd19912b6484ca7ca23df622915da152ef7f6aec9bd90a5a6a3e5486795c5a1` | rejects an all-lanes-paused attestation after C1 starts with a current freeze |
| EVIDENCE_MISSING_AS_FALSE | `048eeacec555fb720f184a1fac9b466e35b44febd1c3b1043602d7753cead1f8` | rejects missing or malformed eligibility evidence instead of treating it as false |
| NO_IDAT_ACCEPTED | `decc347b9f9e8cdda86499bb19fbf9cb7f3fdee1b33bfa1d8d7a13807b1d36bc` | rejects a 45-byte PNG with no IDAT chunk even when its SHA and dimensions match |
| LOO_ROWS_DROPPED | `2551bfafc43efaab75ebd5664e2747d0fb5c95ada9763b63a7ef239407e0b4a6` | renders the complete repeatability output columns and required row families |
| RATIONAL_OVERFLOW | `e754fb1398736399b045439fef65f8ae704075c004d1fea099624d9a6c2367e6` | preserves an exact repeatability fraction beyond safe integer presentation |
| NOOP_CAPTURE_ELIGIBLE | `9d9b8de7775d1b44c4257fd456aef8a6e48b1b33575731a4725063b9757c87df` | rejects a complete no-op capture before considering archived-control eligibility |
| CONTRADICTORY_REGION_ELIGIBLE | `04e6a2a7ba88ea23121be32335d0614758b27f220424a0534d26dc84f9f1b5fc` | rejects a zero changed-pixel count paired with a nonzero fraction |
| IDAT_GAP_ACCEPTED | `a0aaced84654bb7bced708323134767196a5c25bbb3ee6774017eb31d52930c9` | rejects a valid-CRC PNG whose IDAT chunks are separated by a tEXt chunk |

The three new mutants were also rerun individually after strengthening them to reach an eligibility boolean or accept the malformed PNG, rather than merely changing the validation error.

### Final green

```text
npx tsc -b --force
exit 0

sg scan
exit 0
```

```text
npx vitest run --configLoader runner --reporter=json \
  --outputFile=/tmp/qsfog-r2-focused-final.json \
  tests/unit/tools/qsfog-intervention-report.test.ts \
  tests/unit/tools/ai-dm-board-snapshot.test.ts \
  tests/unit/tools/ai-dm-screenshot-probe.test.ts \
  tests/unit/vtt/encounter-board-projection.test.ts
exit 0
```

Focused results:

```text
qsfog-intervention-report.test.ts     71 passed
ai-dm-board-snapshot.test.ts          15 passed
ai-dm-screenshot-probe.test.ts        55 passed
encounter-board-projection.test.ts    12 passed
Total                                153 passed / 4 files
Failed                                 0
```

```text
git diff --check
exit 0

npx vitest list --configLoader runner --filesOnly --json > /tmp/qsfog-a-after.json
exit 0

discovery rows=600
plan baseline=599
qsfog specs=1
/fixtures/ paths=0
```

```text
git status --short --untracked-files=all
 M tests/unit/tools/qsfog-intervention-report.test.ts
 M tools/qsfog-intervention-report.ts
```

Hashes:

```text
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
c6206939cb51bf243683c2e3401df8ca76b93ca5af447e008bfdbec126369493  .tmp-plans/2026-09-13-qsfog-svg-pilot-plan.md
4a4e76372da97d62afd2429cc5567757a07bb5ef89f1392f2607b1987538affc  tools/qsfog-intervention-report.ts
8145a40c47a8026bd8c2a284b57be2dc062de223fb8a5d2b83ccc03fac9710f5  tests/unit/tools/qsfog-intervention-report.test.ts
```

Formatting:

```text
tools/qsfog-intervention-report.ts
lines=3357 max=119 over120=0

tests/unit/tools/qsfog-intervention-report.test.ts
lines=1388 max=119 over120=0

forbidden added lines=0
```

The supervisor hand-back commands did not change, so they are not repasted.

QSFOG A FIX R2 DONE
diff --git a//tmp/qsfog-mutate.mjs b//tmp/qsfog-mutate.mjs
index 13915143fbc1f96062fd0cf19410d360edf9fae5..036ee3f1362444ef03ecdb72b4c323d0fd47827e
--- a//tmp/qsfog-mutate.mjs
+++ b//tmp/qsfog-mutate.mjs
@@ -190,6 +190,22 @@
       + '  return { numerator: String(numerator), denominator: String(denominator) };\n'
       + '}',
   ],
+  NOOP_CAPTURE_ELIGIBLE: [
+    '    validateCandidateChangedRegion(state, evidence, fogCells);',
+    '    if (evidence.changedRegion.pixels !== 0) {\n'
+      + '      validateCandidateChangedRegion(state, evidence, fogCells);\n'
+      + '    }',
+  ],
+  CONTRADICTORY_REGION_ELIGIBLE: [
+    '    validateCandidateChangedRegion(state, evidence, fogCells);',
+    '    if (evidence.changedRegion.fraction !== 1) {\n'
+      + '      validateCandidateChangedRegion(state, evidence, fogCells);\n'
+      + '    }',
+  ],
+  IDAT_GAP_ACCEPTED: [
+    'if (idatRunEnded) {',
+    'if (false && idatRunEnded) {',
+  ],
 };
 
 if (path === undefined || name === undefined || !(name in mutations)) {
diff --git a//tmp/qsfog-run-mutants.sh b//tmp/qsfog-run-mutants.sh
index fa901d3712ac34a9bf4f44e006b2f268617f8a98..e6f3513d8c66996a2c67ce9d7f61043ceececcf0
--- a//tmp/qsfog-run-mutants.sh
+++ b//tmp/qsfog-run-mutants.sh
@@ -2,8 +2,8 @@
 set -u
 
 production=tools/qsfog-intervention-report.ts
-pristine=/tmp/qsfog-a-r1-pristine.ts
-results=/tmp/qsfog-a-r1-mutants.tsv
+pristine=/tmp/qsfog-a-r2-pristine.ts
+results=/tmp/qsfog-a-r2-mutants.tsv
 cp "$production" "$pristine"
 pristine_sha=$(sha256sum "$pristine" | cut -d' ' -f1)
 printf 'mutant\tapplied_sha256\texit\tkilling_test\trestored_sha256\n' > "$results"
@@ -51,6 +51,9 @@
   'NO_IDAT_ACCEPTED|rejects a 45-byte PNG with no IDAT chunk even when its SHA and dimensions match'
   'LOO_ROWS_DROPPED|renders the complete repeatability output columns and required row families'
   'RATIONAL_OVERFLOW|preserves an exact repeatability fraction beyond safe integer presentation'
+  'NOOP_CAPTURE_ELIGIBLE|rejects a complete no-op capture before considering archived-control eligibility'
+  'CONTRADICTORY_REGION_ELIGIBLE|rejects a zero changed-pixel count paired with a nonzero fraction'
+  'IDAT_GAP_ACCEPTED|rejects a valid-CRC PNG whose IDAT chunks are separated by a tEXt chunk'
 )
 
 for entry in "${cases[@]}"; do
diff --git a/tests/unit/tools/qsfog-intervention-report.test.ts b/tests/unit/tools/qsfog-intervention-report.test.ts
index 7188a26a5971a81b70ac14d9873973ee4c7adc50..5c6594ef507f43681c366bf3deffec1e6d6253e0
--- a/tests/unit/tools/qsfog-intervention-report.test.ts
+++ b/tests/unit/tools/qsfog-intervention-report.test.ts
@@ -50,7 +50,32 @@
 const SHA_B = 'b'.repeat(64);
 const REVISION = '1'.repeat(40);
 const SOURCE_REVISION = '2'.repeat(40);
+const CAPTURE_GRID_ORIGIN = 52;
+const ELIGIBILITY_FOG_CELLS = {
+  s: [{ column: 0, row: 0 }],
+} as const;
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
 
+function pngChunk(type: string, data: Buffer): Buffer {
+  const typeBytes = Buffer.from(type, 'ascii');
+  const chunk = Buffer.alloc(12 + data.length);
+  chunk.writeUInt32BE(data.length, 0);
+  typeBytes.copy(chunk, 4);
+  data.copy(chunk, 8);
+  chunk.writeUInt32BE(pngCrc32(Buffer.concat([typeBytes, data])), 8 + data.length);
+  return chunk;
+}
+
 function candidateManifest(eligible: boolean): unknown {
   const a1Sha256 = eligible ? SHA_A : 'c'.repeat(64);
   return {
@@ -122,7 +147,7 @@
             pixels: 1,
             outsidePixels: 0,
             fraction: 1 / 16_384,
-            bounds: { x: 0, y: 0, width: 1, height: 1 },
+            bounds: { x: CAPTURE_GRID_ORIGIN, y: CAPTURE_GRID_ORIGIN, width: 1, height: 1 },
             perFogCell: [{ column: 0, row: 0, pixels: 1 }],
           },
           restoreExact: true,
@@ -152,6 +177,30 @@
   });
 }
 
+function withCandidateEvidence(
+  evidencePatch: Readonly<Record<string, unknown>>,
+  resultPngSha256 = SHA_B,
+): unknown {
+  const manifest = candidateManifest(true) as Record<string, unknown>;
+  const manifestStates = manifest['states'] as Record<string, unknown>;
+  const manifestState = manifestStates['s'] as Record<string, unknown>;
+  const manipulation = manifest['manipulationValidation'] as Record<string, unknown>;
+  const evidenceStates = manipulation['states'] as Record<string, unknown>;
+  const evidenceState = evidenceStates['s'] as Record<string, unknown>;
+  return {
+    ...manifest,
+    states: {
+      s: { ...manifestState, sha256: resultPngSha256 },
+    },
+    manipulationValidation: {
+      ...manipulation,
+      states: {
+        s: { ...evidenceState, ...evidencePatch, resultPngSha256 },
+      },
+    },
+  };
+}
+
 function fraction(numerator: number | string, denominator: number | string = 1): {
   readonly numerator: string;
   readonly denominator: string;
@@ -409,6 +458,28 @@
     expect(() => validateIdentityPng(corrupt, expected)).toThrow('CRC');
   });
 
+  it('rejects a valid-CRC PNG whose IDAT chunks are separated by a tEXt chunk', () => {
+    const png = Buffer.from(encodePng(2, 1, new Uint8Array(8)));
+    const idatTypeOffset = png.indexOf(Buffer.from('IDAT'));
+    const idatOffset = idatTypeOffset - 4;
+    const idatLength = png.readUInt32BE(idatOffset);
+    const idatData = png.subarray(idatOffset + 8, idatOffset + 8 + idatLength);
+    const split = Math.max(1, Math.floor(idatData.length / 2));
+    const separated = Buffer.concat([
+      png.subarray(0, 33),
+      pngChunk('IDAT', idatData.subarray(0, split)),
+      pngChunk('tEXt', Buffer.from('note\0gap')),
+      pngChunk('IDAT', idatData.subarray(split)),
+      png.subarray(png.length - 12),
+    ]);
+    const expected = {
+      sha256: createHash('sha256').update(separated).digest('hex'),
+      width: 2,
+      height: 1,
+    };
+    expect(() => validateIdentityPng(separated, expected)).toThrow('consecutive');
+  });
+
   it('derives the probe summary overwrite path exactly', () => {
     expect(deriveProbeSummaryPath('.tmp/run/c1.jsonl')).toBe('.tmp/run/c1-summary.md');
     expect(() => deriveProbeSummaryPath('.tmp/run/c1.txt')).toThrow();
@@ -436,20 +507,105 @@
   });
 
   it('rejects missing or malformed eligibility evidence instead of treating it as false', () => {
-    expect(() => validateCandidateEligibility(withCandidateStates({}), ['s'])).toThrow();
-    expect(() => validateCandidateEligibility(withCandidateStates({ s: {} }), ['s'])).toThrow();
+    expect(() => validateCandidateEligibility(withCandidateStates({}), ['s'], ELIGIBILITY_FOG_CELLS)).toThrow();
+    expect(() => validateCandidateEligibility(
+      withCandidateStates({ s: {} }),
+      ['s'],
+      ELIGIBILITY_FOG_CELLS,
+    )).toThrow();
     expect(() => validateCandidateEligibility(withCandidateStates({
       s: { archivedControlEligible: 'true' },
-    }), ['s'])).toThrow();
-    expect(() => validateCandidateEligibility(withCandidateEligibility('true'), ['s'])).toThrow();
+    }), ['s'], ELIGIBILITY_FOG_CELLS)).toThrow();
+    expect(() => validateCandidateEligibility(
+      withCandidateEligibility('true'),
+      ['s'],
+      ELIGIBILITY_FOG_CELLS,
+    )).toThrow();
   });
 
   it('requires complete capture provenance and reserves false for an authenticated mismatch', () => {
     expect(() => validateCandidateEligibility(withCandidateStates({
       s: { archivedControlEligible: true },
-    }), ['s'])).toThrow();
-    expect(validateCandidateEligibility(candidateManifest(true), ['s'])).toBe(true);
-    expect(validateCandidateEligibility(candidateManifest(false), ['s'])).toBe(false);
+    }), ['s'], ELIGIBILITY_FOG_CELLS)).toThrow();
+    expect(validateCandidateEligibility(candidateManifest(true), ['s'], ELIGIBILITY_FOG_CELLS)).toBe(true);
+    expect(validateCandidateEligibility(candidateManifest(false), ['s'], ELIGIBILITY_FOG_CELLS)).toBe(false);
+  });
+
+  it('rejects a complete no-op capture before considering archived-control eligibility', () => {
+    const noOp = withCandidateEvidence({
+      bRgbaSha256: SHA_A,
+      visualDomAfterSha256: SHA_A,
+      changedRegion: {
+        pixels: 0,
+        outsidePixels: 0,
+        fraction: 0,
+        bounds: null,
+        perFogCell: [],
+      },
+    }, SHA_A);
+    expect(() => validateCandidateEligibility(noOp, ['s'], ELIGIBILITY_FOG_CELLS)).toThrow('nonzero');
+    const falseManifest = candidateManifest(false) as Record<string, unknown>;
+    const manipulation = falseManifest['manipulationValidation'] as Record<string, unknown>;
+    const states = manipulation['states'] as Record<string, unknown>;
+    const state = states['s'] as Record<string, unknown>;
+    const falseNoOp = withCandidateEvidence({
+      ...state,
+      bRgbaSha256: 'c'.repeat(64),
+      visualDomAfterSha256: SHA_A,
+      changedRegion: {
+        pixels: 0,
+        outsidePixels: 0,
+        fraction: 0,
+        bounds: null,
+        perFogCell: [],
+      },
+      archivedControlEligible: false,
+    }, 'c'.repeat(64));
+    expect(() => validateCandidateEligibility(falseNoOp, ['s'], ELIGIBILITY_FOG_CELLS)).toThrow('nonzero');
+  });
+
+  it('rejects complete evidence whose post-intervention visual DOM is unchanged', () => {
+    const manifest = withCandidateEvidence({ visualDomAfterSha256: SHA_A });
+    expect(() => validateCandidateEligibility(manifest, ['s'], ELIGIBILITY_FOG_CELLS)).toThrow('A1/B');
+  });
+
+  it('rejects a zero changed-pixel count paired with a nonzero fraction', () => {
+    const manifest = withCandidateEvidence({
+      changedRegion: {
+        pixels: 0,
+        outsidePixels: 0,
+        fraction: 1,
+        bounds: { x: CAPTURE_GRID_ORIGIN, y: CAPTURE_GRID_ORIGIN, width: 1, height: 1 },
+        perFogCell: [{ column: 0, row: 0, pixels: 0 }],
+      },
+    });
+    expect(() => validateCandidateEligibility(manifest, ['s'], ELIGIBILITY_FOG_CELLS)).toThrow('fraction');
+  });
+
+  it('rejects changed-region bounds outside the authenticated fog-cell extent', () => {
+    const manifest = withCandidateEvidence({
+      changedRegion: {
+        pixels: 1,
+        outsidePixels: 0,
+        fraction: 1 / 16_384,
+        bounds: { x: 0, y: 0, width: 1, height: 1 },
+        perFogCell: [{ column: 0, row: 0, pixels: 1 }],
+      },
+    });
+    expect(() => validateCandidateEligibility(manifest, ['s'], ELIGIBILITY_FOG_CELLS)).toThrow('bounds');
+  });
+
+  it('rejects per-fog-cell evidence that disagrees with the authenticated state', () => {
+    const manifest = withCandidateEvidence({
+      changedRegion: {
+        pixels: 1,
+        outsidePixels: 0,
+        fraction: 1 / 16_384,
+        bounds: { x: CAPTURE_GRID_ORIGIN, y: CAPTURE_GRID_ORIGIN, width: 1, height: 1 },
+        perFogCell: [{ column: 1, row: 0, pixels: 1 }],
+      },
+    });
+    expect(() => validateCandidateEligibility(manifest, ['s'], ELIGIBILITY_FOG_CELLS)).toThrow('per-fog-cell');
   });
 });
 
diff --git a/tools/qsfog-intervention-report.ts b/tools/qsfog-intervention-report.ts
index d05d0dcb7f3f4eee679668add5fdd0cef90b63ef..68bb41d325a0419711f959add4aa4ced575aeb05
--- a/tools/qsfog-intervention-report.ts
+++ b/tools/qsfog-intervention-report.ts
@@ -19,6 +19,7 @@
 import { pathToFileURL } from 'node:url';
 import { z } from 'zod';
 import { canonicalJson } from '../src/commands/canonical-json';
+import { boardChromeMetrics } from '../src/vtt/board-chrome-layout';
 import {
   NORMALISER_VERSION,
   PRIMER_VERSION,
@@ -344,16 +345,21 @@
   states: z.record(z.string().min(1), imageManifestEntrySchema),
   manipulationValidation: z.unknown(),
 }).strict();
-const finiteNumberRecordSchema = z.record(z.string().min(1), z.number().finite());
+const changedRegionBoundsSchema = z.object({
+  x: z.number().int().nonnegative(),
+  y: z.number().int().nonnegative(),
+  width: z.number().int().positive(),
+  height: z.number().int().positive(),
+}).strict();
+const changedFogCellSchema = q9CellSchema.extend({
+  pixels: z.number().int().nonnegative(),
+}).strict();
 const changedRegionSchema = z.object({
   pixels: z.number().int().nonnegative(),
   outsidePixels: z.literal(0),
   fraction: z.number().finite().min(0).max(1),
-  bounds: finiteNumberRecordSchema.nullable(),
-  perFogCell: z.union([
-    z.array(finiteNumberRecordSchema),
-    finiteNumberRecordSchema,
-  ]),
+  bounds: changedRegionBoundsSchema.nullable(),
+  perFogCell: z.array(changedFogCellSchema),
 }).strict();
 const candidateStateEvidenceSchema = z.object({
   stateDigest: sha256Schema,
@@ -1502,6 +1508,7 @@
   let offset = 8;
   let chunkIndex = 0;
   let foundIdat = false;
+  let idatRunEnded = false;
   let foundIend = false;
   while (offset + 12 <= bytes.length) {
     const length = bytes.readUInt32BE(offset);
@@ -1521,7 +1528,12 @@
       throw new TypeError('PNG IHDR must be the first and only IHDR chunk.');
     }
     if (type === 'IDAT') {
+      if (idatRunEnded) {
+        throw new TypeError('PNG IDAT chunks must be consecutive.');
+      }
       foundIdat = true;
+    } else if (foundIdat && type !== 'IEND') {
+      idatRunEnded = true;
     }
     if (type === 'IEND') {
       foundIend = length === 0 && end === bytes.length;
@@ -2052,20 +2064,115 @@
   }
 }
 
+const CAPTURE_TILE_SIZE = 128;
+const CAPTURE_TILE_AREA = CAPTURE_TILE_SIZE * CAPTURE_TILE_SIZE;
+const CAPTURE_CHROME = boardChromeMetrics(CAPTURE_TILE_SIZE);
+const CAPTURE_GRID_ORIGIN = CAPTURE_CHROME.boardBorder + CAPTURE_CHROME.coordinateGutter;
+
+function q9CellKey(cell: Q9Cell): string {
+  return `${String(cell.column)},${String(cell.row)}`;
+}
+
+function validateCandidateChangedRegion(
+  state: string,
+  evidence: z.infer<typeof candidateStateEvidenceSchema>,
+  fogCells: readonly Q9Cell[],
+): void {
+  const region = evidence.changedRegion;
+  const fogKeys = fogCells.map(q9CellKey).sort();
+  const reportedKeys = region.perFogCell.map(q9CellKey).sort();
+  const allowedPixels = fogCells.length * CAPTURE_TILE_AREA;
+  const expectedFraction = allowedPixels === 0 ? 0 : region.pixels / allowedPixels;
+  if (region.fraction !== expectedFraction) {
+    throw new Error(`Candidate changed-region fraction is inconsistent for ${state}.`);
+  }
+  if (fogCells.length > 0 && region.pixels === 0) {
+    throw new Error(`Candidate intervention must make a nonzero change for ${state}.`);
+  }
+  if (new Set(fogKeys).size !== fogKeys.length
+    || new Set(reportedKeys).size !== reportedKeys.length
+    || canonicalJson(reportedKeys) !== canonicalJson(fogKeys)) {
+    throw new Error(`Candidate per-fog-cell evidence differs from state ${state}.`);
+  }
+  const reportedPixels = region.perFogCell.reduce((sum, cell) => sum + cell.pixels, 0);
+  if (reportedPixels !== region.pixels
+    || region.pixels > allowedPixels
+    || region.perFogCell.some((cell) => cell.pixels > CAPTURE_TILE_AREA)) {
+    throw new Error(`Candidate per-fog-cell pixel accounting is inconsistent for ${state}.`);
+  }
+
+  // The plan's Increment A paired-report evidence contract admits condition 7 only after validating
+  // the frozen 128 px fog-cell set and the capture record's A1/B delta. The bounds are board-bitmap
+  // coordinates: they must cover every changed fog tile without leaving the aggregate fog-cell extent.
+  if (fogCells.length === 0) {
+    if (region.bounds !== null
+      || evidence.resultPngSha256 !== evidence.a1PngSha256
+      || evidence.bRgbaSha256 !== evidence.a1RgbaSha256
+      || evidence.visualDomAfterSha256 !== evidence.visualDomBeforeSha256) {
+      throw new Error(`Candidate zero-fog A1/B evidence is inconsistent for ${state}.`);
+    }
+    return;
+  }
+  if (region.perFogCell.some((cell) => cell.pixels === 0)) {
+    throw new Error(`Candidate per-fog-cell evidence must record a change for ${state}.`);
+  }
+  const bounds = region.bounds;
+  if (bounds === null) {
+    throw new Error(`Candidate changed-region bounds are absent for ${state}.`);
+  }
+  const right = bounds.x + bounds.width;
+  const bottom = bounds.y + bounds.height;
+  const minimumX = Math.min(...fogCells.map((cell) =>
+    CAPTURE_GRID_ORIGIN + cell.column * CAPTURE_TILE_SIZE));
+  const minimumY = Math.min(...fogCells.map((cell) =>
+    CAPTURE_GRID_ORIGIN + cell.row * CAPTURE_TILE_SIZE));
+  const maximumX = Math.max(...fogCells.map((cell) =>
+    CAPTURE_GRID_ORIGIN + (cell.column + 1) * CAPTURE_TILE_SIZE));
+  const maximumY = Math.max(...fogCells.map((cell) =>
+    CAPTURE_GRID_ORIGIN + (cell.row + 1) * CAPTURE_TILE_SIZE));
+  const missesChangedCell = region.perFogCell.some((cell) => {
+    const cellX = CAPTURE_GRID_ORIGIN + cell.column * CAPTURE_TILE_SIZE;
+    const cellY = CAPTURE_GRID_ORIGIN + cell.row * CAPTURE_TILE_SIZE;
+    return bounds.x >= cellX + CAPTURE_TILE_SIZE
+      || right <= cellX
+      || bounds.y >= cellY + CAPTURE_TILE_SIZE
+      || bottom <= cellY;
+  });
+  if (!Number.isSafeInteger(right)
+    || !Number.isSafeInteger(bottom)
+    || bounds.width * bounds.height < region.pixels
+    || bounds.x < minimumX
+    || bounds.y < minimumY
+    || right > maximumX
+    || bottom > maximumY
+    || missesChangedCell) {
+    throw new Error(`Candidate changed-region bounds are inconsistent for ${state}.`);
+  }
+  if (evidence.resultPngSha256 === evidence.a1PngSha256
+    || evidence.bRgbaSha256 === evidence.a1RgbaSha256
+    || evidence.visualDomAfterSha256 === evidence.visualDomBeforeSha256) {
+    throw new Error(`Candidate A1/B intervention evidence is unchanged for ${state}.`);
+  }
+}
+
 export function validateCandidateEligibility(
   manifestInput: unknown,
   states: readonly string[],
+  fogCellsByState: Readonly<Record<string, readonly Q9Cell[]>>,
 ): boolean {
   const manifest = imageOverrideManifestSchema.parse(manifestInput);
   const manipulation = candidateManipulationValidationSchema.parse(manifest.manipulationValidation);
   const evidenceKeys = Object.keys(manipulation.states).sort();
-  if (canonicalJson(evidenceKeys) !== canonicalJson([...states].sort())) {
+  const expectedKeys = [...states].sort();
+  if (canonicalJson(evidenceKeys) !== canonicalJson(expectedKeys)
+    || canonicalJson(Object.keys(fogCellsByState).sort()) !== canonicalJson(expectedKeys)) {
     throw new Error('Candidate eligibility evidence differs from the exact frozen state set.');
   }
   for (const state of states) {
     const entry = manifest.states[state];
     const evidence = manipulation.states[state];
-    if (entry === undefined || evidence === undefined) {
+    const fogCells = fogCellsByState[state];
+    if (entry === undefined || evidence === undefined || fogCells === undefined) {
       throw new Error(`Candidate eligibility evidence is absent for ${state}.`);
     }
     if (evidence.sourcePngSha256 !== entry.sourcePng.sha256
@@ -2075,6 +2182,7 @@
       || evidence.visualDomBeforeSha256 !== evidence.visualDomRestoredSha256) {
       throw new Error(`Candidate capture provenance is inconsistent for ${state}.`);
     }
+    validateCandidateChangedRegion(state, evidence, fogCells);
     const unchangedArchivedPng = evidence.a1PngSha256 === evidence.sourcePngSha256;
     if (evidence.archivedControlEligible !== unchangedArchivedPng) {
       throw new Error(`Candidate archived-control eligibility is inconsistent for ${state}.`);
@@ -2909,7 +3017,11 @@
         throw new Error(`Candidate state authentication differs for ${source.stateId}.`);
       }
     }
-    eligible = validateCandidateEligibility(candidateManifest, expectedStates);
+    const fogCellsByState = Object.fromEntries(sourceRows.map((source) => [
+      source.stateId,
+      source.truth.foggedCells,
+    ]));
+    eligible = validateCandidateEligibility(candidateManifest, expectedStates, fogCellsByState);
   }
   const armDefinitions = [
     { name: 'C1', path: c1Path, manifest: identity, blockArm: block.arms.C1 },
