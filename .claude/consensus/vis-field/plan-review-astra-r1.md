## Review result

Verified the plan’s SHA-256:

`fd99c5b4bb3d8606bed583fc37ac1a270c64bbd24c53988d607aad60923f9c9e`

Checkout: `claude/vis-field`, HEAD `75c2f44a7784824195a6ad49d4ca2c71602bd7d5`. Working tree remained clean. I independently read more than 15 cited source spans, including the design-bearing evidence discussed below.

### P1 — The manifest cannot support its compile gates

[Plan:168](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/.tmp-plans/2026-09-15-visibility-field-plan.md:168) adds an `EffectPayload` variant in Batch 1 but omits `src/content/content-pack-operation-schema.ts`.

That file has an **exhaustive compile-time inventory** at **109–114**. Adding `devils_sight` without updating its inventory makes `effectPayloadInventoryIsComplete` fail compilation. Its separate imported form-sense schema at **595–600** also omits the new sense.

Removing runtime/setup fog additionally requires edits outside the manifest:

- `tools/vtt-soak.ts:174` reads `reference.foggedCells`.
- `tools/vtt-experiment.ts:1339` reads `source.foggedCells`.
- `tests/unit/vtt/experiment-orchestrator.test.ts:1102` requires the removed field.

`tsconfig.node.json:19–27` includes those tools and tests. Batch 4 already breaks the first reader by removing the reference setup property; Batch 5 breaks the second.

**Required correction:** include these files, redistribute batches to remain ≤10 files, and include the experiment-orchestrator test in verification.

## Q1 — Ordinary darkness: the SRD supports opacity, but the plan overstates a settled ruling

**P2 — Resolve and record the interpretation before freezing the plan.**

The repository text genuinely says:

- Heavy obscurement, explicitly including Darkness, “is opaque”: `docs/srd/full/srd-5.2.1.txt:661–662`.
- Blinded applies when trying to see something **there**: **663–664**.
- Ordinary unlit dungeons are included in Darkness: **679–683**.

Therefore, **the literal “opaque” wording supports sight blocking through ordinary darkness**. It would be inaccurate to report that the text only supports target-cell blindness. However, its following target-area qualification leaves an interpretation problem; these lines do not explicitly resolve viewing illuminated objects across unlit space.

**Recommended engine ruling:** ordinary darkness affects visibility of the **target cell**, while Fog Cloud, heavy material obscurement, and magical Darkness block intervening rays. This preserves the current ordinary-light treatment at `encounter.ts:2239–2245` and matches the owner’s explicit spell examples.

Gameplay consequences:

| Reading | Consequence |
|---|---|
| Plan’s intervening ordinary-darkness blocker | A remote torch and its illuminated surroundings can disappear behind unlit corridor cells. Looking from a dark room into a lit room can fail solely because the intervening room is dark. |
| Recommended target-light reading | The torch and illuminated room remain visible through clear air; unlit creatures and floor cells remain unseen without an applicable sense. |

D626 at main `.claude/decisions.md:22670–22672` does not expressly settle this distinction. Plan **252**, “None,” is therefore too strong. Add literal tests for both a distant illuminated target across darkness and an unlit target.

**RAW note:** plan **19** correctly describes dim light and darkvision; independently verified against SRD **656–660, 673–678, 11582–11588**.

### Related rules discrepancy: Truesight through fog

Plan **111–112** lets Truesight defeat heavy fog. SRD **12216–12241** lists darkness, invisibility, visual illusions, transformations, and the Ethereal Plane; it grants no fog penetration. Current `encounter.ts:2236–2237` and `tests/unit/vtt/senses.test.ts:319–320` correctly distinguish fog from darkness.

D626 **22672** nevertheless names Truesight among defeating senses. **Document this as an explicit engine override if retained under that decision.** Do not silently flip the existing fog assertion and describe the result as RAW.

## Q2 — Reverse visibility and derived fog

### P1 — Living but Unconscious observers still reveal the map

Plan **131–132** filters by `life === 'living'`; its evaluator only removes physical sight for **Blinded** at **113**.

A living actor can have Unconscious as an active condition:

- `combat-rules.ts:276–288` exposes that condition independently of life state.
- `conditions.ts:144–153` records `unaware: true`.
- SRD **12296–12310** says an Unconscious creature is unaware of its surroundings.

