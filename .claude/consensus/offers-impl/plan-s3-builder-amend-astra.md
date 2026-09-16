# OFFERS-IMPL-S3-BUILDER plan amendment (D617.8 query-port fold) — gpt-6-astra final message

Plan revised in place: dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md. Session 01a0a11f-98e6-7943-ae51-3be4cf7f5ae0. Log .tmp/runs/fanout/plan-s3-amend.log.

Revised [the plan](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md) in place.

Verified:

- `wc -l -c`: **996 lines, 77,349 bytes**.
- **18 batches**, each ≤10 files; **123 distinct files**.
- Compiler inventory: **287 diagnostics/78 files**, versus **221/59** previously; full amended signatures: **558/108**.
- Both unchanged-tree no-emit TypeScript checks passed.
- Static discovery membership: **643 specs**; no Vitest command ran.
- Merge scope: **431 files overall**, **177 scoped**, **45 overlapping the manifest**.
- `git status --short --untracked-files=all`: **empty**.

Digest decision: retain existing digest inputs and pins because the sole builder fixes the canonical query implementation, with required forwarding and bypass enforcement.

Plan SHA-256:
`574ae301dc3b66071399a36b16ee53c750a70ff803d4e4c2ac42a346dce89e14`

Frozen contract SHA-256, unchanged:
`0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`

PLAN S3 BUILDER AMEND DONE
diff --git a/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md b/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
index 52d5b2c2f86e1a4b97e5573fd51e2a7af76e342e..408307b239d7e3027727e7f4f3eb69503ac0b12a
--- a/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
+++ b/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
@@ -1,12 +1,12 @@
 # OFFERS-IMPL-S3-BUILDER — single environment builder
 Date: 2026-09-14.
-Author: astra, under the explicit D617.6 role exception.
-Status: proposed implementation plan for independent sol review, not implementation acceptance.
-Base: claude/p-offer-help at 82ae85542f2b4103d02749b33413739bd641af66.
-Integration reference: main 40f04e2c.
+Author: astra, under D617.6, amended once under D617.8.
+Status: one D617.8 amendment to sol-accepted a5335ad2…, pending amendment review.
+Base: claude/p-offer-help at 0e2eb984368d7acc641cd6ec161411a99bb80cf1.
+Integrated parents: 82ae8554 and main 40f04e2c, with the three 3B union reconciliations retained.
 Authority: D617.5 and D617.6 approve recommendation D in simplify-s3b-astra.md.
-The tranche is NON-DISPATCHABLE and contains 16 review batches, each changing at most ten files.
-The inventory contains 118 distinct implementation files and 148 batch/file appearances.
+The tranche is NON-DISPATCHABLE and contains 18 review batches, each changing at most ten files.
+The inventory contains 123 distinct implementation files and 161 batch/file appearances.
 Repeated appearances are deliberate follow-up edits, not additional distinct files.
 No batch lands on main alone, and no offer-family work starts before cumulative acceptance.
 This document records verified reads/probes separately from proposed changes.
@@ -25,87 +25,79 @@
 Keep D405.3 flywheel-only veto, D406 luna-low floor, and D456 180-second live wall unchanged.
 No DM semantic export, provenance catalog, or internal board data may reach a player channel.
 Do not change model routing, timing, build-cache machinery, or M-1 gate evidence semantics.
-## 2. Verified starting behavior at 82ae8554
-Locations below refer to the unmodified base, not line numbers after migration.
-The literal legacy grep identifies eight files, not eight external fallback constructors.
-It includes seven external construction sites and the factory definition itself.
-| Site | Current behavior and caller consequence |
+## 2. Verified starting behavior at integrated 0e2eb984
+Locations in this section were re-read on 0e2eb984, not inherited from the audit's 40f04e2c snapshot.
+The merge retains the 82ae8554 scaffold and main's D569/D613 tests in arena, conversation, and knowledge-base suites.
+The literal legacy grep still identifies eight files: seven external construction sites plus the factory definition.
+| Site | Current behavior |
+|---|---|
+| src/vtt/encounter-projections.ts:483 | projectDmBoard constructs legacy locally; its input starts at 399. |
+| src/vtt/dm-encounter-host.ts:393–409 | Optional environment, enclosing options = {}, and ?? legacy construction. |
+| src/vtt/encounter-board-projection.ts:59 | Fourth argument defaults to legacy. |
+| src/vtt/offered-option-paths.ts:63,131,150 | A transitional module singleton supplies two parameter defaults. |
+| src/vtt/engine-round-session.ts:358 | Fourth constructor parameter defaults to legacy. |
+| src/vtt/mcp/entrypoint.ts:437–453 | Optional runtime environment, enclosing = {}, and ?? legacy construction. |
+| tools/ai-dm-conversation.ts:4252 | Explicit run-root legacy construction. |
+| src/vtt/offers/offer-environment.ts:179 | Factory definition, not an eighth consumer fallback. |
+Offer-environment.ts exports runtime factories at 151,165,179,192, with internal delegations at 171,180,193.
+Conversation reconstructs at 2283,3613,3686,3950 and serializes capsule.offerEnvironment at 3417.
+Entrypoint exports reconstruction at 1064, delegates at 1067, invokes it at 1118, and forwards the result at 1156.
+Entrypoint's launcher construction type still has optional offerEnvironment at 337 despite strict runtime decoding.
+Its handler wrappers at 654–659 omit the runtime environment.
+Both runEngineMcpServer at 678 and runEngineMcpLines at 692 inherit empty runtime-options initializers.
+The raw-fixture options branches at 1248–1256 do not supply an environment.
+Capsule.ts:944–949 still exposes a wrapper that silently creates a legacy binding.
+Host snapshot at dm-encounter-host.ts:566 omits its environment when calling projectDmBoard.
+Browser composition creates its host at encounter-app.ts:1470.
+Keep the host's merged detached/immutable snapshot behavior when adding DM digest conservation.
+
+### 2.1 Query defaults and canonical bypasses
+The audit's 13 count is twelve fallback sites plus the resolver singleton, not thirteen parameter initializers.
+There are eleven parameter initializers, one optional-dependency ?? fallback, and one singleton.
+| Module | Exact current default/singleton locations |
 |---|---|
