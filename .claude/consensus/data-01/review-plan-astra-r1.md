# DATA-01 — astra HIGH plan review r1 (session 01a0c060-51dd-7ce0-aefd-a998db269e55, 100,069 tokens, final message only)

**REJECT — 0 P1, 12 P2, 3 P3.** The plan is a useful starting point, but it does not yet establish how the dataset will become sufficient for confident training.

Reviewed [the plan](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-20-data-01-luna-labelled-dm-decisions-plan.md), both JEV reports, and relevant source. SHA-256 matches:

`6b9bc7807c2b0b12f17a8620d4d1b89bad570a74946a0c00e60b504c1ed0458d`

Observed HEAD was `f5c2b731`, rather than the brief’s `a0612597`; intervening changes were confined to `.claude/` records. No files changed, builds run, network requests made, or models/agents invoked.

**Probe results**

| Probe | Independent result |
|---|---|
| C1 | Revision drift is records-only; production evidence remains applicable. |
| C2 | Confirmed 944 completed tables, 4,720 rounds, 6,001 calls, 19,080 initial actor slots/actions, 168 correction calls, 1,113 reconsult calls, and zero non-null winners or selected options. |
| C3 | Confirmed 3,874 captures with valid shapes and hashes. **Only 770 distinct state hashes**, representing 3,194 actor slots counted once per hash; 155 table seeds. Current rerender remains unproved. |
| C4 | Confirmed 31,995 context bytes, 2,712 minimal catalog bytes, 8,876.75 estimated input tokens, options 18/2/2, and empty usage evidence. |
| C5 | Confirmed fixture counts 12/13/10/10/1/8 and 24 CPUs. No NVIDIA evidence in checked local paths. |
| C6 | Confirmed generator capabilities and six arena bases; their availability does **not** establish the proposed dataset coverage. |
| C7 | Confirmed effort wiring and hardcoded low effort in `generate-data`. No temperature control in existing adapters. CLI invocation deliberately omitted. |
| C8 | Historical throughput statements match the cited records; they are not current API benchmarks. |
| C9 | Confirmed hash reconstruction, seeded model-free continuation, and lexicographic utility by source inspection. Multi-seed/current-option execution is new work. |
| C10 | Confirmed all cost arithmetic and 4.0–4.44 serial states/hour, conditional on the plan’s prices/token assumptions. Provider prices, limits, and temperature behavior were not independently reverified externally. |

**P2 — must fix before the plan binds**

1. **Archive availability is substantially overstated after deduplication.**  
   Lines 5 and 138 say “Recover the 3,874” and then fill the remaining target. Those captures contain only **770 distinct serialized states / 3,194 actor slots**. Moreover, 716 of those hashes occur in multiple tables. The captures span only two `matchupFamily` values: 3,679 captures from one and 195 from the other.

   All captures also lack fields declared by current `EncounterState`, including `phase`, `rulesEdition`, and `hiddenRolls`. `reconstructEncounterState` checks a shallow shape and then casts; it is not a current-state migration decoder. Hash validity therefore proves preservation, not usability.

   **Fix:** budget from distinct accepted states, specify migration/default provenance, and strengthen Batch 1 with current-render/submission witnesses and an explicit acceptance-yield gate. Reporting that all captures were dropped must not count as successful delivery. The exact accepted current state/catalog count remains unknown.

2. **The target cannot supply its own learning curve, and DATA-01 cannot certify sufficiency as scoped.**  
   Lines 138–142 require “20,000 valid primary questions” and a **20k training** subset, while line 194 reserves 30% for holdouts. At exactly 20,000 total questions, approximately 14,000 remain for training. A 20k training subset requires approximately **28,572 total questions**, before group rounding and coverage deficits.

   The survey anchors justify experimenting at this scale; they do not derive sufficiency for long-context DM decisions. Lines 151 and 207 also conflict operationally: collection continues until training gates pass, but training happens in another unit.

   **Fix:** distinguish total/train/holdout counts, declare the target provisional, and define the inter-unit loop. DATA-01 can deliver a validated candidate corpus; “enough” requires actual downstream training results.

3. **The plateau criterion mistakes uncertainty for equivalence.**  
   Line 149 requires small observed improvements and “cluster-bootstrap intervals including zero.” A wide interval containing zero can still permit a substantial improvement. That is an underpowered experiment, not evidence of saturation.

   **Fix:** preregister a paired cluster-bootstrap equivalence/non-inferiority test whose upper improvement bound lies below the practical threshold. Specify cluster construction, weighting, repetitions, independent training-seed variability, and minimum cluster counts per evaluated bucket. Clarify whether line 140’s “2,000 testable” questions are corpus or held-out counts.

   Line 151 also proposes targeting failing buckets using the frozen tests. Repeatedly adapting collection against them makes them development sets. Reserve an untouched final audit set, including a genuinely held-back time wave.