**Required correction:** explicitly exclude Unconscious observers from awareness/reveal, including those with blindsight. Reuse the eligible observer set for player creature visibility as well as cell concealment: the current creature path uses `availableObservers` at `visibility.ts:564–587`.

**Stable exclusion is correct:** SRD **1115–1120** says a Stable creature still has 0 HP and remains Unconscious. Note that `combat-rules.ts:335–339` currently synthesizes Unconscious only for `dying`; the explicit life filter avoids relying on that omission.

A lone eligible PC contributes its own field. With **zero eligible observers**, full concealment is a reasonable current-visibility policy; it does not introduce exploration memory.

### P2 — The virtual observer is reasonable, but its promise needs narrowing

The normal-sight, one-cell observer is a simple way to answer a **conditional geometric question** without inventing a universal sense profile.

It is not literally the transpose of heterogeneous actual-actor fields. Geometric clear-ray existence is symmetric under the corner tracer (`cover.ts:72–98,343,465–468`); perceived visibility is directional because light is evaluated at the subject and observers have different senses.

More importantly, plan **105** says the virtual creature “sees S,” while **116–120** leaves Hidden/Invisible gates outside the cell evaluator. An Invisible subject can therefore receive ordinary-sight `visible_from` cells.

**Required correction:** either label this explicitly as geometric/light eligibility excluding creature concealment, or apply the shared subject gates. Add an Invisible-subject test; the overlay-free agreement fixture at **122** cannot catch this discrepancy.

## Q3 — Simplicity, Batch 6, and pins

### P1 — D569 replacements do not adequately replace the independent content oracle

Plan **230** proposes useful invariants, but most compare multiple outputs from the same implementation.

The existing tests already establish:

- Flag-arm identity: `ai-dm-board-delivery.test.ts:533–542`.
- State-reference binding: **549–554**.
- Independent historical byte/content pins: **555–556, 671–682**.

A common regression that changes an unrelated action or actor fact identically in every arm can satisfy the proposed identities, repeatability, state-handle checks, and substring-transformation checks.

**Required correction:** preserve the existing historical checks wherever narrowly authorized normalization suffices. Where behavior genuinely changes, add independently specified expected content and negative controls for unrelated protected content. Do not substitute fresh byte counts or hashes.

The other pin treatments are broadly sound:

- Scene snapshot before/after identity tests protect observational non-mutation (`scene-snapshot.test.ts:220–243`); the promised component mutations make this meaningful.
- Generated schema equality is appropriate for a generated artifact, provided literal schema acceptance/rejection tests independently establish the contract. The existing test compares **parsed JSON**, not literal file bytes (`engine-mcp-handler.test.ts:1095–1103`).
- Frozen fixture input hashes should remain unchanged.

### Smaller delivery

Batches **1–5**, corrected for missing files, contain the essential evaluator, consumer consolidation, derived fog, and removal of authored fog. D626 also expressly requires semantic per-actor lists, so **all of Batch 6 cannot be deferred** while declaring the mandate complete.

A smaller Batch 6 can add the optional visibility block under v2, with strict validation, provenance, redaction, and necessary size handling. An optional additive block does not inherently require v3 or a v2-rejection mutant.

Caveats:

- **JSON schema regeneration remains necessary** because its shape changes.
- Additive v2 does **not** guarantee unchanged D569 hashes: removing fog from canonical state changes its binding digest.
- The D569 examples above have semantic delivery **disabled**. A semantic format bump alone is not grounds to retire their historical context oracle.

Builder invocation selection is an appropriate named follow-up. Broad protocol-version migration and unrelated golden cleanup are not essential to the visibility goal.

## Q4 — Both hand oracles verified

### Reference encounter: `[(4,3)]` — confirmed

Source facts: `reference-encounter.ts:57,112–127`.

- Normal-sight PCs: `(2,3)`, `(1,4)`, `(1,2)`.
- Grid: 10×7.
- Wall: `(7,2)`.
- Sole dark cell: `(4,3)`; other cells default bright (`world-objects.ts:230–239`).

Independent clear-ray witnesses:

- For target rows **0–2**, use the wizard’s corner **(2,2)** to target top-left corner **(column,row)**. The ray stays at `y ≤ 2`, outside both blockers’ interiors.
- For rows **3–6**, use the cleric’s corner **(2,5)** to target bottom-left corner **(column,row+1)**. The ray stays at `y ≥ 4`, again outside both interiors.