-| src/vtt/encounter-projections.ts:399 | projectDmBoard creates legacy locally; input at 314 has no environment. |
-| src/vtt/dm-encounter-host.ts:281 | Optional environment, options = {} at 282, and ?? construction at 295–296. |
-| src/vtt/encounter-board-projection.ts:59 | projectHumanEngineOptions fourth argument defaults to legacy. |
-| src/vtt/offered-option-paths.ts:63 | Transitional module singleton supplies defaults at 131 and 150. |
-| src/vtt/engine-round-session.ts:357 | Fourth constructor argument defaults to legacy. |
-| src/vtt/mcp/entrypoint.ts:318 | Runtime optional environment, options = {} at 319, and ?? construction at 321. |
-| tools/ai-dm-conversation.ts:3304 | Explicit run-root legacy construction, rather than an optional consumer. |
-| src/vtt/offers/offer-environment.ts:179 | Factory definition, rather than another consumer default. |
-The offer-environment module also exports runtime constructors at 151, 165, and 192.
-Its generic factory invokes reconstruction at 171, legacy invokes it at 180, and revision invokes generic at 193.
-Conversation reconstructs at 1956, 2703, 2776, and 3036 using capsule bindings.
-Entrypoint exports reconstructLauncherOfferEnvironment at 755, invokes reconstruction at 758, and calls it at 802.
-These are the complete runtime-construction expression sites found by the named-constructor grep in src and tools.
-Policy/catalog/binding codecs create serializable values and are not additional runtime-environment builders.
-Engine-state-capsule.ts:943–948 is another default path: a wrapper silently chooses the legacy binding.
-Entrypoint.ts:490–495 contains createEngineMcpHandler and handleMcpRequest wrappers that omit the runtime dependency.
-Entrypoint.ts:512–514 gives runEngineMcpServer its inherited options = {} default.
-Entrypoint.ts:885–895 constructs empty or scenario-only options for the raw-fixture CLI path.
-Do not confuse unrelated scenario/renderer defaults with environment defaults.
-Actor-list and revision defaults at encounter-board-projection.ts:56–58 remain valid preceding defaulted arguments.
-Offered-option-paths.ts:130 keeps its actor-list default while requiring the following environment argument.
-Intent-resolver.ts:73 exposes EngineOptionEnvironment | EngineQueryPort.
-Intent-resolver.ts:548,652,682 default resolve, available-options, and resolver-factory arguments to canonical queries.
-Intent-resolver.ts:729 exports the ambient pureTurnProposalResolver singleton.
-Speculative-planning.ts:282 makes planner.plan environment optional.
-Speculative-planning.ts:286,299,681 accepts query-port union arms and defaults the latter two offer-aware APIs.
-Its query-only defaults at 105,356,570,611,761 are not removed indiscriminately.
-Plan-materiality.ts:36,104–108 permits an absent environment and invokes the unbound available-options path.
-Opportunity-cost.ts:154,273 and team-scorer.ts:206,279,322,469 retain query-port union arms.
-Engine-query-port.ts:1023–1024 generates registry options using only queries.
-Engine-query-port.ts:1043–1048 discards the environment before calling that registry.
-Engine-query-port.ts:236–241 and 1707 expose compareAllocations/compareTacticalAllocations without an environment.
-Its offer generation at 1733 and resolution at 1788 use canonical queries directly.
-Team-scorer.ts:384 and tactical-evaluator-r02.test.ts:224,289 exercise that allocation route.
-Challenge-feasibility.ts:436,443,981,984,1109,1114,1131,1136 generates/resolves through ambient defaults.
-These routes explain why the initial 221 diagnostics were only the first migration layer.
-### 2.1 Identity, hashes, and process boundaries
-Intent-resolver.ts:75 stores WeakMap<EngineOfferableOption, EngineOptionEnvironment>.
-Registration at 91–102 is conditional on selecting the environment union arm.
-The guard at 550–555 rejects a different object reference but accepts a missing WeakMap entry.
-Offered-option-paths.ts:163–166 translates that refusal into OfferedOptionEnvironmentMismatchError.
-It does not currently perform a digest comparison.
-Offer-environment.ts:19–34,114–162 hashes format, mode, familyPolicy, and partyThreatCatalog.
-The caller-selected queries field is outside that digest.
-Thus current equal hashes do not establish query equivalence until query selection is fixed by the builder.
-Engine-state-capsule.ts:204 carries the binding, and its decoder at 619 validates it.
-The capsule digest body at 921–940 includes the binding and excludes generatedAt.
-Engine-state-capsule.ts:951–952 exposes that commitment as engine-state:<capsule digest>.
-MCP engine-server.ts:1334 compares the application environment digest with the launch capsule digest.
-Its dependency bag at 267 separately accepts turnProposals, supplied independently by entrypoint.ts:420–421.
-MutableEngineCapsuleFeed.replace at engine-server.ts:201–207 checks validity, run, and revision but not environment.
-The launch check therefore does not prevent a later valid capsule from switching environments.
-Conversation.ts:2650 writes capsule.offerEnvironment into the launcher.
-Entrypoint.ts:731–737 requires and decodes the binding for a recognized launcher.
-Entrypoint.ts:802,819 reconstructs it and passes it to the server.
-The two direct child spawners are tools/engine-mcp-dry-client.ts:36–41 and ai-dm-conversation.ts:1736–1741.
-Both launch tools/engine-mcp-server.ts through vite-node.
-Conversation.ts:3287 also configures that executable for an agent adapter; preserve that launcher route.
-The dry client currently supplies a raw fixture path, not a binding-bearing launcher.
-Tests/unit/tools/ai-dm-conversation.test.ts:1622 compares one resolver invocation with itself.
-Its getter spy at 1630 intercepts the default singleton, and the cleanup assertion at 1647 checks the wrong subject.
-Production proposalResolutionDivergence at conversation.ts:3084–3088 uses that default singleton.
-The SIMULATED test at 239–254 observes actual construction, unlike the eight self-invoking helper spies.
-Its real advertised→submitted→accepted evidence at 270–321 remains valuable.
-### 2.2 Existing enforcement
-Sgconfig.yml loads ast-grep-rules, which currently contains six rules.
-They are no-discarded-character-command-execute, no-party-pack-gap-push, and vtt-snippet-purity.
-The remaining three are no-discarded-command-apply, no-inline-party-pack-super-refine, and no-raw-fs-in-tests.
-The TypeScript severity-error import rule vtt-snippet-purity is a local architecture-rule precedent.
-Scripts/check-command-outcomes.sh:4 runs exactly sg scan --config sgconfig.yml src.
-The roadmap cumulative command at 887 has the same restricted scope.
-Package.json:13 invokes that script in typecheck, and line 14 exposes check:command-outcomes.
-Package.json:17 test:gate invokes node tools/gate-vitest.mjs.
-Tools/gate-vitest.mjs, tools/gate-playwright.mjs, and tools/gate-runner-lib.mjs do not supply the missing sg scope.
-The widened existing-rule probe this round found zero findings across src, tools, and tests.
+| speculative-planning.ts | queries defaults 105,356,570,611,761; environment defaults 299,681; optional planner at 282. |
+| intent-resolver.ts | environment defaults 548,652,682; default resolver singleton 729; union alias 73. |
+| engine-query-port.ts | registry queries default 906. |
+| blind-intent-resolver.ts | optional dependencies at 77, optional queries at 55, and canonical ?? fallback at 776. |
+Opportunity-cost.ts:154,273 and team-scorer.ts:206,279,322,469 retain environment/query-port union arms.
+Plan-materiality.ts:36,104–108 retains optional environment and unbound option generation.
+The canonical identifier appears in 45 src/tools/test files, all assigned in the amended manifest.
+Arena-legality.ts has seven direct uses at 21,25,29,40,47,59,111.
+Legendary nearest-enemy selection uses canonical spaceDistance at legendary-windows.ts:199–200.
+Entrypoint's blind projection uses canonical queries at 545 rather than its runtime environment.
+Engine-query-port.ts:1043–1048 drops environment provenance through its old registry at 1023–1024.
+Allocation generation/resolution bypass the environment at engine-query-port.ts:1733,1788.
+Conversation's planning bypasses are at 1460,1499,1612,1657,1688,1708,1815,1820,1846,1852.
+Later conversation bypasses are at 2666,3767,3770,4625,6037,7222,7285.
+Its reconstruction arguments at 2284,3614,3687,3951 and root construction at 4252 also import canonical directly.
+Tools/renderer-calibration.ts:232 passes canonical queries to exactDmIntelMatrix.
+The canonical implementation is the object literal at engine-query-port.ts:1834, frozen/exported at 1901.
+No exported createEngineQueryPort exists.
+The final import rule also covers tests such as projected-movement-options.test.ts, absent from the prior manifest.
+
+### 2.2 Provenance and process boundaries
+Intent-resolver.ts:75 stores option→environment references and registers them at 91–102.
+Its guard at 550–555 rejects a different reference but admits absent provenance.
+Offered-option-paths.ts:163–166 translates that refusal and does not itself compare digests.
+The binding digest body at offer-environment.ts:19–34,114–162 hashes format, mode, familyPolicy, and catalog.
+Queries are supplied separately and are not hashed.
+Capsule.ts:204,619 carries/decodes the binding; 921–940 includes it in the capsule digest but excludes generatedAt.
+Engine-state-capsule.ts:951–952 exposes engine-state:<capsule digest>.
+MCP engine-server.ts:1454 checks the launch digest, but feed replacement at 236–242 does not pin its environment.
+Its dependency bag at 318 separately accepts turnProposals, supplied by entrypoint.ts:556–557.
+Blind intent submission at engine-server.ts:2272–2279 separately passes queries and proposalResolver.
+Entrypoint.ts:1036–1046 rejects missing/malformed bindings for recognized launchers.
+The two direct child spawns are dry-client.ts:36–41 and conversation.ts:1987–1990.
+Conversation also configures the same executable for its agent adapter at 4235.
+The dry client currently supplies a raw fixture rather than a serialized-binding launcher.
+Divergence uses the ambient resolver at conversation.ts:4004–4008.
+The self-comparison and getter spy are now ai-dm-conversation.test.ts:2099,2107.
+SIMULATED's real construction observation at 239–254 and advertised/submitted/accepted assertions remain.
+The scoped gate remains scripts/check-command-outcomes.sh:4, sg scan --config sgconfig.yml src.
+Package.json:17 test:gate still invokes node tools/gate-vitest.mjs without that architecture prefix.
+Sgconfig.yml still loads six rules, including the TypeScript import restriction vtt-snippet-purity.
+
 ## 3. Final builder and consumption contract
 Create src/vtt/offers/build-offer-environment.ts with exactly one exported runtime function.
 The following is the public signature, with type-only exports permitted:
@@ -130,7 +122,7 @@
 Missing input throws TypeError('Offer environment input must be an object.').
 Missing or undefined binding throws TypeError('Offer environment binding is required.').
 Malformed binding throws the existing decoder TypeError; there is no legacy recovery path.
-A recognized launcher missing its binding retains the existing explicit-launcher TypeError at entrypoint:733.
+A recognized launcher missing its binding retains the existing explicit-launcher TypeError at entrypoint:1042.
 The CLI must distinguish a valid arena fixture from a malformed or mistagged launcher before choosing fixture mode.
 Invalid launcher-shaped input must fail validation rather than being reinterpreted as a legacy fixture.
 Define a module-private class RuntimeOfferEnvironment with a real private field such as readonly #brand = undefined.
@@ -153,7 +145,7 @@
 ### 3.1 Required surfaces and provenance
 All offer-aware APIs accept the branded environment, never EngineOptionEnvironment | EngineQueryPort.
 Remove the union alias, its discriminating helper, and the default resolver singleton.
-A query-only helper may still accept EngineQueryPort when it neither generates nor resolves offers.
+A query-only helper requires EngineQueryPort explicitly and receives environment.queries or a required forwarded port.
 Replace the private WeakMap value with the validated environment digest string.
 Every public available-options/partition/registry path registers each actual option object with that digest.
 Resolve refuses when provenance is absent or differs from the supplied environment digest.
@@ -175,7 +167,8 @@
 Delete each optional marker, environment initializer, enclosing empty-options initializer, and ?? environment fallback.
 Make createEngineMcpHandler(state, environment, maximumToolResultBytes?) explicit.
 Make handleMcpRequest's added environment argument required and forward it to that handler.
-Keep runEngineMcpServer's options object required with its required offerEnvironment field.
+Require the environment-bearing options of runEngineMcpServer and runEngineMcpLines, including the initializer at 692.
+Require EngineMcpLauncherManifest.offerEnvironment at 337 while keeping decoder failures for malformed unknown input.
 Retain actor/revision defaults preceding a required environment argument by passing undefined explicitly where appropriate.
 Keep createEngineStateCapsuleForEnvironment as the explicit binding-bearing capsule factory and delete its legacy wrapper.
 Create turnProposals inside createEngineMcpApplication from its one environment.
