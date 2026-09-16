# Simplifying OFFERS-IMPL-S3B

VERIFIED — Research date: 2026-09-14. Worktree inspected: `/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help`, clean HEAD `82ae85542f2b4103d02749b33413739bd641af66`. Main-repository evidence: `.claude/consensus/offers-impl/review-s3b{,-r2,-r3}-astra.md`. I read those reports; their historical test results are recorded evidence, not tests rerun here. This is a design report, not another review round.

VERIFIED — Both repositories remained read-only. I used git reads, source reads, live web research, and TypeScript in `./probe-tree`, a scratch copy. No Vitest, Playwright, build, installation, model/reviewer/agent invocation, or port 4173 use. No forbidden sibling lane was read. The report and probe artifacts are in this scratch directory.

RECALLED — Label convention for recommendations: **RECALLED — proposal/inference** means my design judgment, not an implemented or experimentally proven result. **VERIFIED** means directly read source or executed probe; a label introducing a table applies to every row. Recommendations are conditional on the validation described below.

RECALLED — **Recommendation: D, a corrected version of A. Finish the single-builder/digest contract before spending more on 3B identity proofs.** Remove the alternative construction paths, require the dependency, finish the compiler-driven migration, and replace the identity rule with validated digest equivalence. Then remove all environment-constructor spies, including SIMULATED's. Keep meaningful behavior, transport, and composition coverage. Do not undertake r3's four-fix identity route.

## 1. Research and what it actually supports

VERIFIED — **Parallel change:** Danilo Sato, *Parallel Change*, 2014-05-13, on Fowler's site, describes expand → migrate → contract. The operative deletion condition starts: “Once all usages have been migrated to the new version”. He explicitly calls this “an alternative to leaning on the compiler”. He recommends parallel change even with controlled callers to limit widespread breakage; he does **not** recommend releasing a broken contract-first step. [Primary source](https://martinfowler.com/bliki/ParallelChange.html).

RECALLED — Application here: bring contract completion ahead of more identity-proof work, not ahead of making callers work in a releasable version. A private, temporarily red compiler experiment is useful; a red intermediate commit is not a completed slice. There are no external compatibility obligations asserted by this repo's pre-alpha instructions, so a long parallel-interface lifetime has little justification.

VERIFIED — **Strangler:** Fowler's updated *Strangler Fig*, 2024-08-22, explicitly recognizes transitional architecture: “code that will go away once the modernization is complete.” Its justification is reduced migration risk and earlier value, not permanence. [Primary source](https://martinfowler.com/bliki/StranglerFigApplication.html).

