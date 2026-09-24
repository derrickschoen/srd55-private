# DATA-01 — Luna-labelled DM-decision candidate-corpus plan, fix r2

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

The following are **supervisor readings, pending owner confirmation**, and are not represented as the owner's words: (a) the primary training target is the tuned action with the highest significantly supported simulated win probability; (b) Opus/Sol supplement rather than replace the human audit; (c) each judge uses one packed call per state covering all tuned candidates; and (d) judges assess whether an adjustment reason is consistent with typed materiality inputs. Teacher preference, outcome evidence, and each judge's evidence remain separate columns so a later owner correction changes selection, not raw evidence. (r2 P2-1)

The three former owner questions are settled by D841/D844/D853 and are not re-asked. Open operational inputs are: the named qualified auditor, second scorer/adjudicator, and the owner's queued reconciliation of DATA-01 batches 4–6 with shelved COHORT-01/D694. D855–D856 establish what “now” means in the records but do not change DATA-01 content. (r1 P3-3)

## 2. Label contracts and total derivation

### Question and label types

The revision-bound dataset question uses catalog `option_id`, never array index:

```json
{"schema_version":"dm-decision-question/v1","boundary_id":"sha256:...","contract":"primary_option","task_context":{"phase":"active","actor_id":"actor:..."},"state":{"projected_raw_turn_context":"..."},"catalog":[{"option_id":"opt:...","rendered":{},"eligible":true}],"baseline":null,"budget":null,"provenance_ref":"audit-only"}
```

| Contract | Input delta | Stored result |
|---|---|---|
| `primary_option` | current no-override eligible catalog | per-tuning teacher distribution; nullable teacher hard choice; outcome vector; nullable outcome-selected primary |
| `fallback_option` | condition on a dominant aggregate teacher primary | distribution over the highest-ranked different option; no extra request |
| `adjustment_disposition` | rendered committed proposal, remaining adjustment budget, typed materiality delta | `dominant(retain|replace)` or `none_dominant`, plus typed WHY distribution |
| `adjustment_replacement` | current eligible alternatives excluding baseline | conditional distribution/hard choice when `replace` is dominant; no extra request |

Master categorical labels are `{status:"dominant",option_id}` or `{status:"none_dominant",option_id:null}`. A hard teacher label exists only after the Section 4 sequential test passes; vote share alone never creates one. Soft distributions retain every valid sample. None-dominant rows never receive lexical/hash pseudo-labels.

Adjustment WHY is a paid auxiliary target, not generic tactical prose: `{kind:baseline_still_best|legality_changed|target_changed|position_changed|resource_changed|combatant_state_changed|risk_changed|better_option_now, materiality_refs:[typed paths]}`. `retain` requires `baseline_still_best`; `replace` requires another kind and at least one matching typed materiality reference. Judges score legality/style separately from WHY/materiality consistency. Primary tactical reasons retain the closed enum `immediate_damage|control|survival|resource_preservation|positioning|target_priority|ally_synergy`; `relied_on_engine_recommendation` and `self_reported_uncertain` remain distinct.

Reason aggregation is defined for the actual valid sample count `n`: store the full frequency vector; emit a modal reason only if it is unique and its Bonferroni-adjusted Clopper–Pearson 95% lower bound across the closed reason set exceeds 0.50, otherwise `mixed`. A tied modal count is `mixed`. Primary tactical reasons remain audit-only; adjustment WHY is a paid auxiliary label required by D853, never override authority. (r1 P3-2) (r2 P3-3)

### Total conditional behavior

- Dominant primary: derive fallback from each valid complete/top-two response's highest-ranked non-primary option, then apply the same sequential dominance rule. If the selected protocol is pairwise, its verified winner/runner-up supplies the ordering.
- None-dominant primary (including `2/2/1`): retain the soft primary row and omit conditional fallback with `primary_condition_unresolved`; never invent a baseline.
- Zero eligible alternatives: emit no fallback/replacement learning row and record `no_eligible_alternative`; deterministic controller behavior is metadata, not a teacher label.
- One eligible alternative: record deterministic controller behavior and omit the corresponding learning row with `single_eligible_alternative`.
- Tied/none-dominant adjustment disposition: retain its soft disposition and WHY distributions; omit replacement with `adjustment_disposition_unresolved`.
- Dominant `replace` but insufficient replacement-valid samples at the stopping ceiling: keep the disposition row, omit replacement with `insufficient_valid_replacement_rankings`, and quarantine it from hard replacement training.
- Complete ranking is valid only as an exact permutation of every eligible ID; top-two requires exactly `min(2,K)` distinct eligible IDs; pairwise requires exactly one winner for every declared pair plus an acyclic verified top-two. Partial formats are never validated as complete rankings. (r2 P2-4)

### Executable domain

Current `engine-server.ts` rejects dominated options without typed override. V1 learns the no-override executable task: include a non-dominated option, or an engine default, only after a null-override submission probe accepts it. Preserve excluded catalog entries and typed reasons in audit metadata. DATA-01 does not fabricate tactical override authority. (r1 P2-8)

## 3. Physical request unit and wire contracts

