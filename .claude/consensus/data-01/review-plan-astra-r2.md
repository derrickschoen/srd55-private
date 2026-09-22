**REJECT — 0 P1 / 8 P2 / 3 P3.**

The revision substantially improves the plan, but it still cannot bind. There are unresolved protocol and evaluation defects even under the original D835 scope. Later committed owner rulings also require changes.

Reviewed the [revision-2 plan](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-20-data-01-luna-labelled-dm-decisions-plan.md), round-one review, both JEV reports, D835, and relevant source. Plan SHA-256 matches `89e30009e9a9fe066e302cef061951e07b5fb212091bafb1604c7158413d11bd`.

Observed HEAD is `7c91e96b`; changes since the brief’s `41c42247` are confined to `.claude/` records. The working tree was clean. No files changed, builds/tests run, network requests made, or models/agents invoked.

**Independent verification**

| Claim | Result |
|---|---|
| Archive totals | Confirmed 944 completed tables, 4,720 rounds, 6,001 calls, 19,080 initial actor slots; zero non-null winners or selected options. |
| Archive supply | Confirmed 3,874 initial captures → **770 distinct hashes / 3,194 actor slots**, 155 seeds, two families. Exactly 716 hashes recur across tables. |
| Current-state compatibility | All 5,109 serialized captures lack `phase`, `rulesEdition`, and `hiddenRolls`. Hashes validate; current rerender remains **unproved**. |
| Payload | Confirmed 31,995 context bytes, raw option counts 18/2/2, proposed packed ranking output 2,066 bytes, empty usage evidence. These are not post-filter cardinalities. |
| Teacher route | Existing `local-openai.ts` uses Chat Completions without temperature/strict-output configuration. Codex adapter wires reasoning effort but no temperature. Responses client and dataset projector are **new files**. |
| Producer | Arena uses scripted party policy and model-controlled monster decisions. Its fallback `generateRoom` wiring supplies difficulty and initiative profile; held-out helpers support explicit party materialization separately. |
| Regret infrastructure | Confirmed shallow reconstruction, internally derived seed, legacy programs active throughout the initial round, model-free continuation, and lexicographic terminal utility. The revised current-package runner is substantive new work. |
| Batch manifests | Counts are **8/10/7/10/9/7**, all ≤10. Existing/new paths match the repository. |
| Cost/time | Revised production arithmetic and conditional concurrency estimates reproduce. Pilot accounting and the physical request unit remain unresolved below. |

**Disposition of every round-one finding**

Line references below refer to the submitted revision.

