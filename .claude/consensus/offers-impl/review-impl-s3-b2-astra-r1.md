# OFFERS-IMPL-S3-BUILDER B2 review r1 — gpt-6-astra (read-only)

Reviewed c8efb0fd. Session 01a0a204-dbca-79c1-ad1f-f6cc4161230e. Log .tmp/runs/fanout/review-impl-s3-b2-r1.log.

## REJECT B2

**Blocking list: IBB1-F1.** The allocation interface is missing B2’s additive environment argument.

Reviewed `c8efb0fd8bf2f4fb5af6245dccd30daa0e97e79d`; worktree remained clean. Verified:

- Plan: `fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4`
- Frozen contracts: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`
- B1 builder unchanged: `87414b77c4254b6411171c7c22865b9028b4a92634ea957482ac9cc344ee2a51`

### IBB1-F1 — P1, BLOCKING: Allocation’s port interface cannot accept the future argument

**Locations:** [engine-query-port.ts:236](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/engine-query-port.ts:236), [implementation:1707](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/engine-query-port.ts:1707), [scorer caller:384](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/intel/team-scorer.ts:384).

B2 adds `environment?` to `compareTacticalAllocations`, but leaves `EngineQueryPort.compareAllocations` at four arguments. Consequently B3 cannot thread its environment through the scorer’s actual port-based call without editing B2’s provider file.

**Probe:** `node --input-type=module`, using an in-memory CompilerHost fixture importing the real production symbols:

```ts
const env = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'legacy_standard',
});
declare const args: Parameters<typeof compareTacticalAllocations>;

compareTacticalAllocations(args[0], args[1], args[2], args[3], env);
env.queries.compareAllocations(args[0], args[1], args[2], args[3], env);
```

**Output:** the free-function call compiles; the port call produces:

```text
TS2554: Expected 4 arguments, but got 5.
```

Adding `environment?: EngineOptionEnvironment` to the interface in a production-source overlay leaves **zero fixture diagnostics**.

**Minimal change:** add that optional fifth interface parameter now and include it beside the implementation in the seam ledger. B14 should make both parameters required. Optionality is necessary here because existing four-argument callers remain.

### B2 plan fidelity

| Planned increment | Verdict and evidence |
|---|---|
| Projector input, DM digest, temporary fallback | **PASS.** Input reaches human options and offered paths. Independent probe returned the selected revision digest `0c2e08e2…`; fallback returned distinct legacy digest `fb1c39f0…`. Six paths projected. Field added only to DM projection. |
| Compatible handler, allocation and divergence forms | **PARTIAL — IBB1-F1.** Handler overloads and optional request/divergence arguments are present; allocation’s interface is incomplete. |
| Optional root configuration, parser defaults, arena forwarding | **PASS.** Both parsers select explicit legacy configuration; arena forwards the supplied input; conversation builds its run environment. |
| Internally derived MCP `turnProposals` | **PASS.** Application derives it from `offerEnvironment`; independent dependency and entrypoint supply removed. Repository search found **zero `turnProposals:` supplies**, including tests. |
| Child reconstruction and classification | **PASS within read-only probe limits.** Reconstruction delegates to the builder; malformed/mistagged launchers fail before fixture decoding. |
| Explicit dry-client launch input | **PASS.** Discriminated fixture/launcher input added; all three internal constructions migrated. Two existing boundary-test string callers remain accepted. |
| Compatible arena/blind inputs | **PASS for B2.** Arena forwards supplied queries internally. Blind legacy and revision-bound default-path probes both accepted. Callback type closure remains scheduled for B14/B18. |
| Challenge helper threading | **PASS.** Public roots build explicitly; private helpers require and forward the environment. In-memory suite: **31/31**. |
| T, architecture checks and retained controls | **PASS**, except the future-call probe above. Results below. |

### Remaining review dimensions

| Dimension | Verdict |
|---|---|
| **Transitional seams** | Existing omitted-argument callers justify the new optional public inputs. New private challenge helpers and `authorizedMechanics` require their environment. No additional unnecessary optional dependency found. Add the missing interface seam under IBB1-F1. |
| **Environment provenance** | **Matches phased plan.** A spread environment still compiles into the structural projector input, as §4.1 permits until B13. Passing the same spread into divergence fails **TS2345, missing `#brand`**. Actual old factories delegate to the builder. |
| **Launcher classification** | **PASS.** Wrong tag and malformed binding never invoked fixture fallback; genuine fixture invoked it exactly once. |
| **Mutants** | Reported behaviors reproduced; exact malformed-input bytes verified. An additional dropped-environment mutant was killed. See below. |
| **Scope** | **PASS.** Exactly ten production files, **+227/−94**; no tests, pins, package files, builder or frozen contracts changed. |
| **B3 readiness** | **FAIL only on IBB1-F1.** No other missing preparation or premature B13+ deletion found. |

