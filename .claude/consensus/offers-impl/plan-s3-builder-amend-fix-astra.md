# OFFERS-IMPL-S3-BUILDER amendment fix (PS3B-A1 + supervisor codec addition) — gpt-6-astra final message

Session 01a0a11f-98e6-7943-ae51-3be4cf7f5ae0; log .tmp/runs/fanout/plan-s3-amend-fix.log.

Updated [the plan](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md).

Verified:

- `wc -l -c`: **999 lines, 79,457 bytes**.
- **18 batches**, each ≤10 files; **125 distinct files**, 167 batch/file appearances.
- Added to the manifest: `src/vtt/offers/offer-codec-primitives.ts` and `src/vtt/offers/party-threat-catalog.ts`.
- `git status --short --untracked-files=all`: **empty**.
- No tests ran.

Plan SHA-256:
`fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4`

Frozen contract SHA-256, unchanged:
`0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`

The requested pre-edit copy was made with:
```sh
cp .tmp-plans/2026-09-14-offer-environment-single-builder-plan.md /tmp/plan-before.md
```

<details>
<summary>Complete diff -u output (exit 1: differences found)</summary>

```diff
--- /tmp/plan-before.md	2026-09-14 17:21:36.451454576 -0400
+++ .tmp-plans/2026-09-14-offer-environment-single-builder-plan.md	2026-09-14 17:26:01.841777629 -0400
@@ -1,12 +1,12 @@
 # OFFERS-IMPL-S3-BUILDER — single environment builder
 Date: 2026-09-14.
 Author: astra, under D617.6, amended once under D617.8.
-Status: one D617.8 amendment to sol-accepted a5335ad2…, pending amendment review.
+Status: PS3B-A1 fix to amendment 574ae301… plus the bounded supervisor codec addition, pending review.
 Base: claude/p-offer-help at 0e2eb984368d7acc641cd6ec161411a99bb80cf1.
 Integrated parents: 82ae8554 and main 40f04e2c, with the three 3B union reconciliations retained.
 Authority: D617.5 and D617.6 approve recommendation D in simplify-s3b-astra.md.
 The tranche is NON-DISPATCHABLE and contains 18 review batches, each changing at most ten files.
-The inventory contains 123 distinct implementation files and 161 batch/file appearances.
+The inventory contains 125 distinct implementation files and 167 batch/file appearances.
 Repeated appearances are deliberate follow-up edits, not additional distinct files.
 No batch lands on main alone, and no offer-family work starts before cumulative acceptance.
 This document records verified reads/probes separately from proposed changes.
@@ -26,77 +26,36 @@
 No DM semantic export, provenance catalog, or internal board data may reach a player channel.
 Do not change model routing, timing, build-cache machinery, or M-1 gate evidence semantics.
 ## 2. Verified starting behavior at integrated 0e2eb984
-Locations in this section were re-read on 0e2eb984, not inherited from the audit's 40f04e2c snapshot.
-The merge retains the 82ae8554 scaffold and main's D569/D613 tests in arena, conversation, and knowledge-base suites.
-The literal legacy grep still identifies eight files: seven external construction sites plus the factory definition.
-| Site | Current behavior |
+| Module | Verified locations and behavior |
 |---|---|
-| src/vtt/encounter-projections.ts:483 | projectDmBoard constructs legacy locally; its input starts at 399. |
-| src/vtt/dm-encounter-host.ts:393–409 | Optional environment, enclosing options = {}, and ?? legacy construction. |
-| src/vtt/encounter-board-projection.ts:59 | Fourth argument defaults to legacy. |
-| src/vtt/offered-option-paths.ts:63,131,150 | A transitional module singleton supplies two parameter defaults. |
-| src/vtt/engine-round-session.ts:358 | Fourth constructor parameter defaults to legacy. |
-| src/vtt/mcp/entrypoint.ts:437–453 | Optional runtime environment, enclosing = {}, and ?? legacy construction. |
-| tools/ai-dm-conversation.ts:4252 | Explicit run-root legacy construction. |
-| src/vtt/offers/offer-environment.ts:179 | Factory definition, not an eighth consumer fallback. |
-Offer-environment.ts exports runtime factories at 151,165,179,192, with internal delegations at 171,180,193.
-Conversation reconstructs at 2283,3613,3686,3950 and serializes capsule.offerEnvironment at 3417.
-Entrypoint exports reconstruction at 1064, delegates at 1067, invokes it at 1118, and forwards the result at 1156.
-Entrypoint's launcher construction type still has optional offerEnvironment at 337 despite strict runtime decoding.
-Its handler wrappers at 654–659 omit the runtime environment.
-Both runEngineMcpServer at 678 and runEngineMcpLines at 692 inherit empty runtime-options initializers.
-The raw-fixture options branches at 1248–1256 do not supply an environment.
-Capsule.ts:944–949 still exposes a wrapper that silently creates a legacy binding.
-Host snapshot at dm-encounter-host.ts:566 omits its environment when calling projectDmBoard.
-Browser composition creates its host at encounter-app.ts:1470.
-Keep the host's merged detached/immutable snapshot behavior when adding DM digest conservation.
-
-### 2.1 Query defaults and canonical bypasses
-The audit's 13 count is twelve fallback sites plus the resolver singleton, not thirteen parameter initializers.
-There are eleven parameter initializers, one optional-dependency ?? fallback, and one singleton.
-| Module | Exact current default/singleton locations |
-|---|---|
-| speculative-planning.ts | queries defaults 105,356,570,611,761; environment defaults 299,681; optional planner at 282. |
-| intent-resolver.ts | environment defaults 548,652,682; default resolver singleton 729; union alias 73. |
-| engine-query-port.ts | registry queries default 906. |
-| blind-intent-resolver.ts | optional dependencies at 77, optional queries at 55, and canonical ?? fallback at 776. |
-Opportunity-cost.ts:154,273 and team-scorer.ts:206,279,322,469 retain environment/query-port union arms.
-Plan-materiality.ts:36,104–108 retains optional environment and unbound option generation.
-The canonical identifier appears in 45 src/tools/test files, all assigned in the amended manifest.
-Arena-legality.ts has seven direct uses at 21,25,29,40,47,59,111.
-Legendary nearest-enemy selection uses canonical spaceDistance at legendary-windows.ts:199–200.
-Entrypoint's blind projection uses canonical queries at 545 rather than its runtime environment.
-Engine-query-port.ts:1043–1048 drops environment provenance through its old registry at 1023–1024.
-Allocation generation/resolution bypass the environment at engine-query-port.ts:1733,1788.
-Conversation's planning bypasses are at 1460,1499,1612,1657,1688,1708,1815,1820,1846,1852.
-Later conversation bypasses are at 2666,3767,3770,4625,6037,7222,7285.
-Its reconstruction arguments at 2284,3614,3687,3951 and root construction at 4252 also import canonical directly.
-Tools/renderer-calibration.ts:232 passes canonical queries to exactDmIntelMatrix.
-The canonical implementation is the object literal at engine-query-port.ts:1834, frozen/exported at 1901.
-No exported createEngineQueryPort exists.
-The final import rule also covers tests such as projected-movement-options.test.ts, absent from the prior manifest.
-
-### 2.2 Provenance and process boundaries
-Intent-resolver.ts:75 stores option→environment references and registers them at 91–102.
-Its guard at 550–555 rejects a different reference but admits absent provenance.
-Offered-option-paths.ts:163–166 translates that refusal and does not itself compare digests.
-The binding digest body at offer-environment.ts:19–34,114–162 hashes format, mode, familyPolicy, and catalog.
-Queries are supplied separately and are not hashed.
-Capsule.ts:204,619 carries/decodes the binding; 921–940 includes it in the capsule digest but excludes generatedAt.
-Engine-state-capsule.ts:951–952 exposes engine-state:<capsule digest>.
-MCP engine-server.ts:1454 checks the launch digest, but feed replacement at 236–242 does not pin its environment.
-Its dependency bag at 318 separately accepts turnProposals, supplied by entrypoint.ts:556–557.
-Blind intent submission at engine-server.ts:2272–2279 separately passes queries and proposalResolver.
-Entrypoint.ts:1036–1046 rejects missing/malformed bindings for recognized launchers.
-The two direct child spawns are dry-client.ts:36–41 and conversation.ts:1987–1990.
-Conversation also configures the same executable for its agent adapter at 4235.
-The dry client currently supplies a raw fixture rather than a serialized-binding launcher.
-Divergence uses the ambient resolver at conversation.ts:4004–4008.
-The self-comparison and getter spy are now ai-dm-conversation.test.ts:2099,2107.
-SIMULATED's real construction observation at 239–254 and advertised/submitted/accepted assertions remain.
-The scoped gate remains scripts/check-command-outcomes.sh:4, sg scan --config sgconfig.yml src.
-Package.json:17 test:gate still invokes node tools/gate-vitest.mjs without that architecture prefix.
-Sgconfig.yml still loads six rules, including the TypeScript import restriction vtt-snippet-purity.
+| offers/offer-environment.ts | Runtime factories 151,165,179,192 delegate at 171,180,193; 179 is the definition, not an eighth fallback. |
+| encounter-projections.ts | projectDmBoard input 399 constructs legacy locally at 483. |
+| dm-encounter-host.ts | Optional environment/options = {} at 393–409 fall back to legacy; snapshot 566 omits the projector environment. |
+| encounter-board-projection.ts | Fourth argument at 59 defaults to legacy. |
+| offered-option-paths.ts | Singleton 63 supplies defaults 131,150; 163–166 translates resolver refusal without comparing digests. |
+| engine-round-session.ts | Fourth constructor argument at 358 defaults to legacy. |
+| mcp/entrypoint.ts | Optional binding 337; optional runtime environment/options = {} 437–453; handler wrappers 654–659 omit it. |
+| mcp/entrypoint.ts | Server/line-server options default at 678/692; raw-fixture branches 1248–1256 lack environments; blind projection 545 uses canonical. |
+| mcp/entrypoint.ts | Reconstruction export/delegation/use/forwarding 1064/1067/1118/1156; launcher decoder 1036–1046 rejects missing/malformed binding. |
+| engine-state-capsule.ts | Binding 204/619; digest 921–940 includes binding but excludes generatedAt; handle 951–952; legacy wrapper 944–949. |
+| encounter-app.ts | Browser composition creates its host at 1470; preserve the merged host's detached/immutable snapshots. |
+| tools/ai-dm-conversation.ts | Legacy root 4252; reconstruction 2283,3613,3686,3950; canonical arguments 2284,3614,3687,3951; binding serialized 3417. |
+| tools/ai-dm-conversation.ts | Canonical planning bypasses 1460,1499,1612,1657,1688,1708,1815,1820,1846,1852,2666,3767,3770,4625,6037,7222,7285. |
+| tools/ai-dm-conversation.ts | Ambient divergence resolver 4004–4008; test self-comparison/getter spy 2099/2107; SIMULATED construction 239–254 observes production. |
+| speculative-planning.ts | Queries default at 105,356,570,611,761; environment default at 299,681; optional planner at 282. |
+| intent-resolver.ts | Union 73; WeakMap references 75/91–102; guard 550–555 admits absent provenance; defaults 548,652,682; singleton 729. |
+| blind-intent-resolver.ts | Optional dependencies 77, queries 55, and canonical ?? fallback 776. |
+| intel/opportunity-cost.ts and intel/team-scorer.ts | Environment/query unions at 154,273 and 206,279,322,469 respectively. |
+| plan-materiality.ts | Optional environment 36 and unbound option generation 104–108. |
+| arena-legality.ts and intel/legendary-windows.ts | Seven canonical uses 21,25,29,40,47,59,111 and nearest-enemy canonical distances 199–200 respectively. |
+| engine-query-port.ts | Registry default 906; provenance loss 1023–1024/1043–1048; allocation bypasses 1733,1788; canonical literal/export 1834/1901. |
+| mcp/engine-server.ts | Launch check 1454; unpinned feed replacement 236–242; independent turnProposals 318/entrypoint 556–557; blind dependencies 2272–2279. |
+| Child roots | Direct spawns dry-client.ts:36–41 and conversation.ts:1987–1990, plus adapter executable 4235; dry client currently supplies a raw fixture. |
+| tools/renderer-calibration.ts | exactDmIntelMatrix gets canonical queries at 232. |
+| Digest body | offer-environment.ts:19–34,114–162 hashes format/mode/policy/catalog, excluding separately supplied queries. |
+| Gate | check-command-outcomes.sh:4 scans src only; package.json:17 lacks the prefix; sgconfig.yml loads six rules including vtt-snippet-purity. |
+The thirteen query items are eleven parameter initializers, one optional-dependency fallback, and one resolver singleton.
+All 45 canonical-reference files are assigned, including projected-movement-options.test.ts; no createEngineQueryPort is exported.
 
 ## 3. Final builder and consumption contract
 Create src/vtt/offers/build-offer-environment.ts with exactly one exported runtime function.
@@ -213,7 +172,7 @@
 If selectable query implementations or cross-version replay become supported, introduce an explicit semantic policy version then.
 A version label alone would not catch a bypass or an implementation change made without updating that label.
 
-Remove all twelve current query fallback sites and the resolver singleton listed in section 2.1.
+Remove all twelve current query fallback sites and the resolver singleton listed in section 2.
 Offer-aware APIs retain the required branded environment and obtain their queries from it.
 The five query-only speculative helpers retain EngineQueryPort parameters but lose their default initializers.
 They are evaluateScenarioFact, extractProposalFactDependencies, canPlayerFlipScenarioFact, computeHostSplitCandidates, and evaluateHostScenarios.
@@ -269,7 +228,7 @@
 The accepted 118-file manifest already covers all 78 first-probe files.
 The full probe adds arena-legality.ts, blind-intent-resolver.ts, and legendary-windows.test.ts to that manifest.
 The canonical-import scan additionally requires legendary-windows.ts and projected-movement-options.test.ts.
-Thus the amended manifest is 123 distinct files, with every one of the 108 diagnostic files assigned below.
+With party-threat-catalog.ts and the new offer-codec-primitives.ts, the manifest is 125 distinct files covering all 108 diagnostic files.
 B1–B12 retain their caller groups on the now-integrated tree and migrate all canonical imports in their listed files.
 B2 grows to ten files for arena/blind setup, and B3 grows to ten for legendary query forwarding.
 B14 exchanges the identity-suite edit for blind resolver type closure to keep the checkpoint at ten files.
@@ -595,16 +554,35 @@
 Required reds: QUERY_DEFAULT_REINTRODUCED and CONSUMER_USES_CANONICAL_BYPASS.
 Only after this checkpoint may B15 enable the final canonical-import and real-symbol signature gates.
 
-### B15 — Remove old exports and finish enforcement (4 files)
+### B15 — Remove old exports, unify codecs, and finish enforcement (10 files)
 - src/vtt/offers/offer-environment.ts
 - src/vtt/mcp/entrypoint.ts
 - ast-grep-rules/no-alternative-offer-environment-construction.yml
 - scripts/check-offer-environment-architecture.mjs
+- src/vtt/offers/offer-codec-primitives.ts
+- src/vtt/offers/party-threat-catalog.ts
+- src/vtt/offers/build-offer-environment.ts
+- tests/unit/vtt/offer-environment.test.ts
+- tests/unit/vtt/offer-environment-identity.test.ts
+- tests/unit/tools/ai-dm-legacy-invariance.test.ts
+B15 is the first joint codec batch, using its six free slots without moving any accepted caller/signature checkpoint.
+The new offer-codec-primitives.ts owns exactly one exported constant per tag, with no re-exported aliases:
+ENGINE_OPTION_ENVIRONMENT_FORMAT = 'engine-option-environment-v1'.
+ENGINE_OFFER_FAMILY_POLICY_FORMAT = 'engine-offer-family-policy-v1'.
+PARTY_THREAT_CATALOG_FORMAT = 'party-threat-catalog-v1'.
+Use inferred literal const types and typeof CONSTANT in format types, and import constants in every producer/validator.
+Replace every tag retyping in both codec modules, the builder, and all three listed tests, including merged legacy-invariance.
+The shared module also exports the sole offers digestBody(value: object), deepFreeze<T>(value: T), and exactKeys checker.
+Both codec modules import those helpers; delete their copies and use shared exactKeys/deepFreeze in the builder if needed.
+Preserve sha256(canonicalJson(value)), recursion/freeze guards, key sorting, exceptions, and every serialized byte exactly.
+Keep the tests' independent digest derivations, expected hashes, and legacy IDs; do not replace their oracle with digestBody.
+If extraction changes any digest, STOP and report instead of updating any pin.
 Delete all four old runtime factory exports, the old structural type export, and launcher reconstruction wrapper.
 Remove the architecture migration allowlist and require exactly one environment-producing runtime export.
 After B18, set the extended sg rule to severity: error across src, tools, and tests.
 Reject imports, namespace references, re-exports, aliases, unsafe brand assertions, and consumer-side construction.
-T plus the three environment suites and final src/tools/tests architecture checks must pass.
+T plus the three environment suites, ai-dm-legacy-invariance, and final src/tools/tests architecture checks must pass.
+Required red: OFFERS_FORMAT_TAG_RETYPED via the named architecture fixtures below, with all legacy-ID/digest pins unchanged.
 Required reds: SECOND_ENV_BUILDER, LEGACY_FACTORY_IMPORT, alias/re-export bypass, forged brand, and missing dependencies.
 
 ### B16 — Ten-file 3B simplification (10 files)
@@ -664,12 +642,32 @@
 Only the builder may import canonicalEngineQueryPort; engine-query-port.ts may define/export its canonical value.
 Forbid canonical references in consumer bodies inside engine-query-port.ts, including allocation evaluation.
 Reject namespace/dynamic imports and star re-exports that expose canonical outside those two modules.
-Trace aliases, destructuring, and constant computed-member access instead of checking only a local identifier's spelling.
+Trace symbol origin through require(), createRequire() loaders/aliases, and TypeScript import x = require(...).
+Follow required-module bindings through aliases, destructuring, and constant computed members, including load→m→k→m[k].
+Reject CommonJS whole-module re-exports exposing engine-query-port outside the two permitted modules.
+Named virtual negative fixtures live in scripts/check-offer-environment-architecture.mjs --self-test:
+canonical-require-direct.cts: require('./engine-query-port').canonicalEngineQueryPort.
+canonical-require-destructured.cts: destructure canonicalEngineQueryPort into an alias from require().
+canonical-create-require-computed.mts: alias createRequire from node:module, then load→m→constant k→m[k].
+canonical-require-computed.cts: require() module binding followed by constant-key canonical access.
+canonical-import-equals.cts: import m = require('./engine-query-port') with separate canonical-access and export = m cases.
+canonical-commonjs-reexport.cts: module.exports = require('./engine-query-port'), also through a module alias.
+canonical-commonjs-named-reexport.cts: exports.queries = require('./engine-query-port').
+canonical-dynamic-import.mts: await import('./engine-query-port') followed by computed canonical access.
+canonical-star-export.mts: export * from './engine-query-port'.
+These are in-memory fixtures, not new manifest files, resolved against the real production module.
+Use compatible ESM/CommonJS fixture compiler options; unrelated import-equals module errors cannot count as architecture kills.
+Trace ESM aliases, destructuring, and constant computed-member access as before.
 Production query arguments originate at environment.queries or a forwarded required query parameter.
 Reject production EngineQueryPort literals/spreads outside its implementation; typed test doubles are permitted only in tests.
 Path-aware self-tests admit the builder import and canonical declaration and reject downstream/type-of-value aliases.
 Include defaults hidden behind aliases and canonical bypasses inside the defining module as negative fixtures.
 The 45 current canonical-reference files are a temporary migration inventory, never a permanent exemption list.
+At B15, the symbol checker rejects the three exact tag literals outside their sole constant initializers in offer-codec-primitives.ts.
+Check src/tools/tests string and literal-type nodes, including codec and builder files exempted by the sg factory rule.
+The virtual self-test cases offers-format-env-retyped.ts, offers-format-policy-retyped.ts, and offers-format-catalog-retyped.ts each retype one tag.
+Their positive companion offers-format-imported.ts imports all three constants; OFFERS_FORMAT_TAG_RETYPED must fail this check.
+Stage these format cases at B1; activate their self-tests and repository check only after B15 replaces the literal sites.
 B15 removes all migration allowances after B18 and imports actual production declarations for signature controls.
 
 The syntax rule is supplemented by scripts/check-offer-environment-architecture.mjs using TypeScript symbols.
@@ -772,6 +770,7 @@
 | MISSING_ENV_ARGUMENT | Architecture negative compile fixtures for each required host/round/runtime/board/resolver API. |
 | SECOND_ENV_BUILDER | Architecture exported-wrapper/class/alias fixtures and final symbol scan. |
 | LEGACY_FACTORY_IMPORT | New sg rule fixtures and final src/tools/tests scan. |
+| OFFERS_FORMAT_TAG_RETYPED | Architecture tag-literal check and offers-format-{env,policy,catalog}-retyped.ts self-tests. |
 | FALLBACK_USES_LEGACY_ONLY | offer-environment-identity: bound fallback acceptance after primary refusal. |
 | BOARD_DIFFERENT_POLICY | offer-environment-identity path refusal plus actual host/board-sequence digest conservation. |
 | CONSUMER_DROPS_BOUND_ENV | Actual runtime capsule binding assertions, host/board digest test, and SIMULATED reference capsule. |
@@ -964,7 +963,11 @@
 Reading vitest.config.ts confirmed tests/**/*.test.ts with tests/integration-supervisor/** excluded for ordinary runs.
 A node read-only filter of rg --files tests counted exactly 643 matching .test.ts files.
 This is static merged discovery membership, not a Vitest discovery run or the supervisor's in-progress test verdict.
-No test, browser, build, installation, model call, source write, or scratch write ran during this amendment.
+No test, browser, build, installation, model call, or source write ran during this amendment/fix.
+Fix-round cp saved only the requested /tmp/plan-before.md comparison copy before editing the plan.
+AST reads found environment/policy tags 5/4 times in offer-environment.ts and catalog tags 6 times in party-threat-catalog.ts.
+The merged tree has five further tag occurrences across the three B15 test files, correcting the audit's earlier two-file count.
+Read-only AST comparison found identical deepFreeze/exactKeys bodies and digestBody differing only in parameter name/type.
 
 ## 9. Merge scale, risks, and stopping conditions
 PS3B-F1: git diff --stat 82ae8554...40f04e2c | tail -1 returned:
@@ -972,7 +975,7 @@
 The same scoped command with -- src/vtt tools tests/unit/vtt tests/unit/tools returned:
 177 files changed, 55268 insertions(+), 1247 deletions(-).
 The full range includes earlier main work as well as M-1, M-14, and M-3.
-The amended 123-file manifest intersects 45 changed main paths, versus 44 for the accepted 118-file manifest.
+The amended 125-file manifest still intersects 45 changed main paths, versus 44 for the accepted 118-file manifest.
 The added overlap is src/vtt/blind-intent-resolver.ts.
 M-1 changes gate runners/reporters/specs outside this manifest; preserve its authoritative evidence behavior.
 M-14 changes supervision, BUILD-PLAN, ids commentary, and operational-guidance-facts.test.ts without direct file overlap.
@@ -991,6 +994,6 @@
 The frozen contract hash remains 0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1.
 A frozen-file change, unexpected discovery loss, surviving mutant, pin regeneration, or batch ceiling violation blocks landing.
 Any caller discovered outside this manifest requires an explicit at-most-ten-file extension before acceptance.
-Sol accepted a5335ad2… with PS3B-F1/F2; this amendment incorporates both and awaits supervisor-owned review.
+Sol accepted a5335ad2… with PS3B-F1/F2; this fix addresses 574ae301… rejection PS3B-A1 and the bounded codec addition.
 
-PLAN S3 BUILDER AMEND DONE
+PLAN S3 BUILDER AMEND FIX DONE
```

