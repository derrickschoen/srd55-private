# ACTOR-KNOWLEDGE-01 plan round 3 (final) — gpt-5.6-sol final message

Session 01a0a1e7-4ac2-7930-9d26-827b39faaed9; log .tmp/runs/fanout/plan-actor-knowledge-r3.log.

Final R3 plan: [actor-knowledge-single-producer-plan.md](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md)

### Artifact report

| Version | Lines | Bytes | SHA-256 |
|---|---:|---:|---|
| R2 backup | 650 | 44,011 | `8a719741f4c78a58ba6c13a8e9d904260532b5f437fe0ed0073b4adcb4685b10` |
| R3 final | 660 | 45,303 | `212ed6a0ffe10c5fce6e6fa8c7652000a43695e538d788d1d8f5c75e1f7f3566` |

Discovery command:

```text
npx vitest list --configLoader runner --filesOnly --json
entries=641
unique=641
```

No Vitest test run was executed.

### Golden preservation statements

> Proposed E1C preservation: before any wire edit, normalization must retain exactly 31,995 bytes and sha256  
> `4071943750fc963ceac5a39fcd1baa71e9a3fd2dcc9bc539a1bb0bec4dc18e6d`.

> Proposed footprint preservation: before any wire edit, normalization must retain exactly 32,000 bytes and sha256  
> `aa841063ad0512d0f6b286318db802526da3efc5265a04d8b67f4d8351909d51`.

### Full R2 → R3 diff

