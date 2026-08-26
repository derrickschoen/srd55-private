# Merge VTT and simulation into one combat engine

Date: 2026-08-26  
Status: implementation plan  
Binding rulings: D25, D226, D239, D245, D263, D291, D312, owner ruling D388, and D388.2

## Outcome

`src/combat` is the only combat/rules execution engine. The VTT remains a
browser/session/presentation consumer of it. The simulator becomes only typed
scenario fixtures, controller policies, seeded batch execution, and statistical
aggregation over that same reducer. There is no expected-value combat engine,
no per-build attack/save/damage loop, and no compatibility facade for the old
simulation paths.

The migration follows D312's designation of the VTT engine as the superset and
D388 verbatim: “Merge the vtt code and the sim engine. We should not need both
to be separate code. Both should import the same engine.” The value retained
from the sim is its methodology: deterministic seeds, many-run aggregation,
confidence intervals, independently derived semantic controls, public-source
evidence, and private docx comparison. Its actor and rules model does not win.

## Verified inventory and import graph

### The three current surfaces

There are two separate sim implementations, not one:

1. `tools/sim/sim.ts:236-243` defines the Monte Carlo board's `Level` and
   two-number `CombatResult`; `tools/sim/sim.ts:268-279` owns benchmark AC,
   weapon bonuses, enemy offense tuples, and defender AC; and every build owns
   a four-round combat loop (`tools/sim/sim.ts:400-441` is the first, with the
   same shape repeated through `:1861`). `tools/sim/homebrew.ts:19-45` defines a
   second homebrew result/trace model and `tools/sim/homebrew.ts:102-116` its
   fixed-threshold attack path. These are the docx/board-era rule-bearing sim.
2. `src/simulation/contracts.ts:386-740` defines a separate expected-value
   scenario/event vocabulary and `src/simulation/probability.ts:588-872` folds
   attacks, saves, automatic damage, and round totals without encounter state.
   `src/simulation/contracts.ts:1759-2009` separately models routines, rounds,
   resources, and DPR results. It is not imported by application production
   code: the observed importers are `tests/unit/simulation/*`, the cache global
   setup, and `docs/type-probes/dpr-simulation.probe.ts`.
3. `src/combat/encounter.ts:166-637` defines life, death saves, turn resources,
   combatant state, initiative, encounter state, commands, and reducer
   contracts; `src/combat/encounter.ts:11520` is the authoritative pure reducer.
   `src/vtt` already consumes it for live play and for seeded survival batches.

The Monte Carlo sim is partially shared already, but only at the primitive
level: `tools/sim/sim.ts:1-17` imports RNG, d20, damage, save, and branded value
helpers from `src/combat`; `tools/sim/homebrew.ts:6-14` imports the same
primitives. Its build functions still decide turns, conditions, resources,
spells, healing/support, and enemy behavior themselves. `tools/sim/run.ts:14-44`
imports those build functions, and `tools/sim/homebrew-board.ts:1-16` imports the
second model. All tests except `movement-adoption.test.ts` similarly import
`./sim` or `./homebrew`.

The in-app expected-value graph is internally closed:

- `src/simulation/probability.ts:1-50` -> `contracts`, `coverage`, domain enums.
- `src/simulation/coverage.ts:1-63` -> sheet query/rules types, catalog/crypto,
  bundled sources, `contracts`, source reader/cache, and readonly-map helpers.
- `src/simulation/headline.ts:1-17` -> `contracts` and `coverage`.
- `src/simulation/request.ts:1-19` -> domain ids/enums and `contracts`.
- `src/simulation/route.ts:1-6` -> `contracts` and `request`.
- `src/simulation/spell-source-parse-cache.ts:1-12` -> `contracts` and
  `spell-source-reader`; the reader itself imports only domain enums and the
  sim's `SaveSuccessOutcome` (`src/simulation/spell-source-reader.ts:1-2`).

The live VTT graph is much deeper:

- `src/vtt/party-pack.ts:2-42` maps validated external party data onto combat
  profiles, effects, attacks, spells, conditions, resources, and typed values.