4. **Probability calibration has no coherent target definition.**  
   Lines 81–83 retain soft vote distributions, but lines 146–149 measure agreement against their argmax without defining ECE/Brier targets. For a teacher distribution `(0.6, 0.4)`, a student reproducing it perfectly predicts confidence 0.6; scoring against its fixed argmax gives accuracy 1 and an apparent calibration gap of 0.4.

   **Fix:** separate teacher-distribution fidelity, hard-mode agreement, and outcome/human correctness. Define Brier normalization, ECE variant/bins, weighting, ties, and treatment of `hard_label_eligible=false`. None-dominant rows must not silently become lexical-hash correctness labels. Add independent teacher replicates on an audit subset and explicit teacher/engine agreement and agreement-quality baselines.

5. **Split construction does not enforce the promised independence.**  
   Line 194 says “Group key is encounter seed + scenario family + source archive table.” A composite key separates tables sharing a seed; it also does not hold an entire family together. This matters concretely because 716 captured state hashes recur across tables.

   Raw state/catalog hashes also include identities and revision metadata, so they are insufficient semantic deduplication keys.

   **Fix:** construct connected groups across shared encounter origins, duplicate states, repeats, rounds, and branch ancestry. Define separate family-disjoint evaluation if that is intended. Assign a canonical semantic duplicate key before volatile bindings. Training-driven branching must remain within training groups; evaluation descendants need a frozen sampling policy. Descendants receive fresh labels, never inherited parent labels.

6. **The leakage serializer is underspecified and optional.**  
   Line 190 says “Prefer an allowlist serializer,” while line 68 asks for the “exact canonical `rawTurnContext`.” A DATA-01 serializer does not exist. The existing blind-context allowlist is a different contract.

   Shuffling the added catalog alone leaves another options array inside `rawTurnContext`. The fixture additionally exposes `intel.opportunity_cost.engine_default_option_id`, `better_option_id`, and recommendation-bearing prose. Removing only `engine_recommended` would therefore leave the proposed recommendation ablation contaminated. Current catalog construction also orders the recommendation first, then frontier options, then remaining options.

   **Fix:** mandate a recursive feature projection and classify every duplicated option list, recommendation alias, index, provenance field, and digest. Keep serving-available recommendations only as an explicit experimental choice; remove all aliases for the ablation. Phase is legitimate task context when defined explicitly, not automatically leakage. Audit IDs/digests should stay outside semantic model features unless justified.

7. **Teacher quality and retry policies can produce confidently biased labels.**  
   Lines 76–90 require complete rankings, five valid samples, and quarantine otherwise. Complete ranking of 18+ options is an untested burden; tail ordering is unnecessary for primary/top-two supervision. Five valid samples establish schema completeness, not decision quality. Rejecting entire states conditions the corpus on teacher success, potentially removing difficult/high-cardinality states.

   “Retry … with the same idempotency/cache key” also conflates retransmitting an unresolved request with requesting a new response after a completed invalid answer. “Never pay twice” is not guaranteed by a local cache after an ambiguous transport failure.

   **Fix:** pilot complete ranking against top-two or targeted pairwise checks, stratified by cardinality. Report agreement, entropy, shuffle sensitivity, validity, and quarantine rates by bucket, with preregistered actions when they fail. Add a blinded human spot-check protocol covering both random cases and disagreements. Separate logical samples from request attempts; preserve failure/usage receipts and distinguish transport reconciliation from resampling.

8. **Fallback, adjustment, and executable-choice contracts are incomplete.**  
   Line 70 packs “every question” into one request, but line 57’s fallback prompt requires the hard primary obtained only after aggregation. Line 59’s replacement question similarly depends on an aggregated `replace` label. The shown request cannot be constructed literally in advance.

   More seriously, lines 24 and 110 exclude overrides while using one teacher sample to advance play. The catalog contains dominated options, and [engine-server.ts](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/mcp/engine-server.ts:1806) rejects them without a typed override. A reason-code template alone does not satisfy that contract.

   **Fix:** define the teacher wire schema separately from derived training questions. Specify adjustment sampling, conditional replacement probabilities, baseline/remaining-budget inputs, and serving behavior when a selected option requires an override. Either supply an authorized bounded override mechanism or explicitly constrain the eligible choices and redefine the task accordingly.