```diff
--- /tmp/ak-plan-r2.md	2026-09-14 19:20:39.673743571 -0400
+++ .tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md	2026-09-14 19:24:45.403569274 -0400
@@ -10,18 +10,20 @@
 Frozen file: `src/vtt/intel/contracts.ts` must remain byte-identical.
 Frozen sha256: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.
 
-## Round-2 changes
+## Round changes
 
 | Finding | Disposition | Plan lines |
 |---|---|---|
-| PAK1-F1 | Accepted: recency evidence only; reducer scenario plus three controls | 61-78, 218-256, 368-369 |
-| PAK1-F2 | Accepted: exhaustive discriminant prose and eight complete-output cases | 142, 312-323 |
-| PAK1-F3 | Accepted: both delivery goldens receive independent normalization and wire assertions | 144-147, 451-463 |
-| PAK1-F4 | Accepted: two new discovered specs make the delta `+2` everywhere | 143, 341, 503, 519, 591-600, 638 |
-| PAK1-F5 | Accepted: exact sink/closure gate, inventory, and bypass controls | 195-205, 390-430, 516-525 |
-| PAK1-F6 | Accepted: manifest intersection is the verified ten-file set | 174-193, 527-557 |
-| PAK1-F7 | Accepted: schema and registry pins now have behavioral invariants | 432-453, 610-617 |
-| PAK1-F8 | Accepted: SRD citations use normalized full-SRD line locations | 154-172 |
+| PAK1-F1 | Accepted: recency evidence only; reducer scenario plus three controls | 63-80, 220-260, 372-373 |
+| PAK1-F2 | Accepted: exhaustive discriminant prose and eight complete-output cases | 144, 316-327 |
+| PAK1-F3 | Accepted: both delivery goldens receive independent normalization and wire assertions | 146-149, 455-475 |
+| PAK1-F4 | Accepted: two new discovered specs make the delta `+2` everywhere | 145, 345, 515, 531, 603-612, 650 |
+| PAK1-F5 | Accepted: exact sink/closure gate, inventory, and bypass controls | 197-207, 394-434, 528-537 |
+| PAK1-F6 | Accepted: manifest intersection is the verified ten-file set | 176-195, 539-569 |
+| PAK1-F7 | Accepted: schema and registry pins now have behavioral invariants | 436-457, 622-629 |
+| PAK1-F8 | Accepted: SRD citations use normalized full-SRD line locations | 156-174 |
+| PAK2-F1 (R3) | Accepted: insertion-order serialization and pre-change golden proofs | 459-475, 627, 644 |
+| PAK2-F2 (R3) | Accepted: attach the three corrected line numbers to the source spell file | 156-174 |
 
 ## 1. Verified facts on 40f04e2c
 
@@ -154,17 +156,17 @@
 ### 1.8 SRD facts that constrain the knowledge model
 
 Verified command: `python3 .ai/rules/srdgrep.py 'frigid beam'`.
-Verified source: `docs/srd/full/srd-5.2.1.txt:6434`.
+Verified source: `docs/srd/source/spell-descriptions.txt:6434`.
 Verified rule: Ray of Frost is a visible blue-white beam and a ranged spell attack.
 Verified command: `python3 .ai/rules/srdgrep.py 'Invisible [Condition]'`.
 Verified source: `docs/srd/full/srd-5.2.1.txt:11838-11853`.
 Verified rule: Invisible conceals the subject and changes affected attacks.
 Verified rule: the Invisible condition text does not tell observers what effect caused it.
 Verified command: `python3 .ai/rules/srdgrep.py 'You teleport to a location within range'`.
-Verified source: `docs/srd/full/srd-5.2.1.txt:2167` for Dimension Door.
+Verified source: `docs/srd/source/spell-descriptions.txt:2167` for Dimension Door.
 Verified rule: Dimension Door states relocation but supplies no universal visible teleport cue.
 Verified command: `python3 .ai/rules/srdgrep.py 'Briefly surrounded by silvery mist'`.
-Verified source: `docs/srd/full/srd-5.2.1.txt:5533` for Misty Step.
+Verified source: `docs/srd/source/spell-descriptions.txt:5533` for Misty Step.
 Verified rule: Misty Step has a perceivable silvery-mist cue specific to that effect.
 Verified command: `python3 .ai/rules/srdgrep.py 'hide yourself'`.
 Verified source: `docs/srd/full/srd-5.2.1.txt:11775-11802`.
@@ -239,7 +241,9 @@
 Proposed fixture: execute a real `cast_spell` Ray of Frost command with deterministic hand-authored rolls.
 Proposed fixture: derive the observation round and revision only from successive `reduceEncounter` results.
 Proposed invisibility variant: reduce an `apply_effect` command that gives the sorcerer Invisible.
-Proposed teleport variant: reduce a `move` command with `cause: 'teleport'` to an unperceived cell.
+Proposed teleport variant: reduce a one-step adjacent move with `cause: 'teleport'` into a fully fogged cell.
+Verified constraint: `src/combat/movement.ts:369-370` rejects a non-adjacent step as `non_adjacent_step`.
+Proposed: use the real spell teleport path for non-adjacent geometry; never alter movement mechanics in this unit.
 Proposed: assert each accepted command and the resulting reducer revision before projecting knowledge.
 Proposed: the two projection expectations are byte-for-byte identical apart from fixture identity.
 Proposed: the two wire expectations are byte-for-byte identical apart from fixture identity.
@@ -358,7 +362,7 @@
 Proposed: tremorsense uses a hand-authored sense and blocked sight so detection is exactly `located`.
 Proposed: fully fogged uses a one-cell target with its complete footprint fogged.
 Proposed: partially fogged uses a Large target with exactly one of four cells fogged.
-Proposed: the teleport fixture puts engine truth at a unique decoy coordinate.
+Proposed: teleport uses an adjacent fogged decoy; non-adjacent uses the real spell; never alter movement adjacency.
 Proposed: exact-object and recursive-coordinate assertions prohibit that decoy from either output.
 Proposed: the invisibility fixture asserts no `invisibility` reason is emitted.
 Proposed: the teleport fixture asserts no `teleportation`, spell ID, destination, or current distance is emitted.
@@ -452,15 +456,23 @@
 | `ai-dm-board-delivery.test.ts:669-682` | footprint normalization | retain 32,000-byte and `aa841063…` oracle |
 | `engine-mcp-handler.test.ts:775-800` | expanded exact wire | output-schema validation and no forbidden keys |
 
-Proposed: keep both existing board-delivery lengths and hashes unchanged after normalization.
-Proposed: write a separate literal legacy actor-knowledge block for each fixture, not one shared generated value.
-Proposed: assert each parsed new actor-knowledge block against a separate literal new-wire expectation first.
-Proposed: replace only that parsed block and each fixture's already-approved state-handle field.
-Proposed: canonicalize the normalized full object and compare its original exact byte length and sha256.
-Proposed: independently assert each raw payload's cap/trim flags, top-level keys, actor count, and option count.
-Proposed: this proves whether added wire bytes changed trimming or any other retained field.
-Proposed: if either normalized old oracle changes, stop; do not bless a new length, hash, or trimmed payload.
-Proposed: never paste a newly observed full-output hash into the test.
+Proposed: use ordinary insertion-order `JSON.stringify`, exactly as `tools/ai-dm-conversation.ts:2333` does.
+Proposed: never use `canonicalJson`, sorted keys, or object-spread reconstruction in either normalizer.
+Proposed: each fixture owns literal historical values; outer order is `policy,actors`, then `actor_id,targets`.
+Proposed perceived order: `kind,target_id,placement_status,effective_size,placement_mode,footprint,distance_feet`.
+Proposed pending order: `kind,target_id,placement_status,pending_reason`; mode order is `kind,actual,sizedFor`.
+Proposed unlocated order: `kind,target_id,last_seen`; nested `status,lastSeenPosition|reason`; cell `column,row`.
+Proposed: replace existing object properties in place so top-level and `state_ref` key positions do not move.
+Proposed E1C preservation: before any wire edit, normalization must retain exactly 31,995 bytes and sha256
+`4071943750fc963ceac5a39fcd1baa71e9a3fd2dcc9bc539a1bb0bec4dc18e6d`.
+Proposed footprint preservation: before any wire edit, normalization must retain exactly 32,000 bytes and sha256
+`aa841063ad0512d0f6b286318db802526da3efc5265a04d8b67f4d8351909d51`.
+Proposed: make that unchanged-fixture proof the first B2 checkpoint, before production wire changes.
+Proposed: then assert each parsed new block against its separate literal new-wire expectation.
+Proposed: separately assert each raw payload's cap/trim flags, top-level keys, actor count, and option count.
+Proposed expectation: no field outside `actor_knowledge` and the pre-approved footprint handle normalization changes.
+Proposed: otherwise stop, name the changed field, and add a pin row with an independent invariant before proceeding.
+Proposed: never regenerate either historical length or hash from newly observed output.
 Proposed: `tools/ai-dm-conversation.ts` needs no tag edit because it already imports the intel constant.
 Proposed: `tests/unit/tools/ai-dm-arena.test.ts` needs no pin edit because its invariant is absence in intel-off mode.
 Proposed: run that arena spec because it is a wire behavior consumer.
@@ -641,10 +653,8 @@
 ## 11. Completion evidence
 
 Record the landed offers base commit and the pre-edit discovery count.
-Record the focused spec file and test counts.
-Record the seven mutant red/green pairs.
-Record the final discovery total and delta from its pre-edit baseline.
+Record focused spec counts, seven mutant pairs, and final discovery total and delta.
 Record the frozen contract sha256.
 Record the final changed-file count and confirm all 22 files belong to the manifest.
 
-ACTOR KNOWLEDGE PLAN R2 DONE
+ACTOR KNOWLEDGE PLAN R3 DONE
```