A **decision-boundary state** is one captured pre-decision boundary, either primary-plan or adjustment. One physical Luna request is exactly `one boundary × one tuning × one independent replicate`; it packs every eligible monster actor/question at that boundary. Fallback and replacement consume zero additional calls. Primary and adjustment boundaries are separate states/calls. Initial capacity therefore depends on boundary states and repetitions—not raw actor count. Use `gpt-5.6-luna` at high effort through a new direct OpenAI Responses client with strict JSON Schema and no free prose. The charged route probe must record effective model snapshot, reasoning effort, schema mode, and whether requested `temperature=0.7` was applied; if any parameter is ignored/unreported, stop and version a supported sampling contract before the 200-state pilot rather than misstate it. (r2 P2-2)

```json
{"request_version":"dm-teacher-request/v2","boundary_id":"...","tuning_id":"focus_weakest","replicate":5,"shuffle_seed":"...","rubric":"strongest-legal/v1","actors":[{"actor_alias":"A","contract":"primary_option","state":{},"catalog":[{"blind_id":"c7","mechanics":{}}]}]}
```

```json
{"boundary_id":"...","tuning_id":"focus_weakest","replicate":5,"actors":[{"actor_alias":"A","ranked_blind_ids":["c7","c2"],"disposition":null,"ranked_replacement_blind_ids":[],"tactical_reason":"control","adjustment_reason":null,"relied_on_engine_recommendation":false,"self_reported_uncertain":false}]}
```

Actor and option identities are request-local aliases; the projector replaces combatant/token/object IDs and display names with aliases before teacher or judge submission, and catalog order is independently shuffled per actor/replicate. No replicate sees another answer, engine recommendation, outcome, or judge score. The exact four versioned tunings are: `focus_weakest` (remove the easiest target), `focus_threat` (remove the highest threat), `control_first` (deny enemy actions/space), and `attrition` (maximize sustainable advantage while preserving scarce resources). All remain subordinate to legality and winning, and the prompt does not force an inapplicable tactic.

Strict validation is actor-local after envelope/schema validation. A valid actor item is retained when another fails. A repair request contains only failed actors, keeps the same logical sample ID, receives a new attempt ID, and is charged; it cannot replace an already accepted actor item. Malformed envelope/ambiguous transport fails every contained actor until provider request-ID reconciliation. Completed invalid output is a new independent logical resample. Every attempt retains hashes, provider ID, usage, error, latency, actor membership, and reconciliation result.

The client computes tokens with the route's tokenizer and rejects input above **12,000 tokens** before dispatch; it sets and verifies an **8,000 billed-output-token** maximum. At the carried-forward Luna price basis, each request reserves `$0.012`. Dispatch requires `settled + ambiguous_hold + in_flight_reserve + next_reserve <= 500`. Opus uses the same reserve-before-dispatch rule against its configured current price and `$400` cap; Sol has a usage-limit meter and also stops loudly. No estimate can override a provider receipt.

One judge request is `one boundary × all unique tuned candidates/reasons`; Opus and Sol each make one independent high-effort call. They see blind aliases, mechanics, rubric, and materiality but not Luna identity, tuning identity, engine ordering, rollouts, or the other judge. Store separate columns for legality, rubric quality, pairwise preference, confidence, and adjustment-reason consistency. Downstream training may use these as auxiliary targets and hard-example flags, never as the primary target or an unrecorded row weight. A state is not release-eligible until both judge columns exist; cap/usage shortfall pauses and is reported, never filled with nulls.

## 4. Pilot, repetition, and quality gates

### Format selection for every cardinality

Sample 200 boundary states (150 primary, 50 naturally reached adjustment), 40 per eligible-cardinality bucket `2`, `3–5`, `6–10`, `11–17`, `18+`; if a bucket cannot supply 40, declare it unsupported rather than borrow rows. Each format gets three shuffled replicates and the selected format gets two more. Targeted pairwise packs a preregistered single-elimination bracket plus top-three verification (`K+2` comparisons) in one request; if that breaches either token ceiling, pairwise is unsupported for that bucket.

For each bucket/format, report actor-level validity/refusal, top-1 agreement, top-2 overlap, entropy, cycles, and position sensitivity. Validity passes only when point validity is at least 98% **and** its Wilson 95% lower bound is at least 95%. Normalize position as `(ordinal-1)/(K-1)`, bin it into quintiles, and for `K<5` compare occupied bins only. Position sensitivity is the maximum absolute, cluster-weighted difference in selection probability across occupied bins; it passes only when the point estimate is at most 5 points and the cluster-bootstrap 95% upper bound at most 10 points. Precision passes when that interval width is at most 10 points; otherwise the format is ineligible for that bucket—no unbudgeted nonselected-format calls are added.

