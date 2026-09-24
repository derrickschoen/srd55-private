# DATA-01 — Luna-labelled DM-decision candidate-corpus plan, fix r3

Outcome: DATA-01 produces a versioned, validated candidate corpus plus evaluation harness. It does not certify that the corpus is sufficient to train a Jev-like model; the downstream training unit alone can do that through the frozen learning-curve and final-audit protocol below. The model chooses actions; narration and malformed-submission correction remain out of scope.

## 1. Binding rulings and unresolved operations

Owner rulings, kept distinct from interpretations:

- D841: the total Luna hard cap is **$500**, including pilot, retries, ambiguity re-asks, and recollection.
- D844: the style is **strongest legal monster tactics**—play to win within the rules, without balance/flavour softening—and Opus high plus Sol high judge Luna's actions.
- D845: both judges cover every labelled state; their blinded scores are separate training-signal columns, and the engine ranking is withheld.
- D846: every state is run under several strategy tunings; the objective is chance of winning.
- D852/D852.1: Opus has a separate **$400 starting cap**, inclusive of judge pilot calls, retries, and re-judging, and revisable after pilot receipts. Coverage is never silently reduced.
- D853: `adjustment_disposition`, `adjustment_replacement`, and a typed reason for retaining/replacing are paid v1 labels. Corrections remain excluded.
- D854: blinded repetition per state/tuning and rollout repetition are set by preregistered significance rules; repetition is fixed first, tunings second, and state count follows from the caps. (r2 P2-1)
- D885 §12a authorizes this fix r3 and one fresh gpt-5.6-sol high read-only review r4; D860 sets that reviewer model. This plan does not dispatch it.
- D886 §12b selects main's D847 best-effort monster-knowledge rule for B4–B6; those rows carry a versioned baseline id. (S-6)
- D887 makes the DATA-01 teacher `gpt-6-luna` at `xhigh`. (S-7)

The following remain **supervisor readings, pending owner confirmation**, not owner words: (a) the primary training target is the tuned action with the highest significantly supported simulated win probability; (b) Opus/Sol supplement rather than replace the human audit; (c) each judge uses one packed call per state covering all tuned candidates; and (d) judges assess whether an adjustment reason is consistent with typed materiality inputs. Teacher preference, outcome evidence, and each judge's evidence remain separate columns so a later owner correction changes selection, not raw evidence. (r2 P2-1)

One semantic owner input remains open. D847 put `MONSTER_KNOWLEDGE_BEST_EFFORT_INSTRUCTION` into the AI-DM engine prompts, while D844 says “strongest legal monster tactics” and the DATA-01 teacher sees the full projected context. Option A adds that knowledge instruction to teacher and judge rubrics: labels mean the strongest tactic under actor-plausible knowledge, judges enforce the same limit, and `hidden-visible` measures performance under that limit. Option B omits it from both DATA-01 rubrics: labels are full-context tactical-oracle labels, judges may reward use of hidden context, and `hidden-visible` is an exposure-sensitivity cross rather than actor-believable play. Do not choose between them. Freeze `teacher_rubric_id`, `judge_rubric_id`, and `monster_knowledge_baseline_id` so either answer slots in without redesign. B1–B3 unit/stub work may proceed, but the paid teacher pilot and judge prompt freeze wait for this answer. D886 already chooses Option A for B4–B6's generation baseline; it does not answer the judge-rubric question. (S-4)

The three former questions answered by D841/D844/D853 are not re-asked. Three **distinct** human roles remain open: named qualified primary auditor, second scorer, and third adjudicator; no person combines roles because the adjudicator must resolve disagreements independently. Paid scale cannot pass until all three are named. (r1 P3-3) (r3 P3-2)

## 2. Label contracts and total derivation

The revision-bound question uses catalog `option_id`, never array index. Question, prompt, projector, rubric, model snapshot/effort, sampling contract, baseline, split, and label schemas are independently versioned.

| Contract | Input delta | Stored result |
|---|---|---|
| `primary_option` | current no-override eligible catalog | per-tuning teacher distribution; nullable teacher hard choice; outcome vector; categorical outcome-selected primary |
| `fallback_option` | condition on a dominant aggregate teacher primary | distribution over highest-ranked different option; no extra request |
| `adjustment_disposition` | committed proposal, remaining budget, typed materiality delta | `dominant(retain|replace)` or `none_dominant`, plus typed WHY distribution |
| `adjustment_replacement` | eligible alternatives excluding baseline | conditional distribution/hard choice when `replace` dominates; no extra request |

The master categorical type is `{status:"dominant",option_id}` | `{status:"none_dominant",option_id:null}` | `{status:"only_tuned_candidate",option_id}`. `only_tuned_candidate` stores the sole option as outcome-selected primary but explicitly excludes the row from hard outcome-primary training because no superiority claim exists; its rollout estimate remains evidence. Zero candidates emits `none_dominant`. A hard teacher label exists only after §4 passes; soft distributions retain every valid sample. None-dominant rows never receive lexical/hash pseudo-labels. (r3 P2-3)

Adjustment WHY is `{kind:baseline_still_best|legality_changed|target_changed|position_changed|resource_changed|combatant_state_changed|risk_changed|better_option_now, materiality_refs:[typed paths]}`. `retain` requires `baseline_still_best`; `replace` requires another kind plus a matching typed materiality reference. Judges score legality/style separately from WHY consistency. Primary tactical reasons retain `immediate_damage|control|survival|resource_preservation|positioning|target_priority|ally_synergy`; advice reliance and uncertainty are separate flags.

Reason aggregation uses actual valid `n`: store the full vector; emit a unique modal reason only when its Bonferroni-adjusted Clopper–Pearson 95% lower bound across the closed reason set exceeds 0.50, otherwise `mixed`. Primary tactical reasons are audit-only; adjustment WHY is the D853 auxiliary target, never override authority. (r1 P3-2) (r2 P3-3)

Total conditional behavior:

- Dominant primary: derive fallback from each valid complete/top-two response's highest-ranked non-primary option, then apply §4. A verified pairwise winner/runner-up supplies the ordering.
- None-dominant primary, including `2/2/1`: retain soft primary; omit fallback with `primary_condition_unresolved`.
- Zero/one eligible alternatives: emit no learning row and record `no_eligible_alternative`/`single_eligible_alternative`; deterministic controller behavior is metadata.
- Tied/none-dominant disposition: retain its soft distribution and WHY; omit replacement with `adjustment_disposition_unresolved`.
- A replacement ranking enters the conditional denominator **only** when that replicate has valid disposition `replace` and a valid replacement ranking. Conditional looks are `10,20,40` when replacement K≤4 and `20,40` when K≥5 (or the first supported look from §4's formula). Evaluate accumulated conditional rankings whenever their count reaches a look, independently of disposition looks; a replacement result is not emitted unless disposition has become dominant `replace`. Dominant `retain` discards conditional rankings from learning but retains them in audit evidence. After dominant `replace`, keep sampling until replacement separates, reaches conditional n=40, or the actor hits 60 attempted calls. At n=40 evaluate the look first: a pass emits the hard replacement; a failure, or hitting 60 attempts before sufficient conditional n, emits no hard replacement and `insufficient_valid_replacement_rankings`. (r3 P2-3)
- Complete ranking is an exact permutation; top-two is exactly `min(2,K)` distinct eligible IDs; pairwise has one winner per declared pair plus an acyclic verified top two. Partial formats never validate as complete. (r2 P2-4)

Current `engine-server.ts` rejects dominated options without typed override. V1 learns the no-override executable task: include a non-dominated option, or an engine default, only after a null-override submission probe accepts it. Preserve exclusions/reasons in audit metadata; DATA-01 never fabricates override authority. (r1 P2-8)

## 3. Actor-local statistics over packed physical requests

A boundary is one pre-decision primary or adjustment state. One physical teacher request is `one boundary × one tuning × one request wave`; it packs every actor still active in that wave. Actor/question is the statistical unit. Fallback/replacement add no separate request. Use a new direct Responses client with strict JSON Schema, no prose, `gpt-6-luna`, `xhigh`, and a stateless request (no shared thread). The route probe records effective snapshot, effort, schema mode, requested sampling parameters, input/output/reasoning tokens, billed-output treatment, and provider request id. Unsupported/unreported parameters force a new sampling-contract version before the pilot. (r2 P2-2) (S-7)

Actor/option identities are request-local aliases; catalog order is independently shuffled. The four tunings are `focus_weakest`, `focus_threat`, `control_first`, and `attrition`, all subordinate to legality/winning. No request sees another answer, engine advice, outcomes, or judges.

| Event | Sample/attempt transition | Counts toward 60 attempted calls? | Counts toward valid n? |
|---|---|---:|---:|
| valid actor item | close that logical sample; new sample id only if another replicate is needed | yes | yes |
| failed/missing actor item in otherwise valid envelope | repair same logical sample id with new attempt id | yes | no, until repaired valid |
| completed but invalid actor output | close invalid sample; create new logical resample id and new attempt id | yes | no |
| malformed envelope or ambiguous transport | every contained actor remains pending under same sample ids until provider request-id reconciliation; then valid items close or completed-invalid items resample | yes once dispatched, even if later unbilled | no until reconciled valid |

All actors needing work are packed into the next stateless wave even when their logical sample ordinals differ. A separated, n=40 none-dominant, or 60-attempt actor is removed; unresolved actors continue and the request shrinks. Fresh aliases/order, no sample ordinal, no shared thread/cache key, and no prior-response text prevent the teacher from knowing which actors disappeared; it sees only the current pack. Physical attempts per boundary/tuning equal the **maximum active actor attempt depth**, never the sum or mean. Audit retains hashes, provider id, usage, error, latency, membership, logical ids, attempt ids, and reconciliation. Format/agreement calls in §4 are fixed attempts with no repair; failure lowers their gates rather than expanding that ledger. (r3 P2-2)

Input is rejected above 12,000 tokens. The billed-output cap is set only after the route probe proves support and xhigh reasoning/output billing. Dispatch requires `settled + ambiguous_hold + in_flight_reserve + next_reserve <= cap`; receipts override estimates. Opus uses the same rule against $400; Sol stops on usage limits. (S-7)

One judge request is `one boundary × all unique tuned candidates/reasons`. Opus and Sol independently see blind mechanics, the selected rubric/materiality, and no teacher/tuning identity, engine ordering, rollout, or other judge. Store legality, rubric quality, pairwise preference, confidence, and WHY consistency separately. They are auxiliary targets/hard-example flags, never primary labels or hidden weights. Both columns are required for release.

## 4. Pilot, repetition, and quality gates

### Format selection and exact boundary strata

Build the 200-boundary pilot by `Kmax = max eligible-option cardinality among nontrivial actors in the packed boundary`. Seeded-shuffle eligible boundaries within each of `2`, `3–5`, `6–10`, `11–17`, `18+`, then take exactly 30 primary and 10 naturally reached adjustment boundaries per bucket. One boundary belongs only to its Kmax bucket even when its actors span buckets; actor metrics still report actual actor K. A short stratum is unsupported, never borrowed. This makes `5 × 40 = 200` boundaries and `150/50` exact. (r3 P2-2)

Each boundary/format gets three fixed attempts; the selected format gets two more. Targeted pairwise packs a preregistered bracket plus top-three verification (`K+2` comparisons) or is unsupported if a token ceiling fails. `focus_weakest` is the named format-selection tuning, but **none** of these calls is credited to any significance look: changing response format/protocol prevents the identical-input gate required for reuse. Agreement calls, route probe, and load calls also receive no credit. (r3 P2-2)

For each bucket/format report actor validity/refusal, top-1 agreement, top-2 overlap, entropy, cycles, and cluster-weighted position sensitivity. Validity requires point ≥98% and Wilson 95% LCB ≥95%. Position sensitivity is the maximum selection-probability difference across occupied normalized-position quintiles; require point ≤5 points, cluster-bootstrap UCB ≤10, width ≤10. Selection is: K=2, lower-UCB valid complete versus pairwise, tie complete; K=3–5, first eligible complete/top-two/pairwise, where top-two needs ≥90% top-1 agreement and pairwise cycle UCB≤5%; K≥6, lowest sensitivity UCB among eligible formats, ties top-two/complete/pairwise, with top-two ≥90%/80% top-1/top-2 agreement. No eligible format blocks the bucket. (r1 P2-7) (r2 P2-3)

Thus complete 98%-valid versus top-two 100%-valid has a defined result. If complete is invalid, agreement is computed on its valid subset and is descriptive, not a gate. If no format passes, block the bucket, version/revise the prompt, and buy no production labels there. Pairwise ambiguity remains soft; discarding uncertain states to improve apparent quality is forbidden. (r1 P2-7) (r2 P2-3) (r4 restore P2-2)

Accordingly, the top-two agreement thresholds in the preceding selection rule apply only when complete has valid responses; when complete is invalid, top-two eligibility is decided by its absolute gates and agreement is descriptive. (r4 reconcile P2-2)

### Direction-safe sequential teacher rule

At a look for K options, define every **ordered** hypothesis `H(i,j): p_i <= p_j`, `i != j`; the family has `m=K(K-1)` and therefore includes both possible directions before seeing data. For each pair condition out other-option votes and compute the exact one-sided binomial upper-tail p-value for i's count under `Binomial(n_i+n_j, 0.5)`. Apply Holm step-down to all m p-values at per-look alpha `0.0125`. Only after adjustment identify the unique empirical leader; emit it iff its overall share is ≥0.60 and every `H(leader,j)` rejects. If an emitted option is not a true best, at least one true directional null was rejected; Holm bounds that event at 0.0125 per look, and Bonferroni over at most four looks bounds familywise error at 0.05 without independence. Ties cannot emit. (r3 P2-1)

There is no futility/early-none stop. Production actor looks are `10,20,40` for K≤4; `20,40` for K≥5 when the formula below makes 20 attainable; otherwise the first of 20/40 at or above `n_min`; K with `n_min>40` is unsupported. Pilot boundary waves are conservatively `10,20,40` only for Kmax=2 and `20,40` for the other four strata, so every physical row can emit a hard label. Unresolved at n=40 and any actor reaching 60 attempts before its required valid n both emit `none_dominant` (with distinct audit reasons `no_separation` or `attempt_ceiling_nonresponse`). The same binary rule applies to disposition. (S-1)

For unanimity, the smallest mathematically attainable n solves `0.5^n <= 0.0125/[K(K-1)]`:

| K | ordered m | theoretical n_min | first production look | pilot stratum first wave |
|---:|---:|---:|---:|---:|
| 2 | 2 | 8 | 10 | 10 |
| 3 | 6 | 9 | 10 | 20 |
| 4 | 12 | 10 | 10 | 20 |
| 5 | 20 | 11 | 20 | 20 |
| 6–10 | 30–90 | 12–13 | 20 | 20 |
| 11–17 | 110–272 | 14–15 | 20 | 20 |
| 18+ | `K(K-1)` | `ceil(log2(K(K-1)/.0125))`; K=18 →15 | first 20/40 ≥ n_min | same; unsupported if >40 |

The §12 Monte Carlo applies this exact procedure across looks; equal/tied-best configurations count **any** hard label as erroneous because no unique true best exists. (S-2)

### Judge and human gate

After prompt freeze, select the same seeded, Kmax-stratified 100 boundaries (20 per stratum) from the 200-boundary pilot and repeat all 100 under each tuning rather than dividing them among tunings. For every boundary/tuning, issue five new independent replicate requests, so the agreement gate costs `100 × 4 × 5 = 2,000` calls. Compute the cluster-bootstrap LCB for top-1 agreement and UCB for mean JS separately for each tuning, with no pooled gate; every tuning must pass LCB ≥0.70 and UCB ≤0.20. A failure by any one tuning blocks all paid scale because the required corpus protocol includes all four tunings; pooled cross-tuning results are descriptive only. This per-tuning design prevents stability under one tactic prompt from being extrapolated to the other three. Judge disagreement/illegality quarantines a row; anyone/model changing labels is excluded from untouched final evaluation. (r4 P2-1)

The representative human sample is 100 uniformly chosen components and one row/component; only it estimates component-macro acceptability. Separate 50-row teacher–engine and 50-row none-dominant/high-K/difficult strata find errors and are never pooled. The primary auditor scores all; the distinct second scorer blindly rescores random 20% plus every unacceptable/illegal card; the distinct third adjudicator resolves disputes. Cards hide source/tuning/engine/teacher/judges. Scale requires representative unacceptable-rate Wilson 95% UCB ≤10%, reported n≥20 bucket UCB ≤20%, and no systematic class with LCB >5%. (r2 P2-5) (r3 P3-2)

Multi-tag overlaps count once within a stratum and are replenished from that stratum under recorded inclusion probabilities. (r4 restore P2-3)

Certification uses fresh people/cards: 100 component-random student choices plus 100 enriched student–teacher disagreements, separately reported. This audits the student, not merely the teacher.

## 5. Outcome target and rollout significance

Teacher, engine, outcomes, and each judge stay separate. A tuning contributes a hard candidate only after §4; zero candidates is `none_dominant`; one is `only_tuned_candidate`; ≥2 needs rollout superiority. (r1 P2-10)

Batch 5 builds a current-package runner with explicit initial seed injection, complete primary/fallback/adjustment packages through authorization and `EngineRoundSession`, fixed modal-teacher policy for other monsters (engine default if none-dominant), a versioned scripted player policy, deterministic later monster defaults, preserved baselines/budgets, and multi-slot tests.

At cumulative `64,128,256,512` **successful rollouts per candidate**, define all ordered `H(i,j): win_i <= win_j`. Use the one-sided Fisher exact test on the 2×2 win/non-win table for every ordered pair, Holm across `K(K-1)` at alpha 0.0125 per look. After adjustment, select the unique empirical leader only if every outgoing hypothesis rejects. This includes every data-selected direction; any false winner implies a false directional rejection, so four-look FWER is ≤0.05. Otherwise continue and at 512 emit `none_dominant`; ties also emit it. Each candidate has a maximum **640 attempted rollouts**. Hitting it before the next successful look stops the candidate set and emits `none_dominant` with `attempted_rollout_ceiling`; failure >1% or censoring >5% also blocks a hard outcome and triggers fix/horizon preregistration. No adjusted interval is claimed. (r3 P2-1)

Disjoint independently derived seed sets are default; only implemented event-keyed common substreams permit paired inference. Terminal victory is win; horizon/unresolved is non-win in primary analysis and is reported under exclude/best/worst sensitivity. Report survival, HP/resources, censoring, failures, draws, and variance. Run initially to terminal or five additional rounds/10,000 steps. Benchmark 100 complete candidate-seed rollouts and project `sum(candidate attempt ceilings)/measured throughput`, p50/p95 by bucket. (r2 P2-1)

## 6. Cost, capacity, and owner-facing pilot report

The reserve `r` is not known locally for gpt-6-luna xhigh. Before any pilot beyond the one route probe, measure actual input, visible output, reasoning tokens, the enforced billed-output cap, and current provider price; version them. The old basis is 12k input at $0.20/M plus 8k output at $1.20/M = `$0.012`. A LUNA6 reviewer reported $0.10/M input and $0.50/M output, but the supervisor did not verify it; it remains **UNVERIFIED**, not a pricing fact. (S-7)

No-failure pilot ledger:

| Work | Requests |
|---|---:|
| 200 × 3 formats × 3 attempts | 1,800 |
| selected-format two-attempt top-up | 400 |
| independent 100 × 4 tunings × 5 agreement calls | 2,000 |
| route probe + load test | 1 + 100 |
| significance minimum: 40×4×10 + 160×4×20 | 14,400 |
| significance scheduled maximum: 200×4×40 | 32,000 |
| **total minimum / scheduled maximum** | **18,701 / 36,301** |
| absolute significance attempted envelope: 200×4×60; total | **48,000; 52,301** |

At `$0.012`, minimum is `$224.412`; scheduled maximum is `$435.612` = **87.12%** of the $500 cap; absolute attempted envelope is `$627.612` = **125.52%**, a `$127.612` shortfall. Thus the pilot alone may consume most or more than all of the cap. This appears verbatim in the owner-facing pilot report alongside separation, failures, actor K/depth, requests, receipts, and projected production yield. No significance rule is loosened: if the route-derived `r` makes completion exceed the cap, stop and ask the owner to revise the cap/scope. (r3 P3-1) (S-7)

| Price/output basis (12k input) | r | min 18,701 | scheduled max 36,301 | attempted max 52,301 |
|---|---:|---:|---:|---:|
| old $0.20/$1.20, 8k | .0120 | $224.412 | $435.612 | $627.612 |
| old, 16k / 24k / 32k | .0216 / .0312 / .0408 | $403.942 / $583.471 / $763.001 | $784.102 / $1,132.591 / $1,481.081 | $1,129.702 / $1,631.791 / $2,133.881 |
| UNVERIFIED $0.10/$0.50, 8k | .0052 | $97.245 | $188.765 | $271.965 |
| UNVERIFIED, 16k / 24k / 32k | .0092 / .0132 / .0172 | $172.049 / $246.853 / $321.657 | $333.969 / $479.173 / $624.377 | $481.169 / $690.373 / $899.577 |

The absolute attempted envelope fits only if `r <= 500/52,301 = $0.00956005`; even the scheduled maximum needs `r <= $0.01377373`. (S-7)

Physical production capacity uses `D=max_a(attempt depth of still-active actor a)` for each packed boundary, so cost is `4Dr`, not a mean actor n:

| max active depth D | requests/boundary | cost at .012 | new boundaries after min pilot | after scheduled max |
|---:|---:|---:|---:|---:|
| 10 | 40 | $0.480 | 574 | 134 |
| 20 | 80 | $0.960 | 287 | 67 |
| 40 | 160 | $1.920 | 143 | 33 |
| 60 attempted | 240 | $2.880 | 95 | 22 |

These are zero-hold ceilings and not deliverables. Actual capacity is `floor((500-settled pilot-ambiguous holds-reserved repairs)/(4*r*D))`. Production targets 75% primary/25% natural adjustment boundaries but never synthesizes the mix. Accepted nontrivial actor questions are the yield measure. (r3 P2-2)

Opus capacity is recomputed from pilot receipts and the $400 starting cap; every boundary still needs both judges. A shortfall is reported, never filled with nulls or reduced coverage. The corpus milestone remains beyond this pilot: even optimistic capacity does not establish ≥28,600 accepted questions. Batch API remains out of scope because looks/reconciliation are sequential. (r1 P2-11)

## 7. State supply and diversity

The archive has 19,080 initial actor slots but 770 distinct hashes/3,194 distinct-hash actor slots; 716 recur across 155 seeds and two families. All 5,109 serialized captures lack `phase`, `rulesEdition`, and `hiddenRolls`; legacy actions have no current selected option. These are pre-migration ceilings. (r1 P2-1)

Batch 1 constructs `legacy-experiment-v1→current` with field provenance: active phase, 2024 edition, proven `death_saves` visibility or `[]`, sequence counters `1`, empty current collections/environment, absent optional fields absent, conflicts rejected. Every migrated state current-decodes, passes invariants, deterministically renders, exposes ≥2 eligible options, and accepts null override. Gate: ≥80/100 and ≥600/770 across both families; report every rejection.

Sources remain distinct: `archive-replay`, model-free `capture-only`, `teacher-continuation`, `counterfactual-branch`. Continuation uses one declared teacher sample to advance, never as an independent label replicate. Branch ≤3 children/root, descendants ≤25%, train descendants stay with parent, evaluation uses frozen policy, every descendant freshly labelled. (r1 P2-9)

Freeze pilot-informed supported families/buckets: each supported marginal ≥200 accepted primary questions overall and ≥30 components/200 questions in every evaluation split where claimed; selected crosses `monster family×cardinality`, `scenario family×resource band`, `scenario family×hidden-visible` ≥50 questions/cell. Resource score is `sum(w*remaining/max)/sum(w)`, slot-level weights for slots and 1 otherwise; bands full=1, mid=(.5,1), depleted≤.5. The hidden-visible cross uses the versioned S-4 rubric meaning. Rare (<1%) action families target ≥200 questions. Unattainable cells report attempts/yield and require explicit unsupported acknowledgement. (r2 P2-7)

Family-disjoint audit reserves whole families absent from training and is distinct from ordinary grouped evaluation. (r2 P2-7) (r4 restore P2-4)

## 8. Leakage, canonicalization, and time-forward splits

An exhaustive recursive registry classifies every `rawTurnContext` path as feature, explicit context, audit-only, or forbidden; unknown paths fail. Clean projection removes duplicate options, `actors[].intel.opportunity_cost` IDs/prose, rendered recommendation, every `engine_recommended`, ordering/index aliases, `team_plan_frontier`, `applicable_plays`, selected/queued/post-action/outcome fields, digests, provenance, and response text. Advice exposure is a separate versioned ablation. Each carrier has a mechanics-preserving mutation witness requiring identical clean features. (r1 P2-6) (r2 P3-1)

Compute semantic duplicate keys before volatile bindings. Renaming/permuting combatants, tokens, objects, and options must preserve the key; meaningful range, HP/resource, legality, visibility, or effect changes must alter it. (r2 P3-2)

Union-find shared origin/seed, semantic key, archive repeat, round lineage, or branch ancestry. The ordinary earlier wave supplies absolute target shares 70% train, 10% calibration-dev, 10% grouped test, 5% family audit. The remaining 5% is a genuine later time audit: define cutoff `T0` as the signed corpus/prompt/projector freeze after earlier-wave collection closes; only encounters whose origins and first capture occur after T0 enter the later wave. Before any earlier test/audit is opened, build one union graph across both waves. A post-T0 component connected by semantic key or lineage to pre-T0 data is ineligible for time audit; nominate only all-post-T0 components, and exclude each nominee plus all of its union neighbours from every earlier split. Seal enough eligible later components for 5% of the final accepted-question target; shortage is reported, not backfilled randomly. Open it once only after model, thresholds, and all collection choices freeze. (r1 P2-5) (r1 P2-3) (r3 P2-5)

## 9. Counts, metrics, and confidence

M1 is 20,000 accepted primary questions: 14k/2k/2k/1k earlier shares plus 1k later-time. M2 is provisional `ceil(20,000/.70)=28,572`, rounded ≥28,600 for a 20k-train curve. These are milestones, not sufficiency. Report boundaries, attempts, all row kinds, accepted questions, components, and splits. (r1 P2-2)

Soft fidelity is cluster-macro JS, `KL(q||p)` at epsilon 1e-6, and normalized Brier `0.5*sum(p-q)^2`. Hard agreement uses dominant rows, reports coverage, and gives tied student argmax `1/|argmax|` credit only when it includes teacher mode. (r1 P2-4)

Primary soft ECE: equal total weight per component, equal row weight within component; sort rows by student max(p) into 15 equal-total-weight bins; compare weighted confidence with weighted teacher probability on predicted ID. Every bootstrap resamples training seed/components and recomputes bins/ECE.

Certification uses 10,000 seed/component bootstrap bounds: dominant top-1 LCB≥.80, Brier UCB≤.15, ECE UCB≤.05, supported-bucket top-1 LCB≥.70, representative-human unacceptable UCB≤.10 overall/≤.20 bucket. Adaptive dev is exploratory; grouped/family/time sets open once. For 10k→20k, paired equal-component improvement is `accuracy20-accuracy10`, `Brier10-Brier20`, `ECE10-ECE20`; no-substantial-improvement needs one-sided UCB<.01, while plateau requires two-sided 95% interval wholly in [-.01,.01] for all three. Buckets need ≥30 components and ≥200 questions. (r2 P2-6)

Pair identical rows, weight components equally, resample five training seeds and components, and recompute nonlinear metrics. (r4 restore P2-4)

## 10. Exact batch manifests and mutation evidence

Every batch may edit **only** its exact manifest below; every other path is forbidden. Each compiling mutant is throwaway, its witness fails after controls pass, and restoration is byte-identical. (r1 P3-1) (r3 P2-4)

1. **Contracts/exporter (8, PROCEED):** `src/vtt/dm-decision-dataset.ts`, `src/vtt/dm-decision-features.ts`, `src/vtt/legacy-dm-state-migration.ts`, `tools/rl/export-dm-decision-states.ts`, `tests/unit/vtt/dm-decision-dataset.test.ts`, `tests/unit/vtt/dm-decision-features.test.ts`, `tests/unit/tools/export-dm-decision-states.test.ts`, `package.json`. R/V/M: cast, leakage, canonicalization, render/submission/yield; `rulesEdition:'2024'→'2014'` kills provenance/render.
2. **Validator/splits/eval (10, PROCEED):** `tools/rl/validate-dm-decision-dataset.ts`, `tools/rl/build-dm-decision-splits.ts`, `tools/rl/build-dm-learning-curves.ts`, `tools/rl/evaluate-dm-predictions.ts`, `tests/unit/tools/validate-dm-decision-dataset.test.ts`, `tests/unit/tools/build-dm-decision-splits.test.ts`, `tests/unit/tools/build-dm-learning-curves.test.ts`, `tests/unit/tools/evaluate-dm-predictions.test.ts`, `src/vtt/dm-decision-dataset.ts`, `package.json`. R/V/M: leakage, nonlinear bootstrap, bounds/equivalence; plateau `CI subset→upper-only` is killed by degradation control.
3. **Teacher/judge route (9, PROCEED):** `src/vtt/dm-teacher-label.ts`, `src/vtt/dm-judge-label.ts`, `tools/rl/model-label-clients.ts`, `tools/rl/label-dm-decisions.ts`, `tests/unit/vtt/dm-teacher-label.test.ts`, `tests/unit/vtt/dm-judge-label.test.ts`, `tests/unit/tools/model-label-clients.test.ts`, `tests/unit/tools/label-dm-decisions.test.ts`, `package.json`. R/V/M: packed actor scheduler, ordered-Holm looks, conditional replacement, blinds/caps/receipts; `xhigh→high` fails exact-route witness. Unit/stub work and one route probe proceed; paid pilot waits for §1/§6 gates.
4. **Producer (6, PROCEED):** `src/vtt/dm-decision-state-source.ts`, `tools/rl/generate-dm-decision-states.ts`, `tools/rl/dm-state-quota.ts`, `tests/unit/vtt/dm-decision-state-source.test.ts`, `tests/unit/tools/generate-dm-decision-states.test.ts`, `tests/unit/tools/dm-state-quota.test.ts`. R/V/M: consume main's public best-effort boundary without editing D694 paths, capture-only/continuation provenance, quotas/time cutoff; post-proposal capture is killed by pre-decision witness.
5. **Outcome sidecar (9, PROCEED):** `src/vtt/regret/rollout.ts`, `src/vtt/regret/utility.ts`, `src/vtt/regret/option-rollout.ts`, `src/vtt/regret/index.ts`, `tools/rl/calibrate-dm-decision-outcomes.ts`, `tests/unit/vtt/regret.test.ts`, `tests/unit/vtt/regret-option-rollout.test.ts`, `tests/unit/tools/calibrate-dm-decision-outcomes.test.ts`, `package.json`. R/V/M: packages, seeds, ordered-Fisher stopping, 640 attempts, censor/failure; ignored injected seed fails pairing witness.
6. **Branch/corpus (7, PROCEED):** `src/vtt/dm-option-execution.ts`, `tools/rl/branch-dm-decision-states.ts`, `tools/rl/build-dm-candidate-corpus.ts`, `tests/unit/vtt/dm-option-execution.test.ts`, `tests/unit/tools/branch-dm-decision-states.test.ts`, `tests/unit/tools/build-dm-candidate-corpus.test.ts`, `package.json`. R/V/M: ≤3 children, ≤25%, baseline/manifest/fresh-label enforcement; copied parent label fails.

B4 previously named `tests/unit/tools/ai-dm-conversation.test.ts`, which CONV-SPLIT-01/PERF-02 may split. The manifests above are the required re-derivation against current main: B4 now uses a new sidecar source and avoids that file. General rule: whenever any batch is parked and later unparked, re-derive its exact manifest against then-current main, run the protected-union check, and obtain review before its first edit. (S-5)

## 11. D694 ownership barrier and execution order

D847 keeps COHORT-01/D694 shelved; its ownership is frozen by:

- `/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/.tmp-plans/2026-09-19-d694-intel-01-boundary-plan.md`, sha256 `93a8f28ade2424c353dd2ea4bd583a2a9c8f6aedc4b0bd8b5ec1d8c6b2f1637c`, §7 union of 84 paths;
- `/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/.tmp-plans/2026-09-19-d694-intel-01-plan.md`, sha256 `12f5614ab59350e66d6b7cfba26b683e4022131d82e52d8359a1afc2842a0cc4`, lines 144–199.

Every path in that 84-path union is forbidden to every DATA-01 batch even though the files are gitignored/mutable; hashes make the cited manifests exact. §12 proves B1–B6 intersection is empty. (r3 P2-4)

The former two-answer slot is now recorded rather than erased: (1) if D694 ever resumes/lands, rebase and rerun archive yield, field inventory, semantic key, eligibility, capture boundary, route fixtures, throughput, and all tests; incompatible rows invalidate. (2) D886 chose the alternative baseline now: B1–B6 **PROCEED** on main's D847 best-effort rule after the manifest re-derivation above; every row stores `monster_knowledge_baseline_id`, source commit, and instruction hash. No DATA batch remains PARKED behind D694; the D694 lane itself remains PARKED. (r1 P2-12) (r2 P2-8) (S-6)

## 12. Local verification commands and observed output

No network, model/agent, tests, builds, or git writes were used. The named archived `plan-r3.md` was absent; the live 278-line file matched the supplied `f8ca...0017` hash before overwrite.

```bash
# V1 / S-3 — current revision and production drift
git rev-parse HEAD
git diff --stat 7c91e96b..HEAD -- src tools tests package.json
# 45c2056a6c48a05b5f14e79f4717168232cbc312
# 11 files changed, 237 insertions(+), 65 deletions(-)
# changed: engine-server, ai-dm-conversation, legacy fixtures/tests and D583 inventory;
# DM-BEST-EFFORT-01 is now present. The old “no production-path diff” fact changed.

# V4 / S-3 — fixture re-baseline
node - <<'NODE'
const fs=require('fs'),f=JSON.parse(fs.readFileSync('tests/fixtures/ai-dm-legacy/runner-oracle-main.json'));
const r=JSON.parse(Buffer.from(f.runs.primary.rowJsonl.base64,'base64').toString().trim()),x=JSON.parse(r.rawTurnContext);
const o={question_id:'sha256:'+'a'.repeat(64),catalog_digest:'sha256:'+'b'.repeat(64),actors:x.actors.map(a=>({actor_id:a.actor_id,ranked_option_ids:a.options.map(o=>o.option_id),reason_code:'resource_preservation',relied_on_engine_recommendation:false,self_reported_uncertain:false}))};
console.log({bytes:Buffer.byteLength(r.rawTurnContext),options:x.actors.map(a=>a.options.length),rankingBytes:Buffer.byteLength(JSON.stringify(o)),tokens:r.tokens,usage:r.callUsage});
NODE
# {bytes:31995, options:[18,2,2], rankingBytes:2066,
#  tokens:{input:0,cachedInput:0,output:0,reasoning:0}, usage:[]}; unchanged.

# V5 / S-3 — anchors
rg -n 'MONSTER_KNOWLEDGE_BEST_EFFORT_INSTRUCTION|DOMINATED_OPTION_REQUIRES_OVERRIDE' src/vtt/mcp/engine-server.ts
# 1022: export const MONSTER_KNOWLEDGE_BEST_EFFORT_INSTRUCTION =
# 1043,1077: instruction inserted in engine prompt surfaces
# 1832: DOMINATED_OPTION_REQUIRES_OVERRIDE (moved; behavior unchanged)
rg -n 'chat/completions|reasoning_effort|temperature|response_format' src/vtt/agent-adapters/local-openai.ts
# 140: .../chat/completions; 345: reasoning_effort; no strict response_format/temperature evidence.

# V3 — archive census supporting §7
node - <<'NODE'
const fs=require('fs'),path=require('path'),h=new Map,s=new Set,f=new Set();let slots=0,ser=0,sel=0;
for(const root of fs.readdirSync('.vtt-exp-out')){const d=path.join('.vtt-exp-out',root);if(!fs.statSync(d).isDirectory())continue;for(const file of fs.readdirSync(d)){if(!/^table-.*\.json$/.test(file))continue;let j;try{j=JSON.parse(fs.readFileSync(path.join(d,file)))}catch{continue}if(j.status!=='completed')continue;const init=new Map((j.calls||[]).filter(c=>c.phase==='initial_plan').map(c=>[c.logicalCallId,c]));for(const c of j.calls||[]){if(c.phase==='initial_plan')slots+=(c.actorIds||[]).length;for(const a of c.emittedAction||[])if(a.selectedOption!=null)sel++}for(const c of j.quality?.rolloutInputCaptures||[]){if(c.serializedEncounterState)ser++;const q=init.get(c.logicalCallId);if(!q||!c.serializedEncounterState)continue;s.add(j.seed);f.add(j.matchupFamily);const x=h.get(c.stateHash)||{o:0,a:q.actorIds?.length||0};x.o++;h.set(c.stateHash,x)}}}
console.log({slots,serialized:ser,selected:sel,hashes:h.size,actors:[...h.values()].reduce((a,x)=>a+x.a,0),seeds:s.size,families:f.size,recurring:[...h.values()].filter(x=>x.o>1).length});
NODE
# {slots:19080, serialized:5109, selected:0, hashes:770, actors:3194,
#  seeds:155, families:2, recurring:716}; unchanged.

# S-1 — ordered-family attainable n
node - <<'NODE'
for(const K of [2,3,4,5,6,10,18]){const m=K*(K-1),n=Math.ceil(Math.log2(m/.0125));console.log(`${K}\tm=${m}\tn_min=${n}\tfirst=${(K<=4?[10,20,40]:[20,40]).find(x=>x>=n)??'none'}`)}
NODE
# 2 m=2 n_min=8 first=10; 3 m=6 n_min=9 first=10; 4 m=12 n_min=10 first=10;
# 5 m=20 n_min=11 first=20; 6 m=30 n_min=12 first=20;
# 10 m=90 n_min=13 first=20; 18 m=306 n_min=15 first=20.

# S-1/S-7 — ledger, price sensitivities, per-boundary cost/capacity
node - <<'NODE'
const t={min:18701,scheduledMax:36301,attemptMax:52301},rates={today8:.012,today16:.0216,today24:.0312,today32:.0408,reported8:.0052,reported16:.0092,reported24:.0132,reported32:.0172};
for(const [k,r] of Object.entries(rates))console.log(k,r,...Object.entries(t).map(([n,q])=>`${n}=$${(q*r).toFixed(3)}`));
console.log('rLimit',500/t.attemptMax,'scheduledRLimit',500/t.scheduledMax);
for(const d of [10,20,40,60]){const c=4*d*.012;console.log('depth',d,'requests',4*d,'cost',c.toFixed(3),'afterMin',Math.floor((500-t.min*.012)/c),'afterScheduledMax',Math.floor((500-t.scheduledMax*.012)/c))}
NODE
# today8 0.012 min=$224.412 scheduledMax=$435.612 attemptMax=$627.612
# today16 0.0216 min=$403.942 scheduledMax=$784.102 attemptMax=$1129.702
# today24 0.0312 min=$583.471 scheduledMax=$1132.591 attemptMax=$1631.791
# today32 0.0408 min=$763.001 scheduledMax=$1481.081 attemptMax=$2133.881
# reported8 0.0052 min=$97.245 scheduledMax=$188.765 attemptMax=$271.965
# reported16 0.0092 min=$172.049 scheduledMax=$333.969 attemptMax=$481.169
# reported24 0.0132 min=$246.853 scheduledMax=$479.173 attemptMax=$690.373
# reported32 0.0172 min=$321.657 scheduledMax=$624.377 attemptMax=$899.577
# rLimit 0.009560046653027668 scheduledRLimit 0.013773725241728879
# depth 10 requests 40 cost 0.480 afterMin 574 afterScheduledMax 134
# depth 20 requests 80 cost 0.960 afterMin 287 afterScheduledMax 67
# depth 40 requests 160 cost 1.920 afterMin 143 afterScheduledMax 33
# depth 60 requests 240 cost 2.880 afterMin 95 afterScheduledMax 22

# S-2 — exact-rule Monte Carlo, deterministic LCG, 20,000/configuration
node - <<'NODE'
const {performance}=require('perf_hooks');const R=20000,A=.0125;let seed=0xDADA01;
const rng=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function upper(n,x){if(!n)return 1;let p=2**(-n),s=0;for(let k=0;k<=n;k++){if(k>=x)s+=p;p*=k<n?(n-k)/(k+1):1}return Math.min(1,s)}
function hard(c,n){const K=c.length,L=c.indexOf(Math.max(...c));if(c.filter(x=>x===c[L]).length!==1||c[L]/n<.6)return false;const ps=[];for(let i=0;i<K;i++)for(let j=0;j<K;j++)if(i!==j)ps.push({i,j,p:upper(c[i]+c[j],c[i])});ps.sort((a,b)=>a.p-b.p);const q=new Set;for(let z=0;z<ps.length;z++){if(ps[z].p<=A/(ps.length-z))q.add(`${ps[z].i}>${ps[z].j}`);else break}return c.every((_,j)=>j===L||q.has(`${L}>${j}`))}
function run(K,kind){let e=0;const looks=K<=4?[10,20,40]:[20,40];for(let z=0;z<R;z++){const c=Array(K).fill(0);for(let n=1;n<=40;n++){c[kind==='equal'?Math.floor(rng()*K):(rng()<.5?0:1)]++;if(looks.includes(n)&&hard(c,n)){e++;break}}}const p=e/R,se=Math.sqrt(p*(1-p)/R);console.log({K,kind,falseHard:e,rate:+p.toFixed(6),mcse:+se.toFixed(6)})}
const t=performance.now();for(const K of [2,5,18])for(const x of ['equal','two_tied_leaders'])run(K,x);console.log({elapsedSeconds:+((performance.now()-t)/1000).toFixed(3)});
NODE
# K2 equal 383/.019150 SE .000969; K2 tied 354/.017700 SE .000932;
# K5 equal 0/0 SE 0; K5 tied 23/.001150 SE .000240;
# K18 equal 0/0 SE 0; K18 tied 2/.000100 SE .000071; elapsed .297 s. All <=.05.

# r3 P2-4 / S-6 — hashes and exact frozen-union intersection
sha256sum /home/vagrant/PhpstormProjects/dnd-wt-cohort-01/.tmp-plans/2026-09-19-d694-intel-01-{boundary-plan,plan}.md
# 93a8f28...f1637c boundary-plan.md; 12f5614a...a0cc4 plan.md
node - <<'NODE'
const fs=require('fs'),words=s=>s.trim().split(/\s+/);const d=words(`
docs/specs/engine-turn-context.schema.json src/combat/allies.ts src/combat/encounter.ts src/combat/events.ts src/combat/visibility.ts src/combat/world-object-actions.ts src/vtt/accessible-board.ts src/vtt/adjustment-exhaustion-coordinator.ts src/vtt/blind-intent-resolver.ts src/vtt/blind-turn-context.ts src/vtt/dm-tactical-intel.ts src/vtt/encounter-app.ts src/vtt/encounter-board.ts src/vtt/encounter-projections.ts src/vtt/encounter-state-codec.ts src/vtt/engine-query-port.ts src/vtt/engine-round-session.ts
src/vtt/intel/actor-knowledge.ts src/vtt/intel/actor-local-encounter-state.ts src/vtt/intel/movement-options.ts src/vtt/intel/opportunity-cost.ts src/vtt/intel/team-scorer.ts src/vtt/intent-resolver.ts src/vtt/mcp/engine-server.ts src/vtt/mcp/entrypoint.ts src/vtt/mcp/schemas.ts src/vtt/offers/offer-declarations.ts src/vtt/plan-materiality.ts src/vtt/renderer-profile.ts src/vtt/semantic-board-payload.ts src/vtt/session-encounter-reducer.ts src/vtt/snippet-registry-runtime.ts src/vtt/snippets/registry.ts src/vtt/speculative-plan-submission.ts src/vtt/speculative-planning.ts src/vtt/turn-exhaustion-coordinator.ts
tests/helpers/legacy-advice-surface.ts tests/unit/tools/ai-dm-arena.test.ts tests/unit/tools/ai-dm-board-delivery.test.ts tests/unit/tools/ai-dm-board-snapshot.test.ts tests/unit/tools/ai-dm-conversation.test.ts tests/unit/tools/ai-dm-legacy-invariance.test.ts tests/unit/tools/engine-mcp-handler.test.ts tests/unit/tools/engine-mcp-server.test.ts tests/unit/vtt/accessible-board.test.ts tests/unit/vtt/actor-knowledge.test.ts tests/unit/vtt/adjustment-exhaustion-coordinator.test.ts tests/unit/vtt/arena-basis-brutal-b.test.ts tests/unit/vtt/blind-context-source-binding.test.ts tests/unit/vtt/blind-dodge-posture.test.ts tests/unit/vtt/blind-intent-resolver.test.ts tests/unit/vtt/blind-turn-context.test.ts tests/unit/vtt/challenge-room-fixtures.test.ts tests/unit/vtt/d694-intel-privacy.test.ts tests/unit/vtt/decision-trace.test.ts tests/unit/vtt/dm-tactical-intel.test.ts tests/unit/vtt/encounter-board-projection.test.ts tests/unit/vtt/encounter-projections.test.ts tests/unit/vtt/engine-context-integrations.test.ts tests/unit/vtt/engine-opportunity-movement-intel.test.ts tests/unit/vtt/engine-query-port.test.ts tests/unit/vtt/engine-round-session.test.ts tests/unit/vtt/footprint-increment-three.test.ts tests/unit/vtt/hypnotic-pattern-probe.test.ts tests/unit/vtt/monster-feature-support.test.ts tests/unit/vtt/offer-environment-identity.test.ts tests/unit/vtt/offer-environment.test.ts tests/unit/vtt/offered-option-paths.test.ts tests/unit/vtt/plan-materiality.test.ts tests/unit/vtt/plays-v1.test.ts tests/unit/vtt/projected-movement-options.test.ts tests/unit/vtt/prose-renderer.test.ts tests/unit/vtt/renderer-profile.test.ts tests/unit/vtt/semantic-board-payload.test.ts tests/unit/vtt/snippets.test.ts tests/unit/vtt/spatial-movement.test.ts tests/unit/vtt/speculative-planning.test.ts tests/unit/vtt/summons.test.ts tests/unit/vtt/team-scorer.test.ts tests/unit/vtt/turn-exhaustion-coordinator.test.ts tools/ai-dm-arena.ts tools/ai-dm-board-snapshot.ts tools/ai-dm-conversation.ts tools/renderer-calibration.ts`);
const p=fs.readFileSync('.tmp-plans/2026-09-20-data-01-luna-labelled-dm-decisions-plan.md','utf8');
const b=[...p.matchAll(/^\d\. \*\*.*PROCEED\):\*\* (.*)$/gm)].map(m=>[...m[1].split('. R/V/M:')[0].matchAll(/`([^`]+)`/g)].map(x=>x[1]));
const ds=new Set(d);if(d.length!==84||ds.size!==84||b.length!==6)throw Error('manifest parse/count');
console.log({d694Count:d.length,d694Unique:ds.size});b.forEach((x,i)=>console.log(`B${i+1}`,{count:x.length,intersection:x.filter(y=>ds.has(y))}));
NODE
# { d694Count: 84, d694Unique: 84 }
# B1 { count: 8, intersection: [] }; B2 { count: 10, intersection: [] };
# B3 { count: 9, intersection: [] }; B4 { count: 6, intersection: [] };
# B5 { count: 9, intersection: [] }; B6 { count: 7, intersection: [] }.
```

Any count/hash/intersection mismatch hard-stops before edit.

## 13. Fix-r3 change summary and revised cost table

1. (r3 P2-1) Ordered directional binomial/Fisher families include data-chosen directions; Holm alpha .0125/look, four-look FWER proof, rollout 640-attempt ceiling, and `none_dominant` outcomes: plan lines 89–105, 123–125.
2. (r3 P2-2) Exact Kmax strata, actor-local ID/failure transitions, shrinking stateless packs, no call credit, max-depth cost formula, and capacity: lines 56–79, 155–164.
3. (r3 P2-3) `only_tuned_candidate` is typed/excluded from hard-primary training; conditional replacement denominator/looks/ceiling: lines 37–50.
4. (r3 P2-4) Exact-only manifests, hashed 84-path ownership, B1–B6 zero intersection, and filled two-answer baseline branch: lines 202–222, 306–322.
5. (r3 P2-5) T0, later-wave eligibility, whole-component contamination guard, 5% allocation, and one-time opening: line 186.
6. (r3 P3-1) The pilot report states 87.12% scheduled / 125.52% attempted of the cap at the old basis: lines 131–153.
7. (r3 P3-2) Three distinct open human roles agree: lines 24, 107–115.
8. (S-1) Attainable-n table, no dead looks/no futility, and 18,701–52,301-request ledger: lines 91–103, 131–142, 264–291.
9. (S-2) Six deterministic 20k Monte Carlo configurations, SEs, and .297 s elapsed: lines 293–304.
10. (S-3) HEAD/diff, unchanged fixture, new knowledge anchor, and moved refusal anchor are re-baselined: lines 229–253.
11. (S-4) Knowledge-rubric choice remains open with both label/judge/cross consequences and version slots: lines 22, 176.
12. (S-5) B4 was re-derived off the split-prone test; future unpark re-derivation/review is mandatory: lines 207, 211.
13. (S-6) B1–B6 proceed on/tag main best-effort while D694 remains parked/protected: lines 214–222, 306–322.
14. (S-7) gpt-6-luna xhigh, route-token probe, two price bases × four caps, thresholds, and shortfall gate: lines 18, 56, 69, 129–153, 272–291.
15. (r4 P2-1) The same 100 boundaries repeat five times under each of four tunings; LCB/JS must pass separately per tuning, any failure blocks all scale, and the 2,000-call ledger plus dependent arithmetic agree: plan lines 109, 137–164, 272–291.
16. (r4 P2-2) Invalid-complete agreement remains descriptive, uncertain states remain retained, and the revision-4 selection rule is reconciled: plan lines 83–85; restored verbatim from revision-3 lines 92–92.
17. (r4 P2-3) Enriched-audit multi-tag overlap, same-stratum replenishment, and recorded inclusion probabilities are restored: plan line 113; restored verbatim from revision-3 lines 102–102.
18. (r4 P2-4) Family-disjoint construction and five-seed/component learning-curve resampling are restored: plan lines 178 and 198; restored verbatim from revision-3 lines 159–159 and 181–181.

| Pilot envelope | Requests | Cost at .012 | % of $500 | Shortfall/headroom |
|---|---:|---:|---:|---:|
| minimum no-failure | 18,701 | $224.412 | 44.88% | $275.588 headroom |
| scheduled max no-failure | 36,301 | $435.612 | 87.12% | $64.388 headroom |
| absolute 60-attempt envelope | 52,301 | $627.612 | 125.52% | $127.612 shortfall |

DATA-01 PLAN FIX R4 DONE
