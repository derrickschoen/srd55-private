# OFFERS-IMPL-S3-BUILDER B9 review r1 — gpt-6-astra (read-only)

Reviewed 56e370b5. Session 01a0a204-dbca-79c1-ad1f-f6cc4161230e. Log .tmp/runs/fanout/review-impl-s3-b9-r1.log.

## REJECT B9

**Blocking list: IBI1-F1.** The assertion migrations and signature checks pass, but one fixture still depends on accepting unregistered options.

Verified HEAD `56e370b588071fab8c9cdefe9a1595f8fe65621b`. Both frozen SHA-256 values match the supplied values exactly.

### IBI1-F1 — P1 / BLOCKING: composition fixture still resolves an unregistered option

**Location:** [standard-offer-generator.test.ts:243](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/standard-offer-generator.test.ts:243)

The test generates a raw offer and passes it through `standardOfferGenerator.resolve`. That method creates a fresh option through `engineOfferableOption`; the callback then passes that **unregistered object** into `resolveEngineActorOption`.

This currently passes because absent provenance is accepted. Plan **:110/:114** requires rejecting absent provenance and prohibits registering clones during resolution. **B9 :430** assigns this fixture migration now.

**Read-only probe:** `node -` with an in-memory production overlay changing only:

```ts
boundEnvironment !== undefined &&
```

to:

```ts
boundEnvironment === undefined ||
```

Applied production SHA: `4c0f017b7da6bea0c336ac5ce7bfea5d150bc78fb16a18937c99ee0a115c6b59`.

Actual test result:

```text
baseline passed=1 failed=0
FAIL composes standard resolution execution and evaluation ports
Standard End Turn refused: OFFER_ENVIRONMENT_MISMATCH
mutant passed=0 failed=1
```

**Minimal change:** In the callback, select the matching option from the public environment-bound generator, assert that the received candidate matches it, and resolve the registered object. Preserve the raw-generator pins. This fixture repair was replayed in memory with the strict guard: **1 passed / 0 failed**.

### Dimension verdicts

| Dimension | Verdict | Evidence |
|---|---|---|
| Oracle integrity | PASS | **436 → 438** assertions; every existing matcher/expected-argument pair retained. Three changed assertion subjects preserve their oracles. Goldens and legacy option pins unchanged. |
| Planning / tactical evaluator | PASS | Explicit bound queries and environments; both allocation calls pass the fifth environment argument at `:232/:296`. |
| Forward signatures | PASS | **66 edits**, four factory deletions: **0 diagnostics in each B9 file**; 120 diagnostics outside the group. Also passes after five additional speculative query-default deletions. |
| Required mutants | PASS | Six exact reported mutant hashes reproduced; all six baselines pass and all six mutants fail. |
| Plan B9 fidelity | **FAIL** | IBI1-F1 leaves unregistered-option setup dependent on a behavior B14 must remove. Other migrated call sites comply. |
| Scope / B10 readiness | PASS, subject to closure | Exactly ten authorized test files, **+153/−44**. No production or lockfile changes. No separate B10 prerequisite missing. |

### Assertion audit

- **Snippets:** two resolver assertion subjects now use the bound resolver; both retain `toBe(true)`.
- **Speculative planning:** one projection assertion now uses the bound registry; its expected semantic-zone value is unchanged.
- **New room assertion:** independently requires at least one resolvable option per monster. This checks option availability, not specifically productive movement or attacks.
- **New standard-generator assertion:** compares bound option IDs against the existing literal legacy pins, excluding the explicitly named `Disengage` entry. Its expectation is not generated from the run.

The seed `3943001`, LOS/cover fixtures, save/timeline/DOM goldens, and standard-generator bodies, IDs and ordering pins remain unchanged.

### Mutation evidence

Each row used actual test callbacks and Vitest assertions through a read-only `node -` replay.

| Mutant | Baseline → mutant | Observed failure |
|---|---|---|
| Seed `207f993e…` | 1 pass → 1 fail | Frozen canonical JSON mismatch |
| Save `a21d4e97…` | 1 pass → 1 fail | Oldest-first instead of literal newest-first order |
| Payload `f3ca1350…` | 1 pass → 1 fail | Expected DM block; received `null` |
| Planning `9b0bacf7…` | 1 pass → 1 fail | Expected `40`; received `20` |
| Standard `434a4967…` | 1 pass → 1 fail | Literal legacy option-ID mismatch |
| Tactical `8c82d9a1…` | 1 pass → 1 fail | Expected `0.5791028347540284`; received `0.5138117854589845` |

**Additional boundary shortcut:** using only the first creature’s hidden flag for every creature’s redaction, SHA `4af2e295…`, gives **baseline 1 pass → mutant 1 fail**. The hidden foe exposes `[2,2]` instead of the independently expected `cell: null`, empty footprint and last-seen `[1,2]`.

### Verification commands

| Command | Result |
|---|---|
| `node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false` | Exit 0 |
| `node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false` | Exit 0 |
| `sg scan src tools tests` | Exit 0; clean |
| `sg test --config sgconfig.yml --test-dir ast-grep-tests --skip-snapshot-tests --include-off` | 1 passed |
| `node scripts/check-offer-environment-architecture.mjs --self-test` | 39 active fixtures passed |
| `node scripts/check-offer-environment-architecture.mjs` | 1,621 files; builder plus exactly five transitional exports |
| `npx vitest list --configLoader runner --filesOnly --json` | 643 files; 0 fixture paths |
| `git diff --check HEAD^ HEAD` | Exit 0 |
| `git diff HEAD^ HEAD -- src tools package-lock.json` | Empty |
| `git status --short` | Empty |

Residual migration grep: **0 matches**. Added lines over 120 characters: **0**.

Native Vitest execution was unavailable under the read-only restriction. The full **294 B9 tests and 15 environment tests** are supervisor-verified; the targeted replays above are independently verified.

**REJECT B9 — close IBI1-F1.**

S3 B9 REVIEW R1 DONE