9. **The implementation graph omits dependencies and misstates producer capability.**  
   The arena terminology correction is correct: Luna controls monster decisions, while the party is scripted. However, the arena’s `generateRoom` call passes difficulty and initiative profile; it does not pass the held-out party/family configuration required by lines 125–127. Missing challenge fixtures can fall back to standard generation, and scenario selection reuses the same scenario fixture across seeds.

   Batch 2 also proposes advancing with cached teacher samples before Batch 3 implements the teacher client. No batch explicitly owns the uncertainty-branching orchestrator.

   **Fix:** define actual producer modes and provenance-based quota classifiers; wire external party packs/families explicitly and prevent mislabeled standard fallbacks. Set measurable definitions for depleted/full resources, hidden states, branch caps, and rare-action coverage. Split capture-only generation from teacher-driven continuation and assign branching to a named batch.

10. **The sidecar needs substantially more than an option-ID bridge.**  
   Line 164 says “The missing bridge is current `EngineOptionId` → first engine proposal/command.” But [rolloutPrograms](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/regret/rollout.ts:343) takes legacy programs and internally derives one seed from capture metadata. It does not accept a rollout seed. Its initial program remains active throughout the initial round, rather than representing a single injected command.

   **Fix:** specify explicit seed injection, execution of complete current option packages, other actors’ fixed policies, adjustment baselines, continuation policy, horizon/censoring, and failure treatment. Define how stochastic utility vectors are compared. Equal PRNG seeds do not guarantee identical event-level luck after branches consume different numbers of draws.

   Batch 5 should test multi-slot execution and preservation of seed pairing, not merely “distinct first transitions.” Add the necessary rollout files to its allowed manifest.

11. **The budget is not a hard ceiling, and the forecast excludes required work.**  
   Lines 182 and 228 permit stopping only when the forecast exceeds the “hard $300” ceiling by 10%. That authorizes an overrun in the rule itself.

   At 8k billed output:
   - Production alone: **$285**.
   - A separate 200-state, seven-sample pilot: **$15.96**, giving **$300.96** before retries.
   - If pilot states count toward production and only two additional samples are needed: **$289.56**.

   Neither case leaves a sound reserve for invalid attempts, protocol changes, extra states needed for the training split, or trajectory work. The 350-token visible-output estimate is also weak: the fixture’s primary-ranking JSON alone is approximately 1,782 bytes, before additional task outputs.

   **Fix:** define whether pilot data is reusable, budget all attempts and phases, reserve worst-case in-flight spend before dispatch, and stop before exhausting the cap. The Responses/Vercel teacher route is **new work**: existing `local-openai.ts` uses Chat Completions without temperature or strict-output configuration. Select and test one route explicitly in Batch 3, including throttling, usage accounting, retry semantics, and effective-parameter evidence.

   At historical latency, concurrency eight still implies approximately **141–156 hours** for 5,000 states before retries. Batch support, if chosen, needs explicit implementation and scheduling scope.

12. **D694 sequencing is missing.**  
   Lines 200–201 modify `tools/ai-dm-conversation.ts`; Batch 2 also changes conversation/arena tests. The active D694 plan owns these surfaces through B18, including prompt projection, captures, execution, and adjustment materiality.

   **Fix:** declare D694 B18 landing and rebase/revalidation as a dependency for overlapping work. Reconfirm DATA-01’s serializer/catalog seam against the resulting actor-local boundary before freezing prompts or purchasing labels. Independent dataset contracts and stubbed teacher-client work can proceed without touching those files.

**P3 — fix or record**

1. **Batch sizes comply nominally:** 8/7/7/6/7/5 files. Existing/new labels checked out. However, several test paths remain unnamed, and R/V/M descriptions are intentions rather than exact witness–mutant mappings. Name each test and compiling runtime mutant; demonstrate that valid controls pass while the mutant fails. Incorporate the missing work above without silently exceeding ten files.

2. **Reason codes need a small contract decision.** The tactical categories are plausible, but `engine_recommendation` denotes reliance on advice and `uncertainty` denotes confidence, unlike the other tactical objectives. Define aggregation across samples and whether codes are audit-only or served. They should not substitute for typed override authorization.

3. **Revise the three owner questions.** Budget and scope are appropriate, but the primary teacher’s desired DM behavior is more consequential than selecting a diagnostic rollout utility. Recommended wording:
   - “What should Luna prefer: strongest monster tactics, balanced challenge, or another explicit DM style?”
   - “What is the total hard spending limit, including the pilot, retries, and additional collection?”
   - “Should the first dataset cover primary/fallback choices only, or also mid-round adjustments?”

   Keep existing monster-side utility as a clearly named diagnostic unless the owner requests outcome-based training. Record who supplies the blinded human audit and what happens if it finds systematic teacher errors.

DATA-01 PLAN REVIEW R1 DONE