@@ -211,45 +204,86 @@
 Update existing dry-client construction calls in that same module and golden tests accordingly.
 Keep engine-mcp-server.ts as the unchanged thin entrypoint.
 No additional MCP field or schema regeneration is needed for the child binding test.
-## 4. Review batches and compiler-derived inventory
-The first probe's AST diagnostic grouping is reproduced below.
-Its node result includes the app diagnostics, so the combined count is 221, not 226.
-- projectDmBoard: 26 diagnostics.
-- DmEncounterHost: 44 diagnostics.
-- createEngineMcpRuntime: 81 diagnostics.
-- (default/property/type error): 10 diagnostics.
-- fixtureRuntime: 19 diagnostics.
-- EngineRoundSession: 36 diagnostics.
-- projectHumanEngineOptions: 4 diagnostics.
-- offeredOptionPaths: 1 diagnostics.
-The initial file union is 59 files: 50 test files and nine production/tool files.
-The broader signature probe produced 430 diagnostics in 83 files.
-Adding the private branded signature and required root configuration produced 433 diagnostics in 85 files.
-Adding required DM projection provenance produced 434 diagnostics in 86 files.
-The final probe used 18 virtual source files and did not write a source tree or emit a file.
-These counts include intentionally unrepaired definition-site errors and removed-export errors.
-They are migration inventories, not 434 independent defects or evidence that the implementation works.
-The final signature probe found 65 diagnostic test files, all present in the batch inventory.
-Reserve providers for B1–B3/B14, roots for B2/B3, and the three existing environment suites for B1.
-Union the initial and expanded AST diagnostic files, remove those reserved files, and sort by path.
-That leaves 69 caller files, partitioned into six ten-file batches and one nine-file batch as B4–B10.
-A main-side call/reference scan found 20 additional files and 62 matching sites outside the worktree inventory.
-B11–B12 migrate those explicitly listed additional consumers before any optional signature is contracted.
-Their fourteen specs extend the cumulative test union from 65 to 79 existing specs.
-B13 contracts optional forms after that caller group is complete.
-B14 closes resolver, query union, registry, and capsule surfaces after their callers are migrated.
-B15 removes the remaining old exports and turns on final architecture enforcement.
-B16 simplifies exactly the ten 3B test files last.
-The 118-file distinct union includes four new files: builder, rule, YAML fixtures, and architecture script.
-No new or renamed Vitest spec is planned.
+### 3.3 D617.8 query-port fold and digest decision
+Keep the existing binding format, digest body, legacy IDs, and independent digest pins unchanged.
+The builder admits exactly one immutable canonical port implementation and no caller-selected query policy.
+A constant query-policy field would not distinguish two paths through that same implementation.
+Within the same engine revision, one non-injectable port plus enforced environment.queries forwarding prevents policy divergence.
+This is not a claim that old bindings reproduce mechanics across arbitrary future engine-code changes.
+If selectable query implementations or cross-version replay become supported, introduce an explicit semantic policy version then.
+A version label alone would not catch a bypass or an implementation change made without updating that label.
+
+Remove all twelve current query fallback sites and the resolver singleton listed in section 2.1.
+Offer-aware APIs retain the required branded environment and obtain their queries from it.
+The five query-only speculative helpers retain EngineQueryPort parameters but lose their default initializers.
+They are evaluateScenarioFact, extractProposalFactDependencies, canPlayerFlipScenarioFact, computeHostSplitCandidates, and evaluateHostScenarios.
+The old registry/default is deleted in favor of engineActionRegistryForEnvironment.
+Arena token/combatant/side/target/action helpers require a trailing queries argument.
+validateArenaPlan becomes validateArenaPlan(plan, state, queries, envelope?) and forwards queries through private helpers.
+Keep arenaAttackRange/actionRange as pure action-data helpers without an unnecessary query dependency.
+LegendaryWindowsRequest gains required queries, forwarded through pendingWindowDetails and assessLegendaryOption.
+nearestLivingEnemy uses those queries for both spaceDistance comparisons.
+Entrypoint's blind projection receives offerEnvironment.queries.
+Allocation evaluation uses its required environment, including the two bypasses inside engine-query-port.ts itself.
+Conversation planning, scenario evaluation, reaction paths, and renderer calibration use the run environment or required ports.
+A callback captures the run environment or receives it explicitly; it does not reconstruct a legacy query context.
+Only lifecycle/snapshot boundaries rebuild through the builder from explicit configuration or binding.
+
+BlindResolverInput gains required offerEnvironment and no longer selects queries from optional dependencies.
+Remove BlindResolverDependencies.queries and derive queries from input.offerEnvironment.
+Change availableOptions/resolveOption callback signatures to receive the environment, not a bare query-port union.
+Keep the existing explicit synthetic provider/proposalResolver seams used by matcher tests.
+Default providers and the default proposal resolver are derived from the input environment.
+The MCP application supplies its environment and, where passed, its already-derived turnProposals.
+Retain synthetic ambiguity, refusal, stale-revision, and forbidden-ingress controls without forging the private environment.
+B2 retains compatible old dependency declarations and a temporary missing-environment path until callers migrate.
+B18 removes the fallback and obsolete queries field; B14 changes callback environment types with the core resolver.
+B14 switches blind provider types alongside the resolver types so the cumulative tree stays compilable.
+
+CONSUMER_USES_CANONICAL_BYPASS must fail the source gate for a real consumer substitution.
+Its behavior witness uses required query-helper inputs with an explicit distance policy different from the builder's port.
+Build a normal fixture environment, then create a typed EngineQueryPort test double from environment.queries.
+Override only spaceDistance with independently specified unequal distances that reverse the nearest-enemy ordering.
+Pass that same port to evaluateScenarioFact and provideLegendaryWindows and assert independent expected results.
+Add an arena attack-range refusal case whose answer changes under that supplied distance policy.
+Replacing any tested consumer's parameter reads with canonical reads must fail these real-helper assertions.
+A custom-query branded environment is deliberately unconstructible under the final builder API.
+The witness therefore models its query view at the collaborator seam; it does not cast that view into EngineOptionEnvironment.
+This closes the audit's behavior scenario without adding a second builder, query injection input, or constructor spy.
+Separately assert the actual runtime passes its environment queries through blind projection and proposal composition.
+
+QUERY_DEFAULT_REINTRODUCED must fail real-symbol negative compile fixtures when an argument becomes optional/defaulted.
+The fixture matrix covers all five speculative query helpers, resolver entry points, arena helpers, blind input, and legendary input.
+Cover each retained public query/default surface, including the legendary request property and blind environment property.
+Every fixture supplies valid other arguments and checks the diagnostic on the specific omission.
+Do not keep a missing-argument fixture for deleted engineActionRegistry; assert its forbidden import separately.
+
+## 4. Review batches and merged compiler inventory
+The original seven-API probe on 82ae8554 produced 221 diagnostics in 59 files.
+The same seven-API edit set on 0e2eb984 produces 287 diagnostics in 78 files: +66 diagnostics and +19 files.
+Requiring the merged launcher binding and completing the builder signatures produces 508 diagnostics in 106 files.
+The final query-fold signatures produce 558 diagnostics in 108 files, including intentionally unrepaired provider bodies.
+All virtual-file experiments are signature probes with noEmit, incremental:false, and a throwing writeFile.
+The final virtual-file count and exact diagnostic codes are recorded in section 8.
+Canonical-import enumeration adds files with no missing-argument diagnostic, so the compiler alone is not the entire inventory.
+The accepted 118-file manifest already covers all 78 first-probe files.
+The full probe adds arena-legality.ts, blind-intent-resolver.ts, and legendary-windows.test.ts to that manifest.
+The canonical-import scan additionally requires legendary-windows.ts and projected-movement-options.test.ts.
+Thus the amended manifest is 123 distinct files, with every one of the 108 diagnostic files assigned below.
+B1–B12 retain their caller groups on the now-integrated tree and migrate all canonical imports in their listed files.
+B2 grows to ten files for arena/blind setup, and B3 grows to ten for legendary query forwarding.
+B14 exchanges the identity-suite edit for blind resolver type closure to keep the checkpoint at ten files.
+B17 completes query caller tests before any additional query signature is contracted.
+B18 completes query contracts and takes the deferred identity-suite edit.
+Execution order is B1–B12 → B17 → B13 → B14 → B18 → B15 → B16.
+The B17/B18 identifiers preserve accepted batch names; numerical order is not their dependency order.
+No new Vitest spec is created, and B16 remains the last ten-file scaffold-removal batch.
 ### 4.1 Phase rules and per-batch acceptance
-Before B1 dispatch, the supervisor prepares a cumulative integration tree retaining 82ae8554 and main 40f04e2c.
-This is a supervisor-owned integration prerequisite, not permission for this authoring lane to run git writes.
-Preserve the r3 test scaffold as the starting subject and reconcile main's already-landed changes before migrating APIs.
-Review any offers-specific merge resolution within the listed file units, never as an unbounded extra patch.
-Require the integrated baseline to typecheck before B1 and re-inventory its callers before accepting this manifest.
-If integration adds a caller outside the 118-file inventory, extend the numbered manifest in units of at most ten files.
-Do not start implementation against a silently different baseline or claim this base-only probe proves main closure.
+VERIFIED: the supervisor integrated both parents as 0e2eb984 before this amendment.
+The merged tree passes both no-emit compiler projects and its caller inventory was rerun below.
+B1 starts from that integrated tree; this plan does not request another preparatory merge.
+Preserve the reconciled D569/D613 tests and the temporary 3B scaffold until their scheduled changes.
+Any subsequent main change requires a fresh caller/discovery comparison before landing.
 Every batch must pass both cumulative-tree no-emit TypeScript project checks, denoted T below.
 T means the two direct node node_modules/typescript/bin/tsc -p commands recorded in section 8.
 Each batch also runs the focused specs identified below and the currently applicable architecture checks.
