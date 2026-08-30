# Engine-provided intel for the AI DM (D418)

Status: design sweep only; no implementation is included.

## Decision and notation

D418 says the engine should compute and expose tactical options, while the AI fills
only gaps and chooses among engine-annotated proposals. This design follows that
split. A rules result (range, legality, roll mode, path cost, action-economy use,
or consequence) is not an LLM judgment.

- **V** = verified current behavior by reading the cited code.
- **P** = proposed design or acceptance criterion.
- Gap classes: **A** computed but not surfaced; **B** computable from held state but
  not computed as planning intel; **C** currently delegated to the LLM but
  automatable.
- Token estimates are incremental serialized-context tokens, not model reasoning
  tokens. They are order-of-magnitude budgets to validate with capture rows.

## 1. What exists

| Layer | Verified computation | What reaches the planning LLM | Lost or misleading detail |
|---|---|---|---|
| State capsule | **V:** Per combatant, the capsule types exact life/HP, speed, position, action/bonus/reaction availability, action ranges including normal/long range, per-action/per-target minimum movement, conditions, slots, concentration, and semantic-zone membership (`src/vtt/engine-state-capsule.ts:19-94`). Projection copies those facts from the authoritative registry (`src/vtt/engine-state-capsule.ts:196-239`). | Indirectly, through `get_turn_context`; the raw capsule is not placed in the prompt. | Most high-value fields below are discarded by context rendering.
| Canonical action/path query | **V:** The action registry reads monster actions and computes the least path cost to a legal action origin for every hostile target (`src/vtt/engine-query-port.ts:630-697`). Its movement world charges 10 feet for difficult squares and 5 otherwise (`src/vtt/engine-query-port.ts:521-564`). | Only a nearest-target `usable_now` boolean normally survives. | Bonus actions are not returned by `monsterActions`, which reads only the statblock's `actions` field (`src/vtt/engine-query-port.ts:375-390`). `reach` also passes normal range as both normal and long range (`src/vtt/engine-query-port.ts:841-849`), so it cannot currently certify a long-range shot.
| Plays | **V:** Three typed plays expand a capsule into `EngineTurnIntent[]` (`src/vtt/snippets/registry.ts:30-68`, `src/vtt/snippets/registry.ts:464-520`). Attack branches use zero movement when possible, move to improve a reachable long-range attack to normal range, try alternate offense, then Dash/Dodge (`src/vtt/snippets/registry.ts:207-313`). | Up to three play names plus the top play's complete editable suggested intents (`src/vtt/mcp/engine-server.ts:459-529`). | Target ordering is HP/reach/id based (`src/vtt/snippets/registry.ts:113-121`), not outcome value. Plays filter to atomic attack actions (`src/vtt/snippets/registry.ts:149-150`), so they omit multiattack, bonus actions, spells, roll-mode interactions, and death-save consequences.
| Turn context | **V:** Full context contains compact actor status, up to eight options by default, coarse threats, recent transition names, plays, and a suggested plan; it is trimmed to 32 KiB (`src/vtt/mcp/engine-server.ts:459-529`). Delta contexts are structural diffs against a recorded full context (`src/vtt/mcp/engine-server.ts:533-562`). | This is the principal LLM input. Prompts explicitly tell the model to call it (`src/vtt/mcp/engine-server.ts:393-407`; `tools/ai-dm-conversation.ts:1595-1598`). | Status uses an HP band and empty `effect_tags`; it omits exact positions, ranges, conditions, slots, concentration, and zones (`src/vtt/mcp/engine-server.ts:294-313`). Each option is evaluated only against `nearest_visible_enemy`; unavailable movement cost is set to `null` (`src/vtt/mcp/engine-server.ts:321-351`).
| Expectations | **V:** A single-attack expectation is computed from attack bonus, raw target AC, and always-on average damage (`src/vtt/mcp/engine-server.ts:325-331`). | It is included in turn-context options unless disabled (`src/vtt/mcp/engine-server.ts:465-471`). | It explicitly assumes `NORMAL_ATTACK_ROLL` and ignores cover, advantage/disadvantage, crit damage, riders, multiattack, saves, death saves, and most resources. It therefore must not be presented as the canonical R02 comparison.
| Existing query tools | **V:** Full MCP schemas already define combatant options, semantic path, reach, cover, visibility, and dice-expectation queries (`src/vtt/mcp/schemas.ts:368-388`). | The DM profile advertises only context, play expansion, intent validation/submission, and adjudication (`src/vtt/mcp/engine-server.ts:43-55`, `src/vtt/mcp/engine-server.ts:932-940`). | The planning DM cannot call the existing detailed read tools. Even on the full profile their current implementations retain the nearest-target and normal-roll limitations above.
| Intent validation | **V:** Intents are typed as one choice plus movement/engagement and one fallback (`src/vtt/intent-resolver.ts:13-53`). Resolution engine-owns target selection, path, final position, and refusal codes (`src/vtt/intent-resolver.ts:203-290`, `src/vtt/intent-resolver.ts:337-383`). Adjustment submission independently rejects over-budget, duplicate, dead, or non-open actors and stages valid updates (`src/vtt/mcp/engine-server.ts:742-837`). | The LLM receives bounded refusal codes/summaries and one correction opportunity. | Spell choices are always unresolved (`src/vtt/intent-resolver.ts:322-327`). A targeted `use_action` can execute only a saving-throw action, not multiattack; other utility ids throw (`src/vtt/engine-round-session.ts:373-400`). Thus an option can appear in context without a complete executable typed proposal.
| Materiality | **V:** `plan-relevance-v1` snapshots intent resolution, life, relevant conditions, concentration, displacement, board presence, and semantic zones, then emits typed wake reasons (`src/vtt/plan-materiality.ts:18-42`, `src/vtt/plan-materiality.ts:199-249`, `src/vtt/plan-materiality.ts:295-354`). | Adjustment context exposes the budget, baseline hash, and intent digests (`src/vtt/mcp/engine-server.ts:473-506`). | The already-computed `materialityReasonCodes` are on the capsule request (`src/vtt/engine-state-capsule.ts:129-138`) but are omitted from turn context.
| Conversation/escalation | **V:** Every planning/correction launcher uses the `dm` profile; full or delta context is recorded (`tools/ai-dm-conversation.ts:913-959`, `tools/ai-dm-conversation.ts:1292-1346`). A fresh escalation is instructed to be offensive (`tools/ai-dm-conversation.ts:1689-1694`) and receives the ordinary rendered correction context (`src/vtt/turn-exhaustion-coordinator.ts:273-292`). | Base and escalation models see the same lossy option representation; escalation adds an offensive instruction. | The repair brief does not add target-specific tactical facts or quantify the opportunity cost of Dodge.
| RL capture | **V:** Accepted proposal rows retain both raw and parsed turn context plus exact submitted arguments (`tools/ai-dm-conversation.ts:849-889`). Row telemetry also stores context bytes, authorized plan, suggestion adoption, correction evidence, and team plans (`tools/ai-dm-conversation.ts:2684-2769`). | N/A (training/evaluation artifact). | Any typed intel added to turn context will automatically enter RL rows; option ids/scores should also be captured explicitly so later training can distinguish offered from chosen options.
| PC algorithm | **V:** `AlgorithmController` enumerates primitive programs and scores mostly by target HP/distance, with Dodge fixed at 20 for monsters (`src/combat/controllers.ts:444-625`). `proposeRoundProgram` returns a priority list and top-action gap (`src/combat/controllers.ts:627-640`). Scripted PCs materialize the first legal program and re-evaluate it live (`src/vtt/scripted-party-round.ts:300-343`, `src/vtt/scripted-party-round.ts:346-391`). | Not exposed to the monster LLM. | It already ranks legal commands (including PC Bless at `src/combat/controllers.ts:287-350`) but has no shared canonical expectation/roll-mode/ETA intel. The new evaluator should be shared rather than copied.
| Combat rules | **V:** Chebyshev grid distance is canonical (`src/combat/grid.ts:71-85`); ranged normal/long legality is typed (`src/combat/range.ts:4-34`). Condition clauses encode prone's near advantage/far disadvantage and unconscious advantage/critical-within-5 (`src/combat/conditions.ts:577-611`). Attack resolution combines all advantage and disadvantage sources so any presence of both becomes normal (`src/combat/encounter.ts:1752-1757`, `src/combat/encounter.ts:2019-2108`). A hit on a zero-HP death-save user adds one failure, or two on a critical (`src/combat/encounter.ts:2764-2790`); the forced critical is applied only within its typed distance (`src/combat/encounter.ts:6413-6424`, `src/combat/encounter.ts:6543-6557`). | Only the eventual reducer result, not a pre-action explanation, reaches planning. | Planning currently re-derives or misses these exact rules even though the reducer already owns them.