| Cardinality | Complete ranking | Top-two | Targeted pairwise | Selection |
|---|---|---|---|---|
| `2` | must pass absolute gates | equivalent audit | must pass absolute gates | choose the valid protocol with lower position-sensitivity UCB; tie → complete |
| `3–5` | eligible if absolute gates pass | eligible if absolute gates pass and top-1 agreement with valid complete responses ≥90% | eligible if absolute gates pass and cycle UCB ≤5% | complete, then top-two, then pairwise by this order among eligible formats |
| `6–10`,`11–17`,`18+` | eligible if absolute gates pass | eligible if absolute gates pass and top-1/top-2 agreement with valid complete responses are ≥90%/80% | eligible if absolute gates pass and cycle UCB ≤5% | lowest position-sensitivity UCB; ties → top-two, complete, pairwise |

Thus complete 98%-valid versus top-two 100%-valid has a defined result. If complete is invalid, agreement is computed on its valid subset and is descriptive, not a gate. If no format passes, block the bucket, version/revise the prompt, and buy no production labels there. Pairwise ambiguity remains soft; discarding uncertain states to improve apparent quality is forbidden. (r1 P2-7) (r2 P2-3)

### Preregistered Luna stopping rule

For every boundary/tuning, sample at cumulative looks `n=5,10,20,40`. At a look, the empirical leader must have share ≥0.60. Compare it with every alternative using an exact one-sided binomial test on votes for that pair, conditioning out votes for other options. To control selection, all `K` candidates are compared pairwise and Holm-adjusted within the look; each of four looks receives alpha `0.0125` (Bonferroni alpha spending, familywise ≤0.05). Emit a hard teacher choice only when one option beats every alternative after adjustment. Otherwise continue; at `n=40`, emit `none_dominant`. The same binary rule applies to retain/replace. Invalid responses do not count toward `n` but attempts stop at 60 per cell; failure to obtain 40 valid responses remains audit-only and is reported as nonresponse. Report invalidity by intended-answer proxy (eventual soft mode), bucket, tuning, and shuffle position; claims are limited wherever differential nonresponse remains. (r2 P2-3)

### Judge and human quality gate

After prompt freeze, an independent 100-state Luna replicate reports teacher–teacher agreement and JS. Gate: cluster-bootstrap 95% lower bound top-1 agreement ≥0.70 and upper bound mean JS ≤0.20; failure blocks scale and triggers prompt diagnosis, not selective deletion. Judge disagreement or illegality flags quarantine the affected row for review; changing a label versions it and disqualifies those judges/reviewers from untouched final evaluation.

The pilot human audit has two distinct samples. The representative estimate selects 100 union-find components uniformly and one labelled row uniformly per component; it alone estimates component-macro population acceptability with cluster/Wilson bounds. Two enriched samples of 50 teacher–engine disagreements and 50 none-dominant/high-cardinality/difficult rows find errors and are reported separately, never pooled into the population rate. Multi-tag overlaps count once within a stratum and are replenished from that stratum under recorded inclusion probabilities. Cards use aliases and randomized order and hide source, tuning, engine, Luna, and judge outcomes. The primary auditor scores all cards; a second scorer blindly rescores a random 20% plus every unacceptable/illegal card; disputes go to a third named adjudicator. Scale requires population unacceptable-rate 95% upper bound ≤10%, and each reported bucket with `n≥20` ≤20%; a systematic error class whose Wilson 95% lower bound exceeds 5% stops/quarantines/relabels the affected version. Auditor/scorer identities remain open operational inputs, so paid scale cannot yet pass this gate. (r2 P2-5)

At downstream certification, use fresh humans and fresh cards: 100 component-random student choices for a population estimate plus 100 enriched student–Luna disagreements/difficult cases, reported separately. Anyone/model that changed labels is excluded from this untouched audit. This tests the student's choices, not merely Luna.

## 5. Outcome target and rollout significance

Teacher evidence remains one column per tuning. Engine recommendation is audit-only except in an explicit advice ablation. Engine acceptance is executability, not preference. Outcome evidence is a separate vector. A tuned candidate is a tuning's hard teacher choice; a none-dominant tuning contributes soft evidence but no hard candidate. Under the pending supervisor reading, with ≥2 unique candidates the primary target is the candidate whose win probability is significantly superior; absent significance it is `none_dominant`. Zero candidates is `none_dominant`; one is stored as `only_tuned_candidate` without a superiority claim and receives the minimum rollout estimate. (r1 P2-10)

Batch 5 adds a current-package runner with explicit initial seed injection. It executes complete primary/fallback/adjustment packages through authorization and `EngineRoundSession`; fixes other monsters to a declared modal-teacher policy (engine default if none-dominant), players to one versioned scripted policy, and later monster turns to deterministic engine defaults. It preserves nonfocal baselines/budgets and tests multi-slot execution.

Evaluate every unique tuned candidate at cumulative `64,128,256,512` successful rollouts. By default candidates receive disjoint, independently derived seed sets; only implemented event-keyed common substreams permit paired inference. At each look, compute one-sided Newcombe–Wilson intervals for the best candidate's win-rate difference from every competitor, Holm-adjust within look, and spend alpha `0.0125` per look. Select only if every lower bound is above zero; otherwise continue and finally emit outcome `none_dominant`. Tied empirical leaders cannot stop. Terminal victory is win; horizon/unresolved is non-win for the primary conservative analysis and is also reported under exclude/best/worst sensitivity. Censoring above 5% or execution failure above 1% in a bucket blocks an outcome label and triggers a longer-horizon/fix preregistration. Report survival/unresolved, side HP, resources, censoring, failures, draw counts, and paired/unpaired variance; equal initial seeds are not called common random numbers after divergent draws.

