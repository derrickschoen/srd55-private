# QSFOG-SVG-01 Increment A fix round 1 — gpt-5.6-sol report

Session 01a0a1f6-faca-7f73-a2a2-59cc14c597f8; log .tmp/runs/fanout/impl-qsfog-a-fix-r1.log.

Implemented all eight accepted Astra findings within the two authorized files only.

### RED

Initial regression run:

```text
npx vitest run --configLoader runner tests/unit/tools/qsfog-intervention-report.test.ts
exit 1

Test Files  1 failed (1)
Tests       28 failed | 34 passed (62)
```

Failures included no-IDAT acceptance, mutable freeze hash drift, manifest-path incompatibility, canonical output aliases, path ancestry, late attestations, rational overflow, incomplete repeat reporting, and the corrected condition boundaries.

### Changes

- [qsfog-intervention-report.ts](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/qsfog-intervention-report.ts:550)
  - Canonical resolved-path uniqueness and ancestry rejection.
  - `identityManifest` now denotes the final `manifest.json`; preflight checks its parent directory.
  - Both mutable manifest hashes are excluded from the freeze.
  - Pause and preflight attestations must precede C1.
  - Arbitrary-precision rational output uses integer strings.
  - Shared C1/C2 baseline includes score means, headroom, fixed-denominator rates, pooled differences, stable/disputed positives, and five LOO rows.
  - Repeat and candidate CSV/Markdown reports include the complete baseline evidence.
  - Candidate eligibility requires complete typed capture/provenance evidence; authenticated mismatches alone return false.
  - PNG validation requires IHDR first, at least one IDAT, IEND last, and valid CRCs for every chunk.

- [qsfog-intervention-report.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/unit/tools/qsfog-intervention-report.test.ts:387)
  - Added alias/ancestry, timestamp, eligibility, PNG IDAT/CRC, rational-overflow, and full report-contract regressions.
  - Condition 3 now fails alone: `[true,true,false,true,true,true,true]`.
  - The percentage boundary is exactly `24.999% = 24999/100000`.
  - Odd/even averaging asserts `79/10662` versus `40/5331` and the associated promotion boundary.
  - Test count increased from 54 to 65.

### Mutants

Pristine production SHA before every mutation and after every `cp` restoration:

```text
cd7b92c0ce064355f39ce0b58d67f01430686db7b238829a1f12fd94ad588f47
```

All 42 mutations exited 1; no survivors.

| Mutant | Applied SHA-256 | Killing test |
|---|---|---|
| STATE_COMPLETENESS | `268bbaa1123d2be10f340a018d9e65ad726346203d4f503ae90a696e9ab3139d` | authenticates truth and PNGs, copies exact bytes, and bypasses snapshot capture and close |
| PNG_AUTHENTICATION | `6115308e649bfb40479a19fe7fae06808082c299f87d34c60e73dace4ab23f9e` | rejects canonical truth changes and PNG byte or IHDR changes |
| CANONICAL_TRUTH | `eb73f2f0af34b703b6b340093a7ddac3b0691a9a6ebcc78a0c0444ba6e324232` | rejects canonical truth changes and PNG byte or IHDR changes |
| STALE_FREEZE | `ebb93b2e0ab3eaa7a9c4890ea3bd2a8fab08bfaa33cc834ef4e540357e01b233` | rejects stale block harness, HEAD, status, and pause authentication |
| STALE_HEAD | `693ff47af9bfd6a47ee43eebdc5e8467d51e135d1dbf13ae893a8904a5c17af4` | authenticates truth and PNGs, copies exact bytes, and bypasses snapshot capture and close |
| PLANNED_PATH_PREFLIGHT | `81a027e39d16997eadefbedec443d76ed2a4f7c034899972d9c85ab0e78d4cc2` | rejects pre-existing final-block output identityManifest |
| DERIVED_SUMMARY | `7f8754ce7968191f2c692602f3cd965b766f6be8c0f6f22c48ead2519285f868` | derives the probe summary overwrite path exactly |
| GAP_INTERRUPTION | `7af2d5b23c462ee777482547514a28c24146545c3bb0f46ea8772986aafc4ddd` | rejects an outage only in the inter-arm gap |
| NON_CANCELLING_SPREAD | `9c4fddcd342353f3a3ef37cfd44d5471dcb74e28c01f3d1f1c4b068dabf6fe88` | uses mean absolute per-state differences instead of cancelling differences of means |
| ORDINARY_DENOMINATOR | `88a6f061fd64e51055c227350fee397bea9efc31a2787ddc27ca97455fb9b24c` | freezes schemas, denominators, bases, and the pre-change discovery digest |
| COLLISION_DENOMINATOR | `13546f81300fa5ae662e87dc1cd009fe9448a5e1afe5fa6e9466cc72c1f55864` | freezes schemas, denominators, bases, and the pre-change discovery digest |
| ROW_OUTCOME_REJECTION | `c66d5b18d88a346f9d78a670c004532d8e8a63744ea7a1d1f3320edde91984d7` | rejects missing, replacement, blocked, schema-rejected, non-answered, error, null-score, and null-answer rows |
| BUCKET_PARTITION | `f0aedc24141b76609b59ee7e116399d72ecb5499663e3a8c22ac669aaacace2c` | accounts for all eight false-positive buckets and proves the identities |
| PREDICTION_DEDUPLICATION | `7ebc7416a1eb52d8816b007e0df7379d2ac60e54987b2bbf0464d45878eb28cb` | matches actual scorer semantics while retaining cross-class overlap and deduplicating repeats |
| LEAVE_ONE_BASE_OUT | `81450a68f1890ac50f167c47eff12dfd07287e97e1bbdf53e396ca43ab99ad05` | emits all five leave-one-base-out rows including 5763040 |
| SCORE_HEADROOM_VERDICT | `5ff2246a360994514d76c80455880896213a9b15c18aa861a5222a867c50e71d` | returns INCONCLUSIVE_HEADROOM without relaxing score or rate thresholds |
| CONDITION_1_EXACT_THRESHOLD | `4491763d506ae8750b01c146ca7571a2b1d227aaf8cf724d4718a65c94a76399` | condition 1 passes at exact T and fails one representable step below |
| CONDITION_2_FOUR_BASES | `25d3b745d65e65b93cc45854ec732f1d21ebe9a762e1b8920861e88bfb49f39f` | condition 2 passes at exactly four of five bases and fails at three of five |
| CONDITION_3_POSITIVE_LOO | `4d1773b0a3b3874f45f5d114df48515dfebc8ff618fea1226f5e7d98628f1136` | condition 3 fails when leave-one-out becomes zero only after removing 5763040 |
| CONDITION_4_STABLE_POSITIVE | `43016b506c9cc79b21579872978e91295e9224a913772b5aedc93d846f353a59` | condition 4 fails on one stable-positive loss |
| CONDITION_5_FOG_FN | `4cb779cfa45318e21ef4cd15c3edd64ea9c452ffc6e3b42e96934ec4f5e534cf` | condition 5 rejects fog false negatives separately at plus one |
| CONDITION_5_OBSCUREMENT_FN | `5cd7c313107e642fe82545ce9880958b622aeccada6836fb98b2c75df8fcaeb4` | condition 5 rejects obscurement false negatives separately at plus one |
| ORDINARY_NONINCREASE | `eb53a9a5e8db2f588f9cb7e2501a8d9256b2bf0739c66d70592f139e865d9ee6` | condition 6 rejects an ordinary regression |
| COLLISION_NONINCREASE | `726305d80597f29bc6a03b50b37fc2963cc52bafd54edcb3bd219e3c31486b63` | condition 6 rejects a collision regression |
| EXACT_25_PERCENT | `e22fc2d234e7ffd2d5cade3863c4830c2e1ad71dc82ede5cec278f9d505f16b2` | condition 6 fails at 24.999 percent reduction and passes at exact 25 percent |
| STRICT_SPREAD | `049e91995a11e7e1bd0f3003c592ab4fc2e186bd93b1262434598f7c273bcca5` | condition 6 fails at exactly twice spread and passes at the next rational step |
| ORDINARY_ONLY_EXISTENTIAL | `a4e2bcb1054f33149c6be955713bba1072f91338c4822eb63ecfce19f3a44c1c` | condition 6 allows collision qualification while ordinary remains equal |
| COLLISION_ONLY_EXISTENTIAL | `3448bc55069fd79073f24bbaed4a013c05d022fe06061b00f29b73d7f751097a` | condition 6 allows ordinary qualification while collision remains equal |
| ZERO_REFERENCE_VACUITY | `a7bf9e87940eec72850a7d0ed1155a5d73a6aad95a7e695038449175f0bb192b` | condition 6 vacuously passes when both references and candidates are zero |
| ZERO_REFERENCE_NONINCREASE | `5acaa5d7cd7746c9b9a56e2101867b1935d4abe43e8d3b918b8b8f73f077e5dd` | condition 6 rejects any candidate count over a zero reference |
| ZERO_FAMILY_CREDITED | `0e097d2892cccfe2f6434152f156a083ba8084594b3ccd50f59c4d839c27f803` | condition 6 keeps one zero reference at zero and does not credit it as qualifying |
| HALF_INTEGER_AVERAGING | `87d1ab85e857d4901ae196066821c1f000f677414106732a93fd307a9a5a60c6` | condition 6 preserves odd and even C1 plus C2 counts as exact half-integers |
| CONDITION_7_AUTHENTICATION | `f698a3907869ea1302f9b735406bc4c23eb951d4b1dbc4e9d5837aaff62e2392` | condition 7 rejects false authentication and false eligibility independently |
| RATE_HEADROOM | `d43682325a4c627c920e84d794fdb05acbc4e4f12676d42382c6028c078b353f` | returns INCONCLUSIVE_HEADROOM when nonzero rate headroom cannot clear its own spread |
| ODD_REFERENCE_RATE_ROUNDED | `59bddfd1de3e785a834d52b24fbdb55e34a8d88f9fa8f1157b87e97ce7884d41` | condition 6 preserves odd and even C1 plus C2 counts as exact half-integers |
| WEAK_24_99_PERCENT | `b603e820df0ff22020bce4461a3a002e7bd577cf8f191448204b8868f3646d31` | condition 6 fails at 24.999 percent reduction and passes at exact 25 percent |
| PATH_ALIAS_ACCEPTED | `84abe37057995b0ef3882111f480858fadd1deaee11354e2f65fea8bb9f9c41d` | rejects canonical aliases between C1 and C2 outputs before identity creation |
| ATTESTATION_AFTER_C1 | `f976b5f7dac3549b735c4308e589006f9063ea8598e71c6be4f1dd265c3ace1e` | rejects an all-lanes-paused attestation after C1 starts with a current freeze |
| EVIDENCE_MISSING_AS_FALSE | `9649bce4906f24056b2c71f854cb22a64fa196c1574ecd6954b883b823fb6f51` | rejects missing or malformed eligibility evidence instead of treating it as false |
| NO_IDAT_ACCEPTED | `b335314f2b483a4a54e4bdfc8914343a22cad5f682387294d6165299e26a5fb1` | rejects a 45-byte PNG with no IDAT chunk even when its SHA and dimensions match |
| LOO_ROWS_DROPPED | `a203ec8b29cca230994c27db5e41436f136cabe281c8bc60e5322965e01f0975` | renders the complete repeatability output columns and required row families |
| RATIONAL_OVERFLOW | `c29163ff422cd64c3404dbc06eb92c3284a4a8254e8a60bc3330aa59cf05ce10` | preserves an exact repeatability fraction beyond safe integer presentation |

### Final green

```text
npx tsc -b --force
exit 0

sg scan
exit 0

npx vitest run --configLoader runner --reporter=json \
  --outputFile=/tmp/qsfog-focused-final.json \
  tests/unit/tools/qsfog-intervention-report.test.ts \
  tests/unit/tools/ai-dm-board-snapshot.test.ts \
  tests/unit/tools/ai-dm-screenshot-probe.test.ts \
  tests/unit/vtt/encounter-board-projection.test.ts
exit 0
```

Focused results:

```text
qsfog-intervention-report.test.ts     65 passed
ai-dm-board-snapshot.test.ts          15 passed
ai-dm-screenshot-probe.test.ts        55 passed
encounter-board-projection.test.ts    12 passed
Total                                 147 passed / 4 files
```

```text
git diff --check
exit 0

npx vitest list --configLoader runner --filesOnly --json > /tmp/qsfog-a-after.json
exit 0
rows=600
baseline=599
new qsfog spec=1
fixture paths=0

git status --short --untracked-files=all
 M tests/unit/tools/qsfog-intervention-report.test.ts
 M tools/qsfog-intervention-report.ts
```

Hashes:

```text
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
c6206939cb51bf243683c2e3401df8ca76b93ca5af447e008bfdbec126369493  .tmp-plans/2026-09-13-qsfog-svg-pilot-plan.md
cd7b92c0ce064355f39ce0b58d67f01430686db7b238829a1f12fd94ad588f47  tools/qsfog-intervention-report.ts
30cf6bb910ecae52936b27b42bf7a22284c968de77905291f29de485d5e9db7d  tests/unit/tools/qsfog-intervention-report.test.ts
```

Formatting:

```text
tools/qsfog-intervention-report.ts                3245 lines, max=119, over120=0
tests/unit/tools/qsfog-intervention-report.test.ts 1232 lines, max=119, over120=0
```

No Increment B files, assets, capture seam, pins, frozen contract, or port 4173 were touched.

### Supervisor hand-back

Concrete Increment-A block ID:

```bash
export QSF_BLOCK_ID=20260914-qsfog-a-fix-r1-01
export QSF_BLOCK=.tmp/runs/quietstone/svg-fog/blocks/$QSF_BLOCK_ID.json
export QSF_ROOT=.tmp/runs/quietstone/svg-fog/$QSF_BLOCK_ID
export QSF_SUPERVISOR=supervisor
export QSF_PAUSED_AT="$(TZ=America/New_York date '+%Y-%m-%dT%H:%M:%S%:z')"
```

After manually pausing all lanes, create the block record. This computes all repository-dependent hashes, the source-image-set digest, the seven-path preflight, and the documented immutable freeze:

```bash
node <<'NODE'
const cp = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const required = name => {
  const value = process.env[name];
  if (!value) throw new Error(`missing ${name}`);
  return value;
};
const hashBytes = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hashFile = file => hashBytes(fs.readFileSync(file));
const canonicalize = value => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  }
  return value;
};
const canonical = value => JSON.stringify(canonicalize(value));
const zonedNow = () => cp.execFileSync(
  'date',
  ['+%Y-%m-%dT%H:%M:%S%:z'],
  { encoding: 'utf8', env: { ...process.env, TZ: 'America/New_York' } },
).trim();

const blockId = required('QSF_BLOCK_ID');
const blockPath = required('QSF_BLOCK');
const runRoot = required('QSF_ROOT');
const sourceRowsPath = '.tmp/runs/quietstone/probe-candidate.jsonl';
const diagnosisPath = '.tmp/runs/quietstone/qsfog-diagnosis.json';
const sourceImagesRoot = 'dnd-slim-runs/quietstone-probe-candidate-images';
const sourceRowsBytes = fs.readFileSync(sourceRowsPath);
const sourceRows = sourceRowsBytes.toString('utf8').trimEnd().split('\n').map(JSON.parse).filter(
  row => row.model === 'gpt-5.6-sol' && row.effort === 'high' && row.question === 'Q9',
);
if (sourceRows.length !== 24) throw new Error(`expected 24 source rows, received ${sourceRows.length}`);

const manifestsRoot = path.join(sourceImagesRoot, 'manifests');
const terminals = fs.readdirSync(manifestsRoot).map(name => {
  const file = path.join(manifestsRoot, name);
  return { file, value: JSON.parse(fs.readFileSync(file, 'utf8')) };
}).filter(entry => Array.isArray(entry.value.artifacts) && entry.value.artifacts.length === 24);
if (terminals.length !== 1) throw new Error(`expected one terminal manifest, received ${terminals.length}`);

const sourceFiles = [...new Set([
  ...sourceRows.map(row => path.join(sourceImagesRoot, row.png.relativePath)),
  terminals[0].file,
])];
const sourceImageSet = sourceFiles.map(file =>
  `${path.relative(process.cwd(), file)}\t${hashFile(file)}\n`,
).sort().join('');

const identityManifest = `${runRoot}/unchanged128/manifest.json`;
const paths = {
  identityManifest,
  candidateManifest: null,
  c1Jsonl: `${runRoot}/answers/c1.jsonl`,
  c1ImagesRoot: `${runRoot}/answers/c1-images`,
  c1Summary: `${runRoot}/answers/c1-summary.md`,
  c2Jsonl: `${runRoot}/answers/c2.jsonl`,
  c2ImagesRoot: `${runRoot}/answers/c2-images`,
  c2Summary: `${runRoot}/answers/c2-summary.md`,
  frameJsonl: `${runRoot}/answers/frame5.jsonl`,
  frameImagesRoot: `${runRoot}/answers/frame5-images`,
  frameSummary: `${runRoot}/answers/frame5-summary.md`,
};
const planned = [
  path.dirname(identityManifest),
  paths.c1Jsonl,
  paths.c1ImagesRoot,
  paths.c1Summary,
  paths.c2Jsonl,
  paths.c2ImagesRoot,
  paths.c2Summary,
].sort();
for (const target of planned) {
  try {
    fs.lstatSync(target);
    throw new Error(`exists: ${target}`);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const status = cp.execFileSync(
  'git',
  ['status', '--short', '--untracked-files=all'],
  { encoding: 'utf8' },
).trimEnd();
if (status !== '') throw new Error(`worktree is not clean:\n${status}`);

const emptyArm = {
  startedAt: null,
  endedAt: null,
  serviceContinuity: null,
  jsonlSha256: null,
  imagesRootSha256: null,
  manifestSha256: null,
  rows: null,
  answered: null,
};
const block = {
  version: 'qsfog-supervisor-block-v1',
  blockId,
  timezone: 'America/New_York',
  freezeSha256: '0'.repeat(64),
  committedRevision: cp.execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  gitStatusShort: '',
  allLanesPaused: {
    value: true,
    at: required('QSF_PAUSED_AT'),
    supervisor: required('QSF_SUPERVISOR'),
  },
  hashes: {
    probeHarnessSha256: hashFile('tools/ai-dm-screenshot-probe.ts'),
    probeTestSha256: hashFile('tests/unit/tools/ai-dm-screenshot-probe.test.ts'),
    sourceRowsSha256: hashBytes(sourceRowsBytes),
    diagnosisSha256: hashFile(diagnosisPath),
    sourceImageSetSha256: hashBytes(sourceImageSet),
    identityManifestSha256: null,
    candidateManifestSha256: null,
  },
  invocationPolicy: {
    model: 'gpt-5.6-sol',
    effort: 'high',
    states: 24,
    seed: 20260910,
    primer: 'general',
    boardGlyphs: 'none',
    captureTilePx: 128,
    boardInput: 'png',
    questions: ['Q9'],
    generation: 'quietstone-svg-fog-intervention-r2',
    rowVersion: 'd576-screenshot-comprehension-row-v10',
    promptVersion: 'd576-screenshot-comprehension-v2',
    primerVersion: 'd576-general-board-primer-v12',
    normaliserVersion: 'd576-screenshot-vocabulary-normaliser-v4',
    compare: null,
    freshInvocationPerState: true,
    order: ['C1', 'C2', 'frame5'],
  },
  paths,
  unusedPathPreflight: {
    checkedAt: zonedNow(),
    allAbsent: true,
    paths: planned,
  },
  wholeBlockContinuity: {
    fromArm: 'C1',
    throughArm: 'C2',
    startedAt: null,
    endedAt: null,
    uninterrupted: null,
    interruptions: [],
    attestedAt: null,
    supervisor: required('QSF_SUPERVISOR'),
  },
  arms: {
    C1: { ...emptyArm },
    C2: { ...emptyArm },
    frame5: { ...emptyArm },
  },
};
const frozen = {
  version: block.version,
  blockId: block.blockId,
  timezone: block.timezone,
  committedRevision: block.committedRevision,
  gitStatusShort: block.gitStatusShort,
  allLanesPaused: block.allLanesPaused,
  hashes: {
    probeHarnessSha256: block.hashes.probeHarnessSha256,
    probeTestSha256: block.hashes.probeTestSha256,
    sourceRowsSha256: block.hashes.sourceRowsSha256,
    diagnosisSha256: block.hashes.diagnosisSha256,
    sourceImageSetSha256: block.hashes.sourceImageSetSha256,
  },
  invocationPolicy: block.invocationPolicy,
  paths: block.paths,
};
block.freezeSha256 = hashBytes(canonical(frozen));
fs.mkdirSync(path.dirname(blockPath), { recursive: true });
fs.writeFileSync(blockPath, `${canonical(block)}\n`, { flag: 'wx' });
console.log(JSON.stringify({
  blockPath,
  freezeSha256: block.freezeSha256,
  sourceImageSetSha256: block.hashes.sourceImageSetSha256,
  plannedPaths: planned.length,
}));
NODE
```

Identity:

```bash
npx vite-node tools/qsfog-intervention-report.ts identity-manifest \
  --block-record "$QSF_BLOCK" \
  --source-rows .tmp/runs/quietstone/probe-candidate.jsonl \
  --expected-source-rows-sha256 f614dd0298d3be2ba41440fdc18cde97ed5f1ffa8500725b820b47da6623adb9 \
  --source-images-root dnd-slim-runs/quietstone-probe-candidate-images \
  --source-revision 28f3bd1daa11f28c7a84f6431daaa51e25a2da47 \
  --states 24 --seed 20260910 --model gpt-5.6-sol:high --question Q9 \
  --out "$QSF_ROOT/unchanged128"
```

Populate the excluded identity hash:

```bash
node <<'NODE'
const crypto = require('node:crypto');
const fs = require('node:fs');
const canonicalize = value => Array.isArray(value)
  ? value.map(canonicalize)
  : value !== null && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]))
    : value;
const file = process.env.QSF_BLOCK;
const record = JSON.parse(fs.readFileSync(file, 'utf8'));
const bytes = fs.readFileSync(record.paths.identityManifest);
record.hashes.identityManifestSha256 = crypto.createHash('sha256').update(bytes).digest('hex');
fs.writeFileSync(file, `${JSON.stringify(canonicalize(record))}\n`);
console.log(record.hashes.identityManifestSha256);
NODE
```

C1:

```bash
export QSF_C1_STARTED_AT="$(TZ=America/New_York date '+%Y-%m-%dT%H:%M:%S%:z')"

npx vite-node tools/ai-dm-screenshot-probe.ts \
  --models gpt-5.6-sol:high --states 24 --seed 20260910 --primer general \
  --board-glyphs none --capture-tile-px 128 --board-input png --questions Q9 \
  --generation quietstone-svg-fog-intervention-r2 \
  --image-override-manifest "$QSF_ROOT/unchanged128/manifest.json" \
  --images-root "$QSF_ROOT/answers/c1-images" \
  --out "$QSF_ROOT/answers/c1.jsonl"

export QSF_C1_ENDED_AT="$(TZ=America/New_York date '+%Y-%m-%dT%H:%M:%S%:z')"
```

C2:

```bash
export QSF_C2_STARTED_AT="$(TZ=America/New_York date '+%Y-%m-%dT%H:%M:%S%:z')"

npx vite-node tools/ai-dm-screenshot-probe.ts \
  --models gpt-5.6-sol:high --states 24 --seed 20260910 --primer general \
  --board-glyphs none --capture-tile-px 128 --board-input png --questions Q9 \
  --generation quietstone-svg-fog-intervention-r2 \
  --image-override-manifest "$QSF_ROOT/unchanged128/manifest.json" \
  --images-root "$QSF_ROOT/answers/c2-images" \
  --out "$QSF_ROOT/answers/c2.jsonl"

export QSF_C2_ENDED_AT="$(TZ=America/New_York date '+%Y-%m-%dT%H:%M:%S%:z')"
export QSF_CONTINUITY_AT="$(TZ=America/New_York date '+%Y-%m-%dT%H:%M:%S%:z')"
```

After manually confirming continuous service over the complete C1-start through C2-end interval, record the completed arms:

```bash
node <<'NODE'
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const canonicalize = value => Array.isArray(value)
  ? value.map(canonicalize)
  : value !== null && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]))
    : value;
const walk = root => fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => {
  const file = path.join(root, entry.name);
  if (entry.isDirectory()) return walk(file);
  if (!entry.isFile()) throw new Error(`non-regular entry: ${file}`);
  return [file];
});
const treeDigest = root => hash(walk(root).map(file =>
  `${path.relative(process.cwd(), file)}\t${hash(fs.readFileSync(file))}\n`,
).sort().join(''));
const armResult = (record, arm, startedAt, endedAt) => {
  const lower = arm.toLowerCase();
  const jsonl = record.paths[`${lower}Jsonl`];
  const imagesRoot = record.paths[`${lower}ImagesRoot`];
  const rows = fs.readFileSync(jsonl, 'utf8').trimEnd().split('\n').map(JSON.parse);
  return {
    startedAt,
    endedAt,
    serviceContinuity: 'continuous',
    jsonlSha256: hash(fs.readFileSync(jsonl)),
    imagesRootSha256: treeDigest(imagesRoot),
    manifestSha256: record.hashes.identityManifestSha256,
    rows: rows.length,
    answered: rows.filter(row => row.outcome === 'answered').length,
  };
};
const file = process.env.QSF_BLOCK;
const record = JSON.parse(fs.readFileSync(file, 'utf8'));
record.arms.C1 = armResult(record, 'C1', process.env.QSF_C1_STARTED_AT, process.env.QSF_C1_ENDED_AT);
record.arms.C2 = armResult(record, 'C2', process.env.QSF_C2_STARTED_AT, process.env.QSF_C2_ENDED_AT);
record.wholeBlockContinuity.startedAt = process.env.QSF_C1_STARTED_AT;
record.wholeBlockContinuity.endedAt = process.env.QSF_C2_ENDED_AT;
record.wholeBlockContinuity.uninterrupted = true;
record.wholeBlockContinuity.interruptions = [];
record.wholeBlockContinuity.attestedAt = process.env.QSF_CONTINUITY_AT;
fs.writeFileSync(file, `${JSON.stringify(canonicalize(record))}\n`);
console.log(JSON.stringify({
  C1: record.arms.C1,
  C2: record.arms.C2,
  wholeBlockContinuity: record.wholeBlockContinuity,
}));
NODE
```

Paired repeatability report:

```bash
npx vite-node tools/qsfog-intervention-report.ts paired-report \
  --block-record "$QSF_BLOCK" \
  --control-c1 "$QSF_ROOT/answers/c1.jsonl" \
  --control-c2 "$QSF_ROOT/answers/c2.jsonl" \
  --source-rows .tmp/runs/quietstone/probe-candidate.jsonl \
  --diagnosis .tmp/runs/quietstone/qsfog-diagnosis.json \
  --out-prefix "$QSF_ROOT/reports/repeatability"
```