### R02: current surface versus required surface

**V from the stated judged case plus verified engine/statblock mechanics:** Scout has two
Longbow attacks at 150/600, Bandit has Light Crossbow 80/320, Priest has two
Mace/Radiant Flame attacks and Divine Aid bonus-action Bless, and Guard has Spear
5/20/60 (`src/combat/statblocks/mercenary-company.ts:15-50`,
`src/combat/statblocks/monsters.ts:157-167`). **P:** a compact rendering should look
like this (actual ids, probabilities, and path costs remain engine output):

```text
HIGH-LEVERAGE OPTIONS (rev 184)
scout-1  longbow×2 -> dying fighter | 85 ft NORMAL | move 0
         STRAIGHT [unconscious:+adv, prone>5:-adv] | hit: +1 death failure
         auto-critical only at <=5 ft
scout-1  longbow×2 -> AC15 wizard | 85 ft NORMAL | move 0 | P(hit)/shot ≈1/2
bandit-1 crossbow -> AC15 wizard | 85 ft LONG/-adv | move 5 -> NORMAL/straight
priest   radiant-flame×2 -> wizard | move 30, then 2×2d10 | bonus available:
         Divine Aid/Bless (3/day; concentration); omitting it wastes a legal slot
guard    spear/melee -> fighter | canonical path P ft incl. difficult terrain
         earliest attack turn T+N; Dash waypoint available this turn
TEAM DEFAULT: 2 scouts shoot now; bandits reposition 1 square and shoot;
priest advances, attacks twice, and Blesses; guard Dashes along the least-cost route.
DODGE COST: forfeits both scout two-attack sequences, two bandit shots after
one-square repositioning, the priest's two attacks and Bless, and the guard's
approach turn. Override only with a stated defensive reason.
```