</details>

PLAN S3 BUILDER AMEND FIX DONE
diff --git a/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md b/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
index 408307b239d7e3027727e7f4f3eb69503ac0b12a..99029986be54ab4d7b8995d5e98843b4a6dbb810
--- a/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
+++ b/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
@@ -1,12 +1,12 @@
 # OFFERS-IMPL-S3-BUILDER — single environment builder
 Date: 2026-09-14.
 Author: astra, under D617.6, amended once under D617.8.
-Status: one D617.8 amendment to sol-accepted a5335ad2…, pending amendment review.
+Status: PS3B-A1 fix to amendment 574ae301… plus the bounded supervisor codec addition, pending review.
 Base: claude/p-offer-help at 0e2eb984368d7acc641cd6ec161411a99bb80cf1.
 Integrated parents: 82ae8554 and main 40f04e2c, with the three 3B union reconciliations retained.
 Authority: D617.5 and D617.6 approve recommendation D in simplify-s3b-astra.md.
 The tranche is NON-DISPATCHABLE and contains 18 review batches, each changing at most ten files.
-The inventory contains 123 distinct implementation files and 161 batch/file appearances.
+The inventory contains 125 distinct implementation files and 167 batch/file appearances.
 Repeated appearances are deliberate follow-up edits, not additional distinct files.
 No batch lands on main alone, and no offer-family work starts before cumulative acceptance.
 This document records verified reads/probes separately from proposed changes.
