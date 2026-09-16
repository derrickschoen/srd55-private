Implemented B14, including the D617.27 conversation split delta. Digest provenance is enforced, contracted APIs compile without compatibility defaults, and legacy invariance is restored to 10/10.

### Changes

| File | Pristine SHA | Candidate SHA | Summary |
|---|---|---|---|
| `src/vtt/engine-query-port.ts` | `4344c0f23dbd359035bfaa99168d5dbbaed56b6482e901242d3165000fe131f5` | `3db77aa3f6722c36c891eff1d96cc1b74d41251adc26d95512e740e8b8419f09` | Required branded allocation environment; replaced the query-only registry with direct `engineActionRegistryForEnvironment`; removed internal allocation bypasses. |
| `src/vtt/engine-state-capsule.ts` | `7940c27cef0ba87f4c2b5a0aab38c85ed0db89d587cfb1f88ee3fbffa6470c93` | `a6041a9fc9aa6ba83a3fbabb3a922e261419e3b6236f2d3e21a10da4dbd0d264` | Removed the legacy capsule wrapper formerly at audit lines 944–949. |
| `src/vtt/intel/opportunity-cost.ts` | `ee75abc3a42bfc40df193a865e4fb5eeebfa0cc4e9f6748336632fbe9243202e` | `ec9ec107ee5ae9128d8946f92b3775069cc7c4130d40b7bf6e148476d3f0a9f3` | Removed environment/query unions formerly at 154 and 273. |
| `src/vtt/intel/team-scorer.ts` | `6c737efa38ed1c952814b37582229bfeccf47fe6e7f9214cf8f0a7236b00ac00` | `a3de0ecc2a6146647e48d490dc81088d043cd8b9c269c13de5920041433918f8` | Removed unions at 206/279/322/469 and always threads the branded environment through allocation comparison. |
| `src/vtt/intent-resolver.ts` | `31fb0d823e50cafd74e485b799831e6f3be28ae624d03db3309ab36615e7c217` | `68148545b7c3b0f8e1ec15680253c41bb7ce0e967a30df3f107d6f2d063db4b2` | WeakMap now records digest provenance; absent/different provenance refuses; removed query union, three defaults, and singleton resolver. |
| `src/vtt/mcp/engine-server.ts` | `4bd20ca9fbf6a59ea084a113b75594b63783e1273baf852cc9e8dd2b2c2e1a6f` | `c40292df285a44c0dc977d4b605a5c98eb6b6625e04672f8c2b5b6367dc45544` | Enforces launch/current/replacement digests and reselects registered options for tactical rendering and proposal ingestion. |
| `src/vtt/plan-materiality.ts` | `2142bee8735d7ee6d4d93534ab5ab5d8dbb2d99d053c853282af579fa9604f36` | `d2936e7b1367cea08f75a97ae20526301e517fabf231aa831f2b5786f80661fe` | Environment is required; removed the optional/unbound registry path formerly at 36 and 104–108. |
| `src/vtt/speculative-planning.ts` | `d4887b9b9fb578a5d2b38fdee56dbda67032894981122ca47b062058ff5972f1` | `39fffd46fb307870df492ab43b52d829f0efd3cff576dbfd50f5c1c4c1880908` | Removed five query defaults at 105/356/570/611/761, environment defaults at 299/681, and optional planner environment at 282. |
| `tests/unit/vtt/offer-environment.test.ts` | `3a837f082e80b5ee36f62e35d09406438fc06f832bd8d1e56a9b41cbe4c30b70` | `1b6a1256d2957e366f5178201b98d8f130b7be15ccc50ee48577049051ed1b4f` | Added equal-digest acceptance, absent/different provenance refusal, mutable-feed swap, and custom-feed swap coverage. |
| `src/vtt/blind-intent-resolver.ts` | `fa011ea68733cdd24186933cd422707579d1124565a561db4954c7d5c0f96fa7` | `3af57a60827e015b4cceb534a2c1277dec354bc99349687fcb0dd50b73c49da0` | Provider callbacks now accept branded environments. The explicitly scheduled B18 missing-environment/query fallback remains. |
| `tools/ai-dm-conversation.ts` | `b7a94b6d7f15573d8b379063f84d0d5a1aa0a8caa52c5761b5b1ef2e5cb91ed4` | `526a3171a51a2e08e9246f0b40831eb5365f194d805630610695c4758113524d` | Retains registered resolver-selected options instead of provenance-destroying clones. |