@@ -290,7 +324,7 @@
 The architecture script temporarily recognizes exactly the five preexisting exported runtime factories/wrappers.
 T plus all three environment suites and both architecture self-test modes must pass.
 Required reds: SECOND_ENV_BUILDER for a new export, malformed binding, forged/spread brand, and query injection.
-### B2 — Additive signatures and process roots (8 files)
+### B2 — Additive signatures and process roots (10 files)
 - src/vtt/challenge-feasibility.ts
 - src/vtt/encounter-projections.ts
 - src/vtt/engine-query-port.ts
@@ -299,16 +333,19 @@
 - tools/ai-dm-arena.ts
 - tools/ai-dm-conversation.ts
 - tools/engine-mcp-dry-client.ts
+- src/vtt/arena-legality.ts
+- src/vtt/blind-intent-resolver.ts
 Add the projector environment input and DM digest output while retaining its temporary fallback.
 Add compatible optional/overloaded handler, allocation, and divergence argument forms for migration.
 Add root configuration fields initially optional, populate them in parsers, and thread arena configuration.
 Derive MCP turnProposals internally and remove the independent entrypoint dependency in this same batch.
 Route child reconstruction through the builder, validate input classification, and add explicit dry-client launcher support.
+Prepare compatible arena-query arguments and blind input.offerEnvironment while old caller forms still compile.
 Thread a built environment through challenge feasibility's internal option generation/resolution helpers.
 T plus the three environment suites must pass, with existing legacy-ID and launch validation controls intact.
 Required reds: builder malformed binding and independent policy/catalog digest pins.
 Full child and whole-projector changed-binding killers become mandatory in B5 and B14/B16 respectively.
-### B3 — Production dependency threading (9 files)
+### B3 — Production dependency threading (10 files)
 - src/vtt/dm-encounter-host.ts
 - src/vtt/encounter-app.ts
 - src/vtt/encounter-board-projection.ts
@@ -318,9 +355,11 @@
 - src/vtt/offered-option-paths.ts
 - src/vtt/plan-materiality.ts
 - src/vtt/speculative-planning.ts
+- src/vtt/intel/legendary-windows.ts
 Migrate browser/host, round, board, scoring, and planning production call paths to built environments.
 The host passes its stored environment into its DM projection and checks the returned DM digest.
 Keep transitional provider type imports structural until B13/B14 so unmigrated typed callers still compile.
+Prepare legendary request.queries and pass it through pending-window assessment and nearest-enemy selection.
 Extend existing environment-suite behavior only in its listed later batch, not through an eleventh file.
 T plus offer-environment-board-sequence and offer-environment-identity must pass.
 Required reds: the existing BOARD_DIFFERENT_POLICY path control and FALLBACK_USES_LEGACY_ONLY control.
@@ -451,7 +490,7 @@
 Also run the three environment suites when this group changes a production tool.
 Required reds: preserve existing independent refusal/geometry/payload controls in this caller group.
 
-### B11 — Additional main-side callers (10 files)
+### B11 — Merged caller group (10 files)
 - src/vtt/handoff/fixtures/two-room.ts
 - src/vtt/handoff/worker-entry.ts
 - tests/helpers/legacy-advice-surface.ts
@@ -469,7 +508,7 @@
 Required reds: existing blind-boundary, session-authority, and handoff refusal controls remain red.
 A new caller found by the integrated compiler extends the manifest before signature contraction.
 
-### B12 — Additional main-side callers (10 files)
+### B12 — Merged caller group (10 files)
 - tests/unit/vtt/encounter-session-service.test.ts
 - tests/unit/vtt/handoff-examples.test.ts
 - tests/unit/vtt/in-process-transport.test.ts
@@ -487,6 +526,20 @@
 Required reds: existing blind-boundary, session-authority, and handoff refusal controls remain red.
 A new caller found by the integrated compiler extends the manifest before signature contraction.
 
+### B17 — Query caller completion; execute after B12 (5 files)
+- tests/unit/vtt/legendary-windows.test.ts
+- tests/unit/vtt/projected-movement-options.test.ts
+- tests/unit/tools/ai-dm-arena.test.ts
+- tests/unit/vtt/blind-intent-resolver.test.ts
+- tests/unit/vtt/speculative-planning.test.ts
+Finish all query argument/property migrations and canonical-import removals in these existing specs.
+Retain synthetic blind matcher providers while giving the real public boundary its explicit environment.
+Add the controlled-distance legendary/speculative/arena witnesses described in section 3.3.
+Use environment.queries for projected movement tests and preserve their independent expected outcomes.
+T plus these five specs and the three environment suites must pass before B13/B14/B18.
+Required red: CONSUMER_USES_CANONICAL_BYPASS in the real legendary, speculative, and arena consumers.
+The query-default negative compile fixtures activate only when the corresponding signatures are contracted in B14/B18.
+
 ### B13 — Required optional surfaces (8 files)
 - src/vtt/dm-encounter-host.ts
 - src/vtt/encounter-board-projection.ts
@@ -514,17 +567,34 @@
 - src/vtt/plan-materiality.ts
 - src/vtt/speculative-planning.ts
 - tests/unit/vtt/offer-environment.test.ts
-- tests/unit/vtt/offer-environment-identity.test.ts
+- src/vtt/blind-intent-resolver.ts
 Replace WeakMap reference identity with digest provenance and reject absent registration.
 Delete all offer-aware query-port union arms, resolver defaults, and the default singleton.
+Remove the five query-only speculative-planning defaults now that B17 has completed their callers.
 Implement the bound registry directly and require the allocation environment on its interface and implementation.
 Delete the legacy capsule wrapper and enforce launch/current/replacement run digests.
 Switch remaining consumer type imports to the branded builder type.
-Extend the two contract suites with equal-digest acceptance, absent/different refusal, and feed-swap tests.
+Extend offer-environment.test.ts with equal-digest acceptance, absent/different refusal, and feed-swap tests.
+Switch blind resolver callback/default-provider types to the branded environment in this same compiler checkpoint.
+Keep its temporary missing-environment fallback until B18, where the remaining query boundaries close.
 T plus the three environment suites, capsule, query-port, materiality, and speculative-planning suites must pass.
 Required reds: absent provenance, MIDRUN_ENV_SWAP, SKIP_DIGEST_CHECK, fallback/board substitution, and query-union bypass.
 The obsolete 3B equal-binding assertions remain incompatible until B16, as explicitly recorded above.
 
+### B18 — Query contract closure; execute after B14 (5 files)
+- src/vtt/arena-legality.ts
+- src/vtt/blind-intent-resolver.ts
+- src/vtt/intel/legendary-windows.ts
+- src/vtt/mcp/engine-server.ts
+- tests/unit/vtt/offer-environment-identity.test.ts
+Require all arena query parameters and LegendaryWindowsRequest.queries and delete their fallback paths.
+Require BlindResolverInput.offerEnvironment and remove its transitional fallback and dependencies.queries field.
+Finish application forwarding and the deferred identity-suite binding/refusal cases without adding a query injection seam.
+T plus legendary-windows, speculative-planning, blind-intent-resolver, arena, and all environment suites must pass.
+The arena file's obsolete identity-only cases remain pending B16, so run its named query/legality cases here.
+Required reds: QUERY_DEFAULT_REINTRODUCED and CONSUMER_USES_CANONICAL_BYPASS.
+Only after this checkpoint may B15 enable the final canonical-import and real-symbol signature gates.
+
 ### B15 — Remove old exports and finish enforcement (4 files)
 - src/vtt/offers/offer-environment.ts
 - src/vtt/mcp/entrypoint.ts
@@ -532,7 +602,7 @@
 - scripts/check-offer-environment-architecture.mjs
 Delete all four old runtime factory exports, the old structural type export, and launcher reconstruction wrapper.
 Remove the architecture migration allowlist and require exactly one environment-producing runtime export.
-Set the new sg rule to severity: error across src, tools, and tests.
+After B18, set the extended sg rule to severity: error across src, tools, and tests.
 Reject imports, namespace references, re-exports, aliases, unsafe brand assertions, and consumer-side construction.
 T plus the three environment suites and final src/tools/tests architecture checks must pass.
 Required reds: SECOND_ENV_BUILDER, LEGACY_FACTORY_IMPORT, alias/re-export bypass, forged brand, and missing dependencies.
@@ -553,7 +623,7 @@
 Restore divergence's independent oracle and remove its factory/getter interception.
 Keep the real launcher-driven golden case and SIMULATED binding conservation through actual run evidence.
 Run the complete cumulative union without excluded old identity tests, skips, or regenerated pins.
-T plus all 79 cumulative caller/environment specs, discovery conservation, and the complete named-mutant ledger must pass.
+T plus all 81 cumulative caller/environment specs, discovery conservation, and the complete named-mutant ledger must pass.
 Required reds: every final mutant in section 6, including child binding and restored divergence behavior.
 The equivalent same-binding second allocation must instead remain green.
 