@@ -26,77 +26,36 @@
 No DM semantic export, provenance catalog, or internal board data may reach a player channel.
 Do not change model routing, timing, build-cache machinery, or M-1 gate evidence semantics.
 ## 2. Verified starting behavior at integrated 0e2eb984
-Locations in this section were re-read on 0e2eb984, not inherited from the audit's 40f04e2c snapshot.
-The merge retains the 82ae8554 scaffold and main's D569/D613 tests in arena, conversation, and knowledge-base suites.
-The literal legacy grep still identifies eight files: seven external construction sites plus the factory definition.
-| Site | Current behavior |
-|---|---|
-| src/vtt/encounter-projections.ts:483 | projectDmBoard constructs legacy locally; its input starts at 399. |
-| src/vtt/dm-encounter-host.ts:393–409 | Optional environment, enclosing options = {}, and ?? legacy construction. |
-| src/vtt/encounter-board-projection.ts:59 | Fourth argument defaults to legacy. |
-| src/vtt/offered-option-paths.ts:63,131,150 | A transitional module singleton supplies two parameter defaults. |
-| src/vtt/engine-round-session.ts:358 | Fourth constructor parameter defaults to legacy. |
-| src/vtt/mcp/entrypoint.ts:437–453 | Optional runtime environment, enclosing = {}, and ?? legacy construction. |
-| tools/ai-dm-conversation.ts:4252 | Explicit run-root legacy construction. |
-| src/vtt/offers/offer-environment.ts:179 | Factory definition, not an eighth consumer fallback. |
-Offer-environment.ts exports runtime factories at 151,165,179,192, with internal delegations at 171,180,193.
-Conversation reconstructs at 2283,3613,3686,3950 and serializes capsule.offerEnvironment at 3417.
-Entrypoint exports reconstruction at 1064, delegates at 1067, invokes it at 1118, and forwards the result at 1156.
-Entrypoint's launcher construction type still has optional offerEnvironment at 337 despite strict runtime decoding.
-Its handler wrappers at 654–659 omit the runtime environment.
-Both runEngineMcpServer at 678 and runEngineMcpLines at 692 inherit empty runtime-options initializers.
-The raw-fixture options branches at 1248–1256 do not supply an environment.
-Capsule.ts:944–949 still exposes a wrapper that silently creates a legacy binding.
-Host snapshot at dm-encounter-host.ts:566 omits its environment when calling projectDmBoard.
-Browser composition creates its host at encounter-app.ts:1470.
-Keep the host's merged detached/immutable snapshot behavior when adding DM digest conservation.
-
-### 2.1 Query defaults and canonical bypasses
-The audit's 13 count is twelve fallback sites plus the resolver singleton, not thirteen parameter initializers.
-There are eleven parameter initializers, one optional-dependency ?? fallback, and one singleton.
-| Module | Exact current default/singleton locations |
+| Module | Verified locations and behavior |
 |---|---|
