# VERDICT: REJECT — 0 P1 / 5 P2 / 2 P3

Round 3 still has significant, fixable findings. Under the three-round cap, DATA-01 reaches the owner escalation gate.

## P2 — must fix

1. **The D854 tests do not yet establish the claimed familywise control.**

   - The Luna rule selects the empirical leader and then performs one-sided tests in that observed direction: “the empirical leader … Compare it with every alternative using an exact one-sided binomial test” ([plan:96](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-20-data-01-luna-labelled-dm-decisions-plan.md:96)). Holm over unordered pairs does not account for choosing the favorable direction from the data. Specify two-sided exact tests or include both directed hypotheses in the multiplicity family.
   - The rollout rule similarly selects “the best candidate” before adjusting only its realized comparisons ([plan:112](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-20-data-01-luna-labelled-dm-decisions-plan.md:112)). That does not plainly control selection among all possible winners. “Holm-adjusted Newcombe–Wilson intervals” also needs an explicit interval-inversion/adjusted-critical-level algorithm.
   - Luna has a 60-attempt ceiling, but rollout has only a ceiling of 512 **successful** runs. It lacks a maximum attempted-rollout count.
   - The non-separation result is correctly specified: Luna and rollout both emit `none_dominant`.

2. **The actor-local statistical unit is inconsistent with the packed physical request unit.**

   - A request is “one boundary × one tuning × one independent replicate” packing every actor ([plan:60](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-20-data-01-luna-labelled-dm-decisions-plan.md:60)), but cardinality, validity and dominance are actor-question properties.
   - The pilot nevertheless assigns “200 boundary states … 40 per eligible-cardinality bucket” ([plan:82](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-20-data-01-luna-labelled-dm-decisions-plan.md:82)). One packed boundary can contain actors in several buckets; the disjoint 40×5 accounting has no assignment rule.
   - The stopping ceiling is stated “per cell” at boundary/tuning level ([plan:96](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-20-data-01-luna-labelled-dm-decisions-plan.md:96)), without saying how already-separated actors are removed while remaining actors continue.
   - The capacity formula uses “mean valid reps” ([plan:137](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-20-data-01-luna-labelled-dm-decisions-plan.md:137)); physical requests are governed by the maximum still-active actor depth in a packed boundary, not the mean actor depth.
   - The initial protocol and agreement calls are credited to “one tuning,” but that tuning is unnamed and no gate supports applying its result to all four tunings ([plan:128](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-20-data-01-luna-labelled-dm-decisions-plan.md:128)).
   - Line 72 also conflicts internally: a failed-actor repair keeps the same logical sample ID, while a completed invalid output becomes “a new independent logical resample” ([plan:72](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-20-data-01-luna-labelled-dm-decisions-plan.md:72)). The failure classes and ID transition need to be explicit.

3. **Two emitted-label contracts still require implementer decisions.**

   - With one unique tuned candidate, the plan stores `only_tuned_candidate` but does not say whether `outcome-selected primary` is that option, null, or excluded from hard-primary training ([plan:33](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-20-data-01-luna-labelled-dm-decisions-plan.md:33), [plan:108](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-20-data-01-luna-labelled-dm-decisions-plan.md:108)). That status is also absent from the master `{dominant|none_dominant}` categorical type at line 38.
   - For adjustment replacement, “insufficient replacement-valid samples” is defined as an outcome ([plan:51](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-20-data-01-luna-labelled-dm-decisions-plan.md:51)), but the conditional denominator, look schedule and sufficient-sample threshold are not. State whether only valid rankings from replicates voting `replace` enter that distribution and how its sequential rule is applied.

4. **The D847 protected-path list is materially incomplete.**

   - The PROCEED/PARKED split and two-answer owner slot are correct ([plan:196-198](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-20-data-01-luna-labelled-dm-decisions-plan.md:196)).
   - But line 196 protects only the two AI-DM tools, `src/vtt/mcp/*`, `src/vtt/intel/*`, `src/vtt/speculative-*`, and vaguely “their owned tests.”
   - The shelved D694 manifests also own, among others, `src/vtt/dm-tactical-intel.ts`, `engine-query-port.ts`, `renderer-profile.ts`, `blind-turn-context.ts`, `semantic-board-payload.ts`, `blind-intent-resolver.ts`, and `tools/ai-dm-board-snapshot.ts` ([D694 plan:144-199](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/.tmp-plans/2026-09-19-d694-intel-01-plan.md:144)). The later boundary plan expands this to an 84-file union ([boundary plan:338-437](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/.tmp-plans/2026-09-19-d694-intel-01-boundary-plan.md:338)).
   - The current B1–B3 manifests happen not to overlap those omitted files, so immediate work remains separable. Nevertheless, the guard must bind the exact frozen ownership union—or simply forbid every path outside the exact DATA-01 batch manifest—rather than present an incomplete directory shorthand as authoritative.

5. **The “held-back-time audit” is named but not constructed.**

   - Line 169 appears to assign 5% of existing components to a “held-back-time audit” alongside ordinary split percentages ([plan:169](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-20-data-01-luna-labelled-dm-decisions-plan.md:169)).
   - Line 179 says it is opened once ([plan:179](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-20-data-01-luna-labelled-dm-decisions-plan.md:179)), but gives no cutoff, later collection wave, eligibility rule, or contamination guard. Randomly assigning existing components is not a genuinely time-forward holdout. The implementer would have to invent the wave.

