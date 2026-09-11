# Offers roadmap: Help/Ready, Grapple/Shove, and repositioning

Date: 2026-09-08  
Round-2 revision: 2026-09-09  
Round-3 revision: 2026-09-09  
OFFERS-PLAN-02 round-1 revision: 2026-09-09  
OFFERS-PLAN-02 round-2 revision: 2026-09-09  
OFFERS-PLAN-02 round-3 revision: 2026-09-09  
Previous shelved draft SHA-256: `e27b440c3b50276adb8f7a496ac6115ea60c9e020d75a09d58a3b224252e3f51`  
Previous OFFERS-PLAN-02 round-1 SHA-256: `213f0b3948a07739b261792725eb1e6bf748b08441070aa172917e7e52380168`  
Previous OFFERS-PLAN-02 round-2 SHA-256: `5acd9b166fdff2cae18a1779e15c0e306a5843ccd3eabba25724b153ddc670d0`  
Base: `claude/p-offer-help` at `eb77885440ef658e093a4cff1288d25c053a7c09`  
Mode: planning only. No implementation, tests, model calls, browser runs, or git writes were performed while producing this plan.

## OFFERS-PLAN-02 round-1 dispositions

| D586.74 blocker | Disposition | Checkable resolution in this revision |
|---|---|---|
| Bottleneck positive fixture admitted a diagonal bypass through the vacated alcove. | **Fixed** | The blocker now starts at `(2,1)` and moves to gate `(3,0)` on a 5-by-2 board with movement-only walls at `(0,1),(1,1),(3,1),(4,1)`. A read-only probe through the real `encounterMovementWorld` prints the complete reachable sets and exact simple attack-path enumeration: the occupied gate has none, while removing only its occupancy restores four paths. The reach-10 negative control keeps candidate topology unchanged and removes the benefit. |
| Every pre-ledger import received `grants:[]`, erasing a live Dash/Flee grant on the next refresh. | **Fixed** | One shared migration carries only a multiplier count corroborated by the active turn's legacy reducer events and coherent capacity, records its source as `legacy_unresolved`, and never promotes historical free-text to fresh Dash/Flee provenance. One-Dash, double-Dash, and Flee checked-in fixtures run through all four raw-state ingresses. Missing or contradictory history is retained as explicitly indeterminate and every grant-sensitive mutation fails closed until the next turn start clears it. |

## OFFERS-PLAN-02 round-2 dispositions

| Astra round-1 finding | Disposition | Checkable resolution in this revision |
|---|---|---|
| F1 old speed/mode writers can emit noncanonical triplets. | **Accepted and fixed** | Structural validation now accepts every finite non-negative triplet. `{40,0,50}` speed-writer and `{60,0,90}` mode-writer states are retained byte-for-value with `legacy_writer_drift` provenance and blocked only at grant-sensitive use, not import. |
| F2 independently migrated journal snapshots disagree with fresh reducer provenance during replay. | **Accepted and fixed** | VTT session schema 13 marks every migrated pre-ledger revision `preledger_v1`. Snapshot migration and replay-only post-reducer canonicalization use the same event-sequence IDs/source/provenance, after which the existing complete-state `requireCanonicalEqual` runs unchanged. A checked-in three-revision pre-Dash/Dash/move journal must import, replay, export, reimport, and replay again. |
| F3 turn-start boundary refresh runs before the final movement reset. | **Accepted and fixed** | `beginIncomingTurnMovement` invalidates the complete expired prior-turn ledger immediately after assigning the entering actor and before wild-shape/boundary processing. A real imported drift-state turn transition expires a movement effect without refusal and ends in a fresh known ledger. |
| F4 commanded Flee witness used an unrealizable boundary state. | **Accepted and fixed** | Flee now pins `{60,60,0}`, `exhaustion:'exhausted'`, one unresolved-source legacy grant on import, and `{60,60,0}->{80,60,0}->{60,60,0}` across a +10 refresh cycle. |
| F5 bottleneck control left attack range/OA reach/Reaction ambiguous. | **Accepted and fixed** | The fixture now separates attack-specific reach from ordinary OA reach and pins `reactionAvailable:false`; only attack-specific reach changes in the negative control. |
| F6 the required Playwright port differs from the shelved draft. | **Accepted; explicit operational exception** | OFFERS-PLAN-02's binding lane rules require `PLAYWRIGHT_PORT=4360`; that requirement supersedes the shelved draft's `4600`. This one operational line is intentionally changed and does not alter implementation scope or browser coverage. |

## OFFERS-PLAN-02 round-3 dispositions

| Astra round-2 finding | Disposition | Checkable resolution in this revision |
|---|---|---|
| F1 current numeric replay cannot reproduce preserved legacy writer drift. | **Accepted and fixed with versioned legacy numeric replay** | The checksum-covered marker now selects `legacy_v12` numeric semantics for historical reducer execution. That closed path reproduces v12 refresh, Dash/Flee, spend, start-turn, and the speed/mode wrapper's second remaining-movement adjustment before shared provenance canonicalization; no state field is excluded from equality. Genuine linked +10-Speed and fly-60 journals must preserve `{40,0,50}` and `{60,0,90}` through replay, export, reimport, and replay. |
| F2 skip/delay are reducer-backed but bypassed canonicalization. | **Accepted and fixed** | One exhaustive reducer-backed replay seam covers exactly `reducer_applied`, `turn_skipped`, and `turn_delayed`, passes the marker-selected numeric mode into each reducer path, canonicalizes every combatant afterward, and then performs the existing full-state/event/RNG comparisons. Marked skip and delay journals kill either omitted arm. |
| F3 an unresolved active actor can deadlock at its outgoing boundary. | **Accepted and fixed** | Refusal is limited to controller-originated grant-sensitive commands and offer/evaluation use. Reducer-internal lifecycle refreshes never refuse: an unresolved ledger is carried byte-for-byte through an outgoing/internal refresh until the already-specified incoming reset can establish known state. Imported active drift and indeterminate end-boundary witnesses expire the effect, enter the next turn, and survive export/reimport replay. |

## Round-3 dispositions

| Reviewer finding | Disposition | Checkable resolution in this revision |
|---|---|---|
| B1 Dash grants were captured rather than Speed-sensitive | **Fixed** | A grant records one current-Speed multiplier, not feet. Every Speed change recomputes `effectiveSpeed * (1 + grants)`, yielding 30 total at Speed 15 with one Dash, 80 at Speed 40, and restoring one/two Dash grants after Grappled suppression. |
| B2 reposition witnesses did not win the whole search | **Fixed** | All four fixtures now freeze board topology, every combatant's Speed/reach/range, permitted bundles, candidate endpoints, hostile origin envelopes, exact per-endpoint sets/vectors, and the total-order winner. Each control removes its purpose benefit from every reachable candidate, not only the former winner. |
| B3 Grapple recurrence omitted opportunity attacks | **Fixed** | The stationary grappler's authored OA reach is 200 feet while its direct action remains reach 5. Every listed successor stays within 200 feet, and each path asserts zero OA triggers/decisions/events. The competing `3/40` attack now has explicit attack bonus, AC, damage, hit weights, and normalization. |
| B4 Slice 6 required-field migration could not compile | **Fixed** | New Slice 6A migrates `TurnMovement.grants`, both production constructors, and all seven literal/assertion test consumers in one ten-file compile-complete tranche. Slice 6B then adds control mechanics without deferring a required-field consumer. |
| S1 global non-approach constraint was undefined | **Fixed** | The policy now defines the complete nearest-visible-enemy set, tie handling, per-edge monotonic predicate, and no-visible-enemy behavior. |
| S2 held-out split said pre-implementation | **Fixed** | Slice 17B and its manifest now require evidence that the split predates roadmap design, matching D586.5; pre-implementation alone is explicitly insufficient. |

## Round-2 dispositions

| Reviewer finding | Disposition | Checkable resolution in this revision |
|---|---|---|
| B1 movement restoration discards Dash movement | **Fixed, refined in Round 3** | Turn movement gains a typed, persistent grant ledger. Dash and commanded Flee append current-Speed multipliers; every mid-turn refresh recomputes them from effective Speed, preserves actual `spent`, and suppresses without deleting grants while Speed is 0. Named witnesses cover one/two Dashes, commanded Flee, speed-effect increases/reductions, and overlapping Grapples. |
| B2 reposition policy was not specified | **Fixed** | The roadmap now freezes actor/hostile budgets, four exact purpose predicates, three bounded formulas, overlap/deduplication rules, candidate selection, cross-option ranking, and fixed tie-breaks. Each purpose has a hand-derived positive fixture and an isolated benefit-removal control. |
| B3 `441/2500` was not an execution oracle | **Fixed** | The Grapple witness now fixes the board, positions, visibility, action inventory, reducer paths, escape tree, successor positions, and exact per-branch values. It proves escape is the target-maximizing response and keeps Grapple mechanically legal in the no-useful-approach control. |
| S1 movement mutations were paired with the wrong tests | **Fixed** | Omitting Grappled removal refresh is killed by the start-Grappled witness; clamping/resetting `spent` is killed by the move-before-Grapple witness. Grant loss has separate Dash/Flee mutations. |
| S2 Slice 5 omitted capacity enforcement and source ownership | **Fixed** | Slice 5 now includes `src/combat/encounter.ts`, including the `addEquippedItem` seam, and names the only production facts that may resolve anatomy and occupancy: explicitly authored statblock/content-pack anatomy and explicitly supplied encounter equipment marked complete. All omissions remain unknown. |
| S3 held-out harness overclaimed complete limits/outcomes | **Fixed** | Slice 17 freezes 60 rounds/8,000 reducer steps, exact terminal categories, unresolved limit handling, and the initial-roster terminal monster-HP fraction with summons excluded. |
| S4 capsule hashing citation overstated the digest body | **Fixed** | The verified-facts row now states that strict decoding validates `generatedAt`, but both `digest` and `generatedAt` are excluded from the digest body at `src/vtt/engine-state-capsule.ts:630-632`. |

## Decision and completion boundary

This is the one fresh roadmap required by D587.8. It replaces the three shelved plans rather than amending them. It delivers these engine-owned capabilities:

1. Help/Ready: `help_attack` and the deliberately narrow `ready_attack` contingency.
2. Grapple/Shove: `unarmed_grapple`, `unarmed_shove_prone`, and, after the displacement seam exists, `unarmed_shove_push`.
3. Repositioning: `retreat_to_cover`, `kite_to_range`, `disperse`, and `fall_back_bottleneck` bundles made from existing actions and engine-authored movement.

D597's discovery-to-tuning loop is the organizing purpose of these families: Help and Ready add cooperative and delayed-response plays; Grapple and Shove add typed control and displacement branches; reposition offers turn legal attacks, defenses, and movement into retreat, kite, disperse, and bottleneck plays. Together they widen the engine-authored menu in rooms with a discoverable better play, Sol searches that menu to establish the better-play witness, and Luna is then tuned to find the same revision-bound option IDs under the D406/D474/D456 model policy. Sol and Luna may ignore advice, plays, and scores; neither creates mechanics or submits an action, and no family bypasses the proposer-only boundary.

Every option is generated from canonical state and bound to its revision. The AI DM and players submit only offered option IDs. Targets, trigger identity, action identity, save profiles, dice, DCs, damage, destinations, paths, opportunity-attack ordering, and reducer commands are never submission fields. Re-resolution regenerates and validates all mechanics immediately before execution. Advice, plays, scores, response traces, and projected continuations are drafts; none auto-submits another actor's action.

The project remains proposer-only. D405.3 remains flywheel-only. D406's Luna-low floor, D474's Luna-high escalation, and D456's 180-second live wall do not change. No DM semantic export may reach a player channel. `src/vtt/intel/contracts.ts` is frozen and must remain byte-identical at SHA-256 `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.

Implementation may land behind disabled family policies. No family becomes the production default until its legality, ranking, cumulative contract, mutation controls, and D586.5 held-out gate pass. If a qualifying pre-design ordinary-room manifest is unavailable, code may be reviewed with the family disabled, but activation is blocked; no retrospective split may be relabelled held-out.

## Verified current facts

All references below were inspected on the declared base before this file was written.

| Fact relied on | Current local evidence |
|---|---|
| The current main-use union has attack, multiattack, save, spell, world-object and basic action variants, but none of the roadmap variants. | `src/vtt/turn-proposal.ts:112-174` |
| Resolved mechanics currently contain an engine-owned path and ordered resolved slots. | `src/vtt/turn-proposal.ts:187-220` |
| Standard main declarations, including stationary Disengage and nearest-visible-enemy Dash, are constructed together. | `src/vtt/turn-option-registry.ts:330-423` |
| The option ID hashes revision plus the complete canonical option body. | `src/vtt/turn-option-registry.ts:587-604` |
| Standard main/bonus composition and classification happen in the registry; classification can hide stationary Disengage. | `src/vtt/turn-option-registry.ts:753-837`; `src/vtt/option-modeling.ts:200-243` |
| Resolver rechecks actor type/life, action slots, each use, movement and targets. | `src/vtt/intent-resolver.ts:447-545` |
| Current attack execution spends an ordinary action before later target/cover checks; OA execution has separate Reaction/reach rules. | `src/combat/encounter.ts:7090-7175` |
| A non-dead target, including dying or stable, remains attackable. | `src/combat/encounter.ts:7148-7149` |
| Ready must coexist with several pending-decision consumers, which currently assume reaction offers are OAs. | `src/combat/encounter.ts:568-632`; `src/vtt/encounter-projections.ts:188-207`; `src/vtt/reaction-guidance.ts:57-90`; `src/vtt/session-persistence.ts:742-783`; `src/vtt/mcp/engine-server.ts:950-975` |
| Start-turn commanded behavior and death-save queueing are independent today. | `src/combat/encounter.ts:6285-6323` |
| Death saves require `dying`, 0 HP and the sourced death-save rule, not `living`. | `src/combat/encounter.ts:3559-3574` |
| Effect removal refreshes movement only for movement-modifier and Slow payloads, and clamps recorded spent movement to the reduced Speed. | `src/combat/encounter.ts:1801-1812,2994-3051` |
| Turn movement currently has no grant provenance; Dash and commanded Flee each add current effective Speed directly to `speed` and `remaining`, while spell speed/mode refreshes rewrite those fields independently. | `src/combat/movement.ts:412-436`; `src/combat/encounter.ts:6238-6250,10675-10751,12465-12480` |
| Successful generic escape removes the effect after spending the action, but currently has no Grappled-specific movement restoration. | `src/combat/encounter.ts:12412-12462` |
| Existing escape payloads can use arbitrary sourced Ability/Skill pairs. | `src/combat/effects.ts:1361-1408` |
| Current skill calculation includes active flat `skill_modifier` effects but defaults an absent base to zero. | `src/combat/encounter.ts:1729-1741` |
| Equipment says what manufactured items occupy; it does not establish anatomy or whether an imported current equipment record is complete. | `src/combat/equipment.ts:21-36`; `src/combat/encounter.ts:1697-1725` |
| Grappled already contributes Speed 0, attack Disadvantage against non-source targets, and drag cost. | `src/combat/conditions.ts:230-241,521-528` |
| Movement search retains one predecessor, treats the origin as a valid zero-cost goal, and trusts the movement world's traversal/endability rules. | `src/combat/movement.ts:145-220,250-303` |
| Attack range and Total Cover are evaluated from an explicit source origin in the query port. | `src/vtt/engine-query-port.ts:1180-1229` |
| Reference PCs expose weapon, Sacred Flame, and Shatter commands, but Sacred Flame is bound to the training monster constant. | `src/vtt/reference-encounter.ts:174-272` |
| Loaded party members retain attacks/spells and their execution provider enumerates live legal actions. | `src/vtt/party-pack.ts:1265-1329,3173-3260` |
| Production engine-default selection first projects the requested monster to a planning turn, then asks for the opportunity report. | `tools/ai-dm-conversation.ts:1160-1185`; projection at `src/vtt/monster-planning-state.ts:30-70` |
| A generated fixture is written directly from `generateRoom`; it is not pre-projected for each actor. | `tools/generate-arena-basis.ts:66-79` |
| The current capsule is strict schema 3. Its decoder validates canonical `generatedAt`, then excludes both `digest` and `generatedAt` from the recomputed digest body. | `src/vtt/engine-state-capsule.ts:191-203,588-632` (exclusion at `:630-632`) |
| MCP constructs the canonical query/resolver dependencies in-process and reloads a launcher fixture out-of-process. | `src/vtt/mcp/entrypoint.ts:224-269,390-419,797-858` |
| Current outcome attack sequences reuse one unchanged projected state, and movement credit caps at one Speed. | `src/vtt/intel/option-outcome.ts:914-952,1238-1267` |
| Current candidacy prefers offense/approach before dominance; the ranking tuple is numeric and subtractive. | `src/vtt/intel/opportunity-cost.ts:225-246,268-306` |
| There are 36 direct symbol consumers of the offer/resolution/default APIs under `src`, `tools`, and `tests`; this is a seed, not a substitute for an import graph. | Local `rg -l` inventory made before planning; the implementation contract recomputes the AST closure. |