- `src/vtt/stored-character-party-member.ts:1-21` projects persisted characters
  through `SpellAccessBuilder`, sheet/weapon queries, attack profiles, ability
  rules, class rules, resources, and the combat spell manifest.
- `src/access/spell-access-builder.ts:38-47` reaches the eligibility constraint,
  grant source reader, ability scores, character level, proficiency, and spell
  slot assignment. Thus `eligibility`, `grants`, `rules`, and `access` are the
  upstream character-to-combatant derivation graph; they are not a second
  encounter reducer.
- `src/vtt/stored-character-encounter.ts:1-17` creates an `EncounterState` and
  legal actions from loaded party members; `src/vtt/adventuring-day-session.ts:1-26`
  owns cross-encounter session persistence while calling `reduceEncounter`.
- `src/vtt/survival-harness.ts:1-30` already demonstrates the desired sim
  architecture: `TurnCoordinator` + `AlgorithmController` + seeded `mulberry32`
  over real `EncounterState`; `src/vtt/survival-harness.ts:115-224` executes a
  fight and derives measurements from the event log, while `:260-372` runs and
  aggregates campaigns.

Two reverse edges currently prevent `src/combat` from being a clean engine
boundary: `src/combat/controllers.ts:6` imports a DM-bridge `DecisionProgram`
from `src/vtt`, and `src/combat/coordinator.ts:34-37` imports refusal routing
types from `src/vtt/refusal-handling.ts`. These move into `src/combat`; VTT
adapters import them from the engine afterward. `src/combat/spells/resources.ts:2`
may continue importing the character rules' slot derivation, because
`src/rules` supplies typed rule data and does not execute an encounter.

### Duplicated concepts and winner