New environment tests are at lines 333, 344, 356, 369, and 386. Hard-coded pins remain:

- Legacy environment: `fb1c39f00b4caeea7c5ad92af428132e1f3cb6c44a61a59ba6551d22c90c275b`
- Represented catalog: `31cec41a1f02589bb6c653877dc684f18ede160f882cee5f69e39961bde67061`
- Represented environment: `0fd2d8c790331e2e4bc6a622dda69569607b3d7d5d8b3487e26f8d59aa311074`

No legacy-invariance pin changed.

### Conversation split delta

`tools/ai-dm-conversation.ts`: 18 insertions, 18 deletions.

Registered option triplets are retained at lines:

- 1634–1636: retained-plan rebasing
- 1749–1751: speculative branch adoption
- 4083–4085: primary authorization
- 5409–5411: staged adjustment
- 5972–5974: segment plan storage
- 6908–6910: speculation recalculation

Proposal/report objects remain cloned.

The clone-again mutant changed SHA:

```text
526a3171a51a2e08e9246f0b40831eb5365f194d805630610695c4758113524d
→ ad1e622c4aeaa9d0b106035337a7b86836f8aa629997f1239a651e87e81d3d4a
```

Killing command:

```text
npx vitest run --configLoader runner \
  tests/unit/tools/ai-dm-legacy-invariance.test.ts \
  -t 'matches approved-main rows'
```

Result: 1 failed, 9 skipped, exit 1. Exact evidence included:

```text
row[0].monsterSegments[0].deviationResolutions[0]
reasonCodes: ["degraded_to_dodge"]
refusalCodes: ["OFFER_ENVIRONMENT_MISMATCH"]

row[0].projectionRevision
Expected: 17
Received: 14

row[0].pcTurns[2].material
Expected: true
Received: false
```

Restored SHA: `526a3171a51a2e08e9246f0b40831eb5365f194d805630610695c4758113524d`.

Native legacy-invariance result: 10/10 passed.

### Staged fixture enforcement

Both commands exited 0:

```text
node scripts/check-offer-environment-architecture.mjs --self-test --stage required-surfaces
node scripts/check-offer-environment-architecture.mjs --self-test --stage resolver
```

Each reported:

```text
offer-environment architecture self-test: 39 active fixtures passed
staged real-symbol fixture groups: required-surfaces:11, resolver:6, final-query:14
```

Required-surface fixtures:

1. `round-session-missing-environment.ts` → `EngineRoundSession`
2. `dm-host-missing-environment.ts` → `DmEncounterHost`
3. `human-options-missing-environment.ts` → `projectHumanEngineOptions`
4. `dm-projector-missing-environment.ts` → `projectDmBoard`
5. `offered-actors-missing-environment.ts` → `offeredOptionActorsForState`
6. `offered-paths-missing-environment.ts` → `offeredOptionPaths`
7. `mcp-runtime-missing-environment.ts` → `createEngineMcpRuntime`
8. `mcp-handler-missing-environment.ts` → `createEngineMcpHandler`
9. `mcp-request-missing-environment.ts` → `handleMcpRequest`
10. `mcp-server-missing-environment.ts` → `runEngineMcpServer`
11. `mcp-lines-missing-environment.ts` → `runEngineMcpLines`

Resolver fixtures:

1. `available-options-missing-environment.ts` → `availableEngineActorOptions`
2. `resolver-factory-missing-environment.ts` → `createPureTurnProposalResolver`
3. `materiality-context-missing-environment.ts` → `createPlanRelevanceRecord`
4. `scenario-menu-missing-environment.ts` → `buildHostScenarioMenu`
5. `baseline-planner-missing-environment.ts` → `hostBaselineProposalPlanner.plan`
6. `team-score-missing-environment.ts` → `scoreTeamPlans`

The resolver-default stage-live mutant changed `68148545… → 382ab9…` and failed with:

```text
resolver-factory-missing-environment.ts:3: omitted real-symbol dependency compiled
```

Restored to `68148545…`.

A real-symbol bare-query probe produced exactly:

```text
TS2345 Argument of type 'EngineQueryPort' is not assignable to parameter
of type 'RuntimeOfferEnvironment'.
```