Boundary grazes do not block (`cover.ts:71–98`). Thus all 69 lit cells are visible; `(4,3)` fails target-light visibility.

### Default Vane Warren: `[]` — confirmed

Source facts: `vane-warren.ts:307–319,353–367,502–510,546–559`.

- Four dim cells; four light-smoke cells; remaining illumination defaults bright.
- Only total blockers: `(4,1)` and `(4,8)`.
- Objects provide partial cover.
- The center PC occupies `(2,5)`.

That PC alone supplies a clear ray to every cell, using source corner **(3,5)**:

- For target column `c ≤ 4`, aim at the target’s left corner. The ray never enters either blocker’s `4 < x < 5` interior.
- For `c ≥ 5`, aim at `(c+1,r+1)` when `r ≤ 4`, otherwise `(c+1,r)`.
- Across `4 ≤ x ≤ 5`, those rays stay strictly between `y=2` and `y=8`; the extreme bounds are **7/3** and **23/3**.

All 140 cells have a clear ray and sufficient ordinary illumination. **No cell remains unconfirmed.** These proofs also count wall cells under the existing endpoint-exclusion rule.

## Q5 — V1 validate-and-discard

**Accepted approach.**

The pins are hashes of **input file text**, not decoded output: `room-roster-preflight.test.ts:119–120,191–196`. I independently checked all 14 entries in its unchanged-input table: **14/14 match**. The repository contains **84 fixture files** mentioning `foggedCells`.

`decodeEncounterStateV1` clones/normalizes input at **378–381**, validates the old list at **403–408**, and returns the resulting state at **448**.

The proposed invariant is substantive if the test:

1. Supplies two distinct valid legacy lists.
2. Calls the real decoder on each.
3. Compares complete decoded states and asserts the key is absent.
4. Separately rejects malformed/duplicate legacy lists.

It would become tautological if the test itself stripped fog before decoding or comparison. Retaining validation while discarding an obsolete scenery field preserves input bytes without retaining another runtime producer.

## Q6 — Devil’s Sight and active Darkvision

**The diagnosis is correct.** `effectiveCombatRules` at **34–41** returns only base/wild-shape rules. Detection reads that result at `encounter.ts:2192`; Darkvision effects already exist (`effects.ts:638–640`, spell definition **684–688**) but contribute no senses. This is an **existing bug the plan fixes**.

The fixture grant seam works: `encounter.ts:1355–1375` materializes eligible always-on effects as permanent effects targeting the owning profile.

Add tests beyond the always-on fixture:

- Darkvision cast **by another actor onto the observer**.
- Effect expiration/removal.
- Maximum-range merging with an existing sense.
- Devil’s Sight at **120 feet** and beyond range.

Clarify “self-targeted” in plan **127** to mean effects whose `targets` include the observer; requiring `source === observer` would leave the touched-ally Darkvision case broken.

## Q7 — Sequencing

**P2 — Add an explicit landing dependency.**

Recommended order: **offers → VIS-FIELD → actor-knowledge**. This lets actor-knowledge consume the final visibility producer and removes its authored-fog dependency first. D625 already places actor-knowledge after offers.

Within VIS-FIELD, core evaluator work can proceed independently; reconcile the shared consumer batches after offers lands:

- `engine-query-port.ts:790–829` deletes the ladder; **1882–1901** changes the canonical query implementation.
- `intel/actor-knowledge.ts:261–269` removes the fog veto.
- `engine-server.ts:2794–2835` changes truncation.
- MCP schemas, generated schema, and D569 tests overlap actor-knowledge’s delivery boundary.

The supplied overlap list overstates some actual edits: plan **156,160** explicitly leaves `encounter-app.ts`, MCP entrypoint, and conversation source unchanged. Conversely, the app check at `encounter-app.ts:2199–2205` is only a **subset check**, not full equality; the new test should establish actual equality.

## Q8 — Empty-set tracer preservation

**P2 — No named test currently proves the requested invariant.**

An empty added blocker set should preserve behavior, but that is an implementation obligation. Existing terrain tests protect particular tiers, endpoints, and corner choices; they do not exercise the new option.

There is also concrete coupling to address: `cover.ts:343–349` converts `blocksSight` directly into Total Cover. Merely adding fog to that boolean violates the plan’s promise that fog does not alter cover tiers.