| Concept | Sim implementation now | VTT/shared implementation now | Winner and disposition |
|---|---|---|---|
| Actors | A build is a function returning only `{dealt, prevented}` (`tools/sim/sim.ts:236-243`); the opposing actor is an `ENEMY` tuple (`:272-277`). `src/simulation` identifies a character/routine but has no actor state (`src/simulation/contracts.ts:1786-1800`). | `CombatantProfile` and checked player/monster projectors (`src/combat/combatant.ts:31-217`), live HP/life/death/resources (`src/combat/encounter.ts:282-359`), and loaded party members (`src/vtt/party-pack.ts:885-958`). | VTT. Every benchmark becomes an ordinary typed `EncounterSetup` with real combatants and branded ids. The sim keeps only fixture metadata and policy. |
| Attacks | `resolveSimAttack` plus per-build branches (`tools/sim/sim.ts:306-323`, first loop `:400-441`); a second threshold attack exists at `tools/sim/homebrew.ts:102-116`. `src/simulation` has `AttackRollEvent` and a probability fold (`src/simulation/contracts.ts:686-697`, `src/simulation/probability.ts:588-656`). | Attack command union (`src/combat/events.ts:154-184`), attack request/result and resolver (`src/combat/resolution.ts:44-69`, `:125-158`), and reducer action/resource/target enforcement (`src/combat/encounter.ts:3402-3435`, `:5615+`). | VTT. Sim controllers choose a legal attack command; only the reducer rolls, spends, applies riders, and emits results. |
| Damage | Private dice wrapper and scalar accumulation (`tools/sim/sim.ts:281-304`) plus `CombatResult.dealt`; separate dice helper in `tools/sim/homebrew.ts:79-100`; expected-value `DamageInstance`/folds in `src/simulation/contracts.ts:591-729` and `probability.ts:199-338`. | Typed `DamageRequest`/`DamageResult` and responses (`src/combat/resolution.ts:83-103`, `:174-207`), damage operations (`src/combat/damage-operations.ts:6-75`), and HP/life application (`src/combat/encounter.ts:2750-2828`). | VTT. Aggregation reads `damage_applied`/`attack_resolved` events; it never recomputes damage. |
| Saves | `savingThrowFails` and `damageAfterSave` (`tools/sim/sim.ts:375-385`) plus a separate analytical fold (`src/simulation/probability.ts:659-771`). | `SavingThrowRequest`/result and resolver (`src/combat/resolution.ts:71-81`, `:160-172`), with spell/effect save timing enforced by the reducer. | VTT. Controllers select actions; save DC, roll mode, repeated saves, success arms, and legendary resistance stay reducer-owned. |
| Conditions | Ad-hoc booleans such as `stunned` inside a build (`tools/sim/sim.ts:824-853`, `:882-900`) and trace counters for speed/reaction locks (`tools/sim/homebrew.ts:19-40`). There is no general sim condition state. | Closed known condition set and applied-condition union (`src/combat/conditions.ts:5-32`), mechanical state (`:449-639`), typed spell lifecycle (`src/combat/spells/types.ts:165-221`), and reducer lifecycle ordering (`src/combat/encounter.ts:7908-8185`). | VTT. Delete sim booleans/counters as rule state; aggregate condition events only for reports. |
| Turn order | A declared assumption that the party always acts first (`tools/sim/sim.ts:146-147`) and duplicated `for (round)` loops in every build (`:420`, `:463`, through `:1861`; homebrew repeats at `tools/sim/homebrew.ts:137-506`). | `InitiativeEntry`/modes/state (`src/combat/encounter.ts:359-500`), `startTurn` (`:5561-5601`), and end-turn/next-living initiative transition (`:11487-11516`), orchestrated by `TurnCoordinator` (`src/combat/coordinator.ts:239+`). | VTT. Initiative is fixture configuration plus engine state; fixed-round analysis is a batch stop policy, not a parallel turn loop. |
| Spell resolution | Caster-specific imperative code (`tools/sim/sim.ts:1332-1869`), with healing/support folded into one scalar, plus a separate SRD text parser and expected save-damage model (`src/simulation/spell-source-reader.ts:106-141`, `coverage.ts:1239-1779`). | Typed spell operation union and cast command (`src/combat/spells/types.ts:520-610`, `:1219-1238`), definitions/lookup (`src/combat/spells/definitions.ts:88-1475`), manifest (`src/combat/spells/manifest.ts:3-219`), and reducer spell operation outcomes (`src/combat/encounter.ts:8511+`). | VTT. Sim scenario setup refers to manifest spell ids and legal cast commands. Unique public-source evidence is relocated to an engine/audit namespace; the analytical resolver is deleted. |
| Healing | `CombatResult.prevented` conflates healing with prevention (`tools/sim/sim.ts:238-241`); Life/Land implementations add sampled healing directly (`:1473-1569`). | Typed `heal` command (`src/combat/events.ts:271-277`), `healing_applied` event (`:664-670`), capped/life-aware application (`src/combat/encounter.ts:7449-7471`), and cross-fight healing/resource state (`src/vtt/party-session-state.ts:697-826`). | VTT. Analysis reports healing, prevention, and off-target amplification as separate event-derived metrics; never preserve the overloaded scalar. |
| Death | Neither sim has HP depletion, dying, death saves, encounter conclusion, or target removal. Fixed rounds implicitly attack an immortal target. | `LifeState`/`DeathSaveState` (`src/combat/encounter.ts:166-200`), damage-to-dying/dead (`:2750-2828`), death-save resolution (`:2858-2948`), and encounter conclusion (`:647-699`). | VTT, as the only implementation. Benchmark fixtures must explicitly provide enough sourced/derived target HP for their declared fixed window or refuse; no hidden immortal-target exception. Death/action truncation is a deliberate source of numerical drift to measure. |

## Target architecture

```text
rules / eligibility / grants / access / queries
                     |
                     v
       shared character + content projection
                     |
                     v
      src/combat (ONLY rules execution engine)
      state + reducer + spells + movement + controllers
             ^                         ^
             |                         |
 src/vtt adapters/UI/session      analysis importer
                                 scenarios + policies
                                 seeded batches + aggregation
                                          |
                                     tools/sim CLI
```

Ownership rules:

- `src/combat` is browser-free, deterministic under an injected RNG, and may
  not import `src/vtt`, analysis, tools, DOM, persistence, or presentation.
- Shared controller/refusal contracts currently misplaced under `src/vtt` move
  down into `src/combat`. Human/DM bridge and browser persistence stay in VTT.
- The persisted/external character projection uses the existing access/rules/
  eligibility/grants graph exactly once to produce typed combatant/content
  inputs. The VTT and analysis fixtures consume that projection; neither
  derives attack bonuses, saves, slots, or grants independently.
