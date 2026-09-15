# OFFERS-IMPL-S3-BUILDER B6 review r1 — gpt-6-astra (read-only)

Reviewed 8d562480. Session 01a0a204-dbca-79c1-ad1f-f6cc4161230e. Log .tmp/runs/fanout/review-impl-s3-b6-r1.log.

## REJECT B6

**Blocking list: IBF1-F1.** Forward compilation and scope pass, but one migrated fixture loses a previously exercised refusal control.

### IBF1-F1 — P1, BLOCKING: partial-illegality coverage was weakened

**Location:** [composite-turn-proposals.test.ts:326](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/composite-turn-proposals.test.ts:326)

The original fixture contained one valid Longbow component and one unavailable component. The replacement generates **Longbow + Longbow**, then changes the actor’s statblock to Priest, making **both** components unavailable.

The literal `MULTIATTACK_COMBINATION_ILLEGAL` oracle remains independent, but the fixture no longer tests its stated boundary: refusal when **even one** component is illegal.

**Independent production mutant:** insert this shortcut at the beginning of `validateUse`’s multiattack branch:

```ts
const first = use.components[0];
if (first?.kind === 'attack' &&
    targetUse(state, actorId, first, queries) !== null) return null;
```

Applied production SHA-256:

```text
e5a9491817a91d87048f5792d8c637cb470e3d645733ef7b4f67705dc1382ff2
```

Actual test-body replay:

| Probe | Unmodified production | Mutated production |
|---|---:|---:|
| Parent’s partial-illegality test | PASS | FAIL |
| B6’s replacement test | PASS | PASS |
| Entire B6 composite suite | 10 passed | 10 passed |

The parent expected `MULTIATTACK_COMBINATION_ILLEGAL`; the mutant returned `OPTION_UNREACHABLE`. The migrated suite no longer detects this shortcut.

**Minimal change:** retain public generation, but select a mixed-component option and make only one component unavailable afterward. Establish that the other remains legal and retain the independently specified refusal. Require this additional mutant to go red.

**Blocking reason:** plan B6 requires preservation of each independent behavior oracle; this migration demonstrably loses an existing negative control.

### Dimension verdicts

| Dimension | Verdict | Evidence |
|---|---|---|
| Oracle integrity | **FAIL** | IBF1-F1. All nine removed/added `expect(` lines audited; the other eight replacements preserve their predicates and expectations. |
| Forward signatures | **PASS** | Independent CompilerHost overlay: **66 provider edits**, four factory removals, **0 diagnostics in every B6 file**. |
| Reported mutants | **PASS, insufficient for IBF1-F1** | Nine exact-hash mutants replayed: nine passing baselines and nine assertion failures. |
| Plan B6 fidelity | **PASS except oracle preservation** | Explicit environments, bound resolver, required argument positions and capsule bindings present; residual old-API scan **0**. No new seam. |
| Scope / B7 readiness | **PASS, subject to blocker** | Exactly ten test files, **+166/−72**. No production or lockfile changes. Actor-knowledge pins untouched; no separate B7 prerequisite missing. |

The nine assertion replacements comprise:

- **Seven composite assertions:** hidden-ID exclusion/refusal, spent main/bonus slots, exhausted uses, illegal multiattack, and ineligible world objects.
- **Two opportunity assertions:** unchanged `fully_resolved` and `contains_unresolved` expectations.

Board geometry, movement/intel values, hidden-token secrecy and DM/player isolation expectations remain unchanged. The multiattack summary changes to a literal describing the generated option; it is not derived from the resolver’s output.

### Reported mutation replays

Each applied SHA matched the report’s prefix.

| Mutant | Retained assertion failure |
|---|---|
| `bf17c13…` composite | Wrong refusal result |
| `7d1b97f…` hidden token | Player combatants include the hidden reactor |
| `01a050f…` tactical | **0.5625** instead of **0.4375** |
| `9ef28ff…` terrain | All four cells rendered open |
| `98641fa…` payload | Serialized player payload contains `dmOnly` |
| `7842485…` actor knowledge | Pinned actor-knowledge object differs |
| `1202dbd…` Calm Emotions | Payload geometry differs |
| `baf3f0b…` adjudication | HP **80**, expected **79** |
| `7723a69…` opportunity | Offensive/approach predicate becomes false |

The report appropriately discloses its two preliminary survivors. Replacing them with stronger mutations is legitimate; the final controls genuinely fail. They do not establish preservation of the mixed-validity case identified above.

### Verification

Commands executed:

```text
git status --short
git show --format=fuller --stat HEAD
git diff --unified=0 HEAD^ HEAD
git diff --unified=3 HEAD^ HEAD -- <reviewed test-file groups>
git show HEAD^:tests/unit/vtt/composite-turn-proposals.test.ts
git diff --numstat HEAD^ HEAD
git diff --check HEAD^ HEAD
git diff HEAD^ HEAD -- src tools package-lock.json
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
sg scan --config sgconfig.yml src tools tests
sg test --config sgconfig.yml --test-dir ast-grep-tests --skip-snapshot-tests --include-off
node scripts/check-offer-environment-architecture.mjs --self-test
node scripts/check-offer-environment-architecture.mjs
npx vitest list --configLoader runner --filesOnly --json
node -
```

`node -` supplied read-only hashing, source-audit, CompilerHost and actual test-body replay scripts through stdin.

- Both current-tree TypeScript checks: **exit 0**.
- Forward overlay: **296 total diagnostics outside B6; zero in all ten B6 files**.
- SG scan clean; SG fixtures **1 passed**.
- Architecture self-test **39 passed**; production scan **1,621 files**, builder plus exactly five transitional exports.
- Discovery **643 unique files / 0 fixture paths**.
- Diff check **0**; added lines over 120: **0**; changed actor-knowledge lines: **0**.
- HEAD, clean worktree, frozen plan SHA and frozen contracts SHA verified.
- Native suites were not run under the read-only restriction. The supervisor’s **77 B6 + 15 environment tests** remain separate evidence.

S3 B6 REVIEW R1 DONE