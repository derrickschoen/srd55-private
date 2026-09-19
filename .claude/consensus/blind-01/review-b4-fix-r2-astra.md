153,326
**ACCEPT — 0 P1, 0 P2, 0 P3.** Reviewed only `3554c623` against `a5389bdc`.

1. **Handler-level privacy probes pass.** I reran the actual advice MCP resource path. Serialized **request bytes** were identical for relocation `(6,1)→(30,1)`, speed 30/15/0, Paralyzed, absent token, and strictly dead roster entry. Every case retained two candidates/three scenarios.

   The dead PC remains a candidate when its ID remains in the supplied unacted-player list. This is a conservative roster hypothesis: it reveals neither death nor presence and supplies no pursuit cue or attack authority. It does not add identity beyond the already-known roster. The normal conversation caller separately excludes dead actors from its initiative window.

   There are only two factions. A same-side monster was excluded; a player-owned monster inherited the opposing faction and retained the candidate. No third opposing faction exists.

2. **Fixed policy is explicit and appropriately isolated.**  
   [speculative-planning.ts:318](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/speculative-planning.ts:318) declares `UNSEEN_OPPONENT_VISIBILITY_POLICY_RADIUS_FEET = 60`. Its privacy rationale follows D691’s fixed-posture-policy ruling. The exact choice of 60 lacks an inline explanation, but it is a policy weight, independent of actual opponent movement.

   Candidate hashes do not include this radius. Changed scores can nevertheless reorder/select candidates, changing scenario IDs and capsule digests. No hash algorithm or existing pin was rewritten. The §7 test asserts nonemptiness, bounds, ranking and score arithmetic—not an exact radius or digest.

3. **The dependency guard exercises production extraction.**  
   [blind-dodge-posture.test.ts:363](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/tests/unit/vtt/blind-dodge-posture.test.ts:363) passes the altered dead/zero-speed/Paralyzed/absent state into the real extractor, using a real generated option. The proxy and throwing visibility method detect prohibited reads; they do not fabricate successful dependencies. Equality against baseline verifies retained output. This guard covers extraction; the handler-level variants additionally cover candidate scoring and serialization.

4. **Normal and pursuit reachability remains intact.**  
   [speculative-planning.ts:660](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/speculative-planning.ts:660) retains actual movement capacity and `canPlayerFlipScenarioFact` for untagged dependencies. Only tagged no-cue visibility dependencies receive the fixed policy weight. Equality/dedup logic is unchanged from r1.

   Speculation remains meaningful: retained visibility predicates are evaluated against actual state later. Conservative candidates need not be reachable this turn; they do not themselves authorize an action.

No additional regression found. Supervisor checks were not repeated; no files were changed.

BLIND-01 REVIEW B4 FIX R2 DONE