The rendering intentionally says why the dying-fighter roll is straight: condition
sources are evidence, not prose supplied by the LLM. It does not expose coordinates or
paths; it preserves the existing semantic-intent boundary.

## 2. Gap inventory

| ID / class | Intel and source | R02 example | Cost | Impact | Size |
|---|---|---|---:|---|---|
| G1 **A+B** | **Canonical per-actor/target range matrix.** Exact Chebyshev distance, `melee/normal/long/out`, current legality, and range after minimum movement. Start from typed ranges and approaches (`src/vtt/engine-state-capsule.ts:19-33`) but replace the query-port normal=long collapse (`src/vtt/engine-query-port.ts:841-849`) with one shared range verdict. | `scout→fighter 85: normal, move0`; `bandit→wizard 85: long, move5→normal`. | Always top rows: 18-30/actor. Full matrix on request: 25-40/cell (~450-720 for 6×3). | **Critical**: prevents all-Dodge and false reach refusals. | M |
| G2 **B+C** | **Net roll mode with reason codes.** Reuse/refactor the reducer's source aggregation and cancellation (`src/combat/encounter.ts:2019-2108`), returning typed contributors rather than duplicating condition rules. | `straight = unconscious advantage + prone beyond 5 disadvantage`; a long-range disadvantage still collapses to straight when any advantage is present. | 8-20/retained attack row. | **Critical** target selection and honest probability. | M |
| G3 **B+C** | **Outcome probability, expected damage, and consequence flags.** Evaluate known AC/cover, net roll mode, crit range, multiattack/riders, and saves without consuming RNG. Reuse the exact analytic roll-state and hit/critical folds (`src/simulation/probability.ts:369-433`), but gather their source inputs through the canonical reducer path from G2. Replace the current normal-single-attack assumption (`src/vtt/mcp/engine-server.ts:325-331`). Consequences include `death_failure_on_hit`, `two_on_critical`, concentration check/break opportunities, down/kill probability where analytic. | `hit dying fighter: +1 failure; +2 only if critical; unconscious auto-crit gate <=5`. Priest row aggregates two Radiant Flames. | Always: 12-24/top row. Full distributions only on request: 30-70/row. | **High**: target priority, focus fire, resource use. | L |
| G4 **A+B** | **Zero-movement action availability.** Project all legal main/bonus/reaction slots, target count, and attack count; select `minimumMovementFeet===0` from canonical approaches. Do not infer from the current nearest-target option (`src/vtt/mcp/engine-server.ts:333-350`). | Both scouts: `2 attacks, move0`; show every actor with immediate offense before Dodge. | 10-18/actor always. | **Critical** and cheap. | S after G1/G7 |
| G5 **A+C** | **Minimal repositioning.** Return semantic improvements (`move ≤5 to normal range`, `move ≤speed to enable action`, `maintain range`) with before/after band, roll mode, and EV delta. Canonical path cost already exists (`src/vtt/engine-query-port.ts:660-697`); plays already recognize a reachable long-range upgrade (`src/vtt/snippets/registry.ts:207-243`). | `bandit: 5 ft canonical movement changes wizard shot long/disadvantage → normal/straight`; no coordinate shown. | Triggered only: 15-30/suggestion. | **High** positioning gain. | M |
| G6 **B+C** | **Difficult-terrain arrival time.** From least path cost and effective speed, compute earliest attack turn, current Dash progress, and next-turn attack origin. Use typed path costs, not straight-line distance (`src/vtt/engine-query-port.ts:521-564`, `src/combat/movement.ts:190-238`). | `guard melee: P cost incl. difficult; Dash now; earliest attack T+N`. Exact P/N must come from the fixture, never the LLM. | 12-24/melee actor always when no attack now. | **High**: makes Dash purposeful instead of Dodge. | M |
| G7 **A+B+C** | **Complete action economy and typed composite turn proposals.** Import statblock bonus actions, limited uses, main-action multiattack count/components, and legal combinations. Current registry excludes bonus actions (`src/vtt/engine-query-port.ts:375-390`); current one-choice intent cannot say “attack twice and Bless” (`src/vtt/intent-resolver.ts:13-53`); targeted `use_action` cannot execute multiattack (`src/vtt/engine-round-session.ts:373-400`). Replace this pre-alpha interface rather than add a compatibility adapter. | `priest: move30 + Radiant Flame×2 + Divine Aid/Bless`; `scout: Longbow×2`, not one atomic shot. | Always: 15-35/actor; detailed subactions on request. | **Critical**: fixes the largest action-economy omission. | L |
| G8 **B+C** | **Dodge opportunity cost.** Compare Dodge with best legal offense/advance: attacks, expected damage, bonus slots, multiattack components, resources, and approach progress forfeited. Emit only when Dodge is proposed or ranked near the top. | `all-six Dodge forfeits immediate scout attacks, bandit one-square shots, priest move/attacks/Bless, and guard approach`. | 12-30/Dodge actor; team aggregate 20-40. | **Critical** quality guardrail. | S after G3-G7 |
| G9 **A+B** | **Concentration/zone positioning.** Surface current concentration and relevant typed zone membership already projected (`src/vtt/engine-state-capsule.ts:44-58`, `src/vtt/engine-state-capsule.ts:76-94`). Add typed `starts_concentration`, `ends_existing_concentration`, exposure, ally coverage, and move-caused membership deltas only where the mechanic has an engine representation. Do not invent a generic “aura” from a name. | `Bless starts concentration`; if another concentration effect exists, mark replacement. Show which allies are eligible/covered only after typed targets/zones are resolvable. | Relevant casters only: 20-60 always; zone alternatives 80-200 on request. | Medium/high for casters; noisy otherwise. | L |
| G10 **A** | **Material replan explanation.** Surface materiality reason codes and the affected actor/target/condition, already computed for adjustment requests (`src/vtt/engine-state-capsule.ts:129-138`; `src/vtt/plan-materiality.ts:114-131`). | `wake: LIFE_STATE_CHANGED (fighter living→dying); recompute death consequences`. | 10-35 on adjustment only. | Medium: focuses small adjustment budgets. | S |
| G11 **C** | **Ranked team proposals.** Score bounded combinations of actor options with removal probability, overkill, concentration/resource cost, positioning, and target diversity. Reuse typed plays as candidate generators, then score with G1-G10. Return top K with deltas and assumption codes, never raw commands. | Top default is the offensive team line in the example; all-Dodge is dominated and omitted unless a defensive fact makes it non-dominated. | Always top 1: 80-140. Top 3 on request/escalation: 180-350. | **High**: reduces LLM work to genuine tie-breaks/narrative intent. | L |
| G12 **A+B** | **Visibility, cover, and movement-risk annotations.** Existing queries compute visibility/cover (`src/vtt/engine-query-port.ts:860-887`), while path schema already reserves opportunity/hazard/resource/visibility risks (`src/vtt/mcp/schemas.ts:74-90`). Populate those risks per option and include cover in G3 probability. | `shot visible, no cover`; or `5-ft improvement opens opportunity window: medium` rather than silently recommending it. | 8-20/retained row; detail on request. | Medium; prevents unsafe repositioning. | M |