-| speculative-planning.ts | queries defaults 105,356,570,611,761; environment defaults 299,681; optional planner at 282. |
-| intent-resolver.ts | environment defaults 548,652,682; default resolver singleton 729; union alias 73. |
-| engine-query-port.ts | registry queries default 906. |
-| blind-intent-resolver.ts | optional dependencies at 77, optional queries at 55, and canonical ?? fallback at 776. |
-Opportunity-cost.ts:154,273 and team-scorer.ts:206,279,322,469 retain environment/query-port union arms.
-Plan-materiality.ts:36,104–108 retains optional environment and unbound option generation.
-The canonical identifier appears in 45 src/tools/test files, all assigned in the amended manifest.
-Arena-legality.ts has seven direct uses at 21,25,29,40,47,59,111.
-Legendary nearest-enemy selection uses canonical spaceDistance at legendary-windows.ts:199–200.
-Entrypoint's blind projection uses canonical queries at 545 rather than its runtime environment.
-Engine-query-port.ts:1043–1048 drops environment provenance through its old registry at 1023–1024.
-Allocation generation/resolution bypass the environment at engine-query-port.ts:1733,1788.
-Conversation's planning bypasses are at 1460,1499,1612,1657,1688,1708,1815,1820,1846,1852.
-Later conversation bypasses are at 2666,3767,3770,4625,6037,7222,7285.
-Its reconstruction arguments at 2284,3614,3687,3951 and root construction at 4252 also import canonical directly.
-Tools/renderer-calibration.ts:232 passes canonical queries to exactDmIntelMatrix.
-The canonical implementation is the object literal at engine-query-port.ts:1834, frozen/exported at 1901.
-No exported createEngineQueryPort exists.
-The final import rule also covers tests such as projected-movement-options.test.ts, absent from the prior manifest.
-
-### 2.2 Provenance and process boundaries
-Intent-resolver.ts:75 stores option→environment references and registers them at 91–102.
-Its guard at 550–555 rejects a different reference but admits absent provenance.
-Offered-option-paths.ts:163–166 translates that refusal and does not itself compare digests.
-The binding digest body at offer-environment.ts:19–34,114–162 hashes format, mode, familyPolicy, and catalog.
-Queries are supplied separately and are not hashed.
-Capsule.ts:204,619 carries/decodes the binding; 921–940 includes it in the capsule digest but excludes generatedAt.
-Engine-state-capsule.ts:951–952 exposes engine-state:<capsule digest>.
-MCP engine-server.ts:1454 checks the launch digest, but feed replacement at 236–242 does not pin its environment.
-Its dependency bag at 318 separately accepts turnProposals, supplied by entrypoint.ts:556–557.
-Blind intent submission at engine-server.ts:2272–2279 separately passes queries and proposalResolver.
-Entrypoint.ts:1036–1046 rejects missing/malformed bindings for recognized launchers.
-The two direct child spawns are dry-client.ts:36–41 and conversation.ts:1987–1990.
-Conversation also configures the same executable for its agent adapter at 4235.
-The dry client currently supplies a raw fixture rather than a serialized-binding launcher.
-Divergence uses the ambient resolver at conversation.ts:4004–4008.
-The self-comparison and getter spy are now ai-dm-conversation.test.ts:2099,2107.
-SIMULATED's real construction observation at 239–254 and advertised/submitted/accepted assertions remain.
-The scoped gate remains scripts/check-command-outcomes.sh:4, sg scan --config sgconfig.yml src.
-Package.json:17 test:gate still invokes node tools/gate-vitest.mjs without that architecture prefix.
-Sgconfig.yml still loads six rules, including the TypeScript import restriction vtt-snippet-purity.
+| offers/offer-environment.ts | Runtime factories 151,165,179,192 delegate at 171,180,193; 179 is the definition, not an eighth fallback. |
+| encounter-projections.ts | projectDmBoard input 399 constructs legacy locally at 483. |
+| dm-encounter-host.ts | Optional environment/options = {} at 393–409 fall back to legacy; snapshot 566 omits the projector environment. |
+| encounter-board-projection.ts | Fourth argument at 59 defaults to legacy. |
+| offered-option-paths.ts | Singleton 63 supplies defaults 131,150; 163–166 translates resolver refusal without comparing digests. |
+| engine-round-session.ts | Fourth constructor argument at 358 defaults to legacy. |
+| mcp/entrypoint.ts | Optional binding 337; optional runtime environment/options = {} 437–453; handler wrappers 654–659 omit it. |
+| mcp/entrypoint.ts | Server/line-server options default at 678/692; raw-fixture branches 1248–1256 lack environments; blind projection 545 uses canonical. |
+| mcp/entrypoint.ts | Reconstruction export/delegation/use/forwarding 1064/1067/1118/1156; launcher decoder 1036–1046 rejects missing/malformed binding. |
+| engine-state-capsule.ts | Binding 204/619; digest 921–940 includes binding but excludes generatedAt; handle 951–952; legacy wrapper 944–949. |
+| encounter-app.ts | Browser composition creates its host at 1470; preserve the merged host's detached/immutable snapshots. |
+| tools/ai-dm-conversation.ts | Legacy root 4252; reconstruction 2283,3613,3686,3950; canonical arguments 2284,3614,3687,3951; binding serialized 3417. |
+| tools/ai-dm-conversation.ts | Canonical planning bypasses 1460,1499,1612,1657,1688,1708,1815,1820,1846,1852,2666,3767,3770,4625,6037,7222,7285. |
+| tools/ai-dm-conversation.ts | Ambient divergence resolver 4004–4008; test self-comparison/getter spy 2099/2107; SIMULATED construction 239–254 observes production. |
+| speculative-planning.ts | Queries default at 105,356,570,611,761; environment default at 299,681; optional planner at 282. |
+| intent-resolver.ts | Union 73; WeakMap references 75/91–102; guard 550–555 admits absent provenance; defaults 548,652,682; singleton 729. |
+| blind-intent-resolver.ts | Optional dependencies 77, queries 55, and canonical ?? fallback 776. |
+| intel/opportunity-cost.ts and intel/team-scorer.ts | Environment/query unions at 154,273 and 206,279,322,469 respectively. |
+| plan-materiality.ts | Optional environment 36 and unbound option generation 104–108. |
+| arena-legality.ts and intel/legendary-windows.ts | Seven canonical uses 21,25,29,40,47,59,111 and nearest-enemy canonical distances 199–200 respectively. |
+| engine-query-port.ts | Registry default 906; provenance loss 1023–1024/1043–1048; allocation bypasses 1733,1788; canonical literal/export 1834/1901. |
+| mcp/engine-server.ts | Launch check 1454; unpinned feed replacement 236–242; independent turnProposals 318/entrypoint 556–557; blind dependencies 2272–2279. |
+| Child roots | Direct spawns dry-client.ts:36–41 and conversation.ts:1987–1990, plus adapter executable 4235; dry client currently supplies a raw fixture. |
+| tools/renderer-calibration.ts | exactDmIntelMatrix gets canonical queries at 232. |
+| Digest body | offer-environment.ts:19–34,114–162 hashes format/mode/policy/catalog, excluding separately supplied queries. |
+| Gate | check-command-outcomes.sh:4 scans src only; package.json:17 lacks the prefix; sgconfig.yml loads six rules including vtt-snippet-purity. |
+The thirteen query items are eleven parameter initializers, one optional-dependency fallback, and one resolver singleton.
+All 45 canonical-reference files are assigned, including projected-movement-options.test.ts; no createEngineQueryPort is exported.
 
 ## 3. Final builder and consumption contract
 Create src/vtt/offers/build-offer-environment.ts with exactly one exported runtime function.