### Launcher and mutation evidence

Direct calls through the actual entrypoint decoder produced:

| Input | Result | Fixture-decoder calls |
|---|---|---:|
| Genuine arena fixture | Fixture | **1** |
| Valid launcher | Launcher | **0** |
| Launcher with wrong format | Manifest-structure TypeError | **0** |
| Valid fixture combined with wrong launcher tag/path | Manifest-structure TypeError | **0** |
| Launcher missing nested catalog | Binding-shape TypeError | **0** |

The report’s malformed launcher text reproduced the exact SHA:

```text
17edd999cecc9fd1ed228dec3c8a5c238b8e7c780f46094d3ba7a46b4ab9f3ed
```

It failed with:

```text
TypeError: engine option environment binding has an invalid shape.
```

The standalone child command was **not run**: this sandbox does not permit creating its required `/tmp` launcher file.

Other source mutations stayed in memory. The report does not include their exact edit text, so these are explicitly **equivalent behavior replays**, not claims of matching its restored mutant hashes:

| Reported mutant | My applied SHA | Result |
|---|---|---|
| Launcher fallback `9befadac…` | `bcaec26556c476d0ded820f710841cd056bde3a4fbb3db9becc8b4cc936046ff` | **2 failed / 1 passed** among the three classification tests. |
| Policy input `c4fa4f1f…` | `c4a40ebfc851a1d1b549c93dd1fbd1c3c016ad95892628d1682bc9f55957c898` | Environment suites **3 failed / 12 passed**; independent policy pin rejected `e2a1f80b…`. |
| Catalog input `b02d976f…` | `04ee5ccbbc49a8633bd5e6d82a66aeeb96cab38eb3e807acd21bdde5a5e7b530` | Environment suites **3 failed / 12 passed**; represented-catalog pin rejected `0a892f9a…`. |
| Additional `CONSUMER_DROPS_BOUND_ENV` at runtime construction | `877b5d487ceec9f0c032750c54b1bdf8a88ddfd3257c4e660938043827c6d256` | **2 failed / 13 passed**: MCP binding and round/capsule digest assertions. |

### Commands and verification

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
sg scan --config sgconfig.yml src tools tests
sg test --config sgconfig.yml --test-dir ast-grep-tests --skip-snapshot-tests --include-off
node scripts/check-offer-environment-architecture.mjs --self-test
node scripts/check-offer-environment-architecture.mjs
npx vitest list --configLoader runner --filesOnly --json
git diff --check HEAD^ HEAD
git diff --numstat HEAD^ HEAD
git status --short
```

Results: both tsc **exit 0, zero diagnostics**; sg **0 findings / 1 fixture passed**; architecture **39 fixtures passed / 1,621 files**, exactly five transitional exports plus builder; discovery **643 unique paths / 0 fixture paths**; diff check **exit 0**; **0 added lines over 120**.

The seven-spec native Vitest command failed before loading tests because its temporary SSR directory could not be created. In-memory replays of actual test sources passed **60 distinct tests**:

- Environment suites: **15**
- Blind resolver: **11**
- Challenge feasibility: **31**
- Launcher classification: **3**

The remaining five boundary tests and ten legacy-invariance tests retain supervisor verification; I do not claim an independent full-process replay.

**REJECT B2 — blocking list: IBB1-F1.**

S3 B2 REVIEW R1 DONE