### Pruned claims

- **V:** The engine cannot yet promise a complete expectation for every spell, save,
  rider, aura, or resource. G3 must return a typed `unresolved` result with assumption
  codes, never a guessed number.
- **V:** Existing `query_dice_expectation` is useful scaffolding, not canonical proof,
  because it only models a normal single attack (`src/vtt/mcp/engine-server.ts:665-679`).
- **V:** The regret rollout enumerator is not a canonical planning option menu: it emits
  only adjacent moves and a limited action set (`src/vtt/regret/legal-actions.ts:205-246`),
  and can fabricate a generic +7, 1d8+4 normal attack when typed data is absent
  (`src/vtt/regret/legal-actions.ts:73-95`). Its enumeration shape may inform G7, but its
  commands and fallback values must not cross the typed planning boundary.
- **P:** “Team expected value” is a bounded ranking heuristic, not an oracle for player
  behavior. It must expose its metrics and uncertainty and permit an override.

## 3. Division of labour and token policy

| Intel | Authority | Reason |
|---|---|---|
| G1, G2, legal parts of G4/G5/G6/G7/G10/G12 | **(iii) Engine decides outright.** | These are rules/state facts. The LLM may not override distance, band, cancellation, legal slots, path cost, ETA, or wake reason.
| G3 probability/consequences | **(iii)** when analytically resolved; otherwise typed `unresolved`. | A model must not fill a mechanical gap with a plausible number.
| G5 positioning, G9 concentration/zone posture | **(i) Engine annotates; LLM chooses.** | The engine owns consequences; tactical/narrative risk tolerance remains a DM choice.
| G8 Dodge comparison | **(ii) Engine computes a non-Dodge default; LLM may override with a bounded reason code/text.** | D418 requires algorithmic coverage of dominated choices without deleting legitimate defense.
| G11 team plan | **(ii) Engine supplies the top default and alternatives; LLM selects/edits or overrides with justification.** | This captures algorithmic competence while leaving genuine strategy and characterization to the DM.
| Targeting a dying PC, surrender, morale, mercy, hidden motives | **(i)** after mechanical annotation. | These are table/narrative policy, not derivable combat math.

**P typed boundary:** replace the one-choice `EngineTurnIntent` with a revision-bound
proposal that references engine-generated option ids. Exact names are provisional, but
the closed shape is not:

```ts
type EngineIntelResult<T> =
  | { readonly kind: 'resolved'; readonly value: T; readonly reasonCodes: readonly IntelReasonCode[] }
  | { readonly kind: 'unresolved'; readonly reasonCodes: readonly IntelGapCode[] };

interface EngineActorOption {
  readonly optionId: EngineOptionId;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId | null;
  readonly actionSlots: readonly EngineActionSlotUse[]; // main, bonus, reaction setup
  readonly movement: EngineMovementObjective;
  readonly range: EngineIntelResult<EngineRangeBand>;
  readonly rollMode: EngineIntelResult<EngineRollModeBreakdown>;
  readonly estimate: EngineIntelResult<EngineOutcomeEstimate>;
  readonly consequences: readonly EngineConsequence[];
}

interface EngineTurnProposal {
  readonly actorId: CombatantId;
  readonly primaryOptionId: EngineOptionId;
  readonly fallbackOptionId: EngineOptionId | null;
  readonly overrideJustification: EngineOverrideJustification | null;
}
```

The option id binds to capsule digest/revision and expands engine-side into movement and
all action slots. Coordinates, dice, modifiers, damage commands, and paths remain absent
from the LLM contract. Exhaustive switches have no default arm; known mechanics use
closed unions, while homebrew action ids remain branded passthrough ids.

Every intel envelope also carries a policy string. The evaluator, full/delta renderer,
on-request query, escalation brief, team scorer, and structured RL capture have distinct
versions (for example `tactical-evaluator-v1` and `dm-turn-intel-v1`). Any rule,
ranking, filtering, precision, or context-placement change bumps the affected version;
RL rows retain all versions so outcomes from different eras are not silently compared.

### Context placement

| Placement | Contents | Budget/default |
|---|---|---|
| **Always in full turn context** | One best immediate option and one best approach/defense alternative per actor; zero-movement count; compact range/roll/EV/consequence reasons; unused action-slot alert; ETA for actors with no attack; top team default; Dodge cost only if relevant. | Target **≤120 tokens/actor + 140 team tokens**, still inside the existing 32 KiB hard cap. Preserve `context_trimmed`.
| **Always in turn delta** | Only changed option ids/metrics, materiality reasons, and a new team default when it changes. | Structural delta; do not repeat unchanged matrices.
| **On-request DM read tool** | Paginated full actor×target matrix, distributions, alternate repositioning, cover/visibility/risk, concentration/zone alternatives, top three team proposals. | Advertise a bounded read-only intel query on the DM profile; default maximum 20 rows. Existing detailed query tools can be consolidated/replaced rather than exposed with their current misleading semantics.
| **Escalation repair brief only** | For each refused/open actor: top two legal offensive options, refusal-specific correction, Dodge opportunity cost; plus top three team proposals and unresolved gaps. | Target **≤2,000 tokens**, trim low-ranked rows before high-consequence facts. A fresh escalation must not receive less intel than the failed base model.
| **RL row only** | Full offered option ids, full-precision scores/probabilities, assumption/reason codes, selected id, override, dominated-option flags, and every applicable intel policy version. | Stored structured data is not prompt context. Existing raw/parsed context capture remains.

Model-visible numbers use integer expected values and coarse probability fractions (for
example `EV 7`, `P(hit) ≈1/2`), not decimal pseudo-precision. Evaluation remains exact
internally; full precision is serialized only into structured RL rows. This applies to
always-on, query, and escalation renderings because all three consume prompt budget.

## 4. Prioritized, dependency-ordered increments

