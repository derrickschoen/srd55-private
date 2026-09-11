**F1 — SIGNIFICANT: Journal replay still cannot handle the accepted legacy writer drift.**  
[Plan:287](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-08-offers-roadmap.md:287) preserves `{40,0,50}` and `{60,0,90}`, but [plan:293](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-08-offers-roadmap.md:293) replays historical commands through the new ordinary reducer and prohibits canonicalization from changing numeric movement.

For a linked journal containing the +10 spell cast, the preserved child is `{40,0,50}`; the planned recomputation at [plan:281](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-08-offers-roadmap.md:281) produces `{40,0,40}`. Provenance relabelling cannot reconcile them. The fly-60 case similarly differs by 30 remaining feet. I independently reran the read-only probe and reproduced both legacy outputs.

The three-revision Dash witness avoids this incompatibility. Define how historical **numeric semantics** are verified, and add genuine linked speed/mode journals with replay/export/reimport coverage. Preserving standalone snapshots does not finish the saved-session repair.

**F2 — SIGNIFICANT: Replay canonicalization omits skip/delay transitions.**  
[Plan:293](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-08-offers-roadmap.md:293) canonicalizes only marked `reducer_applied` revisions. However, `turn_skipped` and `turn_delayed` also execute reducer transitions and compare complete encounter states: [session-persistence.ts:1441](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/session-persistence.ts:1441) and [session-persistence.ts:1460](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/session-persistence.ts:1460). Both reach `end_turn` through [session-persistence.ts:1115](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/session-persistence.ts:1115).

Their newly entering actor receives fresh known provenance during replay, while its independently migrated historical snapshot receives legacy provenance. Equality therefore fails even without numerical drift. Cover every reducer-backed journal transition and add marked skip/delay replay witnesses.

**F3 — SIGNIFICANT: Recovery can still deadlock at the outgoing turn boundary.**  
The incoming-turn placement at [plan:291](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-08-offers-roadmap.md:291) fixes the reviewed start-boundary case. It does not address an imported **active** drift/indeterminate actor whose movement effect expires at its current turn end.

`end_turn` processes that actor’s end boundary before calling the next `startTurn` ([encounter.ts:12736](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/combat/encounter.ts:12736)). Expiry invokes `endEffects`, then movement refresh ([encounter.ts:5619](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/combat/encounter.ts:5619), [encounter.ts:3050](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/combat/encounter.ts:3050)). The unconditional refusal at [plan:289](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-08-offers-roadmap.md:289) prevents reaching recovery.

Specify safe outgoing-boundary handling and require an imported active drift-state → effect expiry → next-turn witness.

**Verified claims**

- Frozen hash `5acd9b16…`, 937 lines, HEAD `eb778854`, clean tree, and frozen contracts hash match.
- Reconstructed round 1 in memory and verified its exact `213f0b39…` hash before comparison. Changes are confined to migration, its dependent files/gates/rollback, and accepted F5/F6 clarifications. Previously verified unrelated sections remain byte-stable.
- Round-1 F1’s **standalone import** disposition is corrected: finite nonnegative drift is retained and blocked from execution, with both numerical witnesses specified.
- Round-1 F3’s **incoming-boundary ordering** is corrected and has a real transition witness.
- Round-1 F4’s realizable Flee boundary is corrected to `{60,60,0}`. The exhaustion flag explicitly preserves zero remaining through `{80,60,0}` and restoration.
- F5 now separates attack-specific reach from OA reach and pins Reactions unavailable; verified bottleneck topology and path sets remain unchanged.
- F6 explicitly records the required port exception.
- Schema-13 database files, targeted gates, authoritative supervisor rerun, and rollback are allocated. The remaining replay/recovery defects prevent acceptance.
- No edits, tests, or builds performed.

VERDICT: REJECT

review complete