### Mutant evidence

| Mutant | SHA transition | Killing evidence |
|---|---|---|
| `SKIP_DIGEST_CHECK` | `68148545… → 6ac0f583…` | Absent/different provenance tests received `{valid:true}` instead of `OFFER_ENVIRONMENT_MISMATCH`. |
| `FALLBACK_USES_LEGACY_ONLY` | `68148545… → 1181d236…` | Expected `{valid:true, selectedBranch:'fallback'}`; received `{valid:false, selectedBranch:'none'}`. |
| `BOARD_DIFFERENT_POLICY` | `0bbf2193… → 3a634705…` | Board-sequence digest expected `e9355582…`; received legacy `fb1c39f0…`. |
| `MIDRUN_ENV_SWAP` | `c40292df… → 239b8c…` | Replacement-feed test expected the replacement-digest refusal and instead reached the application-level changed-environment refusal. |
| Custom-feed digest skip | `c40292df… → d4369e…` | `expected function to throw, but it didn't`. |
| Query distance wrong value | `3db77aa3… → 8759cf…` | Footprint control expected 25; received 30. |
| Capsule schema wrong value | `a6041a9f… → 3b1c…` | Eight capsule tests failed; first expected `unsupported_version`, received `invalid_schema`. |
| Opportunity ranking reversal | `ec9ec107… → 5a8476…` | Expected option `a836…`; received `b267…`. |
| Team dominance inversion | `a3de0ecc… → 49cd63…` | Expected the frontier candidate to be winning; received dominated. |
| Materiality threshold 15 | `d2936e7b… → 851ad…` | Expected `FORCED_DISPLACEMENT_CHANGED`, received no reasons. |
| Speculative threshold 0 | `39fffd46… → 5ab49…` | Controlled-distance witness expected a match; received `FACT_FALSE`. |
| Blind destination code | `3af57a60… → f97060…` | Expected `DESTINATION_REQUIRED`; received `NO_MATCHING_OPTION`. |
| Conversation option clone | `526a3171… → ad1e622c…` | Legacy invariance failed with `OFFER_ENVIRONMENT_MISMATCH`, degraded dodge, and revision 14 versus 17. |

Every mutant was restored from a pristine `/tmp` copy and its candidate SHA rechecked.

### Equal-binding allowance

The ten unchanged 3B scaffold files retain their obsolete expectation:

```text
Expected: { valid: false, code: "OFFER_ENVIRONMENT_MISMATCH" }
Received: { valid: true }
```

| Suite | Pre-B14 total | B14 result |
|---|---:|---:|
| `dm-encounter-host-live-path.test.ts` | 7 | 6 pass, 1 allowed failure at helper line 63 |
| `ai-dm-arena.test.ts` | 59 | import-time allowed failure at line 113; no tests collected |
| `ai-dm-board-delivery.test.ts` | 18 | 10 pass, 8 fail |
| `ai-dm-board-snapshot.test.ts` | 21 | 20 pass, 1 allowed failure at line 80 |
| `ai-dm-conversation.test.ts` | 108 | 86 pass, 22 fail |
| `ai-dm-knowledge-base.test.ts` | 20 | 18 pass, 2 allowed failures at line 104 |
| `engine-mcp-boundary.test.ts` | 8 | 5 pass, 3 allowed failures at line 55 |
| `engine-mcp-golden.test.ts` | 3 | 1 pass, 2 allowed failures at line 121 |
| `engine-mcp-handler.test.ts` | 130 | 5 pass, 106 allowed failures at line 86, 19 unstarted/skipped |
| `local-openai-conversation.SIMULATED.test.ts` | 4 | 3 pass, 1 allowed failure at line 360 |

The board-delivery failures originate at helper line 87. Five report that assertion directly; the remaining three surface downstream at lines 535, 594, and 739 after their mutation harness catches the helper failure.

The conversation suite’s direct equality failures are at line 147. Its downstream scaffold failures occur at lines 1350, 1384, 1405, 1515, 1578, 1606 twice, 1635, 1677, 1795, 1827, 1879, 1908, 1983 twice, 2015, 2056, and 2912 three times. Each path first constructs the scaffold runtime at line 165; the obsolete helper exception prevents the intended fixture execution. The test file and its 54-line current scaffold were unchanged. These are the plan-authorized B16 cleanup family, not production behavior regressions.