Round-3 planning verification was read-only and did not invoke a test runner or model:

- `nl -ba docs/srd/full/srd-5.2.1.txt | sed -n '779,786p;901,956p;11589,11600p;11634,11645p;11693,11729p;11745,11764p;11970,12024p;12243,12290p' > /tmp/offers-r3-srd-citations.txt` produced 248 inspected lines and confirmed every SRD range cited below.
- `npx vite-node --config /tmp/offers-r3-vite.config.ts /tmp/offers-r3-geometry.ts` called the current `traceTerrainLine` and `affectedCells`: the five non-cover retreat endpoints plus the origin were `none`, `(3,0)` and `(4,0)` were `half`; radius-5 joint-center counts at disperse actor columns `3,2,1,0` were `6,4,2,0`, and radius 15 retained 8 centers at column 0.
- `npx vite-node --config /tmp/offers-r3-vite.config.ts /tmp/offers-r3-paths.ts` called current `findPath` and returned the seven retreat paths/costs printed in the witness: `5,5,5,10,10,15,15` feet.
- A read-only Node exact-enumeration script produced movement capacities/remaining `60/50`, `90/80`, `30/20`, `80/70`, and `0/0`; Grapple values `1/10,13/50,57/125,147/500,441/2500`; and attack weights `25/400,336/400,39/400`, EV `33/20`, pressure `3/40`. A second reach enumeration gave start/farthest distances `5/185`, zero reach departures at 200, and a departure under the 5-foot mutant.
- `rg` inventory recorded 79 `TurnMovement`/constructor/use references and 57 checked-in JSON fixtures with the pre-ledger movement triplet. The direct TypeScript required-field closure is two production literals plus seven test constructor/assertion files; raw-state ingress is allocated separately below.
- The four Git inventories were each 0 at HEAD `eb77885440ef658e093a4cff1288d25c053a7c09`; `git diff --check` was clean; the frozen contract hash matched `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.

OFFERS-PLAN-02 round-1 added only read-only planning probes:

- `npx vite-node --config /tmp/offers-plan02-vite.config.ts /tmp/offers-plan02-geometry.ts` exited 0 against the real `encounterMovementWorld`, `adjacentCells`, and `gridDistance`. It printed this complete bounded enumeration; paths omit the hostile origin, and `attackPaths` contains every simple legal path of at most 20 feet whose endable endpoint is within the stated reach of ally `(4,0)`:

```text
blocker-candidates:origin=(2,1),budget=5,anchor=(0,0),originDistance=10ft
blockerSeesHostile=true
paths=(1,0):[(1,0)]/5ft/rejected_approach | (2,0):[(2,0)]/5ft/permitted | (3,0):[(3,0)]/5ft/permitted
before:blocker@(2,1),reach=5
reachable=(0,0):0ft,(1,0):5ft,(2,0):10ft,(3,0):15ft
attackPaths=(1,0)->(2,0)->(3,0) / 15ft
candidate-nonbeneficial:blocker@(2,0),reach=5
reachable=(0,0):0ft,(1,0):5ft,(2,1):10ft,(3,0):15ft
attackPaths=(1,0)->(2,1)->(3,0) / 15ft
positive:blocker@(3,0),reach=5
reachable=(0,0):0ft,(1,0):5ft,(2,0):10ft,(2,1):10ft
attackPaths=<none>
gate-counterfactual:blocker-removed,reach=5
reachable=(0,0):0ft,(1,0):5ft,(2,0):10ft,(2,1):10ft,(3,0):15ft
attackPaths=(1,0)->(2,0)->(2,1)->(3,0) / 20ft | (1,0)->(2,0)->(3,0) / 15ft | (1,0)->(2,1)->(2,0)->(3,0) / 20ft | (1,0)->(2,1)->(3,0) / 15ft
negative-control:blocker@(3,0),reach=10
reachable=(0,0):0ft,(1,0):5ft,(2,0):10ft,(2,1):10ft
attackPaths=(1,0)->(2,0) / 10ft | (1,0)->(2,0)->(2,1) / 15ft | (1,0)->(2,1) / 10ft | (1,0)->(2,1)->(2,0) / 15ft
```

- A read-only recursive JSON inventory found exactly 57 checked-in files containing pre-ledger `speed/spent/remaining` turn movement: 413 occurrences of `{0,0,0}`, one of `{30,0,30}`, four of `{30,30,0}`, and zero boosted-capacity occurrences. `node -e` arithmetic reproduced the capacity component for one Dash `{60,10,50}` and two Dashes `{90,10,80}`. Round 2 corrects the commanded-Flee boundary to exhausted `{60,60,0}` and requires recomputation to keep its remaining movement at 0.

OFFERS-PLAN-02 round 2 added one read-only reducer probe and otherwise relied on the cited production paths:

- `npx vite-node --config /tmp/offers-plan02-vite.config.ts /tmp/offers-plan02-migration-writers.ts` exited 0 after casting imported spells through the real reducer. Starting from `{speed:30,spent:0,remaining:30}`, `speed_modification` +10 printed `{"speed":40,"spent":0,"remaining":50}` and a fixed fly-60 `movement_mode` printed `{"speed":60,"spent":0,"remaining":90}`. Both are accepted legacy outputs under the migration contract below; neither is normalized or rejected as corrupt input.

OFFERS-PLAN-02 round 3 added only read-only inventory/control-flow checks. `rg` over `replaySessionRevisions` and its helpers found the complete reducer-backed transition set: `reducer_applied` calls `reduceSessionEncounter`, while `turn_skipped` and `turn_delayed` call `advanceSkippedTurn`/`advanceDelayedTurn`, both reaching `reduceEncounter(...end_turn...)`. A recursive `node` object walk reproduced exactly 57 checked-in pre-ledger JSON fixtures: 56 arena states (12 base, 10 brutal, 10 brutal-b, 13 hard, 9 LoS/cover, one Hypnotic Pattern, one room-8 reproduction) and one `vtt-session-revisions` bundle. No test runner or fixture writer was invoked.

## SRD 5.2.1 contract

These are the only D&D rules this roadmap asserts. Tactical valuation choices beyond them are explicitly versioned engine policy.

| Rule | Repository source |
|---|---|
| A turn permits movement and one action in either order. | `docs/srd/full/srd-5.2.1.txt:779-786` |
| An attack chooses a target within range; cover and Advantage/Disadvantage are determined before resolution. | `docs/srd/full/srd-5.2.1.txt:901-918` |
| Melee attacks use reach; ordinary reach is 5 feet unless a rule says otherwise. | `docs/srd/full/srd-5.2.1.txt:919-930`; glossary `:11982-11984` |
| Half and Three-Quarters Cover affect AC and Dexterity saves; Total Cover prevents direct targeting. | `docs/srd/full/srd-5.2.1.txt:923-954` |
| A visible creature leaving reach provokes a Reaction melee attack immediately before it leaves; Disengage, teleport, and qualifying forced movement avoid it. | `docs/srd/full/srd-5.2.1.txt:933-956` |
| Dash adds current modified Speed for this turn. | `docs/srd/full/srd-5.2.1.txt:11589-11600` |
| Disengage prevents OAs for the rest of the turn; Dodge's attack/save benefits last until the next turn start and end early on Incapacitated or Speed 0. | `docs/srd/full/srd-5.2.1.txt:11634-11645` |
| Grappled sets Speed to 0, penalizes attacks against non-grapplers, and defines drag/carry cost. | `docs/srd/full/srd-5.2.1.txt:11693-11702` |
| One grasping part binds one creature; escape is an action using Strength (Athletics) or Dexterity (Acrobatics); Incapacitation, excess range, or release ends the grapple. | `docs/srd/full/srd-5.2.1.txt:11704-11729` |
| Help's attack mode distracts an enemy within 5 feet, grants Advantage to the next allied attack against it, and expires at helper turn start. | `docs/srd/full/srd-5.2.1.txt:11745-11764` |
| Prone costs half Speed, rounded down, to end and changes attacks based on 5-foot proximity. | `docs/srd/full/srd-5.2.1.txt:11970-11981` |
| Ready spends the action, binds a perceivable circumstance and response, and permits taking or ignoring the Reaction after the trigger finishes before source turn start. Readied spells pay now and require Concentration; spells are excluded here. | `docs/srd/full/srd-5.2.1.txt:11985-12024` |
| Unarmed Strike targets within 5 feet. Grapple uses the target's choice of Strength/Dexterity save, DC `8 + Strength modifier + PB`, maximum one size larger, and a free hand. Shove uses the same save/DC/size rule and chooses a 5-foot push or Prone. | `docs/srd/full/srd-5.2.1.txt:12243-12290` |

The SRD does not say that administrative Dodge expiry is perceptible. `visible_target_stops_dodging-v1` is therefore an explicit engine/GM adjudication: only an actual, visible `dodging: true -> false` transition at the target's turn-start boundary qualifies. It is never presented as quoted SRD law.

## End-state architecture: composition, not inheritance

Create a shared `src/vtt/offers/offer-envelope.ts` and one capability interface. There is no offer base class and no subclassing:

```ts
export type EngineOfferBinding =
  | { readonly kind: 'standard'; readonly actionSlots: readonly EngineActionSlotUse[] }
  | { readonly kind: 'help_attack'; readonly targetId: CombatantId }
  | { readonly kind: 'ready_attack'; readonly actionId: EngineActionId;
      readonly targetId: CombatantId; readonly trigger: 'visible_target_stops_dodging-v1' }
  | { readonly kind: 'unarmed_control'; readonly maneuver:
      'unarmed_grapple' | 'unarmed_shove_prone' | 'unarmed_shove_push';
      readonly targetId: CombatantId; readonly displacementId: EngineDisplacementId | null }
  | { readonly kind: 'reposition'; readonly candidateId: EngineRepositionCandidateId;
      readonly purpose: EngineRepositionPurpose; readonly phases: EngineActionPhases;
      readonly benefits: EngineRepositionBenefitVector };

export interface EngineOfferEnvelope<B extends EngineOfferBinding = EngineOfferBinding> {
  readonly actorId: CombatantId;
  readonly revision: number;
  readonly label: string;
  readonly binding: B;
  readonly movement: EngineMovementObjective;
  readonly resourceCostLabels: readonly string[];
  readonly omittedRiders: readonly EngineOmittedRider[];
  readonly activationChoice: EngineActivationChoiceSlot | null;
}

export interface EngineOfferCapability<B extends EngineOfferBinding> {
  readonly kind: B['kind'];
  generate(context: OfferGenerationContext): readonly EngineOfferEnvelope<B>[];
  resolve(context: OfferResolutionContext, offer: EngineOfferEnvelope<B>): OfferResolution;
  execute(context: OfferExecutionContext, mechanics: ResolvedOfferMechanics<B>): void;
  evaluate(context: OfferEvaluationContext, mechanics: ResolvedOfferMechanics<B>): OptionOutcomeEvaluation;
}
```

Each module exports a composed object implementing that interface: `standard-offer-generator.ts`, `help-offer-generator.ts`, `ready-offer-generator.ts`, `grapple-offer-generator.ts`, and `reposition-offer-generator.ts`. Each has its own contract test. `offer-generator-registry.ts` is the only registration point. It contains a literal tuple of complete capabilities; adding generation without resolve/execute/evaluate is a compile error. A family module can exist unregistered while being developed, but registration occurs only in the same slice as its production ranking and execution integration. This is the atomic offers-with-ranking rule.

The in-memory standard envelope uses the `standard` binding, but `canonicalOfferBody` deliberately projects it to the existing flat `movement/actionSlots/resourceCostLabels/omittedRiders/activationChoice` body before hashing or rendering. Special capabilities serialize their closed binding. This makes the compositional runtime uniform without silently changing incumbent standard option IDs.

`EngineOptionEnvironment` is an immutable constructor-injected value containing canonical queries, family policy, and the party-threat binding. All production offer, resolver, round-session, projection, and default-selection paths receive the same instance. The environment digest enters the strict capsule/launcher boundary for non-legacy policies. Legacy standard option bodies omit the new binding field, retaining existing standard option IDs byte-for-byte. There is no permanent defaulted environment, singleton policy, compatibility adapter, or inference from a caller's label.

The migration to this service is completed before any new capability is registered. A temporary branch-local parallel call surface may exist only inside the migration tranche so slices compile; it is deleted at tranche completion and never ships or protects an old external interface.

## Combat and evaluation contracts

### Help

The reducer command is `{type:'help_attack', actor, target}` only. It validates active/living/on-board actor, Action availability, hostility, living/non-dead on-board target, and minimum footprint distance at most 5 feet before spending the Action. It applies a source-start, one-shot attack-roll-mode effect whose typed predicate requires target membership, `attacker !== helper`, and `combatantsAreAllies(attacker, helper)`. The first qualifying allied roll consumes it hit or miss. Self, hostile, wrong-target, and non-attack activity do not.

`scheduledLivingTurnsBeforeNextTurn` lives under `src/combat`, consumes active index/round/living state and `initiativeBeforeDelays`, reconstructs delayed-order restoration, skips dead entries, and stops before the helper. Help ranking is deliberately narrow: it runs the real reducer through `help_attack` and `end_turn` only when the immediately next living scheduled actor is an allied monster and no actor/decision/RNG boundary intervenes. It then values the first qualifying attack in that ally's actual direct-only default sequence. A threaded attack-sequence projection consumes Help after component one even on a miss. Any intervening actor, unexpected boundary, target loss, unsupported target switch, or model deviation is unresolved rather than guessed.

### Ready

Ready is limited to a resource-free standalone monster attack against a visible, currently Dodging hostile, with the versioned visible-Dodge-end trigger. Declaration spends the Action and stores a reducer-owned `ReadiedAttack`; acceptance re-finds and rechecks actor, target, action identity, life, board presence, incapacitation, hostility, sight, Total Cover, tactical range, Reaction, and absence of resource/choice/pending-decision behavior. Reaction is spent only after all checks pass. Readied execution uses the shared attack core but skips ordinary Action/sequence spending and OA-only reach/disable rules. It retains current range, cover, roll-mode, damage, rider, concentration, and event behavior.

Turn start is split into boundary work, Ready collection, and `resumeTurnStart`. While queued Ready decisions exist, a reducer-entry guard accepts only their `resolve_pending_decision` commands. After the final decision, the continuation is cleared exactly once and the post-response state is reread:

- boundary/current identity is checked without requiring `living`;
- commanded behavior runs only if the actor is now living, on-board, and not Incapacitated;
- `queueDeathSave` is invoked independently under its existing `dying`/0-HP/uses-death-saves predicate;
- dead, absent, removed, or concluded boundaries only clear the suspension and cannot run a stale tail.

Thus a readied hit that makes the entering PC `dying` still queues the death save, while a response that leaves the actor living but Incapacitated suppresses commanded behavior. Ordinary dying turns remain unchanged. Multiple Ready decisions drain deterministically by branded ID, and the turn tail runs once after all resolve. Accept, decline, failed recheck, source expiry/removal/incapacitation, and target death/removal all clean records and decisions idempotently; failed paths never spend Reaction.

Ready records and suspension are DM-only. Player projection removes Ready decision/event semantics even when combatants are otherwise visible. Attended hosts ask. Unattended algorithm hosts accept this already-authored contingency. It is not added to standing player reaction guidance or preferences.

### Grapple, Shove, escape, and movement restoration

Source facts are typed. `GraspingPartCapability` is `known(parts)` or `unknown(reason)`; `CombatantEquipment` independently records `knowledge:'complete'|'unknown'`. Generic Grapple requires both known anatomy and complete occupancy. Empty manufactured equipment never proves either. Existing statblock Grappled riders may identify a part; an absent part becomes `unknown_part`, never a guessed hand. Equipment mutations and grapple application share one reservation lens in both directions.

The save path uses one complete reducer-owned distribution profile for planning and execution. It includes sourced save bonuses, cover, Exhaustion, Slow, effect dice, roll-defense flat/dice/modes and consumption, automatic failure, and Legendary Resistance. The target chooses the better current Strength/Dexterity save; ties choose Strength. Both full profiles and the selected profile are retained, and execution consumes the selected profile rather than reconstructing it. Unsupported components are typed unresolved and suppress/refuse before resource spending or RNG.

Escape is a discriminated contract, not a two-method rewrite of all escapes:

```ts
export type EffectEscapeCheck =
  | { readonly kind: 'sourced_single'; readonly choiceId: string;
      readonly ability: Ability; readonly skill: Skill; readonly dc: DifficultyClass;
      readonly cost: 'action' }
  | { readonly kind: 'grapple'; readonly choices: readonly [
      { readonly method:'strength_athletics'; readonly ability:'strength'; readonly skill:'Athletics' },
      { readonly method:'dexterity_acrobatics'; readonly ability:'dexterity'; readonly skill:'Acrobatics' }
    ]; readonly dc: DifficultyClass; readonly cost:'action' };
