# BLIND-01 B5 review r1 (gpt-6-astra MEDIUM, candidate 662b77a6)

tokens used
76,244
**REJECT — 0 P1 / 3 P2 / 0 P3.**

1. **P2 — Frozen brutal-b rows can bypass their shape assertions.** [arena-basis-brutal-b.test.ts:406](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/tests/unit/vtt/arena-basis-brutal-b.test.ts:406) skips the branch/body/origin/path/cost checks whenever **current production output** satisfies `legacyProductive`. A regression giving a formerly blind row positive movement or offense would pass that predicate and escape the frozen contract. The assertions include the complete typed body and origin/`[]`/0/Dodge—not merely an ID—but their applicability must be fixed independently of candidate output. Pin the expected 40 actor rows and assert their shapes unconditionally.

2. **P2 — Stationary Search without `pursue_indication` still lacks its negative witness.** [d569-second-family-manifest.test.ts:231](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/tests/unit/tools/d569-second-family-manifest.test.ts:231) covers typed versus ordinary Dodge only. Searching all helper call sites found no stationary-Search contrast. Removing the stance requirement from the helper’s Search branch would therefore escape this focused contract. Add a zero-movement Search pair differing only in engagement, asserting productive with pursuit and unproductive without it.

3. **P2 — Team-scorer test does not reach numeric scoring.** [team-scorer.test.ts:100](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/tests/unit/vtt/team-scorer.test.ts:100) expects `attack_allocation_unresolved`. Production returns there before score aggregation, so a Search-specific scoring bonus introduced downstream would remain undetected. Add a resolved scoring witness with explicit zero offense/damage credit. The separate option-outcome test correctly pins `known_no_effect`, `legacy`, and every ledger numerator to zero; it would catch a nonzero **outcome ledger**, but does not close the scorer gap.

Other requested checks:

- **No regenerated expectations found.** Tests hand-construct bodies and explicitly apply `option:<revision>:sha256(canonicalJson(body)).slice(0,48)`. Independently recomputed using the repository’s `canonicalJson` and Node SHA-256:
  
  | Seed 6206001 actor | Recomputed ID |
  |---|---|
  | monster-1 | `option:0:934735d6d5420bdc081adc2af544797f7eda0c04fa8f9346` |
  | monster-2 | `option:0:15735ff9650b7f9a8c2b35d6119c2299d90fb0159722751d` |
  | monster-3 | `option:0:bebcc88f2b50cf92e1f989702db5d54464d2d21788e7d767` |

  Both hand-body hashes also reproduce: no-cue `82a06e81e7c97824560e9abaabdf9e0c323c94a169e4f69ec1890a67670306aa`; indicated Search `72482c690ed2735ddf39965217d838216da71e3882b784dd755681e926d2c5ba`.

- **6209003 contrast is valid for the structural helper:** the ordinary body differs only in engagement, with identical resolution mechanics; origin `(11,2)`, empty path, zero movement and typed stance/policy are asserted.
- **MCP:** the added asserted Search shape exposes target identity, not coordinates or conditions. However, it only partially matches an option row; it does **not** pin the complete turn-context or exercise a never-perceived PC. It cannot independently establish D691/D694 privacy.
- **Frozen controls:** all ten brutal-b byte hashes match their unchanged literals; fixture bytes are unchanged versus base. Perceived-menu count **6** and IDs `54bc/c93d/51155/928f/8026/e1b9` remain unchanged.
- **Removed lines:** formatting changes plus the productivity-predicate replacement addressed in finding 1; no other deleted or weakened assertion found.

No writes, model calls, or supervisor test reruns performed.

BLIND-01 REVIEW B5 DONE