| # | Independently shippable increment and acceptance criteria | PC AlgorithmController | RL capture |
|---:|---|---|---|
| 1 | **Canonical tactical evaluator (G1-G3 core).** One pure typed evaluator owns normal/long/out range, all-source roll-mode cancellation, known-AC/cover hit probability, base attack expectation, crit gate, and zero-HP consequences; resolver/executor consume the same verdict, including long-range base disadvantage. Remove the normal=long query collapse and normal-roll expectation as authoritative paths. Introduce the versioned-surface invariant and `tactical-evaluator-v1`; no intel surface may ship unversioned. Unit tests prove normal/long boundaries; advantage+disadvantage→straight; prone/unconscious at >5; critical only ≤5; hit/critical death failures. An R02-like fixture query prints both scouts at move0 normal range and the dying-fighter straight-roll/death consequence. | **Yes:** shared scoring facts become available; no policy change required. | **Yes:** capture evaluator policy/reason codes and exact probabilities.
| 2 | **Executable complete action inventory and composite proposal (G4/G7).** Registry includes typed main and bonus actions, availability/uses, multiattack components, and combinations; engine-side option expansion executes them. Replace the one-choice intent rather than adapt it. Tests prove Scout Longbow×2 and Priest move + Radiant Flame×2 + Divine Aid/Bless in one turn, and prove spent/unavailable slots are excluded. R02 context names both sequences. | **Yes:** the same slot model lets scripted PCs plan multi-command turns instead of one reducer command. | **Yes:** capture slot uses and option ids.
| 3 | **Compact actor intel plus DM query (G1-G4/G12).** Add versioned always-on top rows and a versioned paginated full matrix read tool to the DM profile; use coarse fractions/integer EV in both. Preserve state binding, output schemas, 32 KiB trim, and delta reconstruction. Tests prove target-specific (not nearest-only) visibility, cover, range, roll mode, probability, consequence, zero movement, truncation, and exact internal versus coarse rendered precision. Re-run the R02-like scene and assert every monster has an offensive/approach row and that the **always-on full context**, without a query call, contains `STRAIGHT` for shots at the dying fighter plus typed unconscious-advantage and prone-at-range-disadvantage reason codes. | Indirect (shared evaluator); no controller behavior change. | **Yes:** capture explicit offered-set fields, full precision, and renderer/query/capture policy versions.
| 4 | **Semantic repositioning and attack ETA (G5/G6/G12).** Compute before/after range/roll/EV, least-cost movement, opportunity/hazard risks, and earliest attack turn with difficult terrain. Tests include a one-square bandit upgrade, a blocked alternative, and guard routes whose ETA changes when difficult terrain is added. R02-like output shows bandit `move5` and guard `P/T+N`. | **Yes:** replace straight-line `move_toward` ranking with canonical progress/ETA. | **Yes:** movement option/reason capture.
| 5 | **Opportunity-cost guardrails (G8/G10).** Surface materiality causes and annotate any proposed Dodge against the best offense/approach. The engine default may not choose a strictly dominated Dodge; override requires a typed reason. Version the correction/escalation rendering independently. Tests prove all-six-Dodge is dominated in R02, legitimate Dodge remains available when no offense/approach exists, and adjustment context explains a new dying target. | **Yes:** remove the fixed monster Dodge score in favor of shared option dominance. | **Yes:** dominated/default/override labels and escalation policy version are training targets.
| 6 | **Concentration/zone intel (G9).** Add typed concentration start/replace/break risk and only mechanically represented coverage/membership deltas. Tests cover Bless replacement, loss on unconscious, and a persistent zone membership change. R02 context warns that Bless is available and starts concentration without inventing an aura. | **Yes** for spell/resource ranking. | **Yes:** concentration consequences and unresolved gaps.
| 7 | **Bounded team defaults (G11).** Generate candidates from typed plays/options, rank top K with explicit metrics/uncertainty under its own policy version, compact top one into context, and put top three in query/escalation. Tests prove determinism, bounded search/output, no overkill double-counting, and all-Dodge exclusion when dominated. A judged R02-like rerun must contain the exact intel assertions from increments 1-6 and produce/select an offensive default; record judge score separately from authorization rate. | **Yes:** the same scorer can coordinate scripted-PC shared objectives. | **Yes:** scorer version plus offered/chosen/rank/regret fields support preference and offline evaluation.

Each increment must also mutation-test at least one retained expectation: do not generate
expected matrices from evaluator output. Hand-author the R02-like oracle from the fixture's
positions/statblocks and independent probability formulas.

## 5. Open questions for the owner

1. **Should the engine ever prefer attacking a dying PC?** Recommended default: expose
   exact death-save consequences but leave target choice to the DM/encounter policy; add
   no universal “finish the dying” bonus.
2. **How much exact defensive information may the monster planner see?** RESOLVED by
   D418.1 (2026-08-30): the DM is omniscient about PC capabilities and resources — exact
   AC, HP, slots, and spell availability are DM-known. Knowledge labels collapse to
   known/`unresolved` (mechanics gaps only) on the DM side. Superseded recommendation
   default: use only DM-known values and label knowledge (`known`, `estimated`,
   `unresolved`); show probability rather than leaking a hidden AC/source statistic.
3. **May the LLM override a dominated engine default?** Recommended default: yes, with
   one typed reason (`morale`, `objective`, `roleplay`, `resource_conservation`,
   `unknown_engine_gap`) plus optional bounded text. Capture it in RL data.
4. **Should the engine auto-submit its default if the model fails?** Recommended default:
   yes for a fully resolved legal default after the single correction fails; never replace
   an `unresolved` mechanic with Dodge. This changes the present deterministic all-Dodge
   exhaustion behavior (`tools/ai-dm-conversation.ts:2413-2437`) and should be separately
   owner-approved before implementation.
5. **What is the permanent prompt budget?** Recommended default: retain 32 KiB hard
   maximum, budget 120 tokens per actor plus 140 team tokens, and require measured p90
   context/token results before increasing either.
6. **How broad should v1 expected value be?** Recommended default: attacks, multiattack,
   direct saves, cover, conditions, crits, death saves, and typed always-on riders; spells,
   zones, or resources without a proved analytic model return `unresolved` until later.
7. **Should composite proposals replace `EngineTurnIntent` immediately?** Recommended
   default: yes. This is pre-alpha; replacing the one-choice contract is safer than a
   compatibility layer that continues to hide bonus actions and multiattack.