Run to terminal or five additional rounds/10,000 steps initially. The 200-state pilot benchmarks 100 complete candidate-seed rollouts and records successful rollouts/second. Projected machine time is `sum(candidate seed ceilings)/measured throughput`, with p50/p95 per scenario bucket; no wall-clock commitment or fixed 32-seed claim is allowed before that receipt. (r2 P2-1)

## 6. Cost, capacity, and the pilot ledger

The physical maximum is `$0.012/Luna request` (12k input + 8k billed output). No caching credit is budgeted. The exact review ledger is retained before adding tunings:

| Pilot work | Physical requests | Reserve |
|---|---:|---:|
| 200 states × three formats × three samples | 1,800 | $21.600 |
| Selected-format top-up: two/state | 400 | $4.800 |
| 100 states × five independent replicate samples | 500 | $6.000 |
| One live route probe | 1 | $0.012 |
| **Review-ledger total** | **2,701** | **$32.412** |

Reuse is explicit: the selected format's three samples plus two top-ups count as the first `n=5` look for **one** tuning only when prompt/model/projector/split versions remain identical and all gates pass. Other-format calls, route probe, independent-replicate calls, and the separate 100-request concurrency/load test never count toward production significance. The other three tunings' first looks add 3,000 requests/$36.000; the load test adds 100/$1.200. Adaptive top-ups from 5 to 40 across 200×4 cells add 0–28,000 requests/$0–$336. Therefore the four-tuning pilot is **5,801–33,801 requests, $69.612–$405.612**, before any retry; retries consume the same cap. (r2 P2-2)

| Valid reps/tuning reached | Luna requests/boundary | Reserve/boundary | Total new boundaries after $69.612 pilot | after $405.612 pilot | projected 75% primary / 25% adjustment after minimum pilot |
|---:|---:|---:|---:|---:|---:|
| 5 | 20 | $0.24 | 1,793 | 393 | 1,345 / 448 |
| 10 | 40 | $0.48 | 896 | 196 | 672 / 224 |
| 20 | 80 | $0.96 | 448 | 98 | 336 / 112 |
| 40 | 160 | $1.92 | 224 | 49 | 168 / 56 |

These are mathematical ceilings with zero production retries, not deliverables. Actual capacity is `floor((500 - settled pilot - ambiguous holds - reserved retries)/(4*0.012*mean valid reps))`; primary and adjustment calls are reported separately. Production targets 75% primary/25% naturally reached adjustment boundaries, but collects every encountered adjustment boundary; if the engine cannot supply that mix, publish the shortfall and do not synthesize or relabel boundaries. Fallback/replacement add rows but no calls. Accepted nontrivial actor questions—not raw actor slots—are the yield measure.

At the decision record's approximate `$0.10/packed Opus state`, `$400` suggests about 4,000 calls, or about 3,680 with an 8% failure allowance. The Luna-limited totals above are 1,993 labelled boundaries after the minimum pilot (200 pilot + 1,793 new, ≈$199.30 expected Opus) or 593 after the maximum pilot (≈$59.30); thus Luna appears binding. This is only sensitivity: Batch 3 computes `J_max` from enforced judge ceilings and current configured price, then sets new-state capacity to the minimum of the Luna table, `floor((400-settled_judge_pilot-ambiguous_judge_hold)/J_max)`, and remaining Sol usage. Every labelled boundary consumes one call from each judge. If full coverage exceeds either limit, stop and ask for revision; never shrink coverage.

Even the optimistic 1,793-boundary post-pilot ceiling cannot substantiate 28,600 accepted primary questions once adjustment share and observed actor yield are applied. The pilot therefore reports projected state/question yield to the owner and downstream training unit; it does not loosen significance or silently claim M2. The budgeted 100-request test measures concurrency; Batch API remains out of scope because adaptive looks and receipt reconciliation are sequential. (r1 P2-11)

## 7. State supply and enforceable diversity

The archive has 19,080 initial actor slots but only 770 distinct state hashes/3,194 distinct-hash actor slots; 716 hashes recur across 155 seeds and two families. This is a pre-migration ceiling, not budget supply. All 5,109 serialized legacy captures lack `phase`, `rulesEdition`, and `hiddenRolls`; existing reconstruction is shallow. Legacy actions contain no current selected option. (r1 P2-1)

Batch 1 constructs—not casts—`legacy-experiment-v1→current`, with field provenance. Defaults remain those from fix r1: active phase, 2024 edition, proven `death_saves` visibility or `[]`, sequence counters `1`, and empty current collections/environment values; absent optional fields remain absent and inferential conflicts reject. Every distinct migrated state must current-decode, pass invariants, render with a deterministic stub, expose ≥2 eligible options, and accept a null-override package. Report exact accepted/rejected hashes/questions and reasons. The 100-state gate is ≥80%; full archive gate is ≥600/770 and both families. Runtime results are provisional until the Section 11 barrier is resolved; no failed cast becomes accepted supply.