QSFOG A FIX R1 DONE
diff --git a//tmp/qsfog-mutate.mjs b//tmp/qsfog-mutate.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..13915143fbc1f96062fd0cf19410d360edf9fae5
--- /dev/null
+++ b//tmp/qsfog-mutate.mjs
@@ -0,0 +1,206 @@
+import { readFileSync, writeFileSync } from 'node:fs';
+
+const path = process.argv[2];
+const name = process.argv[3];
+const mutations = {
+  STATE_COMPLETENESS: [
+    '.slice(0, options.states);',
+    '.slice(0, Math.max(0, options.states - 1));',
+  ],
+  PNG_AUTHENTICATION: [
+    '|| dimensions.width !== expected.width\n    || dimensions.height !== expected.height)',
+    '|| dimensions.height !== expected.height\n    || dimensions.height !== expected.height)',
+  ],
+  CANONICAL_TRUTH: [
+    'if (canonicalJson(parsedActual) !== canonicalJson(parsedExpected)) {',
+    'if (canonicalJson(parsedActual) === canonicalJson(parsedExpected)) {',
+  ],
+  STALE_FREEZE: [
+    'if (block.freezeSha256 !== computeBlockFreezeSha256(block)) {',
+    'if (block.freezeSha256 === computeBlockFreezeSha256(block)) {',
+  ],
+  STALE_HEAD: [
+    'if (currentHead !== block.committedRevision) {',
+    'if (currentHead === block.committedRevision) {',
+  ],
+  PLANNED_PATH_PREFLIGHT: [
+    '    throw new Error(`${String(name)} already exists.`);',
+    '    continue;',
+  ],
+  DERIVED_SUMMARY: [
+    "return `${jsonlPath.slice(0, -'.jsonl'.length)}-summary.md`;",
+    "return `${jsonlPath}.md`;",
+  ],
+  GAP_INTERRUPTION: [
+    "continuity.uninterrupted !== true || continuity.interruptions.length !== 0",
+    "continuity.uninterrupted !== true || continuity.interruptions.length < 0",
+  ],
+  NON_CANCELLING_SPREAD: [
+    ': mean(group.map((state) => absolute(subtract(scoreFraction(state.c1), scoreFraction(state.c2)))));',
+    ': absolute(subtract(mean(c1), mean(c2)));',
+  ],
+  ORDINARY_DENOMINATOR: ["'5763006': 1_090,", "'5763006': 1_091,"],
+  COLLISION_DENOMINATOR: ["'5763006': 95,", "'5763006': 96,"],
+  ROW_OUTCOME_REJECTION: [
+    "if (row['outcome'] !== 'answered') {",
+    "if (false && row['outcome'] !== 'answered') {",
+  ],
+  BUCKET_PARTITION: [
+    'buckets.fogEligibleOrdinary += 1;',
+    'buckets.fogExcludedNeither += 1;',
+  ],
+  PREDICTION_DEDUPLICATION: [
+    'return new Map(cells.map((cell) => [cellKey(cell), cell]));',
+    'return new Map(cells.map((cell, index) => [`${cellKey(cell)}:${String(index)}`, cell]));',
+  ],
+  LEAVE_ONE_BASE_OUT: [
+    'leaveOneOut: Object.fromEntries(QSFOG_BASES.map((base) => [base, {',
+    'leaveOneOut: Object.fromEntries(QSFOG_BASES.slice(1).map((base) => [base, {',
+  ],
+  SCORE_HEADROOM_VERDICT: [
+    'const headroom = scoreHeadroom && baseHeadroom && familyHeadroom;',
+    'const headroom = true;',
+  ],
+  CONDITION_1_EXACT_THRESHOLD: [
+    '  )) >= 0;\n  const condition2 =',
+    '  )) > 0;\n  const condition2 =',
+  ],
+  CONDITION_2_FOUR_BASES: [
+    'byBaseInternal[base].passes).length >= 4;',
+    'byBaseInternal[base].passes).length >= 3;',
+  ],
+  CONDITION_3_POSITIVE_LOO: [
+    'leaveOneOutInternal[base].numerator > 0n);',
+    'leaveOneOutInternal[base].numerator >= 0n);',
+  ],
+  CONDITION_4_STABLE_POSITIVE: [
+    'const condition4 = input.stablePositiveLosses === 0;',
+    'const condition4 = input.stablePositiveLosses <= 1;',
+  ],
+  CONDITION_5_FOG_FN: [
+    'const condition5 = input.fogFalseNegatives.candidate * 2\n      <=',
+    'const condition5 = input.fogFalseNegatives.candidate * 2 - 2\n      <=',
+  ],
+  CONDITION_5_OBSCUREMENT_FN: [
+    '&& input.obscurementFalseNegatives.candidate * 2\n      <=',
+    '&& input.obscurementFalseNegatives.candidate * 2 - 2\n      <=',
+  ],
+  ORDINARY_NONINCREASE: [
+    'const condition6 = ordinary.nonincrease\n    && collision.nonincrease',
+    'const condition6 = true\n    && collision.nonincrease',
+  ],
+  COLLISION_NONINCREASE: [
+    'const condition6 = ordinary.nonincrease\n    && collision.nonincrease',
+    'const condition6 = ordinary.nonincrease\n    && true',
+  ],
+  EXACT_25_PERCENT: [
+    '&& compare(relativeReduction, rational(1, 4)) >= 0\n    && compare(reduction',
+    '&& compare(relativeReduction, rational(1, 4)) > 0\n    && compare(reduction',
+  ],
+  STRICT_SPREAD: [
+    '&& compare(reduction, multiply(rational(2), spread)) > 0;',
+    '&& compare(reduction, multiply(rational(2), spread)) >= 0;',
+  ],
+  ORDINARY_ONLY_EXISTENTIAL: [
+    '(nonzeroFamilies.length === 0 || nonzeroFamilies.some((family) => family.qualifies));',
+    '(nonzeroFamilies.length === 0 || ordinary.qualifies);',
+  ],
+  COLLISION_ONLY_EXISTENTIAL: [
+    '(nonzeroFamilies.length === 0 || nonzeroFamilies.some((family) => family.qualifies));',
+    '(nonzeroFamilies.length === 0 || collision.qualifies);',
+  ],
+  ZERO_REFERENCE_VACUITY: [
+    '(nonzeroFamilies.length === 0 || nonzeroFamilies.some((family) => family.qualifies));',
+    '(nonzeroFamilies.length !== 0 && nonzeroFamilies.some((family) => family.qualifies));',
+  ],
+  ZERO_REFERENCE_NONINCREASE: [
+    'const nonincrease = compare(candidateRate, referenceRate) <= 0;',
+    'const nonincrease = compare(candidateRate, referenceRate) <= 1;',
+  ],
+  ZERO_FAMILY_CREDITED: [
+    'qualifies: family.qualifies,',
+    'qualifies: family.qualifies || family.referenceCount.numerator === 0n,',
+  ],
+  HALF_INTEGER_AVERAGING: [
+    'const candidate = sumCounts(family.candidateByBase);\n  const referenceCount = rational(c1 + c2, 2);',
+    'const candidate = sumCounts(family.candidateByBase);\n  const referenceCount = rational((c1 + c2) / 2);',
+  ],
+  CONDITION_7_AUTHENTICATION: [
+    'const condition7 = input.authenticated && input.archivedControlEligible;',
+    'const condition7 = input.archivedControlEligible;',
+  ],
+  RATE_HEADROOM: [
+    '    qualifies,\n    headroom: referenceCount.numerator !== 0n\n'
+      + '      && compare(referenceRate, multiply(rational(2), spread)) > 0,',
+    '    qualifies,\n    headroom: referenceCount.numerator !== 0n,',
+  ],
+  ODD_REFERENCE_RATE_ROUNDED: [
+    'const referenceRate = divide(referenceCount, rational(denominator));\n  const candidateRate =',
+    'const referenceRate = rational(Math.floor((c1 + c2) / 2), denominator);\n  const candidateRate =',
+  ],
+  WEAK_24_99_PERCENT: [
+    '&& compare(relativeReduction, rational(1, 4)) >= 0\n    && compare(reduction',
+    '&& compare(relativeReduction, rational(2_499, 10_000)) >= 0\n    && compare(reduction',
+  ],
+  PATH_ALIAS_ACCEPTED: [
+    'if (left.path === right.path) {',
+    'if (false && left.path === right.path) {',
+  ],
+  ATTESTATION_AFTER_C1: [
+    'if (pausedAt > c1StartedAt) {',
+    'if (false && pausedAt > c1StartedAt) {',
+  ],
+  EVIDENCE_MISSING_AS_FALSE: [
+    '  const manifest = imageOverrideManifestSchema.parse(manifestInput);\n'
+      + '  const manipulation = candidateManipulationValidationSchema.parse(manifest.manipulationValidation);',
+    '  let manifest: z.infer<typeof imageOverrideManifestSchema>;\n'
+      + '  let manipulation: z.infer<typeof candidateManipulationValidationSchema>;\n'
+      + '  try {\n'
+      + '    manifest = imageOverrideManifestSchema.parse(manifestInput);\n'
+      + '    manipulation = candidateManipulationValidationSchema.parse(manifest.manipulationValidation);\n'
+      + '  } catch {\n'
+      + '    return false;\n'
+      + '  }',
+  ],
+  NO_IDAT_ACCEPTED: [
+    'if (!foundIdat) {',
+    'if (false && !foundIdat) {',
+  ],
+  LOO_ROWS_DROPPED: [
+    '  for (const base of QSFOG_BASES) {\n'
+      + '    const row = baseline.leaveOneOut[base];\n'
+      + "    lines.push([\n      'leave_one_out',",
+    '  for (const base of QSFOG_BASES) {\n'
+      + '    const row = baseline.leaveOneOut[base];\n'
+      + "    false && lines.push([\n      'leave_one_out',",
+  ],
+  RATIONAL_OVERFLOW: [
+    'function external(value: InternalRational): RationalValue {\n'
+      + '  return {\n'
+      + '    numerator: value.numerator.toString(),\n'
+      + '    denominator: value.denominator.toString(),\n'
+      + '  };\n'
+      + '}',
+    'function external(value: InternalRational): RationalValue {\n'
+      + '  const numerator = Number(value.numerator);\n'
+      + '  const denominator = Number(value.denominator);\n'
+      + '  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {\n'
+      + "    throw new RangeError('Rational result exceeds safe integer presentation.');\n"
+      + '  }\n'
+      + '  return { numerator: String(numerator), denominator: String(denominator) };\n'
+      + '}',
+  ],
+};
+
+if (path === undefined || name === undefined || !(name in mutations)) {
+  throw new Error('usage: node qsfog-mutate.mjs <path> <mutation>');
+}
+const [before, after] = mutations[name];
+const source = readFileSync(path, 'utf8');
+const index = source.indexOf(before);
+if (index < 0) {
+  throw new Error(`mutation source not found: ${name}`);
+}
+const mutated = source.slice(0, index) + after + source.slice(index + before.length);
+writeFileSync(path, mutated);
+process.stdout.write(`${name}\t1\n`);
diff --git a//tmp/qsfog-run-mutants.sh b//tmp/qsfog-run-mutants.sh
new file mode 100644
index 0000000000000000000000000000000000000000..fa901d3712ac34a9bf4f44e006b2f268617f8a98
--- /dev/null
+++ b//tmp/qsfog-run-mutants.sh
@@ -0,0 +1,92 @@
+#!/usr/bin/env bash
+set -u
+
+production=tools/qsfog-intervention-report.ts
+pristine=/tmp/qsfog-a-r1-pristine.ts
+results=/tmp/qsfog-a-r1-mutants.tsv
+cp "$production" "$pristine"
+pristine_sha=$(sha256sum "$pristine" | cut -d' ' -f1)
+printf 'mutant\tapplied_sha256\texit\tkilling_test\trestored_sha256\n' > "$results"
+
+cases=(
+  'STATE_COMPLETENESS|authenticates truth and PNGs, copies exact bytes, and bypasses snapshot capture and close'
+  'PNG_AUTHENTICATION|rejects canonical truth changes and PNG byte or IHDR changes'
+  'CANONICAL_TRUTH|rejects canonical truth changes and PNG byte or IHDR changes'
+  'STALE_FREEZE|rejects stale block harness, HEAD, status, and pause authentication'
+  'STALE_HEAD|authenticates truth and PNGs, copies exact bytes, and bypasses snapshot capture and close'
+  'PLANNED_PATH_PREFLIGHT|rejects pre-existing final-block output identityManifest'
+  'DERIVED_SUMMARY|derives the probe summary overwrite path exactly'
+  'GAP_INTERRUPTION|rejects an outage only in the inter-arm gap'
+  'NON_CANCELLING_SPREAD|uses mean absolute per-state differences instead of cancelling differences of means'
+  'ORDINARY_DENOMINATOR|freezes schemas, denominators, bases, and the pre-change discovery digest'
+  'COLLISION_DENOMINATOR|freezes schemas, denominators, bases, and the pre-change discovery digest'
+  'ROW_OUTCOME_REJECTION|rejects missing, replacement, blocked, schema-rejected, non-answered, error, null-score, and null-answer rows'
+  'BUCKET_PARTITION|accounts for all eight false-positive buckets and proves the identities'
+  'PREDICTION_DEDUPLICATION|matches actual scorer semantics while retaining cross-class overlap and deduplicating repeats'
+  'LEAVE_ONE_BASE_OUT|emits all five leave-one-base-out rows including 5763040'
+  'SCORE_HEADROOM_VERDICT|returns INCONCLUSIVE_HEADROOM without relaxing score or rate thresholds'
+  'CONDITION_1_EXACT_THRESHOLD|condition 1 passes at exact T and fails one representable step below'
+  'CONDITION_2_FOUR_BASES|condition 2 passes at exactly four of five bases and fails at three of five'
+  'CONDITION_3_POSITIVE_LOO|condition 3 fails when leave-one-out becomes zero only after removing 5763040'
+  'CONDITION_4_STABLE_POSITIVE|condition 4 fails on one stable-positive loss'
+  'CONDITION_5_FOG_FN|condition 5 rejects fog false negatives separately at plus one'
+  'CONDITION_5_OBSCUREMENT_FN|condition 5 rejects obscurement false negatives separately at plus one'
+  'ORDINARY_NONINCREASE|condition 6 rejects an ordinary regression'
+  'COLLISION_NONINCREASE|condition 6 rejects a collision regression'
+  'EXACT_25_PERCENT|condition 6 fails at 24.999 percent reduction and passes at exact 25 percent'
+  'STRICT_SPREAD|condition 6 fails at exactly twice spread and passes at the next rational step'
+  'ORDINARY_ONLY_EXISTENTIAL|condition 6 allows collision qualification while ordinary remains equal'
+  'COLLISION_ONLY_EXISTENTIAL|condition 6 allows ordinary qualification while collision remains equal'
+  'ZERO_REFERENCE_VACUITY|condition 6 vacuously passes when both references and candidates are zero'
+  'ZERO_REFERENCE_NONINCREASE|condition 6 rejects any candidate count over a zero reference'
+  'ZERO_FAMILY_CREDITED|condition 6 keeps one zero reference at zero and does not credit it as qualifying'
+  'HALF_INTEGER_AVERAGING|condition 6 preserves odd and even C1 plus C2 counts as exact half-integers'
+  'CONDITION_7_AUTHENTICATION|condition 7 rejects false authentication and false eligibility independently'
+  'RATE_HEADROOM|returns INCONCLUSIVE_HEADROOM when nonzero rate headroom cannot clear its own spread'
+  'ODD_REFERENCE_RATE_ROUNDED|condition 6 preserves odd and even C1 plus C2 counts as exact half-integers'
+  'WEAK_24_99_PERCENT|condition 6 fails at 24.999 percent reduction and passes at exact 25 percent'
+  'PATH_ALIAS_ACCEPTED|rejects canonical aliases between C1 and C2 outputs before identity creation'
+  'ATTESTATION_AFTER_C1|rejects an all-lanes-paused attestation after C1 starts with a current freeze'
+  'EVIDENCE_MISSING_AS_FALSE|rejects missing or malformed eligibility evidence instead of treating it as false'
+  'NO_IDAT_ACCEPTED|rejects a 45-byte PNG with no IDAT chunk even when its SHA and dimensions match'
+  'LOO_ROWS_DROPPED|renders the complete repeatability output columns and required row families'
+  'RATIONAL_OVERFLOW|preserves an exact repeatability fraction beyond safe integer presentation'
+)
+
+for entry in "${cases[@]}"; do
+  name=${entry%%|*}
+  expected=${entry#*|}
+  cp "$pristine" "$production"
+  node /tmp/qsfog-mutate.mjs "$production" "$name" >/tmp/qsfog-mutator.out
+  applied_sha=$(sha256sum "$production" | cut -d' ' -f1)
+  if [[ "$applied_sha" == "$pristine_sha" ]]; then
+    printf 'NOT_APPLIED\t%s\n' "$name"
+    exit 2
+  fi
+  log="/tmp/qsfog-mutant-${name}.log"
+  npx vitest run --configLoader runner tests/unit/tools/qsfog-intervention-report.test.ts >"$log" 2>&1
+  code=$?
+  if [[ "$code" -eq 0 ]]; then
+    printf 'SURVIVOR\t%s\t%s\n' "$name" "$applied_sha"
+    cp "$pristine" "$production"
+    exit 3
+  fi
+  if ! grep -Fq "$expected" "$log"; then
+    printf 'WRONG_KILL\t%s\t%s\n' "$name" "$expected"
+    tail -n 80 "$log"
+    cp "$pristine" "$production"
+    exit 4
+  fi
+  cp "$pristine" "$production"
+  restored_sha=$(sha256sum "$production" | cut -d' ' -f1)
+  if [[ "$restored_sha" != "$pristine_sha" ]]; then
+    printf 'BAD_RESTORE\t%s\t%s\n' "$name" "$restored_sha"
+    exit 5
+  fi
+  printf '%s\t%s\t%s\t%s\t%s\n' \
+    "$name" "$applied_sha" "$code" "$expected" "$restored_sha" >> "$results"
+  printf 'KILLED %s %s\n' "$name" "$applied_sha"
+done
+
+printf 'PRISTINE %s\n' "$pristine_sha"
+printf 'COUNT %s\n' "${#cases[@]}"
diff --git a/tests/unit/tools/qsfog-intervention-report.test.ts b/tests/unit/tools/qsfog-intervention-report.test.ts
index 6b07ffc97ef86da3df38c247b3ca617777d351ff..7188a26a5971a81b70ac14d9873973ee4c7adc50
--- a/tests/unit/tools/qsfog-intervention-report.test.ts
+++ b/tests/unit/tools/qsfog-intervention-report.test.ts
@@ -1,5 +1,5 @@
 import { createHash } from 'node:crypto';
-import { join, relative, resolve } from 'node:path';
+import { dirname, join, relative, resolve } from 'node:path';
 import { describe, expect, it } from 'vitest';
 import { encodePng } from '../../../src/assets/png';
 import { canonicalJson } from '../../../src/commands/canonical-json';
@@ -22,6 +22,7 @@
   QSFOG_ORDINARY_DENOMINATORS,
   assertUnusedBlockPaths,
   buildIdentityManifest,
+  calculateControlBaseline,
   calculatePromotion,
   calculateRepeatability,
   classifyQ9Accounting,
@@ -29,7 +30,10 @@
   deriveProbeSummaryPath,
   parseQsFogCliArgs,
   parseSupervisorBlock,
+  renderRepeatabilityMarkdown,
+  renderRepeatabilitySummaryCsv,
   renderSummaryCsv,
+  validateCandidateEligibility,
   validateCompletedBlock,
   validateCanonicalQ9Truth,
   validateIdentityPng,
@@ -47,11 +51,112 @@
 const REVISION = '1'.repeat(40);
 const SOURCE_REVISION = '2'.repeat(40);
 
-function fraction(numerator: number, denominator = 1): {
-  readonly numerator: number;
-  readonly denominator: number;
+function candidateManifest(eligible: boolean): unknown {
+  const a1Sha256 = eligible ? SHA_A : 'c'.repeat(64);
+  return {
+    kind: 'qsfog-frame5-candidate',
+    version: 'qsfog-image-override-manifest-v2',
+    sourceRevision: REVISION,
+    sourceImagesRoot: '.tmp/source-images',
+    states: {
+      s: {
+        file: 'board-images/candidate.png',
+        sha256: SHA_B,
+        width: 128,
+        height: 128,
+        sourcePng: { sha256: SHA_A, width: 128, height: 128 },
+      },
+    },
+    manipulationValidation: {
+      version: 'qsfog-live-dom-asset-replacement-v1',
+      blockId: 'block',
+      blockFreezeSha256: SHA_A,
+      probeHarnessSha256: SHA_A,
+      sourceRows: { path: '.tmp/source.jsonl', sha256: SHA_A, rows: 1_008 },
+      sourceImageSetSha256: SHA_A,
+      assets: {
+        original: {
+          id: 'art.fog.hidden.v1',
+          pngSha256: SHA_A,
+          rgbaSha256: SHA_A,
+          width: 128,
+          height: 128,
+        },
+        replacement: {
+          id: 'art.fog.hidden.v1',
+          svgSha256: SHA_B,
+          pngSha256: SHA_B,
+          rgbaSha256: SHA_B,
+          width: 128,
+          height: 128,
+        },
+      },
+      renderer: {
+        playwrightVersion: '1.61.1',
+        chromiumVersion: '149.0.7827.55',
+        executableSha256: SHA_A,
+        viewport: { width: 1280, height: 1280 },
+        deviceScaleFactor: 1,
+        locale: 'en-US',
+        timezoneId: 'UTC',
+        colorScheme: 'dark',
+        reducedMotion: 'reduce',
+        capturePolicy: 'encounter-board-element-settled-v1',
+      },
+      states: {
+        s: {
+          stateDigest: SHA_A,
+          truthSha256: SHA_A,
+          sourcePngSha256: SHA_A,
+          resultPngSha256: SHA_B,
+          a1PngSha256: a1Sha256,
+          a1RgbaSha256: a1Sha256,
+          bRgbaSha256: SHA_B,
+          a3PngSha256: a1Sha256,
+          a3RgbaSha256: a1Sha256,
+          visualDomBeforeSha256: SHA_A,
+          visualDomAfterSha256: SHA_B,
+          visualDomRestoredSha256: SHA_A,
+          serviceManifestSha256: SHA_A,
+          changedRegion: {
+            pixels: 1,
+            outsidePixels: 0,
+            fraction: 1 / 16_384,
+            bounds: { x: 0, y: 0, width: 1, height: 1 },
+            perFogCell: [{ column: 0, row: 0, pixels: 1 }],
+          },
+          restoreExact: true,
+          archivedControlEligible: eligible,
+        },
+      },
+    },
+  };
+}
+
+function withCandidateStates(states: unknown): unknown {
+  const manifest = candidateManifest(true) as Record<string, unknown>;
+  const manipulation = manifest['manipulationValidation'] as Record<string, unknown>;
+  return {
+    ...manifest,
+    manipulationValidation: { ...manipulation, states },
+  };
+}
+
+function withCandidateEligibility(eligibility: unknown): unknown {
+  const manifest = candidateManifest(true) as Record<string, unknown>;
+  const manipulation = manifest['manipulationValidation'] as Record<string, unknown>;
+  const states = manipulation['states'] as Record<string, unknown>;
+  const state = states['s'] as Record<string, unknown>;
+  return withCandidateStates({
+    s: { ...state, archivedControlEligible: eligibility },
+  });
+}
+
+function fraction(numerator: number | string, denominator: number | string = 1): {
+  readonly numerator: string;
+  readonly denominator: string;
 } {
-  return { numerator, denominator };
+  return { numerator: String(numerator), denominator: String(denominator) };
 }
 
 function score(numerator: number, denominator = 1): {
@@ -78,13 +183,13 @@
     obscurementFalseNegatives: { c1: 8, c2: 8, candidate: 8 },
     families: {
       ordinary: {
-        denominatorByBase: QSFOG_ORDINARY_DENOMINATORS,
+        denominatorByBase: { ...QSFOG_ORDINARY_DENOMINATORS },
         c1ByBase: { '5763006': 8, '5763022': 8, '5763027': 8, '5763040': 8, '5763047': 8 },
         c2ByBase: { '5763006': 8, '5763022': 8, '5763027': 8, '5763040': 8, '5763047': 8 },
         candidateByBase: { '5763006': 6, '5763022': 6, '5763027': 6, '5763040': 6, '5763047': 6 },
       },
       collision: {
-        denominatorByBase: QSFOG_COLLISION_DENOMINATORS,
+        denominatorByBase: { ...QSFOG_COLLISION_DENOMINATORS },
         c1ByBase: { '5763006': 0, '5763022': 0, '5763027': 0, '5763040': 0, '5763047': 0 },
         c2ByBase: { '5763006': 0, '5763022': 0, '5763027': 0, '5763040': 0, '5763047': 0 },
         candidateByBase: { '5763006': 0, '5763022': 0, '5763027': 0, '5763040': 0, '5763047': 0 },
@@ -95,9 +200,37 @@
   };
 }
 
+function controlBaseline(input: PromotionInput = promotionInput()) {
+  return calculateControlBaseline({
+    states: input.states,
+    families: {
+      ordinary: {
+        denominatorByBase: input.families.ordinary.denominatorByBase,
+        c1ByBase: input.families.ordinary.c1ByBase,
+        c2ByBase: input.families.ordinary.c2ByBase,
+      },
+      collision: {
+        denominatorByBase: input.families.collision.denominatorByBase,
+        c1ByBase: input.families.collision.c1ByBase,
+        c2ByBase: input.families.collision.c2ByBase,
+      },
+    },
+    fogFalseNegatives: {
+      c1: input.fogFalseNegatives.c1,
+      c2: input.fogFalseNegatives.c2,
+    },
+    obscurementFalseNegatives: {
+      c1: input.obscurementFalseNegatives.c1,
+      c2: input.obscurementFalseNegatives.c2,
+    },
+    stablePositiveFacts: 20,
+    disputedPositiveFacts: 3,
+  });
+}
+
 function baseBlock(candidate: boolean): QsFogSupervisorBlock {
   const paths = {
-    identityManifest: '.tmp/qsfog/unchanged128',
+    identityManifest: '.tmp/qsfog/unchanged128/manifest.json',
     candidateManifest: candidate ? '.tmp/qsfog/frame5/manifest.json' : null,
     c1Jsonl: '.tmp/qsfog/answers/c1.jsonl',
     c1ImagesRoot: '.tmp/qsfog/answers/c1-images',
@@ -110,7 +243,7 @@
     frameSummary: '.tmp/qsfog/answers/frame5-summary.md',
   };
   const planned = [
-    paths.identityManifest,
+    dirname(paths.identityManifest),
     paths.c1Jsonl,
     paths.c1ImagesRoot,
     paths.c1Summary,
@@ -251,6 +384,31 @@
     expect(() => validateIdentityPng(png, { ...expected, width: 3 })).toThrow('IHDR');
   });
 
+  it('rejects a 45-byte PNG with no IDAT chunk even when its SHA and dimensions match', () => {
+    const png = Buffer.from(encodePng(2, 1, new Uint8Array(8)));
+    const noIdat = Buffer.concat([png.subarray(0, 33), png.subarray(png.length - 12)]);
+    const expected = {
+      sha256: createHash('sha256').update(noIdat).digest('hex'),
+      width: 2,
+      height: 1,
+    };
+    expect(noIdat).toHaveLength(45);
+    expect(() => validateIdentityPng(noIdat, expected)).toThrow('IDAT');
+  });
+
+  it('rejects a PNG with a corrupt IDAT CRC even when its independent SHA matches', () => {
+    const corrupt = Buffer.from(encodePng(2, 1, new Uint8Array(8)));
+    const idatTypeOffset = corrupt.indexOf(Buffer.from('IDAT'));
+    expect(idatTypeOffset).toBeGreaterThan(0);
+    corrupt[idatTypeOffset + 4] = (corrupt[idatTypeOffset + 4] ?? 0) ^ 1;
+    const expected = {
+      sha256: createHash('sha256').update(corrupt).digest('hex'),
+      width: 2,
+      height: 1,
+    };
+    expect(() => validateIdentityPng(corrupt, expected)).toThrow('CRC');
+  });
+
   it('derives the probe summary overwrite path exactly', () => {
     expect(deriveProbeSummaryPath('.tmp/run/c1.jsonl')).toBe('.tmp/run/c1-summary.md');
     expect(() => deriveProbeSummaryPath('.tmp/run/c1.txt')).toThrow();
@@ -263,6 +421,36 @@
     expect(() => parseQsFogCliArgs(['paired-report', '--wat', 'x'])).toThrow();
     expect(() => parseQsFogCliArgs(['paired-report', '--out-prefix'])).toThrow();
   });
+
+  it('excludes both mutable manifest hashes from the documented block freeze', () => {
+    const block = baseBlock(true);
+    const changed = {
+      ...block,
+      hashes: {
+        ...block.hashes,
+        identityManifestSha256: 'c'.repeat(64),
+        candidateManifestSha256: 'd'.repeat(64),
+      },
+    };
+    expect(computeBlockFreezeSha256(changed)).toBe(block.freezeSha256);
+  });
+
+  it('rejects missing or malformed eligibility evidence instead of treating it as false', () => {
+    expect(() => validateCandidateEligibility(withCandidateStates({}), ['s'])).toThrow();
+    expect(() => validateCandidateEligibility(withCandidateStates({ s: {} }), ['s'])).toThrow();
+    expect(() => validateCandidateEligibility(withCandidateStates({
+      s: { archivedControlEligible: 'true' },
+    }), ['s'])).toThrow();
+    expect(() => validateCandidateEligibility(withCandidateEligibility('true'), ['s'])).toThrow();
+  });
+
+  it('requires complete capture provenance and reserves false for an authenticated mismatch', () => {
+    expect(() => validateCandidateEligibility(withCandidateStates({
+      s: { archivedControlEligible: true },
+    }), ['s'])).toThrow();
+    expect(validateCandidateEligibility(candidateManifest(true), ['s'])).toBe(true);
+    expect(validateCandidateEligibility(candidateManifest(false), ['s'])).toBe(false);
+  });
 });
 
 const finalPaths = [
@@ -283,7 +471,8 @@
     const directory = await mkdtemp(resolve('.tmp/qsfog-final-path-'));
     try {
       const block = baseBlock(true);
-      const target = resolve(directory, block.paths[pathName] ?? 'missing');
+      const recorded = block.paths[pathName] ?? 'missing';
+      const target = resolve(directory, pathName === 'identityManifest' ? dirname(recorded) : recorded);
       mkdirSync(target, { recursive: true });
       await expect(assertUnusedBlockPaths(block, directory, true)).rejects.toThrow(pathName);
     } finally {
@@ -307,7 +496,8 @@
     const directory = await mkdtemp(resolve('.tmp/qsfog-repeat-path-'));
     try {
       const block = baseBlock(false);
-      const target = resolve(directory, block.paths[pathName]);
+      const recorded = block.paths[pathName];
+      const target = resolve(directory, pathName === 'identityManifest' ? dirname(recorded) : recorded);
       mkdirSync(target, { recursive: true });
       await expect(assertUnusedBlockPaths(block, directory, false)).rejects.toThrow(pathName);
     } finally {
@@ -316,6 +506,52 @@
   });
 }
 
+it('rejects canonical aliases between C1 and C2 outputs before identity creation', async () => {
+  const directory = await mkdtemp(resolve('.tmp/qsfog-alias-path-'));
+  try {
+    const block = baseBlock(false);
+    block.paths.c2Jsonl = '.tmp/qsfog/answers/./c1.jsonl';
+    block.paths.c2ImagesRoot = '.tmp/qsfog/answers/./c1-images';
+    block.paths.c2Summary = '.tmp/qsfog/answers/./c1-summary.md';
+    block.unusedPathPreflight.paths = [
+      dirname(block.paths.identityManifest),
+      block.paths.c1Jsonl,
+      block.paths.c1ImagesRoot,
+      block.paths.c1Summary,
+      block.paths.c2Jsonl,
+      block.paths.c2ImagesRoot,
+      block.paths.c2Summary,
+    ].sort();
+    block.freezeSha256 = computeBlockFreezeSha256(block);
+    expect(() => validateCompletedBlock(block, false)).toThrow('overlap');
+    await expect(assertUnusedBlockPaths(block, directory, false)).rejects.toThrow('overlap');
+  } finally {
+    await rm(directory, { recursive: true, force: true });
+  }
+});
+
+it('rejects a planned output nested under another planned output root', async () => {
+  const directory = await mkdtemp(resolve('.tmp/qsfog-ancestor-path-'));
+  try {
+    const block = baseBlock(false);
+    block.paths.c1Jsonl = '.tmp/qsfog/answers/c1-images/c1.jsonl';
+    block.paths.c1Summary = '.tmp/qsfog/answers/c1-images/c1-summary.md';
+    block.unusedPathPreflight.paths = [
+      dirname(block.paths.identityManifest),
+      block.paths.c1Jsonl,
+      block.paths.c1ImagesRoot,
+      block.paths.c1Summary,
+      block.paths.c2Jsonl,
+      block.paths.c2ImagesRoot,
+      block.paths.c2Summary,
+    ].sort();
+    block.freezeSha256 = computeBlockFreezeSha256(block);
+    await expect(assertUnusedBlockPaths(block, directory, false)).rejects.toThrow('ancestry');
+  } finally {
+    await rm(directory, { recursive: true, force: true });
+  }
+});
+
 describe('QSFOG whole-interval authentication', () => {
   it('accepts exact repeat-only C1-start through C2-end continuity', () => {
     expect(() => validateCompletedBlock(baseBlock(false), false)).not.toThrow();
@@ -325,6 +561,20 @@
     expect(() => validateCompletedBlock(baseBlock(true), true)).not.toThrow();
   });
 
+  it('rejects an all-lanes-paused attestation after C1 starts with a current freeze', () => {
+    const block = baseBlock(false);
+    block.allLanesPaused.at = '2026-09-14T09:02:00-04:00';
+    block.freezeSha256 = computeBlockFreezeSha256(block);
+    expect(() => validateCompletedBlock(block, false)).toThrow('paused');
+  });
+
+  it('rejects an unused-path preflight after C1 starts with a current freeze', () => {
+    const block = baseBlock(false);
+    block.unusedPathPreflight.checkedAt = '2026-09-14T09:02:00-04:00';
+    block.freezeSha256 = computeBlockFreezeSha256(block);
+    expect(() => validateCompletedBlock(block, false)).toThrow('preflight');
+  });
+
   it('rejects an outage only in the inter-arm gap', () => {
     const block = baseBlock(false);
     const interrupted = {
@@ -465,6 +715,62 @@
     expect(result.byBase['5763006'].meanDifference).toEqual(fraction(0));
   });
 
+  it('preserves an exact repeatability fraction beyond safe integer presentation', () => {
+    const unions = [101, 103, 107, 109, 113, 127, 131, 137];
+    const result = calculateRepeatability(unions.map((union, index) => ({
+      stateId: `large-rational-${String(index)}`,
+      base: '5763006',
+      c1: score(1, union),
+      c2: score(2, union),
+    })));
+    expect(result.spread).toEqual(fraction(
+      '272598129945484',
+      '31249487656358033',
+    ));
+  });
+
+  it('renders the complete repeatability output columns and required row families', () => {
+    const input = promotionInput();
+    const baseline = controlBaseline(input);
+    const csv = renderRepeatabilitySummaryCsv(baseline);
+    const lines = csv.trimEnd().split('\n');
+    const headings = lines[0]!.split(',');
+    const rows = lines.slice(1).map((line) => Object.fromEntries(
+      headings.map((heading, index) => [heading, line.split(',')[index]]),
+    ));
+    expect(lines[0]).toContain('control_c1_mean');
+    expect(lines[0]).toContain('reference_rate');
+    expect(lines[0]).toContain('stable_positive_facts');
+    expect(lines).toHaveLength(24);
+    expect(lines.every((line) => line.split(',').length === headings.length)).toBe(true);
+    expect(lines.filter((line) => line.startsWith('base,'))).toHaveLength(5);
+    expect(lines.filter((line) => line.startsWith('leave_one_out,'))).toHaveLength(5);
+    expect(lines.filter((line) => line.startsWith('family,'))).toHaveLength(2);
+    expect(lines.filter((line) => line.startsWith('family_base,'))).toHaveLength(10);
+    const overall = rows.find((row) => row['scope'] === 'overall');
+    expect(overall?.['control_c1_mean']).toBe('3/5');
+    expect(overall?.['reference_mean']).toBe('3/5');
+    expect(overall?.['score_headroom']).toBe('2/5');
+    expect(overall?.['stable_positive_facts']).toBe('20');
+    expect(overall?.['disputed_positive_facts']).toBe('3');
+    const ordinary = rows.find((row) => row['scope'] === 'family' && row['key'] === 'ordinary');
+    expect(ordinary?.['denominator']).toBe('5331');
+    expect(ordinary?.['control_c1_count']).toBe('40');
+    expect(ordinary?.['control_c2_count']).toBe('40');
+    expect(ordinary?.['reference_rate']).toBe('40/5331');
+    expect(ordinary?.['control_rate_difference']).toBe('0/1');
+    expect(ordinary?.['rate_headroom']).toBe('true');
+    const leaveOneOut = rows.filter((row) => row['scope'] === 'leave_one_out');
+    expect(leaveOneOut.every((row) => row['threshold'] === '1/20')).toBe(true);
+    const markdown = renderRepeatabilityMarkdown(baseBlock(false), baseline, []);
+    expect(markdown).toContain('Stable-positive facts: 20');
+    expect(markdown).toContain('Control-disputed positive facts: 3');
+    expect(markdown).toContain('Leave-one-base-out controls');
+    expect(markdown.match(/- Remove 57630\d{2}:/gu)).toHaveLength(5);
+    expect(markdown).toContain('ordinary: denominator 5331');
+    expect(markdown).toContain('collision: denominator 348');
+  });
+
   it('keeps pooled ordinary and collision denominators fixed at 5331 and 348', () => {
     const result = calculatePromotion(promotionInput());
     expect(result.families.ordinary.denominator).toBe(5_331);
@@ -506,7 +812,7 @@
 
   it('renders machine-consistent overall, five-base, five-LOO, and family summary rows', () => {
     const input = promotionInput();
-    const csv = renderSummaryCsv(calculatePromotion(input), input);
+    const csv = renderSummaryCsv(calculatePromotion(input), input, controlBaseline(input));
     const lines = csv.trimEnd().split('\n');
     const columns = lines[0]!.split(',').length;
     expect(lines).toHaveLength(24);
@@ -514,9 +820,26 @@
       line.split(',').length === columns ? [] : [`${String(index)}:${line}`],
     )).toEqual([]);
     expect(lines[0]).toContain('condition_7');
+    expect(lines[0]).toContain('control_rate_difference');
+    expect(lines[0]).toContain('stable_positive_facts');
     expect(lines.filter((line) => line.startsWith('base,'))).toHaveLength(5);
     expect(lines.filter((line) => line.startsWith('leave_one_out,'))).toHaveLength(5);
     expect(lines.filter((line) => line.startsWith('family_base,'))).toHaveLength(10);
+    const headings = lines[0]!.split(',');
+    const rows = lines.slice(1).map((line) => Object.fromEntries(
+      headings.map((heading, index) => [heading, line.split(',')[index]]),
+    ));
+    const overall = rows.find((row) => row['scope'] === 'overall');
+    expect(overall?.['stable_positive_facts']).toBe('20');
+    expect(overall?.['disputed_positive_facts']).toBe('3');
+    expect(overall?.['stable_positive_losses']).toBe('0');
+    const ordinary = rows.find((row) => row['scope'] === 'family' && row['key'] === 'ordinary');
+    expect(ordinary?.['control_c1_rate']).toBe('40/5331');
+    expect(ordinary?.['control_c2_rate']).toBe('40/5331');
+    expect(ordinary?.['control_rate_difference']).toBe('0/1');
+    expect(ordinary?.['rate_headroom']).toBe('true');
+    const leaveOneOut = rows.filter((row) => row['scope'] === 'leave_one_out');
+    expect(leaveOneOut.every((row) => row['threshold'] === '1/20')).toBe(true);
   });
 });
 
@@ -552,10 +875,17 @@
     const input = promotionInput();
     input.states = input.states.map((state) => ({
       ...state,
-      candidate: state.base === '5763040' ? score(1, 1) : score(3, 5),
+      candidate: state.base === '5763006'
+        || state.base === '5763022'
+        || state.base === '5763027'
+        ? score(7, 10)
+        : state.base === '5763040'
+          ? score(1, 1)
+          : score(3, 10),
     }));
-    expect(calculatePromotion(input).leaveOneOut['5763040'].comparison).toBe('zero');
-    expect(calculatePromotion(input).conditions[2]).toBe(false);
+    const result = calculatePromotion(input);
+    expect(result.leaveOneOut['5763040'].comparison).toBe('zero');
+    expect(result.conditions).toEqual([true, true, false, true, true, true, true]);
   });
 
   it('condition 4 fails on one stable-positive loss', () => {
@@ -600,16 +930,19 @@
   it('condition 6 fails at 24.999 percent reduction and passes at exact 25 percent', () => {
     const input = promotionInput();
     for (const base of QSFOG_BASES) {
-      input.families.ordinary.c1ByBase[base] = 8_000;
-      input.families.ordinary.c2ByBase[base] = 8_000;
-      input.families.ordinary.candidateByBase[base] = 6_001;
+      input.families.ordinary.denominatorByBase[base] = 100_000;
+      input.families.ordinary.c1ByBase[base] = 20_000;
+      input.families.ordinary.c2ByBase[base] = 20_000;
+      input.families.ordinary.candidateByBase[base] = 15_000;
     }
-    expect(calculatePromotion(input).conditions[5]).toBe(false);
-    input.families.ordinary.candidateByBase['5763006'] = 6_000;
-    for (const base of QSFOG_BASES.slice(1)) {
-      input.families.ordinary.candidateByBase[base] = 6_000;
-    }
-    expect(calculatePromotion(input).conditions[5]).toBe(true);
+    input.families.ordinary.candidateByBase['5763006'] = 15_001;
+    const below = calculatePromotion(input);
+    expect(below.families.ordinary.relativeReduction).toEqual(fraction(24_999, 100_000));
+    expect(below.conditions[5]).toBe(false);
+    input.families.ordinary.candidateByBase['5763006'] = 15_000;
+    const exact = calculatePromotion(input);
+    expect(exact.families.ordinary.relativeReduction).toEqual(fraction(1, 4));
+    expect(exact.conditions[5]).toBe(true);
   });
 
   it('condition 6 fails at exactly twice spread and passes at the next rational step', () => {
@@ -673,10 +1006,15 @@
     const input = promotionInput();
     input.families.ordinary.c1ByBase['5763006'] = 7;
     input.families.ordinary.c2ByBase['5763006'] = 8;
-    const result = calculatePromotion(input);
-    expect(result.families.ordinary.referenceCount).toEqual(fraction(79, 2));
+    const odd = calculatePromotion(input);
+    expect(odd.families.ordinary.referenceCount).toEqual(fraction(79, 2));
+    expect(odd.families.ordinary.referenceRate).toEqual(fraction(79, 10_662));
+    expect(odd.conditions[5]).toBe(false);
     input.families.ordinary.c1ByBase['5763006'] = 8;
-    expect(calculatePromotion(input).families.ordinary.referenceCount).toEqual(fraction(40));
+    const even = calculatePromotion(input);
+    expect(even.families.ordinary.referenceCount).toEqual(fraction(40));
+    expect(even.families.ordinary.referenceRate).toEqual(fraction(40, 5_331));
+    expect(even.conditions[5]).toBe(true);
   });
 
   it('condition 7 rejects false authentication and false eligibility independently', () => {
@@ -800,7 +1138,7 @@
       const sourceImageSetSha256 = createHash('sha256').update(sourceImageSet).digest('hex');
       const block = baseBlock(false);
       block.invocationPolicy.states = 1;
-      block.paths.identityManifest = relative(repositoryRoot, join(directory, 'identity'));
+      block.paths.identityManifest = relative(repositoryRoot, join(directory, 'identity', 'manifest.json'));
       block.paths.c1Jsonl = relative(repositoryRoot, join(directory, 'c1.jsonl'));
       block.paths.c1ImagesRoot = relative(repositoryRoot, join(directory, 'c1-images'));
       block.paths.c1Summary = relative(repositoryRoot, join(directory, 'c1-summary.md'));
@@ -813,7 +1151,7 @@
       block.hashes.probeTestSha256 = createHash('sha256').update('probe-test').digest('hex');
       block.freezeSha256 = computeBlockFreezeSha256(block);
       block.unusedPathPreflight.paths = [
-        block.paths.identityManifest,
+        dirname(block.paths.identityManifest),
         block.paths.c1Jsonl,
         block.paths.c1ImagesRoot,
         block.paths.c1Summary,
@@ -834,7 +1172,7 @@
         seed: 20260910,
         model: 'gpt-5.6-sol:high',
         question: 'Q9',
-        outDirectory: resolve(repositoryRoot, block.paths.identityManifest),
+        outDirectory: dirname(resolve(repositoryRoot, block.paths.identityManifest)),
       }, {
         candidates: [candidate],
         currentHead: REVISION,
diff --git a/tools/qsfog-intervention-report.ts b/tools/qsfog-intervention-report.ts
index 0e7f68512e36933f30a56ff77eb583c3b7499270..d05d0dcb7f3f4eee679668add5fdd0cef90b63ef
--- a/tools/qsfog-intervention-report.ts
+++ b/tools/qsfog-intervention-report.ts
@@ -344,6 +344,77 @@
   states: z.record(z.string().min(1), imageManifestEntrySchema),
   manipulationValidation: z.unknown(),
 }).strict();
+const finiteNumberRecordSchema = z.record(z.string().min(1), z.number().finite());
+const changedRegionSchema = z.object({
+  pixels: z.number().int().nonnegative(),
+  outsidePixels: z.literal(0),
+  fraction: z.number().finite().min(0).max(1),
+  bounds: finiteNumberRecordSchema.nullable(),
+  perFogCell: z.union([
+    z.array(finiteNumberRecordSchema),
+    finiteNumberRecordSchema,
+  ]),
+}).strict();
+const candidateStateEvidenceSchema = z.object({
+  stateDigest: sha256Schema,
+  truthSha256: sha256Schema,
+  sourcePngSha256: sha256Schema,
+  resultPngSha256: sha256Schema,
+  a1PngSha256: sha256Schema,
+  a1RgbaSha256: sha256Schema,
+  bRgbaSha256: sha256Schema,
+  a3PngSha256: sha256Schema,
+  a3RgbaSha256: sha256Schema,
+  visualDomBeforeSha256: sha256Schema,
+  visualDomAfterSha256: sha256Schema,
+  visualDomRestoredSha256: sha256Schema,
+  serviceManifestSha256: sha256Schema,
+  changedRegion: changedRegionSchema,
+  restoreExact: z.literal(true),
+  archivedControlEligible: z.boolean(),
+}).strict();
+const candidateManipulationValidationSchema = z.object({
+  version: z.literal('qsfog-live-dom-asset-replacement-v1'),
+  blockId: z.string().min(1),
+  blockFreezeSha256: sha256Schema,
+  probeHarnessSha256: sha256Schema,
+  sourceRows: z.object({
+    path: repositoryPathSchema,
+    sha256: sha256Schema,
+    rows: z.literal(1_008),
+  }).strict(),
+  sourceImageSetSha256: sha256Schema,
+  assets: z.object({
+    original: z.object({
+      id: z.literal('art.fog.hidden.v1'),
+      pngSha256: sha256Schema,
+      rgbaSha256: sha256Schema,
+      width: z.literal(128),
+      height: z.literal(128),
+    }).strict(),
+    replacement: z.object({
+      id: z.literal('art.fog.hidden.v1'),
+      svgSha256: sha256Schema,
+      pngSha256: sha256Schema,
+      rgbaSha256: sha256Schema,
+      width: z.literal(128),
+      height: z.literal(128),
+    }).strict(),
+  }).strict(),
+  renderer: z.object({
+    playwrightVersion: z.string().min(1),
+    chromiumVersion: z.string().min(1),
+    executableSha256: sha256Schema,
+    viewport: z.object({ width: z.literal(1280), height: z.literal(1280) }).strict(),
+    deviceScaleFactor: z.literal(1),
+    locale: z.literal('en-US'),
+    timezoneId: z.literal('UTC'),
+    colorScheme: z.literal('dark'),
+    reducedMotion: z.literal('reduce'),
+    capturePolicy: z.literal('encounter-board-element-settled-v1'),
+  }).strict(),
+  states: z.record(z.string().min(1), candidateStateEvidenceSchema),
+}).strict();
 const snapshotArtifactSchema = z.object({
   version: z.literal('arena-board-image-v1'),
   audience: z.literal('dm'),
@@ -457,7 +528,7 @@
   includeCandidate: boolean,
 ): readonly [keyof QsFogSupervisorBlock['paths'], string][] {
   const common: Array<[keyof QsFogSupervisorBlock['paths'], string]> = [
-    ['identityManifest', block.paths.identityManifest],
+    ['identityManifest', dirname(block.paths.identityManifest)],
     ['c1Jsonl', block.paths.c1Jsonl],
     ['c1ImagesRoot', block.paths.c1ImagesRoot],
     ['c1Summary', block.paths.c1Summary],
@@ -476,7 +547,11 @@
   ];
 }
 
-function validatePlannedPathContract(block: QsFogSupervisorBlock, includeCandidate: boolean): void {
+function validatePlannedPathContract(
+  block: QsFogSupervisorBlock,
+  includeCandidate: boolean,
+  root: string,
+): void {
   if (block.paths.c1Summary !== deriveProbeSummaryPath(block.paths.c1Jsonl)) {
     throw new Error('c1Summary does not match the derived probe summary path.');
   }
@@ -491,6 +566,22 @@
   if (canonicalJson(planned) !== canonicalJson(recorded)) {
     throw new Error('unusedPathPreflight.paths differs from the exact planned output set.');
   }
+  const resolved = plannedPathEntries(block, includeCandidate).map(([name, path]) => ({
+    name,
+    path: resolveRepositoryPath(root, path, String(name)),
+  }));
+  for (let leftIndex = 0; leftIndex < resolved.length; leftIndex += 1) {
+    for (let rightIndex = leftIndex + 1; rightIndex < resolved.length; rightIndex += 1) {
+      const left = resolved[leftIndex]!;
+      const right = resolved[rightIndex]!;
+      if (left.path === right.path) {
+        throw new Error(`Planned output overlap: ${String(left.name)} and ${String(right.name)}.`);
+      }
+      if (left.path.startsWith(`${right.path}${sep}`) || right.path.startsWith(`${left.path}${sep}`)) {
+        throw new Error(`Planned output ancestry conflict: ${String(left.name)} and ${String(right.name)}.`);
+      }
+    }
+  }
 }
 
 export async function assertUnusedBlockPaths(
@@ -499,7 +590,7 @@
   includeCandidate: boolean,
 ): Promise<void> {
   const block = parseSupervisorBlock(blockInput);
-  validatePlannedPathContract(block, includeCandidate);
+  validatePlannedPathContract(block, includeCandidate, root);
   for (const [name, path] of plannedPathEntries(block, includeCandidate)) {
     const resolved = resolveRepositoryPath(root, path, String(name));
     try {
@@ -529,7 +620,6 @@
       sourceRowsSha256: block.hashes.sourceRowsSha256,
       diagnosisSha256: block.hashes.diagnosisSha256,
       sourceImageSetSha256: block.hashes.sourceImageSetSha256,
-      candidateManifestSha256: block.hashes.candidateManifestSha256,
     },
     invocationPolicy: block.invocationPolicy,
     paths: block.paths,
@@ -569,6 +659,7 @@
 
 export function validateCompletedBlock(blockInput: QsFogSupervisorBlock, includeCandidate: boolean): void {
   const block = parseSupervisorBlock(blockInput);
+  validatePlannedPathContract(block, block.paths.candidateManifest !== null, repositoryRoot);
   if (block.freezeSha256 !== computeBlockFreezeSha256(block)) {
     throw new Error('Block freeze SHA-256 is stale.');
   }
@@ -607,6 +698,15 @@
   if (times.at(-1)!.milliseconds - times[0]!.milliseconds > TWO_HOURS_MS) {
     throw new Error('Whole block exceeds two hours of elapsed time.');
   }
+  const c1StartedAt = times[0]!.milliseconds;
+  const pausedAt = validateZonedTimestamp(block.allLanesPaused.at, 'all-lanes-paused attestation');
+  if (pausedAt > c1StartedAt) {
+    throw new Error('All-lanes-paused attestation occurs after C1 started.');
+  }
+  const preflightAt = validateZonedTimestamp(block.unusedPathPreflight.checkedAt, 'unused-path preflight');
+  if (preflightAt > c1StartedAt) {
+    throw new Error('Unused-path preflight occurs after C1 started.');
+  }
   const continuity = block.wholeBlockContinuity;
   const finalArm = includeCandidate ? 'frame5' : 'C2';
   if (continuity.fromArm !== 'C1' || continuity.throughArm !== finalArm) {
@@ -637,8 +737,8 @@
 }
 
 export interface RationalValue {
-  numerator: number;
-  denominator: number;
+  numerator: string;
+  denominator: string;
 }
 
 function gcd(left: bigint, right: bigint): bigint {
@@ -652,7 +752,10 @@
   return a === 0n ? 1n : a;
 }
 
-function rational(numerator: number | bigint, denominator: number | bigint = 1): InternalRational {
+function rational(
+  numerator: number | bigint | string,
+  denominator: number | bigint | string = 1,
+): InternalRational {
   let top = typeof numerator === 'bigint' ? numerator : BigInt(numerator);
   let bottom = typeof denominator === 'bigint' ? denominator : BigInt(denominator);
   if (bottom === 0n) {
@@ -706,12 +809,10 @@
 }
 
 function external(value: InternalRational): RationalValue {
-  const numerator = Number(value.numerator);
-  const denominator = Number(value.denominator);
-  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
-    throw new RangeError('Rational result exceeds safe integer presentation.');
-  }
-  return { numerator, denominator };
+  return {
+    numerator: value.numerator.toString(),
+    denominator: value.denominator.toString(),
+  };
 }
 
 function decimal(value: InternalRational): number {
@@ -787,6 +888,174 @@
   };
 }
 
+export interface ControlFamilyCounts {
+  denominatorByBase: Record<QsFogBase, number>;
+  c1ByBase: Record<QsFogBase, number>;
+  c2ByBase: Record<QsFogBase, number>;
+}
+
+export interface ControlBaselineInput {
+  states: readonly RepeatabilityState[];
+  families: Record<'ordinary' | 'collision', ControlFamilyCounts>;
+  fogFalseNegatives: { c1: number; c2: number };
+  obscurementFalseNegatives: { c1: number; c2: number };
+  stablePositiveFacts: number;
+  disputedPositiveFacts: number;
+}
+
+interface ControlScoreSummary {
+  c1Mean: RationalValue;
+  c2Mean: RationalValue;
+  referenceMean: RationalValue;
+  headroom: RationalValue;
+}
+
+interface ControlFamilyResult {
+  denominator: number;
+  c1Count: number;
+  c2Count: number;
+  referenceCount: RationalValue;
+  c1Rate: RationalValue;
+  c2Rate: RationalValue;
+  referenceRate: RationalValue;
+  overallDifference: RationalValue;
+  spread: RationalValue;
+  headroom: boolean;
+  byBase: Record<QsFogBase, {
+    denominator: number;
+    c1Count: number;
+    c2Count: number;
+    referenceCount: RationalValue;
+    c1Rate: RationalValue;
+    c2Rate: RationalValue;
+    referenceRate: RationalValue;
+    spread: RationalValue;
+    headroom: boolean;
+  }>;
+}
+
+function controlScoreSummary(states: readonly RepeatabilityState[]): ControlScoreSummary {
+  if (states.length === 0) {
+    return {
+      c1Mean: external(rational(0)),
+      c2Mean: external(rational(0)),
+      referenceMean: external(rational(0)),
+      headroom: external(rational(1)),
+    };
+  }
+  const c1Mean = mean(states.map((state) => scoreFraction(state.c1)));
+  const c2Mean = mean(states.map((state) => scoreFraction(state.c2)));
+  const referenceMean = divide(add(c1Mean, c2Mean), rational(2));
+  return {
+    c1Mean: external(c1Mean),
+    c2Mean: external(c2Mean),
+    referenceMean: external(referenceMean),
+    headroom: external(subtract(rational(1), referenceMean)),
+  };
+}
+
+function controlFamilyResult(family: ControlFamilyCounts): ControlFamilyResult {
+  const denominator = sumCounts(family.denominatorByBase);
+  const c1Count = sumCounts(family.c1ByBase);
+  const c2Count = sumCounts(family.c2ByBase);
+  const referenceCount = rational(c1Count + c2Count, 2);
+  const c1Rate = rational(c1Count, denominator);
+  const c2Rate = rational(c2Count, denominator);
+  const referenceRate = divide(referenceCount, rational(denominator));
+  const byBase = Object.fromEntries(QSFOG_BASES.map((base) => {
+    const baseDenominator = family.denominatorByBase[base];
+    const baseC1Rate = rational(family.c1ByBase[base], baseDenominator);
+    const baseC2Rate = rational(family.c2ByBase[base], baseDenominator);
+    const baseReferenceCount = rational(family.c1ByBase[base] + family.c2ByBase[base], 2);
+    const baseReferenceRate = divide(baseReferenceCount, rational(baseDenominator));
+    const baseSpread = absolute(subtract(baseC1Rate, baseC2Rate));
+    return [base, {
+      denominator: baseDenominator,
+      c1Count: family.c1ByBase[base],
+      c2Count: family.c2ByBase[base],
+      referenceCount: external(baseReferenceCount),
+      c1Rate: external(baseC1Rate),
+      c2Rate: external(baseC2Rate),
+      referenceRate: external(baseReferenceRate),
+      spread: external(baseSpread),
+      headroom: baseReferenceCount.numerator !== 0n
+        && compare(baseReferenceRate, multiply(rational(2), baseSpread)) > 0,
+    }];
+  })) as ControlFamilyResult['byBase'];
+  const spread = QSFOG_BASES.map((base) => rational(
+    byBase[base].spread.numerator,
+    byBase[base].spread.denominator,
+  )).reduce(maximum, rational(0));
+  return {
+    denominator,
+    c1Count,
+    c2Count,
+    referenceCount: external(referenceCount),
+    c1Rate: external(c1Rate),
+    c2Rate: external(c2Rate),
+    referenceRate: external(referenceRate),
+    overallDifference: external(absolute(subtract(c1Rate, c2Rate))),
+    spread: external(spread),
+    headroom: referenceCount.numerator !== 0n
+      && compare(referenceRate, multiply(rational(2), spread)) > 0,
+    byBase,
+  };
+}
+
+export function calculateControlBaseline(input: ControlBaselineInput): {
+  repeatability: ReturnType<typeof calculateRepeatability>;
+  overall: ControlScoreSummary;
+  byBase: Record<QsFogBase, ControlScoreSummary>;
+  leaveOneOut: Record<QsFogBase, ControlScoreSummary & {
+    spread: RationalValue;
+    meanDifference: RationalValue;
+    threshold: RationalValue;
+  }>;
+  families: Record<'ordinary' | 'collision', ControlFamilyResult>;
+  fogFalseNegatives: { c1: number; c2: number };
+  obscurementFalseNegatives: { c1: number; c2: number };
+  stablePositiveFacts: number;
+  disputedPositiveFacts: number;
+} {
+  const repeatability = calculateRepeatability(input.states);
+  const byBase = Object.fromEntries(QSFOG_BASES.map((base) => [
+    base,
+    controlScoreSummary(input.states.filter((state) => state.base === base)),
+  ])) as Record<QsFogBase, ControlScoreSummary>;
+  const leaveOneOut = Object.fromEntries(QSFOG_BASES.map((base) => {
+    const retained = input.states.filter((state) => state.base !== base);
+    const retainedRepeatability = calculateRepeatability(retained);
+    const summary = controlScoreSummary(retained);
+    return [base, {
+      ...summary,
+      spread: retainedRepeatability.spread,
+      meanDifference: external(absolute(subtract(
+        rational(summary.c1Mean.numerator, summary.c1Mean.denominator),
+        rational(summary.c2Mean.numerator, summary.c2Mean.denominator),
+      ))),
+      threshold: retainedRepeatability.threshold,
+    }];
+  })) as Record<QsFogBase, ControlScoreSummary & {
+    spread: RationalValue;
+    meanDifference: RationalValue;
+    threshold: RationalValue;
+  }>;
+  return {
+    repeatability,
+    overall: controlScoreSummary(input.states),
+    byBase,
+    leaveOneOut,
+    families: {
+      ordinary: controlFamilyResult(input.families.ordinary),
+      collision: controlFamilyResult(input.families.collision),
+    },
+    fogFalseNegatives: input.fogFalseNegatives,
+    obscurementFalseNegatives: input.obscurementFalseNegatives,
+    stablePositiveFacts: input.stablePositiveFacts,
+    disputedPositiveFacts: input.disputedPositiveFacts,
+  };
+}
+
 export interface FamilyCounts {
   denominatorByBase: Record<QsFogBase, number>;
   c1ByBase: Record<QsFogBase, number>;
@@ -1229,14 +1498,10 @@
   const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
   if (bytes.length < 45 || !bytes.subarray(0, 8).equals(signature)) {
     throw new TypeError('PNG signature or required chunks are missing.');
-  }
-  if (bytes.readUInt32BE(8) !== 13 || bytes.subarray(12, 16).toString('ascii') !== 'IHDR') {
-    throw new TypeError('PNG must begin with a 13-byte IHDR chunk.');
   }
-  if (bytes.readUInt32BE(29) !== pngCrc32(bytes.subarray(12, 29))) {
-    throw new TypeError('PNG IHDR CRC is invalid.');
-  }
   let offset = 8;
+  let chunkIndex = 0;
+  let foundIdat = false;
   let foundIend = false;
   while (offset + 12 <= bytes.length) {
     const length = bytes.readUInt32BE(offset);
@@ -1245,13 +1510,28 @@
       throw new TypeError('PNG chunk is truncated.');
     }
     const type = bytes.subarray(offset + 4, offset + 8).toString('ascii');
+    const expectedCrc = pngCrc32(bytes.subarray(offset + 4, offset + 8 + length));
+    if (bytes.readUInt32BE(offset + 8 + length) !== expectedCrc) {
+      throw new TypeError(`PNG ${type} CRC is invalid.`);
+    }
+    if (chunkIndex === 0 && (type !== 'IHDR' || length !== 13)) {
+      throw new TypeError('PNG must begin with a 13-byte IHDR chunk.');
+    }
+    if (chunkIndex > 0 && type === 'IHDR') {
+      throw new TypeError('PNG IHDR must be the first and only IHDR chunk.');
+    }
+    if (type === 'IDAT') {
+      foundIdat = true;
+    }
     if (type === 'IEND') {
-      foundIend = length === 0
-        && end === bytes.length
-        && bytes.readUInt32BE(offset + 8) === pngCrc32(bytes.subarray(offset + 4, offset + 8));
+      foundIend = length === 0 && end === bytes.length;
       break;
     }
     offset = end;
+    chunkIndex += 1;
+  }
+  if (!foundIdat) {
+    throw new TypeError('PNG IDAT chunk is missing.');
   }
   if (!foundIend) {
     throw new TypeError('PNG IEND chunk is missing or malformed.');
@@ -1468,7 +1748,12 @@
   if (block.invocationPolicy.states !== options.states) {
     throw new Error('Identity state count differs from the supervisor block.');
   }
-  if (resolve(options.repositoryRoot, block.paths.identityManifest) !== resolve(options.outDirectory)) {
+  const identityManifestPath = resolveRepositoryPath(
+    options.repositoryRoot,
+    block.paths.identityManifest,
+    'identityManifest',
+  );
+  if (identityManifestPath !== join(resolve(options.outDirectory), 'manifest.json')) {
     throw new Error('Identity output differs from the supervisor block path.');
   }
   await authenticateFreeze(options, block, dependencies);
@@ -1767,19 +2052,35 @@
   }
 }
 
-function candidateEligibility(
-  manifest: z.infer<typeof imageOverrideManifestSchema>,
+export function validateCandidateEligibility(
+  manifestInput: unknown,
   states: readonly string[],
 ): boolean {
-  const manipulation = record(manifest.manipulationValidation);
-  if (manipulation === null) {
-    throw new Error('Candidate manipulationValidation must be an object.');
+  const manifest = imageOverrideManifestSchema.parse(manifestInput);
+  const manipulation = candidateManipulationValidationSchema.parse(manifest.manipulationValidation);
+  const evidenceKeys = Object.keys(manipulation.states).sort();
+  if (canonicalJson(evidenceKeys) !== canonicalJson([...states].sort())) {
+    throw new Error('Candidate eligibility evidence differs from the exact frozen state set.');
   }
-  const stateEvidence = record(manipulation['states']);
-  if (stateEvidence === null) {
-    throw new Error('Candidate manipulationValidation lacks state eligibility evidence.');
+  for (const state of states) {
+    const entry = manifest.states[state];
+    const evidence = manipulation.states[state];
+    if (entry === undefined || evidence === undefined) {
+      throw new Error(`Candidate eligibility evidence is absent for ${state}.`);
+    }
+    if (evidence.sourcePngSha256 !== entry.sourcePng.sha256
+      || evidence.resultPngSha256 !== entry.sha256
+      || evidence.a1PngSha256 !== evidence.a3PngSha256
+      || evidence.a1RgbaSha256 !== evidence.a3RgbaSha256
+      || evidence.visualDomBeforeSha256 !== evidence.visualDomRestoredSha256) {
+      throw new Error(`Candidate capture provenance is inconsistent for ${state}.`);
+    }
+    const unchangedArchivedPng = evidence.a1PngSha256 === evidence.sourcePngSha256;
+    if (evidence.archivedControlEligible !== unchangedArchivedPng) {
+      throw new Error(`Candidate archived-control eligibility is inconsistent for ${state}.`);
+    }
   }
-  return states.every((state) => record(stateEvidence[state])?.['archivedControlEligible'] === true);
+  return states.every((state) => manipulation.states[state]!.archivedControlEligible);
 }
 
 export interface PairedStateRow {
@@ -1874,6 +2175,7 @@
 export function renderSummaryCsv(
   result: ReturnType<typeof calculatePromotion>,
   input: PromotionInput,
+  baseline: ReturnType<typeof calculateControlBaseline>,
 ): string {
   const headings = [
     'scope',
@@ -1906,6 +2208,16 @@
     'condition_6',
     'condition_7',
     'passes',
+    'control_c1_count',
+    'control_c2_count',
+    'control_c1_rate',
+    'control_c2_rate',
+    'control_rate_difference',
+    'rate_headroom',
+    'twice_spread_below_headroom',
+    'stable_positive_facts',
+    'disputed_positive_facts',
+    'stable_positive_losses',
     'verdict',
   ];
   const conditionColumns = result.conditions.map(String);
@@ -1924,6 +2236,7 @@
   const overallRepeatability = calculateRepeatability(input.states);
   const emptyFamilyColumns = ['', '', '', '', '', '', ''];
   const emptyFnColumns = ['', '', '', '', '', ''];
+  const emptyControlDetails = ['', '', '', '', '', '', '', '', '', ''];
   const lines = [headings.join(',')];
   lines.push([
     'overall',
@@ -1944,6 +2257,16 @@
     input.obscurementFalseNegatives.candidate,
     ...conditionColumns,
     result.conditions[0],
+    '',
+    '',
+    '',
+    '',
+    '',
+    '',
+    '',
+    baseline.stablePositiveFacts,
+    baseline.disputedPositiveFacts,
+    input.stablePositiveLosses,
     result.verdict,
   ].map(csvCell).join(','));
   for (const base of QSFOG_BASES) {
@@ -1963,6 +2286,7 @@
       ...emptyFnColumns,
       ...conditionColumns,
       row.passes,
+      ...emptyControlDetails,
       result.verdict,
     ].map(csvCell).join(','));
   }
@@ -1976,7 +2300,7 @@
       'leave_one_out',
       base,
       rationalText(row.delta),
-      '',
+      rationalText(retainedRepeatability.threshold),
       rationalText(retainedRepeatability.spread),
       rationalText(external(scores.c1Mean)),
       rationalText(external(scores.c2Mean)),
@@ -1986,12 +2310,14 @@
       ...emptyFnColumns,
       ...conditionColumns,
       row.comparison,
+      ...emptyControlDetails,
       result.verdict,
     ].map(csvCell).join(','));
   }
   for (const name of ['ordinary', 'collision'] as const) {
     const family = result.families[name];
     const familyInput = input.families[name];
+    const control = baseline.families[name];
     const quarterBit = family.relativeReduction !== null
       && compare(
         rational(family.relativeReduction.numerator, family.relativeReduction.denominator),
@@ -2021,6 +2347,16 @@
       ...emptyFnColumns,
       ...conditionColumns,
       family.qualifies,
+      control.c1Count,
+      control.c2Count,
+      rationalText(control.c1Rate),
+      rationalText(control.c2Rate),
+      rationalText(control.overallDifference),
+      control.headroom,
+      control.headroom,
+      '',
+      '',
+      '',
       result.verdict,
     ].map(csvCell).join(','));
     for (const base of QSFOG_BASES) {
@@ -2039,6 +2375,7 @@
       const relativeReduction = referenceCount.numerator === 0n
         ? null
         : divide(reduction, referenceRate);
+      const controlBase = control.byBase[base];
       lines.push([
         'family_base',
         `${name}:${base}`,
@@ -2059,6 +2396,16 @@
         ...emptyFnColumns,
         ...conditionColumns,
         compare(candidateRate, referenceRate) <= 0,
+        controlBase.c1Count,
+        controlBase.c2Count,
+        rationalText(controlBase.c1Rate),
+        rationalText(controlBase.c2Rate),
+        rationalText(controlBase.spread),
+        controlBase.headroom,
+        controlBase.headroom,
+        '',
+        '',
+        '',
         result.verdict,
       ].map(csvCell).join(','));
     }
@@ -2069,10 +2416,20 @@
 export function renderReportMarkdown(
   block: QsFogSupervisorBlock,
   result: ReturnType<typeof calculatePromotion>,
+  baseline: ReturnType<typeof calculateControlBaseline>,
   states: readonly PairedStateRow[],
   stablePositiveLosses: number,
   disputedPositiveFacts: number,
 ): string {
+  const candidateStates = states.filter((state) => state.arm !== 'C1' && state.arm !== 'C2');
+  const candidateFogFalseNegatives = candidateStates.reduce(
+    (sum, state) => sum + state.accounting.fogFalseNegatives,
+    0,
+  );
+  const candidateObscuredFalseNegatives = candidateStates.reduce(
+    (sum, state) => sum + state.accounting.obscuredFalseNegatives,
+    0,
+  );
   const lines = [
     '# QSFOG intervention report',
     '',
@@ -2081,11 +2438,20 @@
     `- Whole interval: ${block.wholeBlockContinuity.startedAt} through ${block.wholeBlockContinuity.endedAt}`,
     `- Authenticated arm/state rows: ${String(states.length)}`,
     `- Repeatability threshold: ${rationalText(result.threshold)}`,
+    `- Control C1/C2 means: ${rationalText(baseline.overall.c1Mean)} / `
+      + `${rationalText(baseline.overall.c2Mean)}`,
+    `- Control reference mean/headroom: ${rationalText(baseline.overall.referenceMean)} / `
+      + `${rationalText(baseline.overall.headroom)}`,
     `- Overall candidate delta: ${rationalText(result.overallDelta)}`,
     `- Ordinary denominator: ${String(result.families.ordinary.denominator)}`,
     `- Collision denominator: ${String(result.families.collision.denominator)}`,
     `- Stable-positive losses: ${String(stablePositiveLosses)}`,
+    `- Stable-positive facts: ${String(baseline.stablePositiveFacts)}`,
     `- Control-disputed positive facts: ${String(disputedPositiveFacts)}`,
+    `- Fog FN C1/C2/candidate: ${String(baseline.fogFalseNegatives.c1)}/`
+      + `${String(baseline.fogFalseNegatives.c2)}/${String(candidateFogFalseNegatives)}`,
+    `- Obscurement FN C1/C2/candidate: ${String(baseline.obscurementFalseNegatives.c1)}/`
+      + `${String(baseline.obscurementFalseNegatives.c2)}/${String(candidateObscuredFalseNegatives)}`,
     `- Conditions 1-7: ${result.conditions.map((value) => value ? 'PASS' : 'FAIL').join(', ')}`,
     '',
     '## Base thresholds',
@@ -2093,9 +2459,11 @@
   ];
   for (const base of QSFOG_BASES) {
     const row = result.byBase[base];
+    const control = baseline.byBase[base];
     lines.push(
       `- ${base}: delta ${rationalText(row.delta)}, threshold ${rationalText(row.threshold)}, `
-        + `${row.passes ? 'PASS' : 'FAIL'}`,
+        + `control reference ${rationalText(control.referenceMean)}, `
+        + `headroom ${rationalText(control.headroom)}, ${row.passes ? 'PASS' : 'FAIL'}`,
     );
   }
   lines.push('', '## Leave-one-base-out', '');
@@ -2107,13 +2475,21 @@
     '',
     '## Fixed-denominator error families',
     '',
-    `- Ordinary: reference ${rationalText(result.families.ordinary.referenceRate)}, `
+    `- Ordinary: control C1/C2 ${rationalText(baseline.families.ordinary.c1Rate)} / `
+      + `${rationalText(baseline.families.ordinary.c2Rate)}, control difference `
+      + `${rationalText(baseline.families.ordinary.overallDifference)}, `
+      + `reference ${rationalText(result.families.ordinary.referenceRate)}, `
       + `candidate ${rationalText(result.families.ordinary.candidateRate)}, `
       + `spread ${rationalText(result.families.ordinary.spread)}, `
+      + `headroom ${String(baseline.families.ordinary.headroom)}, `
       + `qualifies ${String(result.families.ordinary.qualifies)}.`,
-    `- Collision: reference ${rationalText(result.families.collision.referenceRate)}, `
+    `- Collision: control C1/C2 ${rationalText(baseline.families.collision.c1Rate)} / `
+      + `${rationalText(baseline.families.collision.c2Rate)}, control difference `
+      + `${rationalText(baseline.families.collision.overallDifference)}, `
+      + `reference ${rationalText(result.families.collision.referenceRate)}, `
       + `candidate ${rationalText(result.families.collision.candidateRate)}, `
       + `spread ${rationalText(result.families.collision.spread)}, `
+      + `headroom ${String(baseline.families.collision.headroom)}, `
       + `qualifies ${String(result.families.collision.qualifies)}.`,
     '',
     `## Verdict: ${result.verdict}`,
@@ -2123,47 +2499,221 @@
 }
 
 export function renderRepeatabilitySummaryCsv(
-  result: ReturnType<typeof calculateRepeatability>,
+  baseline: ReturnType<typeof calculateControlBaseline>,
 ): string {
-  const lines = ['scope,key,spread,mean_difference,threshold'];
+  const headings = [
+    'scope',
+    'key',
+    'control_spread',
+    'control_mean_difference',
+    'threshold',
+    'control_c1_mean',
+    'control_c2_mean',
+    'reference_mean',
+    'score_headroom',
+    'denominator',
+    'control_c1_count',
+    'control_c2_count',
+    'reference_count',
+    'control_c1_rate',
+    'control_c2_rate',
+    'reference_rate',
+    'control_rate_difference',
+    'rate_spread',
+    'rate_headroom',
+    'twice_spread_below_headroom',
+    'fog_fn_c1',
+    'fog_fn_c2',
+    'obscured_fn_c1',
+    'obscured_fn_c2',
+    'stable_positive_facts',
+    'disputed_positive_facts',
+    'verdict',
+  ];
+  const emptyFamily = ['', '', '', '', '', '', '', '', '', '', ''];
+  const emptyAccounting = ['', '', '', '', '', ''];
+  const lines = [headings.join(',')];
   lines.push([
     'overall',
     'all',
-    rationalText(result.spread),
-    '',
-    rationalText(result.threshold),
+    rationalText(baseline.repeatability.spread),
+    rationalText(external(absolute(subtract(
+      rational(baseline.overall.c1Mean.numerator, baseline.overall.c1Mean.denominator),
+      rational(baseline.overall.c2Mean.numerator, baseline.overall.c2Mean.denominator),
+    )))),
+    rationalText(baseline.repeatability.threshold),
+    rationalText(baseline.overall.c1Mean),
+    rationalText(baseline.overall.c2Mean),
+    rationalText(baseline.overall.referenceMean),
+    rationalText(baseline.overall.headroom),
+    ...emptyFamily,
+    baseline.fogFalseNegatives.c1,
+    baseline.fogFalseNegatives.c2,
+    baseline.obscurementFalseNegatives.c1,
+    baseline.obscurementFalseNegatives.c2,
+    baseline.stablePositiveFacts,
+    baseline.disputedPositiveFacts,
+    'REPEATABILITY_AUTHENTICATED',
   ].map(csvCell).join(','));
   for (const base of QSFOG_BASES) {
-    const row = result.byBase[base];
+    const row = baseline.repeatability.byBase[base];
+    const scores = baseline.byBase[base];
     lines.push([
       'base',
       base,
       rationalText(row.spread),
       rationalText(row.meanDifference),
       rationalText(row.threshold),
+      rationalText(scores.c1Mean),
+      rationalText(scores.c2Mean),
+      rationalText(scores.referenceMean),
+      rationalText(scores.headroom),
+      ...emptyFamily,
+      ...emptyAccounting,
+      'REPEATABILITY_AUTHENTICATED',
+    ].map(csvCell).join(','));
+  }
+  for (const base of QSFOG_BASES) {
+    const row = baseline.leaveOneOut[base];
+    lines.push([
+      'leave_one_out',
+      base,
+      rationalText(row.spread),
+      rationalText(row.meanDifference),
+      rationalText(row.threshold),
+      rationalText(row.c1Mean),
+      rationalText(row.c2Mean),
+      rationalText(row.referenceMean),
+      rationalText(row.headroom),
+      ...emptyFamily,
+      ...emptyAccounting,
+      'REPEATABILITY_AUTHENTICATED',
     ].map(csvCell).join(','));
   }
+  for (const familyName of ['ordinary', 'collision'] as const) {
+    const family = baseline.families[familyName];
+    lines.push([
+      'family',
+      familyName,
+      '',
+      '',
+      '',
+      '',
+      '',
+      '',
+      '',
+      family.denominator,
+      family.c1Count,
+      family.c2Count,
+      rationalText(family.referenceCount),
+      rationalText(family.c1Rate),
+      rationalText(family.c2Rate),
+      rationalText(family.referenceRate),
+      rationalText(family.overallDifference),
+      rationalText(family.spread),
+      family.headroom,
+      family.headroom,
+      ...emptyAccounting,
+      'REPEATABILITY_AUTHENTICATED',
+    ].map(csvCell).join(','));
+    for (const base of QSFOG_BASES) {
+      const row = family.byBase[base];
+      lines.push([
+        'family_base',
+        `${familyName}:${base}`,
+        '',
+        '',
+        '',
+        '',
+        '',
+        '',
+        '',
+        row.denominator,
+        row.c1Count,
+        row.c2Count,
+        rationalText(row.referenceCount),
+        rationalText(row.c1Rate),
+        rationalText(row.c2Rate),
+        rationalText(row.referenceRate),
+        rationalText(row.spread),
+        rationalText(row.spread),
+        row.headroom,
+        row.headroom,
+        ...emptyAccounting,
+        'REPEATABILITY_AUTHENTICATED',
+      ].map(csvCell).join(','));
+    }
+  }
   return `${lines.join('\n')}\n`;
 }
 
 export function renderRepeatabilityMarkdown(
   block: QsFogSupervisorBlock,
-  result: ReturnType<typeof calculateRepeatability>,
+  baseline: ReturnType<typeof calculateControlBaseline>,
   states: readonly PairedStateRow[],
 ): string {
-  return [
+  const lines = [
     '# QSFOG repeatability report',
     '',
     `- Block: ${block.blockId}`,
     `- Freeze SHA-256: ${block.freezeSha256}`,
     `- Whole interval: ${block.wholeBlockContinuity.startedAt} through ${block.wholeBlockContinuity.endedAt}`,
     `- Authenticated arm/state rows: ${String(states.length)}`,
-    `- Conservative spread: ${rationalText(result.spread)}`,
-    `- Frozen threshold: ${rationalText(result.threshold)}`,
+    `- C1 mean: ${rationalText(baseline.overall.c1Mean)}`,
+    `- C2 mean: ${rationalText(baseline.overall.c2Mean)}`,
+    `- Reference mean: ${rationalText(baseline.overall.referenceMean)}`,
+    `- Score headroom: ${rationalText(baseline.overall.headroom)}`,
+    `- Conservative spread: ${rationalText(baseline.repeatability.spread)}`,
+    `- Frozen threshold: ${rationalText(baseline.repeatability.threshold)}`,
+    `- Fog FN C1/C2: ${String(baseline.fogFalseNegatives.c1)}/${String(baseline.fogFalseNegatives.c2)}`,
+    '- Obscurement FN C1/C2: '
+      + `${String(baseline.obscurementFalseNegatives.c1)}/${String(baseline.obscurementFalseNegatives.c2)}`,
+    `- Stable-positive facts: ${String(baseline.stablePositiveFacts)}`,
+    `- Control-disputed positive facts: ${String(baseline.disputedPositiveFacts)}`,
     '',
-    '## Verdict: REPEATABILITY_AUTHENTICATED',
+    '## Base repeatability and headroom',
     '',
-  ].join('\n');
+  ];
+  for (const base of QSFOG_BASES) {
+    const repeatability = baseline.repeatability.byBase[base];
+    const score = baseline.byBase[base];
+    lines.push(
+      `- ${base}: C1 ${rationalText(score.c1Mean)}, C2 ${rationalText(score.c2Mean)}, `
+        + `reference ${rationalText(score.referenceMean)}, spread ${rationalText(repeatability.spread)}, `
+        + `threshold ${rationalText(repeatability.threshold)}, headroom ${rationalText(score.headroom)}.`,
+    );
+  }
+  lines.push('', '## Leave-one-base-out controls', '');
+  for (const base of QSFOG_BASES) {
+    const row = baseline.leaveOneOut[base];
+    lines.push(
+      `- Remove ${base}: C1 ${rationalText(row.c1Mean)}, C2 ${rationalText(row.c2Mean)}, `
+        + `reference ${rationalText(row.referenceMean)}, spread ${rationalText(row.spread)}, `
+        + `threshold ${rationalText(row.threshold)}, headroom ${rationalText(row.headroom)}.`,
+    );
+  }
+  lines.push('', '## Fixed-denominator error families', '');
+  for (const familyName of ['ordinary', 'collision'] as const) {
+    const family = baseline.families[familyName];
+    lines.push(
+      `- ${familyName}: denominator ${String(family.denominator)}, counts C1/C2 `
+        + `${String(family.c1Count)}/${String(family.c2Count)}, rates C1/C2 `
+        + `${rationalText(family.c1Rate)}/${rationalText(family.c2Rate)}, reference `
+        + `${rationalText(family.referenceRate)}, pooled difference `
+        + `${rationalText(family.overallDifference)}, spread ${rationalText(family.spread)}, `
+        + `2*spread<headroom ${String(family.headroom)}.`,
+    );
+    for (const base of QSFOG_BASES) {
+      const row = family.byBase[base];
+      lines.push(
+        `  - ${base}: denominator ${String(row.denominator)}, counts C1/C2 `
+          + `${String(row.c1Count)}/${String(row.c2Count)}, reference ${rationalText(row.referenceRate)}, `
+          + `spread ${rationalText(row.spread)}, 2*spread<headroom ${String(row.headroom)}.`,
+      );
+    }
+  }
+  lines.push('', '## Verdict: REPEATABILITY_AUTHENTICATED', '');
+  return lines.join('\n');
 }
 
 async function writeExclusiveReports(
@@ -2250,7 +2800,7 @@
     || new Set(expectedStates).size !== expectedStates.length) {
     throw new Error('Source rows do not contain the exact frozen state set.');
   }
-  const identityPath = join(resolve(repositoryRoot, block.paths.identityManifest), 'manifest.json');
+  const identityPath = resolveRepositoryPath(repositoryRoot, block.paths.identityManifest, 'identityManifest');
   const identityBytes = await readFile(identityPath);
   if (block.hashes.identityManifestSha256 === null
     || sha256(identityBytes) !== block.hashes.identityManifestSha256) {
@@ -2338,7 +2888,28 @@
       throw new Error('Candidate manifest SHA-256 differs from the block.');
     }
     candidateManifest = imageOverrideManifestSchema.parse(parseJson(bytes, 'Candidate manifest'));
-    eligible = candidateEligibility(candidateManifest, expectedStates);
+    const candidateValidation = candidateManipulationValidationSchema.parse(
+      candidateManifest.manipulationValidation,
+    );
+    if (candidateValidation.blockId !== block.blockId
+      || candidateValidation.blockFreezeSha256 !== block.freezeSha256
+      || candidateValidation.probeHarnessSha256 !== block.hashes.probeHarnessSha256
+      || candidateValidation.sourceRows.path !== relative(repositoryRoot, sourceRowsPath)
+      || candidateValidation.sourceRows.sha256 !== block.hashes.sourceRowsSha256
+      || candidateValidation.sourceRows.rows !== sourceRowsBytes.toString('utf8').trimEnd().split('\n').length
+      || candidateValidation.sourceImageSetSha256 !== block.hashes.sourceImageSetSha256) {
+      throw new Error('Candidate capture authentication differs from the frozen block.');
+    }
+    for (const source of sourceRows) {
+      const evidence = candidateValidation.states[source.stateId];
+      if (evidence === undefined
+        || evidence.stateDigest !== source.stateDigest
+        || evidence.truthSha256 !== sha256(canonicalJson(source.truth))
+        || evidence.sourcePngSha256 !== source.png.sha256) {
+        throw new Error(`Candidate state authentication differs for ${source.stateId}.`);
+      }
+    }
+    eligible = validateCandidateEligibility(candidateManifest, expectedStates);
   }
   const armDefinitions = [
     { name: 'C1', path: c1Path, manifest: identity, blockArm: block.arms.C1 },
@@ -2458,41 +3029,97 @@
       });
     }
   }
-  if (!includeCandidate) {
-    const c1Rows = new Map(stateRows.filter((row) => row.arm === 'C1').map((row) => [row.stateId, row]));
-    const c2Rows = new Map(stateRows.filter((row) => row.arm === 'C2').map((row) => [row.stateId, row]));
-    const repeatability = calculateRepeatability(expectedStates.map((stateId) => ({
+  const c1 = new Map(rowsByArm.get('C1')!.map((row) => [row.stateId, row]));
+  const c2 = new Map(rowsByArm.get('C2')!.map((row) => [row.stateId, row]));
+  const stateMetric = (arm: string, stateId: string): PairedStateRow => {
+    const row = stateRows.find((entry) => entry.arm === arm && entry.stateId === stateId);
+    if (row === undefined) {
+      throw new Error(`Missing calculated ${arm}/${stateId} state metric.`);
+    }
+    return row;
+  };
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
+  const controlStates = expectedStates.map((stateId) => ({
       stateId,
       base: baseFromStateId(stateId),
       c1: {
-        intersection: c1Rows.get(stateId)!.accounting.intersection,
-        union: c1Rows.get(stateId)!.accounting.union,
+        intersection: stateMetric('C1', stateId).accounting.intersection,
+        union: stateMetric('C1', stateId).accounting.union,
       },
       c2: {
-        intersection: c2Rows.get(stateId)!.accounting.intersection,
-        union: c2Rows.get(stateId)!.accounting.union,
+        intersection: stateMetric('C2', stateId).accounting.intersection,
+        union: stateMetric('C2', stateId).accounting.union,
+      },
+    }));
+  let stablePositiveFacts = 0;
+  let disputedPositiveFacts = 0;
+  for (const stateId of expectedStates) {
+    const truthFog = uniqueCells(c1.get(stateId)!.truth.foggedCells);
+    const c1Fog = uniqueCells(c1.get(stateId)!.answer.foggedCells);
+    const c2Fog = uniqueCells(c2.get(stateId)!.answer.foggedCells);
+    for (const key of truthFog.keys()) {
+      if (c1Fog.has(key) && c2Fog.has(key)) {
+        stablePositiveFacts += 1;
+      }
+      if (c1Fog.has(key) !== c2Fog.has(key)) {
+        disputedPositiveFacts += 1;
+      }
+    }
+  }
+  const baseline = calculateControlBaseline({
+    states: controlStates,
+    families: {
+      ordinary: {
+        denominatorByBase: QSFOG_ORDINARY_DENOMINATORS,
+        c1ByBase: ordinary.c1,
+        c2ByBase: ordinary.c2,
+      },
+      collision: {
+        denominatorByBase: QSFOG_COLLISION_DENOMINATORS,
+        c1ByBase: collision.c1,
+        c2ByBase: collision.c2,
       },
-    })));
+    },
+    fogFalseNegatives: {
+      c1: counts('C1', 'fogFalseNegatives'),
+      c2: counts('C2', 'fogFalseNegatives'),
+    },
+    obscurementFalseNegatives: {
+      c1: counts('C1', 'obscuredFalseNegatives'),
+      c2: counts('C2', 'obscuredFalseNegatives'),
+    },
+    stablePositiveFacts,
+    disputedPositiveFacts,
+  });
+  if (!includeCandidate) {
     await writeExclusiveReports(
       outPrefix,
       renderStatesCsv(stateRows),
-      renderRepeatabilitySummaryCsv(repeatability),
-      renderRepeatabilityMarkdown(block, repeatability, stateRows),
+      renderRepeatabilitySummaryCsv(baseline),
+      renderRepeatabilityMarkdown(block, baseline, stateRows),
     );
     return 'REPEATABILITY_AUTHENTICATED';
   }
-  const c1 = new Map(rowsByArm.get('C1')!.map((row) => [row.stateId, row]));
-  const c2 = new Map(rowsByArm.get('C2')!.map((row) => [row.stateId, row]));
   const candidateRows = new Map(rowsByArm.get(candidateName!)!.map((row) => [row.stateId, row]));
-  const stateMetric = (arm: string, stateId: string): PairedStateRow => {
-    const row = stateRows.find((entry) => entry.arm === arm && entry.stateId === stateId);
-    if (row === undefined) {
-      throw new Error(`Missing calculated ${arm}/${stateId} state metric.`);
-    }
-    return row;
-  };
   let stablePositiveLosses = 0;
-  let disputedPositiveFacts = 0;
   for (const stateId of expectedStates) {
     const truth = c1.get(stateId)!.truth;
     const c1Fog = uniqueCells(c1.get(stateId)!.answer.foggedCells);
@@ -2504,34 +3131,12 @@
         stablePositiveLosses += 1;
         stateLosses += 1;
       }
-      if (c1Fog.has(key) !== c2Fog.has(key)) {
-        disputedPositiveFacts += 1;
-      }
     }
     const candidateMetric = stateMetric(candidateName!, stateId);
     candidateMetric.stablePositiveLoss = stateLosses;
     candidateMetric.candidateDelta = candidateMetric.score
       - (stateMetric('C1', stateId).score + stateMetric('C2', stateId).score) / 2;
   }
-  const counts = (arm: string, field: keyof Q9Accounting): number => stateRows
-    .filter((row) => row.arm === arm)
-    .reduce((sum, row) => sum + Number(row.accounting[field]), 0);
-  const familyCounts = (
-    bucket: 'fogEligibleOrdinary' | 'fogObscuredOnly',
-  ): Record<'c1' | 'c2' | 'candidate', Record<QsFogBase, number>> => {
-    const result = {
-      c1: Object.fromEntries(QSFOG_BASES.map((base) => [base, 0])) as Record<QsFogBase, number>,
-      c2: Object.fromEntries(QSFOG_BASES.map((base) => [base, 0])) as Record<QsFogBase, number>,
-      candidate: Object.fromEntries(QSFOG_BASES.map((base) => [base, 0])) as Record<QsFogBase, number>,
-    };
-    for (const row of stateRows) {
-      const target = row.arm === 'C1' ? result.c1 : row.arm === 'C2' ? result.c2 : result.candidate;
-      target[row.base] += row.accounting.buckets[bucket];
-    }
-    return result;
-  };
-  const ordinary = familyCounts('fogEligibleOrdinary');
-  const collision = familyCounts('fogObscuredOnly');
   const promotionInput: PromotionInput = {
     states: expectedStates.map((stateId) => ({
       stateId,
@@ -2581,10 +3186,11 @@
   await writeExclusiveReports(
     outPrefix,
     renderStatesCsv(stateRows),
-    renderSummaryCsv(promotion, promotionInput),
+    renderSummaryCsv(promotion, promotionInput, baseline),
     renderReportMarkdown(
       block,
       promotion,
+      baseline,
       stateRows,
       stablePositiveLosses,
       disputedPositiveFacts,
