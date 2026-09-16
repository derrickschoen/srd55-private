# OFFERS-IMPL-S3-BUILDER plan lane report (astra resume 01a0a11f…), harvested 2026-09-14 15:50

Wrote the [plan](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md).

- **16 batches**, each ≤10 files; **118 distinct files**.
- `wc -l -c`: **891 lines, 68,140 bytes**.
- `git status --short --untracked-files=all`: **empty**.
- Merge probe: **177 files changed, 55,268 insertions, 1,247 deletions**; 44 overlap the plan.
- Expected integrated discovery: **643 files**, accounting for two existing branch additions above main’s 641 baseline.

Plan SHA-256:
`a5335ad2472b16d33e66482cee322656d84a151e2309331635e603a84abad566`

Frozen contract SHA-256, unchanged:
`0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`

PLAN S3 BUILDER DONE
diff --git a/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md b/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
new file mode 100644
index 0000000000000000000000000000000000000000..52d5b2c2f86e1a4b97e5573fd51e2a7af76e342e
--- /dev/null
+++ b/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
@@ -0,0 +1,891 @@
+# OFFERS-IMPL-S3-BUILDER — single environment builder
+Date: 2026-09-14.
+Author: astra, under the explicit D617.6 role exception.
+Status: proposed implementation plan for independent sol review, not implementation acceptance.
+Base: claude/p-offer-help at 82ae85542f2b4103d02749b33413739bd641af66.
+Integration reference: main 40f04e2c.
+Authority: D617.5 and D617.6 approve recommendation D in simplify-s3b-astra.md.
+The tranche is NON-DISPATCHABLE and contains 16 review batches, each changing at most ten files.
+The inventory contains 118 distinct implementation files and 148 batch/file appearances.
+Repeated appearances are deliberate follow-up edits, not additional distinct files.
+No batch lands on main alone, and no offer-family work starts before cumulative acceptance.
+This document records verified reads/probes separately from proposed changes.
+No runtime tests, builds, discovery commands, installations, git writes, or other model calls ran while authoring.
+## 1. Goal and boundaries
+Provide one exported runtime builder, explicit dependencies, canonical queries, and conserved environment digests.
+Build once at an in-process lifecycle root and pass that environment through its collaborators.
+A separate MCP process rebuilds through the same module from the serialized binding.
+Equivalent deterministic reconstruction is permitted and must not be rejected for having a different address.
+Every environment consumer imports the runtime type from the builder module.
+Only lifecycle roots import its function; importing it is not permission to introduce an ambient current environment.
+Keep legacy_standard as a supported explicit product mode, including existing raw-fixture CLI behavior.
+Do not enable new families, change option-ID formats, alter digest inputs, or regenerate golden expectations.
+Do not add any, double assertions, structural brands, or casts to satisfy the private environment brand.
+Do not edit src/vtt/intel/contracts.ts or weaken engine authority, proposer-only boundaries, or player isolation.
+Keep D405.3 flywheel-only veto, D406 luna-low floor, and D456 180-second live wall unchanged.
+No DM semantic export, provenance catalog, or internal board data may reach a player channel.
+Do not change model routing, timing, build-cache machinery, or M-1 gate evidence semantics.
+## 2. Verified starting behavior at 82ae8554
+Locations below refer to the unmodified base, not line numbers after migration.
+The literal legacy grep identifies eight files, not eight external fallback constructors.
+It includes seven external construction sites and the factory definition itself.
+| Site | Current behavior and caller consequence |
+|---|---|
+| src/vtt/encounter-projections.ts:399 | projectDmBoard creates legacy locally; input at 314 has no environment. |
+| src/vtt/dm-encounter-host.ts:281 | Optional environment, options = {} at 282, and ?? construction at 295–296. |
+| src/vtt/encounter-board-projection.ts:59 | projectHumanEngineOptions fourth argument defaults to legacy. |
+| src/vtt/offered-option-paths.ts:63 | Transitional module singleton supplies defaults at 131 and 150. |
+| src/vtt/engine-round-session.ts:357 | Fourth constructor argument defaults to legacy. |
+| src/vtt/mcp/entrypoint.ts:318 | Runtime optional environment, options = {} at 319, and ?? construction at 321. |
+| tools/ai-dm-conversation.ts:3304 | Explicit run-root legacy construction, rather than an optional consumer. |
+| src/vtt/offers/offer-environment.ts:179 | Factory definition, rather than another consumer default. |
+The offer-environment module also exports runtime constructors at 151, 165, and 192.
+Its generic factory invokes reconstruction at 171, legacy invokes it at 180, and revision invokes generic at 193.
+Conversation reconstructs at 1956, 2703, 2776, and 3036 using capsule bindings.
+Entrypoint exports reconstructLauncherOfferEnvironment at 755, invokes reconstruction at 758, and calls it at 802.
+These are the complete runtime-construction expression sites found by the named-constructor grep in src and tools.
+Policy/catalog/binding codecs create serializable values and are not additional runtime-environment builders.
+Engine-state-capsule.ts:943–948 is another default path: a wrapper silently chooses the legacy binding.
+Entrypoint.ts:490–495 contains createEngineMcpHandler and handleMcpRequest wrappers that omit the runtime dependency.
+Entrypoint.ts:512–514 gives runEngineMcpServer its inherited options = {} default.
+Entrypoint.ts:885–895 constructs empty or scenario-only options for the raw-fixture CLI path.
+Do not confuse unrelated scenario/renderer defaults with environment defaults.
+Actor-list and revision defaults at encounter-board-projection.ts:56–58 remain valid preceding defaulted arguments.
+Offered-option-paths.ts:130 keeps its actor-list default while requiring the following environment argument.
+Intent-resolver.ts:73 exposes EngineOptionEnvironment | EngineQueryPort.
+Intent-resolver.ts:548,652,682 default resolve, available-options, and resolver-factory arguments to canonical queries.
+Intent-resolver.ts:729 exports the ambient pureTurnProposalResolver singleton.
+Speculative-planning.ts:282 makes planner.plan environment optional.
+Speculative-planning.ts:286,299,681 accepts query-port union arms and defaults the latter two offer-aware APIs.
+Its query-only defaults at 105,356,570,611,761 are not removed indiscriminately.
+Plan-materiality.ts:36,104–108 permits an absent environment and invokes the unbound available-options path.
+Opportunity-cost.ts:154,273 and team-scorer.ts:206,279,322,469 retain query-port union arms.
+Engine-query-port.ts:1023–1024 generates registry options using only queries.
+Engine-query-port.ts:1043–1048 discards the environment before calling that registry.
+Engine-query-port.ts:236–241 and 1707 expose compareAllocations/compareTacticalAllocations without an environment.
+Its offer generation at 1733 and resolution at 1788 use canonical queries directly.
+Team-scorer.ts:384 and tactical-evaluator-r02.test.ts:224,289 exercise that allocation route.
+Challenge-feasibility.ts:436,443,981,984,1109,1114,1131,1136 generates/resolves through ambient defaults.
+These routes explain why the initial 221 diagnostics were only the first migration layer.
+### 2.1 Identity, hashes, and process boundaries
+Intent-resolver.ts:75 stores WeakMap<EngineOfferableOption, EngineOptionEnvironment>.
+Registration at 91–102 is conditional on selecting the environment union arm.
+The guard at 550–555 rejects a different object reference but accepts a missing WeakMap entry.
+Offered-option-paths.ts:163–166 translates that refusal into OfferedOptionEnvironmentMismatchError.
+It does not currently perform a digest comparison.
+Offer-environment.ts:19–34,114–162 hashes format, mode, familyPolicy, and partyThreatCatalog.
+The caller-selected queries field is outside that digest.
+Thus current equal hashes do not establish query equivalence until query selection is fixed by the builder.
+Engine-state-capsule.ts:204 carries the binding, and its decoder at 619 validates it.
+The capsule digest body at 921–940 includes the binding and excludes generatedAt.
+Engine-state-capsule.ts:951–952 exposes that commitment as engine-state:<capsule digest>.
+MCP engine-server.ts:1334 compares the application environment digest with the launch capsule digest.
+Its dependency bag at 267 separately accepts turnProposals, supplied independently by entrypoint.ts:420–421.
+MutableEngineCapsuleFeed.replace at engine-server.ts:201–207 checks validity, run, and revision but not environment.
+The launch check therefore does not prevent a later valid capsule from switching environments.
+Conversation.ts:2650 writes capsule.offerEnvironment into the launcher.
+Entrypoint.ts:731–737 requires and decodes the binding for a recognized launcher.
+Entrypoint.ts:802,819 reconstructs it and passes it to the server.
+The two direct child spawners are tools/engine-mcp-dry-client.ts:36–41 and ai-dm-conversation.ts:1736–1741.
+Both launch tools/engine-mcp-server.ts through vite-node.
+Conversation.ts:3287 also configures that executable for an agent adapter; preserve that launcher route.
+The dry client currently supplies a raw fixture path, not a binding-bearing launcher.
+Tests/unit/tools/ai-dm-conversation.test.ts:1622 compares one resolver invocation with itself.
+Its getter spy at 1630 intercepts the default singleton, and the cleanup assertion at 1647 checks the wrong subject.
+Production proposalResolutionDivergence at conversation.ts:3084–3088 uses that default singleton.
+The SIMULATED test at 239–254 observes actual construction, unlike the eight self-invoking helper spies.
+Its real advertised→submitted→accepted evidence at 270–321 remains valuable.
+### 2.2 Existing enforcement
+Sgconfig.yml loads ast-grep-rules, which currently contains six rules.
+They are no-discarded-character-command-execute, no-party-pack-gap-push, and vtt-snippet-purity.
+The remaining three are no-discarded-command-apply, no-inline-party-pack-super-refine, and no-raw-fs-in-tests.
+The TypeScript severity-error import rule vtt-snippet-purity is a local architecture-rule precedent.
+Scripts/check-command-outcomes.sh:4 runs exactly sg scan --config sgconfig.yml src.
+The roadmap cumulative command at 887 has the same restricted scope.
+Package.json:13 invokes that script in typecheck, and line 14 exposes check:command-outcomes.
+Package.json:17 test:gate invokes node tools/gate-vitest.mjs.
+Tools/gate-vitest.mjs, tools/gate-playwright.mjs, and tools/gate-runner-lib.mjs do not supply the missing sg scope.
+The widened existing-rule probe this round found zero findings across src, tools, and tests.
+## 3. Final builder and consumption contract
+Create src/vtt/offers/build-offer-environment.ts with exactly one exported runtime function.
+The following is the public signature, with type-only exports permitted:
+```ts
+export type OfferEnvironmentInput =
+  | { readonly kind: 'configuration'; readonly mode: 'legacy_standard' }
+  | {
+      readonly kind: 'configuration';
+      readonly mode: 'revision_bound';
+      readonly familyPolicy: EngineOfferFamilyPolicy;
+      readonly partyThreatCatalog: PartyThreatCatalog;
+    }
+  | { readonly kind: 'binding'; readonly binding: unknown };
+export function buildOfferEnvironment(input: OfferEnvironmentInput): EngineOptionEnvironment;
+```
+Legacy configuration selects disabled family policy and an unrepresented catalog within this function.
+Revision configuration requires explicit policy/catalog values and validates their codecs.
+Binding input strictly decodes its unknown payload and obeys the serialized mode without a caller override.
+The function imports canonicalEngineQueryPort from ../engine-query-port and accepts no queries argument.
+Its runtime input validation rejects extra configuration keys such as queries or a binding-mode override.
+Keep codec error messages for invalid shapes, header modes, nested hashes, and binding digests.
+Missing input throws TypeError('Offer environment input must be an object.').
+Missing or undefined binding throws TypeError('Offer environment binding is required.').
+Malformed binding throws the existing decoder TypeError; there is no legacy recovery path.
+A recognized launcher missing its binding retains the existing explicit-launcher TypeError at entrypoint:733.
+The CLI must distinguish a valid arena fixture from a malformed or mistagged launcher before choosing fixture mode.
+Invalid launcher-shaped input must fail validation rather than being reinterpreted as a legacy fixture.
+Define a module-private class RuntimeOfferEnvironment with a real private field such as readonly #brand = undefined.
+Expose readonly queries and readonly binding, with familyPolicy, partyThreatCatalog, and digest derived from binding.
+Freeze the instance after initialization and rely on the binding decoder's deep immutable copy.
+Export type EngineOptionEnvironment = RuntimeOfferEnvironment, but never export the class value or its constructor.
+Only buildOfferEnvironment invokes new RuntimeOfferEnvironment.
+Object literals and object spreads must fail assignability to this private-field type.
+Do not serialize the runtime instance; serialize only environment.binding.
+No exported wrapper, default export, re-export, constructor alias, or alternative query implementation may construct it.
+This is an ordinary typed-code guarantee, not a security boundary against deliberate JavaScript reflection.
+Keep family-policy types/create/decode functions in offer-environment.ts.
+Keep binding body/types and create/decodeEngineOptionEnvironmentBinding in offer-environment.ts.
+Keep createLegacyEngineOptionEnvironmentBinding as a data codec for the supported explicit legacy mode.
+Keep catalog codecs in party-threat-catalog.ts.
+Remove the old runtime interface/type export and all four runtime factory exports from offer-environment.ts.
+Remove reconstructLauncherOfferEnvironment rather than leaving a second exported reconstruction facade.
+The final codec module has no EngineQueryPort dependency.
+Use type-only imports in consumers to avoid introducing eager construction through module cycles.
+### 3.1 Required surfaces and provenance
+All offer-aware APIs accept the branded environment, never EngineOptionEnvironment | EngineQueryPort.
+Remove the union alias, its discriminating helper, and the default resolver singleton.
+A query-only helper may still accept EngineQueryPort when it neither generates nor resolves offers.
+Replace the private WeakMap value with the validated environment digest string.
+Every public available-options/partition/registry path registers each actual option object with that digest.
+Resolve refuses when provenance is absent or differs from the supplied environment digest.
+Use OFFER_ENVIRONMENT_MISMATCH for both cases and keep the paths adapter's typed error translation.
+A reconstructed environment with the same digest resolves an originally minted option successfully.
+A different policy/catalog/mode digest refuses even when queries and resulting option IDs happen to match.
+Do not register arbitrary cloned/serialized option objects during resolution.
+ID-based proposals continue to remint authoritative options under the supplied environment before resolution.
+A bare ID is not evidence that an option was minted under a particular environment.
+Tests needing custom illegal mechanics must derive an option through the public generator or test the raw generator separately.
+They must not add a public provenance-registration escape hatch.
+Make engineActionRegistryForEnvironment implement its registry directly and use the environment for optionsFor.
+Delete exported engineActionRegistry and migrate every caller to the environment-bound form.
+Require the fifth environment argument in compareTacticalAllocations and EngineQueryPort.compareAllocations.
+Pass it from team-scorer and use it for both option generation and resolution inside allocation evaluation.
+Use environment.queries for the calculation's query operations without recursively replacing the query port.
+Make materiality context and planner environments required and thread them through speculative and scoring paths.
+Make round, host, runtime, human-option, offered-actor, offered-path, and DM-projector environments required.
+Delete each optional marker, environment initializer, enclosing empty-options initializer, and ?? environment fallback.
+Make createEngineMcpHandler(state, environment, maximumToolResultBytes?) explicit.
+Make handleMcpRequest's added environment argument required and forward it to that handler.
+Keep runEngineMcpServer's options object required with its required offerEnvironment field.
+Retain actor/revision defaults preceding a required environment argument by passing undefined explicitly where appropriate.
+Keep createEngineStateCapsuleForEnvironment as the explicit binding-bearing capsule factory and delete its legacy wrapper.
+Create turnProposals inside createEngineMcpApplication from its one environment.
+Remove turnProposals from EngineMcpDependencies and the separately selected value at entrypoint.
+Pin the initial digest in MutableEngineCapsuleFeed and reject a different digest before replacing state or notifying listeners.
+Recheck the current capsule digest at application consumption boundaries for externally supplied EngineCapsuleFeed implementations.
+Check read/current/listen paths used to accept proposals, render contexts, and process capsule events.
+A room transition may advance state but cannot silently change a run's binding.
+Preserve existing validity, state-handle, run, revision, and request checks.
+Add readonly offerEnvironmentDigest: string to DmBoardProjection in encounter-projections.ts.
+Produce it from the same local required environment used for human options and offered paths.
+Host snapshot passes its stored environment and rejects a returned DM digest that differs from that stored digest.
+Do not add the field to PlayerBoardProjection or any player serializer.
+The real board-sequence test compares that field against an independently selected non-legacy input.
+This covers a whole-projector legacy substitution that could otherwise leave equal-looking standard options.
+### 3.2 Roots and MCP transport
+Browser encounter-app constructs an explicit legacy configuration once when creating its host.
+ConversationConfigBase and ArenaConfigBase gain required offerEnvironment: OfferEnvironmentInput.
+Their CLI parsers explicitly select configuration/legacy_standard, and arena forwards the selected input unchanged.
+Programmatic callers can select revision_bound or a binding through that same required property.
+Conversation builds at its run root and passes the resulting instance into the round session and all in-process consumers.
+Snapshot consumers reconstruct through buildOfferEnvironment({ kind: 'binding', binding: capsule.offerEnvironment }).
+Required proposalResolutionDivergence(state, entry, environment) creates its bound resolver without a getter interception.
+Challenge feasibility's public report/command probe entry points explicitly select legacy and thread it through internal helpers.
+The report, calibration, screenshot, conformance, sweep, experiment, and soak tools explicitly compose their own run environment.
+These are independent lifecycle roots, not new exported environment-building functions.
+The MCP parent serializes the capsule's binding verbatim in its launcher.
+The MCP child calls buildOfferEnvironment({ kind: 'binding', binding: manifest.offerEnvironment }) directly.
+The child uses the same canonical engine code and module as the parent while allocating a distinct instance.
+The raw-fixture CLI branch explicitly builds configuration/legacy_standard after validating a raw fixture.
+No launcher error may fall through into that raw-fixture branch.
+Extend EngineMcpStdioClient's launch input to distinguish fixture and launcher paths explicitly.
+Update existing dry-client construction calls in that same module and golden tests accordingly.
+Keep engine-mcp-server.ts as the unchanged thin entrypoint.
+No additional MCP field or schema regeneration is needed for the child binding test.
+## 4. Review batches and compiler-derived inventory
+The first probe's AST diagnostic grouping is reproduced below.
+Its node result includes the app diagnostics, so the combined count is 221, not 226.
+- projectDmBoard: 26 diagnostics.
+- DmEncounterHost: 44 diagnostics.
+- createEngineMcpRuntime: 81 diagnostics.
+- (default/property/type error): 10 diagnostics.
+- fixtureRuntime: 19 diagnostics.
+- EngineRoundSession: 36 diagnostics.
+- projectHumanEngineOptions: 4 diagnostics.
+- offeredOptionPaths: 1 diagnostics.
+The initial file union is 59 files: 50 test files and nine production/tool files.
+The broader signature probe produced 430 diagnostics in 83 files.
+Adding the private branded signature and required root configuration produced 433 diagnostics in 85 files.
+Adding required DM projection provenance produced 434 diagnostics in 86 files.
+The final probe used 18 virtual source files and did not write a source tree or emit a file.
+These counts include intentionally unrepaired definition-site errors and removed-export errors.
+They are migration inventories, not 434 independent defects or evidence that the implementation works.
+The final signature probe found 65 diagnostic test files, all present in the batch inventory.
+Reserve providers for B1–B3/B14, roots for B2/B3, and the three existing environment suites for B1.
+Union the initial and expanded AST diagnostic files, remove those reserved files, and sort by path.
+That leaves 69 caller files, partitioned into six ten-file batches and one nine-file batch as B4–B10.
+A main-side call/reference scan found 20 additional files and 62 matching sites outside the worktree inventory.
+B11–B12 migrate those explicitly listed additional consumers before any optional signature is contracted.
+Their fourteen specs extend the cumulative test union from 65 to 79 existing specs.
+B13 contracts optional forms after that caller group is complete.
+B14 closes resolver, query union, registry, and capsule surfaces after their callers are migrated.
+B15 removes the remaining old exports and turns on final architecture enforcement.
+B16 simplifies exactly the ten 3B test files last.
+The 118-file distinct union includes four new files: builder, rule, YAML fixtures, and architecture script.
+No new or renamed Vitest spec is planned.
+### 4.1 Phase rules and per-batch acceptance
+Before B1 dispatch, the supervisor prepares a cumulative integration tree retaining 82ae8554 and main 40f04e2c.
+This is a supervisor-owned integration prerequisite, not permission for this authoring lane to run git writes.
+Preserve the r3 test scaffold as the starting subject and reconcile main's already-landed changes before migrating APIs.
+Review any offers-specific merge resolution within the listed file units, never as an unbounded extra patch.
+Require the integrated baseline to typecheck before B1 and re-inventory its callers before accepting this manifest.
+If integration adds a caller outside the 118-file inventory, extend the numbered manifest in units of at most ten files.
+Do not start implementation against a silently different baseline or claim this base-only probe proves main closure.
+Every batch must pass both cumulative-tree no-emit TypeScript project checks, denoted T below.
+T means the two direct node node_modules/typescript/bin/tsc -p commands recorded in section 8.
+Each batch also runs the focused specs identified below and the currently applicable architecture checks.
+These are future implementation requirements, not commands authorized during this authoring round.
+B1 leaves the old structural runtime interface and old factories temporarily available to unmigrated callers.
+The new builder already returns its private branded type, which is assignable to those old structural parameters.
+B2 adds transitional optional parameters only where an old signature cannot accept the future argument.
+B3 and the caller batches build through the new function while providers still accept the old structural type.
+B13 and B14 switch provider type imports to the builder when every supplied value is already branded.
+B15 deletes the unused structural type and old factory declarations.
+No cast or deliberately broken intermediate TypeScript checkpoint is needed.
+The ten 3B files appear in B4/B5 for required caller/import edits, but their spy scaffolding stays until B16.
+Retarget deleted-factory observations to the new builder only as a temporary mechanical migration.
+Retarget the divergence singleton getter scaffold to the explicit resolver factory before its singleton disappears.
+Do not spend another review round improving those temporary observations.
+The old equal-binding rejection assertions necessarily conflict with the digest contract introduced in B14.
+Accordingly B14/B15 require T and the new focused contract suites, not a false claim that all ten old suites are green.
+Do not add skip/todo, conditional test branches, or environment flags to conceal that temporary conflict.
+B16 removes the superseded subjects and must pass the entire cumulative test union.
+The non-dispatchable tranche rule makes that short internal conflict explicit and prevents it reaching main.
+If a batch needs an eleventh file to preserve T, split its review delta before acceptance and update this manifest.
+A compiler inventory is a lower bound; discovering another caller never authorizes leaving it on a fallback.
+### B1 — Builder, contracts, and staged enforcement (10 files)
+- src/vtt/offers/build-offer-environment.ts
+- src/vtt/offers/offer-environment.ts
+- tests/unit/vtt/offer-environment.test.ts
+- tests/unit/vtt/offer-environment-identity.test.ts
+- tests/unit/vtt/offer-environment-board-sequence.test.ts
+- ast-grep-rules/no-alternative-offer-environment-construction.yml
+- ast-grep-tests/no-alternative-offer-environment-construction-test.yml
+- scripts/check-offer-environment-architecture.mjs
+- scripts/check-command-outcomes.sh
+- package.json
+Introduce the builder and codec-facing contract without deleting still-used old exports.
+Migrate the three environment suites to builder inputs and preserve their independent digest/legacy-ID pins.
+Add builder validation, private-brand negative compile fixtures, and architecture-rule self-tests.
+Stage the new sg rule as severity: off until B15 while its fixtures run with --include-off.
+The architecture script temporarily recognizes exactly the five preexisting exported runtime factories/wrappers.
+T plus all three environment suites and both architecture self-test modes must pass.
+Required reds: SECOND_ENV_BUILDER for a new export, malformed binding, forged/spread brand, and query injection.
+### B2 — Additive signatures and process roots (8 files)
+- src/vtt/challenge-feasibility.ts
+- src/vtt/encounter-projections.ts
+- src/vtt/engine-query-port.ts
+- src/vtt/mcp/engine-server.ts
+- src/vtt/mcp/entrypoint.ts
+- tools/ai-dm-arena.ts
+- tools/ai-dm-conversation.ts
+- tools/engine-mcp-dry-client.ts
+Add the projector environment input and DM digest output while retaining its temporary fallback.
+Add compatible optional/overloaded handler, allocation, and divergence argument forms for migration.
+Add root configuration fields initially optional, populate them in parsers, and thread arena configuration.
+Derive MCP turnProposals internally and remove the independent entrypoint dependency in this same batch.
+Route child reconstruction through the builder, validate input classification, and add explicit dry-client launcher support.
+Thread a built environment through challenge feasibility's internal option generation/resolution helpers.
+T plus the three environment suites must pass, with existing legacy-ID and launch validation controls intact.
+Required reds: builder malformed binding and independent policy/catalog digest pins.
+Full child and whole-projector changed-binding killers become mandatory in B5 and B14/B16 respectively.
+### B3 — Production dependency threading (9 files)
+- src/vtt/dm-encounter-host.ts
+- src/vtt/encounter-app.ts
+- src/vtt/encounter-board-projection.ts
+- src/vtt/engine-round-session.ts
+- src/vtt/intel/opportunity-cost.ts
+- src/vtt/intel/team-scorer.ts
+- src/vtt/offered-option-paths.ts
+- src/vtt/plan-materiality.ts
+- src/vtt/speculative-planning.ts
+Migrate browser/host, round, board, scoring, and planning production call paths to built environments.
+The host passes its stored environment into its DM projection and checks the returned DM digest.
+Keep transitional provider type imports structural until B13/B14 so unmigrated typed callers still compile.
+Extend existing environment-suite behavior only in its listed later batch, not through an eleventh file.
+T plus offer-environment-board-sequence and offer-environment-identity must pass.
+Required reds: the existing BOARD_DIFFERENT_POLICY path control and FALLBACK_USES_LEGACY_ONLY control.
+### B4 — Caller migration 1 (10 files)
+- tests/integration/vtt/dm-encounter-host-live-path.test.ts
+- tests/integration/vtt/encounter-conclusion.test.ts
+- tests/integration/vtt/vane-warren-session.test.ts
+- tests/unit/bridge/client.test.ts
+- tests/unit/bridge/decision-program.test.ts
+- tests/unit/bridge/js-round-plan-integration.test.ts
+- tests/unit/bridge/projection-transport.test.ts
+- tests/unit/bridge/steering.test.ts
+- tests/unit/tools/ai-dm-arena.test.ts
+- tests/unit/tools/ai-dm-board-delivery.test.ts
+Migrate the listed AST-sorted caller group to explicit builder inputs and required future argument positions.
+Replace default resolver references with local bound resolvers and capsule/registry convenience calls with explicit forms.
+Retain each independent behavior oracle while fixing raw unregistered-option setup through the public generator.
+In the listed 3B files, make prerequisite import/call edits but retain the scaffold until B16.
+T plus every .test.ts file listed in this batch must pass under the still-current reference guard.
+Also run the three environment suites when this group changes a production tool.
+Required reds: preserve existing independent refusal/geometry/payload controls in this caller group.
+### B5 — Caller migration 2 (10 files)
+- tests/unit/tools/ai-dm-board-snapshot.test.ts
+- tests/unit/tools/ai-dm-conversation.test.ts
+- tests/unit/tools/ai-dm-knowledge-base.test.ts
+- tests/unit/tools/engine-mcp-boundary.test.ts
+- tests/unit/tools/engine-mcp-golden.test.ts
+- tests/unit/tools/engine-mcp-handler.test.ts
+- tests/unit/tools/local-openai-conversation.SIMULATED.test.ts
+- tests/unit/vtt/adjustment-exhaustion-coordinator.test.ts
+- tests/unit/vtt/arena-basis-brutal-b.test.ts
+- tests/unit/vtt/challenge-room-fixtures.test.ts
+Migrate the listed AST-sorted caller group to explicit builder inputs and required future argument positions.
+Replace default resolver references with local bound resolvers and capsule/registry convenience calls with explicit forms.
+Retain each independent behavior oracle while fixing raw unregistered-option setup through the public generator.
+In the listed 3B files, make prerequisite import/call edits but retain the scaffold until B16.
+T plus every .test.ts file listed in this batch must pass under the still-current reference guard.
+Also run the three environment suites when this group changes a production tool.
+Required reds: preserve existing independent refusal/geometry/payload controls in this caller group.
+Add MCP_CHILD_IGNORES_SERIALIZED_BINDING to golden and CONSUMER_DROPS_BOUND_ENV to the real SIMULATED run.
+
+### B6 — Caller migration 3 (10 files)
+- tests/unit/vtt/composite-turn-proposals.test.ts
+- tests/unit/vtt/controller-assignment.test.ts
+- tests/unit/vtt/d466-b4-spell-payloads.test.ts
+- tests/unit/vtt/detection-ui.test.ts
+- tests/unit/vtt/dm-tactical-intel.test.ts
+- tests/unit/vtt/encounter-board-projection.test.ts
+- tests/unit/vtt/encounter-projections.test.ts
+- tests/unit/vtt/engine-context-integrations.test.ts
+- tests/unit/vtt/engine-host-integration.test.ts
+- tests/unit/vtt/engine-opportunity-movement-intel.test.ts
+Migrate the listed AST-sorted caller group to explicit builder inputs and required future argument positions.
+Replace default resolver references with local bound resolvers and capsule/registry convenience calls with explicit forms.
+Retain each independent behavior oracle while fixing raw unregistered-option setup through the public generator.
+T plus every .test.ts file listed in this batch must pass under the still-current reference guard.
+Also run the three environment suites when this group changes a production tool.
+Required reds: preserve existing independent refusal/geometry/payload controls in this caller group.
+
+### B7 — Caller migration 4 (10 files)
+- tests/unit/vtt/engine-query-port.test.ts
+- tests/unit/vtt/engine-round-session.test.ts
+- tests/unit/vtt/engine-state-capsule.test.ts
+- tests/unit/vtt/footprint-increment-four.test.ts
+- tests/unit/vtt/footprint-increment-three.test.ts
+- tests/unit/vtt/hidden-option-boundary.test.ts
+- tests/unit/vtt/hypnotic-pattern-probe.test.ts
+- tests/unit/vtt/last-seen.test.ts
+- tests/unit/vtt/local-session-store.test.ts
+- tests/unit/vtt/mixed-kind-multiattack.test.ts
+Migrate the listed AST-sorted caller group to explicit builder inputs and required future argument positions.
+Replace default resolver references with local bound resolvers and capsule/registry convenience calls with explicit forms.
+Retain each independent behavior oracle while fixing raw unregistered-option setup through the public generator.
+T plus every .test.ts file listed in this batch must pass under the still-current reference guard.
+Also run the three environment suites when this group changes a production tool.
+Required reds: preserve existing independent refusal/geometry/payload controls in this caller group.
+
+### B8 — Caller migration 5 (10 files)
+- tests/unit/vtt/monster-feature-support.test.ts
+- tests/unit/vtt/monster-omitted-riders.test.ts
+- tests/unit/vtt/offered-option-paths.test.ts
+- tests/unit/vtt/option-outcome.test.ts
+- tests/unit/vtt/plan-materiality.test.ts
+- tests/unit/vtt/plays-v1.test.ts
+- tests/unit/vtt/preview-hidden-rolls.test.ts
+- tests/unit/vtt/prose-renderer.test.ts
+- tests/unit/vtt/refusal-handling.test.ts
+- tests/unit/vtt/renderer-profile.test.ts
+Migrate the listed AST-sorted caller group to explicit builder inputs and required future argument positions.
+Replace default resolver references with local bound resolvers and capsule/registry convenience calls with explicit forms.
+Retain each independent behavior oracle while fixing raw unregistered-option setup through the public generator.
+T plus every .test.ts file listed in this batch must pass under the still-current reference guard.
+Also run the three environment suites when this group changes a production tool.
+Required reds: preserve existing independent refusal/geometry/payload controls in this caller group.
+
+### B9 — Caller migration 6 (10 files)
+- tests/unit/vtt/room-generator-los-cover.test.ts
+- tests/unit/vtt/room-generator.test.ts
+- tests/unit/vtt/save-manager.test.ts
+- tests/unit/vtt/semantic-board-payload.test.ts
+- tests/unit/vtt/session-timeline-record.test.ts
+- tests/unit/vtt/snippets.test.ts
+- tests/unit/vtt/speculative-planning.test.ts
+- tests/unit/vtt/stable-dom-render.test.ts
+- tests/unit/vtt/standard-offer-generator.test.ts
+- tests/unit/vtt/tactical-evaluator-r02.test.ts
+Migrate the listed AST-sorted caller group to explicit builder inputs and required future argument positions.
+Replace default resolver references with local bound resolvers and capsule/registry convenience calls with explicit forms.
+Retain each independent behavior oracle while fixing raw unregistered-option setup through the public generator.
+T plus every .test.ts file listed in this batch must pass under the still-current reference guard.
+Also run the three environment suites when this group changes a production tool.
+Required reds: preserve existing independent refusal/geometry/payload controls in this caller group.
+
+### B10 — Caller migration 7 (9 files)
+- tests/unit/vtt/turn-exhaustion-coordinator.test.ts
+- tests/unit/vtt/unicorns-blessing-consistency.test.ts
+- tools/agent-conformance.ts
+- tools/ai-dm-screenshot-probe.ts
+- tools/prose-renderer-report.ts
+- tools/renderer-calibration.ts
+- tools/turn-context-cap-sweep.ts
+- tools/vtt-experiment.ts
+- tools/vtt-soak.ts
+Migrate the listed AST-sorted caller group to explicit builder inputs and required future argument positions.
+Replace default resolver references with local bound resolvers and capsule/registry convenience calls with explicit forms.
+Retain each independent behavior oracle while fixing raw unregistered-option setup through the public generator.
+T plus every .test.ts file listed in this batch must pass under the still-current reference guard.
+Also run the three environment suites when this group changes a production tool.
+Required reds: preserve existing independent refusal/geometry/payload controls in this caller group.
+
+### B11 — Additional main-side callers (10 files)
+- src/vtt/handoff/fixtures/two-room.ts
+- src/vtt/handoff/worker-entry.ts
+- tests/helpers/legacy-advice-surface.ts
+- tests/unit/tools/ai-dm-legacy-invariance.test.ts
+- tests/unit/tools/d569-v5.test.ts
+- tests/unit/tools/engine-mcp-server.test.ts
+- tests/unit/vtt/blind-context-source-binding.test.ts
+- tests/unit/vtt/blind-intent-resolver.test.ts
+- tests/unit/vtt/blind-turn-context.test.ts
+- tests/unit/vtt/door-intent.test.ts
+Migrate these verified main-side callers to the builder, explicit capsule bindings, and required future arguments.
+Keep blind-context, handoff, legacy-advice, and session-lifecycle behavior and existing independent pins unchanged.
+Application/worker/report entry points select explicit legacy configuration and pass the environment down.
+T plus every listed .test.ts suite and all three environment suites must pass.
+Required reds: existing blind-boundary, session-authority, and handoff refusal controls remain red.
+A new caller found by the integrated compiler extends the manifest before signature contraction.
+
+### B12 — Additional main-side callers (10 files)
+- tests/unit/vtt/encounter-session-service.test.ts
+- tests/unit/vtt/handoff-examples.test.ts
+- tests/unit/vtt/in-process-transport.test.ts
+- tests/unit/vtt/protocol-runtime.test.ts
+- tests/unit/vtt/scene-snapshot.test.ts
+- tests/unit/vtt/session-lifecycle.test.ts
+- tests/unit/vtt/session-persistence.test.ts
+- tools/blind-context-fixture-report.ts
+- tools/d569-second-family-manifest.ts
+- tools/vtt-handoff/node-runtime.ts
+Migrate these verified main-side callers to the builder, explicit capsule bindings, and required future arguments.
+Keep blind-context, handoff, legacy-advice, and session-lifecycle behavior and existing independent pins unchanged.
+Application/worker/report entry points select explicit legacy configuration and pass the environment down.
+T plus every listed .test.ts suite and all three environment suites must pass.
+Required reds: existing blind-boundary, session-authority, and handoff refusal controls remain red.
+A new caller found by the integrated compiler extends the manifest before signature contraction.
+
+### B13 — Required optional surfaces (8 files)
+- src/vtt/dm-encounter-host.ts
+- src/vtt/encounter-board-projection.ts
+- src/vtt/encounter-projections.ts
+- src/vtt/engine-round-session.ts
+- src/vtt/mcp/entrypoint.ts
+- src/vtt/offered-option-paths.ts
+- tools/ai-dm-arena.ts
+- tools/ai-dm-conversation.ts
+Delete host/runtime optional options, round/human/path initializers, and projector fallback after caller closure.
+Remove the temporary handler overloads and require the future signature exactly.
+Require arena/conversation configuration fields and divergence's environment argument.
+Switch these provider type imports to the builder's branded runtime type.
+The application roots select modes explicitly and the consumer APIs no longer manufacture missing environments.
+T plus all three environment suites and the migrated host/runtime/round/projection caller suites must pass.
+Required reds: MISSING_ENV_ARGUMENT for each contracted surface, FALLBACK_USES_LEGACY_ONLY, and BOARD_DIFFERENT_POLICY.
+
+### B14 — Resolver and capsule contract (10 files)
+- src/vtt/engine-query-port.ts
+- src/vtt/engine-state-capsule.ts
+- src/vtt/intel/opportunity-cost.ts
+- src/vtt/intel/team-scorer.ts
+- src/vtt/intent-resolver.ts
+- src/vtt/mcp/engine-server.ts
+- src/vtt/plan-materiality.ts
+- src/vtt/speculative-planning.ts
+- tests/unit/vtt/offer-environment.test.ts
+- tests/unit/vtt/offer-environment-identity.test.ts
+Replace WeakMap reference identity with digest provenance and reject absent registration.
+Delete all offer-aware query-port union arms, resolver defaults, and the default singleton.
+Implement the bound registry directly and require the allocation environment on its interface and implementation.
+Delete the legacy capsule wrapper and enforce launch/current/replacement run digests.
+Switch remaining consumer type imports to the branded builder type.
+Extend the two contract suites with equal-digest acceptance, absent/different refusal, and feed-swap tests.
+T plus the three environment suites, capsule, query-port, materiality, and speculative-planning suites must pass.
+Required reds: absent provenance, MIDRUN_ENV_SWAP, SKIP_DIGEST_CHECK, fallback/board substitution, and query-union bypass.
+The obsolete 3B equal-binding assertions remain incompatible until B16, as explicitly recorded above.
+
+### B15 — Remove old exports and finish enforcement (4 files)
+- src/vtt/offers/offer-environment.ts
+- src/vtt/mcp/entrypoint.ts
+- ast-grep-rules/no-alternative-offer-environment-construction.yml
+- scripts/check-offer-environment-architecture.mjs
+Delete all four old runtime factory exports, the old structural type export, and launcher reconstruction wrapper.
+Remove the architecture migration allowlist and require exactly one environment-producing runtime export.
+Set the new sg rule to severity: error across src, tools, and tests.
+Reject imports, namespace references, re-exports, aliases, unsafe brand assertions, and consumer-side construction.
+T plus the three environment suites and final src/tools/tests architecture checks must pass.
+Required reds: SECOND_ENV_BUILDER, LEGACY_FACTORY_IMPORT, alias/re-export bypass, forged brand, and missing dependencies.
+
+### B16 — Ten-file 3B simplification (10 files)
+- tests/integration/vtt/dm-encounter-host-live-path.test.ts
+- tests/unit/tools/ai-dm-arena.test.ts
+- tests/unit/tools/ai-dm-board-delivery.test.ts
+- tests/unit/tools/ai-dm-board-snapshot.test.ts
+- tests/unit/tools/ai-dm-conversation.test.ts
+- tests/unit/tools/ai-dm-knowledge-base.test.ts
+- tests/unit/tools/engine-mcp-boundary.test.ts
+- tests/unit/tools/engine-mcp-golden.test.ts
+- tests/unit/tools/engine-mcp-handler.test.ts
+- tests/unit/tools/local-openai-conversation.SIMULATED.test.ts
+Remove all ten files' environment identity helper/spies, call registries, once flags, and restoration assertions.
+Keep direct fixture-bound construction, required argument passing, actual runtime capsule assertions, and behavior coverage.
+Restore divergence's independent oracle and remove its factory/getter interception.
+Keep the real launcher-driven golden case and SIMULATED binding conservation through actual run evidence.
+Run the complete cumulative union without excluded old identity tests, skips, or regenerated pins.
+T plus all 79 cumulative caller/environment specs, discovery conservation, and the complete named-mutant ledger must pass.
+Required reds: every final mutant in section 6, including child binding and restored divergence behavior.
+The equivalent same-binding second allocation must instead remain green.
+
+## 5. Enforce the final architecture in the actual gate
+Add ast-grep-rules/no-alternative-offer-environment-construction.yml with this final rule:
+```yaml
+id: no-alternative-offer-environment-construction
+language: TypeScript
+severity: error
+message: Construct runtime offer environments only through buildOfferEnvironment.
+files:
+  - src/**/*.ts
+  - tools/**/*.ts
+  - tests/**/*.ts
+rule:
+  all:
+    - any:
+        - kind: identifier
+        - kind: property_identifier
+    - any:
+        - regex: ^createEngineOptionEnvironment$
+        - regex: ^createLegacyEngineOptionEnvironment$
+        - regex: ^createRevisionBoundEngineOptionEnvironment$
+        - regex: ^engineOptionEnvironmentFromBinding$
+        - regex: ^reconstructLauncherOfferEnvironment$
+```
+B1 stages only this new rule as off; B15 changes it to error without changing any existing rule severity.
+Put valid/invalid examples in ast-grep-tests/no-alternative-offer-environment-construction-test.yml.
+Valid cases include builder calls, type-only builder imports, and legacy binding codec calls.
+Invalid cases include named old imports, renamed imports, namespace calls, direct old calls, and re-exports.
+Use id plus valid/invalid arrays in the fixture and run sg test with --skip-snapshot-tests.
+No generated snapshot file is needed, and sgconfig.yml need not change because --test-dir is explicit.
+
+The syntax rule is supplemented by scripts/check-offer-environment-architecture.mjs using TypeScript symbols.
+Scan all TypeScript files under src, tools, and tests, resolving import aliases and module exports.
+Only the builder may export a callable/constructable runtime value returning the branded environment.
+Reject re-exporting the builder, exported inferred-return wrappers, constructor aliases, and namespace re-exports.
+Reject assertions to the environment type and any/unknown-mediated construction rather than blessing a double cast.
+Reject direct consumer construction and environment-producing module-level initializers in src/tools.
+Allow construction at the explicitly listed lifecycle roots, including main's worker/node/report roots in B11/B12.
+Tests may build fixture environments, but may not export alternative runtime builders or forge the private type.
+The builder's query import, lack of queries input, private class, and sole construction expression are checked directly.
+The temporary export allowlist is exactly the four old factory symbols and reconstructLauncherOfferEnvironment.
+The temporary construction exceptions cover only the already-listed transitional sites and expire completely in B15.
+Script --self-test compiles in-memory positive/negative fixtures and verifies exact diagnostic expectations.
+B1 includes builder-only signature negatives; B15 adds all contracted-API negatives after optional forms are gone.
+Cover same-builder use, object literal, spread, missing argument, custom query input, alias, namespace, and re-export.
+Add negative exported-wrapper and computed-member examples so counting a constructor's spelling is insufficient.
+Self-tests must fail when their checker is disabled; they may not merely assert on the implementation's own output.
+
+Change scripts/check-command-outcomes.sh:4 to sg scan --config sgconfig.yml src tools tests.
+Append sg test --config sgconfig.yml --test-dir ast-grep-tests --skip-snapshot-tests --include-off.
+Append node scripts/check-offer-environment-architecture.mjs --self-test.
+Append node scripts/check-offer-environment-architecture.mjs.
+Change package.json:17 test:gate to scripts/check-command-outcomes.sh && node tools/gate-vitest.mjs.
+Preserve typecheck's existing prefix and the main-side gate runner implementations.
+A targeted Vitest invocation is not the architecture gate; both must pass separately.
+No change to tools/gate-vitest.mjs, tools/gate-playwright.mjs, or tools/gate-runner-lib.mjs is planned.
+
+## 6. Tests and final mutation contract
+Extend tests/unit/vtt/offer-environment.test.ts:107 as the single focused in-process MCP composition test.
+Use the independently pinned represented binding, serialize it, rebuild it, and create the real MCP runtime.
+Exercise actual option advertisement and proposal acceptance, then assert the actual feed capsule binding.
+Keep the existing independent policy/catalog/environment digest constants and legacy option-ID list.
+Add same-digest reconstruction acceptance, different-digest refusal, and absent-provenance refusal.
+Add a cloned option negative case and a registry-generated option positive case.
+Add valid same-digest capsule advancement, different-digest replacement rejection, and a hostile custom-feed case.
+Verify rejection occurs before state mutation, proposal acceptance, or listener notification.
+Keep separate board-sequence and real-process boundary coverage because they exercise different lifecycle roots.
+
+Golden gains a launcher-driven non-legacy case using EngineMcpStdioClient.
+Specify fixture, run/branch, revision, request metadata, and binding independently in the test.
+Build the reference with createEngineStateCapsuleForEnvironment using those known inputs.
+Compare the actual child's state_ref.state_handle exactly with engineStateHandle(referenceCapsule).
+Then advertise and submit a real offered proposal and assert acceptance.
+Never recover the expected binding, request, or state from the child's returned capsule/handle.
+GeneratedAt does not affect the capsule digest, so no clock spy is necessary.
+Keep all existing raw-fixture golden pins byte-for-byte and add malformed/missing launcher failure cases.
+The parent/child reference-identity limitation is retired, not worked around with instrumentation.
+
+SIMULATED uses explicit revision-bound run configuration in its existing local HTTP/real arena run.
+Retain advertised option IDs, submitted IDs/revision, actual accepted plan, transport counts, and outcome assertions.
+Compare its real row stateBinding.capsule digest to an independently built reference authorization capsule.
+The reference uses the known input fixture, preparation, deterministic request metadata, and supplied binding.
+Also require its actual authorization state binding to agree with that reference and the observed MCP context handle.
+Do not copy config.offerEnvironment into an evidence field to manufacture conservation.
+If the first-run metadata cannot be specified independently, make the fixture deterministic before accepting the test.
+No environment constructor, runtime constructor, or resolver-export spy remains.
+
+Divergence takes its explicit environment and re-resolves the recorded proposal authoritatively.
+Restore an independent expected action/target/movement fixture instead of the line-1622 self-comparison.
+Retain the deliberately wrong resolution digest case and its expected geometry-divergence diagnostic.
+Add a changed mechanics/target case whose expected diagnostic does not use a second identical resolver invocation.
+Use a genuinely different binding for refusal controls; equivalent reconstruction is the positive control.
+
+### 6.1 Scaffold audit and each 3B file's disposition
+The audit was rerun read-only this round with its two artifact-write expressions removed before execution.
+Cumulative diff base 6bd0e757^ is a9a029848d6fae9c8e289590e8621f917a8d1109.
+Cumulative 3B is +734/-45, including 427 added scaffold lines and 307 other added lines.
+The r3-only diff is +240/-222, including 153 added scaffold lines and 87 other added lines.
+Current removable scaffold totals 428 lines because conversation's audited block includes one preexisting line.
+The other column includes migration assertions/imports and is not a promise of final post-refactor line counts.
+All rows drop identity helpers, once flags, constructor choreography, and associated restoration checks in B16.
+| File basename, full paths in B16 | Added/current scaffold | Other additions | Keep or restore |
+|---|---:|---:|---|
+| dm-encounter-host-live-path.test.ts | 35/35 | 24 | host behavior and actual runtime capsule binding |
+| ai-dm-arena.test.ts | 39/39 | 22 | arena behavior and actual runtime capsule binding |
+| ai-dm-board-delivery.test.ts | 44/44 | 31 | board-delivery behavior and actual capsule binding |
+| ai-dm-board-snapshot.test.ts | 32/32 | 24 | snapshot geometry, freshness, and actual capsule binding |
+| ai-dm-conversation.test.ts | 53/54 | 54 | conversation behavior, actual capsule binding, restored divergence oracle |
+| ai-dm-knowledge-base.test.ts | 39/39 | 22 | knowledge-base behavior and actual runtime capsule binding |
+| engine-mcp-boundary.test.ts | 39/39 | 27 | protocol refusals and actual runtime capsule binding |
+| engine-mcp-golden.test.ts | 46/46 | 28 | unchanged raw goldens plus the real launcher/reference-capsule case |
+| engine-mcp-handler.test.ts | 39/39 | 26 | handler behavior and actual runtime capsule binding |
+| local-openai-conversation.SIMULATED.test.ts | 61/61 | 49 | real advertised/submitted/accepted run and independent capsule commitment |
+The eight local runtime helpers become direct createEngineMcpRuntime calls with explicit environments.
+Golden drops its disconnected local capsule and parent-only no-construction assertion.
+SIMULATED drops its constructed/consumed reference sets while keeping the real run.
+No test is deleted merely to reach green; the superseded object-identity subject is explicitly gone.
+
+### 6.2 Named mutants and their killing evidence
+| Mutant | Required killing test or gate |
+|---|---|
+| MISSING_ENV_ARGUMENT | Architecture negative compile fixtures for each required host/round/runtime/board/resolver API. |
+| SECOND_ENV_BUILDER | Architecture exported-wrapper/class/alias fixtures and final symbol scan. |
+| LEGACY_FACTORY_IMPORT | New sg rule fixtures and final src/tools/tests scan. |
+| FALLBACK_USES_LEGACY_ONLY | offer-environment-identity: bound fallback acceptance after primary refusal. |
+| BOARD_DIFFERENT_POLICY | offer-environment-identity path refusal plus actual host/board-sequence digest conservation. |
+| CONSUMER_DROPS_BOUND_ENV | Actual runtime capsule binding assertions, host/board digest test, and SIMULATED reference capsule. |
+| MCP_CHILD_IGNORES_SERIALIZED_BINDING | Golden real child handle/reference comparison and proposal acceptance. |
+| MIDRUN_ENV_SWAP | offer-environment feed replacement/custom-feed contract cases. |
+| SKIP_DIGEST_CHECK | Same suite's different/absent provenance and capsule-swap refusal cases. |
+| DIVERGENCE_TRUSTS_STORED_RESOLUTION | ai-dm-conversation forced divergence with independently specified mechanics. |
+Also require malformed binding, query injection, cloned/unbound option, and forged private-brand controls.
+Place the fallback mutant only on fallback resolution and the board mutant only on the board consumer.
+Use valid different bindings for wrong-value mutants so a corrupt-hash decoder failure cannot masquerade as the kill.
+Retire the equal-binding second-allocation mutant at conversation.ts:2776 as a required red.
+That mutant must be green under the sole deterministic builder with canonical queries.
+Withdraw S3B-R3-F1 and F2 on completed contract acceptance.
+Withdraw S3B-R3-F3 as an identity blocker only after its independent behavior oracle is restored.
+Retire S3B-R3-F4 with its getter interception and defective cleanup subject.
+These dispositions do not approve unchanged 82ae8554.
+
+## 7. Complete initial caller inventory and cumulative verification
+This is the exact 59-file first-probe inventory, with first planned batch and diagnostic API counts.
+DM means projectDmBoard, Helper means fixtureRuntime, and Options means default/property/type diagnostics.
+Every test path below is mandatory in the cumulative targeted invocation.
+| File | Initial diagnostic grouping | First batch |
+|---|---|---|
+| src/vtt/dm-encounter-host.ts | DM:1 | B3 |
+| src/vtt/encounter-app.ts | Host:1 | B3 |
+| src/vtt/mcp/entrypoint.ts | MCP:1, Options:2 | B2 |
+| tests/integration/vtt/dm-encounter-host-live-path.test.ts | Host:6, MCP:1, Options:1 | B4 |
+| tests/integration/vtt/encounter-conclusion.test.ts | Host:2 | B4 |
+| tests/integration/vtt/vane-warren-session.test.ts | Host:3 | B4 |
+| tests/unit/bridge/client.test.ts | Host:4 | B4 |
+| tests/unit/bridge/decision-program.test.ts | DM:1 | B4 |
+| tests/unit/bridge/js-round-plan-integration.test.ts | DM:2 | B4 |
+| tests/unit/bridge/projection-transport.test.ts | DM:1 | B4 |
+| tests/unit/bridge/steering.test.ts | DM:1 | B4 |
+| tests/unit/tools/ai-dm-arena.test.ts | Options:1 | B4 |
+| tests/unit/tools/ai-dm-board-delivery.test.ts | MCP:4, Options:1 | B4 |
+| tests/unit/tools/ai-dm-conversation.test.ts | MCP:1, Options:1 | B5 |
+| tests/unit/tools/ai-dm-knowledge-base.test.ts | MCP:1, Options:1 | B5 |
+| tests/unit/tools/engine-mcp-boundary.test.ts | MCP:1, Options:1 | B5 |
+| tests/unit/tools/engine-mcp-handler.test.ts | MCP:19, Options:2, Helper:19 | B5 |
+| tests/unit/vtt/adjustment-exhaustion-coordinator.test.ts | MCP:2 | B5 |
+| tests/unit/vtt/arena-basis-brutal-b.test.ts | Round:2 | B5 |
+| tests/unit/vtt/composite-turn-proposals.test.ts | MCP:2, Round:4 | B6 |
+| tests/unit/vtt/controller-assignment.test.ts | Host:1 | B6 |
+| tests/unit/vtt/d466-b4-spell-payloads.test.ts | Human:1 | B6 |
+| tests/unit/vtt/detection-ui.test.ts | DM:2 | B6 |
+| tests/unit/vtt/dm-tactical-intel.test.ts | MCP:1 | B6 |
+| tests/unit/vtt/encounter-board-projection.test.ts | DM:3 | B6 |
+| tests/unit/vtt/encounter-projections.test.ts | Host:2 | B6 |
+| tests/unit/vtt/engine-context-integrations.test.ts | MCP:3, Round:1, Human:1 | B6 |
+| tests/unit/vtt/engine-host-integration.test.ts | Host:3 | B6 |
+| tests/unit/vtt/engine-opportunity-movement-intel.test.ts | MCP:2 | B6 |
+| tests/unit/vtt/engine-round-session.test.ts | Round:23 | B7 |
+| tests/unit/vtt/engine-state-capsule.test.ts | DM:2 | B7 |
+| tests/unit/vtt/footprint-increment-four.test.ts | DM:1 | B7 |
+| tests/unit/vtt/footprint-increment-three.test.ts | MCP:5 | B7 |
+| tests/unit/vtt/hidden-option-boundary.test.ts | MCP:2 | B7 |
+| tests/unit/vtt/hypnotic-pattern-probe.test.ts | MCP:1, Round:1 | B7 |
+| tests/unit/vtt/last-seen.test.ts | DM:1 | B7 |
+| tests/unit/vtt/local-session-store.test.ts | Host:13 | B7 |
+| tests/unit/vtt/mixed-kind-multiattack.test.ts | Round:1 | B7 |
+| tests/unit/vtt/monster-feature-support.test.ts | MCP:1 | B8 |
+| tests/unit/vtt/monster-omitted-riders.test.ts | MCP:2, Human:1 | B8 |
+| tests/unit/vtt/offer-environment-board-sequence.test.ts | DM:1 | B1 |
+| tests/unit/vtt/offered-option-paths.test.ts | Paths:1 | B8 |
+| tests/unit/vtt/preview-hidden-rolls.test.ts | DM:2 | B8 |
+| tests/unit/vtt/prose-renderer.test.ts | MCP:13 | B8 |
+| tests/unit/vtt/refusal-handling.test.ts | Host:6 | B8 |
+| tests/unit/vtt/renderer-profile.test.ts | MCP:8, Round:1 | B8 |
+| tests/unit/vtt/save-manager.test.ts | Host:1 | B9 |
+| tests/unit/vtt/semantic-board-payload.test.ts | DM:3 | B9 |
+| tests/unit/vtt/session-timeline-record.test.ts | DM:1, Host:2 | B9 |
+| tests/unit/vtt/snippets.test.ts | MCP:3 | B9 |
+| tests/unit/vtt/stable-dom-render.test.ts | Human:1 | B9 |
+| tests/unit/vtt/turn-exhaustion-coordinator.test.ts | DM:1 | B10 |
+| tests/unit/vtt/unicorns-blessing-consistency.test.ts | MCP:3, Round:2 | B10 |
+| tools/ai-dm-screenshot-probe.ts | DM:1 | B10 |
+| tools/prose-renderer-report.ts | MCP:1 | B10 |
+| tools/renderer-calibration.ts | MCP:3 | B10 |
+| tools/turn-context-cap-sweep.ts | MCP:1, Round:1 | B10 |
+| tools/vtt-experiment.ts | DM:1 | B10 |
+| tools/vtt-soak.ts | DM:1 | B10 |
+The 15 additional worktree test paths exposed by the broader probe are explicitly listed in B1 and B4–B10.
+Together the three environment suites, ten 3B files, and all worktree caller suites form 65 unique specs.
+B11/B12 explicitly list fourteen additional main-side specs, giving 79 unique affected specs after integration.
+No wildcard may silently substitute a smaller discovered set for this list.
+The final manifest also includes every new/modified/promised spec from earlier offers slices that still exists.
+Use the roadmap's pinned-ledger and runtime-consumer union, not just these 79 specs, if it is larger.
+Record exact deduplicated path count before invoking Vitest.
+
+### 7.1 Cumulative run order and evidence
+The implementation lane records each targeted command, exit code, spec/test count, and elapsed seconds.
+For each named mutant, record target SHA-256, save a temporary backup, mutate, run its killing spec, and restore.
+Verify the exact original target hash before any subsequent command.
+A surviving mutant or restoration mismatch blocks the tranche.
+After the final edit and all restorations, the supervisor regenerates the deduplicated cumulative manifest.
+Use the roadmap's single cumulative Vitest invocation followed by its static checks, with sg scope widened:
+```sh
+npx vitest run --configLoader runner $(tr '\n' ' ' < /tmp/d584-offers-contract-s3-builder.txt)
+sg scan --config sgconfig.yml src tools tests
+sg test --config sgconfig.yml --test-dir ast-grep-tests --skip-snapshot-tests --include-off
+node scripts/check-offer-environment-architecture.mjs --self-test
+node scripts/check-offer-environment-architecture.mjs
+npx tsc -b --force
+git diff --check
+sha256sum src/vtt/intel/contracts.ts
+npx vitest list --configLoader runner --filesOnly --json
+```
+Compare normalized discovered paths with the supervisor's 641-file main-40f04e2c baseline.
+The branch already adds offer-environment-identity.test.ts and offer-environment-board-sequence.test.ts relative to main.
+The verified git added/renamed-spec probe reports exactly those two additions and no renames.
+Therefore expected integrated discovery is 643 files if those two branch additions are the only differences.
+This tranche itself adds no spec relative to 82ae8554; report both baselines rather than insisting on 641 after merge.
+Only explicitly listed new/renamed specs may differ, and a missing preexisting suite is a hard failure.
+No discovery command ran in this authoring round.
+After targeted/static/discovery/mutation evidence is green, the supervisor runs npm run test:gate on the integrated revision.
+Preserve M-1's authoritative gate evidence and report exact outcome, suite count, test count, and elapsed time.
+The worktree implementation lane does not run a full gate, build, full suite, or browser suite.
+A load-related targeted failure gets only the roadmap's identical serial retry with --maxWorkers=1.
+Do not change timeouts, add outer flock, invoke model phases, or touch port 4173.
+
+## 8. Assumptions verified read-only this round
+Ran git rev-parse HEAD: 82ae85542f2b4103d02749b33413739bd641af66.
+Read both tsconfigs before probing: noEmit true and no incremental option enabled.
+Their tsBuildInfoFile values are /tmp/dnd-multiclass-spells-static-app.tsbuildinfo and its -node counterpart.
+Ran node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false: exit 0, zero diagnostics.
+Ran node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false: exit 0, zero diagnostics.
+Ran sg scan --config sgconfig.yml src tools tests: exit 0, zero findings.
+Read sg test --help: --test-dir, --skip-snapshot-tests, and --include-off are supported.
+Ran git show --format=short --stat 82ae8554: ten files, +240/-222.
+Ran git diff --numstat 6bd0e757^ 82ae8554: ten files, +734/-45.
+Reran count-scaffolding.py from stdin after deleting its .write_text lines: exit 0, 427/307 and 153/87 partitions.
+Its script and JSON evidence live in the previously authorized offers-simplify scratch directory.
+Read probe-callers.json and probe-files-table.md there to derive the initial 221/59 inventory.
+Ran the expanded experiments with node --input-type=module, feeding the TypeScript compiler-API source through stdin.
+The compiler version was 5.9.3 and each reporting script exited 0 after printing diagnostics.
+The successive diagnostic totals were 430/83 files, 433/85 files, and 434/86 files.
+These reporting exits are not tsc success exits.
+The final host overrode readFile/fileExists for 18 virtual files, set noEmit and incremental:false, and threw on writeFile.
+It started from the six prior scratch signature edits and removed constructors, unions, singleton, and capsule wrapper.
+It also required handler/server/divergence/allocation arguments, added root input types, and required DM digest output.
+Its virtual builder declared the private-field runtime signature and the exact three-arm input union from section 3.
+A temporary type-only re-export in the probe suppressed unrelated import-path churn while testing nominal assignability.
+Final implementation removes that re-export; the architecture gate checks the final export surface separately.
+This experiment deliberately did not repair old function bodies or callers.
+The final diagnostic codes were TS2304:2,2305:16,2322:3,2339:1,2345:184,2375:1,2379:9.
+The remaining codes were TS2551:4,2554:133,2561:1,2724:44,2741:13,2769:1,7006:22.
+All final-probe diagnostic files are included in the manifest, but integrated-main caller closure still requires T.
+Ran the named-constructor/default rg probes and a TypeScript AST identifier walk over src/tools/tests.
+Ran git grep -n -E for host/round/runtime/projector/resolver/capsule calls at 40f04e2c.
+Filtering against the 98-file worktree manifest yielded exactly 62 sites in 20 files, including fourteen specs.
+Ran git check-ignore for this plan path: the path was printed, confirming it is ignored.
+No scratch probe file, repository source, dependency, or configuration was written during these probes.
+
+## 9. Merge overlap, risks, and stopping conditions
+Ran git merge-base 82ae8554 40f04e2c: 21376f1b9e6a359549b03b65118b802c8fe7bfb2.
+Ran git diff --stat 82ae8554...40f04e2c -- src/vtt tools tests/unit/vtt tests/unit/tools.
+Its exact summary output was: 177 files changed, 55268 insertions(+), 1247 deletions(-).
+That range includes substantial earlier main work, not just M-1, M-14, and M-3.
+The final manifest intersects 44 changed main paths, including the twenty additional callers listed in B11/B12.
+The remaining 24 overlap paths are:
+- package.json
+- src/vtt/dm-encounter-host.ts
+- src/vtt/encounter-app.ts
+- src/vtt/encounter-projections.ts
+- src/vtt/engine-round-session.ts
+- src/vtt/mcp/engine-server.ts
+- src/vtt/mcp/entrypoint.ts
+- tests/unit/tools/ai-dm-arena.test.ts
+- tests/unit/tools/ai-dm-board-delivery.test.ts
+- tests/unit/tools/ai-dm-board-snapshot.test.ts
+- tests/unit/tools/ai-dm-conversation.test.ts
+- tests/unit/tools/ai-dm-knowledge-base.test.ts
+- tests/unit/vtt/adjustment-exhaustion-coordinator.test.ts
+- tests/unit/vtt/encounter-projections.test.ts
+- tests/unit/vtt/last-seen.test.ts
+- tests/unit/vtt/local-session-store.test.ts
+- tests/unit/vtt/refusal-handling.test.ts
+- tests/unit/vtt/renderer-profile.test.ts
+- tests/unit/vtt/room-generator.test.ts
+- tests/unit/vtt/session-timeline-record.test.ts
+- tests/unit/vtt/turn-exhaustion-coordinator.test.ts
+- tools/agent-conformance.ts
+- tools/ai-dm-arena.ts
+- tools/ai-dm-conversation.ts
+Main-side numstat includes host +888/-62, entrypoint +384/-21, conversation +1856/-185, and package.json +17/-1.
+M-1 range d251e716..229962c3 changes gate runners/reporters/specs but none of this manifest's files.
+M-14 range 229962c3..a04a6093 changes supervision, BUILD-PLAN, ids commentary, and operational-guidance-facts.test.ts.
+M-14 has no direct file overlap and contributes the main discovery baseline change to 641.
+M-3 range a04a6093..40f04e2c overlaps package.json and tests/unit/vtt/handoff-examples.test.ts.
+Preserve M-3's handoff gate inventory/report changes and M-1's runner code when reconciling those overlaps.
+Do not choose an entire older host, entrypoint, conversation, or package file to resolve a conflict.
+Additional main-side signatures or callers require a reviewed manifest extension, not a hidden eleventh-file patch.
+The full integrated tree must pass T and discovery conservation before any landing.
+
+A required parameter proves presence, not correct configuration; independently pinned digests and wrong-value mutants remain necessary.
+A WeakMap loses provenance through cloning; accept reminted IDs but reject unregistered option objects.
+The canonical query implementation is outside the digest; interchangeable instances assume the same engine code version.
+If selectable query profiles become a product feature, bind their semantic version before allowing digest equivalence.
+Prevent module-cycle regressions with type-only imports and contract-suite import coverage without mock interception.
+Keep legacy configuration supported; the two projector/path defaults were transitional implementation choices, not reasons to delete legacy.
+Keep board movement, danger overlays, independent legacy pins, and state/refusal behavior while relocating configuration selection.
+Reject a changed digest on room transitions and custom feeds before the changed state is consumed.
+Do not leak DM-only provenance through a player serializer or publish handoff payloads without their existing audience restrictions.
+The frozen contract hash must remain 0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1.
+A frozen-file change, unexplained discovery loss, surviving mutant, golden regeneration, or unmet batch ceiling blocks landing.
+Independent sol review is the next step owned by the supervisor; no reviewer was invoked by this authoring lane.
+
+PLAN S3 BUILDER DONE

tokens used
635,608
Wrote the [plan](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md).

- **16 batches**, each ≤10 files; **118 distinct files**.
- `wc -l -c`: **891 lines, 68,140 bytes**.
- `git status --short --untracked-files=all`: **empty**.
- Merge probe: **177 files changed, 55,268 insertions, 1,247 deletions**; 44 overlap the plan.
- Expected integrated discovery: **643 files**, accounting for two existing branch additions above main’s 641 baseline.

Plan SHA-256:
`a5335ad2472b16d33e66482cee322656d84a151e2309331635e603a84abad566`

Frozen contract SHA-256, unchanged:
`0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`

PLAN S3 BUILDER DONE