| R1 finding | Closure | Quoted revision and assessment |
|---|---|---|
| P2-1 Archive/migration | **Closed at plan level** | L105: “770 is only a pre-migration/semantic-dedup ceiling”; L107: “construct, not cast”; L109 requires current render/submission and acceptance yield. Actual acceptance remains an implementation gate. |
| P2-2 Counts/sufficiency | **Closed** | L143: “at least 28,600 total accepted primary questions”; L146: “candidate corpus, not an ‘enough’ claim.” Counts and inter-unit responsibility are now coherent. |
| P2-3 Plateau/splits | **Core fix closed; statistical specification incomplete** | L162 requires the upper confidence bound “below” the threshold, 10,000 replicates, connected clusters, and five training seeds. L146 seals tests/audits. See R2 P2-6. |
| P2-4 Calibration | **Partial** | L152 separates distribution fidelity; L154 scores confidence against teacher probability; L156 adds replicates and engine baselines. Acceptance confidence and teacher-quality gates remain incomplete. |
| P2-5 Split independence | **Closed at plan level** | L204: “union-find connected components” and “freshly labelled” descendants. Semantic canonicalization needs the witnesses noted under P3. |
| P2-6 Leakage | **Closed as a mandatory design requirement** | L130: “Unknown paths fail validation”; L132 removes “all aliases” and ordering signals. The projector does not exist yet; implementation must demonstrate the complete advice ablation. |
| P2-7 Teacher/retries | **Partial** | L86 compares formats; L93 adds blinded review; L95 separates attempts from logical samples. High-cardinality selection rules and label-quality acceptance remain incomplete. |
| P2-8 Conditional/executable choices | **Partial** | L58 explicitly restricts the no-override task; L50 derives fallback after aggregation. None-dominant and insufficient conditional-sample cases remain undefined. |
| P2-9 Producer/dependencies | **Partial** | L113–126 separates modes, fixes held-out wiring, assigns branching, and prohibits inherited labels. Most diversity “quotas” still lack quantities. |
| P2-10 Outcome sidecar | **Closed for D835’s diagnostic scope** | L173 adds explicit seeds and complete packages; L175–177 covers horizon, failure and divergent RNG consumption. Later owner rulings make outcome selection a stronger requirement. |
| P2-11 Budget/route | **Partial** | L190 correctly reserves before dispatch; L68 selects a new Responses route. Request packing and pilot accounting remain inconsistent. |
| P2-12 D694 sequencing | **Closed against D835; dependency now unresolved** | L216: “Strictly after B18 and revalidation”; L220 specifies revalidation. D847 subsequently shelves that lane. |
| P3-1 Batches/RVM | **Closed at plan level** | L224 requires controls and byte-identical restoration; L226–231 name files, compiling mutations and corresponding witnesses. Execution evidence is correctly still pending. |
| P3-2 Reason codes | **Closed in principle** | L62 separates tactical reasons from advice reliance/uncertainty and makes reasons audit-only. Variable-sample aggregation needs a small correction. |
| P3-3 Owner questions | **Closed against D835; now superseded** | L259–261 adopts the requested three questions. Subsequent committed owner answers must replace those placeholders. |

**P2 — must fix before the plan binds**

1. **Incorporate the subsequent owner decisions explicitly.**

   These are committed records, not the uncommitted `.claude/` edits the brief says to ignore:

   - **D841:** Luna cap is $500.
   - **D844–D845:** strongest legal monster tactics; Opus-high and Sol-high judge every labelled state, with separate training-signal columns and blinded prompts.
   - **D846:** multiple strategy tunings; objective is winning probability. Its recorded supervisor interpretation changes primary selection from Luna vote preference to outcome comparison among tuned choices.
   - **D852/D852.1:** separate $400 starting Opus cap; report full-coverage shortfalls rather than silently reducing judge coverage.
   - **D853:** paid adjustment labels and reasons are mandatory.
   - **D854:** repetition follows a preregistered significance criterion, not fixed `k=5` or an unjustified 32 rollout seeds.

   L51’s optional adjustments, L168’s primary teacher-preference contract, L175’s fixed rollout count, and L259–261’s unanswered questions therefore cannot bind unchanged.

   **Fix:** update contracts, judge-column use, tuning definitions, sampling/stopping rules, costs, evaluation, and batch manifests. Distinguish the owner’s words from supervisor interpretations where the latter determine the primary training target. Preserve separate teacher-preference and outcome evidence.

2. **Specify the physical request unit before quoting corpus capacity.**

   L70–82 shows one actor response and says “for each logical state/actor sample.” L181–194 instead assumes **five calls per packed state**, covering roughly four actor questions. The C4 sizing script uses an `actors` array absent from the documented wire contract.

   These are materially different budgets: at the stated sensitivity, five calls for each of four actors cost **$0.228/context**, versus **$0.057/context** when packed.

   The $31 pilot reserve also needs an explicit ledger. Under the described standalone schedule and $0.012/request maximum:

   | Work | Reserve |
   |---|---:|
   | 200 states × three formats × three samples | $21.60 |
   | Two selected-format top-up samples/state | $4.80 |
   | 100 states × five independent replicate samples | $6.00 |
   | One route probe | $0.012 |
   | **Total** | **$32.412** |

   That excludes the 100-request load test and any additional requests needed for pairwise comparisons. Reuse credits could change the accounting, but must be specified without double-counting.

   **Fix:** define packed request/response schemas, actor-level failures and retries, pairwise request bounds, reuse credits, and request counts by phase. Enforce the input ceiling and billed-output limit in the actual client; an 8k sensitivity assumption alone is not an enforceable maximum. Recompute capacity after tunings, adjustments and judging.

   The original $300 recommendation is no longer defensible or current: 5,000 production states alone cost $285 at 8k output. The revision appropriately reduces the old $300 capacity to 4,083 contexts, but **7,150 at $500 remains a conditional primary-only ceiling**, not the revised deliverable size.

