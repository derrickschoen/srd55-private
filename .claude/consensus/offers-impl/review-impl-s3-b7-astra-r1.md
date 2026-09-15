# OFFERS-IMPL-S3-BUILDER B7 review r1 — gpt-6-astra (read-only)

Reviewed 9e032274. Session 01a0a204-dbca-79c1-ad1f-f6cc4161230e. Log .tmp/runs/fanout/review-impl-s3-b7-r1.log.

## REJECT B7

**Blocking list: IBG1-F1.** Oracle preservation, reserved pins, forward signatures and mutation checks pass.

### IBG1-F1 — P1: the retained canonical import violates the frozen final gate

**Location:** [engine-query-port.test.ts:12](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/engine-query-port.test.ts:12)

The remaining **11 references—one import and ten uses—do directly exercise the port**, rather than supply consumer defaults. However, the frozen plan contains **no exemption for this test file**.

The actual §5 rule ignores only:

```yaml
- src/vtt/offers/build-offer-environment.ts
- src/vtt/engine-query-port.ts
```

[Plan line 642](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md:642) states:

> Only the builder may import canonicalEngineQueryPort; engine-query-port.ts may define/export its canonical value.

The implementer’s claimed B15 test exemption therefore does not match the plan.

**Probe:** invoked the actual `canonicalOriginDiagnostics` against the production Compiler Program:

```text
finalCanonicalDiagnostics=11
:12 canonical query-port import is forbidden here
:70,106,144,179,182,188,200,201,222,257
    canonical query-port value reference is forbidden here
```

The current production architecture scan passes because canonical enforcement remains staged.

**Minimal change:** remove the canonical import and replace its ten uses with `OFFER_ENVIRONMENT.queries`. This still tests the canonical implementation supplied by the builder.

Verified that change entirely in memory:

```text
fixedCanonicalDiagnostics=0
fixedFileTypeDiagnostics=0
original port suite: 9 passed, 0 failed
modified port suite: 9 passed, 0 failed
```

**Blocking reason:** B7 leaves an assigned migration incomplete; enabling the frozen B15 gate would reject this file.

### Dimension verdicts

| Dimension | Verdict | Evidence |
|---|---|---|
| Oracle integrity | **PASS** | All **10 removed / 10 added** assertion lines audited. Expected values and predicates preserved. |
| Boundary preservation | **PASS** | Hidden-option: **21/21** assertion expressions byte-identical. Mixed-kind: **6/6** byte-identical. Both additional shortcuts are killed. |
| D625 reservations | **PASS** | Reserved values unchanged; the two flagged lines merely reformat the same `state.observationHistory` argument. |
| Canonical port suite | **FAIL** | IBG1-F1: direct port tests, but no plan exemption; **11 final-check violations**. |
| Forward signatures | **PASS** | **66 provider edits**, four factory removals; **0 diagnostics in each of the ten B7 files**. |
| Reported mutants | **PASS** | Eight exact-hash mutations replayed; every baseline passes and every mutant fails. |
| Scope / B8 readiness | **PASS subject to blocker** | Exactly ten test files, **+241/−89**. No separate B8 prerequisite missing. |

### Oracle and reservation audit

The ten assertion replacements comprise:

- **Six query-port assertions:** explicit generator/environment or bound-resolver calls; expectations unchanged.
- **One capsule assertion:** explicit capsule constructor and binding; exact adjustment-refusal message unchanged.
- **Three footprint assertions:** query source changed; expected distance **25**, path result and `CLERIC` target retained.

Additional comparisons:

- Capsule: **41/42** complete assertion expressions byte-identical; only the constructor assertion changes.
- Footprint-three: **11/14** byte-identical; the three query substitutions account for the differences.
- Last-seen: **23/23** byte-identical.

The capsule binding digest remains:

```text
0c2e08e26bd2bbfd3b9fe0a239f316e4b61a9c9680174605f12435f6c4f14afb
```

The projection’s `observationHistory` key and actor-knowledge/last-seen pins retain their values. No boundary fixture was reconstructed.

### Mutation evidence

Each applied production SHA matches the report’s prefix:

| Mutant | Observed failure |
|---|---|
| Round omission `129e0332…` | Required deviation evidence missing |
| Capsule digest `f5762683…` | Expected digest-mismatch exception absent |
| Footprint distance `96903fdc…` | **0**, expected **25** |
| Hidden option `0c8f3ef4…` | Valid proposal instead of `OPTION_NOT_SHOWN` |
| Mixed-kind `c25b9ee0…` | Standalone-component predicate true, expected false |
| Last-seen `9f141d9e…` | Round **2**, expected **1** |
| Pending placement `c0838928…` | `null`, expected recovery object |
| Autosave `f101b295…` | **11** snapshots, expected **10** |

Additional reviewer shortcuts also fail:

- **`f460c267…`**: accept when the primary ID is shown, ignoring the fallback. The **shown-primary/hidden-fallback** assertion rejects it.
- **`00d23c43…`**: permit standalone attacks when a multiattack’s first declared action is an attack. The mixed-kind suppression assertion rejects it.

These preserve the partial-validity controls lost in B6’s first version.

### Verification

Commands included:

```text
git show --format=fuller --stat HEAD
git diff --unified=0 HEAD^ HEAD
git diff --unified=3 HEAD^ HEAD
git show HEAD^:tests/unit/vtt/<audited-suite>.test.ts
git diff --numstat HEAD^ HEAD
git diff --check HEAD^ HEAD
git diff HEAD^ HEAD -- src tools package-lock.json
git status --short
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
sg scan --config sgconfig.yml src tools tests
sg test --config sgconfig.yml --test-dir ast-grep-tests --skip-snapshot-tests --include-off
node scripts/check-offer-environment-architecture.mjs --self-test
node scripts/check-offer-environment-architecture.mjs
npx vitest list --configLoader runner --filesOnly --json
node -
node -e '<in-memory assertion comparison>'
```

- Both current-tree TypeScript checks: **exit 0**.
- Forward overlay: **217 diagnostics outside B7; zero within B7**.
- SG scan clean; fixture **1 passed**.
- Architecture self-test **39 passed**; scan **1,621 files**, builder plus five transitional exports.
- Discovery **643 unique files / 0 fixture paths**.
- Diff check **0**; added lines over 120: **0**.
- HEAD, clean worktree, frozen plan and contracts hashes verified; production, builder and lockfile unchanged.
- Native suites were not run. Supervisor evidence remains **137 B7 tests + 15 environment tests**; reviewer mutation replays ran in memory.

S3 B7 REVIEW R1 DONE