@@ -213,7 +172,7 @@
 If selectable query implementations or cross-version replay become supported, introduce an explicit semantic policy version then.
 A version label alone would not catch a bypass or an implementation change made without updating that label.
 
-Remove all twelve current query fallback sites and the resolver singleton listed in section 2.1.
+Remove all twelve current query fallback sites and the resolver singleton listed in section 2.
 Offer-aware APIs retain the required branded environment and obtain their queries from it.
 The five query-only speculative helpers retain EngineQueryPort parameters but lose their default initializers.
 They are evaluateScenarioFact, extractProposalFactDependencies, canPlayerFlipScenarioFact, computeHostSplitCandidates, and evaluateHostScenarios.
@@ -269,7 +228,7 @@
 The accepted 118-file manifest already covers all 78 first-probe files.
 The full probe adds arena-legality.ts, blind-intent-resolver.ts, and legendary-windows.test.ts to that manifest.
 The canonical-import scan additionally requires legendary-windows.ts and projected-movement-options.test.ts.
-Thus the amended manifest is 123 distinct files, with every one of the 108 diagnostic files assigned below.
+With party-threat-catalog.ts and the new offer-codec-primitives.ts, the manifest is 125 distinct files covering all 108 diagnostic files.
 B1–B12 retain their caller groups on the now-integrated tree and migrate all canonical imports in their listed files.
 B2 grows to ten files for arena/blind setup, and B3 grows to ten for legendary query forwarding.
 B14 exchanges the identity-suite edit for blind resolver type closure to keep the checkpoint at ten files.