### Final integrity

`git status --short --untracked-files=all` returned no output because `.tmp-*` is ignored.

Explicit untracked checks returned:

```text
!! .tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md
.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md
```

Frozen contract SHA-256:

`0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`

ACTOR KNOWLEDGE PLAN R3 DONE
diff --git a/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md b/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md
index d23baa471a8e506650e300e2cdbcb884257ecc8c..2ab2c17012f80eb68777ef4353ee7757c4e35b89
--- a/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md
+++ b/.tmp-plans/2026-09-14-actor-knowledge-single-producer-plan.md
@@ -10,18 +10,20 @@
 Frozen file: `src/vtt/intel/contracts.ts` must remain byte-identical.
 Frozen sha256: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.
 
-## Round-2 changes
+## Round changes
 
 | Finding | Disposition | Plan lines |
 |---|---|---|
-| PAK1-F1 | Accepted: recency evidence only; reducer scenario plus three controls | 61-78, 218-256, 368-369 |
-| PAK1-F2 | Accepted: exhaustive discriminant prose and eight complete-output cases | 142, 312-323 |
-| PAK1-F3 | Accepted: both delivery goldens receive independent normalization and wire assertions | 144-147, 451-463 |
-| PAK1-F4 | Accepted: two new discovered specs make the delta `+2` everywhere | 143, 341, 503, 519, 591-600, 638 |
-| PAK1-F5 | Accepted: exact sink/closure gate, inventory, and bypass controls | 195-205, 390-430, 516-525 |
-| PAK1-F6 | Accepted: manifest intersection is the verified ten-file set | 174-193, 527-557 |
-| PAK1-F7 | Accepted: schema and registry pins now have behavioral invariants | 432-453, 610-617 |
-| PAK1-F8 | Accepted: SRD citations use normalized full-SRD line locations | 154-172 |
+| PAK1-F1 | Accepted: recency evidence only; reducer scenario plus three controls | 63-80, 220-260, 372-373 |
+| PAK1-F2 | Accepted: exhaustive discriminant prose and eight complete-output cases | 144, 316-327 |
+| PAK1-F3 | Accepted: both delivery goldens receive independent normalization and wire assertions | 146-149, 455-475 |
+| PAK1-F4 | Accepted: two new discovered specs make the delta `+2` everywhere | 145, 345, 515, 531, 603-612, 650 |
+| PAK1-F5 | Accepted: exact sink/closure gate, inventory, and bypass controls | 197-207, 394-434, 528-537 |
+| PAK1-F6 | Accepted: manifest intersection is the verified ten-file set | 176-195, 539-569 |
+| PAK1-F7 | Accepted: schema and registry pins now have behavioral invariants | 436-457, 622-629 |
+| PAK1-F8 | Accepted: SRD citations use normalized full-SRD line locations | 156-174 |
+| PAK2-F1 (R3) | Accepted: insertion-order serialization and pre-change golden proofs | 459-475, 627, 644 |
+| PAK2-F2 (R3) | Accepted: attach the three corrected line numbers to the source spell file | 156-174 |
 
 ## 1. Verified facts on 40f04e2c
 