- Introduce a non-legacy analysis namespace (for example `src/analysis`) for
  generic batch stop policies, event-log metric reducers, CI calculations, and
  report DTOs. It imports `src/combat`; the engine never imports it.
- `tools/sim` keeps CLI formatting, public/private fixture loading, D-numbered
  methodology annotations, and comparison reports. Per-build files may declare
  scenario facts and controller policy, but may not roll dice, mutate HP,
  implement conditions, spend resources, resolve spells, or advance turns.
- Move `src/vtt/survival-harness.ts`'s generic seeded runner/aggregation into
  analysis and leave VTT-specific scenario composition as an importer. This is
  the proven local pattern for the final simulator.
- Delete the entire old expected-value execution surface
  (`src/simulation/{contracts,probability,headline,request,route}.ts`) and the
  rule-bearing Monte Carlo paths (`tools/sim/sim.ts`, `tools/sim/homebrew.ts`).
  Relocate only independently valuable source-evidence/parser material to a
  rules-audit or combat-evidence namespace. Do not re-export or alias old paths.

## Test-pin and measurement risk register

### Pins that are measurements and may move only after fresh evidence

1. The private docx scorecard is an external measurement, not a semantic unit
   oracle. D291 still requires aggregate DPR within +/-1% per build. Run fresh
   unified-engine trials against the unchanged docx inputs; if a cell moves,
   D239 requires a blocking, explicit re-pin justification naming the semantic
   cause. Never generate the new expected value from the implementation's own
   output and call that validation.
2. D329's soak-derived DPR/private ceilings and any claimed-vs-measured rows in
   `tools/sim/homebrew-board.ts:27-129` are measurement-backed. Re-measure them
   from fresh live unified-engine runs, with preregistered seeds/trials and CI;
   claims remain external inputs.
3. The VTT survival acceptance (`tests/integration/vtt/survival-policy.test.ts:530-542`,
   currently 29/30 on fixed seeds) and the detailed live figures in
   `docs/design/2026-08-25-survival-analysis.md` are measurement-backed. A pure
   harness relocation should reproduce them; a legitimate engine/policy change
   may be re-pinned only from a fresh quiet-machine live measurement with the
   cause recorded. Loaded-machine results are discarded under D264.
4. Performance budgets and CI widths must be freshly measured after reducer
   batching; no old expected-value timing is transferable.

### Semantic invariants that must keep passing unchanged

- Attack/save/damage distributions, natural-1/20 behavior, critical dice,
  resistance/vulnerability/immunity, half-damage rounding, and deterministic
  RNG semantics. Preserve the independent controls in
  `tools/sim/deterministic.test.ts`, `statistical.test.ts`, and
  `tests/unit/simulation/probability.test.ts` by moving their subject to shared
  engine/event traces, not by preserving old APIs.
- Finite per-turn, Short-Rest, and Long-Rest resources and the burst/day
  directional relationships in `tools/sim/resources.test.ts` and
  `statistical.test.ts`.
- Condition timing, concentration break/replacement, reaction limits, weapon
  mastery carries, initiative ordering, healing caps, dying/death, encounter
  conclusion, legal-action refusal, replay, and event causality already pinned
  by `tests/unit/combat/*` and `tests/integration/vtt/*`.
- Determinism for the same setup+seed+controller transcript, no hidden shared
  mutable state, and distinct fixture identities from `identity.test.ts` and
  `srd-board.test.ts`. Exact old object bytes are not the invariant; canonical
  encounter/event replay is.
- D245's semantic refusal: any damage-relevant mechanic not representable by
  the unified engine yields a typed unavailable/gap result and no number.
- Public-source clause/digest, source ownership, save-success, roll-grouping,
  and resource-recovery evidence currently tested under
  `tests/unit/simulation/coverage-*`, `review-round-*`, and parser near-misses.
  Relocate these tests with the evidence code. Under D226, checksum coverage
  follows every transitive source dependency; moving a path alone does not
  license changing the reviewed semantic oracle.

### Old-implementation pins that must be retired, not re-pinned