@@ -568,6 +638,9 @@
   - src/**/*.ts
   - tools/**/*.ts
   - tests/**/*.ts
+ignores:
+  - src/vtt/offers/build-offer-environment.ts
+  - src/vtt/engine-query-port.ts
 rule:
   all:
     - any:
@@ -579,13 +652,25 @@
         - regex: ^createRevisionBoundEngineOptionEnvironment$
         - regex: ^engineOptionEnvironmentFromBinding$
         - regex: ^reconstructLauncherOfferEnvironment$
+        - regex: ^canonicalEngineQueryPort$
 ```
-B1 stages only this new rule as off; B15 changes it to error without changing any existing rule severity.
+B1 stages only this rule as off; B15 enables both factory and query restrictions after B18 without relaxing existing rules.
 Put valid/invalid examples in ast-grep-tests/no-alternative-offer-environment-construction-test.yml.
-Valid cases include builder calls, type-only builder imports, and legacy binding codec calls.
-Invalid cases include named old imports, renamed imports, namespace calls, direct old calls, and re-exports.
+Valid cases include builder calls, environment.queries, EngineQueryPort type imports, and binding codec calls.
+Invalid cases include old factories and canonical named/aliased imports, namespace access, direct calls, and re-exports.
 Use id plus valid/invalid arrays in the fixture and run sg test with --skip-snapshot-tests.
-No generated snapshot file is needed, and sgconfig.yml need not change because --test-dir is explicit.
+No snapshot file or sgconfig.yml change is needed because --test-dir is explicit.
+The symbol checker enforces factory restrictions even in the two query-exempt sg paths.
+Only the builder may import canonicalEngineQueryPort; engine-query-port.ts may define/export its canonical value.
+Forbid canonical references in consumer bodies inside engine-query-port.ts, including allocation evaluation.
+Reject namespace/dynamic imports and star re-exports that expose canonical outside those two modules.
+Trace aliases, destructuring, and constant computed-member access instead of checking only a local identifier's spelling.
+Production query arguments originate at environment.queries or a forwarded required query parameter.
+Reject production EngineQueryPort literals/spreads outside its implementation; typed test doubles are permitted only in tests.
+Path-aware self-tests admit the builder import and canonical declaration and reject downstream/type-of-value aliases.
+Include defaults hidden behind aliases and canonical bypasses inside the defining module as negative fixtures.
+The 45 current canonical-reference files are a temporary migration inventory, never a permanent exemption list.
+B15 removes all migration allowances after B18 and imports actual production declarations for signature controls.
 
 The syntax rule is supplemented by scripts/check-offer-environment-architecture.mjs using TypeScript symbols.
 Scan all TypeScript files under src, tools, and tests, resolving import aliases and module exports.
@@ -597,9 +682,15 @@
 Tests may build fixture environments, but may not export alternative runtime builders or forge the private type.
 The builder's query import, lack of queries input, private class, and sole construction expression are checked directly.
 The temporary export allowlist is exactly the four old factory symbols and reconstructLauncherOfferEnvironment.
-The temporary construction exceptions cover only the already-listed transitional sites and expire completely in B15.
+The temporary construction exceptions cover only listed transitional sites and expire completely in B15.
 Script --self-test compiles in-memory positive/negative fixtures and verifies exact diagnostic expectations.
-B1 includes builder-only signature negatives; B15 adds all contracted-API negatives after optional forms are gone.
+PS3B-F2: every missing-argument/property fixture imports its real production symbol, never a copied declaration.
+Pair it with a valid supplied-argument fixture and anchor the expected diagnostic to the omitted call/property.
+Making that production parameter optional/defaulted must remove the diagnostic and fail the self-test.
+B1 authors all real-symbol fixtures, activating only builder negatives while consumer signatures remain transitional.
+Stage flags activate required-surface fixtures at B13, resolver/speculative fixtures at B14, and final query fixtures at B18.
+Run --self-test --stage required-surfaces, --stage resolver, and --stage final-query at those respective checkpoints.
+B15 removes staged allowances and makes unqualified --self-test require every contracted-API negative.
 Cover same-builder use, object literal, spread, missing argument, custom query input, alias, namespace, and re-export.
 Add negative exported-wrapper and computed-member examples so counting a constructor's spelling is insufficient.
 Self-tests must fail when their checker is disabled; they may not merely assert on the implementation's own output.
@@ -644,17 +735,18 @@
 No environment constructor, runtime constructor, or resolver-export spy remains.
 
 Divergence takes its explicit environment and re-resolves the recorded proposal authoritatively.
-Restore an independent expected action/target/movement fixture instead of the line-1622 self-comparison.
+Restore an independent expected action/target/movement fixture instead of the line-2099 self-comparison.
 Retain the deliberately wrong resolution digest case and its expected geometry-divergence diagnostic.
 Add a changed mechanics/target case whose expected diagnostic does not use a second identical resolver invocation.
 Use a genuinely different binding for refusal controls; equivalent reconstruction is the positive control.
 
 ### 6.1 Scaffold audit and each 3B file's disposition
-The audit was rerun read-only this round with its two artifact-write expressions removed before execution.
+The following scaffold audit is the verified pre-merge 82ae8554 audit retained from the accepted plan.
 Cumulative diff base 6bd0e757^ is a9a029848d6fae9c8e289590e8621f917a8d1109.
 Cumulative 3B is +734/-45, including 427 added scaffold lines and 307 other added lines.
 The r3-only diff is +240/-222, including 153 added scaffold lines and 87 other added lines.
-Current removable scaffold totals 428 lines because conversation's audited block includes one preexisting line.
+That pre-merge removable scaffold totals 428 lines, including one preexisting line in the conversation block.
+Recount actual removals at B16 against 0e2eb984 and preserve the merged D569/D613 tests.
 The other column includes migration assertions/imports and is not a promise of final post-refactor line counts.
 All rows drop identity helpers, once flags, constructor choreography, and associated restoration checks in B16.
 | File basename, full paths in B16 | Added/current scaffold | Other additions | Keep or restore |
@@ -686,89 +778,139 @@
 | MCP_CHILD_IGNORES_SERIALIZED_BINDING | Golden real child handle/reference comparison and proposal acceptance. |
 | MIDRUN_ENV_SWAP | offer-environment feed replacement/custom-feed contract cases. |
 | SKIP_DIGEST_CHECK | Same suite's different/absent provenance and capsule-swap refusal cases. |
+| CONSUMER_USES_CANONICAL_BYPASS | Legendary/speculative/arena controlled-distance cases plus final canonical-reference gate. |
+| QUERY_DEFAULT_REINTRODUCED | Actual-production-symbol negative compile fixtures and final parameter/default checks. |
 | DIVERGENCE_TRUSTS_STORED_RESOLUTION | ai-dm-conversation forced divergence with independently specified mechanics. |
 Also require malformed binding, query injection, cloned/unbound option, and forged private-brand controls.
 Place the fallback mutant only on fallback resolution and the board mutant only on the board consumer.
 Use valid different bindings for wrong-value mutants so a corrupt-hash decoder failure cannot masquerade as the kill.
-Retire the equal-binding second-allocation mutant at conversation.ts:2776 as a required red.
+Retire the equal-binding second-allocation mutant at conversation.ts:3686 (formerly 2776) as a required red.
 That mutant must be green under the sole deterministic builder with canonical queries.
 Withdraw S3B-R3-F1 and F2 on completed contract acceptance.
 Withdraw S3B-R3-F3 as an identity blocker only after its independent behavior oracle is restored.
 Retire S3B-R3-F4 with its getter interception and defective cleanup subject.
 These dispositions do not approve unchanged 82ae8554.
 
-## 7. Complete initial caller inventory and cumulative verification
-This is the exact 59-file first-probe inventory, with first planned batch and diagnostic API counts.
-DM means projectDmBoard, Helper means fixtureRuntime, and Options means default/property/type diagnostics.
-Every test path below is mandatory in the cumulative targeted invocation.
-| File | Initial diagnostic grouping | First batch |
-|---|---|---|
-| src/vtt/dm-encounter-host.ts | DM:1 | B3 |
-| src/vtt/encounter-app.ts | Host:1 | B3 |
-| src/vtt/mcp/entrypoint.ts | MCP:1, Options:2 | B2 |
-| tests/integration/vtt/dm-encounter-host-live-path.test.ts | Host:6, MCP:1, Options:1 | B4 |
-| tests/integration/vtt/encounter-conclusion.test.ts | Host:2 | B4 |
-| tests/integration/vtt/vane-warren-session.test.ts | Host:3 | B4 |
-| tests/unit/bridge/client.test.ts | Host:4 | B4 |
-| tests/unit/bridge/decision-program.test.ts | DM:1 | B4 |
-| tests/unit/bridge/js-round-plan-integration.test.ts | DM:2 | B4 |
-| tests/unit/bridge/projection-transport.test.ts | DM:1 | B4 |
-| tests/unit/bridge/steering.test.ts | DM:1 | B4 |
-| tests/unit/tools/ai-dm-arena.test.ts | Options:1 | B4 |
-| tests/unit/tools/ai-dm-board-delivery.test.ts | MCP:4, Options:1 | B4 |
-| tests/unit/tools/ai-dm-conversation.test.ts | MCP:1, Options:1 | B5 |
-| tests/unit/tools/ai-dm-knowledge-base.test.ts | MCP:1, Options:1 | B5 |
-| tests/unit/tools/engine-mcp-boundary.test.ts | MCP:1, Options:1 | B5 |
-| tests/unit/tools/engine-mcp-handler.test.ts | MCP:19, Options:2, Helper:19 | B5 |
-| tests/unit/vtt/adjustment-exhaustion-coordinator.test.ts | MCP:2 | B5 |
-| tests/unit/vtt/arena-basis-brutal-b.test.ts | Round:2 | B5 |
-| tests/unit/vtt/composite-turn-proposals.test.ts | MCP:2, Round:4 | B6 |
-| tests/unit/vtt/controller-assignment.test.ts | Host:1 | B6 |
-| tests/unit/vtt/d466-b4-spell-payloads.test.ts | Human:1 | B6 |
-| tests/unit/vtt/detection-ui.test.ts | DM:2 | B6 |
-| tests/unit/vtt/dm-tactical-intel.test.ts | MCP:1 | B6 |
-| tests/unit/vtt/encounter-board-projection.test.ts | DM:3 | B6 |
-| tests/unit/vtt/encounter-projections.test.ts | Host:2 | B6 |
-| tests/unit/vtt/engine-context-integrations.test.ts | MCP:3, Round:1, Human:1 | B6 |
-| tests/unit/vtt/engine-host-integration.test.ts | Host:3 | B6 |
-| tests/unit/vtt/engine-opportunity-movement-intel.test.ts | MCP:2 | B6 |
-| tests/unit/vtt/engine-round-session.test.ts | Round:23 | B7 |
-| tests/unit/vtt/engine-state-capsule.test.ts | DM:2 | B7 |
-| tests/unit/vtt/footprint-increment-four.test.ts | DM:1 | B7 |
-| tests/unit/vtt/footprint-increment-three.test.ts | MCP:5 | B7 |
-| tests/unit/vtt/hidden-option-boundary.test.ts | MCP:2 | B7 |
-| tests/unit/vtt/hypnotic-pattern-probe.test.ts | MCP:1, Round:1 | B7 |
-| tests/unit/vtt/last-seen.test.ts | DM:1 | B7 |
-| tests/unit/vtt/local-session-store.test.ts | Host:13 | B7 |
-| tests/unit/vtt/mixed-kind-multiattack.test.ts | Round:1 | B7 |
-| tests/unit/vtt/monster-feature-support.test.ts | MCP:1 | B8 |
-| tests/unit/vtt/monster-omitted-riders.test.ts | MCP:2, Human:1 | B8 |
-| tests/unit/vtt/offer-environment-board-sequence.test.ts | DM:1 | B1 |
-| tests/unit/vtt/offered-option-paths.test.ts | Paths:1 | B8 |
-| tests/unit/vtt/preview-hidden-rolls.test.ts | DM:2 | B8 |
-| tests/unit/vtt/prose-renderer.test.ts | MCP:13 | B8 |
-| tests/unit/vtt/refusal-handling.test.ts | Host:6 | B8 |
-| tests/unit/vtt/renderer-profile.test.ts | MCP:8, Round:1 | B8 |
-| tests/unit/vtt/save-manager.test.ts | Host:1 | B9 |
-| tests/unit/vtt/semantic-board-payload.test.ts | DM:3 | B9 |
-| tests/unit/vtt/session-timeline-record.test.ts | DM:1, Host:2 | B9 |
-| tests/unit/vtt/snippets.test.ts | MCP:3 | B9 |
-| tests/unit/vtt/stable-dom-render.test.ts | Human:1 | B9 |
-| tests/unit/vtt/turn-exhaustion-coordinator.test.ts | DM:1 | B10 |
-| tests/unit/vtt/unicorns-blessing-consistency.test.ts | MCP:3, Round:2 | B10 |
-| tools/ai-dm-screenshot-probe.ts | DM:1 | B10 |
-| tools/prose-renderer-report.ts | MCP:1 | B10 |
-| tools/renderer-calibration.ts | MCP:3 | B10 |
-| tools/turn-context-cap-sweep.ts | MCP:1, Round:1 | B10 |
-| tools/vtt-experiment.ts | DM:1 | B10 |
-| tools/vtt-soak.ts | DM:1 | B10 |
-The 15 additional worktree test paths exposed by the broader probe are explicitly listed in B1 and B4–B10.
-Together the three environment suites, ten 3B files, and all worktree caller suites form 65 unique specs.
-B11/B12 explicitly list fourteen additional main-side specs, giving 79 unique affected specs after integration.
-No wildcard may silently substitute a smaller discovered set for this list.
-The final manifest also includes every new/modified/promised spec from earlier offers slices that still exists.
-Use the roadmap's pinned-ledger and runtime-consumer union, not just these 79 specs, if it is larger.
-Record exact deduplicated path count before invoking Vitest.
+## 7. Merged caller inventory and cumulative verification
+This table is generated from the in-memory probes against 0e2eb984, replacing the old 59-file working inventory.
+Columns count seven-API/full-query-fold diagnostics and identify the first assigned batch.
+Definition-site diagnostics from deliberately unrepaired bodies are included and do not represent independent bugs.
+All 108 diagnostic files are assigned; the canonical-reference audit supplies additional non-diagnostic files.
+| File | Seven-API / full fold | First batch |
+|---|---:|---|
+| src/vtt/arena-legality.ts | 0 / 9 | B2 |
+| src/vtt/blind-intent-resolver.ts | 0 / 9 | B2 |
+| src/vtt/challenge-feasibility.ts | 0 / 8 | B2 |
+| src/vtt/dm-encounter-host.ts | 1 / 2 | B3 |
+| src/vtt/encounter-app.ts | 1 / 1 | B3 |
+| src/vtt/encounter-board-projection.ts | 0 / 1 | B3 |
+| src/vtt/encounter-projections.ts | 0 / 2 | B2 |
+| src/vtt/engine-query-port.ts | 0 / 3 | B2 |
+| src/vtt/engine-round-session.ts | 0 / 1 | B3 |
+| src/vtt/handoff/fixtures/two-room.ts | 1 / 1 | B11 |
+| src/vtt/handoff/worker-entry.ts | 1 / 1 | B11 |
+| src/vtt/intel/team-scorer.ts | 0 / 1 | B3 |
+| src/vtt/mcp/engine-server.ts | 0 / 12 | B2 |
+| src/vtt/mcp/entrypoint.ts | 4 / 7 | B2 |
+| src/vtt/offered-option-paths.ts | 0 / 1 | B3 |
+| src/vtt/plan-materiality.ts | 0 / 1 | B3 |
+| tests/helpers/legacy-advice-surface.ts | 1 / 1 | B11 |
+| tests/integration/vtt/dm-encounter-host-live-path.test.ts | 8 / 10 | B4 |
+| tests/integration/vtt/encounter-conclusion.test.ts | 2 / 2 | B4 |
+| tests/integration/vtt/vane-warren-session.test.ts | 3 / 3 | B4 |
+| tests/unit/bridge/client.test.ts | 4 / 4 | B4 |
+| tests/unit/bridge/decision-program.test.ts | 1 / 1 | B4 |
+| tests/unit/bridge/js-round-plan-integration.test.ts | 2 / 2 | B4 |
+| tests/unit/bridge/projection-transport.test.ts | 1 / 1 | B4 |
+| tests/unit/bridge/steering.test.ts | 1 / 1 | B4 |
+| tests/unit/tools/ai-dm-arena.test.ts | 4 / 8 | B4 |
+| tests/unit/tools/ai-dm-board-delivery.test.ts | 7 / 9 | B4 |
+| tests/unit/tools/ai-dm-board-snapshot.test.ts | 1 / 3 | B5 |
+| tests/unit/tools/ai-dm-conversation.test.ts | 2 / 10 | B5 |
+| tests/unit/tools/ai-dm-knowledge-base.test.ts | 2 / 4 | B5 |
+| tests/unit/tools/ai-dm-legacy-invariance.test.ts | 1 / 2 | B11 |
+| tests/unit/tools/d569-v5.test.ts | 1 / 1 | B11 |
+| tests/unit/tools/engine-mcp-boundary.test.ts | 2 / 5 | B5 |
+| tests/unit/tools/engine-mcp-golden.test.ts | 0 / 5 | B5 |
+| tests/unit/tools/engine-mcp-handler.test.ts | 40 / 44 | B5 |
+| tests/unit/tools/engine-mcp-server.test.ts | 10 / 10 | B11 |
+| tests/unit/tools/local-openai-conversation.SIMULATED.test.ts | 0 / 7 | B5 |
+| tests/unit/vtt/adjustment-exhaustion-coordinator.test.ts | 2 / 2 | B5 |
+| tests/unit/vtt/arena-basis-brutal-b.test.ts | 2 / 9 | B5 |
+| tests/unit/vtt/blind-context-source-binding.test.ts | 0 / 2 | B11 |
+| tests/unit/vtt/blind-intent-resolver.test.ts | 3 / 10 | B11 |
+| tests/unit/vtt/blind-turn-context.test.ts | 2 / 2 | B11 |
+| tests/unit/vtt/challenge-room-fixtures.test.ts | 0 / 7 | B5 |
+| tests/unit/vtt/composite-turn-proposals.test.ts | 6 / 19 | B6 |
+| tests/unit/vtt/controller-assignment.test.ts | 1 / 1 | B6 |
+| tests/unit/vtt/d466-b4-spell-payloads.test.ts | 1 / 1 | B6 |
+| tests/unit/vtt/detection-ui.test.ts | 2 / 2 | B6 |
+| tests/unit/vtt/dm-tactical-intel.test.ts | 1 / 2 | B6 |
+| tests/unit/vtt/door-intent.test.ts | 2 / 2 | B11 |
+| tests/unit/vtt/encounter-board-projection.test.ts | 3 / 3 | B6 |
+| tests/unit/vtt/encounter-projections.test.ts | 3 / 3 | B6 |
+| tests/unit/vtt/encounter-session-service.test.ts | 20 / 20 | B12 |
+| tests/unit/vtt/engine-context-integrations.test.ts | 5 / 6 | B6 |
+| tests/unit/vtt/engine-host-integration.test.ts | 3 / 3 | B6 |
+| tests/unit/vtt/engine-opportunity-movement-intel.test.ts | 2 / 11 | B6 |
+| tests/unit/vtt/engine-query-port.test.ts | 0 / 7 | B7 |
+| tests/unit/vtt/engine-round-session.test.ts | 23 / 29 | B7 |
+| tests/unit/vtt/engine-state-capsule.test.ts | 2 / 10 | B7 |
+| tests/unit/vtt/footprint-increment-four.test.ts | 1 / 1 | B7 |
+| tests/unit/vtt/footprint-increment-three.test.ts | 5 / 5 | B7 |
+| tests/unit/vtt/handoff-examples.test.ts | 1 / 1 | B12 |
+| tests/unit/vtt/hidden-option-boundary.test.ts | 2 / 2 | B7 |
+| tests/unit/vtt/hypnotic-pattern-probe.test.ts | 2 / 15 | B7 |
+| tests/unit/vtt/in-process-transport.test.ts | 5 / 5 | B12 |
+| tests/unit/vtt/last-seen.test.ts | 1 / 1 | B7 |
+| tests/unit/vtt/legendary-windows.test.ts | 0 / 3 | B17 |
+| tests/unit/vtt/local-session-store.test.ts | 13 / 13 | B7 |
+| tests/unit/vtt/mixed-kind-multiattack.test.ts | 1 / 5 | B7 |
+| tests/unit/vtt/monster-feature-support.test.ts | 1 / 1 | B8 |
+| tests/unit/vtt/monster-omitted-riders.test.ts | 3 / 8 | B8 |
+| tests/unit/vtt/offer-environment-board-sequence.test.ts | 1 / 2 | B1 |
+| tests/unit/vtt/offer-environment-identity.test.ts | 0 / 2 | B1 |
+| tests/unit/vtt/offer-environment.test.ts | 0 / 4 | B1 |
+| tests/unit/vtt/offered-option-paths.test.ts | 1 / 2 | B8 |
+| tests/unit/vtt/option-outcome.test.ts | 0 / 4 | B8 |
+| tests/unit/vtt/plan-materiality.test.ts | 0 / 6 | B8 |
+| tests/unit/vtt/plays-v1.test.ts | 0 / 1 | B8 |
+| tests/unit/vtt/preview-hidden-rolls.test.ts | 2 / 2 | B8 |
+| tests/unit/vtt/prose-renderer.test.ts | 13 / 13 | B8 |
+| tests/unit/vtt/protocol-runtime.test.ts | 2 / 2 | B12 |
+| tests/unit/vtt/refusal-handling.test.ts | 6 / 6 | B8 |
+| tests/unit/vtt/renderer-profile.test.ts | 9 / 9 | B8 |
+| tests/unit/vtt/room-generator-los-cover.test.ts | 0 / 2 | B9 |
+| tests/unit/vtt/save-manager.test.ts | 1 / 1 | B9 |
+| tests/unit/vtt/scene-snapshot.test.ts | 3 / 3 | B12 |
+| tests/unit/vtt/semantic-board-payload.test.ts | 3 / 3 | B9 |
+| tests/unit/vtt/session-lifecycle.test.ts | 1 / 1 | B12 |
+| tests/unit/vtt/session-persistence.test.ts | 1 / 1 | B12 |
+| tests/unit/vtt/session-timeline-record.test.ts | 4 / 4 | B9 |
+| tests/unit/vtt/snippets.test.ts | 3 / 5 | B9 |
+| tests/unit/vtt/speculative-planning.test.ts | 0 / 26 | B9 |
+| tests/unit/vtt/stable-dom-render.test.ts | 1 / 1 | B9 |
+| tests/unit/vtt/standard-offer-generator.test.ts | 0 / 1 | B9 |
+| tests/unit/vtt/tactical-evaluator-r02.test.ts | 0 / 3 | B9 |
+| tests/unit/vtt/turn-exhaustion-coordinator.test.ts | 1 / 3 | B10 |
+| tests/unit/vtt/unicorns-blessing-consistency.test.ts | 5 / 5 | B10 |
+| tools/agent-conformance.ts | 0 / 2 | B10 |
+| tools/ai-dm-arena.ts | 0 / 2 | B2 |
+| tools/ai-dm-conversation.ts | 0 / 25 | B2 |
+| tools/ai-dm-screenshot-probe.ts | 1 / 1 | B10 |
+| tools/blind-context-fixture-report.ts | 1 / 1 | B12 |
+| tools/d569-second-family-manifest.ts | 0 / 2 | B12 |
+| tools/prose-renderer-report.ts | 1 / 1 | B10 |
+| tools/renderer-calibration.ts | 3 / 3 | B10 |
+| tools/turn-context-cap-sweep.ts | 2 / 2 | B10 |
+| tools/vtt-experiment.ts | 1 / 1 | B10 |
+| tools/vtt-handoff/node-runtime.ts | 1 / 1 | B12 |
+| tools/vtt-soak.ts | 1 / 1 | B10 |
+The complete manifest lists 81 existing specs, including the three environment suites and all ten 3B files.
+The two newly included suites are legendary-windows.test.ts and projected-movement-options.test.ts.
+Every listed spec and every earlier-slice promised/pinned-ledger spec that still exists joins the cumulative union.
+Regenerate and deduplicate that manifest before the targeted invocation and record its exact path count.
+No wildcard may silently replace it with a smaller discovered set.
 
 ### 7.1 Cumulative run order and evidence
 The implementation lane records each targeted command, exit code, spec/test count, and elapsed seconds.
@@ -789,103 +931,66 @@
 npx vitest list --configLoader runner --filesOnly --json
 ```
 Compare normalized discovered paths with the supervisor's 641-file main-40f04e2c baseline.