@@ -595,16 +554,35 @@
 Required reds: QUERY_DEFAULT_REINTRODUCED and CONSUMER_USES_CANONICAL_BYPASS.
 Only after this checkpoint may B15 enable the final canonical-import and real-symbol signature gates.
 
-### B15 — Remove old exports and finish enforcement (4 files)
+### B15 — Remove old exports, unify codecs, and finish enforcement (10 files)
 - src/vtt/offers/offer-environment.ts
 - src/vtt/mcp/entrypoint.ts
 - ast-grep-rules/no-alternative-offer-environment-construction.yml
 - scripts/check-offer-environment-architecture.mjs
+- src/vtt/offers/offer-codec-primitives.ts
+- src/vtt/offers/party-threat-catalog.ts
+- src/vtt/offers/build-offer-environment.ts
+- tests/unit/vtt/offer-environment.test.ts
+- tests/unit/vtt/offer-environment-identity.test.ts
+- tests/unit/tools/ai-dm-legacy-invariance.test.ts
+B15 is the first joint codec batch, using its six free slots without moving any accepted caller/signature checkpoint.
+The new offer-codec-primitives.ts owns exactly one exported constant per tag, with no re-exported aliases:
+ENGINE_OPTION_ENVIRONMENT_FORMAT = 'engine-option-environment-v1'.
+ENGINE_OFFER_FAMILY_POLICY_FORMAT = 'engine-offer-family-policy-v1'.
+PARTY_THREAT_CATALOG_FORMAT = 'party-threat-catalog-v1'.
+Use inferred literal const types and typeof CONSTANT in format types, and import constants in every producer/validator.
+Replace every tag retyping in both codec modules, the builder, and all three listed tests, including merged legacy-invariance.
+The shared module also exports the sole offers digestBody(value: object), deepFreeze<T>(value: T), and exactKeys checker.
+Both codec modules import those helpers; delete their copies and use shared exactKeys/deepFreeze in the builder if needed.
+Preserve sha256(canonicalJson(value)), recursion/freeze guards, key sorting, exceptions, and every serialized byte exactly.
+Keep the tests' independent digest derivations, expected hashes, and legacy IDs; do not replace their oracle with digestBody.
+If extraction changes any digest, STOP and report instead of updating any pin.
 Delete all four old runtime factory exports, the old structural type export, and launcher reconstruction wrapper.
 Remove the architecture migration allowlist and require exactly one environment-producing runtime export.
 After B18, set the extended sg rule to severity: error across src, tools, and tests.
 Reject imports, namespace references, re-exports, aliases, unsafe brand assertions, and consumer-side construction.
