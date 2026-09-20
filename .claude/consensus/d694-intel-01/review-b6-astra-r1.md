78,491
**REJECT — P1: 0, P2: 1, P3: 1.** Production routing looks sound; the required witness needs correction.

- **P2 — Claimed opportunity HP 1/50 witness actually tests 0/1.** At [d694-intel-privacy.test.ts:1085](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/d694-intel-privacy.test.ts:1085), `guardOriginal` inherits Fighter **0 HP, `life: 'dying'`** from seed 5117009. The added variant changes only HP to 1; no 50-HP opportunity variant exists. The older 1/50 test compares registry/play/skill/suggestion outputs, not report vectors or public opportunity rows. Construct explicit living 1/50 variants, assert those premises, and compare the complete reports, dominance and public rows. A threshold-dependent numeric leak could escape the current assertions.

- **P3 — No explicit fully perceived report-equivalence witness.** The new test proves offer-ID completeness and hidden-state invariance, but identical wrong evaluations across variants could pass. Add a fully perceived positive case comparing local and host reports, including vectors, default and frontier. The unchanged shared evaluation kernel supports equivalence statically; it does not independently test the local projection’s inputs.

Other review conclusions:

- **Boundary:** All model-facing opportunity/dominance callers traced use the local API. Remaining host calls serve simulation/default execution. Legacy symbol occurrences are zero. The opaque parameter and authoritative-input compile negative are load-bearing.
- **Conversation:** Preserving exact `request.actors` is an appropriate in-scope correction. Count-based reconstruction selected a sorted prefix, potentially changing actors; an out-of-boundary lookup throws `ACTOR_LOCAL_ACTOR_MISMATCH`. Host report behavior remains unchanged.
- **Pins/scope:** Independently verified all five pin/host test files equal their parent after only the rename substitution. No literal, fixture, documentation or out-of-manifest changes; worktree clean.
- **Witness strength:** Exact cached-offer ID equality catches dropped/added report options. Complete report/public-product comparisons cover relocation/removal, dominance equality and Fighter ID/name absence. They do not independently establish the claimed exact host-minus-one-option ledger or preserved numerical values.
- **Validation:** Plan hash matches; diff check passes. My wrapper test attempt failed before execution with `EROFS` writing Vite’s temporary config. Supervisor results were inspected as external evidence; I did not reproduce them or independently establish the supervisor mutant’s outcome.

D694-INTEL-01 B6 REVIEW R1 DONE