3. **Complete the pilot decision rules and label-quality gate.**

   L88 gives complete ranking an absolute validity/shuffle gate only for `K≤5`. L89 allows top-two for `K>5` only with a five-point validity advantage over complete ranking. Thus complete ranking at 98% validity and top-two at 100% has no clearly permitted high-cardinality outcome. Conversely, relative improvements alone do not establish acceptable absolute validity.

   L156 reports teacher–teacher agreement and JS but sets no acceptance or escalation criterion. Five valid answers can still be unstable or systematically wrong. Five samples also do not establish statistically significant dominance: for a binary comparison, observing 3/5 votes has one-sided null probability **0.5** under equal preference.

   L95’s ≤5-point invalidity difference does not prove unbiased labels. Failures can depend on the intended answer within every bucket.

   **Fix:** provide a complete protocol-selection table for every supported cardinality, including absolute validity floors, defined shuffle-sensitivity estimators, replication/precision criteria, and actions on failure. Under D854, specify an appropriate fixed-sample or sequential significance rule, maximum attempts, and multiplicity treatment. Keep genuinely ambiguous soft labels; do not manufacture apparent quality by discarding uncertainty. Audit failures and limit claims where nonresponse bias remains unresolved.

4. **Make fallback and adjustment derivation total.**

   L38 permits `none_dominant` with `option_id:null`; L43/L50 nevertheless require an “aggregate primary” to construct mandatory fallback labels.

   A valid five-sample vote pattern `(A:2, B:2, C:1)` has no aggregate primary under the stated contract. There is no lawful fallback baseline. Four accepted adjustment samples can likewise split 2/2, while an aggregate replacement decision may lack the required three valid replacement rankings.

   **Fix:** define explicit outcomes for:

   - None-dominant primary: retain its soft primary row; either omit conditional fallback with a typed reason or define a separately justified conditioning protocol.
   - Tied/none-dominant adjustment disposition.
   - Replace selected but insufficient valid replacement rankings.
   - Zero/one eligible alternatives.
   - Validation appropriate to complete rankings versus intentionally partial top-two responses.

   Preserve source denominators and distinguish deterministic controller behavior from emitted learning rows.

5. **Separate the representative human audit from enriched error discovery.**

   L93 mixes 100 random cards, 50 disagreements and 50 difficult cases, then applies an “overall” unacceptable-rate threshold to the combined sample. Without sampling weights, this is not the population unacceptable rate. Deduplicating overlaps and replenishing strata further changes inclusion probabilities.

   The cards currently audit **Luna**. L158’s training certification also needs to establish acceptability of the **student’s choices**, especially disagreements with Luna.

   **Fix:** use the random sample for a clearly defined population estimate, or retain inclusion probabilities and use a valid stratified estimator. Report enriched strata separately. Specify uncertainty bounds, repeated-encounter handling, adjudication of disputed scores, and a fresh blinded student audit at certification. Human reviewers and model judges used to change labels cannot simultaneously supply untouched final evaluation evidence.