- `tools/sim/golden/*.json` and `golden-parity.test.ts:96-137` pin exact outputs
  and draw counts of the deleted per-build control flow. They are not external
  measurements. Delete them when their subject goes; replace them with
  independently asserted reducer events and same-seed replay determinism.
- Exact draw-count assertions in `deterministic.test.ts`/`gaps.test.ts` that
  detect the old loop's branch structure must become observable semantic-event
  assertions. Do not bless the unified reducer's new draw count by recording
  it from one run.
- Expected-value-only result shapes, route DTOs, mints/WeakSet guards, and fold
  composition tests under `tests/unit/simulation` disappear with the deleted
  analytical engine unless they state a still-valid independent rule or
  evidence invariant. A test may be deleted because its subject is gone, never
  to make a retained subject green.

### Largest technical risks

1. Replacing immortal scalar actors with real combatants introduces HP, death,
   action truncation, initiative, range, target selection, and encounter
   conclusion. These can legitimately shift every old board number.
2. Sim rotations contain rules not represented as legal shared-engine actions.
   The migration must expose gaps and stop numeric publication; it must not add
   a sim-only command, DM fiat default, or direct state mutation to preserve a
   cell.
3. The old `prevented` channel combines prevention, healing, control, and
   off-target amplification. Splitting it changes reports and may uncover that
   old comparisons were dimensionally invalid.
4. Reducer-backed Monte Carlo will be slower. Optimize only the importer
   (fixture reuse, projection caching, worker partitioning, event-summary mode)
   after measurement; never introduce a second fast resolver.
5. Moving evidence/parser files can silently weaken D226 digests or the D245
   refusal boundary. Inventory transitive imports and rebind checksums before
   deleting old paths.
6. `src/combat` currently depends on two VTT modules. Failing to invert those
   edges leaves the engine coupled to presentation and makes the CLI/browser-
   free compile boundary dishonest.

## Working tree and sequencing

After the running consolidated VTT mutation sweep is harvested and committed,
create a separate worktree on branch `wt/engine-merge` off `wt/vtt` and run this
refactor there. In parallel, the v1-bar track continues on `wt/vtt`'s stable
foundation: the player-board lane (D386.7–D386.9) followed by the five-tab leg
(D386.10). Merge the two tracks only when both are complete. The supervisor
serializes their full-suite gates so only one heavy gate runs at a time under
the quiet-machine rule.

## Staged implementation

The consolidated VTT mutation sweep running at plan time lands first. Do not
start this migration against its pre-sweep engine and do not overlap any full
suite with the active Stryker run. Once landed and the machine is quiet, use
that result as the baseline for Stage 0. Every stage is independently
reviewable and green; no stage weakens or deletes a retained assertion.

### Stage 0 — freeze the post-sweep baseline and fixture census

- Re-run the inventory above on the landed tree. Enumerate every public and
  private board row, scenario assumption, controller policy, spell/feature gap,
  output metric, seed set, source digest, and test owner.
- Classify every pin into the three categories above before changing code.
  Record external measurement provenance and preregister fresh unified-engine
  sample sizes/seeds; do not run the new measurement yet.
- Establish the post-VTT-sweep full green baseline on a quiet machine.

Gate: `npx tsc -b`; `npx tsc -p tools/sim/tsconfig.json`; structural `sg`
census of imports/calls for `src/simulation`, `./sim`, `./homebrew`,
`foldAttackEvent`, `resolveSimAttack`, and direct per-build round loops;
targeted existing combat/VTT/sim Vitest; then boundary full gates
`npm run test:all` and `npx vitest run --root tools/sim`.

### Stage 1 — make `src/combat` a real dependency boundary

- Move `DecisionProgram`/controller contracts out of
  `src/vtt/dm-bridge/round-plan-contract.ts` and refusal classification/routing
  needed by the coordinator out of `src/vtt/refusal-handling.ts` into focused
  `src/combat` modules. Leave VTT rendering/settings adapters above the seam.
- Make the engine-facing party/scenario contracts independent of VTT UI and
  persistence. Extract only shared loaded-combatant/attack/spell/resource input
  types; VTT codecs and DB/browser adapters remain VTT/application code.