8. **Should concentration/zone positioning influence the default or only annotate it?**
   Recommended default: annotate in v1; promote to scoring only after coverage and
   exposure metrics have independent oracle tests.

## Consensus process

Claude and Codex performed a dual-blind sweep: Claude's draft was sealed before it read
this document or this document existed, then round 2 compared both against the code.
Claude's sealed SHA-256 is
`80acb1ac4dbde6fccd55cd4a9442fb8f8c24c250e51b2bcfb33648b47a916b37`.

One material claim in the sealed draft was refuted: it said attack resolution never
derives roll mode from target conditions and instead accepts a caller's default normal
roll. That is false. The reducer gathers visibility, effects, condition clauses, Dodge,
and other sources and combines any advantage-plus-disadvantage mixture to normal
(`src/combat/encounter.ts:1752-1757`, `src/combat/encounter.ts:2019-2108`).

The cross-review found three further corrections. The capsule does not reach the LLM
wholesale; `fullTurnContext` selectively renders actors/options and trims them
(`src/vtt/mcp/engine-server.ts:459-529`). The regret legal-action list is a limited
simulation helper with fabricated generic fallback attacks, not a canonical planning
menu (`src/vtt/regret/legal-actions.ts:73-95`, `src/vtt/regret/legal-actions.ts:205-246`).
The draft's `50% × 6.5` example is not full attack EV because exact expectation must
separate hit and critical probability (`src/simulation/probability.ts:397-433`); its
unqualified `ceil(path/speed)` arrival formula was also an inference, so G6 retains a
typed earliest-attack-turn computation rather than adopting it.

All three proposed grafts were adopted: every intel surface is policy-versioned; prompt
renderings use integer EV/coarse fractions while RL retains full precision; and increment
3 requires the R02 straight-roll line plus reason codes in always-on context, not merely
the query tool. No graft was rejected.

Round 3 was a Fable-authored supplement, Codex-verified: refuted M2's state/revival claim,
M3's future-OA premise, M4's dormant premise, and M7's path/rendering claims; amended M1,
M5, M6, and Q9 as recorded below.

## Round 3 supplement — time windows and adjacent option sources

This additive review retains every item only as amended below. M1 is new despite G6/G10;
M2 refines Q2; M3 is partly implied by G7/G12; M4 is absent; M5 generalizes G8/G11; M6
adds prompt-budget migration; M7 makes G7/G12 boundaries explicit. All surfaces inherit
the versioning and precision rules above.

