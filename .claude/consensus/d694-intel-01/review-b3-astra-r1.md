# D694-INTEL-01 B3 — astra MEDIUM review r1 (session 01a0bd6d-1847-7941-a8f7-33b1b09e3ff3, final message only)

**REJECT — 0 P1, 2 P2, 0 P3.**

1. **P2 — Multi-actor requests incorrectly lose monster-team counts.** In [engine-server.ts:708](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/engine-server.ts:708), the intersection requires identical `relation` values. A requested monster is `self` in its own view but `monster_team` in another’s, so it is excluded.

   Running the committed function body in memory with six living monsters produced `living_enemies` **6 → 4 → 0** for one, two, and six requested actors. All should report six. Normalize these two relations to monster-side membership; add a multi-actor witness. Dead monsters should remain excluded from living counts; living tokenless monster Whole participants should remain counted.

2. **P2 — The Room 8 witness bypasses the conversation products it claims to verify.** [d694-intel-privacy.test.ts:351](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/d694-intel-privacy.test.ts:351) constructs its own `safeInput`, then serializes `{format: 'arena-rl-capture-v2', ...safeInput}`. It never exercises conversation hidden-option copies, blind offered-option copies, exhaustion capture, or actual RL/JSONL assembly. Reverting those conversation changes would leave this witness green.

   Exercise the production capture path across relocation/removal. The current no-allusion check catches the Fighter ID/name and only the phrase pattern “three/3 player/party/opponent”; it does not substantiate the broader claim.

Other review results:

- Matrix, capture, and calibration signatures accept the opaque boundary; no remaining production matrix caller passes authoritative state. The three compile negatives are included by `tsconfig.node.json`.
- Shared initiative intersects local spatial initiative IDs. The count defect above is separate.
- Scout scene changes reuse the existing `(10,2) → (8,2)` construction. Its retained corner-ray assertion explicitly requires two clear rays, Half Cover, and visible Fighter. No expected literal was weakened or regenerated.
- Conversation pins are unchanged. Traced initiative metadata enters runtime reconstruction; migrated initiative/capture products read the boundary. Existing capsule prompt calls remain unchanged and assigned to B9/B16.
- Recorded count, initiative, and capture mutants fail assertions, not crashes; calibration records TS2578. The cited supervisor verification log contains suite results but no supervisor-mutant transcript, so I could not independently verify that additional run.
- Frozen plan hash matches; exactly eight permitted files changed; no fixture/doc changes; diff check passed.

Independent node TypeScript checking passed. Vitest stopped before executing tests because `/tmp` SSR-directory creation failed. No files were modified.

D694-INTEL-01 B3 REVIEW R1 DONE