6. **Finish the confidence-test specification.**

   The revised plateau test is substantially better. Connected-component bootstrap clusters, equal cluster weighting and training-seed resampling address the central round-one objection. But:

   - L158’s absolute certification thresholds use point estimates, not confidence bounds.
   - L154’s “15 equal-mass bins … macro-averaged by cluster” does not distinguish pooled cluster-weighted ECE from averaging separately binned per-cluster ECE. Those are different estimands.
   - ECE is nonlinear; L162 cannot obtain its bootstrap distribution merely by averaging row-level “ECE improvements.”
   - An upper improvement bound below 0.01 also passes a substantial degradation. That establishes “no substantial improvement,” not equivalence.

   **Fix:** preregister the exact estimands and confidence-bound acceptance rules, recompute the chosen ECE statistic within bootstrap replicates, and distinguish one-sided saturation from two-sided equivalence/noninferiority. State how adaptive dev reuse affects the evidence and retain the untouched final checks.

   The 20k-train/28.6k-total target is now a defensible **experimental milestone**, not a derived sufficiency result. Kev, Laya and Decider do not establish that this many long-context DM examples suffice. Thirty clusters is a minimum reporting rule, not a power guarantee.

7. **Turn the diversity inventory into an enforceable collection manifest.**

   L124 lists dimensions to “Cross,” but generally provides no target counts or proportions. “Weighted remaining spell/limited-resource fraction” lacks the weights and denominator. Most supported families/cardinality buckets can disappear while the aggregate question target still passes.

   The measurable requirements currently cover rare-action questions and the branch cap, not the broader claimed coverage.

   **Fix:** freeze a pilot-informed manifest before scale: supported families, marginal or selected crossed quotas, resource-band definitions, per-split independent-cluster targets, and explicit unattainable-bucket handling. Report accepted nontrivial actor questions after no-override filtering; raw actor counts cannot forecast their yield. Keep collection shortfalls visible rather than silently redefining support after purchase.

8. **Resolve the now-parked D694 dependency without treating shelving as permission.**

   The submitted B18 barrier correctly closes the original sequencing finding. However, [D847](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:1359) subsequently shelves COHORT-01/D694 and says reopening requires an owner decision.

   Batches 4–6 therefore depend on a landing that is no longer scheduled. L124’s actor-local visibility classifier and L220’s post-B18 revalidation also depend on that work.

   **Fix:** record DATA-01 as parked at that barrier, or obtain an explicit supervisory/owner reconciliation defining a different approved baseline and ownership sequence. Do not infer that shelving releases the protected files. Independent contracts and stub work remain separable.

**P3 — fix or record**

1. **Add explicit leakage witnesses for every actual carrier.**  
   The mandatory recursive registry is the correct design. Its tests should specifically cover `actors[].intel.opportunity_cost`, rendered catalog `recommendation: "index 0 = engine recommendation"`, `engine_recommended` wherever present, duplicate option arrays, and the advice-bearing `team_plan_frontier`/`applicable_plays`. Use a metamorphic witness: changing advice, IDs and ordering while preserving permitted mechanics must not change clean semantic features. Phase is legitimate explicit task context.

2. **Prove semantic canonicalization rather than assuming role aliases suffice.**  
   L202 needs rename/permutation witnesses for combatants, tokens, objects and options, plus a negative control where mechanically meaningful state changes alter the key. Otherwise symmetric actors or input-array order can defeat semantic deduplication despite correct union-find grouping.

3. **Generalize reason aggregation to the actual sample count.**  
   L62’s “3/5 support” conflicts with four-valid-sample acceptance and D854’s variable repetition. Define the denominator, threshold and tie behavior. Adjustment reasons should describe the material change or retention rationale required by D853; a generic tactical objective alone may not answer “why was the plan altered?”

The three owner questions were appropriate under D835. They have now been answered in the committed record; do not ask them again. The auditor’s identity and the D694 dependency disposition remain unresolved operational inputs.

**DATA-01 PLAN REVIEW R2 DONE**