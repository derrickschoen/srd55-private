No SIGNIFICANT or TRIVIAL findings. Round-3 F1 is resolved.

**Verified claims**

- The corrected historical spend formula matches [movement.ts:427](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/combat/movement.ts:427): validate against reported remaining, accumulate spent, then derive remaining from speed minus spent.
- The read-only reducer probe reproduced both real cast→move sequences: `{40,0,50}→{40,5,35}` and `{60,0,90}→{60,5,55}`. Both emitted sequence-8 `movement_completed` events with the specified path and remaining values, consistent with [encounter.ts:5263](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/combat/encounter.ts:5263).
- The extended journal witnesses explicitly require both replay cycles and exact state/event assertions. The incorrect stale-remaining formula now fails those assertions ([plan:323](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-08-offers-roadmap.md:323)). Full replay equality remains required; export invokes replay before encoding ([session-persistence.ts:3370](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/session-persistence.ts:3370)). These are implementation gates, not tests already executed.
- Reconstructed round 3 matched its frozen hash. Comparison confirms previously verified sections remain byte-stable; changes are confined to F1’s formula, witnesses, associated gates, and review metadata.
- Round-4 SHA-256 matches `911a10f1…89417e0`; HEAD remains `eb778854`, with a clean tree.

No edits, tests, or builds were performed.

VERDICT: ACCEPT

review complete