-T plus the three environment suites and final src/tools/tests architecture checks must pass.
+T plus the three environment suites, ai-dm-legacy-invariance, and final src/tools/tests architecture checks must pass.
+Required red: OFFERS_FORMAT_TAG_RETYPED via the named architecture fixtures below, with all legacy-ID/digest pins unchanged.
 Required reds: SECOND_ENV_BUILDER, LEGACY_FACTORY_IMPORT, alias/re-export bypass, forged brand, and missing dependencies.
 
 ### B16 — Ten-file 3B simplification (10 files)
@@ -664,12 +642,32 @@
 Only the builder may import canonicalEngineQueryPort; engine-query-port.ts may define/export its canonical value.
 Forbid canonical references in consumer bodies inside engine-query-port.ts, including allocation evaluation.
 Reject namespace/dynamic imports and star re-exports that expose canonical outside those two modules.
-Trace aliases, destructuring, and constant computed-member access instead of checking only a local identifier's spelling.
+Trace symbol origin through require(), createRequire() loaders/aliases, and TypeScript import x = require(...).
+Follow required-module bindings through aliases, destructuring, and constant computed members, including load→m→k→m[k].
+Reject CommonJS whole-module re-exports exposing engine-query-port outside the two permitted modules.
+Named virtual negative fixtures live in scripts/check-offer-environment-architecture.mjs --self-test:
+canonical-require-direct.cts: require('./engine-query-port').canonicalEngineQueryPort.
+canonical-require-destructured.cts: destructure canonicalEngineQueryPort into an alias from require().
+canonical-create-require-computed.mts: alias createRequire from node:module, then load→m→constant k→m[k].
+canonical-require-computed.cts: require() module binding followed by constant-key canonical access.
+canonical-import-equals.cts: import m = require('./engine-query-port') with separate canonical-access and export = m cases.
+canonical-commonjs-reexport.cts: module.exports = require('./engine-query-port'), also through a module alias.
+canonical-commonjs-named-reexport.cts: exports.queries = require('./engine-query-port').
+canonical-dynamic-import.mts: await import('./engine-query-port') followed by computed canonical access.
+canonical-star-export.mts: export * from './engine-query-port'.
+These are in-memory fixtures, not new manifest files, resolved against the real production module.
+Use compatible ESM/CommonJS fixture compiler options; unrelated import-equals module errors cannot count as architecture kills.
+Trace ESM aliases, destructuring, and constant computed-member access as before.
 Production query arguments originate at environment.queries or a forwarded required query parameter.
 Reject production EngineQueryPort literals/spreads outside its implementation; typed test doubles are permitted only in tests.
 Path-aware self-tests admit the builder import and canonical declaration and reject downstream/type-of-value aliases.
 Include defaults hidden behind aliases and canonical bypasses inside the defining module as negative fixtures.
 The 45 current canonical-reference files are a temporary migration inventory, never a permanent exemption list.