## P3 — fix or record

1. **State the pilot-cap consequence plainly.** The correct maximum pilot reserve is $405.612, which is **81.12% of the $500 Luna cap**. Lines 128–141 expose the numbers but never say directly that the pilot alone may consume most of the cap.

2. **Name all human roles consistently.** Line 19 lists a “named qualified auditor, second scorer/adjudicator,” while line 102 requires a primary auditor, second scorer, and a “third named adjudicator” ([plan:19](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-20-data-01-luna-labelled-dm-decisions-plan.md:19), [plan:102](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.tmp-plans/2026-09-20-data-01-luna-labelled-dm-decisions-plan.md:102)). Record three distinct open roles or explicitly permit and justify role combination.

## Round-2 closure audit

| Finding | Result | Revision evidence |
|---|---|---|
| P2-1 rulings | **CLOSED** | “Owner rulings, kept distinct from interpretations” at lines 7–15; “supervisor readings, pending owner confirmation” and separate evidence columns at line 17. |
| P2-2 physical unit/cost | **PARTIAL** | Physical unit and ledger exist at lines 60 and 118–139, but actor-local stopping, bucket assignment, reference tuning and retry identities remain unresolved. |
| P2-3 pilot/stopping | **PARTIAL** | Complete format table and four looks at lines 82–96; selection-direction and rollout multiplicity do not yet prove FWER. |
| P2-4 total derivation | **PARTIAL** | The enumerated zero/one/tie/insufficient cases are covered at lines 47–52; conditional replacement denominator and one-candidate primary emission remain unspecified. |
| P2-5 human audit | **CLOSED** | Representative and enriched samples are separate, with rescoring/adjudication and fresh student audit at lines 102–104. |
| P2-6 confidence | **CLOSED** | Exact pooled ECE, bootstrap recomputation, bound-based certification and two-sided equivalence appear at lines 175–181. |
| P2-7 diversity | **CLOSED** | Pilot-informed marginals, crosses, resource bands, split minima and unattainable-cell handling appear at lines 151–159. |
| P2-8 D694 barrier | **PARTIAL** | B1–B3 PROCEED, B4–B6 PARKED and both owner outcomes are correct at lines 187–198; protected ownership is underlisted. |
| P3-1 leakage witnesses | **CLOSED** | Named carriers and mechanics-preserving metamorphic witnesses appear at lines 163–165 and 187. |
| P3-2 canonicalization | **CLOSED** | Rename/permutation positives and meaningful negative controls appear at lines 167 and 187. |
| P3-3 reasons | **CLOSED** | Variable-`n` simultaneous aggregation and typed, materiality-linked WHY appear at lines 40–42. |

## Closed round-1 regression check

No previously quoted closure disappeared in the 348→278-line rewrite:

- P2-1 archive migration: lines 145–147.
- P2-2 counts/sufficiency boundary: lines 3, 141 and 173.
- P2-3 plateau core: lines 177–181.
- P2-5 split independence: lines 167–169.
- P2-6 leakage projection: lines 163–165.
- P2-10 current-package outcome runner: lines 108–114.
- P2-12 original B18 sequencing: superseded conservatively by the stronger park at lines 194–198.
- P3-1 manifests/mutants: lines 183–192.
- P3-2 reason-code separation: lines 40–42.
- P3-3 answered owner questions: lines 9–19.

The underdefined time-wave audit is a remaining specification gap, not deletion of the quoted plateau/confidence machinery.

## Cost recomputation

All arithmetic reproduces from `$0.012/request`:

- Review ledger: `1,800 + 400 + 500 + 1 = 2,701` requests; `2,701 × .012 = $32.412`.
- First four-tuning look plus load test: `2,701 + 3,000 + 100 = 5,801`; reserve `$69.612`.
- Maximum pilot: `5,801 + 200×4×35 = 33,801`; reserve `$405.612`.
- Per boundary: `4×{5,10,20,40}×.012 = {$0.24,$0.48,$0.96,$1.92}`.
- The capacity floors in lines 132–135 also reproduce: `1,793/393`, `896/196`, `448/98`, and `224/49`.

These are correct conditional calculations, but P2-2 prevents treating them as an executable forecast until the actor/request aggregation is fixed.

## Consensus workflow check

- Authority/state: read-only; no writes, tests, builds, network, or model dispatches.
- Independence: fresh Sol reviewer under D860; this session did not author the plan.
- Candidate: prospective plan, round 3, SHA-256 `f8ca3d0d…0017`.
- Assumptions: source-checked against both prior reviews, rulings digest, D847/D857, and the shelved worktree manifests.
- Shared state: main advanced during review from `4f1ad23a` to records-only `bfae2c22`; no `src/`, `tools/`, `tests/`, or `package.json` difference, and the plan hash stayed unchanged.
- Completion: significant findings remain after round 3, so consensus is unavailable and owner escalation is required.

DATA-01 PLAN REVIEW R3 DONE