-The branch already adds offer-environment-identity.test.ts and offer-environment-board-sequence.test.ts relative to main.
+The integrated branch contains offer-environment-identity.test.ts and offer-environment-board-sequence.test.ts above main.
 The verified git added/renamed-spec probe reports exactly those two additions and no renames.
-Therefore expected integrated discovery is 643 files if those two branch additions are the only differences.
-This tranche itself adds no spec relative to 82ae8554; report both baselines rather than insisting on 641 after merge.
+Merged static membership is 643 files, with exactly those two additions above the 641-file main baseline.
+This amendment adds no spec relative to 0e2eb984, so final discovery must remain 643 unless reviewed new/renamed specs appear.
 Only explicitly listed new/renamed specs may differ, and a missing preexisting suite is a hard failure.
-No discovery command ran in this authoring round.
+No Vitest discovery/test command ran in this round; the 643 count is a read-only filesystem/configuration check.
 After targeted/static/discovery/mutation evidence is green, the supervisor runs npm run test:gate on the integrated revision.
 Preserve M-1's authoritative gate evidence and report exact outcome, suite count, test count, and elapsed time.
 The worktree implementation lane does not run a full gate, build, full suite, or browser suite.
 A load-related targeted failure gets only the roadmap's identical serial retry with --maxWorkers=1.
 Do not change timeouts, add outer flock, invoke model phases, or touch port 4173.