@@ -154,17 +156,17 @@
 ### 1.8 SRD facts that constrain the knowledge model
 
 Verified command: `python3 .ai/rules/srdgrep.py 'frigid beam'`.
-Verified source: `docs/srd/full/srd-5.2.1.txt:6434`.
+Verified source: `docs/srd/source/spell-descriptions.txt:6434`.
 Verified rule: Ray of Frost is a visible blue-white beam and a ranged spell attack.
 Verified command: `python3 .ai/rules/srdgrep.py 'Invisible [Condition]'`.
 Verified source: `docs/srd/full/srd-5.2.1.txt:11838-11853`.
 Verified rule: Invisible conceals the subject and changes affected attacks.
 Verified rule: the Invisible condition text does not tell observers what effect caused it.
 Verified command: `python3 .ai/rules/srdgrep.py 'You teleport to a location within range'`.
-Verified source: `docs/srd/full/srd-5.2.1.txt:2167` for Dimension Door.
+Verified source: `docs/srd/source/spell-descriptions.txt:2167` for Dimension Door.
 Verified rule: Dimension Door states relocation but supplies no universal visible teleport cue.
 Verified command: `python3 .ai/rules/srdgrep.py 'Briefly surrounded by silvery mist'`.
-Verified source: `docs/srd/full/srd-5.2.1.txt:5533` for Misty Step.
+Verified source: `docs/srd/source/spell-descriptions.txt:5533` for Misty Step.
 Verified rule: Misty Step has a perceivable silvery-mist cue specific to that effect.
 Verified command: `python3 .ai/rules/srdgrep.py 'hide yourself'`.
 Verified source: `docs/srd/full/srd-5.2.1.txt:11775-11802`.
@@ -239,7 +241,9 @@
 Proposed fixture: execute a real `cast_spell` Ray of Frost command with deterministic hand-authored rolls.
 Proposed fixture: derive the observation round and revision only from successive `reduceEncounter` results.
 Proposed invisibility variant: reduce an `apply_effect` command that gives the sorcerer Invisible.
-Proposed teleport variant: reduce a `move` command with `cause: 'teleport'` to an unperceived cell.
+Proposed teleport variant: reduce a one-step adjacent move with `cause: 'teleport'` into a fully fogged cell.
+Verified constraint: `src/combat/movement.ts:369-370` rejects a non-adjacent step as `non_adjacent_step`.
+Proposed: use the real spell teleport path for non-adjacent geometry; never alter movement mechanics in this unit.
 Proposed: assert each accepted command and the resulting reducer revision before projecting knowledge.
 Proposed: the two projection expectations are byte-for-byte identical apart from fixture identity.
 Proposed: the two wire expectations are byte-for-byte identical apart from fixture identity.
@@ -358,7 +362,7 @@
 Proposed: tremorsense uses a hand-authored sense and blocked sight so detection is exactly `located`.
 Proposed: fully fogged uses a one-cell target with its complete footprint fogged.
 Proposed: partially fogged uses a Large target with exactly one of four cells fogged.