New sources remain distinct: `archive-replay`, model-free `capture-only`, `teacher-continuation`, and `counterfactual-branch`. Continuation uses one declared Luna sample to advance and never treats it as an independent label replicate. Branch at most three executable children/root, cap descendants at 25%, keep train descendants in the parent component, use a frozen policy for evaluation descendants, and freshly label every descendant. (r1 P2-9)

Before scale, freeze a manifest from pilot **accepted nontrivial questions**:

- supported monster/scenario families and cardinality buckets; every supported marginal has ≥200 accepted primary questions overall and ≥30 independent components/200 questions in each evaluation split where a claim is made;
- selected crosses `monster family × cardinality`, `scenario family × resource band`, and `scenario family × hidden-visible`, each with ≥50 accepted questions per supported cell;
- resource score is `sum(w_j*remaining_j/max_j)/sum(w_j)`, `w=slot level` for spell-slot pools and `w=1` for other limited-resource pools; bands are `full=1`, `mid=(0.5,1)`, `depleted≤0.5`;
- `hidden-visible` uses actor-local visibility only after the parked seam is resolved; no current-main proxy is accepted;
- a semantic action family below 1% in pilot is rare and targets ≥200 accepted primary questions; branch descendants remain ≤25%.

Freeze exact counts/proportions and split-component targets before scale. An unattainable cell is reported with attempts/yield and becomes explicitly unsupported by owner/downstream acknowledgement; support is never silently redefined after purchase. Family-disjoint audit reserves whole families absent from training and is distinct from ordinary grouped evaluation. (r2 P2-7)

## 8. Leakage, canonicalization, and splits

An exhaustive recursive registry classifies every `rawTurnContext` path as feature, explicit task context, audit-only, or forbidden; unknown paths fail. Phase is legitimate explicit context. Clean projection removes duplicate `actors[].options`, `actors[].intel.opportunity_cost` including default/better/dodge IDs and prose, rendered `recommendation:"index 0 = engine recommendation"`, every `engine_recommended` occurrence, ordering/index aliases, `team_plan_frontier`, `applicable_plays`, selected/queued/post-action/outcome fields, digests, provenance, and response text. Advice exposure is a separate versioned ablation only. (r1 P2-6) (r2 P3-1)

Tests mutate advice text/IDs, option IDs and input order while preserving permitted mechanics and require byte-identical clean semantic features. Each named carrier above has its own fixture. A newly added nested path must fail the registry. The advice ablation may expose only typed serving-time advice and must never alter the clean variant.

Compute a semantic duplicate key before volatile binding from projected mechanics and typed eligible-option mechanics. Canonically rename and permute combatants, tokens, world objects, and options; all such positive controls must keep the key. Negative controls change mechanically meaningful range, HP/resource state, legality, visibility, or option effect and must change it. (r2 P3-2)

Union-find an edge for shared encounter origin/seed, semantic key, archive repeat, round lineage, or branch ancestry. The 716 recurring hashes cannot cross splits. Assign whole components 70% train/10% calibration-dev/10% grouped test/5% family audit/5% held-back-time audit, subject to manifest feasibility. Calibration/dev alone may guide collection; test and audits remain sealed. (r1 P2-5)

## 9. Counts, metrics, and confidence

M1 remains 20,000 total accepted primary questions (14k/2k/2k/1k/1k). Provisional M2 remains `ceil(20,000/0.70)=28,572`, rounded to ≥28,600 total accepted primary questions for a 20k-train curve. These are experimental milestones, not derived sufficiency or promises under current caps. Report packed boundaries, physical requests/attempts, primary/fallback/adjustment rows, accepted questions, components, and every split separately. (r1 P2-2)

Metrics distinguish teacher fidelity, judge signal, human correctness, and outcomes. Soft fidelity is cluster-macro JS, `KL(q||p)` after `epsilon=1e-6`, and normalized Brier `0.5*sum_i(p_i-q_i)^2`. Hard agreement uses dominant rows only, reports coverage, and gives a tied student argmax `1/|argmax|` credit only if it contains the teacher mode. (r1 P2-4)

Primary soft ECE is one precisely defined pooled statistic: give each connected component equal total weight and each row equal weight within component; sort all rows by student `max(p)` into 15 equal-total-weight bins; compare weighted mean confidence with weighted teacher probability assigned to the predicted ID; sum weighted absolute gaps. Hard ECE is separate on dominant rows. Every bootstrap replicate resamples training seed and components, then recomputes bin boundaries and ECE from scratch.

Certification uses two-stage 10,000-replicate seed/component bootstrap bounds: dominant-row top-1 lower 95% bound ≥0.80, Brier upper bound ≤0.15, ECE upper bound ≤0.05, supported-bucket top-1 lower bound ≥0.70, and representative human unacceptable-rate upper bounds ≤0.10 overall/≤0.20 bucket. Point estimates cannot pass. Adaptive dev results are exploratory; freeze once, open grouped test once, then family and time audits once. Failure makes an opened set diagnostic and requires a new untouched component.