-
-## 8. Assumptions verified read-only this round
-Ran git rev-parse HEAD: 82ae85542f2b4103d02749b33413739bd641af66.
-Read both tsconfigs before probing: noEmit true and no incremental option enabled.
-Their tsBuildInfoFile values are /tmp/dnd-multiclass-spells-static-app.tsbuildinfo and its -node counterpart.
-Ran node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false: exit 0, zero diagnostics.
-Ran node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false: exit 0, zero diagnostics.
-Ran sg scan --config sgconfig.yml src tools tests: exit 0, zero findings.
-Read sg test --help: --test-dir, --skip-snapshot-tests, and --include-off are supported.
-Ran git show --format=short --stat 82ae8554: ten files, +240/-222.
-Ran git diff --numstat 6bd0e757^ 82ae8554: ten files, +734/-45.
-Reran count-scaffolding.py from stdin after deleting its .write_text lines: exit 0, 427/307 and 153/87 partitions.
-Its script and JSON evidence live in the previously authorized offers-simplify scratch directory.
-Read probe-callers.json and probe-files-table.md there to derive the initial 221/59 inventory.
-Ran the expanded experiments with node --input-type=module, feeding the TypeScript compiler-API source through stdin.
-The compiler version was 5.9.3 and each reporting script exited 0 after printing diagnostics.
-The successive diagnostic totals were 430/83 files, 433/85 files, and 434/86 files.
-These reporting exits are not tsc success exits.
-The final host overrode readFile/fileExists for 18 virtual files, set noEmit and incremental:false, and threw on writeFile.
-It started from the six prior scratch signature edits and removed constructors, unions, singleton, and capsule wrapper.
-It also required handler/server/divergence/allocation arguments, added root input types, and required DM digest output.
-Its virtual builder declared the private-field runtime signature and the exact three-arm input union from section 3.
-A temporary type-only re-export in the probe suppressed unrelated import-path churn while testing nominal assignability.
-Final implementation removes that re-export; the architecture gate checks the final export surface separately.
-This experiment deliberately did not repair old function bodies or callers.
-The final diagnostic codes were TS2304:2,2305:16,2322:3,2339:1,2345:184,2375:1,2379:9.
-The remaining codes were TS2551:4,2554:133,2561:1,2724:44,2741:13,2769:1,7006:22.
-All final-probe diagnostic files are included in the manifest, but integrated-main caller closure still requires T.
-Ran the named-constructor/default rg probes and a TypeScript AST identifier walk over src/tools/tests.
-Ran git grep -n -E for host/round/runtime/projector/resolver/capsule calls at 40f04e2c.
-Filtering against the 98-file worktree manifest yielded exactly 62 sites in 20 files, including fourteen specs.
-Ran git check-ignore for this plan path: the path was printed, confirming it is ignored.
-No scratch probe file, repository source, dependency, or configuration was written during these probes.
 
