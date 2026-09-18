# OFFER-ENV-HELP-01 plan r3 — astra review (HIGH, resume 01a0a812…, exit 0)

The revised plan is acceptable with **one binding amendment**. F10, F11 and F13 are closed. F12’s supported-consumer gate is adequate, but its spell-attack test expectation remains inconsistent with HEAD.

Verified:

```text
sha256sum .tmp-plans/2026-09-15-offer-environment-help-only.md
6af2b77f52ac2220511bbc46734140b61c05c9d4b2425c6163af62b7ee24978a

wc -l .tmp-plans/2026-09-15-offer-environment-help-only.md
640

git rev-parse HEAD
cc8b057f7cdcc2a0df38725a7adfa91d2d9e6e81
```

Read D617.39 using `sed -n '22755,22770p' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md`. Its acceptance of all four previous findings is reflected below.

All plan references concern [2026-09-15-offer-environment-help-only.md](/home/vagrant/PhpstormProjects/dnd-wt-offer-env-plan/.tmp-plans/2026-09-15-offer-environment-help-only.md).

**Round-2 findings**

| Finding | Disposition | Evidence |
|---|---|---|
| **PLAN-F10** | **CLOSED** | Plan:271–283 specifies `other`/`legacy`, positive-only admission, dominance coordinates and actual-default assertions. A read-only `node --input-type=module` probe extracted HEAD’s candidate/frontier/comparison functions and applied the proposed rule in memory. Results below establish that the old-filter mutant changes the winner. |
| **PLAN-F11** | **CLOSED** | Plan:299–308 defines both allocation refusals and team propagation. `sed -n '1680,1815p' src/vtt/engine-query-port.ts` confirms a guard can precede input construction. `sed -n '350,425p' src/vtt/intel/team-scorer.ts` confirms unresolved/null allocations return `attack_allocation_unresolved` before scoring probabilities. The allocation and team suites are explicitly present at plan:426–427. |
| **PLAN-F12** | **STILL OPEN, limited to PLAN-F14 below** | Plan:245–250 restores the supported-consumer gate and single-component benefit. Resolved Dodge and wrong-target controls can distinguish zero substitution. The unsupported spell-attack control cannot have the stated resolved-default premise at HEAD. |
| **PLAN-F13** | **CLOSED** | Plan:323 and :329–330 separates conscious Slow from Incapacitated refusal. A source-extracted `spendAction` probe reaches the coupling branch and distinguishes its removal. |

Candidacy probe output:

```text
positive: revised=help old-filter-mutant=direct
zero: revised=direct old-filter-mutant=direct
negative: revised=direct old-filter-mutant=direct
unresolved: revised=direct old-filter-mutant=direct
direct tuple: 64 comparisons, 0 differences
```

The allocation probe applied the proposed early guards to the source-extracted allocation function, using synthetic attack/fold dependencies:

```text
dependent: status=unresolved; kill=null; inputs=0;
  reasons=help_consumption_allocation_unmodeled
reuse-mutant: status=resolved; kill=0.5; inputs=4;
  reasons=allocation_resolved
declaration: status=unresolved; kill=null; inputs=0;
  reasons=help_declaration_allocation_unmodeled
team propagation: status=unresolved; reasons=attack_allocation_unresolved
```

The `0.5` is a synthetic probe value, not a verified combat probability. The relevant distinction is refusal before any inputs versus reaching the fold.

Slow probe output:

```text
Slow production: action=spent, bonus=false
Slow coupling-mutant: action=spent, bonus=true
```

These are feasibility probes, not claims that the future implementation’s tests already pass.

**Earlier findings remain closed**