For 10k→20k, define improvement as `accuracy20-accuracy10`, `Brier10-Brier20`, `ECE10-ECE20`. Pair identical rows, weight components equally, resample five training seeds and components, and recompute nonlinear metrics. “No substantial improvement” requires one-sided 95% upper bound `<0.01` but is not plateau. **Equivalence/plateau** requires the two-sided 95% interval wholly within `[-0.01,+0.01]` for all three metrics; degradation fails. Buckets need ≥30 components and ≥200 questions or report insufficient evidence. (r1 P2-3) (r2 P2-6)

## 10. Batch manifests and mutation evidence

Every compiling mutant is applied only in a throwaway check, the named witness must fail after valid controls pass, and restoration must be byte-identical. (r1 P3-1)

1. **Contracts/exporter (8, PROCEED):** `src/vtt/dm-decision-dataset.ts`, `src/vtt/dm-decision-features.ts`, `src/vtt/legacy-dm-state-migration.ts`, `tools/rl/export-dm-decision-states.ts`, `tests/unit/vtt/dm-decision-dataset.test.ts`, `tests/unit/vtt/dm-decision-features.test.ts`, `tests/unit/tools/export-dm-decision-states.test.ts`, `package.json`. R/V: cast, leakage, canonicalization, current-render/submission and yield controls. M: `rulesEdition:'2024'→'2014'`; provenance/render witness fails. Leakage mutants reinsert each Section 8 carrier; its fixture fails. Permutation positives and mechanical negative control prove the semantic key.
2. **Validator/splits/eval (10, PROCEED):** `tools/rl/validate-dm-decision-dataset.ts`, `tools/rl/build-dm-decision-splits.ts`, `tools/rl/build-dm-learning-curves.ts`, `tools/rl/evaluate-dm-predictions.ts`, `tests/unit/tools/validate-dm-decision-dataset.test.ts`, `tests/unit/tools/build-dm-decision-splits.test.ts`, `tests/unit/tools/build-dm-learning-curves.test.ts`, `tests/unit/tools/evaluate-dm-predictions.test.ts`, `src/vtt/dm-decision-dataset.ts`, `package.json`. R/V: split leakage, nonlinear-ECE bootstrap, confidence-bound and equivalence synthetic controls. M: plateau `CI⊂[-δ,+δ]→upper<δ`; degradation control fails.
3. **Teacher/judge route (9, PROCEED):** `src/vtt/dm-teacher-label.ts`, `src/vtt/dm-judge-label.ts`, `tools/rl/model-label-clients.ts`, `tools/rl/label-dm-decisions.ts`, `tests/unit/vtt/dm-teacher-label.test.ts`, `tests/unit/vtt/dm-judge-label.test.ts`, `tests/unit/tools/model-label-clients.test.ts`, `tests/unit/tools/label-dm-decisions.test.ts`, `package.json`. R/V: packed actors, actor-local repair, sequential stopping, total fallback/adjustment cases, blinds, caps, two judge columns, receipts. M: request effort `high→medium`; exact-request witness fails. Unit/stub work and one charged route probe may proceed; the 200-state paid pilot waits for the barrier.
4. **Producer (10, PARKED):** `tools/ai-dm-conversation.ts`, `tools/ai-dm-arena.ts`, `tools/rl/generate-data.ts`, `tools/rl/generate-dm-decision-states.ts`, `tools/rl/dm-state-quota.ts`, `tests/unit/tools/ai-dm-conversation.test.ts`, `tests/unit/tools/ai-dm-arena.test.ts`, `tests/unit/tools/rl-generate-data.test.ts`, `tests/unit/tools/generate-dm-decision-states.test.ts`, `tests/unit/tools/dm-state-quota.test.ts`. It touches D694-owned seams. R/V: capture-only zero-model, distinct continuation, held-out basis/provenance, accepted-question quotas. M: capture after proposal queue; pre-decision witness fails.
5. **Outcome sidecar (9, PARKED):** `src/vtt/regret/rollout.ts`, `src/vtt/regret/utility.ts`, `src/vtt/regret/option-rollout.ts`, `src/vtt/regret/index.ts`, `tools/rl/calibrate-dm-decision-outcomes.ts`, `tests/unit/vtt/regret.test.ts`, `tests/unit/vtt/regret-option-rollout.test.ts`, `tests/unit/tools/calibrate-dm-decision-outcomes.test.ts`, `package.json`. Authorization semantics depend on the parked seam. R/V: current multi-slot packages, explicit seeds, sequential win intervals, censor/failure vectors. M: ignore injected seed; seed-pair witness fails.
6. **Branch/corpus (7, PARKED):** `src/vtt/dm-option-execution.ts`, `tools/rl/branch-dm-decision-states.ts`, `tools/rl/build-dm-candidate-corpus.ts`, `tests/unit/vtt/dm-option-execution.test.ts`, `tests/unit/tools/branch-dm-decision-states.test.ts`, `tests/unit/tools/build-dm-candidate-corpus.test.ts`, `package.json`. R/V: ≤3 children, ≤25%, fresh label and manifest enforcement. M: copy parent `label_id`; fresh-label witness fails.