-Proposed: the teleport fixture puts engine truth at a unique decoy coordinate.
+Proposed: teleport uses an adjacent fogged decoy; non-adjacent uses the real spell; never alter movement adjacency.
 Proposed: exact-object and recursive-coordinate assertions prohibit that decoy from either output.
 Proposed: the invisibility fixture asserts no `invisibility` reason is emitted.
 Proposed: the teleport fixture asserts no `teleportation`, spell ID, destination, or current distance is emitted.
@@ -452,15 +456,23 @@
 | `ai-dm-board-delivery.test.ts:669-682` | footprint normalization | retain 32,000-byte and `aa841063…` oracle |
 | `engine-mcp-handler.test.ts:775-800` | expanded exact wire | output-schema validation and no forbidden keys |
 
-Proposed: keep both existing board-delivery lengths and hashes unchanged after normalization.
-Proposed: write a separate literal legacy actor-knowledge block for each fixture, not one shared generated value.
-Proposed: assert each parsed new actor-knowledge block against a separate literal new-wire expectation first.
-Proposed: replace only that parsed block and each fixture's already-approved state-handle field.
-Proposed: canonicalize the normalized full object and compare its original exact byte length and sha256.
-Proposed: independently assert each raw payload's cap/trim flags, top-level keys, actor count, and option count.
-Proposed: this proves whether added wire bytes changed trimming or any other retained field.
-Proposed: if either normalized old oracle changes, stop; do not bless a new length, hash, or trimmed payload.
-Proposed: never paste a newly observed full-output hash into the test.
+Proposed: use ordinary insertion-order `JSON.stringify`, exactly as `tools/ai-dm-conversation.ts:2333` does.
+Proposed: never use `canonicalJson`, sorted keys, or object-spread reconstruction in either normalizer.
+Proposed: each fixture owns literal historical values; outer order is `policy,actors`, then `actor_id,targets`.
+Proposed perceived order: `kind,target_id,placement_status,effective_size,placement_mode,footprint,distance_feet`.
+Proposed pending order: `kind,target_id,placement_status,pending_reason`; mode order is `kind,actual,sizedFor`.
+Proposed unlocated order: `kind,target_id,last_seen`; nested `status,lastSeenPosition|reason`; cell `column,row`.
+Proposed: replace existing object properties in place so top-level and `state_ref` key positions do not move.
+Proposed E1C preservation: before any wire edit, normalization must retain exactly 31,995 bytes and sha256
+`4071943750fc963ceac5a39fcd1baa71e9a3fd2dcc9bc539a1bb0bec4dc18e6d`.
+Proposed footprint preservation: before any wire edit, normalization must retain exactly 32,000 bytes and sha256
+`aa841063ad0512d0f6b286318db802526da3efc5265a04d8b67f4d8351909d51`.
+Proposed: make that unchanged-fixture proof the first B2 checkpoint, before production wire changes.
+Proposed: then assert each parsed new block against its separate literal new-wire expectation.
+Proposed: separately assert each raw payload's cap/trim flags, top-level keys, actor count, and option count.
+Proposed expectation: no field outside `actor_knowledge` and the pre-approved footprint handle normalization changes.
+Proposed: otherwise stop, name the changed field, and add a pin row with an independent invariant before proceeding.
+Proposed: never regenerate either historical length or hash from newly observed output.
 Proposed: `tools/ai-dm-conversation.ts` needs no tag edit because it already imports the intel constant.
 Proposed: `tests/unit/tools/ai-dm-arena.test.ts` needs no pin edit because its invariant is absence in intel-off mode.
 Proposed: run that arena spec because it is a wire behavior consumer.
@@ -641,10 +653,8 @@
 ## 11. Completion evidence
 
 Record the landed offers base commit and the pre-edit discovery count.
-Record the focused spec file and test counts.
-Record the seven mutant red/green pairs.
-Record the final discovery total and delta from its pre-edit baseline.
+Record focused spec counts, seven mutant pairs, and final discovery total and delta.
 Record the frozen contract sha256.
 Record the final changed-file count and confirm all 22 files belong to the manifest.
 
-ACTOR KNOWLEDGE PLAN R2 DONE
+ACTOR KNOWLEDGE PLAN R3 DONE