| Item / verdict | Verified or refuted current state | Negative space and accepted design |
|---|---|---|
| **M1 Initiative/consequence windows — accepted, amended** | Initiative carries combatant/total/roll/bonus/slot (`src/combat/encounter.ts:359-366`); the AI capsule exposes active side/combatant but no order (`src/vtt/engine-state-capsule.ts:79-94`). Fable missed the reusable DM-board timeline: it already types ordered combatants plus legendary, expiry, burn-away, and repeated-save boundaries (`src/vtt/session-timeline.ts:7-65`, `src/vtt/session-timeline.ts:119-180`) and is wired at `src/vtt/encounter-projections.ts:299-323`. | G6 predicts attack arrival, not who acts before a target/boundary. Reuse the timeline. Engine owns order/count **(iii)**; LLM owns target choice **(i)**. Always emit only a 6-12-token salient window when order changes a top option; pairwise/full order is on request. Include neutral target-turn/death-save/expiry timing, never a universal finish-dying-target incentive. Size M; join increment 3 and feed G10/G11/adjustments. |
| **M2 Recovery-capability windows — accepted, substantially amended** | **Refuted:** encounter state does not hold full PC spell lists. It holds slots (`src/combat/combatant.ts:59-69`, `src/combat/encounter.ts:294-350`); prepared/known spells live in a separate loaded-party layer (`src/vtt/party-pack.ts:1285-1312`) that can enumerate healing/revival (`src/vtt/party-pack.ts:2825-2937`). Slots alone cannot prove capability. The draft also conflated healing a dying creature with revival: current healing excludes dead targets, while Revivify enumerates dead allies (`src/vtt/party-pack.ts:2838-2842`, `src/vtt/party-pack.ts:2916-2930`). | Q2 labels knowledge but has no capability window. After G7+M1, a shared canonical opponent-option provider may emit `known_recovery_before_boundary` with knowledge/source codes; otherwise typed `unresolved`. Neutral M1 timing may be always-on; rescuer/range/spell/resource is on-request and policy-gated. Engine owns proved capability **(iii)**, LLM response **(i)**. Cost 8-20 only when salient; size M, not S. |
| **M3 Reaction spend/hold — accepted, amended to a current gap** | Policies and OA decisions exist (`src/combat/encounter.ts:384-394`, `src/combat/encounter.ts:421-471`), but Fable's cited lines do not prove Shield; its triggering attack reversal is at `src/combat/encounter.ts:6399-6411`. **Refuted:** OA has already landed: preview detects eligible windows and execution applies ask/always/never (`src/combat/encounter.ts:3571-3612`, `src/combat/encounter.ts:4500-4535`). | G7 reserves the slot and G12 marks path risk, but neither compares spend/hold nor improves sticky LLM guidance (`src/vtt/reaction-guidance.ts:11-30`). At an actual trigger, show immediate resolved value plus qualified possible future opportunities—never claim a PC will provoke. Engine default, LLM typed-policy override **(ii)**. Zero ordinary-turn tokens; 20-60 at a reaction prompt or compact material guidance. Size M after evaluator/G7. |
| **M4 Legendary windows/resistance — accepted; dormant premise refuted** | Uses are projected but not rendered (`src/vtt/engine-state-capsule.ts:44-51`, `src/vtt/mcp/engine-server.ts:299-313`). **Refuted:** support is not awaiting imports. Unicorn is bundled (`src/combat/statblocks/monsters.ts:211-278`); the reducer queues/executes legendary actions and resistance (`src/combat/encounter.ts:4365-4477`, `src/combat/encounter.ts:3005-3057`). The AI boundary loop handles only reactions/death saves, omitting legendary decisions (`src/vtt/engine-round-session.ts:136-181`). | G7 is broad but does not name interleaved legendary choices; M1 gives timing, not value. Treat as current integration. Always show 8-16 compact tokens for relevant uses/next window; show 30-80-token alternatives only pending/on request. Engine scored default with LLM policy override **(ii)**; legality/charges **(iii)**. Size M after increments 1+3, not S after a future import. |
| **M5 Submission dominance — accepted, amended** | Rows store suggested play/adoption (`tools/ai-dm-conversation.ts:282-307`, `tools/ai-dm-conversation.ts:2724-2735`), but the repo does not establish that R02 was an edited `focus_fire`. `edited` means only that one submitted choice matches (`tools/ai-dm-conversation.ts:740-755`), not quality/dominance. | G8/G11 imply dominance; the addition is submission-time enforcement. Do not compare only with a heuristic suggestion. Compare with the canonical resolved non-dominated frontier; trigger only if another plan is no worse on every declared metric and better on one. Unresolved/incomparable metrics block refusal. Return 20-60-token deltas under G8's override **(ii)**. Actor check S after increment 5; team check M after increment 7. |
| **M6 KB/doctrine migration — accepted, amended** | K6 is 2,767 bytes mixing workflow, mechanics, and tactics (`tests/fixtures/ai-dm-kb/k6.txt:1-26`). It is loaded/hashed as session instructions and capture keeps instructions plus `kbHash` (`tools/ai-dm-conversation.ts:511-522`, `tools/ai-dm-conversation.ts:866-875`, `tools/ai-dm-conversation.ts:2185-2200`, `tools/ai-dm-conversation.ts:2724-2735`). The base did not budget it. | Do not strip doctrine inside every intel increment: that confounds evaluation, and session instructions are not per-turn context. Classify lines as workflow/mechanical fact/strategy/persona; remove facts only after typed enforcement, workflow after tool enforcement, strategy after G11 evidence. Run separate versioned one-variable A/B removals after increments 3/5/7, retaining KB/intel versions; gate on quality+authorization and total session input tokens. Size S/experiment. |
| **M7 World objects/stealth — accepted, amended** | **Refuted:** cited `src/vtt/world-object-actions.ts` does not exist; the implementation enumerates class actions and separate DM overrides at `src/combat/world-object-actions.ts:16-89`. State carries objects/fog/hidden/pending decisions (`src/combat/encounter.ts:500-539`). Context does not render none: it exposes blocking object ids as terrain tags, but omits object actions and emits empty pending ids (`src/vtt/mcp/engine-server.ts:299-313`). | G7 implies non-statblock sources but omits them in acceptance; G12 omits stealth knowledge. Add eligible `use_world_object` choices to G7/increment 2, salient always or on request. Never offer `dm_use_world_object` as a monster option. Never expose raw hidden/fog state; a later actor-knowledge projection emits perceived or typed-unknown targets under Q9. World-object inventory M; stealth separately triggered. |

### Supplement placement

- M1 joins increment 3 with salience gating; M2 follows M1 and G7 after Q9.
- M3 follows the evaluator/G7 and renders chiefly at reaction boundaries.
- M4 follows increments 1 and 3 as a current pending-decision integration, not an import flag.
- M5 extends increment 5 per actor and increment 7 at team level.
- M6 is evaluated separately after increments 3, 5, and 7; it is not bundled into them.
- M7 adds world-object class actions to increment 2; stealth waits for its knowledge projection.

### Additional owner question

9. **What may opponent-capability intel reveal?** RESOLVED by D418.1 with Q2: exact PC
   capability intel is permitted; the M2 implementation note stands (PC spell data must be
   threaded from the party pack into the intel layer — encounter state alone lacks it).
   Superseded refinement text: may the monster planner
   see PC prepared/known spells and remaining slots, or only neutral initiative/consequence
   timing? Recommended default: neutral timing always; exact capability only when the
   configured knowledge policy marks it known, with all other cases typed `unresolved`.
