**F1 — SIGNIFICANT: The historical movement-spend formula is incorrect, so writer-drift journals still fail replay after movement.**

[Plan:309](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-08-offers-roadmap.md:309) defines legacy spending as adding cost to `spent` and subtracting it from `remaining`. Actual v12 [`spendMovement`:431–435](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/combat/movement.ts:431) instead computes:

```text
spent' = oldSpent + cost
remaining' = speed - spent'
```

My read-only production-function probe reproduced:

| Before | Cost | Actual v12 result | Planned result |
|---|---:|---|---|
| `{40,0,50}` | 5 | `{40,5,35}` | `{40,5,45}` |
| `{60,0,90}` | 5 | `{60,5,55}` | `{60,5,85}` |

The reducer calls this function and emits its resulting remaining movement at [encounter.ts:5263–5273](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/combat/encounter.ts:5263). Both state and event equality would fail.

The writer journals at [plan:313](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-08-offers-roadmap.md:313) stop immediately after casting; the separate Dash journal uses a coherent triplet where the formulas coincide. Correct the historical spend arm and extend **both writer journals through a subsequent movement command**, including exact state/event assertions and replay → export → reimport → replay.

**Verified claims**

- Candidate hash, 963 lines, HEAD `eb778854`, clean tree, and frozen contracts hash match.
- Reconstructed round 2 and verified its exact `5acd9b16…` hash. Changes are confined to replay/recovery and associated dispositions, witnesses, files, gates, and rollback. Previously verified unrelated sections—including bottleneck geometry—remain byte-stable.
- Round-2 F2 is addressed: [plan:311](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-08-offers-roadmap.md:311) covers all three reducer-backed transitions, canonicalizes every combatant, and retains complete comparisons; skip/delay journals are explicitly required.
- Round-2 F3 is addressed: [plan:303–305](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-08-offers-roadmap.md:303) permits internal lifecycle cleanup while carrying unresolved movement unchanged, preserves controller refusal, and specifies outgoing drift/indeterminate witnesses plus replay of the appended unmarked transition.
- Historical/current mode selection is explicitly child-marker-driven, with current-mode controls. Historical numeric fidelity remains blocked by F1.
- No edits, tests, or builds performed.

VERDICT: REJECT

review complete