- Define a single character-to-combat input projection that consumes existing
  rules/access/eligibility/grants/query output. Preserve typed refusals for
  unresolved ability choices, unknown mechanics, and absent values.
- Add a static architecture test: no module under `src/combat` may import
  `src/vtt`, `src/analysis`, `tools`, DOM, or persistence.

Gate: both tsc commands; `sg`/`rg` zero-match gate for `src/combat -> src/vtt`
imports; targeted `tests/unit/combat/{controllers,encounter}.test.ts`, VTT
refusal/controller/DM-bridge tests, and stored-character projection integration
tests. End with root unit Vitest; no numerical re-pins.

### Stage 2 — extract the analysis importer from the proven survival harness

- Create typed analysis contracts for `ScenarioId`, `RunSeed`, positive trial
  count, fixed-round/encounter-conclusion stop policy, measurement kind, and
  batch result. Keep ids branded and all closed result arms exhaustive.
- Extract generic fight execution from `src/vtt/survival-harness.ts:115-224`:
  create an encounter, register controllers, run `TurnCoordinator`, resolve
  typed pending decisions, stop by declared policy, and return canonical events
  plus terminal state. Extract aggregation from `:260-372` without importing VTT
  presentation or persistence.
- Retain the existing VTT survival scenario as the first consumer and prove its
  fixed-seed result and per-event totals unchanged. This validates the seam
  before any old sim row moves.
- Add batch-level limits and explicit unavailable/gap propagation; one failed
  scenario arm makes the affected statistic unavailable rather than zero.

Gate: both tsc commands; `sg` gate that analysis contains no calls to
`resolveAttackRoll`, `resolveSavingThrow`, `resolveDamage`, `rollDie`, or direct
mutation of encounter combatants; targeted survival-policy, encounter,
coordinator, replay, and analysis aggregation Vitest. Root unit Vitest at the
stage boundary.

### Stage 3 — migrate representative vertical slices without switching boards

Build a shadow unified-engine board used only for migration proof; it is not a
compatibility API and is deleted/renamed to the final board at cutover.

1. Migrate one simple martial/ranged pair (Champion) as typed combatants,
   encounter setup, legal-action controller policy, fixed four-round stop
   policy, and event-derived dealt metric. This covers actors, attacks, damage,
   initiative, range, and resources.
2. Migrate one save/condition/concentration slice (Open Hand), one
   reaction/prevention slice (Veteran or Barbed Court), and one
   spell/healing/death slice (Life Domain). Do not advance until each missing
   mechanic is either represented in the shared engine with combat tests or is
   a typed D245 gap.
3. Port independent deterministic/resource/directional tests to the unified
   scenarios. Compare against their rules-derived assertions, not old board
   output. Old and new numeric outputs may be printed diagnostically but may
   not serve as expected values.

Gate after each slice: both tsc commands; `sg` zero-match for rule-resolution
calls in that slice's scenario/controller; targeted shared combat tests plus
the migrated scenario's deterministic/resource/statistical tests. End Stage 3
with root unit Vitest and the still-green legacy tools/sim suite.

### Stage 4 — migrate all remaining rows and policies

- Convert every SRD, homebrew, alternate-posture, and private-import row to
  scenario facts plus controller policy. Use manifest spell/effect ids and the
  same combatant projection used by the VTT.
- Replace `ENEMY` tuples with explicit benchmark combatant profiles and
  attacks. Fixed-window targets receive a documented HP bound sufficient for
  the window, derived independently from scenario maxima; no engine-level
  immortal dummy kind is added.
- Replace hard-coded round loops, ad-hoc flags (`stunned`, Vex carries,
  concentration booleans), resource queues, and `prevented` accumulation with
  reducer state and typed event aggregators.
- Preserve methodology as data: levels, rounds, rest cadence, target profile,
  party-first initiative only where declared, controller policy id/version,
  support metric definitions, and every D-numbered assumption.
- Port source evidence/parser modules that remain useful into their final
  rules-audit/combat-evidence home, update D226 transitive digests, and keep the
  source-derived tests green before deleting their old copies.

