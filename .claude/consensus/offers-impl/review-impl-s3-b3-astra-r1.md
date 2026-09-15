# OFFERS-IMPL-S3-BUILDER B3 review r1 — gpt-6-astra (read-only)

Reviewed 126e44ae. Session 01a0a204-dbca-79c1-ad1f-f6cc4161230e. Log .tmp/runs/fanout/review-impl-s3-b3-r1.log.

## ACCEPT B3

**Blocking list: none.** One non-blocking coverage finding requires supervisor disposition.

Reviewed `126e44ae2b7a3bf513431bd5003df468c0f9fc89`; worktree remained clean.

### IBC1-F1 — P2, NON-BLOCKING: Host digest-rejection coverage lacks an explicit later assignment

**Location:** [dm-encounter-host.ts:577](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/dm-encounter-host.ts:577); [plan:775](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md:775).

The check works, but digest-conservation tests do not establish that removing this check fails. The plan assigns host/board conservation coverage and capsule/provenance rejection controls; neither explicitly assigns a mismatched **projector-result** rejection test.

**Probe:** In-memory loading of the real host and projector; replace only the returned projection’s digest:

```text
Baseline:
TypeError: DM board projection offer environment digest does not match the host environment.

HOST_SKIPS_DM_DIGEST_CHECK:
mismatchedDigest=ACCEPTED
SHA256=188dbdefc76387ddfbf7d2beab2713b1e03115fecd0dc886e5dbb5e742e4804d
```

The implementer’s statement describes the current tests, not a technical impossibility: test-only projector substitution can exercise this branch.

**Minimal change:** Supervisor amendment assigning this negative test to the already-listed B16 host integration file, explicitly requiring `HOST_SKIPS_DM_DIGEST_CHECK` to fail.

**Why non-blocking:** B3 implements the required check correctly, satisfies its named required reds, and explicitly defers test edits at plan **:322**.

### Dimension → verdict

| Dimension | Verdict and evidence |
|---|---|
| **B3 production threading** | **PASS.** All ten consumers contain **0 calls** to the three old environment factories. Host passes its stored environment; scorer supplies allocation argument five. Opportunity evaluation derives queries from its environment; materiality selects the bound registry; speculative planning forwards its selected environment. |
| **Host snapshot behavior** | **PASS.** Digest checked before detached/immutable merging. Direct probe confirmed frozen DM projection and history; player projection had **no `offerEnvironmentDigest` property**. |
| **Transitional defaults** | **PASS for B3.** Board **:61**, round **:356**, paths **:131/:150**, and host defaults use the builder. These are temporary provider defaults, not alternative builders. B13 **:511–515** explicitly removes them after caller closure. Structural types remain as required by **:320**. |
| **Seam ledger** | **PASS.** Projector and allocation seams consumed; retained B13/B14 seams documented. New legendary optional property preserves existing request literals until B17 migration/B18 contraction. Its private helper parameters are required. |
| **Legendary query forwarding** | **PASS.** Request port reaches pending assessment and nearest-enemy sorting. Alternate-distance probe selected `combatant:legendary-query-far`, with **0 canonical distance calls**. |
| **Required reds** | **PASS.** Both exact reported mutations reproduced; each produced **1 failed / 2 filtered-out tests** in the identity suite. |
| **Coverage placement** | Legendary coverage is explicitly assigned to **B17 :496/:499**, with fallback removal at **B18 :549**. Host rejection coverage needs the amendment in **IBC1-F1**. |
| **Scope and B4 readiness** | **PASS.** Exactly ten production files, **+80/−46**, no tests changed. No missing B4 prerequisite or premature B13+ deletion found. Browser root explicitly selects the previous legacy mode on both host branches; no behavior change identified by inspection. Playwright was not run. |

### Mutation and runtime evidence

Actual test sources were replayed in memory:

| Probe | Result |
|---|---|
| Environment identity suite | **3/3 passed** |
| Environment board-sequence suite | **1/1 passed** |
| Legendary suite | **4/4 passed** |
| `BOARD_DIFFERENT_POLICY` | **1 failed / 2 filtered out**; bound-environment mismatch |
| `FALLBACK_USES_LEGACY_ONLY` | **1 failed / 2 filtered out**; expected accepted fallback became invalid |
| `LEGENDARY_USES_CANONICAL` | Existing suite still **4/4 passed**; alternate-distance oracle failed: selected **near**, expected **far**, **2 canonical distance calls** |
| `HOST_SKIPS_DM_DIGEST_CHECK` | Direct negative probe changed from rejection to acceptance |

All four applied hashes matched the report exactly:

```text
BOARD_DIFFERENT_POLICY
3df6f0641d56a637df613524c0f28263241a13fd86903f4c0a445e0ed864ad6b
FALLBACK_USES_LEGACY_ONLY
7d990bfae654dc04fda7cf6e19832c2d2027120402f2dfa063a32e0c0fef8997
LEGENDARY_USES_CANONICAL
47fa556156357f5fab4e8cb7d453d26bd124b19952e9bfc7219df0f24dbe17c0
HOST_SKIPS_DM_DIGEST_CHECK
188dbdefc76387ddfbf7d2beab2713b1e03115fecd0dc886e5dbb5e742e4804d
```

Native suite execution requires temporary writes unavailable under this review’s constraints; the replays used `node -` with stdin-only TypeScript transpilation, module overlays, and the installed assertion library. They do not constitute a native Vitest run.

### Commands and integrity

```text
git show --format= HEAD
git diff --numstat HEAD^ HEAD
git diff --check HEAD^ HEAD
git diff HEAD^ HEAD -- package-lock.json src/vtt/offers/build-offer-environment.ts
git status --short
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
sg scan --config sgconfig.yml src tools tests
node scripts/check-offer-environment-architecture.mjs
npx vitest list --configLoader runner --filesOnly --json
```

Both tsc commands: **exit 0, zero diagnostics**. SG scan: **exit 0, no findings**. Architecture: **1,621 files**, builder plus exactly five transitional exports. Discovery: **643 unique files / 0 fixture paths**. Diff check: **exit 0**. Added lines: **80**, maximum length **111**, **0 over 120**.

Read-only Node hashing verified:

```text
Plan:
fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4
Frozen contracts:
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
```

Builder and lockfile are unchanged. Broader suite totals remain supervisor evidence.

**ACCEPT B3 — no blocking findings; IBC1-F1 is a non-blocking coverage amendment.**

S3 B3 REVIEW R1 DONE