VERIFIED — **Types:** Scott Wlaschin, *Making illegal states unrepresentable*, 2013-01-14: “All three cases are explicitly represented, and the fourth possible case (with no email or postal address at all) is not allowed.” His union represents exactly the permitted business cases. [Primary source](https://fsharpforfunandprofit.com/posts/designing-with-types-making-illegal-states-unrepresentable/).

VERIFIED — **Compiler-led required parameters:** TypeScript Handbook, Functions, accessed 2026-09-14; probe compiler **5.9.3**: “In TypeScript, every parameter is assumed to be required by the function.” The same page explains that trailing default-initialized parameters are optional in their public types. Thus deleting `??` alone is insufficient: delete optional markers and enclosing `= {}` initializers too. [Primary source](https://www.typescriptlang.org/docs/handbook/functions.html).

VERIFIED — **Nominal/capability types:** TypeScript Handbook, Symbols, accessed 2026-09-14: “Each reference to a unique symbol implies a completely unique identity that’s tied to a given declaration.” A non-exported symbol can brand a factory-produced type. [Primary source](https://www.typescriptlang.org/docs/handbook/symbols.html).

RECALLED — Application: a required branded environment can prove “present and constructed through the approved API” for ordinary typed code. It does not prove “same instance for this run,” nor does one symbol declaration generate a distinct static type per runtime run. Type assertions and `any` can bypass types; ordinary object spreads also make structural brands weaker than a private class field. No per-run capability-token machinery is needed for a digest-value contract.

VERIFIED — **Composition root:** Mark Seemann, *Composition Root*, 2011-07-28: “A Composition Root is a (preferably) unique location in an application where modules are composed together.” The article locates composition at application entry points; its author clarification distinguishes application/process roots. [Primary source](https://blog.ploeh.dk/2011/07/28/CompositionRoot/).

VERIFIED — **Testing composition directly:** Seemann, *Integration Testing composed functions*, 2015-12-21: “Issues with composition can be screened by a few smoke tests at the integration level.” He recommends many specific behavior tests and relatively few integration checks. This is good support for testing the assembled graph, not a theorem that exactly one test covers every root. [Primary source](https://blog.ploeh.dk/2015/12/21/integration-testing-composed-functions/).

VERIFIED — **Google, Don't Overuse Mocks:** Andrew Trenk, Testing on the Toilet, 2013-05-28: “Tests should typically know little about the code's implementation, and should focus on testing the code's public interface.” The example replaces mock choreography with a real collaborator and a resulting-state assertion; fakes/hermetic dependencies are alternatives when a real dependency is awkward. [Primary source](https://testing.googleblog.com/2013/05/testing-on-toilet-dont-overuse-mocks.html).

VERIFIED — **Google, State vs. Interactions:** Trenk, 2013-03-22: “This is why in most cases, you want to test state, not interactions.” Interaction checks are justified when call count/order/choice itself affects correctness, including side effects and latency. [Primary source](https://testing.googleblog.com/2013/03/testing-on-toilet-testing-state-vs.html).

VERIFIED — **Fowler, Mocks Aren't Stubs:** 2007-01-02: “The classical TDD style is to use real objects if possible and a double if it's awkward to use the real thing.” The article also explains mockist testing; it does not assert universal agreement against mocks. [Primary source](https://martinfowler.com/articles/mocksArentStubs.html).

VERIFIED — **Sociable versus solitary:** Fowler, *Unit Test*, 2014-05-05: “If talking to the resource is stable and fast enough for you then there's no reason not to do it in your unit tests.” He recognizes and respects both testing styles. The offered-option resolver, board path projection, and immutable environment are particularly natural candidates for sociable tests. [Primary source](https://martinfowler.com/bliki/UnitTest.html).

VERIFIED — **Hevery's guide:** Google's primary publication of *Guide to Writing Testable Code*, 2008-11-26, identifies “Code does complex object graph construction inside a constructor rather than using a factory or builder” and “Adding or using service locators” as warning signs. The direct Hevery site failed to load in this research; Google's publication reproduces the guide's first page. [Primary source](https://testing.googleblog.com/2008/11/guide-to-writing-testable-code.html).

RECALLED — Application: importing the builder's type contract is sensible; having every low-level consumer look up a globally configured current environment would recreate ambient context. Build from explicit inputs at lifecycle boundaries, then pass the immutable result. Do not add an `initializeEnvironment()`/`getCurrentEnvironment()` singleton.

VERIFIED — **Temporal coupling:** Seemann, *Design Smell: Temporal Coupling*, 2011-05-24: “If no good default value is available, the name must be requested via the constructor”. He replaces an implicit initialize-before-use relationship with construction-time requirements. [Primary source](https://blog.ploeh.dk/2011/05/24/DesignSmellTemporalCoupling/).

RECALLED — Temporal coupling in an API and migration sequencing are related concerns, not synonymous patterns. Required construction inputs address the former. Contract removal after caller migration addresses the latter. Neither calls for keeping temporary identity scaffolding after the identity requirement is removed.

VERIFIED — **Counterexample to “nobody recommends constructor spies”:** Jest **30.5**, ES6 Class Mocks, accessed 2026-09-14, demonstrates constructor-call and constructed-instance method checks: “We can check if the consumer called the class constructor”. Constructor observation is a documented technique. [Primary source](https://jestjs.io/docs/es6-class-mocks).

RECALLED — Research conclusion: I found no recommendation in the primary sources examined for copying equal-settings constructor-reference assertions into every DI consumer test as a general rule. The stronger, supportable recommendation is a small number of real composition/transport tests plus collaborator behavior tests. Constructor spies are appropriate when construction/lifetime is itself the contract. Under the owner's new digest contract, rejection of an equivalent allocation is no longer that contract. This is a bounded research conclusion, not proof of the absence of all such advice.

## 2. Repository probes

### 2.1 The premise needing correction

VERIFIED — `src/vtt/offers/offer-environment.ts:19–34,114–162` hashes **format, mode, familyPolicy, partyThreatCatalog**. `queries` is assigned separately to the runtime environment and is not in the digest. Its current exported constructors accept caller-supplied query ports. Therefore the existing digest does not establish query-port equivalence.

VERIFIED — The current resolver is explicitly reference-sensitive. `src/vtt/intent-resolver.ts:75` declares `WeakMap<EngineOfferableOption, EngineOptionEnvironment>`; lines 91–102 register generated option objects. Lines 550–555 refuse when `boundEnvironment !== environment`. If no registration exists, that guard does not refuse. The transitional `EngineOptionEnvironment | EngineQueryPort` union also permits the unbound path.

VERIFIED — `src/vtt/offered-option-paths.ts:163–166` calls that resolver and translates its `OFFER_ENVIRONMENT_MISMATCH` refusal into `OfferedOptionEnvironmentMismatchError`. **This is not currently a digest comparison.** Two separately allocated environments with equal settings are *not* interchangeable for a previously registered option under today's implementation.

VERIFIED — A real digest comparison exists at `src/vtt/mcp/engine-server.ts:1334`: `launchCapsule.offerEnvironment.digest !== offerEnvironment.digest`. It runs when the MCP application is created. Binding decoding independently verifies hashes (`offer-environment.ts:101–147`); capsule verification decodes its binding (`engine-state-capsule.ts:619`). Neither is proof that every downstream consumer checks the run binding. `MutableEngineCapsuleFeed.replace`, at engine-server lines 201–207, verifies capsule validity/run/revision but does not compare environment digests with the preceding capsule.

VERIFIED — The round session resolves option objects with its stored environment (`engine-round-session.ts:568–592`). Board paths reach the identity guard. Human-option generation takes the environment. `projectDmBoard` instead manufactures a legacy environment at line 399; its host caller does not pass the host's stored environment. Thus capsule digest validation, run-wide digest agreement, and object identity are three different checks in the current tree.

RECALLED — The owner has specified a better **target**, not described an already-completed invariant. My earlier reviews correctly identified failure to meet the then-required identity proof, but that requirement is now negotiable. We must deliberately replace it, including the query-port and unregistered-option loopholes, before declaring all the old identity mutants irrelevant.

### 2.2 Exact legacy construction inventory and first compiler failures

VERIFIED — Command: `rg -n 'offerEnvironment \?\?|createLegacyEngineOptionEnvironment\(' src tools`. It finds eight **files**, comprising seven construction sites plus the constructor definition. Host fallback spans two matching lines. There is no hidden eighth external legacy-construction site at this HEAD.

| Exact site at 82ae8554 | Role and removal consequence |
|---|---|
| `src/vtt/encounter-projections.ts:399` | `projectDmBoard` local construction. Add required `input.offerEnvironment`: 26 direct call diagnostics; production callers are `dm-encounter-host.ts:450`, `tools/ai-dm-screenshot-probe.ts:2644`, `tools/vtt-experiment.ts:1475`, `tools/vtt-soak.ts:190`. |
| `src/vtt/dm-encounter-host.ts:295–296` | Optional constructor option plus `options = {}`. Requiring it yields 44 constructor-call diagnostics, including `src/vtt/encounter-app.ts:1415` and six live-path host constructions. |
| `src/vtt/encounter-board-projection.ts:59` | Fourth parameter of `projectHumanEngineOptions`. Four direct test calls fail; existing production caller already supplies a value, but that value currently comes from projectDmBoard's local default. |
| `src/vtt/offered-option-paths.ts:63` | One module-level shared legacy object supplies two parameter defaults: `offeredOptionActorsForState:131` and `offeredOptionPaths:150`. Removal yields one direct path-call diagnostic; all direct actor-list calls in the probe already supply the third argument. |
| `src/vtt/engine-round-session.ts:357` | Fourth constructor parameter. 36 direct caller diagnostics, including `tools/turn-context-cap-sweep.ts:99`; conversation's line 3305 call already supplies it. |
| `src/vtt/mcp/entrypoint.ts:321` | Optional runtime environment plus `options = {}`. 81 direct runtime-call diagnostics, 19 inherited `fixtureRuntime` diagnostics, and ten options/default/type diagnostics. Same-module callers include `createEngineMcpHandler:491`, `runEngineMcpServer:514`, and the raw-fixture CLI branch near 885. |
| `tools/ai-dm-conversation.ts:3304` | Explicit run-level composition, not an optional consumer parameter. Replace with the sole builder and an explicit configuration/binding input. No missing-environment caller diagnostic arises merely from replacing this expression. |
| `src/vtt/offers/offer-environment.ts:179` | The exported constructor **definition**, not an eighth fallback. Removing its export forces construction callers/importers to migrate; it is not another consumer argument to require. |

VERIFIED — Additional paths the literal grep does not cover: capsule's legacy-binding wrapper (`engine-state-capsule.ts:943–948`); `resolveEngineActorOption:548`, `availableEngineActorOptions:652`, `createPureTurnProposalResolver:682`, and exported default resolver at `intent-resolver.ts:729`; `plan-materiality.ts:36,104–108`; offer-aware unions/defaults in `speculative-planning.ts:299,681` and unions in `intel/{opportunity-cost,team-scorer}.ts`. Query-only geometry helpers need a call-path audit, not indiscriminate deletion of every `canonicalEngineQueryPort` reference.

VERIFIED — Other exported ways to obtain runtime environments include `reconstructLauncherOfferEnvironment` at `mcp/entrypoint.ts:755`; four conversation reconstructions are at 1956, 2703, 2776, 3036. These must route directly through the sole exported builder too; leaving an exported reconstruction wrapper would contradict “only one exported way.”

VERIFIED — **Compiler experiment:** copied 1,783 tracked source/tools/tests/db/scripts and root TS/JSON files into `probe-tree`; symlinked the existing node_modules; inspected both tsconfigs and changed their `/tmp` tsBuildInfoFile settings to unique scratch-local paths. Invoked the installed TypeScript binary directly, avoiding npx download/cache behavior:

```sh
node probe-tree/node_modules/typescript/bin/tsc -p probe-tree/tsconfig.app.json --noEmit --pretty false
node probe-tree/node_modules/typescript/bin/tsc -p probe-tree/tsconfig.node.json --noEmit --pretty false
```

VERIFIED — Baseline: **app 0 errors, exit 0; node 0 errors, exit 0**. Probe: required seven consuming APIs in six modules, removing relevant environment fallbacks/optional markers/enclosing defaults and adding `projectDmBoard.input.offerEnvironment`. No caller repairs. **App: 5 diagnostics / 3 files, exit 2. Node: 221 diagnostics / 59 files, exit 2.** The node result includes the app's five: **221 distinct diagnostics, not 226**. Of 59 files, 50 are tests and nine are src/tools. These are initial diagnostics, not 221 independent work items.

VERIFIED — Reproducible evidence: `required-environment-probe.patch`, `baseline-{app,node}.log`, `required-{app,node}.log`, `probe-callers.json`, `summarize-probe.cjs`. The JSON maps each diagnostic to its AST call, file and line. This is a lower bound for completing 3C: the query-port union/default resolver, capsule wrapper, four constructor exports, and transitive required-parameter changes were deliberately not removed in this first probe. No performance/runtime claim follows from tsc.

VERIFIED — Complete diagnostic-file inventory below. API keys: DM=projectDmBoard; Host=DmEncounterHost; Round=EngineRoundSession; Human=projectHumanEngineOptions; Paths=offeredOptionPaths; MCP=createEngineMcpRuntime; MCP-helper=fixtureRuntime; Options=parameter defaults/type-derived options. Source line offsets in the JSON refer to the edited copy; original site locations above refer to HEAD.

| File (relative to worktree) | Diagnostics / affected API |
|---|---|
| `src/vtt/dm-encounter-host.ts` | DM:1 |
| `src/vtt/encounter-app.ts` | Host:1 |
| `src/vtt/mcp/entrypoint.ts` | MCP:1, Options:2 |
| `tests/integration/vtt/dm-encounter-host-live-path.test.ts` | Host:6, MCP:1, Options:1 |
| `tests/integration/vtt/encounter-conclusion.test.ts` | Host:2 |
| `tests/integration/vtt/vane-warren-session.test.ts` | Host:3 |
| `tests/unit/bridge/client.test.ts` | Host:4 |
| `tests/unit/bridge/decision-program.test.ts` | DM:1 |
| `tests/unit/bridge/js-round-plan-integration.test.ts` | DM:2 |
| `tests/unit/bridge/projection-transport.test.ts` | DM:1 |
| `tests/unit/bridge/steering.test.ts` | DM:1 |
| `tests/unit/tools/ai-dm-arena.test.ts` | Options:1 |
| `tests/unit/tools/ai-dm-board-delivery.test.ts` | MCP:4, Options:1 |
| `tests/unit/tools/ai-dm-conversation.test.ts` | MCP:1, Options:1 |
| `tests/unit/tools/ai-dm-knowledge-base.test.ts` | MCP:1, Options:1 |
| `tests/unit/tools/engine-mcp-boundary.test.ts` | MCP:1, Options:1 |
| `tests/unit/tools/engine-mcp-handler.test.ts` | MCP:19, Options:2, MCP-helper:19 |
| `tests/unit/vtt/adjustment-exhaustion-coordinator.test.ts` | MCP:2 |
| `tests/unit/vtt/arena-basis-brutal-b.test.ts` | Round:2 |
| `tests/unit/vtt/composite-turn-proposals.test.ts` | MCP:2, Round:4 |
| `tests/unit/vtt/controller-assignment.test.ts` | Host:1 |
| `tests/unit/vtt/d466-b4-spell-payloads.test.ts` | Human:1 |
| `tests/unit/vtt/detection-ui.test.ts` | DM:2 |
| `tests/unit/vtt/dm-tactical-intel.test.ts` | MCP:1 |
| `tests/unit/vtt/encounter-board-projection.test.ts` | DM:3 |
| `tests/unit/vtt/encounter-projections.test.ts` | Host:2 |
| `tests/unit/vtt/engine-context-integrations.test.ts` | MCP:3, Round:1, Human:1 |
| `tests/unit/vtt/engine-host-integration.test.ts` | Host:3 |
| `tests/unit/vtt/engine-opportunity-movement-intel.test.ts` | MCP:2 |
| `tests/unit/vtt/engine-round-session.test.ts` | Round:23 |
| `tests/unit/vtt/engine-state-capsule.test.ts` | DM:2 |
| `tests/unit/vtt/footprint-increment-four.test.ts` | DM:1 |
| `tests/unit/vtt/footprint-increment-three.test.ts` | MCP:5 |
| `tests/unit/vtt/hidden-option-boundary.test.ts` | MCP:2 |
| `tests/unit/vtt/hypnotic-pattern-probe.test.ts` | MCP:1, Round:1 |
| `tests/unit/vtt/last-seen.test.ts` | DM:1 |
| `tests/unit/vtt/local-session-store.test.ts` | Host:13 |
| `tests/unit/vtt/mixed-kind-multiattack.test.ts` | Round:1 |
| `tests/unit/vtt/monster-feature-support.test.ts` | MCP:1 |
| `tests/unit/vtt/monster-omitted-riders.test.ts` | MCP:2, Human:1 |
| `tests/unit/vtt/offer-environment-board-sequence.test.ts` | DM:1 |
| `tests/unit/vtt/offered-option-paths.test.ts` | Paths:1 |
| `tests/unit/vtt/preview-hidden-rolls.test.ts` | DM:2 |
| `tests/unit/vtt/prose-renderer.test.ts` | MCP:13 |
| `tests/unit/vtt/refusal-handling.test.ts` | Host:6 |
| `tests/unit/vtt/renderer-profile.test.ts` | MCP:8, Round:1 |
| `tests/unit/vtt/save-manager.test.ts` | Host:1 |
| `tests/unit/vtt/semantic-board-payload.test.ts` | DM:3 |
| `tests/unit/vtt/session-timeline-record.test.ts` | DM:1, Host:2 |
| `tests/unit/vtt/snippets.test.ts` | MCP:3 |
| `tests/unit/vtt/stable-dom-render.test.ts` | Human:1 |
| `tests/unit/vtt/turn-exhaustion-coordinator.test.ts` | DM:1 |
| `tests/unit/vtt/unicorns-blessing-consistency.test.ts` | MCP:3, Round:2 |
| `tools/ai-dm-screenshot-probe.ts` | DM:1 |
| `tools/prose-renderer-report.ts` | MCP:1 |
| `tools/renderer-calibration.ts` | MCP:3 |
| `tools/turn-context-cap-sweep.ts` | MCP:1, Round:1 |
| `tools/vtt-experiment.ts` | DM:1 |
| `tools/vtt-soak.ts` | DM:1 |

### 2.3 What 3B's ten tests cost, and what remains

VERIFIED — `6bd0e757^` is **a9a029848d6fae9c8e289590e8621f917a8d1109**, the pre-3B base after 3A's first fix. The initial 3B commit added **176** and deleted **20** lines. `82ae8554` alone is **+240/-222**; cumulative base→HEAD is **+734/-45**, exclusively the ten test files, with no src/tools change.

VERIFIED — I classified current-side added lines with `count-scaffolding.py`; `scaffold-line-audit.json` names every selected line. “Scaffold” includes identity probe bodies, flags, identity-only cases, constructor spy/cleanup blocks, disconnected local remint controls, and divergence getter/self-comparison machinery. It excludes retained real construction, supplied binding, capsule observations, and useful advertised/submitted/accepted assertions. Imports and shared formatting remain in “other,” so **other is an upper bound on plain migration/behavior support, not a claim that every such line is essential**. This is a source classification, not an executed stripped test suite.

| Test basename (live-path is integration/vtt; others unit/tools) | r3 + / - | r3 added scaffold / other | Cumulative + / - | Cumulative added scaffold / other |
|---|---:|---:|---:|---:|
| `dm-encounter-host-live-path.test.ts` | 19 / 26 | 11 / 8 | 59 / 2 | 35 / 24 |
| `ai-dm-arena.test.ts` | 19 / 26 | 11 / 8 | 61 / 4 | 39 / 22 |
| `ai-dm-board-delivery.test.ts` | 19 / 26 | 11 / 8 | 75 / 3 | 44 / 31 |
| `ai-dm-board-snapshot.test.ts` | 15 / 21 | 9 / 6 | 56 / 2 | 32 / 24 |
| `ai-dm-conversation.test.ts` | 49 / 41 | 26 / 23 | 107 / 19 | 53 / 54 |
| `ai-dm-knowledge-base.test.ts` | 19 / 26 | 11 / 8 | 61 / 2 | 39 / 22 |
| `engine-mcp-boundary.test.ts` | 19 / 26 | 11 / 8 | 66 / 4 | 39 / 27 |
| `engine-mcp-golden.test.ts` | 22 / 2 | 16 / 6 | 74 / 3 | 46 / 28 |
| `engine-mcp-handler.test.ts` | 19 / 26 | 11 / 8 | 65 / 2 | 39 / 26 |
| `local-openai-conversation.SIMULATED.test.ts` | 40 / 2 | 36 / 4 | 110 / 4 | 61 / 49 |
| **Total** | **240 / 222** | **153 / 87** | **734 / 45** | **427 / 307** |

RECALLED — At least 427 of the cumulative added lines concern the contract we propose retiring. A representative remaining fixture helper is simply “build an explicit environment; call the real runtime with that environment; assert the returned capsule binding.” Use an options type omitting the required environment if the helper always supplies it; do not preserve a misleading `Parameters<...>[1] = {}` after making that production field required. An explicit launcher-derived override remains necessary in board-delivery's adapter.

```ts
// RECALLED — illustrative target, not implemented code.
const env = buildOfferEnvironment({
  kind: 'configuration', mode: 'revision_bound',
  familyPolicy: disabledPolicy, partyThreatCatalog: unrepresentedCatalog,
});
const runtime = createEngineMcpRuntime(state, { ...options, offerEnvironment: env });
expect(runtime.feed.current().offerEnvironment).toEqual(env.binding);
// Exercise the original tools/host/path behavior and keep its original expectations.
```

VERIFIED — Behavior audit at HEAD: **all ten files contain a local equal-binding-replacement rejection control** (SIMULATED in its submitted-option loop, others in helpers). None is already a valid test of the new rule “equal digest accepted, different digest rejected at the exercised consumer.” The eight wrapper/snapshot capsule checks do observe actual runtime output and would catch replacing the runtime's binding with a *different* binding. They do not prove every downstream recipient used it, and the local equal-binding negative controls will become incorrect under the proposed rule.

| File | Useful existing non-spy observation; limitation / target migration |
|---|---|
| live-path | Capsule binding at 73 and real host behavior; six exercised host constructors omit the environment. Supply it to the actual hosts; runtime capsule alone says nothing about those hosts. |
| arena | Capsule binding at 96 plus arena outcomes. Keep ordinary adapter/run assertions; the local fixture probe is not runArena wiring coverage. |
| board-delivery | Capsule binding at 97, explicit manifest reconstruction at 109–111/198/638, and delivery evidence. Keep manifest-bound runtime setup; remove both once-only flags. |
| board-snapshot | Capsule binding at 173 and resumed combatant projection at 181 onward. Keep resumed-state checks; remove the local remint and constructor observation. |
| conversation | Capsule binding at 137 plus authorization/divergence behavior. The parity assertion at 1622 is a self-comparison; restore an independent oracle and pass the production dependency explicitly. |
| knowledge-base | Capsule binding at 91 plus knowledge-base behavior. No existing downstream different-policy consumer assertion. |
| boundary | Capsule binding at 63, missing-launcher-binding rejection/explicit legacy decode, direct-versus-stdio behavior. Keep these; the environment supplied for actual stdio parity is deliberately legacy. |
| golden | Capsule observation at 78 is in a separate local test, not in the child run. Real transcript geometry/proposal/restart checks are valuable. **No existing independent child environment-digest oracle.** |
| handler | Capsule binding at 96 plus real tool/schema/stale-state behavior. No existing proof that every injected collaborator received a different-policy environment correctly. |
| SIMULATED | Real runArena construction observations at 239–254 and advertised→submitted→accepted correspondence at 270–321. Keep the correspondence. After removing constructor observations, **no existing independently expected run-environment digest assertion** remains. |

RECALLED — These distinctions answer “which have none”: eight have a useful capsule-binding value oracle at their runtime seam; golden and SIMULATED lack an independently expected binding observation on the actual exercised child/run once spies/local identity controls disappear. All ten lack the complete proposed different-digest consumption contract today. Existing S3A tests outside these ten already supply better reusable coverage: `offer-environment-identity.test.ts:44,63,101` covers fallback, different-policy board rejection, capsule digest, and scoring; `offer-environment-board-sequence.test.ts:22` covers moving paths/hazards; `offer-environment.test.ts:88,107,148` has independent digest/legacy-ID pins and serialization reconstruction checks.

## 3. Smallest sound simplification

### 3.1 One builder, with a value contract

RECALLED — Choose **D: single-builder contract completion, then plain 3B migrations**, rather than unmodified A/B/C. A's priority is right, but deleting the seven visible construction sites cannot by itself change reference-sensitive semantics or eliminate all old entry paths. B leaves the unresolved production contract in place. C optimizes proof of a superseded allocation rule.

RECALLED — Introduce `src/vtt/offers/build-offer-environment.ts`, with one exported runtime function **`buildOfferEnvironment(input)`**, plus exported types. Its concrete input union is:

```ts
// RECALLED — proposed public API, not a checked implementation.
type BuildOfferEnvironmentInput =
  | { readonly kind: 'configuration'; readonly mode: 'legacy_standard' }
  | {
      readonly kind: 'configuration'; readonly mode: 'revision_bound';
      readonly familyPolicy: EngineOfferFamilyPolicy;
      readonly partyThreatCatalog: PartyThreatCatalog;
    }
  | { readonly kind: 'binding'; readonly binding: unknown };
export function buildOfferEnvironment(input: BuildOfferEnvironmentInput): EngineOptionEnvironment;
```

RECALLED — The builder imports the canonical query port itself; **no arbitrary `queries` input**. It validates/deep-freezes policy/catalog/binding using the existing codecs. Legacy configuration explicitly selects disabled families/unrepresented catalog; revision-bound configuration explicitly supplies policy/catalog. Binding input validates the serialized binding and obeys its mode. Missing/malformed bindings throw; they never fall back to legacy. Thus the caller selects the mode through data, never through a second factory.

RECALLED — Keep binding/policy codecs in `offer-environment.ts`, but remove its four runtime-environment constructors. Define the runtime environment through a module-private class with a private brand field and readonly public fields; export its instance type, not its class value. Only `buildOfferEnvironment` can name/instantiate that class. This prevents ordinary structural object-literal/spread replacements from satisfying the environment type. A non-exported unique-symbol brand is a lighter alternative, but I prefer the private field here because a spread can copy structural brands. Neither is a security boundary against deliberate casts/reflection.

RECALLED — Every environment consumer imports its type from this module; lifecycle entry points import its function. Do not make every resolver/projector build an environment for every operation. Construct once for each in-process run and pass it; a child reconstructs through the same function. Equal validated bindings under the same canonical engine version are interchangeable. We need not forbid an equivalent reconstruction purely because its address differs. If selectable query implementations become a product feature later, the binding must include their validated semantic profile/version before claiming digest equivalence across those implementations.

RECALLED — Replace the resolver's environment-reference registration with **digest provenance**, and reject absent provenance on the public environment-bound option-resolution path. Keep the WeakMap private if that avoids changing serialized legacy option IDs; its stored value becomes a digest. Generate/register options through the required-environment API. ID-based proposals are reminted against the current bound environment, as today; do not pretend an ID alone proves provenance. Raw serialized option objects must not bypass validation just because their WeakMap entry is absent.

RECALLED — Require the environment throughout offer-aware APIs: remove `EngineQueryPort` union arms/default resolver singleton and optional materiality context, not just `??`. Keep genuine query-only helpers separate. Preserve MCP's launch digest check and enforce the same binding on feed replacement/consumption across the run. Board path consumption rejects a different bound digest; round authorization/resolution uses the run binding. A valid digest authenticates settings integrity, not the identity of a human or authorization by itself.

VERIFIED — One more independently selectable dependency exists: `createEngineMcpRuntime` supplies both `offerEnvironment` and `turnProposals: createPureTurnProposalResolver(offerEnvironment)` at entrypoint lines 420–421. `createEngineMcpApplication` destructures both at engine-server line 1331, but its launch digest check validates only the environment, not the resolver's binding.

RECALLED — Simplify that dependency bag too: remove the independently supplied `turnProposals` value and derive the resolver from the application's one required environment inside its composition code. Continue validating bound resolved-option provenance at acceptance/execution; same-digest reminting is allowed, different-digest output is not. Do not retain two independently selectable dependencies that can disagree and then add ten spies to prove they agree.

### 3.2 Tests, roots, and the meaning of “one wiring test”

RECALLED — Keep **one focused in-process MCP composition test** by extending the existing `external MCP reconstructs the same immutable environment` case in **`tests/unit/vtt/offer-environment.test.ts:107`**. Supply a non-legacy, independently pinned binding, serialize/rebuild through the sole builder, construct the real `createEngineMcpRuntime`, execute its real option/proposal path, and compare its capsule binding with that input. The runtime is the actual application/feed/resolver composition root; no constructor spy or test-built imitation of its wiring is needed. Add different-digest rejection and equal-digest reconstruction acceptance in this contract suite.

RECALLED — I would **not keep SIMULATED's constructor identity test as the privileged survivor**. Retain its real run and advertised→submitted→accepted behavior. Add binding conservation to the real run's evidence, taking the observed value from the round snapshot/capsule, and compare with independently supplied run configuration. A compact `offerEnvironmentDigest` in run evidence and the internal DM projection is a useful provenance field if no existing artifact exposes that value; it must derive from the actual producing environment. Do not copy the expected input into an output solely to satisfy the test, or add model-visible prompt/schema fields merely for instrumentation.

RECALLED — “One wiring test” does **not** mean erase coverage of other entry points. Retain golden as the real-process protocol test, and the existing board-sequence test as a board behavior/binding test, preferably exercising the host's real projection path. The browser host, arena run and MCP child are distinct execution roots; one direct runtime test cannot prove all their input selection. This is a small set of meaningful root/boundary checks, not ten copies of constructor choreography. Compiler requirements prove presence; digest guards and independent output expectations prove agreement; existing behavior tests prove the result is useful.

RECALLED — **Golden:** the parent/child object-reference limit disappears as a requirement. Keep the original raw-fixture golden scenarios explicitly configured as legacy. Extend the dry client with a launcher-driven non-legacy case. Build an independently specified reference capsule from the known fixture/run/request metadata and pinned expected binding, using `createEngineStateCapsuleForEnvironment`; compare the actual child's returned `state_ref.state_handle` with `engineStateHandle(referenceCapsule)`, then exercise proposal acceptance. This observes the child's capsule commitment without a new protocol field. The reference must take its binding from the test fixture, never from child output, and must retain independent binding/legacy-ID pins. A child-only substitution of legacy must make this comparison red. Delete the parent “constructors not called” spies and disconnected local identity test.

VERIFIED — The current dry client launches `tools/engine-mcp-server.ts` with a raw fixture argument (`tools/engine-mcp-dry-client.ts:37–41`), not a launcher binding. Its current-turn resource and state-summary tool expose projections, not the full environment binding. However, `engine-state-capsule.ts:921–940` includes the binding in the capsule hash, and `engineStateHandle:951–952` returns `engine-state:${capsule.digest}`. Exact comparison to an independently expected capsule handle can therefore cover binding conservation; merely asserting that a handle exists cannot. The proposed launcher-driven comparison is additional work, not existing coverage.

RECALLED — **Divergence:** make `proposalResolutionDivergence` take the bound environment explicitly, and remove the mocked exported default-resolver getter. Keep the forced wrong-resolution-digest/geometry diagnostic case and an independent expected-mechanics/parity control. Where testing cross-environment refusal, pass an option/accepted entry with real different-digest provenance rather than rebuilding both sides from their respective IDs. Two calls to the same resolver with the same arguments are not restored coverage.

### 3.3 Findings withdrawn, and mutation acceptance

| r3 finding | RECALLED — disposition under the completed plan |
|---|---|
| **S3B-R3-F1** | **Withdrawn.** Equal-binding object replacement is allowed; the eight tautological constructor assertions and their per-file downstream identity demands are retired. Missing dependencies, incorrect digests, and host misbinding remain defects covered by types and boundary/behavior tests. |
| **S3B-R3-F2** | **Withdrawn.** Child object identity is not an acceptance criterion. It is replaced by same-builder reconstruction, strict binding decode, and real child digest/proposal evidence. No object identity instrumentation or cross-process exception is needed. |
| **S3B-R3-F3** | **Withdrawn as an identity blocker under the completed plan, not waived as a behavior defect.** Its self-comparison/independent-oracle concern survives until repaired. Explicit bound re-resolution plus the restored independent expectation is required before retiring the finding in full. |
| **S3B-R3-F4** | **Retired with the getter spy.** Its defective cleanup assertion has no subject once the interception is removed. |

RECALLED — These are conditional dispositions, not approval of unchanged `82ae8554`. I withdraw the earlier recommendation to increase constructor spying or instrument the child to preserve reference identity. The owner changed the invariant, so we should change its tests rather than win another argument about the old invariant.

RECALLED — Required mutant outcomes after implementation (not executed in this assignment):

- **MISSING_ENV_ARGUMENT:** omit a required runtime/round/board/host/offer-resolver dependency → TypeScript red.
- **SECOND_ENV_BUILDER / LEGACY_FACTORY_IMPORT:** reintroduce an exported alternative factory or prohibited construction route → compiler/architecture gate red.
- **FALLBACK_USES_LEGACY_ONLY:** change only fallback resolution to a legacy/different-digest environment → fallback acceptance test red; preserve the roadmap's fallback target.
- **BOARD_DIFFERENT_POLICY:** keep queries equal, change the board's policy/binding relative to the run → binding/path refusal test red, preserving the roadmap's board target.
- **CONSUMER_DROPS_BOUND_ENV:** replace a migrated consumer's non-legacy/different-policy binding with explicit legacy → its relevant boundary/behavior check red. A type-correct wrong value is not caught by required parameters alone.
- **MCP_CHILD_IGNORES_SERIALIZED_BINDING:** reconstruct legacy or choose mode independently of launcher input → real stdio binding/behavior test red; omitted/corrupt binding also rejected.
- **MIDRUN_ENV_SWAP / SKIP_DIGEST_CHECK:** accept a valid later capsule with a different environment, or resolve an option with a different/absent provenance digest → contract test red.
- **DIVERGENCE_TRUSTS_STORED_RESOLUTION:** bypass authoritative re-resolution or compare the stored result with itself → the retained forced-divergence independent-oracle test red.

RECALLED — **Retire the supervisor's `tools/ai-dm-conversation.ts:2776` equal-binding second-allocation mutant as a required red.** Through the approved deterministic builder, with the fixed canonical query port and unchanged digest, that is now equivalent behavior. It should be green. A corresponding *different-binding* replacement remains a required red. The existing local “env A option rejected by equal-settings env B” controls likewise change to acceptance; add rejection using an actually different binding. This is deleting a superseded test subject, not deleting a still-relevant test to make red go away.

## 4. Scope, batching, and risks

RECALLED — Concrete production change inventory: new `src/vtt/offers/build-offer-environment.ts`; existing `offers/offer-environment.ts`, `intent-resolver.ts`, `engine-query-port.ts` where its offer-aware registry callers need migration, `engine-state-capsule.ts`, `engine-round-session.ts`, `encounter-board-projection.ts`, `offered-option-paths.ts`, `encounter-projections.ts`, `dm-encounter-host.ts`, `encounter-app.ts`, `plan-materiality.ts`, `speculative-planning.ts`, `intel/opportunity-cost.ts`, `intel/team-scorer.ts`, `mcp/entrypoint.ts`, `mcp/engine-server.ts`; `tools/ai-dm-conversation.ts`, `tools/ai-dm-arena.ts` for run binding/configuration threading, `tools/engine-mcp-dry-client.ts`, and the six tool callers identified by the probe. `tools/engine-mcp-server.ts` can remain a thin entrypoint import. Full caller closure is generated as signatures are tightened, not guessed from eight grep matches.

RECALLED — Tests: the ten 3B files above; the existing three `tests/unit/vtt/offer-environment{,-identity,-board-sequence}.test.ts` suites; additional callers in the 59-file compiler inventory; further callers exposed by union/default-resolver deletion. Architecture enforcement: a rule under `ast-grep-rules/`, its negative fixtures, and the checked gate invocation. Do not conflate “ten test files in 3B” with “the whole refactor is ten files.”

VERIFIED — Existing `sgconfig.yml` loads `ast-grep-rules/`. There are six rules: `no-discarded-character-command-execute`, `no-party-pack-gap-push`, `vtt-snippet-purity`, `no-discarded-command-apply`, `no-inline-party-pack-super-refine`, `no-raw-fs-in-tests`. `vtt-snippet-purity.yml` is an existing TypeScript, severity-error, import-restriction precedent. The roadmap's cumulative gate at line 887 and `scripts/check-command-outcomes.sh:4` both specify **`sg scan --config sgconfig.yml src`**. That particular invocation does not scan tools or tests. I did not infer wider coverage from historic “sg green” notes.

RECALLED — Enforcement: make all old environment constructors unavailable as exports; use the private runtime type to prevent a second ordinary implementation; add an AST rule/architecture check forbidding former constructors and public environment-returning factory wrappers outside the builder. Cover named aliases, namespace access and re-exports; test representative forbidden examples. Run the relevant rule/check on **src and tools**, and on tests if tests are required to obey the same construction contract. Update the actual gate command, not merely the rule's `files` glob. Preventing construction/import bypasses is the goal; counting occurrences of a factory's spelling alone is insufficient. Deliberate `any`/double-cast bypasses are lint/review failures, not something TypeScript can make mathematically impossible.

RECALLED — **Ten-file batching:** treat this as the roadmap's already non-dispatchable Slice-3 tranche. Suggested order: (1) builder/type/codec consolidation plus at most the directly related environment contract tests and enforcement files; (2) migrate controlled callers in AST-sorted batches ≤10 while the old optional signatures still exist; (3) once a signature's entire caller group is migrated, delete its optional/default form, in a ≤10-file contract batch; (4) close query-port union/default-resolver/capsule surfaces the same way; (5) simplify the ten 3B tests after the corresponding final contract is present. Public legacy constructor wrappers must disappear by the builder tranche's cumulative acceptance; a facade is not the final architecture.

RECALLED — “Contract first” therefore means **first priority and a scratch diagnostic technique**, not literally publishing default deletion before dependent edits. Every accepted review unit stays ≤10 files, and the final cumulative tranche must typecheck and pass behavior/mutation gates. Where the new private environment type necessarily breaks many consumers at once, either review ≤10-file portions of a single non-dispatchable change and accept only its cumulative green result, or migrate import/call sites before the final private-type/export deletion. Do not claim a one-unit 3C-zero or quietly waive the ten-file rule. Do not begin new offer-family registration until the whole tranche is closed.

VERIFIED — **MCP second process:** the conversation launcher stores `capsule.offerEnvironment` at `tools/ai-dm-conversation.ts:2650`; `decodeEngineMcpLauncherManifest` requires an explicit binding at `mcp/entrypoint.ts:731–737`; reconstruction currently occurs at 755–758; `runEngineMcpEntrypoint` forwards it to the server at 802/819, and the server constructs the real runtime. That is a legitimate second process composition boundary, not accidental competing global configuration.

RECALLED — Replace reconstruction with `buildOfferEnvironment({ kind: 'binding', binding: manifest.offerEnvironment })` **in that same entrypoint**, and remove the exported reconstruction convenience function. Preserve serializable binding bytes/mode and validate them. Parent and child construct separate objects using the same builder module and canonical engine version. The raw-fixture branch near entrypoint line 885 must visibly choose legacy configuration through that builder or receive a launcher; never silently repair a launcher with a missing binding.

VERIFIED — **Product decision versus convenience:** `projectDmBoard:399` is a local fix that gives human options and paths the same legacy object; it does not inspect a product mode or the host's stored environment. `offered-option-paths:63` is explicitly named `transitionalLegacyOfferEnvironment` and shares one object between its two defaulted functions. It currently matters to same-object path resolution; deleting it without threading a coherent environment can remove/throw on paths. The existing board-sequence test pins moving paths and hazard overlays.

RECALLED — Preserve the behavior those two sites protected, while moving selection out of the projector/module global. Legacy mode itself is a supported explicit **product/protocol choice**, not disposable merely because its factory says “Legacy”: existing tests pin unchanged standard option IDs and raw-fixture protocol behavior. Keep `legacy_standard` as input to the one builder. Do not change every run to `revision_bound`, regenerate golden expectations from new output, or enable new families during this cleanup.

RECALLED — Remaining practical risks: a wrong but well-typed binding; absence of WeakMap provenance after cloning/raw generation; query implementation changes with unchanged digest; module cycles when the builder imports canonical queries (use type-only consumer imports and avoid eager singleton construction); and valid capsule replacement switching configuration mid-run. Validate these explicitly. Requiring environment parameters alone does not solve them, and the first 221-diagnostic probe intentionally does not pretend otherwise.

RECALLED — Implementation validation for the supervisor, not run here: both full TS projects; the architecture rule with positive/negative examples; the three existing environment suites; the ten simplified 3B tests and affected caller suites; preserved raw-stdio golden plus non-legacy serialized-binding control; existing board movement/hazard expectations; the named changed-binding/bypass mutants. No further spy ordering/leak campaign is required after the environment spies are deleted. Runtime acceptance remains outstanding because this task authorized research/compiler probes only.

## 5. For the owner

RECALLED — We spent too much effort proving that every part held the very same JavaScript object, even when a replacement represented exactly the same settings. Your ruling gives us a simpler target: one place builds environments, every part must receive one, and the settings fingerprint must stay consistent through the run—including the separate MCP process. I support retiring the identity spies. We first need to finish that design, because today's code still checks object identity in one place and leaves query behavior outside the fingerprint. Once the single builder fixes query selection and the boundaries check digests, equivalent copies are harmless, wrong settings are rejected, and a few real behavior/boundary tests replace the repeated spy scaffolding. The divergence test still gets its independent expectation restored.

SIMPLIFY DONE