Add a named test such as **`EMPTY_SIGHT_BLOCKERS_PRESERVE_FULL_TRACE`**, covering:

- Omitted option versus explicit empty set, against independent existing expectations.
- All cover tiers and multi-cell footprints.
- Nonempty → empty → nonempty calls to detect cache contamination.
- Sight-only blockers changing LOS while preserving physical cover.

Cache keys must cover the added set at both `cover.ts:420–433` and the combatant wrappers at **494–525**.

## Test-plan and format checks

- **Pass:** 252 lines; sections 1–7; batch counts **10,5,10,9,5,10**; 44 unique files.
- **Pass:** both direct T commands per batch and final `npx tsc -b --force`.
- **Pass:** every batch declares RED-before-implementation.
- **P2:** mutant names are not concrete substitutions or named-test mappings. In particular, `SEMANTIC_VISIBILITY_RECOMPUTED` and `VISIBLE_FROM_USES_SECOND_LADDER` can preserve identical output. Specify how the test detects those architectural violations.
- Add state-transition/cache tests for movement, changing light, ending obscurement, and removing sense effects. One static fixture does not prove invalidation.

### Commands and verification limits

Executed read-only `sha256sum`, `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, numbered `nl -ba … | sed -n …` reads, targeted `rg`, normalized `srdgrep.py` lookups, and Python standard-library checks for manifest counts, fixture hashes, and the analytic ray bounds.

Attempted:

```text
npx vitest run tests/unit/combat/terrain.test.ts tests/unit/combat/creature-cover.test.ts tests/unit/vtt/senses.test.ts --maxWorkers=1
```

It failed **before test collection** because Vite could not create `node_modules/.vite-temp`. No passing test result is claimed. No files were edited, no other agents/models were called, and port 4173 was untouched.

**REJECT PLAN — Findings: P1 incomplete manifest/compile blockers; P1 Unconscious observers reveal visibility; P1 inadequate replacement of D569 independent content pins. P2 rules interpretations, reverse-visibility semantics, tracer/cache proof gaps, mutant specificity, and landing sequence require clarification.**
tokens used
141,023
## Review result

Verified the plan’s SHA-256:

`fd99c5b4bb3d8606bed583fc37ac1a270c64bbd24c53988d607aad60923f9c9e`

Checkout: `claude/vis-field`, HEAD `75c2f44a7784824195a6ad49d4ca2c71602bd7d5`. Working tree remained clean. I independently read more than 15 cited source spans, including the design-bearing evidence discussed below.

### P1 — The manifest cannot support its compile gates

[Plan:168](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/.tmp-plans/2026-09-15-visibility-field-plan.md:168) adds an `EffectPayload` variant in Batch 1 but omits `src/content/content-pack-operation-schema.ts`.

That file has an **exhaustive compile-time inventory** at **109–114**. Adding `devils_sight` without updating its inventory makes `effectPayloadInventoryIsComplete` fail compilation. Its separate imported form-sense schema at **595–600** also omits the new sense.

Removing runtime/setup fog additionally requires edits outside the manifest:

- `tools/vtt-soak.ts:174` reads `reference.foggedCells`.
- `tools/vtt-experiment.ts:1339` reads `source.foggedCells`.
- `tests/unit/vtt/experiment-orchestrator.test.ts:1102` requires the removed field.

`tsconfig.node.json:19–27` includes those tools and tests. Batch 4 already breaks the first reader by removing the reference setup property; Batch 5 breaks the second.

**Required correction:** include these files, redistribute batches to remain ≤10 files, and include the experiment-orchestrator test in verification.

## Q1 — Ordinary darkness: the SRD supports opacity, but the plan overstates a settled ruling

**P2 — Resolve and record the interpretation before freezing the plan.**

The repository text genuinely says:

- Heavy obscurement, explicitly including Darkness, “is opaque”: `docs/srd/full/srd-5.2.1.txt:661–662`.
- Blinded applies when trying to see something **there**: **663–664**.
- Ordinary unlit dungeons are included in Darkness: **679–683**.

Therefore, **the literal “opaque” wording supports sight blocking through ordinary darkness**. It would be inaccurate to report that the text only supports target-cell blindness. However, its following target-area qualification leaves an interpretation problem; these lines do not explicitly resolve viewing illuminated objects across unlit space.

**Recommended engine ruling:** ordinary darkness affects visibility of the **target cell**, while Fog Cloud, heavy material obscurement, and magical Darkness block intervening rays. This preserves the current ordinary-light treatment at `encounter.ts:2239–2245` and matches the owner’s explicit spell examples.

Gameplay consequences:

| Reading | Consequence |
|---|---|
| Plan’s intervening ordinary-darkness blocker | A remote torch and its illuminated surroundings can disappear behind unlit corridor cells. Looking from a dark room into a lit room can fail solely because the intervening room is dark. |
| Recommended target-light reading | The torch and illuminated room remain visible through clear air; unlit creatures and floor cells remain unseen without an applicable sense. |

D626 at main `.claude/decisions.md:22670–22672` does not expressly settle this distinction. Plan **252**, “None,” is therefore too strong. Add literal tests for both a distant illuminated target across darkness and an unlit target.

**RAW note:** plan **19** correctly describes dim light and darkvision; independently verified against SRD **656–660, 673–678, 11582–11588**.

### Related rules discrepancy: Truesight through fog

Plan **111–112** lets Truesight defeat heavy fog. SRD **12216–12241** lists darkness, invisibility, visual illusions, transformations, and the Ethereal Plane; it grants no fog penetration. Current `encounter.ts:2236–2237` and `tests/unit/vtt/senses.test.ts:319–320` correctly distinguish fog from darkness.

D626 **22672** nevertheless names Truesight among defeating senses. **Document this as an explicit engine override if retained under that decision.** Do not silently flip the existing fog assertion and describe the result as RAW.

## Q2 — Reverse visibility and derived fog

### P1 — Living but Unconscious observers still reveal the map

Plan **131–132** filters by `life === 'living'`; its evaluator only removes physical sight for **Blinded** at **113**.

A living actor can have Unconscious as an active condition:

- `combat-rules.ts:276–288` exposes that condition independently of life state.
- `conditions.ts:144–153` records `unaware: true`.
- SRD **12296–12310** says an Unconscious creature is unaware of its surroundings.

**Required correction:** explicitly exclude Unconscious observers from awareness/reveal, including those with blindsight. Reuse the eligible observer set for player creature visibility as well as cell concealment: the current creature path uses `availableObservers` at `visibility.ts:564–587`.

**Stable exclusion is correct:** SRD **1115–1120** says a Stable creature still has 0 HP and remains Unconscious. Note that `combat-rules.ts:335–339` currently synthesizes Unconscious only for `dying`; the explicit life filter avoids relying on that omission.

A lone eligible PC contributes its own field. With **zero eligible observers**, full concealment is a reasonable current-visibility policy; it does not introduce exploration memory.

### P2 — The virtual observer is reasonable, but its promise needs narrowing

The normal-sight, one-cell observer is a simple way to answer a **conditional geometric question** without inventing a universal sense profile.

It is not literally the transpose of heterogeneous actual-actor fields. Geometric clear-ray existence is symmetric under the corner tracer (`cover.ts:72–98,343,465–468`); perceived visibility is directional because light is evaluated at the subject and observers have different senses.

More importantly, plan **105** says the virtual creature “sees S,” while **116–120** leaves Hidden/Invisible gates outside the cell evaluator. An Invisible subject can therefore receive ordinary-sight `visible_from` cells.

**Required correction:** either label this explicitly as geometric/light eligibility excluding creature concealment, or apply the shared subject gates. Add an Invisible-subject test; the overlay-free agreement fixture at **122** cannot catch this discrepancy.

## Q3 — Simplicity, Batch 6, and pins

### P1 — D569 replacements do not adequately replace the independent content oracle

Plan **230** proposes useful invariants, but most compare multiple outputs from the same implementation.

The existing tests already establish:

- Flag-arm identity: `ai-dm-board-delivery.test.ts:533–542`.
- State-reference binding: **549–554**.
- Independent historical byte/content pins: **555–556, 671–682**.

A common regression that changes an unrelated action or actor fact identically in every arm can satisfy the proposed identities, repeatability, state-handle checks, and substring-transformation checks.

**Required correction:** preserve the existing historical checks wherever narrowly authorized normalization suffices. Where behavior genuinely changes, add independently specified expected content and negative controls for unrelated protected content. Do not substitute fresh byte counts or hashes.

The other pin treatments are broadly sound:

- Scene snapshot before/after identity tests protect observational non-mutation (`scene-snapshot.test.ts:220–243`); the promised component mutations make this meaningful.
- Generated schema equality is appropriate for a generated artifact, provided literal schema acceptance/rejection tests independently establish the contract. The existing test compares **parsed JSON**, not literal file bytes (`engine-mcp-handler.test.ts:1095–1103`).
- Frozen fixture input hashes should remain unchanged.

### Smaller delivery

Batches **1–5**, corrected for missing files, contain the essential evaluator, consumer consolidation, derived fog, and removal of authored fog. D626 also expressly requires semantic per-actor lists, so **all of Batch 6 cannot be deferred** while declaring the mandate complete.

A smaller Batch 6 can add the optional visibility block under v2, with strict validation, provenance, redaction, and necessary size handling. An optional additive block does not inherently require v3 or a v2-rejection mutant.

Caveats:

- **JSON schema regeneration remains necessary** because its shape changes.
- Additive v2 does **not** guarantee unchanged D569 hashes: removing fog from canonical state changes its binding digest.
- The D569 examples above have semantic delivery **disabled**. A semantic format bump alone is not grounds to retire their historical context oracle.

Builder invocation selection is an appropriate named follow-up. Broad protocol-version migration and unrelated golden cleanup are not essential to the visibility goal.

## Q4 — Both hand oracles verified

### Reference encounter: `[(4,3)]` — confirmed

Source facts: `reference-encounter.ts:57,112–127`.

- Normal-sight PCs: `(2,3)`, `(1,4)`, `(1,2)`.
- Grid: 10×7.
- Wall: `(7,2)`.
- Sole dark cell: `(4,3)`; other cells default bright (`world-objects.ts:230–239`).

Independent clear-ray witnesses:

- For target rows **0–2**, use the wizard’s corner **(2,2)** to target top-left corner **(column,row)**. The ray stays at `y ≤ 2`, outside both blockers’ interiors.
- For rows **3–6**, use the cleric’s corner **(2,5)** to target bottom-left corner **(column,row+1)**. The ray stays at `y ≥ 4`, again outside both interiors.

Boundary grazes do not block (`cover.ts:71–98`). Thus all 69 lit cells are visible; `(4,3)` fails target-light visibility.

### Default Vane Warren: `[]` — confirmed

Source facts: `vane-warren.ts:307–319,353–367,502–510,546–559`.

- Four dim cells; four light-smoke cells; remaining illumination defaults bright.
- Only total blockers: `(4,1)` and `(4,8)`.
- Objects provide partial cover.
- The center PC occupies `(2,5)`.

That PC alone supplies a clear ray to every cell, using source corner **(3,5)**:

- For target column `c ≤ 4`, aim at the target’s left corner. The ray never enters either blocker’s `4 < x < 5` interior.
- For `c ≥ 5`, aim at `(c+1,r+1)` when `r ≤ 4`, otherwise `(c+1,r)`.
- Across `4 ≤ x ≤ 5`, those rays stay strictly between `y=2` and `y=8`; the extreme bounds are **7/3** and **23/3**.

All 140 cells have a clear ray and sufficient ordinary illumination. **No cell remains unconfirmed.** These proofs also count wall cells under the existing endpoint-exclusion rule.

## Q5 — V1 validate-and-discard

**Accepted approach.**

The pins are hashes of **input file text**, not decoded output: `room-roster-preflight.test.ts:119–120,191–196`. I independently checked all 14 entries in its unchanged-input table: **14/14 match**. The repository contains **84 fixture files** mentioning `foggedCells`.

`decodeEncounterStateV1` clones/normalizes input at **378–381**, validates the old list at **403–408**, and returns the resulting state at **448**.

The proposed invariant is substantive if the test:

1. Supplies two distinct valid legacy lists.
2. Calls the real decoder on each.
3. Compares complete decoded states and asserts the key is absent.
4. Separately rejects malformed/duplicate legacy lists.

It would become tautological if the test itself stripped fog before decoding or comparison. Retaining validation while discarding an obsolete scenery field preserves input bytes without retaining another runtime producer.

## Q6 — Devil’s Sight and active Darkvision

**The diagnosis is correct.** `effectiveCombatRules` at **34–41** returns only base/wild-shape rules. Detection reads that result at `encounter.ts:2192`; Darkvision effects already exist (`effects.ts:638–640`, spell definition **684–688**) but contribute no senses. This is an **existing bug the plan fixes**.

The fixture grant seam works: `encounter.ts:1355–1375` materializes eligible always-on effects as permanent effects targeting the owning profile.

Add tests beyond the always-on fixture:

- Darkvision cast **by another actor onto the observer**.
- Effect expiration/removal.
- Maximum-range merging with an existing sense.
- Devil’s Sight at **120 feet** and beyond range.

Clarify “self-targeted” in plan **127** to mean effects whose `targets` include the observer; requiring `source === observer` would leave the touched-ally Darkvision case broken.

## Q7 — Sequencing

**P2 — Add an explicit landing dependency.**

Recommended order: **offers → VIS-FIELD → actor-knowledge**. This lets actor-knowledge consume the final visibility producer and removes its authored-fog dependency first. D625 already places actor-knowledge after offers.

Within VIS-FIELD, core evaluator work can proceed independently; reconcile the shared consumer batches after offers lands:

- `engine-query-port.ts:790–829` deletes the ladder; **1882–1901** changes the canonical query implementation.
- `intel/actor-knowledge.ts:261–269` removes the fog veto.
- `engine-server.ts:2794–2835` changes truncation.
- MCP schemas, generated schema, and D569 tests overlap actor-knowledge’s delivery boundary.

The supplied overlap list overstates some actual edits: plan **156,160** explicitly leaves `encounter-app.ts`, MCP entrypoint, and conversation source unchanged. Conversely, the app check at `encounter-app.ts:2199–2205` is only a **subset check**, not full equality; the new test should establish actual equality.

## Q8 — Empty-set tracer preservation

**P2 — No named test currently proves the requested invariant.**

An empty added blocker set should preserve behavior, but that is an implementation obligation. Existing terrain tests protect particular tiers, endpoints, and corner choices; they do not exercise the new option.

There is also concrete coupling to address: `cover.ts:343–349` converts `blocksSight` directly into Total Cover. Merely adding fog to that boolean violates the plan’s promise that fog does not alter cover tiers.

Add a named test such as **`EMPTY_SIGHT_BLOCKERS_PRESERVE_FULL_TRACE`**, covering:

- Omitted option versus explicit empty set, against independent existing expectations.
- All cover tiers and multi-cell footprints.
- Nonempty → empty → nonempty calls to detect cache contamination.
- Sight-only blockers changing LOS while preserving physical cover.

Cache keys must cover the added set at both `cover.ts:420–433` and the combatant wrappers at **494–525**.

## Test-plan and format checks

- **Pass:** 252 lines; sections 1–7; batch counts **10,5,10,9,5,10**; 44 unique files.
- **Pass:** both direct T commands per batch and final `npx tsc -b --force`.
- **Pass:** every batch declares RED-before-implementation.
- **P2:** mutant names are not concrete substitutions or named-test mappings. In particular, `SEMANTIC_VISIBILITY_RECOMPUTED` and `VISIBLE_FROM_USES_SECOND_LADDER` can preserve identical output. Specify how the test detects those architectural violations.
- Add state-transition/cache tests for movement, changing light, ending obscurement, and removing sense effects. One static fixture does not prove invalidation.

### Commands and verification limits

Executed read-only `sha256sum`, `git status --short`, `git branch --show-current`, `git rev-parse HEAD`, numbered `nl -ba … | sed -n …` reads, targeted `rg`, normalized `srdgrep.py` lookups, and Python standard-library checks for manifest counts, fixture hashes, and the analytic ray bounds.

Attempted:

```text
npx vitest run tests/unit/combat/terrain.test.ts tests/unit/combat/creature-cover.test.ts tests/unit/vtt/senses.test.ts --maxWorkers=1
```

It failed **before test collection** because Vite could not create `node_modules/.vite-temp`. No passing test result is claimed. No files were edited, no other agents/models were called, and port 4173 was untouched.

**REJECT PLAN — Findings: P1 incomplete manifest/compile blockers; P1 Unconscious observers reveal visibility; P1 inadequate replacement of D569 independent content pins. P2 rules interpretations, reverse-visibility semantics, tracer/cache proof gaps, mutant specificity, and landing sequence require clarification.**