Gate per cohort: both tsc commands; `sg` no-rule-logic gate over scenario and
aggregation folders; targeted cohort tests plus affected `tests/unit/combat`
spell/condition/resource tests. Boundary gate: full root Vitest, tools/sim
Vitest, build/dist-clean, and browser suite on a quiet machine.

### Stage 5 — cut over once, delete both old engines, and prove compile failure

- Switch `tools/sim/run.ts`, homebrew board, private scorecard adapter, and
  report tests to the unified batch/aggregation API.
- Delete `tools/sim/sim.ts`, `tools/sim/homebrew.ts`, their old golden fixtures,
  and all old-control-flow-only tests. Keep/move scenario fixtures and semantic
  tests under names that describe policy or analysis, not an engine.
- Delete all of `src/simulation`. Do not leave barrels, deprecated exports,
  forwarding modules, aliases, or path mappings. Delete its unused request/
  route/headline surface; relocate only independently justified evidence and
  analysis contracts.
- Replace `docs/type-probes/dpr-simulation.probe.ts` with two probes: valid
  programs import only the new engine/analysis types, while a deliberately
  separate removal probe imports every former `src/simulation/*` engine path
  and `tools/sim/{sim,homebrew}` and must receive TS2307 module-not-found errors.
  The test must assert the exact old-path error census so adding an alias later
  fails CI.
- Structural compile gate: no source/test/tool import references an old path;
  the explicit negative probe is the only textual exception.

Gate: `npx tsc -b`; the updated tools/sim tsc; `sg` and `rg` zero-match old-path
and old-symbol census; targeted negative type-probe test; all combat, VTT,
analysis, source-evidence, and tools/sim tests. Boundary full gate:
`npm run test:all`, `npx vitest run --root tools/sim`, and the private regression
gate. The tree is not merged if any semantic assertion or private measurement
gate is silently weakened.

### Stage 6 — fresh measurement, documented re-pins, and post-merge audit

- On a quiet machine, run the preregistered unified-engine samples. Produce a
  per-row old-reference/new-measurement table with CI, semantic delta reason,
  source/controller versions, and gap status.
- Re-measure the survival pin with
  `npx vite-node tools/rehearsal/survival-headless.ts --mode=survival_package`,
  whose fresh-evidence sample is the 30 fixed seeds 20260801–20260830. Record
  that output before changing the pinned survival expectation.
- Keep D291's +/-1% docx rule. A failure is red unless the owner/ruling changes
  the methodology; an invented convention never closes it (D238).
- Re-pin only measurement-backed values with fresh live evidence and D239
  justification. Do not re-create deleted golden outputs or draw counts.
- Migrate and keep the existing tests green throughout the refactor, but run no
  mutation testing on the refactor track. After both the engine-refactor and
  v1-bar tracks are complete and merged, run the full audit and mutation pass
  against the combined tree, including the D388.2 SIM mutation sweep over the
  unified engine plus analysis importer. The already-running consolidated VTT
  mutation sweep is the pre-branch baseline; it is not repeated or interleaved
  with the refactor. Any survivor in shared combat semantics is an engine
  survivor, not assigned to a separate sim implementation.

Refactor-track gate: both tsc commands, all targeted/full gates above, private
docx gate, and fresh measurement report review; no mutation command. Post-merge
gate: repeat the full audit on the combined two-track tree, then run the full
mutation pass, including the D388.2 SIM Stryker campaign, with zero unexplained
survivors under D280/D388.2.

## Completion criteria

- Both VTT and simulation call the same `reduceEncounter`/`TurnCoordinator`
  engine and consume the same typed combatant/spell/effect projections.
- Simulation code contains only fixtures, controllers, batch orchestration,
  aggregation, CI/reporting, and evidence metadata.
- Actors, attacks, damage, saves, conditions, turn order, spells, healing, and
  death each have one implementation under `src/combat`.
- `src/combat` has no upward dependency on VTT or analysis.
- Every old sim-engine import path fails to compile; no deprecation or adapter
  exists.
- Semantic invariants remain independently falsifiable; only fresh externally
  grounded measurements are re-pinned.
- The consolidated VTT mutation sweep is landed first, and the SIM mutation
  sweep runs last against the unified engine.