All other importer suites are green, including legacy invariance.

### Final green

TypeScript:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
exit 0, zero diagnostics

node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
exit 0, zero diagnostics
```

Architecture:

```text
node scripts/check-command-outcomes.mjs
exit 0

offer-environment architecture self-test: 39 active fixtures passed
staged real-symbol fixture groups: required-surfaces:11, resolver:6, final-query:14
offer-environment architecture: 1621 TypeScript files checked
runtime export allowlist: builder plus exactly five transitional factories/wrappers
```

Core suites:

```text
offer-environment.test.ts                    16/16
offer-environment-identity.test.ts            3/3
offer-environment-board-sequence.test.ts      1/1
engine-state-capsule.test.ts                 11/11
engine-query-port.test.ts                     9/9
plan-materiality.test.ts                     18/18
speculative-planning.test.ts                 23/23
Total                                        81/81
```

B17 non-3B controls:

```text
legendary-windows.test.ts                     6/6
projected-movement-options.test.ts            3/3
blind-intent-resolver.test.ts                12/12
speculative-planning.test.ts                 23/23
Total                                        44/44
```

Direct importer closure: 41 suites, 808/808 outside the explicitly allowed 3B scaffold set. Per-file counts:

```text
creature-space 15
ai-dm-legacy-invariance 10
engine-mcp-server 14
heldout-leak-check 239
los-cover-call-sites 2
adjustment-exhaustion-coordinator 8
arena-basis-brutal-b 47
blind-context-source-binding 5
blind-intent-resolver 12
challenge-room-fixtures 15
composite-turn-proposals 10
dm-tactical-intel 6
engine-context-integrations 16
engine-host-integration 2
engine-opportunity-movement-intel 6
engine-query-port 9
engine-round-session 21
engine-state-capsule 11
footprint-increment-three 9
hypnotic-pattern-probe 6
legendary-windows 6
mixed-kind-multiattack 3
monster-omitted-riders 8
offer-environment-board-sequence 1
offer-environment-identity 3
offer-environment 16
offered-option-paths 4
option-outcome 4
plan-materiality 18
plays-v1 13
projected-movement-options 3
room-generator-los-cover 111
room-generator 66
snippet-purity 1
snippets 34
speculative-planning 23
standard-offer-generator 3
tactical-evaluator-r02 2
team-scorer 6
turn-exhaustion-coordinator 14
unicorns-blessing-consistency 6
```

M-3:

```text
handoff-bootstrap.test.ts
handoff-contract.test.ts
handoff-examples.test.ts
handoff-package-contract.test.ts
handoff-publish.test.ts
handoff-report.test.ts
6 files, 72/72 passed
```

Forward-contraction overlay:

```text
providerEdits=66 removedFactories=4
outsideCallerManifest=0
```

All eleven B14 files reported `0` diagnostics.

Other final checks:

```text
git diff --check
exit 0

npx vitest list --configLoader runner --filesOnly --json
discovery=643
fixturePaths=0
```

Added-line maximum lengths / lines over 120:

```text
blind-intent-resolver.ts       108 / 0
engine-query-port.ts            84 / 0
engine-state-capsule.ts          0 / 0
opportunity-cost.ts             81 / 0
team-scorer.ts                  81 / 0
intent-resolver.ts              80 / 0
engine-server.ts               111 / 0
plan-materiality.ts             95 / 0
speculative-planning.ts         80 / 0
offer-environment.test.ts      112 / 0
ai-dm-conversation.ts           67 / 0
```

Final immutable SHAs:

```text
package-lock.json
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867

src/vtt/intel/contracts.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1

.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4
```

Final status is exactly the eleven authorized files:

```text
 M src/vtt/blind-intent-resolver.ts
 M src/vtt/engine-query-port.ts
 M src/vtt/engine-state-capsule.ts
 M src/vtt/intel/opportunity-cost.ts
 M src/vtt/intel/team-scorer.ts
 M src/vtt/intent-resolver.ts
 M src/vtt/mcp/engine-server.ts
 M src/vtt/plan-materiality.ts
 M src/vtt/speculative-planning.ts
 M tests/unit/vtt/offer-environment.test.ts
 M tools/ai-dm-conversation.ts
```

S3 B14 DONE