```

Existing non-Grapple Intelligence/Arcana and other authored escapes stay `sourced_single` and executable. Grappled effects receive both SRD choices regardless of whether generic Grapple or a statblock attack created them. The escape profile requires sourced skill evidence, then explicitly adds live flat `skill_modifier` effects plus the other check modifiers. It never inherits `effectiveSkillModifier`'s absent-base `?? 0` fallback. Optional modifier subsets maximize immediate success, then conserve effects on ties and order by effect ID; success and failure successors both consume the selected effects.

Movement restoration is based on provenance, not the lossy current `speed` field. Extend `TurnMovement` (`src/combat/movement.ts:412-436`) with a turn-local grant ledger:

```ts
export type TurnMovementGrant =
  | { readonly id: TurnMovementGrantId; readonly source: 'dash'; readonly speedMultipliers: 1 }
  | { readonly id: TurnMovementGrantId; readonly source: 'command_flee'; readonly speedMultipliers: 1 }
  | { readonly id: TurnMovementGrantId; readonly source: 'legacy_unresolved'; readonly speedMultipliers: 1 };
export type TurnMovementGrantProvenance =
  | { readonly kind: 'known' }
  | { readonly kind: 'legacy_unresolved'; readonly inference:
      'corroborated_legacy_events' | 'legacy_writer_drift' | 'indeterminate';
      readonly observedSpeed: Feet; readonly observedSpent: Feet; readonly observedRemaining: Feet };