## 11. D694/COHORT barrier and execution order

D847 shelved COHORT-01/D694 in its worktree; shelving is not permission to edit or trust its protected files. Batches 1–3 proceed independently on contracts, archive export/stubs, validation/evaluation, and teacher/judge route. They may not edit `tools/ai-dm-conversation.ts`, `tools/ai-dm-arena.ts`, `src/vtt/mcp/*`, `src/vtt/intel/*`, `src/vtt/speculative-*`, or their owned tests. Batches 4–6 are **PARKED** at the former B18 barrier. (r1 P2-12) (r2 P2-8)

The queued owner answer slots in without redesign: if the lane resumes/lands, rebase and rerun archive acceptance/yield, recursive field inventory, canonical hash, no-override eligibility, capture boundary, route fixtures, 100-row throughput, and tests against the landed seam. If the owner approves a different baseline, record its commit/owner/ownership transfer, version schema/prompt/projector, and run the identical revalidation before B4. Any material difference invalidates incompatible pilot rows. Until either answer exists, no B4–B6 edit, 200-state pilot, production purchase, or corpus completion occurs.

## 12. Local verification commands and observed facts

No network or model/agent call was used. Every repository claim above is tied to these read-only commands; external price figures are carried from the reviewed r1 record/decision records rather than re-fetched.

```bash
# V1 — revision and source equivalence
git rev-parse HEAD
git diff --name-only 7c91e96b..HEAD -- src tools tests package.json
# observed: HEAD 9cad22d247fc9223a5e628b558a0b78792fa4626; no production-path diff

# V2 — review/rulings/current box records
cat .claude/consensus/data-01/review-plan-astra-r2.md
cat .tmp/runs/data-01/rulings-for-fix-r2.md
cat .tmp/runs/data-01/plan-fix-r1.md
sed -n '1359,1378p;1425,1474p' .claude/decisions.md
# observed: D847 shelves COHORT/D694; D852–D854 bind cap, adjustments, and significance; D855–D856 are current record context

# V3 — archive census
node - <<'NODE'
const fs=require('fs'),path=require('path');const hs=new Map(),ss=new Set(),ff=new Set();let t=0,r=0,n=0,sl=0,w=0,sel=0,cap=0,ser=0,miss={phase:0,rulesEdition:0,hiddenRolls:0};
for(const root of fs.readdirSync('.vtt-exp-out')){const d=path.join('.vtt-exp-out',root);if(!fs.statSync(d).isDirectory())continue;for(const f of fs.readdirSync(d)){if(!/^table-.*\.json$/.test(f))continue;let j;try{j=JSON.parse(fs.readFileSync(path.join(d,f),'utf8'))}catch{continue}if(j.status!=='completed')continue;t++;r+=j.completedRounds||0;n+=(j.calls||[]).length;if(j.winner!==null)w++;const init=new Map((j.calls||[]).filter(c=>c.phase==='initial_plan').map(c=>[c.logicalCallId,c]));for(const c of j.calls||[]){if(c.phase==='initial_plan')sl+=(c.actorIds||[]).length;for(const a of c.emittedAction||[])if(Object.hasOwn(a,'selectedOption')&&a.selectedOption!==null)sel++;}for(const c of j.quality?.rolloutInputCaptures||[]){if(c.serializedEncounterState){ser++;const s=JSON.parse(c.serializedEncounterState);for(const k of Object.keys(miss))if(!(k in s))miss[k]++;}const q=init.get(c.logicalCallId);if(!q||!c.serializedEncounterState)continue;cap++;ss.add(j.seed);ff.add(j.matchupFamily);const x=hs.get(c.stateHash)||{o:0,a:q.actorIds?.length||0};x.o++;hs.set(c.stateHash,x)}}}
console.log({t,r,n,sl,w,sel,cap,ser,miss,hashes:hs.size,actors:[...hs.values()].reduce((a,x)=>a+x.a,0),seeds:ss.size,families:ff.size,recurring:[...hs.values()].filter(x=>x.o>1).length});
NODE
# observed: 944 tables; 4,720 rounds; 6,001 calls; 19,080 initial actor slots;
# 3,874 initial captures; 770 hashes; 3,194 distinct-hash actor slots;
# 155 seeds; 2 families; 716 recurring; 0 winners/current selectedOption;
# 5,109/5,109 serialized captures lack phase, rulesEdition, hiddenRolls

# V4 — fixture payload
node - <<'NODE'
const fs=require('fs');const f=JSON.parse(fs.readFileSync('tests/fixtures/ai-dm-legacy/runner-oracle-main.json'));const r=JSON.parse(Buffer.from(f.runs.primary.rowJsonl.base64,'base64').toString().trim()),x=JSON.parse(r.rawTurnContext);const o={question_id:'sha256:'+'a'.repeat(64),catalog_digest:'sha256:'+'b'.repeat(64),actors:x.actors.map(a=>({actor_id:a.actor_id,ranked_option_ids:a.options.map(o=>o.option_id),reason_code:'resource_preservation',relied_on_engine_recommendation:false,self_reported_uncertain:false}))};console.log({bytes:Buffer.byteLength(r.rawTurnContext),options:x.actors.map(a=>a.options.length),rankingBytes:Buffer.byteLength(JSON.stringify(o)),tokens:r.tokens,usage:r.callUsage});
NODE
# observed: 31,995 context bytes; option counts [18,2,2]; packed ranking JSON 2,066 bytes; empty usage

# V5 — route, advice carriers, dominated refusal
rg -n 'chat/completions|reasoning_effort|temperature|response_format|cached_tokens|reasoning_tokens' src/vtt/agent-adapters/local-openai.ts tools/ai-dm-arena.ts tools/ai-dm-conversation.ts
rg -n 'opportunity_cost|engine_default_option_id|better_option_id|dodge_option_id|engine_recommended|team_plan_frontier|applicable_plays|index 0 = engine recommendation' tools/ai-dm-conversation.ts src/vtt tests/unit
sed -n '1790,1840p' src/vtt/mcp/engine-server.ts
sed -n '730,835p;1370,1435p' src/combat/encounter.ts
sed -n '195,230p' src/vtt/regret/rollout.ts
# observed: Chat Completions route has effort/usage but no strict format/temperature evidence;
# named advice carriers exist; null override returns DOMINATED_OPTION_REQUIRES_OVERRIDE

# V6 — producer and rollout seams
rg -n 'basis-dir|arena-basis-|generate-missing-rooms|prepareHeldoutBasis|generateHeldoutBasisRoom|generateRoom\(' tools/ai-dm-arena.ts tools/generate-arena-basis.ts tools/rl
sed -n '760,790p' tools/ai-dm-arena.ts
rg -n 'rolloutPrograms|derive.*seed|programs' src/vtt/regret tools/rl
sed -n '330,375p' src/vtt/regret/rollout.ts
# observed: arena fallback generateRoom passes difficulty/initiative only; held-out helpers exist;
# rolloutPrograms consumes legacy programs and derives seedForCapture internally

# V7 — cost arithmetic
node - <<'NODE'
const c=.012,b=200*3*3+200*2+100*5+1,first=b+200*3*5+100,max=first+200*4*(40-5);console.log({review:[b,b*c],first:[first,first*c],max:[max,max*c]});for(const n of [5,10,20,40])console.log({n,requests:4*n,reserve:4*n*c,afterFirst:Math.floor((500-first*c)/(4*n*c)),afterMax:Math.floor((500-max*c)/(4*n*c))});
NODE
# observed: review ledger 2,701/$32.412; first four-tuning look + load test 5,801/$69.612;
# max sequential pilot + load test 33,801/$405.612; per-boundary reserves $0.24/$0.48/$0.96/$1.92

# V8 — planned path/parent inventory
find src/vtt tools/rl tests/unit/vtt tests/unit/tools -maxdepth 1 -type f | sort
# observed: existing paths/parents in the manifests were checked; all `dm-*`/option-rollout paths named new remain new
```