+At B15, the symbol checker rejects the three exact tag literals outside their sole constant initializers in offer-codec-primitives.ts.
+Check src/tools/tests string and literal-type nodes, including codec and builder files exempted by the sg factory rule.
+The virtual self-test cases offers-format-env-retyped.ts, offers-format-policy-retyped.ts, and offers-format-catalog-retyped.ts each retype one tag.
+Their positive companion offers-format-imported.ts imports all three constants; OFFERS_FORMAT_TAG_RETYPED must fail this check.
+Stage these format cases at B1; activate their self-tests and repository check only after B15 replaces the literal sites.
 B15 removes all migration allowances after B18 and imports actual production declarations for signature controls.
 
 The syntax rule is supplemented by scripts/check-offer-environment-architecture.mjs using TypeScript symbols.
@@ -772,6 +770,7 @@
 | MISSING_ENV_ARGUMENT | Architecture negative compile fixtures for each required host/round/runtime/board/resolver API. |
 | SECOND_ENV_BUILDER | Architecture exported-wrapper/class/alias fixtures and final symbol scan. |
 | LEGACY_FACTORY_IMPORT | New sg rule fixtures and final src/tools/tests scan. |
+| OFFERS_FORMAT_TAG_RETYPED | Architecture tag-literal check and offers-format-{env,policy,catalog}-retyped.ts self-tests. |
 | FALLBACK_USES_LEGACY_ONLY | offer-environment-identity: bound fallback acceptance after primary refusal. |
 | BOARD_DIFFERENT_POLICY | offer-environment-identity path refusal plus actual host/board-sequence digest conservation. |
 | CONSUMER_DROPS_BOUND_ENV | Actual runtime capsule binding assertions, host/board digest test, and SIMULATED reference capsule. |
@@ -964,7 +963,11 @@
 Reading vitest.config.ts confirmed tests/**/*.test.ts with tests/integration-supervisor/** excluded for ordinary runs.
 A node read-only filter of rg --files tests counted exactly 643 matching .test.ts files.
 This is static merged discovery membership, not a Vitest discovery run or the supervisor's in-progress test verdict.
-No test, browser, build, installation, model call, source write, or scratch write ran during this amendment.
+No test, browser, build, installation, model call, or source write ran during this amendment/fix.
+Fix-round cp saved only the requested /tmp/plan-before.md comparison copy before editing the plan.
+AST reads found environment/policy tags 5/4 times in offer-environment.ts and catalog tags 6 times in party-threat-catalog.ts.
+The merged tree has five further tag occurrences across the three B15 test files, correcting the audit's earlier two-file count.
+Read-only AST comparison found identical deepFreeze/exactKeys bodies and digestBody differing only in parameter name/type.
 
 ## 9. Merge scale, risks, and stopping conditions
 PS3B-F1: git diff --stat 82ae8554...40f04e2c | tail -1 returned:
@@ -972,7 +975,7 @@
 The same scoped command with -- src/vtt tools tests/unit/vtt tests/unit/tools returned:
 177 files changed, 55268 insertions(+), 1247 deletions(-).
 The full range includes earlier main work as well as M-1, M-14, and M-3.
-The amended 123-file manifest intersects 45 changed main paths, versus 44 for the accepted 118-file manifest.
+The amended 125-file manifest still intersects 45 changed main paths, versus 44 for the accepted 118-file manifest.
 The added overlap is src/vtt/blind-intent-resolver.ts.
 M-1 changes gate runners/reporters/specs outside this manifest; preserve its authoritative evidence behavior.
 M-14 changes supervision, BUILD-PLAN, ids commentary, and operational-guidance-facts.test.ts without direct file overlap.
@@ -991,6 +994,6 @@
 The frozen contract hash remains 0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1.
 A frozen-file change, unexpected discovery loss, surviving mutant, pin regeneration, or batch ceiling violation blocks landing.
 Any caller discovered outside this manifest requires an explicit at-most-ten-file extension before acceptance.
-Sol accepted a5335ad2… with PS3B-F1/F2; this amendment incorporates both and awaits supervisor-owned review.
+Sol accepted a5335ad2… with PS3B-F1/F2; this fix addresses 574ae301… rejection PS3B-A1 and the bounded codec addition.
 
-PLAN S3 BUILDER AMEND DONE
+PLAN S3 BUILDER AMEND FIX DONE