export interface TurnMovement {
  readonly speed: Feet;
  readonly spent: Feet;
  readonly remaining: Feet;
  readonly grants: readonly TurnMovementGrant[];
  readonly grantProvenance: TurnMovementGrantProvenance;
  readonly exhaustion: 'spendable' | 'exhausted';
}
```

Each grant records one additional current-Speed multiplier, not a captured number of feet. This follows the SRD rule and its explicit reduced-Speed example: Dash's increase equals Speed after modifiers, so Speed 15 plus one Dash is 30 total, not 45 (`docs/srd/full/srd-5.2.1.txt:11589-11600`). Fresh `dash` and `command_flee` source discriminants are reducer-authored and never reconstructed from an action label. The third source is migration-only and explicitly says that old bytes proved a multiplier but not its source. `startTurnMovement` clears grants, returns `grantProvenance:{kind:'known'}`, and sets `exhaustion:'spendable'`. `spendMovement` requires `spendable` and retains provenance/exhaustion. `exhaustTurnMovement` sets `exhaustion:'exhausted'`, `spent=current.speed`, and `remaining=0`. Both current grant writers at `src/combat/encounter.ts:6238-6250,12465-12480` call one `grantTurnMovement` helper, so two Dash grants are two independently branded rows rather than a collapsed Boolean. Every current mid-turn movement writer—effect application/removal, movement-mode and speed-modification operations, Grappled application/removal, and commanded-resource exhaustion—calls one recomputation/exhaustion helper instead of replacing the triplet itself.

The recomputation is exact for known or corroborated ledgers. Let `B = effectiveSpeed(state, actor)` and `M = sum(grant.speedMultipliers)`. Set `usableCapacity = B * (1 + M)`, retain `spent = current.spent` byte-for-value even when it exceeds that capacity, set `speed = usableCapacity`, and set `remaining = 0` when `exhaustion==='exhausted'`, otherwise `max(0, usableCapacity - spent)`. Grappled's canonical `speed_zero` clause makes `B=0`, so grants remain stored but temporarily produce 0; ending one of several Grapples leaves `B=0`, while ending the last re-derives every multiplier from restored Speed (`docs/srd/full/srd-5.2.1.txt:11693-11702`). Later ordinary Speed reductions and increases re-derive both base and granted movement without reopening an exhausted commanded turn. A future movement-grant source must add a closed `TurnMovementGrant` variant and thereby receives exhaustive refresh/persistence coverage; no raw `speed +=` writer remains.

Required reducer witnesses are: start the turn Grappled, escape, observe `{speed:30,spent:0,remaining:30,grants:[],grantProvenance:{kind:'known'},exhaustion:'spendable'}`, then move 5 feet; Dash at Speed 30, move 10 feet, become Grappled, release, and observe `{speed:60,spent:10,remaining:50}` with the same grant ID, known provenance, and spendable status; take two Dashes, move 10 feet, Grapple/release, and restore `{speed:90,spent:10,remaining:80}` with two rows; apply two overlapping Grapples after Dash and prove ending only one stays `{speed:0,spent:10,remaining:0}` while ending the last restores 50; after Dash and 10 feet spent, reduce Speed `30->15` and prove `{speed:30,spent:10,remaining:20}`, then remove the reduction and restore `{60,10,50}`; after Dash and 10 feet spent, increase Speed `30->40` and prove `{80,10,70}`, then remove the increase and restore `{60,10,50}`; and acquire commanded Flee's grant and complete its commanded movement, observe `{speed:60,spent:60,remaining:0,exhaustion:'exhausted'}`, then apply/remove the same +10 effect and prove exact triplets `{80,60,0}` and `{60,60,0}` with the same grant ID. These cover Grappled restoration, the SRD's reduction case, increases, commanded exhaustion, and every existing non-Grapple grant/refresh path identified at `src/combat/encounter.ts:1801-1812,2994-3051,6179-6190,6238-6267,10675-10751,12465-12480`.

Pre-ledger migration is intentionally narrower than fresh reducer provenance. It first verifies the original format's hash/fingerprint, then structurally validates `speed`, `spent`, and `remaining` only as finite non-negative feet. Arithmetic inconsistency is classification evidence, not corruption: it never rejects solely because `remaining !== max(0,speed-spent)` or `spent > speed`. For the active combatant, it finds that actor's latest canonical `turn_started` event and requires every `eventLog` sequence from that event through `nextEventSequence - 1` to be present exactly once and strictly increasing; only that closed segment is complete. It counts subsequent historical grant-writer `resource_spent` events using the two exact old reducer literals, `Dash` and `Command: Flee by the fastest available means`; these strings are accepted only as migration evidence and are centralized beside the migrator. Any gap, duplicate, out-of-order event, actor mismatch, or other movement-capacity writer makes the segment uncorroborated. Let the corroborated count be `E`, canonical current `effectiveSpeed` be `B`, and observed capacity be `S`. When `S = B * (1 + E)` and the observed triplet is canonical for either spendable movement or Flee exhaustion, migration creates exactly `E` deterministically branded `legacy_unresolved` multiplier rows keyed by event sequence and records `inference:'corroborated_legacy_events'`. It sets `exhaustion:'exhausted'` only when the same segment contains commanded Flee and the boundary state is `{speed:S,spent:S,remaining:0}`; otherwise exhaustion is spendable. It never converts either historical string to a fresh `dash` or `command_flee` source. Thus one Dash carries `{60,10,50}` with one row, two Dashes carry `{90,10,80}` with two rows, and commanded Flee carries the realizable `{60,60,0}` with one row plus exhaustion. With `B=0`, a complete one-event history still carries one suppressed multiplier because history supplies the count even though capacity arithmetic alone cannot.

Legacy speed/mode writer drift has its own accepted disposition. The current reducer can emit `{40,0,50}` after applying +10 Speed and `{60,0,90}` after granting fixed fly 60 to a Speed-30 active actor because application refreshes once and the operation wrapper then adjusts `remaining` again. Migration retains each triplet byte-for-value, adds no grant, sets `exhaustion:'spendable'`, and records `inference:'legacy_writer_drift'` with the observed fields. These states import successfully at all four raw-state boundaries. Because the bytes do not establish a safe spendable capacity, controller-originated movement spending, grants, movement-refresh commands, and offer/evaluation paths remain typed unresolved for the rest of that old turn; the migrator does not clamp, repair, or call them malformed. Reducer-internal lifecycle refresh is governed by the byte-preserving rule below. Negative/non-finite fields remain malformed and are rejected.

The lossy boundary is explicit. A legacy payload cannot recover authoritative Dash-versus-Flee source provenance or original grant IDs. If its current-turn event segment is absent/truncated, contains an unrecognized writer, or disagrees with the observed capacity, it cannot safely recover the multiplier count; it also cannot resurrect a grant already erased without historical evidence. Every inactive combatant's grant count/source is unresolved because its historical turn base is not recoverable: a structurally valid arithmetic-drift shape retains `inference:'legacy_writer_drift'`, while every other inactive triplet receives `inference:'indeterminate'`. In indeterminate cases migration retains the observed triplet byte-for-value in memory, sets `grantProvenance:{kind:'legacy_unresolved',inference:'indeterminate',...}`, creates no guessed rows, and derives exhaustion only from a complete commanded-Flee segment.

Fail-closed refusal is an authority-boundary rule, not a reducer-lifecycle deadlock. Every controller-originated command that would spend movement, grant movement, or cause a movement-capacity refresh performs an unresolved-provenance preflight before any resource, RNG, event, effect, or state mutation; offer/evaluation paths likewise exclude the row. Reducer-internal refreshes caused by boundary expiry, concentration/effect cleanup, or another already-authorized lifecycle operation never refuse. If provenance is `legacy_writer_drift` or `indeterminate`, that internal refresh carries the entire `TurnMovement` object byte-for-byte—including numeric triplet, empty grants, provenance, and exhaustion—while the effect/event lifecycle continues; it does not recompute or clear uncertain movement. This is safe because it creates no spendable movement, unresolved actors remain excluded from movement-sensitive controller paths, and `beginIncomingTurnMovement` replaces the expired ledger before that actor can act again. Known and `corroborated_legacy_events` ledgers still recompute normally. Every refresh callsite supplies a closed cause (`controller`, `boundary_start`, `boundary_end`, or `reducer_internal`); no default cause exists.

Incoming-turn recovery remains before any incoming boundary callback. Immediately after `startTurn` assigns `activeCombatant` and `round`, `beginIncomingTurnMovement` replaces the entire expired prior-turn ledger with `grants:[]`, `grantProvenance:{kind:'known'}`, and `exhaustion:'spendable'` while temporarily retaining the observed numeric triplet. It runs before `revertExpiredWildShapes`, legendary refresh, and `processBoundary`; therefore an expiring movement effect may call `endEffects -> refreshActiveTurnMovement` against known empty provenance. The later existing `startTurnMovement(effectiveSpeed)` remains the authoritative zero-spent reset. The existing incoming witness imports an inactive `{40,0,50}` drift actor with a +10 effect expiring at its next start and finishes known at `{30,0,30}`. The new outgoing witness imports that actor while active, with the +10 effect expiring at its current turn end, then executes `end_turn`: `processBoundary(...,'end')` removes the effect, internal refresh carries the unresolved `{40,0,50}` unchanged without refusal, `turn_ended` is emitted, and the next actor starts at known `{30,0,30}`. A parallel missing-history case carries an `indeterminate` triplet. Export/reimport must replay that newly appended unmarked transition exactly; moving incoming invalidation below `processBoundary`, refusing the outgoing internal refresh, recomputing it to `{30,0,30}`, or making the carried bytes controller-spendable must fail.

Saved-session journals retain complete equality by replaying historical numbers under their historical numeric contract rather than omitting drift fields from comparison. VTT session schema 13 adds required revision field `movementLedgerReplay: {kind:'preledger_v1'; numericSemantics:'legacy_v12'} | null`; new revisions write `null`. After verifying every legacy revision checksum and bundle fingerprint, the v12-to-v13 migration walks revisions parent-before-child, migrates each snapshot, places that marker on every pre-ledger revision, recomputes branch fingerprints/checksums/bundle fingerprint, and preserves commands/events/RNG. The compatibility mode is justified solely as a read-only verifier for user-authored historical journals: it is checksum-selected, cannot be submitted as a command/model field, is never used for a new revision, and preserves stronger full-state replay evidence than ignoring selected fields.

`legacy_v12` is a closed numeric truth table copied from the cited v12 reducer behavior, not a second general rules engine. It (1) starts a turn at `{B,0,B}`; (2) spends path movement by adding cost to `spent` and subtracting it from `remaining`; (3) implements Dash and commanded Flee by adding current `B` directly to `speed` and `remaining`, with Flee's final exhaustion `{speed:S,spent:S,remaining:0}`; (4) refreshes after effect application/removal to `{speed:B,spent:min(oldSpent,B),remaining:B-min(oldSpent,B)}`, intentionally forgetting prior extra movement; and (5) after a `movement_mode` or `speed_modification` spell's application refresh, performs the old wrapper adjustment `{speed:nextB,spent:refreshedSpent,remaining:max(0,refreshedRemaining+nextB-priorB)}`. Thus the linked +10 writer replays `{30,0,30}->{40,0,40}->{40,0,50}`, and fixed fly 60 replays `{30,0,30}->{60,0,60}->{60,0,90}`. An exhaustive switch and mutation tests cover all five arms; current/unmarked replay uses only the new ledger recomputation.

One `replayReducerBackedTransition` seam owns the complete closed union `reducer_applied | turn_skipped | turn_delayed`; adding another reducer-backed transition without an arm must fail compilation. For a marked child it passes `legacy_v12` into `reduceSessionEncounter`, `advanceSkippedTurn`, or `advanceDelayedTurn` (the latter two pass it through their shared `end_turn` reducer call). After the complete transition, `canonicalizePreledgerReplayMovement` canonicalizes every combatant from the replayed state's marker-independent `eventLog`, active actor, effective Speed, and observed triplet: it deterministically relabels fresh grant rows to `legacy_unresolved`, assigns event-sequence IDs/provenance/exhaustion, and gives inactive or uncorroborated actors the same unresolved disposition as snapshot migration. It changes no numeric movement or non-movement field and never reads the expected snapshot. Only then do the existing full `requireCanonicalEqual` state checks and exact transition-event, command-derived, pacing-index, coordinator, party, and RNG checks run unchanged. Unmarked revisions use current numeric semantics and no legacy canonicalization; export retains historical markers, while revisions appended after import are unmarked.

Five checked-in genuine v12 journals exercise this contract. The existing three-revision Dash journal is pre-Dash -> Dash -> move 10, ending `{60,10,50}`. Separate linked spell journals contain a parent at `{30,0,30}` and the actual `reducer_applied` +10-Speed or fixed-fly-60 command child ending `{40,0,50}` or `{60,0,90}`. Separate marked pacing journals contain a `turn_skipped` child and a `turn_delayed` child; each asserts exact initiative indices, outgoing inactive provenance, newly entering active provenance, events, coordinator, and RNG as well as movement. Every journal runs `importSavedSession -> exportSavedSession` (first full replay) -> import into a new store -> `exportSavedSession` (second full replay), with byte-identical schema-13 exports and exact revision/marker/state/command/event/RNG assertions. A current-numeric substitution must fail both writer journals; omitting canonicalization from either pacing arm must fail its journal. Mutations to any other state field, triplet, multiplier count, command, event, pacing index, or RNG must still fail. Replay equality is neither weakened nor provenance-blind.

A checked-in explicit corpus manifest also covers all 57 pre-existing legacy fixtures found before this plan: the exact 56 arena grouping and one saved-session bundle listed in round-3 verification. The migration test asserts the discovered sorted set equals that manifest, imports every applicable state without mutating source bytes, preserves every one of the 418 numeric triplets, and requires a typed ledger disposition for each. Every reducer-backed revision present in a manifested journal is replayed; non-journal arenas are not falsely described as replayable. The five linked journals then supply command-bearing coverage for every legacy numeric arm and all three reducer-backed transition kinds. Neither the corpus manifest nor the ten new fixtures is generated from migration output; the writer triplets are independently pinned by the old formulas and the reproduced real-reducer probe.

Standing is reducer-owned, costs `floor(effective Speed / 2)`, requires positive Speed and sufficient remaining movement, and removes Prone. All relocation commits and relevant life/condition changes reconcile bound Grapples immediately, including nested movement, teleport, forced movement, and out-and-back paths.

Shove-Prone uses the same complete save profile. Shove-push is registered only after the displacement capability exists: it carries an opaque `EngineDisplacementId`; the engine regenerates the exactly 5-foot away destination, validates footprint/endability, and executes forced movement through canonical OA rules. No coordinate or path is in the offer or submission.

### Corrected Grapple recurrence

Delete the old `33/80` oracle. It is not an implementation target because it omitted movement after escape and charged an invented full action-equivalent.

The replacement response evaluator executes each reachable response on cloned state through the reducer. At each of three target turns it compares represented non-control fight/stay actions with each legal `escape -> remaining ordinary movement` continuation. It evaluates the same-turn successor after the action is spent and the Grappled effect/movement budget has actually changed, then recurs from the resulting state. Baseline and conditioned values use the same represented action/movement evaluator. Unknown actions, nested decisions, or unsupported transitions are unresolved; signed allied changes are never clipped.

The exact positive fixture is a 45-by-1 open row of 5-foot cells. The known-two-hand/complete-empty-equipment grappler is at `(1,0)`, the Speed-30 target is at `(2,0)`, and a stationary ally of the grappler is at `(42,0)`. The grappler has a canonical long-duration Invisible effect and no Truesight on the target; assertions require `target -> grappler` visibility false, `grappler -> target` visibility true, and `target -> distant enemy` visibility true before valuation. Thus the adjacent grappler is not Dash's `nearest_visible_enemy`; the distant creature is. This directly exercises the current Dash anchor at `src/vtt/turn-option-registry.ts:413-418` and the origin-goal terminal at `src/combat/movement.ts:187-198`.

The grappler's explicitly authored ordinary OA reach is 200 feet, although its named direct attack and Unarmed Strike remain reach 5. The farthest listed target endpoint is `(38,0)`, 185 feet from the grappler at `(1,0)`, so no edge in any baseline, success, or later-Dash successor leaves OA reach. Each reducer path independently asserts an empty OA-trigger list, no `opportunity_attack` pending decision, and no reaction-offer event. Mutating only OA reach to 5 feet must reproduce the pending window. This is the exact suppression condition required by the SRD trigger—an OA occurs when a visible creature leaves reach—and by the reducer's sight/disable gate at `src/combat/encounter.ts:4897-4907` (`docs/srd/full/srd-5.2.1.txt:949-956`).

The target has complete Strength/Athletics and Dexterity/Acrobatics evidence at +0 and exactly one represented, sight-required 5-foot melee attack. That attack has no legal target: the grappler is unseen and the distant enemy remains more than one ordinary movement plus reach away throughout the horizon, so the evaluator records its exclusion rather than assigning it a zero-valued legal row. The complete legal response inventory while Grappled is therefore Strength escape, Dexterity escape, Dash, Dodge, Disengage, and End Turn. There is no bonus action, resource action, area, reaction movement, or pending choice. Dash while Grappled grants 0 and moves 0; Dodge, Disengage, and End Turn contribute 0 now and leave the same Grappled state for the next horizon. On escape success, the reducer removes Grappled, recomputes movement, spends no movement, and the response then follows the unique open-row 30-foot path from `(2,0)` to `(8,0)`. On failure it stays at `(2,0)` with movement 0. A satisfied/absent goal is never credited.

Without Grapple, the three baseline Dash paths are `(2,0)->(14,0)`, `(14,0)->(26,0)`, and `(26,0)->(38,0)`, each 60 feet and each worth the existing capped `1/4` movement credit at `src/vtt/intel/option-outcome.ts:1238-1267`. After escape success, the current ordinary path `(2,0)->(8,0)` and later Dash paths `(8,0)->(20,0)` and `(20,0)->(32,0)` each travel at least one full Speed and are also exactly `1/4`; no value is inferred merely from positive Speed.

Initial DC-13 Grapple failure is `q=12/20=3/5`. Either +0 escape succeeds on faces 13-20, so `p=8/20=2/5`, failure/persistence is `r=3/5`, and the equal-method tie chooses Strength under the fixed engine policy. Let `U_h=h/4` be the target's remaining ungrappled positional value and `E_0=0`. The reducer-derived escape branch is `E_h=p*U_h+r*E_(h-1)`:

| Horizon entering at `(2,0)` | Escape-success branch | Escape-failure branch | Exact escape value | Best non-escape value |
|---|---|---|---|---|
| 1 | `(8,0)`, current `1/4`, then terminal | `(2,0)`, current `0`, then terminal | `E1=(2/5)(1/4)=1/10` | `E0=0` |
| 2 | `(8,0)`, current `1/4`; next Dash to `(20,0)`, `1/4` | `(2,0)`, current `0`; successor `E1=1/10` | `E2=(2/5)(1/2)+(3/5)(1/10)=13/50` | `E1=1/10` |
| 3 | `(8,0)`, current `1/4`; later Dashes to `(20,0)` and `(32,0)`, `1/2` | `(2,0)`, current `0`; successor `E2=13/50` | `E3=(2/5)(3/4)+(3/5)(13/50)=57/125` | `E2=13/50` |

Escape strictly maximizes the target's represented value at every horizon; the table also pins every successor position. The source-side control benefit is baseline `U3=3/4` minus the target-maximizing conditioned value `E3=57/125`, weighted by initial application probability:

```text
q * (U3 - E3)
= (3/5) * (3/4 - 57/125)
= (3/5) * (147/500)
= 441/2500
```

The grappler's separate direct attack is fully pinned: action-specific melee reach 5, attack bonus +5 against target AC 11, critical floor 20, one `1d4-1` damage term with reducer clamping at 0, target HP 22, no damage response, and Advantage because the target cannot see the Invisible attacker. Advantage gives miss weight `25/400`, noncritical-hit weight `336/400`, and critical weight `39/400`. Normal damage mean is `(0+1+2+3)/4=3/2`; critical damage mean is `2d4-1=4`. Expected damage is `(336/400)(3/2)+(39/400)(4)=33/20`; no outcome reaches 22 HP, so pressure is `(33/20)/22=3/40`. Thus `441/2500` wins without a label-derived value.

The isolated benefit-removal control removes only the distant visible enemy. The grappler remains adjacent, can still see the target, and retains its free part, complete occupancy, action, DC, save/escape chances, target size, OA reach and exact `3/40` attack; consequently Grapple is still generated and reducer-legal. The target sees no enemy, its Dash goal is absent, and both baseline and every post-escape movement continuation are exact 0, so `positionControlFollowup=0` and the direct attack wins. Separate modifier-sensitive recurrence tests prove consumed effects change later response choices.

### Repositioning

`PartyActionCapabilities` pairs the exact `TurnLegalActions` provider used for party execution with a serializable threat catalog derived from the same source. Reference and loaded attacks, save effects, and areas have bidirectional catalog/command correspondence. Unsupported or absent source facts remain typed unresolved and add no credit. The training-brute-specific reference target is generalized to sorted living hostiles.

`HostileThreatInventory` explicitly retains `attackerId`, `origin`, and the attacker's footprint at that origin along with represented effects and unresolved reasons. `hostileDirectAccess` and `hostileJointAreaAccess` consume that explicit context; they cannot infer it from effect IDs or object identity. Contract controls reuse the same effect at different origins and with different attacker footprints.

Constrained Dijkstra evaluates the origin even at Speed 0, rejects hazard/OA edges unless Disengage occurs before movement, and retains enough predecessor state to find a safe equal/longer path rather than discarding it behind one cheaper unsafe predecessor. Every endpoint and hostile reply uses canonical footprints, terrain, endability, LoS, cover, range, and reach. Candidate movement starts from the actor's actual remaining budget. A declared Dash adds the reducer-authored grant; a declared Disengage or bonus Disengage must be phased before the first otherwise-provoking edge. Dodge and ranged attacks may be after movement; a ranged attack may be before movement only if legal at the origin. End Turn bundles are excluded. A nonempty path and an endable footprint are mandatory.

The global non-approach constraint applies to every reposition purpose, not only retreat. At generation origin, form `nearestVisibleEnemies` from every living hostile the actor can currently see whose minimum canonical footprint distance equals the least such distance; retain the complete Combatant-ID-sorted tie set rather than choosing one ID. For every path edge `u -> v` and every member `n` of that frozen set, require `footprintDistance(v,n) >= footprintDistance(u,n)`. Equality is allowed, but getting closer to any tied nearest enemy rejects the complete path. The anchor identities and origin distances enter the candidate digest and are recomputed on re-resolution. If no living hostile is visible, generation returns typed reason `no_visible_enemy_anchor` and emits no reposition candidate; absence never makes the predicate vacuously true. Tests cover two equidistant enemies where moving away from one approaches the other, stable ID ordering of the full tie set, and an empty visible set.

Hostile replies are a bounded access envelope, not predicted hostile behavior. For each living non-Incapacitated hostile, `projectFutureCombatantTurn` refreshes its own turn resources, retains live effects/resources, and searches origins reachable with exactly one effective-Speed budget. The origin is always included, so Speed 0 still evaluates in-range melee/ranged effects. The envelope does not spend or assume Dash, Bonus Action movement, teleportation, or reactions. At each origin it enumerates only catalog effects whose action/resource/targeting prerequisites are represented at that projected turn, using the hostile's footprint at that origin. Direct effects use canonical range/reach, visibility and cover; areas use canonical placement range, shape and affected cells. Any absent member, unsupported effect, or unsupported range/area operation is typed unresolved and contributes zero rather than a guessed denial.

For an actor origin `o` and candidate endpoint `e`, compute these finite sets from identical hostile reply envelopes:

- `D = {h | h has at least one direct effect against actor at o and none at e}`.
- `A = {(h,a) | a is a living ally other than actor, h can directly affect a before actor occupies e, cannot afterward, and the only changed state is actor path/endpoint occupancy}`.
- `J = {(h,effectId) | one represented area effect can jointly include actor and at least one living ally at o, but cannot jointly include actor at e and any of those same allies}`. One area effect is counted once regardless of how many centers or allies witnessed it.
- For each hostile retaining a direct reply at both positions, `cover(h,x)` is the minimum protective rank chosen by that hostile across all still-legal direct replies/origins, with `none=0`, `half=1`, `three_quarters=2`. Total Cover/no delivery is excluded from this function and belongs to `D`. If any retained reply is cover-insensitive, or its save is not Dexterity, its rank is 0. Define `C_h=max(0,cover(h,e)-cover(h,o))`; a hostile with no comparable retained effect has `C_h=0`.

The offered `EngineRepositionBenefitVector` contains exact quarter-action integers:

```text
endpointSurvivalValue       = min(4, sum_h C_h)
enemyAccessDenied           = min(4, 2 * |A|)
retaliationAndAreaExposure  = min(4, 2 * |D| + 2 * |J|)
```

Set membership is the overlap rule: multiple origins/centers for the same fact never multiply credit, while loss of a direct effect and loss of a distinct area effect may each contribute before the cap. `A` excludes the actor, `D` contains only the actor, and cover excludes lost or cover-insensitive delivery, so the three formulas do not relabel one fact. Half and Three-Quarters Cover are credited only for represented attack rolls or Dexterity saves, exactly the defenses stated at `docs/srd/full/srd-5.2.1.txt:921-954`; a retained Wisdom-save threat forces that hostile's cover rank to 0.

The four purposes have closed eligibility and primary benefit predicates:

1. `retreat_to_cover`: `endpointSurvivalValue>0`, at least one `C_h>0`, and every path edge satisfies the global non-approach constraint against the frozen nearest-visible enemy. Primary benefit is `endpointSurvivalValue`.
2. `kite_to_range`: the bundle retains an engine-resolved ranged attack against the same target at its declared before/after phase; distance from the actor's frozen nearest visible enemy increases by at least 5 feet; and `D` is nonempty. Primary benefit is `min(4,2*|D|)`; separation gain is a predicate/tie-break, not extra action-equivalent credit.
3. `disperse`: distance from at least one ally named by a pre-move joint-area witness increases, and `J` is nonempty. Primary benefit is `min(4,2*|J|)`.
4. `fall_back_bottleneck`: `A` is nonempty and every credited `(h,a)` passes a gate counterfactual: with all state held at the after-state except actor's endpoint footprint made traversable/non-occupying, hostile access to `a` returns. Primary benefit is `enemyAccessDenied`; this excludes denials caused by an unrelated expiring effect or missing resource.

Define `P` as the purpose's primary benefit above and `S` as kite separation gain, disperse minimum separation gain from its witnessed allies, or 0 for retreat/bottleneck. Enumerate candidate rows in canonical declaration-digest then path-cell order. Within each purpose choose the minimum under this explicit total key: `[-P, -resolvedBaseAttackExpectedDamageMilli, -endpointSurvivalValue, -enemyAccessDenied, -retaliationAndAreaExposure, -S, resourceLabelCount, movementCostFeet, declarationDigest, destinationRow, destinationColumn, pathRowColumnSequence]`. Numeric coordinates are finite integers/exact rationals and string/path coordinates use lexical order. If one declaration/path wins multiple purposes, expose only one copy: larger `P` wins, then fixed purpose order `retreat_to_cover`, `kite_to_range`, `disperse`, `fall_back_bottleneck`. The revision, selected purpose, declaration body/digest, complete path, destination, phases, vector, and threat-environment digest all enter the opaque candidate ID; resolution regenerates them.

Reposition outcome adds `(endpointSurvivalValue + enemyAccessDenied + retaliationAndAreaExposure)/4` exact action-equivalents and gives reposition Dash no legacy approach credit. A mechanically valid candidate enters productive candidacy only through its positive purpose predicate. Expanded Pareto dominance compares net value and all three benefit coordinates. Its exact resolved total key is `[-netActionEquivalents, -endpointSurvivalValue, -enemyAccessDenied, -retaliationAndAreaExposure, ...underlyingLegacyTuple, resourceLabelCount, optionId]`; rational coordinates compare by cross multiplication and the underlying tuple is derived from the declared standard action bundle. Thus reposition receives no new class priority. Unresolved rows use the shared finite status tag before that key. If no purpose-positive row survives, execute the byte-identical legacy candidacy, dominance, tuple, and IDs.

The four policy witnesses are complete finite searches. Every creature is Small/Medium with a one-cell footprint, all named creatures have unobstructed mutual sight unless a fixture says otherwise, every unmentioned cell is ordinary open terrain, and every unmentioned action/resource/effect is absent. Distances and movement costs use the engine's 5-foot grid; the current movement world charges 5 feet per entered ordinary cell (`src/combat/encounter-movement-world.ts:95-140`). The candidate tests enumerate all endable nonempty paths, apply the global constraint, then compare every surviving row with the frozen total key rather than asking only whether a favored endpoint exists.

1. **Retreat whole search.** Use a 5-by-2 board with only `(2,0)` blocked. Archer `h` is at `(0,0)`, Speed 0, reach 5, and has exactly one sight-required AC attack with normal/long range 60/120. Actor `r` is at `(1,1)`, Speed 15, reach 5, and has only main Disengage phased before movement. The complete canonical endpoint/path table is `(0,1): [(0,1)]/5`, `(1,0):[(1,0)]/5`, `(2,1):[(2,1)]/5`, `(3,0):[(2,1),(3,0)]/10`, `(3,1):[(2,1),(3,1)]/10`, `(4,0):[(2,1),(3,0),(4,0)]/15`, and `(4,1):[(2,1),(3,0),(4,1)]/15`; listed cells are path cells after the origin. Paths toward or through `h`, the blocked cell, and the empty origin path are excluded. Row-major neighbor/predecessor order is current engine policy at `src/combat/grid.ts:40-68` and `src/combat/movement.ts:163-220`. Because `h` has Speed 0, its hostile origin envelope is exactly `{(0,0)}`. The same attack remains deliverable at origin and every endpoint, so `D=A=J={}`. The canonical terrain traces from `(0,0)` are `none` at the actor origin and at `(0,1),(1,0),(2,1),(3,1),(4,1)`, and `half` at `(3,0),(4,0)`. Therefore only `(3,0)` and `(4,0)` have vector `(1,0,0)` and `P=1`; equal declaration/base/vector coordinates make movement cost select `(3,0)` at 10 feet as the whole-search winner. Its outcome adds `1/4`, so it beats the otherwise-zero stationary Disengage declaration. The isolated control changes only the represented attack's defense from an AC attack roll to a Wisdom save while keeping source, range, path set, and legality; cover rank is then 0 at every endpoint, all vectors are `(0,0,0)`, and the entire search emits no retreat row.

2. **Kite whole search.** Use a 7-by-1 open board. Speed-0 hostile `h` at `(3,0)` has reach 5 and exactly one 5-foot melee attack. Speed-10 actor `k` at `(4,0)` has reach 5, a normal/long 60/120 ranged attack against `h`, and bonus Disengage phased before movement. Occupancy and global non-approach leave exactly `(5,0)` at cost 5 and `(6,0)` at cost 10; column 7 does not exist. The actor attack is legal after movement at both endpoints. The hostile envelope is origin-only, direct access is true at the actor origin and false at separations 10 and 15, so each row has `D={h}`, `A=J={}`, vector `(0,0,2)`, and `P=2`. With every earlier key coordinate tied, separation `S=10` selects `(6,0)` over `S=5` as the whole-search winner; its outcome is the same ranged attack plus `2/4`. The isolated control changes only `h`'s melee reach/range to 15. Direct access then remains true at both permitted endpoints, `D={}` everywhere, and no kite row exists.

3. **Disperse whole search.** Use a 10-by-1 open board. Speed-0 caster `h` at `(9,0)` has reach 5 and exactly one range-60, 5-foot-radius sphere effect; it has no direct effect. Actor `d` at `(3,0)` has Speed 15, reach 5, and only Dodge after movement. Its Speed-30, reach-5 ally `a` at `(4,0)` has no attack. Global non-approach leaves exactly the path prefixes `(3,0)->(2,0)` (5 feet), `->(1,0)` (10), and `->(0,0)` (15). For radius 5, the complete snapped joint-center sets for `(d,a)` are respectively six centers at actor origin—feet `(15,0),(15,5),(20,0),(20,5),(25,0),(25,5)`—four at `(2,0)`, two at `(1,0)`, and none at `(0,0)`. Boundary-touch inclusion is intentional engine policy at `src/combat/templates.ts:721-728`. Thus the first two endpoints have `J={}`, while `(0,0)` alone has `J={(h,effect)}`, vector `(0,0,2)`, and `P=2`; it is the only purpose-positive row and whole-search winner, adding `2/4` over stationary Dodge. The isolated control changes only radius 5 to radius 15. At `(0,0)` the joint-center set is still eight centers—feet `(5,0),(5,5),(10,0),(10,5),(15,0),(15,5),(20,0),(20,5)`—and every nearer endpoint also retains a joint center, so `J={}` across the complete search and no disperse row exists.

4. **Bottleneck whole search.** Use a 5-by-2 board whose movement-only blocked regions contain `(0,1),(1,1),(3,1),(4,1)`; these are not opaque `blockedCells`, so `b` still sees the frozen anchor `h`. Hostile `h` at `(0,0)` has Speed 20, ordinary OA reach 5, `reactionAvailable:false`, and exactly one melee attack whose attack-specific reach is 5. Actor `b` at `(2,1)` has Speed 5, ordinary OA reach 5, `reactionAvailable:false`, and only Dodge after movement. Speed-30, ordinary-OA-reach-5 ally `a` at `(4,0)` has `reactionAvailable:false` and no attack. The actor origin is 10 feet from `h`. Its exact adjacent path table is `(1,0):[(1,0)]/5`, rejected because it approaches to 5 feet; `(2,0):[(2,0)]/5`, permitted at equal distance 10; and `(3,0):[(3,0)]/5`, permitted at distance 15. All row-1 alternatives are movement-blocked or the origin, so these are complete. Before movement, `h` has reachable set `{(0,0):0,(1,0):5,(2,0):10,(3,0):15}` and the sole attack-specific-reach-5 path is `(0,0)->(1,0)->(2,0)->(3,0)`, attacking `a` at 5 feet. If `b` chooses `(2,0)`, the vacated alcove still permits exactly `(0,0)->(1,0)->(2,1)->(3,0)` for 15 feet, so that candidate has `A={}`. If `b` chooses the gate `(3,0)`, `h`'s complete reachable set is `{(0,0):0,(1,0):5,(2,0):10,(2,1):10}` and exact attack-specific-reach-5 path enumeration is empty: the vacated `(2,1)` alcove is 10 feet from `a`, and movement-only wall `(3,1)` plus occupied gate `(3,0)` prevents re-entry to an attacking origin. Removing only `b`'s endpoint occupancy restores reachable `(3,0)` and exactly four simple attack paths within 20 feet: `(1,0)->(2,0)->(3,0)`/15, `(1,0)->(2,1)->(3,0)`/15, `(1,0)->(2,0)->(2,1)->(3,0)`/20, and `(1,0)->(2,1)->(2,0)->(3,0)`/20. Therefore only `(3,0)` has `A={(h,a)}`, `D=J={}`, vector `(0,2,0)`, and `P=2`; it is the whole-search winner and adds `2/4` over stationary Dodge. The isolated negative control changes only `h`'s attack-specific reach from 5 to 10; ordinary OA reach stays 5 and every `reactionAvailable` remains false. Candidate topology, movement budget, walls, action phase, and both actor paths are identical, but from occupied-gate state the exact attack paths are `(1,0)->(2,0)`/10, `(1,0)->(2,1)`/10, `(1,0)->(2,0)->(2,1)`/15, and `(1,0)->(2,1)->(2,0)`/15; `A={}` for every permitted candidate and no bottleneck row exists. A wrong hostile budget of 10 instead of 20 still kills the positive pre-move access and remains the budget mutation; changing only ordinary OA reach to 10 while making Reaction available must produce the independent OA-window control, without altering the attack-specific access oracle. The positive witness separately pins the sole shortest access path at 15.

Each positive test asserts the complete permitted endpoint/path table, hostile origin envelope, access/cover/area booleans, exact set keys, vector, selected purpose, total-key winner, and opportunity-report default. Each control retains the same legal declaration and every positive fixture's candidate topology except for the single stated defense/reach/radius/bypass input; it proves the named purpose benefit is absent across the whole permitted search, so a missing offer cannot be attributed to inspecting only the former winner.

### Ranking shared by all new families

Outcome values stay exact rationals. Setup options (Help/Ready), position control, and repositioning join productive candidacy and Pareto dominance; no family is appended as a late tuple-only preference. Direct/direct ordering remains the exact incumbent order when no positive new-family evidence exists.

Replace non-finite sentinels and subtractive equality with a tagged comparator. Resolved exact terms compare by cross multiplication; unresolved setup values sort behind resolved setup values without `Infinity` or `NaN`. All remaining numeric coordinates pass `finiteRankCoordinate`. The comparator checks equality before subtraction and tests antisymmetry/transitivity over mixed direct/resolved/unresolved keys.

Help value is the first-consumer follow-up swing minus the best resolved direct alternative cost. Ready compares the same attack now against the engine-projected attack immediately after the visible Dodge transition and subtracts the direct alternative cost; it reserves one Reaction. An independent persistent Disadvantage that survives Dodge expiry makes Ready's timing gain exactly zero. Direct attack wins an otherwise exact tie because Ready carries `reaction:reserved`.

## Disposition of every shelved-plan finding

### Help/Ready

| Prior finding | Disposition in this roadmap |
|---|---|
| Help future state was synthetic/undefined. | **Resolved:** real reducer projection, immediate-next-ally scope, boundary/RNG refusal, and threaded first-roll consumption. |
| Ready attack execution seam was absent. | **Resolved:** dedicated readied execution context shares attack resolution but not ordinary Action or OA spending/rules. |
| Perceivable trigger was asserted without proof. | **Resolved:** visible Dodge transition is a versioned engine adjudication, explicitly not an SRD claim. |
| Initiative scheduling failed under delayed restoration. | **Resolved:** combat-owned scheduler reconstructs `initiativeBeforeDelays`; a delayed helper-next fixture must return no consumer and prove real expiry. |
| Help selected a maximum later ally/attack. | **Resolved:** only the immediate ally's direct default and its first qualifying attack can consume forecast value. |
| Setup tuple changed incumbent direct ordering. | **Resolved:** tagged exact prefix is neutral for direct/direct comparisons; the existing counterexample remains pinned. |
| Ready benefit controls did not isolate timing/Reaction. | **Resolved:** independent persistent Disadvantage removes timing only; a separate exact tie toggles only `reaction:reserved`. |
| Pending union broke deferred consumers. | **Resolved:** reaction-decision accessors are extracted first and all consumers migrate before the Ready union widens. |
| Empty maxima and placeholder types were undefined. | **Resolved:** empty direct alternative cost is exact zero; an unresolved productive alternative makes setup unresolved; all bindings are closed discriminated types. |
| Ready state lifecycle was incomplete. | **Resolved:** accept/decline/moot/source expiry/source loss/target loss table is executable and idempotent; no failed path spends Reaction. |
| Non-finite sentinel made self-comparison invalid. | **Resolved:** exact tagged comparator contains no non-finite values and is checked pairwise/triplewise. |
| Promotion harness profile, limits, RNG, and outcome mapping were underspecified. | **Resolved:** Slice 17 is model-free, shares production actor preparation, uses manifest-bound policies/RNG/limits, rejects incomplete pairs, and reports exact family telemetry. |
| Final blocker: living-only continuation skipped death saves. | **Resolved:** continuation checks boundary identity, conditions commanded behavior, and independently queues death saves from post-response state. |
| Final should-fix: incapacitation was not recomputed. | **Resolved:** post-response life, board presence, and conditions are reread immediately before commanded behavior. |
| Promotion seed provenance was not pre-design. | **No longer applicable to implementation; still activation-blocking:** this plan claims no old seed provenance. Only a supervisor-supplied immutable pre-design D586.5 manifest can activate defaults. |

### Grapple/Shove

| Prior finding | Disposition in this roadmap |
|---|---|
| Planner save probability omitted reducer modifiers. | **Resolved:** one complete typed save distribution feeds both offer/evaluation and reducer execution. |
| Attack resource spending occurred before refusal checks. | **Resolved:** actor/target/control/save/application checks are read-only; spend and RNG occur only after all pass. |
| Controls incorrectly narrowed targets to living. | **Resolved:** actor must be living; target uses the current non-dead attack predicate, with dying/stable regression witnesses. |
| Equipment was treated as anatomy/free-hand proof. | **Resolved:** sourced grasping parts and independent occupancy knowledge are mandatory; unknowns remain unresolved. |
| Reservations worked only one way. | **Resolved:** grapple and equipment mutations share one capacity lens; known non-hand parts and unknown active parts remain distinct. |
| Grapple reconciliation looked only at final command state. | **Resolved:** every atomic relocation/life/condition commit reconciles immediately; out-and-back cannot restore a broken grapple. |
| Escape skill absence silently became zero/save bonus. | **Resolved:** sourced complete skill evidence is required; no fallback is reused. |
| Optional escape modifier choice could diverge from execution. | **Resolved:** one immediate-success/conserve-ties profile supplies IDs to both evaluation and execution; every successor consumes them. |
| Active flat skill modifiers were omitted. | **Resolved:** `skill_modifier` effects are an explicit profile term layered on a required sourced base. |
| Existing statblock Grapples exposed only Strength/Athletics. | **Resolved:** every Grappled effect gets both general SRD methods unless a future sourced exception uses a distinct type. |
| Non-Grapple escapes would be relabelled or lost. | **Resolved:** `sourced_single` preserves arbitrary Ability/Skill contracts; the Grapple branch is additive. |
| Monk/Dexterity activation required unsupported equipment assumptions. | **No longer applicable:** this roadmap makes no Monk or Dexterous Attacks claim and offers controls only for engine-owned monsters with the SRD Strength DC. A future PC-offer slice must first add typed Monk-weapon/armor/Shield evidence. |
| Standing was valued but not executable. | **Resolved:** reducer-owned half-Speed standing is implemented before Shove ranking. |
| Already-conditioned/immunity cases could reserve a hand. | **Resolved:** application preview distinguishes would-apply from ineffective; only a newly applied source-bound Grapple reserves. |
| Signed allied Prone losses were clipped. | **Resolved:** nearby and ranged deltas are signed; the 3-near/4-far negative witness remains required. |
| Old `33/80` recurrence omitted restored movement and invented a full action cost. | **Resolved:** deleted as an oracle; reducer-executed escape-then-move recurrence derives `441/2500` in the corrected fixture. |
| Final blocker: successful escape left movement at zero. | **Resolved:** Grappled application/removal enters the common movement recomputation; actual spend and every typed turn-local movement grant survive suppression/restoration. |
| Save-profile evidence exposed only the selected ability. | **Resolved:** both full ability profiles/outcomes plus selected profile are retained. |
| Import discovery ignored dynamic/type/tool edges. | **Resolved:** the D584.4 AST graph walks static export/import, dynamic `import()`, import type, import-equals, `src`, `tools`, and `tests`. |
| Offers/ranking activation could split. | **Resolved:** a complete capability object is registered atomically only after reducer and evaluator contracts pass. |
| Push/drag dependency was deferred to a sibling plan. | **Resolved for push:** this combined roadmap builds the displacement seam before registering Shove-push. Drag/carry offers remain explicitly out of scope; existing Grappled drag mechanics are preserved. |
| Held-out manifest was absent. | **No longer applicable to implementation; still activation-blocking:** disabled implementation does not claim promotion. Activation waits for supervisor-owned pre-design evidence. |

### Repositioning

| Prior finding | Disposition in this roadmap |
|---|---|
| Main Disengage was unavailable before classification. | **Resolved:** declaration generation is extracted below classification; reposition consumes declarations, not only offerable standard options. |
| One predecessor per endpoint discarded safe routes. | **Resolved:** constrained search includes safety in traversal state before predecessor dominance; safe equal/longer controls are mandatory. |
| PC hostile reach had no canonical source. | **Resolved:** execution provider and serializable threat catalog are paired from one reference/loaded source. |
| Speed 0 was treated as no threat access. | **Resolved:** origin is always evaluated; only additional origins disappear. In-range attacks remain represented. |
| Reposition offers could exist without ranking. | **Resolved:** registration requires complete resolve/execute/evaluate capability and occurs in one atomic slice. |
| Policy was not propagated through every path. | **Resolved:** immutable environment is constructor-injected through resolver/session/MCP/projection/default selection and bound by capsule/launcher digest. |
| Cover credit ignored effect applicability. | **Resolved:** credit requires the same deliverable attack-roll or Dexterity-save effect; Wisdom-save control earns zero. |
| Slice 1 depended on an environment type deferred to Slice 2. | **Resolved:** environment/catalog contracts land before hostile-access or candidate modules import them. No earlier slice names a later type. |
| Hostile inventory lost attacker/origin context. | **Resolved:** inventory carries attacker ID, origin, and footprint explicitly; same-effect/different-origin and different-footprint controls fail if dropped. |
| Default gate evaluated raw fixtures rather than production planning state. | **Resolved:** the runner and eligibility calculation call the same actor preparation used by production, after manifest-required initiative preparation. |
| Composition extraction remained owned by its consumer registry. | **Resolved:** shared declarations live below both standard and reposition generators; classification is a separate consumer. |
| Existing composition pins lacked an exhaustive preservation ledger. | **Resolved:** the ledger below is a mandatory seed and the implementation graph adds every newly discovered pin with a line/reason. |
| Cumulative commands named tests before their slices created them. | **Resolved:** each slice has a distinct seed addition; only files present by that slice enter its cumulative union. |
| Legacy tuple/no-positive behavior could regress. | **Resolved:** byte-stable legacy branch and seed controls run whenever no positive candidate exists. |

## Existing pinned-test preservation ledger

These assertions stay at their current consumer boundary; extraction tests supplement rather than replace them. The implementation inventory must add line-specific rows for every additional pin discovered by the AST closure.

| Existing assertion | Preservation reason |
|---|---|
| `tests/unit/vtt/composite-turn-proposals.test.ts:95-119` | Hidden IDs and forged brands remain unselectable. |
| `tests/unit/vtt/composite-turn-proposals.test.ts:121-132` | Requested generated monsters still receive fresh planning turns. |
| `tests/unit/vtt/composite-turn-proposals.test.ts:134-154` | Multiattack retains its complete main-action sequence and executes every component. |
| `tests/unit/vtt/composite-turn-proposals.test.ts:156-193` | Movement, repeated main effects, bonus spell, and resource spend compose in order. |
| `tests/unit/vtt/composite-turn-proposals.test.ts:195-232` | Utility actions spend the right slot; Dash precedes movement. |
| `tests/unit/vtt/composite-turn-proposals.test.ts:234-279` | Spent actions/bonus actions and exhausted pools never become declarations. |
| `tests/unit/vtt/composite-turn-proposals.test.ts:281-315` | One illegal multiattack component invalidates the whole combination. |
| `tests/unit/vtt/composite-turn-proposals.test.ts:317-359` | World-object eligibility survives extraction and DM override commands stay hidden. |
| `tests/unit/vtt/composite-turn-proposals.test.ts:361-385` | Projection and MCP retain complete standard sequences. |
| `tests/unit/vtt/mixed-kind-multiattack.test.ts:69-100` | Exact mixed-kind combinations and standalone suppression remain independently pinned. |
| `tests/unit/vtt/option-outcome.test.ts:19-25` | Exact normal/Advantage/Disadvantage face weights remain canonical. |
| `tests/unit/vtt/option-outcome.test.ts:69-103` | Existing hard-control ledger/output remains an independent oracle, never regenerated from new output. |
| `tests/unit/vtt/engine-opportunity-movement-intel.test.ts:65-108` | Frozen Room-8 option/default behavior remains the legacy control. |
| `tests/unit/tools/engine-mcp-handler.test.ts:1095-1103` | Generated context schema remains derived from the live handler schema. |

No art, atlas, context, capture, room, raw-output, or oracle pin may be regenerated from this implementation's output. If a retained pin must move, stop unless the same change adds an independent hand-derived invariant and the handoff lists it.

## Ordered implementation slices

Every listed count is the maximum set of files intentionally modified/created by that slice; reverse-import consumer tests may run without being edited. Each slice ends at a rollback point and remains disabled unless its registration is explicitly listed.

### Slice 1 — standard-offer composition kernel (10 files)

Files: new `src/vtt/offers/{offer-envelope,offer-declarations,offer-generator-registry,standard-offer-generator}.ts`; modify `src/vtt/{turn-proposal,turn-option-registry,option-modeling,intent-resolver}.ts`; new `tests/unit/vtt/standard-offer-generator.test.ts`; modify `tests/unit/vtt/composite-turn-proposals.test.ts`.

Extract declaration generation below classification, preserve legacy option bodies/IDs, and make the registry a literal composed capability tuple with only the standard capability registered. Do not introduce a base class.

Acceptance/mutation targets:

- `standard generator preserves every legacy option body and id` — changing the envelope's absent standard binding to a serialized `kind:'standard'` value must fail.
- `declaration extraction preserves End Turn plus bonus ordering` — changing phase order from terminal-first to movement-first must fail.
- `standard generator capability remains standard` — changing its capability-kind literal from `standard` to `help_attack` must fail the structural rule.

Rollback: revert the kernel/extraction as one unit; no new discriminant or policy is live.

### Slice 2 — immutable environment and process binding (10 files)

Files: new `src/vtt/offers/{offer-environment,party-threat-catalog}.ts`; modify `src/vtt/{engine-state-capsule,engine-round-session,engine-query-port}.ts`, `src/vtt/mcp/entrypoint.ts`, `src/vtt/dm-encounter-host.ts`, `tools/ai-dm-conversation.ts`; modify `tests/unit/vtt/engine-state-capsule.test.ts`; new `tests/unit/vtt/offer-environment.test.ts`.

Add strict family-policy/catalog/binding digests and capsule schema 4 with no compatibility arm. Begin constructor injection. Legacy mode has an explicit immutable legacy/unrepresented binding, never an implicit missing value. No special capability is registered.

Acceptance/mutation targets:

- `capsule and launcher bind the exact offer environment digest` — swapping one policy literal while retaining the old digest must fail.
- `external MCP reconstructs the same immutable environment` — replacing the launcher catalog with an equal-sized different catalog must fail digest validation.
- `legacy standard ids remain unchanged under explicit legacy environment` — hashing the environment into a standard option must fail.

Rollback: schema/process binding returns to schema 3; standard kernel remains usable.

### Slice 3 — environment migration and old-surface removal (at most 10 files per sub-slice)

This is one non-dispatchable migration tranche split into 3A/3B/3C solely to keep each review unit at ten files. 3A migrates `intent-resolver`, `engine-round-session`, `offered-option-paths`, `encounter-board-projection`, `plan-materiality`, `speculative-planning`, `intel/opportunity-cost`, `intel/team-scorer`, MCP server and entrypoint. 3B migrates the first ten affected tests from the AST-sorted consumer list. 3C migrates the remaining production/tools/tests in batches of at most ten, then deletes the temporary parallel call surface. No compatibility overload/default survives 3C, and no new family can be registered until 3C is complete.

Acceptance/mutation targets:

- `resolver fallback reuses the primary environment instance` — replacing only fallback with legacy environment must fail.
- `board path and round execution share environment digest` — replacing board projection's instance with an equal query port/different policy must fail.
- `all offer API consumers use their bound environment` — changing one migrated call's value to the explicit legacy environment must fail its environment-identity assertion.

Rollback: each sub-slice reverts only its direct callers; rollback of the whole tranche returns to Slice 2. Registration stays standard-only throughout.

### Slice 4 — canonical D20/save/check profiles (9 files)

Files: new `src/combat/d20-outcomes.ts`; modify `src/combat/{saving-throw-outcomes,resolution,encounter,effects,combatant}.ts`; new `tests/unit/combat/control-check-profiles.test.ts`; modify `tests/unit/combat/resolution.test.ts`, `tests/unit/vtt/roll-defense-modifiers.test.ts`.

Extract exact dice convolution and the complete saving-throw/escape resolution profiles. Preserve `sourced_single` escapes. Profile unsupported mechanics explicitly. This slice changes no offers.

Acceptance/mutation targets:

- `control save profile matches reducer at 34/80 with plus d4` — using the old base-only `44/80` value must fail.
- `escape profile includes sourced base plus active flat skill modifier` — using only either term must fail.
- `Intelligence Arcana sourced escape remains executable` — coercing it to Dexterity/Acrobatics must fail.
- `selected optional modifier is consumed on success and failure` — consuming it only on success must fail.

Rollback: restore pre-extraction resolution functions; no offer registration depends on them yet.

### Slice 5 — sourced anatomy, equipment knowledge, and reservations (at most 10 files per sub-slice)

This is one non-dispatchable facts/capacity tranche. 5A modifies `src/combat/{combatant,statblock,equipment,encounter}.ts`, `src/content/content-pack.ts`, and `src/vtt/party-session-state.ts`; it modifies `tests/unit/combat/combatant.test.ts` and `tests/unit/vtt/{content-pack,content-pack-import-order,party-session-state}.test.ts` (10 files). 5B modifies `src/combat/{equipment,encounter}.ts`, `tests/unit/vtt/equipment.test.ts`, and `tests/unit/tools/scrape-content-pack.test.ts` (4 files). Neither sub-slice registers an offer, and the tranche is not dispatchable until both cumulative contracts pass.

Add known/unknown anatomy, complete/unknown occupancy, and escape skill evidence. The two and only two production authorities are explicit: authored `MonsterStatblockInput.graspingParts` validated by `monsterStatblock` and projected by `monsterCombatantProfile` (`src/combat/statblock.ts:620-638,1200-1239`; `src/combat/combatant.ts:240-320`), including the same authored field on imported content-pack monsters (`src/content/content-pack.ts:650-676,1206-1218`); and a caller-supplied `EncounterSetup.equipment` row marked `knowledge:'complete'` (`src/combat/encounter.ts:741-760,1004-1029`). A missing setup row, current manufactured `{hands:'empty'}` fallback, imported omission, summon default, or catalog assumption becomes `knowledge:'unknown'`, never a positive fact. No existing catalog monster is silently promoted; a production custom/content-pack encounter emits generic Grapple only when both explicit sources are present.

Slice 5 also changes the actual capacity enforcement seam `addEquippedItem` at `src/combat/encounter.ts:1697-1725` to consume the shared reservation lens. That makes equip-after-grapple and grapple-after-equip the same invariant rather than deferring half of it to Slice 6. Generic control still derives only the SRD Strength-based DC from sourced score/PB; no Monk/Dexterity substitution is claimed. Preserve unknown homebrew data without inventing defaults. No offer is registered.

Acceptance/mutation targets:

- `known two hands plus unknown occupancy is unresolved` — treating `hands.kind:'empty'` as complete must fail.
- `one reserved hand prevents a second one-hand equip` — counting only equipped items must fail.
- `known tentacle reservation neither consumes nor creates a hand` — mapping `other` to `hand` must fail.
- `unknown imported anatomy survives round trip as unknown` — materializing two hands must fail.
- `missing encounter equipment normalizes to unknown occupancy` — retaining today's manufactured empty record as complete must fail.

Rollback: revert 5B capacity enforcement, then 5A's new sourced fields/transport as one tranche; serialized user facts are never narrowed or dropped.

### Slice 6A — required TurnMovement grant migration (four bounded sub-slices)

6A1 (10 files) modifies `src/combat/{movement,encounter}.ts`, `src/vtt/monster-planning-state.ts`, `tests/unit/combat/{movement,encounter}.test.ts`, `tests/integration/vtt/pc-algorithm-policy.test.ts`, `tests/unit/bridge/js-round-plan-integration.test.ts`, `tests/unit/vtt/{projected-movement-options,symmetric-pc-evaluator}.test.ts`, and `tests/unit/tools/engine-mcp-handler.test.ts`.

This compile-complete sub-slice adds required `TurnMovement.grants`, `TurnMovement.grantProvenance`, and `TurnMovement.exhaustion`, updates both production object-literal constructors (`src/combat/encounter.ts:968`; `src/vtt/monster-planning-state.ts:48-52`), and updates all seven tests that either construct the exact triplet or assert its complete object shape, including `tests/unit/combat/movement.test.ts:156-165` and the Dash shape at `tests/unit/combat/encounter.test.ts:154-166`. It replaces existing Dash, commanded-Flee, speed-effect, and movement-mode raw triplet writes with `grantTurnMovement`, `recomputeActiveTurnMovement`, `spendMovement`, or `exhaustTurnMovement`; gives every refresh an exhaustive mutation cause, preflights controller-originated grant-sensitive commands, carries unresolved movement through reducer-internal/outgoing-boundary refreshes, inserts `beginIncomingTurnMovement` immediately after incoming active-actor assignment and before all incoming boundary work, and exposes canonical effective Speed to the migration seam without adding a default. No later slice is needed for any required movement field to compile.

6A2a (4 files) adds `src/combat/turn-movement-migration.ts` and modifies the non-journal raw-state ingress points `src/vtt/mcp/entrypoint.ts`, `src/vtt/engine-round-session.ts`, and `src/vtt/regret/rollout.ts`. Arena fixtures currently enter through `decodeArenaFixture` (`src/vtt/mcp/entrypoint.ts:484-540`); canonical round snapshots cast parsed state at `src/vtt/engine-round-session.ts:134-151`; regret captures validate their original hash before returning parsed state at `src/vtt/regret/rollout.ts:65-83`. Every adapter calls the one shared versioned migrator after verifying any hash that binds original bytes. No adapter locally inserts an empty array. The migrator accepts structurally valid legacy writer drift, carries only active-turn multipliers corroborated by the latest turn's reducer event segment and observed capacity, reconstructs commanded exhaustion, and marks all other old provenance indeterminate under the fail-closed rules above. All newly serialized canonical state contains all three required movement fields; in-memory consumers never receive an optional field or use `?? []`.

6A2b (8 files) modifies `src/combat/encounter.ts`, `src/vtt/session-persistence.ts`, `src/db/migrations.ts`, `src/db/schema.sql`, `tests/unit/schema.test.ts`, `tests/unit/schema-check-constraints.test.ts`, and `tests/unit/db/migrations.test.ts`; it adds `drizzle/0066_vtt_session_movement_ledger.sql`. Saved sessions migrate before replay at `src/vtt/session-persistence.ts:3385-3411`. This sub-slice raises `VTT_SESSION_SCHEMA_VERSION` from 12 to 13, adds required `movementLedgerReplay` with `numericSemantics:'legacy_v12'`, registers the adjacent v12-to-v13 migration, permits schema version 13 in the persisted revision table without narrowing versions 1-12, and adds the replay-only legacy numeric truth table plus the exhaustive three-kind reducer-backed replay seam before unchanged complete-state equality. The compatibility option is an internal replay capability, absent from serialized commands and all live reducer entry points. Schema/migration tests require the exact 1-13 accepted set and reject 0/14/fractional versions. No docs schema changes.

6A2c (15 files) modifies `tests/unit/vtt/{engine-context-integrations,engine-round-session,session-persistence,regret}.test.ts`, adds `tests/unit/combat/turn-movement-migration.test.ts`, and adds ten hand-authored pre-ledger inputs: `tests/fixtures/vtt/pre-movement-ledger-{one-dash,double-dash,command-flee,speed-writer-drift,mode-writer-drift,multi-revision-dash-journal,multi-revision-speed-writer-journal,multi-revision-mode-writer-journal,multi-revision-turn-skip-journal,multi-revision-turn-delay-journal}.json`. The first five are complete legacy arena-shaped encounter payloads with one active Speed-30 actor and exact current-turn history: one Dash `{60,10,50}`, two Dashes `{90,10,80}`, commanded Flee `{60,60,0}`, speed +10 drift `{40,0,50}`, and fixed fly-60 mode drift `{60,0,90}`. Each of the four raw-state ingress specs imports all five through its real boundary, for 20 adapter witnesses, asserting integrity where applicable, acceptance, exact observed triplet, provenance classification, grant count/source/ID, and exhaustion. Separate derived cases remove/contradict current-turn history and assert indeterminate provenance plus pre-mutation refusal; a corroborated Speed-0 grant remains represented. The last five are the genuine linked v12 Dash, speed-writer, mode-writer, skip, and delay journals specified above, never arena wrappers. `session-persistence.test.ts` performs the complete import/replay/export/reimport/replay contract for each and retains full equality. `turn-movement-migration.test.ts` owns the explicit 57-file pre-existing corpus manifest and exact 418-triplet preservation test. The ten additions increase the checked-in tests-tree pre-ledger fixture inventory from 57 to 67 and are never generated from migration output.

Slice 6A is one non-dispatchable migration tranche: all four sub-slices and their cumulative contracts must pass before 6B or any offer work starts. No VTT offer is registered.

Acceptance/mutation targets:

- `fresh and projected turns contain an empty known spendable grant ledger` — omitting `grants:[]`, `grantProvenance:{kind:'known'}`, or `exhaustion:'spendable'` from either production constructor must fail compilation and the exact projection assertion.
- `one-Dash legacy imports preserve {60,10,50} with one unresolved-source multiplier at all four ingresses` — inserting `grants:[]`, hashing normalized replacement bytes, or skipping any adapter must fail.
- `double-Dash legacy imports preserve {90,10,80} with two distinct unresolved-source multipliers at all four ingresses` — collapsing the inferred count to a Boolean must fail.
- `commanded-Flee legacy imports preserve exhausted {60,60,0} without guessing fresh source provenance at all four ingresses` — using `{60,10,50}`, reopening remaining movement on refresh, or converting the old label to a fresh source must fail.
- `speed and mode writer drift import byte-for-value at all four ingresses` — rejecting `{40,0,50}` or `{60,0,90}`, normalizing either from migration output, or allowing it into movement/offers before recovery must fail.
- `controller refusal and internal-boundary recovery are authority-separated` — treating missing history as known empty, placing incoming invalidation after `processBoundary`, refusing outgoing effect expiry, recomputing unresolved `{40,0,50}` during that expiry, or allowing the carried bytes to be spent must fail; both drift and indeterminate active actors reach the next known actor, and a Speed-0 state with one corroborated grant event separately retains one suppressed row.
- `malformed legacy movement is rejected after original-byte integrity verification` — accepting a negative/non-finite field or checking only normalized bytes must fail; arithmetic drift alone must not fail import.
- `marked three-revision Dash journal replays exports reimports and replays with complete equality` — omitting the revision marker/canonicalization or weakening comparison of numeric movement, non-provenance state, events, commands, or RNG must fail.
- `marked speed and mode journals replay v12 numeric semantics exactly` — using current recomputation must fail exact `{40,0,50}` and `{60,0,90}` child states; skipping either wrapper's second adjustment must also fail.
- `unmarked current revisions never inherit legacy numeric semantics` — a current +10-Speed child must remain `{40,0,40}` and a current fixed-fly-60 child `{60,0,60}` even when its parent was imported/marked; selecting mode from the parent or bundle instead of the child marker must fail.
- `marked turn skip and delay canonicalize every replayed combatant` — bypassing the shared reducer-backed seam, canonicalizing only the entering actor, or changing pacing indices/events/coordinator/RNG must fail full equality.
- `all 57 pre-existing pre-ledger fixtures have an explicit migration disposition` — a missing/extra discovered path, changed one of 418 triplets, source-byte mutation, optional ledger field, or silently excluded malformed fixture must fail.
- `Dash at Speed thirty is sixty and two Dashes are ninety` — collapsing the ledger to one Boolean grant must fail.
- `Dash move ten then Speed reduction to fifteen yields {speed:30,spent:10,remaining:20}` — capturing a 30-foot grant instead of re-deriving its multiplier must fail.
- `Dash move ten then Speed increase to forty yields {speed:80,spent:10,remaining:70}` — applying the modifier only to base capacity must fail.
- `command Flee grant and exhaustion survive plus-ten movement effect apply and removal` — reopening remaining movement or rewriting the triplet without retaining the grant/exhaustion must fail exact `{60,60,0}->{80,60,0}->{60,60,0}`.
- `split movement retains spent fifteen and known spendable grants empty` — leaving the existing exact assertion at `{speed:30,spent:15,remaining:15}` without all three ledger fields or resetting `spent` must fail.

Rollback: revert 6A2c's ten new fixtures and five specs, then 6A2b's schema-13 marker/migration, legacy numeric replay seam, canonicalization, and database schema migration, then 6A2a's shared migrator and non-journal ingress adapters, then 6A1's required-field/refresh-cause/incoming-turn migration and direct consumers as one tranche; Slice 6B cannot start until all of 6A's cumulative contracts pass. Because no legacy payload is rewritten in place, rollback leaves original saved bytes and capture pins recoverable.

### Slice 6B — Grapple/Shove reducer and lifecycle (10 files)

Files: new `src/combat/unarmed-control.ts`; modify `src/combat/{events,effects,encounter,conditions,movement}.ts`; new `tests/unit/combat/unarmed-control.test.ts`; modify `tests/integration/vtt/monster-on-hit.test.ts`, `tests/unit/vtt/spatial-movement.test.ts`, `tests/unit/combat/persistent-areas.test.ts`.

Add pre-spend control commands, dual-method Grappled escape, Grappled-aware movement restoration through Slice 6A's ledger, standing, binding reconciliation, release, and engine-authored displacement resolution; no VTT offer is registered.

Acceptance/mutation targets:

- `start Grappled escape restores thirty then permits a five-foot move` — omitting the Grappled-removal refresh must fail; this witness intentionally has `spent=0` and is not the clamping mutant's killer.
- `move ten then Grapple release restores {speed:30,spent:10,remaining:20}` — clamping/resetting recorded `spent` to 0 must fail.
- `Dash move ten Grapple release restores {speed:60,spent:10,remaining:50}` — dropping the Dash grant during refresh must fail.
- `two Dash grants survive Grapple suppression and restore eighty remaining` — collapsing grants to a Boolean or one row must fail.
- `ending one overlapping Grapple keeps Dash suppressed and ending the last restores it` — testing only effect removal or only base Speed must fail.
- `dying and stable targets remain control-targetable while dead is refused` — changing the target predicate to `life==='living'` must fail.
- `out-of-turn cover charmed and spent-action refusals are byte-equal with zero RNG` — spending before Total Cover validation must fail.
- `out and back in one command ends the binding once` — reconciling only the final position must fail.

Rollback: remove reducer control variants and lifecycle helpers together; retain the independently valid Slice 6A movement ledger and keep the capability registry unchanged.

### Slice 7 — Help reducer and scheduling (8 files)

Files: new `src/combat/future-turn-schedule.ts`; modify `src/combat/{events,effects,encounter}.ts`, `src/vtt/engine-query-port.ts`; new `tests/unit/combat/{help-action,future-turn-schedule}.test.ts`; modify `tests/unit/vtt/roll-defense-modifiers.test.ts`.

Implement Help's source-ally predicate, first-roll consumption, expiry, and reducer-neutral delayed-order scheduler. No Help offer is registered.

Acceptance/mutation targets:

- `first source ally attack consumes Help hit or miss` — leaving the effect for attack two must fail.
- `self hostile and wrong-target rolls do not consume Help` — changing the ally predicate result to unconditional `true` must fail.
- `delayed restoration can put helper next and expires Help before ally` — iterating only the current initiative array must fail.

Rollback: remove Help command/effect/scheduler as one unit; other control mechanics remain.

### Slice 8 — reaction consumer extraction (10 files)

Files: new `src/combat/reaction-decision-contracts.ts`; modify `src/vtt/{encounter-projections,reaction-guidance,reaction-offer-host-policy,session-persistence}.ts`, `src/vtt/mcp/engine-server.ts`; modify `tests/unit/vtt/{encounter-projections,reaction-guidance,session-persistence,reactions}.test.ts`.

Move OA-specific access behind exhaustive typed accessors before widening `PendingDecision`. No Ready state exists yet. Preserve standing OA guidance and persistence bytes.

Acceptance/mutation targets:

- `OA projection reads mover geometry only through OA accessor` — treating every reaction offer as OA must fail the contract fixture.
- `standing guidance remains exhaustive for declared reaction kinds` — returning a default instruction for an unknown kind must fail.
- `OA persistence round trip is byte-identical` — serializing a new absent field must fail.

Rollback: restore direct OA consumers; Ready is still absent.

### Slice 9 — Ready reducer, suspension, and lifecycle (10 files)

Files: new `src/combat/readied-attacks.ts`; modify `src/combat/{values,events,encounter,monster-commands,reaction-decision-contracts,visibility}.ts`; new `tests/unit/combat/ready-attack.test.ts`; modify `tests/unit/vtt/reactions.test.ts`, `tests/unit/combat/visibility.test.ts`.

Add declaration, observation, reaction drain, dedicated attack execution, cleanup, and the corrected turn-start continuation. Deferred VTT consumers compile through Slice 8's accessors. No Ready offer is registered.

Acceptance/mutation targets:

- `readied hit making entering PC dying queues death save after final response` — using `life==='living'` as the whole continuation gate must fail.
- `readied incapacitation suppresses Command from post-response state` — reusing the pre-response `incapacitated` boolean must fail.
- `all Ready responses finish before commanded movement and tail runs once` — resuming after the first response or twice must fail.
- `failed sight range reaction resource and identity rechecks clean without spend` — spending Reaction before recheck must fail.
- `plain unseen or incapacitation-caused Dodge loss does not trigger` — triggering on any turn boundary must fail.
- `player export contains no Ready record decision or event semantic` — passing visible combatant events through must fail.

Rollback: remove Ready records/decision/continuation together; the reaction accessor extraction remains.

### Slice 10 — party capabilities and contextual hostile access (10 files)

Files: new `src/vtt/offers/party-action-capabilities.ts`, `src/vtt/intel/hostile-threat-access.ts`; modify `src/vtt/{reference-encounter,party-pack,scripted-party-round,monster-planning-state}.ts`; new `tests/unit/vtt/{party-action-capabilities,hostile-threat-access,reference-party-actions}.test.ts`; modify `tests/unit/vtt/scripted-party-round.test.ts`.

Pair exact execution providers with serializable threats, generalize reference hostile targeting, and retain explicit attacker/origin/footprint context. No reposition offer is registered.

Acceptance/mutation targets:

- `every supported catalog effect has a matching future-turn legal command and conversely` — changing Sacred Flame's catalog status from represented to unsupported on only one side must fail.
- `same ranged effect differs at origins 2 2, 12 2, and 17 2` — reusing the first origin must fail.
- `same effect with a Large attacker footprint changes reach from the same anchor` — replacing footprint distance with anchor distance must fail.
- `Speed zero keeps legal origin melee and ranged replies` — returning an empty origin set at Speed 0 must fail.

Rollback: restore old party provider wiring; environment keeps an explicit unrepresented catalog.

### Slice 11 — constrained paths, displacement, and reposition candidates (10 files)

Files: new `src/vtt/offers/{engine-displacement,reposition-candidates,reposition-offer-generator}.ts`; modify `src/combat/{movement,encounter,encounter-movement-world}.ts`; new `tests/unit/vtt/{engine-displacement,reposition-candidates,reposition-offer-generator}.test.ts`; modify `tests/unit/combat/movement.test.ts`.

Build the independent unregistered reposition generator and shared Shove-push displacement seam. Candidate IDs bind canonical inputs but external envelopes contain no geometry.

Acceptance/mutation targets:

- `safe equal-cost route survives an unsafe cheaper predecessor` — keeping only the first cell predecessor must fail.
- `zero budget returns origin and still evaluates threats` — requiring a nonempty path must fail.
- `nearest-visible ties constrain every edge and no visible enemy emits none` — choosing only the first tied ID or treating the empty anchor set as vacuously legal must fail.
- `Disengage before movement admits an OA edge but after movement does not` — ignoring action phase must fail.
- `Shove push destination is exactly five feet away and engine-authored` — using ten feet or accepting a submitted destination must fail.
- `Wisdom-save access yields zero cover survival credit` — crediting all saves like Dexterity must fail.
- `retreat fixture derives vector one zero zero and its coverless control emits none` — changing Half Cover's policy rank from 1 to 0 must fail.
- `kite fixture derives vector zero zero two and retained-reach control emits none` — changing the direct-loss weight from 2 to 1 must fail.
- `disperse fixture derives vector zero zero two and larger-area control emits none` — changing the distinct-area-loss weight from 2 to 1 must fail.
- `bottleneck fixture derives vector zero two zero and attack-reach-ten control emits none` — the complete actor candidates, all hostile reachable sets, and every simple attack path through 20 feet must equal the printed planning probe; changing the hostile one-Speed budget from 20 to 10 feet must fail pre-move access, while changing only attack-specific reach from 5 to 10 must preserve topology and remove `A` across the search. Ordinary OA reach remains 5 and `reactionAvailable:false`; a separate ordinary-reach-10/Reaction-available mutation must expose the OA window.
- `candidate total order resolves cost coordinate and path ties canonically` — changing destination order from row/column to column/row must fail the fixed winning ID.

Rollback: remove candidate/displacement modules; no registered offer references them.

### Slice 12 — Grapple/Shove capability, corrected recurrence, atomic registration (10 files)

Files: new `src/vtt/offers/grapple-offer-generator.ts`, `src/vtt/intel/position-control-outcome.ts`; modify `src/vtt/offers/{offer-envelope,offer-generator-registry}.ts`, `src/vtt/{turn-proposal,intent-resolver,engine-round-session}.ts`, `src/vtt/intel/{option-outcome,opportunity-cost}.ts`; new `tests/unit/vtt/grapple-offer-generator.test.ts`.

Register the complete control capability, including Shove-push using Slice 11's displacement. Policy remains disabled by default. The generator contract spec also contains the named ranking/integration cases; affected existing ranking/session specs run cumulatively.

Acceptance/mutation targets:

- `invisible adjacent grappler and distant visible enemy derive the pinned response tree and 441/2500` — making Dash target the nearest hostile regardless of visibility must fail the visibility, path, and exact-value assertions.
- `escape is maximizing at horizons one two and three and beats 3/40` — substituting the old `33/80`, a flat `+1` escape cost, or stay as the selected response must fail.
- `every escape successor stays within two-hundred-foot OA reach and queues no reaction` — changing only the authored OA reach to 5 feet must produce the expected `opportunity_attack` pending decision and fail the no-boundary invariant.
- `removing only distant visible enemy keeps Grapple legal but restores 3/40 attack` — changing generation from mechanical legality to `benefit > 0` must fail the retained-offer assertion.
- `three near four far Prone continuation is negative` — clipping signed deltas to zero must fail.
- `modifier consumption changes a later escape response` — retaining the consumed modifier in successor state must fail.
- `forged DC save ability part destination and reducer command are not submission fields` — accepting any one must fail strict decoding.

Rollback: remove the one registry tuple entry; unregistered reducer/candidate foundations remain reusable.

### Slice 13 — Help capability, real continuation, atomic registration (10 files)

Files: new `src/vtt/offers/help-offer-generator.ts`, `src/vtt/intel/{turn-start-projection,attack-sequence-projection,help-outcome}.ts`; modify `src/vtt/offers/{offer-envelope,offer-generator-registry}.ts`, `src/vtt/intent-resolver.ts`, `src/vtt/intel/{option-outcome,opportunity-cost}.ts`; new `tests/unit/vtt/help-offer-generator.test.ts`.

Register Help only with its real reducer projection and ranking. Policy remains disabled by default.

Acceptance/mutation targets:

- `immediate ally first attack consumes Help before stronger later attack` — selecting the maximum later attack must fail.
- `ordinary two-attack projection benefits only component one hit or miss` — reusing unchanged state for component two must fail.
- `spent Action refresh and source-start expiry come from real reducer boundary` — synthesizing `action:available` without processing effects must fail.
- `intervening actor and boundary RNG are unresolved` — forecasting across either must fail.
- `direct-order counterexample is unchanged with Help enabled but zero benefit` — prepending kind before neutral setup value must fail.

Rollback: remove Help's registry tuple entry; reducer/scheduler foundations remain.

### Slice 14 — Ready capability, finite setup ranking, atomic registration (10 files)

Files: new `src/vtt/offers/ready-offer-generator.ts`, `src/vtt/intel/ready-outcome.ts`; modify `src/vtt/offers/{offer-envelope,offer-generator-registry}.ts`, `src/vtt/{turn-proposal,intent-resolver,engine-round-session}.ts`, `src/vtt/intel/{option-outcome,opportunity-cost}.ts`; new `tests/unit/vtt/ready-offer-generator.test.ts`.

Register Ready only with legality and finite tagged ranking. Policy remains disabled by default.

Acceptance/mutation targets:

- `independent Disadvantage makes Dodge-end timing gain exactly zero` — ignoring persistent roll mode must fail.
- `reaction reserved makes direct attack win an exact Ready tie` — valuing Reaction at zero must fail.
- `unresolved Ready and Help self-comparisons are zero and every coordinate finite` — using `Infinity` or subtracting equal sentinels must fail.
- `resource choice pending-generating and stale attacks are neither offered nor accepted` — trusting the offer-time action label must fail.

Rollback: remove Ready's registry tuple entry; its reducer mechanics remain dormant.

### Slice 15 — reposition outcome, atomic registration, and production default preparation (10 files)

Files: new `src/vtt/intel/reposition-outcome.ts`; modify `src/vtt/offers/{offer-envelope,offer-generator-registry,reposition-offer-generator}.ts`, `src/vtt/{intent-resolver,engine-round-session}.ts`, `src/vtt/intel/{option-outcome,opportunity-cost}.ts`, `tools/ai-dm-conversation.ts`; new `tests/unit/vtt/reposition-ranking.test.ts`.

Register reposition only with exact benefit terms, candidacy, dominance, phases, re-resolution, and execution. Default remains legacy. Export one shared `prepareEngineDefaultActor` from production planning code and require both production and later evaluation to use it.

Acceptance/mutation targets:

- `no-positive state preserves every legacy option id and default` — adding neutral reposition terms to the legacy tuple must fail.
- `retreat one-quarter survival enters candidacy and dominance` — applying `endpointSurvivalValue` only after frontier construction must fail.
- `kite two-quarter retaliation enters candidacy and dominance` — changing its common-vector coordinate to 0 must fail.
- `disperse two-quarter area exposure enters candidacy and dominance` — merging it into `enemyAccessDenied` must fail.
- `bottleneck two-quarter ally denial enters candidacy and dominance` — changing its common-vector coordinate from 2 to 1 must fail.
- `one path satisfying two purposes is emitted once by primary benefit then fixed purpose order` — changing the tied purpose order from retreat-first to kite-first must fail.
- `raw seed 3943001 is prepared before default selection` — calling `actorOpportunityReport` on the unprepared fixture must fail.
- `fallback resolution and board preview re-resolve with the same environment` — substituting legacy environment on either path must fail.
- `reposition execution preserves declared riders resources activation and phase order` — reconstructing from label text must fail.

Rollback: remove reposition's registry tuple entry; no public default changes.

### Slice 16 — DM export and generated schema (10 files)

Files: modify `src/vtt/{encounter-projections,renderer-profile,dm-tactical-intel}.ts`, `src/vtt/mcp/{engine-server,schemas}.ts`, generated `docs/specs/engine-turn-context.schema.json`; modify `tests/unit/tools/{engine-mcp-handler,engine-mcp-golden}.test.ts`, `tests/unit/vtt/{prose-renderer,engine-context-integrations}.test.ts`.

Render only engine-authored, revision-bound facts: Help/Ready/control target/action/trigger labels, reposition purpose/phases/benefits, and exact outcome evidence. Submission stays option-ID-only. Ready state and all internal coordinates/paths remain absent. Generate the one schema only with `npm run schema:engine-mcp`, twice, and require identical second-run hash.

Acceptance/mutation targets:

- `submission schema rejects target trigger dc dice damage destination path and command` — accepting any one forbidden property must fail.
- `player projection contains no Ready or outcome semantic` — copying the DM outcome object into player events must fail.
- `live handler output matches generated schema and hand-derived option kind target action trigger counts` — changing the schema without the handler invariant must fail.

Rollback: revert renderer/schema/export files together; registered capabilities remain internally executable but must not be activated while external context lacks them.

### Slice 17 — model-free held-out runner and activation switch (at most 10 files per sub-slice)

17A adds `tools/offers-engine-default-evaluation.ts`, `tools/offers-evaluation-report.ts`, and their two unit specs, plus the minimum environment/fixture loaders (maximum six files). It does not call a model. It loads exactly 30 frozen ordinary rooms, applies manifest initiative preparation, then calls the exact `prepareEngineDefaultActor` used at `tools/ai-dm-conversation.ts:1160-1185` for eligibility and selection. It compares legacy, each one-family arm, all-families, and leave-one-family-out arms on identical state clones and `mulberry32(roomSeed)` streams. Every arm terminates at encounter conclusion, 60 rounds, or 8,000 reducer steps, whichever occurs first; a round/step limit is `unresolved`, never a draw or resolved row. Empty eligible subsets fail explicitly without NaN or bootstrap.

Terminal outcome is frozen: a concluded `survivingSide` of monsters is a monster win, party is a party win, and `null` is mutual defeat; non-concluded states are unresolved. Terminal monster HP fraction uses only monster combatant IDs present in the room's initial roster: `sum(max(0, terminal current HP for initial monster IDs, with absent/removed/dead equal 0)) / sum(initial hitPointMaximum for those same IDs)`. Summons and transformations that create a new combatant ID are excluded from both sums; the positive initial denominator is validated. The report never substitutes surviving-creature average, total-party fraction, or post-summon maxima.

17B is supervisor-only activation. Before any run, the supervisor supplies and hashes an immutable manifest whose room split is demonstrably older than the first design of this combined roadmap—not merely older than implementation—and therefore satisfies D586.5's pre-design requirement. The manifest binds source/base/policy/tool hashes, exactly 30 ordinary room IDs, creation evidence, tuning exclusions, initiative/party policies, arm order, `mulberry32` seed binding, the 60/8,000 limits, terminal mapping/fraction definition, and criteria. A post-design or retrospectively relabelled split is invalid even if no implementation existed yet. Require 30/30 complete paired rooms in every arm, every arm resolved, zero illegal/refused/forbidden-field executions, no fewer monster wins than legacy, and—only when wins tie—mean terminal monster HP fraction at least legacy. Report selection/trigger/moot/unresolved counts per family. Default activation is one policy constant change only after the gate passes, followed by the full cumulative contract. If the manifest/provenance or gate fails, defaults remain disabled.

Acceptance/mutation targets:

- `evaluation default equals production default for every actor` — bypassing `prepareEngineDefaultActor` must fail on the ordinary raw-fixture witness.
- `eligibility uses the same prepared state and environment as selection` — computing it from raw state must fail.
- `empty eligible subset reports insufficient eligible rooms` — returning a passing empty mean must fail.
- `model call count is exactly zero` — routing through the AI DM runner must fail.
- `round sixty and step eight-thousand are unresolved terminals` — mapping either limit to mutual defeat must fail.
- `terminal monster HP fraction excludes summons and counts removed initial monsters as zero` — adding a summoned monster or dropping an absent initial ID from the denominator must fail the exact fraction.

Rollback: remove tools without changing policy; for activation, revert the single policy constant and retain the evaluation report as evidence.

## D584.4 cumulative verification contract

No command in this section was run while writing the plan. During implementation, run the following contract after every slice/sub-slice and once more after the final edit. Never run the full gate, full Vitest suite, full Playwright suite, an outer `flock`, an arena/probe model phase, or anything on port 4173.

### Inventory and import graph

For slice `N`, inventory all four change classes plus this plan:

```sh
git diff --name-only eb77885440ef658e093a4cff1288d25c053a7c09...HEAD
git diff --cached --name-only
git diff --name-only
git ls-files --others --exclude-standard
sha256sum src/vtt/intel/contracts.ts
```

Build `/tmp/d584-offers-import-closure.ts` with the TypeScript compiler API. It must traverse static imports/exports, dynamic `import()`, `import type`, and import-equals declarations; resolve extension/index variants; and build reverse edges across `src/**`, `tools/**`, `tests/**`, and schema-generator entry points. It prints changed production/tool paths, runtime tests, and exclusively type-only tests separately. Reconcile every row to runtime, compile-only with a proved type-only edge, or unaffected with an exact seam reason. The 36 direct symbol consumers found during planning are a minimum cross-check, not a cap. A missing, skipped, todo, undiscovered, or unclassified promised test blocks the slice.

Maintain `/tmp/d584-offers-contract-sN.txt`. It is the cumulative union of every new/modified spec since the base, every promised spec that exists by slice N, the pinned ledger, and every affected runtime consumer discovered by the graph. Later-slice nonexistent specs are not named early. Record exact path count before running.

Seed additions, accumulated in order:

| Slice | Newly available seed specs |
|---|---|
| S1 | `standard-offer-generator`, `composite-turn-proposals`, `mixed-kind-multiattack`, `option-modeling` |
| S2-S3 | `offer-environment`, `engine-state-capsule`, `engine-round-session`, `engine-query-port`, `offered-option-paths`, `encounter-board-projection`, `plan-materiality`, `engine-context-integrations`, `ai-dm-conversation` |
| S4 | `control-check-profiles`, `resolution`, `roll-defense-modifiers`, `roll-modifiers-d351` |
| S5A-S5B | `combatant`, `equipment`, `content-pack`, `content-pack-import-order`, `party-session-state`, `scrape-content-pack` |
| S6A1 | `movement`, `encounter`, `pc-algorithm-policy`, `js-round-plan-integration`, `projected-movement-options`, `symmetric-pc-evaluator`, `engine-mcp-handler` (required-field constructor/assertion closure) |
| S6A2a-S6A2c | `turn-movement-migration`, `engine-context-integrations`, `engine-round-session`, `session-persistence`, `regret`, `schema`, `schema-check-constraints`, `db/migrations`, and all ten `pre-movement-ledger-*` fixtures (57-file legacy corpus, 20 raw-state imports, writer drift, exhaustion, schema 13, five genuine journal replays, and skip/delay coverage) |
| S6B | `unarmed-control`, `movement`, `encounter`, `monster-on-hit`, `spatial-movement`, `persistent-areas`, `condition-lifecycle`, `effects`, `visibility` |
| S7 | `help-action`, `future-turn-schedule`, `roll-defense-modifiers`, `engine-query-port` |
| S8-S9 | `encounter-projections`, `reaction-guidance`, `session-persistence`, `reactions`, `visibility`, `ready-attack` |
| S10 | `party-action-capabilities`, `hostile-threat-access`, actual reference-encounter spec, `scripted-party-round`, `party-pack` consumers |
| S11 | `engine-displacement`, `reposition-candidates`, `reposition-offer-generator`, `movement`, `spatial-movement` |
| S12 | `grapple-offer-generator`, `option-outcome`, `engine-opportunity-movement-intel`, `team-scorer`, `hypnotic-pattern-probe` |
| S13 | `help-offer-generator`, `option-outcome`, `engine-opportunity-movement-intel`, `team-scorer` |
| S14 | `ready-offer-generator`, `option-outcome`, `engine-opportunity-movement-intel`, `reactions` |
| S15 | `reposition-ranking`, `option-outcome`, `engine-opportunity-movement-intel`, `team-scorer`, `ai-dm-conversation` |
| S16 | `engine-mcp-handler`, `engine-mcp-golden`, `prose-renderer`, `engine-context-integrations`, `renderer-profile`, `engine-state-capsule` |
| S17 | `offers-engine-default-evaluation`, `offers-evaluation-report`, plus all cumulative production consumers |

Resolve the shorthand to actual repository paths in the generated manifest and record every correction; shorthand is not passed to Vitest.

### Negative controls and restore proof

For every mutation named in the slice, record the target file and exact pre-mutation SHA-256, save a same-filesystem backup under a slice-specific `/tmp/offers-mutant-sN-*` directory, apply one plausible wrong-value mutation (never deletion), run only the named killing spec, restore the backup, and verify the original SHA-256 before any other command. Record mutant command, expected failing test name, actual exit code, and restored hash. A surviving mutant or hash mismatch blocks the slice. Mutant runs are separate targeted evidence; the cumulative green suite below is still exactly one Vitest invocation.

### One cumulative invocation and static checks

After all mutants are restored and the inventory is regenerated:

```sh
npx vitest run --configLoader runner $(tr '\n' ' ' < /tmp/d584-offers-contract-sN.txt)
sg scan --config sgconfig.yml src
npx tsc -b --force
git diff --check
sha256sum src/vtt/intel/contracts.ts
```

Record exact command, exit code, spec count, test count, and elapsed seconds. A load-related red gets one identical serial retry by adding only `--maxWorkers=1`; no timeout changes are allowed except for an already D544-named flaky test. No test is deleted, skipped, todo-marked, weakened, or re-pinned.

For Slice 16 only:

```sh
npm run schema:engine-mcp
sha256sum docs/specs/engine-turn-context.schema.json > /tmp/offers-schema.sha256
npm run schema:engine-mcp
sha256sum -c /tmp/offers-schema.sha256
git diff --name-only -- docs/specs
```

The docs inventory must be exactly `docs/specs/engine-turn-context.schema.json`. Any other `docs/**` change blocks. Browser coverage is not planned. If the import graph proves a touched Playwright consumer, run only that single spec with `PLAYWRIGHT_PORT=4360 PLAYWRIGHT_WORKERS=1` through a `/tmp` wrapper using absolute `testDir` and web-server cwd. This `4360` value is an explicit OFFERS-PLAN-02 operational exception to the shelved draft's `4600`, required by the binding lane rules; it changes no browser or implementation scope.

## Roadmap anatomy

The roadmap has five cooperating layers. Slices 1-3 establish the typed offer envelope, capability registry, and immutable process binding. Slices 4-11 establish reducer-owned legality, movement provenance, anatomy/equipment evidence, reaction lifecycle, threat access, constrained paths, and displacement without activating a new family. Slices 12-15 register Grapple/Shove, Help, Ready, and reposition only when each capability has generation, re-resolution, execution, outcome, candidacy, and ranking together. Slice 16 exposes only DM-safe semantic facts while submissions remain revision-bound option IDs. Slice 17 measures disabled family arms and permits the supervisor to activate a default only with pre-design held-out evidence. The D586.74 contract changes alter only Slice 6A's legacy ledger migration and Slice 11's bottleneck witness/control; the recorded `4360` port is the separate binding operational exception accepted under F6.

## Dependent steps and exact files

All implementation dependencies and complete per-slice file lists are the ordered Slice 1-17 contract above. The two repaired deltas are exact:

| Dependency | Exact files | Must be complete before |
|---|---|---|
| Known fresh ledger, exhaustion, cause-typed refresh/recovery, and pre-boundary incoming-turn invalidation | `src/combat/movement.ts`, `src/combat/encounter.ts`, `src/vtt/monster-planning-state.ts`, and the seven 6A1 test consumers listed above | Any raw-state migration or Grapple lifecycle work |
| Shared legacy migrator and every non-journal raw-state adapter | new `src/combat/turn-movement-migration.ts`; `src/vtt/mcp/entrypoint.ts`; `src/vtt/engine-round-session.ts`; `src/vtt/regret/rollout.ts` | Any imported state may enter an in-memory required-ledger consumer |
| Schema-13 journal marker, legacy numeric reducer mode, and exhaustive replay persistence | `src/combat/encounter.ts`; `src/vtt/session-persistence.ts`; `src/db/migrations.ts`; `src/db/schema.sql`; new `drizzle/0066_vtt_session_movement_ledger.sql`; `tests/unit/schema.test.ts`; `tests/unit/schema-check-constraints.test.ts`; `tests/unit/db/migrations.test.ts` | Saved-session import/export or replay of a ledger-bearing revision |
| Corpus, boosted, drift, boundary, and all reducer-backed replay witnesses | `tests/unit/combat/turn-movement-migration.test.ts`; `tests/unit/vtt/engine-context-integrations.test.ts`; `tests/unit/vtt/engine-round-session.test.ts`; `tests/unit/vtt/session-persistence.test.ts`; `tests/unit/vtt/regret.test.ts`; new `tests/fixtures/vtt/pre-movement-ledger-{one-dash,double-dash,command-flee,speed-writer-drift,mode-writer-drift,multi-revision-dash-journal,multi-revision-speed-writer-journal,multi-revision-mode-writer-journal,multi-revision-turn-skip-journal,multi-revision-turn-delay-journal}.json` | Slice 6A dispatch and Slice 6B start |
| Correct bottleneck geometry and whole-search proof | `tests/unit/vtt/reposition-candidates.test.ts`; `tests/unit/vtt/reposition-offer-generator.test.ts`; production remains the already-listed `src/vtt/offers/{reposition-candidates,reposition-offer-generator}.ts` and `src/combat/{movement,encounter-movement-world}.ts` | Slice 11 acceptance and Slice 15 registration |

The ordering is strict: 6A1 -> 6A2a -> 6A2b -> 6A2c -> 6B, and Slice 11's complete positive/control proof -> Slice 15 reposition registration. Neither migration nor geometry change authorizes a family default.

## Targeted gates and authoritative supervisor rerun

During the two affected implementation increments, run the exact focused contracts before the cumulative D584.4 invocation:

```sh
npx vitest run --configLoader runner tests/unit/combat/movement.test.ts tests/unit/combat/encounter.test.ts tests/unit/combat/turn-movement-migration.test.ts tests/unit/vtt/engine-context-integrations.test.ts tests/unit/vtt/engine-round-session.test.ts tests/unit/vtt/session-persistence.test.ts tests/unit/vtt/regret.test.ts
npx vitest run --configLoader runner tests/unit/schema.test.ts tests/unit/schema-check-constraints.test.ts tests/unit/db/migrations.test.ts
npx vitest run --configLoader runner tests/unit/combat/movement.test.ts tests/unit/vtt/reposition-candidates.test.ts tests/unit/vtt/reposition-offer-generator.test.ts
```

The first command must report the explicit 57-file/418-triplet legacy corpus; all 20 raw-state boundary imports; exact one-Dash/double-Dash/exhausted-Flee cases; accepted speed/mode drift; indeterminate and negative/non-finite cases; both incoming- and outgoing-boundary recovery; the five genuine marked Dash/speed/mode/skip/delay journal import-replay-export-reimport-replay witnesses; every `legacy_v12` numeric truth-table arm; and unchanged complete-state, pacing-index, event, command, coordinator, party, and RNG verification. The second must prove database migration `0066`, accept exactly schema versions 1-13, and reject 0, 14, and fractional values. The third must report the exact printed reachable/path sets, positive `A={(h,a)}`, nonbeneficial `(2,0)` candidate, attack-specific-reach-10 negative control with ordinary OA reach 5/Reaction unavailable, the independent OA-window mutation, and the 10-foot hostile-budget killer. Then run the one cumulative Vitest invocation and static checks already specified for the slice; do not run a full suite, build, or gate in this worktree.

On the integrated revision, the supervisor owns the authoritative rerun and records exact exit code, spec count, test count, and elapsed time:

```sh
npm run test:gate
```

The supervisor also owns any D597 Sol discovery/Luna tuning arena or probe phase because model calls cannot run in this sandbox. Its run record must name the exact manifest-bound command, keep Luna low as the floor, use Luna high only for D474 escalation, enforce the 180-second live wall, and prove that only offered revision-bound IDs were selected. No local result may stand in for that authoritative integrated rerun.

## Security and side effects

Engine authority remains absolute: neither player nor model may supply coordinates, paths, dice, DCs, damage, reducers, replay modes, or non-offered IDs. Reposition geometry and movement provenance stay internal; Ready records and outcome evidence remain DM-only; the DM semantic export never reaches a player channel. Migration verifies integrity against original bytes before normalization, never rewrites checked-in inputs or capture pins, never guesses a fresh grant source, and accepts old writer drift without making it controller-spendable. Controller-originated grant-sensitive work refuses before resource/RNG/event/state mutation, while reducer-internal lifecycle refresh deterministically carries unresolved bytes so cleanup cannot deadlock. Historical numeric replay is selected only by a checksum-covered migrated-revision marker, is unavailable to serialized commands and new revisions, and reproduces the closed v12 movement truth table before replay-history-driven provenance canonicalization. No expected snapshot drives replay, no field is removed from comparison, and complete-state/event/RNG equality remains intact. The only intended persistent side effect is that a successfully imported pre-ledger payload is represented in memory and on its next export with schema-13 ledger/provenance/exhaustion fields and markers on migrated revisions; original import bytes remain untouched.

## Rollback

Rollback follows the slice-local rules above. For the migration repair, revert 6A2c's five import/replay/corpus specs and ten fixtures, then 6A2b's schema-13 marker, legacy numeric replay seam, canonicalizer, and database migration files, then 6A2a's three non-journal adapters and shared migrator, then 6A1's required fields/cause-typed recovery/incoming-turn invalidation as one non-dispatchable tranche; never retain an adapter that inserts empty grants, a legacy replay mode without its marker and full equality, or a marker without all three reducer-backed arms. For the geometry repair, revert the Slice 11 candidate implementation and its tests together; no registered offer may refer to it. Any activation rollback is only the Slice 17 policy constant and retains evaluation evidence. No rollback rewrites a user's legacy payload, changes a retained pin, or touches the frozen contracts file.

## Assumptions

- Locally proved: movement uses eight-way adjacency, costs 5 feet per entered ordinary cell, does not impose corner-cutting restrictions, and enemy occupancy blocks traversal; the OFFERS-PLAN-02 probe exercised those production functions directly.
- Locally proved: the current 57 checked-in pre-ledger fixture files contain 418 movement triplets—413 `{0,0,0}`, one `{30,0,30}`, four `{30,30,0}`—and no boosted capacity.
- Grant-count carry is allowed only for the active actor when its latest complete reducer event segment and canonical current `effectiveSpeed` corroborate the observed capacity; inactive historical bases and missing/contradictory current-turn histories are explicitly indeterminate, not assumed. Arithmetic drift from the proved old speed/mode writers is accepted but not made executable.
- A proved legacy multiplier has the same movement-capacity mechanics as Dash/Flee for the remainder of that turn, while its exact source and original ID remain unknowable and therefore unresolved.
- Commanded Flee's old event segment proves exhaustion independently of distance actually travelled; every recomputation preserves `remaining:0` until the incoming-turn reset.
- Locally proved: saved-session replay has exactly three reducer-backed transition kinds—`reducer_applied`, `turn_skipped`, and `turn_delayed`; both pacing kinds reach `end_turn` through their shared advance helper.
- Marked legacy journal replay first executes the exact closed `legacy_v12` movement-number truth table, then canonicalizes every combatant's provenance from replayed history before, not instead of, the existing exact complete-state comparison; no comparison coordinate is dropped.
- Unresolved movement remains non-spendable. Carrying it through reducer-internal/outgoing-boundary cleanup is safe only because the complete movement object stays unresolved and the next incoming turn clears it before effects or controller action.
- D586.5 manifest provenance is still an activation precondition, not an assumption this plan makes.

## Open owner questions

None. D600 supplies the ruling needed to reopen the plan; all six accepted Astra round-1 findings and all three accepted Astra round-2 findings now have locally checkable plan resolutions. A missing or invalid pre-design D586.5 manifest remains a stop condition for activation, not an unanswered design question.

## Stop conditions

Stop rather than improvise if any implementation would edit the frozen contracts file; accept coordinates/paths/dice/DC/damage/commands from a model or player; expose Ready state, internal paths, threat catalogs, or outcome evidence to a player; infer anatomy, occupancy, skills, save bonuses, or party actions; label an unsupported recurrence exact; register generation without execution and ranking; change a retained pin without an independent invariant; modify any forbidden docs file; or activate without the immutable pre-design D586.5 manifest and passing held-out gate.

PLAN-OFFERS-PLAN-02-R3 DONE