-## 9. Merge overlap, risks, and stopping conditions
-Ran git merge-base 82ae8554 40f04e2c: 21376f1b9e6a359549b03b65118b802c8fe7bfb2.
-Ran git diff --stat 82ae8554...40f04e2c -- src/vtt tools tests/unit/vtt tests/unit/tools.
-Its exact summary output was: 177 files changed, 55268 insertions(+), 1247 deletions(-).
-That range includes substantial earlier main work, not just M-1, M-14, and M-3.
-The final manifest intersects 44 changed main paths, including the twenty additional callers listed in B11/B12.
-The remaining 24 overlap paths are:
-- package.json
-- src/vtt/dm-encounter-host.ts
-- src/vtt/encounter-app.ts
-- src/vtt/encounter-projections.ts
-- src/vtt/engine-round-session.ts
-- src/vtt/mcp/engine-server.ts
-- src/vtt/mcp/entrypoint.ts
-- tests/unit/tools/ai-dm-arena.test.ts
-- tests/unit/tools/ai-dm-board-delivery.test.ts
-- tests/unit/tools/ai-dm-board-snapshot.test.ts
-- tests/unit/tools/ai-dm-conversation.test.ts
-- tests/unit/tools/ai-dm-knowledge-base.test.ts
-- tests/unit/vtt/adjustment-exhaustion-coordinator.test.ts
-- tests/unit/vtt/encounter-projections.test.ts
-- tests/unit/vtt/last-seen.test.ts
-- tests/unit/vtt/local-session-store.test.ts
-- tests/unit/vtt/refusal-handling.test.ts
-- tests/unit/vtt/renderer-profile.test.ts
-- tests/unit/vtt/room-generator.test.ts
-- tests/unit/vtt/session-timeline-record.test.ts
-- tests/unit/vtt/turn-exhaustion-coordinator.test.ts
-- tools/agent-conformance.ts
-- tools/ai-dm-arena.ts
-- tools/ai-dm-conversation.ts
-Main-side numstat includes host +888/-62, entrypoint +384/-21, conversation +1856/-185, and package.json +17/-1.
-M-1 range d251e716..229962c3 changes gate runners/reporters/specs but none of this manifest's files.
-M-14 range 229962c3..a04a6093 changes supervision, BUILD-PLAN, ids commentary, and operational-guidance-facts.test.ts.
-M-14 has no direct file overlap and contributes the main discovery baseline change to 641.
-M-3 range a04a6093..40f04e2c overlaps package.json and tests/unit/vtt/handoff-examples.test.ts.
-Preserve M-3's handoff gate inventory/report changes and M-1's runner code when reconciling those overlaps.
-Do not choose an entire older host, entrypoint, conversation, or package file to resolve a conflict.
-Additional main-side signatures or callers require a reviewed manifest extension, not a hidden eleventh-file patch.
-The full integrated tree must pass T and discovery conservation before any landing.
+## 8. Assumptions verified read-only in this amendment
+git rev-parse HEAD returned 0e2eb984368d7acc641cd6ec161411a99bb80cf1 and initial git status was empty.
+Both tsconfigs retain noEmit:true and /tmp/dnd-multiclass-spells-static-{app,node}.tsbuildinfo paths.
+node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false: exit 0, zero diagnostics.
+node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false: exit 0, zero diagnostics.
+The final inventory command was node --input-type=module with a compiler-API program supplied through stdin.
+It read the merged files, applied AST/text edits through readFile/fileExists overrides, and disabled all compiler writes.
+TypeScript 5.9.3 parsed every virtual file with zero syntax diagnostics.
+The six-file seven-API edit set produced 287 diagnostics / 78 files against the historical 221 / 59 baseline.
+The eighteen-file builder signature set produced 508 diagnostics / 106 files.
+The twenty-one-file query-fold signature set produced 558 diagnostics / 108 files.
+Each reporting script exited 0 after printing diagnostics; these are not successful typechecks of the proposed changes.
+The final edits include required launcher/line-server options, branded builder types, query parameters, and blind/legendary inputs.
+Old function bodies/callers were intentionally unrepaired and the probe retained a temporary type-only environment re-export.
+Final implementation removes that re-export and must pass T, behavior, and architecture checks.
+Final codes: TS2304:3,2305:18,2322:2,2339:1,2344:2,2345:245,2353:2,2375:2,2379:10.
+Remaining codes: TS2551:4,2554:184,2561:1,2724:46,2741:13,2769:1,7006:23,18046:1.
+rg -l canonicalEngineQueryPort src tools tests --glob '*.ts' identified 45 files, all assigned in this manifest.
+Reading vitest.config.ts confirmed tests/**/*.test.ts with tests/integration-supervisor/** excluded for ordinary runs.
+A node read-only filter of rg --files tests counted exactly 643 matching .test.ts files.
+This is static merged discovery membership, not a Vitest discovery run or the supervisor's in-progress test verdict.
+No test, browser, build, installation, model call, source write, or scratch write ran during this amendment.
 
-A required parameter proves presence, not correct configuration; independently pinned digests and wrong-value mutants remain necessary.
-A WeakMap loses provenance through cloning; accept reminted IDs but reject unregistered option objects.
-The canonical query implementation is outside the digest; interchangeable instances assume the same engine code version.
-If selectable query profiles become a product feature, bind their semantic version before allowing digest equivalence.
-Prevent module-cycle regressions with type-only imports and contract-suite import coverage without mock interception.
-Keep legacy configuration supported; the two projector/path defaults were transitional implementation choices, not reasons to delete legacy.
-Keep board movement, danger overlays, independent legacy pins, and state/refusal behavior while relocating configuration selection.
-Reject a changed digest on room transitions and custom feeds before the changed state is consumed.
-Do not leak DM-only provenance through a player serializer or publish handoff payloads without their existing audience restrictions.
-The frozen contract hash must remain 0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1.
-A frozen-file change, unexplained discovery loss, surviving mutant, golden regeneration, or unmet batch ceiling blocks landing.
-Independent sol review is the next step owned by the supervisor; no reviewer was invoked by this authoring lane.
+## 9. Merge scale, risks, and stopping conditions
+PS3B-F1: git diff --stat 82ae8554...40f04e2c | tail -1 returned:
+431 files changed, 183961 insertions(+), 1363 deletions(-).
+The same scoped command with -- src/vtt tools tests/unit/vtt tests/unit/tools returned:
+177 files changed, 55268 insertions(+), 1247 deletions(-).
+The full range includes earlier main work as well as M-1, M-14, and M-3.
+The amended 123-file manifest intersects 45 changed main paths, versus 44 for the accepted 118-file manifest.
+The added overlap is src/vtt/blind-intent-resolver.ts.
+M-1 changes gate runners/reporters/specs outside this manifest; preserve its authoritative evidence behavior.
+M-14 changes supervision, BUILD-PLAN, ids commentary, and operational-guidance-facts.test.ts without direct file overlap.
+M-3 overlaps package.json and tests/unit/vtt/handoff-examples.test.ts; preserve its handoff inventory/report changes.
+The merge prerequisite is now satisfied by 0e2eb984; do not replace its host/entrypoint/conversation files with older versions.
+The merge's arena, conversation, and knowledge-base test unions retain D569/D613 behavior through the final scaffold removal.
+A required parameter proves presence, while independent query-result/digest controls and source-origin enforcement prove selection.
+A WeakMap loses provenance through cloning, so accept reminted IDs and reject unregistered option objects.
+Canonical-port equivalence assumes one engine revision; future selectable policies require a separately reviewed version contract.
+Avoid module cycles with type-only consumer imports and no eager environment singleton.
+Do not weaken the private builder brand or enable query injection to satisfy a test's hypothetical custom-environment premise.
+The required-query helper seam supplies the different-distance witness, and the actual consumer mutation is also a gate failure.
+Keep legacy mode, board movement/danger overlays, and independent capsule/ID pins unchanged.
+Reject changed run digests on later capsules before consumption or listener notification.
+Keep DM-only provenance out of player serializers and preserve handoff audience restrictions.
+The frozen contract hash remains 0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1.
+A frozen-file change, unexpected discovery loss, surviving mutant, pin regeneration, or batch ceiling violation blocks landing.
+Any caller discovered outside this manifest requires an explicit at-most-ten-file extension before acceptance.
+Sol accepted a5335ad2… with PS3B-F1/F2; this amendment incorporates both and awaits supervisor-owned review.
 
-PLAN S3 BUILDER DONE
+PLAN S3 BUILDER AMEND DONE