## 13. Twelve-line r2 change summary

1. r2 P2-1 — D841–D854 are separated into owner rulings and pending supervisor readings; contracts, tunings, judges, outcome objective and adjustments are bound (lines 5–17, 106–114).
2. r2 P2-2 — the packed physical request precedes capacity; actor repairs, pairwise bound, enforced ceilings, reuse, exact pilot ledger and recomputed capacities are specified (lines 58–76, 116–141).
3. r2 P2-3 — every cardinality has absolute format gates plus a four-look familywise-controlled teacher stopping rule and nonresponse limits (lines 78–96).
4. r2 P2-4 — none-dominant/tied primary and adjustments, zero/one alternatives, insufficient replacement evidence and partial-format validation are total (lines 44–52).
5. r2 P2-5 — representative and enriched human samples are separated; inclusion, repeats, disputes and fresh student audit are specified (lines 98–104).
6. r2 P2-6 — exact cluster-weighted ECE, bootstrap recomputation, bound-based certification, adaptive-dev limits and two-sided equivalence are specified (lines 171–181).
7. r2 P2-7 — frozen marginal/cross quotas, resource weights, per-split component minima and unattainable-cell reporting are specified (lines 143–159).
8. r2 P2-8 — D847 is reconciled by PROCEED B1–B3 versus PARKED B4–B6, protected paths and a two-answer owner slot (lines 183–198).
9. r2 P3-1 — every named advice carrier and a mechanics-preserving metamorphic leakage witness are explicit (lines 161–165, 187).
10. r2 P3-2 — rename/permutation positives and mechanically meaningful negative canonical-key controls are explicit (lines 165–167, 187).
11. r2 P3-3 — reason aggregation uses simultaneous bounds at variable `n`; adjustment WHY is typed/materiality-linked and separately judged (lines 35–42).
12. Cost/split — $32.412 review ledger → $69.612–$405.612 four-tuning/load-test pilot; $0.24–$1.92/boundary; B1–B3 PROCEED and B4–B6 PARKED (lines 116–141, 183–198).

DATA-01 PLAN FIX R2 DONE