| Finding | Round-3 check |
|---|---|
| **F1 — CLOSED** | Repeated the in-memory three-union compiler overlay: **41 diagnostics / 12 files** for app; **56 / 19** for node; **0 diagnostic files outside manifests**. Raw generation-symbol search found **11 files, 0 outside manifests**. |
| **F2 — CLOSED** | Plan:91–101 preserves provenance first and names `validateEngineOfferFamilyPolicy`. `sed -n '532,554p' src/vtt/intent-resolver.ts` confirms the existing universal mismatch check being preserved. |
| **F3 — CLOSED** | Plan:287–297 still requires ordered consumption in both projection loops, independently specified distribution/vector assertions and a mutant at each site. Both suites remain manifested. |
| **F4 — CLOSED** | Exact units, empty maximum, unresolved competitors/defaults, separate setup coordinate and removal of only the new effect remain specified. The **64 comparisons / 0 differences** probe reconfirms the direct tuple prefix claim. F14 concerns the newly added control, not these formulas. |
| **F5 — CLOSED** | Plan:499–512 keeps Slice 3 checker-only, moves promotion to `OFFER-ENV-HELP-PROMO`, and blocks default/legacy enablement. |
| **F6 — CLOSED** | Plan:311–333 retains attack-path, save, distance, death, faction, persistence and replay assertions. The helper-death lifetime remains explicit. |
| **F7 — CLOSED** | Plan:117–131 retains the DM-only declaration event, neutral resource purpose and visible-player projection assertions. `sed -n '6154,6178p' src/combat/encounter.ts` and `sed -n '460,490p' src/combat/visibility.ts` reconfirm the emission/filter seams. Both production files and the visibility suite remain manifested. |
| **F8 — CLOSED** | Plan:452–457 still requires an enabled round that actually selects/resolves Help, identical encounter/RNG inputs, raw walls and the **1.25** limit. |
| **F9 — CLOSED** | Re-ran the exact Python receipt printed at plan:343–350: **61 paths; 61 unique; 61 exist**. |

`rg -n 'readyAttack' tests` still finds **five explicit bodies, all disabled**. The frozen contracts hash still equals `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.

**PLAN-F14 — P2 — Unsupported spell-attack control contradicts the earlier unresolved-default rule**

Location: [plan:242](/home/vagrant/PhpstormProjects/dnd-wt-offer-env-plan/.tmp-plans/2026-09-15-offer-environment-help-only.md:242) and [plan:245](/home/vagrant/PhpstormProjects/dnd-wt-offer-env-plan/.tmp-plans/2026-09-15-offer-environment-help-only.md:245).

Lines 242–243 assign unresolved defaults `help_followup_default_unresolved`. Lines 245–250 instead include an unsupported spell attack among **resolved** defaults expected to return `help_followup_no_supported_consumer`.

Evidence command:

```bash
sed -n '506,519p;572,598p;1276,1290p' src/vtt/intel/option-outcome.ts
```

The output establishes that attack spells outside the six modeled-effect exceptions become `unsupported`, and `evaluateOptionOutcome` returns `status: 'unresolved'`. `sed -n '280,295p' src/combat/spells/definitions.ts` confirms Guiding Bolt uses `attack_damage`.

The source-extracted classification/evaluation probe returned:

```text
Guiding Bolt declaration: {"kind":"unsupported","reason":"spell_operation_unsupported"}
Guiding Bolt outcome: {"status":"unresolved","policy":"test","reason":"spell_operation_unsupported"}
```

Consequently, that case cannot prove the claimed resolved-default gate without fabricating a resolved outcome. The Dodge and wrong-target cases can independently kill `HELP_UNSUPPORTED_CONSUMER_ZEROED`.

**Exact binding amendment:**

> At lines 242–250, unresolved-default handling takes precedence: test the unsupported spell-attack default through real `direct_only` selection and expect `help_followup_default_unresolved`; restrict the resolved-default `help_followup_no_supported_consumer` parameterization and `HELP_UNSUPPORTED_CONSUMER_ZEROED` kill requirement to Dodge and wrong-target attacks.

This is the only remaining finding: **0 P1, 1 P2**. It can be resolved by that one-line dispatch amendment. I found no additional manifest gap or new scope expansion requiring another planning round.

No files were changed; final `git status --short` produced no output.

PLAN VERDICT: ACCEPT WITH AMENDMENTS (PLAN-F14)

REVIEW DONE
